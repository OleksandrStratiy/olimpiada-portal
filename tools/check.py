#!/usr/bin/env python3
"""Перевірка курсу і задач.

1. data/course.json: усі уроки на місці, назви уроків не повторюються.
2. Уроки (lessons/*.md):
   - кожна повна програма ```cpp компілюється (а програма з позначкою «error» — навпаки, не компілюється);
   - якщо після програми йдуть блоки ```input і/або ```output, програма запускається і її виведення
     має точно збігатися з ```output;
   - тести ```quiz: у кожного питання щонайменше два варіанти і рівно один правильний;
   - задачі ```exercise: розв'язок компілюється і проходить усі приклади й тести.
3. Задачі в data/: структура JSON, теми (уроки) існують, документи на місці, розв'язки проходять приклади.

Запуск з кореня репозиторію:
    python tools/check.py                 # усе
    python tools/check.py --no-compile    # лише структура, без компіляції
    python tools/check.py hello input     # лише вказані уроки
"""
import concurrent.futures as cf
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
LESSONS = os.path.join(ROOT, "lessons")
CPP = {"cpp", "c++", "cc", "c", "cxx"}
FLAGS = ["-std=c++17", "-O2", "-pipe"]

errors = []
warnings = []


def err(where, msg):
    errors.append(f"{where}: {msg}")


def warn(where, msg):
    warnings.append(f"{where}: {msg}")


def load(name):
    with open(os.path.join(DATA, name), encoding="utf-8") as f:
        return json.load(f)


# ---------- Розбір уроку (так само, як js/markdown.js) ----------

FENCE = re.compile(r"^(\s*)(`{3,}|~{3,})\s*([^\s`~]*)\s*(.*)$")


def fenced_blocks(text):
    """Повертає блоки коду: lang, meta, text, line, adjacent (між цим і попереднім блоком лише порожні рядки)."""
    lines = text.replace("\r\n", "\n").split("\n")
    out = []
    i = 0
    gap_clean = False
    while i < len(lines):
        m = FENCE.match(lines[i])
        if not m:
            if lines[i].strip():
                gap_clean = False
            i += 1
            continue
        indent, fence, lang, meta = len(m.group(1)), m.group(2), m.group(3).lower(), m.group(4).strip()
        start = i + 1
        close = re.compile(r"^\s*" + re.escape(fence[0]) + "{" + str(len(fence)) + r",}\s*$")
        body = []
        i += 1
        while i < len(lines) and not close.match(lines[i]):
            ln = lines[i]
            cut = min(indent, len(ln) - len(ln.lstrip()))
            body.append(ln[cut:])
            i += 1
        if i >= len(lines):
            out.append({"lang": lang, "meta": meta, "text": "\n".join(body), "line": start, "adjacent": gap_clean, "unclosed": True})
        else:
            out.append({"lang": lang, "meta": meta, "text": "\n".join(body), "line": start, "adjacent": gap_clean, "unclosed": False})
        i += 1
        gap_clean = True
    return out


def parse_quiz(text):
    questions = []
    q = None
    last = None
    for raw in text.split("\n"):
        line = raw.rstrip()
        if not line.strip():
            last = None
            continue
        m = re.match(r"^([?+\-:|])(?:\s|$)(.*)$", line)
        if not m:
            if last is not None:
                last["text"] += "\n" + line.strip()
            continue
        mark, rest = m.group(1), m.group(2)
        if mark == "?":
            q = {"text": rest, "code": [], "options": [], "expl": {"text": ""}}
            questions.append(q)
            last = q
        elif q is None:
            continue
        elif mark == "|":
            q["code"].append(re.sub(r"^\|\s?", "", line))
            last = None
        elif mark in "+-":
            o = {"text": rest, "right": mark == "+"}
            q["options"].append(o)
            last = o
        else:
            q["expl"]["text"] = (q["expl"]["text"] + "\n" + rest) if q["expl"]["text"] else rest
            last = q["expl"]
    return questions


def trim_lines(s):
    s = re.sub(r"^\s*\n", "", s)
    return s.rstrip()


