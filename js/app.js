import { h } from './ui.js';
import { state, set, subscribe, resetDemo } from './state.js';
import { renderToday, resetTimeline } from './screens/today.js';
import { story, startStory, stopStory, setStoryListener } from './screens/story.js';
import { icon } from './viz/icons.js';
import { shipSvg } from './viz/scene.js';
import { missionById, decidesText, oneWayText, isReachable } from './data/missions.js';

const SCREENS = [
  { id: 'crew', label: 'Crew' },
  { id: 'today', label: 'Monitor' },
  { id: 'checkin', label: 'Check-in' },
  { id: 'trends', label: 'Trends' },
  { id: 'earth', label: 'Earth' },
  { id: 'sources', label: 'Sources' },
];
const renderers = { today: renderToday };
const failed = new Set();
export function registerScreen(id, fn) { renderers[id] = fn; }

const app = document.getElementById('app');
const nav = h('nav', { class: 'tabs', 'aria-label': 'Screens' });
document.querySelector('.top').append(nav);
// Mission strip on every screen: where we are and who decides at this distance. Tap opens the distance scene.
const strip = h('button', { type: 'button', class: 'mstrip', onclick: () => { go('today'); setTimeout(() => document.querySelector('.scene-box')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120); } });
document.querySelector('.top').append(strip);
function renderStrip() {
  const m = missionById(state.missionId);
  strip.dataset.far = String(!isReachable(m));
  strip.setAttribute('aria-label', `${m.label}, ${oneWayText(m)}, ${decidesText(m)}. Open the distance scene`);
  strip.replaceChildren(shipSvg(), h('span', { class: 'ms-m', text: m.label }), h('span', { class: 'ms-d', text: oneWayText(m) }), h('span', { class: 'ms-who', text: decidesText(m) }));
}

function readHash() {
  const [route, query] = location.hash.replace(/^#\/?/, '').split('?');
  const q = new URLSearchParams(query || '');
  const patch = {};
  if (route === 'explore' || route === 'story') patch.route = 'today';
  else if (route && SCREENS.some((s) => s.id === route)) patch.route = route;
  if (q.get('p') && state.crew.some((c) => c.id === q.get('p'))) patch.personId = q.get('p');
  const d = Number(q.get('d'));
  if (Number.isInteger(d) && d >= 1 && d <= 180) patch.day = d;
  return patch;
}

export function go(route, patch = {}) {
  if (story.on && (route !== 'today' || patch.personId)) stopStory();
  if (route !== 'today' || (patch.personId && patch.personId !== state.personId)) resetTimeline();
  set({ ...patch, route, system: patch.system ?? null });
  if (!(story.on && route === 'today')) history.replaceState(null, '', `#/${route}`);
  window.scrollTo(0, 0);
}

function render() {
  renderStrip();
  nav.replaceChildren(...SCREENS.map((s) => h('a', {
    href: `#/${s.id}`, class: s.id === state.route ? 'on' : '',
    onclick: (e) => { e.preventDefault(); go(s.id); },
  }, s.label)));
  const fn = renderers[state.route];
  const scrollY = window.scrollY;
  // A persistent screen keeps its DOM, so the page does not jump and a smooth scroll is not cancelled.
  if (fn?.persistent) { fn(app, { go }); return; }
  {
    app.replaceChildren();
    if (fn) fn(app, { go });
    else if (failed.has(state.route)) app.append(h('div', { class: 'boot-fail' }, [h('p', { text: 'This screen did not load.' }), h('button', { type: 'button', text: 'Reload', onclick: () => location.reload() })]));
    else app.append(h('p', { class: 'soon', text: 'Loading…' }));
  }
  window.scrollTo(0, scrollY);
}

// Replay story is always in the header; the story runs on the real monitor.
document.querySelector('.top').insertBefore(h('button', { class: 'replay', type: 'button', onclick: () => { go('today'); startStory(); } }, [icon('replay'), h('span', { text: 'Replay story' })]), nav);

// The story bar sticks right under the header (the header is sticky on wide screens only).
const topBar = document.querySelector('.top');
const setTopH = () => document.documentElement.style.setProperty('--top-h', `${getComputedStyle(topBar).position === 'sticky' ? topBar.offsetHeight : 0}px`);
window.addEventListener('resize', setTopH);
setTopH();

document.querySelector('.foot').append(' · ', h('button', { class: 'link', text: 'Reset demo', onclick: () => { resetTimeline(); stopStory(); resetDemo(); } }));

const [first, firstQuery] = location.hash.replace(/^#\/?/, '').split('?');
Object.assign(state, readHash());
subscribe(render);
setStoryListener(render);
window.addEventListener('hashchange', () => { if (story.on && !/^#\/?story/.test(location.hash)) stopStory(); const p = readHash(); if ((p.route && p.route !== 'today') || (p.personId && p.personId !== state.personId)) resetTimeline(); set({ system: null, ...p }); });
window.ccBooted = true;
// First visit opens the story; #/explore (or any other screen link) opens the app directly.
// #/story?step=4 opens a given step (for review links).
if (first === 'story' || ((first === '' || first === 'today') && !firstQuery)) startStory({ step: (Number(new URLSearchParams(firstQuery || '').get('step')) || 1) - 1 });
else render();

// Screens added in later steps register themselves.
const LATER = ['crew', 'checkin', 'trends', 'earth', 'sources'];
for (const id of LATER) {
  const load = (tries) => import(`./screens/${id}.js`).then((mod) => { registerScreen(id, mod.default); if (state.route === id) render(); })
    .catch(() => (tries > 0 ? new Promise((r) => setTimeout(r, 1500)).then(() => load(tries - 1)) : failed.add(id) && render()));
  load(2);
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
