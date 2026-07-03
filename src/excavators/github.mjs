// Excavator: GitHub — handle-rooted public artifacts.
// Veins: profile+numeric-id, .gpg UIDs, .keys SSH fingerprints, gravatar fan-out.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fact } from "../fact.mjs";

const sh = (cmd, args, timeout = 12000) => {
  try { return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout }); }
  catch { return ""; }
};
const curl = (url) => sh("curl", ["-s", "--max-time", "10", url]);

function ghUser(handle) {
  const viaGh = sh("gh", ["api", `users/${handle}`]);
  if (viaGh) { try { return JSON.parse(viaGh); } catch { /* fall through */ } }
  try { return JSON.parse(curl(`https://api.github.com/users/${handle}`)); } catch { return null; }
}
function sshFingerprints(keysText) {
  return (keysText || "").split("\n").filter((l) => l.startsWith("ssh-")).map((k) => {
    const m = sh("bash", ["-c", `echo ${JSON.stringify(k)} | ssh-keygen -lf -`]).match(/SHA256:\S+/);
    return m ? m[0] : null;
  }).filter(Boolean);
}
function gravatar(email) {
  if (!email) return null;
  const hash = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  try { const e = JSON.parse(curl(`https://gravatar.com/${hash}.json`)).entry?.[0]; return e ? { profileUrl: e.profileUrl, accounts: (e.accounts || []).map((a) => a.shortname || a.url) } : null; }
  catch { return null; }
}

export const github = {
  name: "github",
  // applies when the subject gives a github handle
  applies: (s) => !!s.github,
  async run(s) {
    const u = ghUser(s.github);
    if (!u || u.message === "Not Found") return { facts: [], source: `github.com/${s.github}`, note: "no public profile" };
    const src = u.html_url;
    const facts = [];
    if (u.id) facts.push(fact("github_id", u.id, "profile_id", src));
    if (u.name) facts.push(fact("name", u.name, "profile_field", src));
    if (u.email) facts.push(fact("email", u.email, "profile_field", src));
    if (u.blog && /^https?:\/\//.test(u.blog)) facts.push(fact("site", u.blog, "profile_field", src));
    if (u.company) facts.push(fact("company", u.company, "profile_field", src));
    if (u.location) facts.push(fact("location", u.location, "profile_field", src));
    if (u.twitter_username) facts.push(fact("twitter", u.twitter_username, "profile_field", src));
    const gpg = curl(`https://github.com/${s.github}.gpg`);
    if (gpg.includes("BEGIN PGP") && gpg.length > 200) {
      const uids = [...sh("bash", ["-c", `echo ${JSON.stringify(gpg)} | gpg --list-packets 2>/dev/null`]).matchAll(/user ID packet: "([^"]+)"/g)].map((m) => m[1]);
      for (const uid of uids) facts.push(fact("pgp_uid", uid, "gpg_uid", src));
    }
    for (const fp of sshFingerprints(curl(`https://github.com/${s.github}.keys`))) facts.push(fact("ssh_fp", fp, "ssh_fp", src));
    const grav = gravatar(u.email);
    if (grav?.profileUrl) facts.push(fact("gravatar", grav.profileUrl, "gravatar", src));
    for (const acct of grav?.accounts || []) facts.push(fact("linked_account", acct, "gravatar", src));
    return { facts, source: src };
  },
};
