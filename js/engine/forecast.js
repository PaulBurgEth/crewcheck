import { RULES } from '../data/rules.js';
import { baselineOf, measure } from './evaluate.js';

const cmp = { gte: (a, b) => a >= b, lte: (a, b) => a <= b, gt: (a, b) => a > b, lt: (a, b) => a < b };
// Days 1-7 are the adaptation week (expected short sleep, higher pulse): not a trend to extrapolate.
export const ADAPTATION_DAYS = 7;
const MIN_T = 3;
const rising = (op) => op === 'gte' || op === 'gt';

export function forecast(records, day, rule, { lookback = 21, horizon = 30 } = {}) {
  if (!rule || (rule.kind !== 'abs' && rule.kind !== 'delta')) return null;
  const base = baselineOf(records);
  const points = [];
  for (let d = Math.max(ADAPTATION_DAYS + 1, day - lookback + 1); d <= day; d++) {
    // Daily values, not the rule's rolling mean: overlapping means make noise look like a trend.
    const v = measure({ ...rule, window: 1 }, records, d, base);
    if (v !== null) points.push({ day: d, value: v });
  }
  // Two weeks of data at least: a one-week fit swings too much to extrapolate 30 days.
  if (points.length < 14) return null;
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.day, 0) / n;
  const my = points.reduce((s, p) => s + p.value, 0) / n;
  let sxx = 0, sxy = 0;
  for (const p of points) { sxx += (p.day - mx) ** 2; sxy += (p.day - mx) * (p.value - my); }
  const slope = sxx ? sxy / sxx : 0;
  const intercept = my - slope * mx;
  const sse = points.reduce((s, p) => s + (p.value - (intercept + slope * p.day)) ** 2, 0);
  const sd = Math.sqrt(sse / Math.max(1, n - 2));

  const cone = [];
  for (let k = 1; k <= horizon; k++) {
    const mid = intercept + slope * (day + k);
    const w = 1.64 * sd * Math.sqrt(1 + k / lookback);
    cone.push({ day: day + k, mid, lo: mid - w, hi: mid + w });
  }
  const now = measure(rule, records, day, base);
  const alreadyFiring = now !== null && cmp[rule.op](now, rule.value);
  const up = rising(rule.op);
  let crossDay = null;
  // Warn only on a real trend: the slope must stand clear of day-to-day noise (t-statistic).
  const tStat = !sxx ? 0 : sd ? slope / (sd / Math.sqrt(sxx)) : slope ? Infinity : 0;
  const trend = Math.abs(tStat) >= MIN_T;
  if (!alreadyFiring && trend && (up ? slope > 0 : slope < 0)) {
    const hit = cone.find((c) => cmp[rule.op](c.mid, rule.value));
    if (hit) crossDay = hit.day;
  }
  return { slope, intercept, sd, points, cone, crossDay, daysToCross: crossDay === null ? null : crossDay - day, alreadyFiring };
}

export function nextCrossings(records, day, rules = RULES) {
  const out = [];
  for (const rule of rules) {
    if (rule.level !== 'yellow' || rule.kind !== 'abs') continue;
    const f = forecast(records, day, rule);
    if (!f || f.alreadyFiring || f.crossDay === null || f.daysToCross > 30) continue;
    out.push({ rule, daysToCross: f.daysToCross, crossDay: f.crossDay });
  }
  return out.sort((a, b) => a.daysToCross - b.daysToCross);
}
