import { h, confBadge } from '../ui.js';
import { state, set, person, mission, verdictFor, statusStrip, eventsFor, setLiveAlert, localEntry, recordsOf, cabinCase } from '../state.js';
import { renderStreak, renderPatch } from '../viz/badges.js';
import { MISSIONS, missionById } from '../data/missions.js';
import { SYSTEMS } from '../data/rules.js';
import { renderBody } from '../viz/body.js';
import { renderTimeline } from '../viz/timeline.js';
import { createScene } from '../viz/scene.js';
import { icon } from '../viz/icons.js';
import { agentMay, AGENT_CAPS } from '../engine/agent.js';
import { renderWhy } from './why.js';
import { renderVerdict } from './verdict.js';
import { nextCrossings, ADAPTATION_DAYS } from '../engine/forecast.js';
import { renderSuit } from './suit.js';
import { SIGNAL_LABEL } from '../data/explain.js';
import { renderRadiation } from './radiation-card.js';
import { renderInstruments } from './instruments.js';
import { doseSummary } from '../engine/radiation.js';
import { findAdvice, PRECOMPUTED_LABEL, QUESTIONS } from '../data/advisor-precomputed.js';
import { attachAdvice } from '../engine/advisor.js';
import { evaluate } from '../engine/evaluate.js';
import { escalate } from '../engine/escalation.js';
import { getLiveAdvice, requestLiveAdvice, PROXY_URL, livePayload, liveTried } from './advisor-live.js';
import { story, renderStoryBar, decorate, currentStep, renderNarrator, placeNarrator } from './story.js';
import { renderCase, renderAgentLog, noteIsOpen } from './case-card.js';

const flagged = (ev) => Object.entries(ev.systems).filter(([, s]) => s.status === 'yellow' || s.status === 'red').map(([k]) => k).sort().join(',');
const EVENT_ICON = { adaptation: 'moon', 'missed-workouts': 'run', 'slow-drift': 'moon', 'treadmill-maintenance': 'run', 'on-call': 'clock', countermeasure: 'shield', spe: 'rad', 'cabin-co2': 'cabin' };

// Data sources: icon only on screen; tap shows what it feeds and lights those body zones.
const SOURCES = [
  { id: 'suit', icon: 'suit', name: 'Suit', feeds: ['heart', 'lungs', 'metabolic'], status: () => 'Streaming now' },
  { id: 'watch', icon: 'watch', name: 'Wrist actigraph', feeds: ['sleep', 'bones'], status: (d) => `Synced 06:${String(5 + (d % 10)).padStart(2, '0')}` },
  { id: 'cog', icon: 'brain', name: 'Cognition tests', feeds: ['mind'], status: (d) => `Next: day ${(Math.floor(d / 30) + 1) * 30}` },
  { id: 'quest', icon: 'form', name: 'Questionnaires', feeds: ['mind', 'sleep'], status: (d) => `Next: day ${(Math.floor(d / 7) + 1) * 7}` },
  { id: 'exam', icon: 'drop', name: 'Periodic exams', feeds: ['heart', 'metabolic', 'bones'], status: (d) => `Next: day ${(Math.floor(d / 60) + 1) * 60}` },
  { id: 'check', icon: 'check', name: 'Check-in', feeds: ['mind', 'eyes', 'metabolic', 'bones'], status: (d, rec) => (rec?.mood != null ? 'Today: done' : 'Today: due') },
];

let shell = null;
let source = null;
let advQ = null;
let compare = false;
let drawer = false;
let lastSystem = null;
let lastStep = null;
let lastReady = false;
let playTimer = 0;
let liveTimer = 0;
export const resetTimeline = () => { shell = null; };

