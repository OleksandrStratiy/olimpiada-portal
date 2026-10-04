// Простий підсвічувач синтаксису C++ без сторонніх бібліотек.
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

/** Блок коду з кнопкою «Копіювати». plain = true — без підсвічування (вхідні/вихідні дані). */
export function codeBlock(code, plain = false) {
  return `<div class="codewrap"><button class="copy" data-act="copy" type="button">Копіювати</button><pre><code>${plain ? esc(code) : highlight(code)}</code></pre></div>`;
}
