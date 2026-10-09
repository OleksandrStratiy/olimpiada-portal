// «Минулі олімпіади»: список років і сторінка року з групами класів та оригінальними документами.
import { esc, fileKind } from "../utils.js";
import { archive, solvedCount, yearTitle, yearsWithProblems, yearGroups, docFor, topicTitle, categoryTitle } from "../state.js";
import { rowHtml, taskList, pageHead, sectionHead, notFound, pager, tasksWord } from "./common.js";

export function viewArchive() {
  document.title = "Минулі олімпіади — Зошит олімпіадника";
  const cards = yearsWithProblems().map(y => {
    const all = archive().filter(p => p.year === y);
    const solved = solvedCount(all);
    return `<a class="year-card" href="#/archive/${encodeURIComponent(y)}">
      <h2 class="year-card__title">${esc(yearTitle(y))}</h2>
      <span class="year-card__groups">${esc(yearGroups(y).join(" · "))}</span>
      <span class="year-card__foot"><span>${tasksWord(all.length)}</span>${solved ? `<span class="cat-card__done">розв’язано ${solved}</span>` : ""}</span>
    </a>`;
  }).join("");
  return `${pageHead({
      title: "Минулі олімпіади",
      lead: "Завдання ІІ (районного) етапу Всеукраїнської олімпіади з інформатики у Вінницькій області. Умови наведено так, як в оригінальних документах, а самі документи можна завантажити на сторінці кожного року."
    })}
    ${cards ? `<div class="card-grid card-grid--3">${cards}</div>` : `<div class="empty">Тут поки немає жодної олімпіади. Учитель може додати задачі в розділі «Для вчителя».</div>`}`;
}

function groupSection(yid, group) {
  const list = archive().filter(p => p.year === yid && (p.groups?.length ? p.groups.includes(group) : group === "Інші задачі"));
  const d = docFor(yid, group);
  return `<section class="section">
    ${sectionHead(group, { count: tasksWord(list.length) })}
    ${d ? `<div class="docbar"><span class="docbar__text">${esc(d.heading)}${d.info ? `. ${esc(d.info)}` : ""}</span>
      <a class="btn btn--ghost btn--small" href="${esc(d.file)}" download>Завантажити завдання (${fileKind(d.file)})</a></div>` : ""}
    ${taskList(list.map(p => rowHtml(p, { sub: p.category ? categoryTitle(p.category) : topicTitle(p.topic) })).join(""))}
  </section>`;
}

export function viewYear(yid) {
  const years = yearsWithProblems();
  const i = years.indexOf(yid);
  if (i < 0) return notFound("Олімпіади за цей рік у порталі немає.");
  document.title = `Олімпіада ${yearTitle(yid)} — Зошит олімпіадника`;
  return `${pageHead({
      crumbs: [["#/archive", "Минулі олімпіади"]],
      title: `Олімпіада ${yearTitle(yid)}`,
      lead: "ІІ (районний) етап, Вінницька область."
    })}
    ${yearGroups(yid).map(g => groupSection(yid, g)).join("")}
    ${pager(years[i + 1], years[i - 1], "Попередній рік", "Наступний рік", y => `#/archive/${encodeURIComponent(y)}`, yearTitle)}`;
}
