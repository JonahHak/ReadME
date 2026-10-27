// Cache the app shell + offline data so the app opens with no signal. API calls always go to the network.
const CACHE = 'apex-v1';
const SHELL = ['/', '/app.css', '/app.js', '/partial-json.js', '/icon.svg', '/manifest.webmanifest',
  '/data/exercises.json', '/data/tips.json', '/data/fightlab.json', '/data/systems.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  // Network first so updates land immediately; cache as the fallback.
  e.respondWith(fetch(e.request).then(res => {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match(e.request).then(r => r || caches.match('/'))));
});
