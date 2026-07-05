// Excavator: Keybase — cryptographically SIGNED cross-account cluster (public API, no-auth).
//
// Keybase is itself a corroboration engine, so augur consumes its output directly. Every vein so
// far roots on a NAME (namesake-prone, 0.68-0.85); Keybase roots on a PROVEN identifier. A lookup by
// github/twitter/domain/fingerprint matches only the keybase user who SIGNED a statement claiming
// that identifier AND posted the matching proof on the service itself. So the root↔keybase bind is
// cryptographic, and every OTHER proof in that user's sigchain is signed by the SAME key — the whole
// cluster is proven-same-person in one call. A corroboration explosion at the TOP of the reliability
// ladder (keybase_proof = 0.95), not the bottom.
//
// HONESTY GUARD: assert ONLY proofs with state==1 (live/verified). A broken, pending, or revoked
// proof (state!=1) is a CLAIM, not a corroboration — it is counted in the note but never becomes a
// fact. And softness is contagious upward (AUGUR-DESIGN §3.4): the signed cluster binds to THE
// SUBJECT only as strongly as the root identifier does, so the note always stamps which root matched.
import { execFileSync } from "node:child_process";
import { fact } from "../fact.mjs";
import { deriveDomain } from "./crtsh.mjs";

const API = "https://keybase.io/_/api/1.0/user/lookup.json";
const FIELDS = "basics,profile,public_keys,proofs_summary";

// proof_type → augur predicate, so keybase proofs fuse with the same-named facts from other veins.
const PRED = { twitter: "twitter", github: "github", reddit: "reddit", hackernews: "hackernews", mastodon: "mastodon" };
const SITE_TYPES = new Set(["dns", "generic_web_site", "web", "http", "https"]);

// One lookup. Returns {them} (matched user object or null) or {status:"error"/"blocked"}.
// Keybase always answers JSON; HTML means an outage, not "no user".
const lookup = (param, value) => {
  const url = `${API}?${param}=${encodeURIComponent(value)}&fields=${FIELDS}`;
  let body = "";
  try { body = execFileSync("curl", ["-s", "--max-time", "15", "-A", "Mozilla/5.0", url], { encoding: "utf8", timeout: 17000 }); }
  catch { return { status: "error" }; }
  if (/^\s*</.test(body)) return { status: "blocked" };
  let d; try { d = JSON.parse(body); } catch { return { status: "blocked" }; }
  if (d?.status?.code !== 0) return { status: "error" };
  const them = Array.isArray(d.them) ? d.them[0] : d.them;   // [] on no-match → undefined
  return { them: them || null };
};

// Roots to try, strongest/most-specific first. All are signed identifiers, so any hit is high-trust.
const rootsFor = (s) => {
  const dom = deriveDomain(s);
  return [
    s.keybase && ["usernames", s.keybase, "keybase username"],
    s.pgp_fp && ["key_fingerprint", String(s.pgp_fp).replace(/\s+/g, ""), "PGP fingerprint"],
    s.github && ["github", s.github, "github proof"],
    s.twitter && ["twitter", s.twitter, "twitter proof"],
    dom && ["domain", dom.domain, `${dom.via} → DNS proof`],
  ].filter(Boolean);
};

// Pure fact-extraction from a matched keybase `them` object — NO network, deterministically testable.
// Exported for the test harness; this is where the state==1 honesty guard lives.
export const mapProofs = (them, via) => {
  const username = them?.basics?.username;
  if (!username) return { facts: [], note: `matched a keybase record via ${via} but it had no username` };
  const url = `https://keybase.io/${username}`;
  const facts = [fact("keybase", username, "keybase_proof", url)];

  const prof = them.profile || {};
  if (prof.full_name) facts.push(fact("name", prof.full_name, "profile_field", url));
  if (prof.location) facts.push(fact("location", prof.location, "profile_field", url));
  const fp = them.public_keys?.primary?.key_fingerprint;
  if (fp) facts.push(fact("pgp_fp", fp.toLowerCase(), "keybase_proof", url)); // cross-links to github .gpg vein

  const all = them.proofs_summary?.all || [];
  const live = all.filter((p) => p.state === 1);        // ONLY verified proofs become facts
  const broken = all.length - live.length;
  const services = [];
  for (const p of live) {
    const src = p.service_url || p.proof_url || url;
    const pt = p.proof_type;
    services.push(`${pt}:${p.nametag}`);
    if (PRED[pt]) facts.push(fact(PRED[pt], p.nametag, "keybase_proof", src));
    else if (SITE_TYPES.has(pt)) facts.push(fact("site", p.nametag, "keybase_proof", src));
    else facts.push(fact("linked_account", `${pt}:${p.nametag}`, "keybase_proof", src));
  }

  const bits = [`keybase:${username} (matched via ${via})`, `${live.length} verified proofs`];
  if (services.length) bits.push(services.slice(0, 8).join(", "));
  if (broken) bits.push(`${broken} broken/unverified proof(s) OMITTED (state!=1 — claim, not corroboration)`);
  if (fp) bits.push(`pgp ${fp.slice(0, 16)}…`);
  const note = `${bits.join("; ")} — signed cluster binds to the subject only as strongly as the ${via}`;
  return { facts, note };
};

export const keybase = {
  name: "keybase",
  // applies only with a HARD identifier — never a bare name (keybase can't corroborate a namesake).
  applies: (s) => rootsFor(s).length > 0,
  async run(s) {
    let lastErr = null;
    for (const [param, value, via] of rootsFor(s)) {
      const res = lookup(param, value);
      if (res.status) { lastErr = res.status; continue; }   // error/blocked → try next root
      if (res.them) return { ...mapProofs(res.them, via), source: "keybase.io" };
      // clean miss on this root — keep trying weaker roots
    }
    if (lastErr === "blocked") return { facts: [], source: "keybase.io", note: `BLOCKED — keybase.io returned non-JSON (outage/rate-limit); retry later, NOT "no account"` };
    if (lastErr === "error") return { facts: [], source: "keybase.io", note: `keybase lookup errored (retry later, NOT "no account")` };
    return { facts: [], source: "keybase.io", note: "no keybase account for any known identifier (github/twitter/domain/fingerprint)" };
  },
};
