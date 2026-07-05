#!/usr/bin/env node
// Augur CLI — people-intelligence engine. Build order per AUGUR-DESIGN.md §12: `dig` first.
//
// Usage:
//   augur dig <handle>                         github-rooted dig (a single individual)
//   augur dig --name "Maha Achour" [--hint "metamaterials physicist"]
//   augur dig --name "X" --company 16235909    add UK Companies House officers
//   augur dig --github <h> --name "X"          multi-root one person
//   augur dig --file handles.json              dig every {github} in a JSON array
//   augur resolve --name "X" [--city Y --country AU]   name → GitHub handle (the pre-dig step)
//   augur resolve --file people.json [--no-search]     resolve every {name,city,country}
//   (append --json for raw provenance-tagged facts; default is a human summary)
//
// Consent/legal: dig touches PUBLIC, logged-out endpoints only. See AUGUR-DESIGN §2.
import { readFileSync } from "node:fs";
import { dig } from "../src/dig.mjs";
import { resolve } from "../src/resolve.mjs";
import { study } from "../src/study.mjs";
import { compose } from "../src/compose.mjs";

const argv = process.argv.slice(2);
const verb = argv[0];
function optVal(name) { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; }
const has = (f) => argv.includes(f);
const positional = argv.slice(1).filter((a, i, arr) => !a.startsWith("--") && !(i > 0 && arr[i - 1].startsWith("--")));

function die(msg) { console.error(msg); process.exit(1); }

function summarize(r) {
  if (!r.facts.length) { console.log(`✗ ${JSON.stringify(r.subject)} — nothing found (veins: ${r.veins.map((v) => v.name + ":" + v.note).join(", ")})`); return; }
  const label = r.identifiers.names[0] || r.subject.github || r.subject.name || "?";
  console.log(`● ${label}`);
  if (r.identifiers.github_id) console.log(`   github_id: ${r.identifiers.github_id} (immortal)`);
  if (r.identifiers.orcid) console.log(`   orcid:     ${r.identifiers.orcid}`);
  if (r.identifiers.emails.length) console.log(`   email:     ${r.identifiers.emails.join(", ")}`);
  const g = (p) => r.facts.filter((f) => f.predicate === p).map((f) => f.value);
  for (const [p, lbl] of [["site", "site"], ["location", "loc"], ["company", "company"], ["affiliation", "affil"], ["scholarly_works", "works"], ["citations", "cited"], ["patent_count", "patents"], ["patent_assignee", "assignees"], ["patent", "patent"], ["directorship", "director"], ["ssh_fp", "ssh_fp"], ["research_topic", "topics"], ["pgp_uid", "pgp"], ["linked_account", "linked"], ["company_officer", "officers"]]) {
    const v = g(p); if (v.length) console.log(`   ${lbl.padEnd(9)} ${["research_topic", "company_officer", "patent", "patent_assignee"].includes(p) ? v.slice(0, 4).join(" · ") : v.join(", ")}`);
  }
  console.log(`   veins:     ${r.veins.map((v) => `${v.name}(${v.facts}${v.note ? " — " + v.note : ""})`).join(" | ")}`);
}

async function cmdDig() {
  let subjects = [];
  if (has("--file")) {
    const arr = JSON.parse(readFileSync(optVal("--file"), "utf8"));
    subjects = (Array.isArray(arr) ? arr : arr.people || []).map((x) => (typeof x === "string" ? { github: x } : { github: x.github })).filter((s) => s.github);
  } else if (has("--name") || has("--github") || has("--email") || has("--company") || has("--orcid")) {
    subjects = [{ github: optVal("--github"), name: optVal("--name"), email: optVal("--email"), hint: optVal("--hint"), companyNumber: optVal("--company"), orcid: optVal("--orcid") }];
  } else if (positional.length) {
    subjects = positional.map((h) => ({ github: h }));
  } else {
    die('usage: augur dig <handle>  |  augur dig --name "Full Name" [--hint "field"] [--company <ukCompanyNo>]');
  }

  const out = [];
  for (const s of subjects) {
    const r = await dig(s);
    out.push(r);
    if (!has("--json")) summarize(r);
  }
  if (has("--json")) console.log(JSON.stringify(out.length === 1 ? out[0] : out, null, 2));
}

