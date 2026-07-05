// Augur — `dig`: multi-vein public-artifact excavation (AUGUR-DESIGN §3, §11).
//
// dig is NO LONGER github-rooted. It takes a SUBJECT descriptor and runs every excavator
// that applies, merging provenance-tagged facts. A subject can be rooted by any identifier:
//   { github, name, email, hint, companyNumber, orcid }
// Each excavator declares .applies(subject) and .run(subject) → { facts, source, note }.
//
// Veins today: github (handle) · openalex (name → scholarly) · patents (name → inventions) ·
// orcid (name → scholarly id) · companies_house (companyNumber → officers) ·
// crtsh (domain → CT-log infrastructure footprint + operator-linked domains).
// Roadmap veins (AUGUR-DESIGN §3.2-3.3, §11): Keybase, npm/PyPI, Bluesky, ABR/ACNC (AU).
// Add a file under src/excavators/ + register below.
//
// LEGAL-CLEAN: every vein is a public, logged-out endpoint within rate limits. Never authenticates
// as the target, never fakes accounts, never unmasks a noreply. See AUGUR-DESIGN §2 (consent spine).
import { github } from "./excavators/github.mjs";
import { openalex } from "./excavators/openalex.mjs";
import { companiesHouse } from "./excavators/companies_house.mjs";
import { patents } from "./excavators/patents.mjs";
import { orcid } from "./excavators/orcid.mjs";
import { crtsh } from "./excavators/crtsh.mjs";

// github first so its finds can seed name/site/email for downstream veins; crtsh last so it sees them.
const EXCAVATORS = [github, openalex, patents, orcid, companiesHouse, crtsh];

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
    // let a github find seed name/site/email for downstream veins in the same dig
    if (ex.name === "github") {
      const seed = (pred, key) => { if (!s[key]) { const f = r.facts.find((f) => f.predicate === pred); if (f) s[key] = f.value; } };
      seed("name", "name");
      seed("site", "site");    // → crt.sh can dig the domain of their published homepage
      seed("email", "email");  // → crt.sh can dig a non-freemail email domain
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
