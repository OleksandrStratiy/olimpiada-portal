// Перетворення тексту уроку (Markdown) на HTML.
//
// Підтримується звичайний Markdown (заголовки, абзаци, списки, таблиці, **жирний**, *курсив*,
// `код`, посилання, малюнки) і кілька додатків для навчання:
//   > [!TIP] … — кольорові виноски (NOTE, TIP, IMPORTANT, WARNING, CAUTION), як на GitHub;
//   ```cpp … ``` + ```input … ``` + ```output … ``` — програма разом із прикладом введення і виведення;
//   ```quiz … ``` — тест «Перевір себе»;
//   ```exercise … ``` — задача з умовою, прикладами, тестами, підказками і розв’язком.
// Формат тестів і задач описано в README.md.
import { esc, icon } from "./utils.js";
import { highlight } from "./highlight.js";

/* ---------- Рядкові елементи ---------- */

function safeUrl(u) {
  return /^\s*(javascript|data|vbscript):/i.test(u) ? "#" : u;
}

/** Рядкова розмітка: `код`, **жирний**, *курсив*, [посилання](адреса), ![малюнок](адреса), <kbd>клавіша</kbd>. */
export function inline(src) {
  const slots = [];
  const keep = html => `\u0001${slots.push(html) - 1}\u0002`;
  let s = String(src == null ? "" : src);
  s = s.replace(/``\s?([\s\S]+?)\s?``|`([^`\n]+)`/g, (_, a, b) => keep(`<code>${esc(a ?? b)}</code>`));
  s = s.replace(/<kbd>([^<]{1,40})<\/kbd>/g, (_, k) => keep(`<kbd>${esc(k)}</kbd>`));
  s = s.replace(/\\([\\`*_{}[\]()#+\-.!|<>~])/g, (_, ch) => keep(esc(ch)));
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, url) =>
    keep(`<img src="${esc(safeUrl(url))}" alt="${esc(alt)}" loading="lazy">`));
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, url) => {
    const u = safeUrl(url);
    const ext = /^https?:/i.test(u);
    return keep(`<a href="${esc(u)}"${ext ? ' target="_blank" rel="noopener"' : ""}>`) + text + keep("</a>");
  });
  s = esc(s)
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^\w*])\*(?=\S)([^*\n]*?\S)\*(?![\w*])/g, "$1<em>$2</em>")
    .replace(/(?: {2,}|\\)\n/g, "<br>")
    .replace(/\n/g, " ");
  for (let k = 0; k < 3 && s.includes("\u0001"); k++) s = s.replace(/\u0001(\d+)\u0002/g, (_, i) => slots[+i]);
  return s;
}

/* ---------- Розбір на блоки ---------- */

const RE = {
  fence: /^(\s{0,3})(`{3,}|~{3,})\s*([^\s`~]*)\s*(.*)$/,
  heading: /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/,
  hr: /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/,
  quote: /^\s{0,3}>/,
  list: /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/,
  tableSep: /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/,
  comment: /^\s*<!--/
};

/** Ширина відступу на початку рядка (табуляція — як 4 пробіли). */
const indentOf = l => /^[ \t]*/.exec(l)[0].replace(/\t/g, "    ").length;
const isTableStart = (lines, i) => lines[i].includes("|") && i + 1 < lines.length && RE.tableSep.test(lines[i + 1]);

function startsBlock(lines, i) {
  const l = lines[i];
  return RE.fence.test(l) || RE.heading.test(l) || RE.hr.test(l) || RE.quote.test(l) ||
    RE.list.test(l) || RE.comment.test(l) || isTableStart(lines, i);
}

