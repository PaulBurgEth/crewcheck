import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { RULES } from '../js/data/rules.js';
import { MISSIONS } from '../js/data/missions.js';

const MAX_BODY = 4096;
const CACHE_MAX = 500;
const SYSTEM_PROMPT = 'You explain to an astronaut, in plain English, why a health rule check fired. Input is JSON with mission, day, tier, status and the fired rules (signal, measured value, threshold). Write at most 2 short sentences and up to 3 short points. Never diagnose. Never mention drugs or doses. Never change the status or who acts. Answer ONLY with JSON: {"text": string, "points": [string]}.';

const KEYS = ['mission', 'day', 'tier', 'status', 'fired'];
const FIRED_KEYS = ['rule', 'signal', 'measured', 'threshold'];
const sameKeys = (o, keys) => {
  const k = Object.keys(o);
  return k.length === keys.length && keys.every((x) => k.includes(x));
};
const isObj = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);

export function validatePayload(obj) {
  if (!isObj(obj) || !sameKeys(obj, KEYS)) return false;
  if (!MISSIONS.some((m) => m.id === obj.mission)) return false;
  if (!Number.isInteger(obj.day) || obj.day < 1 || obj.day > 180) return false;
  if (!['none', 'self', 'crew', 'earth'].includes(obj.tier)) return false;
  if (!['green', 'yellow', 'red', 'grey'].includes(obj.status)) return false;
  if (!Array.isArray(obj.fired) || obj.fired.length > 12) return false;
  return obj.fired.every((f) => {
    if (!isObj(f) || !sameKeys(f, FIRED_KEYS)) return false;
    const rule = RULES.find((r) => r.id === f.rule);
    return !!rule && f.signal === rule.signal && Number.isFinite(f.measured) && Number.isFinite(f.threshold);
  });
}

export function parseModelOutput(raw) {
  if (typeof raw !== 'string') return null;
  let s = raw.trim();
  const m = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (m) s = m[1];
  let o;
  try { o = JSON.parse(s); } catch { return null; }
  if (!isObj(o) || typeof o.text !== 'string' || o.text.length > 400) return null;
  if (!Array.isArray(o.points) || o.points.length > 3) return null;
  if (!o.points.every((p) => typeof p === 'string' && p.length <= 140)) return null;
  return { text: o.text, points: o.points };
}

export function makeCallModel({ apiKey, model }) {
  return async (payload) => {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: JSON.stringify(payload) }],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const data = await res.json();
    return data?.content?.[0]?.text;
  };
}

export function createHandler({ callModel, now = Date.now, limits = {}, allowedOrigin }) {
  const dailyCap = limits.dailyCap ?? 300;
  const perIp = limits.perIpPerMin ?? 6;
  const cache = new Map();
  const hits = new Map();
  let day = Math.floor(now() / 86400000);
  let used = 0;

  const send = (res, status, body, origin) => {
    const h = { 'content-type': 'application/json', vary: 'Origin' };
    if (origin) {
      h['access-control-allow-origin'] = allowedOrigin;
      h['access-control-allow-methods'] = 'POST, OPTIONS';
      h['access-control-allow-headers'] = 'Content-Type';
      h['access-control-max-age'] = '600';
    }
    res.writeHead(status, h);
    res.end(body === undefined ? '' : JSON.stringify(body));
  };

  const clientIp = (req) => {
    const remote = req.socket?.remoteAddress || '';
    const loop = remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1';
    const fwd = loop && req.headers['x-real-ip'];
    return typeof fwd === 'string' && fwd.length <= 64 ? fwd : remote;
  };

  const rateLimited = (ip, t) => {
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((x) => t - x < 60000)) hits.delete(k);
    const arr = (hits.get(ip) || []).filter((x) => t - x < 60000);
    if (arr.length >= perIp) { hits.set(ip, arr); return true; }
    arr.push(t);
    hits.set(ip, arr);
    return false;
  };

  const readBody = (req) => new Promise((resolve) => {
    let size = 0;
    const chunks = [];
    let done = false;
    const fin = (v) => { if (!done) { done = true; resolve(v); } };
    if (Number(req.headers['content-length']) > MAX_BODY) return fin(null);
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { fin(null); req.destroy?.(); return; }
      chunks.push(c);
    });
    req.on('end', () => fin(Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => fin(null));
  });

  return async function handler(req, res) {
    try {
      if (req.headers.origin !== allowedOrigin) return send(res, 403, { error: 'forbidden' });
      if (req.method === 'OPTIONS') return send(res, 204, undefined, true);
      const path = (req.url || '').split('?')[0];
      if (req.method !== 'POST' || path !== '/advice') return send(res, 404, { error: 'not found' }, true);

      const t = now();
      if (rateLimited(clientIp(req), t)) return send(res, 429, { error: 'rate limit' }, true);

      const raw = await readBody(req);
      if (raw === null) return send(res, 413, { error: 'too large' }, true);
      let payload;
      try { payload = JSON.parse(raw); } catch { return send(res, 400, { error: 'invalid json' }, true); }
      if (!validatePayload(payload)) return send(res, 400, { error: 'invalid payload' }, true);

      const key = JSON.stringify(payload);
      const cached = cache.get(key);
      if (cached) return send(res, 200, { ...cached, origin: 'live' }, true);

      const today = Math.floor(t / 86400000);
      if (today !== day) { day = today; used = 0; }
      if (used >= dailyCap) return send(res, 429, { error: 'daily cap' }, true);
      used += 1;

      let out;
      try { out = parseModelOutput(await callModel(payload)); } catch { out = null; }
      if (!out) return send(res, 502, { error: 'bad model output' }, true);
      if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
      cache.set(key, out);
      return send(res, 200, { ...out, origin: 'live' }, true);
    } catch {
      if (!res.headersSent) send(res, 500, { error: 'server error' });
    }
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is required');
    process.exit(1);
  }
  const handler = createHandler({
    callModel: makeCallModel({ apiKey, model: process.env.MODEL || 'claude-haiku-5-5' }),
    limits: { dailyCap: Number(process.env.DAILY_CAP) || 300, perIpPerMin: Number(process.env.PER_IP_PER_MIN) || 6 },
    allowedOrigin: process.env.ALLOWED_ORIGIN || '',
  });
  const port = Number(process.env.PORT) || 8790;
  http.createServer(handler).listen(port, '127.0.0.1', () => console.log(`advisor-proxy listening on 127.0.0.1:${port}`));
}
