// ===== «Дві половинки» — кооперативний 3D-квест (екрани, запрошення, нагороди) =====
import * as N from './coopnet.js';
import { CHAPTERS, ALL_LEVELS, LEVEL_COINS, levelById } from './levels.js';
import { ITEMS } from './avatar.js';

let A = null, root = null, game = null, prog = {}, pres = {}, sess = null, view = 'map', ctlCleanup = null, visHandler = null, awarded = new Set();
let gameSubs = [], partnerVoice = false, countT = 0, timerT = 0, lastResN = 0, ready = false, gyro = null;
const me = () => A.S.uid, P = () => A.pUid();
const hostUid = () => [me(), P()].sort()[0];
const isHost = () => me() === hostUid();
const esc = (s) => A.esc(s);
const progRef = (uid) => A.doc(A.db, 'coop', uid);
const doneBy = (uid, id) => !!prog[uid]?.done?.[id];
const done = (id) => doneBy(me(), id) || doneBy(P(), id);
const unlockedLvl = (id) => { const i = ALL_LEVELS.findIndex((l) => l.id === id); return i === 0 || done(ALL_LEVELS[i - 1]?.id); };
const partnerHere = () => !!pres[P()];
const partnerIn = (v) => pres[P()]?.v === v;

export const active = () => ready || entering;
let entering = false;
export async function enterCoop(api) {
  if (ready || entering) return;
  entering = true; A = api; view = 'map';
  A.app.innerHTML = `<div class="page coop">${A.top('Дві половинки')}<div class="card center"><p class="muted">Завантаження 3D-світу…</p></div></div>`;
  try {
    const [a, b] = await Promise.all([A.getDoc(progRef(me())), P() ? A.getDoc(progRef(P())) : null]);
    prog = { [me()]: a.exists() ? a.data() : {}, ...(P() ? { [P()]: b?.exists() ? b.data() : {} } : {}) };
    await N.netInit(A.fb, me());
  } catch (e) { entering = false; console.error(e); A.app.innerHTML = `<div class="page">${A.top('Дві половинки')}<div class="card center"><p>Не вдалося підключитися. Перевір інтернет і спробуй ще раз.</p></div></div>`; return; }
  entering = false;
  if (A.S.view !== 'coop') { N.netStop(); return; } // користувач уже пішов
  ready = true;
  N.setPresence({ v: 'map', voice: N.voice.on });
  N.listen('pres', (v) => { pres = v || {}; onPres(); });
  N.listen('s', (v) => { sess = v; onSess(); });
  N.voice.onChange = () => paintVoice();
  N.netState.onConn = () => paintNet();
  visHandler = () => { if (!ready) return; const away = document.visibilityState === 'hidden'; N.setPresence({ v: away ? 'away' : view === 'game' ? 'play' : 'map', voice: N.voice.on }); };
  document.addEventListener('visibilitychange', visHandler);
  renderMap();
}

export function leaveCoop() {
  ready = false; entering = false; stopGame();
  if (visHandler) document.removeEventListener('visibilitychange', visHandler); visHandler = null;
  N.voiceStop(); N.voice.onChange = null; N.netState.onConn = null;
  N.netStop(); pres = {}; sess = null; root = null;
}

// ---------- події мережі ----------
function onPres() {
  const pv = !!pres[P()]?.voice;
  if (pv !== partnerVoice) { partnerVoice = pv; N.voicePartner(pv); }
  if (view === 'map') paintMapLive(); else if (view === 'game') checkPause();
}
function onSess() {
  const s = sess;
  if (view === 'game') {
    if (!s || s.n !== game?.n) return exitToMap();
    if (s.st === 'end' && s.res && lastResN !== s.n) { lastResN = s.n; finish(s); }
    else if (s.st === 'quit') { A.toast(s.by === me() ? 'Гру зупинено' : `${A.nameOf(s.qBy || P())} вийшов(ла) з рівня`); exitToMap(); }
    return;
  }
  if (s?.st === 'go' && Date.now() < (s.n || 0) + 15 * 60e3 && (s.by === me() || s.to === me()) && view === 'map') return startGame(s);
  if (view === 'map') paintMapLive();
}

