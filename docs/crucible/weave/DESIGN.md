# DESIGN — weave (artifact-weave)

*Cast movement. The mold. Fed to Temper alongside CRUCIBLE.md (enthusiasm) + RESEARCH.md (ground truth). Carries a "claims to falsify" section and "rejected alternatives" so the adversary can strike the assumptions the excitement smuggled in.*

**Date:** 2026-07-11 · **Status:** CAST, awaiting Temper (un-tempered — do NOT build yet).

---

## 1. Problem

augur's `compose(target, us)` drafts receipted cold-intro messages. Every ancestor run **cold-opened** — the weakest intro form. `weave` should supply a *warm* opener: a shared PUBLIC artifact (a co-committed repo, a shared dependency, a co-authored paper) that gives the intro a real, receipted reason-to-reach-out — without the private-graph creepiness of LinkedIn's "mutual connections."

**The reframe (why this is augur's strength, not its weakness):** a warm path is a shared public *artifact*, not a private mutual friend. This is the exact inverse query of augur's `github` excavator ("what has this person touched" → "who else touched what they touched"), i.e. `recombine`'s bisociation pointed one level down.

## 2. The load-bearing constraint (stated first, on purpose)

**Public-artifact overlap between two arbitrary people is EMPIRICALLY SPARSE.** GitHub collaboration graphs peak in density early then decline; collaboration happens on a small fraction of projects; reciprocity is very low (RESEARCH.md §4a, arXiv 1407.2535). **Most (target, us) pairs share ZERO co-committed repos.**

This inverts the naive design. `weave` is **NOT** "warm every intro." It is a **conditional enhancement**: it fires when overlap exists, and **"no warm path found" is the FIRST-CLASS, common-case outcome** — `compose` must degrade gracefully to its existing cold-open when weave returns empty. A design that promised warmth on every compose would be laundering the falsifier; this one designs for the empty case as the default and treats a hit as the bonus.

Mitigation for recall: **multi-vein OR** (co-commit ∪ shared-dep ∪ co-author) widens the surface, each weaker vein trading precision for recall.

## 3. Shape

### 3.1 The fact envelope (reuse, don't reinvent)

`weave` emits the SAME provenance-stamped fact shape as `dig`/`study`: `{predicate, value, method, reliability, source}`. This means weave output flows into `compose`'s **existing receipt-firewall for free** — a warm-path claim survives only if its `source` resolves to a real shared artifact.

New method priors (`src/weave.mjs`, mirroring `fact.mjs`/`STUDY_RELIABILITY` — **priors are MEASURED not guessed**, see OV3):
| method | prior | rationale |
|---|---|---|
| `co_commit` | ~0.90 | login is unique → namesake-safe IF login pre-resolved by dig; you literally shared a codebase |
| `co_author` | ~0.80 (ORCID-anchored) / ~0.50 (name-only) | namesake magnet unless pinned by ORCID iD |
| `shared_dep` | ~0.55 | "we both import X" is barely warm — tie-breaker only |
| `co_star` | ~0.40 | a star is one cheap click — last-resort, high-noise |

Predicate: `shared_artifact`, with `value` = a human phrase ("co-committed to simonw/datasette") and `source` = the exact artifact URL.

### 3.2 The instrument (from RESEARCH.md §1 — the two obvious paths are traps)

- **NOT** the Events API (300 events / 30 days — recency, not history).
- **NOT** `/users/{u}/repos` (owned-only, excludes contributed-to).
- **NOT** `/repos/{o}/{r}/contributors` for enumeration (500-email cap → T returns *anonymous* → false negatives; fan-out explodes).
- **YES:** GraphQL `repositoriesContributedTo` (cursor-paged, lifetime-ish flat set — the right primitive for pure set-intersection) as primary; `contributionsCollection` yearly-walk as the fallback when per-year counts are wanted. **OV1: verify `repositoriesContributedTo` isn't itself silently truncated.**

### 3.3 The asymmetry (augur's inverse-query insight, operationalized)

- **U (us) is stable → compute U's contributed-repo set ONCE, cache it.** This reuses the exact us-cache pattern already shipped in `study.mjs` (`studyCached`, freshness-gated by a repos fingerprint). Amortized to ~zero.
- **T (target) is the variable → per target, one GraphQL walk** to get T's repo set.
- **Intersection is local set math (`R_U ∩ R_T`), zero further API calls.**

O(1) amortized for U + O(pages_T) per target. Token-bucket batches against the GraphQL 2,000-points/min secondary limit (RESEARCH.md §4e).

## 4. Build order (core-first, each stone independently useful, no big-bang)

1. **Stone 1 — `weave(target, us)`, GitHub co-commit vein ONLY.** `src/weave.mjs`: resolve U's contributed-repo set (cached), fetch T's, intersect, emit `co_commit` shared-artifact facts. Standalone-useful CLI: `augur weave <target>` prints the shared repos with receipts. **Ships value alone** (answers "what have we both touched") even before compose integration. Includes the empty-result path as a tested first-class case.
2. **Stone 2 — wire weave into `compose`.** `compose(target, us, {weave:true})` calls weave, and if non-empty, passes the shared-artifact facts into the prompt as the *preferred* intro-open; the existing receipt-firewall validates them. **If weave is empty → compose falls back to today's cold-open, and says so in the result envelope** (`_weave: "no-path"`), never silently. This is the stone that realizes the CRUCIBLE spark.
3. **Stone 3 — shared-dependency vein (OR-widen).** Parse manifests (pyproject.toml/setup.py/package.json/pubspec.yaml/go.mod) across both sides' top repos, intersect. Weak-warm tie-breaker; raises recall on the sparse common case.
4. **Stone 4 — OpenAlex co-authorship vein.** Needs a free OpenAlex API key (RESEARCH.md §2 — the "no key" premise is stale as of Feb 2026); ORCID iD as the namesake anchor. For research-adjacent targets.

**Named future stones (NOT v1 promises):** broker-weave (2-hop path-finding "we both know P who co-committed with T" — multiplies coverage but explodes cost + dilutes warmth); co-attendance manual-import only.

## 5. Blast-radius + consent spine (cage BEFORE monster — up front, not a follow-up)

**weave is a stalking primitive if uncaged** (RESEARCH.md §4c/§4d): the identical query against a non-consenting private individual builds an intimate dossier. Non-negotiable gates, designed in:

- **Owner of the blast radius:** the augur operator (Nick / enspyr BD). **Injection surface:** the `target` argument.
- **Gate weave behind augur's consent spine.** weave runs ONLY against a resolved `LEAD`/consented `NODE` — never a bare arbitrary name. weave **consumes an already-resolved github login from `dig`**, it does not re-resolve (re-resolving reopens dig's namesake hazard — RESEARCH.md §4b).
- **The composite-profile principle (the deep cut, matches augur's "law attaches at the mint" spine):** each artifact being individually public does **NOT** make the *woven composite* consent-clean. Weaving is itself a new act of collection. So every weave edge is provenance-stamped and the composite is surfaced to the subject, exactly as augur's `same_as` layer already is.
- **Receipt every edge** — feeds compose's firewall; makes warmth auditable, un-fabricable.
- **Refuse co-attendance / physical-presence inference by construction** (dead vein — RESEARCH.md §2).
- **Rate-limit + log target lookups** so weave can't be turned into a bulk-surveillance sweep.

## 6. Claims to falsify (hand these to Temper — the enthusiasm's load-bearing assumptions, stated as things that could be WRONG)

- **C1 (the headline):** *artifact-weave meaningfully improves compose.* FALSIFIER: sparsity means the intersection is empty on most pairs → weave is inert on the common case. PARTIAL DEFENCE: designed empty-first + multi-vein OR. **RESIDUAL, un-defended:** even OR may be near-always-empty for *cross-ecosystem* pairs (a Dart dev × a Python dev). If so, weave is high-value for *same-ecosystem* targets and ~null for cross-ecosystem — a real scoping of the win, not a universal one. **Temper must force this to be measured, not asserted** (probe in progress; see §8).
- **C2:** *co-commit is namesake-safe.* TRUE only if the github login is pre-resolved upstream by dig. If weave ever re-resolves a name → false. Mitigation: consume login, never resolve.
- **C3:** *the composite is consent-clean because every artifact is public.* FALSE per the composite-profile principle. The whole consent spine in §5 exists because this claim is wrong.
- **C4:** *`repositoriesContributedTo` yields a clean, complete lifetime set.* UNVERIFIED — may truncate like `contributionsCollection`. Verify in Stone 1 (OV1).

## 7. Rejected alternatives

- **Contributors-endpoint enumeration** — 500-email cap → false-negative anonymity + fan-out explosion. Rejected (RESEARCH.md §1).
- **Events API as primary** — 30-day recency window, not history. Rejected.
- **Private-graph 2nd-degree (LinkedIn model)** — the entire reframe exists to reject this: platforms gate it, consent forbids it, it's not augur's strength.
- **Build all veins at once** — rejected for core-first; co-commit alone proves the reframe.
- **co-star as a headline vein** — too noisy (a star is one click); demoted to last-resort.
- **co-attendance vein** — not publicly queryable AND consent-dirty; named dead, not built.

## 8. Open variables (enumerated — NO silent TODOs)

- **OV1:** Does GraphQL `repositoriesContributedTo` silently truncate? → verify empirically in Stone 1 before trusting the set.
- **OV2:** OpenAlex free API key — provision + store in `~/.claude/.env`; deferred to Stone 4, not needed for Stones 1-3.
- **OV3:** Exact reliability priors for `co_commit`/`shared_dep`/`co_author`/`co_star` — MEASURE against real outcomes (per anticipate-problem-measure-fix), don't ship the guesses in §3.1.
- **OV4:** Where does the consent-tier gate live — inside `weave()` reading the dig result's tier, or enforced by the caller? Proposed: inside `weave()`, fail-closed if tier absent (uncertainty removes authority).
- **OV5:** Empty-result UX in compose — confirmed §4-Stone-2: fall back to cold-open, surface `_weave:"no-path"` in the envelope, never silent.
- **OV6 (empirical — resolved into a build-order gate):** a quick local probe CANNOT cleanly measure the hit-rate — the strong co-commit signal needs the real GraphQL `repositoriesContributedTo` instrument (Stone 1 itself), not the 30-day/owned-only REST window a probe can reach, and a naive shared-dep parser reads `pyproject.toml` metadata keys as fake deps. What the probe DID show directionally: even a best-case same-ecosystem pair (simonw × carltongibson, both Django core) shared only **1 co-star, 0 recent co-commit** — consistent with the literature's sparsity. **Resolution: Stone 1 is promoted to a MEASUREMENT stone.** Its first deliverable is a real hit-rate (co-commit ∪ shared-dep) across ~10 real (target, us) pairs, same-eco and cross-eco. **If that hit-rate is near-zero, Stone 2 (compose integration) is NOT built** — weave ships as a standalone `augur weave` diagnostic and the honest conclusion is "broker-weave / same-eco-only, not universal compose-warming." The build order gates itself on the falsifier.