function splitRow(line) {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  const cells = [];
  let cur = "", inCode = false;
  for (let k = 0; k < s.length; k++) {
    const ch = s[k];
    if (ch === "\\" && s[k + 1] === "|") { cur += "|"; k++; continue; }
    if (ch === "`") inCode = !inCode;
    if (ch === "|" && !inCode) { cells.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

function parseList(lines, start) {
  const m0 = RE.list.exec(lines[start]);
  const base = m0[1].length;
  const ordered = /\d/.test(m0[2]);
  const first = ordered ? parseInt(m0[2], 10) : 1;
  const sameList = m => m && m[1].length === base && /\d/.test(m[2]) === ordered;
  const items = [];
  let i = start;
  while (i < lines.length) {
    const m = RE.list.exec(lines[i]);
    if (!sameList(m)) break;
    const contentIndent = base + m[2].length + 1;
    const buf = [m[3]];
    i++;
    while (i < lines.length) {
      const l = lines[i];
      if (!l.trim()) {
        let j = i + 1;
        while (j < lines.length && !lines[j].trim()) j++;
        if (j < lines.length && indentOf(lines[j]) >= contentIndent) {
          while (i < j) { buf.push(""); i++; }
          continue;
        }
        break;
      }
      const ind = indentOf(l);
      if (ind >= contentIndent || (ind > base && RE.list.test(l))) {
        buf.push(l.slice(Math.min(ind, contentIndent)));
        i++;
        continue;
      }
      if (RE.list.test(l)) break;
      if (!startsBlock(lines, i) && buf[buf.length - 1].trim() !== "") { buf.push(l.trim()); i++; continue; }
      break;
    }
    items.push(buf);
    let j = i;
    while (j < lines.length && !lines[j].trim()) j++;
    if (j > i && j < lines.length && sameList(RE.list.exec(lines[j]))) i = j;
  }
  return { node: { t: "list", ordered, start: first, items: items.map(b => parseBlocks(b.join("\n"))) }, next: i };
}

/** Ділить Markdown на блоки: заголовки, абзаци, списки, таблиці, код, виноски. */
export function parseBlocks(src) {
  const lines = String(src || "").replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    let m = RE.fence.exec(line);
    if (m) {
      const fence = m[2], indent = m[1].length;
      const close = new RegExp(`^\\s{0,3}${fence[0] === "`" ? "`" : "~"}{${fence.length},}\\s*$`);
      const body = [];
      i++;
      while (i < lines.length && !close.test(lines[i])) {
        body.push(lines[i].slice(Math.min(indent, indentOf(lines[i]))));
        i++;
      }
      i++;
      out.push({ t: "code", lang: m[3].toLowerCase(), meta: m[4].trim(), text: body.join("\n") });
      continue;
    }

    m = RE.heading.exec(line);
    if (m) { out.push({ t: "h", level: m[1].length, text: m[2] }); i++; continue; }

    if (RE.hr.test(line)) { out.push({ t: "hr" }); i++; continue; }

    if (RE.comment.test(line)) {
      while (i < lines.length && !lines[i].includes("-->")) i++;
      i++;
      continue;
    }

    if (RE.quote.test(line)) {
      const body = [];
      while (i < lines.length && RE.quote.test(lines[i])) { body.push(lines[i].replace(/^\s{0,3}>\s?/, "")); i++; }
      const cm = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i.exec(body[0] || "");
      if (cm) out.push({ t: "callout", kind: cm[1].toLowerCase(), title: cm[2].trim(), children: parseBlocks(body.slice(1).join("\n")) });
      else out.push({ t: "quote", children: parseBlocks(body.join("\n")) });
      continue;
    }

    if (isTableStart(lines, i)) {
      const head = splitRow(line);
      const align = splitRow(lines[i + 1]).map(c => (/^:-+:$/.test(c) ? "center" : /-:$/.test(c) ? "right" : ""));
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].trim() && lines[i].includes("|")) { rows.push(splitRow(lines[i])); i++; }
      out.push({ t: "table", head, align, rows });
      continue;
    }

    if (RE.list.test(line)) {
      const { node, next } = parseList(lines, i);
      out.push(node);
      i = next;
      continue;
    }

    const para = [line.trim()];
    i++;
    while (i < lines.length && lines[i].trim() && !startsBlock(lines, i)) { para.push(lines[i].trim()); i++; }
    out.push({ t: "p", text: para.join("\n") });
  }
  return out;
}

/* ---------- Тести і задачі ---------- */

/**
 * Тест «Перевір себе». Кожне питання починається з «?», варіанти — з «-» (неправильний)
 * або «+» (правильний), пояснення — з «:», рядки коду до питання — з «|».
 */
