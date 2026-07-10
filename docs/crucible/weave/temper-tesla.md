## Tesla (design temper)

**Verdict:** REQUEST_CHANGES

Not because the inverse-query reframe is slag — it is the right *idea* — but because three load-bearing hinges are still soft enough that Stone 1 will mint a false kill *or* a false go, and Stone 2 would then bake the wrong thing into `compose`. Fix the measurement protocol, the definition of a “hit,” and the consent story; then Stone 1 is buildable.

---

**Findings:**

### 1. C1 is half-owned, half-laundered — multi-vein OR is not a warmth mitigation

**§2, §6 C1, §8 OV6**

The design correctly states sparsity as the *default* and empty-result as first-class. That part is tempered.

What is not: the **PARTIAL DEFENCE** “empty-first + multi-vein OR mitigates.” That confuses two different questions:

| Question | What multi-vein OR does |
|---|---|
| “Is the intersection of *any public signals* empty?” | Raises recall (maybe) |
| “Is there a *warm, receiptable reason to open*?” | Mostly does **not** |

`shared_dep` (~0.55) and `co_star` (~0.40) are affinity noise, not warm paths. “We both import `requests`” / “we both starred the same tool” is often **worse** than a good cold rhyme — more forensic, less human. So OR does not rescue C1 for the *product claim* (“warm every compose that can be warmed”); it only rescues a weaker claim (“sometimes emit *some* edge”).

OV6’s directional probe (simonw × carltongibson: **0 co-commit, 1 co-star**) already points at the real steady state: **co-commit empty is common even in best-case same-eco pairs.** The residual in C1 (same-eco win, cross-eco ~null) is not a footnote — it is the product boundary. The design still frames success as “universal compose-warming with graceful empty,” which is the wrong success metric.

**Empty-first is real. Multi-vein OR as C1 mitigation is hand-waving.** Strike OR from the C1 defence; keep it only as an explicit precision/recall experiment *after* co-commit hit *quality* is known.

---

### 2. FATAL missing failure mode: mega-repo false warmth

**§3.1, §3.3, §4 Stone 1, §6 C1 — nowhere**

The literature says collaboration edges are rare. The edges that *do* exist are disproportionately on **high-degree artifacts** (`torvalds/linux`, `homebrew/core`, `microsoft/vscode`, language orgs, tutorial repos, huge monorepos).

Intersection non-empty on those is **not** warmth. It is two people who both touched a city. At `co_commit` prior ~0.90 with “you literally shared a codebase,” the design will mint high-reliability lies.

This is not a polish filter. It **inverts C1’s measurement**:

- Count raw non-empty ∩ → overstate hit-rate with unusable hits  
- Count only intro-usable hits → hit-rate collapses further  

Stone 1 without a **hit definition** (e.g. exclude repos over contributor/star thresholds; require non-trivial contribution count on *both* sides; prefer co-temporal windows) will either:

- greenlight Stone 2 on junk intersections, or  
- kill the line while mis-attributing failure to “sparsity” rather than “signal definition”

**Structural fix, not a reliability prior:** drop or demote high-degree artifacts from the warm set. Do not guard them with 0.90 and hope compose’s prompt is tasteful.

---

### 3. C4 / OV1: instrument completeness is a *confounder* of the self-gate, not a side OV

**§3.2, §6 C4, §8 OV1, OV6**

Promoting Stone 1 to a measurement stone is correct. Sequencing inside it is not.

OV6 gates Stone 2 on hit-rate from `repositoriesContributedTo`. If that connection is truncated, privacy-filtered, contribution-type-skewed, or “lifetime-ish” in the wrong direction, measured hit-rate is a **lower bound polluted by blindness**. You can kill Stone 2 because GitHub hid the graph, not because the world is empty.

Also under-specified in RESEARCH→DESIGN handoff:

- Private / internal collab invisible → undercount (safe for FP, lethal for “near-zero → don’t build”)  
- COMMIT-only vs PR/ISSUE/REVIEW → many real collaborators are PR-only  
- User contribution privacy settings, org restrictions, fork vs upstream `nameWithOwner`  
- **No co-temporal constraint** — same repo 8 years apart is not a warm path  

**C4 is not “verify in Stone 1 then trust.”** It is: **instrument canary first (or joint), then hit-rate, and never interpret hit-rate alone.**

---

### 4. Stone 1 self-gate is *directionally* sound and *operationally* unenforceable

**§4, §8 OV6**

“Measure, then maybe don’t build Stone 2” is the right ritual. As written it will not hold under enthusiasm.

Missing, pre-committed:

