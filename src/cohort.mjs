// Augur — cohort loader. A cohort is a dataset+config instance of the augur pipeline
// (AUGUR-DESIGN §1: "one engine + data/config instances"). It bundles harvested sources,
// curated overrides, and the branding/consent config the publish verbs need.
//
// Layout:  cohorts/<id>/cohort.json  +  cohorts/<id>/data/{meetup,luma,overrides,dig}.json
// Outputs: cohorts/<id>/build/  (local, PII-bearing)  ·  cohorts/<id>/public/  (PII-stripped)
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const cohortsDir = join(ROOT, "cohorts");
export const expandHome = (p) => (p && p.startsWith("~") ? join(homedir(), p.slice(1).replace(/^\//, "")) : p);

export function loadCohort(id) {
  const dir = join(cohortsDir, id);
  if (!existsSync(join(dir, "cohort.json"))) throw new Error(`unknown cohort '${id}' (looked in ${dir})`);
  const cfg = JSON.parse(readFileSync(join(dir, "cohort.json"), "utf8"));
  const dataDir = join(dir, "data");
  const rd = (f) => { const p = join(dataDir, f); return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null; };
  return {
    ...cfg,
    dir, dataDir,
    buildDir: join(dir, "build"),
    publicDir: join(dir, "public"),
    data: { meetup: rd("meetup.json"), luma: rd("luma.json"), overrides: rd("overrides.json"), dig: rd("dig.json") },
  };
}
