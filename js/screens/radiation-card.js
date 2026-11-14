import { h, el, clear } from '../viz/svg.js';
import { doseSummary } from '../engine/radiation.js';

const W = 300, H = 84, PAD = 4;

function sparkline(records, day, s) {
  const cum = [];
  let t = 0;
  for (let d = 1; d <= 180; d++) {
    const rec = records.find((x) => x && x.day === d);
    if (d <= day && rec && Number.isFinite(rec.doseMSv)) t += rec.doseMSv;
    cum[d] = t;
  }
  const ymax = Math.max(s.projected180, 1);
  const x = (d) => PAD + ((d - 1) / 179) * (W - 2 * PAD);
  const y = (v) => H - PAD - (v / ymax) * (H - 2 * PAD);
  const cd = Math.min(Math.max(day, 1), 180);
  let line = '';
  for (let d = 1; d <= cd; d++) line += `${d === 1 ? 'M' : 'L'}${x(d).toFixed(1)} ${y(cum[d]).toFixed(1)}`;
  const area = `${line}L${x(cd).toFixed(1)} ${H - PAD}L${x(1).toFixed(1)} ${H - PAD}Z`;
  const svg = el('svg', { class: 'rad-spark', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Cumulative radiation dose over 180 days' });
  svg.append(el('path', { d: area, class: 'rad-area' }), el('path', { d: line, class: 'rad-line', fill: 'none' }));
  if (cd < 180) {
    svg.append(el('path', { d: `M${x(cd).toFixed(1)} ${y(cum[cd]).toFixed(1)}L${x(180).toFixed(1)} ${y(s.projected180).toFixed(1)}`, class: 'rad-proj', fill: 'none' }));
  }
  svg.append(el('line', { x1: x(cd), x2: x(cd), y1: PAD, y2: H - PAD, class: 'rad-now' }));
  for (const e of s.events) {
    const ex = x(e.day);
    const anchor = ex > W - 90 ? 'end' : 'start';
    svg.append(
      el('line', { x1: ex, x2: ex, y1: 14, y2: H - PAD, class: 'rad-spike' }),
      el('circle', { cx: ex, cy: y(cum[e.day]), r: 3, class: 'rad-dot' }),
      el('text', { x: anchor === 'end' ? ex - 4 : ex + 4, y: 11, 'text-anchor': anchor, class: 'rad-evt' }, 'Solar particle event'),
    );
  }
  return svg;
}

export function renderRadiation(container, { records, day }) {
  clear(container);
  const s = doseSummary(records, day);
  const card = h('section', { class: 'rad-card' });
  card.append(
    h('h3', { class: 'rad-title' }, 'Radiation'),
    h('div', { class: 'rad-big' }, [h('span', { class: 'rad-num' }, String(Math.round(s.total))), h('span', { class: 'rad-unit' }, ' mSv so far')]),
    h('div', { class: 'rad-sub' }, `${s.ratePerDay.toFixed(1)} mSv/day · ~${Math.round(s.projected180)} by day 180`),
    sparkline(Array.isArray(records) ? records : [], day, s),
    h('div', { class: 'rad-axis' }, [h('span', {}, 'Day 1'), h('span', {}, 'Day 180')]),
    h('div', { class: 'rad-tags' }, [
      h('span', { class: 'src src-agency', title: 'SwRI: radiation exposure associated with a trip to Mars (MSL RAD), rate' }, 'MSL RAD estimate (SwRI)'),
      h('span', { class: 'src src-agency', title: 'Canadian Space Agency: Monitoring Radiation for Astronaut Health' }, 'CSA, Monitoring Radiation'),
    ]),
    h('div', { class: 'rad-note' }, 'Magnitudes: demo assumption'),
  );
  container.append(card);
}
