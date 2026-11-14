import { h } from '../ui.js';
import { state, mission, verdictFor, recordsOf, localEntry } from '../state.js';
import { personIndex, crewIndex, indexColor } from '../engine/score.js';
import { renderRings } from '../viz/rings.js';
import { SYSTEMS } from '../data/rules.js';

const TIER_LABEL = { none: 'All clear', self: 'Acts alone', crew: 'Crew medic', earth: 'Flight surgeon' };
const CSSV = (n) => `var(--${n})`;

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
    h('div', { class: `crew-index i-${indexColor(cIdx)}`, title: 'CrewCheck Index (formula on Sources)' }, [h('span', { class: 'ci-num', text: cIdx ?? '–' }), h('span', { class: 'ci-lab', text: 'Crew index' })]),
    patch,
  ]);
  root.append(head);
  renderRings(patch, {
    size: 96,
    center: `${doneCount}/4`,
    rings: [{ label: 'Crew checked in today', value: doneCount / 4, color: CSSV('blue') }],
  });

  const grid = h('div', { class: 'crew-grid' });
  for (const r of rows) {
    const dots = h('div', { class: 'crew-dots' }, SYSTEMS.map((s) => h('span', { class: `cd cd-${r.ev.systems[s.id].status}`, title: `${s.label}: ${r.ev.systems[s.id].status}` })));
    const tile = h('button', {
      class: `crew-tile t-${r.v.status}`,
      'aria-label': `${r.p.name}, ${r.v.status}, ${TIER_LABEL[r.v.tier]}. Open monitor`,
      onclick: () => go('today', { personId: r.p.id }),
    }, [
      h('div', { class: 'ct-ring' }),
      h('div', { class: 'ct-name', text: r.p.name }),
      h('div', { class: 'ct-role', text: r.p.role }),
      dots,
      h('div', { class: `ct-tier tier-${r.v.tier}`, text: TIER_LABEL[r.v.tier] }),
      h('div', { class: `ct-check ${r.done ? 'ok' : ''}`, text: r.done ? '✓ Checked in' : '○ Check-in due' }),
    ]);
    renderRings(tile.querySelector('.ct-ring'), {
      size: 92,
      center: String(r.idx ?? '–'),
      rings: [{ label: 'Index', value: (r.idx ?? 0) / 100, color: CSSV(indexColor(r.idx)) }],
    });
    grid.append(tile);
  }
  root.append(grid);
}
