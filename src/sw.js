/**
 * Service Worker für LexiScène.
 *
 * Ohne externe Bibliothek: Die Liste der auszuliefernden Dateien wird beim
 * Produktionsbuild eingesetzt (siehe vite.config.ts). Nach der Installation ist
 * die App vollständig offline nutzbar. Es werden ausschließlich Anfragen an die
 * eigene Herkunft behandelt; es findet kein Zugriff auf fremde Server statt.
 */
const CACHE_NAME = 'lexiscene-v0.2.0';
const SHELL = __PRECACHE_ASSETS__;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        // Einzeln ablegen: Eine fehlende Datei darf die Installation nicht scheitern lassen.
        Promise.allSettled(SHELL.map((path) => cache.add(new Request(path, { cache: 'reload' })))),
      )
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

// „ignoreVary“ ist wichtig: Manche Server senden „Vary: Origin“, wodurch ein
// sonst passender Treffer im Cache verworfen würde.
const MATCH_OPTIONS = { ignoreVary: true };

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put('./index.html', response.clone());
    return response;
  } catch {
    const fallback = (await cache.match('./index.html', MATCH_OPTIONS)) ?? (await cache.match('./', MATCH_OPTIONS));
    return (
      fallback ??
      new Response('<!doctype html><meta charset="utf-8"><p>LexiScène ist offline noch nicht vollständig verfügbar. Bitte einmal mit Verbindung laden.</p>', {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    );
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, MATCH_OPTIONS);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === 'basic') cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(cacheFirst(request));
});
