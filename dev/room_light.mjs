// Освітлення кімнати в різний час доби (ранок, день, вечір, ніч). Знімок — /tmp/room_light.png
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path';
const DEV = new URL('.', import.meta.url).pathname.replace(/\/$/, ''), ROOT = DEV.replace(/\/dev$/, ''), MOCK = DEV + '/mock2';
const { SURVEY } = await import(ROOT + '/data.js');
const ans = (n, r) => Object.fromEntries(SURVEY.map((q) => [q.id, q.id === 'name' ? n : q.id === 'role' ? r : q.opts ? q.opts[0] : q.type === 'scale' ? '5' : 'x']));
const owned = ['sc_paper', 'sc_floor', 'sc_window', 'sc_fire', 'sc_chair', 'sc_shield', 'sc_rug', 'sc_shelf', 'pk_garland', 'cl_bed', 'cl_window'];
const seed = { users: { p: { nick: 'оля' }, me: { nick: 'богдан' } }, surveys: { p: { answers: ans('Оля', 'Вона'), done: true }, me: { answers: ans('Богдан', 'Він'), done: true } }, members: { me: {} }, points: { x1: { uid: 'me', amount: 9000, reason: 'x', week: '2026-11-02', date: '2026-11-03' } }, rewards: {}, quiz: {}, wordle: {}, challenges: {}, duels: {}, spend: {}, avatars: {}, art: {}, artimg: {}, live: {}, audio: {},
  rooms: { me: { owned, paper: 'sc_paper', flooring: 'sc_floor', view: 'hills', layout: [{ i: 'sc_window', x: 30 }, { i: 'cl_window', x: 250 }, { i: 'sc_shield', x: 150 }, { i: 'pk_garland', x: 120 }, { i: 'sc_rug', x: 160 }, { i: 'sc_fire', x: 4 }, { i: 'sc_chair', x: 300 }, { i: 'cl_bed', x: 170 }] } } };
const b = await chromium.launch(); const shots = [], errs = [];
for (const [lab, iso] of [['ранок', '2026-11-12T07:00:00+02:00'], ['день', '2026-11-12T12:00:00+02:00'], ['вечір', '2026-11-12T19:00:00+02:00'], ['ніч', '2026-11-12T23:30:00+02:00']]) {
  const pg = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.clock.setFixedTime(new Date(iso));
  await pg.addInitScript((s) => { window.__SEED = s; }, seed);
  await pg.route('**/*', (r) => { const u = r.request().url();
    if (u.includes('gstatic.com/firebasejs')) { const f = u.includes('auth') ? 'auth.js' : u.includes('firestore') ? 'fs.js' : 'app.js'; return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(MOCK + '/' + f) }); }
    if (u.startsWith('http://localhost:5555/')) { const p = new URL(u).pathname.slice(1) || 'index.html', fp = path.join(ROOT, p); if (!fs.existsSync(fp)) return r.fulfill({ status: 404 }); return r.fulfill({ contentType: p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : p.endsWith('.png') ? 'image/png' : 'text/html', body: fs.readFileSync(fp) }); }
    return r.abort(); });
  await pg.goto('http://localhost:5555/'); await pg.waitForSelector('#authForm');
  await pg.fill('#nick', 'богдан'); await pg.fill('#pass', '123456'); await pg.click('button[type=submit]');
  await pg.waitForSelector('.tiles'); await pg.locator('.tile', { hasText: 'Моя кімната' }).click(); await pg.waitForTimeout(1500);
  const f = `/tmp/rl_${shots.length}.png`; await pg.locator('.room-wrap').screenshot({ path: f }); shots.push([lab, f]); await pg.close();
}
await b.close();
console.log('SHOTS', JSON.stringify(shots)); console.log('ERRORS', errs.length ? errs : 'none');
