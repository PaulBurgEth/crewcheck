import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { RULES } from '../js/data/rules.js';
import { MISSIONS } from '../js/data/missions.js';

const MAX_BODY = 4096;
const CACHE_MAX = 500;
const SYSTEM_PROMPT = [
  'You are the explanation layer of an onboard crew health monitor on a space mission. Rules already decided the status and who acts; never change, question or soften them.',
  'Input is JSON: mission, day, tier, status; fired rules with signal, kind (abs = value, delta = points above the usual value, pct = percent change), measured, threshold, norm (the person\'s usual value), days (consecutive days the rule has fired), unit; linked = body systems that moved together; done = steps the onboard agent already took (remeasure, reminders, report, page = crew medic paged); question.',
  'Use only these fields. Never invent numbers, causes or history. If a field is missing, say the data is limited.',
  'Plain English, short sentences, like a calm colleague. Give the day\'s numbers against the usual value, for example "sleep 5.9 h against your usual 7.4 h", and say for how many days. Mention linked signals if present.',
  'No diagnosis. No medicines, supplements or doses.',
  'By question. None: 2-3 sentences on what moved and why the rules acted. why-now: what crossed today or since which day. wait: if nothing changes the signals stay off; the forecast view in the app shows the trend; do not predict outcomes beyond the data. medic: what the agent already did (from done) and 2-3 things the crew medic should check. handover: a 3-4 sentence note for the crew medic: what happened, what is already done, what to check.',
  'Answer ONLY with JSON: {"text": string, "points": [string]}. text at most 380 characters. At most 3 points, each under 120 characters; points may be empty.',
].join(' ');

const KEYS = ['mission', 'day', 'tier', 'status', 'fired'];
// Optional: one of three fixed questions from the app's buttons. Never free text.
export const QUESTIONS = ['why-now', 'wait', 'medic', 'handover'];
const OPTIONAL = ['question', 'linked', 'done'];
const FIRED_OPTIONAL = ['kind', 'norm', 'days', 'unit'];
const SYSTEM_IDS = ['heart', 'lungs', 'eyes', 'sleep', 'mind', 'bones', 'metabolic'];
const DONE_IDS = ['remeasure', 'reminders', 'report', 'page'];
const FIRED_KEYS = ['rule', 'signal', 'measured', 'threshold'];
const sameKeys = (o, keys) => {
  const k = Object.keys(o);
  return k.length === keys.length && keys.every((x) => k.includes(x));
};
const isObj = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);

export function validatePayload(obj) {
  if (!isObj(obj)) return false;
  // Required keys plus only these optional structured fields; anything else is rejected.
  const keys = Object.keys(obj);
  if (!KEYS.every((k) => keys.includes(k)) || !keys.every((k) => KEYS.includes(k) || OPTIONAL.includes(k))) return false;
  if ('question' in obj && !QUESTIONS.includes(obj.question)) return false;
  if ('linked' in obj && !(Array.isArray(obj.linked) && obj.linked.length <= 7 && obj.linked.every((s) => SYSTEM_IDS.includes(s)))) return false;
  if ('done' in obj && !(Array.isArray(obj.done) && obj.done.length <= 6 && obj.done.every((s) => DONE_IDS.includes(s)))) return false;
  if (!MISSIONS.some((m) => m.id === obj.mission)) return false;
  if (!Number.isInteger(obj.day) || obj.day < 1 || obj.day > 180) return false;
  if (!['none', 'self', 'crew', 'earth'].includes(obj.tier)) return false;
  if (!['green', 'yellow', 'red', 'grey'].includes(obj.status)) return false;
  if (!Array.isArray(obj.fired) || obj.fired.length > 12) return false;
  return obj.fired.every((f) => {
    if (!isObj(f)) return false;
    const fk = Object.keys(f);
    if (!FIRED_KEYS.every((k) => fk.includes(k)) || !fk.every((k) => FIRED_KEYS.includes(k) || FIRED_OPTIONAL.includes(k))) return false;
    const rule = RULES.find((r) => r.id === f.rule);
    if (!rule || f.signal !== rule.signal || !Number.isFinite(f.measured) || !Number.isFinite(f.threshold)) return false;
    if ('kind' in f && f.kind !== rule.kind) return false;
    if ('norm' in f && f.norm !== null && !Number.isFinite(f.norm)) return false;
    if ('days' in f && !(Number.isInteger(f.days) && f.days >= 1 && f.days <= 180)) return false;
    if ('unit' in f && !(typeof f.unit === 'string' && /^[a-zA-Z/%°0-9 ]{0,8}$/.test(f.unit))) return false;
    return true;
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
        // Haiku 5.5 thinks by default; a short explanation does not need it (allowed at effort medium).
        thinking: { type: 'disabled' },
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: JSON.stringify(payload) }],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const data = await res.json();
    if (data?.stop_reason === 'refusal') throw new Error('refusal');
    // Read the text block, not the first block: a thinking block may come first.
    return (data?.content || []).find((c) => c?.type === 'text')?.text;
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
