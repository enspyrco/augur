// Excavator: ORCID — researcher registry (free public API, no-auth).
// Two roots:
//   - subject.orcid given → HARD lookup of that exact record (profile_id reliability)
//   - subject.name only   → expanded-search, SOFT (name is namesake-prone; needs a hint/other vein)
// pub.orcid.org/v3.0/{id} · pub.orcid.org/v3.0/expanded-search/?q=<name>
import { execFileSync } from "node:child_process";
import { fact } from "../fact.mjs";

const curlJson = (url) => {
  try { return JSON.parse(execFileSync("curl", ["-s", "--max-time", "10", "-H", "Accept: application/json", url], { encoding: "utf8", timeout: 12000 })); }
  catch { return null; }
};
const orcidId = (v) => (v || "").match(/(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/)?.[1] || null;

export const orcid = {
  name: "orcid",
  applies: (s) => !!s.orcid || !!s.name,
  async run(s) {
    if (s.orcid) {
      const id = orcidId(s.orcid);
      const j = curlJson(`https://pub.orcid.org/v3.0/${id}/person`);
      if (!j) return { facts: [], source: `orcid.org/${id}`, note: "no record" };
      const name = [j.name?.["given-names"]?.value, j.name?.["family-name"]?.value].filter(Boolean).join(" ");
      const facts = [fact("orcid", `https://orcid.org/${id}`, "profile_id", `https://orcid.org/${id}`)]; // given id = HARD
      if (name) facts.push(fact("name", name, "profile_id", `https://orcid.org/${id}`));
      return { facts, source: `https://orcid.org/${id}`, note: "hard lookup (id supplied)" };
    }
    // name-rooted: expanded search — SOFT (namesake-prone), needs corroboration
    const j = curlJson(`https://pub.orcid.org/v3.0/expanded-search/?q=${encodeURIComponent(s.name)}&rows=3`);
    const hits = j?.["expanded-result"] || [];
    // require BOTH given + family to match the subject before even soft-emitting
    const [first, ...rest] = s.name.toLowerCase().split(" ");
    const last = rest[rest.length - 1] || "";
    const m = hits.find((h) => (h["given-names"] || "").toLowerCase().includes(first) && (h["family-names"] || "").toLowerCase().includes(last));
    if (!m) return { facts: [], source: "orcid.org", note: "no name match" };
    const id = m["orcid-id"];
    const facts = [fact("orcid", `https://orcid.org/${id}`, "handle_match", `https://orcid.org/${id}`)]; // SOFT — name only
    const inst = (m["institution-name"] || [])[0];
    if (inst) facts.push(fact("affiliation", inst, "handle_match", `https://orcid.org/${id}`));
    return { facts, source: `https://orcid.org/${id}`, note: "NAME MATCH ONLY (SOFT, namesake risk — confirm before trusting the id)" };
  },
};