function buildShell(p) {
  const s = {
    personId: p.id,
    root: h('div', { class: 'today v2' }),
    bar: h('div', { class: 'story-bar' }),
    card: h('aside', { class: 'sn', 'aria-live': 'polite' }),
    head: h('div', { class: 'today-head' }),
    tl: h('div', { class: 'today-timeline', 'data-spot': 'timeline' }),
    scene: h('section', { class: 'scene-box', 'data-spot': 'scene' }),
    cols: h('div', { class: 'v2-cols' }),
    sense: h('div', { class: 'v2-col v2-sense' }),
    decide: h('div', { class: 'v2-col v2-decide' }),
    act: h('div', { class: 'v2-col v2-act' }),
    suit: h('div', { class: 'suit-box', 'data-spot': 'suit' }),
    more: null,
    drawer: h('aside', { class: 'drawer', hidden: true, 'aria-label': 'Radiation and instruments' }),
    tlApi: null, strip: null, day: null, suitDay: null,
  };
  s.more = h('button', { type: 'button', class: 'more-btn', onclick: () => { drawer = !drawer; set({}); } }, [icon('more'), h('span', { text: 'More' })]);
  s.cols.append(s.sense, s.decide, s.act);
  s.root.append(s.bar, s.head, s.tl, s.scene, s.cols, s.more, s.drawer);
  s.sceneApi = createScene(s.scene, {
    onMission: (id) => set({ missionId: id }),
    onCompare: () => { compare = !compare; set({}); },
  });
  s.scene.querySelector('.scn-switch').dataset.spot = 'switch';
  renderSuit(s.suit, {
    record: verdictFor().records.find((r) => r.day === state.day), seed: state.day,
    onAlert: (a) => setLiveAlert(a ? { ...a, personId: p.id, day: state.day } : null),
  });
  s.suitDay = state.day;
  return s;
}

function playDays() {
  clearInterval(playTimer);
  if (playTimer) { playTimer = 0; set({}); return; }
  playTimer = setInterval(() => {
    if (state.day >= 180 || state.route !== 'today') { clearInterval(playTimer); playTimer = 0; set({}); return; }
    set({ day: state.day + 1, liveAlert: null });
  }, 110);
  set({});
}

