/* Bezpiecznik – praca jako aplikacja: sama strona (HTML, CSS, JS) działa także bez sieci.
   Zapytania do Cloudflare, rejestrów domen i list oszustów zawsze idą przez sieć, nigdy z pamięci. */
const WERSJA = 'bezpiecznik-3';
const PLIKI = ['./', './index.html', './css/style.css', './css/fonts/archivo-latin.woff2', './css/fonts/archivo-latin-ext.woff2',
  './js/dane.js', './js/analiza.js', './js/app.js', './manifest.webmanifest', './ikony/ikona-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(WERSJA).then((c) => c.addAll(PLIKI)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((n) => n.startsWith('bezpiecznik-') && n !== WERSJA).map((n) => caches.delete(n)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // najpierw sieć (świeża wersja), a bez sieci kopia; udostępnienie (?text=…) otwiera zwykłą stronę
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok && !u.search) { const kopia = r.clone(); caches.open(WERSJA).then((c) => c.put(e.request, kopia)); }
    return r;
  }).catch(() => caches.match(u.search ? './index.html' : e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))));
});
