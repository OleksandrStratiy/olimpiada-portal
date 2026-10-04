// «Для вчителя»: додавання й редагування задач і вивантаження JSON-файлів для сайту.
// Уроки курсу — це файли Markdown у папці lessons/, їх редагують прямо на GitHub (див. README.md).
import { esc, toast, downloadText, icon } from "../utils.js";
import { TEACHER_PIN } from "../config.js";
import { teacherUnlocked, setTeacherUnlocked, renameProblemStatus, setProblemStatus } from "../store.js";
import { db, isArchive, training, archive, topicTitle, yearTitle, yearsWithProblems, setProblems, discardDraft } from "../data.js";
import { setTitle, LEVELS } from "./common.js";

const ui = { tab: "archive", editing: null };

export function resetTeacherForm() { ui.editing = null; }

/* ---------- Сторінка ---------- */
export function viewTeacher() {
  setTitle("Для вчителя");
  if (!teacherUnlocked()) {
    return `<div class="page narrow">
      <div class="page-head"><h1>Для вчителя</h1>
      <p class="lead">Тут можна додавати й редагувати задачі, а потім завантажити оновлені файли даних для сайту.</p></div>
      <form class="card pinbox" id="pin-form">
        <div class="field"><label for="pin">PIN-код</label><input id="pin" type="password" inputmode="numeric" autocomplete="off"></div>
        <button class="btn btn-primary" type="submit">Увійти</button>
        <p class="help" id="pin-msg" role="alert"></p>
      </form>
    </div>`;
  }
  if (ui.editing) return problemForm();

  const list = ui.tab === "archive" ? archive() : training();
  const rows = list.map(p => `<div class="trow">
      <span class="ptitle">${esc(p.year ? p.id : p.title)}<small>${p.year ? `${esc(p.title)} · ${esc(yearTitle(p.year))} · ${esc((p.groups || []).join(", "))}` : `${esc(p.id)} · ${esc(topicTitle(p.topic))}`}</small></span>
      <span class="btns"><button class="btn btn-ghost btn-sm" data-act="t-edit" data-id="${esc(p.id)}" type="button">Редагувати</button><button class="btn btn-danger btn-sm" data-act="t-delete" data-id="${esc(p.id)}" type="button">Видалити</button></span>
    </div>`).join("");

  return `<div class="page narrow">
    <div class="page-head"><h1>Для вчителя</h1>
    <p class="lead">Додай або зміни задачі. Зміни одразу видно в цьому браузері, а учням — після того, як заміниш файли в папці <code>data/</code> репозиторію.</p></div>
    ${db.hasDraft
      ? `<div class="banner"><p><b>Зміни збережено лише в цьому браузері.</b> Щоб їх побачили учні, завантаж оновлені файли й заміни ними однойменні файли в папці <code>data/</code>.</p>
          <div class="btns"><button class="btn btn-primary btn-sm" data-act="t-export-archive" type="button">Завантажити archive.json</button><button class="btn btn-primary btn-sm" data-act="t-export-training" type="button">Завантажити problems.json</button><button class="btn btn-ghost btn-sm" data-act="t-discard" type="button">Скасувати зміни</button></div></div>`
      : ""}
    <div class="btns" style="margin:20px 0">
      <button class="btn btn-primary" data-act="t-new" type="button">Додати задачу</button>
      <button class="btn btn-ghost" data-act="t-export-archive" type="button">${icon("download")}archive.json</button>
      <button class="btn btn-ghost" data-act="t-export-training" type="button">${icon("download")}problems.json</button>
      <span class="btn btn-ghost filebtn">${icon("upload")}Імпортувати JSON<input type="file" id="import-file" accept=".json,application/json" aria-label="Імпортувати задачі з JSON"></span>
    </div>
    <div class="seg" role="group" aria-label="Які задачі показати" style="margin-bottom:14px">
      <button type="button" data-act="t-tab" data-v="archive" aria-pressed="${ui.tab === "archive"}">Олімпіадні (${archive().length})</button>
      <button type="button" data-act="t-tab" data-v="training" aria-pressed="${ui.tab === "training"}">Тренувальні (${training().length})</button>
    </div>
    <div class="card plist">${rows || `<div class="empty">Задач немає. Натисни «Додати задачу».</div>`}</div>
    <div class="callout note" style="margin-top:26px"><div class="callout-title">${icon("info")}Уроки курсу</div>
      <div class="callout-body"><p>Тексти уроків лежать у папці <code>lessons/</code> (один файл Markdown на урок), а їхній список і порядок — у <code>data/course.json</code>. Як записувати тести й задачі в уроках, описано в README.md.</p></div></div>
    <p style="margin-top:22px"><button class="btn btn-ghost btn-sm" data-act="t-logout" type="button">Вийти з режиму вчителя</button></p>
  </div>`;
}

