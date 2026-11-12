// Живий інтерфейс: перехід між екранами, сцена перемоги в сезоні, сцена нового рангу, конфеті за перемогу в дуелі
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path';
const DEV = new URL('.', import.meta.url).pathname.replace(/\/$/, ''), ROOT = DEV.replace(/\/dev$/, ''), MOCK = DEV + '/mock2';
const U = await import(ROOT + '/util.js'); const { SURVEY } = await import(ROOT + '/data.js');
const ans = (n, r) => Object.fromEntries(SURVEY.map((q) => [q.id, q.id === 'name' ? n : q.id === 'role' ? r : q.opts ? q.opts[0] : q.type === 'scale' ? '5' : 'x']));
const today = U.kyivDate(), cur = U.weekId(today), prev = U.fromDayNum(U.dayNum(cur) - 7);
const seed = { users: { p: { nick: 'оля' }, me: { nick: 'богдан' } }, surveys: { p: { answers: ans('Оля', 'Вона'), done: true }, me: { answers: ans('Богдан', 'Він'), done: true } }, members: { me: {} },
  points: { a: { uid: 'me', amount: 150, reason: 'x', week: prev, date: prev }, b: { uid: 'p', amount: 90, reason: 'x', week: prev, date: prev }, c: { uid: 'me', amount: 30, reason: 'x', week: cur, date: today } },
  rewards: { [prev]: { text: 'Сніданок у ліжко', by: 'p' } }, quiz: {}, wordle: {}, challenges: {}, duels: {}, spend: {}, avatars: {}, art: {}, artimg: {}, live: {}, audio: {}, rooms: {} };
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errs.push(m.text()); });
await pg.addInitScript((s) => { window.__SEED = s; }, seed);
await pg.route('**/*', (r) => { const u = r.request().url();
  if (u.startsWith('https://ntfy.sh')) return r.fulfill({ status: 200, body: '{}' });
  if (u.includes('gstatic.com/firebasejs')) { const f = u.includes('auth') ? 'auth.js' : u.includes('firestore') ? 'fs.js' : 'app.js'; return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(MOCK + '/' + f) }); }
  if (u.startsWith('http://localhost:5555/')) { const p = new URL(u).pathname.slice(1) || 'index.html', fp = path.join(ROOT, p); if (!fs.existsSync(fp)) return r.fulfill({ status: 404 }); return r.fulfill({ contentType: p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : p.endsWith('.png') ? 'image/png' : 'text/html', body: fs.readFileSync(fp) }); }
  return r.abort(); });
let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
await pg.goto('http://localhost:5555/?fx=1'); await pg.waitForSelector('#authForm');
await pg.fill('#nick', 'богдан'); await pg.fill('#pass', '123456'); await pg.click('button[type=submit]'); await pg.waitForSelector('.tiles');
await pg.waitForSelector('.fx-scene', { timeout: 4000 }).catch(() => {});
const t1 = await pg.locator('.fx-scene').innerText().catch(() => '');
ok(t1.includes('Перемога в сезоні') && t1.includes('Сніданок у ліжко') && t1.includes('150 : 90'), 'сцена перемоги в минулому сезоні з нагородою');
ok(await pg.locator('.fx-conf i').count() > 30, 'конфеті');
await pg.screenshot({ path: '/tmp/fx_season.png' });
await pg.locator('.fx-scene button').click(); await pg.waitForTimeout(400);
ok(await pg.locator('.fx-scene').count() === 0, 'сцена закривається');
// повторне відкриття — та сама перемога вдруге не показується
await pg.evaluate(() => window.__fire()); await pg.waitForTimeout(400);
ok(await pg.locator('.fx-scene').count() === 0, 'перемога показується лише раз');
// новий ранг: 180 → 230 (Муркотун з 200)
await pg.evaluate(() => { window.__store.points.d = { uid: 'me', amount: 50, reason: 'x', week: Object.values(window.__store.points).find((p) => p.date && p.amount === 30).week, date: 'x' }; window.__fire(); });
await pg.waitForSelector('.fx-scene', { timeout: 3000 }).catch(() => {});
const t2 = await pg.locator('.fx-scene').innerText().catch(() => '');
ok(t2.includes('Новий ранг') && t2.includes('Муркотун'), 'сцена нового рангу');
await pg.waitForTimeout(900); await pg.screenshot({ path: '/tmp/fx_rank.png' });
await pg.locator('.fx-scene button').click(); await pg.waitForTimeout(400);
// перехід між екранами: клас анімації лише під час зміни екрана
await pg.locator('.tile', { hasText: 'Магазин' }).click(); await pg.waitForTimeout(50);
const during = await pg.evaluate(() => document.getElementById('app').classList.contains('vt'));
await pg.waitForTimeout(400);
const after = await pg.evaluate(() => document.getElementById('app').classList.contains('vt'));
await pg.evaluate(() => window.__fire()); await pg.waitForTimeout(100);
const refresh = await pg.evaluate(() => document.getElementById('app').classList.contains('vt'));
ok(during && !after && !refresh, 'анімація переходу лише при зміні екрана, не при оновленні даних');
// конфеті за перемогу в дуелі: маркер у результаті
await pg.waitForTimeout(3600); const n0 = await pg.locator('.fx-conf i').count();
await pg.evaluate(() => { const i = document.createElement('div'); i.className = 'page'; i.innerHTML = '<i data-celebrate="duel_test1" hidden></i>'; document.getElementById('app').replaceChildren(i); });
await pg.waitForTimeout(100); const n1 = await pg.locator('.fx-conf i').count();
await pg.evaluate(() => { const i = document.createElement('div'); i.className = 'page'; i.innerHTML = '<i data-celebrate="duel_test1" hidden></i>'; document.getElementById('app').replaceChildren(i); });
await pg.waitForTimeout(100); const n2 = await pg.locator('.fx-conf i').count();
ok(n1 > n0 && n2 === n1, `конфеті за перемогу — один раз (${n0} → ${n1} → ${n2})`);
await pg.waitForTimeout(3600); ok(await pg.locator('.fx-conf i').count() === 0, 'конфеті прибирається');
console.log('FAILS', fails); console.log('ERRORS', errs.length ? errs : 'none'); await b.close(); process.exit(fails || errs.length ? 1 : 0);
