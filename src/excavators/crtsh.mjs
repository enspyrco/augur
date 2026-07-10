// Excavator: crt.sh — Certificate Transparency logs → INFRASTRUCTURE footprint (public, no-auth).
//
// A DIFFERENT AXIS of identity than "wrote a paper" (openalex) or "made a commit" (github):
// who provisions TLS for a domain. CT logs are append-only and cryptographically anchored, so the
// RECORD ("a cert existed for host X, first seen D") is near-certain. But a cert proves the DOMAIN
// exists and someone provisioned TLS for it — NOT that THIS subject controls it. So the identity-
// corroboration strength is capped by the WEAKEST link: how we came to believe the domain is the
// subject's at all. That link inherits the softness of its source (softness is contagious upward); certs enrich the infra picture but never launder a self-asserted homepage
// into "confirmed ownership". The note always stamps the domain provenance so `fuse`/`refute` see it.
//
// Rooting: we need a domain the subject is plausibly linked to, derived (strongest first) from
//   s.domain (explicit) > s.site (their published homepage) > the domain of s.email
// FREE-MAIL is skipped — "user@gmail.com" does not make the subject an owner of gmail.com's certs.
//
// crt.sh's JSON exposes name_value (the SANs) and issuer_name (the CA) — but NOT the cert subject's
// Organization. So we do NOT try to read an "org" off the cert (that would assert the CA's name as
// the person's employer). The real identity signal is SAN CO-TENANCY: two apex domains riding the
// same cert share an operator — EXCEPT shared-CDN certs (Cloudflare et al.) bundle dozens of
// UNRELATED customers. So co-tenancy only corroborates when FEW apexes share the cert; a fat
// multi-apex cert is treated as a CDN bundle and dropped. That guard is the honesty of this vein.
import { execFileSync } from "node:child_process";
import { fact } from "../fact.mjs";

// Personal-mail providers whose domain says nothing about infrastructure ownership.
const FREEMAIL = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "hotmail.co.uk", "live.com", "msn.com",
  "yahoo.com", "yahoo.co.uk", "ymail.com", "aol.com", "icloud.com", "me.com", "mac.com",
  "proton.me", "protonmail.com", "pm.me", "gmx.com", "gmx.net", "fastmail.com", "fastmail.fm",
  "zoho.com", "yandex.com", "mail.com", "hey.com", "tutanota.com",
]);

// Platform / social / hosting domains: a URL to one of these in a profile field (e.g. a github
// "blog" field pointing at twitter.com) is NOT the subject's own infrastructure — its certs belong
// to the platform. Rejected like freemail. (Matched on the APEX, so user.github.io → github.io.)
const PLATFORM = new Set([
  "twitter.com", "x.com", "t.co", "github.com", "github.io", "gitlab.com", "bitbucket.org",
  "linkedin.com", "facebook.com", "fb.com", "instagram.com", "threads.net", "tiktok.com",
  "medium.com", "substack.com", "wordpress.com", "blogspot.com", "tumblr.com", "dev.to",
  "youtube.com", "youtu.be", "twitch.tv", "reddit.com", "news.ycombinator.com",
  "keybase.io", "mastodon.social", "bsky.app", "t.me", "telegram.me", "patreon.com",
  "about.me", "linktr.ee", "gravatar.com", "stackoverflow.com", "stackexchange.com",
  "notion.site", "notion.so", "google.com", "sites.google.com",
]);

// Minimal public-suffix awareness: enough to fold "host.sub.co.uk" → "sub.co.uk" not "co.uk".
const MULTI_SUFFIX = new Set([
  "co.uk", "org.uk", "gov.uk", "ac.uk", "me.uk", "co.nz", "org.nz", "com.au", "net.au", "org.au",
  "co.za", "com.br", "co.jp", "co.in", "co.il", "com.sg",
]);
const apexOf = (host) => {
  const p = host.toLowerCase().replace(/\.$/, "").split(".");
  if (p.length < 2) return host.toLowerCase();
  const last2 = p.slice(-2).join(".");
  return (MULTI_SUFFIX.has(last2) && p.length >= 3) ? p.slice(-3).join(".") : last2;
};

