// Скільки документів гра читає при відкритті, якщо пара грає вже ~4 місяці. Також перевіряє, що бали/гаманець/ранг рахуються правильно.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path';
const DEV = new URL('.', import.meta.url).pathname.replace(/\/$/, ''), ROOT = process.argv[2] || DEV.replace(/\/dev$/, ''), MOCK = DEV + '/mock2';
const U = await import(ROOT + '/util.js'); const { SURVEY } = await import(ROOT + '/data.js');
const ans = (n, r) => Object.fromEntries(SURVEY.map((q) => [q.id, q.id === 'name' ? n : q.id === 'role' ? r : q.opts ? q.opts[0] : q.type === 'scale' ? '5' : 'x']));
const today = U.kyivDate(), D = U.dayNum(today);
const seed = { users: { p: { nick: 'оля' }, me: { nick: 'богдан' } }, surveys: { p: { answers: ans('Оля', 'Вона'), done: true }, me: { answers: ans('Богдан', 'Він'), done: true } }, members: { me: {} },
  points: {}, rewards: {}, quiz: {}, wordle: {}, challenges: {}, duels: {}, spend: {}, avatars: {}, art: {}, artimg: {}, live: {}, audio: {}, rooms: {} };
const thumb = 'data:image/jpeg;base64,' + 'A'.repeat(6000);
let sumMe = 0, sumP = 0, spentMe = 0;
for (let i = 120; i >= 0; i--) {
  const date = U.fromDayNum(D - i), wk = U.weekId(date);
  for (const uid of ['me', 'p']) {
    for (let k = 0; k < 14; k++) { const a = 3 + ((i * 7 + k) % 9); seed.points[`x_${date}_${uid}_${k}`] = { uid, amount: a, reason: 'x', date, week: wk, ts: 1 }; if (uid === 'me') sumMe += a; else sumP += a; }
    seed.quiz[`${date}_${uid}`] = { date, guesser: uid, about: uid === 'me' ? 'p' : 'me', qids: [], guesses: {}, results: {}, done: true, ts: 1 };
    seed.wordle[`${date}_${uid}`] = { date, uid, guesses: ['кіт'], solved: true, done: true, ts: 1 };
  }
  if (i % 2 === 0) seed.art[`memory_${i}`] = { type: 'memory', status: 'done', thumb, by: 'p', to: 'me', at: i, doneAt: i };
  if (i % 3 === 0) { seed.spend[`s_${i}`] = { uid: 'me', item: 'bow', price: 20, for: 'me', ts: 1, week: wk }; spentMe += 20; }
}
seed.art.active1 = { type: 'emoji', status: 'guess', by: 'p', to: 'me', at: Date.now(), emoji: '🐱', guesses: [] };
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errs.push(m.text()); });
await pg.addInitScript((s) => { const k = sessionStorage.getItem('st'); window.__SEED = k ? JSON.parse(k) : s; }, seed);
await pg.route('**/*', (r) => { const u = r.request().url();
  if (u.startsWith('https://ntfy.sh')) return r.fulfill({ status: 200, body: '{}' });
  if (u.includes('gstatic.com/firebasejs')) { const f = u.includes('auth') ? 'auth.js' : u.includes('firestore') ? 'fs.js' : 'app.js'; return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(MOCK + '/' + f) }); }
  if (u.startsWith('http://localhost:5555/')) { const p = new URL(u).pathname.slice(1) || 'index.html', fp = path.join(ROOT, p); if (!fs.existsSync(fp)) return r.fulfill({ status: 404 }); return r.fulfill({ contentType: p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : p.endsWith('.png') ? 'image/png' : 'text/html', body: fs.readFileSync(fp) }); }
  return r.abort(); });
const open = async () => { await pg.goto('http://localhost:5555/'); await pg.waitForSelector('#authForm'); await pg.evaluate(() => { window.__reads = 0; });
  await pg.fill('#nick', 'богдан'); await pg.fill('#pass', '123456'); await pg.click('button[type=submit]'); await pg.waitForSelector('.tiles'); await pg.waitForTimeout(1500); };
await open();
const r1 = await pg.evaluate(() => window.__reads);
const shown = await pg.evaluate(() => ({ shop: document.querySelector('.tile:nth-child(8) .ts')?.textContent, rank: document.querySelector('.rk')?.textContent }));
console.log('READS first open', r1, 'wallet tile', shown.shop, 'expected', sumMe - spentMe, 'rank', shown.rank);
await pg.evaluate(() => sessionStorage.setItem('st', JSON.stringify(window.__store))); await pg.reload(); await pg.evaluate(() => { window.__reads = 0; });
await pg.waitForSelector('#authForm'); await pg.fill('#nick', 'богдан'); await pg.fill('#pass', '123456'); await pg.click('button[type=submit]'); await pg.waitForSelector('.tiles'); await pg.waitForTimeout(1500);
const s2 = await pg.evaluate(() => ({ r: window.__reads, shop: [...document.querySelectorAll('.tile')].find((t) => t.textContent.includes('Магазин'))?.querySelector('.ts')?.textContent }));
const rk = await pg.evaluate(async () => { document.querySelector('[data-to="ranks"]').click(); await new Promise((r) => setTimeout(r, 400)); return document.getElementById('app').innerText.replace(/\s+/g, ' '); });
fs.writeFileSync(process.env.RANKS_OUT || '/tmp/ranks_new.txt', rk);
console.log('READS next open', s2.r, 'wallet', s2.shop, 'expected', sumMe - spentMe);
// малюнок, який щойно завершили, лишається на екрані (дочитується 1 документ)
await pg.evaluate(() => { const b = document.createElement('button'); b.dataset.a = 'artOpen'; b.dataset.id = 'active1'; document.getElementById('app').appendChild(b); b.click(); });
await pg.waitForTimeout(300);
await pg.evaluate(() => { const d = window.__store.art.active1; d.status = 'done'; d.result = 2; d.doneAt = Date.now(); d.answer = 'кіт'; window.__fire(); });
await pg.waitForTimeout(800);
console.log('FINISHED SHOWN', await pg.evaluate(() => document.body.innerText.includes('Відповідь') && !document.body.innerText.includes('Не знайдено')));
// альбом і завершений малюнок: дочитуються лише на вимогу
await pg.evaluate(() => { window.__reads = 0; const b = document.createElement('button'); b.dataset.a = 'go'; b.dataset.to = 'album'; document.getElementById('app').appendChild(b); b.click(); });
await pg.waitForTimeout(600);
const alb = await pg.evaluate(() => ({ n: document.querySelectorAll('.alb-it').length, r: window.__reads }));
console.log('ALBUM items', alb.n, 'reads', alb.r);
await pg.evaluate(() => document.querySelector('.alb-it img').closest('.alb-it').click()); await pg.waitForTimeout(400);
console.log('ART DETAIL', await pg.evaluate(() => !!document.querySelector('#artImg') && !document.body.innerText.includes('Завантаження')));
console.log('ERRORS', errs.length ? errs : 'none'); await b.close();
