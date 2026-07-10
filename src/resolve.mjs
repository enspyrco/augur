// Augur — `resolve`: name → GitHub handle, the pre-dig step (dig assumes the handle is known).
//
// Two complementary strategies, run in one pass and merged into a single confidence:
//   1. handle-guess  — derive plausible handles from "First Last" (firstlast, lastfirst, flast, …),
//                       fetch each; cheap (core API, 5000/hr). Catches accounts whose GH `name` is
//                       blank/different, which a name-search misses.
//   2. name-search   — GitHub `search/users?q="name" in:name`, hydrate the top hits; rate-limited
//                       (search API, 30/min). Catches accounts whose handle isn't name-derivable.
//
// HONESTY GUARD (ported verbatim from the community resolver): a handle existing proves NOTHING.
// We ACCEPT only when the fetched profile's NAME corroborates the person (exact / reversed /
// both-tokens), and rank by whether LOCATION also matches. Handle-derivation alone is never asserted.
//   high — name-verified AND location-matched   ·   med — name-verified, no location signal
//   low  — a handle exists but name mismatched (a lead, never an assertion)   ·   none — nothing
//
// LEGAL-CLEAN: public, logged-out endpoints (GitHub public API) within rate limits.
import { execFileSync } from "node:child_process";

const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim().replace(/\s+/g, " ");
const clean = (s) => norm(s).replace(/[^a-z0-9]/g, "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ISO-3166 alpha-2 → the substring GitHub locations tend to spell out (union of both community resolvers).
const COUNTRY = { AU: "australia", IN: "india", NZ: "new zealand", CZ: "czech", ES: "spain", JP: "japan", NG: "nigeria", US: "united states", GB: "united kingdom", SG: "singapore" };

const sh = (args) => {
  try { return execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return ""; }
};
const ghApi = (path) => { const o = sh(["api", path]); try { return JSON.parse(o); } catch { return null; } };

// Semantic handle variants for "First … Last". GitHub handles are [a-z0-9-] (no dots/underscores).
function handleVariants(name) {
  const toks = norm(name).split(" ").filter((t) => t.length >= 2);
  if (toks.length < 2) return [];
  const f = clean(toks[0]), l = clean(toks[toks.length - 1]);
  if (!f || !l) return [];
  const v = [f + l, l + f, `${f}-${l}`, `${l}-${f}`, f[0] + l, l + f[0], f + l[0], `${f[0]}-${l}`, f, l];
  return [...new Set(v)].filter((h) => h.length >= 4 && h.length <= 39 && /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(h));
}

// Does the fetched profile NAME corroborate the person? (the honesty guard)
function nameScore(ghName, personName) {
  const g = norm(ghName);
  if (!g) return { kind: "blank", ok: false };
  const toks = norm(personName).split(" ").filter((t) => t.length >= 2);
  const f = toks[0], l = toks[toks.length - 1];
  if (g === toks.join(" ")) return { kind: "exact", ok: true };
  if (g === [...toks].reverse().join(" ")) return { kind: "reversed", ok: true };
  const gToks = g.split(/\s+/);
  if (f && l && f.length >= 3 && l.length >= 3 && gToks.includes(f) && gToks.includes(l)) return { kind: "both-tokens", ok: true };
  return { kind: "mismatch", ok: false };
}

function locScore(ghLoc, person) {
  const L = (ghLoc || "").toLowerCase();
  if (!L) return false;
  if (person.city && L.includes(person.city.toLowerCase())) return true;
  const cn = COUNTRY[person.country];
  return !!(cn && L.includes(cn));
}

/**
 * resolve(person, opts) → { name, confidence, github, url, ghName, ghLocation, method, candidates }
 *   person: { name, city?, country? }
 *   opts:   { search=true (run the rate-limited name-search leg), pace=90 }
 * Prints nothing; the caller decides. Mirrors dig()'s library shape.
 */
export async function resolve(person, { search = true, pace = 90 } = {}) {
  const cache = new Map();
  const ghUser = (h) => { if (cache.has(h)) return cache.get(h); const u = ghApi(`users/${h}`); cache.set(h, u); return u; };
  const hits = new Map(); // login → candidate (deduped across both strategies)
  const add = (u, method) => {
    if (!u || !u.login || hits.has(u.login)) return;
    const ns = nameScore(u.name, person.name);
    hits.set(u.login, { login: u.login, ghName: u.name || "", ghLocation: u.location || "", url: u.html_url, match: ns.kind, nameOk: ns.ok, loc: locScore(u.location, person), method });
  };

  // Strategy 1 — handle-guess (cheap core API).
  for (const h of handleVariants(person.name)) { add(ghUser(h), "handle-guess"); await sleep(pace); }

  // Strategy 2 — name-search (rate-limited); skip if handle-guess already found a name+loc lock.
  const locked = [...hits.values()].some((h) => h.nameOk && h.loc);
  if (search && !locked) {
    const res = ghApi(`search/users?q=${encodeURIComponent(`"${person.name}" in:name`)}&per_page=5`);
    await sleep(2200); // stay under the 30/min search limit
    for (const it of (res?.items || []).slice(0, 3)) { add(ghUser(it.login), "name-search"); await sleep(2200); }
  }

  const cands = [...hits.values()];
  const verified = cands.filter((h) => h.nameOk);
  const winner = verified.find((h) => h.loc) || (verified.length === 1 ? verified[0] : null);
  const confidence = verified.some((h) => h.loc) ? "high" : verified.length ? "med" : cands.length ? "low" : "none";

  return {
    name: person.name, city: person.city || "", country: person.country || "",
    confidence,
    github: winner?.login || null,
    url: winner?.url || null,
    ghName: winner?.ghName || null,
    ghLocation: winner?.ghLocation || null,
    method: winner?.method || null,
    candidates: cands.map((h) => ({ login: h.login, ghName: h.ghName, ghLocation: h.ghLocation, match: h.match, loc: h.loc, method: h.method })),
  };
}
