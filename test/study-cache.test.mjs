// The us-cache freshness logic. study(us) is ~100s but `us` is low-velocity, so we
// cache it behind a cheap repo-pushed_at fingerprint (not a blind TTL). These lock in
// the change-detector and the serve/rebuild decision — the pure core of studyCached.
import { test } from "node:test";
import assert from "node:assert/strict";
import { reposFingerprint, cacheDecision, US_CACHE_TTL_MS } from "../src/study.mjs";

const T0 = Date.parse("2026-07-10T00:00:00Z");
const repos = [
  { full_name: "u/a", pushed_at: "2026-07-01T00:00:00Z", fork: false },
  { full_name: "u/b", pushed_at: "2026-06-01T00:00:00Z", fork: false },
];

test("fingerprint is stable across ordering", () => {
  const rev = [...repos].reverse();
  assert.equal(reposFingerprint(repos), reposFingerprint(rev));
});

test("a new push (pushed_at change) moves the fingerprint", () => {
  const bumped = [{ ...repos[0], pushed_at: "2026-07-09T00:00:00Z" }, repos[1]];
  assert.notEqual(reposFingerprint(repos), reposFingerprint(bumped));
});

test("forks are ignored — adding a fork does not move the fingerprint", () => {
  const withFork = [...repos, { full_name: "u/forked", pushed_at: "2026-07-09T00:00:00Z", fork: true }];
  assert.equal(reposFingerprint(repos), reposFingerprint(withFork));
});

const fp = reposFingerprint(repos);
const freshCache = { optsKey: "r8m5", fingerprint: fp, builtAt: "2026-07-09T00:00:00Z", result: { studyFacts: [1] } };

test("HIT: same fingerprint, same opts, within TTL", () => {
  const d = cacheDecision({ cached: freshCache, fingerprint: fp, optsKey: "r8m5", nowMs: T0 });
  assert.deepEqual(d, { fresh: true, reason: "hit" });
});

test("MISS: no cache", () => {
  assert.equal(cacheDecision({ cached: null, fingerprint: fp, optsKey: "r8m5", nowMs: T0 }).reason, "no-cache");
});

test("MISS: repos changed (fingerprint differs)", () => {
  const d = cacheDecision({ cached: freshCache, fingerprint: "deadbeef", optsKey: "r8m5", nowMs: T0 });
  assert.deepEqual(d, { fresh: false, reason: "repos-changed" });
});

test("MISS: opts changed", () => {
  const d = cacheDecision({ cached: freshCache, fingerprint: fp, optsKey: "r5m3", nowMs: T0 });
  assert.equal(d.reason, "opts-changed");
});

test("MISS: TTL floor exceeded even if fingerprint matches", () => {
  const old = { ...freshCache, builtAt: new Date(T0 - US_CACHE_TTL_MS - 1000).toISOString() };
  const d = cacheDecision({ cached: old, fingerprint: fp, optsKey: "r8m5", nowMs: T0 });
  assert.equal(d.reason, "ttl-expired");
});

test("MISS: refresh forces rebuild even on a perfect hit", () => {
  const d = cacheDecision({ cached: freshCache, fingerprint: fp, optsKey: "r8m5", nowMs: T0, refresh: true });
  assert.deepEqual(d, { fresh: false, reason: "refresh" });
});
