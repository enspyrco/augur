// corroborate — augur's trust spine, extracted from compose's anti-creepiness firewall.
//
// The invariant, stated once: an assertion is only as strong as its independent public
// corroboration. Given items (each exposing a `key`) and the set of corroborating keys,
// partition into { corroborated, uncorroborated }. This function does NOT decide the
// consequence — each caller does, and the seam between them is the whole point:
//
//   - compose's receipt-firewall : DROP     the uncorroborated  (binary)
//   - refute                     : DOWNGRADE the uncorroborated  (continuous)
//   - weave (roadmap)            : ASSERT only the corroborated  (binary)
//
// Drop is just downgrade-to-zero, so the continuous form (refute) subsumes the binary
// form (compose/weave). One primitive, three hats.
export function corroborate(items, corroboratingKeys, key = (x) => x.source) {
  const trusted = corroboratingKeys instanceof Set ? corroboratingKeys : new Set(corroboratingKeys);
  const corroborated = [];
  const uncorroborated = [];
  for (const it of items) (trusted.has(key(it)) ? corroborated : uncorroborated).push(it);
  return { corroborated, uncorroborated };
}
