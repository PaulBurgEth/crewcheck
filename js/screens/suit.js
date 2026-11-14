import { h } from '../ui.js';
import { renderLive } from '../viz/live.js';
import { createStream, detectAlerts } from '../sensor/stream.js';
import { RULES } from '../data/rules.js';

const WINDOW = 40;
const LABEL = { spo2: 'SpO2', hr: 'Pulse', rr: 'Breathing', temp: 'Temperature' };
// Daily signals (blood pressure) are judged on the day summary; the live stream alerts on acute ones.
const ACUTE = RULES.filter((r) => ['spo2', 'hr', 'rr', 'temp'].includes(r.signal));
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function renderSuit(container, { record, seed = 1, onAlert } = {}) {
  clearInterval(container._suitTimer);
  const live = {
    hr: h('div', { class: 'suit-line' }), rr: h('div', { class: 'suit-line' }), spo2: h('div', { class: 'suit-line' }),
  };
  const lines = {
    hr: renderLive(live.hr, { label: 'Pulse', unit: 'bpm', color: 'var(--red)' }),
    rr: renderLive(live.rr, { label: 'Breathing', unit: '/min', color: 'var(--blue)' }),
    spo2: renderLive(live.spo2, { label: 'SpO2', unit: '%', color: 'var(--green)' }),
  };
  const banner = h('div', { class: 'suit-alert', role: 'alert', hidden: true });
  const btn = h('button', { type: 'button', class: 'suit-btn', text: 'Simulate SpO2 drop' });
  container.classList.add('suit-card');
  container.replaceChildren(
    h('div', { class: 'suit-head' }, [
      h('span', { class: 'suit-title', text: 'Suit live' }),
      h('span', { class: 'suit-status' }, [h('span', { class: 'suit-dot' }), 'Streaming · modelled on CSA Bio-Monitor']),
    ]),
    banner,
    h('div', { class: 'suit-lines' }, [live.hr, live.rr, live.spo2]),
    btn,
  );

  let stream, samples, seen, runId = 0;
  const start = (event) => {
    stream = createStream(record, { seed, event });
    samples = []; seen = new Set();
    banner.hidden = true; banner.textContent = '';
    banner.className = 'suit-alert';
    for (const k of Object.keys(lines)) lines[k] = renderLive(live[k], { label: LABEL[k] === 'SpO2' ? 'SpO2' : LABEL[k], unit: k === 'hr' ? 'bpm' : k === 'rr' ? '/min' : '%', color: k === 'hr' ? 'var(--red)' : k === 'rr' ? 'var(--blue)' : 'var(--green)' });
    runId++;
  };
  start(null);
  // New mission day: keep the lines running, only move the stream to the new day's values.
  container._suitSetRecord = (rec) => { record = rec; stream = createStream(record, { seed: seed + samples.length }); };
  btn.addEventListener('click', () => start({ type: 'spo2-drop', at: 8, depth: 7, length: 14 }));

  const tick = () => {
    if (!container.isConnected) { clearInterval(container._suitTimer); return; }
    const s = stream.next();
    samples.push(s);
    if (samples.length > WINDOW) samples.shift();
    for (const k of Object.keys(lines)) lines[k].push(s[k]);
    for (const a of detectAlerts(samples, ACUTE)) {
      const id = `${runId}:${a.ruleId}`;
      if (seen.has(id)) continue;
      seen.add(id);
      banner.className = `suit-alert suit-${a.level}`;
      banner.textContent = `${LABEL[a.signal] || a.signal} ${Math.round(a.value)}${a.signal === 'spo2' ? '%' : ''} · auto alert · no input needed`;
      banner.hidden = false;
      if (typeof onAlert === 'function') onAlert(a);
    }
  };
  container._suitTimer = setInterval(tick, reduced() ? 2000 : 700);
}
