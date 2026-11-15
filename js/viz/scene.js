import { el, h } from './svg.js';
import { icon } from './icons.js';

// Distance scene: ship on the left, Earth on the right, who decides sits on the line.
// The line length follows the signal delay; a message is an envelope that travels it.
const NODE = { self: ['person', 'Me'], crew: ['cross', 'Crew medic'], earth: ['cross', 'Flight surgeon'] };
const LEN = { iss: 0.12, moon: 0.34, 'mars-transit': 1, mars: 1 };

// Shared by the Monitor scene and the Earth screen: line length and compressed travel time follow the delay.
export function linkOf(m) {
  const oneWayS = m.oneWayMin * 60;
  const far = oneWayS >= 30;
  return { len: LEN[m.id] ?? 1, oneWayS, far, roundMs: far ? 3200 : 700 };
}

export const shipSvg = () => el('svg', { class: 'scn-glyph', viewBox: '0 0 44 44', 'aria-hidden': 'true' }, [
  el('path', { d: 'M8 22 L20 14 L36 18 L36 26 L20 30 Z', class: 'scn-ship' }),
  el('path', { d: 'M20 14 L14 6 L24 8 L28 15 Z M20 30 L14 38 L24 36 L28 29 Z', class: 'scn-ship' }),
  el('circle', { cx: 30, cy: 22, r: 2.2, class: 'scn-win' }),
]);
export const earthSvg = () => el('svg', { class: 'scn-glyph', viewBox: '0 0 44 44', 'aria-hidden': 'true' }, [
  el('circle', { cx: 22, cy: 22, r: 18, class: 'scn-sea' }),
  el('path', { d: 'M12 14 C18 10 22 14 20 19 C18 24 12 22 10 27 C8 22 8 17 12 14 Z', class: 'scn-land' }),
  el('path', { d: 'M27 24 C33 22 36 27 32 33 C28 36 25 31 27 24 Z', class: 'scn-land' }),
]);

// Mars surface: return home only at a launch window (design assumption). Same row on Monitor and Earth.
export function homeRow(m) {
  if (!m.tabNote) return null;
  return h('div', { class: 'scn-home' }, [icon('flag'), h('span', {}, 'Home only at launch window'), h('span', { class: 'scn-tag' }, 'design assumption')]);
}
export const tabLabel = (mi) => [h('span', { class: 'scn-ms-l' }, mi.label), mi.tabNote ? h('span', { class: 'scn-ms-c' }, mi.tabNote) : null];

