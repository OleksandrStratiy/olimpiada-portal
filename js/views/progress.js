// «Прогрес»: пройдені уроки, розв’язані задачі, перенесення прогресу на інший комп’ютер.
import { esc, icon, plural } from "../utils.js";
import { progress, problemStatus } from "../store.js";
import { db, doneCount, nextLesson, yearTitle, yearsWithProblems, archive, training, solvedCount } from "../data.js";
import { setTitle, pbar, problemRow } from "./common.js";

function barRow(label, done, total) {
  return `<div class="bar-row"><span>${label}</span>${pbar(done, total)}<span>${done}/${total}</span></div>`;
}

export function viewProgress() {
  setTitle("Мій прогрес");
  const lessons = db.lessons.length;
  const lessonsDone = doneCount(db.lessons);
  const exSolved = Object.values(progress.exercises).filter(v => v === "solved").length;
  const all = db.problems;
  const solved = solvedCount(all);
  const trying = all.filter(p => problemStatus(p.id) === "trying");
  const next = nextLesson();

  const modules = db.course.modules.map(m =>
    barRow(`<a href="#/course#${m.id}">${m.num}. ${esc(m.title)}</a>`, doneCount(m.lessons), m.lessons.length)).join("");
  const years = yearsWithProblems().map(y => {
    const list = archive().filter(p => p.year === y);
    return barRow(`<a href="#/olympiads/${encodeURIComponent(y)}">${esc(yearTitle(y))}</a>`, solvedCount(list), list.length);
  }).join("");
  const tr = training();

  return `<div class="page narrow">
    <div class="page-head">
      <h1>Мій прогрес</h1>
      <p class="lead">Позначки зберігаються в цьому браузері. Щоб продовжити на іншому комп’ютері, збережи прогрес у файл і віднови його там.</p>
    </div>
    <div class="stats">
      <div class="card stat"><div class="lbl">Уроків пройдено</div><div class="num">${lessonsDone} <small>з ${lessons}</small></div>${pbar(lessonsDone, lessons)}</div>
      <div class="card stat"><div class="lbl">Задач з уроків</div><div class="num">${exSolved}</div><span class="muted small">${plural(exSolved, "розв’язана", "розв’язані", "розв’язано")} з автоматичною перевіркою</span></div>
      <div class="card stat"><div class="lbl">Тренувальних і олімпіадних</div><div class="num">${solved} <small>з ${all.length}</small></div>${pbar(solved, all.length)}</div>
    </div>
    ${next ? `<p><a class="btn btn-primary" href="#/lesson/${next.id}">Продовжити: урок ${next.num}. ${esc(next.title)} ${icon("arrow")}</a></p>` : ""}
    ${trying.length ? `<h2 class="section-title">Зараз розв’язую</h2><div class="card plist">${trying.map(problemRow).join("")}</div>` : ""}
    <h2 class="section-title">Розділи курсу</h2>
    <div class="card bars">${modules}</div>
    <h2 class="section-title">Задачі</h2>
    <div class="card bars">${barRow(`<a href="#/problems">Тренувальні задачі</a>`, solvedCount(tr), tr.length)}${years}</div>
    <h2 class="section-title">Перенести або очистити</h2>
    <div class="btns">
      <button class="btn btn-ghost" type="button" data-act="export-progress">${icon("download")}Зберегти прогрес у файл</button>
      <span class="btn btn-ghost filebtn">${icon("upload")}Відновити з файлу<input type="file" id="progress-file" accept=".json,application/json" aria-label="Відновити прогрес з файлу"></span>
      <button class="btn btn-danger" type="button" data-act="reset-progress">Очистити все</button>
    </div>
  </div>`;
}
