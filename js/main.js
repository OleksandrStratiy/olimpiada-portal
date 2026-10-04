// Точка входу: завантаження даних, маршрутизація за #адресою, обробка подій.
import { esc, toast, downloadText } from "./utils.js";
import { loadProgress, savedTheme, saveTheme, setLessonDone, setProblemStatus, problemStatus, exportProgress, importProgress, resetProgress } from "./store.js";
import { loadData, findProblem, lessonById } from "./data.js";
import { initEditors, onEditorKey, onEditorInput, onEditorScroll } from "./editor.js";
import { resetWidgets, widgetAction, widgetInput, widgetHotkey } from "./widgets.js";
import { viewHome } from "./views/home.js";
import { viewCourse } from "./views/course.js";
import { viewLesson, lessonDonePanel } from "./views/lesson.js";
import { viewProblems, problemRows, filter } from "./views/problems.js";
import { viewProblem } from "./views/problem.js";
import { viewOlympiads, viewYear } from "./views/olympiads.js";
import { viewProgress } from "./views/progress.js";
import { viewTeacher, teacherAction, teacherSubmit, teacherImport, resetTeacherForm } from "./views/teacher.js";
import { notFound } from "./views/common.js";

const app = document.getElementById("app");

/* ---------- Маршрути ---------- */
function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, anchor = ""] = raw.split("#");
  const parts = path.split("/").filter(Boolean).map(s => { try { return decodeURIComponent(s); } catch (e) { return s; } });
  return { parts, anchor };
}

function route() {
  const { parts: [a, b], anchor } = parseHash();
  const r = (view, nav) => ({ view, nav, anchor });
  switch (a) {
    case undefined: return r(viewHome, "");
    case "course": return r(viewCourse, "course");
    case "lesson": return r(() => viewLesson(b), "course");
    case "problems": return r(viewProblems, "problems");
    case "problem": {
      const p = findProblem(b);
      return r(() => viewProblem(b), p && p.year ? "olympiads" : "problems");
    }
    case "olympiads": case "archive": return r(() => (b ? viewYear(b) : viewOlympiads()), "olympiads");
    case "theory": return r(viewCourse, "course");
    case "progress": return r(viewProgress, "progress");
    case "teacher": return r(viewTeacher, "teacher");
  }
  return r(() => notFound("Перевір адресу або перейди до курсу."), "");
}

function render(scroll = true) {
  resetWidgets();
  const { view, nav, anchor } = route();
  const result = view();
  const pending = typeof result === "object" && result !== null;
  app.innerHTML = pending ? result.html : result;
  document.querySelectorAll("[data-nav]").forEach(el => {
    if (el.dataset.nav === nav) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
  initEditors(app);
  if (pending && result.wait) {
    const hash = location.hash;
    result.wait
      .then(() => { if (location.hash === hash) render(false); })
      .catch(err => {
        if (location.hash !== hash) return;
        app.innerHTML = `<div class="page narrow"><h1>Не вдалося завантажити сторінку</h1><p class="lead">Перевір підключення до інтернету і онови сторінку.</p><p class="muted">${esc(err.message)}</p></div>`;
      });
  }
  if (anchor && !pending) {
    const el = document.getElementById(anchor);
    if (el) { el.scrollIntoView({ block: "start" }); return; }
  }
  if (scroll) window.scrollTo(0, 0);
}

/* ---------- Тема ---------- */
function isDark() {
  const t = document.documentElement.dataset.theme;
  if (t) return t === "dark";
  return window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
}
function syncTheme() {
  const dark = isDark();
  document.documentElement.classList.toggle("is-dark", dark);
  const btn = document.getElementById("theme-btn");
  const label = dark ? "Світла тема" : "Темна тема";
  btn.setAttribute("aria-label", label);
  btn.title = label;
}

/* ---------- Події ---------- */
function refreshLessonPanel() {
  const panel = document.getElementById("lesson-done");
  const { parts: [a, b] } = parseHash();
  const l = a === "lesson" && lessonById(b);
  if (panel && l) panel.outerHTML = lessonDonePanel(l);
}

function onClick(e) {
  const el = e.target.closest("[data-act]");
  if (!el) return;
  const act = el.dataset.act;
  if (widgetAction(act, el)) {
    // Задача на сторінці задачі, яку почали розв’язувати, отримує позначку «Розв’язую».
    const page = el.closest("[data-problem]");
    if (page && (act === "bench-check" || act === "bench-run") && !problemStatus(page.dataset.problem)) {
      setProblemStatus(page.dataset.problem, "trying");
      page.querySelectorAll('[data-act="status"]').forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === "trying")));
    }
    return;
  }
  if (teacherAction(act, el, render)) { e.preventDefault(); return; }
  switch (act) {
    case "theme": {
      const t = isDark() ? "light" : "dark";
      document.documentElement.dataset.theme = t;
      saveTheme(t);
      syncTheme();
      break;
    }
    case "goto": {
      const t = document.getElementById(el.dataset.target);
      if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
      break;
    }
    case "lesson-done":
      setLessonDone(el.dataset.id, true);
      refreshLessonPanel();
      toast("Урок пройдено! Так тримати");
      break;
    case "lesson-undone":
      setLessonDone(el.dataset.id, false);
      refreshLessonPanel();
      break;
    case "status": {
      const v = el.dataset.v;
      setProblemStatus(el.dataset.id, v);
      el.parentElement.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === v)));
      if (v === "solved") toast("Молодець! Задачу позначено як розв’язану");
      break;
    }
    case "source":
      filter.source = el.dataset.v;
      el.parentElement.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b === el)));
      document.getElementById("plist").innerHTML = problemRows();
      break;
    case "export-progress": {
      const d = new Date();
      const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      downloadText(`progress-${stamp}.json`, exportProgress());
      break;
    }
    case "reset-progress":
      if (confirm("Очистити всі позначки: пройдені уроки, розв’язані задачі і збережений код?")) {
        resetProgress();
        render(false);
        toast("Прогрес очищено");
      }
      break;
  }
}

