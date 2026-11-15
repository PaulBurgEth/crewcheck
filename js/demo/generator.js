import { mulberry32, gaussian } from './rng.js';
import { applyCabinEffects, CABIN_EPISODE } from './cabin.js';

export const HERO_ID = 'maya';
export const DEMO_DAY = 120;

export const MISSION_EVENTS = [
  { day: 1, id: 'adaptation', label: 'Adaptation week', who: ['maya'], why: 'Headaches and short sleep in the first week are expected as the body adapts to microgravity.' },
  { day: 58, id: 'missed-workouts', label: 'Missed workouts', who: ['maya'], why: 'A week of skipped exercise; reduced training load speeds fitness and bone loss.' },
  { day: 85, id: 'slow-drift', label: 'Sleep drift', who: ['maya'], why: 'Sleep, mood and blood pressure begin a slow shared drift.' },
  { day: 104, id: 'treadmill-maintenance', label: 'Treadmill maintenance', who: ['kenji'], why: 'Treadmill downtime cuts exercise for nine days; a benign cause.' },
  { day: 116, id: 'on-call', label: 'On-call duty', who: ['sofia'], why: 'Night on-call shifts shorten sleep for a week.' },
  { day: 121, id: 'countermeasure', label: 'Countermeasure started', who: ['maya'], why: 'Light and sleep schedule plus added exercise begin.' },
  { day: CABIN_EPISODE.from, id: CABIN_EPISODE.id, label: 'Cabin CO2 high', who: CABIN_EPISODE.who, why: 'Cabin CO2 above the demo limit for three days; several crew report headaches.' },
  { day: 150, id: 'spe', label: 'Solar particle event', who: 'all', why: 'Radiation dose spikes for the whole crew in one day.' },
];

const CREW = [
  { id: 'maya', name: 'Maya Okafor', role: 'Mission specialist', hero: true, mass: 64.0, hr: 60, sbp: 116, dbp: 74, sleepH: 7.4 },
  { id: 'ilya', name: 'Ilya Brandt', role: 'Commander', mass: 82.0, hr: 56, sbp: 118, dbp: 76, sleepH: 7.2 },
  { id: 'sofia', name: 'Sofia Marin', role: 'Crew medical officer', mass: 59.5, hr: 62, sbp: 112, dbp: 72, sleepH: 7.5 },
  { id: 'kenji', name: 'Kenji Arai', role: 'Flight engineer', mass: 73.0, hr: 58, sbp: 120, dbp: 77, sleepH: 7.3 },
];

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const round = (x, d = 0) => { const k = 10 ** d; return Math.round(x * k) / k; };

// piecewise-linear interpolation over [[day, value], ...]
function kf(points, day) {
  if (day <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [d1, v1] = points[i];
    if (day <= d1) {
      const [d0, v0] = points[i - 1];
      return v0 + ((v1 - v0) * (day - d0)) / (d1 - d0);
    }
  }
  return points[points.length - 1][1];
}

const inRange = (d, a, b) => d >= a && d <= b;

