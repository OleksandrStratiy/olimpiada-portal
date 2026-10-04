// Головна сторінка: задача дня і список тренувальних задач з фільтрами.
import { esc, fmtInline, dateWords } from "../utils.js";
import { state, LEVELS, statusOf, training, topicTitle } from "../state.js";
import { rowHtml, problemHref } from "./common.js";

function problemOfTheDay() {
  const all = state.problems;
  if (!all.length) return "";
  const day = Math.floor(Date.now() / 86400000);
  const pool = all.filter(p => statusOf(p.id) !== "solved");
  const list = pool.length ? pool : all;
  const p = list[day % list.length];
  const firstPara = String(p.statement || "").split(/\n\s*\n/).find(s => !s.trim().startsWith("[[img:")) || "";
  const sents = firstPara.split(/(?<=[.!?])\s/);
  let excerpt = sents[0] || "";
  for (let k = 1; k < sents.length && excerpt.length < 90; k++) excerpt += " " + sents[k];
  return `<section class="today" aria-label="Задача дня">
    <p class="date">${esc(dateWords(new Date()))}</p>
    <p class="kind">Задача дня</p>
    <h1>${esc(p.year ? p.id : p.title)}</h1>
    <p class="excerpt">${fmtInline(excerpt)}</p>
    <a class="btn" href="${problemHref(p)}">Розв’язувати</a>
  </section>`;
}

export function problemRows() {
  const f = state.filter;
  const q = f.q.trim().toLowerCase();
  const list = training().filter(p =>
    (!q || (p.title + " " + p.id).toLowerCase().includes(q)) &&
    (!f.topic || p.topic === f.topic) &&
    (!f.level || String(p.level) === f.level) &&
    (!f.status || (f.status === "new" ? !statusOf(p.id) : statusOf(p.id) === f.status)));
  if (!list.length) return `<div class="empty">Немає задач з такими умовами. Зміни фільтри або очисти пошук.</div>`;
  return list.map(p => rowHtml(p, topicTitle(p.topic))).join("");
}

export function viewHome() {
  document.title = "Задачі — Зошит олімпіадника";
  const f = state.filter;
  const topics = [...new Set(training().map(p => p.topic))];
  const opt = (v, label, cur) => `<option value="${esc(v)}"${String(cur) === String(v) ? " selected" : ""}>${esc(label)}</option>`;
  return `<div class="wrap">${problemOfTheDay()}
    <h2>Тренувальні задачі</h2>
    <p class="muted">Завдання районних олімпіад минулих років зібрано в розділі <a href="#/archive">«Минулі олімпіади»</a>.</p>
    <div class="filters" role="search">
      <div class="search"><label for="f-q">Пошук</label><input id="f-q" type="search" data-filter="q" value="${esc(f.q)}" placeholder="Назва або номер"></div>
      <div><label for="f-t">Тема</label><select id="f-t" data-filter="topic">${opt("", "Усі теми", f.topic)}${topics.map(t => opt(t, topicTitle(t), f.topic)).join("")}</select></div>
      <div><label for="f-l">Рівень</label><select id="f-l" data-filter="level">${opt("", "Будь-який", f.level)}${[1, 2, 3].map(l => opt(l, LEVELS[l], f.level)).join("")}</select></div>
      <div><label for="f-s">Стан</label><select id="f-s" data-filter="status">${opt("", "Усі", f.status)}${opt("new", "Не розпочаті", f.status)}${opt("trying", "Розв’язую", f.status)}${opt("solved", "Розв’язані", f.status)}</select></div>
    </div>
    <div class="plist" id="plist">${problemRows()}</div>
  </div>`;
}
