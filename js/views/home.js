// Головна сторінка: з чого почати, як побудовано курс, розділи і задача дня.
import { esc, icon, plural } from "../utils.js";
import { highlight } from "../highlight.js";
import { isLessonDone, problemStatus } from "../store.js";
import { db, nextLesson, doneCount, lessonById } from "../data.js";
import { setTitle, pbar, ring, problemHref } from "./common.js";

const HELLO = `#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b << "\\n";
    return 0;
}`;

function continueCard() {
  const total = db.lessons.length;
  const done = doneCount(db.lessons);
  const next = nextLesson();
  if (!done) {
    return `<div class="card continue">${ring(0, total)}<div><b>Почни з першого уроку</b>` +
      `<span class="muted">${total} ${plural(total, "урок", "уроки", "уроків")} від першої програми до олімпіадних алгоритмів</span></div>` +
      `<a class="btn btn-primary" href="#/lesson/${db.lessons[0].id}">Почати навчання ${icon("arrow")}</a></div>`;
  }
  if (!next) {
    return `<div class="card continue">${ring(done, total)}<div><b>Курс пройдено повністю!</b>` +
      `<span class="muted">Тепер найкраща підготовка — олімпіадні задачі минулих років.</span></div>` +
      `<a class="btn btn-primary" href="#/olympiads">До олімпіад ${icon("arrow")}</a></div>`;
  }
  return `<div class="card continue">${ring(done, total)}<div><b>Продовжуй: урок ${next.num}. ${esc(next.title)}</b>` +
    `<span class="muted">Пройдено ${done} з ${total} ${plural(total, "уроку", "уроків", "уроків")}</span></div>` +
    `<a class="btn btn-primary" href="#/lesson/${next.id}">Продовжити ${icon("arrow")}</a></div>`;
}

const STEPS = [
  ["book", "Короткі уроки", "Кожен урок пояснює одну ідею простими словами і на прикладах."],
  ["play", "Код просто тут", "Приклади можна змінювати й запускати на сторінці — нічого не треба встановлювати."],
  ["quiz", "Перевір себе", "Після теорії — запитання з поясненнями і задачі з автоматичною перевіркою."],
  ["trophy", "Справжні олімпіади", "Завдання районних олімпіад минулих років з прив’язкою до уроків курсу."]
];

/** Задача дня: нерозв’язана задача з теми, яку учень уже пройшов (або з найпростіших). */
function problemOfTheDay() {
  const all = db.problems;
  if (!all.length) return "";
  const day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
  const open = all.filter(p => problemStatus(p.id) !== "solved");
  const ready = open.filter(p => isLessonDone(p.topic));
  const easy = open.filter(p => (lessonById(p.topic)?.num ?? 99) <= 12);
  const pool = ready.length ? ready : easy.length ? easy : open.length ? open : all;
  const p = pool[day % pool.length];
  const l = lessonById(p.topic);
  const where = p.year ? `Олімпіада ${p.year.replace("-", "–")}` : "Тренувальна задача";
  return `<div class="card today"><span class="badge">${icon("calendar")}</span>` +
    `<div><small>Задача дня · ${esc(where)}</small><b>${esc(p.title || p.id)}</b>` +
    `<p>${l ? `Знадобиться: урок ${l.num} «${esc(l.title)}»` : "Задача на кмітливість"}</p></div>` +
    `<a class="btn btn-ghost" href="${problemHref(p)}">Розв’язувати</a></div>`;
}

export function viewHome() {
  setTitle("");
  const modules = db.course.modules.map(m => {
    const done = doneCount(m.lessons);
    return `<a class="card mcard" href="#/course#${m.id}" data-module="${m.id}">` +
      `<span class="mnum">Розділ ${m.num}</span><b>${esc(m.title)}</b><p>${esc(m.summary)}</p>` +
      `<span class="mfoot">${pbar(done, m.lessons.length)}<span>${done}/${m.lessons.length}</span></span></a>`;
  }).join("");

  return `<div class="page">
    <section class="hero">
      <div>
        <h1>Вивчай <em>C++</em> крок за кроком і готуйся до олімпіади</h1>
        <p class="lead">Безкоштовний курс для школярів: від першої програми до алгоритмів, з якими розв’язують задачі олімпіад з інформатики. Без поспіху, з прикладами і перевіркою кожного кроку.</p>
        <div class="btns">
          <a class="btn btn-primary" href="#/lesson/${db.lessons[0]?.id || ""}">Почати з першого уроку</a>
          <a class="btn btn-ghost" href="#/course">Усі уроки</a>
        </div>
      </div>
      <div class="hero-code" aria-label="Приклад програми на C++">
        <div class="dots"><i></i><i></i><i></i></div>
        <pre><code>${highlight(HELLO)}</code></pre>
        <div class="out"><span>введення: 2 3 → виведення:</span>5</div>
      </div>
    </section>
    ${continueCard()}
    <h2 class="section-title">Як тут навчатися</h2>
    <div class="steps">${STEPS.map(([ic, t, d]) => `<div class="card step"><span class="ico">${icon(ic)}</span><b>${t}</b><p>${d}</p></div>`).join("")}</div>
    <h2 class="section-title">Розділи курсу</h2>
    <div class="modules">${modules}</div>
    <h2 class="section-title">Задача дня</h2>
    ${problemOfTheDay()}
  </div>`;
}
