// Deterministic tests for the keybase vein's pure core (no network). These pin the HONESTY guard:
// only state==1 (verified) proofs become facts; broken/pending proofs are counted, never asserted.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mapProofs } from "../src/excavators/keybase.mjs";

const val = (facts, pred) => facts.filter((f) => f.predicate === pred).map((f) => f.value);
const them = (over = {}) => ({
  basics: { username: "max" },
  profile: { full_name: "Max Krohn", location: "New York, NY" },
  public_keys: { primary: { key_fingerprint: "4475293306243408FA5958DC63847B4B83930F0C" } },
  proofs_summary: { all: [
    { proof_type: "twitter", nametag: "maxtaco", state: 1, service_url: "https://twitter.com/maxtaco" },
    { proof_type: "github", nametag: "maxtaco", state: 1, service_url: "https://github.com/maxtaco" },
    { proof_type: "reddit", nametag: "maxtaco", state: 1 },
    { proof_type: "dns", nametag: "maxk.org", state: 1 },
    { proof_type: "gitlab", nametag: "maxk", state: 1 },             // not in PRED → linked_account
    { proof_type: "twitter", nametag: "stale_handle", state: 2 },   // BROKEN — must be omitted
  ] },
  ...over,
});

test("only state==1 proofs become facts; broken ones are omitted but counted", () => {
  const { facts, note } = mapProofs(them(), "github proof");
  assert.deepEqual(val(facts, "twitter"), ["maxtaco"], "the broken twitter proof must NOT appear");
  assert.match(note, /1 broken\/unverified proof\(s\) OMITTED/);
  assert.match(note, /5 verified proofs/);
});

test("proof types map to fusable predicates; unknown → linked_account; site types → site", () => {
  const { facts } = mapProofs(them(), "github proof");
  assert.deepEqual(val(facts, "github"), ["maxtaco"]);
  assert.deepEqual(val(facts, "reddit"), ["maxtaco"]);
  assert.deepEqual(val(facts, "site"), ["maxk.org"]);              // dns → site
  assert.deepEqual(val(facts, "linked_account"), ["gitlab:maxk"]); // unmapped type → linked_account
});

test("hub username, name, location, and lowercased pgp fingerprint are emitted", () => {
  const { facts } = mapProofs(them(), "twitter proof");
  assert.deepEqual(val(facts, "keybase"), ["max"]);
  assert.deepEqual(val(facts, "name"), ["Max Krohn"]);
  assert.deepEqual(val(facts, "location"), ["New York, NY"]);
  assert.deepEqual(val(facts, "pgp_fp"), ["4475293306243408fa5958dc63847b4b83930f0c"]);
});

test("signed proofs carry keybase_proof (high reliability); profile fields carry profile_field", () => {
  const { facts } = mapProofs(them(), "github proof");
  const gh = facts.find((f) => f.predicate === "github");
  const name = facts.find((f) => f.predicate === "name");
  assert.equal(gh.method, "keybase_proof");
  assert.ok(gh.reliability >= 0.95, "a signed proof is top-of-ladder");
  assert.equal(name.method, "profile_field");
});

test("note stamps the root provenance (softness is contagious upward)", () => {
  const { note } = mapProofs(them(), "PGP fingerprint");
  assert.match(note, /matched via PGP fingerprint/);
  assert.match(note, /binds to the subject only as strongly as the PGP fingerprint/);
});

test("a record with no username yields no facts, honestly noted", () => {
  const { facts, note } = mapProofs({ basics: {} }, "domain → DNS proof");
  assert.equal(facts.length, 0);
  assert.match(note, /no username/);
});
