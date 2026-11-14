// Live advisor through the CrewCheck proxy. Off until a proxy URL is configured; the demo never depends on it.
// Any failure is silent: precomputed advice stays on screen.
export const PROXY_URL = '';
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
    const points = d.points.filter((p) => typeof p === 'string').slice(0, 3).map((p) => p.slice(0, 140));
    cache.set(key, { text: d.text.slice(0, 400), points, origin: 'live' });
    if (typeof onDone === 'function') onDone();
  } catch {
    // silent by design
  } finally {
    clearTimeout(timer);
  }
}