function summarizeResolve(r) {
  const mark = { high: "●", med: "◐", low: "○", none: "✗" }[r.confidence];
  if (r.confidence === "none") { console.log(`✗ ${r.name} — no handle found (${r.candidates.length} guesses tried)`); return; }
  const loc = r.ghLocation ? ` @ ${r.ghLocation}` : "";
  console.log(`${mark} ${r.name}  →  ${r.github ? "@" + r.github : "(unresolved)"}  [${r.confidence}]${loc}  ${r.method || ""}`);
  if (r.confidence === "low" || r.candidates.length > 1) {
    for (const c of r.candidates.slice(0, 4)) console.log(`     · @${c.login} "${c.ghName}" ${c.match}${c.loc ? " +loc" : ""} (${c.method})`);
  }
}

async function cmdResolve() {
  let people = [];
  if (has("--file")) {
    const arr = JSON.parse(readFileSync(optVal("--file"), "utf8"));
    people = (Array.isArray(arr) ? arr : arr.people || []).map((x) => (typeof x === "string" ? { name: x } : { name: x.name, city: x.city, country: x.country })).filter((p) => p.name);
  } else if (has("--name")) {
    people = [{ name: optVal("--name"), city: optVal("--city"), country: optVal("--country") }];
  } else {
    die('usage: augur resolve --name "Full Name" [--city X] [--country AU]  |  augur resolve --file people.json  (append --no-search for handle-guess only)');
  }
  const out = [];
  for (const p of people) {
    const r = await resolve(p, { search: !has("--no-search") });
    out.push(r);
    if (!has("--json")) summarizeResolve(r);
  }
  if (has("--json")) console.log(JSON.stringify(out.length === 1 ? out[0] : out, null, 2));
}

function summarizeStudy(r) {
  const label = r.handle || r.subject?.github || "?";
  if (!r.studyFacts.length) { console.log(`✗ study ${label} — ${r.note || "no semantic facts"}`); return; }
  console.log(`◆ study ${label}  (${r.studyFacts.length} semantic facts from ${r.repoCount} repos)`);
  const by = {};
  for (const f of r.studyFacts) (by[f.predicate] ||= []).push(f);
  for (const p of Object.keys(by)) {
    console.log(`   ${p}:`);
    for (const f of by[p]) console.log(`     · ${f.value}  (${(f.reliability).toFixed(2)} ${f.method})`);
  }
}

async function cmdStudy() {
  const handle = optVal("--github") || positional[0];
  if (!handle) die('usage: augur study <handle>  (studies a resolved NODE\'s public GitHub work)');
  const r = await study(handle);
  if (has("--json")) console.log(JSON.stringify(r, null, 2));
  else summarizeStudy(r);
}

async function cmdCompose() {
  const target = optVal("--target") || positional[0];
  const us = optVal("--us");
  if (!target || !us) die('usage: augur compose <target-handle> --us <your-handle> [--broker "Name"]');
  const r = await compose(target, us, { broker: optVal("--broker") });
  if (has("--json")) { console.log(JSON.stringify(r, null, 2)); return; }
  console.log(`\n◆ compose  ${target}  ✕  ${us}`);
  if (r.rhyme) console.log(`\n  RHYME: ${r.rhyme}\n`);
  console.log("  ── DRAFT (never sent) ─────────────────────────────");
  console.log(r.draft.split("\n").map((l) => "  " + l).join("\n"));
  console.log("  ───────────────────────────────────────────────────");
  if (r.cut?.length) console.log(`\n  ⚠ anti-creepiness gate cut ${r.cut.length} unsourced claim(s): ${r.cut.join(" | ")}`);
  console.log(`\n  receipts: ${r.receipts?.length || 0}   · draft only — review, then send by hand.`);
}

switch (verb) {
  case "dig": await cmdDig(); break;
  case "resolve": await cmdResolve(); break;
  case "study": await cmdStudy(); break;
  case "compose": await cmdCompose(); break;
  case undefined: case "--help": case "help":
    console.log("augur <verb>\n\n  resolve --name \"X\" [--city Y --country AU]   name → GitHub handle (pre-dig)\n  dig <handle>            github-rooted excavation (a single individual)\n  dig --name \"X\" --hint \"field\"   name-rooted (scholarly + registry veins)\n  dig --name \"X\" --company <ukNo>  add UK Companies House officers\n\nVeins: github · openalex · companies_house  (roadmap: patents, keybase, npm, crt.sh, bluesky, ABR)\nBuild order (AUGUR-DESIGN §1): discover → resolve → dig → fuse → refute → place → weave");
    break;
  default: die(`unknown verb '${verb}'. try: augur dig <handle>`);
}
