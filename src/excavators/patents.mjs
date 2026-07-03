// Excavator: Google Patents — name-rooted invention footprint (free XHR, no-auth).
// For inventors/deep-tech founders whose public shadow is patents. Endpoint:
// patents.google.com/xhr/query?url=inventor="<name>"  → titles, assignees, dates.
//
// Corroboration: a name match on an inventor index is namesake-prone like any name root.
// The ASSIGNEE (the company that owns the patent) is the discriminator — if a hint mentions
// a company/field that overlaps an assignee or a title, we assert; otherwise SOFT.
import { execFileSync } from "node:child_process";
import { fact } from "../fact.mjs";

// Returns {json} on success, {blocked:true} when Google serves its bot-block page,
// or {json:null} on a genuine empty/parse-fail. Distinguishing blocked from empty is
// an honesty requirement — a throttle must not masquerade as "no patents found".
const fetchPatents = (url) => {
  let body = "";
  try { body = execFileSync("curl", ["-s", "--max-time", "12", "-A", "Mozilla/5.0", url], { encoding: "utf8", timeout: 14000 }); }
  catch { return { json: null }; }
  if (/<title>Sorry/i.test(body) || body.startsWith("<html")) return { blocked: true };
  try { return { json: JSON.parse(body) }; } catch { return { json: null }; }
};

export const patents = {
  name: "patents",
  applies: (s) => !!s.name,
  async run(s) {
    // Google Patents xhr wants url=<the query string, encoded ONCE>. Encode the whole
    // inner query a single time — double-encoding turns %22 into %2522 and returns 0.
    const inner = `inventor="${s.name}"`;
    const res = fetchPatents(`https://patents.google.com/xhr/query?url=${encodeURIComponent(inner)}&exp=`);
    if (res.blocked) return { facts: [], source: "patents.google.com", note: "BLOCKED — Google bot-throttle (retry later; consider a keyed patents API for reliability)" };
    const r = res.json?.results;
    const items = (r?.cluster || []).flatMap((c) => c.result || []).map((it) => it.patent).filter(Boolean);
    if (!items.length) return { facts: [], source: "patents.google.com", note: "no inventor match" };

    const assignees = [...new Set(items.map((p) => (p.assignee || "").trim()).filter(Boolean))];
    const titles = items.map((p) => (p.title || "").trim());

    // corroborate: does the hint overlap an assignee name or a patent title?
    const hint = (s.hint || "").toLowerCase();
    const hitAssignee = hint ? assignees.filter((a) => a.toLowerCase().split(/\W+/).some((w) => w.length > 3 && hint.includes(w))) : [];
    const hitTitle = hint ? titles.filter((t) => t.toLowerCase().split(/\W+/).some((w) => w.length > 4 && hint.includes(w))) : [];
    const corroborated = !!hint && (hitAssignee.length > 0 || hitTitle.length > 0);
    const method = corroborated ? "patent_inventor" : "handle_match";

    const facts = [fact("patent_count", r.total_num_results, method, "patents.google.com")];
    for (const a of assignees.slice(0, 4)) facts.push(fact("patent_assignee", a, method, "patents.google.com"));
    for (const p of items.slice(0, 3)) facts.push(fact("patent", `${p.publication_number}: ${(p.title || "").trim()}`, method, `https://patents.google.com/patent/${p.publication_number}`));

    const note = corroborated
      ? `assignee/title overlap: ${[...hitAssignee, ...hitTitle.slice(0, 1)].join(", ")}`
      : (hint ? "NAME MATCH ONLY — no assignee/title overlap (SOFT, namesake risk)" : "NAME MATCH ONLY — no hint (SOFT, namesake risk)");
    return { facts, source: "patents.google.com", note };
  },
};
