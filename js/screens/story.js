import { h } from '../viz/svg.js';
import { icon } from '../viz/icons.js';
import { set, state } from '../state.js';
import { HERO_ID } from '../demo/generator.js';

// Story mode v2: nine steps on the real app state, from mission day 1. Each step sets a real day and
// distance; a narrator card next to the lit block says what day it is, what happened and why it matters.
// Days are checked against the engine in tests/story.test.js.
export const STEPS = [
  { id: 'meet', name: 'Mission', day: 1, mission: 'mars-transit', spots: ['scene'], ms: 7000,
    badge: 'Day 1 · Launch', title: 'Meet the mission', look: ['envelope', 'The distance line'],
    text: 'Maya Okafor, one of four crew, starts a 180-day flight to Mars. As Earth gets farther away, its answer takes longer to arrive.' },
  { id: 'sense', name: 'Sense', day: 10, mission: 'mars-transit', spots: ['body', 'suit'], ms: 7500,
    badge: 'Day 10 · All clear', title: 'The suit does the measuring', look: ['suit', 'Body and live lines'], marks: ['Body', 'Live lines'],
    text: "Pulse, breathing and oxygen stream in on their own. Everything sits inside Maya's personal norm, so nothing asks for her attention." },
  { id: 'small', name: 'Small', day: 60, mission: 'mars-transit', spots: ['rules', 'act'], ms: 8000,
    badge: 'Day 60 · Missed workouts', title: 'A small problem, handled on board', look: ['rule', 'Verdict and agent'], marks: ['Verdict', 'Agent'],
    text: 'A week of missed exercise shows up. The rules flag it, the agent sets a reminder and a re-check, and Maya handles it herself.' },
  { id: 'drift', name: 'Drift', from: 103, day: 118, mission: 'mars-transit', spots: ['timeline', 'body'], ms: 9000,
    badge: 'Day 103 → 118 · Sleep drift', title: 'Three signals drift together', look: ['clock', 'Mission ribbon and body'], marks: ['Mission ribbon', 'Body'],
    text: 'Sleep drops, mood follows and blood pressure climbs. One alone is noise. Three together is a pattern.' },
  { id: 'rules', name: 'Rules', day: 118, mission: 'mars-transit', spots: ['rules'], ms: 8000,
    badge: 'Day 118 · 3 linked signals', title: 'Rules decide, and show why', look: ['scale', 'Bars in the verdict'],
    text: "Each bar shows Maya's own norm, the threshold and today's value. Every rule names its source. The AI explains but never decides." },
  { id: 'distance', name: 'Distance', day: 118, missions: ['iss', 'moon', 'mars-transit'], spots: ['scene'], ms: 9000,
    badge: 'Day 118 · ISS → Moon → Mars', title: 'Who acts depends on distance', look: ['person', 'The lit node'],
    text: 'Near Earth, the flight surgeon answers in seconds and decides. On the way to Mars the answer takes 40 minutes, so the crew medic acts now.' },
  { id: 'act', name: 'Act', day: 121, mission: 'mars-transit', spots: ['act'], ms: 8000,
    badge: 'Day 121 · Countermeasure', title: 'The agent runs the case', look: ['spark', 'Onboard agent card'],
    text: 'It schedules the re-measure, sends the report and pages the medic on its own. Anything clinical waits for a human to approve.' },
  { id: 'check', name: 'Check', day: 128, mission: 'mars-transit', spots: ['check'], ms: 8000,
    badge: 'Day 128 · One week later', title: 'Did it work?', look: ['check', 'Result check'],
    text: 'The agent re-checks a week later. Sleep is back in range, pressure is not, so the case stays open and moves up a step.' },
  { id: 'why', name: 'Why', day: 128, mission: 'mars-transit', spots: [], ms: 8000,
    badge: 'Day 128 · Summary', title: 'What makes this different', look: null,
    text: 'Decisions move on board as Earth gets farther. Rules decide and show their sources. An agent follows each case to the end.',
    points: [['envelope', 'Decides on board'], ['rule', 'Rules with sources'], ['spark', 'Agent runs the case']] },
];
const LAST = STEPS.length - 1;

const st = { on: false, i: 0, playing: false, timers: [] };
let onChange = () => {};
export const story = st;
export const setStoryListener = (fn) => { onChange = fn; };
export const currentStep = () => STEPS[Math.min(st.i, LAST)];

function clearTimers() { for (const t of st.timers) clearTimeout(t); st.timers = []; }
const later = (fn, ms) => st.timers.push(setTimeout(fn, ms));

// Slider travels to the step's day in front of the viewer (about 2 s, at most 25 frames).
function sweep(from, to) {
  const n = to - from;
  const frames = Math.min(n, 25);
  for (let k = 1; k <= frames; k++) later(() => set({ day: from + Math.round((n * k) / frames) }), (2000 / frames) * k);
}

