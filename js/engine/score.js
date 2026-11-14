// CrewCheck Index: one number per person and per crew, with open weights.
// Index = 100 × Σ(weight × points) / Σ(weight of systems with data); points: green 1, yellow 0.6, red 0.2.
export const WEIGHTS = { heart: 0.25, lungs: 0.15, sleep: 0.15, mind: 0.15, eyes: 0.1, bones: 0.1, metabolic: 0.1 };
export const POINTS = { green: 1, yellow: 0.6, red: 0.2 };
export const SCORE_SOURCE = 'demo-assumption';

export function personIndex(evaluation) {
  let sum = 0;
  let wsum = 0;
  for (const [sys, w] of Object.entries(WEIGHTS)) {
    const p = POINTS[evaluation.systems[sys]?.status];
    if (p === undefined) continue;
    sum += w * p;
    wsum += w;
  }
  return wsum ? Math.round((100 * sum) / wsum) : null;
}

// Crew index: mean of members, but never above the lowest member + 20 (one sick member pulls the crew down).
export function crewIndex(indices) {
  const xs = indices.filter((x) => x != null);
  if (!xs.length) return null;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.round(Math.min(mean, Math.min(...xs) + 20));
}

export const indexColor = (i) => (i == null ? 'grey' : i >= 90 ? 'green' : i >= 70 ? 'yellow' : 'red');
