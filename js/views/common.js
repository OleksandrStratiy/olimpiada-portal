// Спільні елементи сторінок: заголовок сторінки, мітки рівня й стану, рядок задачі, прогрес, навігація.
import { esc, plural } from "../utils.js";
import { LEVEL_SHORT, statusOf, solvedCount } from "../state.js";

const lvl = level => Math.min(3, Math.max(1, +level || 1));

/** Мітка рівня складності: Розминка / Середній / Складний. */
export const levelPill = level => `<span class="pill pill--l${lvl(level)}">${LEVEL_SHORT[lvl(level)]}</span>`;

/** Мітка стану задачі (порожньо, якщо задачу ще не розпочато). */
export function statusChip(id) {
  const s = statusOf(id);
  if (s === "solved") return `<span class="chip chip--solved">✓ Розв’язано</span>`;
  if (s === "trying") return `<span class="chip chip--trying">Розв’язую</span>`;
  return "";
}

export const problemHref = p => `#/problem/${encodeURIComponent(p.id)}`;
export const countWord = (n, one, few, many) => `${n} ${plural(n, one, few, many)}`;
export const tasksWord = n => countWord(n, "задача", "задачі", "задач");

/**
 * Рядок списку задач: назва задачі (як у «Задача Назва.»), під нею українська назва.
 * num — порядковий номер у категорії (кольоровий за рівнем); showLevel — показати мітку рівня.
 */
export function rowHtml(p, { num = null, sub = "", showLevel = true } = {}) {
  const small = [p.title, sub].filter(Boolean).map(esc).join(" · ");
  return `<a class="task-row${num == null ? " task-row--plain" : ""}" href="${problemHref(p)}">
      ${num == null ? "" : `<span class="task-row__num task-row__num--l${lvl(p.level)}">${num}</span>`}
      <span class="task-row__main"><span class="task-row__id">${esc(p.id)}</span><span class="task-row__title">${small}</span></span>
      <span class="task-row__tags">${statusChip(p.id)}${showLevel ? levelPill(p.level) : ""}</span>
    </a>`;
}

export const taskList = (rows) => `<div class="task-list">${rows}</div>`;

/** Смужка прогресу: скільки задач зі списку розв’язано. */
export function progressBar(list) {
  const s = solvedCount(list);
  const pct = list.length ? Math.round(100 * s / list.length) : 0;
  return `<div class="progress">
    <div class="progress__bar" role="img" aria-label="Розв’язано ${pct}%"><span class="progress__fill" style="width:${pct}%"></span></div>
    <span class="progress__text">${s} з ${list.length}</span>
  </div>`;
}

/** Склад категорії за рівнями: ширина відрізка — кількість задач, зафарбована частина — розв’язані. */
export function levelBar(list) {
  const parts = [1, 2, 3].map(l => {
    const items = list.filter(p => lvl(p.level) === l);
    return { l, n: items.length, s: solvedCount(items) };
  }).filter(x => x.n);
  if (!parts.length) return "";
  const segs = parts.map(x => `<span class="levelbar__seg levelbar__seg--l${x.l}" style="flex:${x.n}" title="${LEVEL_SHORT[x.l]}: розв’язано ${x.s} з ${x.n}"><span class="levelbar__done" style="width:${Math.round(100 * x.s / x.n)}%"></span></span>`).join("");
  const legend = parts.map(x => `<span class="levelbar-legend__item levelbar-legend__item--l${x.l}">${LEVEL_SHORT[x.l]} ${x.n}</span>`).join("");
  return `<div><div class="levelbar" role="img" aria-label="Задачі за рівнями">${segs}</div><div class="levelbar-legend">${legend}</div></div>`;
}

/** Заголовок сторінки: хлібні крихти, назва, підзаголовок, вступ і довільний рядок під ними. */
export function pageHead({ crumbs = [], title, sub = "", lead = "", row = "" }) {
  const path = crumbs.length
    ? `<nav class="crumbs" aria-label="Шлях">${crumbs.map(([href, label]) => `<a href="${href}">${esc(label)}</a>`).join(`<span class="crumbs__sep" aria-hidden="true">/</span>`)}</nav>`
    : "";
  return `<header class="page-head">
    ${path}
    <h1 class="page-head__title">${esc(title)}</h1>
    ${sub ? `<p class="page-head__sub">${esc(sub)}</p>` : ""}
    ${lead ? `<p class="page-head__lead">${lead}</p>` : ""}
    ${row ? `<div class="page-head__row">${row}</div>` : ""}
  </header>`;
}

/** Заголовок розділу; level додає кольорову позначку рівня. */
export function sectionHead(title, { count = "", text = "", level = 0 } = {}) {
  return `<div class="section-head">
    <h2 class="section-head__title${level ? ` section-head__title--l${level}` : ""}">${esc(title)}</h2>
    ${count ? `<span class="section-head__count">${count}</span>` : ""}
    ${text ? `<p class="section-head__text">${text}</p>` : ""}
  </div>`;
}

export function notFound(msg) {
  document.title = "Сторінку не знайдено — Зошит олімпіадника";
  return `${pageHead({ title: "Сторінку не знайдено", lead: esc(msg) })}<a class="btn btn--primary" href="#/">До задач</a>`;
}

export function pager(prev, next, prevLabel, nextLabel, href, text) {
  if (!prev && !next) return "";
  return `<nav class="pager" aria-label="Навігація">
    ${prev ? `<a class="pager__link" href="${href(prev)}"><span class="pager__label">← ${prevLabel}</span><span class="pager__title">${esc(text(prev))}</span></a>` : ""}
    ${next ? `<a class="pager__link pager__link--next" href="${href(next)}"><span class="pager__label">${nextLabel} →</span><span class="pager__title">${esc(text(next))}</span></a>` : ""}
  </nav>`;
}
