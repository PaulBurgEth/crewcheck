import { h } from './ui.js';
import { state, set, subscribe, resetDemo } from './state.js';
import { renderToday, resetTimeline } from './screens/today.js';

const SCREENS = [
  { id: 'crew', label: 'Crew' },
  { id: 'today', label: 'Me' },
  { id: 'checkin', label: 'Check-in' },
  { id: 'trends', label: 'Trends' },
  { id: 'earth', label: 'Earth' },
  { id: 'sources', label: 'Sources' },
];
const renderers = { today: renderToday };
export function registerScreen(id, fn) { renderers[id] = fn; }

const app = document.getElementById('app');
const nav = h('nav', { class: 'tabs', 'aria-label': 'Screens' });
document.querySelector('.top').append(nav);

function readHash() {
  const [route, query] = location.hash.replace(/^#\/?/, '').split('?');
  const q = new URLSearchParams(query || '');
  const patch = {};
  if (route && SCREENS.some((s) => s.id === route)) patch.route = route;
  if (q.get('p') && state.crew.some((c) => c.id === q.get('p'))) patch.personId = q.get('p');
  const d = Number(q.get('d'));
  if (Number.isInteger(d) && d >= 1 && d <= 180) patch.day = d;
  return patch;
}

export function go(route, patch = {}) {
  if (route !== 'today' || (patch.personId && patch.personId !== state.personId)) resetTimeline();
  set({ ...patch, route, system: patch.system ?? null });
  history.replaceState(null, '', `#/${route}`);
  window.scrollTo(0, 0);
}

function render() {
  nav.replaceChildren(...SCREENS.map((s) => h('a', {
    href: `#/${s.id}`, class: s.id === state.route ? 'on' : '',
    onclick: (e) => { e.preventDefault(); go(s.id); },
  }, s.label)));
  const fn = renderers[state.route];
  const scrollY = window.scrollY;
  app.replaceChildren();
  if (fn) fn(app, { go });
  else app.append(h('p', { class: 'soon', text: 'Coming in the next build step.' }));
  window.scrollTo(0, scrollY);
}

document.querySelector('.foot').append(' · ', h('button', { class: 'link', text: 'Reset demo', onclick: () => { resetTimeline(); resetDemo(); } }));

Object.assign(state, readHash());
subscribe(render);
window.addEventListener('hashchange', () => { const p = readHash(); if ((p.route && p.route !== 'today') || (p.personId && p.personId !== state.personId)) resetTimeline(); set({ system: null, ...p }); });
render();

// Screens added in later steps register themselves.
const LATER = ['crew', 'checkin', 'trends'];
for (const id of LATER) {
  import(`./screens/${id}.js`).then((mod) => { registerScreen(id, mod.default); if (state.route === id) render(); }).catch(() => {});
}
