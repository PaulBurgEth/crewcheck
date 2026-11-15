import { h, el } from '../viz/svg.js';
import { icon } from '../viz/icons.js';
import { SIGNAL_LABEL } from '../data/explain.js';
import { SOURCES } from '../data/sources.js';

export const SYSTEM_ICON = { heart: 'cuff', lungs: 'drop', eyes: 'eye', sleep: 'moon', mind: 'brain', bones: 'run', metabolic: 'drop' };
const WHO = { self: ['person', 'Me'], crew: ['cross', 'Crew medic'], earth: ['cross', 'Flight surgeon'] };
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const fmt = (v) => (v == null ? '–' : Math.abs(v) >= 20 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));

// Rule value and measured value in the signal's own units, so all three sit on one scale.
function inUnits(rule, x, base) {
  if (rule.kind === 'delta') return base == null ? null : base + x;
  if (rule.kind === 'pct') return base == null ? null : base * (1 + x / 100);
  return x;
}

// Personal norm band: mean ± 1 SD of days 1-14 (same window as the engine's personal norm).
function normBand(records, signal) {
  const vals = records.filter((r) => r.day <= 14).map((r) => num(r[signal])).filter((v) => v !== null);
  if (vals.length < 3) return null;
  const m = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / (vals.length - 1));
  return [m - sd, m + sd];
}

function miniScale({ rule, status, records, day, base }) {
  const s = rule.signal;
  const thr = inUnits(rule, rule.value, base);
  const now = inUnits(rule, rule.measured, base);
  const band = normBand(records, s);
  const spark = [day - 2, day - 1, day].map((d) => num(records.find((r) => r.day === d)?.[s]));
  const vals = [thr, now, ...(band || []), ...spark].filter((v) => v !== null);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo) * 0.15 || 1;
  lo -= pad; hi += pad;
  const W = 120, X = (v) => ((v - lo) / (hi - lo)) * W;
  const kids = [el('rect', { x: 0, y: 13, width: W, height: 4, rx: 2, class: 'ms-track' })];
  if (band) kids.push(el('rect', { x: X(band[0]), y: 9, width: Math.max(2, X(band[1]) - X(band[0])), height: 12, rx: 3, class: 'ms-norm' }));
  if (thr !== null) kids.push(el('line', { x1: X(thr), x2: X(thr), y1: 5, y2: 25, class: 'ms-thr' }));
  if (now !== null) kids.push(el('circle', { cx: X(now), cy: 15, r: 5, class: `ms-now d-${status}` }));
  const sp = spark.filter((v) => v !== null);
  const sparkSvg = sp.length >= 2 ? el('svg', { class: 'ms-spark', viewBox: '0 0 30 20', 'aria-hidden': 'true' }, [
    el('polyline', { points: sp.map((v, i) => `${(i / (sp.length - 1)) * 28 + 1},${18 - ((v - lo) / (hi - lo)) * 16}`).join(' '), class: `ms-spl d-${status}` }),
  ]) : null;
  const [label, unit] = SIGNAL_LABEL[s];
  return { svg: el('svg', { class: 'ms-svg', viewBox: `-6 0 ${W + 12} 30`, role: 'img', 'aria-label': `${label}: now ${fmt(now)} ${unit}, threshold ${fmt(thr)}, personal norm ${band ? `${fmt(band[0])} to ${fmt(band[1])}` : 'unknown'}` }, kids), sparkSvg, label, unit, now };
}

// Shown headline: who acts is already in WHO and the scene, so linked signals read as a count.
// Big line of the verdict: who acts, and when Earth can answer (design: the distance decides who acts).
export function whoActs(v, mission, selfName = '') {
  const reach = mission.oneWayMin * 2 < 1;
  const rt = Math.round(mission.oneWayMin * 2);
  const far = `Earth answers in ${rt} min`;
  if (v.tier === 'none') return { title: v.headline, sub: '' };
  if (v.tier === 'earth') return { title: 'Flight surgeon decides', sub: 'Answer in seconds' };
  if (v.tier === 'crew') {
    if (reach && mission.id === 'moon') return { title: 'Crew medic acts, surgeon live', sub: 'Answer in seconds' };
    if (reach) return { title: 'Crew medic acts now', sub: 'Surgeon on the line' };
    return { title: 'Crew medic acts now', sub: far };
  }
  return { title: `${selfName || 'Crew member'} acts now`, sub: reach ? 'Answer in seconds' : far };
}
// What happened, short: moves under WHAT now that the headline names who acts.
export const whatText = (v, fired) => (v.combos?.length ? `${v.combos[0].systems.length} linked signals`
  : /^Countermeasure partly/.test(v.headline) ? 'Partly worked'
    : fired.length ? `${SIGNAL_LABEL[fired[0].signal]?.[0] || fired[0].signal}${fired.length > 1 ? ` +${fired.length - 1}` : ''}` : '');

