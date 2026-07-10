## MaxwellMergeSlam's Review (design temper)

`John McClane: "Welcome to the party, pal."` — but this party's got a bouncer who firewalls his own guests.

**Verdict:** REQUEST_CHANGES

**Summary:** The reframe is sound and the empty-first honesty is real, but two domain-local design flaws would make weave-into-compose silently useless on a HIT, not just on the sparse miss — the receipt-firewall rejects weave's own receipts, and a flat co_commit prior treats a 3000-contributor mega-repo as "warm."

**Fatal flaws (fold back before build):**

- **M1 — the receipt-firewall FIREWALLS OUT weave's receipts (the "for free" claim is false).** DESIGN §3.1 says weave facts flow into compose's existing firewall "for free." I read `src/compose.mjs`: the firewall is `targetSources = new Set(t.studyFacts.map(f => f.source))` and keeps only receipts whose `source ∈ targetSources`. But `study` builds `targetSources` from the target's **top-8-BY-STARS OWNED repos**. A co-committed shared repo is, by construction, very often NOT in that set — it's a repo the target *contributed to* (owned by a third party, or owned by US). So a legitimate weave receipt (`github.com/thirdparty/repo`) would be rejected as "not in target's public work" and land in `cut[]`. **On a successful weave, compose would firewall the warm receipt out and fall back to cold-open anyway.** The fix is a design change, not a footnote: the firewall's trusted-source set must be UNIONed with weave's independently-verified shared-artifact sources (weave verified them against the real GitHub API, so they're first-class receipts, not model-asserted ones). Until §3.1 says that, Stone 2 is built on sand.

- **M4 — flat co_commit=0.90 conflates "co-committed" with "warm"; a mega-repo co-commit is noise.** DESIGN §3.1 gives `co_commit` a flat 0.90 prior. But two people who both landed one commit in `tensorflow/tensorflow` (3000+ contributors) share an artifact and ZERO relationship — it's a false warm-path that would produce a mortifying intro ("I see we both contributed to TensorFlow!"). Warmth is **inversely proportional to the repo's contributor count**: co-committing a 3-person repo is genuinely warm; a 3000-person repo is a coincidence. The design needs a contributor-count (or repo-size) weighting on the co_commit signal, not a flat prior. This is the resonant frequency the whole thing rings at — the sparse-overlap falsifier (C1) says hits are RARE, so the few hits you DO get had better be real, and a mega-repo hit is the most common kind of false hit.

**Concerns (name as tradeoff or fix):**

- **M2 — the consent-tier plumbing doesn't exist yet.** §5 gates weave behind the LEAD/NODE consent tier, and §OV4 says the gate lives in `weave()`. But `compose(target, us)` today takes bare handle strings and calls `study`→`dig` with no tier threaded through. "Gate behind the consent spine" is a real plumbing task (thread tier from dig's result → compose → weave), not a flag. Name it as Stone 0 or fold it into Stone 1's scope, don't leave it implicit.

- **M5 — Stone 1's self-gating threshold is unnamed.** §OV6 says "if hit-rate near-zero, don't build Stone 2" — but "near-zero" is un-preregistered and will be rationalized post-hoc under build-momentum. Name the number now (e.g. "<20% of same-eco pairs yield ≥1 non-mega-repo shared artifact → Stone 2 is not justified").

**The Good:**
- The empty-first framing (§2, §4a) is the honest heart — "no warm path" as the common-case default, not an edge case, is exactly right and rare to see designed in.
- Promoting Stone 1 to a measurement stone that can INVALIDATE Stone 2 (§OV6) is the build order gating itself on its own falsifier. That's the discipline.
- Killing co-attendance as a dead vein (§7) instead of hand-waving it as "future" is honest.
- The composite-profile consent cut (§5) — each artifact public ≠ woven composite consent-clean — is the load-bearing insight and it's stated, not buried.
