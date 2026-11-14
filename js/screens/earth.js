import { h } from '../ui.js';
import { state, person, mission, verdictFor, statusStrip, set } from '../state.js';
import { buildDownlink, packetSize } from '../engine/downlink.js';
import { MISSIONS } from '../data/missions.js';
import { linkOf, shipSvg, earthSvg, reduced, homeRow, tabLabel } from '../viz/scene.js';
import { icon } from '../viz/icons.js';
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

const dayLabel = (e) => (e.lastDay > e.day ? `D${e.day}–${e.lastDay}` : `D${e.day}`);

// One-way delay in words, used on the line itself.
export function eachWay(m) {
  const s = m.oneWayMin * 60;
  if (s < 0.01) return 'Live link';
  if (s < 60) return `${Math.round(s * 10) / 10} s each way`;
  return `${Math.round(m.oneWayMin)} min each way`;
}

// Ship -> Earth on one line (same geometry as the Monitor scene). Each message is an envelope
// in its verdict colour; it leaves the ship, travels the line and lands on Earth.
function linkPicture(m, entries) {
  const L = linkOf(m);
  const board = h('div', { class: 'ea-q' });
  const landed = h('div', { class: 'ea-q' });
  const line = h('div', { class: 'scn-line ea-line' }, [h('div', { class: 'scn-wire' }), h('span', { class: 'ea-each', text: eachWay(m) })]);
  const band = h('div', { class: 'scn-band ea-band', role: 'img', 'aria-label': `${m.label}: ${entries.length} messages, ${eachWay(m)}` }, [
    h('div', { class: 'ea-end' }, [shipSvg(), h('span', { class: 'ea-t', text: `Sent ${hhmm(entries[0]?.sentAtMin ?? 480)}` })]),
    line,
    h('div', { class: 'ea-end ea-earth' }, [earthSvg(), h('span', { class: 'ea-t', text: `Lands ${hhmm(entries[0]?.arrivesAtMin ?? 480 + m.oneWayMin)}` })]),
  ]);
  const chip = (e) => h('span', { class: `ea-mail d-${e.status}`, title: e.headline }, [icon('envelope'), h('span', { text: dayLabel(e) })]);
  const tag = h('span', { class: 'scn-tag ea-speed' });
  const again = h('button', { type: 'button', class: 'scn-cmp ea-again' }, [icon('replay'), h('span', { text: 'Send again' })]);
  const box = h('div', { class: 'scn ea-link', 'data-mission': m.id, style: `--len:${L.len}` }, [
    band,
    homeRow(m),
    h('div', { class: 'ea-qs' }, [
      h('div', { class: 'ea-qcol ea-q-ship' }, [h('span', { class: 'ea-qh', text: 'On board' }), board]),
      h('div', { class: 'ea-qcol ea-q-earth' }, [h('span', { class: 'ea-qh', text: 'At Earth' }), landed]),
    ]),
    h('div', { class: 'ea-link-foot' }, [tag, again]),
  ]);

  let timers = [];
  const stop = () => { timers.forEach(clearInterval); timers = []; };
  function run() {
    stop();
    line.querySelectorAll('.ea-env').forEach((n) => n.remove());
    const still = reduced() || !entries.length;
    tag.textContent = !entries.length ? 'Nothing sent' : still ? 'Motion off' : L.far ? `${Math.round(L.oneWayS / 60)} min → ${(L.roundMs / 1000).toFixed(1)} s` : 'Arrives at once';
    board.replaceChildren(...(still ? [] : entries.map(chip)));
    landed.replaceChildren(...(still ? entries.map(chip) : []));
    if (still) return;
    const gap = Math.min(900, L.roundMs * 0.45);
    const t0 = Date.now();
    entries.forEach((e, i) => {
      const env = h('span', { class: `ea-env d-${e.status}`, hidden: true }, [icon('envelope'), h('span', { class: 'ea-env-d', text: dayLabel(e) })]);
      line.append(env);
      const start = t0 + i * gap;
      const id = setInterval(() => {
        if (!box.isConnected) { stop(); return; }
        const k = (Date.now() - start) / L.roundMs;
        if (k < 0) return;
        if (env.hidden) { env.hidden = false; board.firstChild?.remove(); }
        env.style.left = `${Math.min(1, k) * 100}%`;
        if (k >= 1) {
          clearInterval(id);
          env.remove();
          landed.append(chip(e));
          const ea = band.querySelector('.ea-earth');
          ea.classList.add('ea-hit');
          setTimeout(() => ea.classList.remove('ea-hit'), 800);
        }
      }, 40);
      timers.push(id);
    });
  }
  again.addEventListener('click', run);
  return { box, run };
}

export default function render(root, { go } = {}) {
  const p = person();
  const m = mission();
  const rep = buildDownlink(p.id, state.day, m.id, verdictFor);
  const { summary } = rep;
  const kb = (packetSize(rep.entries) / 1000).toFixed(1);

  // Chips show the signal name, not the rule id
  const ruleSignal = {};
  for (let d = rep.from; d <= state.day; d++) for (const f of verdictFor(p.id, d, m.id).ev.fired) ruleSignal[f.id] = f.signal;
  const entries = rep.entries.map((e) => ({ ...e, fired: [...new Set(e.fired.map((id) => SIGNAL_LABEL[ruleSignal[id]]?.[0] || id))] }));

  const pic = linkPicture(m, entries);
  const sw = h('div', { class: 'scn-switch ea-switch', role: 'radiogroup', 'aria-label': 'Distance from Earth' }, MISSIONS.map((mi) => h('button', {
    type: 'button', class: `scn-ms${mi.id === m.id ? ' on' : ''}`, role: 'radio', 'aria-checked': String(mi.id === m.id), 'data-mission': mi.id,
    onclick: () => { if (mi.id !== state.missionId) set({ missionId: mi.id }); },
  }, tabLabel(mi))));
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
    ? h('details', { class: 'ea-logbox' }, [h('summary', { text: `Message log · ${entries.length}` }), h('ol', { class: 'ea-log' }, entries.map(entryRow))])
    : h('div', { class: 'ea-empty', text: 'Nothing sent' });

  root.replaceChildren(h('section', { class: 'ea' }, [
    h('h2', { class: 'ea-title' }, [h('span', { text: 'Earth link' }), h('span', { class: 'ea-who', text: `${p.name} · D${rep.from}–${state.day}` })]),
    sw,
    pic.box,
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
    log,
    h('div', { class: 'ea-actions' }, [copyBtn]),
    h('div', { class: 'ea-foot', text: 'Simulated downlink · stays in browser' }),
  ]));
  pic.run();
}