def split_io(lines):
    k = next((n for n, l in enumerate(lines) if l.strip() == "---"), -1)
    a = lines if k < 0 else lines[:k]
    b = [] if k < 0 else lines[k + 1:]
    return {"in": trim_lines("\n".join(a)), "out": trim_lines("\n".join(b)), "sep": k >= 0}


def parse_exercise(text):
    ex = {"id": "", "title": "", "level": 1, "statement": "", "input": "", "output": "", "note": "",
          "examples": [], "tests": [], "hints": [], "starter": "", "solution": "", "_sections": []}
    section, buf = "head", []

    def flush():
        body = "\n".join(buf)
        if section == "head":
            for l in buf:
                m = re.match(r"^\s*(\w+)\s*:\s*(.*)$", l)
                if m:
                    ex[m.group(1)] = int(m.group(2)) if m.group(1) == "level" and m.group(2).strip().isdigit() else m.group(2).strip()
        elif section in ("statement", "input", "output", "note"):
            ex[section] = body.strip()
        elif section == "example":
            ex["examples"].append(split_io(buf))
        elif section == "test":
            ex["tests"].append(split_io(buf))
        elif section == "hint":
            if body.strip():
                ex["hints"].append(body.strip())
        elif section in ("starter", "solution"):
            ex[section] = trim_lines(body)
        else:
            ex["_sections"].append(section)

    for line in text.split("\n"):
        m = re.match(r"^===\s*(\w+)\s*$", line)
        if m:
            flush()
            section, buf = m.group(1).lower(), []
            continue
        buf.append(line)
    flush()
    return ex


# ---------- Компіляція і запуск ----------

class Runner:
    def __init__(self, enabled):
        self.compiler = shutil.which("g++") if enabled else None
        self.tmp = tempfile.mkdtemp(prefix="olimp-check-")
        self.cache = {}
        self.locks = {}
        self.master = threading.Lock()

    def compile(self, source):
        """Повертає (шлях до програми або None, текст помилок). Однаковий код компілюється один раз."""
        key = hashlib.sha1(source.encode("utf-8")).hexdigest()
        with self.master:
            lock = self.locks.setdefault(key, threading.Lock())
        with lock:
            if key in self.cache:
                return self.cache[key]
            src = os.path.join(self.tmp, key + ".cpp")
            exe = os.path.join(self.tmp, key + ".out")
            with open(src, "w", encoding="utf-8") as f:
                f.write(source)
            res = subprocess.run([self.compiler, *FLAGS, "-o", exe, src], capture_output=True, text=True)
            result = (exe if res.returncode == 0 else None, res.stderr)
            self.cache[key] = result
            return result

    @staticmethod
    def run(exe, stdin):
        try:
            r = subprocess.run([exe], input=stdin, capture_output=True, text=True, timeout=10)
        except subprocess.TimeoutExpired:
            return None, "перевищено час (10 с)"
        if r.returncode != 0:
            return r.stdout, f"програма завершилася з кодом {r.returncode}: {r.stderr[:300]}"
        return r.stdout, None


def norm_exact(s):
    return "\n".join(l.rstrip() for l in s.replace("\r\n", "\n").rstrip("\n").split("\n")).rstrip("\n")


def same_tokens(a, b):
    return a.split() == b.split()


def short(s, n=300):
    s = s if len(s) <= n else s[:n] + "…"
    return s.replace("\n", "⏎")


# ---------- Перевірка уроків ----------

