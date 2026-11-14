// Live advisor through the CrewCheck proxy. Off until a proxy URL is configured; the demo never depends on it.
// Any failure is silent: precomputed advice stays on screen.
export const PROXY_URL = '';
const cache = new Map();

export function getLiveAdvice(personId, day) {
  return cache.get(`${personId}:${day}`) || null;
}

export async function requestLiveAdvice(personId, day, payload, onDone) {
  if (!PROXY_URL || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 6000);
  try {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctl.signal,
    });
    if (!res.ok) return;
    const d = await res.json();
    if (typeof d?.text !== 'string' || !Array.isArray(d.points)) return;
    const points = d.points.filter((p) => typeof p === 'string').slice(0, 3).map((p) => p.slice(0, 140));
    cache.set(`${personId}:${day}`, { text: d.text.slice(0, 400), points, origin: 'live' });
    if (typeof onDone === 'function') onDone();
  } catch {
    // silent by design
  } finally {
    clearTimeout(timer);
  }
}
