// Deterministic tests for the crt.sh vein's pure core (no network). These pin the HONESTY guards:
// CDN-bundle rejection, few-tenant co-tenancy linking, and apex substring-safety.
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeRows, deriveDomain } from "../src/excavators/crtsh.mjs";

const val = (facts, pred) => facts.filter((f) => f.predicate === pred).map((f) => f.value);
const cert = (names, not_before) => ({ name_value: names.join("\n"), not_before });

test("subdomains are extracted; apex and look-alike domains are excluded", () => {
  const rows = [
    cert(["github.com", "api.github.com", "www.github.com"], "2015-01-01"),
    cert(["evilgithub.com"], "2016-01-01"),        // substring look-alike — must NOT count as a subdomain
    cert(["*.assets.github.com"], "2017-01-01"),   // wildcard folds to its base
  ];
  const { facts } = analyzeRows(rows, "github.com", "explicit domain");
  const subs = val(facts, "ct_subdomain");
  assert.deepEqual(subs.sort(), ["api.github.com", "assets.github.com", "www.github.com"]);
  assert.ok(!subs.includes("github.com"), "apex must not appear as a subdomain");
  assert.ok(!subs.includes("evilgithub.com"), "look-alike apex must be rejected");
});

test("CDN bundle (>3 apexes on one cert) links NOBODY", () => {
  const rows = [cert(["mine.com", "unrelated-a.com", "unrelated-b.com", "unrelated-c.com", "unrelated-d.com"], "2020-01-01")];
  const { facts } = analyzeRows(rows, "mine.com", "explicit domain");
  assert.equal(val(facts, "ct_linked_domain").length, 0, "a fat shared cert must not manufacture links");
});

test("few-tenant co-tenancy (2-3 apexes) links, ranked by co-tenancy count", () => {
  const rows = [
    cert(["mine.com", "sibling.com"], "2021-01-01"),          // 2-tenant → link
    cert(["mine.com", "sibling.com"], "2021-06-01"),          // sibling again → count 2
    cert(["mine.com", "other.com", "third.com"], "2021-02-01"), // 3-tenant → other & third, count 1 each
  ];
  const { facts } = analyzeRows(rows, "mine.com", "explicit domain");
  const linked = val(facts, "ct_linked_domain");
  assert.equal(linked[0], "sibling.com", "most co-tenanted apex ranks first");
  assert.deepEqual(linked.slice(1).sort(), ["other.com", "third.com"]);
  assert.ok(!linked.includes("mine.com"), "the subject's own apex is never a 'link'");
});

test("linked-domain facts carry the strong method; subdomain facts carry the weak one", () => {
  const rows = [cert(["mine.com", "sibling.com"], "2022-01-01"), cert(["mine.com", "app.mine.com"], "2022-01-01")];
  const { facts } = analyzeRows(rows, "mine.com", "published site field");
  const linked = facts.find((f) => f.predicate === "ct_linked_domain");
  const sub = facts.find((f) => f.predicate === "ct_subdomain");
  assert.equal(linked.method, "ct_linked_domain");
  assert.ok(linked.reliability > sub.reliability, "operator-link must outweigh a bare subdomain");
});

test("first_seen is the earliest not_before; cert_count matches row count", () => {
  const rows = [cert(["mine.com"], "2019-05-05"), cert(["a.mine.com"], "2012-03-03"), cert(["b.mine.com"], "2020-01-01")];
  const { facts } = analyzeRows(rows, "mine.com", "explicit domain");
  assert.equal(val(facts, "ct_first_seen")[0], "2012-03-03");
  assert.equal(val(facts, "ct_cert_count")[0], 3);
});

test("note stamps the domain-link provenance (softness is contagious upward)", () => {
  const { note } = analyzeRows([cert(["mine.com"], "2020-01-01")], "mine.com", "email domain");
  assert.match(note, /link via email domain/);
  assert.match(note, /certs corroborate the domain, not the person/);
});

test("deriveDomain rejects freemail, platform, and social-URL profile fields; keeps real domains", () => {
  // real infrastructure domains — kept
  assert.deepEqual(deriveDomain({ domain: "enspyr.co" }), { domain: "enspyr.co", via: "explicit domain" });
  assert.equal(deriveDomain({ site: "https://www.maxk.org/blog" }).domain, "maxk.org");
  assert.equal(deriveDomain({ email: "nick@enspyr.co" }).domain, "enspyr.co");
  // freemail — rejected
  assert.equal(deriveDomain({ email: "x@gmail.com" }), null);
  // platform/social URL in a profile field (the maxtaco bug) — rejected, no false infra attribution
  assert.equal(deriveDomain({ site: "http://twitter.com/#!/maxtaco" }), null);
  assert.equal(deriveDomain({ site: "https://github.com/maxtaco" }), null);
  assert.equal(deriveDomain({ site: "https://someuser.github.io" }), null, "github.io pages host belongs to github");
  assert.equal(deriveDomain({ site: "https://medium.com/@writer" }), null);
  // nothing to derive
  assert.equal(deriveDomain({ name: "Jane" }), null);
});
