import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { RULES } from '../js/data/rules.js';
import { MISSIONS } from '../js/data/missions.js';

const MAX_BODY = 4096;
const CACHE_MAX = 500;
const SYSTEM_PROMPT = [
  'You are the explanation layer of an onboard crew health monitor on a space mission. Rules already decided the status and who acts; never change, question or soften them, and do not restate the status or tier.',
  'Input is JSON: fired rules with signal, kind (abs = value, delta = points above the usual value, pct = percent change), measured, threshold, norm (the person\'s usual value), days (consecutive days the rule has fired), since (mission day it started), unit; optional linked = body systems that moved together; done = steps the onboard agent already took (remeasure, reminders, report, page = crew medic paged); checked = result of the countermeasure re-check per signal; question.',
  'Use only these fields. Never invent numbers, causes or history. Do not comment on fields that are absent. If the numbers themselves are missing, say the data is limited.',
  'Write like a calm colleague, in plain English. Speak to the crew member, except for medic and handover: those speak to the crew medic and call the person "the crew member" (for example "the crew member\'s usual 116 mmHg"), never "you" or "your" for the patient. Do not start with the day or the status. When you give a number, set it against the usual value, for example "sleep 5.9 h against your usual 6.8 h", and say for how long. Mention only the most telling numbers, not every rule.',
  'No diagnosis. No medicines, supplements or doses.',
  'By question. None: 2 sentences on what moved together and why the rules acted. why-now: 1-2 sentences that name which rule crossed its threshold and on which mission day (since) it started; do not repeat the general summary. wait: 1-2 sentences: if nothing changes these signals stay off, the forecast view shows the trend; if checked is present say what the re-check showed. medic: 1 sentence on what the agent already did, then points with 2-3 things to check. handover: 3 sentences for the crew medic: what happened (with numbers), what is already done, what to check; include the re-check result if present.',
  'Answer ONLY with JSON: {"text": string, "points": [string]}. text at most 300 characters. points: at most 3, each under 100 characters; use an empty list unless the question is medic or handover.',
].join(' ');

const KEYS = ['mission', 'day', 'tier', 'status', 'fired'];
// Optional: one of three fixed questions from the app's buttons. Never free text.
export const QUESTIONS = ['why-now', 'wait', 'medic', 'handover'];
const OPTIONAL = ['question', 'linked', 'done', 'checked'];
const FIRED_OPTIONAL = ['kind', 'norm', 'days', 'unit', 'since'];
const SYSTEM_IDS = ['heart', 'lungs', 'eyes', 'sleep', 'mind', 'bones', 'metabolic'];
const DONE_IDS = ['remeasure', 'reminders', 'report', 'page'];
const SIGNAL_IDS = [...new Set(RULES.map((r) => r.signal))];
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
  if ('checked' in obj && !(Array.isArray(obj.checked) && obj.checked.length <= 6 && obj.checked.every((c) => isObj(c) && sameKeys(c, ['signal', 'result']) && SIGNAL_IDS.includes(c.signal) && ['worked', 'not-worked', 'pending'].includes(c.result)))) return false;
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
    if ('since' in f && !(Number.isInteger(f.since) && f.since >= 1 && f.since <= 180)) return false;
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
  if (!isObj(o) || typeof o.text !== 'string' || o.text.length > 700) return null;
  if (!Array.isArray(o.points) || o.points.length > 3) return null;
  if (!o.points.every((p) => typeof p === 'string' && p.length <= 200)) return null;
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
