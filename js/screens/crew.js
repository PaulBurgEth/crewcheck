import { h } from '../ui.js';
import { state, mission, verdictFor, recordsOf, localEntry, statusStrip } from '../state.js';
import { evaluate } from '../engine/evaluate.js';
import { el } from '../viz/svg.js';
import { icon } from '../viz/icons.js';
import { personIndex, crewIndex, indexColor } from '../engine/score.js';
import { renderRings } from '../viz/rings.js';
import { renderPatch } from '../viz/badges.js';
import { SYSTEMS } from '../data/rules.js';

const TIER_LABEL = { none: 'All clear', self: 'Handles it alone', crew: 'Crew medic', earth: 'Flight surgeon' };
// The crew medic is a crew member; when the medic is the patient, the commander backs up (demo assumption).
const tierText = (p, tier, crew) => {
  if (tier !== 'crew') return TIER_LABEL[tier];
  const medic = crew.find((c) => /medical/i.test(c.role));
  const backup = crew.find((c) => /commander/i.test(c.role));
  return p.id === medic?.id ? `Backup: ${backup.name.split(' ')[0]}` : `→ ${medic.name.split(' ')[0]} (crew medic)`;
};
const CSSV = (n) => `var(--${n})`;

// Numbers count from the last shown value, so a change (after a check-in, a new day) is seen, not jumped.
const shown = new Map();
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
function countUp(node, key, to) {
  if (!node || to == null) return;
  const from = shown.has(key) ? shown.get(key) : to;
  shown.set(key, to);
  if (from === to || reduced()) { node.textContent = String(to); return; }
  const t0 = Date.now();
  node.textContent = String(from);
  const timer = setInterval(() => {
    const k = Math.min(1, (Date.now() - t0) / 700);
    node.textContent = String(Math.round(from + (to - from) * (1 - (1 - k) ** 3)));
    if (k >= 1 || !node.isConnected) clearInterval(timer);
  }, 30);
}

// Crew index over the whole mission, recomputed only when someone's data changes.
let seriesKey = null;
let series = [];
function indexSeries() {
  const strips = state.crew.map((c) => statusStrip(c.id));
  if (seriesKey && strips.every((s, i) => s === seriesKey[i])) return series;
  seriesKey = strips;
  series = Array.from({ length: 180 }, (_, i) => crewIndex(state.crew.map((c) => personIndex(evaluate(recordsOf(c.id), i + 1)))));
  return series;
}
function indexStrip(day) {
  const s = indexSeries();
  const W = 180, H = 24, lo = Math.min(...s.filter((v) => v != null)) - 3, x = (d) => d - 1, y = (v) => H - 2 - ((v - lo) / (100 - lo)) * (H - 4);
  const pts = s.map((v, i) => (v == null ? null : `${x(i + 1)},${y(v).toFixed(1)}`)).filter(Boolean).join(' ');
  return el('svg', { class: 'ci-strip', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', role: 'img', 'aria-label': `Crew index over 180 days, day ${day}: ${s[day - 1] ?? '–'}` }, [
    el('polyline', { points: pts, class: 'ci-strip-l' }),
    el('line', { x1: x(day), x2: x(day), y1: 0, y2: H, class: 'ci-strip-now' }),
  ]);
}

function checkedIn(personId, day) {
  if (localEntry(personId, day)) return true;
  const r = recordsOf(personId).find((x) => x.day === day);
  return r?.mood != null;
}

// Crew medical officer's board: one tile per member, tap opens that person's monitor.
export default function renderCrew(root, { go }) {
  const m = mission();
  const rows = state.crew.map((p) => {
    const { ev, v } = verdictFor(p.id);
    return { p, ev, v, idx: personIndex(ev), done: checkedIn(p.id, state.day) };
  });
  const cIdx = crewIndex(rows.map((r) => r.idx));
  const doneCount = rows.filter((r) => r.done).length;

  const patch = h('div', { class: 'crew-patch' });
  const head = h('div', { class: 'crew-head' }, [
    h('div', {}, [h('div', { class: 'crew-title', text: `Crew · Day ${state.day}` }), h('div', { class: 'muted', text: `${m.label} · ${m.careLabel}` })]),
    h('div', { class: `crew-index i-${indexColor(cIdx)}`, title: 'CrewCheck Index (formula on Sources)' }, [h('span', { class: 'ci-num', text: cIdx ?? '–' }), h('span', { class: 'ci-lab', text: 'Crew index' }), indexStrip(state.day), h('span', { class: 'ci-sub' }, [h('span', { text: '100 = all normal' }), h('a', { href: '#/sources', class: 'ci-src', title: 'Formula on Sources', 'aria-label': 'Formula on Sources' }, [icon('rule')])])]),
    h('div', { class: 'crew-patch-wrap' }, [patch, h('div', { class: 'ci-sub', text: doneCount === 4 ? 'Crew patch complete' : `Crew patch: ${doneCount} of 4 checked in` })]),
  ]);
  root.append(head);
  countUp(head.querySelector('.ci-num'), 'crew', cIdx);
  patch.append(renderPatch({ done: rows.map((r) => r.done), names: rows.map((r) => r.p.name), size: 96, flash: doneCount === 4 }));

  const grid = h('div', { class: 'crew-grid' });
  for (const r of rows) {
    const dots = h('div', { class: 'crew-dots' }, SYSTEMS.map((s) => h('span', { class: `cd cd-${r.ev.systems[s.id].status}`, title: `${s.label}: ${r.ev.systems[s.id].status}` })));
    const tile = h('button', {
      class: `crew-tile t-${r.v.status}`,
      'aria-label': `${r.p.name}, ${r.v.status}, ${tierText(r.p, r.v.tier, state.crew)}. Open monitor`,
      onclick: () => go('today', { personId: r.p.id }),
    }, [
      h('div', { class: 'ct-ring' }),
      h('div', { class: 'ct-name', text: r.p.name }),
      h('div', { class: 'ct-role', text: r.p.role }),
      dots,
      h('div', { class: `ct-tier tier-${r.v.tier}`, text: tierText(r.p, r.v.tier, state.crew) }),
      h('div', { class: `ct-check ${r.done ? 'ok' : ''}`, text: r.done ? '✓ Checked in' : '○ Check-in due' }),
    ]);
    renderRings(tile.querySelector('.ct-ring'), {
      size: 92,
      center: String(r.idx ?? '–'),
      rings: [{ label: 'Index', value: (r.idx ?? 0) / 100, color: CSSV(indexColor(r.idx)) }],
    });
    countUp(tile.querySelector('.cc-ring-center'), r.p.id, r.idx);
    grid.append(tile);
  }
  root.append(grid);
}