/* ---------- Форма задачі ---------- */
const field = (id, name, label, value, help = "", attrs = "") =>
  `<div class="field"><label for="${id}">${label}</label><input id="${id}" name="${name}" type="text" value="${esc(value)}" ${attrs}>${help ? `<p class="help">${help}</p>` : ""}</div>`;
const area = (id, name, label, value, rows, help = "", mono = false) =>
  `<div class="field"><label for="${id}">${label}</label><textarea class="input${mono ? " mono" : ""}" id="${id}" name="${name}" rows="${rows}" spellcheck="${!mono}">${esc(value)}</textarea>${help ? `<p class="help">${help}</p>` : ""}</div>`;

const MARKUP_HELP = "Порожній рядок починає новий абзац. `код` — моноширинний шрифт, **текст** — жирний. Малюнок — окремим абзацом: <code>[[img:назва.png|Підпис]]</code>, а сам файл поклади в папку <code>img/archive/</code>.";

function topicOptions(cur) {
  return db.course.modules.map(m => `<optgroup label="Розділ ${m.num}. ${esc(m.title)}">${m.lessons.map(l =>
    `<option value="${l.id}"${cur === l.id ? " selected" : ""}>${l.num}. ${esc(l.title)}</option>`).join("")}</optgroup>`).join("") +
    `<option value="other"${cur === "other" ? " selected" : ""}>Інше</option>`;
}

function problemForm() {
  const p = ui.editing;
  const arc = p._kind === "archive";
  const examples = (p.examples || []).map((e, k) => `<div class="ex-edit">
      <div><label>Введення ${k + 1}</label><textarea class="input mono" rows="3" data-ex-in>${esc(e.in)}</textarea></div>
      <div><label>Виведення ${k + 1}</label><textarea class="input mono" rows="3" data-ex-out>${esc(e.out)}</textarea>
        <input type="text" data-ex-note value="${esc(e.note || "")}" placeholder="Коментар (необов’язково)" style="margin-top:6px"></div>
      <button class="btn btn-danger btn-sm" data-act="t-remove-example" data-k="${k}" type="button" style="margin-top:26px">Прибрати</button>
    </div>`).join("");

  const kindSpecific = arc ? `
      <div class="grid2">
        ${field("e-year", "year", "Навчальний рік", p.year, "Формат 2025-26.", `list="years-list" placeholder="2025-26"`)}
        ${field("e-groups", "groups", "Групи класів", (p.groups || []).join(", "), "Через кому, як у документах: «8 клас і молодші, 9–11 класи».")}
      </div>
      <datalist id="years-list">${yearsWithProblems().map(y => `<option value="${esc(y)}">`).join("")}</datalist>
      ${area("e-st", "statement", "Умова (текст після «Задача Назва.»)", p.statement, 7, MARKUP_HELP)}
      ${field("e-tl", "techLabel", "Заголовок технічних умов", p.techLabel || "Технічні умови.")}
      ${area("e-tech", "tech", "Технічні умови", p.tech, 5)}
      ${area("e-after", "afterExamples", "Після прикладів (необов’язково)", p.afterExamples || "", 2, "Наприклад, малюнок до прикладу.")}
      ${area("e-note", "note", "Примітка упорядника (необов’язково)", p.note || "", 2, "Показується окремо від оригінальної умови.")}`
    : `
      <div class="grid2">
        ${field("e-time", "time", "Обмеження часу", p.time)}
        ${field("e-mem", "memory", "Обмеження пам’яті", p.memory)}
      </div>
      ${area("e-st", "statement", "Умова", p.statement, 6, MARKUP_HELP)}
      <div class="grid2">
        ${area("e-in", "input", "Вхідні дані", p.input, 4)}
        ${area("e-out", "output", "Вихідні дані", p.output, 4)}
      </div>`;

  return `<div class="page narrow">
    <nav class="crumbs"><a href="#/teacher" data-act="t-cancel">Усі задачі</a></nav>
    <h1>${p._new ? "Нова задача" : "Редагування задачі"}</h1>
    <form class="card formbox" id="prob-form" novalidate>
      <div class="seg" role="group" aria-label="Тип задачі" style="margin-bottom:18px">
        <button type="button" data-act="t-kind" data-v="archive" aria-pressed="${arc}">Олімпіадна</button>
        <button type="button" data-act="t-kind" data-v="training" aria-pressed="${!arc}">Тренувальна</button>
      </div>
      <div class="grid2">
        ${field("e-id", "id", arc ? "Назва задачі (програми), як у документі" : "Номер", p.id, arc ? "Наприклад, Racing2024." : "")}
        ${field("e-title", "title", arc ? "Коротка назва українською (для списків)" : "Назва", p.title)}
      </div>
      <div class="grid2">
        <div class="field"><label for="e-topic">Урок, після якого задачу можна розв’язати</label><select id="e-topic" name="topic">${topicOptions(p.topic)}</select></div>
        <div class="field"><label for="e-level">Рівень</label><select id="e-level" name="level">${[1, 2, 3].map(l => `<option value="${l}"${+p.level === l ? " selected" : ""}>${LEVELS[l]}</option>`).join("")}</select></div>
      </div>
      ${kindSpecific}
      <h2>Приклади</h2>
      <div>${examples || `<p class="muted">Прикладів ще немає.</p>`}</div>
      <button class="btn btn-ghost btn-sm" data-act="t-add-example" type="button">Додати приклад</button>
      <div style="margin-top:22px">${area("e-hints", "hints", "Підказки", (p.hints || []).join("\n"), 4, "Кожна підказка з нового рядка. Учні відкривають їх по одній.")}</div>
      ${area("e-sol", "solution", "Розв’язок на C++", p.solution, 12, "", true)}
      ${field("e-link", "link", "Посилання на автоматичну перевірку", p.link, "Необов’язково: Algotester, Eolymp тощо. З’явиться кнопка «Здати на перевірку».", `placeholder="https://…"`)}
      <p class="help" id="form-msg" role="alert" style="color:var(--bad);font-weight:700"></p>
      <div class="btns"><button class="btn btn-primary" type="submit">Зберегти задачу</button><button class="btn btn-ghost" data-act="t-cancel" type="button">Скасувати</button></div>
    </form>
  </div>`;
}

