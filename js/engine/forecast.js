import { RULES } from '../data/rules.js';
import { baselineOf, measure } from './evaluate.js';

const cmp = { gte: (a, b) => a >= b, lte: (a, b) => a <= b, gt: (a, b) => a > b, lt: (a, b) => a < b };
const rising = (op) => op === 'gte' || op === 'gt';

export function forecast(records, day, rule, { lookback = 21, horizon = 30 } = {}) {
  if (!rule || (rule.kind !== 'abs' && rule.kind !== 'delta')) return null;
  const base = baselineOf(records);
  const points = [];
  for (let d = Math.max(1, day - lookback + 1); d <= day; d++) {
    const v = measure(rule, records, d, base);
    if (v !== null) points.push({ day: d, value: v });
  }
  if (points.length < 7) return null;
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
  const last = points[points.length - 1];
  const alreadyFiring = last.day === day && cmp[rule.op](last.value, rule.value);
  const up = rising(rule.op);
  let crossDay = null;
  if (!alreadyFiring && (up ? slope > 0 : slope < 0)) {
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
