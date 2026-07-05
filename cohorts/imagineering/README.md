# Cohort: imagineering

The Imagineering meetup/event community roster + dashboard, as an augur cohort.
Migrated verbatim from the retired `imagineering/community/` repo (2026-07-05).

## Layout

| Path | What |
|---|---|
| `cohort.json` | Config — everything cohort-specific (graph identity, bridges, geo-tags, PII allowlist, dashboard branding). |
| `data/overrides.json` | **The curated core** — hand-maintained GitHubs, roles, bridges, cross-refs, memory-node links. Edit here. |
| `data/meetup.json`, `data/luma.json` | Raw harvests (regenerable via the `social` CLI). |
| `data/dig.json` | `augur dig` enrichment output (numeric id, public email, site). |
| `build/` | Local PII-bearing dashboard (gitignored — regenerable). |
| `public/` | PII-stripped build for GitHub Pages (gitignored — regenerable). |

## Pipeline

```
data/{meetup,luma,overrides}.json ─→ augur fuse ─→ build/people.js
                                      augur render → build/index.html   (local dashboard)
                                      augur place  → MEMORY.roster.md    (memory leaf)
                                      augur publish → public/            (PII-stripped)
```

- `augur cohort imagineering build` — fuse + render + place (the full local build)
- `augur cohort imagineering publish` — the PII-stripped `public/`

## Enrich

Add a person's GitHub / role / tags / bridge status to `data/overrides.json` (keyed by
normalized name; `aliases` fold alternate names), then re-run `augur cohort imagineering build`.
To resolve unknown handles: `augur resolve --name "X" --city Y --country AU`.
To harvest fresh: `social meetup members …` / `social luma guests …` → fold into the data files.

## Publish to the live map (GitHub Pages)

The public site **https://nickmeinhold.github.io/imagineering-community/** is served from a
SEPARATE Pages repo (`nickmeinhold/imagineering-community`, public). Only the PII-stripped
`public/` is ever pushed there — never `data/` or `build/`.

```bash
augur cohort imagineering publish
# PII gate — MUST print 0 before pushing:
grep -icE 'signal|telegram|channels|@[a-z0-9.-]+\.(com|org|net|dev|io)' cohorts/imagineering/public/people.js
cd /tmp && rm -rf imag-pub && cp -r <augur>/cohorts/imagineering/public imag-pub && cd imag-pub
git init -q && git add -A && git commit -qm "update map"
git push --force git@github.com:nickmeinhold/imagineering-community.git HEAD:main
```

## PII posture

`data/` carries PII (emails, Signal, Telegram) and lives ONLY in this **private** augur repo.
`augur publish` allowlists web-safe fields (`cohort.json` → `publicAllowlist`), drops notes, and
scrubs email/phone-shaped substrings. Re-run the PII grep above before every push.
