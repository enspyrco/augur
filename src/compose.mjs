// compose — the intro synthesis. recombine is its engine.
//
// compose(target, us) runs /recombine across study(target) × study(us) to find the
// RHYME (the third thing latent in the gap, A×B=C), then drafts an intro where every
// claim about the target carries an inline receipt. Two load-bearing rules:
//   1. DRAFTS, NEVER SENDS (red line) — output is a buffer.
//   2. Anti-creepiness firewall (§8.2): a claim about them survives only if its
//      receipt resolves to one of THEIR real public sources. We VERIFY the model's
//      receipts against the study-fact source set — never trust self-reported provenance.
import { study } from "./study.mjs";
import { llm } from "./llm.mjs";

export async function compose(targetHandle, usHandle, { broker = null, studyOpts = {} } = {}) {
  const t = await study(targetHandle, studyOpts);
  const u = await study(usHandle, studyOpts);
  if (!t.studyFacts.length) return { target: targetHandle, draft: "", rhyme: null, receipts: [], cut: [], note: `no study facts for target ${targetHandle}` };
  if (!u.studyFacts.length) return { target: targetHandle, draft: "", rhyme: null, receipts: [], cut: [], note: `no study facts for us (${usHandle})` };

  const fmt = (r) => r.studyFacts.map((f) => `- [${f.predicate}] ${f.value}  (receipt: ${f.source})`).join("\n");
  const targetSources = new Set(t.studyFacts.map((f) => f.source).filter(Boolean));

  const prompt = `You are augur's COMPOSE verb — write a cold-intro message that will genuinely land, using /recombine's bisociation move. Each fact below carries a receipt = the public repo it came from.

## THEM (${t.handle}) — the recipient:
${fmt(t)}

## US (${u.handle}) — the sender:
${fmt(u)}

STEP 1 — RHYME: run recombine across THEM x US. Find the *third thing* latent in the gap between what they build and what we build: a real shared seam or a collaboration neither has alone (A x B = C). Not "we both use X"; the non-obvious rhyme.

STEP 2 — DRAFT a short intro (120-160 words, warm but cold-open, NO em-dashes, plain hyphens):
- Voice the RHYME as the reason for reaching out.
- Every factual claim ABOUT THEM must cite a receipt (a repo URL from THEIR list above). If a claim has no such receipt, do NOT make it.
- One concrete, small ask. Never assert "we'd get along". Specific, not flattering.
${broker ? `- Warm broker exists: ${broker}. Open by naming them.` : "- Cold open (no broker). Earn the first line."}

Return ONLY JSON:
{"rhyme":"<one sentence>","draft":"<the message>","receipts":[{"claim":"<claim about them>","source":"<their repo url>"}],"cut":["<any claim you wanted but had no receipt>"]}`;

  let out;
  try { out = llm(prompt, { json: true }); }
  catch (e) { return { target: t.handle, us: u.handle, draft: "", rhyme: null, receipts: [], cut: [], note: `compose llm failed: ${e.message}` }; }

  // Anti-creepiness firewall: keep only receipts whose source is a REAL target source.
  const receipts = (out.receipts || []).filter((r) => r.source && targetSources.has(r.source));
  const fabricated = (out.receipts || [])
    .filter((r) => !r.source || !targetSources.has(r.source))
    .map((r) => `${r.claim} (receipt not in target's public work)`);

  return {
    target: t.handle, us: u.handle,
    rhyme: out.rhyme || null,
    draft: out.draft || "",
    receipts,
    cut: [...(out.cut || []), ...fabricated],
    _facts: { target: t.studyFacts.length, us: u.studyFacts.length },
  };
}