export function parseQuiz(text) {
  const questions = [];
  let q = null, last = null;
  for (const raw of String(text).split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) { last = null; continue; }
    const m = /^([?+\-:|])(?:\s|$)(.*)$/.exec(line);
    if (!m) {
      if (last) last.text += "\n" + line.trim();
      continue;
    }
    const [, mark, rest] = m;
    if (mark === "?") {
      q = { text: rest, code: [], options: [], expl: { text: "" } };
      questions.push(q);
      last = q;
    } else if (!q) {
      continue;
    } else if (mark === "|") {
      q.code.push(line.replace(/^\|\s?/, ""));
      last = null;
    } else if (mark === "+" || mark === "-") {
      const o = { text: rest, right: mark === "+" };
      q.options.push(o);
      last = o;
    } else {
      q.expl.text = q.expl.text ? q.expl.text + "\n" + rest : rest;
      last = q.expl;
    }
  }
  return questions.map(x => ({ text: x.text, code: x.code.join("\n"), options: x.options, expl: x.expl.text }));
}

const trimLines = s => String(s).replace(/^\s*\n/, "").replace(/\s+$/, "");

function splitIO(lines) {
  const k = lines.findIndex(l => l.trim() === "---");
  const a = k < 0 ? lines : lines.slice(0, k);
  const b = k < 0 ? [] : lines.slice(k + 1);
  return { in: trimLines(a.join("\n")), out: trimLines(b.join("\n")) };
}

/**
 * Задача з уроку. Спершу рядки «ключ: значення» (id, title, level), далі розділи,
 * що починаються рядком «=== назва»: statement, input, output, example, test, note, hint, starter, solution.
 * У example і test введення відділяється від виведення рядком «---».
 */
export function parseExercise(text) {
  const ex = { id: "", title: "", level: 1, statement: "", input: "", output: "", note: "", examples: [], tests: [], hints: [], starter: "", solution: "" };
  let section = "head", buf = [];
  const flush = () => {
    const body = buf.join("\n");
    switch (section) {
      case "head":
        for (const l of buf) {
          const m = /^\s*(\w+)\s*:\s*(.*)$/.exec(l);
          if (m) ex[m[1]] = m[1] === "level" ? (parseInt(m[2], 10) || 1) : m[2].trim();
        }
        break;
      case "statement": case "input": case "output": case "note":
        ex[section] = body.trim();
        break;
      case "example": ex.examples.push(splitIO(buf)); break;
      case "test": ex.tests.push(splitIO(buf)); break;
      case "hint": if (body.trim()) ex.hints.push(body.trim()); break;
      case "starter": case "solution": ex[section] = trimLines(body); break;
    }
    buf = [];
  };
  for (const line of String(text).split("\n")) {
    const m = /^===\s*(\w+)\s*$/.exec(line);
    if (m) { flush(); section = m[1].toLowerCase(); continue; }
    buf.push(line);
  }
  flush();
  return ex;
}

/* ---------- Перетворення блоків на HTML ---------- */

const CALLOUTS = {
  note: ["Зверни увагу", "info"],
  tip: ["Порада", "bulb"],
  important: ["Запам’ятай", "star"],
  warning: ["Обережно", "alert"],
  caution: ["Типова помилка", "stop"]
};

const CPP = new Set(["cpp", "c++", "cc", "c", "cxx"]);

/** Звичайні (неінтерактивні) варіанти для блоків коду, тестів і задач. */
export const plainHooks = {
  code: (b, input, output) => `<div class="code"><pre><code>${highlight(b.text)}</code></pre>${ioHtml(input, output)}</div>`,
  quiz: () => "",
  exercise: () => ""
};

export function ioHtml(input, output) {
  if (input == null && output == null) return "";
  const part = (cls, label, text) => `<div><span class="io-label ${cls}">${label}</span><pre>${esc(text)}</pre></div>`;
  const parts = [];
  if (input != null) parts.push(part("in", "Введення", input));
  if (output != null) parts.push(part("out", "Виведення", output));
  return `<div class="io${parts.length === 2 ? " two" : ""}">${parts.join("")}</div>`;
}