/** Переносить значення з форми в ui.editing (щоб не загубити їх при перемальовуванні). */
function readForm() {
  const f = document.getElementById("prob-form");
  if (!f) return;
  const e = ui.editing;
  const v = n => (f.elements[n] ? f.elements[n].value : undefined);
  const set = (n, transform = s => s) => { const x = v(n); if (x !== undefined) e[n] = transform(x); };
  ["id", "title", "link", "time", "memory", "year", "techLabel"].forEach(n => set(n, s => s.trim()));
  ["statement", "input", "output", "tech", "afterExamples", "note", "solution"].forEach(n => set(n));
  set("topic");
  set("level", s => +s || 1);
  set("hints", s => s.split("\n").map(x => x.trim()).filter(Boolean));
  set("groups", s => s.split(",").map(x => x.trim()).filter(Boolean));
  e.examples = [...f.querySelectorAll(".ex-edit")].map(r => {
    const ex = { in: r.querySelector("[data-ex-in]").value.replace(/\s+$/, ""), out: r.querySelector("[data-ex-out]").value.replace(/\s+$/, "") };
    const note = r.querySelector("[data-ex-note]").value.trim();
    if (note) ex.note = note;
    return ex;
  });
}

/** Прибирає службові й зайві поля відповідно до типу задачі. */
function cleanProblem(e) {
  const tail = { examples: e.examples || [], hints: e.hints || [], solution: e.solution || "", link: e.link || "" };
  if (e._kind === "archive") {
    return {
      id: e.id, title: e.title, year: e.year, groups: e.groups || [], topic: e.topic, level: e.level,
      statement: e.statement || "", techLabel: e.techLabel || "Технічні умови.", tech: e.tech || "", examples: tail.examples,
      ...(e.afterExamples ? { afterExamples: e.afterExamples } : {}),
      ...(e.note ? { note: e.note } : {}),
      hints: tail.hints, solution: tail.solution, link: tail.link
    };
  }
  return {
    id: e.id, title: e.title, topic: e.topic, level: e.level, time: e.time || "", memory: e.memory || "",
    statement: e.statement || "", input: e.input || "", output: e.output || "", ...tail
  };
}

function nextTrainingId() {
  let n = training().length + 1;
  while (db.problems.some(p => p.id === "A" + n)) n++;
  return "A" + n;
}

