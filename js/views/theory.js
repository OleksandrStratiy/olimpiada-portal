// Довідник з теорії: картки тем і сторінка теми.
import { esc, fmtInline } from "../utils.js";
import { codeBlock } from "../highlight.js";
import { state, byLevel, yearTitle, categoryForTopic, practiceIn } from "../state.js";
import { rowHtml, taskList, pageHead, sectionHead, notFound, pager, tasksWord } from "./common.js";

function block(b) {
  if (b.h) return `<h2>${esc(b.h)}</h2>`;
  if (b.p) return `<p>${fmtInline(b.p)}</p>`;
  if (b.code) return codeBlock(b.code);
  if (b.list) return `<ul>${b.list.map(x => `<li>${fmtInline(x)}</li>`).join("")}</ul>`;
  if (b.note) return `<aside class="callout">${fmtInline(b.note)}</aside>`;
  if (b.table) {
    const head = b.table.head.map(h => `<th>${esc(h)}</th>`).join("");
    const rows = b.table.rows.map(r => `<tr>${r.map(c => `<td>${fmtInline(c)}</td>`).join("")}</tr>`).join("");
    return `<div class="table-wrap"><table class="table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  return "";
}

/** Задачі до теми: якщо тема має свою категорію — задачі категорії, інакше задачі з цією темою. */
function tasksForTopic(tid) {
  const cat = categoryForTopic(tid);
  if (cat) return practiceIn(cat.id);
  return byLevel(state.problems.filter(p => p.topic === tid));
}

export function viewTheory() {
  document.title = "Теорія — Зошит олімпіадника";
  const cards = state.theory.map((t, i) => {
    const c = tasksForTopic(t.id).length;
    return `<a class="topic-card" href="#/theory/${t.id}">
      <span class="topic-card__num">${i + 1}</span>
      <span class="topic-card__title">${esc(t.title)}</span>
      <span class="topic-card__text">${esc(t.summary)}</span>
      ${c ? `<span class="topic-card__count">${tasksWord(c)}</span>` : ""}
    </a>`;
  }).join("");
  return `${pageHead({
      title: "Теорія",
      lead: "Теми в порядку вивчення: від першої програми й розгалужень до графів. До кожної теми є задачі для тренування."
    })}
    <div class="card-grid">${cards}</div>`;
}

export function viewTopic(id) {
  const i = state.theory.findIndex(t => t.id === id);
  if (i < 0) return notFound("Такої теми немає.");
  const t = state.theory[i];
  document.title = `${t.title} — Зошит олімпіадника`;
  const cat = categoryForTopic(id);
  let tasks = "";
  if (cat) {
    const n = practiceIn(cat.id).length;
    tasks = n ? `<section class="section">
        ${sectionHead("Задачі", { text: `На цю тему є ${tasksWord(n)}, від легких до складних.` })}
        <a class="btn btn--primary" href="#/category/${encodeURIComponent(cat.id)}">Перейти до задач: ${esc(cat.title)}</a>
      </section>` : "";
  } else {
    const rel = tasksForTopic(id);
    tasks = rel.length ? `<section class="section">
        ${sectionHead("Задачі з цієї теми", { count: tasksWord(rel.length) })}
        ${taskList(rel.map(p => rowHtml(p, { sub: p.year ? "олімпіада " + yearTitle(p.year) : "" })).join(""))}
      </section>` : "";
  }
  return `${pageHead({ crumbs: [["#/theory", "Теорія"]], title: t.title, lead: esc(t.summary) })}
    <article class="article">${t.body.map(block).join("")}</article>
    ${tasks}
    ${pager(state.theory[i - 1], state.theory[i + 1], "Попередня тема", "Наступна тема", x => `#/theory/${x.id}`, x => x.title)}`;
}
