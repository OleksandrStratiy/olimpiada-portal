// Вкладка «Розв'язки»: для кожної категорії — ідеї розв'язків і програми в тому самому порядку, що й задачі.
import { esc, fmtText } from "../utils.js";
import { codeBlock } from "../highlight.js";
import { activeCategories, findCategory, solutionsIn, isArchive, yearTitle } from "../state.js";
import { notFound, pager, problemHref, pageHead, levelPill, levelBar, countWord } from "./common.js";

const solHref = (cid, id) => `#/solutions/${encodeURIComponent(cid)}${id ? "/" + encodeURIComponent(id) : ""}`;
const withSolutions = () => activeCategories().filter(c => solutionsIn(c.id).length);
const solWord = n => countWord(n, "розв’язок", "розв’язки", "розв’язків");

export function viewSolutionsIndex() {
  document.title = "Розв’язки — Зошит олімпіадника";
  const cards = withSolutions().map((c, i) => {
    const list = solutionsIn(c.id);
    return `<a class="cat-card" href="${solHref(c.id)}">
      <div class="cat-card__head"><span class="cat-card__num">${i + 1}</span><h2 class="cat-card__title">${esc(c.title)}</h2></div>
      <p class="cat-card__text">${esc(c.summary)}</p>
      ${levelBar(list)}
      <div class="cat-card__foot"><span>${solWord(list.length)}</span></div>
    </a>`;
  }).join("");
  return `${pageHead({
      title: "Розв’язки",
      lead: "Ідеї розв’язків і програми на C++ до тренувальних задач. Читай розв’язок, коли задачу вже розв’язано або коли довго не вдається просунутися: порівняти свою програму з чужою теж корисно."
    })}
    ${cards ? `<div class="card-grid">${cards}</div>` : `<div class="empty">Розв’язків поки немає.</div>`}`;
}

export function viewSolutions(cid) {
  const c = findCategory(cid);
  const list = c ? solutionsIn(cid) : [];
  if (!c || !list.length) return notFound("Для цієї категорії розв’язків поки немає.");
  document.title = `Розв’язки: ${c.title} — Зошит олімпіадника`;
  const cats = withSolutions();
  const i = cats.findIndex(x => x.id === cid);

  const toc = list.map((p, k) => `<a class="toc__link" href="${solHref(cid, p.id)}">${k + 1}. ${esc(p.id)}</a>`).join("");
  const sections = list.map((p, k) => `<section class="solution" id="sol-${esc(p.id)}">
      <div class="solution__head">
        <span class="solution__num">${k + 1}</span>
        <h2 class="solution__title">Задача ${esc(p.id)}<small>${esc(p.title)}</small></h2>
        ${levelPill(p.level)}
        ${isArchive(p) ? `<span class="muted">олімпіада ${esc(yearTitle(p.year))}</span>` : ""}
        <a class="solution__link" href="${problemHref(p)}">Умова задачі →</a>
      </div>
      ${p.explanation ? `<p class="solution__label">Ідея розв’язку</p><div class="solution__text">${fmtText(p.explanation)}</div>` : ""}
      <p class="solution__label">Програма</p>
      ${codeBlock(p.solution, { file: `${p.id}.cpp` })}
    </section>`).join("");

  return `${pageHead({
      crumbs: [["#/solutions", "Розв’язки"]],
      title: c.title,
      lead: `${solWord(list.length)} у тому самому порядку, що й задачі: від легких до складних.`
    })}
    <nav class="toc" aria-label="Задачі">${toc}</nav>
    ${sections}
    ${pager(cats[i - 1], cats[i + 1], "Попередня категорія", "Наступна категорія", x => solHref(x.id), x => x.title)}`;
}
