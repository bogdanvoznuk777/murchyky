// Сервіс-воркер: кешує файли гри, гра відкривається без інтернету, нова версія підхоплюється
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path'; import http from 'http';
const DEV = new URL('.', import.meta.url).pathname.replace(/\/$/, ''), ROOT = DEV.replace(/\/dev$/, ''), MOCK = DEV + '/mock2';
const { SURVEY } = await import(ROOT + '/data.js');
const ans = (n, r) => Object.fromEntries(SURVEY.map((q) => [q.id, q.id === 'name' ? n : q.id === 'role' ? r : q.opts ? q.opts[0] : q.type === 'scale' ? '5' : 'x']));
const seed = { users: { p: { nick: 'оля' }, me: { nick: 'богдан' } }, surveys: { p: { answers: ans('Оля', 'Вона'), done: true }, me: { answers: ans('Богдан', 'Він'), done: true } }, members: { me: {} }, points: {}, rewards: {}, quiz: {}, wordle: {}, challenges: {}, duels: {}, spend: {}, avatars: {}, art: {}, artimg: {}, live: {}, audio: {}, rooms: {} };
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const pg = await ctx.newPage(); await pg.addInitScript((s) => { window.__SEED = s; }, seed);
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED') && !m.text().includes('ERR_INTERNET_DISCONNECTED')) errs.push(m.text()); });
let offline = false, swBody = fs.readFileSync(ROOT + '/sw.js', 'utf8'); const hits = [];
// справжній локальний сервер (фонові запити сервіс-воркера Playwright не перехоплює)
const srv = http.createServer((q, s) => { const p = decodeURIComponent(new URL(q.url, 'http://x').pathname.slice(1)) || 'index.html'; hits.push(p);
  if (offline) { s.destroy(); return; }
  if (p === 'sw.js') { s.writeHead(200, { 'content-type': 'text/javascript', 'cache-control': 'no-cache' }); return s.end(swBody); }
  const fp = path.join(ROOT, p); if (!fs.existsSync(fp)) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : p.endsWith('.png') ? 'image/png' : p.endsWith('.json') ? 'application/json' : 'text/html' }); s.end(fs.readFileSync(fp)); });
await new Promise((r) => srv.listen(5555, r));
await ctx.route('**/*', (r) => { const u = r.request().url();
  if (u.startsWith('http://localhost:5555/')) return r.continue();
  if (offline && u.includes('gstatic.com')) return r.abort('internetdisconnected');
  if (u.includes('gstatic.com/firebasejs')) { hits.push(u); const f = u.includes('auth') ? 'auth.js' : u.includes('firestore') ? 'fs.js' : 'app.js'; return r.fulfill({ contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(MOCK + '/' + f) }); }
  return r.abort(); });
let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
await pg.goto('http://localhost:5555/?sw=1'); await pg.waitForSelector('#authForm');
await pg.evaluate(() => navigator.serviceWorker.ready); await pg.waitForTimeout(500);
const keys = await pg.evaluate(async () => { const ks = await caches.keys(); const out = {}; for (const k of ks) out[k] = (await (await caches.open(k)).keys()).map((r) => new URL(r.url).pathname.split('/').pop()); return out; });
const v = swBody.match(/const VERSION = '([^']+)'/)[1];
ok(keys[v] && keys[v].includes('app.js') && keys[v].includes('room.js') && keys[v].length >= 20, `кеш версії ${v}: ${keys[v]?.length} файлів`);
await pg.reload(); await pg.waitForSelector('#authForm');
ok(await pg.evaluate(() => !!navigator.serviceWorker.controller), 'сторінкою керує сервіс-воркер');
// без інтернету
offline = true; hits.length = 0;
const t0 = Date.now(); await pg.reload(); await pg.waitForSelector('#authForm', { timeout: 8000 }).catch(() => {});
ok(await pg.locator('#authForm').count() === 1, `без інтернету гра відкривається (${Date.now() - t0} мс)`);
ok(await pg.evaluate(() => document.styleSheets.length > 0 && getComputedStyle(document.body).backgroundImage !== 'none'), 'стилі з кешу');
await pg.fill('#nick', 'богдан'); await pg.fill('#pass', '123456'); await pg.click('button[type=submit]');
ok(await pg.waitForSelector('.tiles', { timeout: 8000 }).then(() => true).catch(() => false), 'без інтернету головна відкривається (дані з кешу)');
// нова версія: інший sw.js → підхоплюється, старий кеш видаляється, перезавантаження лише на безпечному екрані
offline = false; swBody = swBody.replace(v, 'murchyky-test-new'); hits.length = 0;
for (let i = 0; i < 3; i++) { const r = await pg.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.update()).then(() => 'ok', (e) => String(e))); if (r === 'ok') break; console.log('update retry', r); await pg.waitForTimeout(700); }
await pg.waitForTimeout(2500);
console.log('HITS', hits.filter((h) => h.includes('sw')));
const ks2 = await pg.evaluate(() => caches.keys());
ok(ks2.includes('murchyky-test-new') && !ks2.includes(v), `оновлення: кеші ${ks2.join(', ')}`);
console.log('FAILS', fails); console.log('ERRORS', errs.length ? errs : 'none');
srv.close(); await b.close(); process.exit(fails || errs.length ? 1 : 0);
