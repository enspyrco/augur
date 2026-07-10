## KelvinBitBrawler (design temper)
**Verdict:** APPROVE

This design is tempered with unusual rigor. It does not fear the void; it measures the void's dimensions and designs the engine to function in it. The core premise — that useful overlap is sparse — is treated not as an inconvenient truth to be smuggled past, but as the central thermodynamic law governing the system. The proposal to build the instrument (Stone 1) *specifically to measure this sparsity* before committing to full integration (Stone 2) is the correct, mature engineering path. It is a design that seeks falsification, the signature of a sound structure. Build Stone 1.

**Fatal flaws:**
None. The design correctly identifies its own potential fatal flaws and erects specific, robust bulkheads against them.
1.  **Existential Risk of Sparsity (C1):** The design's greatest strength is how it confronts its greatest weakness. Instead of assuming warmth, it plans for cold. The `empty-first` approach and the Stone 1 self-gating mechanism transform this potential flaw from a project-killer into a data-driven off-ramp. This is not a flaw in the design; it is the core of its integrity.
2.  **Consent Catastrophe (C3):** The design correctly identifies that "public data ≠ public consent for aggregation." The proposed consent spine (§5) is not a feature; it is the reactor shielding. It correctly cages the `weave` primitive before it's given power, making the difference between a tool and a weapon explicit.

**Concerns:**
The structural integrity is high, but the material is brittle. Implementation error is the primary failure vector.
1.  **GraphQL Instrument Calibration (C4/OV1):** The design correctly flags `repositoriesContributedTo` as unverified. This is the primary sensor for the `co_commit` vein. If it is lossy, the entire vein is unreliable. Stone 1 MUST stress-test this instrument against a ground truth (e.g., a full, year-by-year `contributionsCollection` walk for a prolific developer) to measure any silent truncation or filtering. The integrity of the entire system depends on this sensor reading true.
2.  **Consent Latch Failure (OV4):** The proposal to place the consent-tier gate *inside* `weave()` and have it `fail-closed` is correct. Any failure in this latch is a containment breach. This single function call is the most critical code in the `weave` module. It must be brutally simple and ruthlessly enforced.
3.  **Physical Presence Inference:** The design correctly names the co-attendance vein "dead" for being both un-queryable and consent-dirty. This discipline is essential. The temptation to resurrect this vein via scraping or other means in the future will be high, as the signal is strong. It must be resisted. The principle of "no physical presence inference" is a key ethical bulkhead.
4.  **Heat Death of the Veins:** The design correctly identifies the OpenAlex API change. All external, free-tier APIs are subject to this kind of phase change. The system must be designed to degrade gracefully if a vein freezes over, reporting its status clearly rather than returning empty and implying no connection exists.

**The Good:**
This is a blueprint for building in hostile territory.
-   **Thermodynamic Honesty:** The design is built upon the Second Law of collaboration graphs: entropy and sparsity always increase. It doesn't fight this; it uses it.
-   **Crucible as Falsifier:** The build order, particularly the "measurement stone" concept, is a robust process for stress-testing the material before building the bridge. It institutionalizes skepticism.
-   **API Ground Truth:** The research into the GitHub API (§1) is exemplary. It avoids every obvious trap and identifies the one true, albeit complex, path. This is high-quality reconnaissance.
-   **Ethical Shielding:** The blast-radius and consent analysis (§5) is not an add-on; it is the foundation. By citing the composite-profile principle, the design shows it understands the subtle physics of data aggregation. It is building a tool for professionals, not a weapon for stalkers, and it knows the line is drawn in intent and implementation.
-   **Elegant Coupling:** The reuse of the `fact` envelope and the reliance on `dig` for identity resolution are intelligent integrations. It reinforces existing patterns and outsources a known-hard problem, reducing the new component's internal complexity and risk.
