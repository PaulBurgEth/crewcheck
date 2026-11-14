import { h, el, clear } from '../viz/svg.js';

const SCHEDULE = [
  { every: 30, label: 'Cognition tests' },
  { every: 7, label: 'Questionnaires' },
  { every: 60, label: 'Periodic exams' },
];
const nextOf = (day, n) => (Math.floor(day / n) + 1) * n;

export function nextMeasurements(day) {
  return SCHEDULE.map((s) => ({ day: nextOf(day, s.every), label: s.label }))
    .filter((m) => m.day <= 180)
    .sort((a, b) => a.day - b.day);
}

const P = { fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
const ICONS = {
  suit: () => [el('path', { ...P, d: 'M8 4l-5 3 2 5 3-1v9h8v-9l3 1 2-5-5-3c-1 2-5 2-8 0z' })],
  watch: () => [el('rect', { ...P, x: 7, y: 6, width: 10, height: 12, rx: 3 }), el('path', { ...P, d: 'M9 6l1-3h4l1 3M9 18l1 3h4l1-3M12 9v3l2 1' })],
  brain: () => [el('path', { ...P, d: 'M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 3 5 3 3 0 0 0 5 1V5a2 2 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-3 5 3 3 0 0 1-5 1' })],
  moon: () => [el('path', { ...P, d: 'M20 14A8 8 0 1 1 10 4a6.5 6.5 0 0 0 10 10z' })],
  drop: () => [el('path', { ...P, d: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z' })],
  check: () => [el('rect', { ...P, x: 4, y: 4, width: 16, height: 16, rx: 3 }), el('path', { ...P, d: 'M8 12l3 3 5-6' })],
};
const icon = (k) => el('svg', { class: 'ins-icon', viewBox: '0 0 24 24', 'aria-hidden': 'true' }, ICONS[k]());

export function renderInstruments(container, { day }) {
  clear(container);
  const sync = `Synced 06:${String(5 + (day % 10)).padStart(2, '0')}`;
  const rows = [
    { icon: 'suit', name: 'Suit', model: 'modelled on CSA Bio-Monitor', feeds: 'Pulse, pressure, breathing, temperature, SpO2, activity', status: 'Streaming', live: true, src: true },
    { icon: 'watch', name: 'Wrist actigraph', feeds: 'Sleep, activity, light', status: sync },
    { icon: 'brain', name: 'Cognition tests', feeds: '10 short tests, every 30 days', status: `Next: day ${nextOf(day, 30)}` },
    { icon: 'moon', name: 'Sleep & crew questionnaires', feeds: 'Every 7 days', status: `Next: day ${nextOf(day, 7)}` },
    { icon: 'drop', name: 'Periodic exams', feeds: 'Carotid ultrasound, blood & urine, every 60 days', status: `Next: day ${nextOf(day, 60)}` },
    { icon: 'check', name: 'Manual check-in', feeds: 'Mood, eyes, glucose, mass', status: 'Daily · < 1 min' },
  ];
  const list = h('ul', { class: 'ins-list' });
  for (const r of rows) {
    const main = h('div', { class: 'ins-main' }, [
      h('div', { class: 'ins-name' }, r.name),
      r.model ? h('div', { class: 'ins-model' }, r.model) : null,
      h('div', { class: 'ins-feeds' }, r.feeds),
      r.src ? h('span', { class: 'src src-agency', title: 'Canadian Space Agency: Bio-Monitor' }, 'CSA Bio-Monitor') : null,
    ]);
    const st = h('div', { class: 'ins-status' }, [h('span', { class: `ins-dot${r.live ? ' ins-live' : ''}` }), h('span', {}, r.status)]);
    list.append(h('li', { class: 'ins-row' }, [icon(r.icon), main, st]));
  }
  container.append(h('section', { class: 'ins-card' }, [
    h('h3', { class: 'ins-title' }, 'Instruments'),
    list,
    h('div', { class: 'ins-foot' }, 'All simulated · modelled on, not integrated with'),
  ]));
}
