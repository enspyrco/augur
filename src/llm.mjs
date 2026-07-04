// llm — zero-cost LLM via headless Claude Code (AUGUR runs on the Max plan, NEVER
// the metered Anthropic API). Shells to `claude -p` (the approved scripts/daemons
// path). Two modes: text (default) and json (parses a fenced-or-bare JSON reply).
//
// Latency note: each call is a full headless agent turn (seconds). study/compose
// are batch verbs, not interactive, so that's fine. Keep prompts self-contained.
import { execFileSync } from "node:child_process";

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

  // Tolerate ```json fences or a bare object/array; grab the first JSON blob.
  const fenced = out.match(/```(?:json)?\s*([\s\S]*?)```/);
  let raw = fenced ? fenced[1].trim() : out;
  if (!fenced) {
    const s = raw.search(/[[{]/);
    if (s > 0) raw = raw.slice(s);
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`llm: expected JSON, got:\n${out.slice(0, 400)}`);
  }
}