function enter(i) {
  clearTimers();
  st.i = i;
  const s = currentStep();
  history.replaceState(null, '', `#/story?step=${i + 1}`);
  const base = { personId: HERO_ID, system: null, liveAlert: null, advisorOpen: false };
  const start = s.from ?? (state.day < s.day && state.day >= 1 && i > 0 ? state.day : s.day);
  if (s.missions) {
    set({ ...base, day: s.day, missionId: s.missions[0] });
    s.missions.slice(1).forEach((m, k) => later(() => set({ missionId: m }), 2200 * (k + 1)));
  } else {
    set({ ...base, day: start, missionId: s.mission });
    if (s.day > start) sweep(start, s.day);
  }
  if (st.playing && i < LAST) later(() => enter(i + 1), s.ms);
  if (st.playing && i === LAST) st.playing = false;
  onChange();
}

export function startStory({ play = false, step = 0 } = {}) { st.on = true; st.playing = play; enter(Math.max(0, Math.min(LAST, step))); }
export function stopStory() { clearTimers(); st.on = false; st.playing = false; history.replaceState(null, '', '#/explore'); set({ advisorOpen: false }); onChange(); }
const go = (d) => { st.playing = false; enter(Math.max(0, Math.min(LAST, st.i + d))); };
function togglePlay() {
  st.playing = !st.playing;
  if (st.playing) enter(st.i >= LAST ? 0 : st.i);
  else { clearTimers(); onChange(); }
}

if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (e) => {
    if (!st.on || e.altKey || e.ctrlKey || e.metaKey || /input|textarea|select/i.test(e.target?.tagName || '')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  });
}

// Bar on top of the monitor: steps, Play, Explore freely. The text lives in the narrator card.
export function renderStoryBar(container, { who = '' } = {}) {
  container.replaceChildren(
    h('div', { class: 'sb-who' }, who),
    h('ol', { class: 'sb-steps', 'aria-label': 'Story steps' }, STEPS.map((x, k) => h('li', {}, [h('button', {
      type: 'button', class: `sb-step${k === st.i ? ' on' : ''}${k < st.i ? ' done' : ''}`, 'aria-current': k === st.i ? 'step' : null,
      onclick: () => { st.playing = false; enter(k); },
    }, [h('span', { class: 'sb-n' }, String(k + 1)), h('span', { class: 'sb-name' }, x.name)])]))),
    h('div', { class: 'sb-ctl' }, [
      h('button', { type: 'button', class: 'sb-btn sb-play', onclick: togglePlay }, [icon(st.playing ? 'pause' : 'play'), h('span', {}, st.playing ? 'Pause' : 'Play story')]),
      h('button', { type: 'button', class: 'sb-btn sb-free', onclick: stopStory }, 'Explore freely'),
    ]),
  );
}

// Narrator card: day and event, a short title, two sentences, where to look, Back / Next and progress dots.
export function renderNarrator(card) {
  const s = currentStep();
  const last = st.i === LAST;
  card.className = 'sn';
  card.dataset.step = s.id;
  card.onclick = (e) => { if (st.playing && !e.target.closest('button')) togglePlay(); };
  card.replaceChildren(...[
    h('span', { class: 'sn-arrow', 'aria-hidden': 'true' }),
    h('div', { class: 'sn-badge' }, s.badge),
    h('h3', { class: 'sn-title' }, s.title),
    h('p', { class: 'sn-text' }, s.text),
    s.points ? h('div', { class: 'sn-points' }, s.points.map(([ic, t]) => h('div', { class: 'sn-pt' }, [h('span', { class: 'sn-pt-i' }, [icon(ic)]), h('span', {}, t)]))) : null,
    s.marks
      ? h('div', { class: 'sn-look' }, [h('span', { class: 'sn-look-k' }, 'Look at'), ...s.marks.flatMap((t, k) => [h('span', { class: 'sn-num' }, String(k + 1)), h('span', {}, t)])])
      : s.look ? h('div', { class: 'sn-look' }, [h('span', { class: 'sn-look-k' }, 'Look at'), icon(s.look[0]), h('span', {}, s.look[1])]) : null,
    h('div', { class: 'sn-foot' }, [
      h('button', { type: 'button', class: 'sn-btn', 'aria-label': 'Back', disabled: st.i === 0, onclick: () => go(-1) }, [icon('back')]),
      h('div', { class: 'sn-dots', 'aria-label': `Step ${st.i + 1} of ${STEPS.length}` }, STEPS.map((x, k) => h('span', { class: `sn-dot${k === st.i ? ' on' : k < st.i ? ' done' : ''}` }))),
      last
        ? h('div', { class: 'sn-end' }, [
          h('button', { type: 'button', class: 'sn-btn', onclick: () => { st.playing = false; enter(0); } }, [icon('replay'), h('span', {}, 'Replay')]),
          h('button', { type: 'button', class: 'sn-btn sn-primary', onclick: stopStory }, 'Explore freely'),
        ])
        : h('button', { type: 'button', class: 'sn-btn sn-primary', 'aria-label': 'Next', onclick: () => go(1) }, [h('span', {}, 'Next'), icon('next')]),
    ]),
    st.playing ? h('div', { class: 'sn-play', style: `animation-duration:${s.ms}ms` }) : null,
  ].filter(Boolean));
}

