// Дані порталу і стан у браузері: завантаження JSON, прогрес учня, чернетки вчителя.

const KEYS = {
  draft: "oz_problems_draft_v2",
  progress: "oz_progress",
  theme: "oz_theme",
  teacher: "oz_teacher"
};

export const state = {
  theory: [],
  years: [],
  /** Задачі з файлів data/problems.json і data/archive.json. */
  base: [],
  /** Задачі, які показує портал (з урахуванням чернетки вчителя). */
  problems: [],
  hasDraft: false,
  progress: {},
  hintShown: {},
  filter: { q: "", topic: "", level: "", status: "" },
  teacherUnlocked: false,
  editing: null
};

export const LEVELS = { 1: "Розминка", 2: "Середній", 3: "Складний" };

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
  const [theory, training, archive, years] = await Promise.all([
    getJSON("data/theory.json"),
    getJSON("data/problems.json"),
    getJSON("data/archive.json"),
    getJSON("data/years.json")
  ]);
  state.theory = theory;
  state.years = years;
  state.base = training.map(p => ({ ...p, year: undefined })).concat(archive);
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

/* ---------- Довідкові функції ---------- */
export const isArchive = p => !!p.year;
export const training = () => state.problems.filter(p => !isArchive(p));
export const archive = () => state.problems.filter(isArchive);
export const findProblem = id => state.problems.find(p => p.id === id);

export function topicTitle(id) {
  const t = state.theory.find(x => x.id === id);
  return t ? t.title : "Інше";
}

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
  const out = (yearInfo(yid)?.docs || []).map(d => d.group);
  archive().filter(p => p.year === yid).forEach(p => {
    (p.groups && p.groups.length ? p.groups : ["Інші задачі"]).forEach(g => { if (!out.includes(g)) out.push(g); });
  });
  return out.filter(g => archive().some(p => p.year === yid && (p.groups?.length ? p.groups.includes(g) : g === "Інші задачі")));
}

/** Документ з оригінальними завданнями для року і групи (або перший документ року). */
export function docFor(yid, group) {
  const docs = yearInfo(yid)?.docs || [];
  return docs.find(d => d.group === group) || null;
}
