import { el, clear } from './svg.js';

let uid = 0;

const NAMES = {
  heart: 'Heart', lungs: 'Lungs', eyes: 'Eyes', sleep: 'Sleep',
  mind: 'Mind', bones: 'Bones', metabolic: 'Metabolic',
};

// Left half of torso + leg (viewer's left); mirrored for the right half.
const HALF_BODY =
  'M150 106 L138 106 C138 122 134 127 120 131 C100 136 88 142 82 156 ' +
  'C80 175 90 200 98 225 C104 245 108 262 106 285 C102 305 98 325 99 350 ' +
  'C100 395 104 430 108 455 C112 490 114 525 115 555 C115 566 110 574 104 580 ' +
  'L102 587 L140 587 C142 575 140 565 140 552 C140 520 142 490 144 460 ' +
  'C146 430 148 390 149 338 L150 330 Z';
const HALF_ARM =
  'M86 146 C70 150 64 165 62 190 C58 230 52 270 46 305 C44 315 40 322 40 332 ' +
  'C40 342 50 344 54 336 C58 326 62 316 66 305 C74 270 84 235 92 205 ' +
  'C94 190 94 170 94 158 Z';
const HEAD =
  'M150 26 C171 26 183 45 183 66 C183 89 168 106 150 108 C132 106 117 89 117 66 C117 45 129 26 150 26 Z';
const LUNG =
  'M144 152 C128 150 112 160 108 186 C105 208 110 228 124 228 C137 228 144 216 144 202 Z';
const HEART =
  'M0 12 C-16 0 -16 -14 -7 -14 C-3 -14 0 -11 0 -8 C0 -11 3 -14 7 -14 C16 -14 16 0 0 12 Z';

// Crescent from two circles: outer (0,0,r) minus inner (dx,dy,r2).
function crescent(cx, cy, r, dx, dy, r2) {
  const d = Math.hypot(dx, dy);
  const ux = dx / d, uy = dy / d;
  const a = (r * r - r2 * r2 + d * d) / (2 * d);
  const hh = Math.sqrt(r * r - a * a);
  const mx = cx + a * ux, my = cy + a * uy;
  const p1 = [mx - hh * uy, my + hh * ux];
  const p2 = [mx + hh * uy, my - hh * ux];
  const f = (n) => n.toFixed(2);
  return `M${f(p1[0])} ${f(p1[1])} A${r} ${r} 0 1 1 ${f(p2[0])} ${f(p2[1])} ` +
    `A${r2} ${r2} 0 0 0 ${f(p1[0])} ${f(p1[1])} Z`;
}

const mirror = 'translate(300 0) scale(-1 1)';

// shapes(): children drawn inside the glowing group. ring: [cx, cy, rx, ry]. hit: transparent target.
const ZONES = [
  {
    id: 'bones', ring: [150, 395, 62, 82],
    chip: { x: 84, y: 400, anchor: 'end', from: [118, 400] },
    shapes: () => [
      ...[...Array(16)].map((_, i) => el('circle', { class: 'cc-shape cc-spine', cx: 150, cy: 128 + i * 12, r: 2.4 })),
      el('rect', { class: 'cc-shape', x: 117, y: 334, width: 16, height: 104, rx: 8 }),
      el('rect', { class: 'cc-shape', x: 167, y: 334, width: 16, height: 104, rx: 8 }),
      el('circle', { class: 'cc-shape', cx: 125, cy: 448, r: 7 }),
      el('circle', { class: 'cc-shape', cx: 175, cy: 448, r: 7 }),
    ],
  },
  {
    id: 'lungs', ring: [150, 190, 56, 46],
    chip: { x: 52, y: 176, anchor: 'end', from: [110, 176] },
    shapes: () => [
      el('path', { class: 'cc-shape', d: LUNG }),
      el('path', { class: 'cc-shape', d: LUNG, transform: mirror }),
      el('path', { class: 'cc-shape cc-hint', d: 'M150 128 L150 156 M150 156 L144 166 M150 156 L156 166' }),
    ],
  },
  {
    id: 'metabolic', ring: [150, 272, 40, 34],
    chip: { x: 214, y: 346, anchor: 'start', from: [176, 288] },
    shapes: () => [
      el('path', {
        class: 'cc-shape',
        d: 'M126 250 C140 240 172 240 180 256 C190 276 178 298 156 300 C136 302 120 290 120 272 C120 262 122 256 126 250 Z',
      }),
    ],
  },
  {
    id: 'heart', ring: [162, 198, 24, 22], hit: true,
    chip: { x: 246, y: 198, anchor: 'start', from: [178, 198] },
    shapes: () => [el('path', { class: 'cc-shape', d: HEART, transform: 'translate(162 199)' })],
  },
  {
    id: 'eyes', ring: [150, 68, 34, 14], hit: true,
    chip: { x: 104, y: 76, anchor: 'end', from: [124, 70] },
    shapes: () => [
      el('path', { class: 'cc-shape', d: 'M126 66 C134 59 142 59 147 66 C142 74 134 74 126 66 Z' }),
      el('path', { class: 'cc-shape', d: 'M153 66 C158 59 166 59 174 66 C166 74 158 74 153 66 Z' }),
    ],
  },
  {
    id: 'mind', ring: [150, 44, 28, 20], hit: true,
    chip: { x: 104, y: 32, anchor: 'end', from: [128, 38] },
    shapes: () => [
      el('path', { class: 'cc-shape', d: 'M132 50 C128 36 140 30 150 32 C160 30 172 36 168 50 C160 54 140 54 132 50 Z' }),
      el('path', { class: 'cc-shape cc-hint', d: 'M150 33 L150 51' }),
    ],
  },
  {
    id: 'sleep', ring: [222, 50, 24, 24], hit: true,
    chip: { x: 248, y: 50, anchor: 'start', from: [240, 50] },
    shapes: () => [el('path', { class: 'cc-shape', d: crescent(222, 50, 16, 8, -4, 13) })],
  },
];

