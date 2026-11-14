import { h, confBadge } from '../ui.js';
import { state, set, person, mission, verdictFor, statusStrip, eventsFor } from '../state.js';
import { MISSIONS } from '../data/missions.js';
import { SYSTEMS } from '../data/rules.js';
import { renderBody } from '../viz/body.js';
import { renderNodes } from '../viz/nodes.js';
import { renderSignal } from '../viz/signal.js';
import { renderTimeline } from '../viz/timeline.js';
import { renderWhy } from './why.js';
import { nextCrossings } from '../engine/forecast.js';
import { renderSuit } from './suit.js';
import { SIGNAL_LABEL } from '../data/explain.js';
import { renderRings } from '../viz/rings.js';
import { renderRadiation } from './radiation-card.js';
import { renderInstruments } from './instruments.js';
import { findAdvice, PRECOMPUTED_LABEL } from '../data/advisor-precomputed.js';
import { attachAdvice } from '../engine/advisor.js';
import { evaluate } from '../engine/evaluate.js';
import { getLiveAdvice } from './advisor-live.js';

// Consecutive days with a check-in, counted back from the current day.
function streakOf(records, day) {
  let n = 0;
  for (let d = day; d >= 1; d--) { const r = records[d - 1]; if (r && r.mood != null) n++; else break; }
  return n;
}
const flagged = (ev) => Object.entries(ev.systems).filter(([, s]) => s.status === 'yellow' || s.status === 'red').map(([k]) => k).sort().join(',');

let hintsSeen = false;
let tlCache = null;
let suitCache = null;
export const resetTimeline = () => { tlCache = null; suitCache = null; };

