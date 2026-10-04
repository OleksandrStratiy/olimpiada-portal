// «Минулі олімпіади»: список років і сторінка року з групами класів та оригінальними документами.
import { esc, plural, fileKind } from "../utils.js";
import { archive, statusOf, yearTitle, yearsWithProblems, yearGroups, docFor, topicTitle } from "../state.js";
import { rowHtml, notFound, pager } from "./common.js";

export function viewArchive() {
  document.title = "Минулі олімпіади — Зошит олімпіадника";
  const years = yearsWithProblems();
  const items = years.map(y => {
    const all = archive().filter(p => p.year === y);
    const solved = all.filter(p => statusOf(p.id) === "solved").length;
    return `<li><a href="#/archive/${encodeURIComponent(y)}">
        <span><b>${esc(yearTitle(y))}</b><span class="sum">${esc(yearGroups(y).join(", "))}</span></span>
        <span class="cnt">${all.length} ${plural(all.length, "задача", "задачі", "задач")}${solved ? `, розв’язано ${solved}` : ""}</span>
      </a></li>`;
  }).join("");
  return `<div class="wrap">
    <h1>Минулі олімпіади</h1>
    <p class="lead">Завдання ІІ (районного) етапу Всеукраїнської олімпіади з інформатики у Вінницькій області. Умови наведено так, як в оригінальних документах, а самі документи можна завантажити на сторінці кожного року.</p>
    ${items ? `<ol class="topics years">${items}</ol>` : `<div class="empty">Тут поки немає жодної олімпіади. Учитель може додати задачі в розділі «Для вчителя».</div>`}
  </div>`;
}

function groupSection(yid, group) {
  const list = archive().filter(p => p.year === yid && (p.groups?.length ? p.groups.includes(group) : group === "Інші задачі"));
  const d = docFor(yid, group);
  return `<section>
    <h2>${esc(group)}</h2>
    ${d ? `<p class="doc-head">${esc(d.heading)}${d.info ? `. ${esc(d.info)}` : ""}</p>
      <div class="docs"><a class="btn ghost small" href="${esc(d.file)}" download>Завантажити завдання (${fileKind(d.file)})</a></div>` : ""}
    <div class="plist">${list.map(p => rowHtml(p, topicTitle(p.topic))).join("")}</div>
  </section>`;
}

export function viewYear(yid) {
  const years = yearsWithProblems();
  const i = years.indexOf(yid);
  if (i < 0) return notFound("Олімпіади за цей рік у порталі немає.");
  document.title = `Олімпіада ${yearTitle(yid)} — Зошит олімпіадника`;
  return `<div class="wrap">
    <div class="crumbs"><a href="#/archive">Минулі олімпіади</a></div>
    <h1>Олімпіада ${esc(yearTitle(yid))}</h1>
    <p class="lead">ІІ (районний) етап, Вінницька область.</p>
    ${yearGroups(yid).map(g => groupSection(yid, g)).join("")}
    ${pager(years[i + 1], years[i - 1], "Попередній рік", "Наступний рік", y => `#/archive/${encodeURIComponent(y)}`, yearTitle)}
  </div>`;
}
