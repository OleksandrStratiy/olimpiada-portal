// Карта курсу: розділи і уроки з позначками пройденого.
import { esc, icon, plural } from "../utils.js";
import { isLessonDone } from "../store.js";
import { db, nextLesson, doneCount } from "../data.js";
import { setTitle, pbar } from "./common.js";

export function lessonRow(l, next) {
  const done = isLessonDone(l.id);
  const dot = done
    ? `<span class="ldot done" aria-label="Пройдено">${icon("check")}</span>`
    : `<span class="ldot${next && next.id === l.id ? " next" : ""}">${l.num}</span>`;
  return `<li><a class="lrow" href="#/lesson/${l.id}">${dot}` +
    `<span class="ltitle">${esc(l.title)}<small>${esc(l.summary)}</small></span>` +
    `<span class="lmeta">${l.minutes} хв</span></a></li>`;
}

export function viewCourse() {
  setTitle("Курс C++");
  const total = db.lessons.length;
  const done = doneCount(db.lessons);
  const next = nextLesson();
  const modules = db.course.modules.map(m => {
    const d = doneCount(m.lessons);
    const all = d === m.lessons.length;
    return `<section class="card module${all ? " done" : ""}" id="${m.id}">` +
      `<div class="module-head"><span class="module-num">${all ? "✓" : m.num}</span>` +
      `<div><h2>${esc(m.title)}</h2><p>${esc(m.summary)}</p></div>` +
      `<div class="mstat">${d} з ${m.lessons.length}${pbar(d, m.lessons.length)}</div></div>` +
      `<ol class="lessons">${m.lessons.map(l => lessonRow(l, next)).join("")}</ol></section>`;
  }).join("");

  const btn = next
    ? `<a class="btn btn-primary" href="#/lesson/${next.id}">${done ? `Продовжити: урок ${next.num}` : "Почати з уроку 1"} ${icon("arrow")}</a>`
    : `<span class="chip chip-ok">${icon("check")} Курс пройдено</span>`;

  return `<div class="page narrow">
    <div class="course-top">
      <div class="page-head" style="margin:0">
        <h1>Курс C++ з нуля</h1>
        <p class="lead">${total} ${plural(total, "урок", "уроки", "уроків")} у ${db.course.modules.length} розділах. Проходь їх по порядку: кожен урок спирається на попередні. Пройдено: ${done} з ${total}.</p>
      </div>
      ${btn}
    </div>
    <div class="callout tip" style="margin-bottom:24px"><div class="callout-title">${icon("bulb")}Порада</div>
      <div class="callout-body"><p>Для районної олімпіади учням 8 класу й молодшим найважливіші розділи 1–5. Учням 9–11 класів варто дійти до кінця курсу.</p></div></div>
    ${modules}
  </div>`;
}
