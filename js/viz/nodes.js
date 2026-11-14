import { el, h, clear } from './svg.js';

const ORDER = ['self', 'crew', 'earth'];
const LABEL = { self: 'Me', crew: 'Crew medic', earth: 'Earth' };

function icon(kind) {
  const kids = {
    self: [
      el('circle', { cx: 24, cy: 17, r: 6 }),
      el('path', { d: 'M12 36 C12 27 18 24 24 24 C30 24 36 27 36 36' }),
    ],
    crew: [el('path', { d: 'M20 10 H28 V20 H38 V28 H28 V38 H20 V28 H10 V20 H20 Z' })],
    earth: [
      el('circle', { cx: 24, cy: 24, r: 14 }),
      el('ellipse', { cx: 24, cy: 24, rx: 6, ry: 14 }),
      el('path', { d: 'M10 24 H38 M13 16 H35 M13 32 H35' }),
    ],
  }[kind];
  return el('svg', { class: 'cc-node-icon', viewBox: '0 0 48 48', 'aria-hidden': 'true' }, kids);
}

function arrow(lit) {
  return el('svg', { class: 'cc-arrow' + (lit ? ' cc-lit' : ''), viewBox: '0 0 40 16', 'aria-hidden': 'true' }, [
    el('path', { d: 'M2 8 H32 M26 2 L34 8 L26 14' }),
  ]);
}

export function renderNodes(container, { tier = 'none', alsoNotify = [] } = {}) {
  clear(container);
  container.classList.add('cc-nodes');
  const active = ORDER.indexOf(tier);
  const notify = new Set(Array.isArray(alsoNotify) ? alsoNotify : []);

  const row = h('div', { class: 'cc-nodes-row', role: 'img', 'aria-label': tier === 'none' ? 'All clear' : `Escalation: ${LABEL[tier]}` });
  ORDER.forEach((id, i) => {
    if (i > 0) row.append(arrow(active >= i));
    const cls = ['cc-node', `cc-n-${id}`];
    if (i === active) cls.push('cc-act');
    row.append(h('div', { class: cls.join(' ') }, [
      h('div', { class: 'cc-node-disc' }, [
        icon(id),
        notify.has(id) && i !== active ? h('span', { class: 'cc-badge' }, 'notified') : null,
      ]),
      h('div', { class: 'cc-node-name' }, LABEL[id]),
    ]));
  });
  container.append(row);
  if (tier === 'none') container.append(h('div', { class: 'cc-allclear' }, 'All clear'));
}
