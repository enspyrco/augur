// Augur — `publish`: emit a PII-STRIPPED public build of a cohort for the open web.
// This is the consent spine made executable (a NEW augur capability, #1670).
//
// The full fused roster carries PII (emails, Signal/Telegram, meetup URLs, curated notes
// that embed social handles). publish emits ONLY the cohort's `publicAllowlist` fields +
// a defense-in-depth scrub of anything email/phone-shaped. Notes are dropped entirely.
// ONLY the public/ dir is ever pushed to the Pages repo — the PII build stays local.
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { peopleJs, dashboardHtml } from "./render.mjs";

// defense-in-depth: scrub email/phone-shaped substrings from any free text that slips through
const scrub = (s) => String(s ?? "")
  .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email removed]")
  .replace(/\+?\d[\d ()-]{7,}\d/g, "[number removed]");

// Project one person to the cohort's web-safe allowlist. `node`/`githubUrl` are derived;
// `note` is intentionally never emitted (curated notes carry internal cruft + social handles).
function webSafe(p, allowlist) {
  const full = {
    name: scrub(p.name),
    role: scrub(p.role || ""),
    location: scrub(p.location || ""),
    github: p.github || "",
    githubUrl: p.githubUrl || (p.github ? `https://github.com/${p.github}` : ""),
    tags: p.tags || [],
    kind: p.kind || "",
    node: !!p.memoryNode,
  };
  const out = {};
  for (const k of allowlist) out[k] = full[k];
  return out;
}

export function stripped(cohort, roster) {
  return {
    graph: roster.graph,
    sources: roster.sources,
    updated: roster.updated,
    people: (roster.people || []).map((p) => webSafe(p, cohort.publicAllowlist)),
  };
}

export function publish(cohort, roster) {
  mkdirSync(cohort.publicDir, { recursive: true });
  const pub = stripped(cohort, roster);
  writeFileSync(join(cohort.publicDir, "people.js"), peopleJs(cohort, pub, { isPublic: true }));
  writeFileSync(join(cohort.publicDir, "index.html"), dashboardHtml(cohort, { isPublic: true }));
  writeFileSync(join(cohort.publicDir, ".nojekyll"), "");
  return { count: pub.people.length, withGh: pub.people.filter((p) => p.github).length, dir: cohort.publicDir };
}
