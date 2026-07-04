# Augur — `study` + `compose` (the enspyr business-development payload)

> **Status: DESIGN SKETCH (2026-07-03).** A worked end-to-end, plugged onto the *real* `dig`
> output shape (`src/dig.mjs`, `src/fact.mjs`). Nothing built yet. This is the render-to-react
> artifact: read §3 (the worked example) first — that's the thing you actually want to see.
>
> **Why these two verbs:** the existing loop (`discover → dig → fuse → refute → place → weave`)
> nails *finding and resolving* people. It stops one verb short of **the message**. The enspyr
> goal — *find contracts / employees / other studios, and send intros that blow them away* — lives
> entirely in that missing verb. `study` researches the living work; `compose` turns it into the intro.

---

## 1. The extended loop

```
discover → dig → fuse → refute → place → weave → [ study → compose ]
                 └ identity forensics ┘          └ living work → the message ┘
```

- **`dig`** (built) answers *"are these accounts the same person?"* — forensic identity (gpg/ssh/commit-email/orcid).
- **`study`** (new) answers *"what is this person actually building, and why would they care?"* — the living body of work.
- **`weave`** (designed, §7) answers *"who's the warmest path in, and where's the cold handoff?"*
- **`compose`** (new) fuses all three **through `/recombine`** into a drafted, receipts-inline message.

**Load-bearing constraint:** `compose` **drafts, never sends.** Auto-send on enrichment is the §2.4 red
line. Human-in-the-loop keeps it in the consented "overt participation" shape. Output goes to a draft
(gmail create-draft / a review buffer), never to a wire.

---

## 2. The two new layers

### 2.1 `study` — extend the Fact, don't fork it

