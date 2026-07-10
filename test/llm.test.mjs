// parseAgentJson — `claude -p` is an agent turn, not a JSON API. It can wrap the
// payload in leading/trailing prose (and narrate hook side-effects). These lock in
// that JSON mode survives that wrapping. The trailing-prose case is a real failure
// caught in the wild: study(us) returned "...the STUDY deliverable:\n[JSON]\nHope that helps!".
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAgentJson } from "../src/llm.mjs";

test("clean JSON parses", () => {
  assert.deepEqual(parseAgentJson('[{"a":1}]'), [{ a: 1 }]);
});

test("leading prose is ignored", () => {
  assert.deepEqual(parseAgentJson('Now the STUDY deliverable:\n\n[{"a":1}]'), [{ a: 1 }]);
});

test("TRAILING prose is ignored (the in-the-wild failure)", () => {
  assert.deepEqual(parseAgentJson('[{"a":1}]\n\nThat completes the study.'), [{ a: 1 }]);
});

test("leading AND trailing prose (the hook-leak shape)", () => {
  assert.deepEqual(parseAgentJson('Tasks restored. Here:\n[{"a":1},{"a":2}]\nHope that helps!'), [{ a: 1 }, { a: 2 }]);
});

test("```json fences are handled", () => {
  assert.deepEqual(parseAgentJson('```json\n[{"a":1}]\n```'), [{ a: 1 }]);
});

test("a stray bracket in the preamble does not wedge extraction", () => {
  assert.deepEqual(parseAgentJson('See [note] below: [{"a":1}]'), [{ a: 1 }]);
});

test("brackets inside string values do not miscount balance", () => {
  assert.deepEqual(parseAgentJson('prefix {"v":"a ] b } c"} suffix'), { v: "a ] b } c" });
});

test("nested structure returns the whole outer value", () => {
  assert.deepEqual(parseAgentJson('[{"a":[1,2]},{"b":{"c":3}}]'), [{ a: [1, 2] }, { b: { c: 3 } }]);
});

test("no JSON present throws with context", () => {
  assert.throws(() => parseAgentJson("I could not complete that request."), /no parseable JSON/);
});
