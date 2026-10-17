/* Service worker : garde la page, ses bibliothèques et ses polices pour travailler hors connexion.
   build.sh remplace __VERSION__ par une empreinte des fichiers publiés : à chaque publication, la nouvelle version
   s'installe en arrière-plan et la page propose « Mettre à jour ». */
const VERSION = '__VERSION__', CACHE = 'schema-plomberie-' + VERSION, POLICES = 'schema-plomberie-polices';
const FICHIERS = ['./', 'index.html', 'manifest.webmanifest', 'vendor/jspdf.umd.min.js', 'vendor/svg2pdf.umd.min.js', 'vendor/Arimo-Regular.ttf', 'vendor/Arimo-Bold.ttf',
  'icons/icone.svg', 'icons/icone-192.png', 'icons/icone-512.png', 'icons/icone-maskable-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS.map(u => new Request(u, { cache: 'reload' }))))); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.indexOf('schema-plomberie-') === 0 && k !== CACHE && k !== POLICES) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('message', e => { if (e.data === 'maj') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === self.location.origin) {
    if (r.mode === 'navigate') { e.respondWith(caches.match('index.html', { ignoreSearch: true }).then(c => c || fetch(r))); return; }
    e.respondWith(caches.match(r, { ignoreSearch: true }).then(c => c || fetch(r)));
    return;
  }
  /* Polices de l'interface (Google Fonts) : servies depuis le cache, rafraîchies quand le réseau répond */
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(POLICES).then(async c => {
      const hit = await c.match(r);
      const net = fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
