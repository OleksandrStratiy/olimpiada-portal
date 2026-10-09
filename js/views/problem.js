// Сторінка задачі. Умова показується так, як в олімпіадних документах:
// «Задача Назва.», текст, «Технічні умови.», таблиця прикладів. Поруч — бічна панель зі станом і посиланнями.
import { esc, fmtInline, fmtText, fileKind } from "../utils.js";
import { ioBlock } from "../highlight.js";
import { SHOW_SOLUTIONS } from "../config.js";
import {
  state, statusOf, findProblem, isArchive, findCategory, practiceIn, solutionsIn, topicTitle, yearTitle, docFor
} from "../state.js";
import { notFound, pager, problemHref, pageHead, levelPill } from "./common.js";

export function hintsHtml(p) {
  const hints = p.hints || [];
  const n = Math.min(state.hintShown[p.id] || 0, hints.length);
  let h = n ? `<ol class="hints__list">${hints.slice(0, n).map(x => `<li class="hints__item"><span>${fmtInline(x)}</span></li>`).join("")}</ol>` : "";
  if (n < hints.length) h += `<button class="btn btn--ghost btn--small" data-act="hint" data-id="${esc(p.id)}" type="button">Показати підказку ${n + 1} з ${hints.length}</button>`;
  else h += `<p class="muted" style="margin:0">Це всі підказки.</p>`;
  return h;
}

function examplesTable(examples) {
  if (!examples || !examples.length) return "";
  const withNotes = examples.some(e => e.note);
  const rows = examples.map(e => `<tr>
      <td data-label="Введення">${ioBlock(e.in)}</td>
      <td data-label="Виведення">${ioBlock(e.out)}</td>
      ${withNotes ? `<td class="examples__note" data-label="Коментар">${fmtInline(e.note || "")}</td>` : ""}
    </tr>`).join("");
  return `<p class="sheet__h">${examples.length > 1 ? "Приклади" : "Приклад"}</p>
    <table class="examples">
      ${withNotes ? `<colgroup><col style="width:38%"><col style="width:24%"><col></colgroup>` : ""}
      <thead><tr><th>Введення</th><th>Виведення</th>${withNotes ? "<th>Коментар</th>" : ""}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

/** Текст задачі в олімпіадному вигляді. */
export function taskBody(p) {
  // Задачі старого формату (з полями input/output) показуємо як технічні умови.
  const tech = p.tech != null ? fmtText(p.tech, p.techLabel || "Технічні умови.")
    : fmtText([p.input, p.output].filter(Boolean).join("\n\n"), "Технічні умови.");
  return `<article class="sheet">
      ${fmtText(p.statement, `Задача ${p.id}.`)}
      ${tech}
      ${examplesTable(p.examples)}
      ${p.afterExamples ? fmtText(p.afterExamples) : ""}
    </article>`;
}

function statusPanel(p) {
  const s = statusOf(p.id);
  const b = (v, label, mod = "") => `<button type="button" class="status-switch__btn${mod}" data-act="status" data-id="${esc(p.id)}" data-v="${v}" aria-pressed="${s === v}">${label}</button>`;
  return `<section class="panel">
    <h2 class="panel__title">Мій стан</h2>
    <div class="status-switch" role="group" aria-label="Стан задачі">${b("", "Не розпочато")}${b("trying", "Розв’язую")}${b("solved", "Розв’язано", " status-switch__btn--solved")}</div>
  </section>`;
}

function factsPanel(p) {
  const cat = findCategory(p.category);
  const facts = [["Рівень", levelPill(p.level)]];
  if (isArchive(p)) {
    facts.push(["Олімпіада", esc(yearTitle(p.year))]);
    if (p.groups?.length) facts.push(["Класи", esc(p.groups.join(", "))]);
  }
  if (cat) facts.push(["Категорія", `<a href="#/category/${encodeURIComponent(cat.id)}">${esc(cat.title)}</a>`]);
  if (state.theory.some(t => t.id === p.topic)) facts.push(["Теорія", `<a href="#/theory/${esc(p.topic)}">${esc(topicTitle(p.topic))}</a>`]);
  return `<section class="panel">
    <h2 class="panel__title">Про задачу</h2>
    <dl class="facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>
  </section>`;
}

/** Посилання на перевірку, розв’язок і оригінальні документи. */
function linksPanel(p) {
  const items = [];
  if (p.link) items.push(`<a class="btn btn--primary" href="${esc(p.link)}" target="_blank" rel="noopener">Здати на перевірку</a>`);
  const sol = SHOW_SOLUTIONS && p.solution && p.category && solutionsIn(p.category).includes(p);
  if (isArchive(p)) {
    const seen = new Set();
    (p.groups || []).map(g => docFor(p.year, g)).filter(d => d && !seen.has(d.file) && seen.add(d.file))
      .forEach(d => items.push(`<a class="btn btn--ghost" href="${esc(d.file)}" download>Оригінал: ${esc(d.group)} (${fileKind(d.file)})</a>`));
  }
  if (!items.length && !sol) return "";
  return `<section class="panel">
    <h2 class="panel__title">${sol ? "Розв’язок" : "Матеріали"}</h2>
    ${sol ? `<p class="panel__text">Ідея й програма на C++ є у вкладці «Розв’язки». Спершу спробуй розв’язати сам!</p>` : ""}
    <div class="btns">
      ${items.join("")}
      ${sol ? `<a class="btn btn--ghost" href="#/solutions/${encodeURIComponent(p.category)}/${encodeURIComponent(p.id)}">Відкрити розв’язок</a>` : ""}
    </div>
  </section>`;
}

export function viewProblem(id) {
  const p = findProblem(id);
  if (!p) return notFound("Такої задачі немає. Можливо, її видалили або змінили назву.");
  const arc = isArchive(p);
  // сусідні задачі: у тій самій категорії (тренувальні) або в тому самому році (олімпіадні)
  const set = arc ? state.problems.filter(x => x.year === p.year) : practiceIn(p.category);
  const i = set.indexOf(p);
  document.title = `${p.id} — Зошит олімпіадника`;
  const cat = findCategory(p.category);
  const crumbs = arc
    ? [["#/archive", "Минулі олімпіади"], [`#/archive/${encodeURIComponent(p.year)}`, yearTitle(p.year)]]
    : [["#/", "Задачі"]].concat(cat ? [[`#/category/${encodeURIComponent(cat.id)}`, cat.title]] : []);

  return `${pageHead({ crumbs, title: p.id, sub: p.title })}
    <div class="problem">
      <div class="problem__main">
        ${taskBody(p)}
        ${p.note ? `<aside class="callout"><span class="callout__title">Примітка упорядника</span>${fmtInline(p.note)}</aside>` : ""}
        ${(p.hints || []).length ? `<section class="hints"><h2 class="panel__title">Підказки</h2><div id="hints">${hintsHtml(p)}</div></section>` : ""}
      </div>
      <aside class="problem__aside">
        ${statusPanel(p)}
        ${factsPanel(p)}
        ${linksPanel(p)}
      </aside>
    </div>
    ${pager(set[i - 1], set[i + 1], "Попередня", "Наступна", problemHref, x => `${x.id} · ${x.title}`)}`;
}
