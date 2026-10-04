// «Олімпіади»: роки і сторінка року з групами класів та оригінальними документами.
import { esc, icon, plural, fileKind } from "../utils.js";
import { archive, yearTitle, yearsWithProblems, yearGroups, problemsOfGroup, docFor, solvedCount } from "../data.js";
import { setTitle, notFound, problemRow, pbar } from "./common.js";

export function viewOlympiads() {
  setTitle("Олімпіади минулих років");
  const years = yearsWithProblems();
  const cards = years.map(y => {
    const all = archive().filter(p => p.year === y);
    const solved = solvedCount(all);
    return `<a class="card ycard" href="#/olympiads/${encodeURIComponent(y)}"><b>${esc(yearTitle(y))}</b>` +
      `<p>${esc(yearGroups(y).join(" · "))}</p>` +
      `<span class="yfoot">${pbar(solved, all.length)}<span>${solved}/${all.length} ${plural(all.length, "задача", "задачі", "задач")}</span></span></a>`;
  }).join("");
  return `<div class="page">
    <div class="page-head">
      <h1>Олімпіади минулих років</h1>
      <p class="lead">Завдання ІІ (районного) етапу Всеукраїнської олімпіади з інформатики у Вінницькій області. Умови наведено так, як в оригінальних документах, а самі документи можна завантажити.</p>
    </div>
    <div class="callout tip" style="max-width:800px"><div class="callout-title">${icon("bulb")}Як тренуватися</div>
      <div class="callout-body"><p>Відкрий задачу і подивись, який урок для неї потрібен. Можна влаштувати собі справжню олімпіаду: візьми всі задачі одного року і розв’язуй їх 4 години без підказок.</p></div></div>
    ${cards ? `<div class="years">${cards}</div>` : `<div class="card empty">Тут поки немає жодної олімпіади.</div>`}
  </div>`;
}

export function viewYear(yid) {
  const years = yearsWithProblems();
  const i = years.indexOf(yid);
  if (i < 0) return notFound("Олімпіади за цей рік на сайті немає.");
  setTitle(`Олімпіада ${yearTitle(yid)}`);
  const groups = yearGroups(yid).map(g => {
    const list = problemsOfGroup(yid, g);
    const d = docFor(yid, g);
    return `<section class="group">
      <div class="group-head"><h2>${esc(g)}</h2>
        ${d ? `<a class="btn btn-ghost btn-sm" href="${esc(d.file)}" download>${icon("download")}Завдання (${fileKind(d.file)})</a>
        <p class="doc-head">${esc(d.heading)}${d.info ? `. ${esc(d.info)}` : ""}</p>` : ""}
      </div>
      <div class="card plist">${list.map(problemRow).join("")}</div>
    </section>`;
  }).join("");
  const older = years[i + 1], newer = years[i - 1];
  return `<div class="page narrow">
    <nav class="crumbs" aria-label="Шлях"><a href="#/olympiads">Олімпіади</a></nav>
    <div class="page-head"><h1>Олімпіада ${esc(yearTitle(yid))}</h1>
    <p class="lead">ІІ (районний) етап, Вінницька область.</p></div>
    ${groups}
    <nav class="pager" aria-label="Інші роки">
      ${older ? `<a class="card prev" href="#/olympiads/${encodeURIComponent(older)}"><small>← Попередній рік</small><b>${esc(yearTitle(older))}</b></a>` : ""}
      ${newer ? `<a class="card next" href="#/olympiads/${encodeURIComponent(newer)}"><small>Наступний рік →</small><b>${esc(yearTitle(newer))}</b></a>` : ""}
    </nav>
  </div>`;
}
