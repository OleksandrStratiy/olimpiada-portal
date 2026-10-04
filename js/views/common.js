// Спільні елементи сторінок: рядок задачі в списку, рівень, позначка стану.
import { esc } from "../utils.js";
import { LEVELS, statusOf } from "../state.js";

export function dots(level) {
  const l = Math.min(3, Math.max(1, +level || 1));
  return `<span class="lvl" title="${LEVELS[l]}" aria-label="Рівень: ${LEVELS[l]}">${"●".repeat(l)}${"○".repeat(3 - l)}</span>`;
}

export function markHtml(id) {
  const s = statusOf(id);
  if (s === "solved") return `<span class="mark" title="Розв’язано" aria-label="Розв’язано">✓</span>`;
  if (s === "trying") return `<span class="mark trying" title="Розв’язую" aria-label="Розв’язую">✎</span>`;
  return `<span class="mark" aria-hidden="true"></span>`;
}

export const problemHref = p => `#/problem/${encodeURIComponent(p.id)}`;

/** Рядок списку задач. Для олімпіадних задач головне — назва програми, як у документах. */
export function rowHtml(p, sub) {
  if (p.year) {
    return `<a class="prow arch" href="${problemHref(p)}">
      <span class="ptitle">${esc(p.id)}<small>${esc(p.title)}${sub ? ", " + esc(sub) : ""}</small></span>
      ${dots(p.level)}${markHtml(p.id)}
    </a>`;
  }
  return `<a class="prow" href="${problemHref(p)}">
      <span class="pid">${esc(p.id)}</span>
      <span class="ptitle">${esc(p.title)}<small>${esc(sub || "")}</small></span>
      ${dots(p.level)}${markHtml(p.id)}
    </a>`;
}

export function notFound(msg) {
  document.title = "Сторінку не знайдено — Зошит олімпіадника";
  return `<div class="wrap"><h1>Сторінку не знайдено</h1><p class="lead">${esc(msg)}</p><a class="btn" href="#/">До списку задач</a></div>`;
}

export function pager(prev, next, prevLabel, nextLabel, href, text) {
  return `<nav class="pager" aria-label="Навігація">
    ${prev ? `<a href="${href(prev)}"><small>${prevLabel}</small>${esc(text(prev))}</a>` : "<span></span>"}
    ${next ? `<a href="${href(next)}" style="text-align:right"><small>${nextLabel}</small>${esc(text(next))}</a>` : "<span></span>"}
  </nav>`;
}