// Linked signals: a line through the centres of the zones that moved together.
function linkEls(links) {
  const pts = links.map((id) => ZONES.find((z) => z.id === id)?.ring).filter(Boolean).map(([x, y]) => [x, y]);
  if (pts.length < 2) return [];
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return [
    el('path', { class: 'cc-link', d, fill: 'none' }),
    el('text', { class: 'cc-link-t', x: Math.min(lx + 60, 300), y: ly + 52, 'text-anchor': 'middle' }, `${pts.length} linked signals`),
  ];
}

export function renderBody(container, { systems = {}, selected = null, onSelect, links = [] } = {}) {
  clear(container);
  container.classList.add('cc-body');
  const id = `ccglow${++uid}`;
  const gradId = `ccbody${uid}`;
  const haloId = `cchalo${uid}`;

  const defs = el('defs', null, [
    el('filter', { id, x: '-60%', y: '-60%', width: '220%', height: '220%' }, [
      el('feGaussianBlur', { stdDeviation: 4, result: 'b' }),
      el('feMerge', null, [el('feMergeNode', { in: 'b' }), el('feMergeNode', { in: 'SourceGraphic' })]),
    ]),
    el('linearGradient', { id: gradId, x1: 0, y1: 0, x2: 0, y2: 1 }, [
      el('stop', { offset: '0', 'stop-color': '#26375e' }),
      el('stop', { offset: '1', 'stop-color': '#152039' }),
    ]),
    el('radialGradient', { id: haloId, cx: '50%', cy: '45%', r: '55%' }, [
      el('stop', { offset: '0', 'stop-color': '#60a5fa', 'stop-opacity': '0.16' }),
      el('stop', { offset: '1', 'stop-color': '#60a5fa', 'stop-opacity': '0' }),
    ]),
  ]);

  const silhouette = (props) => [
    el('path', { d: HEAD, ...props }),
    el('path', { d: HALF_BODY, ...props }),
    el('path', { d: HALF_BODY, transform: mirror, ...props }),
    el('path', { d: HALF_ARM, ...props }),
    el('path', { d: HALF_ARM, transform: mirror, ...props }),
  ];
  // rim first (thick stroke), fill on top hides inner seams
  const body = el('g', { class: 'cc-silhouette' }, [
    ...silhouette({ class: 'cc-rim' }),
    ...silhouette({ fill: `url(#${gradId})`, stroke: 'none' }),
  ]);

  const zoneEls = ZONES.map((z) => {
    const status = ['green', 'yellow', 'red', 'grey'].includes(systems[z.id]) ? systems[z.id] : 'grey';
    const name = NAMES[z.id];
    const isSel = selected === z.id;
    const [rcx, rcy, rrx, rry] = z.ring;
    const pick = () => { if (typeof onSelect === 'function') onSelect(z.id); };

    const kids = [
      z.hit ? el('ellipse', { class: 'cc-hit', cx: rcx, cy: rcy, rx: rrx, ry: rry }) : null,
      el('g', { class: 'cc-zshapes', filter: status === 'grey' ? null : `url(#${id})` }, z.shapes()),
      el('ellipse', { class: 'cc-ring', cx: rcx, cy: rcy, rx: rrx + 4, ry: rry + 4 }),
    ];
    if (status !== 'green') {
      const label = name;
      const w = Math.round(label.length * 8.6 + 18);
      const { x, y, anchor, from } = z.chip;
      const rx = anchor === 'end' ? x - w : x;
      kids.push(
        el('line', { class: 'cc-lead', x1: from[0], y1: from[1], x2: x, y2: y }),
        el('g', { class: 'cc-chip' }, [
          el('rect', { x: rx, y: y - 13, width: w, height: 26, rx: 13 }),
          el('text', { x: rx + w / 2, y: y + 5, 'text-anchor': 'middle' }, label),
        ]),
      );
    }

    const g = el('g', {
      class: `cc-zone cc-s-${status}${isSel ? ' cc-sel' : ''}`,
      role: 'button', tabindex: 0,
      'aria-label': `${name}: ${status}`,
      'aria-pressed': isSel ? 'true' : 'false',
      'data-system': z.id,
      onclick: pick,
      onkeydown: (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); }
      },
    }, kids);
    return g;
  });

  const svg = el('svg', {
    class: 'cc-body-svg', viewBox: '-40 0 380 600', preserveAspectRatio: 'xMidYMid meet',
    role: 'group', 'aria-label': 'Body systems',
  }, [
    defs,
    el('ellipse', { cx: 150, cy: 300, rx: 190, ry: 300, fill: `url(#${haloId})` }),
    body,
    ...linkEls(links),
    ...zoneEls,
  ]);
  container.append(svg);
}