def check_lesson(lid, title, runner, jobs):
    path = os.path.join(LESSONS, lid + ".md")
    where = f"lessons/{lid}.md"
    if not os.path.exists(path):
        err(where, "файла немає")
        return {}
    with open(path, encoding="utf-8") as f:
        text = f.read()
    first = next((l for l in text.split("\n") if l.strip()), "")
    if not first.startswith("# "):
        warn(where, "урок має починатися із заголовка «# Назва»")
    elif first[2:].strip() != title:
        warn(where, f"заголовок «{first[2:].strip()}» не збігається з назвою в course.json «{title}»")

    blocks = fenced_blocks(text)
    stats = {"programs": 0, "quiz": 0, "exercises": 0}
    ex_ids = set()
    k = 0
    while k < len(blocks):
        b = blocks[k]
        at = f"{where}:{b['line']}"
        if b["unclosed"]:
            err(at, "блок коду не закрито (немає ```)")
        if b["lang"] in CPP:
            inp = out = None
            if k + 1 < len(blocks) and blocks[k + 1]["lang"] == "input" and blocks[k + 1]["adjacent"]:
                k += 1
                inp = blocks[k]["text"]
            if k + 1 < len(blocks) and blocks[k + 1]["lang"] == "output" and blocks[k + 1]["adjacent"]:
                k += 1
                out = blocks[k]["text"]
            flags = b["meta"].split()
            if re.search(r"\bmain\s*\(", b["text"]):
                stats["programs"] += 1
                jobs.append(("program", at, b["text"], "error" in flags, inp, out))
            elif out is not None:
                warn(at, "фрагмент без main має блок output — його не можна перевірити")
        elif b["lang"] == "quiz":
            qs = parse_quiz(b["text"])
            stats["quiz"] += len(qs)
            if not qs:
                err(at, "тест без жодного питання")
            for n, q in enumerate(qs, 1):
                right = sum(1 for o in q["options"] if o["right"])
                if len(q["options"]) < 2:
                    err(at, f"питання {n}: менше двох варіантів відповіді")
                if right != 1:
                    err(at, f"питання {n}: правильних варіантів {right}, а має бути рівно 1")
                if not q["expl"]["text"]:
                    warn(at, f"питання {n}: немає пояснення («: …»)")
        elif b["lang"] == "exercise":
            ex = parse_exercise(b["text"])
            stats["exercises"] += 1
            name = f"{at} [{ex['id'] or '?'}]"
            for sec in ex["_sections"]:
                err(name, f"невідомий розділ «=== {sec}»")
            if not ex["id"] or not re.fullmatch(r"[\w-]+", ex["id"]):
                err(name, "потрібен id: латинські літери, цифри, дефіс")
            if ex["id"] in ex_ids:
                err(name, "id задачі повторюється в уроці")
            ex_ids.add(ex["id"])
            for key in ("title", "statement", "solution"):
                if not ex[key]:
                    err(name, f"немає «{key}»")
            if not ex["examples"]:
                err(name, "немає жодного прикладу (=== example)")
            for t in ex["examples"] + ex["tests"]:
                if not t["sep"]:
                    err(name, "у прикладі чи тесті немає рядка «---» між введенням і виведенням")
            if ex["solution"]:
                jobs.append(("exercise", name, ex["solution"], ex["examples"] + ex["tests"]))
            if ex["starter"]:
                jobs.append(("starter", name, ex["starter"], str(ex.get("broken", "")).lower() in ("true", "yes", "1")))
        elif b["lang"] in ("input", "output") and not b["adjacent"]:
            pass
        k += 1
    return stats


def run_job(job, runner):
    kind, where = job[0], job[1]
    if kind == "program":
        _, _, source, expect_error, inp, out = job
        exe, cerr = runner.compile(source)
        if expect_error:
            return [] if exe is None else [f"{where}: програма позначена як «error», але компілюється"]
        if exe is None:
            return [f"{where}: програма не компілюється\n{cerr[:1200]}"]
        if out is None:
            return []
        got, problem = runner.run(exe, (inp or "") + ("\n" if inp else ""))
        if problem:
            return [f"{where}: {problem}"]
        if norm_exact(got) != norm_exact(out):
            return [f"{where}: виведення не збігається з ```output\n    очікувалось: {short(norm_exact(out))}\n    отримано:    {short(norm_exact(got))}"]
        return []
    if kind == "starter":
        exe, cerr = runner.compile(job[2])
        if job[3]:
            return [] if exe is None else [f"{where}: стартовий код позначено broken, але він компілюється"]
        return [] if exe else [f"{where}: стартовий код не компілюється (якщо так задумано, додай рядок «broken: true»)\n{cerr[:800]}"]
    if kind == "exercise":
        _, _, source, tests = job
        exe, cerr = runner.compile(source)
        if exe is None:
            return [f"{where}: розв'язок не компілюється\n{cerr[:1200]}"]
        out = []
        for n, t in enumerate(tests, 1):
            got, problem = runner.run(exe, t["in"] + ("\n" if t["in"] else ""))
            if problem:
                out.append(f"{where}: тест {n} — {problem}")
            elif not same_tokens(got, t["out"]):
                out.append(f"{where}: тест {n} — очікувалось {short(t['out'])!r}, отримано {short(got.strip())!r}")
        return out
    if kind == "problem":
        _, _, source, examples = job
        exe, cerr = runner.compile(source)
        if exe is None:
            return [f"{where}: розв'язок не компілюється\n{cerr[:1200]}"]
        out = []
        for n, ex in enumerate(examples, 1):
            got, problem = runner.run(exe, ex["in"] + "\n")
            if problem:
                out.append(f"{where}: приклад {n} — {problem}")
            elif not same_tokens(got, ex["out"]):
                out.append(f"{where}: приклад {n} — очікувалось {ex['out']!r}, отримано {got.strip()!r}")
        return out
    return []