export function renderToday(root, hooks = {}) {
  const p = person();
  const m = mission();
  if (!shell || shell.personId !== p.id) shell = buildShell(p);
  if (root.firstChild !== shell.root || root.childNodes.length !== 1) root.replaceChildren(shell.root);
  const { ev, v, fu, records } = verdictFor();
  const today = records[state.day - 1] || {};

  shell.bar.hidden = !story.on;
  if (story.on) renderStoryBar(shell.bar, { who: `${p.name} · Day ${state.day}` });

  shell.head.replaceChildren(
    h('div', { class: 'who', title: p.role }, [h('span', { class: 'who-name', text: p.name }), renderStreak(records, state.day),
      renderPatch({ done: state.crew.map((c) => recordsOf(c.id)[state.day - 1]?.mood != null), names: state.crew.map((c) => c.name), size: 34 })]),
  );

  // Timeline with event icons and a Play button.
  const strip = statusStrip();
  if (!shell.tlApi || shell.strip !== strip) {
    shell.tlApi = renderTimeline(shell.tl, {
      days: 180, day: state.day, statuses: strip,
      events: eventsFor(p.id).map((e) => ({ day: e.day, label: e.label, icon: icon(EVENT_ICON[e.id] || 'spark') })),
      onChange: (d) => { shell.day = d; set({ day: d, liveAlert: null }); },
      extra: h('button', { type: 'button', class: 'tl-play', 'aria-label': 'Play mission days', onclick: playDays }, [icon('play')]),
    });
    shell.strip = strip;
  } else if (shell.day !== state.day && !shell.tl.contains(document.activeElement)) {
    shell.tlApi?.setDay?.(state.day);
  }
  shell.day = state.day;
  shell.tl.querySelector('.tl-play')?.replaceChildren(icon(playTimer ? 'pause' : 'play'));

  // Distance scene, full width: the line length and who is lit change with the mission.
  const near = missionById('iss');
  const deep = missionById('mars-transit');
  const sysDots = SYSTEMS.map((s) => ({ label: s.label, status: ev.systems[s.id].status }));
  shell.sceneApi.update({
    missions: MISSIONS, mission: m, v, compare, replay: story.on ? currentStep().id : '', selfName: p.name.split(' ')[0],
    may: Object.entries(AGENT_CAPS).map(([id, c]) => ({ ...c, on: agentMay(m).includes(id) })),
    compareRows: [
      { title: 'Near Earth', mission: near, tier: escalate(ev, near).tier, signals: sysDots, may: agentMay(near).length },
      { title: 'Deep space', mission: deep, tier: escalate(ev, deep, { followupFailed: fu?.state === 'not-worked' }).tier, signals: sysDots, may: agentMay(deep).length },
    ],
  });

  // 1 SENSE: body, live suit, sources.
  const bodyBox = h('div', { class: 'today-body', 'data-spot': 'body' });
  const statuses = {};
  for (const s of SYSTEMS) statuses[s.id] = ev.systems[s.id].status;
  renderBody(bodyBox, { systems: statuses, selected: state.system, onSelect: (id) => set({ system: id }), links: v.combos?.[0]?.systems || [] });
  const src = SOURCES.find((x) => x.id === source);
  if (src) for (const z of bodyBox.querySelectorAll('[data-system]')) z.classList.toggle('cc-feed', src.feeds.includes(z.dataset.system));
  if (shell.suitDay !== state.day) { shell.suitDay = state.day; shell.suit._suitSetRecord?.(records.find((r) => r.day === state.day)); }
  const dose = doseSummary(records, state.day);
  const sources = h('div', { class: 'src-strip', 'data-spot': 'sources' }, [
    h('div', { class: 'src-icons', role: 'toolbar', 'aria-label': 'Data sources' }, [
      ...SOURCES.map((x) => h('button', {
        type: 'button', class: `src-ic${x.id === source ? ' on' : ''}`, 'aria-label': x.name, 'aria-pressed': String(x.id === source), title: x.name, 'data-src': x.id,
        onclick: () => { source = source === x.id ? null : x.id; set({}); },
      }, [icon(x.icon)])),
      h('button', { type: 'button', class: 'src-ic src-dose', title: 'Radiation dose, mission total · open chart', 'aria-label': 'Radiation dose', onclick: () => { drawer = true; set({}); } }, [icon('rad'), h('span', { text: `${Math.round(dose.total)} mSv` })]),
    ]),
    src ? h('div', { class: 'src-detail' }, [h('b', { text: src.name }), h('span', { text: ` · ${src.status(state.day, localEntry(p.id, state.day) || today)}` })]) : null,
  ]);
  // Live suit lines stand right of the body, so both show on the first screen.
  shell.sense.replaceChildren(h('div', { class: 'col-h' }, [h('span', { class: 'col-n', text: '1' }), h('span', { text: 'Sense' })]), h('div', { class: 'sense-row' }, [bodyBox, shell.suit]), sources);

  // 2 DECIDE: decided by rules, Why panel, one forecast chip.
  const vbox = h('div', { class: 'vd-box' });
  renderVerdict(vbox, { ev, v, records, mission: m, selfName: p.name.split(' ')[0], onRule: (sys) => set({ system: sys }) });
  const decideKids = [h('div', { class: 'col-h' }, [h('span', { class: 'col-n', text: '2' }), h('span', { text: 'Decide' })]), vbox];
  // Crew rule: this person is part of a shared cabin case (non-clinical, changes no status).
  const cab = cabinCase();
  const inCab = !!cab?.who.includes(p.id);
  if (inCab) decideKids.push(h('a', { class: 'cab-chip', href: '#/crew', title: 'Likely shared cause: open Crew' }, [icon('cabin'), h('span', { text: `Cabin: ${cab.word}` }), confBadge('hypothesis')]));
  if (state.day <= ADAPTATION_DAYS && v.status === 'yellow') decideKids.push(h('div', { class: 'verdict-ctx', title: 'Short sleep and headaches are expected while the body adapts to microgravity', text: 'Adaptation week · expected' }));
  if (state.system) {
    const whyBox = h('div', { class: 'why-box' });
    decideKids.push(whyBox);
    renderWhy(whyBox, { systemId: state.system, ev, onClose: () => set({ system: null }), cabin: inCab ? `May be shared: cabin ${cab.label}` : null });
    if (lastSystem !== state.system) requestAnimationFrame(() => whyBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  }
  lastSystem = state.system;
  const ahead = nextCrossings(records, state.day)[0];
  if (ahead) {
    decideKids.push(h('button', { class: 'ahead-chip', title: 'Forecast: linear trend of daily values', onclick: () => hooks.go?.('trends') },
      [confBadge('hypothesis'), h('span', { text: `${SIGNAL_LABEL[ahead.rule.signal][0]} → ${ahead.rule.value} ~${ahead.daysToCross}d` })]));
  }
  shell.decide.replaceChildren(...decideKids);

  // 3 ACT: action cards, report to Earth, follow-up check, advisor bubble.
  const actKids = [h('div', { class: 'col-h' }, [h('span', { class: 'col-n', text: '3' }), h('span', { text: 'Act' })])];
  // The onboard agent's case card replaces loose action cards; clinical steps wait for Approve.
  const cmDay = eventsFor(p.id).find((e) => e.id === 'countermeasure')?.day ?? null;
  actKids.push(renderCase({
    person: p, records, strip, v, mission: m, day: state.day, countermeasureDay: cmDay,
    live: getLiveAdvice(p.id, state.day, 'handover')?.text || null,
    reveal: story.on && currentStep().id === 'act',
    onChange: () => set({}), onLog: () => { drawer = true; set({}); },
  }));
  actKids.push(advisorBubble(p, ev, v, m, records));
  if (fu && fu.state !== 'none' && state.day <= fu.dueDay + 14) actKids.push(followUpCard(fu, records));
  shell.act.replaceChildren(...actKids);

  // Drawer: radiation chart and instruments, off the main screen.
  shell.drawer.hidden = !drawer;
  shell.more.setAttribute('aria-expanded', String(drawer));
  if (drawer) {
    const rad = h('div', { class: 'rad-box' });
    const ins = h('div', { class: 'ins-box' });
    const cmD = eventsFor(p.id).find((e) => e.id === 'countermeasure')?.day ?? null;
    shell.drawer.replaceChildren(h('div', { class: 'drawer-h' }, [h('span', { text: 'Agent log · radiation · instruments' }), h('button', { type: 'button', class: 'why-x', 'aria-label': 'Close', onclick: () => { drawer = false; set({}); }, text: '×' })]),
      renderAgentLog({ person: p, records, strip, mission: m, day: state.day, countermeasureDay: cmD }), rad, ins);
    renderRadiation(rad, { records, day: state.day });
    renderInstruments(ins, { day: state.day });
  }

  decorate(shell.root);
  if (story.on) { renderNarrator(shell.card); placeNarrator(shell.root, shell.card); } else { shell.card.remove(); shell.root.querySelectorAll('.sn-mark').forEach((n) => n.remove()); }
  const step = story.on ? currentStep().id : null;
  // New story step: bring its first highlighted block into view (keep the story bar visible).
  const bringIntoView = () => {
    if (story.on) placeNarrator(shell.root, shell.card);
    // Phone: card and the step's main block only (blocks are reordered there; a second lit block may sit far away).
    const narrow = matchMedia('(max-width: 760px)').matches;
    const lit = narrow ? [shell.root.querySelector(`[data-spot="${currentStep().spots[0]}"]`)].filter(Boolean) : [...shell.root.querySelectorAll('.spot')];
    const spots = [...lit, ...(story.on && !shell.card.classList.contains('sn-c') ? [shell.card] : [])];
    if (!spots.length) return;
    const top = Math.min(...spots.map((e) => e.getBoundingClientRect().top));
    const bottom = Math.max(...spots.map((e) => e.getBoundingClientRect().bottom));
    const bs = getComputedStyle(shell.bar);
    const cover = (bs.position === 'sticky' ? (parseFloat(bs.top) || 0) + shell.bar.offsetHeight : 0) + 12;
    // Smallest scroll that shows all highlighted blocks; if they do not fit, align their top under the bar.
    let dy = 0;
    if (bottom > innerHeight) dy = Math.min(bottom - innerHeight + 16, top - cover);
    else if (top < cover) dy = top - cover;
    if (Math.abs(dy) > 4) window.scrollTo({ top: Math.max(0, scrollY + dy), behavior: 'smooth' });
  };
  if (step && step !== lastStep) { setTimeout(bringIntoView, 30); setTimeout(bringIntoView, 450); }
  // The card appears once the step's motion is over: bring card and blocks into view again at that moment.
  if (step && story.ready && !lastReady) setTimeout(bringIntoView, 30);
  lastReady = !!(step && story.ready);
  lastStep = step;

  // Live advice only on demand (bubble open, a question chosen, the note open) and only once the day
  // has stayed put for a moment, so dragging the slider or the story sweep never floods the proxy.
  clearTimeout(liveTimer);
  if (PROXY_URL && v.status !== 'green') {
    const wanted = [state.advisorOpen && 'explain', state.advisorOpen && advQ, noteIsOpen() && 'handover'].filter(Boolean)
      .filter((q) => !getLiveAdvice(p.id, state.day, q) && !liveTried(p.id, state.day, q));
    if (wanted.length) {
      const day = state.day;
      liveTimer = setTimeout(() => {
        if (state.day !== day || state.personId !== p.id) return;
        const payload = livePayload(ev, v, m, records, fu);
        // One request at a time: the next one goes after this answer re-renders the screen.
        requestLiveAdvice(p.id, day, payload, () => set({}), wanted[0]);
      }, 700);
    }
  }
}
renderToday.persistent = true;

// AI explains: one bubble, two short sentences, three fixed questions. It never decides.
function advisorBubble(p, ev, v, m, records) {
  const adv = findAdvice(p.id, state.day, flagged(ev), (d) => flagged(evaluate(records, d)));
  const shown = attachAdvice(v, getLiveAdvice(p.id, state.day) || adv || {});
  const open = !!state.advisorOpen;
  const live = shown.advice.origin === 'live';
  const head = h('button', { type: 'button', class: 'adv-chip', 'aria-expanded': String(open), onclick: () => set({ advisorOpen: !open }) },
    [icon('spark'), h('span', { class: 'adv-t', text: 'AI explains' }), h('span', { class: 'adv-only', text: 'advises only' })]);
  const box = h('section', { class: `adv-bubble${open ? ' open' : ''}`, 'data-spot': 'advisor' }, [head]);
  if (!open) return box;
  if (!shown.advice.text) {
    box.append(h('div', { class: 'adv-say muted', text: v.status === 'green' ? 'Nothing to add today.' : 'No advice for this day. Rules still decide.' }));
    return box;
  }
  const say = shown.advice.text.split(/(?<=\.)\s+/).slice(0, 2).join(' ');
  const answer = advQ ? (getLiveAdvice(p.id, state.day, advQ)?.text || adv?.answers?.[advQ]) : null;
  // Element.append() would print null as text, so empty parts are filtered out.
  box.append(...[
    h('div', { class: 'adv-say', text: say }),
    adv?.answers || PROXY_URL ? h('div', { class: 'adv-qs' }, QUESTIONS.map((q) => h('button', {
      type: 'button', class: `adv-q${advQ === q.id ? ' on' : ''}`, 'aria-pressed': String(advQ === q.id),
      onclick: () => { advQ = advQ === q.id ? null : q.id; set({}); }, text: q.label,
    }))) : null,
    answer ? h('div', { class: 'adv-ans', text: answer }) : null,
    h('div', { class: 'adv-origin', text: live ? 'AI-generated (Claude), live' : PRECOMPUTED_LABEL }),
  ].filter(Boolean));
  return box;
}

// 3-day mean ending on a day, to show before → after for each signal of the countermeasure.
const mean3 = (records, day, s) => {
  const v = records.filter((r) => r.day > day - 3 && r.day <= day).map((r) => r[s]).filter((x) => typeof x === 'number');
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const f1 = (x) => (x == null ? '–' : Math.abs(x) >= 20 ? String(Math.round(x)) : x.toFixed(1));

function followUpCard(fu, records) {
  const left = Math.max(0, fu.dueDay - state.day);
  return h('div', { class: `fu fu-${fu.state}`, 'data-spot': 'check' }, [
    h('div', { class: 'fu-head' }, [
      icon('shield'),
      h('span', { class: 'fu-title', text: fu.state === 'pending' ? 'Countermeasure running' : fu.state === 'worked' ? 'Countermeasure worked' : 'Partly worked' }),
      h('span', { class: 'muted', text: fu.state === 'pending' ? `check in ${left} d` : `day ${fu.dueDay}` }),
    ]),
    h('div', { class: 'fu-track' }, Array.from({ length: fu.dueDay - fu.startDay + 1 }, (_, i) => h('span', { class: `fu-step ${fu.startDay + i <= state.day ? 'on' : ''}` }))),
    h('div', { class: 'fu-items' }, fu.items.map((it) => h('span', { class: `fu-item fi-${it.result}` }, [
      h('span', { class: 'fi-mark', text: it.result === 'worked' ? '✓' : it.result === 'not-worked' ? '✕' : '…' }),
      h('span', { class: 'fi-name', text: SIGNAL_LABEL[it.signal][0] }),
      fu.state !== 'pending' ? h('span', { class: 'fi-ba', text: `${f1(mean3(records, fu.startDay - 1, it.signal))} → ${f1(mean3(records, fu.dueDay, it.signal))}` }) : null,
    ]))),
  ]);
}

// Keep the narrator card next to its block when the window changes size.
if (typeof window !== 'undefined') window.addEventListener('resize', () => { if (story.on && shell?.root.isConnected) placeNarrator(shell.root, shell.card); });
