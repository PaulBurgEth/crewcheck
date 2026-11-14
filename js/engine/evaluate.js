import { RULES, SYSTEMS } from '../data/rules.js';

const RANK = { grey: 0, green: 1, yellow: 2, red: 3 };
export const worst = (a, b) => (RANK[b] > RANK[a] ? b : a);

const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function baselineOf(records, days = 14) {
  const base = {};
  const first = records.filter((r) => r.day <= days);
  for (const sys of SYSTEMS) for (const s of sys.signals) {
    base[s] = mean(first.map((r) => num(r[s])).filter((v) => v !== null));
  }
  return base;
}

function windowMean(records, day, signal, window) {
  const vals = records.filter((r) => r.day <= day && r.day > day - window).map((r) => num(r[signal])).filter((v) => v !== null);
  return mean(vals);
}

const cmp = { gte: (a, b) => a >= b, lte: (a, b) => a <= b, gt: (a, b) => a > b, lt: (a, b) => a < b };

export function measure(rule, records, day, base) {
  const m = windowMean(records, day, rule.signal, rule.window);
  if (m === null) return null;
  if (rule.kind === 'delta') return base[rule.signal] == null ? null : m - base[rule.signal];
  if (rule.kind === 'pct') return base[rule.signal] ? ((m - base[rule.signal]) / base[rule.signal]) * 100 : null;
  return m;
}

// records: day records of one person (any order). Returns status per signal and per system.
export function evaluate(records, day, { rules = RULES, baseline } = {}) {
  const base = baseline || baselineOf(records);
  const fired = [];
  const signals = {};
  for (const rule of rules) {
    const v = measure(rule, records, day, base);
    const sig = (signals[rule.signal] ||= { status: v === null ? 'grey' : 'green', fired: [] });
    if (v === null) continue;
    if (sig.status === 'grey') sig.status = 'green';
    if (cmp[rule.op](v, rule.value)) {
      const f = { ...rule, measured: Math.round(v * 10) / 10 };
      fired.push(f);
      sig.fired.push(f);
      sig.status = worst(sig.status, rule.level);
    }
  }
  const today = records.find((r) => r.day === day) || {};
  for (const [s, sig] of Object.entries(signals)) sig.value = num(today[s]);

  const systems = {};
  let overall = 'grey';
  for (const sys of SYSTEMS) {
    let status = 'grey';
    for (const s of sys.signals) status = worst(status, signals[s]?.status || 'grey');
    systems[sys.id] = { status, fired: fired.filter((f) => f.system === sys.id) };
    overall = worst(overall, status);
  }
  return { day, signals, systems, fired, overall, baseline: base };
}
