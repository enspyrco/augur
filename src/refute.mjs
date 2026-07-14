// refute — the adversarial confidence pass the README has always promised (and never had).
//
// It is NOT a new confidence model: the per-method priors in fact.mjs (RELIABILITY) already
// encode single-vein trust. refute is the CROSS-vein pass those priors cannot do alone —
// it asks, for each claim, "does a SECOND independent method attest the same thing?"
//   - attested by >=2 distinct methods -> corroborated, stands at its prior.
//   - single-vein only                 -> softened toward a floor (adversarial: assume
//                                          over-claim until a second vein agrees).
// Softness is contagious downward-in-confidence; drop is just soft=0.
//
// Reuse #2 of corroborate() — the same partition compose's receipt-firewall runs, pointed
// at facts instead of LLM citations.
import { corroborate } from "./corroborate.mjs";

const SOFT = 0.8; // multiplier applied to uncorroborated single-vein facts

export function refute(facts, { soft = SOFT } = {}) {
  const key = (f) => `${f.predicate}=${f.value}`;

  // A (predicate,value) is corroborated iff >=2 DISTINCT methods assert it.
  const methodsByKey = new Map();
  for (const f of facts) {
    const set = methodsByKey.get(key(f)) || new Set();
    set.add(f.method);
    methodsByKey.set(key(f), set);
  }
  const corroboratingKeys = new Set(
    [...methodsByKey].filter(([, methods]) => methods.size >= 2).map(([k]) => k)
  );

  const { corroborated, uncorroborated } = corroborate(facts, corroboratingKeys, key);
  return [
    ...corroborated,
    ...uncorroborated.map((f) => ({
      ...f,
      reliability: +(f.reliability * soft).toFixed(3),
      refuted: true,
    })),
  ];
}
