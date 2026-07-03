// A single excavated fact with provenance, ready for `fuse`.
// {predicate, value, method, reliability, source}
//   method     — how it was obtained (drives the reliability prior)
//   source     — the URL/locator it came from (provenance; AUGUR-DESIGN §2.5 stamp)
//   reliability — measured per-vein prior (AUGUR-DESIGN §3.4)
export const RELIABILITY = {
  profile_id: 0.99, gpg_uid: 0.97, ssh_fp: 0.98, gravatar: 0.99, profile_field: 0.9,
  registry_officer: 0.97,   // government company registry — high
  scholarly_author: 0.85,   // name+topic match on a works index — good, not certain (namesakes)
  patent_inventor: 0.85,
  handle_match: 0.68,       // 1 − 0.323 measured username-collision FP rate
};

export const fact = (predicate, value, method, source) => ({
  predicate, value, method, source: source || null, reliability: RELIABILITY[method] ?? 0.5,
});
