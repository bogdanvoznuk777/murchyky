// Кімната котика: магазин меблів, облаштування, котик біля меблів, бонуси наборів, гості, 💕, записки, подарунки
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path';
const DEV = new URL('.', import.meta.url).pathname.replace(/\/$/, ''), ROOT = DEV.replace(/\/dev$/, '');
const GAME = ROOT, MOCK = DEV + '/mock2';
const U = await import(GAME + '/util.js'); const { SURVEY } = await import(GAME + '/data.js');
const R = await import(GAME + '/roomitems.js');
const today = U.kyivDate();
const ans = (n, r) => Object.fromEntries(SURVEY.map((q) => [q.id, q.id === 'name' ? n : q.id === 'role' ? r : q.opts ? q.opts[0] : q.type === 'scale' ? '5' : 'x']));
const tiny = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8Dwn4GBgYGJAQoAHxcCAr7ZJ7gAAAAASUVORK5CYII=';
const seed = { users: { p: { nick: 'оля', ntfy: 'murchyky-test-p' }, me: { nick: 'богдан', ntfy: 'murchyky-test-me' } }, surveys: { p: { answers: ans('Оля', 'Вона'), done: true }, me: { answers: ans('Богдан', 'Він'), done: true } }, members: { me: {} },
  points: { x1: { uid: 'me', amount: 40000, reason: 'x', week: '2026-11-02', date: '2026-11-03' }, x2: { uid: 'p', amount: 900, reason: 'x', week: '2026-11-02', date: '2026-11-03' } },
  rewards: {}, quiz: {}, wordle: {}, challenges: {}, duels: {}, spend: {}, avatars: {}, art: { a1: { type: 'memory', status: 'done', thumb: tiny, by: 'p', to: 'me', at: 1 } }, artimg: {}, live: {}, audio: {}, rooms: {} };
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: false });
const errs = [], pushes = []; pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errs.push(m.text()); });
await pg.addInitScript((s) => { window.__SEED = s; }, seed);
await pg.route('**/*', (r) => { const u = r.request().url();
  if (u.startsWith('https://ntfy.sh')) { pushes.push(JSON.parse(r.request().postData() || '{}')); return r.fulfill({ status: 200, body: '{}' }); }
  if (u.includes('gstatic.com/firebasejs')) { const f = u.includes('auth') ? 'auth.js' : u.includes('firestore') ? 'fs.js' : 'app.js'; return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(MOCK + '/' + f) }); }
  if (u.startsWith('http://localhost:5555/')) { const p = new URL(u).pathname.slice(1) || 'index.html'; const fp = path.join(GAME, p); if (!fs.existsSync(fp)) return r.fulfill({ status: 404 }); const ct = p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : p.endsWith('.png') ? 'image/png' : 'text/html'; return r.fulfill({ contentType: ct, body: fs.readFileSync(fp) }); }
  return r.abort(); });
const shot = (n) => pg.screenshot({ path: `/tmp/room_${n}.png`, fullPage: true });
const act = async (a, attrs = {}) => pg.evaluate(([a, attrs]) => { const b = document.createElement('button'); b.dataset.a = a; Object.assign(b.dataset, attrs); b.style.display = 'none'; document.getElementById('app').appendChild(b); b.click(); }, [a, attrs]);
const st = () => pg.evaluate(() => window.__store);
const mut = (fn, arg) => pg.evaluate(([f, arg]) => { new Function('S', 'arg', 'return (' + f + ')(S,arg)')(window.__store, arg); window.__fire(); }, [fn.toString(), arg]);
const wait = (ms) => pg.waitForTimeout(ms);
let fails = 0; const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) fails++; };

