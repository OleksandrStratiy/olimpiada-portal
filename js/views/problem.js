// Сторінка задачі. Олімпіадні задачі показано так, як в оригінальних документах:
// «Задача Назва.», умова, «Технічні умови.», таблиця прикладів.
import { esc, icon, fileKind } from "../utils.js";
import { problemStatus } from "../store.js";
import { db, findProblem, lessonById, yearTitle, docFor, isArchive } from "../data.js";
import { benchHtml, hintsBlock, solutionHtml, samplesHtml } from "../widgets.js";
import { setTitle, notFound, problemHref, LEVELS } from "./common.js";

/* ---------- Текст умови: абзаци, `код`, **жирний**, малюнки [[img:файл|підпис]] ---------- */
export const IMG_DIR = "img/archive/";
const IMG_RE = /^\[\[img:([\w.\-]+)\|([^\]]*)\]\]$/;

export function fmtInline(s) {
  return esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
}

function figure(file, caption) {
  const src = IMG_DIR + file;
  return `<figure class="fig"><img src="${esc(src)}" alt="${esc(caption)}" data-fig="${esc(src)}" loading="lazy"><figcaption>${esc(caption)}</figcaption></figure>`;
}

/** Текст абзацами; label (наприклад «Задача Fish.») стає жирним початком першого абзацу. */
export function fmtText(text, label) {
  let labelled = !label;
  const html = String(text || "").trim().split(/\n\s*\n/).filter(Boolean).map(p => {
    const m = IMG_RE.exec(p.trim());
    if (m) return figure(m[1], m[2]);
    const lead = labelled ? "" : `<b>${esc(label)}</b> `;
    labelled = true;
    return `<p>${lead}${fmtInline(p).replace(/\n/g, "<br>")}</p>`;
  }).join("");
  return html || (label ? `<p><b>${esc(label)}</b></p>` : "");
}

/* ---------- Частини сторінки ---------- */

function statusSeg(p) {
  const s = problemStatus(p.id);
  const b = (v, label) => `<button type="button" data-act="status" data-id="${esc(p.id)}" data-v="${v}" aria-pressed="${s === v}">${label}</button>`;
  return `<div class="seg" role="group" aria-label="Стан задачі">${b("", "Не розпочато")}${b("trying", "Розв’язую")}${b("solved", "Розв’язано")}</div>`;
}

function trainingBody(p) {
  return `<div class="card statement prose">
      <h2>Умова</h2>${fmtText(p.statement)}
      ${p.input ? `<h2>Вхідні дані</h2>${fmtText(p.input)}` : ""}
      ${p.output ? `<h2>Вихідні дані</h2>${fmtText(p.output)}` : ""}
      ${samplesHtml(p.examples)}
    </div>`;
}

function examplesTable(examples) {
  if (!examples || !examples.length) return "";
  const withNotes = examples.some(e => e.note);
  const rows = examples.map(e => `<tr>
      <td data-label="Введення"><pre>${esc(e.in)}</pre></td>
      <td data-label="Виведення"><pre>${esc(e.out)}</pre></td>
      ${withNotes ? `<td class="cmt" data-label="Коментар">${fmtInline(e.note || "")}</td>` : ""}
    </tr>`).join("");
  return `<p class="task-h">${examples.length > 1 ? "Приклади" : "Приклад"}</p>
    <div class="tablewrap"><table class="ex-table">
      <thead><tr><th>Введення</th><th>Виведення</th>${withNotes ? "<th>Коментар</th>" : ""}</tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

function archiveBody(p) {
  return `<article class="card task">
      ${fmtText(p.statement, `Задача ${p.id}.`)}
      ${fmtText(p.tech, p.techLabel || "Технічні умови.")}
      ${examplesTable(p.examples)}
      ${p.afterExamples ? fmtText(p.afterExamples) : ""}
    </article>
    ${p.note ? `<aside class="editor-note"><b>Примітка упорядника</b>${fmtInline(p.note)}</aside>` : ""}`;
}

function docButtons(p) {
  const seen = new Set();
  return (p.groups || []).map(g => docFor(p.year, g)).filter(d => d && !seen.has(d.file) && seen.add(d.file))
    .map(d => `<a class="btn btn-ghost btn-sm" href="${esc(d.file)}" download>${icon("download")}Оригінал (${esc(d.group)}, ${fileKind(d.file)})</a>`).join("");
}

export function viewProblem(id) {
  const p = findProblem(id);
  if (!p) return notFound("Такої задачі немає. Можливо, її видалили або змінили назву.");
  const arc = isArchive(p);
  setTitle(arc ? `${p.id} (${p.title})` : p.title);
  const set = db.problems.filter(x => (x.year || "") === (p.year || ""));
  const i = set.indexOf(p);
  const prev = set[i - 1], next = set[i + 1];
  const l = lessonById(p.topic);
  const tests = (p.examples || []).map(e => ({ in: e.in, out: e.out }));

  return `<div class="page narrow" data-problem="${esc(p.id)}">
    <nav class="crumbs" aria-label="Шлях">${arc
      ? `<a href="#/olympiads">Олімпіади</a><span>›</span><a href="#/olympiads/${encodeURIComponent(p.year)}">${esc(yearTitle(p.year))}</a>`
      : `<a href="#/problems">Задачі</a>`}</nav>
    <h1>${arc ? `${esc(p.id)} <span class="muted" style="font-weight:600">· ${esc(p.title)}</span>` : esc(p.title)}</h1>
    <div class="pmeta">
      ${arc ? `<span class="chip">Олімпіада ${esc(yearTitle(p.year))}${p.groups?.length ? ", " + esc(p.groups.join(", ")) : ""}</span>` : `<span class="chip chip-primary">Тренувальна задача</span>`}
      <span class="chip">Рівень: ${LEVELS[p.level] || "—"}</span>
      ${p.time ? `<span class="chip">Час: ${esc(p.time)}</span>` : ""}
      ${p.memory ? `<span class="chip">Пам’ять: ${esc(p.memory)}</span>` : ""}
    </div>
    ${l ? `<p class="muted small" style="margin:8px 0 0">Потрібні знання: <a href="#/lesson/${l.id}">урок ${l.num} «${esc(l.title)}»</a> і попередні.</p>` : ""}
    ${arc ? archiveBody(p) : trainingBody(p)}
    <div class="side-links">${statusSeg(p)}${p.link ? `<a class="btn btn-ghost btn-sm" href="${esc(p.link)}" target="_blank" rel="noopener">Здати на перевірку</a>` : ""}${arc ? docButtons(p) : ""}</div>
    ${(p.hints || []).length ? `<section class="workbox"><h2>Підказки</h2>${hintsBlock("p:" + p.id, p.hints)}</section>` : ""}
    <section class="workbox">
      <h2>Розв’язуй тут</h2>
      <p>Напиши програму і натисни «Перевірити на прикладах» — вона запуститься на прикладах з умови. Код зберігається в цьому браузері.</p>
      ${benchHtml("p:" + p.id, tests, { autoSolve: false })}
    </section>
    ${p.solution ? `<section class="workbox"><h2>Розв’язок</h2>${solutionHtml(p.solution, tests[0]?.in)}</section>` : ""}
    <nav class="pager" aria-label="Інші задачі">
      ${prev ? `<a class="card prev" href="${problemHref(prev)}"><small>← Попередня</small><b>${esc(prev.title || prev.id)}</b></a>` : ""}
      ${next ? `<a class="card next" href="${problemHref(next)}"><small>Наступна →</small><b>${esc(next.title || next.id)}</b></a>` : ""}
    </nav>
  </div>`;
}
