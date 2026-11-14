// Simulated suit stream, modelled on CSA Bio-Monitor. One sample per simulated 10 s.
const DEFAULTS = { hr: 64, rr: 14, spo2: 98, temp: 36.7, sbp: 118, dbp: 76 };
const NOISE = { hr: 1.5, rr: 0.5, spo2: 0.4, temp: 0.05, sbp: 2, dbp: 1.5 };

function prng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 0..1 envelope: smooth rise, plateau, smooth recovery.
function envelope(i, at, length) {
  const k = i - at;
  if (k < 0 || k >= length) return 0;
  const edge = Math.max(1, Math.floor(length / 4));
  const x = Math.min(k + 1, length - k, edge) / edge;
  return x * x * (3 - 2 * x);
}

export function createStream(record, { seed = 1, event = null } = {}) {
  const rnd = prng(seed);
  const base = {};
  for (const k of Object.keys(DEFAULTS)) {
    const v = record?.[k];
    base[k] = Number.isFinite(v) ? v : DEFAULTS[k];
  }
  let t = 0;
  let wander = 0;
  return {
    next() {
      wander = wander * 0.9 + (rnd() - 0.5) * 0.6;
      const s = { t };
      for (const k of Object.keys(DEFAULTS)) s[k] = base[k] + (rnd() * 2 - 1) * NOISE[k] + (k === 'hr' ? wander : 0);
      if (event) {
        const e = envelope(t, event.at, event.length) * event.depth;
        if (event.type === 'spo2-drop') s.spo2 -= e;
        else if (event.type === 'hr-spike') s.hr += e;
      }
      s.spo2 = Math.min(100, s.spo2);
      s.hr = Math.round(s.hr);
      s.rr = Math.round(s.rr * 10) / 10;
      s.spo2 = Math.round(s.spo2 * 10) / 10;
      s.temp = Math.round(s.temp * 100) / 100;
      s.sbp = Math.round(s.sbp);
      s.dbp = Math.round(s.dbp);
      t += 1;
      return s;
    },
  };
}

const OPS = {
  gte: (a, b) => a >= b,
  lte: (a, b) => a <= b,
  gt: (a, b) => a > b,
  lt: (a, b) => a < b,
};
const SIGNALS = new Set(['hr', 'rr', 'spo2', 'temp', 'sbp', 'dbp']);
const NEEDED = 3;

export function detectAlerts(samples, rules) {
  const out = [];
  for (const r of rules) {
    if (r.kind !== 'abs' || !SIGNALS.has(r.signal) || !OPS[r.op]) continue;
    let run = 0;
    for (const s of samples) {
      const v = s[r.signal];
      run = Number.isFinite(v) && OPS[r.op](v, r.value) ? run + 1 : 0;
      if (run >= NEEDED) {
        out.push({ ruleId: r.id, signal: r.signal, level: r.level, value: v, t: s.t });
        break;
      }
    }
  }
  return out;
}
