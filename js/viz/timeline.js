import { el, h, clear } from './svg.js';

const COLORS = { green: 'var(--green)', yellow: 'var(--yellow)', red: 'var(--red)', grey: '#3a4560' };

export function renderTimeline(container, { days = 180, day = 1, statuses = [], events = [], onChange, extra = null } = {}) {
  clear(container);
  container.classList.add('cc-tl');
  let cur = Math.min(days, Math.max(1, Math.round(day)));
  const pos = (d) => (days > 1 ? ((d - 1) / (days - 1)) * 100 : 0);

  const num = h('span', { class: 'cc-tl-num' }, String(cur));
  const head = h('div', { class: 'cc-tl-head' }, [h('span', { class: 'cc-tl-day' }, 'Day '), num, extra]);

  const strip = el('svg', {
    class: 'cc-tl-strip', viewBox: `0 0 ${days} 1`, preserveAspectRatio: 'none', 'aria-hidden': 'true',
  }, Array.from({ length: days }, (_, i) =>
    el('rect', { x: i, y: 0, width: 1.02, height: 1, fill: COLORS[statuses[i]] || COLORS.grey })));

  const playhead = h('div', { class: 'cc-tl-play' });
  const evEls = (events || []).filter((e) => e && e.day >= 1 && e.day <= days).map((e) => {
    const p = pos(e.day);
    const b = h('button', {
      type: 'button', class: 'cc-tl-ev' + (p < 12 ? ' cc-l' : p > 88 ? ' cc-r' : ''),
      style: `left:${p}%`, 'aria-label': `Day ${e.day}: ${e.label}`,
      onclick: () => setDay(e.day, true),
    }, [e.icon ? h('span', { class: 'cc-tl-evi' }, [e.icon]) : null, h('span', { class: 'cc-tl-tick' }), h('span', { class: 'cc-tl-evl' }, e.label)]);
    return { e, b };
  });

  const inner = h('div', { class: 'cc-tl-inner' }, [
    h('div', { class: 'cc-tl-evs' }, evEls.map((x) => x.b)),
    strip,
    playhead,
  ]);

  const range = h('input', {
    type: 'range', class: 'cc-tl-range', min: 1, max: days, step: 1, value: cur,
    'aria-label': 'Mission day',
    oninput: () => setDay(Number(range.value), true),
  });

  function setDay(d, notify) {
    cur = Math.min(days, Math.max(1, Math.round(d)));
    range.value = String(cur);
    num.textContent = String(cur);
    playhead.style.left = `${pos(cur)}%`;
    for (const { e, b } of evEls) b.classList.toggle('cc-now', e.day === cur);
    if (notify && typeof onChange === 'function') onChange(cur);
  }

  container.append(head, h('div', { class: 'cc-tl-track' }, [inner]), range);
  setDay(cur, false);
  return { setDay: (d) => setDay(d, false) };
}
