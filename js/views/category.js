// Сторінка категорії: задачі від легких до складних, згруповані за рівнем, і задачі з олімпіад.
import { esc } from "../utils.js";
import { SHOW_SOLUTIONS } from "../config.js";
import { state, LEVELS, findCategory, activeCategories, practiceIn, archiveIn, solutionsIn, yearTitle } from "../state.js";
import { rowHtml, taskList, progressBar, pageHead, sectionHead, notFound, pager, tasksWord } from "./common.js";

export function viewCategory(cid) {
  const c = findCategory(cid);
  if (!c) return notFound("Такої категорії немає.");
  document.title = `${c.title} — Зошит олімпіадника`;
  const list = practiceIn(cid);
  const arc = archiveIn(cid);
  const cats = activeCategories();
  const i = cats.findIndex(x => x.id === cid);
  const theory = c.theory && state.theory.some(t => t.id === c.theory);

  const actions = [
    theory ? `<a class="btn btn--ghost btn--small" href="#/theory/${encodeURIComponent(c.theory)}">Теорія до теми</a>` : "",
    SHOW_SOLUTIONS && solutionsIn(cid).length ? `<a class="btn btn--ghost btn--small" href="#/solutions/${encodeURIComponent(cid)}">Розв’язки</a>` : ""
  ].join("");

  let num = 0;
  const levels = [1, 2, 3].map(l => {
    const rows = list.filter(p => (p.level || 1) === l);
    if (!rows.length) return "";
    return `<section class="section">
      ${sectionHead(LEVELS[l], { count: tasksWord(rows.length), level: l })}
      ${taskList(rows.map(p => rowHtml(p, { num: ++num, showLevel: false })).join(""))}
    </section>`;
  }).join("");

  return `${pageHead({
      crumbs: [["#/", "Задачі"]],
      title: c.title,
      lead: esc(c.summary),
      row: `${list.length ? progressBar(list) : ""}${actions ? `<div class="btns">${actions}</div>` : ""}`
    })}
    ${levels || `<div class="empty">Тренувальних задач у цій категорії поки немає.</div>`}
    ${arc.length ? `<section class="section">
      ${sectionHead("З минулих олімпіад", { count: tasksWord(arc.length), text: "Задачі районних олімпіад Вінницької області, які розв’язуються тими самими прийомами." })}
      ${taskList(arc.map(p => rowHtml(p, { sub: "олімпіада " + yearTitle(p.year) })).join(""))}
    </section>` : ""}
    ${pager(cats[i - 1], cats[i + 1], "Попередня категорія", "Наступна категорія", x => `#/category/${encodeURIComponent(x.id)}`, x => x.title)}`;
}
