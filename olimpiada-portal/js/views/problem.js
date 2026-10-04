// Сторінка задачі. Олімпіадні задачі показуються так, як в оригінальних документах:
// «Задача Назва.», умова, «Технічні умови.», таблиця прикладів.
import { esc, fmtInline, fmtText, fileKind } from "../utils.js";
import { codeBlock } from "../highlight.js";
import { state, LEVELS, statusOf, findProblem, topicTitle, yearTitle, docFor } from "../state.js";
import { notFound, pager, problemHref } from "./common.js";

export function hintsHtml(p) {
  const hints = p.hints || [];
  const n = Math.min(state.hintShown[p.id] || 0, hints.length);
  let h = n ? `<ol>${hints.slice(0, n).map(x => `<li>${fmtInline(x)}</li>`).join("")}</ol>` : "";
  if (n < hints.length) h += `<button class="btn ghost small" data-act="hint" data-id="${esc(p.id)}" type="button">Показати підказку ${n + 1} з ${hints.length}</button>`;
  else h += `<p class="muted">Це всі підказки.</p>`;
  return h;
}

function statusHtml(p) {
  const s = statusOf(p.id);
  const b = (v, label) => `<button type="button" data-act="status" data-id="${esc(p.id)}" data-v="${v}" aria-pressed="${s === v}">${label}</button>`;
  return `<div class="status" role="group" aria-label="Стан задачі">${b("", "Не розпочато")}${b("trying", "Розв’язую")}${b("solved", "Розв’язано")}</div>`;
}

/* ---------- Тренувальна задача ---------- */
function trainingBody(p) {
  const examples = (p.examples || []).map((e, k) => `<div class="example">
      <div><div class="cap">Вхідні дані${p.examples.length > 1 ? " " + (k + 1) : ""}</div>${codeBlock(e.in, true)}</div>
      <div><div class="cap">Вихідні дані</div>${codeBlock(e.out, true)}</div>
      ${e.note ? `<div class="ex-note">${fmtInline(e.note)}</div>` : ""}
    </div>`).join("");
  return `<div class="statement prose">
      <h2>Умова</h2>${fmtText(p.statement)}
      <h2>Вхідні дані</h2>${fmtText(p.input)}
      <h2>Вихідні дані</h2>${fmtText(p.output)}
    </div>
    ${examples ? `<h2>Приклади</h2><div class="examples">${examples}</div>` : ""}`;
}

/* ---------- Олімпіадна задача в оригінальному вигляді ---------- */
function examplesTable(examples) {
  if (!examples || !examples.length) return "";
  const withNotes = examples.some(e => e.note);
  const rows = examples.map(e => `<tr>
      <td data-label="Введення">${codeBlock(e.in, true)}</td>
      <td data-label="Виведення">${codeBlock(e.out, true)}</td>
      ${withNotes ? `<td class="cmt" data-label="Коментар">${fmtInline(e.note || "")}</td>` : ""}
    </tr>`).join("");
  return `<p class="task-h">${examples.length > 1 ? "Приклади" : "Приклад"}</p>
    <div class="tablewrap"><table class="ex-table">
      <thead><tr><th>Введення</th><th>Виведення</th>${withNotes ? "<th>Коментар</th>" : ""}</tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

function archiveBody(p) {
  return `<article class="task">
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
    .map(d => `<a class="btn ghost" href="${esc(d.file)}" download>Завантажити оригінал (${esc(d.group)}, ${fileKind(d.file)})</a>`).join("");
}

export function viewProblem(id) {
  const p = findProblem(id);
  if (!p) return notFound("Такої задачі немає. Можливо, її видалили або змінили номер.");
  const set = state.problems.filter(x => (x.year || "") === (p.year || ""));
  const i = set.indexOf(p);
  const arc = !!p.year;
  document.title = (arc ? p.id : p.title) + " — Зошит олімпіадника";
  const hasTopic = state.theory.some(t => t.id === p.topic);
  const topic = hasTopic ? `<a href="#/theory/${esc(p.topic)}">${esc(topicTitle(p.topic))}</a>` : esc(topicTitle(p.topic));

  return `<div class="wrap">
    <div class="crumbs">${arc
      ? `<a href="#/archive">Минулі олімпіади</a> / <a href="#/archive/${encodeURIComponent(p.year)}">${esc(yearTitle(p.year))}</a>`
      : `<a href="#/">Усі задачі</a>`}</div>
    <h1>${arc ? esc(p.id) : `${esc(p.id)}. ${esc(p.title)}`}</h1>
    <div class="meta">
      ${arc ? `<span>Олімпіада: <b>${esc(yearTitle(p.year))}${p.groups?.length ? ", " + esc(p.groups.join(", ")) : ""}</b></span>` : ""}
      <span>Тема: <b>${topic}</b></span>
      <span>Рівень: <b>${LEVELS[p.level] || "—"}</b></span>
      ${p.time ? `<span>Час: <b>${esc(p.time)}</b></span>` : ""}
      ${p.memory ? `<span>Пам’ять: <b>${esc(p.memory)}</b></span>` : ""}
    </div>
    ${arc ? archiveBody(p) : trainingBody(p)}
    <div class="btns" style="margin-top:24px">
      ${statusHtml(p)}
      ${p.link ? `<a class="btn" href="${esc(p.link)}" target="_blank" rel="noopener">Здати на перевірку</a>` : ""}
      ${arc ? docButtons(p) : ""}
    </div>
    ${(p.hints || []).length ? `<section class="hints prose"><h2>Підказки</h2><div id="hints">${hintsHtml(p)}</div></section>` : ""}
    ${p.solution ? `<section><h2>Розв’язок</h2>
      <details class="solution"><summary>Показати розв’язок</summary>
        <p class="warn">Спершу спробуй сам хоча б 20 хвилин!</p>
        ${codeBlock(p.solution)}
      </details></section>` : ""}
    ${pager(set[i - 1], set[i + 1], "Попередня", "Наступна", problemHref, x => x.year ? x.id : `${x.id}. ${x.title}`)}
  </div>`;
}