// ---------- мапа ----------
function renderMap() {
  view = 'map'; stopGame();
  N.setPresence({ v: 'map', voice: N.voice.on });
  const lv = (l) => {
    const ok = unlockedLvl(l.id), d = done(l.id), fish = prog[me()]?.fish?.[l.id] || prog[P()]?.fish?.[l.id];
    const best = prog[me()]?.best?.[l.id];
    return `<button class="lvl ${ok ? '' : 'off'} ${d ? 'ok' : ''}" data-c="pick" data-id="${l.id}"><b>${l.id}</b><span>${esc(l.name)}</span><i>${d ? '✓' : ok ? '▶' : '🔒'}${fish ? ' 🐟' : ''}${best ? ` · ${best}с` : ''}</i></button>`;
  };
  const chs = CHAPTERS.map((c) => {
    const n = c.levels.filter((l) => done(l.id)).length, it = ITEMS[c.reward];
    return `<div class="card ch-card"><div class="ch-h"><span class="ch-ico">${c.ico}</span><div><b>Розділ ${c.id}. ${esc(c.name)}</b><div class="muted small">${esc(c.desc)}</div></div></div>
      ${c.levels.length ? `<div class="lvls">${c.levels.map(lv).join('')}</div><div class="ch-rw">🏅 Нагорода розділу: <b>${esc(it?.name || '')}</b> <span class="leg-t">легендарне</span> ${n === c.levels.length ? '✓ отримано' : `(${n}/${c.levels.length})`}</div>` : '<div class="muted small center-t">🔨 Будується</div>'}</div>`;
  }).join('');
  A.app.innerHTML = `<div class="page coop">${A.top('Дві половинки')}
    <div class="card coop-p"><div id="cpPartner"></div><div id="cpNet" class="muted small"></div></div>
    <div id="cpInvite"></div>
    <div class="card"><div id="cpVoice"></div></div>
    ${chs}
    <div class="card muted small">🎧 Найкраще грати в навушниках. Пройдіть усі розділи — і кожен обере легендарний костюм, якого немає в магазині. Кожна захована рибка 🐟 — крок до парного ефекту.</div></div>`;
  root = A.app.firstElementChild; root.addEventListener('click', onClick);
  paintMapLive(); paintVoice(); paintNet();
}
function paintNet() {
  const el = document.getElementById('cpNet'); if (!el) return;
  el.textContent = N.online() ? '' : '⏳ Підключення до сервера…';
}
function paintMapLive() {
  const pe = document.getElementById('cpPartner'), ie = document.getElementById('cpInvite'); if (!pe || !ie) return;
  const pn = esc(A.nameOf(P()));
  pe.innerHTML = partnerHere() ? `<span class="dot-on"></span> <b>${pn}</b> ${partnerIn('away') ? 'відійшла(ов) — гра на паузі, поки не повернеться' : 'тут, можна грати!'}` : `<span class="dot-off"></span> <b>${pn}</b> ще не зайшла(ов) у «Дві половинки». Обери рівень — надішлю запрошення 🔔`;
  const s = sess, fresh = s && s.st === 'inv' && Date.now() - (s.n || 0) < 10 * 60e3;
  if (fresh && s.to === me()) ie.innerHTML = `<div class="card invite"><b>💌 ${pn} кличе тебе: рівень ${s.lvl} «${esc(levelById(s.lvl)?.name || '')}»</b><div class="row"><button class="btn ghost sm" data-c="decline">Не зараз</button><button class="btn sm" data-c="accept">Погнали! 🚀</button></div></div>`;
  else if (fresh && s.by === me()) ie.innerHTML = `<div class="card invite"><b>⏳ Чекаємо ${pn}: рівень ${s.lvl}</b><div class="muted small">${partnerHere() ? 'Партнер бачить запрошення на екрані.' : 'Надіслали сповіщення.'}</div><button class="btn ghost sm" data-c="cancelInv">Скасувати</button></div>`;
  else ie.innerHTML = '';
}
function paintVoice() {
  const el = document.getElementById('cpVoice'); if (!el) return;
  const v = N.voice, pv = partnerVoice;
  let h;
  if (!v.on) h = v.state === 'nomic' ? `<b>🎙 Мікрофон заборонено.</b><div class="muted small">Дозволь мікрофон для цього сайту в налаштуваннях браузера й спробуй знову.</div><button class="btn sm" data-c="vOn">Спробувати ще</button>`
    : `<button class="btn sm" data-c="vOn">🎙 Увімкнути голос</button> <span class="muted small">${pv ? 'партнер уже на звʼязку' : ''}</span>`;
  else {
    const st = v.state === 'ok' ? `🔊 Звʼязок є${v.relay ? ' (через сервер)' : ' (напряму)'}` : v.state === 'fail' ? '⚠️ Не вдалося зʼєднатися, пробую ще…' : pv ? '⏳ Зʼєднуємо…' : '⏳ Чекаємо, поки партнер увімкне голос';
    h = `<span class="vst">${st}</span> <button class="btn ghost sm" data-c="vMute">${v.muted ? '🔇 Увімкнути мікрофон' : '🎙 Вимкнути мікрофон'}</button> <button class="btn ghost sm" data-c="vOff">✕</button>${v.needTap ? ' <button class="btn sm" data-c="vTap">🔈 Натисни, щоб чути</button>' : ''}`;
  }
  el.innerHTML = h;
  const g = document.getElementById('gVoice'); if (g) g.textContent = !v.on ? '🎙' : v.state === 'ok' ? (v.muted ? '🔇' : '🔊') : '⏳';
}

