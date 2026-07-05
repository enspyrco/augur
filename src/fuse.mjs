// Augur — `fuse`: merge a cohort's harvested sources (meetup + luma) with curated
// overrides into one identity per person, keyed by normalized name (aliases fold
// alternate handles into one). Then apply `dig` enrichment (numeric id, email, site)
// to already-resolved GitHub handles. This is build-roster.mjs generalized: every
// Imagineering-specific constant (graph name, geo-tag map, the Luma event tag) now
// comes from the cohort config, so the merge logic itself is cohort-agnostic.
//
// Insertion order is preserved verbatim from the community generator so the emitted
// JSON is byte-identical to the pre-migration people.js (the migration's proof gate).
const norm = (s) => s.toLowerCase().trim().replace(/\s+/g, " ");

export function fuse(cohort) {
  const { meetup, luma, overrides: ov, dig } = cohort.data;
  const overrides = ov.overrides;

  // alias → canonical normalized name
  const aliasMap = {};
  for (const o of overrides) for (const a of o.aliases || []) aliasMap[norm(a)] = norm(o.name);
  const canon = (name) => aliasMap[norm(name)] || norm(name);

  const people = new Map(); // key: canonical norm name
  function ensure(name) {
    const k = canon(name);
    if (!people.has(k)) people.set(k, { _key: k, name: name.trim(), kind: "member", source: [], tags: [], channels: {} });
    return people.get(k);
  }

  // 1) Meetup members (with harvested location)
  for (const m of meetup.members) {
    const p = ensure(m.name);
    p.source.push(`meetup:${meetup.group}`);
    p.meetupUrl = m.meetupUrl;
    if (!p.location && (m.city || m.country)) p.location = [m.city, m.country].filter(Boolean).join(", ");
    const cc = (m.country || "").toLowerCase();
    const geoTag = cohort.geoTags[cc];
    if (geoTag && !p.tags.includes(geoTag)) p.tags.push(geoTag);
  }

  // 2) Luma guests (merge or create)
  for (const g of luma.guests) {
    const p = ensure(g.name);
    p.source.push(`luma:${g.event}`);
    if (!p.tags.includes(cohort.lumaTag)) p.tags.push(cohort.lumaTag);
    if (g.email) p.channels.email = p.channels.email || g.email;
    if (g.rsvp) p.rsvp = g.rsvp;
  }

  // 3) Apply curated overrides
  for (const o of overrides) {
    const p = ensure(o.name);
    if (o.kind) p.kind = o.kind;
    if (o.github) { p.github = o.github; p.githubUrl = `https://github.com/${o.github}`; }
    if (o.location !== undefined) p.location = o.location;
    if (o.role !== undefined) p.role = o.role;
    if (o.note) p.note = o.note;
    if (o.memoryNode) p.memoryNode = o.memoryNode;
    if (o.crossRef) p.crossRef = o.crossRef;
    if (o.tags) p.tags = [...new Set([...(p.tags || []), ...o.tags])];
    if (o.channels) p.channels = { ...p.channels, ...o.channels };
    if (o.name) p.name = o.name; // prefer curated display name over harvested handle
  }

  // 3.5) Augur dig enrichment (numeric id, public email, site) — keyed by github handle.
  // Runs AFTER overrides so p.github is set. Only enriches already-resolved handles.
  if (dig) {
    const byHandle = {};
    for (const p of people.values()) if (p.github) byHandle[p.github.toLowerCase()] = p;
    for (const r of dig.results) {
      const p = byHandle[(r.github || "").toLowerCase()];
      if (!p) continue;
      if (r.id) p.githubId = r.id;                       // immortal join key
      if (r.sshFp) p.sshFp = r.sshFp;                    // cross-forge identity key
      if (r.email && !p.channels.email) p.channels.email = r.email; // PRIVATE — stripped from public
      if (r.blog && !p.site && /^https?:\/\//.test(r.blog)) p.site = r.blog;
      if (r.twitter && !p.channels.twitter) p.channels.twitter = r.twitter;
    }
  }

  // 4) Finalize: dedupe sources, id, sort (bridges first, then A→Z)
  const list = [...people.values()].map((p) => {
    p.source = [...new Set(p.source)];
    p.id = p._key.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    delete p._key;
    if (!p.github) { p.github = null; p.githubUrl = null; }
    return p;
  });
  list.sort((a, b) => (a.kind === "bridge" ? -1 : b.kind === "bridge" ? 1 : 0) || a.name.localeCompare(b.name));

  return {
    graph: cohort.graph,
    linkedTo: cohort.linkedTo,
    sources: { meetup: `https://www.meetup.com/${meetup.group}/`, luma: luma.calendar },
    lumaEvents: luma.events,
    meetupTotal: meetup.total,
    updated: meetup.updated,
    people: list,
  };
}
