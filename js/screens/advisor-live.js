// Live advisor through the CrewCheck proxy. Off until a proxy URL is configured; the demo never depends on it.
// Any failure is silent: precomputed advice stays on screen.
import { evaluate } from '../engine/evaluate.js';
import { agentDay } from '../engine/agent.js';
import { SIGNAL_LABEL } from '../data/explain.js';

// Structured context for the live advisor: usual value, how many days, linked systems, steps already done.
// Numbers and ids only; no free text ever leaves the page.
export function livePayload(ev, v, mission, records, fu = null) {
  const r1 = (x) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : null);
  const daysFiring = (id) => {
    let n = 0;
    for (let d = ev.day; d >= 1 && n < 60; d--) { if (evaluate(records, d).fired.some((f) => f.id === id)) n++; else break; }
    return Math.max(1, n);
  };
  const out = {
    mission: mission.id, day: ev.day, tier: v.tier, status: v.status,
    fired: ev.fired.slice(0, 12).map((f) => ({
      rule: f.id, signal: f.signal, measured: f.measured, threshold: f.value,
      kind: f.kind, norm: r1(ev.baseline?.[f.signal]), days: daysFiring(f.id), unit: SIGNAL_LABEL[f.signal]?.[1] || '',
    })),
  };
  if (v.combos?.length) out.linked = v.combos[0].systems;
  if (fu && fu.state !== 'none') out.checked = fu.items.map((i) => ({ signal: i.signal, result: i.result }));
  const done = agentDay(v, mission).done.map((a) => a.id);
  if (done.length) out.done = done;
  return out;
}

export const PROXY_URL = 'https://crewcheck-api.paulburg.com/advice';
const cache = new Map();
const pending = new Set();

export function getLiveAdvice(personId, day, question = 'explain') {
  return cache.get(`${personId}:${day}:${question}`) || null;
}

export async function requestLiveAdvice(personId, day, payload, onDone, question = 'explain') {
  const key = `${personId}:${day}:${question}`;
  if (!PROXY_URL || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
  // One attempt per person, day and question: a failure is not retried on every render.
  if (pending.has(key) || cache.has(key)) return;
  pending.add(key);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 6000);
  try {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(question === 'explain' ? payload : { ...payload, question }),
      signal: ctl.signal,
    });
    if (!res.ok) return;
    const d = await res.json();
    if (typeof d?.text !== 'string' || !Array.isArray(d.points)) return;
    const points = d.points.filter((p) => typeof p === 'string').slice(0, 3).map((p) => p.slice(0, 200));
    cache.set(key, { text: d.text.slice(0, 700), points, origin: 'live' });
    if (typeof onDone === 'function') onDone();
  } catch {
    // silent by design
  } finally {
    clearTimeout(timer);
  }
}