1. **Threshold** — what is “near-zero”? 0/10? &lt;2/10? same-eco only? Without a number written *before* the run, 1 flashy hit will launder Stone 2.  
2. **Sample = real compose distribution** — not a convenience celebrity set. Hit-rate on “people enspyr actually `compose`s” is the only rate that matters. Same-eco / cross-eco strata are good; they must be labeled and reported separately (C1 residual is the real scope).  
3. **Hit quality** — mega-repo and non-cotemporal intersections must not count as hits (Finding 2).  
4. **Kill outcomes** — OV6 allows “standalone diagnostic + broker-weave later.” It underweights the honest third outcome: **do not productize weave; invest in cold `compose`.** Broker-weave is named as cost+dilution for a reason; it must not be the automatic consolation prize.

Also: OV6 says measure `co-commit ∪ shared-dep` inside Stone 1 while shared-dep is Stone 3 and the probe already showed **fake deps from metadata keys**. That contaminates the gate. **Stone 1 measurement = co-commit only (plus instrument canary).** Shared-dep is a separate recall experiment with its own false-positive budget.

---

### 5. C3: composite consent is named, then papered with the wrong substrate

**§5, §6 C3, RESEARCH §4c**

The design correctly falsifies “public bits ⇒ clean composite.” Good.

The proposed cage is weaker than the claim:

- **`LEAD` / funnel stage ≠ subject consent to a woven dossier.** Quote-request / BD lead is purpose for *outreach*, not purpose for *forensic collaboration-graph assembly*. Ethics literature’s “purpose + subject-expectation” line is asserted; the design never shows LEAD meets it.  
- **“Surfaced to the subject like `same_as`”** is unspecified. In the email? In a dossier UI the subject never sees? Receipted warmth in the *first line* can *increase* creep (“I’ve intersected our full public graphs”) even when each edge is public. Transparency is not automatically non-creepy.  
- **Open-source CLI reality:** gate-inside-`weave()` on dig tier is fail-closed for *missing fields*, not for *hostile operators*. dig runs on anyone; tier can be stamped by the same operator. For Nick-local BD this may be an accepted threat model — but then **say so**: “single-operator trust, not multi-tenant safety.” Rate-limit + self-log is theater against the operator; it is not a cage.  
- Injection surface is `target` — true — but the **dangerous coupling** is dig→weave→compose as an automatic pipeline. Optional human attach of a known shared artifact has a smaller blast radius than auto-weave on every compose.

C3 is not “solved by §5.” §5 names the monster and installs a **policy sticker**. Either harden (explicit operator attestation: “I have a legitimate BD purpose”; no bulk mode; default weave off in compose; never auto-run on bare name) or **name the tradeoff**: local trusted operator, consent is process not enforcement.

---

### 6. Wrong option-frame: warm *this* cold target vs start from edges that exist

**CRUCIBLE spark, DESIGN §1–2, rejected broker-weave**

Frame A/B in the docs:

- A: artifact-weave warms a predetermined `compose(target)`  
- B: if sparse, broker-weave / accept cold-open  

**C (dissolves much of the sparsity problem for BD):** invert for **discovery**, not warming.

Given stable \(R_U\), list co-contributors on **U’s small/medium repos** (contributor cap, both sides non-trivial). Those people are *definitionally* on a warm edge. Sparsity of random T×U pairs stops being the product’s load-bearing bet.

That is still the inverse query of the github excavator — aimed at **“who is warm-reachable?”** rather than **“is this cold target secretly warm?”** The current design locks `compose(target)` as fixed and forces weave to win a hostile prior (arbitrary T). That is why C1 dominates everything.

Even simpler **C0:** `compose` already has a receipt firewall — allow  
`compose(target, { shared_artifact: url })`  
from the operator when *they* already know the overlap. Zero GraphQL career-walk, zero stalking primitive, zero mega-repo auto-join. Automate weave only if Stone 1 shows operators **systematically miss** overlaps they would have wanted.

The design rejects “build all veins” and “LinkedIn 2nd degree” but never seriously prices **manual receipt + optional diagnostic** as the MVP that might make Stones 2–4 unnecessary.

---

### 7. Coupling that should be removed, not guarded

| Coupling | Design move | Better move |
|---|---|---|
| Any non-empty ∩ → preferred intro open (Stone 2) | empty check only | **Quality gate**: only `co_commit` on low-degree, co-temporal, dual non-trivial contribution; else cold-open |
| Weak veins into C1 “mitigation” | multi-vein OR | Remove from warmth claim; optional later |
| Reliability prior 0.90 on all co_commits | measure later (OV3) | **Don’t mint high prior on high-degree repos at all** |
| weave auto-invoked from compose | `{weave:true}` | Default **off**; opt-in per target after human glance at `augur weave` |
| LEAD tier as consent | fail-closed inside weave | Don’t pretend tier is consent; or require stronger attestation |

