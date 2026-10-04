// Точка входу: завантаження даних, маршрутизація за #адресою, обробка подій.
import { esc, toast, copyText, figurePlaceholder } from "./utils.js";
import { state, loadData, findProblem, setStatus, resetProgress, savedTheme, saveTheme } from "./state.js";
import { viewHome, problemRows } from "./views/home.js";
import { viewProblem, hintsHtml } from "./views/problem.js";
import { viewArchive, viewYear } from "./views/archive.js";
import { viewTheory, viewTopic } from "./views/theory.js";
import { viewProgress } from "./views/progress.js";
import { viewTeacher, teacherAction, teacherSubmit, teacherImport } from "./views/teacher.js";
import { notFound } from "./views/common.js";

const app = document.getElementById("app");

/* ---------- Маршрути ---------- */
function route() {
  const [a, b] = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  if (!a) return [viewHome(), "problems"];
  if (a === "problem") {
    const p = findProblem(b);
    return [viewProblem(b), p && p.year ? "archive" : "problems"];
  }
  if (a === "archive") return [b ? viewYear(b) : viewArchive(), "archive"];
  if (a === "theory") return [b ? viewTopic(b) : viewTheory(), "theory"];
  if (a === "progress") return [viewProgress(), "progress"];
  if (a === "teacher") return [viewTeacher(), "teacher"];
  return [notFound("Перевір адресу або повернись до списку задач."), ""];
}

function render(scroll = true) {
  const [html, nav] = route();
  app.innerHTML = html;
  document.querySelectorAll("[data-nav]").forEach(el => {
    if (el.dataset.nav === nav) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
  if (scroll) window.scrollTo(0, 0);
}

/* ---------- Тема ---------- */
function isDark() {
  const t = document.documentElement.dataset.theme;
  if (t) return t === "dark";
  return window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
}
function syncThemeButton() {
  document.getElementById("theme-btn").textContent = isDark() ? "Світла тема" : "Темна тема";
}
function initTheme() {
  const t = savedTheme();
  if (t === "dark" || t === "light") document.documentElement.dataset.theme = t;
  syncThemeButton();
}

/* ---------- Події ---------- */
function onClick(e) {
  const el = e.target.closest("[data-act]");
  if (!el) return;
  const act = el.dataset.act;
  if (teacherAction(act, el, render)) { e.preventDefault(); return; }
  switch (act) {
    case "copy":
      copyText(el.closest(".codewrap").querySelector("pre").textContent);
      break;
    case "hint": {
      const p = findProblem(el.dataset.id);
      state.hintShown[p.id] = (state.hintShown[p.id] || 0) + 1;
      document.getElementById("hints").innerHTML = hintsHtml(p);
      document.querySelector('#hints [data-act="hint"]')?.focus();
      break;
    }
    case "status": {
      const v = el.dataset.v;
      setStatus(el.dataset.id, v);
      el.parentElement.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === v)));
      if (v === "solved") toast("Молодець! Задачу позначено як розв’язану");
      break;
    }
    case "theme": {
      const t = isDark() ? "light" : "dark";
      document.documentElement.dataset.theme = t;
      saveTheme(t);
      syncThemeButton();
      break;
    }
    case "reset-progress":
      if (confirm("Очистити всі позначки «Розв’язую» і «Розв’язано»?")) { resetProgress(); render(false); }
      break;
  }
}

function onInput(e) {
  const key = e.target.dataset?.filter;
  if (!key) return;
  state.filter[key] = e.target.value;
  const list = document.getElementById("plist");
  if (list) list.innerHTML = problemRows();
}

function onSubmit(e) {
  if (teacherSubmit(e.target, render)) e.preventDefault();
}

function onChange(e) {
  if (e.target.id === "import-file" && e.target.files[0]) {
    teacherImport(e.target.files[0], render);
    e.target.value = "";
  }
}

/** Якщо файла малюнка ще немає, показуємо заглушку зі шляхом, куди його покласти. */
function onImageError(e) {
  const img = e.target;
  if (img instanceof HTMLImageElement && img.dataset.fig) img.replaceWith(figurePlaceholder(img.dataset.fig));
}

/* ---------- Запуск ---------- */
async function start() {
  initTheme();
  try {
    await loadData();
  } catch (err) {
    const local = location.protocol === "file:";
    app.innerHTML = `<div class="wrap fail"><h1>Не вдалося завантажити дані</h1>
      ${local
        ? `<p class="lead">Сторінку відкрито як файл, а браузер не дозволяє файлу читати інші файли. Запусти локальний сервер у папці проєкту, наприклад <code>python -m http.server</code>, і відкрий <code>http://localhost:8000</code>. Докладніше — у README.md.</p>`
        : `<p class="lead">Перевір, що на сервері є папка <code>data/</code> з файлами JSON.</p>`}
      <p class="muted">${esc(err.message)}</p></div>`;
    return;
  }
  document.addEventListener("click", onClick);
  document.addEventListener("input", onInput);
  document.addEventListener("submit", onSubmit);
  document.addEventListener("change", onChange);
  document.addEventListener("error", onImageError, true);
  window.addEventListener("hashchange", () => { state.editing = null; render(); });
  render(false);
}

start();
