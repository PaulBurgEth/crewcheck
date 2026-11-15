import { h, confBadge } from '../ui.js';
import { state, mission, verdictFor, recordsOf, localEntry, statusStrip, cabin, cabinCase } from '../state.js';
import { evaluate } from '../engine/evaluate.js';
import { el } from '../viz/svg.js';
import { icon } from '../viz/icons.js';
import { personIndex, crewIndex, indexColor } from '../engine/score.js';
import { renderRings } from '../viz/rings.js';
import { renderPatch } from '../viz/badges.js';
import { SYSTEMS } from '../data/rules.js';
import { CABIN_PARAMS } from '../data/cabin.js';
import { cabinOut, radiationCase, SYMPTOMS } from '../engine/cabin.js';
import { MISSION_EVENTS } from '../demo/generator.js';

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

// Mission ribbon marks: cabin events over the crew index strip.
function cabinMarks() {
  return h('div', { class: 'cab-marks', 'aria-hidden': 'true' }, MISSION_EVENTS.filter((e) => e.id.startsWith('cabin')).map((e) =>
    h('span', { class: 'cab-mark', style: `left:${((e.day - 1) / 179) * 100}%`, title: `Day ${e.day}: ${e.label}` }, [icon('cabin')])));
}

// Cabin strip: four parameters plus radiation; a shared cause links the parameter to the affected crew.
function caseBox(c) {
  return h('div', { class: 'cab-case', role: 'status' }, [
    h('div', { class: 'cab-cause' }, [h('span', { text: c.param === 'rad' ? `${c.word} · ${c.who.length} crew` : `Likely cabin cause · ${c.who.length} crew` }), confBadge('hypothesis')]),
    h('div', { class: 'cab-act' }, [icon(c.param === 'rad' ? 'shield' : 'fan'), h('span', { text: c.action })]),
    h('div', { class: 'cab-done' }, [icon('check'), h('span', { text: 'Agent: crew alerted' })]),
    h('div', { class: 'cab-tag', text: 'Non-clinical · no approval' }),
  ]);
}
function cabinStrip(day, cases, rad) {
  const row = cabin[day - 1];
  const out = new Set(cabinOut(row).map((p) => p.id));
  const icons = h('div', { class: 'cab-icons' }, [...CABIN_PARAMS.map((p) => h('span', {
    class: `cab-ic${out.has(p.id) ? ' warn' : ''}`, 'data-param': p.id, title: `${p.title || p.label}: ${row[p.id]} ${p.unit} · Earth indoor reference on Sources`,
  }, [icon(p.icon), h('b', { text: row[p.id].toFixed(p.d) }), h('span', { class: 'cab-u', text: p.unit }), h('span', { class: 'cab-l', text: p.label })])),
  h('span', {
    class: `cab-ic${rad.event ? ' warn' : ''}`, 'data-param': 'rad', title: `Radiation: ${rad.today ?? '–'} mSv today, ${rad.total} mSv so far (crew mean) · magnitudes demo assumption`,
  }, [icon('rad'), h('b', { text: rad.today == null ? '–' : rad.today.toFixed(1) }), h('span', { class: 'cab-u', text: 'mSv' }), h('span', { class: 'cab-l', text: `Rad · ${rad.total} total` })])]);
  const kids = [h('div', { class: 'cab-h' }, [icon('cabin'), h('span', { text: 'Cabin' })]), icons, ...cases.map(caseBox)];
  return h('section', { class: `cab${cases.length ? ' on' : ''}`, 'aria-label': `Cabin, day ${day}` }, kids);
}