export const headlineText = (v) => (/^Linked signals/.test(v.headline) && v.combos?.length ? `${v.combos[0].systems.length} linked signals` : v.headline);

// "Decided by rules": what moved, why (scales), who acts, when Earth can answer.
export function renderVerdict(container, { ev, v, records, mission, onRule, selfName = '' }) {
  const fired = [];
  const seen = new Set();
  for (const f of [...ev.fired].sort((a, b) => (a.kind === 'abs' ? -1 : 1) - (b.kind === 'abs' ? -1 : 1))) {
    if (seen.has(f.signal)) continue;
    seen.add(f.signal);
    fired.push(f);
  }
  const reach = mission.oneWayMin * 2 < 1;
  const wa = whoActs(v, mission, selfName);
  const head = h('div', { class: 'vd-head' }, [icon('rule'), h('span', {}, 'Decided by rules')]);
  const line = h('div', { class: 'vd-line' }, [
    ev.liveAlert ? h('span', { class: `vd-live lc-${ev.liveAlert.level}` }, [icon('suit'), h('span', {}, `Suit · ${SIGNAL_LABEL[ev.liveAlert.signal][0]} ${ev.liveAlert.measured}`)]) : null,
    // Who acts is already in WHO and the distance scene; the headline names what happened.
    h('span', { class: 'vd-headline' }, wa.title),
  ]);
  const subLine = wa.sub ? h('div', { class: 'vd-subline' }, [icon('clock'), h('span', {}, wa.sub)]) : null;
  const box = h('section', { class: `vd v-${v.status}`, 'data-spot': 'rules' }, [head, line, subLine].filter(Boolean));

  if (v.tier !== 'none' && fired.length) {
    const what = h('div', { class: 'vd-part' }, [
      h('div', { class: 'vd-k' }, 'What'),
      h('div', { class: 'vd-icons' }, [...new Set(fired.map((f) => f.system))].map((s) => h('span', { class: `vd-ic d-${ev.systems[s].status}`, title: s }, [icon(SYSTEM_ICON[s] || 'check')]))),
      h('div', { class: 'vd-what' }, whatText(v, fired)),
    ]);
    // The scale legend opens on hover or tap of the info mark, so it costs no words on screen.
    const legendBtn = h('button', { type: 'button', class: 'vd-info', 'aria-label': 'How to read the scales: bar personal norm, line threshold, dot now', 'aria-expanded': 'false', onclick: (e) => { const b = e.currentTarget; const on = b.getAttribute('aria-expanded') !== 'true'; b.setAttribute('aria-expanded', String(on)); } }, 'i');
    const why = h('div', { class: 'vd-part vd-why' }, [h('div', { class: 'vd-k' }, ['Why', legendBtn]), ...fired.slice(0, 4).map((f) => {
      const sc = miniScale({ rule: f, status: ev.signals[f.signal]?.status || f.level, records, day: ev.day, base: ev.baseline?.[f.signal] });
      return h('button', { type: 'button', class: 'vd-scale', title: `${f.title} · open rule and source`, onclick: () => onRule?.(f.system) }, [
        h('span', { class: 'vd-sl' }, sc.label),
        sc.svg, sc.sparkSvg,
        h('span', { class: 'vd-sv' }, `${fmt(sc.now)} ${sc.unit}`),
      ]);
    }), h('div', { class: 'vd-legend', role: 'note' }, [
      h('span', {}, [h('i', { class: 'lg-norm' }), 'personal norm']),
      h('span', {}, [h('i', { class: 'lg-thr' }), 'threshold']),
      h('span', {}, [h('i', { class: 'lg-now' }), 'now']),
    ]), h('div', { class: 'vd-src' }, [icon('rule'), ...[...new Set(fired.map((f) => f.source))].map((id) => {
      const s = SOURCES[id];
      return s?.url ? h('a', { class: `src src-${s.kind}`, href: s.url, target: '_blank', rel: 'noopener', title: s.title }, s.short) : h('span', { class: `src src-${s?.kind || 'assumption'}`, title: s?.title || '' }, s?.short || id);
    })])]);
    const [wi, wn0] = WHO[v.tier];
    const wn = v.tier === 'self' && selfName ? selfName : wn0;
    const who = h('div', { class: 'vd-part' }, [h('div', { class: 'vd-k' }, 'Who'), h('div', { class: `vd-who vd-who-${v.tier}` }, [icon(wi), h('span', {}, wn)])]);
    const when = h('div', { class: 'vd-part' }, [h('div', { class: 'vd-k' }, 'When'), h('div', { class: 'vd-when' }, [icon('clock'), h('span', {}, reach ? 'In seconds' : 'Now')])]);
    box.append(h('div', { class: 'vd-row' }, [what, why, who, when]));
  } else {
    box.append(h('div', { class: 'vd-clear' }, [icon('check'), h('span', {}, 'Inside personal norm')]));
  }
  container.replaceChildren(box);
}
