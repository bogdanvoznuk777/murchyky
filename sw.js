// ===== Сервіс-воркер «Мурчиків»: миттєвий старт і робота без інтернету =====
// Файли гри лежать у кеші ВЕРСІЇ. Нова версія (інший VERSION) завантажується у фоні, стара видаляється.
// VERSION оновлює dev/sw_version.mjs (хеш усіх файлів) — запускати перед кожною публікацією.
const VERSION = 'murchyky-ed9fd742c5b6';
const EXT = 'murchyky-ext-v1'; // Firebase SDK (версія в адресі, не змінюється)
const CORE = ['./', 'index.html', 'styles.css', 'manifest.json', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png',
  'app.js', 'config.js', 'avatar.js', 'cat.js', 'data.js', 'duels.js', 'games.js', 'notify.js', 'room.js', 'roomitems.js', 'shop.js', 'trivia.js', 'util.js', 'workshop.js', 'fx.js'];
// Підвантажуються лише за потреби (3D-квест) — кешуються при першому відкритті
const LAZY = ['coop.js', 'coopnet.js', 'levels.js', 'box.js', 'lighthouse.js', 'garden.js', 'three-lite.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION && k !== EXT).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const scope = new URL(self.registration.scope);
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // файли гри
  if (url.origin === scope.origin && url.pathname.startsWith(scope.pathname)) {
    const file = url.pathname.slice(scope.pathname.length) || 'index.html';
    if (req.mode === 'navigate') return e.respondWith(caches.match('index.html', { cacheName: VERSION }).then((r) => r || fetch(req)));
    if (!CORE.includes(file) && !LAZY.includes(file)) return; // інше (наприклад, sw.js) — напряму з мережі
    return e.respondWith(caches.open(VERSION).then(async (c) => (await c.match(file)) || fetch(req).then((r) => { if (r.ok) c.put(file, r.clone()); return r; })));
  }
  // бібліотеки Firebase (адреса містить номер версії — вміст ніколи не змінюється)
  if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    return e.respondWith(caches.open(EXT).then(async (c) => (await c.match(req)) || fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; })));
  }
  // база даних, вхід, сповіщення, шрифти — без втручання
});