// per-day expected values (before noise) and optional noise overrides
function trend(m, day) {
  const t = { hr: m.hr, sbp: m.sbp, dbp: m.dbp, rr: 14, temp: 36.7, spo2: 98, exerciseMin: 90, sleepH: m.sleepH, mood: 4, mass: m.mass, headacheP: 0.04 };
  const sd = { sleepH: [0.35, 0.85], mood: [0.3, 1.5] };
  if (m.id === 'maya') {
    const adapt = day <= 7;
    t.hr += adapt ? 5 : 0;
    t.hr += kf([[85, 0], [120, 3], [121, 3], [140, 0]], day);
    t.sleepH = adapt ? 6.4 : kf([[8, 7.4], [85, 7.4], [100, 6.95], [118, 6.15], [120, 6.1], [121, 6.3], [128, 7.2], [135, 7.4]], day);
    t.mood = kf([[1, 3.5], [7, 3.5], [8, 4], [85, 4], [118, 2.0], [120, 1.9], [121, 2.2], [135, 3.5], [150, 3.9]], day);
    t.sbp = kf([[1, 116], [85, 116], [100, 119], [110, 125], [116, 132], [120, 134], [121, 133.5], [124, 131.5], [128, 131.5], [133, 127], [140, 123]], day);
    t.dbp = kf([[1, 74], [85, 74], [120, 84], [124, 83.5], [128, 83], [140, 76]], day);
    if (inRange(day, 100, 130)) { sd.sbp = [1, 1]; sd.dbp = [1.2, 1.5]; }
    if (adapt) t.exerciseMin = 80;
    t.mass += kf([[57, 0], [61, -0.4], [64, -0.4], [78, 0]], day);
    if (inRange(day, 58, 64)) t.exerciseMin = 17.5;
    t.headacheP = adapt ? 1 : inRange(day, 8, 10) ? 0 : 0.03;
  }
  if (m.id === 'sofia' && inRange(day, 116, 122)) t.sleepH = 6.05;
  if (m.id === 'kenji') {
    if (inRange(day, 104, 112)) t.exerciseMin = 22.5;
    t.mass += kf([[103, 0], [105, -1.2], [112, -1.2], [160, -0.1]], day);
  }
  return { t, sd };
}

function genMember(m, idx, seed) {
  const rng = mulberry32(seed + idx * 7919);
  const g = (sd, clip = 2) => clamp(gaussian(rng) * sd, -clip * sd, clip * sd);
  const gapDays = new Set();
  while (gapDays.size < 2) {
    const d = 11 + Math.floor(rng() * 170);
    if (!inRange(d, 115, 130)) gapDays.add(d);
  }
  const records = [];
  for (let day = 1; day <= 180; day++) {
    const { t, sd } = trend(m, day);
    const s = (k, base, c = 2) => { const [x, cl] = sd[k] ?? [base, c]; return g(x, cl); };
    const r = { day };
    r.hr = round(t.hr + s('hr', 2));
    r.sbp = round(t.sbp + s('sbp', 3));
    r.dbp = round(t.dbp + s('dbp', 2.5));
    r.rr = round(t.rr + g(1));
    r.temp = round(t.temp + g(0.15), 1);
    r.spo2 = Math.min(100, round(t.spo2 + g(0.7)));
    const exTrend = t.exerciseMin;
    r.exerciseMin = exTrend < 40 ? round(exTrend + (rng() - 0.5) * 15) : round(exTrend + g(8));
    r.sleepH = round(t.sleepH + s('sleepH', 0.35), 1);
    r.mood = clamp(round(t.mood + s('mood', 0.3)), 1, 5);
    const hRoll = rng();
    r.vision = 0;
    r.headache = t.headacheP >= 1 ? 1 + Math.floor(rng() * 2) : hRoll < t.headacheP ? 1 : 0;
    r.glucose = round(88 + g(5, 1.8));
    r.mass = round(t.mass + g(0.2), 1);
    r.doseMSv = round(day === 150 ? 25 + rng() * 10 : 1.8 + g(0.15), 2);

    const suitGap = gapDays.has(day);
    for (const k of ['hr', 'sbp', 'dbp', 'rr', 'temp', 'spo2', 'exerciseMin', 'sleepH']) if (suitGap) r[k] = null;
    const manualRoll = rng();
    if (manualRoll < 0.06 && !inRange(day, 1, 10) && !inRange(day, 115, 130) && day !== 140) {
      for (const k of ['mood', 'vision', 'headache', 'glucose', 'mass']) r[k] = null;
    }
    records.push(r);
  }
  const { id, name, role, hero } = m;
  return { id, name, role, ...(hero ? { hero: true } : {}), records };
}

export function generateCrew(seed = 20261114) {
  return applyCabinEffects(CREW.map((m, i) => genMember(m, i, seed)));
}