// Lines from the out-of-range icon to the affected tiles; redrawn on resize.
function drawLinks(wrap, cases) {
  const old = wrap.querySelector('.cab-links');
  if (old) old.remove();
  if (!cases.length || !wrap.isConnected) return;
  const W = wrap.getBoundingClientRect();
  const ends = [];
  const paths = [];
  for (const cc of cases) {
    const from = wrap.querySelector(`.cab-ic[data-param="${cc.param}"]`);
    const tiles = cc.who.map((id) => wrap.querySelector(`.crew-tile[data-id="${id}"]`)).filter(Boolean);
    if (!from || !tiles.length) continue;
    const f = from.getBoundingClientRect();
    // Lines leave from the strip's lower edge under the icon, so they never cross the case text.
    const x0 = f.left + f.width / 2 - W.left, y0 = wrap.querySelector('.cab').getBoundingClientRect().bottom - W.top;
    const oneCol = new Set(tiles.map((t) => Math.round(t.getBoundingClientRect().left))).size === 1 && tiles.length > 1;
    for (const t of tiles) {
      const r = t.getBoundingClientRect();
      if (oneCol) {
        // Phone: run down the left gutter, then into the tile's left edge.
        const gx = Math.max(3, r.left - W.left - 7), ty = r.top - W.top + 28;
        ends.push([r.left - W.left + 6, ty]);
        paths.push(`M${x0},${y0} V${y0 + 8} H${gx} V${ty} H${r.left - W.left + 6}`);
        continue;
      }
      const x1 = r.left + r.width / 2 - W.left, y1 = r.top - W.top + 2;
      ends.push([x1, y1]);
      const my = (y0 + y1) / 2;
      paths.push(`M${x0},${y0} C${x0},${my} ${x1},${my} ${x1},${y1}`);
    }
  }
  wrap.append(el('svg', { class: 'cab-links', width: W.width, height: W.height, viewBox: `0 0 ${W.width} ${W.height}`, 'aria-hidden': 'true' },
    [...paths.map((d) => el('path', { d })), ...ends.map(([cx, cy]) => el('circle', { cx, cy, r: 3 }))]));
}
let onResize = null;

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
    h('div', { class: `crew-index i-${indexColor(cIdx)}`, title: 'CrewCheck Index (formula on Sources)' }, [h('span', { class: 'ci-num', text: cIdx ?? '–' }), h('span', { class: 'ci-lab', text: 'Crew index' }), h('div', { class: 'ci-ribbon' }, [indexStrip(state.day), cabinMarks()]), h('span', { class: 'ci-sub' }, [h('span', { text: '100 = all normal' }), h('a', { href: '#/sources', class: 'ci-src', title: 'Formula on Sources', 'aria-label': 'Formula on Sources' }, [icon('rule')])])]),
    h('div', { class: 'crew-patch-wrap' }, [patch, h('div', { class: 'ci-sub', text: doneCount === 4 ? 'Crew patch complete' : `Crew patch: ${doneCount} of 4 checked in` })]),
  ]);
  root.append(head);
  countUp(head.querySelector('.ci-num'), 'crew', cIdx);
  patch.append(renderPatch({ done: rows.map((r) => r.done), names: rows.map((r) => r.p.name), size: 96, flash: doneCount === 4 }));

  const cc = cabinCase(state.day);
  const rad = radiationCase(state.crew.map((c) => ({ id: c.id, records: recordsOf(c.id) })), state.day);
  const cases = [cc, rad.event].filter(Boolean);
  const hitIds = new Set(cases.flatMap((c) => c.who));
  const wrap = h('div', { class: 'cab-wrap' });
  wrap.append(cabinStrip(state.day, cases, rad));
  const grid = h('div', { class: 'crew-grid' });
  for (const r of rows) {
    const dots = h('div', { class: 'crew-dots' }, SYSTEMS.map((s) => h('span', { class: `cd cd-${r.ev.systems[s.id].status}`, title: `${s.label}: ${r.ev.systems[s.id].status}` })));
    const tile = h('button', {
      class: `crew-tile t-${r.v.status}${hitIds.has(r.p.id) ? ' cab-hit' : ''}`, 'data-id': r.p.id,
      'aria-label': `${r.p.name}, ${r.v.status}, ${tierText(r.p, r.v.tier, state.crew)}${hitIds.has(r.p.id) ? ', cabin case' : ''}. Open monitor`,
      onclick: () => go('today', { personId: r.p.id }),
    }, [
      h('div', { class: 'ct-ring' }),
      h('div', { class: 'ct-name', text: r.p.name }),
      h('div', { class: 'ct-role', text: r.p.role }),
      dots,
      cc?.who.includes(r.p.id) ? h('div', { class: 'ct-sym', title: 'Shared symptom, linked to the cabin' }, [icon('cabin'), h('span', { text: SYMPTOMS.find((s) => s.id === cc.symptom).label })]) : null,
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
  wrap.append(grid);
  root.append(wrap);
  setTimeout(() => drawLinks(wrap, cases), 0);
  setTimeout(() => drawLinks(wrap, cases), 400);
  if (onResize) removeEventListener('resize', onResize);
  onResize = () => drawLinks(wrap, cases);
  addEventListener('resize', onResize);
}