export function renderToday(root, hooks = {}) {
  const p = person();
  const m = mission();
  const { ev, v } = verdictFor();

  const bodyBox = h('div', { class: 'today-body' });
  const side = h('div', { class: 'today-side' });
  // The timeline survives re-renders so dragging the slider is not interrupted.
  const reuse = tlCache && tlCache.personId === p.id;
  const tl = reuse ? tlCache.node : h('div', { class: 'today-timeline' });

  const head = h('div', { class: 'today-head' }, [
    h('div', { class: 'who' }, [h('span', { class: 'who-name', text: p.name }), h('span', { class: 'who-role', text: p.role })]),
    h('div', { class: 'where', text: `Day ${state.day} · ${m.label}` }),
    h('div', { class: 'day-rings', title: 'Rings: suit worn, check-in, exercise · centre: check-in streak in days' }),
  ]);

  const verdict = h('div', { class: `verdict v-${v.status}` }, [
    h('div', { class: 'verdict-line', text: v.headline }),
    h('div', { class: 'verdict-sub', text: v.sub }),
  ]);

  const switcher = h('div', { class: 'mission-switch', role: 'radiogroup', 'aria-label': 'Distance from Earth' },
    MISSIONS.map((mi) => h('button', {
      class: `ms ${mi.id === m.id ? 'on' : ''}`, role: 'radio', 'aria-checked': String(mi.id === m.id),
      onclick: () => set({ missionId: mi.id }),
    }, [h('span', { class: 'ms-label', text: mi.label }), h('span', { class: 'ms-care', text: mi.careLabel })])));

  const nodesBox = h('div', { class: 'nodes-box' });
  const signalBox = h('div', { class: 'signal-box' });
  const actions = h('ul', { class: 'actions' }, v.actions.map((a) => h('li', {}, [confBadge(a.confidence), h('span', { text: a.text })])));
  const extra = h('div', { class: 'today-extra' });

  const ahead = nextCrossings(verdictFor().records, state.day).slice(0, 2);
  const forecastRow = ahead.length ? h('div', { class: 'ahead' }, ahead.map((c) => h('button', {
    class: 'ahead-chip', title: 'Forecast: linear trend of the last 21 days', onclick: () => hooks.go?.('trends'),
  }, [confBadge('hypothesis'), h('span', { text: `${SIGNAL_LABEL[c.rule.signal][0]} → ${c.rule.value} in ~${c.daysToCross} d` })]))) : null;

  // AI advises, rules decide: advice is shown next to the verdict and cannot change it.
  const records = verdictFor().records;
  const adv = findAdvice(p.id, state.day, flagged(ev), (d) => flagged(evaluate(records, d)));
  const shown = attachAdvice(v, getLiveAdvice(p.id, state.day) || adv || {});
  const advisor = h('div', { class: 'advisor' }, [
    h('div', { class: 'adv-head' }, [h('span', { class: 'adv-title', text: 'AI advisor' }), confBadge('hypothesis'),
      h('span', { class: 'adv-origin', text: shown.advice.origin === 'live' ? 'AI-generated (Claude), live' : PRECOMPUTED_LABEL })]),
    shown.advice.text ? h('div', { class: 'adv-text', text: shown.advice.text }) : h('div', { class: 'muted', text: v.status === 'green' ? 'Nothing to add today' : 'No advice for this day · rules still decide' }),
    shown.advice.points.length ? h('ul', { class: 'adv-points' }, shown.advice.points.map((t) => h('li', { text: t }))) : null,
    h('div', { class: 'adv-note', text: 'Advises only · never changes status or who acts · in this demo it runs on a cloud model; on a mission it would run on board' }),
  ]);

  side.append(...[verdict, forecastRow, switcher, nodesBox, signalBox, actions, advisor, extra].filter(Boolean));
  const lower = h('div', { class: 'today-lower' }, [h('div', { class: 'rad-box' }), h('div', { class: 'ins-box' })]);
  root.append(head, h('div', { class: 'today-grid' }, [bodyBox, side]), tl, lower);
  renderRadiation(lower.children[0], { records, day: state.day });
  renderInstruments(lower.children[1], { day: state.day });

  const today = records[state.day - 1] || {};
  const streak = streakOf(records, state.day);
  renderRings(head.querySelector('.day-rings'), {
    size: 60, center: `${streak}d`,
    rings: [
      { label: 'Suit worn', value: today.hr != null ? 1 : 0, color: 'var(--green)' },
      { label: 'Check-in', value: today.mood != null ? 1 : 0, color: 'var(--blue)' },
      { label: 'Exercise', value: Math.min(1, (today.exerciseMin || 0) / 90), color: 'var(--yellow)' },
    ],
  });

  if (!hintsSeen) {
    const hints = h('div', { class: 'hints' }, [
      h('span', { class: 'hint', text: '1 · Drag the mission day' }),
      h('span', { class: 'hint', text: '2 · Switch distance from Earth' }),
      h('span', { class: 'hint', text: '3 · Tap a glowing zone' }),
      h('button', { class: 'hint-x', 'aria-label': 'Hide hints', text: '×', onclick: () => { hintsSeen = true; hints.remove(); } }),
    ]);
    root.prepend(hints);
  }

  const statuses = {};
  for (const s of SYSTEMS) statuses[s.id] = ev.systems[s.id].status;
  renderBody(bodyBox, { systems: statuses, selected: state.system, onSelect: (id) => set({ system: id }) });
  renderNodes(nodesBox, { tier: v.tier, alsoNotify: v.notify });
  renderSignal(signalBox, { missionLabel: m.label, oneWayMin: m.oneWayMin, sent: v.reply.sent, replyLabel: v.reply.sent ? 'Report sent' : '' });
  if (!reuse || tlCache.day !== state.day && !tl.contains(document.activeElement)) {
    renderTimeline(tl, {
      days: 180, day: state.day, statuses: statusStrip(),
      events: eventsFor(p.id).map((e) => ({ day: e.day, label: e.label })),
      onChange: (d) => { tlCache.day = d; set({ day: d }); },
    });
  }
  tlCache = { personId: p.id, node: tl, day: state.day };
  const { fu } = verdictFor();
  if (fu && fu.state !== 'none' && state.day <= fu.dueDay + 14) {
    const left = Math.max(0, fu.dueDay - state.day);
    const card = h('div', { class: `fu fu-${fu.state}` }, [
      h('div', { class: 'fu-head' }, [
        h('span', { class: 'fu-title', text: fu.state === 'pending' ? 'Countermeasure running' : fu.state === 'worked' ? 'Countermeasure worked' : 'Countermeasure: partly' }),
        h('span', { class: 'muted', text: fu.state === 'pending' ? `re-check in ${left} d` : `checked day ${fu.dueDay}` }),
      ]),
      h('div', { class: 'fu-track' }, Array.from({ length: fu.dueDay - fu.startDay + 1 }, (_, i) => h('span', { class: `fu-step ${fu.startDay + i <= state.day ? 'on' : ''}` }))),
      h('div', { class: 'fu-items' }, fu.items.map((it) => h('span', { class: `fu-item fi-${it.result}` }, [
        h('span', { class: 'fi-mark', text: it.result === 'worked' ? '✓' : it.result === 'not-worked' ? '✕' : '…' }),
        SIGNAL_LABEL[it.signal][0],
      ]))),
      fu.state === 'not-worked' ? h('div', { class: 'fu-up', text: 'Not enough · crew medic takes over' }) : null,
    ]);
    extra.append(card);
  }

  // Suit stream keeps running across re-renders for the same person and day.
  const suitKey = `${p.id}|${state.day}`;
  if (!suitCache || suitCache.key !== suitKey) {
    const node = h('div', { class: 'suit-box' });
    suitCache = { key: suitKey, node };
    extra.append(node);
    renderSuit(node, { record: verdictFor().records.find((r) => r.day === state.day), seed: state.day, onAlert: () => {} });
  } else {
    extra.append(suitCache.node);
  }

  if (state.system) {
    const whyBox = h('div', { class: 'why-box' });
    verdict.after(whyBox);
    renderWhy(whyBox, { systemId: state.system, ev, onClose: () => set({ system: null }) });
  }
  hooks.after?.({ root, side, extra, bodyBox, ev, v, p, m });
}
