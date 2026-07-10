// study — the SEMANTIC pass. Where `dig` answers "are these
// accounts the same person?" (forensic identity), `study` answers "what is this
// person actually building, and why would they care?" (the living body of work).
//
// Emits Facts of kind 'semantic' — same provenance spine as dig's forensic Facts,
// new reliability priors, and one hard rule: a study-fact NEVER lifts an identity
// merge (it informs the message, never the same_as graph). Runs on a resolved
// NODE only — you study people dig has already placed. Public, logged-out sources.
import { execFileSync } from "node:child_process";
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
