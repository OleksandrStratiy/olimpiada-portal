// «Мій прогрес»: скільки задач розв’язано загалом, за темами і за роками олімпіад.
import { esc, plural } from "../utils.js";
import { state, statusOf, topicTitle, yearTitle, yearsWithProblems } from "../state.js";
import { rowHtml } from "./common.js";

function barRow(label, list) {
  const s = list.filter(p => statusOf(p.id) === "solved").length;
  const pct = list.length ? Math.round(100 * s / list.length) : 0;
  return `<div class="bar-row"><span>${label}</span><div class="bar" role="img" aria-label="${pct}%"><i style="width:${pct}%"></i></div><span>${s}/${list.length}</span></div>`;
}

export function viewProgress() {
  document.title = "Мій прогрес — Зошит олімпіадника";
  const all = state.problems;
  const solved = all.filter(p => statusOf(p.id) === "solved");
  const trying = all.filter(p => statusOf(p.id) === "trying");
  const topics = [...new Set(all.map(p => p.topic))];
  const topicRows = topics.map(t => barRow(esc(topicTitle(t)), all.filter(p => p.topic === t))).join("");
  const yearRows = yearsWithProblems().map(y =>
    barRow(`<a href="#/archive/${encodeURIComponent(y)}">${esc(yearTitle(y))}</a>`, all.filter(p => p.year === y))).join("");

  return `<div class="wrap">
    <h1>Мій прогрес</h1>
    <p class="lead">Позначки зберігаються в цьому браузері на цьому пристрої.</p>
    <div class="score">${solved.length} з ${all.length}</div>
    <p class="muted">${plural(solved.length, "задача розв’язана", "задачі розв’язані", "задач розв’язано")}</p>
    ${trying.length ? `<h2>Зараз розв’язую</h2><div class="plist">${trying.map(p => rowHtml(p, p.year ? "олімпіада " + yearTitle(p.year) : topicTitle(p.topic))).join("")}</div>` : ""}
    <h2>За темами</h2>
    <div class="bars">${topicRows || `<div class="empty">Задач ще немає.</div>`}</div>
    ${yearRows ? `<h2>Минулі олімпіади</h2><div class="bars">${yearRows}</div>` : ""}
    <div class="btns" style="margin-top:28px"><button class="btn danger small" data-act="reset-progress" type="button">Очистити мої позначки</button></div>
  </div>`;
}