// derive {domain, via} or null. `via` records provenance for the identity-link honesty note.
// Exported so the keybase vein can reuse the same domain-derivation + guards. Rejects freemail AND
// platform/social domains — neither is the subject's OWN infrastructure, so neither should be dug.
export const deriveDomain = (s) => {
  let domain = null, via = null;
  if (s.domain) { domain = String(s.domain).toLowerCase().replace(/^www\./, ""); via = "explicit domain"; }
  else if (s.site) {
    const m = String(s.site).match(/^(?:https?:\/\/)?(?:www\.)?([^/:?#\s]+)/i);
    if (m) { domain = m[1].toLowerCase(); via = "published site field"; }
  } else if (s.email && s.email.includes("@")) {
    domain = s.email.split("@").pop().toLowerCase(); via = "email domain";
  }
  if (!domain || !domain.includes(".")) return null;
  const apex = apexOf(domain);
  if (FREEMAIL.has(domain) || FREEMAIL.has(apex) || PLATFORM.has(apex)) return null; // not the subject's own infra
  return { domain, via };
};

// One HTTP attempt. Captures the STATUS CODE (not just body shape) — crt.sh is notoriously flaky
// (busy domains take 30s+; it 502s and 404s transiently), so a code is the only honest way to tell
// "genuinely no certs" (200 + empty array) from "crt.sh hiccuped" (404/5xx). curl -w appends the
// code on its own line so we split it off the body.
const attempt = (url) => {
  let out = "";
  // 45s leash: github.com alone takes ~31s. timeout guard sits just above --max-time.
  try { out = execFileSync("curl", ["-sS", "--max-time", "45", "-A", "Mozilla/5.0", "-w", "\n%{http_code}", url], { encoding: "utf8", timeout: 48000, maxBuffer: 32 * 1024 * 1024 }); }
  catch { return { code: 0, body: "" }; }   // curl non-zero (network/timeout)
  const nl = out.lastIndexOf("\n");
  return { code: parseInt(out.slice(nl + 1).trim(), 10) || 0, body: out.slice(0, nl) };
};

// Returns {status, rows?}. blocked/empty/error are kept DISTINCT — a rate-limit or gateway hiccup
// must never masquerade as "no certificates found" (the false-negative the whole vein guards against).
const fetchCT = async (domain) => {
  // Plain `q=<domain>` matches the APEX plus every subdomain (verified: superset of the `%.` wildcard,
  // which drops apex-only domains). crt.sh does the subdomain expansion server-side.
  const url = `https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`;
  let last = { code: 0, body: "" };
  for (let i = 0; i < 2; i++) {   // one retry — crt.sh flakes transiently
    last = attempt(url);
    if (last.code === 200) {
      const b = last.body.trim();
      if (!b) return { status: "empty" };                    // 200 + empty → genuinely no rows
      if (/^\s*</.test(b)) return { status: "blocked" };     // 200 but HTML body (odd, but not certs)
      try { const rows = JSON.parse(b); return { status: "ok", rows: Array.isArray(rows) ? rows : [] }; }
      catch { return { status: "blocked" }; }
    }
    if (last.code === 404 && !last.body.trim() && i === 1) return { status: "empty" }; // 404-empty on BOTH tries → treat as no records
    await new Promise((r) => setTimeout(r, 1500));           // backoff before retry
  }
  // never got a clean 200: a 5xx gateway, a lone 404, or curl failure → be honest it's a hiccup
  return { status: last.code ? "blocked" : "error", code: last.code };
};

// Pure fact-extraction from crt.sh rows — NO network, so it's deterministically unit-testable.
// Exported for the test harness. This is where the honesty guards live (CDN co-tenancy drop).
export const analyzeRows = (rows, domain, via) => {
  const hosts = new Set();          // subdomains under our domain
  const linkedApexes = new Map();   // other apex → # of few-tenant certs it co-tenants with us on
  let earliest = null;

  for (const r of rows) {
    if (r.not_before && (!earliest || r.not_before < earliest)) earliest = r.not_before;
    // name_value packs every SAN on the cert, newline/space-separated. Collect this cert's apexes.
    const names = String(r.name_value || "").split(/\s+/).map((n) => n.trim().toLowerCase()).filter(Boolean);
    const certApexes = new Set();
    for (const n of names) {
      const host = n.replace(/^\*\./, "");              // fold wildcard SANs to their base
      if (!host.includes(".")) continue;
      certApexes.add(apexOf(host));
      if (host.endsWith("." + domain)) hosts.add(host); // strictly a subdomain (dot-anchored; not the apex)
    }
    // SAN co-tenancy — but ONLY when few apexes share this cert. A fat multi-apex cert is a
    // CDN/hosting bundle of unrelated customers (Cloudflare etc.), so it links nobody.
    if (certApexes.has(domain) && certApexes.size >= 2 && certApexes.size <= 3) {
      for (const a of certApexes) if (a !== domain) linkedApexes.set(a, (linkedApexes.get(a) || 0) + 1);
    }
  }

  const src = `crt.sh/?q=${domain}`;   // provenance stamp, same query we ran
  const facts = [];
  facts.push(fact("ct_cert_count", rows.length, "ct_record", src));
  if (earliest) facts.push(fact("ct_first_seen", earliest.slice(0, 10), "ct_record", src));

  const hostList = [...hosts].sort();
  for (const h of hostList.slice(0, 12)) facts.push(fact("ct_subdomain", h, "ct_infra", src));

  // Linked apexes on 2+ few-tenant certs are the strongest signal — deliberate co-hosting,
  // not a one-off coincidence. Rank by co-tenancy count.
  const linked = [...linkedApexes.entries()].sort((a, b) => b[1] - a[1]);
  for (const [apex] of linked.slice(0, 6)) facts.push(fact("ct_linked_domain", apex, "ct_linked_domain", src));

  const bits = [`domain ${domain} (link via ${via})`, `${rows.length} certs`, `${hosts.size} subdomains`];
  if (linked.length) bits.push(`${linked.length} operator-linked domains (SAN co-tenancy): ${linked.slice(0, 3).map(([a]) => a).join(", ")}`);
  if (hostList.length > 12) bits.push(`(+${hostList.length - 12} more subdomains)`);
  const note = `${bits.join("; ")} — INFRASTRUCTURE axis: certs corroborate the domain, not the person (identity only as strong as the ${via} link)`;

  return { facts, note };
};

export const crtsh = {
  name: "crtsh",
  applies: (s) => !!deriveDomain(s),
  async run(s) {
    const dd = deriveDomain(s);
    if (!dd) return { facts: [], source: "crt.sh", note: "no diggable domain (freemail/platform/none)" };
    const { domain, via } = dd;
    const res = await fetchCT(domain);
    if (res.status === "error") return { facts: [], source: "crt.sh", note: `curl failed for ${domain} (network/timeout — retry later, NOT "no certs")` };
    if (res.status === "blocked") return { facts: [], source: "crt.sh", note: `BLOCKED — crt.sh gateway/rate-limit (HTTP ${res.code ?? "?"}) for ${domain} (retry later; NOT "no certs")` };
    if (res.status === "empty" || !res.rows.length) return { facts: [], source: "crt.sh", note: `no CT records for ${domain} (link via ${via})` };

    return { ...analyzeRows(res.rows, domain, via), source: `crt.sh/?q=${domain}` };
  },
};
