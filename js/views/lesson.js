// Сторінка уроку: текст з прикладами, тест, задачі, позначка «пройдено» і перехід до наступного уроку.
import { esc, icon } from "../utils.js";
import { renderMarkdown } from "../markdown.js";
import { lessonHooks } from "../widgets.js";
import { isLessonDone, progress } from "../store.js";
import { db, lessonById, cachedLesson, loadLesson, problemsForTopic, isArchive } from "../data.js";
import { setTitle, notFound, loading, problemRow } from "./common.js";

const exerciseCount = text => (String(text).match(/^\s{0,3}```exercise\b/gm) || []).length;
const solvedIn = id => Object.keys(progress.exercises).filter(k => k.startsWith(id + "/") && progress.exercises[k] === "solved").length;

export function lessonDonePanel(l) {
  const text = cachedLesson(l.id) || "";
  const total = exerciseCount(text);
  const solved = Math.min(solvedIn(l.id), total);
  const exLine = total ? `Задачі уроку: розв’язано ${solved} з ${total}.` : "";
  const next = db.lessons[l.num] || null;
  if (isLessonDone(l.id)) {
    return `<div class="card lesson-done is-done" id="lesson-done"><div><b>${icon("check")} Урок пройдено</b><p>${exLine} До уроку можна повернутися будь-коли.</p></div>` +
      `<div class="btns"><button class="btn btn-ghost btn-sm" type="button" data-act="lesson-undone" data-id="${l.id}">Зняти позначку</button>` +
      (next ? `<a class="btn btn-primary" href="#/lesson/${next.id}">Наступний урок ${icon("arrow")}</a>` : `<a class="btn btn-primary" href="#/olympiads">До олімпіадних задач ${icon("arrow")}</a>`) +
      `</div></div>`;
  }
  return `<div class="card lesson-done" id="lesson-done"><div><b>Розібрався з уроком?</b><p>${exLine || "Познач урок як пройдений — так буде видно твій прогрес."}</p></div>` +
    `<button class="btn btn-ok" type="button" data-act="lesson-done" data-id="${l.id}">${icon("check")} Урок пройдено</button></div>`;
}

export function viewLesson(id) {
  const l = lessonById(id);
  if (!l) return notFound("Такого уроку немає. Можливо, в адресі помилка.");
  setTitle(`Урок ${l.num}. ${l.title}`);
  const text = cachedLesson(id);
  if (text == null) return { html: loading("Завантажую урок…"), wait: loadLesson(id) };

  const ctx = { hooks: lessonHooks(id), dropTitle: true, headings: [] };
  const body = renderMarkdown(text, ctx);
  const total = db.lessons.length;
  const prev = db.lessons[l.num - 2] || null;
  const next = db.lessons[l.num] || null;
  const exN = exerciseCount(text);

  const toc = ctx.headings.length > 2
    ? `<details class="toc"><summary>Зміст уроку</summary><ol>${ctx.headings.map(h =>
      `<li><button type="button" data-act="goto" data-target="${h.id}">${esc(h.text.replace(/[`*]/g, ""))}</button></li>`).join("")}</ol></details>`
    : "";

  const rel = problemsForTopic(id).sort((a, b) => (isArchive(a) - isArchive(b)) || (a.level - b.level));
  const related = rel.length
    ? `<section class="related"><h2 class="section-title">Задачі для тренування після цього уроку</h2>` +
      `<p class="muted small" style="margin:-6px 0 12px">Тренувальні задачі і завдання олімпіад минулих років, які вже можна розв’язати.</p>` +
      `<div class="card plist">${rel.map(problemRow).join("")}</div></section>`
    : "";

  return `<div class="page">
    <article class="lesson">
      <nav class="crumbs" aria-label="Шлях"><a href="#/course">Курс</a><span>›</span><a href="#/course#${l.module.id}">Розділ ${l.module.num}. ${esc(l.module.title)}</a></nav>
      <header class="lesson-head">
        <div class="kicker">Урок ${l.num} з ${total}</div>
        <h1>${esc(l.title)}</h1>
        <div class="meta"><span class="chip">≈ ${l.minutes} хв</span>${exN ? `<span class="chip">Задач: ${exN}</span>` : ""}${isLessonDone(id) ? `<span class="chip chip-ok">${icon("check")} Пройдено</span>` : ""}</div>
      </header>
      ${toc}
      <div class="prose">${body}</div>
      ${related}
      ${lessonDonePanel(l)}
      <nav class="pager" aria-label="Інші уроки">
        ${prev ? `<a class="card prev" href="#/lesson/${prev.id}"><small>← Попередній урок</small><b>${prev.num}. ${esc(prev.title)}</b></a>` : ""}
        ${next ? `<a class="card next" href="#/lesson/${next.id}"><small>Наступний урок →</small><b>${next.num}. ${esc(next.title)}</b></a>` : ""}
      </nav>
    </article>
  </div>`;
}