export const mmss = (sec) => { const s = Math.max(0, Math.round(sec)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
export const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function node(id) {
  const [ic, name] = NODE[id];
  return h('div', { class: `scn-node scn-n-${id}`, 'data-node': id }, [h('div', { class: 'scn-disc' }, [icon(ic)]), h('div', { class: 'scn-name' }, name)]);
}

export function createScene(container, { onMission, onCompare } = {}) {
  container.classList.add('scn');
  const sw = h('div', { class: 'scn-switch', role: 'radiogroup', 'aria-label': 'Distance from Earth' });
  const cmpBtn = h('button', { type: 'button', class: 'scn-cmp', 'aria-pressed': 'false', onclick: () => onCompare?.() }, [icon('scale'), h('span', {}, 'Compare')]);
  const nodes = { self: node('self'), crew: node('crew'), earth: node('earth') };
  const env = h('span', { class: 'scn-env' }, [icon('envelope')]);
  const line = h('div', { class: 'scn-line' }, [h('div', { class: 'scn-wire' }), env]);
  const band = h('div', { class: 'scn-band', role: 'img' }, [
    h('div', { class: 'scn-end scn-left' }, [shipSvg(), nodes.self, nodes.crew]),
    line,
    h('div', { class: 'scn-end scn-right' }, [nodes.earth, earthSvg()]),
  ]);
  const clock = h('div', { class: 'scn-clock', 'aria-live': 'polite' });
  // Ring "decides": travels along the line to whoever acts, so the hand-over is seen, not read.
  const ring = h('div', { class: 'scn-ring', 'aria-hidden': 'true' }, [h('span', { class: 'scn-ring-t' }, 'decides')]);
  band.append(ring);
  const plates = h('div', { class: 'scn-plates' }, [
    h('div', { class: 'scn-plate', 'data-plate': 'near' }, [icon('cross'), h('span', {}, 'Near Earth: surgeon decides')]),
    h('div', { class: 'scn-plate', 'data-plate': 'far' }, [icon('people'), h('span', {}, 'Here: crew decides')]),
  ]);
  const mayRow = h('div', { class: 'scn-may', 'data-spot': 'may' });
  const home = h('div', { class: 'scn-home-box' });
  const cmp = h('div', { class: 'scn-compare', hidden: true });
  container.replaceChildren(h('div', { class: 'scn-top' }, [sw, cmpBtn]), band, mayRow, home, clock, plates, cmp);

  let key = null;
  let timer = 0;
  let ringTimer = 0;
  let ringOn = null;

  function placeRing() {
    const n = ringOn && nodes[ringOn];
    if (!n || !band.isConnected) { ring.hidden = true; return; }
    const d = n.querySelector('.scn-disc').getBoundingClientRect();
    const b = band.getBoundingClientRect();
    if (!d.width) return;
    ring.hidden = false;
    ring.style.left = `${d.left - b.left + d.width / 2}px`;
    ring.style.top = `${d.top - b.top + d.height / 2}px`;
    ring.dataset.who = ringOn;
  }

  // Timer, not requestAnimationFrame: the first frame and the final text appear even in a background tab.
  function animate(m, travel) {
    clearInterval(timer);
    const { oneWayS, far, roundMs } = linkOf(m);
    if (!travel) { env.hidden = true; return; }
    env.hidden = false;
    const D = reduced() ? 1 : roundMs;
    const t0 = Date.now();
    const draw = (k) => {
      const out = k < 0.5;
      env.style.left = `${(k >= 1 ? 0 : out ? k * 2 : 2 - k * 2) * 100}%`;
      env.classList.toggle('scn-back', !out);
      nodes.earth.classList.toggle('scn-got', !out);
      if (!far) return;
      const left = oneWayS * 2 * (1 - k);
      const text = k >= 1 ? `Answer arrives after ${mmss(oneWayS * 2)} · crew already acted`
        : out ? `Reaches Earth in ${mmss(left - oneWayS)} · answer back in ${mmss(left)}` : `Answer back in ${mmss(left)}`;
      clock.replaceChildren(icon('clock'), h('span', {}, text), h('span', { class: 'scn-tag', title: 'The real delay is shown sped up' }, D < 500 ? `${Math.round(oneWayS * 2 / 60)} min, shown at once` : `${Math.round(oneWayS * 2 / 60)} min shown in ${Math.round(D / 1000)} s`));
    };
    draw(0);
    timer = setInterval(() => {
      if (!container.isConnected) { clearInterval(timer); return; }
      const k = Math.min(1, (Date.now() - t0) / D);
      draw(k);
      if (k >= 1) clearInterval(timer);
    }, 40);
  }

  function update({ missions, mission: m, v, compare = false, compareRows = [], replay = '', selfName = '', may = [] }) {
    // What the onboard agent may do on its own grows with distance (design assumption).
    // Hover or tap an icon to read its two-word name in the row.
    const say = h('span', { class: 'scn-may-say', 'aria-live': 'polite' });
    const show = (x) => { say.textContent = x ? `${x.label}${x.on ? '' : ' · not here'}` : ''; };
    mayRow.replaceChildren(h('span', { class: 'scn-may-k' }, 'Agent may'), ...may.map((x) => h('button', {
      type: 'button', class: `scn-may-i${x.on ? ' on' : ''}`, title: `${x.label}${x.on ? '' : ' (not here)'}`, 'aria-label': `${x.label}: ${x.on ? 'yes' : 'no'}`,
      onmouseenter: () => show(x), onmouseleave: () => show(null), onfocus: () => show(x), onblur: () => show(null), onclick: () => show(x),
    }, [icon(x.icon)])), say, h('span', { class: 'scn-tag' }, 'design assumption'));
    if (selfName) nodes.self.querySelector('.scn-name').textContent = selfName;
    sw.replaceChildren(...missions.map((mi) => h('button', {
      type: 'button', class: `scn-ms${mi.id === m.id ? ' on' : ''}`, role: 'radio', 'aria-checked': String(mi.id === m.id),
      'data-mission': mi.id, title: `Care: ${mi.careLabel}`, onclick: () => onMission?.(mi.id),
    }, tabLabel(mi))));
    home.replaceChildren(...[homeRow(m)].filter(Boolean));
    cmpBtn.setAttribute('aria-pressed', String(compare));
    container.style.setProperty('--len', String(linkOf(m).len));
    for (const [id, n] of Object.entries(nodes)) {
      n.classList.toggle('scn-act', v.tier === id);
      n.classList.toggle('scn-notify', v.tier !== id && (v.notify || []).includes(id));
    }
    ringOn = v.tier === 'none' ? null : v.tier;
    clearTimeout(ringTimer);
    setTimeout(placeRing, 30);
    // The line length eases for 0.9 s; place the ring again once Earth has settled.
    ringTimer = setTimeout(placeRing, 950);
    for (const p of plates.children) p.classList.toggle('on', (p.dataset.plate === 'near') === (m.oneWayMin * 2 < 1));
    band.setAttribute('aria-label', v.tier === 'none' ? `${m.label}: all clear` : `${m.label}: ${NODE[v.tier][1]} acts`);
    container.dataset.tier = v.tier;

    const reach = m.oneWayMin * 2 < 1;
    if (v.tier === 'none') clock.replaceChildren(icon('check'), h('span', {}, 'All clear · nothing to send'));
    else if (reach) clock.replaceChildren(icon('clock'), h('span', {}, m.oneWayMin < 0.01 ? 'Live link · answer in seconds' : `${Math.round(m.oneWayMin * 60 * 10) / 10} s each way · answer in seconds`));
    const travel = v.tier !== 'none' && (v.tier === 'earth' || (v.notify || []).includes('earth'));
    const k = `${m.id}|${v.tier}|${travel}|${replay}`;
    if (k !== key) { key = k; animate(m, travel); }

    cmp.hidden = !compare;
    if (compare) {
      cmp.replaceChildren(...compareRows.map((r) => h('div', { class: `scn-col scn-col-${r.tier}` }, [
        h('div', { class: 'scn-col-h' }, r.title),
        h('div', { class: 'scn-col-m' }, r.mission.label),
        h('div', { class: 'scn-dots' }, r.signals.map((s) => h('span', { class: `scn-dot d-${s.status}`, title: s.label }))),
        h('div', { class: 'scn-col-who' }, [icon(r.tier === 'none' ? 'check' : NODE[r.tier][0]), h('span', {}, r.tier === 'none' ? 'All clear' : NODE[r.tier][1])]),
        r.may ? h('div', { class: 'scn-col-may' }, [icon('spark'), h('span', {}, `Agent may: ${r.may} of 6`)]) : null,
      ])));
    }
  }
  if (typeof window !== 'undefined') window.addEventListener('resize', () => setTimeout(placeRing, 50));
  return { update };
}