// ---------- дії ----------
function onClick(e) {
  const el = e.target.closest('[data-c]'); if (!el) return;
  e.preventDefault(); e.stopPropagation();
  const a = el.dataset.c;
  if (a === 'pick') return pick(el.dataset.id);
  if (a === 'accept') return accept();
  if (a === 'decline' || a === 'cancelInv') return N.set('s', null);
  if (a === 'vOn') return N.voiceStart(P(), isHost());
  if (a === 'vOff') return N.voiceStop();
  if (a === 'vMute') return N.voiceMute(!N.voice.muted);
  if (a === 'vTap') return N.voiceTap();
  if (a === 'gVoice') { if (!N.voice.on) N.voiceStart(P(), isHost()); else N.voiceMute(!N.voice.muted); return; }
  if (a === 'quit') { if (confirmQuit()) N.upd('s', { st: 'quit', qBy: me() }); return; }
  if (a === 'gyro') return toggleGyro();
  if (a === 'again') return pick(el.dataset.id, true);
  if (a === 'map') { N.set('s', null); return renderMap(); }
}
function confirmQuit() { const b = document.getElementById('gQuit'); if (b?.dataset.sure) return true; if (b) { b.dataset.sure = '1'; b.textContent = 'Точно вийти?'; setTimeout(() => { if (b) { delete b.dataset.sure; b.textContent = '✕'; } }, 2500); } return false; }
function pick(id, again) {
  if (!P()) return A.toast('Партнер ще не зареєструвався');
  if (!unlockedLvl(id)) return A.toast('Спершу пройдіть попередній рівень 🔒');
  if (sess?.st === 'inv' && sess.to === me() && sess.lvl === id && !again) return accept();
  N.set('s', { lvl: id, by: me(), to: P(), st: 'inv', n: Date.now() });
  if (!partnerHere()) A.notify(P(), '🧩 Дві половинки', `${A.nameOf(me())} кличе тебе пройти рівень ${id} «${levelById(id)?.name}» 💕`);
  view === 'map' ? paintMapLive() : renderMap();
}
function accept() {
  const s = sess; if (!s || s.st !== 'inv' || s.to !== me()) return;
  N.upd('', { s: { ...s, st: 'go', at: N.now() + 3500 }, st: null, w: null, in: null, g: null });
}

// ---------- гра ----------
const hud = (lvl, ctlCls, ctlHtml) => `<div class="page coop game3d">
    <header class="g-hud"><button class="g-btn" id="gQuit" data-c="quit">✕</button><div class="g-t"><b>${lvl.id} · ${esc(lvl.name)}</b><span id="gInfo" class="muted small"></span></div><button class="g-btn" id="gVoice" data-c="gVoice">🎙</button></header>
    <div class="g-stage" id="gStage"><div class="g-over" id="gOver"></div></div>
    <div class="g-ctl ${ctlCls}" id="gCtl">${ctlHtml}</div></div>`;
const endLevel = (s, r) => N.upd('s', { st: 'end', res: { t: Math.max(1, Math.round((N.now() - s.at) / 1000)), fish: r.fish, falls: r.falls } });