/**
 * ctx: { hooks, headings: [], dropTitle } — hooks.code / hooks.quiz / hooks.exercise малюють
 * інтерактивні блоки; у headings збираються заголовки другого рівня для змісту.
 */
export function renderBlocks(blocks, ctx = {}) {
  const hooks = ctx.hooks || plainHooks;
  ctx.headings = ctx.headings || [];
  let html = "";
  for (let k = 0; k < blocks.length; k++) {
    const b = blocks[k];
    switch (b.t) {
      case "h": {
        if (b.level === 1 && ctx.dropTitle) { ctx.dropTitle = false; break; }
        const lvl = Math.min(4, Math.max(2, b.level));
        let id = "";
        if (lvl === 2) {
          id = `sec-${ctx.headings.length + 1}`;
          ctx.headings.push({ id, text: b.text });
        }
        html += `<h${lvl}${id ? ` id="${id}"` : ""}>${inline(b.text)}</h${lvl}>`;
        break;
      }
      case "p": {
        const img = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(b.text.trim());
        html += img
          ? `<figure><img src="${esc(safeUrl(img[2]))}" alt="${esc(img[1])}" loading="lazy">${img[1] ? `<figcaption>${inline(img[1])}</figcaption>` : ""}</figure>`
          : `<p>${inline(b.text)}</p>`;
        break;
      }
      case "hr": html += "<hr>"; break;
      case "quote": html += `<blockquote>${renderBlocks(b.children, { ...ctx, dropTitle: false })}</blockquote>`; break;
      case "callout": {
        const [title, ic] = CALLOUTS[b.kind] || CALLOUTS.note;
        html += `<div class="callout ${b.kind}"><div class="callout-title">${icon(ic)}${inline(b.title || title)}</div>` +
          `<div class="callout-body">${renderBlocks(b.children, { ...ctx, hooks, dropTitle: false })}</div></div>`;
        break;
      }
      case "list": {
        const tag = b.ordered ? "ol" : "ul";
        const start = b.ordered && b.start !== 1 ? ` start="${b.start}"` : "";
        const items = b.items.map(item => {
          const tight = item.length === 1 && item[0].t === "p";
          return `<li>${tight ? inline(item[0].text) : renderBlocks(item, { ...ctx, hooks, dropTitle: false })}</li>`;
        }).join("");
        html += `<${tag}${start}>${items}</${tag}>`;
        break;
      }
      case "table": {
        const al = c => (b.align[c] ? ` style="text-align:${b.align[c]}"` : "");
        const head = b.head.map((h, c) => `<th${al(c)}>${inline(h)}</th>`).join("");
        const rows = b.rows.map(r => `<tr>${b.head.map((_, c) => `<td${al(c)}>${inline(r[c] ?? "")}</td>`).join("")}</tr>`).join("");
        html += `<div class="tablewrap"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
        break;
      }
      case "code": {
        if (CPP.has(b.lang)) {
          let input = null, output = null;
          if (blocks[k + 1]?.t === "code" && blocks[k + 1].lang === "input") { input = blocks[k + 1].text; k++; }
          if (blocks[k + 1]?.t === "code" && blocks[k + 1].lang === "output") { output = blocks[k + 1].text; k++; }
          html += hooks.code(b, input, output);
        } else if (b.lang === "input" || b.lang === "output") {
          const input = b.lang === "input" ? b.text : null;
          let output = b.lang === "output" ? b.text : null;
          if (b.lang === "input" && blocks[k + 1]?.t === "code" && blocks[k + 1].lang === "output") { output = blocks[k + 1].text; k++; }
          html += `<div class="console">${ioHtml(input, output).replace('class="io', 'class="io noborder')}</div>`;
        } else if (b.lang === "quiz") {
          html += hooks.quiz(parseQuiz(b.text));
        } else if (b.lang === "exercise") {
          html += hooks.exercise(parseExercise(b.text));
        } else {
          html += `<pre class="plain"><code>${esc(b.text)}</code></pre>`;
        }
        break;
      }
    }
  }
  return html;
}

export function renderMarkdown(src, ctx = {}) {
  return renderBlocks(parseBlocks(src), ctx);
}
