import { h, confBadge, CONF } from '../ui.js';
import { state, set, person, mission, verdictFor, statusStrip, eventsFor, setLiveAlert } from '../state.js';
import { MISSIONS } from '../data/missions.js';
import { SYSTEMS } from '../data/rules.js';
import { SOURCES } from '../data/sources.js';
import { renderBody } from '../viz/body.js';
import { renderNodes } from '../viz/nodes.js';
import { renderSignal } from '../viz/signal.js';
import { renderTimeline } from '../viz/timeline.js';
import { renderWhy } from './why.js';
import { nextCrossings, ADAPTATION_DAYS } from '../engine/forecast.js';
import { renderSuit } from './suit.js';
import { SIGNAL_LABEL } from '../data/explain.js';
import { renderRings } from '../viz/rings.js';
import { renderRadiation } from './radiation-card.js';
import { renderInstruments } from './instruments.js';
import { findAdvice, PRECOMPUTED_LABEL } from '../data/advisor-precomputed.js';
import { attachAdvice, advisorPayload } from '../engine/advisor.js';
import { evaluate } from '../engine/evaluate.js';
import { getLiveAdvice, requestLiveAdvice, PROXY_URL } from './advisor-live.js';

// Consecutive days with a check-in, counted back from the current day.
function streakOf(records, day) {
  let n = 0;
  for (let d = day; d >= 1; d--) { const r = records[d - 1]; if (r && r.mood != null) n++; else break; }
  return n;
}
const flagged = (ev) => Object.entries(ev.systems).filter(([, s]) => s.status === 'yellow' || s.status === 'red').map(([k]) => k).sort().join(',');

// The shell (hints, timeline, suit card) stays in the page between renders, so dragging the
// mission slider is never interrupted and the layout above the slider never changes height.
let shell = null;
let hintsSeen = false;
let lastSystem = null;
export const resetTimeline = () => { shell = null; };

function buildShell(p) {
  const s = {
    personId: p.id,
    root: h('div', { class: 'today' }),
    hints: h('div', { class: 'hints' }),
    head: h('div', { class: 'today-head' }),
    tl: h('div', { class: 'today-timeline' }),
    grid: h('div', { class: 'today-grid' }),
    lower: h('div', { class: 'today-lower' }),
    suit: h('div', { class: 'suit-box' }),
    tlApi: null, strip: null, day: null, suitDay: null,
  };
  if (!hintsSeen) {
    s.hints.append(
      h('span', { class: 'hint', text: '1 · Drag the mission day' }),
      h('span', { class: 'hint', text: '2 · Switch distance from Earth' }),
      h('span', { class: 'hint', text: '3 · Tap a glowing zone' }),
      h('button', { class: 'hint-x', 'aria-label': 'Hide hints', text: '×', onclick: () => { hintsSeen = true; s.hints.remove(); } }),
    );
  }
  s.root.append(...[hintsSeen ? null : s.hints, s.head, s.tl, s.grid, s.lower].filter(Boolean));
  renderSuit(s.suit, {
    record: verdictFor().records.find((r) => r.day === state.day), seed: state.day,
    onAlert: (a) => setLiveAlert(a ? { ...a, personId: p.id, day: state.day } : null),
  });
  s.suitDay = state.day;
  return s;
}

