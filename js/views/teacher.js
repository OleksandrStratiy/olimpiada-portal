// Розділ «Для вчителя»: редагування задач і експорт JSON-файлів для репозиторію.
import { esc, toast, downloadText } from "../utils.js";
import { TEACHER_PIN } from "../config.js";
import {
  state, LEVEL_SHORT, isArchive, training, archive, byLevel, categoryTitle, findCategory, yearTitle,
  yearsWithProblems, saveDraft, discardDraft, unlockTeacher, renameProgress, setStatus
} from "../state.js";
import { pageHead, sectionHead } from "./common.js";

const ui = { tab: "training" };

/* ---------- Сторінка ---------- */
export function viewTeacher() {
  document.title = "Для вчителя — Зошит олімпіадника";
  if (!state.teacherUnlocked) {
    return `${pageHead({ title: "Для вчителя", lead: "Тут можна додавати й редагувати задачі, а потім завантажити оновлені файли даних для сайту." })}
      <form class="form-card form-card--narrow" id="pin-form">
        <div class="field"><label class="field__label" for="pin">PIN-код</label><input class="input" id="pin" type="password" inputmode="numeric" autocomplete="off"></div>
        <button class="btn btn--primary" type="submit">Увійти</button>
        <p class="field__help" id="pin-msg"></p>
      </form>`;
  }
  if (state.editing) return problemForm();

  const row = (p, sub) => `<div class="admin-row">
      <span class="task-row__main"><span class="task-row__id">${esc(p.id)}</span><span class="task-row__title">${esc(p.title)} · ${sub}</span></span>
      <span class="btns"><button class="btn btn--ghost btn--small" data-act="edit" data-id="${esc(p.id)}" type="button">Редагувати</button><button class="btn btn--danger btn--small" data-act="delete" data-id="${esc(p.id)}" type="button">Видалити</button></span>
    </div>`;
  let list;
  if (ui.tab === "training") {
    const known = state.categories.map(c => c.id);
    const groups = known.concat([...new Set(training().map(p => p.category))].filter(c => !known.includes(c)));
    list = groups.map(cid => {
      const items = byLevel(training().filter(p => p.category === cid));
      if (!items.length) return "";
      return `<section class="section">${sectionHead(categoryTitle(cid))}<div class="task-list">${items.map(p => row(p, esc(LEVEL_SHORT[p.level] || ""))).join("")}</div></section>`;
    }).join("");
  } else {
    list = `<div class="task-list">${archive().map(p => row(p, `${esc(yearTitle(p.year))}, ${esc((p.groups || []).join(", "))}`)).join("")}</div>`;
  }

  return `${pageHead({ title: "Для вчителя", lead: "Додай або зміни задачі. Зміни одразу видно в цьому браузері, а учням — після того, як заміниш файли в папці <code>data/</code> на сайті." })}
    ${state.hasDraft
      ? `<div class="banner"><p><b>Зміни збережено лише в цьому браузері.</b> Щоб їх побачили учні, завантаж оновлені файли й заміни ними однойменні файли в папці <code>data/</code> репозиторію.</p>
          <div class="btns"><button class="btn btn--primary" data-act="export-training" type="button">Завантажити problems.json</button><button class="btn btn--primary" data-act="export-archive" type="button">Завантажити archive.json</button><button class="btn btn--ghost btn--small" data-act="reset-problems" type="button">Скасувати зміни</button></div></div>`
      : ""}
    <div class="btns" style="margin-bottom:var(--s-3)">
      <button class="btn btn--primary" data-act="new" type="button">Додати задачу</button>
      <button class="btn btn--ghost" data-act="export-training" type="button">Завантажити problems.json</button>
      <button class="btn btn--ghost" data-act="export-archive" type="button">Завантажити archive.json</button>
      <span class="btn btn--ghost filebtn">Імпортувати JSON<input type="file" id="import-file" accept=".json,application/json" aria-label="Імпортувати задачі з JSON"></span>
    </div>
    <div class="segmented" role="group" aria-label="Які задачі показати">
      <button class="segmented__btn" type="button" data-act="tab" data-v="training" aria-pressed="${ui.tab === "training"}">Тренувальні (${training().length})</button>
      <button class="segmented__btn" type="button" data-act="tab" data-v="archive" aria-pressed="${ui.tab === "archive"}">Олімпіадні (${archive().length})</button>
    </div>
    ${list || `<div class="empty">Задач немає. Натисни «Додати задачу».</div>`}
    <div class="btns" style="margin-top:var(--s-4)"><button class="btn btn--ghost btn--small" data-act="logout" type="button">Вийти з режиму вчителя</button></div>`;
}