async function startGame(s) {
  const lvl = levelById(s.lvl); if (!lvl) return;
  view = 'game';
  if (lvl.ch === 2) return startLightGame(s, lvl);
  N.setPresence({ v: 'play', voice: N.voice.on });
  const idx = ALL_LEVELS.findIndex((l) => l.id === lvl.id);
  const myAxis = (idx % 2 === 0) === isHost() ? 'x' : 'z';
  A.app.innerHTML = `<div class="page coop game3d">
    <header class="g-hud"><button class="g-btn" id="gQuit" data-c="quit">✕</button><div class="g-t"><b>${lvl.id} · ${esc(lvl.name)}</b><span id="gInfo" class="muted small"></span></div><button class="g-btn" id="gVoice" data-c="gVoice">🎙</button></header>
    <div class="g-stage" id="gStage"><div class="g-over" id="gOver"></div></div>
    <div class="g-ctl ${myAxis}" id="gCtl"><div class="g-lab">${myAxis === 'x' ? '↔ Ти нахиляєш <b>вліво-вправо</b>' : '↕ Ти нахиляєш <b>вперед-назад</b>'} · ${esc(A.nameOf(P()))} — ${myAxis === 'x' ? 'вперед-назад' : 'вліво-вправо'}</div>
      <div class="trk" id="gTrk"><div class="knob" id="gKnob"></div></div><button class="link small" data-c="gyro" id="gGyro">📱 Керувати нахилом телефона</button></div></div>`;
  root = A.app.firstElementChild; root.addEventListener('click', onClick);
  paintVoice();
  const holder = document.getElementById('gStage');
  const { startBox } = await import('./box.js');
  if (view !== 'game' || sess?.n !== s.n) return;
  const me_ = me(), p = P();
  game = startBox({
    holder, grid: lvl.grid, isHost: isHost(), axis: myAxis,
    sendTilt: (v) => N.set('in/' + me_, v),
    sendState: (v) => N.set('st', v),
    sendWorld: (v) => N.set('w', v),
    onWin: (r) => endLevel(s, r),
    onFall: () => { navigator.vibrate?.(60); flash('Ой! Клубок упав 🙀'); },
    onBump: () => navigator.vibrate?.(12),
    onSwitch: () => flash('Клац! Ворота відчинено ✨'),
    onFish: () => flash('Рибка! 🐟'),
  });
  game.n = s.n; game.lvl = lvl; window.__coopGame = game;
  if (isHost() && N.now() > s.at + 1000) { const [st0, w0] = await Promise.all([N.once('st'), N.once('w')]); game?.restore(st0, w0); }
  gameSubs.push(N.listen('in/' + p, (v) => game?.partnerTilt(v)));
  if (!isHost()) gameSubs.push(N.listen('st', (v) => game?.hostState(v)));
  gameSubs.push(N.listen('w', (v) => { if (!game) return; game.world(v); if (!isHost() && v) { const [, f, , fall] = v.split('|'); if (fall === '1') flash('Ой! Клубок упав 🙀'); if (f === '1' && !game._f) { game._f = 1; flash('Рибка! 🐟'); } } }));
  bindControls(myAxis);
  clearInterval(timerT); timerT = setInterval(tick, 250); tick();
}
// Розділ 2 «Маяк»: ролі «мандрівник» / «штурман» міняються на кожному рівні
async function startLightGame(s, lvl) {
  N.setPresence({ v: 'play', voice: N.voice.on });
  const idx = ALL_LEVELS.findIndex((l) => l.id === lvl.id);
  const role = (idx % 2 === 0) === isHost() ? 'walker' : 'nav';
  A.app.innerHTML = hud(lvl, 'light', '');
  root = A.app.firstElementChild; root.addEventListener('click', onClick);
  paintVoice();
  const { startLight } = await import('./lighthouse.js');
  if (view !== 'game' || sess?.n !== s.n) return;
  game = startLight({
    holder: document.getElementById('gStage'), ctlEl: document.getElementById('gCtl'), grid: lvl.grid, levers: lvl.levers, role, at: s.at, now: N.now,
    send: (k, v) => N.set('g/' + k, v),
    listen: (k, cb) => N.listen('g/' + k, cb),
    onWin: (r) => endLevel(s, r),
    onFall: () => { navigator.vibrate?.(80); flash(role === 'walker' ? 'Ай! Пастка 🙀 Назад до останніх дверей' : 'Ой! Мандрівник у пастці 🙀'); },
    onFish: () => flash('Рибка! 🐟'),
    flash,
  });
  game.n = s.n; game.lvl = lvl; window.__coopGame = game;
  if (N.now() > s.at + 1000) { const [p0, w0, d0] = await Promise.all([N.once('g/pos'), N.once('g/w'), N.once('g/dr')]); game?.restore(p0, w0, d0); }
  clearInterval(timerT); timerT = setInterval(tick, 250); tick();
}
function flash(t) { const o = document.getElementById('gOver'); if (!o || o.dataset.hold) return; o.innerHTML = `<div class="g-flash">${t}</div>`; clearTimeout(o._t); o._t = setTimeout(() => { if (!o.dataset.hold) o.innerHTML = ''; }, 1300); }
function tick() {
  if (!game || !sess) return;
  const left = sess.at - N.now(), info = document.getElementById('gInfo'), o = document.getElementById('gOver');
  if (left > 0) { o.dataset.hold = '1'; o.innerHTML = `<div class="g-count">${Math.ceil(left / 1000)}</div>`; game.pause(true); return; }
  if (o.dataset.hold === '1' && !o.dataset.pause) { delete o.dataset.hold; o.innerHTML = ''; }
  checkPause();
  const st = game.state();
  if (info) info.textContent = `⏱ ${Math.max(0, Math.floor((N.now() - sess.at) / 1000))}с · 🙀 ${st.falls}${st.fish ? ' · 🐟' : ''}`;
}
function checkPause() {
  if (!game || !sess || sess.at > N.now()) return;
  const o = document.getElementById('gOver'); if (!o) return;
  const away = !partnerIn('play') || !N.online();
  game.pause(away);
  if (away) { o.dataset.hold = '1'; o.dataset.pause = '1'; o.innerHTML = `<div class="g-pause">⏸ ${!N.online() ? 'Немає звʼязку з сервером…' : `Чекаємо, поки повернеться ${esc(A.nameOf(P()))}…`}</div>`; }
  else if (o.dataset.pause) { delete o.dataset.pause; delete o.dataset.hold; o.innerHTML = ''; }
}
function bindControls(axis) {
  const trk = document.getElementById('gTrk'), knob = document.getElementById('gKnob'); let pid = null;
  const setV = (v) => { game?.setInput(v); knob.style.transform = axis === 'x' ? `translateX(${v * (trk.clientWidth / 2 - 30)}px)` : `translateY(${v * (trk.clientHeight / 2 - 30)}px)`; };
  const val = (e) => { const r = trk.getBoundingClientRect(); return axis === 'x' ? ((e.clientX - r.left) / r.width) * 2 - 1 : ((e.clientY - r.top) / r.height) * 2 - 1; };
  const down = (e) => { if (gyro) return; pid = e.pointerId; trk.setPointerCapture(pid); setV(Math.max(-1, Math.min(1, val(e) * 1.25))); };
  const move = (e) => { if (e.pointerId === pid) setV(Math.max(-1, Math.min(1, val(e) * 1.25))); };
  const up = (e) => { if (e.pointerId === pid) { pid = null; setV(0); } };
  trk.addEventListener('pointerdown', down); trk.addEventListener('pointermove', move); trk.addEventListener('pointerup', up); trk.addEventListener('pointercancel', up);
  ctlCleanup = () => { trk.removeEventListener('pointerdown', down); trk.removeEventListener('pointermove', move); trk.removeEventListener('pointerup', up); trk.removeEventListener('pointercancel', up); gyroOff(); };
  root._setV = setV; root._axis = axis;
}
async function toggleGyro() {
  if (gyro) { gyroOff(); root?._setV?.(0); document.getElementById('gGyro').textContent = '📱 Керувати нахилом телефона'; return; }
  try { if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) { if ((await DeviceOrientationEvent.requestPermission()) !== 'granted') return A.toast('Доступ до нахилу не надано'); } } catch { return A.toast('Нахил недоступний'); }
  let base = null; const axis = root?._axis;
  const h = (e) => {
    const raw = axis === 'x' ? e.gamma : e.beta; if (raw == null) return;
    if (base === null) base = raw;
    root?._setV?.(Math.max(-1, Math.min(1, (raw - base) / 18)));
  };
  window.addEventListener('deviceorientation', h); gyro = h;
  const b = document.getElementById('gGyro'); if (b) b.textContent = '👆 Повернутися до повзунка (нахил: тримай телефон рівно на старті)';
}
function gyroOff() { if (gyro) window.removeEventListener('deviceorientation', gyro); gyro = null; }
function stopGame() {
  clearInterval(timerT); ctlCleanup?.(); ctlCleanup = null;
  gameSubs.splice(0).forEach((u) => u());
  if (game) { game.stop(); game = null; }
}
function exitToMap() { stopGame(); if (ready) renderMap(); }

