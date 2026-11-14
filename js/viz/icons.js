import { el } from './svg.js';

// One line-icon set (24x24, stroke) for the whole app: no letters in circles, a picture and a word.
const P = { fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
const p = (d) => el('path', { ...P, d });
const SHAPES = {
  shield: () => [p('M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z'), p('M8.5 12l2.5 2.5 4.5-5')],
  flask: () => [p('M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3'), p('M7.5 15h9')],
  person: () => [el('circle', { ...P, cx: 12, cy: 7, r: 3.5 }), p('M5 21c0-4 3-7 7-7s7 3 7 7')],
  people: () => [el('circle', { ...P, cx: 9, cy: 8, r: 3 }), el('circle', { ...P, cx: 17, cy: 9, r: 2.5 }), p('M3 20c0-3.5 2.5-6 6-6s6 2.5 6 6M15 14.5c3 0 6 2 6 5.5')],
  moon: () => [p('M20 14A8 8 0 1 1 10 4a6.5 6.5 0 0 0 10 10z')],
  cuff: () => [el('rect', { ...P, x: 3, y: 8, width: 12, height: 9, rx: 2 }), p('M15 12.5h3a3 3 0 0 1 3 3v2'), el('circle', { ...P, cx: 21, cy: 19, r: 1.5 })],
  cross: () => [p('M9 3h6v6h6v6h-6v6H9v-6H3V9h6z')],
  run: () => [el('circle', { ...P, cx: 14, cy: 4.5, r: 2 }), p('M6 21l3-6 3 2 1-5 4 3M9 10l3-3 3 1')],
  eye: () => [p('M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z'), el('circle', { ...P, cx: 12, cy: 12, r: 3 })],
  envelope: () => [el('rect', { ...P, x: 3, y: 5, width: 18, height: 14, rx: 2 }), p('M3 7l9 6 9-6')],
  rule: () => [el('rect', { ...P, x: 4, y: 3, width: 16, height: 18, rx: 2 }), p('M8 8h8M8 12h8M8 16h5')],
  suit: () => [p('M8 4l-5 3 2 5 3-1v9h8v-9l3 1 2-5-5-3c-1 2-5 2-8 0z')],
  watch: () => [el('rect', { ...P, x: 7, y: 6, width: 10, height: 12, rx: 3 }), p('M9 6l1-3h4l1 3M9 18l1 3h4l1-3M12 9v3l2 1')],
  brain: () => [p('M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 3 5 3 3 0 0 0 5 1V5a2 2 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-3 5 3 3 0 0 1-5 1')],
  form: () => [el('rect', { ...P, x: 5, y: 3, width: 14, height: 18, rx: 2 }), p('M9 8l1 1 2-2M9 13l1 1 2-2M14 8h2M14 13h2M9 17h7')],
  drop: () => [p('M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z')],
  check: () => [el('rect', { ...P, x: 4, y: 4, width: 16, height: 16, rx: 3 }), p('M8 12l3 3 5-6')],
  rad: () => [el('circle', { ...P, cx: 12, cy: 12, r: 2 }), p('M12 10V3a9 9 0 0 1 7.8 4.5L13.7 11M10.3 11L4.2 7.5A9 9 0 0 1 12 3M13.7 13l6.1 3.5A9 9 0 0 1 4.2 16.5L10.3 13')],
  play: () => [p('M7 4l13 8-13 8z')],
  pause: () => [p('M8 4v16M16 4v16')],
  back: () => [p('M15 5l-7 7 7 7')],
  next: () => [p('M9 5l7 7-7 7')],
  replay: () => [p('M4 12a8 8 0 1 0 3-6.2M4 4v4h4')],
  spark: () => [p('M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z')],
  scale: () => [p('M12 4v16M5 8h14M5 8l-3 6h6zM19 8l-3 6h6zM8 20h8')],
  clock: () => [el('circle', { ...P, cx: 12, cy: 12, r: 9 }), p('M12 7v5l3 2')],
  more: () => [p('M4 7h16M4 12h16M4 17h10')],
  flag: () => [p('M5 21V4M5 4h11l-2 4 2 4H5')],
};

export function icon(name, cls = '') {
  return el('svg', { class: `ic ${cls}`.trim(), viewBox: '0 0 24 24', 'aria-hidden': 'true' }, (SHAPES[name] || SHAPES.check)());
}

// Action key -> icon and two words.
export const ACTION_ICON = {
  'light-schedule': ['moon', 'Sleep schedule'],
  're-measure': ['cuff', 'Re-measure'],
  talk: ['people', 'Talk to crew'],
  'medic-now': ['cross', 'Medic now'],
  'eye-check': ['eye', 'Eye check'],
  exercise: ['run', 'Exercise 1.5 h'],
};
