// Загальні допоміжні функції: екранування, форматування тексту, буфер обміну, завантаження файлів.

/** Шлях до папки із зображеннями до умов задач. */
export const IMG_DIR = "img/archive/";

export function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** Рядкова розмітка: `код` і **жирний**. */
export function fmtInline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
}

const IMG_RE = /^\[\[img:([\w.\-]+)\|([^\]]*)\]\]$/;

/** Малюнок до умови. Якщо файла ще немає, на його місці буде заглушка (див. main.js). */
export function figure(file, caption) {
  const src = IMG_DIR + file;
  return `<figure class="fig"><img class="fig__img" src="${esc(src)}" alt="${esc(caption)}" data-fig="${esc(src)}" loading="lazy"><figcaption class="fig__caption">${esc(caption)}</figcaption></figure>`;
}

export function figurePlaceholder(src) {
  const ph = document.createElement("div");
  ph.className = "fig-ph";
  ph.innerHTML = `<span>Тут буде зображення</span><code>${esc(src)}</code>`;
  return ph;
}

/**
 * Ділить текст на блоки: абзаци (порожній рядок між ними) і малюнки
 * (окремий абзац виду [[img:файл.png|Підпис]]).
 */
export function blocks(text) {
  return String(text || "").trim().split(/\n\s*\n/).filter(Boolean).map(p => {
    const m = IMG_RE.exec(p.trim());
    if (m) return { fig: true, html: figure(m[1], m[2]) };
    return { fig: false, html: fmtInline(p).replace(/\n/g, "<br>") };
  });
}

/** Текст абзацами; label (наприклад «Задача Fish.») стає жирним початком першого абзацу. */
export function fmtText(text, label) {
  let labelled = !label;
  return blocks(text).map(b => {
    if (b.fig) return b.html;
    const lead = labelled ? "" : `<b>${esc(label)}</b> `;
    labelled = true;
    return `<p>${lead}${b.html}</p>`;
  }).join("") || (label ? `<p><b>${esc(label)}</b></p>` : "");
}

export function plural(n, one, few, many) {
  const a = n % 10, b = n % 100;
  if (a === 1 && b !== 11) return one;
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
  return many;
}

const DAY_WORDS = ["", "Перше", "Друге", "Третє", "Четверте", "П’яте", "Шосте", "Сьоме", "Восьме", "Дев’яте", "Десяте",
  "Одинадцяте", "Дванадцяте", "Тринадцяте", "Чотирнадцяте", "П’ятнадцяте", "Шістнадцяте", "Сімнадцяте", "Вісімнадцяте", "Дев’ятнадцяте", "Двадцяте"];
const UNITS = ["", "перше", "друге", "третє", "четверте", "п’яте", "шосте", "сьоме", "восьме", "дев’яте"];
const MONTHS = ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"];

/** Дата прописом, як у шкільному зошиті: «Четверте жовтня». */
export function dateWords(d) {
  const n = d.getDate();
  let w;
  if (n <= 20) w = DAY_WORDS[n];
  else if (n < 30) w = "Двадцять " + UNITS[n - 20];
  else if (n === 30) w = "Тридцяте";
  else w = "Тридцять перше";
  return w + " " + MONTHS[d.getMonth()];
}

export function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("toast--on");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("toast--on"), 1800);
}

export function copyText(text) {
  const done = () => toast("Скопійовано");
  const fallback = () => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { toast("Не вдалося скопіювати"); }
    ta.remove();
  };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
  else fallback();
}

export function downloadText(name, text, type) {
  const blob = new Blob([text], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Підпис для кнопки завантаження: тип файла за розширенням. */
export function fileKind(path) {
  const ext = String(path).split(".").pop().toLowerCase();
  return { pdf: "PDF", docx: "Word", doc: "Word", odt: "ODT" }[ext] || ext.toUpperCase();
}
