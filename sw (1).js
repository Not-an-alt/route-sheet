/* Route sheet — offline service worker
   Bump CACHE_V to force every client to refetch the shell. */
const CACHE_V = 'routesheet-v1';
const SHELL   = CACHE_V + '-shell';
const TILES   = CACHE_V + '-tiles';
const TILE_CAP = 1200;

const SHELL_URLS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    // add individually: one bad CDN response shouldn't fail the whole install
    await Promise.all(SHELL_URLS.map(u =>
      c.add(new Request(u, { cache: 'reload' })).catch(() => {})
    ));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !k.startsWith(CACHE_V)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function trimTiles() {
  const c = await caches.open(TILES);
  const keys = await c.keys();
  if (keys.length > TILE_CAP) {
    // FIFO: oldest inserted first
    await Promise.all(keys.slice(0, keys.length - TILE_CAP).map(k => c.delete(k)));
  }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isTile  = /tile\.openstreetmap\.org$/.test(url.hostname);
  const isFont  = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  const isCDN   = /cdnjs\.cloudflare\.com$/.test(url.hostname);
  const isDoc   = req.mode === 'navigate';

  if (isTile) {
    // cache-first, then network; tiles never change
    e.respondWith((async () => {
      const c = await caches.open(TILES);
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) { c.put(req, res.clone()); trimTiles(); }
        return res;
      } catch (err) {
        return new Response('', { status: 504, statusText: 'tile offline' });
      }
    })());
    return;
  }

  if (isDoc) {
    // network-first so a redeploy is picked up, cache as the offline fallback
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        const c = await caches.open(SHELL);
        c.put('./index.html', res.clone());
        return res;
      } catch (err) {
        const c = await caches.open(SHELL);
        return (await c.match('./index.html')) || (await c.match('./')) ||
               new Response('Offline and nothing cached yet.', { status: 503 });
      }
    })());
    return;
  }

  if (isFont || isCDN || url.origin === location.origin) {
    e.respondWith((async () => {
      const c = await caches.open(SHELL);
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      } catch (err) {
        return new Response('', { status: 504 });
      }
    })());
  }
});

/* Pre-warm tiles for a list of [lat, lon] at given zooms, driven from the page. */
self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.type !== 'PREFETCH_TILES') return;
  const { points, zooms } = d;
  e.waitUntil((async () => {
    const c = await caches.open(TILES);
    const urls = new Set();
    for (const [lat, lon] of points) {
      for (const z of zooms) {
        const n = Math.pow(2, z);
        const xc = Math.floor((lon + 180) / 360 * n);
        const la = lat * Math.PI / 180;
        const yc = Math.floor((1 - Math.log(Math.tan(la) + 1 / Math.cos(la)) / Math.PI) / 2 * n);
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const x = xc + dx, y = yc + dy;
            if (x < 0 || y < 0 || x >= n || y >= n) continue;
            urls.add(`https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`);
          }
        }
      }
    }
    const list = [...urls];
    let done = 0, failed = 0;
    // serial with a small gap — OSM's tile policy does not want a burst
    for (const u of list) {
      const req = new Request(u, { mode: 'cors' });
      if (!(await c.match(req))) {
        try {
          const res = await fetch(req);
          if (res.ok) await c.put(req, res.clone()); else failed++;
        } catch (err) { failed++; }
        await new Promise(r => setTimeout(r, 60));
      }
      done++;
      if (done % 25 === 0 || done === list.length) {
        const cs = await self.clients.matchAll();
        cs.forEach(cl => cl.postMessage({ type: 'PREFETCH_PROGRESS', done, total: list.length, failed }));
      }
    }
    await trimTiles();
  })());
});
