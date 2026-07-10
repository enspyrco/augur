# `weave` — HEAT / Deep Research

*Crucible research movement for augur's `weave` verb: finding warm-intro paths in the PUBLIC collaboration graph (co-committed repos, shared deps, co-authored papers, co-attended events, co-stars) as the inverse query of augur's `github` excavator, feeding `compose`.*

Date: 2026-07-11 · Sources cited inline as real URLs.

---

## TL;DR (the decision-relevant findings)

1. **The "all repos a user contributed to" query has no clean REST path — GraphQL `contributionsCollection` is the real instrument, and it is windowed to ~1 year and capped.** `commitContributionsByRepository(maxRepositories: 100)` returns at most 100 repos, **has no pagination**, and only covers the date range you pass (max 1yr per call). The paginated escape hatch is the `repositoriesContributedTo` connection (`first: 1..100`, cursor-paged). Both need auth. ([GitHub community #151261](https://github.com/orgs/community/discussions/151261), [#112637](https://github.com/orgs/community/discussions/112637))

2. **Real public-artifact overlap between two arbitrary people is SPARSE — this is the load-bearing risk.** GitHub collaboration networks are empirically sparse; density *peaks early and declines* as the graph grows, "collaboration between users happens on a small fraction of projects, and reciprocity of social ties is very low" ([arXiv 1407.2535](https://arxiv.org/pdf/1407.2535), [arXiv 2109.11587](https://arxiv.org/pdf/2109.11587)). Most random target/us pairs will share **zero** co-committed repos. `weave` must degrade gracefully to weaker veins (shared dependency, co-star) and to "no warm path found" — the empty-intersection case is the *common* case, not the edge case.

3. **Vein ranking (queryable-publicly × signal-strength):** co-commit (GitHub) **[strong, queryable]** > co-authorship (OpenAlex/ORCID) **[strong signal, queryable but now needs a free API key as of Feb 2026]** > shared-dependency (GitHub + package registries) **[medium, queryable]** > co-star (GitHub) **[weak signal, queryable but noisy]** > co-attendance (luma/meetup) **[strong signal IF present, but effectively NOT publicly queryable — aspirational/scrape-only]**.

4. **OpenAlex changed under us.** The classic "free, no key, `mailto` polite pool, 100k/day @ 10/sec" is **deprecated as of Feb 13, 2026** — API keys are now required (free key = 100k credits/day; no key = ~100 credits then `409`). The vein is still very much alive and free-tier-viable, but the "no key" framing in the brief is stale. ([openalex-users announcement](https://groups.google.com/g/openalex-users/c/rI1GIAySpVQ))

5. **Nobody does the "shared-artifact-as-warm-path" move cleanly.** WarmIntro uses the *private* LinkedIn graph (the anti-pattern). OSS Social Graph Builder maps *internal* team collaboration, not cross-network intro paths. Academic co-author tools (Connected Papers, Semantic Scholar) surface the graph but don't frame it as an intro primitive. The shared-public-artifact-as-warm-path niche is **genuinely open** — and its twin risk (a stalking primitive on a non-consenting private individual) is why augur's consent spine is the thing that makes this shippable rather than creepy.

---

## 1. GitHub API ground truth

### The core question: "did target T and us U both contribute to repo R?"

There are three candidate strategies. Two are traps.

**Trap A — Events API.** `GET /users/{username}/events` (public activity) is capped to **300 events / ~30 days, public only** ([REST activity/events docs](https://docs.github.com/en/rest/activity/events); confirmed limit "up to 300 events, only events created within the past 30 days"). This is a rolling recency window, not a history. Useless for "has this person ever touched R."

**Trap B — `GET /users/{username}/repos`.** Lists only repos the user **publicly owns** — explicitly *not* repos they contributed to as a collaborator/PR author ([REST repos docs](https://docs.github.com/en/rest/repos/repos); the endpoint "will not include repositories the user only has collaborator access to"). Owned ≠ contributed-to.

**The real instrument — GraphQL `contributionsCollection`.** ([community #151261](https://github.com/orgs/community/discussions/151261))

```graphql
query($user: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $user) {
    contributionsCollection(from: $from, to: $to) {
      totalRepositoriesWithContributedCommits
      commitContributionsByRepository(maxRepositories: 100) {
        repository { nameWithOwner }
        contributions { totalCount }
      }
    }
  }
}
```

Two hard limits, both load-bearing for `weave`'s design:
- **Date window ≤ 1 year per call.** `contributionsCollection` accepts a `from`/`to` range; GitHub rejects ranges > 1yr. Covering a 10-year career = **~10 sequential queries per person**, walking the window back year by year. ([community #5584](https://github.com/orgs/community/discussions/5584), [#24350](https://github.com/orgs/community/discussions/24350))
- **`maxRepositories: 100`, NO pagination.** `commitContributionsByRepository` tops out at 100 repos per window and *cannot be paged* — a prolific dev in a busy year silently truncates. Check `totalRepositoriesWithContributedCommits` to detect truncation. ([community #112637](https://github.com/orgs/community/discussions/112637) — "does not support paging"). Also note it only counts **commit** contributions here; PRs/issues/reviews live in sibling connections (`pullRequestContributionsByRepository`, etc.).

**Paginated alternative:** the `repositoriesContributedTo` connection on `User` (`first: 1..100`, cursor-paged, `contributionTypes: [COMMIT, PULL_REQUEST, ...]`) — properly pageable but returns a *lifetime-ish* flat list without the per-year contribution counts. This is the better primitive for a pure "set of repos touched" set-intersection.

### The cheapest reliable way to compute the intersection

The asymmetry is the whole trick, and it's exactly augur's inverse-query insight:

- **U (us / the augur operator) is known and stable.** Compute U's contributed-repo set **once**, cache it. This is the "who am I" half — cheap, amortized to zero.
- **T (the target) is the variable.** Per target, run the yearly `contributionsCollection` walk (or `repositoriesContributedTo` pages) to get T's repo set.
- **Intersection is local set math** (`R_U ∩ R_T`), zero further API calls. **Do NOT** call `GET /repos/{owner}/{repo}/contributors` to "verify" — that endpoint is a trap (below), and the intersection is already authoritative from the two contribution sets.

This is O(years_T) GraphQL calls per target with U pre-cached — the cheapest possible shape. **Never** invert to "list every contributor of every repo U touched and scan for T" — that's the `contributors` endpoint fan-out, which explodes.

### Why NOT the contributors endpoint (the tempting-but-wrong path)

`GET /repos/{owner}/{repo}/contributors` lists contributors to **one** repo, `per_page` max 100, cursor-paged. Two documented killers ([REST repos docs, "List repository contributors"](https://docs.github.com/en/rest/repos/repos#list-repository-contributors)):
- **"only the first 500 author email addresses in the repository link to GitHub users. The rest will appear as anonymous contributors"** — so on any large repo, T may be present but returned *anonymous* (no login), i.e. a false negative.
- Contributor data is **cached "a few hours old."**

Use it only as a fallback existence-check on a *specific small* repo, never as the enumeration engine.

### Rate limits — REAL numbers, cited

| Surface | Limit | Source |
|---|---|---|
| REST authenticated (primary) | **5,000 req/hr** per user | [REST rate-limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) |
| REST unauthenticated | **60 req/hr** per IP | same |
| REST secondary | **100 concurrent**, **900 points/min**, 90s CPU / 60s real | same |
| GraphQL authenticated (primary) | **5,000 points/hr** (query cost ≥1 point, scales with nodes) | [GraphQL rate-limits](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api) |
| GraphQL secondary | **2,000 points/min**, **100 concurrent** | same |
| GraphQL node ceiling | `first`/`last` ∈ 1..100; **≤ 500,000 total nodes/call** | same |
| **Search API (authenticated)** | **30 req/min** (most), **9 req/min** (code search) | [Search rate-limit](https://docs.github.com/en/rest/search/search#rate-limit) |
| Search API (unauthenticated) | **10 req/min** | same |
| Stargazers / user-starred | standard REST 5,000/hr, `per_page` 100 | [starring docs](https://docs.github.com/en/rest/activity/starring) |

**Budget implication:** at 5,000 GraphQL points/hr and ~10 yearly calls/target, the naive ceiling is generous (~hundreds of targets/hr), but the **2,000 points/min secondary limit** is the real throttle for a burst. `weave` should batch per-target with a token-bucket, and never touch the Search API for enumeration (30/min is a cliff).

---

## 2. The other veins, briefly (ranked, honestly labelled)

| Vein | Publicly queryable? | Signal strength | Verdict |
|---|---|---|---|
| **Co-commit (GitHub)** | ✅ GraphQL `contributionsCollection` | Strong — you literally worked on the same codebase | **LIVE, primary vein** |
| **Co-authorship (OpenAlex)** | ✅ but now **key-gated** (free key) | Strong — co-authored a paper | **LIVE, secondary** |
| **Co-authorship (ORCID)** | ✅ public API, no user auth (institution creds for search) | Strong | **LIVE, corroborating** |
| **Shared dependency (GitHub + registry)** | ✅ (SBOM/`dependency-graph`, package registries) | Medium — you both depend on X, weaker as a *warm* signal | **LIVE, weak-warm** |
| **Co-star (GitHub)** | ✅ `/stargazers` + `/users/{u}/starred` | Weak — a star is cheap, low intent | **LIVE, low-signal, high-noise** |
| **Co-attendance (luma / meetup)** | ❌ **not reliably public** | Strong IF present | **ASPIRATIONAL / scrape-only — do NOT ship as a live vein** |

### OpenAlex (co-authorship) — LIVE but re-priced

- Query is real: `GET https://api.openalex.org/works?filter=author.id:A123|A456` returns works co-authored by both ([filter-works docs](https://github.com/ourresearch/openalex-docs/blob/main/api-entities/works/filter-works.md), [get-a-single-author](https://docs.openalex.org/api-entities/authors/get-a-single-author)). Filtering `author.id:A1` then intersecting work-sets, OR the multi-author filter, both work.
- **The "free, no key" premise in the brief is STALE.** As of **Feb 13, 2026** OpenAlex requires an API key: free key → **100,000 credits/day**; no key → ~**100 credits then `409`**. The old **`mailto` polite pool (100k/day @ 10/sec) is explicitly deprecated** ("No more polite pool… Keys only from here on out"). Singleton = 1 credit, list = 10 credits. Raw dataset stays CC0. ([openalex-users announcement](https://groups.google.com/g/openalex-users/c/rI1GIAySpVQ), [pricing](https://help.openalex.org/hc/en-us/articles/24397762024087-Pricing)). Net: still free-tier-viable for `weave`, but the design must carry an API key, not a `mailto`.

### ORCID — LIVE, corroborating

Public API works without per-user OAuth (institution/public credentials yield a `/read-public` token); search caps at **10,000 results**, token endpoints rate-limit at **48 req/s (burst 75)** → `503` ([ORCID search tutorial](https://info.orcid.org/documentation/api-tutorials/api-tutorial-searching-the-orcid-registry/), [v3.0 rate-limit thread](https://groups.google.com/g/orcid-api-users/c/ehv8sCfs-ZM)). Best use: **namesake disambiguation** for the OpenAlex vein (an ORCID iD is a strong identity anchor), not primary enumeration.

### Shared dependency — LIVE, weak-warm

Queryable via GitHub's dependency graph / SBOM export and package registries. But "we both `import requests`" is barely warm — treat as a tie-breaker, not a headline path.

### Co-star — LIVE, low-signal

`GET /repos/{o}/{r}/stargazers` and `GET /users/{u}/starred` (note: user-starred defaults to 30/page, page to 100). A star costs one click; co-starring the same niche repo is *weakly* correlated with shared interest. Tool prior art exists (Stargazer returns repos + shared stargazers, [pabroux/stargazer](https://github.com/pabroux/stargazer)). Keep as a last-resort warmth signal.

### Co-attendance (luma / meetup) — **ASPIRATIONAL, name it dead**

This is the vein most likely to launder into the design as "live" when it isn't:
- **Luma's official API** manages *your own* events; guest lists are **host-only / login-gated**, and email/phone/ticket are host-only. A logged-in attendee sees the guest list "as it appears on the event page" *only if the host enabled it* ([Luma API help](https://help.luma.com/p/luma-api)). There is **no public "who attended event X" endpoint** for arbitrary events, and certainly no "what events did person P attend" reverse index.
- The only path to co-attendance data is **third-party scrapers** (Apify actors: [luma-get-attendees](https://apify.com/forkoff/luma-get-attendees), [luma-events](https://apify.com/aitorsm/luma-events/api)) — ToS-fragile, per-event, and still can't do the reverse "events per person" query weave needs.
- **Meetup** deprecated its open REST API; current access is GraphQL behind a paid Pro / OAuth tier, no public attendee-history-per-person query.

**Verdict: co-attendance is a dead vein for a consent-clean public tool.** Ship it as "future / manual-import only," never as an automated excavator. A co-attendance edge implies *physical-presence* inference, which is also the sharpest consent/abuse edge (§4).

---

## 3. Prior art — who does the "shared-artifact-as-warm-path" move?

| Tool | Graph used | Warm-intro framing? | What they got wrong / limit |
|---|---|---|---|
| **LinkedIn "mutual connections"** | **Private** social graph | Yes (the canonical warm intro) | The anti-pattern — requires both parties in a closed graph; no public/consent story; can't reach outside the walled garden ([OSINT ethics on private graphs](https://privacyinsightsolutions.com/blog/osint-ethics-spectrum)) |
| **WarmIntro** ([Product Hunt](https://producthunt.com/products/warmintro)) | LinkedIn profile vs company | Yes — surfaces employees you "have genuine connections with" (shared uni/employer/city) | Rides the **private** LinkedIn graph + *attribute* overlap (same city), not *artifact* co-creation. Warmth-by-similarity, not warmth-by-shared-work. |
| **Clay / ZoomInfo / PDL** | Universal contact directories | No — enrichment, not path-finding | Directory lookup ≠ warm path; they tell you *who* someone is, not *what you share* |
| **Connected Papers / Semantic Scholar** | Academic co-author/citation graph | No — discovery, not intro | Surface the co-author graph beautifully but never frame an edge as "your warm intro"; no cross-domain (github↔papers) fusion |
| **OSS Social Graph Builder** ([getunblocked](https://getunblocked.com/blog/oss-social-graph-builder/)) | GitHub PR-review history | No — **internal team map** | "Focuses exclusively on internal team mapping — does not find introduction paths between people or external networks." Closest *mechanism*, wrong *target* |
| **Stargazer** ([pabroux/stargazer](https://github.com/pabroux/stargazer)) | GitHub stargazers | No — repo recommendation | Finds shared *stargazers between repos*, not warm paths between *people* |
| **MailAccess** ([KatrielMoses/MailAccess](https://github.com/KatrielMoses/MailAccess)) | Email → 2500+ platform identity graph | No — **pentest recon** | **Structural twin of augur's `dig`**: fans out from one seed across public sources (GitHub commits, Gravatar, Wayback, breach DBs) to build an identity graph. Same excavation muscle, siloed in offensive-security framing (a "Defender's Brief," STIX/Maltego output). It builds the *identity* graph but never re-frames a shared node as a *warm intro* — the BD/relationship reframe is exactly augur's move. |

**The gap is real.** Everyone either (a) uses the private graph (LinkedIn/WarmIntro — the anti-pattern), (b) maps collaboration *internally* (OSS Social Graph Builder), (c) surfaces the co-author graph without the intro reframe (academic tools), or (d) excavates identity for *security* not *relationship* (MailAccess). **No shipped tool does "shared PUBLIC artifact → warm intro path" as a first-class BD primitive.** That's `weave`'s open lane — and the reason it's open is that the same capability pointed at a non-consenting private individual is stalkerware, which is the constraint the rest of the field avoided by staying in walled gardens.

---

## 4. Failure modes / constraints already known

### 4a. Empty-intersection is the COMMON case (the headline constraint)

Real public collaboration overlap is **sparse**. Multiple studies: GitHub collaboration density "peaks early and then declines sharply"; "collaboration between users happens on a small fraction of projects, and reciprocity of social ties is very low" ([arXiv 1407.2535 *Coding Together at Scale*](https://arxiv.org/pdf/1407.2535), [arXiv 2109.11587](https://arxiv.org/pdf/2109.11587)). Design consequences:
- **Most target/us pairs share ZERO co-committed repos.** `weave` returning "no warm path" must be a first-class, non-embarrassing outcome — not a bug.
- **Multi-vein OR is the mitigation**: co-commit ∪ co-author ∪ shared-dep ∪ co-star widens the surface. But each weaker vein trades precision for recall — a co-star is a warm-ish path only in aggregate.
- **The 2-hop path** ("we both know person P who co-committed with T") multiplies coverage but explodes API cost and dilutes warmth. Recommend: 1-hop direct artifacts only for v1; name 2-hop as a costed future stone, not a v1 promise.

### 4b. Namesake collision (augur's `dig` already bled on this)

- **OpenAlex/ORCID:** a name match is a **namesake magnet** — "J. Smith" fans out to dozens of authors. OpenAlex author disambiguation is imperfect ([accuracy assessment, arXiv 2502.11610](https://arxiv.org/pdf/2502.11610)). **Never** intersect on name; intersect on **OpenAlex author ID / ORCID iD** only. Use ORCID as the identity anchor that pins the OpenAlex author.
- **GitHub:** login is unique, so co-commit is namesake-safe *if* you have the login — but resolving "person named X → github login" is itself the namesake problem one layer up (this is `dig`'s known hazard). Weave should consume an *already-resolved* github login from `dig`, not re-resolve.
- **Cross-vein fusion is where collisions compound:** matching a github login to an OpenAlex author to a luma handle multiplies false-join risk. Require ≥2 corroborating identity anchors before fusing veins.

### 4c. Consent — the axis that separates BD tool from stalkerware

Consent is **not** uniform across veins — this maps directly onto augur's consent spine (NODE/LEAD):
- **Co-commit to a public repo → consent-clean.** Both parties chose to publish code under a public license; the collaboration is itself a public act. Strongest consent footing.
- **Co-authorship (OpenAlex/ORCID) → consent-clean.** Publishing a paper is a public professional act; ORCID is opt-in self-published identity.
- **Co-star → murky.** A star is a low-intent public signal; inferring a *relationship* from it over-reads. Consent-clean as data, weak as inference.
- **Co-attendance → NOT consent-clean** even if scrapeable. Attending an event is not publishing a durable artifact; it implies physical presence and social context the attendee didn't consent to being indexed and reverse-queried. This is a second reason (beyond §2's "not queryable") to keep it dead.

**The composite-profile principle** (directly from OSINT ethics literature): "the public availability of each data point does not resolve the consent question for the composite profile — if the dossier being built would alarm the subject if they knew it existed… the unwanted criterion is engaged" ([EITHOS](https://eithos.eu/open-source-intelligence-osint-its-legal-and-ethical-aspects/), [PI Solutions OSINT-vs-stalkerware](https://privacyinsightsolutions.com/blog/osint-vs-stalkerware-surveillance-line)). Each public artifact being individually consent-clean does **not** make the woven composite consent-clean. augur's consent spine (the target has entered the funnel — requested a quote / is a `LEAD`) is what supplies the *purpose + subject-expectation* that the ethics literature says is the actual dividing line.

### 4d. Abuse potential — weave is a stalking primitive if uncaged

"The methodology of OSINT and stalkerware-enabled surveillance share significant technical overlap; the distinction lives in the behaviour, the intent, and the pattern" ([PI Solutions](https://privacyinsightsolutions.com/blog/osint-vs-stalkerware-surveillance-line)). Pointed at a consenting BD lead, `weave` warms a legitimate intro. Pointed at a non-consenting private individual, the *identical* query builds a "surprisingly intimate portrait… that could be used for harassment or stalking" ([OSINT.uk ethical implications](https://www.osint.uk/content/ethical-implications-of-osint-in-personal-data-collection)). Non-negotiable design gates:
- **Gate weave behind augur's consent spine** — only run against a `LEAD`/consented `NODE`, never an arbitrary name. This is the cage-before-monster requirement.
- **Receipt every edge** (feeds naturally into `compose`'s receipt-firewall): every warm path must carry its provenance URL (the exact repo/paper/PR), so the intro is *auditable* and the operator can't fabricate warmth.
- **Refuse co-attendance / physical-presence inference** by construction.
- **Rate-limit + log** target lookups so weave can't be turned into a bulk-surveillance sweep.

### 4e. Rate-limit exhaustion (operational)

The dominant cost is the **per-target yearly GraphQL walk** (~10 calls) plus OpenAlex credits. With U pre-cached and set-intersection done locally, a single target is cheap; a *batch* of targets hits the **GraphQL 2,000 points/min** secondary limit before the 5,000/hr primary. Token-bucket the batch, cache aggressively (contribution sets are slowly-changing), and never route enumeration through the Search API (30/min cliff).

---

## Sources

- GitHub — [contributionsCollection / contributed-repos discussion #151261](https://github.com/orgs/community/discussions/151261), [#112637 (no paging)](https://github.com/orgs/community/discussions/112637), [#5584](https://github.com/orgs/community/discussions/5584), [#24350](https://github.com/orgs/community/discussions/24350)
- GitHub REST — [repos endpoints](https://docs.github.com/en/rest/repos/repos), [list contributors (500-email cap)](https://docs.github.com/en/rest/repos/repos#list-repository-contributors), [events (300/30d)](https://docs.github.com/en/rest/activity/events), [starring](https://docs.github.com/en/rest/activity/starring)
- GitHub limits — [REST rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api), [GraphQL rate limits](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api), [Search rate limit](https://docs.github.com/en/rest/search/search#rate-limit)
- OpenAlex — [filter works](https://github.com/ourresearch/openalex-docs/blob/main/api-entities/works/filter-works.md), [single author](https://docs.openalex.org/api-entities/authors/get-a-single-author), [API-key transition announcement (Feb 13 2026)](https://groups.google.com/g/openalex-users/c/rI1GIAySpVQ), [pricing](https://help.openalex.org/hc/en-us/articles/24397762024087-Pricing)
- ORCID — [search tutorial](https://info.orcid.org/documentation/api-tutorials/api-tutorial-searching-the-orcid-registry/), [rate limits thread](https://groups.google.com/g/orcid-api-users/c/ehv8sCfs-ZM)
- Luma — [API help (host-only guest lists)](https://help.luma.com/p/luma-api); scrapers: [Apify luma-get-attendees](https://apify.com/forkoff/luma-get-attendees), [Apify luma-events](https://apify.com/aitorsm/luma-events/api)
- Prior art — [WarmIntro](https://producthunt.com/products/warmintro), [OSS Social Graph Builder](https://getunblocked.com/blog/oss-social-graph-builder/), [Stargazer](https://github.com/pabroux/stargazer), [MailAccess](https://github.com/KatrielMoses/MailAccess)
- Sparsity — [arXiv 1407.2535 Coding Together at Scale](https://arxiv.org/pdf/1407.2535), [arXiv 2109.11587 Community Formation on GitHub](https://arxiv.org/pdf/2109.11587)
- Namesake — [OpenAlex accuracy assessment, arXiv 2502.11610](https://arxiv.org/pdf/2502.11610)
- Ethics/consent — [EITHOS OSINT legal/ethical](https://eithos.eu/open-source-intelligence-osint-its-legal-and-ethical-aspects/), [PI Solutions OSINT-vs-stalkerware](https://privacyinsightsolutions.com/blog/osint-vs-stalkerware-surveillance-line), [OSINT.uk ethical implications](https://www.osint.uk/content/ethical-implications-of-osint-in-personal-data-collection)
