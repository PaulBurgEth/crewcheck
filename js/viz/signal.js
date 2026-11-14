import { el, h, clear } from './svg.js';

const MAX_S = 1200; // Mars-class one-way delay, seconds

function fmtMin(n) {
  return n >= 10 ? String(Math.round(n)) : String(Math.round(n * 10) / 10);
}

export function delayText(oneWayMin) {
  const m = Number(oneWayMin) || 0;
  if (m < 0.01) return 'Live link · reply in seconds';
  if (m < 1) return `One way ~${Math.max(1, Math.round(m * 60))} s · reply in seconds`;
  return `One way ${fmtMin(m)} min · reply ≥ ${fmtMin(m * 2)} min`;
}

function ship() {
  return el('svg', { class: 'cc-sig-glyph', viewBox: '0 0 44 44', 'aria-hidden': 'true' }, [
    el('path', { d: 'M8 22 L20 14 L36 18 L36 26 L20 30 Z', class: 'cc-sig-ship' }),
    el('path', { d: 'M20 14 L14 6 L24 8 L28 15 Z M20 30 L14 38 L24 36 L28 29 Z', class: 'cc-sig-ship' }),
    el('circle', { cx: 30, cy: 22, r: 2.2, class: 'cc-sig-win' }),
  ]);
}

function earth() {
  return el('svg', { class: 'cc-sig-glyph', viewBox: '0 0 44 44', 'aria-hidden': 'true' }, [
    el('circle', { cx: 22, cy: 22, r: 18, class: 'cc-sig-sea' }),
    el('path', { d: 'M12 14 C18 10 22 14 20 19 C18 24 12 22 10 27 C8 22 8 17 12 14 Z', class: 'cc-sig-land' }),
    el('path', { d: 'M27 24 C33 22 36 27 32 33 C28 36 25 31 27 24 Z', class: 'cc-sig-land' }),
  ]);
}

export function renderSignal(container, { missionLabel, oneWayMin = 0, sent = false, replyLabel } = {}) {
  clear(container);
  container.classList.add('cc-signal');
  const s = Math.max(0, (Number(oneWayMin) || 0) * 60);
  const frac = Math.min(1, Math.log10(1 + s) / Math.log10(1 + MAX_S));
  const widthPct = Math.round(34 + 66 * frac);
  const dur = (2 + 6 * frac).toFixed(1);

  const dot = h('span', { class: 'cc-sig-dot' + (sent ? '' : ' cc-off'), style: `animation-duration:${dur}s` });
  const row = h('div', { class: 'cc-sig-row', style: `width:${widthPct}%` }, [
    ship(),
    h('div', { class: 'cc-sig-line' }, [dot]),
    earth(),
  ]);

  container.append(...[
    missionLabel ? h('div', { class: 'cc-sig-mission' }, missionLabel) : null,
    row,
    h('div', { class: 'cc-sig-label' }, delayText(oneWayMin)),
    replyLabel ? h('div', { class: 'cc-sig-reply' }, replyLabel) : null,
  ].filter(Boolean));
}
