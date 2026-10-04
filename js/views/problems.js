// «Задачі»: усі тренувальні й олімпіадні задачі з фільтрами, від простих тем до складних.
import { esc, plural } from "../utils.js";
import { problemStatus } from "../store.js";
import { db, topicOrder, isArchive, lessonById } from "../data.js";
import { setTitle, problemRow, LEVELS } from "./common.js";

export const filter = { q: "", topic: "", level: "", status: "", source: "" };

function filtered() {
  const f = filter;
  const q = f.q.trim().toLowerCase();
  return db.problems.filter(p =>
    (!q || `${p.title} ${p.id}`.toLowerCase().includes(q)) &&
    (!f.topic || p.topic === f.topic || (f.topic === "other" && !lessonById(p.topic))) &&
    (!f.level || String(p.level) === f.level) &&
    (!f.source || (f.source === "archive") === isArchive(p)) &&
    (!f.status || (f.status === "new" ? !problemStatus(p.id) : problemStatus(p.id) === f.status))
  ).sort((a, b) => topicOrder(a) - topicOrder(b) || isArchive(a) - isArchive(b) || (a.level - b.level) || String(b.year || "").localeCompare(String(a.year || "")));
}

export function problemRows() {
  const list = filtered();
  const head = `<p class="count-line">Знайдено: ${list.length} ${plural(list.length, "задача", "задачі", "задач")}</p>`;
  if (!list.length) return head + `<div class="card empty">Немає задач з такими умовами. Зміни фільтри або очисти пошук.</div>`;
  return head + `<div class="card plist">${list.map(problemRow).join("")}</div>`;
}

const opt = (v, label, cur) => `<option value="${esc(v)}"${String(cur) === String(v) ? " selected" : ""}>${esc(label)}</option>`;

export function viewProblems() {
  setTitle("Задачі");
  const f = filter;
  const used = new Set(db.problems.map(p => p.topic));
  const groups = db.course.modules.map(m => {
    const ls = m.lessons.filter(l => used.has(l.id));
    return ls.length ? `<optgroup label="Розділ ${m.num}. ${esc(m.title)}">${ls.map(l => opt(l.id, `${l.num}. ${l.title}`, f.topic)).join("")}</optgroup>` : "";
  }).join("");
  const hasOther = db.problems.some(p => !lessonById(p.topic));

  return `<div class="page narrow">
    <div class="page-head">
      <h1>Задачі</h1>
      <p class="lead">Тренувальні задачі і завдання олімпіад минулих років. Кожна задача прив’язана до уроку, після якого її вже можна розв’язати, тож список іде від простих тем до складних.</p>
    </div>
    <div class="filters" role="search">
      <div class="search"><label for="f-q">Пошук</label><input id="f-q" type="search" data-filter="q" value="${esc(f.q)}" placeholder="Назва задачі"></div>
      <div><label for="f-t">Тема (урок)</label><select id="f-t" data-filter="topic">${opt("", "Усі теми", f.topic)}${groups}${hasOther ? opt("other", "Інше", f.topic) : ""}</select></div>
      <div><label for="f-l">Рівень</label><select id="f-l" data-filter="level">${opt("", "Будь-який", f.level)}${[1, 2, 3].map(l => opt(l, LEVELS[l], f.level)).join("")}</select></div>
      <div><label for="f-s">Стан</label><select id="f-s" data-filter="status">${opt("", "Усі", f.status)}${opt("new", "Не розпочаті", f.status)}${opt("trying", "Розв’язую", f.status)}${opt("solved", "Розв’язані", f.status)}</select></div>
    </div>
    <div class="seg" role="group" aria-label="Які задачі показати" style="margin-bottom:16px">
      ${[["", "Усі"], ["training", "Тренувальні"], ["archive", "Олімпіадні"]].map(([v, t]) =>
        `<button type="button" data-act="source" data-v="${v}" aria-pressed="${f.source === v}">${t}</button>`).join("")}
    </div>
    <div id="plist">${problemRows()}</div>
  </div>`;
}
