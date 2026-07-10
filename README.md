# Augur

A people-intelligence **engine**: given a name or a handle, excavate the *public* artifact
trail a person leaves across the open web, and turn scattered signals into
provenance-stamped, confidence-scored facts.

Every fact Augur emits carries where it came from and how much to trust it:

```json
{ "predicate": "email", "value": "…", "method": "gpg_uid", "reliability": 0.97, "vein": "github" }
```

## The loop

```
resolve → dig → fuse → refute → place
```

- **resolve** — a name (+ optional city/country) → a GitHub handle, before you dig.
- **dig** — multi-vein excavation of a single individual (see veins below).
- **fuse** — join facts across veins on shared identifiers into one typed identity graph.
- **refute** — an adversarial pass that *lowers* confidence: a cert proves a domain
  exists, not that this subject controls it; softness is contagious upward.
- **place** — emit the corroborated, provenance-typed node.

## Veins

Each excavator queries one **public, logged-out** source and returns typed facts:

| Vein | Source |
|---|---|
| `github` | public API — commit-author emails, gpg-UID leaks, profile |
| `openalex` | scholarly authorship |
| `orcid` | researcher identifiers |
| `companies_house` | UK company officers |
| `patents` | inventor records |
| `crtsh` | certificate transparency (infra corroboration only) |
| `keybase` | cryptographically-signed cross-account clusters |

Roadmap: npm/PyPI authors, Bluesky, ABR/ACNC (AU).

## The consent line

Augur is built to be **legal-clean and non-creepy by construction**:

- **Public, logged-out endpoints only**, within each source's rate limits. No fake
  accounts, no logged-in scraping, no unmasking a `noreply`.
- **Provenance is mandatory** — every fact stamps the exact query it came from, so a
  downstream reader can re-run it.
- **Reliability is measured, not asserted** — free-mail addresses don't confer domain
  ownership; a self-asserted homepage never launders into "confirmed".

## Usage

```
augur resolve --name "Ada Lovelace" --city London --country GB   # name → handle
augur dig <handle>                                                # github-rooted excavation
augur dig --name "Ada Lovelace" --hint "mathematician"            # name-rooted (scholarly + registry veins)
augur dig --name "…" --company <ukCompanyNo>                      # + UK Companies House officers
```

Zero-dependency Node (ESM). `bin/augur.mjs` orchestrates `src/excavators/*`;
`src/fact.mjs` defines the fact shape; `src/fuse.mjs` / `src/refute.mjs` do the
join and the confidence pass.

```
npm test
```
