// Збереження в браузері учня: пройдені уроки, розв’язані задачі, чернетки коду, тема.
// Усе зберігається лише на цьому пристрої (localStorage). Перенести прогрес на інший
// комп’ютер можна через файл на сторінці «Прогрес».

const KEYS = {
  lessons: "oz2_lessons",      // { idУроку: час, коли пройдено }
  exercises: "oz2_exercises",  // { "урок/задача": "solved" }
  problems: "oz_progress",     // { idЗадачі: "trying" | "solved" } — той самий ключ, що й у першій версії сайту
  quiz: "oz2_quiz",            // { "урок/номер": true } — питання, на які відповіли правильно
  code: "oz2_code:",           // префікс для чернеток коду
  theme: "oz_theme",
  teacher: "oz_teacher",
  draft: "oz_problems_draft_v3"
};

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
  try { localStorage.removeItem(key); } catch (e) { /* немає доступу до сховища — не страшно */ }
}

const isObj = v => v && typeof v === "object" && !Array.isArray(v);

export const progress = {
  lessons: {},
  exercises: {},
  problems: {},
  quiz: {}
};

export function loadProgress() {
  for (const k of ["lessons", "exercises", "problems", "quiz"]) {
    const v = storeGet(KEYS[k], {});
    progress[k] = isObj(v) ? v : {};
  }
}

function save(k) { storeSet(KEYS[k], progress[k]); }

/* ---------- Уроки ---------- */
export const isLessonDone = id => !!progress.lessons[id];
export function setLessonDone(id, on) {
  if (on) progress.lessons[id] = Date.now(); else delete progress.lessons[id];
  save("lessons");
}

/* ---------- Задачі з уроків ---------- */
export const isExerciseSolved = key => progress.exercises[key] === "solved";
export function setExerciseSolved(key) {
  progress.exercises[key] = "solved";
  save("exercises");
}

/* ---------- Тести в уроках ---------- */
export const isQuizRight = key => !!progress.quiz[key];
export function setQuizRight(key) {
  progress.quiz[key] = true;
  save("quiz");
}

/* ---------- Тренувальні й олімпіадні задачі ---------- */
export const problemStatus = id => progress.problems[id] || "";
export function setProblemStatus(id, value) {
  if (value) progress.problems[id] = value; else delete progress.problems[id];
  save("problems");
}
export function renameProblemStatus(from, to) {
  if (from === to || !progress.problems[from]) return;
  progress.problems[to] = progress.problems[from];
  delete progress.problems[from];
  save("problems");
}

/* ---------- Чернетки коду ---------- */
export function loadCode(key) {
  const v = storeGet(KEYS.code + key, null);
  return typeof v === "string" ? v : null;
}
export function saveCode(key, code) { storeSet(KEYS.code + key, code); }
export function dropCode(key) { storeDel(KEYS.code + key); }

function codeKeys() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(KEYS.code)) out.push(k);
    }
  } catch (e) { /* немає доступу */ }
  return out;
}

/* ---------- Перенесення і очищення ---------- */
export function exportProgress() {
  const code = {};
  for (const k of codeKeys()) code[k.slice(KEYS.code.length)] = storeGet(k, "");
  return JSON.stringify({ app: "olimpiada-portal", version: 2, saved: new Date().toISOString(), ...progress, code }, null, 1);
}

/** Повертає true, якщо файл прогресу вдалося прочитати. Дані об’єднуються з наявними. */
export function importProgress(text) {
  let data;
  try { data = JSON.parse(text); } catch (e) { return false; }
  if (!isObj(data) || data.app !== "olimpiada-portal") return false;
  for (const k of ["lessons", "exercises", "problems", "quiz"]) {
    if (isObj(data[k])) { Object.assign(progress[k], data[k]); save(k); }
  }
  if (isObj(data.code)) {
    for (const [k, v] of Object.entries(data.code)) if (typeof v === "string") saveCode(k, v);
  }
  return true;
}

export function resetProgress() {
  for (const k of ["lessons", "exercises", "problems", "quiz"]) { progress[k] = {}; save(k); }
  for (const k of codeKeys()) storeDel(k);
}

/* ---------- Тема ---------- */
export const savedTheme = () => storeGet(KEYS.theme, null);
export const saveTheme = t => storeSet(KEYS.theme, t);

/* ---------- Режим учителя ---------- */
export function teacherUnlocked() {
  try { return sessionStorage.getItem(KEYS.teacher) === "1"; } catch (e) { return false; }
}
export function setTeacherUnlocked(on) {
  try {
    if (on) sessionStorage.setItem(KEYS.teacher, "1"); else sessionStorage.removeItem(KEYS.teacher);
  } catch (e) { /* немає доступу */ }
}

export const loadDraft = () => storeGet(KEYS.draft, null);
export const saveDraft = problems => storeSet(KEYS.draft, problems);
export const dropDraft = () => storeDel(KEYS.draft);