/* ---------- Дії ---------- */
/** Повертає true, якщо дію оброблено. rerender(scroll) перемальовує сторінку. */
export function teacherAction(act, el, rerender) {
  const id = el.dataset.id;
  switch (act) {
    case "t-logout": setTeacherUnlocked(false); rerender(); return true;
    case "t-tab": ui.tab = el.dataset.v; rerender(false); return true;
    case "t-new":
      ui.editing = ui.tab === "archive"
        ? { _new: true, _kind: "archive", id: "", title: "", year: yearsWithProblems()[0] || "", groups: [], topic: "input", level: 1,
            statement: "", techLabel: "Технічні умови.", tech: "Програма **Назва** читає з пристрою стандартного введення …", examples: [{ in: "", out: "" }], hints: [], solution: "", link: "" }
        : { _new: true, _kind: "training", id: nextTrainingId(), title: "", topic: "input", level: 1, time: "1 с", memory: "256 МБ",
            statement: "", input: "", output: "", examples: [{ in: "", out: "" }], hints: [], solution: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}", link: "" };
      rerender();
      return true;
    case "t-edit": {
      const p = db.problems.find(x => x.id === id);
      ui.editing = { ...JSON.parse(JSON.stringify(p)), _orig: p.id, _kind: isArchive(p) ? "archive" : "training" };
      rerender();
      return true;
    }
    case "t-kind": readForm(); ui.editing._kind = el.dataset.v; rerender(false); return true;
    case "t-delete": {
      const p = db.problems.find(x => x.id === id);
      if (p && confirm(`Видалити задачу «${p.id}»?`)) {
        setProblems(db.problems.filter(x => x.id !== id));
        setProblemStatus(id, "");
        rerender(false);
        toast("Задачу видалено");
      }
      return true;
    }
    case "t-add-example": readForm(); ui.editing.examples.push({ in: "", out: "" }); rerender(false); return true;
    case "t-remove-example": readForm(); ui.editing.examples.splice(+el.dataset.k, 1); rerender(false); return true;
    case "t-cancel": ui.editing = null; rerender(); return true;
    case "t-export-archive":
      downloadText("archive.json", JSON.stringify(archive(), null, 2) + "\n");
      return true;
    case "t-export-training":
      downloadText("problems.json", JSON.stringify(training().map(({ year, ...p }) => p), null, 2) + "\n");
      return true;
    case "t-discard":
      if (confirm("Скасувати всі зміни задач у цьому браузері й повернути задачі з файлів сайту?")) {
        discardDraft();
        rerender(false);
        toast("Зміни скасовано");
      }
      return true;
  }
  return false;
}

export function teacherSubmit(form, rerender) {
  const fid = form.getAttribute("id");
  if (fid === "pin-form") {
    if (document.getElementById("pin").value === TEACHER_PIN) { setTeacherUnlocked(true); rerender(); }
    else document.getElementById("pin-msg").textContent = "Неправильний PIN. Спробуй ще раз.";
    return true;
  }
  if (fid !== "prob-form") return false;
  readForm();
  const e = ui.editing;
  const msg = document.getElementById("form-msg");
  if (!e.id || !/^[\wА-Яа-яІіЇїЄєҐґ-]+$/.test(e.id)) { msg.textContent = "Вкажи назву (номер) задачі: літери, цифри, дефіс, без пробілів."; return true; }
  if (!e.title) { msg.textContent = "Вкажи коротку назву задачі."; return true; }
  if (e._kind === "archive" && !/^\d{4}-\d{2}$/.test(e.year || "")) { msg.textContent = "Навчальний рік запиши у форматі 2025-26."; return true; }
  if (e._kind === "archive" && !(e.groups || []).length) { msg.textContent = "Вкажи хоча б одну групу класів."; return true; }
  if (db.problems.some(p => p.id === e.id && p.id !== e._orig)) { msg.textContent = `Задача ${e.id} уже є. Вибери іншу назву.`; return true; }
  const clean = cleanProblem(e);
  if (e._orig) {
    setProblems(db.problems.map(p => (p.id === e._orig ? clean : p)));
    renameProblemStatus(e._orig, clean.id);
  } else {
    setProblems(db.problems.concat([clean]));
  }
  ui.tab = e._kind;
  ui.editing = null;
  rerender();
  toast("Задачу збережено");
  return true;
}

/** Імпорт JSON: масив задач з полем year замінює олімпіадні задачі, без нього — тренувальні. */
export function teacherImport(file, rerender) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data) || !data.every(p => p && p.id)) throw new Error("format");
      const arc = data.every(p => p.year), tr = data.every(p => !p.year);
      const what = arc ? "олімпіадні задачі" : tr ? "тренувальні задачі" : "усі задачі";
      if (!confirm(`Замінити ${what} задачами з файлу (${data.length})?`)) return;
      if (arc) setProblems(training().concat(data));
      else if (tr) setProblems(data.concat(archive()));
      else setProblems(data);
      rerender(false);
      toast("Задачі імпортовано");
    } catch (err) {
      alert("Файл не схожий на файл задач. Потрібен JSON-масив задач, кожна з полем id.");
    }
  };
  reader.readAsText(file);
}
