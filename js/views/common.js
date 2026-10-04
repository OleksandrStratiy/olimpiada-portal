// Спільні елементи сторінок.
import { esc, icon } from "../utils.js";
import { problemStatus } from "../store.js";
import { topicTitle, yearTitle } from "../data.js";

export const LEVELS = { 1: "Розминка", 2: "Середній", 3: "Складний" };

export function setTitle(t) {
  document.title = t ? `${t} — Зошит олімпіадника` : "Зошит олімпіадника — C++ з нуля до олімпіади";
}

export function dots(level) {
  const l = Math.min(3, Math.max(1, +level || 1));
  return `<span class="lvl" title="Рівень: ${LEVELS[l]}" aria-label="Рівень: ${LEVELS[l]}">${[1, 2, 3].map(k => `<i${k <= l ? ' class="on"' : ""}></i>`).join("")}</span>`;
}

export function markHtml(id) {
  const s = problemStatus(id);
  if (s === "solved") return `<span class="pmark solved" title="Розв’язано" aria-label="Розв’язано">${icon("check")}</span>`;
  if (s === "trying") return `<span class="pmark trying" title="Розв’язую" aria-label="Розв’язую"></span>`;
  return `<span class="pmark" aria-hidden="true"></span>`;
}

export const problemHref = p => `#/problem/${encodeURIComponent(p.id)}`;

/** Рядок списку задач. */
export function problemRow(p) {
  const arc = !!p.year;
  const sub = arc ? `${p.id} · ${topicTitle(p.topic)}` : topicTitle(p.topic);
  const chip = arc ? `<span class="chip">${esc(yearTitle(p.year).replace(" н. р.", ""))}</span>` : `<span class="chip chip-primary">Тренувальна</span>`;
  return `<a class="prow" href="${problemHref(p)}"><span class="ptitle">${esc(p.title || p.id)}<small>${esc(sub)}</small></span>${chip}${dots(p.level)}${markHtml(p.id)}</a>`;
}

export function pbar(done, total, cls = "") {
  const pct = total ? Math.round((100 * done) / total) : 0;
  return `<div class="pbar ${cls}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${done} з ${total}"><i style="width:${pct}%"></i></div>`;
}

/** Кругла діаграма прогресу. */
export function ring(done, total, size = 56) {
  const r = (size - 8) / 2, c = 2 * Math.PI * r;
  const part = total ? done / total : 0;
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">` +
    `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="7"/>` +
    `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--ok)" stroke-width="7" stroke-linecap="round" ` +
    `stroke-dasharray="${(c * part).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>` +
    `<text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="${size / 4}" font-weight="800" fill="var(--text)">${Math.round(part * 100)}%</text></svg>`;
}

export function notFound(msg) {
  setTitle("Сторінку не знайдено");
  return `<div class="page narrow"><h1>Сторінку не знайдено</h1><p class="lead">${esc(msg)}</p>` +
    `<p style="margin-top:22px"><a class="btn btn-primary" href="#/course">До курсу</a></p></div>`;
}

export function loading(text = "Завантаження…") {
  return `<div class="page narrow"><p class="muted">${esc(text)}</p></div>`;
}