/* ---------- Форма задачі ---------- */
const field = (id, name, label, value, help = "", attrs = "") =>
  `<div class="field"><label class="field__label" for="${id}">${label}</label><input class="input" id="${id}" name="${name}" type="text" value="${esc(value)}" ${attrs}>${help ? `<p class="field__help">${help}</p>` : ""}</div>`;
const area = (id, name, label, value, rows, help = "", code = false) =>
  `<div class="field"><label class="field__label" for="${id}">${label}</label><textarea class="input${code ? " input--code" : ""}" id="${id}" name="${name}" rows="${rows}" spellcheck="${!code}">${esc(value)}</textarea>${help ? `<p class="field__help">${help}</p>` : ""}</div>`;
const select = (id, name, label, options, value) =>
  `<div class="field"><label class="field__label" for="${id}">${label}</label><select class="input" id="${id}" name="${name}">${options.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(value) ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></div>`;

const MARKUP_HELP = "Порожній рядок починає новий абзац. `код` — моноширинний шрифт, **текст** — жирний. Малюнок — окремим абзацом: <code>[[img:назва.png|Підпис]]</code>, а сам файл поклади в папку <code>img/archive/</code>.";
const TECH_TEMPLATE = "Програма **Назва** читає з пристрою стандартного введення … Програма виводить на пристрій стандартного виведення …";
const SOLUTION_TEMPLATE = "#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n";

function problemForm() {
  const p = state.editing;
  const arc = p._kind === "archive";
  const cats = state.categories.map(c => [c.id, c.title]);
  const catOptions = arc ? [["", "— не показувати в категоріях —"]].concat(cats) : cats;
  const topics = state.theory.map(t => [t.id, t.title]).concat([["other", "Інше"]]);
  const examples = (p.examples || []).map((e, k) => `<div class="example-edit">
      <div><label class="field__label" for="ex-in-${k}">Введення ${k + 1}</label><textarea class="input input--code" id="ex-in-${k}" rows="3" data-ex-in>${esc(e.in)}</textarea></div>
      <div><label class="field__label" for="ex-out-${k}">Виведення ${k + 1}</label><textarea class="input input--code" id="ex-out-${k}" rows="3" data-ex-out>${esc(e.out)}</textarea>
        <input class="input" type="text" id="ex-note-${k}" data-ex-note value="${esc(e.note || "")}" placeholder="Коментар (необов’язково)" style="margin-top:var(--s-1)"></div>
      <button class="btn btn--danger btn--small example-edit__remove" data-act="remove-example" data-k="${k}" type="button">Прибрати</button>
    </div>`).join("");

  return `${pageHead({ crumbs: [["#/teacher", "Для вчителя"]], title: p._new ? "Нова задача" : `Редагування: ${p.id}` })}
    <form class="form-card" id="prob-form" novalidate>
      <div class="segmented" role="group" aria-label="Тип задачі">
        <button class="segmented__btn" type="button" data-act="kind" data-v="training" aria-pressed="${!arc}">Тренувальна</button>
        <button class="segmented__btn" type="button" data-act="kind" data-v="archive" aria-pressed="${arc}">Олімпіадна</button>
      </div>
      <div class="grid-2">
        ${field("e-id", "id", "Назва задачі (як у рядку «Задача Назва.»)", p.id, "Латиницею, без пропусків, наприклад Racing2024.")}
        ${field("e-title", "title", "Коротка назва українською", p.title, "Показується у списках під назвою задачі.")}
      </div>
      <div class="grid-3">
        ${select("e-cat", "category", "Категорія", catOptions, p.category || "")}
        ${select("e-level", "level", "Рівень", [1, 2, 3].map(l => [l, LEVEL_SHORT[l]]), p.level || 1)}
        ${select("e-topic", "topic", "Тема з довідника", topics, p.topic || "other")}
      </div>
      ${arc ? `<div class="grid-2">
        ${field("e-year", "year", "Навчальний рік", p.year || "", "Формат 2025-26.", `list="years-list" placeholder="2025-26"`)}
        ${field("e-groups", "groups", "Групи класів", (p.groups || []).join(", "), "Через кому, як у документах: «8 клас і молодші, 9–11 класи».")}
      </div>
      <datalist id="years-list">${yearsWithProblems().map(y => `<option value="${esc(y)}">`).join("")}</datalist>` : ""}
      ${area("e-st", "statement", "Умова (текст після слів «Задача Назва.»)", p.statement || "", 7, MARKUP_HELP)}
      ${field("e-tl", "techLabel", "Заголовок технічних умов", p.techLabel || "Технічні умови.")}
      ${area("e-tech", "tech", "Технічні умови", p.tech || "", 5)}
      <h2>Приклади</h2>
      <div>${examples || `<p class="muted">Прикладів ще немає.</p>`}</div>
      <button class="btn btn--ghost btn--small" data-act="add-example" type="button">Додати приклад</button>
      <div style="margin-top:var(--s-3)">${area("e-after", "afterExamples", "Після прикладів (необов’язково)", p.afterExamples || "", 2, "Наприклад, малюнок до прикладу.")}</div>
      ${area("e-note", "note", "Примітка упорядника (необов’язково)", p.note || "", 2, "Показується окремо від умови задачі.")}
      ${area("e-hints", "hints", "Підказки", (p.hints || []).join("\n"), 3, "Кожна підказка з нового рядка. Учні відкривають їх по одній.")}
      ${area("e-expl", "explanation", "Ідея розв’язку", p.explanation || "", 4, "Показується у вкладці «Розв’язки» над програмою.")}
      ${area("e-sol", "solution", "Розв’язок на C++", p.solution || "", 12, "Задача з’явиться у вкладці «Розв’язки», якщо тут є програма.", true)}
      ${field("e-link", "link", "Посилання на автоматичну перевірку", p.link || "", "Необов’язково: Algotester, e-olymp тощо. З’явиться кнопка «Здати на перевірку».", `placeholder="https://…"`)}
      <p class="form-msg" id="form-msg" role="alert"></p>
      <div class="btns"><button class="btn btn--primary" type="submit">Зберегти задачу</button><button class="btn btn--ghost" data-act="cancel" type="button">Скасувати</button></div>
    </form>`;
}

