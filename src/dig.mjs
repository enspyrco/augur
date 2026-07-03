// Augur — `dig`: multi-vein public-artifact excavation (AUGUR-DESIGN §3, §11).
//
// dig is NO LONGER github-rooted. It takes a SUBJECT descriptor and runs every excavator
// that applies, merging provenance-tagged facts. A subject can be rooted by any identifier:
//   { github, name, email, hint, companyNumber, orcid }
// Each excavator declares .applies(subject) and .run(subject) → { facts, source, note }.
//
// Veins today: github (handle) · openalex (name → scholarly) · companies_house (companyNumber → officers).
// Roadmap veins (AUGUR-DESIGN §3.2-3.3, §11): patents (PatentsView), Keybase, npm/PyPI, crt.sh,
// Bluesky, ORCID-direct, ABR/ACNC (AU). Add a file under src/excavators/ + register below.
//
// LEGAL-CLEAN: every vein is a public, logged-out endpoint within rate limits. Never authenticates
// as the target, never fakes accounts, never unmasks a noreply. See AUGUR-DESIGN §2 (consent spine).
import { github } from "./excavators/github.mjs";
import { openalex } from "./excavators/openalex.mjs";
import { companiesHouse } from "./excavators/companies_house.mjs";
import { patents } from "./excavators/patents.mjs";
import { orcid } from "./excavators/orcid.mjs";

const EXCAVATORS = [github, openalex, patents, orcid, companiesHouse];

/**
 * dig(subject) → { subject, facts:[{predicate,value,method,reliability,source}], veins:[{name,note}], identifiers:{...} }
 * subject: string (bare github handle) OR { github?, name?, email?, hint?, companyNumber? }
 */
export async function dig(subject) {
  const s = typeof subject === "string" ? { github: subject } : { ...subject };

  const facts = [], veins = [];
  for (const ex of EXCAVATORS) {
    if (!ex.applies(s)) continue;
    const r = await ex.run(s);
    veins.push({ name: ex.name, source: r.source, note: r.note || null, facts: r.facts.length });
    for (const f of r.facts) facts.push({ ...f, vein: ex.name });
    // let a github find seed the name for downstream name-rooted veins in the same dig
    if (ex.name === "github" && !s.name) {
      const nm = r.facts.find((f) => f.predicate === "name");
      if (nm) s.name = nm.value;
    }
  }

  // collect hard identifiers for fuse / cross-linking
  const pick = (p) => facts.filter((f) => f.predicate === p).map((f) => f.value);
  const identifiers = {
    github_id: pick("github_id")[0] ?? null,
    orcid: pick("orcid")[0] ?? null,
    emails: [...new Set(pick("email"))],
    ssh_fps: pick("ssh_fp"),
    names: [...new Set(pick("name"))],
  };

  return { subject: s, facts, veins, identifiers };
}
