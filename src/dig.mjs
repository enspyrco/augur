// Augur — `dig`: public-artifact excavation for a GitHub handle.
//
// The first stone (AUGUR-DESIGN.md §3, §12). Excavates a person's public-artifact
// shadow from LEGAL-CLEAN veins only: public, logged-out endpoints within rate limits.
// It NEVER authenticates as the target, fakes accounts, or unmasks a noreply address.
//
// Veins (all live-verified 2026-07-02):
//   1. api.github.com/users/{h}  → numeric id (IMMORTAL join key), name, email, blog, company, location, twitter
//   2. github.com/{h}.gpg        → PGP UIDs (real name+email in cleartext; defeats commit-email masking)
//   3. github.com/{h}.keys       → SSH pubkeys → fingerprint (cross-forge join key: same fp on GitLab = same holder)
//   4. gravatar.com/{sha256(email)}.json → self-asserted linked accounts
//
// Provenance: every fact carries {value, source, method, reliability} so `fuse` can score it later.
// Origin: prototyped as imagineering/community/scripts/dig.mjs, proven against a 27-handle roster
// (8 public emails, 12 SSH fps, 10 sites) before being lifted here as the canonical verb.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

// per-vein reliability priors (measured, AUGUR-DESIGN §3.4)
const RELIABILITY = { profile_id: 0.99, gpg_uid: 0.97, ssh_fp: 0.98, gravatar: 0.99, profile_field: 0.9 };

const sh = (cmd, args, timeout = 12000) => {
  try { return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout }); }
  catch { return ""; }
};
const curl = (url) => sh("curl", ["-s", "--max-time", "10", url]);

// Uses `gh api` when available (authenticated: 5000/hr vs 60/hr unauth — 83×). Falls back to curl.
function ghUser(handle) {
  const viaGh = sh("gh", ["api", `users/${handle}`]);
  if (viaGh) { try { return JSON.parse(viaGh); } catch { /* fall through */ } }
  const viaCurl = curl(`https://api.github.com/users/${handle}`);
  try { return JSON.parse(viaCurl); } catch { return null; }
}

function sshFingerprints(keysText) {
  const keys = (keysText || "").split("\n").filter((l) => l.startsWith("ssh-"));
  return keys.map((k) => {
    const o = sh("bash", ["-c", `echo ${JSON.stringify(k)} | ssh-keygen -lf -`]);
    const m = o.match(/SHA256:\S+/);
    return m ? m[0] : null;
  }).filter(Boolean);
}

function gravatarLookup(email) {
  if (!email) return null;
  const hash = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  const o = curl(`https://gravatar.com/${hash}.json`);
  try {
    const e = JSON.parse(o).entry?.[0];
    if (!e) return null;
    return { displayName: e.displayName || "", profileUrl: e.profileUrl || "", accounts: (e.accounts || []).map((a) => a.shortname || a.url) };
  } catch { return null; }
}

// A single fact with provenance, ready for `fuse`.
const fact = (predicate, value, method) => ({ predicate, value, method, reliability: RELIABILITY[method] ?? 0.5 });

/**
 * dig(handle) → { handle, id, facts:[{predicate,value,method,reliability}], identifiers:{...}, raw:{...} }
 * `id` is the immortal numeric GitHub id (correlate on this, never the login).
 */
export async function dig(handle) {
  const u = ghUser(handle);
  if (!u || u.message === "Not Found") return { handle, error: "no public profile" };

  const facts = [];
  if (u.id) facts.push(fact("github_id", u.id, "profile_id"));
  if (u.name) facts.push(fact("name", u.name, "profile_field"));
  if (u.email) facts.push(fact("email", u.email, "profile_field"));
  if (u.blog && /^https?:\/\//.test(u.blog)) facts.push(fact("site", u.blog, "profile_field"));
  if (u.company) facts.push(fact("company", u.company, "profile_field"));
  if (u.location) facts.push(fact("location", u.location, "profile_field"));
  if (u.twitter_username) facts.push(fact("twitter", u.twitter_username, "profile_field"));

  // .gpg — a real key block is well over the ~125-byte empty-armor stub
  const gpg = curl(`https://github.com/${handle}.gpg`);
  const hasPgp = gpg.includes("BEGIN PGP") && gpg.length > 200;
  if (hasPgp) {
    // parse UIDs if gpg is available; otherwise just note presence
    const listed = sh("bash", ["-c", `echo ${JSON.stringify(gpg)} | gpg --list-packets 2>/dev/null`]);
    const uids = [...listed.matchAll(/user ID packet: "([^"]+)"/g)].map((m) => m[1]);
    for (const uid of uids) facts.push(fact("pgp_uid", uid, "gpg_uid"));
    if (!uids.length) facts.push(fact("pgp_present", true, "gpg_uid"));
  }

  // .keys — SSH fingerprints = cross-forge join keys
  const fps = sshFingerprints(curl(`https://github.com/${handle}.keys`));
  for (const fp of fps) facts.push(fact("ssh_fp", fp, "ssh_fp"));

  // gravatar fan-out from any harvested email
  const grav = gravatarLookup(u.email);
  if (grav) {
    if (grav.profileUrl) facts.push(fact("gravatar", grav.profileUrl, "gravatar"));
    for (const acct of grav.accounts) facts.push(fact("linked_account", acct, "gravatar"));
  }

  return {
    handle: u.login,
    id: u.id, // immortal join key
    facts,
    identifiers: {
      github_id: u.id,
      email: u.email || null,
      ssh_fps: fps,
      pgp: hasPgp,
    },
    raw: { name: u.name, location: u.location, blog: u.blog, public_repos: u.public_repos, created_at: u.created_at },
  };
}
