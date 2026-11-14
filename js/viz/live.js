import { el, h, clear } from './svg.js';

const N = 60, W = 240, H = 60, PAD = 6;

export function renderLive(container, { label = '', unit = '', color = 'var(--green)' } = {}) {
  clear(container);
  container.classList.add('cc-live');
  const val = h('span', { class: 'cc-live-val' }, '--');
  const line = el('polyline', { class: 'cc-live-line', points: '', fill: 'none' });
  line.style.stroke = color;
  const svg = el('svg', { class: 'cc-live-svg', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', 'aria-hidden': 'true' }, [
    el('line', { class: 'cc-live-grid', x1: 0, x2: W, y1: H / 2, y2: H / 2 }),
    line,
  ]);
  container.append(
    h('div', { class: 'cc-live-head' }, [
      h('span', { class: 'cc-live-label' }, label),
      h('span', { class: 'cc-live-read' }, [val, h('span', { class: 'cc-live-unit' }, unit)]),
    ]),
    h('div', { class: 'cc-live-plot' }, [svg]),
  );

  const data = [];
  return {
    push(value) {
      const v = Number(value);
      if (!Number.isFinite(v)) return;
      data.push(v);
      if (data.length > N) data.shift();
      let lo = Math.min(...data), hi = Math.max(...data);
      if (hi - lo < 1e-6) { lo -= 1; hi += 1; }
      const span = hi - lo;
      const pts = data.map((d, i) => {
        const y = H - PAD - ((d - lo) / span) * (H - 2 * PAD);
        return `${(W - (data.length - 1 - i) * (W / (N - 1))).toFixed(1)},${y.toFixed(1)}`;
      });
      line.setAttribute('points', pts.join(' '));
      val.textContent = Number.isInteger(v) ? String(v) : v.toFixed(1);
    },
  };
}