function onInput(e) {
  if (onEditorInput(e)) { widgetInput(e); return; }
  const key = e.target.dataset?.filter;
  if (key) {
    filter[key] = e.target.value;
    const list = document.getElementById("plist");
    if (list) list.innerHTML = problemRows();
  }
}

function onKeydown(e) {
  if (widgetHotkey(e)) return;
  onEditorKey(e);
}

function onChange(e) {
  const input = e.target;
  if (!(input instanceof HTMLInputElement) || input.type !== "file" || !input.files[0]) return;
  const file = input.files[0];
  if (input.id === "import-file") teacherImport(file, render);
  if (input.id === "progress-file") {
    file.text().then(text => {
      if (importProgress(text)) { render(false); toast("Прогрес відновлено"); }
      else alert("Це не файл прогресу. Вибери файл, збережений кнопкою «Зберегти прогрес у файл».");
    });
  }
  input.value = "";
}

function onSubmit(e) {
  if (teacherSubmit(e.target, render)) e.preventDefault();
}

/** Якщо файла малюнка до умови ще немає, показуємо заглушку зі шляхом, куди його покласти. */
function onImageError(e) {
  const img = e.target;
  if (img instanceof HTMLImageElement && img.dataset.fig) {
    const ph = document.createElement("div");
    ph.className = "fig-ph";
    ph.innerHTML = `<span>Тут буде малюнок</span><code>${esc(img.dataset.fig)}</code>`;
    img.replaceWith(ph);
  }
}

/* ---------- Запуск ---------- */
async function start() {
  syncTheme();
  if (window.matchMedia) matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", syncTheme);
  loadProgress();
  try {
    await loadData();
  } catch (err) {
    const local = location.protocol === "file:";
    app.innerHTML = `<div class="page narrow"><h1>Не вдалося завантажити дані</h1>
      ${local
        ? `<p class="lead">Сторінку відкрито як файл, а браузер не дозволяє файлу читати інші файли. Запусти локальний сервер у папці проєкту, наприклад <code>python -m http.server</code>, і відкрий <code>http://localhost:8000</code>. Докладніше — у README.md.</p>`
        : `<p class="lead">Перевір підключення до інтернету й онови сторінку.</p>`}
      <p class="muted">${esc(err.message)}</p></div>`;
    return;
  }
  document.addEventListener("click", onClick);
  document.addEventListener("input", onInput);
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("change", onChange);
  document.addEventListener("submit", onSubmit);
  document.addEventListener("scroll", onEditorScroll, true);
  document.addEventListener("error", onImageError, true);
  document.addEventListener("oz:solved", refreshLessonPanel);
  window.addEventListener("hashchange", () => { resetTeacherForm(); render(); });
  window.addEventListener("resize", () => initEditors(app));
  render(false);
}

start();
