// Запуск програм на C++ через відкритий онлайн-компілятор Compiler Explorer (godbolt.org).
// Сервіс компілює код компілятором GCC, запускає його з потрібним введенням і повертає результат.
import { RUNNER } from "./config.js";

const stripAnsi = s => String(s || "").replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");

/** Вивід сервера — масив рядків виду {text: "..."} або звичайний рядок. */
function joinLines(x) {
  if (Array.isArray(x)) return x.map(l => (l && typeof l === "object" ? l.text ?? "" : String(l))).join("\n");
  return x == null ? "" : String(x);
}

export class RunnerError extends Error {}

/**
 * Компілює і запускає програму.
 * Повертає { ok, stage: "compile" | "run" | "done", compileOutput, stdout, stderr, exitCode, timedOut }.
 */
export async function runCode(source, stdin = "") {
  const body = {
    source,
    compiler: RUNNER.compiler,
    options: {
      userArguments: RUNNER.flags,
      executeParameters: { args: [], stdin },
      compilerOptions: { executorRequest: true, skipAsm: true },
      filters: { execute: true },
      tools: [],
      libraries: []
    },
    lang: "c++",
    allowStoreCodeDebug: false
  };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), RUNNER.timeout);
  let res;
  try {
    res = await fetch(RUNNER.url.replace("{compiler}", encodeURIComponent(RUNNER.compiler)), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });
  } catch (e) {
    throw new RunnerError(e.name === "AbortError" ? "timeout" : "network");
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new RunnerError(res.status === 429 ? "busy" : "server");
  let r;
  try { r = await res.json(); } catch (e) { throw new RunnerError("server"); }

  const build = r.buildResult || {};
  const compileOutput = stripAnsi(joinLines(build.stderr) || "");
  const buildFailed = (typeof build.code === "number" && build.code !== 0) || (r.didExecute === false && !r.timedOut && build.code !== 0);
  if (buildFailed) {
    return { ok: false, stage: "compile", compileOutput: compileOutput || stripAnsi(joinLines(r.stderr)), stdout: "", stderr: "", exitCode: null, timedOut: false };
  }
  const stdout = joinLines(r.stdout);
  const stderr = stripAnsi(joinLines(r.stderr));
  const timedOut = !!r.timedOut || /timed? ?out|time limit/i.test(stderr);
  const exitCode = typeof r.code === "number" ? r.code : 0;
  const okRun = !timedOut && exitCode === 0;
  return { ok: okRun, stage: okRun ? "done" : "run", compileOutput, stdout, stderr, exitCode, timedOut };
}

