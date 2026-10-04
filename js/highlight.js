// Підсвічування синтаксису C++ без сторонніх бібліотек.
import { esc } from "./utils.js";

const words = s => new Set(s.trim().split(/\s+/));

const KEYWORDS = words(`
  if else for while do return break continue switch case default goto
  struct class enum union using namespace typedef template typename
  const constexpr static inline extern auto new delete sizeof operator
  public private protected friend virtual this true false nullptr
  try catch throw`);

const TYPES = words(`
  int long double float char bool void short unsigned signed size_t
  string vector map set pair queue stack deque priority_queue array tuple bitset
  unordered_map unordered_set multiset multimap greater less ifstream ofstream`);

const BUILTINS = words(`
  cout cin cerr endl std main getline printf scanf
  sort stable_sort reverse swap min max abs fabs llabs sqrt pow floor ceil round hypot log log2 exp
  accumulate count count_if find lower_bound upper_bound binary_search unique fill memset iota
  next_permutation prev_permutation min_element max_element nth_element gcd lcm
  to_string stoi stoll isdigit isalpha isupper islower isspace toupper tolower
  push_back emplace_back pop_back size empty begin end rbegin rend insert erase clear resize assign
  push pop top front back substr length make_pair setprecision fixed exit`);

const TOKEN = new RegExp([
  /(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))/.source,              // 1 коментар
  /("(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?)/.source,       // 2 рядок або символ
  /(^[ \t]*#[^\n]*)/.source,                                   // 3 директива препроцесора
  /(\b(?:0[xX][\da-fA-F']+|\d[\d']*(?:\.\d*)?(?:[eE][+-]?\d+)?)(?:[uUlLfF]{0,3})\b)/.source, // 4 число
  /([A-Za-z_]\w*)/.source                                      // 5 слово
].join("|"), "gm");

export function highlight(code) {
  let out = "", last = 0, m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(code))) {
    if (m[0] === "") { TOKEN.lastIndex++; continue; }
    out += esc(code.slice(last, m.index));
    const t = m[0];
    let cls = null;
    if (m[1]) cls = "c-com";
    else if (m[2]) cls = "c-str";
    else if (m[3]) cls = "c-pre";
    else if (m[4]) cls = "c-num";
    else if (KEYWORDS.has(t)) cls = "c-kw";
    else if (TYPES.has(t)) cls = "c-ty";
    else if (BUILTINS.has(t)) cls = "c-fn";
    out += cls ? `<span class="${cls}">${esc(t)}</span>` : esc(t);
    last = TOKEN.lastIndex;
  }
  return out + esc(code.slice(last));
}
