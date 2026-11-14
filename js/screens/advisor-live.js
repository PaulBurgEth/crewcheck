// Live advisor through the CrewCheck proxy. Off until a proxy URL is configured; the demo never depends on it.
export const PROXY_URL = '';
const cache = new Map();
export function getLiveAdvice(personId, day) {
  return cache.get(`${personId}:${day}`) || null;
}
