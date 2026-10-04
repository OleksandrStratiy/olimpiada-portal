// Інтерактивні частини уроків і задач: блоки коду з кнопкою «Запустити»,
// тести «Перевір себе», задачі з редактором і автоматичною перевіркою.
import { esc, icon, domId, toast, copyText } from "./utils.js";
import { highlight } from "./highlight.js";
import { inline, renderMarkdown, ioHtml } from "./markdown.js";
import { editorHtml, setValue, fit } from "./editor.js";
import { runCode, sameOutput, explainErrors, errorLines, explainRun, RUNNER_ERRORS } from "./runner.js";
import { isExerciseSolved, setExerciseSolved, loadCode, saveCode, dropCode } from "./store.js";

export const TEMPLATE = "#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}";

const reg = { codes: new Map(), quizzes: new Map(), benches: new Map(), hints: new Map() };
const hintShown = new Map();
let seq = 0;

/** Викликається перед кожним новим показом сторінки. */
export function resetWidgets() {
  reg.codes.clear();
  reg.quizzes.clear();
  reg.benches.clear();
  reg.hints.clear();
}

const readsInput = code => /\bcin\b|getline|scanf/.test(code);
const cbtn = (act, ic, label, cls = "") => `<button class="cbtn${cls}" type="button" data-act="${act}">${icon(ic)}${label}</button>`;
const status = (kind, text) => `<div class="run-status ${kind}">${kind === "wait" ? '<span class="spin" aria-hidden="true"></span>' : icon(kind === "ok" ? "check" : kind === "warn" ? "alert" : "x")}<span>${text}</span></div>`;

/* ---------- Блок коду ---------- */

