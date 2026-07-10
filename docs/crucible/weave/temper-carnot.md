## CarnotCodeCarver (design temper)

**Verdict:** REQUEST_CHANGES

**Summary:** Stone 1 is directionally valuable as a measurement spike, but the design still smuggles too much product certainty into an empirical unknown. The biggest flaw is that it treats shared public artifacts as a warm intro path, when many of the proposed edges are only relevance evidence, not social warmth. Build only a narrower measurement/provenance spike after tightening consent gates, completeness criteria, and kill thresholds.

**Findings:**
- §2 and §6 C1 understate that multi-vein OR may not mitigate sparsity; it may just convert “no warm path” into weak or misleading warmth. Shared dependencies and co-stars increase recall by lowering semantic quality, so they do not falsify the “inert for compose” risk unless the metric distinguishes true warm openers from merely shared trivia.
- §4 and §8 OV6 make Stone 1 both the product implementation and the falsification instrument, which is a risky coupling. If Stone 1 must verify hit-rate before Stone 2, it should be scoped explicitly as a throwaway or measurement-grade spike with predefined cohorts, thresholds, and output labels, not as a shippable verb whose existence biases the decision to continue.
- §8 OV6 says the first deliverable measures co-commit ∪ shared-dep across about 10 pairs, but §4 Stone 1 is GitHub co-commit only and shared-dep is Stone 3. That is an internal build-order contradiction: the stated falsifier cannot be measured by the first stone as specified.
- §6 C4 is not adequately contained by “verify in Stone 1.” The design depends on `repositoriesContributedTo` for correctness in §3.2, but has no fallback completeness strategy if it truncates, omits PR-only contributions, mishandles forks, excludes deleted/transferred repos, or differs from contribution-calendar semantics. The design needs a defined completeness contract and degraded modes before implementation.
- §5’s consent gate is underspecified. “LEAD/consented NODE” can become a label an operator applies to anyone, which does not actually solve composite consent. The design needs fail-closed authorization semantics: who can mint a LEAD, what evidence of consent or legitimate interest is required, what is logged, what is shown to the subject, and how bulk lookup is technically prevented.
- §5 says the composite is surfaced to the subject, but §4 Stone 2 feeds facts into `compose`, which drafts outbound messages. That is backwards for consent: the composite exists and influences outreach before the subject sees it. If surfacing is the ethical control, it must happen before or inside the first contact in a constrained, minimal form.
- §1 frames shared public artifacts as warm intros, but a shared repo or dependency is not the same as an introduction path. A warm intro normally implies an intermediary relationship or prior interaction; artifact overlap is better described as a receipted relevance hook. This wrong option-frame inflates the value claim and should be corrected throughout the design.
- §3.1’s reliability priors mix identity reliability with outreach appropriateness. A GitHub login may make a co-commit fact accurate, but it does not make the opener socially welcome or warm. The design needs separate scores for factual confidence, identity confidence, signal strength, and consent/appropriateness.
- §4’s “ships value alone” claim is overconfident. A standalone `augur weave <target>` may be useful as an audit/debug tool, but if hit-rate is near-zero or signals are weak, shipping it creates surveillance surface without product value. Treat it as internal measurement until the falsifier passes.
- §7 rejects private-graph and all-vein builds, but misses the simpler alternative: keep `compose` cold, improve it with target-specific public receipts, and add an optional manual “known connection/shared artifact” field supplied by the operator. That dissolves much of the API, consent, and sparsity problem while preserving the BD outcome.

**Concerns:**
- Define the Stone 1 kill gate before building: target cohort, same-ecosystem versus cross-ecosystem buckets, minimum hit-rate, acceptable false-warm rate, and what counts as a compose-improving result.
- Rename or reframe the output from “warm path” to “shared public artifact” or “receipted relevance hook” unless there is an actual introducer or prior interaction.
- Move consent enforcement from a named policy to a concrete authorization check with auditable inputs, per-target logs, batch limits, and refusal on ambiguous consent tier.
- Separate measurement from productization: first build a private evaluator for GitHub contribution-set extraction and completeness testing, then decide whether a public `weave` verb is justified.
- Add a fallback plan for C4 failure, such as using `contributionsCollection` with truncation detection, bounded yearly windows, explicit “incomplete result” labels, or declining to assert no-overlap when the source is incomplete.

**Good:**
- §2 correctly states that empty intersection is the common case and requires graceful fallback instead of promising universal warmth.
- §3.2 correctly rejects the Events API, owned-repos endpoint, and contributors enumeration traps, and the asymmetry in §3.3 is the right operational shape if the GitHub instrument proves complete enough.
- §5 correctly identifies composite consent as distinct from publicness of individual artifacts and explicitly refuses co-attendance/physical-presence inference.
- §6 is unusually honest about falsifiable claims, especially C1, C3, and C4, and §8’s decision not to build Stone 2 if hit-rate is near-zero is the right instinct.