`dig`'s Fact is `{predicate, value, method, reliability, source, vein}` — every value is an **identity
key**. `study` emits Facts of a new **kind**: *semantic*, not forensic. Same provenance spine (§2.5),
new reliability priors, and a hard rule: **a study-fact can never lift an identity merge** (it informs
the *message*, never the `same_as` graph — keeps §2.1's "mint" surface clean).

```
STUDY FACT = { kind: 'semantic', predicate, value, method, reliability, source }
  predicate ∈ { ships, writes_about, cares_about, recent_focus, talk, maintains, stance, open_question }
  method: readme_extract 0.85 · commit_subject_topic 0.80 · post_or_thread 0.75 ·
          talk_abstract 0.85 · web_search_claim 0.70   # all LLM-extracted → semantic-entropy self-report (§5.4)
```

**Sources** (all public, logged-out, consent-tiered exactly like dig — NODE=deep, LEAD=none):
top-starred repos' READMEs, **commit-subject *topics*** (the *what*, never the timestamps — that's dig's
forensic vein and it's sleep-schedule-sensitive), Bluesky/Mastodon posts, talk abstracts, npm/PyPI
package descriptions, their blog. `study` is a **WebSearch + content-extraction** pass, distinct from
dig's **fingerprint** pass. It runs on a resolved NODE — you only study people dig+fuse already placed.

### 2.2 `compose` — the intro synthesis (recombine is its engine)

`compose(target, broker, us)` where `us` = enspyr's own study-facts (built once, cached). It does **not**
write "I saw your repo" (creepy — §8.2 causal ambiguity). It runs **`/recombine`** across
`study(target) × study(us)` to find the **rhyme** — the third thing latent in the gap (A×B=C) — and
writes *that*, with every personal claim carrying an inline receipt.

```
compose:
  1. rhyme  = recombine( study(target).semantic , study(us).semantic )   # the A×B=C third thing
  2. path   = weave(me → target)                                         # broker + bottleneck (§7.2)
  3. draft  = LLM( rhyme + path.bottleneck + receipts )                  # spend the quality budget HERE
  4. gate   = anti-creepiness pass: every sentence's claim ∈ provenance? else CUT   (§8.2 firewall)
  5. → draft buffer (NEVER send)   + stamp an intro_event skeleton (§7.3 outcome capture)
```

The message's job is to make the **bottleneck hop** (the coldest handoff on the warm path) do its work:
name the broker, voice the rhyme, name the *gap* honestly, one concrete ask. Never assert they'd get along.

**Register is a 2×2 over TWO orthogonal axes, not the rhyme (load-bearing — both caught on cell #1).**
`compose` conflating these is the leading false-positive of the system. The axes:

- **Axis 1 — personal warmth** (`weave(me → recipient)`): do they know *me*? → governs the **greeting / self-intro**.
- **Axis 2 — project awareness**: do they know *this project*? → governs **how much to explain the project**.

These are independent. A close friend who's never heard of tech_world (Steph) needs a warm greeting AND
a fresh project intro. Composing from `study()` alone (their *work*) sees neither axis and defaults to
stranger-cold + assumes-shared-context — wrong on both.

| | knows the project | does NOT know the project |
|---|---|---|
| **knows me (friend)** | rapport open, rhyme *is* the msg (assume shared context) | rapport open + **one clean sentence framing the project** ← **the Steph case** |
| **stranger (no edge)** | broker + rhyme (rare) | **full self-intro + broker + project frame** ← the Mara case |

Axis-2 data (`project_awareness`) isn't a comms-warmth edge — infer it (seen in the project's channels /
sent a link / mentioned it) and **default to NOT-aware** when unknown: over-explaining a known project is
mildly redundant; assuming knowledge of an unknown one ("you know the issue with it") is confusing and
presumptuous. Fail toward a one-sentence frame.

Corollary for the matrix run: **many contractors are friends who've never seen the project you're pitching**
— the batch must resolve BOTH axes per (person, project) cell, not just personal warmth.

---

## 3. Worked example — a studio lead → the message

> **⚠️ Illustrative. "Mara Vance" is synthetic** — I did not scrape a real person. The *shapes* are real
> (they plug onto `dig`'s actual output); the *values* are invented to show the payload. Point me at a
> real handle and I'll run the actual `dig` + `study`.

**enspyr's substrate** (`study(us)`, cached — derived from the real repos): Flutter/Flame game client ·
LiveKit real-time rooms · an AI tutor bot (`@livekit/agents` + Claude) that joins as a participant ·
GLB/Blender avatars · the Dreamfinder inbound avatar-quote funnel. **Named gap: the avatars don't emote —
lip-sync is flat/garbled.**

### Stage 1 — `dig("maravance")` → identity forensics *(real output shape)*

```json
{ "subject": { "github": "maravance", "name": "Mara Vance" },
  "facts": [
    {"predicate":"name","value":"Mara Vance","method":"profile_field","reliability":0.9,"vein":"github"},
    {"predicate":"github_id","value":"1840223","method":"profile_id","reliability":0.99,"vein":"github"},
    {"predicate":"email","value":"mara@viseme.dev","method":"gpg_uid","reliability":0.97,"vein":"github"},
    {"predicate":"orcid","value":"0000-0002-1846-5591","method":"scholarly_author","reliability":0.85,"vein":"orcid"}
  ],
  "identifiers": { "github_id":"1840223","orcid":"0000-0002-1846-5591","emails":["mara@viseme.dev"] } }
```

### Stage 2 — `study(NODE:maravance)` → living work *(new — semantic facts)*

```json
[ {"kind":"semantic","predicate":"maintains","value":"viseme-rig: real-time viseme/lip-sync for LiveKit avatar agents","method":"readme_extract","reliability":0.85,"source":"github.com/maravance/viseme-rig"},
  {"kind":"semantic","predicate":"talk","value":"\"Embodied agents that actually emote\" — LiveKit Meetup, Mar 2026","method":"talk_abstract","reliability":0.85,"source":"…/livekit-meetup-mar26"},
  {"kind":"semantic","predicate":"recent_focus","value":"driving visemes from an LLM token stream with <120ms latency","method":"commit_subject_topic","reliability":0.80,"source":"github.com/maravance/viseme-rig/commits"},
  {"kind":"semantic","predicate":"open_question","value":"posted asking if anyone has a *product* using real-time avatar lip-sync — 'built the rig, no funnel'","method":"post_or_thread","reliability":0.75,"source":"bsky.app/…"} ]
```

### Stage 3 — `weave(me → Mara)` → the path + the bottleneck

```
path: me → Ada Okafor → Mara
  bottleneck (coldest hop): Ada → Mara  (warmth 0.58 — they met once at the LiveKit meetup)
  n_disjoint_paths: 1   # single bridge — the message has to carry the intro, the graph won't
```

### Stage 4 — `recombine( study(Mara) × study(enspyr) )` → the rhyme (A×B=C)

- **A (Mara):** a real-time lip-sync rig driven by an LLM token stream — *capability with no product/funnel* (her own open question).
- **B (enspyr):** a shipping AI-tutor avatar with an inbound funnel and Claude already streaming tokens — *product with flat, garbled lip-sync* (the named gap).
- **Anchor (shared Z):** an **LLM token stream driving a LiveKit avatar** — both are already standing on it.
- **C (the third thing, seam preserved):** an AI tutor whose face *emotes in sync with what Claude is saying* — Mara's rig gets a shipping product + distribution; enspyr's Dreamfinder stops looking dead. Neither had it alone.

### Stage 5 — `compose` → the drafted message *(receipts inline, provenance-gated)*

> Subject: Ada said we should talk — your viseme-rig + our tutor that can't emote
>
> Hi Mara,
>
> Ada Okafor pointed me your way after the LiveKit meetup — I'm Nick, I run enspyr (a small
> studio building an AI tutor that joins a LiveKit room as a participant and talks to kids
> through a Claude token stream).
>
> Here's the honest version: our avatar's face is dead. The tutor is *good*, the lip-sync is
> garbage. I watched your "Embodied agents that actually emote" abstract and then found
> viseme-rig driving visemes straight off an LLM stream at sub-120ms — which is exactly the
> stream we already have flowing and exactly the thing we can't make land.
>
> I also saw your note about having built the rig but not a funnel. We have the opposite
> problem: a shipping product with an inbound funnel and no good mouth. That's a weirdly clean
> fit. Could I show you our pipeline for 20 minutes and see if there's a contract or a
> collaboration in it?
>
> — Nick

**Provenance gate (Stage 4 of compose):** every claim traces to a source, so it reads as *legible*, not
*surveilled* (§8.2: creepiness = causal ambiguity; the receipts kill it).

| Sentence | Backed by |
|---|---|
| "Ada … after the LiveKit meetup" | `weave` path + bottleneck edge |
| "your 'Embodied agents that actually emote' abstract" | study fact `talk` |
| "viseme-rig driving visemes off an LLM stream at sub-120ms" | study facts `maintains` + `recent_focus` |
| "your note about … no funnel" | study fact `open_question` |
| "the stream we already have flowing" | study(enspyr) — Claude token stream |

Nothing in the message came from dig's forensic layer (email/gpg/orcid) — that resolved *who she is* so
`study` knew *whom to read*, but a warm intro never cites a scraped email. **dig finds; study understands;
recombine rhymes; compose speaks. weave says who to route through.**

---

## 4. How it plugs onto the current code

- `src/study.mjs` — mirror `dig.mjs`: a `study(subject)` orchestrator over `src/researchers/*` (readme,
  commits-topic, posts, talks, web-search), each `.applies()/.run()` → semantic Facts. **Reuse
  `fact.mjs`**, add the semantic `method` priors + a `kind` field.
- `src/compose.mjs` — `compose(target, broker, us)`; shells `/recombine` for the rhyme, `weave` for the
  path, drafts, runs the provenance gate, writes to a draft buffer. **Never a send path.**
- `src/intro_event.mjs` — the §7.3 outcome-capture skeleton, stamped at compose time so a reply/decline
  back-propagates warmth. **Build this WITH compose** — it's the moat (the label nobody else captures).
- **Consent:** `study` inherits dig's tier gate verbatim — runs only on a CONFIRMED NODE, never a LEAD.

## 5. The enspyr reframe (the real point)

This turns augur from "a people-CRM" into **enspyr's business-development engine**:
`discover` + `reverse-casting` (§9) surface the leads (contracts / employees / studios) → `dig`+`fuse`
resolve them → `study` reads their work → `weave` finds the way in → `compose` writes the intro that
lands. The whole loop, pointed at one goal: *warm leads become messages that blow them away.*
