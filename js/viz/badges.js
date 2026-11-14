import { el, h } from './svg.js';

// Small game pieces drawn in SVG: check-in streak chain, crew patch with four stars, day ring.

const checked = (r) => r && r.mood != null;

// Consecutive check-in days up to `day`, the day that broke the chain, and the last 7 days.
export function streakInfo(records, day) {
  const at = (d) => records.find((r) => r.day === d);
  let n = 0;
  for (let d = day; d >= 1 && checked(at(d)); d--) n++;
  const missed = n < day ? day - n : null;
  const week = Array.from({ length: 7 }, (_, i) => day - 6 + i).map((d) => (d < 1 ? null : checked(at(d))));
  return { n, missed, week };
}

export function renderStreak(records, day) {
  const { n, missed, week } = streakInfo(records, day);
  return h('span', { class: 'stk', title: `Check-in streak ${n} ${n === 1 ? 'day' : 'days'}${missed ? ` · missed day ${missed}` : ''}` }, [
    h('span', { class: 'stk-dots', 'aria-hidden': 'true' }, week.map((w) => h('i', { class: w === null ? 'stk-x' : w ? 'stk-on' : 'stk-off' }))),
    h('b', { class: 'stk-n' }, `${n}d`), ' streak',
    missed ? h('span', { class: 'stk-miss' }, ` · missed day ${missed}`) : null,
  ]);
}

const star = (cx, cy, r) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
};

// Crew patch: round chevron, one star per crew member, lit when that person checked in today.
export function renderPatch({ done = [], names = [], size = 96, flash = false } = {}) {
  const all = done.length && done.every(Boolean);
  const stars = done.map((on, i) => {
    const a = Math.PI + ((i + 0.5) * Math.PI) / done.length; // spread over the top arc
    const cx = 50 + 31 * Math.cos(a);
    const cy = 52 + 31 * Math.sin(a);
    return el('polygon', { points: star(cx, cy, 8), class: `pt-star${on ? ' on' : ''}` }, el('title', {}, `${names[i] || `Crew ${i + 1}`}: ${on ? 'checked in' : 'not yet'}`));
  });
  return el('svg', {
    class: `patch${all ? ' full' : ''}${all && flash ? ' flash' : ''}`, viewBox: '0 0 100 100', width: size, height: size,
    role: 'img', 'aria-label': `Crew patch: ${done.filter(Boolean).length} of ${done.length} checked in`,
  }, [
    el('circle', { cx: 50, cy: 50, r: 46, class: 'pt-rim' }),
    el('circle', { cx: 50, cy: 50, r: 40, class: 'pt-field' }),
    el('path', { d: 'M28 70 L50 56 L72 70 L72 78 L50 64 L28 78 Z', class: 'pt-chev' }),
    el('path', { d: 'M50 30 C56 38 56 46 50 52 C44 46 44 38 50 30 Z', class: 'pt-ship' }),
    ...stars,
  ]);
}

// Day ring for the check-in: one arc per block, lit when filled; closes with a flash on save.
export function renderDayRing({ segments = [], closed = false, size = 84 } = {}) {
  const n = segments.length;
  const gap = 6;
  const arcs = segments.map((s, i) => {
    const a0 = (-90 + (i * 360) / n + gap / 2) * (Math.PI / 180);
    const a1 = (-90 + ((i + 1) * 360) / n - gap / 2) * (Math.PI / 180);
    const p = (a) => `${(50 + 40 * Math.cos(a)).toFixed(2)} ${(50 + 40 * Math.sin(a)).toFixed(2)}`;
    return el('path', { d: `M ${p(a0)} A 40 40 0 0 1 ${p(a1)}`, class: `dr-seg${s.on ? ' on' : ''}` }, el('title', {}, `${s.label}: ${s.on ? 'done' : 'to do'}`));
  });
  const doneN = segments.filter((s) => s.on).length;
  return el('svg', {
    class: `dring${closed ? ' closed' : ''}`, viewBox: '0 0 100 100', width: size, height: size,
    role: 'img', 'aria-label': `Check-in ${doneN} of ${n}`,
  }, [...arcs, el('text', { x: 50, y: 57, 'text-anchor': 'middle', class: 'dr-num' }, closed ? '✓' : `${doneN}/${n}`)]);
}
