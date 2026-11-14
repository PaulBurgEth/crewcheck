import { el, h, clear } from './svg.js';

export function renderRings(container, { rings = [], size = 120, center } = {}) {
  clear(container);
  container.classList.add('cc-rings');
  const sw = Math.max(6, size * 0.085);
  const gap = Math.max(2, size * 0.03);
  const c = size / 2;
  const arcs = [];
  const kids = [];

  rings.forEach((r, i) => {
    const rad = c - sw / 2 - i * (sw + gap);
    if (rad <= sw / 2) return;
    const len = 2 * Math.PI * rad;
    const v = Math.min(1, Math.max(0, Number(r.value) || 0));
    const col = r.color || 'var(--blue)';
    const track = el('circle', { class: 'cc-ring-track', cx: c, cy: c, r: rad, 'stroke-width': sw });
    const arc = el('circle', {
      class: 'cc-ring-arc', cx: c, cy: c, r: rad, 'stroke-width': sw,
      'stroke-dasharray': len.toFixed(2), 'stroke-dashoffset': len.toFixed(2),
      transform: `rotate(-90 ${c} ${c})`,
    });
    arc.style.stroke = col;
    kids.push(track, arc);
    arcs.push([arc, len * (1 - v)]);
  });

  if (center !== undefined && center !== null && center !== '') {
    kids.push(el('text', {
      class: 'cc-ring-center', x: c, y: c, 'text-anchor': 'middle', 'dominant-baseline': 'central',
      style: `font-size:${Math.round(size * 0.17)}px`,
    }, String(center)));
  }

  const svg = el('svg', {
    class: 'cc-rings-svg', viewBox: `0 0 ${size} ${size}`, width: size, height: size, role: 'img',
    'aria-label': rings.map((r) => `${r.label} ${Math.round((r.value || 0) * 100)}%`).join(', '),
  }, kids);

  const legend = h('ul', { class: 'cc-ring-legend' }, rings.map((r) => {
    const dot = h('span', { class: 'cc-ring-dot' });
    dot.style.background = r.color || 'var(--blue)';
    return h('li', null, [dot, h('span', { class: 'cc-ring-lbl' }, r.label), h('b', null, `${Math.round((r.value || 0) * 100)}%`)]);
  }));

  container.append(svg, legend);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    for (const [arc, off] of arcs) arc.setAttribute('stroke-dashoffset', off.toFixed(2));
  }));
}
