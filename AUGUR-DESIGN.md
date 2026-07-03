# Augur — people-intelligence engine (design synthesis)

> **Working name: Augur** (reads the signs with honest confidence + gaps). "Loom" is taken
> (`enspyrco/loom`). Augur is the evolution of the `social` CLI that also absorbs `rolo`
> (`~/git/orgs/rolo`) — breadth (discover) + depth (enrich) in one loop.
>
> This document synthesizes a 9-facet, two-pass ("deep, then deeper-than-deep") research
> sweep run 2026-07-02 (18 subagents). Every technique below is buildable in Node.js,
> zero paid-API budget (Claude Max + free public APIs + the existing comms CLIs).
> Status: DESIGN. Nothing built yet. Provenance: research agents' cited reports (URLs inline).

---

## 0. The thesis (one paragraph)

Every incumbent (Clay, ZoomInfo, PDL, Pipl) builds a *universal, viewer-independent* directory of
strangers and spends its entire R&D budget resolving *toward* an identity it can never confirm.
Augur inverts this: it **starts from resolved identity** — the people already in your comms graph,
where you *were in the conversation* — and enriches *outward*. That inversion ("identity given,
enrich outward" vs "data given, resolve inward") is the whole moat; freshness, consent, and
local-first all fall out of it. Nobody else has **you** in the graph.

## 1. The loop

```
discover → dig → fuse → refute → place → weave        (+ serendipity daemon, + reverse-casting)
```
- **discover** — who's out there near your graph (2nd-degree crawl, structural diversity). [social already has a v1]
- **dig** — excavate a person's public-artifact shadow (git/gpg/gravatar/npm/CT/ssh-fp). NEW verb. [rolo has none]
- **fuse** — entity resolution: decide which records are the same person, with honest confidence.
- **refute** — adversarial pass that can only LOWER confidence (rolo's soul, kept + upgraded).
- **place** — write a provenance-typed, reversible node into the graph.
- **weave** — warmest-path finder for introductions.
- **serendipity daemon** — nightly, surface one improbable-yet-real connection.
- **reverse-casting** — point at a vision → get the complementary team from the graph.

---

## 2. THE CONSENT + LEGAL SPINE (load-bearing — read first)

The single most important finding: **the harm is a social-contract problem, not a data-processing
problem.** For a data broker a mismatch between expectation and reality is a fine; **for a real
community it's the death of the community.** Design for "nobody feels betrayed" and you clear the
legal bar for free; the reverse is not true.

### 2.1 The mint theory (the deep cut a lawyer knows)
**Enrichment is not gathering — it is data *manufacturing*.** OAIC v Clearview [2021] AICmr 54 (para 74):
"collects" includes collection by **creation** — information "generated from other information the
entity holds." The moment Augur fuses a public git-commit email with a private Signal handle to
infer `same_as`, it has **collected, by creation, a brand-new piece of personal data** (the linkage)
that existed in neither source — and a cross-context linkage can be *more* sensitive than either
endpoint (relationship maps, presence patterns, sleep schedule from commit timestamps). **The law
attaches at the mint.** ⇒ Treat the `same_as`/linkage layer as the highest-risk surface in the
system, not the scrapers.

### 2.2 The risk shift that matters (Australia)
The **Privacy and Other Legislation Amendment Act 2024** created a **statutory tort for serious
invasions of privacy — LIVE from 10 June 2025.** It's a **private right of action**: an upset member
can sue the operator *directly* ("misuse of information" + "reasonable expectation of privacy"),
no regulator needed. Also: **doxxing is now criminal** (up to 7 yrs). The small-business exemption
is a **trap, not a shield** — s 6D(4)(c) strips it the moment you disclose personal info "for a
benefit/service/advantage" to anyone (a co-organiser, a bot, an outreach runner), regardless of
turnover (Clearview determination para 90), and tranche-2 reform is expected to repeal it.

### 2.3 Where the legit path is
LI (legitimate interest) *can* support enrichment (Experian tribunals, EDPB Guidelines 1/2024) — the
entire live dispute is **transparency (Art. 14 notice), not enrichment per se.** hiQ ultimately
*lost* on contract/ToS ($500K, injunction, delete-all) even though scraping public pages survived
CFAA. Rule: **public-and-logged-out only; never authenticate, never fake accounts, honor robots.txt
+ ToS.** `users.noreply.github.com` is an **explicit opt-out signal** — never try to unmask it.

### 2.4 Why the avatar-quote-generator funnel is the RIGHT shape
Inbound + consented capture (a visitor chooses to talk to Dreamfinder on enspyr.co and *volunteers*
their details for a quote) sidesteps the entire minefield. Enrichment then runs on someone who
opted in. **Outbound scraping-to-sell is the red line; the avatar funnel is not that.** This is the
research's recommended shape verbatim: *"overt participation with enrichment as a benefit."*

### 2.5 Buildable compliance architecture (testable invariants)
- **Purpose-locked provenance stamp** on every fact: `{source_locator, collection_context ∈
  {CODE_ATTRIBUTION|PUBLIC_PROFILE|EVENT_RSVP|PRIVATE_COMMS|INFERRED}, transmission_principle,
  lawful_basis ∈ {CONSENT|LEGITIMATE_INTEREST}, purposes_allowed[], derived_from[]}`.
  - **P1:** no read path may use a fact for a purpose ∉ `purposes_allowed` (enforce at query layer;
    unit-test: a CODE_ATTRIBUTION email throws when requested under purpose=OUTREACH).
  - **P2:** any write with non-empty `derived_from` (an inference) is itself a new collection —
    fresh lawful_basis + appears in the transparency view.
- **Mutual-consent handshake — the ONLY path to a node** (state machine):
  `DISCOVERED →(enrich)→ CANDIDATE →(invite, rate-limited)→ INVITED →(affirmative reply)→ CONFIRMED`;
  any → `SUPPRESSED` (terminal, tombstoned). `CANDIDATE/INVITED` are quarantined — invisible to every
  downstream consumer except the intro-sender. Only CONFIRMED enters the usable graph. (H1/H2/H3:
  quarantine, suppression monotone, exactly one outbound touch.)
- **Suppression list that survives re-scraping**: keyed on *every* identifier hash (email/gh-id/
  handle/phone), checked **pre-ingest** so a suppressed person never re-enters even as CANDIDATE;
  **tombstone** the hashes (not the data) so absence is *enforced*, not merely empty. Make it
  **DROP-shaped** (California Delete Act, live Aug 1 2026) so honoring external deletion is config.
  - **S1 (RED test):** delete a subject, re-run the full crawl, assert zero facts written.
- **Sensitive-data hard filter**: closed predicate allowlist (name, preferred_channel, github,
  event_attendance…); anything mapping to APP-sensitive / GDPR Art.9 is refused at ingest and never
  inferred (F1: non-allowlisted predicate throws).
- **Transparency-by-construction**: public "how Augur works" notice + self-service "what Augur knows
  about you and where each fact came from" view with one-click delete. Publish *before* enriching.
  The `same_as` edges surface as "Augur thinks these accounts are you — right?" (consent + accuracy
  APP 10.2 for free).

---

## 3. DIG — public-artifact excavation (`social dig <handle>`)

All endpoints LIVE-VERIFIED 2026-07-02 by the artifact-excavation agent. Corrects the OSINT canon.

### 3.1 The GitHub triple-tap (highest ROI, cleanest legality)
For a handle, in parallel:
1. `GET api.github.com/users/{h}` → name/company/location/blog/(sometimes email). **Authenticate**
   (5,000/hr vs 60/hr unauth — 83× and unauth is now IP-shared, changelog 2025-05-08).
2. `github.com/{h}.gpg` → **PGP UIDs embed real name+email in cleartext** — *defeats commit-email
   masking*. PROVEN: `mitchellh.gpg` leaks `mitchell.hashimoto@gmail.com` which appears in NO commit.
3. `github.com/{h}.keys` → SSH public keys → `ssh-keygen -lf` fingerprint = **cross-forge join key**
   (same key on GitLab/Gitea = same private-key holder, ~0.98 confidence, cryptographic not heuristic).

**DEAD in 2026 (correction to every OSINT guide):** `users/{h}/events/public` PushEvent payloads
**no longer contain `commits[]`** — the "fastest email harvest" trick is gone. Use the commits API
(`repos/{o}/{r}/commits` → `commit.author.email`) or `.patch` (identical, verified).

**Immortal join key:** GitHub numeric ID (`avatars.githubusercontent.com/u/{id}`, resolves via
`api.github.com/user/{id}`). Logins rename/recycle; the integer ID never does. Correlate on ID.

### 3.2 Email → fan-out
- **Gravatar** (now SHA-256, MD5 still honored): `hash = sha256(email.trim().toLowerCase())` →
  `gravatar.com/{hash}.json` → `entry[0].{displayName, profileUrl, preferredUsername, accounts[]}`.
  PROVEN end-to-end: `.gpg` email → hash → live profile. `accounts[]` = self-asserted socials.
- **holehe** (email → 120+ account existence via reset-flow, no target notification) — moderate
  reliability, a HIT is strong, a MISS is weak (sites patch). ToS-risky at scale → LEAD tier only.

### 3.3 Other veins
- **npm/PyPI/crates**: `registry.npmjs.org/{pkg}` → `maintainers[].email`; reverse
  `registry.npmjs.org/-/v1/search?text=author:{h}`. PyPI `pypi.org/pypi/{pkg}/json → info.author_email`.
- **crt.sh** `?q=%.{domain}&output=json` → subdomains reveal self-hosted services (a `pds.` = Bluesky).
- **Keybase** — cryptographically-verified cross-account proofs (Twitter/GitHub/Reddit/wallets). Very
  high confidence where present, thin coverage (technical users).
- **RDAP** (`rdap.org/domain/{d}`, replaced WHOIS Jan 2025) — GDPR-redacted, personal yield ≈ 0,
  infra-pivot only.

### 3.4 The `dig` engine = typed-identity-graph BFS (NOT a pile of pivots)
The product is the **crawler with confidence propagation + corroboration gate + consent budget**, not
any single technique.
```
NODE = {type: github|email|gpgkey|sshfp|gravatar|domain|npmuser|handle, value, id?}
EDGE = {from, to, kind, confidence, provenance_url, method}
canonical(node): github→"gh:"+id (immortal), email→lowercased, sshfp→fingerprint  # cycle key = IMMORTAL id
REVISIT_THRESHOLD = 0.75    # gates TRAVERSAL, not storage
per-edge reliability priors (measured): gpg_uid 0.97, commit/.patch 0.95, ssh_fp 0.98,
    gravatar 0.99, noreply_id 0.99, npm 0.90, crt 0.95, handle_match 0.68  # 1 − 0.323 measured FP rate
bayes_or(a,b) = 1-(1-a)(1-b)   # independent paths REINFORCE
tryMerge: HARD identifiers (email/sshfp/gpg/gravatar/id) may enter alone; SOFT (handle/name) stored
    at ≤0.5 "unconfirmed" and CANNOT spawn a new BFS layer until a hard identifier co-points at it
    (Bayesian-lifts it over threshold) — this structurally kills the 32.3% username-collision cascade.
consent tier == depth budget: NODE→depth4 all excavators; LEAD→depth1 existence-only, NO dossier.
```
**Deep cut:** commit **timestamps geolocate** even when every email is masked — but only in the raw
`.patch` `Date:` (RFC-2822 offset); the REST API launders it to UTC `Z`. A zone that switches
`-0500`/`-0400` = US Eastern DST; the commit-hour histogram reveals sleep schedule. **Always excavate
from `.patch`/raw git object, never REST JSON** — the API is the sanitized view, the porcelain leaks.

---

## 4. FUSE — entity resolution (Fellegi-Sunter, multi-truth)

### 4.1 The math (re-derived from primaries)
Match weight is **additive in log₂** and *decomposable = provenance for free*:
```
w = log₂(λ/(1−λ)) + Σ_i log₂(K_i)
   agreement K_i = m_i/u_i          # m=P(agree|match), u=P(agree|non-match)
   disagreement K_i = (1−m_i)/(1−u_i)   # THE FORGOTTEN NEGATIVE-EVIDENCE TERM — half the evidence is in mismatches
P(match) = 2^w / (1+2^w)
```
Worked: a scorer that ignores disagreements reports 0.99 where the true answer is 0.91 (typo'd
surname) — materially overconfident. **Term-frequency adjustment** (Splink): for an exact match on
value x, replace u with `u_x = freq(x)` (floored) — agreeing on "Meinhold" ≫ agreeing on "Smith".
Pure SQL (GROUP BY). **Label-free bootstrap:** u is estimable from random pairs (≈all non-matches) on
day one; only m needs EM or a few labels.

### 4.2 The two deep cuts
- **Blocking sets a hard recall ceiling no scorer can raise** — a pair blocking never emits is
  *invisible* (no error, just a person silently unrecognized). Measure **pair completeness** as a
  first-class metric BEFORE scorer precision/recall; when recall disappoints, **widen blocking keys,
  don't tune weights.** For ~200 people (19,900 pairs) you can block *barely at all* — smallness is a
  superpower the big-data ER literature can't use.
- **People-data is MULTI-TRUTH.** A person legitimately has 3 emails, 2 employers, GitHub *and*
  GitLab. Single-truth truth-discovery treats the second real email as a *competing falsehood* and
  **penalizes the honest source that supplied it** — inverts the objective. Use per-claim boolean
  truth (LTM-style `t_f ∈ {0,1}` per value), never argmax over an object's values.

### 4.3 Buildable (verified, contradicts the survey)
Clustering: **MERGE-CENTER beats correlation clustering** on accuracy AND cost (Stringer/VLDB'09) —
greedy DESC-by-score, non-centers can't chain merges → cascade firewall (connected-components is the
ONLY algo that suffers the 238×149=35,462 blowup). Human confirmations = **must-link constraints via
graph pre-contraction** (merge nodes before clustering) so consent decisions are hard but the solver
never sees a violable version. Every merge is a **reversible `same_as` claim with evidence**, never an
in-place mutation. Full Claim schema + `matchWeight()` + 30-line DuckDB pipeline in the ER agent report.
LLM only as a **Compare-then-Select tiebreaker** on the ambiguous band (block first — LLMs *lower*
accuracy without blocking; for 200 people, FS+TF beats an LLM pipeline on precision, cost, explainability).

---

## 5. THE AUGUR — provenance + confidence + fusion

### 5.1 Three distinct layers (don't conflate)
- **Provenance** = how we know it — immutable, append-only (W3C PROV: Entity/Activity/Agent +
  wasDerivedFrom/wasAttributedTo). Add a `method: llm-inference | extraction | human-assertion |
  corroboration` class (PROV-AGENT idea; the schema is churning, adopt the distinction not the spec).
- **Confidence** = how sure — derived, mutable, recomputed as evidence arrives. A function OVER
  provenance, NOT provenance.
- **Fusion** = the algorithm turning many provenance-tagged claims → best value + calibrated confidence
  while estimating source reliability. Source-reliability and fact-confidence are **mutually recursive**
  (fixpoint).

### 5.2 Base on LTM (multi-truth-native, two-sided, unsupervised, online)
Each source gets a **confusion matrix** with TWO independent Beta-distributed params: **FPR**
`φ⁰ ~ Beta(1,20)` (strong "sources rarely lie" prior — asymmetric on purpose) and **sensitivity**
`φ¹ ~ Beta(2,2)` (recall genuinely varies). Runnable Node update in the provenance agent report
(`updateSource`, `quality`, `logOddsContribution`). Key claims → **reliability is predicate-LOCAL**
(git is great at emails, useless at job titles → `quality[source][predicate]`).

### 5.3 Copy-discount (the independence fix)
Naive vote-counting is systematically **overconfident** because sources copy each other (10 mirrored
LinkedIn scrapes = 1 vote). The discriminator is **shared *rare/false* values**, not agreement —
sharing a true value carries ~no copying signal; sharing a rare wrong value is maximally informative.
**Corroboration and copying are the same rarity-weighted computation read with opposite sign** — build
it once. `suspectedCopyWeight()` in the report.

### 5.4 Refute pass = prover-verifier (rolo's soul, upgraded)
An *independent, cross-family* verifier issues ACCEPT/CHALLENGE/REJECT + ceiling, can only **lower**:
`final = min(self, verifierCeiling)`; unconfirmed **identity hard-capped at ~0.4** (identity error
poisons everything downstream). Verdict + reason join provenance. The self-report should come from
**semantic entropy** (Nature 2024 — sample k times, cluster by meaning, entropy over meaning-clusters),
NOT the model's verbalized confidence (systematically overconfident). Beware **echo collapse**: naive
multi-pass agreement collapses to one low-entropy view in ~3 rounds — the verifier must be adversarial
by construction, never a second agreeing sampler.

### 5.5 The closed calibration loop (the crux)
A confidence system without a feedback loop drifts, and drifts **overconfident** by default. Augur has
a rare gift: **ground truth arrives for free** (you email someone, they confirm their GitHub; you meet
them, learn their real channel). On every confirm/refute: record outcome vs stated confidence, nightly
compute **Brier + ECE + reliability diagram** over resolved claims, feed back to (a) source Beta params
and (b) a global recalibration remap (if your 0.9s are right 75% of the time, remap). `calibrationReport()`
in the report. Conflicts resolve **Wikidata-style: promote `preferred`, deprecate the loser with a
tombstone — never delete.**

---

## 6. DISCOVER — link prediction / curvature engine

### 6.1 The validated core
Loom/Augur's "affinity × distance" intuition = **Ugander & Kleinberg structural diversity** (PNAS 2012,
Facebook 54M): adoption is governed by the **number of connected COMPONENTS** among your contacts who
already point at a candidate, NOT the raw count. 3 *unrelated* endorsers converted **2× better** than 3
mutually-connected ones. **Non-gameable** (a dense clique counts once). And **size, once diversity is
controlled, is a NEGATIVE predictor.**

### 6.2 The scorer (drop-in, ~30 lines, zero-budget)
```
score(candidate) = structural_diversity(c) × hub_penalized_affinity(c) × distance_multiplier(c)
  structural_diversity = #connected-components among your-known-people-who-follow c
  hub_penalized_affinity = Σ 1/log(out_degree(endorser))   # Adamic-Adar/RA — kills celebrity recs
  distance_multiplier = min(shortest_path(me,c),6)/6   # or Ollivier-Ricci κ<0 = bridge crossed
```
**Do NOT build a GNN** — PROXI (TMLR 2025) + the evaluation-crisis papers show simple proximity
heuristics *beat* cutting-edge GNNs, and GNN wins are inflated by bad baselines + AUC under 99.99%
non-edge imbalance (use Hits@k / precision@k with hard negatives). Heuristics ARE the honest 2025 SOTA.

### 6.3 THE regime-flip deep cut (reshapes discovery)
Structural diversity is a **simple-contagion** result (hearing about someone / one-click join). *Forming
a real relationship* is **complex contagion** (Centola-Macy AJS 2007) — needs **WIDE bridges = multiple
ties from the SAME cluster** — where diversity **inverts sign**. So compute BOTH:
- **Discovery score** = diversity × distance → "someone outside your world"
- **Conversion score** = size of the LARGEST endorser component → "…with a cluster warm enough to make
  the intro land"
Ideal lead = **max discovery + non-trivial conversion** (maximally distant, yet one wide-enough bridge).
Also: hub-penalization is a **bias correction** for the friendship paradox (sampled follow-graphs are
hub-biased), not a nicety. PYMK is creepy+boring because it optimizes *closure*; the unbuilt frontier
is **brokerage discovery** (the inverse objective nobody productizes because it doesn't juice engagement).

---

## 7. WEAVE — warmest-path / Bridge-finder

### 7.1 Warmth score (Gilbert-lite, comms-grounded, re-fittable)
Directed edge u→v: `σ(β0 + β1·intensity + β2·recency + β3·reciprocity + β4·intimacy + β5·structural)`
where intensity=log1p(interactions), recency=`exp(−Δt/τ)` (τ≈180d — Affinity's dominant signal),
reciprocity=`min(a→b,b→a)/max`, intimacy=DM-fraction+profile-overlap, structural=Jaccard. Init β from
Gilbert priors {intimacy .33, intensity .20, duration .16, recip .15, struct .15} **but RE-FIT** —
weights don't transfer across populations. **Store warmth directed** (u→v ≠ v→u is signal).

### 7.2 Paths: return columns, not a verdict
Warmest path ≠ shortest path. Weakest-link warmth = **widest/bottleneck path** (modified Dijkstra: min
+ relax-on-larger, near-linear) or read off the max-spanning-tree. Multiplicative warmth = `−log(w)` +
stock Dijkstra. Per candidate path expose: **bottleneck (coldest handoff — the decision number)**,
mult-warmth, hop count (cap 2-3), `n_disjoint_paths` (redundancy = confidence). Each hop warm **from the
broker's frame**: `min(willingness(A→B), standing(B→X))`. Penalize **broker overload**
(`− λ·betweenness`) to protect superconnectors from burnout.

### 7.3 The two deep cuts
- **Trust is NOT transitive.** The instant you make warmth a path-product you've built a trust-farming
  exploit (Advogato's quadratic blowup; why EigenTrust needs pre-trusted seeds, Appleseed a
  backward-edge-to-source). No deployed metric multiplies trust along a path — they compute a **flow**
  bounded by the **cut** (how hard the structure is to fake). ⇒ **Path-for-the-human** (names who to
  ask), **flow-for-the-score** ("how many independent hard-to-forge warm routes exist to X") — the only
  formulation an over-eager optimizer chasing one lucky 0.95 edge can't game.
- **The moat is OUTCOME CAPTURE.** Warmth is a *prediction*; the only ground truth is whether the intro
  actually happened + went well. Build the `intro_event` schema (path_snapshot, broker_response,
  outcome) and back-propagate: `warmth ← (1−α)·warmth + α·outcome` (α≈0.2). A declined/backfired is the
  only labeled negative in the system. **Build outcome-capture BEFORE the path algorithm** — it's the one
  thing Affinity/4Degrees/LinkedIn structurally don't have. For a ~200-person graph, propagation is a
  big-graph crutch — you can nearly *observe* every edge; spend effort on observation + feedback, not a
  cleverer kernel.

---

## 8. SERENDIPITY DAEMON

### 8.1 The formula + the sobering ceiling
`serendipity(i) = unexpectedness(i) × relevance(i)` where unexpectedness is measured **only over
`RS \ PM`** — the set-difference between your recs and a **dumb "primitive model" (PM)** baseline.
Anything PM already surfaces scores **zero serendipity** ("you both like AI" is worthless). The × is an
AND-gate (a sum lets irrelevant-but-surprising through). The two terms are **negatively correlated** →
interior optimum → don't max either axis. **SOBERING (SerenEva RecSys 2025):** no cheap automated score
predicts human-felt serendipity — proxy metrics ~5%, zero-shot LLM-judge ~10%, best-affordable ~12%,
expensive ensemble ~20%. ⇒ **Demote the scorer, promote the feedback loop.** Use mechanical signals
(rarity, structural gap) for *candidate generation*; use the LLM for *narration* (generation, LLM-strong)
NOT *scoring* (LLM-weak ~20%); the **human one-tap reaction is the only trustworthy signal.**

### 8.2 Buildable
- **PM baseline** as a real function (shared *mainstream* tags only) — subtract the obvious.
- **Rarity-weighted shared signal:** `bits = −log2(df(item)/N)` — a shared 12-star repo dwarfs a shared
  "react". The top item is the narration hook.
- **Weak-tie bridge score:** `notConnected ? structural_gap × top_rarity_bits : 0`.
- **Bandit over surprise-TYPES** (Thompson): arms = {shared-obscure-artifact, cross-domain-resonance,
  weak-tie-bridge, temporal-coincidence}; one-tap reward learns which flavors *this* community loves,
  keeps exploration alive (anti-filter-bubble), and its (pair,reaction) log **bootstraps the training
  set** an aligned-LLM serendipity model (SERAL KDD'25) would need.
- **LLM narration prompt** (spend the quality budget HERE): dramatize the coincidence as a small wonder
  with **receipts inline + the gap named + one beat of mystery**; never assert they'd get along. The
  creepiness firewall is **transparency, not blandness** (Eslami RecSys'19: creepiness = *causal
  ambiguity*, "how did it know that?"; higher accuracy *reduces* creepiness when the chain is legible).

### 8.3 The deep cut: surprise is belief-UPDATE, not distance
Distance-based unexpectedness is swamped by shared mass and rewards mere far-ness. **Bayesian surprise**
= `D_KL(posterior ‖ prior)` — how much the observation *moved your model of yourself* (56.5% vs 42.7% F1
at matching human-surprising). ⇒ Prefer a signal rare *for that person specifically* (revises their
self-model) over one globally rare but peripheral. That's the difference between a coincidence that feels
like **fate** vs **trivia** — invisible to every distance metric.

---

## 9. REVERSE-CASTING (vision → team)

Two chained problems: **(A) expert finding** (rank people by topical fit — Balog **Model 2**: rank
*artifacts* per capability, propagate to people; robust to uneven footprints — "wrote the one definitive
thing on lip-sync" beats "on average mentions it 2%"); **(B) team formation** (Lappas **RarestFirst**:
anchor on the scarcest skill's holders, attach nearest cover of each other skill; 2-approx on diameter;
NP-complete). Ground the LLM's vision→capability decomposition in a **closed vocabulary** (ESCO: 13,900
skills, free SPARQL/REST, essential-vs-optional edges = hard/soft split, broader/narrower = query
expansion "avatar" → "facial rigging, lip-sync").

**Adversarial:** communication-cost is a good *regularizer*, a bad *objective* — co-occurrence edges are
**unsigned** (a failed death-march project = a strong short edge the objective loves); diameter *rejects*
the perfectly-qualified graph-distant person; Steiner rewards a fragile single hub. Use comm-cost as a
**soft penalty**, add a **fairness cooldown** (penalize recently-cast stars — critical in a *volunteer*
community), and derive a **signed `collabValence`** (did they collaborate ≥2× *voluntarily*? = +1) —
the one piece with no off-the-shelf source and where the real value is.

**Two deep cuts:** (1) **inject one bridge-distant WILDCARD** for generative friction — the densest team
is the most homogeneous and produces the obvious thing; for a community whose purpose is *egregores*,
trade a little coordination cost for a lot of novelty. Objective = min-diameter core **+1 high-distance
wildcard**. (2) Run longitudinally, the caster becomes a **capability-gap detector**: if RarestFirst
keeps anchoring on the same lone person, the output isn't a team — it's a **recruit/mentor directive**
("you've needed facial-rigging in 4 of 5 visions, only Ada can do it — grow a second"). Design-for-
subtraction at the community layer: don't cast around the scarcity, *delete* it. Full `reverseCast()` in
the agent report.

---

## 10. POSITIONING (why this wins, and its real kill-vectors)

**The wedge:** nobody has *you* in the graph — first-person relational context (last interaction, which
channel they actually answer, who introduced you, groups-in-common) is the one column incumbents
*structurally* cannot compute. Steal from the incumbents: **field-level waterfall** (Clay — each field
its own free-source fallthrough chain, first-match-wins), **corroboration-count confidence + a `possible_*`
tier** (PDL's `num_sources`, not a made-up %), **freshness as a feature** (`last_interaction`), and
**skip the entire email-guess-and-verify industry** for anyone in your graph (you already have their real
address from comms).

**Real kill-vectors (name them):** (a) **maintenance death-spiral** — personal CRMs die when they ask
you to type; defense is *architectural* (zero manual entry, comms graph self-populates, last-interaction
computed). (b) **Platform API cutoff** — the true existential risk; **Rapportive** was *exactly* this
vision (2012) and LinkedIn acqui-killed it, then strangled the API. Augur depends on comms-CLI access the
platforms fight; degrade gracefully, never depend on one channel. (c) **Small hostile lane** — incumbents
won't build it (cannibalizes their asset + consumer PII is now FTC-toxic), which *opens* the lane but
proves it's small; survive only by being zero-manual-entry, truly local (FTC surface nil — you're not a
broker if you never sell/centralize), and channel-resilient.

**The 2025-26 tailwind:** LLM agents doing free open-web research (Claygent, >1B tasks) are dissolving the
providers' aggregation moat — which is Augur's *native substrate* (Claude Max, zero marginal cost). Augur
is what Clay becomes if you delete the paid-provider layer and replace the coverage with a private
first-party graph the agent can't get elsewhere.

**Deliberately NOT:** a universal directory / people-search broker (→ you become Endato + its legal
surface); a bulk cold-outreach cannon; a data reseller / coop (the instant value depends on pooling users'
contacts it betrays its only differentiator); a catch-all email guesser (leave that unsolved wall to
others).

---

## 11. SURFACE REGISTRY (where a person's info lives)

*8 surface-mapper agents (surf-events/dev/professional/social/records/breach/comms/australia) completed
2026-07-02; full per-source registries (access method · keyable-by · reliability · rate-limit · ToS flag)
pending collection into this section. Highest-openness APIs called out so far: **Bluesky AT Protocol**
and **Reddit JSON** (wide open), **Discourse** public user API, public **Mailman/pipermail** archives
(name+email+history), **ABR/ABN Lookup** + **ACNC** (free AU registries), **crt.sh** + **CT logs**.
Breach surfaces (HIBP self-check only) gated to the ethical subset: "show a member what's already exposed
about THEM."*

---

## 12. First stone

Build **`dig`** first (§3.4) — it's the primitive neither `social` nor `rolo` has, it's the most
legally-clean vein (public git artifacts, within rate limits), and it already proved itself (two verified
emails + a voice-AI overlap in 90 seconds). Everything downstream (fuse → Augur → weave) consumes what
`dig` produces. Gate it with the consent tier (§2.5) from line one — cage before monster.
