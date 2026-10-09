// Точка входу: завантаження даних, маршрутизація за #адресою, обробка подій.
import { esc, toast, copyText, figurePlaceholder } from "./utils.js";
import { SHOW_SOLUTIONS } from "./config.js";
import { state, loadData, findProblem, isArchive, setStatus, resetProgress, savedTheme, saveTheme } from "./state.js";
import { viewHome } from "./views/home.js";
import { viewCategory } from "./views/category.js";
import { viewProblem, hintsHtml } from "./views/problem.js";
import { viewSolutionsIndex, viewSolutions } from "./views/solutions.js";
import { viewArchive, viewYear } from "./views/archive.js";
import { viewTheory, viewTopic } from "./views/theory.js";
import { viewProgress } from "./views/progress.js";
import { viewTeacher, teacherAction, teacherSubmit, teacherImport } from "./views/teacher.js";
import { notFound } from "./views/common.js";

const app = document.getElementById("app");

/* ---------- Маршрути ---------- */
/** Повертає [html, активний пункт меню, id елемента, до якого прокрутити]. */
function route() {
  const [a, b, c] = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  if (!a) return [viewHome(), "problems"];
  if (a === "category") return [viewCategory(b), "problems"];
  if (a === "problem") {
    const p = findProblem(b);
    return [viewProblem(b), p && isArchive(p) ? "archive" : "problems"];
  }
  if (a === "solutions") {
    if (!SHOW_SOLUTIONS) return [notFound("Розв’язки зараз приховані."), "solutions"];
    return [b ? viewSolutions(b) : viewSolutionsIndex(), "solutions", c ? `sol-${c}` : null];
  }
  if (a === "archive") return [b ? viewYear(b) : viewArchive(), "archive"];
  if (a === "theory") return [b ? viewTopic(b) : viewTheory(), "theory"];
  if (a === "progress") return [viewProgress(), "progress"];
  if (a === "teacher") return [viewTeacher(), "teacher"];
  return [notFound("Перевір адресу або повернись до задач."), ""];
}

function render(scroll = true) {
  const [html, nav, anchor] = route();
  app.innerHTML = html;
  document.querySelectorAll("[data-nav]").forEach(el => {
    if (el.dataset.nav === nav) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
  // на вузькому екрані вкладки прокручуються — показуємо активну
  const tabs = document.querySelector(".nav");
  const active = tabs && tabs.querySelector('[aria-current="page"]');
  if (active && tabs.scrollWidth > tabs.clientWidth) {
    const left = active.offsetLeft - tabs.offsetLeft;
    tabs.scrollLeft = Math.max(0, left - (tabs.clientWidth - active.offsetWidth) / 2);
  }
  const target = anchor && document.getElementById(anchor);
  if (target) target.scrollIntoView();
  else if (scroll) window.scrollTo(0, 0);
}

/* ---------- Тема ---------- */
function isDark() {
  const t = document.documentElement.dataset.theme;
  if (t) return t === "dark";
  return window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
}
const SUN = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8"/></svg>`;
const MOON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/></svg>`;

function syncThemeButton() {
  const btn = document.getElementById("theme-btn");
  const label = isDark() ? "Світла тема" : "Темна тема";
  btn.innerHTML = isDark() ? SUN : MOON;
  btn.setAttribute("aria-label", label);
  btn.title = label;
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
      copyText(el.closest("[data-copy-root]").querySelector("pre").textContent);
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
  if (!SHOW_SOLUTIONS) document.querySelector('[data-nav="solutions"]')?.remove();
  try {
    await loadData();
  } catch (err) {
    const local = location.protocol === "file:";
    app.innerHTML = `<header class="page-head"><h1 class="page-head__title">Не вдалося завантажити дані</h1>
      ${local
        ? `<p class="page-head__lead">Сторінку відкрито як файл, а браузер не дозволяє файлу читати інші файли. Запусти локальний сервер у папці проєкту, наприклад <code>python -m http.server</code>, і відкрий <code>http://localhost:8000</code>. Докладніше — у README.md.</p>`
        : `<p class="page-head__lead">Перевір, що на сервері є папка <code>data/</code> з файлами JSON.</p>`}</header>
      <p class="muted">${esc(err.message)}</p>`;
    return;
  }
  document.addEventListener("click", onClick);
  document.addEventListener("submit", onSubmit);
  document.addEventListener("change", onChange);
  document.addEventListener("error", onImageError, true);
  window.addEventListener("hashchange", () => { state.editing = null; render(); });
  render(false);
}

start();
