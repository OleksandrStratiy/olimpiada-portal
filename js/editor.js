// Простий редактор коду: прозоре текстове поле поверх підсвіченого тексту.
// Уміє: Tab — відступ, Shift+Tab — прибрати відступ, Enter — новий рядок з тим самим відступом,
// «}» на порожньому рядку — зменшити відступ, Ctrl+Enter — запустити або перевірити.
import { esc } from "./utils.js";
import { highlight } from "./highlight.js";

const INDENT = "    ";

export function editorHtml(code, label) {
  return `<div class="editor">` +
    `<pre aria-hidden="true"><code>${highlight(code)}\n</code></pre>` +
    `<textarea class="code-input" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-label="${esc(label)}">${esc(code)}</textarea>` +
    `</div>`;
}

let metrics = null;
function lineMetrics(ta) {
  if (!metrics) {
    const cs = getComputedStyle(ta);
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.6;
    metrics = { lh, pad: (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0) };
  }
  return metrics;
}

/** Висота поля — за кількістю рядків (без прокрутки по вертикалі). */
export function fit(ta) {
  const { lh, pad } = lineMetrics(ta);
  const lines = ta.value.split("\n").length;
  ta.style.height = Math.ceil(Math.max(lines, 5) * lh + pad + 2) + "px";
}

export function refresh(ta) {
  const pre = ta.previousElementSibling;
  if (pre) {
    pre.firstElementChild.innerHTML = highlight(ta.value) + "\n";
    pre.scrollLeft = ta.scrollLeft;
  }
  fit(ta);
}

export function setValue(ta, code) {
  ta.value = code;
  refresh(ta);
}

/** Після показу сторінки: підганяє висоту всіх редакторів. */
export function initEditors(root = document) {
  metrics = null;
  root.querySelectorAll("textarea.code-input").forEach(fit);
}

function insertText(ta, text) {
  ta.focus();
  let ok = false;
  try { ok = document.execCommand("insertText", false, text); } catch (e) { ok = false; }
  if (!ok) {
    const s = ta.selectionStart, e = ta.selectionEnd;
    ta.setRangeText(text, s, e, "end");
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function lineStartOf(value, pos) { return value.lastIndexOf("\n", pos - 1) + 1; }

/** Змінює відступ виділених рядків. */
function shiftLines(ta, dir) {
  const v = ta.value;
  const s = lineStartOf(v, ta.selectionStart);
  let e = ta.selectionEnd;
  if (e > s && v[e - 1] === "\n") e--;
  const endLine = v.indexOf("\n", e);
  const stop = endLine < 0 ? v.length : endLine;
  const block = v.slice(s, stop);
  const changed = block.split("\n").map(l => (dir > 0 ? INDENT + l : l.replace(/^ {1,4}/, ""))).join("\n");
  if (changed === block) return;
  ta.setSelectionRange(s, stop);
  insertText(ta, changed);
  ta.setSelectionRange(s, s + changed.length);
}

let escapeTab = false;

/** Обробник клавіш для всіх редакторів (повертає true, якщо подію оброблено). */
export function onEditorKey(e) {
  const ta = e.target;
  if (!(ta instanceof HTMLTextAreaElement) || !ta.classList.contains("code-input")) return false;
  if (e.key === "Escape") { escapeTab = true; return true; }
  if (e.key === "Tab" && !e.ctrlKey && !e.altKey && !e.metaKey) {
    if (escapeTab) { escapeTab = false; return false; } // після Esc клавіша Tab переводить фокус далі
    e.preventDefault();
    const multi = ta.value.slice(ta.selectionStart, ta.selectionEnd).includes("\n");
    if (e.shiftKey || multi) shiftLines(ta, e.shiftKey ? -1 : 1);
    else insertText(ta, INDENT);
    return true;
  }
  escapeTab = false;
  if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
    e.preventDefault();
    const v = ta.value, pos = ta.selectionStart;
    const start = lineStartOf(v, pos);
    const indent = /^[ ]*/.exec(v.slice(start, pos))[0];
    const before = v.slice(start, pos).trimEnd();
    const after = v.slice(ta.selectionEnd);
    if (before.endsWith("{")) {
      if (/^[ ]*\}/.test(after)) {
        insertText(ta, "\n" + indent + INDENT + "\n" + indent);
        const caret = pos + 1 + indent.length + INDENT.length;
        ta.setSelectionRange(caret, caret);
      } else {
        insertText(ta, "\n" + indent + INDENT);
      }
    } else {
      insertText(ta, "\n" + indent);
    }
    return true;
  }
  if (e.key === "}" && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const v = ta.value, pos = ta.selectionStart;
    const start = lineStartOf(v, pos);
    const lineBefore = v.slice(start, pos);
    if (pos === ta.selectionEnd && /^ {4,}$/.test(lineBefore)) {
      e.preventDefault();
      ta.setSelectionRange(pos - 4, pos);
      insertText(ta, "}");
      return true;
    }
  }
  return false;
}

/** Підсвічування оновлюється під час введення; прокрутка — синхронно з полем. */
export function onEditorInput(e) {
  const ta = e.target;
  if (ta instanceof HTMLTextAreaElement && ta.classList.contains("code-input")) { refresh(ta); return true; }
  return false;
}

export function onEditorScroll(e) {
  const ta = e.target;
  if (ta instanceof HTMLTextAreaElement && ta.classList.contains("code-input")) {
    const pre = ta.previousElementSibling;
    if (pre) pre.scrollLeft = ta.scrollLeft;
  }
}
