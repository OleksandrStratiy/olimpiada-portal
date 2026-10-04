// Дані сайту: курс (data/course.json і уроки в lessons/), задачі та олімпіади минулих років.
import { loadDraft, saveDraft, dropDraft, problemStatus, isLessonDone } from "./store.js";

export const db = {
  course: { title: "", modules: [] },
  /** Усі уроки по порядку; у кожного є module (розділ) і num (номер у курсі). */
  lessons: [],
  years: [],
  /** Задачі з файлів data/problems.json і data/archive.json. */
  base: [],
  /** Задачі, які показує сайт (з урахуванням чернетки вчителя). */
  problems: [],
  hasDraft: false
};

async function getJSON(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

export async function loadData() {
  const [course, training, archive, years] = await Promise.all([
    getJSON("data/course.json"),
    getJSON("data/problems.json"),
    getJSON("data/archive.json"),
    getJSON("data/years.json")
  ]);
  db.course = course;
  db.lessons = [];
  course.modules.forEach((m, mi) => {
    m.num = mi + 1;
    m.lessons.forEach(l => {
      l.module = m;
      l.num = db.lessons.length + 1;
      db.lessons.push(l);
    });
  });
  db.years = years;
  db.base = training.map(p => ({ ...p, year: undefined })).concat(archive);
  const draft = loadDraft();
  db.hasDraft = Array.isArray(draft);
  db.problems = db.hasDraft ? draft : db.base;
}

/* ---------- Уроки ---------- */
const lessonTexts = new Map();
const lessonLoads = new Map();

/** Завантажує текст уроку (Markdown) один раз і запам’ятовує його. */
export function loadLesson(id) {
  if (lessonTexts.has(id)) return Promise.resolve(lessonTexts.get(id));
  if (!lessonLoads.has(id)) {
    const p = fetch(`lessons/${encodeURIComponent(id)}.md`, { cache: "no-cache" })
      .then(r => { if (!r.ok) throw new Error(`lessons/${id}.md: ${r.status}`); return r.text(); })
      .then(text => { lessonTexts.set(id, text); return text; })
      .finally(() => lessonLoads.delete(id));
    lessonLoads.set(id, p);
  }
  return lessonLoads.get(id);
}
export const cachedLesson = id => lessonTexts.get(id) ?? null;

export const lessonById = id => db.lessons.find(l => l.id === id) || null;
export const moduleById = id => db.course.modules.find(m => m.id === id) || null;

/** Перший непройдений урок (або null, якщо курс пройдено). */
export function nextLesson() {
  return db.lessons.find(l => !isLessonDone(l.id)) || null;
}
export const doneCount = lessons => lessons.filter(l => isLessonDone(l.id)).length;

/** Назва теми задачі: тема — це id уроку, після якого задачу вже можна розв’язати. */
export function topicTitle(id) {
  const l = lessonById(id);
  return l ? l.title : "Інше";
}
export function topicLabel(id) {
  const l = lessonById(id);
  return l ? `Урок ${l.num}. ${l.title}` : "Інше";
}

/* ---------- Задачі ---------- */
export const isArchive = p => !!p.year;
export const training = () => db.problems.filter(p => !isArchive(p));
export const archive = () => db.problems.filter(isArchive);
export const findProblem = id => db.problems.find(p => p.id === id) || null;
export const problemsForTopic = id => db.problems.filter(p => p.topic === id);
export const solvedCount = list => list.filter(p => problemStatus(p.id) === "solved").length;

/** Порядковий номер теми задачі в курсі (для сортування від простих до складних). */
export function topicOrder(p) {
  const l = lessonById(p.topic);
  return l ? l.num : 999;
}

export function yearInfo(id) { return db.years.find(y => y.id === id) || null; }

export function yearTitle(id) {
  const y = yearInfo(id);
  if (y) return y.title;
  const m = /^(\d{4})-(\d{2})$/.exec(id || "");
  return m ? `${m[1]}–${m[1].slice(0, 2)}${m[2]} н. р.` : String(id || "");
}

/** Роки, для яких є хоча б одна задача, від найновішого. */
export function yearsWithProblems() {
  return [...new Set(archive().map(p => p.year))].sort().reverse();
}

const groupsOf = p => (p.groups && p.groups.length ? p.groups : ["Інші задачі"]);

/** Групи класів у році: спершу в порядку документів з years.json, потім решта. */
export function yearGroups(yid) {
  const list = archive().filter(p => p.year === yid);
  const out = (yearInfo(yid)?.docs || []).map(d => d.group);
  list.forEach(p => groupsOf(p).forEach(g => { if (!out.includes(g)) out.push(g); }));
  return out.filter(g => list.some(p => groupsOf(p).includes(g)));
}
export const problemsOfGroup = (yid, g) => archive().filter(p => p.year === yid && groupsOf(p).includes(g));

/** Документ з оригінальними завданнями для року і групи. */
export function docFor(yid, group) {
  return (yearInfo(yid)?.docs || []).find(d => d.group === group) || null;
}

/* ---------- Чернетка вчителя ---------- */
export function setProblems(list) {
  db.problems = list;
  db.hasDraft = true;
  return saveDraft(list);
}
export function discardDraft() {
  dropDraft();
  db.hasDraft = false;
  db.problems = db.base;
}
