// Offline support: the whole app is cached so it opens again without any network.
// Bump VERSION on every release so judges never get a stale copy.
const VERSION = 'crewcheck-v34';
const FILES = [
  './',
  './css/app.css',
  './css/blocks.css',
  './css/cabin.css',
  './css/checkin.css',
  './css/earth.css',
  './css/sources.css',
  './css/trends.css',
  './css/v2.css',
  './css/story.css',
  './css/viz.css',
  './favicon.svg',
  './index.html',
  './js/app.js',
  './js/data/advisor-precomputed.js',
  './js/data/explain.js',
  './js/data/missions.js',
  './js/data/cabin.js',
  './js/data/rules.js',
  './js/data/sources.js',
  './js/demo/cabin.js',
  './js/demo/generator.js',
  './js/demo/passport.js',
  './js/demo/rng.js',
  './js/engine/advisor.js',
  './js/engine/agent.js',
  './js/engine/cabin.js',
  './js/engine/downlink.js',
  './js/engine/escalation.js',
  './js/engine/evaluate.js',
  './js/engine/followup.js',
  './js/engine/forecast.js',
  './js/engine/radiation.js',
  './js/engine/score.js',
  './js/engine/validate.js',
  './js/screens/advisor-live.js',
  './js/screens/case-card.js',
  './js/screens/checkin.js',
  './js/screens/crew.js',
  './js/screens/earth.js',
  './js/screens/instruments.js',
  './js/screens/radiation-card.js',
  './js/screens/sources.js',
  './js/screens/suit.js',
  './js/screens/story.js',
  './js/screens/today.js',
  './js/screens/verdict.js',
  './js/screens/trends.js',
  './js/screens/why.js',
  './js/sensor/stream.js',
  './js/state.js',
  './js/myday.js',
  './js/ui.js',
  './js/viz/badges.js',
  './js/viz/body.js',
  './js/viz/icons.js',
  './js/viz/live.js',
  './js/viz/nodes.js',
  './js/viz/rings.js',
  './js/viz/scene.js',
  './js/viz/signal.js',
  './js/viz/svg.js',
  './js/viz/timeline.js',
  './vendor/chart.umd.js',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first, cache as fallback: online visitors always get the latest version.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))),
  );
});
