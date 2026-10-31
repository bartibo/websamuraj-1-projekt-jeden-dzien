/* =====================================================================
   Nurt – praca bez internetu
   Najpierw sieć (zawsze najnowsza wersja), a gdy jej nie ma, kopia
   z pamięci. Przy instalacji zapisuje od razu wszystkie pliki, także
   koder MP3, więc po pierwszej wizycie Nurt działa w samolocie.
   ===================================================================== */
'use strict';
const CACHE = 'nurt-v2';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/util.js', 'js/buffers.js', 'js/mix.js', 'js/arc.js', 'js/presets.js', 'js/noise.js', 'js/lofi.js',
  'js/cafe.js', 'js/nature.js', 'js/ambience.js', 'js/engine.js', 'js/export.js', 'js/visual.js', 'js/app.js',
  'js/vendor/lame.min.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];
const FONTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('nurt-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // czcionki się nie zmieniają: z pamięci, a pierwszy raz z sieci
  if (FONTS.test(req.url)) {
    ev.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    })));
    return;
  }
  if (url.origin !== location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  ev.respondWith(fetch(req).then(res => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
    }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true })
    .then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
