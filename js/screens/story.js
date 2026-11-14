import { h } from '../viz/svg.js';
import { icon } from '../viz/icons.js';
import { set, state } from '../state.js';
import { HERO_ID } from '../demo/generator.js';

// Story mode: six steps on the real app state. Each step only sets a real day and distance;
// nothing on screen is faked. "Play story" runs all steps in about 40 seconds.
export const STEPS = [
  { id: 'sense', name: 'Sense', day: 10, mission: 'mars-transit', spots: ['body', 'suit'], caption: 'The suit measures. Maya does nothing.', ms: 5500 },
  { id: 'drift', name: 'Drift', from: 103, day: 118, mission: 'mars-transit', spots: ['timeline', 'body'], caption: 'Three signals drift together.', ms: 6500 },
  { id: 'rules', name: 'Rules', day: 118, mission: 'mars-transit', spots: ['rules'], caption: 'Rules decide. Every rule has a source.', ms: 6000 },
  { id: 'distance', name: 'Distance', day: 118, missions: ['iss', 'moon', 'mars-transit'], spots: ['scene'], caption: 'Near Earth the surgeon answers. Here the crew acts.', ms: 7500 },
  { id: 'act', name: 'Act', from: 118, day: 121, mission: 'mars-transit', spots: ['act', 'scene', 'advisor'], caption: 'The crew acts while the answer travels.', ms: 6500, advisor: true },
  { id: 'check', name: 'Check', day: 128, mission: 'mars-transit', spots: ['check'], caption: 'Did it work? Sleep yes. Pressure not yet.', ms: 6000 },
];
const TRY = { id: 'try', name: 'Try', spots: ['timeline', 'scene', 'switch', 'body'], dots: ['timeline', 'switch', 'body'], caption: 'Now try it yourself.' };

const st = { on: false, i: 0, playing: false, timers: [] };
let onChange = () => {};
export const story = st;
export const setStoryListener = (fn) => { onChange = fn; };
export const currentStep = () => (st.i < STEPS.length ? STEPS[st.i] : TRY);

function clearTimers() { for (const t of st.timers) clearTimeout(t); st.timers = []; }
const later = (fn, ms) => st.timers.push(setTimeout(fn, ms));

function enter(i) {
  clearTimers();
  st.i = i;
  const s = currentStep();
  const base = { personId: HERO_ID, system: null, liveAlert: null, advisorOpen: !!s.advisor };
  if (s.id === 'try') { set({ ...base, advisorOpen: false }); onChange(); return; }
  if (s.missions) {
    set({ ...base, day: s.day, missionId: s.missions[0] });
    s.missions.slice(1).forEach((m, k) => later(() => set({ missionId: m }), 1800 * (k + 1)));
  } else if (s.from) {
    set({ ...base, day: s.from, missionId: s.mission });
    const n = s.day - s.from;
    const stepMs = Math.max(120, Math.min(300, 3600 / n));
    for (let k = 1; k <= n; k++) later(() => set({ day: s.from + k }), stepMs * k);
  } else {
    set({ ...base, day: s.day, missionId: s.mission });
  }
  if (st.playing) later(() => enter(i + 1), s.ms);
  onChange();
}

export function startStory({ play = false, step = 0 } = {}) { st.on = true; st.playing = play; enter(Math.max(0, Math.min(STEPS.length, step))); }
export function stopStory() { clearTimers(); st.on = false; st.playing = false; set({ advisorOpen: false }); onChange(); }
const go = (d) => { st.playing = false; enter(Math.max(0, Math.min(STEPS.length, st.i + d))); };
function togglePlay() {
  st.playing = !st.playing;
  if (st.playing) enter(st.i >= STEPS.length ? 0 : st.i);
  else { clearTimers(); onChange(); }
}

// Bar on top of the monitor: steps, one caption, Back / Next, Play, Explore freely.
export function renderStoryBar(container) {
  const s = currentStep();
  const last = s.id === 'try';
  container.replaceChildren(
    h('ol', { class: 'sb-steps', 'aria-label': 'Story steps' }, STEPS.map((x, k) => h('li', {}, [h('button', {
      type: 'button', class: `sb-step${k === st.i ? ' on' : ''}${k < st.i ? ' done' : ''}`, 'aria-current': k === st.i ? 'step' : null,
      onclick: () => { st.playing = false; enter(k); },
    }, [h('span', { class: 'sb-n' }, String(k + 1)), h('span', { class: 'sb-name' }, x.name)])]))),
    h('div', { class: 'sb-cap', 'aria-live': 'polite' }, s.caption),
    h('div', { class: 'sb-ctl' }, [
      h('button', { type: 'button', class: 'sb-btn', 'aria-label': 'Back', disabled: st.i === 0, onclick: () => go(-1) }, [icon('back')]),
      last ? null : h('button', { type: 'button', class: 'sb-btn sb-play', onclick: togglePlay }, [icon(st.playing ? 'pause' : 'play'), h('span', {}, st.playing ? 'Pause' : 'Play story')]),
      last ? null : h('button', { type: 'button', class: 'sb-btn', 'aria-label': 'Next', onclick: () => go(1) }, [icon('next')]),
      h('button', { type: 'button', class: `sb-btn sb-free${last ? ' sb-primary' : ''}`, onclick: stopStory }, last ? 'Explore' : 'Explore freely'),
    ]),
  );
}

// Dim everything except the step's elements.
export function decorate(root) {
  const s = st.on ? currentStep() : null;
  if (s) root.dataset.story = s.id; else delete root.dataset.story;
  for (const n of root.querySelectorAll('[data-spot]')) n.classList.toggle('spot', !!s && s.spots.includes(n.dataset.spot));
  for (const n of root.querySelectorAll('[data-spot]')) n.classList.toggle('try-dot', !!s?.dots?.includes(n.dataset.spot));
}

