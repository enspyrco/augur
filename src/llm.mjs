// llm — zero-cost LLM via headless Claude Code (AUGUR runs on the Max plan, NEVER
// the metered Anthropic API). Shells to `claude -p` (the approved scripts/daemons
// path). Two modes: text (default) and json (parses a fenced-or-bare JSON reply).
//
// Latency note: each call is a full headless agent turn (seconds). study/compose
// are batch verbs, not interactive, so that's fine. Keep prompts self-contained.
//
// `claude -p` is an AGENT turn, not a JSON API: it can wrap the payload in leading
// AND trailing prose (and even narrate hook side-effects like "Tasks restored."),
// non-deterministically. So JSON mode extracts the first *balanced* JSON value
// rather than trusting the reply to be clean — see parseAgentJson.
import { execFileSync } from "node:child_process";

// Return the substring from s[start] through its matching close bracket, tracking
// string literals + escapes so brackets inside "..." don't miscount. null if unbalanced.
function balancedBlob(s, start) {
  const open = s[start], close = open === "[" ? "]" : "}";
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) return s.slice(start, i + 1);
  }
  return null;
}

// Pull the first parseable JSON value out of an agent reply, ignoring any prose
// before or after it. Tries each `[`/`{` as a candidate start (so a stray bracket
// in the preamble can't wedge it) and returns the first blob that parses.
export function parseAgentJson(out) {
  const text = (out || "").trim();
  let i = text.search(/[[{]/);
  while (i >= 0) {
    const blob = balancedBlob(text, i);
    if (blob !== null) { try { return JSON.parse(blob); } catch { /* not this candidate — try the next bracket */ } }
    i = nextBracket(text, i + 1);
  }
  throw new Error(`llm: no parseable JSON in reply:\n${text.slice(0, 400)}`);
}
// index of the next `[` or `{` at/after `from`, or -1 if none.
function nextBracket(s, from) {
  const a = s.indexOf("[", from), b = s.indexOf("{", from);
  if (a < 0) return b;
  if (b < 0) return a;
  return Math.min(a, b);
}

export function llm(prompt, { json = false, timeout = 180000 } = {}) {
  let out;
  try {
    out = execFileSync("claude", ["-p", prompt, "--output-format", "text"], {
      encoding: "utf8",
      timeout,
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (e) {
    throw new Error(`llm: claude -p failed (${e.code || e.message})`);
  }
  out = (out || "").trim();
  if (!json) return out;
  return parseAgentJson(out);
}
