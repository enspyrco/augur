// Excavator: UK Companies House — company-rooted director/officer records (public registry).
// Rooted on a company number (subject.companyNumber), not a person — resolves the OFFICERS,
// so it's how you enrich someone you know sits on a specific company (e.g. a Kodamai director).
// Public web endpoint (no key); the official REST API (needs a free key) is the durable path.
import { execFileSync } from "node:child_process";
import { fact } from "../fact.mjs";

const curl = (url) => {
  try { return execFileSync("curl", ["-s", "--max-time", "10", "-A", "Mozilla/5.0", url], { encoding: "utf8", timeout: 12000 }); }
  catch { return ""; }
};

export const companiesHouse = {
  name: "companies_house",
  applies: (s) => !!s.companyNumber,
  async run(s) {
    const url = `https://find-and-update.company-information.service.gov.uk/company/${s.companyNumber}/officers`;
    const html = curl(url);
    if (!html) return { facts: [], source: url, note: "no response" };
    // Officer names render inside the appointment link: <a href="/officers/<id>/appointments">SURNAME, Given
    const names = [...html.matchAll(/href="\/officers\/[^"]+\/appointments"[^>]*>\s*([A-Z][A-Za-z'.\- ]+,\s*[A-Za-z'.\- ]+?)\s*</g)].map((m) => m[1].trim());
    const uniq = [...new Set(names)];
    const facts = [];
    for (const n of uniq) facts.push(fact("company_officer", n, "registry_officer", url));
    // if we're looking for a specific person, flag the match
    if (s.name) {
      const [first, ...rest] = s.name.split(" ");
      const last = rest[rest.length - 1] || "";
      const hit = uniq.find((n) => n.toLowerCase().includes(last.toLowerCase()) && n.toLowerCase().includes(first.toLowerCase()));
      if (hit) facts.push(fact("directorship", `${hit} @ company ${s.companyNumber}`, "registry_officer", url));
    }
    return { facts, source: url, note: `${uniq.length} officer(s)` };
  },
};