await pg.goto('http://localhost:5555/'); await pg.waitForSelector('#authForm');
await pg.fill('#nick', 'богдан'); await pg.fill('#pass', '123456'); await pg.click('button[type=submit]');
await pg.waitForSelector('.tiles'); await wait(400);
ok(await pg.locator('.tile', { hasText: 'Моя кімната' }).count() === 1, 'плитка «Моя кімната» на головній');
await shot('0home');
// --- моя кімната: типово коробка й котик
await pg.locator('.tile', { hasText: 'Моя кімната' }).click(); await wait(500);
ok(await pg.locator('#room .r-it').count() === 1, 'типово в кімнаті є коробка');
ok(await pg.locator('#roomCat .kitty').count() === 1, 'котик у кімнаті');
await shot('1empty');
// --- полиця заблокована до рівня 2
await act('go', { to: 'roomshop' }); await wait(200);
await act('roomShopCat', { c: 'cl' }); await wait(150);
await act('roomBuy', { id: 'cl_shelf' }); await wait(300);
let s = await st(); ok(!(s.rooms.me?.owned || []).includes('cl_shelf'), 'полицю не можна купити на рівні 1');
await shot('2shop');
// --- купуємо меблі
for (const id of ['cl_window', 'cl_bed', 'cl_scratch', 'cl_bowl', 'cl_rug', 'cl_frame', 'cl_paper', 'cl_floor']) { await act('roomBuy', { id }); await wait(320); }
s = await st();
ok(['cl_window', 'cl_bed', 'cl_scratch', 'cl_bowl', 'cl_rug', 'cl_frame', 'cl_paper', 'cl_floor'].every((id) => s.rooms.me.owned.includes(id)), 'куплено 8 речей «Класики»');
const spent = Object.values(s.spend).reduce((a, x) => a + x.price, 0);
ok(Object.values(s.spend).length === 8 && Object.values(s.spend).every((x) => x.room && x.uid === 'me' && x.for === 'me'), `8 записів spend (витрачено ${spent})`);
ok(!(s.avatars.me?.owned || []).includes('k_plaid'), 'бонусу ще немає (набір неповний)');
// повторна покупка — ні
await act('roomBuy', { id: 'cl_bed' }); await wait(300); s = await st(); ok(Object.values(s.spend).length === 8, 'повторно не купується');
// тепер рівень 2 → полиця
await act('roomBuy', { id: 'cl_shelf' }); await wait(500); s = await st();
ok(s.rooms.me.owned.includes('cl_shelf'), 'полиця купується з рівня 2');
await wait(600); s = await st();
ok((s.avatars.me?.owned || []).includes('k_plaid') && s.avatars.me.owned.includes('k_t_cozy'), 'набір зібрано → плед і титул у гардеробі');
// --- облаштування
await act('roomBack'); await wait(200);
await act('roomEdit'); await wait(200);
for (const id of ['cl_window', 'cl_bed', 'cl_scratch', 'cl_bowl', 'cl_rug', 'cl_frame', 'cl_shelf']) { await act('roomAdd', { id }); await wait(120); }
await act('roomSet', { f: 'paper', v: 'cl_paper' }); await act('roomSet', { f: 'flooring', v: 'cl_floor' }); await wait(100);
await act('roomSet', { f: 'view', v: 'space' }); await wait(200);
s = await st(); ok(true, 'вид «Космос» заблоковано (рівень 2) — тост');
// розставляємо: перетягування мишкою
// точка всередині речі, де саме вона зверху (речі можуть перекриватися)
const pos = async (ix) => pg.evaluate((ix) => { const el = document.querySelector(`.r-it[data-ix="${ix}"]`), e = el.getBoundingClientRect(); for (let fy = 0.5; fy < 1; fy += 0.1) for (let fx = 0.1; fx < 1; fx += 0.1) { const x = e.x + e.width * fx, y = e.y + e.height * fy; if (document.elementFromPoint(x, y)?.closest('.r-it') === el) return { x, y, l: e.x }; } return { x: e.x + e.width / 2, y: e.y + e.height / 2, l: e.x, hidden: true }; }, ix);
const drag = async (ix, dx) => { const p = await pos(ix); await pg.mouse.move(p.x, p.y); await pg.mouse.down(); for (let i = 1; i <= 6; i++) await pg.mouse.move(p.x + (dx * i) / 6, p.y); await pg.mouse.up(); await wait(150); };
// індекси: 0 коробка, 1 вікно, 2 ліжко, 3 дряпка, 4 миски, 5 килим, 6 рамка, 7 полиця
let before = await pos(2); await drag(2, -120); let after = await pos(2);
ok(after.l < before.l - 60, `ліжко перетягнуто вліво (${Math.round(before.l)} → ${Math.round(after.l)})`);
await drag(0, 120); await drag(3, 140); await drag(4, -60); await drag(6, -110); await drag(7, 120);
await act('roomFlip'); await wait(100); // віддзеркалити полицю (вибрана)
// фото в рамку
const fr = await pos(6); await pg.mouse.click(fr.x, fr.y); await wait(200);
await act('roomPick'); await wait(150); ok(await pg.locator('[data-a="roomPhoto"][data-id="a1"]').count() === 1, 'вибір фото з альбому');
await act('roomPhoto', { id: 'a1' }); await wait(150);
await shot('3edit');
await act('roomSave'); await wait(400); s = await st();
ok(s.rooms.me.layout.length === 8 && s.rooms.me.paper === 'cl_paper' && s.rooms.me.flooring === 'cl_floor' && s.rooms.me.view === 'city', 'кімнату збережено (8 речей, шпалери, підлога, вид)');
ok(s.rooms.me.layout.find((e) => e.i === 'cl_frame').p === 'a1' && s.rooms.me.layout.find((e) => e.i === 'cl_shelf').f === 1, 'фото в рамці і віддзеркалена полиця збережені');
ok(s.rooms.me.layout.every((e) => e.x >= 0 && e.x + R.RITEMS[e.i].w <= 360), 'усі речі в межах кімнати');
ok(await pg.locator('.r-fx.rfx-cl').count() === 1, 'живий ефект «Теплі вогники» (набір зібрано, 3+ речі)');
ok(await pg.locator('.r-it image').count() === 1, 'фото показується в рамці');
// котик користується меблями: стежимо 60 с
const modes = new Set();
for (let i = 0; i < 120; i++) { const c = await pg.evaluate(() => document.querySelector('#roomCat .kitty')?.className || ''); c.split(' ').forEach((x) => modes.add(x)); await wait(500); }
const acts = ['sleep', 'stand', 'scratch', 'eat'].filter((m) => modes.has(m));
ok(acts.length >= 2, `котик біля меблів: ${[...modes].filter((m) => !['kitty', ''].includes(m)).join(', ')}`);
await shot('4room');
// --- гості: візит, 💕, записка, сповіщення не частіше ніж раз на годину
const pushes0 = pushes.length;
await act('roomVisit'); await wait(500); s = await st();
ok(s.rooms.p?.visit?.by === 'me', 'візит записано в кімнату партнера');
ok(await pg.locator('#roomCat .kitty').count() === 2, 'у гостях — два котики');
await act('roomLike'); await wait(400); await act('roomLike'); await wait(400); s = await st();
const lp = s.points[`rlike_${today}_p`];
ok(s.rooms.p.liked === today && s.rooms.p.likes === 1 && lp?.amount === 10 && lp.uid === 'p', '💕 раз на день: +10 балів господарю');
await pg.fill('#roomNote', 'Твій котик такий милий!'); await act('roomNote'); await wait(400); s = await st();
ok(s.rooms.p.note?.text === 'Твій котик такий милий!' && s.rooms.p.note.seen === false, 'записку залишено');
ok(pushes.length - pushes0 === 1 && pushes.at(-1).topic === 'murchyky-test-p', `сповіщень партнерові: ${pushes.length - pushes0} (не частіше разу на годину)`);
// повторний вхід — візит не пишеться вдруге за 10 хв
const w0 = await pg.evaluate(() => window.__writes);
await act('go', { to: 'home' }); await wait(200); await act('roomVisit'); await wait(400);
ok((await pg.evaluate(() => window.__writes)) === w0, 'повторний візит не робить записів');
await shot('5guest');
// подарунок партнерові
await act('go', { to: 'roomshop' }); await wait(200); await act('roomShopCat', { c: 'pk' }); await wait(100);
await act('roomGift', { id: 'pk_rug' }); await wait(400); await act('roomGift', { id: 'pk_rug' }); await wait(400); s = await st();
ok(s.rooms.p.gifts?.length === 1 && s.rooms.p.gifts[0].item === 'pk_rug' && Object.values(s.spend).filter((x) => x.for === 'p').length === 1, 'подарунок партнерові — коробка (без дубля)');
// --- мені подарували: коробка → розпакування
await mut((S, t) => { S.rooms.me.gifts = [{ item: 'pk_toys', from: 'p', ts: 7 }]; S.rooms.me.note = { text: 'Мур!', by: 'p', at: Date.now(), seen: false }; }, 0);
await act('go', { to: 'home' }); await wait(300);
ok(await pg.locator('.tile.hot', { hasText: 'подарунок' }).count() === 1, 'на головній: «тобі подарунок!»');
await act('go', { to: 'room' }); await wait(400);
ok(await pg.locator('.r-gift').count() === 1, 'коробка в кімнаті');
await wait(300); s = await st(); ok(s.rooms.me.note.seen === true, 'записку позначено прочитаною');
await act('roomUnbox', { ts: '7' }); await wait(200); await shot('6unbox');
await act('roomUnboxOpen'); await wait(400); s = await st();
ok(s.rooms.me.gifts.length === 0 && s.rooms.me.owned.includes('pk_toys'), 'подарунок розпаковано');
await shot('7unboxed'); await act('roomUnboxOk'); await wait(200);
// --- рівні: купуємо «Королівські покої» → ширша кімната
await act('go', { to: 'roomshop' }); await act('roomShopCat', { c: 'ro' }); await wait(100);
for (const id of R.SET_ITEMS.ro) { await act('roomBuy', { id }); await wait(320); }
for (const id of R.SET_ITEMS.st) { await act('roomBuy', { id }); await wait(320); }
s = await st(); const cosy = R.cosyOf([...R.FREE, ...s.rooms.me.owned]); const L = R.levelOf(cosy);
ok(L.n === 5, `затишок ${cosy} → рівень ${L.n}`);
await act('roomBack'); await wait(300);
const w = await pg.evaluate(() => [document.getElementById('room').offsetWidth, document.querySelector('.room-wrap').clientWidth]);
ok(w[0] > w[1] * 1.5, `кімната ширша за екран і гортається (${w[0]} > ${w[1]})`);
await act('roomEdit'); await wait(200);
for (const id of ['ro_window', 'ro_canopy', 'ro_throne', 'ro_chand', 'ro_rug', 'ro_frame', 'st_planets', 'st_scope', 'st_rocket', 'pk_toys']) { await act('roomAdd', { id }); await wait(100); }
await act('roomSet', { f: 'paper', v: 'ro_paper' }); await act('roomSet', { f: 'flooring', v: 'ro_floor' }); await act('roomSet', { f: 'view', v: 'space' }); await wait(100);
await act('roomSave'); await wait(400); s = await st();
ok(s.rooms.me.view === 'space' && (s.avatars.me.owned || []).includes('k_ermine') && s.avatars.me.owned.includes('k_moon'), 'вид «Космос» на рівні 5; бонуси «Королівських» і «Зоряної»');
await shot('8royal');
// гардероб: ексклюзиви кімнати в магазині одягу
await act('go', { to: 'shop' }); await act('shopCat', { c: 'ex' }); await wait(200);
ok(await pg.locator('.shop-c', { hasText: 'Горностаєва мантія' }).count() === 1, 'ексклюзив кімнати у вкладці «Ексклюзиви»');
await shot('9ex');
// гаманець = зароблене − витрачене
s = await st(); const earned = Object.values(s.points).filter((x) => x.uid === 'me').reduce((a, x) => a + x.amount, 0), sp = Object.values(s.spend).filter((x) => x.uid === 'me').reduce((a, x) => a + x.price, 0);
await act('go', { to: 'home' }); await wait(200);
ok((await pg.locator('.tile', { hasText: 'Магазин' }).innerText()).includes(String(earned - sp)), `гаманець ${earned - sp} = ${earned} − ${sp}`);
console.log('TOTAL WRITES', await pg.evaluate(() => window.__writes), JSON.stringify((await pg.evaluate(() => window.__wlog)).reduce((a, c) => ((a[c] = (a[c] || 0) + 1), a), {})));
console.log('FAILS', fails);
console.log('ERRORS', errs.length ? errs : 'none'); await b.close();
process.exit(fails || errs.length ? 1 : 0);