---

### 8. Build order: right skeleton, wrong definition of done for Stone 1

**§4 is mostly right:** co-commit only → measure → maybe compose → maybe weaker veins.

Adjust:

1. **Stone 1a — instrument canary (C4):** pagination completeness, contributionTypes coverage, known-pair positive control (two accounts you *know* share a small repo), mega-repo negative control.  
2. **Stone 1b — hit-rate on real BD targets** with pre-registered threshold + hit definition (no mega-repo, optional co-temporal).  
3. **Hard gate:** below threshold → **no Stone 2**; standalone CLI optional; do not auto-promote broker-weave.  
4. Stone 2 only with **quality-gated** facts and weave default-off.  
5. Stones 3–4 only if Stone 2’s *usable* hit-rate still hurts and weak veins pass a “does this beat cold-open in draft quality?” test — not mere non-empty rate.

---

**Concerns:**

- **Unstated assumption:** cold-open is the binding weakness of `compose`. Unfalsified. If cold rhyme quality is the real bottleneck, weave is elegant garnish even on hits.  
- **Unstated assumption:** dig always yields a correct github login + meaningful tier before weave. Namesake hazard is pushed upstream, not eliminated (C2 is only true *conditional* on dig being right — design admits this; still load-bearing).  
- **“Warm-without-creepy because receipted”** — receipts can *prove* the forensic method. Creep is not only private-graph; it is *unexpected intimacy from public data*.  
- **Asymmetry helps cost, hurts precision:** large \(R_U\) (wide contributor) raises accidental mega-repo ∩. U-cache is not free of product risk.  
- **Time / contribution weight ignored** — missing failure mode, not a v2 nicety.  
- **Open variables OV3/OV4** are fine as OVs; **OV6’s dual measurement (co-commit∪shared-dep)** is a contamination bug in the falsifier protocol.  
- **Named tradeoff that should be fixed before build:** mega-repo and hit definition. **Named tradeoff that may stay named:** single-operator trust model — but stop calling LEAD a consent spine until that model is explicit.

---

**The Good:**

- Sparsity stated **first** (§2) and empty-path as common case — enthusiasm did not fully capture the mold.  
- Correct rejection of Events / owned-repos / contributors-endpoint enumeration (RESEARCH §1, DESIGN §7).  
- U-cache + local intersection is the right cost shape.  
- Co-attendance killed for both queryability *and* consent — not just one.  
- C3 *named as false* rather than smuggled; rare honesty.  
- Stone 1 as measurement with authority to kill Stone 2 (OV6) is the right *kind* of self-gate — it needs teeth (threshold, sample, hit definition, instrument-first), not replacement.  
- Fact envelope reuse + receipt firewall is the correct integration surface when/if Stone 2 happens.  
- Core-first co-commit-only for the *reframe proof* is right; all-veins-at-once correctly rejected.

---

### What to change before APPROVE-for-Stone-1

1. **Rewrite C1 defence:** empty-first only; drop multi-vein OR as warmth mitigation; product scope = same-eco / known-graph, not universal.  
2. **Define HIT** (mega-repo exclusion, dual contribution floor, optional co-temporal window) before any rate is counted.  
3. **Pre-register** sample (real BD targets, stratified) + kill threshold + instrument canary plan (C4 before interpreting C1).  
4. **Stone 1 measure co-commit only**; do not ∪ shared-dep into the go/no-go number.  
5. **Consent:** either explicit single-operator threat model + weave default-off, or a real purpose attestation — stop equating LEAD with composite-consent cleanliness.  
6. **Price C0/C frames:** manual `--shared-artifact` and/or outbound co-contributor discovery — say why they lose to auto-warm of arbitrary T, or adopt one as MVP.  
7. **Stone 2 quality gate** in the design now (not as post-hoc prompt taste): non-empty is necessary, not sufficient.

---

**Arc to ground (the one future input that shakes the mold apart):**

> A real GraphQL run on ~10 *actual* `compose` targets, after mega-repo filtering, returns **zero intro-usable co-commits** — and the one non-empty intersections left are `homebrew/*` / language monorepos / drive-by PRs years apart.

At that frequency the enthusiasm’s spark (“cold email → warm email”) does not fire on the common path; multi-vein OR only offers creepy weak signals; Stone 2 becomes a pipeline that mostly prints `_weave: "no-path"`. The resonant product is then either **outbound warm-target discovery from \(R_U\)**, **operator-supplied receipts**, or **better cold compose** — not artifact-weave-as-universal-warmer.

Until the measurement protocol can *detect* that arc (not launder it as “1 co-star counts” or “shared_dep saved us”), the design is not ready to cast Stone 1.
