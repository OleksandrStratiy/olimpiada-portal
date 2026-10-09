#!/usr/bin/env python3
"""Перевірка даних порталу.

1. Структура JSON-файлів у data/: обов'язкові поля, унікальні назви задач,
   існуючі категорії й теми, наявність документів з years.json.
2. Розв'язки на C++: кожен розв'язок компілюється і запускається на прикладах з умови.

Запуск з кореня репозиторію:
    python tools/check_data.py              # усе
    python tools/check_data.py --no-compile # лише структура даних
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
errors = []

COMMON = ["id", "title", "topic", "level", "statement", "tech", "examples"]
REQUIRED = {
    "problems.json": COMMON + ["category"],
    "archive.json": COMMON + ["year", "groups"],
}


def load(name):
    with open(os.path.join(DATA, name), encoding="utf-8") as f:
        return json.load(f)


def check_structure():
    theory = load("theory.json")
    categories = load("categories.json")
    years = load("years.json")
    topics = {t["id"] for t in theory} | {"other"}
    cats = {c["id"] for c in categories}
    for c in categories:
        if c.get("theory") and c["theory"] not in topics:
            errors.append(f"categories.json {c['id']}: невідома тема «{c['theory']}»")
    seen = set()
    everything = []
    for name, required in REQUIRED.items():
        for p in load(name):
            everything.append(p)
            where = f"{name}: {p.get('id', '?')}"
            for key in required:
                if key not in p:
                    errors.append(f"{where}: немає поля «{key}»")
            if p.get("id") in seen:
                errors.append(f"{where}: назва задачі повторюється")
            seen.add(p.get("id"))
            if p.get("topic") not in topics:
                errors.append(f"{where}: невідома тема «{p.get('topic')}»")
            if p.get("level") not in (1, 2, 3):
                errors.append(f"{where}: рівень має бути 1, 2 або 3")
            if "category" in p and p["category"] not in cats:
                errors.append(f"{where}: невідома категорія «{p['category']}»")
            if name == "archive.json" and not re.fullmatch(r"\d{4}-\d{2}", str(p.get("year", ""))):
                errors.append(f"{where}: рік має бути у форматі 2025-26")
            if not p.get("examples"):
                errors.append(f"{where}: немає жодного прикладу")
    for y in years:
        for d in y.get("docs", []):
            if not os.path.exists(os.path.join(ROOT, d["file"])):
                errors.append(f"years.json {y['id']}: немає файла {d['file']}")
    return everything


def check_solutions(problems):
    compiler = shutil.which("g++")
    if not compiler:
        print("g++ не знайдено, перевірку розв'язків пропущено")
        return
    tested = 0
    with tempfile.TemporaryDirectory() as tmp:
        for p in problems:
            if not p.get("solution"):
                continue
            src, exe = os.path.join(tmp, "sol.cpp"), os.path.join(tmp, "sol")
            with open(src, "w", encoding="utf-8") as f:
                f.write(p["solution"])
            res = subprocess.run([compiler, "-std=c++17", "-O2", "-o", exe, src], capture_output=True, text=True)
            if res.returncode:
                errors.append(f"{p['id']}: розв'язок не компілюється\n{res.stderr[:800]}")
                continue
            for k, ex in enumerate(p.get("examples", []), 1):
                try:
                    run = subprocess.run([exe], input=ex["in"] + "\n", capture_output=True, text=True, timeout=5)
                except subprocess.TimeoutExpired:
                    errors.append(f"{p['id']}: приклад {k} — перевищено час")
                    continue
                if run.stdout.split() != ex["out"].split():
                    errors.append(f"{p['id']}: приклад {k} — очікувалось {ex['out']!r}, отримано {run.stdout.strip()!r}")
            tested += 1
    print(f"Перевірено розв'язків: {tested}")


def main():
    problems = check_structure()
    if "--no-compile" not in sys.argv:
        check_solutions(problems)
    if errors:
        print("Знайдено помилки:")
        for e in errors:
            print(" -", e)
        sys.exit(1)
    print("Усе гаразд")


if __name__ == "__main__":
    main()