/** Переносить значення з форми в state.editing (щоб не загубити їх при перемальовуванні). */
function readForm() {
  const f = document.getElementById("prob-form");
  if (!f) return;
  const e = state.editing;
  const v = n => (f.elements[n] ? f.elements[n].value : undefined);
  const set = (n, transform = s => s) => { const x = v(n); if (x !== undefined) e[n] = transform(x); };
  ["id", "title", "link", "year", "techLabel", "category", "topic"].forEach(n => set(n, s => s.trim()));
  ["statement", "tech", "afterExamples", "note", "explanation", "solution"].forEach(n => set(n));
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

/** Залишає лише поля, потрібні цьому типу задачі, у тому порядку, що й у JSON-файлах. */
function cleanProblem(e) {
  const opt = (k, v) => (v ? { [k]: v } : {});
  const body = {
    statement: e.statement || "", techLabel: e.techLabel || "Технічні умови.", tech: e.tech || "", examples: e.examples || [],
    ...opt("afterExamples", e.afterExamples), ...opt("note", e.note), hints: e.hints || []
  };
  if (e._kind === "archive") {
    return {
      id: e.id, title: e.title, year: e.year, groups: e.groups || [], ...opt("category", e.category), topic: e.topic, level: e.level,
      ...body, ...opt("explanation", e.explanation), solution: e.solution || "", link: e.link || ""
    };
  }
  return {
    id: e.id, title: e.title, category: e.category, topic: e.topic, level: e.level,
    ...body, explanation: e.explanation || "", solution: e.solution || "", link: e.link || ""
  };
}

/* ---------- Дії ---------- */
/** Повертає true, якщо дію оброблено. rerender(scroll) перемальовує сторінку. */
export function teacherAction(act, el, rerender) {
  const id = el.dataset.id;
  switch (act) {
    case "logout":
      unlockTeacher(false); rerender(); return true;
    case "tab":
      ui.tab = el.dataset.v; rerender(false); return true;
    case "new": {
      const cat = state.categories[0];
      const common = { _new: true, id: "", title: "", level: 1, statement: "", techLabel: "Технічні умови.", tech: TECH_TEMPLATE,
        examples: [{ in: "", out: "" }], hints: [], explanation: "", solution: SOLUTION_TEMPLATE, link: "" };
      state.editing = ui.tab === "archive"
        ? { ...common, _kind: "archive", year: yearsWithProblems()[0] || "", groups: [], category: "", topic: "other" }
        : { ...common, _kind: "training", category: cat ? cat.id : "", topic: cat && cat.theory ? cat.theory : "other" };
      rerender(); return true;
    }
    case "edit": {
      const p = state.problems.find(x => x.id === id);
      state.editing = { ...JSON.parse(JSON.stringify(p)), _orig: p.id, _kind: isArchive(p) ? "archive" : "training" };
      rerender(); return true;
    }
    case "kind": {
      readForm();
      const e = state.editing;
      e._kind = el.dataset.v;
      if (e._kind === "training" && !findCategory(e.category)) e.category = state.categories[0]?.id || "";
      rerender(false); return true;
    }
    case "delete": {
      const p = state.problems.find(x => x.id === id);
      if (p && confirm(`Видалити задачу «${p.id}»?`)) {
        state.problems = state.problems.filter(x => x.id !== id);
        setStatus(id, "");
        saveDraft(); rerender(false); toast("Задачу видалено");
      }
      return true;
    }
    case "add-example":
      readForm(); state.editing.examples.push({ in: "", out: "" }); rerender(false); return true;
    case "remove-example":
      readForm(); state.editing.examples.splice(+el.dataset.k, 1); rerender(false); return true;
    case "cancel":
      state.editing = null; rerender(); return true;
    case "export-archive":
      downloadText("archive.json", JSON.stringify(archive(), null, 2) + "\n", "application/json"); return true;
    case "export-training":
      downloadText("problems.json", JSON.stringify(training(), null, 2) + "\n", "application/json"); return true;
    case "reset-problems":
      if (confirm("Скасувати всі зміни задач у цьому браузері й повернути задачі з файлів сайту?")) {
        discardDraft(); rerender(false); toast("Зміни скасовано");
      }
      return true;
  }
  return false;
}

export function teacherSubmit(form, rerender) {
  const fid = form.getAttribute("id");
  if (fid === "pin-form") {
    if (document.getElementById("pin").value === TEACHER_PIN) { unlockTeacher(true); rerender(); }
    else document.getElementById("pin-msg").textContent = "Неправильний PIN. Спробуй ще раз.";
    return true;
  }
  if (fid !== "prob-form") return false;
  readForm();
  const e = state.editing;
  const msg = document.getElementById("form-msg");
  if (!e.id || !/^[\wА-Яа-яІіЇїЄєҐґ-]+$/.test(e.id)) { msg.textContent = "Вкажи назву задачі: літери, цифри, дефіс, без пропусків."; return true; }
  if (!e.title) { msg.textContent = "Вкажи коротку назву задачі українською."; return true; }
  if (e._kind === "training" && !findCategory(e.category)) { msg.textContent = "Вибери категорію."; return true; }
  if (e._kind === "archive" && !/^\d{4}-\d{2}$/.test(e.year || "")) { msg.textContent = "Навчальний рік запиши у форматі 2025-26."; return true; }
  if (e._kind === "archive" && !(e.groups || []).length) { msg.textContent = "Вкажи хоча б одну групу класів."; return true; }
  if (state.problems.some(p => p.id === e.id && p.id !== e._orig)) { msg.textContent = `Задача ${e.id} уже є. Вибери іншу назву.`; return true; }
  const clean = cleanProblem(e);
  if (e._orig) {
    state.problems = state.problems.map(p => (p.id === e._orig ? clean : p));
    renameProgress(e._orig, clean.id);
  } else {
    state.problems = state.problems.concat([clean]);
  }
  ui.tab = e._kind;
  saveDraft();
  state.editing = null;
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
      if (arc) state.problems = training().concat(data);
      else if (tr) state.problems = data.concat(archive());
      else state.problems = data;
      saveDraft(); rerender(false); toast("Задачі імпортовано");
    } catch (err) {
      alert("Файл не схожий на файл задач. Потрібен JSON-масив задач, кожна з полем id.");
    }
  };
  reader.readAsText(file);
}
