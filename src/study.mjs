// study — the SEMANTIC pass. Where `dig` answers "are these
// accounts the same person?" (forensic identity), `study` answers "what is this
// person actually building, and why would they care?" (the living body of work).
//
// Emits Facts of kind 'semantic' — same provenance spine as dig's forensic Facts,
// new reliability priors, and one hard rule: a study-fact NEVER lifts an identity
// merge (it informs the message, never the same_as graph). Runs on a resolved
// NODE only — you study people dig has already placed. Public, logged-out sources.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { dirname } from "node:path";
import { dig } from "./dig.mjs";
import { llm } from "./llm.mjs";

const sh = (cmd, args, timeout = 15000) => {
  try { return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout }); }
  catch { return ""; }
};
const ghJson = (path) => { const o = sh("gh", ["api", path]); try { return JSON.parse(o); } catch { return null; } };

// Semantic reliability priors — distinct from dig's forensic table.
export const STUDY_RELIABILITY = {
  repo_description: 0.85,
  readme_extract: 0.85,
  repo_topic: 0.80,
  commit_subject_topic: 0.80,
  web_search_claim: 0.70,
};

export const studyFact = (predicate, value, method, source) => ({
  kind: "semantic", predicate, value, method,
  source: source || null,
  reliability: STUDY_RELIABILITY[method] ?? 0.6,
});

const README_MAX = 1500;
function repoReadme(fullName) {
  const r = ghJson(`repos/${fullName}/readme`);
  if (!r || !r.content) return "";
  try { return Buffer.from(r.content, "base64").toString("utf8").slice(0, README_MAX); } catch { return ""; }
}

const PREDICATES = ["ships", "writes_about", "cares_about", "recent_focus", "maintains", "stance", "open_question"];

export async function study(input, { topRepos = 8, readmes = 5 } = {}) {
  const digResult = (typeof input === "string") ? await dig({ github: input }) : input;
  const handle = digResult.subject?.github || digResult.identifiers?.github_login;
  if (!handle) return { subject: digResult.subject, handle: null, studyFacts: [], sources: [], note: "no github handle to study" };

  let repos = ghJson(`users/${handle}/repos?per_page=100&sort=updated`) || [];
  repos = repos.filter((r) => !r.fork)
    .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
    .slice(0, topRepos);
  if (!repos.length) return { subject: digResult.subject, handle, studyFacts: [], sources: [], note: "no public non-fork repos" };

  const corpus = repos.map((r, i) => {
    const readme = i < readmes ? repoReadme(r.full_name) : "";
    return [
      `## ${r.full_name}  (★${r.stargazers_count || 0}, ${r.language || "?"})`,
      r.description ? `desc: ${r.description}` : "",
      (r.topics && r.topics.length) ? `topics: ${r.topics.join(", ")}` : "",
      readme ? `README:\n${readme}` : "",
    ].filter(Boolean).join("\n");
  }).join("\n\n");

  const sources = repos.map((r) => r.html_url);

  const prompt = `You are augur's STUDY verb — extract the *semantic signature* of a developer from their public GitHub work: what they BUILD, care about, and are focused on right now. This feeds an intro-writing step, so every fact must be concrete, quotable, and MUST carry the repo URL it came from (provenance — an intro can only claim what has a receipt).

Return ONLY a JSON array. Each element:
{"predicate": one of [${PREDICATES.join(", ")}], "value": "<one concrete phrase, <=14 words>", "method": one of [repo_description, readme_extract, repo_topic], "source": "<the exact repo html_url this came from>"}

Rules:
- 8-15 facts. Specific over generic: "ships a Matrix<->Signal bridge in Dart" beats "builds software".
- NO identity/PII (no employer, real name, location) — semantic only.
- recent_focus = inferred from the most-recently-updated repos.
- source MUST be one of the valid repo URLs below.

Developer: ${handle}
Valid source URLs: ${sources.join(", ")}

CORPUS:
${corpus}`;

  let raw;
  try { raw = llm(prompt, { json: true }); } catch (e) { return { subject: digResult.subject, handle, studyFacts: [], sources, note: `llm extract failed: ${e.message}` }; }
  const valid = new Set(sources);
  const studyFacts = (Array.isArray(raw) ? raw : [])
    .filter((f) => f && f.predicate && f.value)
    .map((f) => studyFact(f.predicate, f.value, f.method, valid.has(f.source) ? f.source : (sources[0] || null)));
  return { subject: digResult.subject, handle, studyFacts, sources, repoCount: repos.length };
}