export function renderToday(root, hooks = {}) {
  const p = person();
  const m = mission();
  if (!shell || shell.personId !== p.id) shell = buildShell(p);
  if (root.firstChild !== shell.root || root.childNodes.length !== 1) root.replaceChildren(shell.root);

  const { ev, v, fu, records } = verdictFor();

  // Head: who, where, day rings with a visible legend.
  const today = records[state.day - 1] || {};
  const streak = streakOf(records, state.day);
  const ringsBox = h('div', { class: 'day-rings' });
  shell.head.replaceChildren(
    h('div', { class: 'who' }, [h('span', { class: 'who-name', text: p.name }), h('span', { class: 'who-role', text: p.role })]),
    h('div', { class: 'where', text: `Day ${state.day} · ${m.label}` }),
    h('div', { class: 'rings-wrap' }, [ringsBox, h('div', { class: 'rings-legend' }, [
      h('span', { class: 'rl rl-suit', text: 'Suit' }), h('span', { class: 'rl rl-check', text: 'Check-in' }),
      h('span', { class: 'rl rl-ex', text: 'Exercise' }), h('span', { class: 'rl-streak', text: streak < state.day ? `${streak}-day check-in streak · missed day ${state.day - streak}` : `${streak}-day check-in streak` }),
    ])]),
  );
  renderRings(ringsBox, {
    size: 56, center: `${streak}d`,
    rings: [
      { label: 'Suit worn', value: today.hr != null ? 1 : 0, color: 'var(--green)' },
      { label: 'Check-in', value: today.mood != null ? 1 : 0, color: 'var(--blue)' },
      { label: 'Exercise', value: Math.min(1, (today.exerciseMin || 0) / 90), color: 'var(--yellow)' },
    ],
  });

  // Timeline: render once per person (and when the status strip changes); otherwise only move the day.
  const strip = statusStrip();
  if (!shell.tlApi || shell.strip !== strip) {
    shell.tlApi = renderTimeline(shell.tl, {
      days: 180, day: state.day, statuses: strip,
      events: eventsFor(p.id).map((e) => ({ day: e.day, label: e.label })),
      onChange: (d) => { shell.day = d; set({ day: d, liveAlert: null }); },
    });
    shell.strip = strip;
  } else if (shell.day !== state.day && !shell.tl.contains(document.activeElement)) {
    shell.tlApi?.setDay?.(state.day);
  }
  shell.day = state.day;

  // Left column: body, then the live suit card and the countermeasure check.
  const bodyBox = h('div', { class: 'today-body' });
  const left = h('div', { class: 'today-left' }, [bodyBox]);
  const statuses = {};
  for (const s of SYSTEMS) statuses[s.id] = ev.systems[s.id].status;
  renderBody(bodyBox, { systems: statuses, selected: state.system, onSelect: (id) => set({ system: id }) });

  if (shell.suitDay !== state.day) { shell.suitDay = state.day; shell.suit._suitSetRecord?.(records.find((r) => r.day === state.day)); }
  left.append(shell.suit);
  if (fu && fu.state !== 'none' && state.day <= fu.dueDay + 14) left.append(followUpCard(fu));

  // Right column: verdict first, then who acts and how far Earth is.
  const side = h('div', { class: 'today-side' });
  const verdict = h('div', { class: `verdict v-${v.status}` }, [
    ev.liveAlert ? h('div', { class: `live-chip lc-${ev.liveAlert.level}`, text: `Live suit alert · ${SIGNAL_LABEL[ev.liveAlert.signal][0]} ${ev.liveAlert.measured}` }) : null,
    h('div', { class: 'verdict-line', text: v.headline }),
    h('div', { class: 'verdict-sub', text: v.sub }),
    state.day <= ADAPTATION_DAYS && v.status === 'yellow' ? h('div', { class: 'verdict-ctx', title: 'Short sleep and headaches are expected while the body adapts to microgravity', text: 'Adaptation week · expected' }) : null,
  ]);
  side.append(verdict);

  if (state.system) {
    const whyBox = h('div', { class: 'why-box' });
    side.append(whyBox);
    renderWhy(whyBox, { systemId: state.system, ev, onClose: () => set({ system: null }) });
    if (lastSystem !== state.system) requestAnimationFrame(() => whyBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  }
  lastSystem = state.system;

  const ahead = nextCrossings(records, state.day).slice(0, 2);
  if (ahead.length) {
    side.append(h('div', { class: 'ahead' }, ahead.map((c) => h('button', {
      class: 'ahead-chip', title: 'Forecast: linear trend of the last 21 days', onclick: () => hooks.go?.('trends'),
    }, [confBadge('hypothesis'), h('span', { text: `${SIGNAL_LABEL[c.rule.signal][0]} → ${c.rule.value} in ~${c.daysToCross} d` })]))));
  }

  side.append(h('div', { class: 'mission-switch', role: 'radiogroup', 'aria-label': 'Distance from Earth' },
    MISSIONS.map((mi) => h('button', {
      class: `ms ${mi.id === m.id ? 'on' : ''}`, role: 'radio', 'aria-checked': String(mi.id === m.id),
      onclick: () => set({ missionId: mi.id }),
    }, [h('span', { class: 'ms-label', text: mi.label }), h('span', { class: 'ms-care', text: mi.careLabel })]))));

  const nodesBox = h('div', { class: 'nodes-box' });
  const signalBox = h('div', { class: 'signal-box' });
  side.append(nodesBox, signalBox);
  renderNodes(nodesBox, { tier: v.tier, alsoNotify: v.notify });
  renderSignal(signalBox, { missionLabel: m.label, oneWayMin: m.oneWayMin, sent: v.reply.sent, replyLabel: v.reply.sent ? 'Report sent' : '' });
  if (SOURCES[m.delaySource]?.kind === 'assumption' || SOURCES[m.careSource]?.kind === 'assumption') {
    signalBox.append(h('div', { class: 'assume', title: 'Not from a NASA page; see Sources', text: `${SOURCES[m.delaySource].kind === 'assumption' ? 'Delay' : 'Time home'}: demo assumption` }));
  }

  if (v.actions.length) {
    side.append(h('ul', { class: 'actions' }, v.actions.map((a) => h('li', {}, [confBadge(a.confidence), h('span', { text: a.text })]))));
    side.append(h('div', { class: 'conf-legend' }, ['established', 'hypothesis', 'ask'].map((c) => h('span', { title: CONF[c].label }, [confBadge(c), CONF[c].label.split(':')[0]]))));
  }

  // AI advises, rules decide: advice is shown next to the verdict and cannot change it.
  const adv = findAdvice(p.id, state.day, flagged(ev), (d) => flagged(evaluate(records, d)));
  const shown = attachAdvice(v, getLiveAdvice(p.id, state.day) || adv || {});
  side.append(h('div', { class: 'advisor' }, [
    h('div', { class: 'adv-head' }, [h('span', { class: 'adv-title', text: 'AI advisor' }), confBadge('hypothesis'),
      h('span', { class: 'adv-origin', text: shown.advice.origin === 'live' ? 'AI-generated (Claude), live' : PRECOMPUTED_LABEL })]),
    shown.advice.points.length ? h('ul', { class: 'adv-points' }, shown.advice.points.map((t) => h('li', { text: t })))
      : h('div', { class: 'muted', text: v.status === 'green' ? 'Nothing to add today' : 'No advice for this day · rules still decide' }),
    shown.advice.text ? h('details', { class: 'adv-more' }, [h('summary', { text: 'Explain' }), h('div', { class: 'adv-text', text: shown.advice.text })]) : null,
    h('div', { class: 'adv-note', title: 'In this demo the advisor runs on a cloud model; on a mission it would run on board', text: 'Advises only · never decides' }),
  ]));

  shell.grid.replaceChildren(left, side);

  const rad = h('div', { class: 'rad-box' });
  const ins = h('div', { class: 'ins-box' });
  shell.lower.replaceChildren(rad, ins);
  renderRadiation(rad, { records, day: state.day });
  renderInstruments(ins, { day: state.day });

  if (PROXY_URL && v.status !== 'green' && !getLiveAdvice(p.id, state.day)) {
    requestLiveAdvice(p.id, state.day, advisorPayload(ev, v, m), () => set({}));
  }
}
renderToday.persistent = true;

function followUpCard(fu) {
  const left = Math.max(0, fu.dueDay - state.day);
  return h('div', { class: `fu fu-${fu.state}` }, [
    h('div', { class: 'fu-head' }, [
      h('span', { class: 'fu-title', text: fu.state === 'pending' ? 'Countermeasure running' : fu.state === 'worked' ? 'Countermeasure worked' : 'Countermeasure partly worked' }),
      h('span', { class: 'muted', text: fu.state === 'pending' ? `re-check in ${left} d` : `checked day ${fu.dueDay}` }),
    ]),
    h('div', { class: 'fu-track' }, Array.from({ length: fu.dueDay - fu.startDay + 1 }, (_, i) => h('span', { class: `fu-step ${fu.startDay + i <= state.day ? 'on' : ''}` }))),
    h('div', { class: 'fu-items' }, fu.items.map((it) => h('span', { class: `fu-item fi-${it.result}` }, [
      h('span', { class: 'fi-mark', text: it.result === 'worked' ? '✓' : it.result === 'not-worked' ? '✕' : '…' }),
      SIGNAL_LABEL[it.signal][0],
    ]))),
    fu.state === 'not-worked' ? h('div', { class: 'fu-up', text: 'Not enough · crew medic takes over' }) : null,
  ]);
}
