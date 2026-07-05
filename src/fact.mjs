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
  // crt.sh / Certificate Transparency — the RECORD is cryptographically anchored, but a cert
  // corroborates INFRASTRUCTURE, not a person; identity strength is capped by the domain-link source.
  ct_linked_domain: 0.8,    // two apexes co-listed on ONE cert (few-tenant) → same operator (strong)
  ct_record: 0.7,           // cert count / first-seen — the domain runs real, dated infrastructure
  ct_infra: 0.55,           // a subdomain footprint — real hosts, but weak binding to the subject
};

export const fact = (predicate, value, method, source) => ({
  predicate, value, method, source: source || null, reliability: RELIABILITY[method] ?? 0.5,
});
