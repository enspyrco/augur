// Excavator: OpenAlex — name-rooted scholarly footprint (free, no-auth, ToS-clean).
// For researchers/scientists whose public shadow is papers, not commits.
// api.openalex.org/authors?search=<name> → works_count, citations, ORCID, affiliation, topics.
//
// Corroboration note: a name match on a works index is NOT identity by itself (namesakes).
// The topics are the discriminator — pass subject.hint (e.g. field/company blurb) and we
// only emit at full reliability when a topic overlaps the hint.
import { execFileSync } from "node:child_process";
import { fact } from "../fact.mjs";

const curlJson = (url) => {
  try { return JSON.parse(execFileSync("curl", ["-s", "--max-time", "10", "-H", "User-Agent: augur (mailto:info@example.com)", url], { encoding: "utf8", timeout: 12000 })); }
  catch { return null; }
};

export const openalex = {
  name: "openalex",
  applies: (s) => !!s.name,
  async run(s) {
    const j = curlJson(`https://api.openalex.org/authors?search=${encodeURIComponent(s.name)}&per_page=3`);
    const a = j?.results?.[0];
    if (!a) return { facts: [], source: "openalex.org", note: "no author match" };
    const src = a.id; // OpenAlex author URI
    const topics = (a.topics || []).map((t) => t.display_name);
    // topic-overlap check against the caller's hint (field/company text).
    // A bare name match on a works index is a NAMESAKE MAGNET (e.g. a plant-geneticist
    // "Robin Langer" ≠ our mathematician). So we only assert at scholarly_author
    // reliability when a hint is given AND a topic overlaps it; otherwise the facts
    // are SOFT (handle_match) and flagged unverified — never full confidence on a name alone.
    const hint = (s.hint || "").toLowerCase();
    const overlap = hint ? topics.filter((t) => t.toLowerCase().split(/\W+/).some((w) => w.length > 4 && hint.includes(w))) : [];
    const corroborated = !!hint && overlap.length > 0;
    const method = corroborated ? "scholarly_author" : "handle_match"; // soft unless a hint corroborates
    const facts = [
      fact("name", a.display_name, method, src),
      fact("scholarly_works", a.works_count, method, src),
      fact("citations", a.cited_by_count, method, src),
    ];
    // ORCID is intrinsically a hard, stable id — BUT the name→this-record link is only as
    // strong as the match. An uncorroborated match hands you the wrong person's ORCID (the
    // plant-geneticist "Robin Langer"). So the orcid fact inherits the MATCH reliability,
    // never the raw 0.99 — identity error must not launder into a hard id.
    if (a.orcid) facts.push(fact("orcid", a.orcid, method, src));
    const affil = a.affiliations?.[0]?.institution?.display_name || a.last_known_institutions?.[0]?.display_name;
    if (affil) facts.push(fact("affiliation", affil, method, src));
    for (const t of topics.slice(0, 5)) facts.push(fact("research_topic", t, method, src));
    const note = corroborated
      ? `topic overlap: ${overlap.join(", ")}`
      : (hint ? "NAME MATCH ONLY — no topic overlap with hint (SOFT, namesake risk)" : "NAME MATCH ONLY — no hint given to corroborate (SOFT, namesake risk)");
    return { facts, source: src, note };
  },
};