// Place the card next to the first lit block, arrow pointing at it. Narrow screens: card right before the block.
// Two lit blocks: each gets a numbered mark; the card names them by number.
function placeMarks(root, s) {
  root.querySelectorAll('.sn-mark').forEach((n) => n.remove());
  if (!s.marks) return;
  const R = root.getBoundingClientRect();
  s.spots.forEach((id, k) => {
    const el = root.querySelector(`[data-spot="${id}"]`);
    if (!el) return;
    const b = el.getBoundingClientRect();
    root.append(h('span', { class: 'sn-mark', 'aria-hidden': 'true', style: `left:${b.left - R.left - 12}px;top:${b.top - R.top - 12}px` }, String(k + 1)));
  });
}

export function placeNarrator(root, card) {
  const s = currentStep();
  const spot = s.spots.length ? root.querySelector(`[data-spot="${s.spots[0]}"]`) : null;
  card.classList.remove('sn-r', 'sn-l', 'sn-b', 'sn-c');
  // No lit block (summary): pin the card to the middle of the visible screen, whatever the scroll.
  if (!spot) {
    if (card.parentNode !== root) root.append(card);
    card.classList.add('sn-c');
    card.style.cssText = '';
    placeMarks(root, s);
    return;
  }
  if (matchMedia('(max-width: 760px)').matches) {
    card.style.cssText = '';
    const anchor = spot || root.querySelector('.today-head');
    if (anchor && card.nextSibling !== anchor) anchor.before(card);
    // Narrow layout reorders blocks with CSS order; give the card its block's order so it stays right above it.
    if (anchor) card.style.order = getComputedStyle(anchor).order;
    placeMarks(root, s);
    return;
  }
  placeMarks(root, s);
  if (card.parentNode !== root) root.append(card);
  const W = 380;
  const R = root.getBoundingClientRect();
  const box = (e) => { const r = e.getBoundingClientRect(); return { l: r.left - R.left, r: r.right - R.left, t: r.top - R.top, b: r.bottom - R.top }; };
  const rel = box(spot);
  const others = s.spots.slice(1).map((id) => root.querySelector(`[data-spot="${id}"]`)).filter(Boolean).map(box);
  const ch = card.offsetHeight || 300;
  const midY = Math.max(0, rel.t + Math.min(rel.b - rel.t, 260) / 2 - ch / 2);
  const bx = Math.min(Math.max(0, (rel.l + rel.r) / 2 - W / 2), R.width - W);
  // Candidates: right, left, below the main block. Skip one that leaves the screen or covers another lit block.
  const cands = [
    { cls: 'sn-r', l: rel.r + 20, t: midY },
    { cls: 'sn-l', l: rel.l - W - 20, t: midY },
    // Beside the whole lit group (e.g. right of body + suit) when the main block's own side is taken.
    { cls: 'sn-r', l: Math.max(rel.r, ...others.map((o) => o.r)) + 20, t: midY },
    { cls: 'sn-b', l: bx, t: rel.b + 18 },
  ];
  const hits = (c) => others.some((o) => c.l < o.r && c.l + W > o.l && c.t < o.b && c.t + ch > o.t);
  const fits = (c) => c.l >= 0 && c.l + W <= R.width;
  const c = cands.find((x) => fits(x) && !hits(x)) || cands.find(fits) || cands[2];
  card.classList.add(c.cls);
  const arrowX = Math.min(W - 28, Math.max(28, (rel.l + rel.r) / 2 - c.l));
  card.style.cssText = `left:${c.l}px;top:${c.t}px;width:${W}px;--ax:${arrowX}px`;
}

// Dim everything except the step's elements (kept visible, not black).
export function decorate(root) {
  const s = st.on ? currentStep() : null;
  if (s) root.dataset.story = s.id; else delete root.dataset.story;
  for (const n of root.querySelectorAll('[data-spot]')) n.classList.toggle('spot', !!s && s.spots.includes(n.dataset.spot));
  for (const n of root.querySelectorAll('[data-spot]')) n.classList.remove('try-dot');
}
