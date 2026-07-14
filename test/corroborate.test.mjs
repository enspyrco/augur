import { test } from "node:test";
import assert from "node:assert/strict";
import { corroborate } from "../src/corroborate.mjs";
import { refute } from "../src/refute.mjs";

test("corroborate partitions on key membership", () => {
  const known = new Set(["a", "b"]);
  const { corroborated, uncorroborated } = corroborate(
    [{ source: "a" }, { source: "z" }, { source: "b" }],
    known
  );
  assert.deepEqual(corroborated.map((x) => x.source), ["a", "b"]);
  assert.deepEqual(uncorroborated.map((x) => x.source), ["z"]);
});

test("preserves compose's firewall semantics: missing source -> uncorroborated", () => {
  // compose used: r.source && targetSources.has(r.source). A receipt with no source
  // must land in `uncorroborated` (i.e. be cut), same as the old inline filter.
  const targetSources = new Set(["https://github.com/them/repo"]);
  const receipts = [
    { claim: "real", source: "https://github.com/them/repo" },
    { claim: "fabricated", source: "https://github.com/someoneelse/x" },
    { claim: "no-source" }, // source: undefined
  ];
  const { corroborated, uncorroborated } = corroborate(receipts, targetSources, (r) => r.source);
  assert.deepEqual(corroborated.map((r) => r.claim), ["real"]);
  assert.deepEqual(uncorroborated.map((r) => r.claim), ["fabricated", "no-source"]);
});

test("refute softens single-vein facts, keeps cross-vein corroborated firm", () => {
  const facts = [
    { predicate: "email", value: "a@x.io", method: "gpg_uid", reliability: 0.97 },   // corroborated below
    { predicate: "email", value: "a@x.io", method: "profile_field", reliability: 0.9 }, // 2nd method, same claim
    { predicate: "owns_domain", value: "x.io", method: "ct_record", reliability: 0.7 }, // single-vein -> softened
  ];
  const out = refute(facts);
  const domain = out.find((f) => f.predicate === "owns_domain");
  const emails = out.filter((f) => f.predicate === "email");
  assert.equal(domain.refuted, true);
  assert.equal(domain.reliability, 0.56); // 0.7 * 0.8
  assert.ok(emails.every((f) => !f.refuted), "cross-attested email stays firm");
  assert.equal(emails[0].reliability, 0.97);
});
