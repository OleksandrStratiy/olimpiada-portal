// Головна сторінка «Задачі»: шлях підготовки, задача дня, статистика і картки категорій.
import { esc, fmtInline, dateWords, plural } from "../utils.js";
import {
  state, training, archive, statusOf, categoryTitle, activeCategories, practiceIn, archiveIn, solvedCount
} from "../state.js";
import { problemHref, levelPill, levelBar, countWord, tasksWord } from "./common.js";

/** Категорії з тренувальними задачами — це кроки шляху підготовки. */
const pathCategories = () => activeCategories().filter(c => practiceIn(c.id).length);

/** Поточний крок: перша категорія, де ще є нерозв’язані задачі. */
function currentCategory() {
  return pathCategories().find(c => practiceIn(c.id).some(p => statusOf(p.id) !== "solved")) || null;
}

/** Задача дня: з поточної категорії й з найлегшого рівня, де ще є нерозв’язані задачі. */
function pickProblem() {
  const day = Math.floor(Date.now() / 86400000);
  const c = currentCategory();
  if (c) {
    const left = practiceIn(c.id).filter(p => statusOf(p.id) !== "solved");
    const lvl = Math.min(...left.map(p => p.level || 1));
    const pool = left.filter(p => (p.level || 1) === lvl);
    return pool[day % pool.length];
  }
  const all = training();
  return all.length ? all[day % all.length] : null;
}

function excerptOf(p) {
  const firstPara = String(p.statement || "").split(/\n\s*\n/).find(s => !s.trim().startsWith("[[img:")) || "";
  const sents = firstPara.split(/(?<=[.!?])\s/);
  let text = sents[0] || "";
  for (let k = 1; k < sents.length && text.length < 110; k++) text += " " + sents[k];
  return text;
}

function steps() {
  const cats = pathCategories();
  const cur = currentCategory();
  const items = cats.map((c, i) => {
    const list = practiceIn(c.id);
    const s = solvedCount(list);
    const done = s === list.length;
    const mod = done ? " steps__item--done" : c === cur ? " steps__item--current" : "";
    return `<li class="steps__item${mod}">
      <a class="steps__link" href="#/category/${encodeURIComponent(c.id)}"${c === cur ? ' aria-current="step"' : ""}>
        <span class="steps__marker">${done ? "✓" : i + 1}</span>
        <span class="steps__label">${esc(c.title)}</span>
        <span class="steps__meta">${s} / ${list.length}</span>
      </a>
    </li>`;
  }).join("");
  return `<ol class="steps" style="--n:${cats.length}" aria-label="Шлях підготовки">${items}</ol>`;
}

function daily() {
  const p = pickProblem();
  if (!p) return "";
  return `<article class="daily" aria-label="Задача дня">
    <div class="daily__top"><span class="daily__badge">Задача дня</span><span class="daily__date">${esc(dateWords(new Date()))}</span></div>
    <h2 class="daily__title">${esc(p.title)}</h2>
    <div class="daily__meta"><span>${esc(p.id)}</span><span aria-hidden="true">·</span><span>${esc(categoryTitle(p.category))}</span>${levelPill(p.level)}</div>
    <p class="daily__text">${fmtInline(excerptOf(p))}</p>
    <a class="btn btn--primary daily__go" href="${problemHref(p)}">Розв’язувати</a>
  </article>`;
}

function stats() {
  const solved = solvedCount(state.problems);
  const trying = state.problems.filter(p => statusOf(p.id) === "trying").length;
  const tr = training().length, ar = archive().length;
  const stat = (value, label, mod = "") => `<div class="stat${mod}"><div class="stat__value">${value}</div><div class="stat__label">${label}</div></div>`;
  return `<div class="stats">
    ${stat(solved, plural(solved, "задача розв’язана", "задачі розв’язані", "задач розв’язано"), " stat--ok")}
    ${stat(trying, "розв’язую зараз", " stat--brand")}
    ${stat(tr, plural(tr, "тренувальна задача", "тренувальні задачі", "тренувальних задач"))}
    ${stat(ar, plural(ar, "задача з олімпіад", "задачі з олімпіад", "задач з олімпіад"))}
  </div>`;
}

function categoryCard(c, i) {
  const list = practiceIn(c.id);
  const arc = archiveIn(c.id).length;
  const solved = solvedCount(list);
  const counts = [list.length ? tasksWord(list.length) : "", arc ? `${arc} з олімпіад` : ""].filter(Boolean).join(" · ");
  return `<a class="cat-card" href="#/category/${encodeURIComponent(c.id)}">
    <div class="cat-card__head"><span class="cat-card__num">${i + 1}</span><h3 class="cat-card__title">${esc(c.title)}</h3></div>
    <p class="cat-card__text">${esc(c.summary)}</p>
    ${levelBar(list)}
    <div class="cat-card__foot"><span>${counts}</span>${solved ? `<span class="cat-card__done">розв’язано ${solved} з ${list.length}</span>` : ""}</div>
  </a>`;
}

export function viewHome() {
  document.title = "Зошит олімпіадника — задачі з C++";
  const cats = activeCategories();
  return `<section class="hero">
      <div class="hero__intro">
        <p class="eyebrow">C++ · підготовка до олімпіади з інформатики</p>
        <h1 class="hero__title">Від першого if до олімпіадних задач</h1>
        <p class="hero__lead">Проходь категорії по черзі: у кожній задачі розкладено від легких до складних, а наприкінці — задачі районних олімпіад на ту саму тему. Позначки «розв’язано» зберігаються в цьому браузері.</p>
        ${steps()}
      </div>
      ${daily()}
    </section>
    ${stats()}
    <section class="section">
      ${cats.length ? `<div class="section-head"><h2 class="section-head__title">Категорії</h2><span class="section-head__count">${countWord(cats.length, "категорія", "категорії", "категорій")}</span></div>
        <div class="card-grid">${cats.map(categoryCard).join("")}</div>`
        : `<div class="empty">Задач поки немає. Учитель може додати їх у розділі «Для вчителя».</div>`}
    </section>`;
}