/** Блок коду C++; якщо це повна програма (є main), її можна змінити й запустити. */
export function codeBlockHtml(b, input = null, output = null, opts = {}) {
  const id = `cb${++seq}`;
  const flags = String(b.meta || "").split(/\s+/);
  const isErr = flags.includes("error");
  const runnable = /\bmain\s*\(/.test(b.text) && !flags.includes("norun");
  reg.codes.set(id, { code: b.text, input: input ?? "" });
  const showIO = opts.showIO !== false;
  return `<div class="code" id="${id}" data-code>` +
    `<div class="code-head"><span class="lang${isErr ? " err" : ""}">${isErr ? "C++ · з помилкою" : "C++"}</span>` +
    cbtn("code-copy", "copy", "Копіювати") +
    (runnable ? cbtn("code-edit", "edit", "Змінити") + cbtn("code-run", "play", "Запустити", " run") : "") +
    `</div><div class="code-view"><pre><code>${highlight(b.text)}</code></pre></div>` +
    (showIO ? ioHtml(input, output) : "") +
    `<div class="run-out" aria-live="polite"></div></div>`;
}

function stdinHtml(id, value, hidden = false) {
  return `<div class="stdin-box"${hidden ? " hidden" : ""}><label for="${id}">Введення для програми</label>` +
    `<textarea id="${id}" rows="2" spellcheck="false">${esc(value)}</textarea></div>`;
}

function codeEdit(box, btn) {
  const c = reg.codes.get(box.id);
  if (!c) return;
  if (box.classList.contains("editing")) {
    setValue(box.querySelector("textarea.code-input"), c.code);
    const si = box.querySelector(".stdin-box textarea");
    if (si) si.value = c.input;
    box.querySelector(".run-out").innerHTML = "";
    toast("Повернуто початковий код");
    return;
  }
  box.classList.add("editing");
  const view = box.querySelector(".code-view");
  view.innerHTML = editorHtml(c.code, "Код прикладу") +
    (c.input || readsInput(c.code) ? stdinHtml(`${box.id}-in`, c.input) : "");
  const io = box.querySelector(":scope > .io");
  if (io) io.hidden = true;
  btn.innerHTML = `${icon("reset")}Скинути`;
  const ta = view.querySelector("textarea.code-input");
  fit(ta);
  ta.focus();
}

async function codeRun(box) {
  const c = reg.codes.get(box.id);
  if (!c) return;
  const ta = box.querySelector("textarea.code-input");
  const si = box.querySelector(".stdin-box textarea");
  await runInto(box.querySelector(".run-out"), ta ? ta.value : c.code, si ? si.value : c.input, box);
}

/* ---------- Запуск і показ результату ---------- */

const cleanCompiler = text => String(text || "")
  .replace(/<source>:(\d+):(\d+):/g, "рядок $1:")
  .replace(/<source>:/g, "")
  .split("\n").slice(0, 30).join("\n").trim();

function compileErrorHtml(text) {
  const tips = explainErrors(text);
  const lines = errorLines(text);
  return status("bad", `Помилка компіляції${lines.length ? ` (${lines.length > 1 ? "рядки" : "рядок"} ${lines.slice(0, 4).join(", ")})` : ""}`) +
    (tips.length ? `<div class="explain"><b>Що могло статися:</b><ul>${tips.map(t => `<li>${t}</li>`).join("")}</ul></div>` : "") +
    `<pre class="err">${esc(cleanCompiler(text))}</pre>`;
}

function runResultHtml(r) {
  if (r.stage === "compile") return compileErrorHtml(r.compileOutput);
  let h = r.stage === "run"
    ? status(r.timedOut ? "warn" : "bad", r.timedOut ? "Програму зупинено: вона працювала задовго" : "Помилка під час виконання") + `<p class="run-note">${explainRun(r)}</p>`
    : status("ok", "Програма виконалася");
  h += r.stdout.length ? `<pre>${esc(r.stdout)}</pre>` : `<p class="empty-out">Програма нічого не вивела.</p>`;
  if (r.stage === "run" && r.stderr.trim()) h += `<pre class="err">${esc(r.stderr.slice(0, 2000))}</pre>`;
  return h;
}

function setBusy(scope, busy) {
  scope.querySelectorAll('[data-act="code-run"], [data-act="bench-run"], [data-act="bench-check"]').forEach(b => { b.disabled = busy; });
}

async function runInto(out, code, stdin, scope) {
  setBusy(scope, true);
  out.innerHTML = status("wait", "Компілюю і запускаю…");
  try {
    const r = await runCode(code, stdin);
    out.innerHTML = runResultHtml(r);
    return r;
  } catch (e) {
    out.innerHTML = status("bad", "Не вдалося запустити") + `<p class="run-note">${RUNNER_ERRORS[e.message] || RUNNER_ERRORS.server}</p>`;
    return null;
  } finally {
    setBusy(scope, false);
  }
}

/* ---------- Тест «Перевір себе» ---------- */

const LETTERS = "АБВГДЕЖ";

export function quizHtml(questions) {
  if (!questions.length) return "";
  const id = `qz${++seq}`;
  reg.quizzes.set(id, questions);
  const qs = questions.map((q, i) => `<div class="q" data-q="${i}">` +
    `<div class="q-text"><span class="qn">${i + 1}.</span>${inline(q.text)}</div>` +
    (q.code ? `<div class="code"><pre><code>${highlight(q.code)}</code></pre></div>` : "") +
    `<div class="q-opts">${q.options.map((o, j) =>
      `<button type="button" class="q-opt" data-act="answer" data-o="${j}"><span class="mark" aria-hidden="true">${LETTERS[j] || j + 1}</span><span>${inline(o.text)}</span></button>`).join("")}</div>` +
    `<div class="q-fb" aria-live="polite"></div></div>`).join("");
  return `<section class="quiz card" id="${id}">` +
    `<div class="quiz-head">${icon("quiz")}<b>Перевір себе</b><span class="quiz-score"></span></div>${qs}</section>`;
}

function answer(btn) {
  const quiz = btn.closest(".quiz"), qEl = btn.closest(".q");
  const questions = reg.quizzes.get(quiz.id);
  if (!questions) return;
  const q = questions[+qEl.dataset.q];
  const o = q.options[+btn.dataset.o];
  const fb = qEl.querySelector(".q-fb");
  if (o.right) {
    btn.classList.add("is-right");
    btn.querySelector(".mark").textContent = "✓";
    qEl.querySelectorAll(".q-opt").forEach(b => { b.disabled = true; });
    fb.innerHTML = `<span class="ok">Правильно!</span> ${q.expl ? inline(q.expl) : ""}`;
    qEl.dataset.done = qEl.dataset.wrong ? "late" : "first";
  } else {
    btn.classList.add("is-wrong");
    btn.disabled = true;
    btn.querySelector(".mark").textContent = "✗";
    qEl.dataset.wrong = "1";
    fb.innerHTML = `<span class="bad">Ні, це не так.</span> Подумай ще раз і спробуй інший варіант.`;
  }
  const all = [...quiz.querySelectorAll(".q")];
  const done = all.filter(x => x.dataset.done).length;
  const first = all.filter(x => x.dataset.done === "first").length;
  const score = quiz.querySelector(".quiz-score");
  if (done === all.length) {
    score.innerHTML = `З першої спроби: ${first} з ${all.length} · <button type="button" class="cbtn" data-act="quiz-reset">${icon("reset")}Ще раз</button>`;
    if (first === all.length) toast("Усі відповіді правильні з першої спроби!");
  } else {
    score.textContent = `Відповідей: ${done} з ${all.length}`;
  }
}

function quizReset(quiz) {
  quiz.querySelectorAll(".q").forEach(q => {
    delete q.dataset.done;
    delete q.dataset.wrong;
    q.querySelector(".q-fb").innerHTML = "";
    q.querySelectorAll(".q-opt").forEach((b, j) => {
      b.disabled = false;
      b.classList.remove("is-right", "is-wrong");
      b.querySelector(".mark").textContent = LETTERS[j] || j + 1;
    });
  });
  quiz.querySelector(".quiz-score").textContent = "";
}

/* ---------- Робоче місце: редактор, запуск і перевірка на тестах ---------- */

/**
 * key — де зберігати чернетку коду; tests — [{in, out}];
 * opts: { starter, examples (скільки перших тестів — приклади з умови), autoSolve, onSolved }
 */
export function benchHtml(key, tests, opts = {}) {
  const starter = opts.starter || TEMPLATE;
  reg.benches.set(key, { tests, starter, examples: opts.examples ?? tests.length, autoSolve: !!opts.autoSolve });
  const code = loadCode(key) ?? starter;
  const sid = `in-${domId(key)}`;
  const checkLabel = opts.autoSolve ? "Перевірити" : "Перевірити на прикладах";
  return `<div class="ex-work" data-bench="${esc(key)}">` +
    `<div class="code-head"><span class="lang">Твій розв’язок</span>` +
    cbtn("bench-copy", "copy", "Копіювати") + cbtn("bench-reset", "reset", "Почати заново") + `</div>` +
    editorHtml(code, "Твій розв’язок") +
    stdinHtml(sid, tests[0]?.in ?? "", true) +
    `<div class="ex-actions">` +
    (tests.length ? `<button class="btn btn-primary btn-sm" type="button" data-act="bench-check">${icon("check")}${checkLabel}</button>` : "") +
    `<button class="btn btn-ghost btn-sm" type="button" data-act="bench-run">${icon("play")}Запустити</button>` +
    `</div><div class="run-out" aria-live="polite"></div></div>`;
}

function benchOf(el) {
  const box = el.closest("[data-bench]");
  if (!box) return null;
  const b = reg.benches.get(box.dataset.bench);
  return b ? { box, b, key: box.dataset.bench, ta: box.querySelector("textarea.code-input") } : null;
}

async function benchRun(ctx) {
  const stdinBox = ctx.box.querySelector(".stdin-box");
  if (stdinBox.hidden) {
    stdinBox.hidden = false;
    // Перший запуск — одразу з даними першого прикладу; далі учень може змінити введення.
  }
  await runInto(ctx.box.querySelector(".run-out"), ctx.ta.value, stdinBox.querySelector("textarea").value, ctx.box);
}

const testsList = (results, total) => `<ul class="tests">${Array.from({ length: total }, (_, i) => {
  const r = results[i];
  if (!r) return `<li>○ Тест ${i + 1}</li>`;
  return r.pass ? `<li class="ok">✓ Тест ${i + 1}</li>` : `<li class="bad">✗ Тест ${i + 1}</li>`;
}).join("")}</ul>`;

function failHtml(test, got, idx, isExample) {
  const pre = t => `<pre>${esc(t) || " "}</pre>`;
  return `<p class="run-note">${isExample ? `Тест ${idx + 1} — це приклад з умови.` : `Тест ${idx + 1} — додатковий тест.`} Порівняй відповіді:</p>` +
    `<div class="diff"><div><span>Введення</span>${pre(test.in)}</div><div><span>Очікувалось</span>${pre(test.out)}</div><div><span>Твоя програма вивела</span>${pre(got)}</div></div>`;
}

async function benchCheck(ctx) {
  const { b, box, key } = ctx;
  const out = box.querySelector(".run-out");
  const code = ctx.ta.value;
  const results = [];
  setBusy(box, true);
  try {
    for (let i = 0; i < b.tests.length; i++) {
      out.innerHTML = status("wait", `Перевіряю: тест ${i + 1} з ${b.tests.length}…`) + testsList(results, b.tests.length);
      let r;
      try {
        r = await runCode(code, b.tests[i].in);
      } catch (e) {
        out.innerHTML = status("bad", "Не вдалося перевірити") + `<p class="run-note">${RUNNER_ERRORS[e.message] || RUNNER_ERRORS.server}</p>`;
        return;
      }
      if (r.stage === "compile") { out.innerHTML = compileErrorHtml(r.compileOutput); return; }
      const pass = r.stage === "done" && sameOutput(r.stdout, b.tests[i].out);
      results.push({ pass });
      if (!pass) {
        const head = r.stage === "run"
          ? status(r.timedOut ? "warn" : "bad", `Тест ${i + 1}: ${r.timedOut ? "перевищено час" : "помилка під час виконання"}`) + `<p class="run-note">${explainRun(r)}</p>`
          : status("bad", `Тест ${i + 1}: неправильна відповідь`);
        out.innerHTML = head + testsList(results, b.tests.length) + failHtml(b.tests[i], r.stdout, i, i < b.examples);
        return;
      }
    }
    if (b.autoSolve) {
      out.innerHTML = status("ok", "Усі тести пройдено! Задачу зараховано.") + testsList(results, b.tests.length);
      const wasSolved = isExerciseSolved(key);
      setExerciseSolved(key);
      const sec = box.closest(".ex");
      if (sec) {
        sec.classList.add("solved");
        const chip = sec.querySelector(".solved-chip");
        if (chip) chip.hidden = false;
      }
      if (!wasSolved) toast("Чудово! Задачу розв’язано ✓");
      document.dispatchEvent(new CustomEvent("oz:solved", { detail: key }));
    } else {
      out.innerHTML = status("ok", "Усі приклади з умови пройдено!") + testsList(results, b.tests.length) +
        `<p class="run-note">Приклади — лише частина тестів, на яких перевіряють розв’язок на олімпіаді. Подумай про особливі випадки (найменші й найбільші значення) і, якщо впевнений, познач задачу як розв’язану.</p>`;
      document.dispatchEvent(new CustomEvent("oz:examples-passed", { detail: key }));
    }
  } finally {
    setBusy(box, false);
  }
}

function benchReset(ctx) {
  if (!confirm("Стерти твій код і почати заново?")) return;
  setValue(ctx.ta, ctx.b.starter);
  dropCode(ctx.key);
  ctx.box.querySelector(".run-out").innerHTML = "";
}

/* ---------- Задача з уроку ---------- */

const LEVEL = { 1: ["Легка", "chip-ok"], 2: ["Середня", "chip-primary"], 3: ["Складна", "chip-violet"] };
export function levelChip(level) {
  const [t, cls] = LEVEL[level] || LEVEL[1];
  return `<span class="chip ${cls}">${t}</span>`;
}

export function samplesHtml(examples) {
  if (!examples || !examples.length) return "";
  const pre = t => `<pre>${esc(t)}</pre>`;
  const items = examples.map(e => {
    const note = e.note ? `<div class="sample-note">${inline(e.note)}</div>` : "";
    if (!e.in) return `<div class="sample" style="grid-template-columns:1fr"><div><span class="io-label out">Програма виводить</span>${pre(e.out)}</div>${note}</div>`;
    return `<div class="sample"><div><span class="io-label in">Введення</span>${pre(e.in)}</div><div><span class="io-label out">Виведення</span>${pre(e.out)}</div>${note}</div>`;
  }).join("");
  return `<h4>${examples.length > 1 ? "Приклади" : "Приклад"}</h4><div class="samples">${items}</div>`;
}

function hintsHtml(key) {
  const hints = reg.hints.get(key) || [];
  const n = Math.min(hintShown.get(key) || 0, hints.length);
  let h = n ? `<ol>${hints.slice(0, n).map(x => `<li>${inline(x)}</li>`).join("")}</ol>` : "";
  if (n < hints.length) h += `<button class="btn btn-soft btn-sm" type="button" data-act="hint">${icon("bulb")}${n ? "Ще одна підказка" : "Підказка"} (${n + 1} з ${hints.length})</button>`;
  return h;
}

/** Підказки для задач на сторінках задач (не в уроках). */
export function hintsBlock(key, hints) {
  if (!hints || !hints.length) return "";
  reg.hints.set(key, hints);
  return `<div class="hints" data-hints="${esc(key)}">${hintsHtml(key)}</div>`;
}

export function solutionHtml(code, input) {
  if (!code) return "";
  return `<details class="solution"><summary>Показати розв’язок</summary>` +
    `<p class="warn-line">Спершу спробуй розв’язати сам — так навчишся найбільше.</p>` +
    codeBlockHtml({ text: code, meta: "" }, input ?? null, null, { showIO: false }) + `</details>`;
}

export function exerciseHtml(lessonId, ex, n) {
  const key = `${lessonId}/${ex.id || n}`;
  const tests = [...ex.examples, ...ex.tests];
  const solved = isExerciseSolved(key);
  return `<section class="ex card${solved ? " solved" : ""}" id="ex-${domId(key)}" data-ex="${esc(key)}">` +
    `<div class="ex-head"><span class="num">Задача ${n}</span>${levelChip(ex.level)}` +
    `<span class="chip chip-ok solved-chip"${solved ? "" : " hidden"}>${icon("check")}Розв’язано</span>` +
    `<h3>${inline(ex.title)}</h3></div>` +
    `<div class="ex-body">${renderMarkdown(ex.statement)}` +
    (ex.input ? `<h4>Вхідні дані</h4>${renderMarkdown(ex.input)}` : "") +
    (ex.output ? `<h4>Вихідні дані</h4>${renderMarkdown(ex.output)}` : "") +
    samplesHtml(ex.examples) +
    (ex.note ? renderMarkdown(ex.note) : "") +
    hintsBlock(key, ex.hints) +
    `</div>` +
    benchHtml(key, tests, { starter: ex.starter, examples: ex.examples.length, autoSolve: true }) +
    (ex.solution ? `<div class="ex-foot">${solutionHtml(ex.solution, ex.examples[0]?.in)}</div>` : "") +
    `</section>`;
}

/** Обробники для markdown.renderBlocks на сторінці уроку. */
export function lessonHooks(lessonId) {
  let n = 0;
  return {
    code: (b, input, output) => codeBlockHtml(b, input, output),
    quiz: questions => quizHtml(questions),
    exercise: ex => exerciseHtml(lessonId, ex, ++n)
  };
}

/* ---------- Обробка дій ---------- */

/** Повертає true, якщо дію оброблено. */
export function widgetAction(act, el) {
  switch (act) {
    case "code-copy": {
      const box = el.closest(".code");
      const ta = box.querySelector("textarea.code-input");
      copyText(ta ? ta.value : reg.codes.get(box.id)?.code ?? box.querySelector("pre").textContent);
      return true;
    }
    case "code-edit": codeEdit(el.closest(".code"), el); return true;
    case "code-run": codeRun(el.closest(".code")); return true;
    case "answer": answer(el); return true;
    case "quiz-reset": quizReset(el.closest(".quiz")); return true;
    case "hint": {
      const box = el.closest("[data-hints]") || el.closest(".hints");
      const key = box.dataset.hints || el.closest("[data-ex]")?.dataset.ex;
      if (!key) return true;
      hintShown.set(key, (hintShown.get(key) || 0) + 1);
      box.innerHTML = hintsHtml(key);
      box.querySelector("button")?.focus();
      return true;
    }
    case "bench-copy": { const c = benchOf(el); if (c) copyText(c.ta.value); return true; }
    case "bench-reset": { const c = benchOf(el); if (c) benchReset(c); return true; }
    case "bench-run": { const c = benchOf(el); if (c) benchRun(c); return true; }
    case "bench-check": { const c = benchOf(el); if (c) benchCheck(c); return true; }
  }
  return false;
}

let saveTimer = null;
/** Зберігає чернетку коду учня під час набору. */
export function widgetInput(e) {
  const ta = e.target;
  if (!(ta instanceof HTMLTextAreaElement) || !ta.classList.contains("code-input")) return;
  const box = ta.closest("[data-bench]");
  if (!box) return;
  clearTimeout(saveTimer);
  const key = box.dataset.bench;
  saveTimer = setTimeout(() => saveCode(key, ta.value), 400);
}

/** Ctrl+Enter у редакторі: перевірити (у задачі) або запустити (у прикладі). */
export function widgetHotkey(e) {
  if (!(e.key === "Enter" && (e.ctrlKey || e.metaKey))) return false;
  const ta = e.target;
  if (!(ta instanceof HTMLTextAreaElement) || !ta.classList.contains("code-input")) return false;
  e.preventDefault();
  const c = benchOf(ta);
  if (c) { (c.b.tests.length ? benchCheck : benchRun)(c); return true; }
  const box = ta.closest(".code");
  if (box) codeRun(box);
  return true;
}