# ---------- Задачі ----------

def check_problems(lesson_ids, jobs):
    training = load("problems.json")
    archive = load("archive.json")
    years = load("years.json")
    topics = set(lesson_ids) | {"other"}
    seen = set()
    for kind, items, required in (
        ("problems.json", training, ["id", "title", "topic", "level", "statement", "input", "output", "examples"]),
        ("archive.json", archive, ["id", "title", "year", "groups", "topic", "level", "statement", "tech", "examples"]),
    ):
        for p in items:
            where = f"{kind}: {p.get('id', '?')}"
            for key in required:
                if key not in p:
                    err(where, f"немає поля «{key}»")
            if p.get("id") in seen:
                err(where, "назва задачі повторюється")
            seen.add(p.get("id"))
            if p.get("topic") not in topics:
                err(where, f"невідома тема «{p.get('topic')}» (має бути id уроку з course.json або other)")
            if kind == "archive.json" and not re.fullmatch(r"\d{4}-\d{2}", str(p.get("year", ""))):
                err(where, "рік має бути у форматі 2025-26")
            if p.get("solution"):
                jobs.append(("problem", where, p["solution"], p.get("examples", [])))
    for y in years:
        for d in y.get("docs", []):
            if not os.path.exists(os.path.join(ROOT, d["file"])):
                err(f"years.json {y['id']}", f"немає файла {d['file']}")
    return len(training) + len(archive)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    compile_on = "--no-compile" not in sys.argv
    course = load("course.json")
    lessons = [(l["id"], l["title"]) for m in course["modules"] for l in m["lessons"]]
    ids = [i for i, _ in lessons]
    for i in set(ids):
        if ids.count(i) > 1:
            err("course.json", f"урок {i} трапляється {ids.count(i)} рази")
    extra = sorted(f[:-3] for f in os.listdir(LESSONS) if f.endswith(".md") and f[:-3] not in ids) if os.path.isdir(LESSONS) else []
    for e in extra:
        warn(f"lessons/{e}.md", "файл є, але уроку немає в course.json")

    runner = Runner(compile_on)
    jobs = []
    totals = {"programs": 0, "quiz": 0, "exercises": 0}
    for lid, title in lessons:
        if args and lid not in args:
            continue
        st = check_lesson(lid, title, runner, jobs)
        for k in totals:
            totals[k] += st.get(k, 0)
    n_problems = check_problems(ids, jobs) if not args else 0

    if runner.compiler:
        with cf.ThreadPoolExecutor(max_workers=max(2, os.cpu_count() or 2)) as pool:
            for res in pool.map(lambda j: run_job(j, runner), jobs):
                errors.extend(res)
        print(f"Скомпільовано і перевірено: {len(jobs)} програм")
    elif compile_on:
        print("g++ не знайдено, компіляцію пропущено")

    print(f"Уроків: {len(lessons) if not args else len(args)}, прикладів-програм: {totals['programs']}, "
          f"питань у тестах: {totals['quiz']}, задач в уроках: {totals['exercises']}" + (f", задач у data/: {n_problems}" if n_problems else ""))
    shutil.rmtree(runner.tmp, ignore_errors=True)
    if warnings:
        print("\nЗауваження:")
        for w in warnings:
            print(" -", w)
    if errors:
        print("\nЗнайдено помилки:")
        for e in errors:
            print(" -", e)
        sys.exit(1)
    print("\nУсе гаразд")


if __name__ == "__main__":
    main()
