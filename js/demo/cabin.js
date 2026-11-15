import { mulberry32, gaussian } from './rng.js';

// One cabin episode, away from the hero's story days (1-10, 55-70, 100-135, 180).
export const CABIN_EPISODE = { id: 'cabin-co2', from: 40, to: 42, param: 'co2', who: ['ilya', 'sofia', 'kenji'] };

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const round = (x, d = 0) => { const k = 10 ** d; return Math.round(x * k) / k; };
const inEp = (day) => day >= CABIN_EPISODE.from && day <= CABIN_EPISODE.to;

// Own random stream, so crew series stay exactly as before.
export function generateCabin(seed = 20261114) {
  const rng = mulberry32((seed ^ 0x0cab1e) >>> 0);
  const g = (sd) => clamp(gaussian(rng) * sd, -2 * sd, 2 * sd);
  const rows = [];
  for (let day = 1; day <= 180; day++) {
    const co2 = inEp(day) ? 5 + rng() * 0.6 : 2.6 + g(0.3);
    rows.push({ day, co2: round(co2, 1), noise: round(58 + g(1.5)), cabinTemp: round(22.5 + g(0.5), 1), light: round(320 + g(25)) });
  }
  return rows;
}

// Episode effect on the affected crew: mild headache and slightly shorter sleep. No random numbers used.
export function applyCabinEffects(crew) {
  for (const m of crew) {
    if (!CABIN_EPISODE.who.includes(m.id)) continue;
    for (const r of m.records) {
      if (!inEp(r.day)) continue;
      if (r.headache != null) r.headache = Math.max(r.headache, 1);
      if (r.sleepH != null) r.sleepH = round(r.sleepH - 0.2, 1);
    }
  }
  return crew;
}
