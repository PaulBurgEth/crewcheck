import { h } from '../ui.js';
import { state, person, mission, verdictFor, statusStrip } from '../state.js';
import { buildDownlink, packetSize } from '../engine/downlink.js';
import { renderSignal } from '../viz/signal.js';
import { SYSTEMS } from '../data/rules.js';
import { SIGNAL_LABEL } from '../data/explain.js';

const pad = (n) => String(n).padStart(2, '0');
const hhmm = (min) => { const t = Math.round(min); return `${pad(Math.floor(t / 60) % 24)}:${pad(t % 60)}`; };
const sysLabel = (id) => SYSTEMS.find((s) => s.id === id)?.label || id;

function tile(value, label, cls = '') {
  return h('div', { class: `ea-tile ${cls}` }, [h('div', { class: 'ea-num', text: String(value) }), h('div', { class: 'ea-lbl', text: label })]);
}

function timeline(e) {
  const span = e.replyAtMin - e.sentAtMin;
  const pos = (m) => (span > 0 ? ((m - e.sentAtMin) / span) * 100 : 0);
  const marks = [
    ['Sent', e.sentAtMin, 0, ''],
    ['Earth', e.arrivesAtMin, span > 0 ? 50 : 0, ''],
    ['Reply ≥', e.replyAtMin, span > 0 ? 100 : 0, ''],
  ];
  const near = span === 0;
  return h('div', { class: 'ea-tl' }, [
    h('div', { class: 'ea-bar' }, marks.map(([, m, p], i) => h('span', { class: `ea-mk ea-mk${i}`, style: `left:${near ? i * 50 : pos(m)}%` }))),
    h('div', { class: 'ea-tl-lbl' }, marks.map(([name, m]) => h('span', { text: `${name} ${hhmm(m)}` }))),
  ]);
}

function entryRow(e) {
  const chips = e.fired.map((id) => h('span', { class: 'ea-chip', text: id }));
  return h('li', { class: 'ea-row' }, [
    h('div', { class: 'ea-day', text: e.lastDay > e.day ? `D${e.day}–${e.lastDay}` : `D${e.day}`, title: e.repeats ? `+${e.repeats} daily status updates` : null }),
    h('span', { class: `ea-dot ea-${e.status}`, 'aria-label': e.status }),
    h('div', { class: 'ea-main' }, [
      h('div', { class: 'ea-head', text: e.headline }),
      timeline(e),
      chips.length ? h('div', { class: 'ea-chips' }, chips) : null,
    ]),
  ]);
}

export default function render(root, { go } = {}) {
  const p = person();
  const m = mission();
  const rep = buildDownlink(p.id, state.day, m.id, verdictFor);
  const { summary } = rep;
  const cur = verdictFor(p.id, state.day, m.id).v;
  const kb = (packetSize(rep.entries) / 1000).toFixed(1);

  // Chips show the signal name, not the rule id
  const ruleSignal = {};
  for (let d = rep.from; d <= state.day; d++) for (const f of verdictFor(p.id, d, m.id).ev.fired) ruleSignal[f.id] = f.signal;
  const entries = rep.entries.map((e) => ({ ...e, fired: [...new Set(e.fired.map((id) => SIGNAL_LABEL[ruleSignal[id]]?.[0] || id))] }));

  const sig = h('div', { class: 'ea-signal' });
  const strip = statusStrip(p.id).slice(rep.from - 1, state.day);
  const copyBtn = h('button', { class: 'ea-copy', type: 'button', text: 'Copy report (JSON)' });
  copyBtn.addEventListener('click', async () => {
    const report = { crew: p.name, mission: m.label, days: [rep.from, state.day], summary, messages: rep.entries };
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      copyBtn.textContent = 'Copied';
    } catch { copyBtn.textContent = 'Copy not available'; }
    setTimeout(() => { copyBtn.textContent = 'Copy report (JSON)'; }, 2000);
  });

  const flagged = Object.entries(summary.systemsFlagged);
  const log = entries.length
    ? h('ol', { class: 'ea-log' }, entries.map(entryRow))
    : h('div', { class: 'ea-empty', text: 'Nothing sent' });

  root.replaceChildren(h('section', { class: 'ea' }, [
    h('h2', { class: 'ea-title', text: `Earth report · ${p.name} · Days ${rep.from}–${state.day}` }),
    sig,
    h('div', { class: 'ea-card' }, [
      h('div', { class: 'ea-tiles' }, [
        tile(summary.green, 'Green days', 'ea-green'),
        tile(summary.yellow, 'Yellow days', 'ea-yellow'),
        tile(summary.red, 'Red days', 'ea-red'),
        tile(summary.sent, 'Sent messages'),
        tile(kb, 'kB downlink'),
      ]),
      h('div', { class: 'ea-strip' }, strip.map((s, i) => h('span', { class: `ea-seg ea-${s}`, title: `Day ${rep.from + i}` }))),
      flagged.length ? h('div', { class: 'ea-pills' }, flagged.map(([id, n]) => h('span', { class: 'ea-pill', text: `${sysLabel(id)} ${n}` }))) : null,
    ]),
    h('h3', { class: 'ea-sub', text: 'Message log' }),
    log,
    h('div', { class: 'ea-actions' }, [copyBtn]),
    h('div', { class: 'ea-foot', text: 'Simulated downlink · nothing leaves this browser' }),
  ]));
  renderSignal(sig, { missionLabel: m.label, oneWayMin: m.oneWayMin, sent: cur.reply.sent, replyLabel: cur.reply.sent ? 'Report sent' : '' });
}
