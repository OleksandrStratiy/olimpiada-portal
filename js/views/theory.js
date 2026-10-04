// Довідник з теорії: список тем і сторінка теми.
import { esc, fmtInline, plural } from "../utils.js";
import { codeBlock } from "../highlight.js";
import { state, yearTitle } from "../state.js";
import { rowHtml, notFound, pager } from "./common.js";

function block(b) {
  if (b.h) return `<h2>${esc(b.h)}</h2>`;
  if (b.p) return `<p>${fmtInline(b.p)}</p>`;
  if (b.code) return codeBlock(b.code);
  if (b.list) return `<ul>${b.list.map(x => `<li>${fmtInline(x)}</li>`).join("")}</ul>`;
  if (b.note) return `<aside class="note">${fmtInline(b.note)}</aside>`;
  if (b.table) {
    const head = b.table.head.map(h => `<th>${esc(h)}</th>`).join("");
    const rows = b.table.rows.map(r => `<tr>${r.map(c => `<td>${fmtInline(c)}</td>`).join("")}</tr>`).join("");
    return `<div class="tablewrap"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  return "";
}

export function viewTheory() {
  document.title = "Теорія — Зошит олімпіадника";
  return `<div class="wrap">
    <h1>Теорія</h1>
    <p class="lead">Теми йдуть у порядку вивчення: від першої програми до графів. До кожної теми є тренувальні й олімпіадні задачі.</p>
    <ol class="topics">${state.theory.map(t => {
      const c = state.problems.filter(p => p.topic === t.id).length;
      return `<li><a href="#/theory/${t.id}"><span><b>${esc(t.title)}</b><span class="sum">${esc(t.summary)}</span></span><span class="cnt">${c ? `${c} ${plural(c, "задача", "задачі", "задач")}` : ""}</span></a></li>`;
    }).join("")}</ol>
  </div>`;
}

export function viewTopic(id) {
  const i = state.theory.findIndex(t => t.id === id);
  if (i < 0) return notFound("Такої теми немає.");
  const t = state.theory[i];
  document.title = `${t.title} — Зошит олімпіадника`;
  const rel = state.problems.filter(p => p.topic === t.id);
  return `<div class="wrap">
    <div class="crumbs"><a href="#/theory">Теорія</a></div>
    <h1>${esc(t.title)}</h1>
    <p class="lead">${esc(t.summary)}</p>
    <article class="article prose">${t.body.map(block).join("")}</article>
    ${rel.length ? `<h2>Задачі з цієї теми</h2><div class="plist">${rel.map(p => rowHtml(p, p.year ? "олімпіада " + yearTitle(p.year) : "")).join("")}</div>` : ""}
    ${pager(state.theory[i - 1], state.theory[i + 1], "Попередня тема", "Наступна тема", x => `#/theory/${x.id}`, x => x.title)}
  </div>`;
}