/** Порівняння відповідей так, як це роблять перевіряльні системи: за словами, без зайвих пробілів. */
export function sameOutput(got, expected) {
  const a = String(got).trim().split(/\s+/).filter(Boolean);
  const b = String(expected).trim().split(/\s+/).filter(Boolean);
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

/** Пояснення типових помилок компіляції простими словами. */
const EXPLAIN = [
  [/expected ['‘]?;['’]? before|expected ['‘]?;['’]? at end|expected ['‘]?,['’]? or ['‘]?;['’]?/, "Пропущено крапку з комою <code>;</code>. Найчастіше її забувають у кінці рядка, що стоїть <b>перед</b> вказаним."],
  [/['‘](cout|cin|endl|string|vector)['’] was not declared|['‘](cout|cin|endl)['’] is not a member/, "Компілятор не знає <code>cout</code>, <code>cin</code> чи інших стандартних імен. Перевір, що на початку є <code>#include &lt;iostream&gt;</code> (або потрібна бібліотека) і рядок <code>using namespace std;</code>."],
  [/was not declared in this scope|has not been declared|undeclared/, "Використано ім’я, яке не оголошено. Перевір, чи оголошено змінну перед використанням, чи правильно написано назву (великі й малі літери різняться: <code>Sum</code> і <code>sum</code> — різні імена) і чи підключено потрібну бібліотеку."],
  [/expected ['‘]\}['’] at end of input/, "Не вистачає закривної фігурної дужки <code>}</code>. Кожна <code>{</code> має свою пару."],
  [/expected ['‘]\)['’]|expected primary-expression before ['‘]\)['’]/, "Проблема з круглими дужками: якась <code>(</code> не закрита або всередині дужок чогось не вистачає."],
  [/missing terminating ["'] character|missing terminating/, "Не закрито лапки. Текст має бути між парою лапок: <code>\"Привіт\"</code>."],
  [/stray ['‘]\\?\d*['’]? in program|stray ['‘].['’] in program/, "У коді трапився недозволений символ: українська літера, «розумні» лапки “ ” чи інший символ поза лапками. Пиши код англійською розкладкою."],
  [/lvalue required as left operand of assignment/, "Ліворуч від знака <code>=</code> має стояти змінна. Якщо ти хотів порівняти значення, пиши <code>==</code>."],
  [/suggest parentheses around assignment used as truth value/, "В умові стоїть присвоєння <code>=</code>. Для порівняння потрібно <code>==</code>."],
  [/['‘]else['’] without a previous ['‘]if['’]/, "<code>else</code> без <code>if</code>. Можливо, після <code>if (...)</code> зайва <code>;</code> або забуто фігурні дужки навколо кількох команд."],
  [/invalid operands of types ['‘](double|float)['’]?.*to binary ['‘]operator%['’]/, "Остачу <code>%</code> можна знаходити лише для цілих чисел (<code>int</code>, <code>long long</code>), а не для <code>double</code>."],
  [/invalid conversion from ['‘]const char\*['’] to ['‘]char['’]/, "Символ записують в одинарних лапках: <code>'a'</code>, а рядок — у подвійних: <code>\"a\"</code>."],
  [/no match for ['‘]operator(>>|<<)['’]/, "Так не можна прочитати чи вивести це значення. Перевір напрямок стрілок: <code>cin &gt;&gt; x</code>, <code>cout &lt;&lt; x</code>, і чи не виводиш ти цілий масив чи вектор одразу (його виводять у циклі)."],
  [/redeclaration of|conflicting declaration|redefinition of/, "Одне й те саме ім’я оголошено двічі. Змінну оголошують один раз, а далі лише змінюють: <code>x = 5;</code> без типу попереду."],
  [/too few arguments to function|too many arguments to function/, "Функцію викликано з іншою кількістю аргументів, ніж у її оголошенні."],
  [/cannot convert|invalid conversion/, "Не збігаються типи: значення одного типу намагаються записати в змінну іншого типу."],
  [/expected unqualified-id|expected initializer before|expected declaration/, "Синтаксична помилка: часто це зайва або пропущена дужка чи крапка з комою трохи вище вказаного рядка."],
  [/return-statement with no value|no return statement|control reaches end of non-void function/, "Функція має повертати значення (<code>return …;</code>) у всіх випадках."],
  [/undefined reference to ['‘]main['’]|undefined reference to `main'/, "Немає функції <code>main</code> — програма не знає, з чого почати. Перевір, що є <code>int main()</code> і назву написано правильно."],
  [/expected ['‘]\(['’] before|expected ['‘]\(['’] after/, "Після <code>if</code>, <code>for</code>, <code>while</code> умову пишуть у круглих дужках: <code>if (x &gt; 0)</code>."]
];

/** Повертає список пояснень (HTML) для помилок компілятора. */
export function explainErrors(text) {
  const t = String(text || "");
  const out = [];
  for (const [re, msg] of EXPLAIN) {
    if (re.test(t) && !out.includes(msg)) out.push(msg);
    if (out.length >= 3) break;
  }
  return out;
}

/** Номери рядків з помилками: «<source>:5:12: error: …». */
export function errorLines(text) {
  const set = new Set();
  for (const m of String(text || "").matchAll(/(?:<source>|\.cpp|example\.cpp):(\d+):\d+:\s*(?:fatal )?error/g)) set.add(+m[1]);
  return [...set].sort((a, b) => a - b);
}

/** Пояснення помилки запуску (не компіляції). */
export function explainRun(res) {
  if (res.timedOut) return "Програма працювала задовго і її зупинили. Можливо, цикл ніколи не закінчується або програма чекає на введення, якого немає.";
  const c = res.exitCode;
  if (c === 136 || /SIGFPE|floating point/i.test(res.stderr)) return "Ділення на нуль (або остача від ділення на нуль). Перевір, чи не може дільник дорівнювати 0.";
  if (c === 139 || /SIGSEGV|segmentation/i.test(res.stderr)) return "Звернення за межі масиву або до неіснуючої пам’яті. Перевір індекси: для масиву з n елементів допустимі номери від 0 до n−1.";
  if (c === 134 || /SIGABRT|abort|out_of_range|bad_alloc/i.test(res.stderr)) return "Програма аварійно зупинилась: наприклад, вихід за межі рядка чи вектора або забагато пам’яті.";
  return `Програма завершилася з кодом ${c}. Зазвичай <code>main</code> має закінчуватися <code>return 0;</code>.`;
}

export const RUNNER_ERRORS = {
  network: "Не вдалося зв’язатися з онлайн-компілятором. Перевір підключення до інтернету. Якщо в школі сайт godbolt.org заблоковано, скопіюй код у свій редактор (Code::Blocks, VS Code) або на onlinegdb.com.",
  timeout: "Онлайн-компілятор довго не відповідає. Спробуй ще раз за хвилину.",
  busy: "Онлайн-компілятор зараз перевантажений. Зачекай хвилину і спробуй ще раз.",
  server: "Онлайн-компілятор повернув помилку. Спробуй ще раз трохи пізніше або запусти код у своєму редакторі."
};
