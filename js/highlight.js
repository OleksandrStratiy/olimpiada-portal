// Підсвічування коду C++ без сторонніх бібліотек і блоки коду з кнопкою «Копіювати».
import { esc } from "./utils.js";

const KEYWORDS = new Set(("if else for while do return break continue switch case default struct class using namespace " +
  "template typename const static inline auto new delete sizeof true false nullptr operator public private").split(" "));
const TYPES = new Set(("int long double float char bool void short unsigned signed string vector map set pair queue stack " +
  "deque priority_queue unordered_map unordered_set multiset multimap array size_t greater less").split(" "));

const TOKEN = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(^[ \t]*#[^\n]*)|(\b\d[\d.]*(?:LL|ll|ULL|e\d+)?\b)|([A-Za-z_]\w*)/gm;

export function highlight(code) {
  let out = "", last = 0, m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(code))) {
    out += esc(code.slice(last, m.index));
    const t = m[0];
    let cls = null;
    if (m[1]) cls = "c-com";
    else if (m[2]) cls = "c-str";
    else if (m[3]) cls = "c-pre";
    else if (m[4]) cls = "c-num";
    else if (KEYWORDS.has(t)) cls = "c-kw";
    else if (TYPES.has(t)) cls = "c-ty";
    out += cls ? `<span class="${cls}">${esc(t)}</span>` : esc(t);
    last = TOKEN.lastIndex;
  }
  return out + esc(code.slice(last));
}

const COPY_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>`;

/** Програма на C++ у вигляді вікна редактора. file — підпис над кодом (наприклад, Leap.cpp). */
export function codeBlock(code, { file = "C++" } = {}) {
  return `<div class="code" data-copy-root>
    <div class="code__bar"><span>${esc(file)}</span><button class="code__copy" data-act="copy" type="button">Копіювати</button></div>
    <pre class="code__pre"><code>${highlight(code)}</code></pre>
  </div>`;
}

/** Вхідні чи вихідні дані прикладу з кнопкою-значком «Копіювати». */
export function ioBlock(text) {
  return `<div class="io" data-copy-root>
    <button class="io__copy" data-act="copy" type="button" title="Копіювати" aria-label="Копіювати">${COPY_ICON}</button>
    <pre class="io__pre">${esc(text)}</pre>
  </div>`;
}
