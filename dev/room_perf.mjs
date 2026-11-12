// Швидкодія: кадри/с на головній і в кімнаті з багатьма речами, процесор сповільнено ×4 (як слабкий телефон)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path';
const DEV = new URL('.', import.meta.url).pathname.replace(/\/$/, ''), ROOT = process.argv[2] || DEV.replace(/\/dev$/, ''), MOCK = DEV + '/mock2';
const { SURVEY } = await import(ROOT + '/data.js');
const ans = (n, r) => Object.fromEntries(SURVEY.map((q) => [q.id, q.id === 'name' ? n : q.id === 'role' ? r : q.opts ? q.opts[0] : q.type === 'scale' ? '5' : 'x']));
const R = fs.existsSync(ROOT + '/roomitems.js') ? await import(ROOT + '/roomitems.js') : null;
const all = R ? Object.keys(R.RITEMS).filter((i) => R.RITEMS[i].price > 0) : [];
const layout = R ? ['ro_window', 'ro_chand', 'ro_frame', 'st_planets', 'pk_garland', 'sc_fire', 'ro_canopy', 'ro_throne', 'st_rocket', 'st_scope', 'ro_rug', 'pk_toys', 'cl_bowl'].map((i, n) => ({ i, x: (n * 47) % 480 })) : [];
const seed = { users: { p: { nick: 'оля' }, me: { nick: 'богдан' } }, surveys: { p: { answers: ans('Оля', 'Вона'), done: true }, me: { answers: ans('Богдан', 'Він'), done: true } }, members: { me: {} }, points: { x1: { uid: 'me', amount: 40000, reason: 'x', week: '2026-11-02', date: '2026-11-03' } }, rewards: {}, quiz: {}, wordle: {}, challenges: {}, duels: {}, spend: {}, avatars: {}, art: {}, artimg: {}, live: {}, audio: {},
  rooms: { me: { owned: all, paper: 'ro_paper', flooring: 'ro_floor', view: 'space', layout } } };
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const cdp = await pg.context().newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await pg.clock.setFixedTime(new Date('2026-11-12T23:00:00+02:00'));
await pg.addInitScript((s) => { window.__SEED = s; }, seed);
await pg.route('**/*', (r) => { const u = r.request().url();
  if (u.includes('gstatic.com/firebasejs')) { const f = u.includes('auth') ? 'auth.js' : u.includes('firestore') ? 'fs.js' : 'app.js'; return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(MOCK + '/' + f) }); }
  if (u.startsWith('http://localhost:5555/')) { const p = new URL(u).pathname.slice(1) || 'index.html', fp = path.join(ROOT, p); if (!fs.existsSync(fp)) return r.fulfill({ status: 404 }); return r.fulfill({ contentType: p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : p.endsWith('.png') ? 'image/png' : 'text/html', body: fs.readFileSync(fp) }); }
  return r.abort(); });
await pg.goto('http://localhost:5555/'); await pg.waitForSelector('#authForm');
await pg.fill('#nick', 'богдан'); await pg.fill('#pass', '123456'); await pg.click('button[type=submit]'); await pg.waitForSelector('.tiles'); await pg.waitForTimeout(1500);
const fps = () => pg.evaluate(() => new Promise((res) => { let n = 0, worst = 0, last = performance.now(); const t0 = last; const f = (t) => { n++; worst = Math.max(worst, t - last); last = t; if (t - t0 < 5000) requestAnimationFrame(f); else res({ fps: +(n / ((t - t0) / 1000)).toFixed(1), worstMs: Math.round(worst) }); }; requestAnimationFrame(f); }));
console.log('home', JSON.stringify(await fps()));
if (R) { await pg.locator('.tile', { hasText: 'Моя кімната' }).click(); await pg.waitForTimeout(1500); console.log('room', JSON.stringify(await fps()), 'nodes', await pg.evaluate(() => document.querySelectorAll('#room *').length));
  const t = await pg.evaluate(async () => { const t0 = performance.now(); for (let i = 0; i < 5; i++) window.__fire(); await new Promise((r) => setTimeout(r, 50)); return 0; }); }
await b.close();