// ── us-cache ────────────────────────────────────────────────────────────────
// study(us) is ~90-100s (a claude -p turn + dig veins), yet `us` is the SAME on
// every compose. Caching it is worth ~100s/compose — but `us` is not invariant,
// it's low-velocity: a stale cache would drop your freshest work from the intro.
// So we cache behind a CHEAP freshness-probe (one repos call, sub-second), not a
// blind TTL: if no repo has been pushed since the cache was built, serve it.
// The TTL is only a floor for inputs the fingerprint can't see (bio, web claims).
const US_CACHE_DIR = ".augur/cache";
export const US_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30d floor
const CACHE_V = 1; // envelope version — bump to invalidate every cache on a schema change
// GitHub username grammar: 1-39 chars, alphanumeric or hyphen, no leading/trailing/double
// hyphen. Also fences the cache filename against path traversal (`../x`) — an unknown-shape
// handle is uncacheable, not a write primitive.
const GH_HANDLE = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

const optsKeyOf = (o = {}) => `r${o.topRepos ?? 8}m${o.readmes ?? 5}`;

// Change-detector over what study actually selects: study ranks non-fork repos BY STARS
// and takes the top-N, so the fingerprint must move on a push (pushed_at) AND on a
// star-rank shift that could change top-N membership (stargazers_count) — else a repo
// gaining stars silently displaces another with no pushed_at change and we serve stale
// facts. Pure. (Cross-cutting inputs the fingerprint can't see — bio, web-search claims —
// are covered by the TTL floor, by design.)
export function reposFingerprint(repos) {
  const sig = (repos || [])
    .filter((r) => r && !r.fork)
    .map((r) => `${r.full_name}@${r.pushed_at}#${r.stargazers_count ?? 0}`)
    .sort()
    .join("\n");
  return createHash("sha1").update(sig).digest("hex");
}

// Serve the cache only if it exists, options match, repos are unchanged, builtAt is a
// real past timestamp, and it's under the TTL floor — unless refresh forces a rebuild.
// Pure (nowMs injected). Fails CLOSED on a NaN/future builtAt: a malformed or poisoned
// timestamp must trigger a rebuild, never `NaN > ttl === false` → stale-forever.
export function cacheDecision({ cached, fingerprint, optsKey, nowMs, ttlMs = US_CACHE_TTL_MS, refresh = false }) {
  if (refresh) return { fresh: false, reason: "refresh" };
  if (!cached) return { fresh: false, reason: "no-cache" };
  if (cached.optsKey !== optsKey) return { fresh: false, reason: "opts-changed" };
  if (cached.fingerprint !== fingerprint) return { fresh: false, reason: "repos-changed" };
  const builtMs = Date.parse(cached.builtAt);
  if (!Number.isFinite(builtMs) || builtMs > nowMs) return { fresh: false, reason: "invalid-builtAt" };
  if (nowMs - builtMs > ttlMs) return { fresh: false, reason: "ttl-expired" };
  return { fresh: true, reason: "hit" };
}

// study() with the freshness-gated cache. Only caches by a valid GitHub handle string
// (the `us` case); a NODE-object or unknown-shape handle falls straight through to study().
export async function studyCached(handle, { refresh = false, ...studyOpts } = {}) {
  if (typeof handle !== "string" || !GH_HANDLE.test(handle)) return study(handle, studyOpts);
  const optsKey = optsKeyOf(studyOpts);
  const file = `${US_CACHE_DIR}/${handle}.json`;

  const repos = ghJson(`users/${handle}/repos?per_page=100&sort=updated`) || [];
  const fingerprint = reposFingerprint(repos);

  // Read the cache as UNTRUSTED input: accept it only if the envelope version, the handle
  // identity, and the result shape all check out — otherwise it's a miss, not a serve.
  let cached = null;
  try {
    const raw = JSON.parse(readFileSync(file, "utf8"));
    if (raw && raw.v === CACHE_V && raw.handle === handle && Array.isArray(raw.result?.studyFacts)) cached = raw;
  } catch { /* missing/corrupt/foreign → rebuild */ }

  const { fresh, reason } = cacheDecision({ cached, fingerprint, optsKey, nowMs: Date.now(), refresh });
  if (fresh) return { ...cached.result, _cache: "hit" };

  const result = await study(handle, studyOpts);
  if (result.studyFacts?.length) { // never cache an empty/failed study
    try {
      mkdirSync(dirname(file), { recursive: true });
      // atomic replace: write a per-process temp then rename, so a concurrent writer or a
      // crash mid-write can never leave a torn/partial JSON file at the cache path.
      const tmp = `${file}.${process.pid}.tmp`;
      writeFileSync(tmp, JSON.stringify({ v: CACHE_V, handle, optsKey, fingerprint, builtAt: new Date().toISOString(), result }, null, 2));
      renameSync(tmp, file);
    } catch { /* cache is best-effort — a write failure must not break study */ }
  }
  return { ...result, _cache: reason };
}
