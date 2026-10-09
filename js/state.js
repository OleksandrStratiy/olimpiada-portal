// Дані порталу і стан у браузері: завантаження JSON, прогрес учня, чернетки вчителя.

const KEYS = {
  draft: "oz_problems_draft_v3",
  progress: "oz_progress",
  theme: "oz_theme",
  teacher: "oz_teacher"
};

export const state = {
  theory: [],
  categories: [],
  years: [],
  /** Задачі з файлів data/problems.json і data/archive.json. */
  base: [],
  /** Задачі, які показує портал (з урахуванням чернетки вчителя). */
  problems: [],
  hasDraft: false,
  progress: {},
  hintShown: {},
  teacherUnlocked: false,
  editing: null
};

export const LEVELS = { 1: "Розминка", 2: "Середній рівень", 3: "Складний рівень" };
export const LEVEL_SHORT = { 1: "Розминка", 2: "Середній", 3: "Складний" };

/* ---------- localStorage з обробкою помилок ---------- */
export function storeGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : JSON.parse(v);
  } catch (e) {
    return fallback;
  }
}
export function storeSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
}
export function storeDel(key) {
  try { localStorage.removeItem(key); } catch (e) { /* ігноруємо */ }
}

/* ---------- Завантаження даних ---------- */
async function getJSON(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

export async function loadData() {
  const [theory, categories, training, archiveList, years] = await Promise.all([
    getJSON("data/theory.json"),
    getJSON("data/categories.json"),
    getJSON("data/problems.json"),
    getJSON("data/archive.json"),
    getJSON("data/years.json")
  ]);
  state.theory = theory;
  state.categories = categories;
  state.years = years;
  state.base = training.map(({ year, ...p }) => p).concat(archiveList);
  const draft = storeGet(KEYS.draft, null);
  state.hasDraft = Array.isArray(draft);
  state.problems = state.hasDraft ? draft : state.base;
  state.progress = storeGet(KEYS.progress, {});
  try { state.teacherUnlocked = sessionStorage.getItem(KEYS.teacher) === "1"; } catch (e) { /* ігноруємо */ }
}

/* ---------- Прогрес учня ---------- */
export function statusOf(id) { return state.progress[id] || ""; }
export function setStatus(id, value) {
  if (value) state.progress[id] = value; else delete state.progress[id];
  storeSet(KEYS.progress, state.progress);
}
export function resetProgress() {
  state.progress = {};
  storeSet(KEYS.progress, state.progress);
}
export function renameProgress(from, to) {
  if (from === to || !state.progress[from]) return;
  state.progress[to] = state.progress[from];
  delete state.progress[from];
  storeSet(KEYS.progress, state.progress);
}
export const solvedCount = list => list.filter(p => statusOf(p.id) === "solved").length;

/* ---------- Чернетка вчителя ---------- */
export function saveDraft() {
  state.hasDraft = true;
  return storeSet(KEYS.draft, state.problems);
}
export function discardDraft() {
  storeDel(KEYS.draft);
  state.hasDraft = false;
  state.problems = state.base;
}
export function unlockTeacher(on) {
  state.teacherUnlocked = on;
  try {
    if (on) sessionStorage.setItem(KEYS.teacher, "1"); else sessionStorage.removeItem(KEYS.teacher);
  } catch (e) { /* ігноруємо */ }
}

/* ---------- Тема ---------- */
export function savedTheme() { return storeGet(KEYS.theme, null); }
export function saveTheme(t) { storeSet(KEYS.theme, t); }

/* ---------- Задачі ---------- */
export const isArchive = p => !!p.year;
export const training = () => state.problems.filter(p => !isArchive(p));
export const archive = () => state.problems.filter(isArchive);
export const findProblem = id => state.problems.find(p => p.id === id);

/** Стійке сортування від легших задач до складніших (порядок у файлі зберігається). */
export function byLevel(list) {
  return list.map((p, i) => [p, i])
    .sort((a, b) => (a[0].level || 1) - (b[0].level || 1) || a[1] - b[1])
    .map(x => x[0]);
}

/* ---------- Категорії ---------- */
export const findCategory = id => state.categories.find(c => c.id === id) || null;
export const categoryTitle = id => findCategory(id)?.title || "Без категорії";

/** Тренувальні задачі категорії, від легких до складних. */
export const practiceIn = cid => byLevel(training().filter(p => p.category === cid));

/** Олімпіадні задачі, позначені категорією: від легших, серед рівних — новіші першими. */
export function archiveIn(cid) {
  return archive().filter(p => p.category === cid)
    .sort((a, b) => (a.level || 1) - (b.level || 1) || String(b.year).localeCompare(String(a.year)));
}

/** Категорії, у яких є хоча б одна задача (тренувальна чи олімпіадна). */
export function activeCategories() {
  return state.categories.filter(c => practiceIn(c.id).length || archiveIn(c.id).length);
}

/** Задачі з розв'язками для вкладки «Розв'язки» в порядку категорії. */
export function solutionsIn(cid) {
  return practiceIn(cid).concat(archiveIn(cid)).filter(p => p.solution);
}

/* ---------- Теорія ---------- */
export function topicTitle(id) {
  const t = state.theory.find(x => x.id === id);
  return t ? t.title : "Інше";
}
/** Категорія, прив'язана до теми з довідника (наприклад, «Цикл for»). */
export const categoryForTopic = tid => state.categories.find(c => c.theory === tid) || null;

/* ---------- Олімпіади минулих років ---------- */
export function yearInfo(id) { return state.years.find(y => y.id === id) || null; }

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

/** Групи класів у році: спершу в порядку документів з years.json, потім решта. */
export function yearGroups(yid) {
  const inGroup = (p, g) => (p.groups && p.groups.length ? p.groups.includes(g) : g === "Інші задачі");
  const out = (yearInfo(yid)?.docs || []).map(d => d.group);
  archive().filter(p => p.year === yid).forEach(p => {
    (p.groups && p.groups.length ? p.groups : ["Інші задачі"]).forEach(g => { if (!out.includes(g)) out.push(g); });
  });
  return out.filter(g => archive().some(p => p.year === yid && inGroup(p, g)));
}

/** Документ з оригінальними завданнями для року і групи. */
export function docFor(yid, group) {
  const docs = yearInfo(yid)?.docs || [];
  return docs.find(d => d.group === group) || null;
}