// ---------- результат і нагороди ----------
async function finish(s) {
  const lvl = levelById(s.lvl), r = s.res || {};
  const first = !doneBy(me(), lvl.id) && !awarded.has(lvl.id);
  const mine = prog[me()] || (prog[me()] = {});
  const best = Math.min(mine.best?.[lvl.id] || 1e9, r.t);
  mine.done = { ...(mine.done || {}), [lvl.id]: { t: r.t, at: Date.now() } };
  mine.best = { ...(mine.best || {}), [lvl.id]: best };
  if (r.fish) mine.fish = { ...(mine.fish || {}), [lvl.id]: 1 };
  const upd = { done: { [lvl.id]: { t: r.t, at: Date.now() } }, best: { [lvl.id]: best } };
  if (r.fish) upd.fish = { [lvl.id]: 1 };
  A.setDoc(progRef(me()), upd, { merge: true }).catch((e) => console.error(e));
  if (first) { awarded.add(lvl.id); A.addPoints(`coop_${lvl.id}_${me()}`, me(), LEVEL_COINS, 'Дві половинки'); }
  // нагорода розділу
  const ch = CHAPTERS.find((c) => c.levels.some((l) => l.id === lvl.id));
  let legend = '';
  if (ch && ch.levels.every((l) => doneBy(me(), l.id))) {
    const owned = A.S.avatars[me()]?.owned || [];
    if (!owned.includes(ch.reward)) { A.setDoc(A.doc(A.db, 'avatars', me()), { owned: A.arrayUnion(ch.reward) }, { merge: true }).catch(() => {}); legend = ch.reward; }
  }
  stopGame();
  const i = ALL_LEVELS.findIndex((l) => l.id === lvl.id), next = ALL_LEVELS[i + 1];
  view = 'result'; N.setPresence({ v: 'map', voice: N.voice.on });
  A.app.innerHTML = `<div class="page coop">${A.top('Дві половинки')}
    <div class="card center res"><div class="res-big">🧺💕</div><b class="big">Рівень ${lvl.id} пройдено разом!</b>
      <p>⏱ ${r.t} с · падінь: ${r.falls || 0} ${r.fish ? '· 🐟 рибку знайдено!' : '· 🐟 рибку пропущено'}</p>
      ${first ? `<p class="plus">+${LEVEL_COINS} 🪙 кожному</p>` : '<p class="muted small">Повторне проходження — монети лише за перше. Але рекорд оновлюється!</p>'}
      ${best === r.t ? '<p>🏆 Ваш рекорд на цьому рівні!</p>' : `<p class="muted small">Рекорд: ${best} с</p>`}
      ${legend ? `<div class="legend-pop">✨ ЛЕГЕНДАРНА НАГОРОДА ✨<br><b>${esc(ITEMS[legend]?.name)}</b><div class="muted small">Уже в гардеробі «Мого котика»</div></div>` : ''}
      <div class="row3">${next && next.grid ? `<button class="btn" data-c="pick" data-id="${next.id}">Далі: ${next.id} ▶</button>` : ''}<button class="btn ghost" data-c="again" data-id="${lvl.id}">Ще раз</button><button class="btn ghost" data-c="map">До мапи</button></div></div>
    <div class="card"><div id="cpVoice"></div></div><div id="cpInvite"></div><div id="cpPartner" hidden></div></div>`;
  root = A.app.firstElementChild; root.addEventListener('click', onClick);
  paintVoice();
  view = 'map'; // запрошення на наступний рівень показуються тут же
  paintMapLive();
}
