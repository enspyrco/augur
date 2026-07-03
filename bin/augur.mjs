#!/usr/bin/env node
// Augur CLI — people-intelligence engine. Build order per AUGUR-DESIGN.md §12: `dig` first.
//
// Usage:
//   augur dig <handle> [<handle> ...]      excavate public-artifact shadow(s)
//   augur dig --file handles.json          dig every {github} in a JSON array
//   augur dig <handle> --json              raw JSON (default: human summary)
//
// Consent/legal: dig touches PUBLIC, logged-out endpoints only, within rate limits.
// See AUGUR-DESIGN.md §2 (the consent + legal spine) before adding outbound verbs.
import { readFileSync } from "node:fs";
import { dig } from "../src/dig.mjs";

const argv = process.argv.slice(2);
const verb = argv[0];
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const args = argv.slice(1).filter((a) => !a.startsWith("--"));

function die(msg) { console.error(msg); process.exit(1); }

async function cmdDig() {
  let handles = args;
  if (flags.has("--file")) {
    const path = args[0] || die("--file needs a path");
    const arr = JSON.parse(readFileSync(path, "utf8"));
    handles = (Array.isArray(arr) ? arr : arr.people || []).map((x) => (typeof x === "string" ? x : x.github)).filter(Boolean);
  }
  if (!handles.length) die("usage: augur dig <handle> [<handle> ...]  |  augur dig --file handles.json");

  const out = [];
  for (const h of handles) {
    const r = await dig(h);
    out.push(r);
    if (!flags.has("--json")) {
      if (r.error) { console.log(`✗ ${h}: ${r.error}`); continue; }
      const f = (p) => r.facts.filter((x) => x.predicate === p).map((x) => x.value);
      console.log(`● ${r.handle}  (id:${r.id})`);
      if (f("name").length) console.log(`   name:   ${f("name")[0]}`);
      if (f("email").length) console.log(`   email:  ${f("email")[0]}`);
      if (f("site").length) console.log(`   site:   ${f("site")[0]}`);
      if (f("location").length) console.log(`   loc:    ${f("location")[0]}`);
      if (f("ssh_fp").length) console.log(`   ssh_fp: ${f("ssh_fp").join(", ")}`);
      if (f("pgp_uid").length) console.log(`   pgp:    ${f("pgp_uid").join(" | ")}`);
      if (f("linked_account").length) console.log(`   linked: ${f("linked_account").join(", ")}`);
    }
  }
  if (flags.has("--json")) console.log(JSON.stringify(handles.length === 1 ? out[0] : out, null, 2));
}

switch (verb) {
  case "dig": await cmdDig(); break;
  case undefined:
  case "--help":
  case "help":
    console.log("augur <verb>\n\n  dig <handle>   excavate a person's public-artifact shadow (first stone)\n\nBuild order (AUGUR-DESIGN §1): discover → dig → fuse → refute → place → weave");
    break;
  default: die(`unknown verb '${verb}'. try: augur dig <handle>`);
}
