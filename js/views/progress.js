// «Мій прогрес»: статистика, задачі в роботі, прогрес за категоріями і за роками олімпіад.
import { esc, plural } from "../utils.js";
import {
  state, statusOf, solvedCount, activeCategories, practiceIn, categoryTitle, yearTitle, yearsWithProblems, archive, training
} from "../state.js";
import { rowHtml, taskList, progressBar, pageHead, sectionHead } from "./common.js";

function progressRow(label, list) {
  return `<div class="progress-list__row"><span class="progress-list__name">${label}</span>${progressBar(list)}</div>`;
}

export function viewProgress() {
  document.title = "Мій прогрес — Зошит олімпіадника";
  const all = state.problems;
  const solved = solvedCount(all);
  const trying = all.filter(p => statusOf(p.id) === "trying");
  const tr = training(), ar = archive();
  const stat = (value, label, mod = "") => `<div class="stat${mod}"><div class="stat__value">${value}</div><div class="stat__label">${label}</div></div>`;
  const catRows = activeCategories().filter(c => practiceIn(c.id).length)
    .map(c => progressRow(`<a href="#/category/${encodeURIComponent(c.id)}">${esc(c.title)}</a>`, practiceIn(c.id))).join("");
  const yearRows = yearsWithProblems()
    .map(y => progressRow(`<a href="#/archive/${encodeURIComponent(y)}">${esc(yearTitle(y))}</a>`, ar.filter(p => p.year === y))).join("");

  return `${pageHead({ title: "Мій прогрес", lead: "Позначки зберігаються в цьому браузері на цьому пристрої." })}
    <div class="stats">
      ${stat(solved, plural(solved, "задача розв’язана", "задачі розв’язані", "задач розв’язано"), " stat--ok")}
      ${stat(trying.length, "розв’язую зараз", " stat--brand")}
      ${stat(`${solvedCount(tr)}/${tr.length}`, "тренувальних задач")}
      ${stat(`${solvedCount(ar)}/${ar.length}`, "задач з олімпіад")}
    </div>
    ${trying.length ? `<section class="section">
      ${sectionHead("Зараз розв’язую")}
      ${taskList(trying.map(p => rowHtml(p, { sub: p.year ? "олімпіада " + yearTitle(p.year) : categoryTitle(p.category) })).join(""))}
    </section>` : ""}
    <section class="section">
      ${sectionHead("Тренувальні задачі")}
      ${catRows ? `<div class="progress-list">${catRows}</div>` : `<div class="empty">Задач ще немає.</div>`}
    </section>
    ${yearRows ? `<section class="section">${sectionHead("Минулі олімпіади")}<div class="progress-list">${yearRows}</div></section>` : ""}
    <div class="btns" style="margin-top:var(--s-4)"><button class="btn btn--danger btn--small" data-act="reset-progress" type="button">Очистити мої позначки</button></div>`;
}
