// ===== Мурчики: сезон кохання — основна логіка =====
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, arrayUnion, increment } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig } from './config.js';
import { mountCat } from './cat.js';
import { initDuels, renderDuels, renderDuel, duelActions, onDuelsUpdate, isPlaying, unlocked as duelsUnlocked, dailyDuels } from './duels.js';
import { initShop, renderAvatar, renderShop, shopActions, avOf, wallet, ensureExclusives } from './shop.js';
import { portrait } from './avatar.js';
import { sendPush, newTopic } from './notify.js';
import { initWorkshop, renderWorkshop, renderArtNew, renderArt, renderLive, renderAlbum, workshopActions, onLiveUpdate, isEditing, pendingArt, resetWorkshop, wsUnlocked } from './workshop.js';
import { initTrivia, renderTrivia, triviaActions, DAY_CAP } from './trivia.js';
import { initRoom, renderRoom, renderRoomShop, roomActions, ensureRoomBonus, roomTile, roomRefresh } from './room.js';
import { SURVEY, RANKS, PTS } from './data.js';
import { kyivDate, weekId, weekLabel, timeLeftInWeek, wordOfDay, scoreGuess, UA_LETTERS, weekChallenges, quizQuestions, hasAnswer, autoGrade, rankFor } from './util.js';

const app = document.getElementById('app');
const fb = initializeApp(firebaseConfig);
const auth = getAuth(fb);
const db = getFirestore(fb);

const S = {
  uid: null, registering: false, art: {}, live: {}, duels: {}, avatars: {}, rooms: {}, spends: [], users: {}, surveys: {}, points: [], rewards: {}, quizzes: {}, wordles: {}, challenges: {},
  loaded: new Set(), view: 'loading', denied: false, busy: false,
  draft: {}, sIdx: 0, quiz: null, qIdx: 0, qGuess: {}, wCur: '', openCh: null, authMode: 'login', authErr: '',
};
let unsubs = [];
const SURVEY_BY_ID = Object.fromEntries(SURVEY.map((q) => [q.id, q]));

// ---------- допоміжне ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => kyivDate();
const week = () => weekId(today());
const pUid = () => Object.keys(S.users).find((k) => k !== S.uid) || null;
const ans = (uid) => S.surveys[uid]?.answers || {};
const nameOf = (uid) => (uid && (ans(uid).name || S.users[uid]?.name)) || 'Партнер';
const sideOf = (uid) => (ans(uid).role === 'Він' ? 'him' : ans(uid).role === 'Вона' ? 'her' : uid === S.uid ? 'her' : 'him');
const surveyDone = (uid) => !!(uid && S.surveys[uid]?.done);

function toast(msg) {
  document.querySelectorAll('.toast').forEach((x) => x.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}
// Обгортка для дій із записом. Якщо сервер не відповідає 6 с (немає інтернету або вичерпано денний ліміт Firebase),
// не блокуємо гру: запис лишається в черзі, а кнопки знову працюють.
async function safe(fn) {
  if (S.busy) return; S.busy = true;
  let slow = false; const t = setTimeout(() => { slow = true; S.busy = false; toast('Сервер не відповідає — дія збережеться, щойно зʼявиться звʼязок'); }, 6000);
  try { await fn(); } catch (e) { console.error(e); toast('Помилка: ' + (e.code || e.message || 'невідома')); }
  finally { clearTimeout(t); if (!slow) S.busy = false; }
}
// Додати бали до лічильника (один документ, без очікування сервера)
function addPoints(id, uid, amount, reason) {
  if (!uid || !(amount > 0)) return;
  setDoc(doc(db, 'points', id), { uid, reason, date: today(), week: week(), ts: Date.now(), amount: increment(amount) }, { merge: true }).catch((e) => console.error(e));
}
function award(id, uid, amount, reason) {
  if (!uid || !(amount > 0)) return Promise.resolve();
  return setDoc(doc(db, 'points', id), { uid, amount, reason, date: today(), week: week(), ts: Date.now() });
}
function totals() {
  const all = {}, byWeek = {};
  for (const p of S.points) {
    all[p.uid] = (all[p.uid] || 0) + p.amount;
    (byWeek[p.week] ||= {})[p.uid] = (byWeek[p.week][p.uid] || 0) + p.amount;
  }
  return { all, byWeek };
}

export function catSVG(size = 90, extra = '') {
  return `<svg class="cat ${extra}" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true">
    <ellipse cx="60" cy="110" rx="34" ry="6" fill="#000" opacity=".06"/>
    <circle cx="60" cy="64" r="44" fill="#93a5ba"/>
    <path d="M22 46 C20 24 38 16 50 26 C42 30 32 38 22 46Z" fill="#7b8da4"/>
    <path d="M98 46 C100 24 82 16 70 26 C78 30 88 38 98 46Z" fill="#7b8da4"/>
    <path d="M28 40 C28 28 38 24 44 28 C38 31 33 35 28 40Z" fill="#f6b8cb"/>
    <path d="M92 40 C92 28 82 24 76 28 C82 31 87 35 92 40Z" fill="#f6b8cb"/>
    <ellipse cx="60" cy="80" rx="24" ry="18" fill="#a9b8c9"/>
    <circle cx="43" cy="62" r="10" fill="#e9a23b"/><circle cx="77" cy="62" r="10" fill="#e9a23b"/>
    <ellipse cx="43" cy="62" rx="4" ry="7.5" fill="#2b2b33"/><ellipse cx="77" cy="62" rx="4" ry="7.5" fill="#2b2b33"/>
    <circle cx="46" cy="58" r="2.4" fill="#fff"/><circle cx="80" cy="58" r="2.4" fill="#fff"/>
    <path d="M56 74 L64 74 L60 79Z" fill="#f08aa8"/>
    <path d="M60 79 Q60 85 54 85 M60 79 Q60 85 66 85" stroke="#5d6a7c" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="33" cy="76" rx="7" ry="4" fill="#ff9ab8" opacity=".55"/><ellipse cx="87" cy="76" rx="7" ry="4" fill="#ff9ab8" opacity=".55"/>
    <g stroke="#eef2f6" stroke-width="1.5" stroke-linecap="round"><path d="M38 80 L14 76M38 84 L15 88M82 80 L106 76M82 84 L105 88"/></g>
  </svg>`;
}
const heart = '<span class="heart">❤</span>';

// ---------- авторизація та підписки ----------
onAuthStateChanged(auth, (user) => {
  if (S.registering) return; // реєстрація ще триває — стартуємо після перевірки коду
  start(user);
});
function start(user) {
  unsubs.forEach((u) => u()); unsubs = [];
  Object.assign(S, { uid: user?.uid || null, art: {}, live: {}, duels: {}, avatars: {}, rooms: {}, spends: [], users: {}, surveys: {}, points: [], rewards: {}, quizzes: {}, wordles: {}, challenges: {}, loaded: new Set(), denied: false });
  if (!user) { S.view = 'auth'; render(); return; }
  S.view = 'loading'; render();
  setDoc(doc(db, 'users', user.uid), { nick: emailToNick(user.email), lastSeen: Date.now() }, { merge: true }).catch(onErr);
  const sub = (key, ref, fn) => unsubs.push(onSnapshot(ref, (snap) => { fn(snap); S.loaded.add(key); onData(); }, onErr));
  sub('users', collection(db, 'users'), (s) => { S.users = {}; s.forEach((d) => (S.users[d.id] = d.data())); });
  sub('surveys', collection(db, 'surveys'), (s) => { S.surveys = {}; s.forEach((d) => (S.surveys[d.id] = d.data())); });
  sub('points', collection(db, 'points'), (s) => { S.points = []; s.forEach((d) => S.points.push(d.data())); });
  sub('rewards', collection(db, 'rewards'), (s) => { S.rewards = {}; s.forEach((d) => (S.rewards[d.id] = d.data())); });
  sub('quiz', collection(db, 'quiz'), (s) => { S.quizzes = {}; s.forEach((d) => (S.quizzes[d.id] = { ...d.data(), id: d.id })); });
  sub('wordle', collection(db, 'wordle'), (s) => { S.wordles = {}; s.forEach((d) => (S.wordles[d.id] = d.data())); });
  sub('duels', query(collection(db, 'duels'), where('date', '==', today())), (s) => { S.duels = {}; s.forEach((d) => (S.duels[d.id] = { ...d.data(), id: d.id })); });
  sub('avatars', collection(db, 'avatars'), (s) => { S.avatars = {}; s.forEach((d) => (S.avatars[d.id] = d.data())); });
  sub('rooms', collection(db, 'rooms'), (s) => { S.rooms = {}; s.forEach((d) => (S.rooms[d.id] = d.data())); });
  sub('art', collection(db, 'art'), (s) => { S.art = {}; s.forEach((d) => (S.art[d.id] = { ...d.data(), id: d.id })); });
  sub('live', query(collection(db, 'live'), where('date', '==', today())), (s) => { S.live = {}; s.forEach((d) => (S.live[d.id] = { ...d.data(), id: d.id })); onLiveUpdate(); });
  sub('spend', collection(db, 'spend'), (s) => { S.spends = []; s.forEach((d) => S.spends.push(d.data())); });
  S.subWeek = week();
  sub('challenges', query(collection(db, 'challenges'), where('week', '==', week())), (s) => { S.challenges = {}; s.forEach((d) => (S.challenges[d.id] = { ...d.data(), id: d.id })); });
}
// Нікнейм (будь-якою мовою) перетворюємо на технічний email для Firebase
const NICK_RE = /^[\p{L}\d_-]{2,15}$/u;
const normNick = (n) => n.trim().toLowerCase();
function nickToEmail(nick) { return 'u' + [...new TextEncoder().encode(normNick(nick))].map((x) => x.toString(16).padStart(2, '0')).join('') + '@murchyky.app'; }
function emailToNick(email) {
  try { const h = email.split('@')[0].slice(1); return new TextDecoder().decode(new Uint8Array(h.match(/../g).map((x) => parseInt(x, 16)))); }
  catch { return ''; }
}

// Новий тиждень почався, поки гра відкрита — перезавантажуємо
setInterval(() => { if (S.subWeek && S.subWeek !== week() && S.view !== 'survey') location.reload(); }, 60000);
function onErr(e) {
  console.error(e);
  if (e?.code === 'permission-denied') { S.denied = true; render(); }
}
const LIVE = new Set(['home', 'ranks', 'grade', 'wordle', 'duels', 'avatar', 'shop', 'workshop', 'album']);
function onData() {
  if (S.loaded.size < 13) return;
  if (S.uid && !S.users[S.uid]?.ntfy && !S.ntfyAsked) { S.ntfyAsked = true; S.users[S.uid] = { ...(S.users[S.uid] || {}), ntfy: 'pending' }; setDoc(doc(db, 'users', S.uid), { ntfy: newTopic() }, { merge: true }).catch(() => {}); }
  onDuelsUpdate(); ensureExclusives(); ensureRoomBonus();
  if (S.view === 'loading') {
    if (!surveyDone(S.uid)) startSurvey(); else S.view = 'home';
    render(); return;
  }
  if (S.view === 'room' || S.view === 'roomshop') return roomRefresh();
  if (LIVE.has(S.view) || (S.view === 'challenges' && !S.openCh) || (S.view === 'duel' && !isPlaying()) || (S.view === 'art' && !isEditing() && document.activeElement?.tagName !== 'INPUT')) render();
}

// ---------- рендер ----------
function render() {
  if (S.denied) return renderDenied();
  const v = { loading: renderLoading, auth: renderAuth, survey: renderSurvey, home: renderHome, quiz: renderQuiz, grade: renderGrade, wordle: renderWordle, challenges: renderChallenges, ranks: renderRanks, reward: renderReward, duels: renderDuels, duel: renderDuel, avatar: renderAvatar, shop: renderShop, workshop: renderWorkshop, artnew: renderArtNew, art: renderArt, live: renderLive, album: renderAlbum, trivia: renderTrivia, coop: renderCoop, room: renderRoom, roomshop: renderRoomShop }[S.view];
  (v || renderHome)();
  window.scrollTo?.(0, 0);
}
const top = (title) => `<header class="top"><button class="back" data-a="go" data-to="home">←</button><h2>${title}</h2><span></span></header>`;

function renderLoading() { app.innerHTML = `<div class="center">${catSVG(110, 'bob')}<p class="muted">Завантаження…</p></div>`; }
function renderDenied() {
  app.innerHTML = `<div class="center card">${catSVG(100)}<h2>Немає доступу</h2>
  <p>Цей акаунт не має доступу до гри. Зареєструйся заново з правильним кодом запрошення.</p>
  <button class="btn" data-a="logout">Вийти</button></div>`;
}

function renderAuth() {
  const reg = S.authMode === 'register';
  app.innerHTML = `<div class="auth">
    ${catSVG(130, 'bob')}
    <h1 class="logo">Мурчики</h1><p class="sub">сезон кохання для двох ${heart}</p>
    <form class="card" id="authForm">
      <input id="nick" type="text" autocomplete="username" autocapitalize="none" placeholder="Нікнейм" required>
      <input id="pass" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}" placeholder="Пароль (мін. 6 символів)" required minlength="6">
      ${reg ? '<input id="code" type="text" autocapitalize="characters" placeholder="Код запрошення" required>' : ''}
      ${reg ? '<p class="muted small">Нікнейм: 2–15 літер (можна кирилицею), цифри, _ або -. Запам\'ятай пароль: відновити його не вийде.</p>' : ''}
      ${S.authErr ? `<p class="err">${esc(S.authErr)}</p>` : ''}
      <button class="btn" type="submit">${reg ? 'Зареєструватися' : 'Увійти'}</button>
      <button class="link" type="button" data-a="authMode">${reg ? 'Вже є акаунт? Увійти' : 'Вперше тут? Зареєструватися'}</button>
    </form></div>`;
  document.getElementById('authForm').onsubmit = async (e) => {
    e.preventDefault();
    const nick = normNick(document.getElementById('nick').value), pass = document.getElementById('pass').value;
    const fail = (msg) => { S.authErr = msg; renderAuth(); };
    if (!NICK_RE.test(nick)) return fail('Нікнейм: 2–15 літер, цифри, _ або - (без пробілів)');
    const email = nickToEmail(nick);
    try {
      if (!reg) { await signInWithEmailAndPassword(auth, email, pass); S.authErr = ''; return; }
      const code = document.getElementById('code').value.trim().toUpperCase();
      S.registering = true;
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      try { await setDoc(doc(db, 'members', cred.user.uid), { code, nick, ts: Date.now() }); }
      catch (err) { await cred.user.delete().catch(() => signOut(auth)); throw { code: 'bad-invite' }; }
      S.registering = false; S.authErr = ''; start(cred.user);
    } catch (err) {
      S.registering = false;
      const m = { 'bad-invite': 'Невірний код запрошення', 'auth/invalid-credential': 'Невірний нікнейм або пароль', 'auth/wrong-password': 'Невірний пароль', 'auth/user-not-found': 'Такого нікнейму немає — зареєструйся', 'auth/email-already-in-use': 'Цей нікнейм уже зайнятий', 'auth/weak-password': 'Пароль має бути від 6 символів', 'auth/network-request-failed': 'Немає інтернету', 'auth/too-many-requests': 'Забагато спроб, зачекай кілька хвилин' };
      fail(m[err.code] || err.code || 'Помилка');
    }
  };
}

// ----- опитування -----
function startSurvey() {
  const s = S.surveys[S.uid];
  S.draft = { ...(s?.answers || {}) }; S.sIdx = Math.min(s?.step || 0, SURVEY.length - 1); S.view = 'survey';
}
function optLabel(o, mode, aboutUid) {
  if (o === 'SELF') return mode === 'survey' ? 'Я' : nameOf(aboutUid);
  if (o === 'PARTNER') return mode === 'survey' ? 'Партнер(ка)' : 'Ти';
  if (o === 'SAME') return 'Однаково';
  return o;
}
function answerInput(q, val, mode, aboutUid) {
  if (q.type === 'choice') return `<div class="opts">${q.opts.map((o) => `<button class="opt ${String(val) === o ? 'sel' : ''}" data-a="pick" data-v="${esc(o)}">${esc(optLabel(o, mode, aboutUid))}</button>`).join('')}</div>`;
  if (q.type === 'scale') return `<div class="scale">${Array.from({ length: 10 }, (_, i) => i + 1).map((n) => `<button class="sc ${Number(val) === n ? 'sel' : ''}" data-a="pick" data-v="${n}">${n}</button>`).join('')}</div>`;
  if (q.type === 'long') return `<textarea id="ansIn" rows="5" placeholder="Напиши розгорнуто…">${esc(val || '')}</textarea>`;
  return `<input id="ansIn" type="text" placeholder="Твоя відповідь" value="${esc(val || '')}">`;
}
function renderSurvey() {
  const q = SURVEY[S.sIdx], n = SURVEY.length, pct = Math.round((S.sIdx / n) * 100);
  app.innerHTML = `<div class="page">
    <div class="survey-head">${catSVG(60)}<div><b>Знайомство з тобою</b><div class="muted small">Ці відповіді стануть питаннями квізу для партнера. Будь чесним(ою) ${heart}</div></div></div>
    <div class="bar"><i style="width:${pct}%"></i></div>
    <div class="muted small">${esc(q.sec)} · ${S.sIdx + 1} з ${n}</div>
    <div class="card qcard"><h3>${esc(q.q)}</h3>${answerInput(q, S.draft[q.id], 'survey')}</div>
    <div class="row">${S.sIdx > 0 ? '<button class="btn ghost" data-a="sPrev">Назад</button>' : '<span></span>'}
    <button class="btn" data-a="sNext">${S.sIdx === n - 1 ? 'Завершити ✓' : 'Далі'}</button></div></div>`;
  const inp = document.getElementById('ansIn');
  if (inp) { inp.oninput = () => (S.draft[q.id] = inp.value); inp.focus({ preventScroll: true }); }
}
async function surveyNext() {
  const q = SURVEY[S.sIdx];
  if (!hasAnswer(S.draft[q.id])) return toast('Дай відповідь, щоб продовжити');
  const last = S.sIdx === SURVEY.length - 1;
  await safe(async () => {
    const data = { answers: S.draft, step: last ? S.sIdx : S.sIdx + 1 };
    if (last) data.done = true;
    await setDoc(doc(db, 'surveys', S.uid), data, { merge: true });
    if (last) {
      await setDoc(doc(db, 'users', S.uid), { name: S.draft.name, role: S.draft.role }, { merge: true });
      await award('survey_' + S.uid, S.uid, PTS.survey, 'Опитування');
      toast(`Опитування завершено! +${PTS.survey}`); S.view = 'home';
    } else S.sIdx++;
  });
  render();
}

// ----- головна -----
function renderHome() {
  const me = S.uid, p = pUid(), { all, byWeek } = totals(), w = week(), wk = byWeek[w] || {};
  const mine = wk[me] || 0, theirs = p ? wk[p] || 0 : 0;
  const lead = mine === theirs ? null : mine > theirs ? me : p;
  const reward = S.rewards[w]?.text;
  const qz = S.quizzes[`${today()}_${me}`], wd = S.wordles[`${today()}_${me}`];
  const chs = weekChallenges(w), myDone = chs.filter((c) => S.challenges[`${w}_${c.id}_${me}`]?.status === 'approved').length;
  const toCheck = Object.values(S.challenges).filter((c) => c.uid === p && c.status === 'pending').length + pendingGrades().length;
  const rk = rankFor(all[me] || 0);
  const side = (uid, pts) => `<div class="pl ${sideOf(uid)} ${lead === uid ? 'lead' : ''}">${lead === uid ? '<div class="crown">👑</div>' : ''}<div class="pn">${esc(uid === me ? 'Ти' : nameOf(uid))}</div><div class="pp">${pts}</div><div class="muted small">${esc(rankFor(all[uid] || 0).icon + ' ' + rankFor(all[uid] || 0).name)}</div></div>`;
  const tile = (a, ico, title, status, cls = '') => `<button class="tile ${cls}" data-a="go" data-to="${a}"><span class="ti">${ico}</span><b>${title}</b><span class="ts">${status}</span></button>`;
  const partnerReady = surveyDone(p);
  app.innerHTML = `<div class="page">
    <header class="hello"><button class="hello-av" data-a="go" data-to="avatar">${portrait(avOf(me), 58)}</button><div><div class="muted small">Привіт,</div><b class="big">${esc(nameOf(me))}</b></div><button class="rk" data-a="go" data-to="ranks">${rk.icon}</button></header>
    ${!p ? `<div class="note">Партнер(ка) ще не зареєструвався(лась). Надішли їй (йому) посилання на гру ${heart}</div>` : !partnerReady ? `<div class="note">Чекаємо, поки ${esc(nameOf(p))} пройде опитування — тоді відкриється квіз.</div>` : ''}
    <section class="card score">
      <div class="muted small center-t">Сезон: ${weekLabel(w)} · до фіналу ${timeLeftInWeek()}</div>
      <div class="vs">${side(me, mine)}<div class="vsx">VS</div>${p ? side(p, theirs) : '<div class="pl"><div class="pn">?</div><div class="pp">0</div></div>'}</div>
      <div id="catStage"></div>
      <button class="reward" data-a="go" data-to="reward">🎁 Нагорода тижня: <b>${reward ? esc(reward) : 'ще не обрано — натисни, щоб вписати'}</b></button>
    </section>
    ${toCheck ? `<button class="alert" data-a="go" data-to="${pendingGrades().length ? 'grade' : 'challenges'}">🔔 Потрібна твоя перевірка: ${toCheck}</button>` : ''}
    <div class="tiles">
      ${tile('quiz', '💭', 'Квіз дня', !partnerReady ? 'чекає партнера' : qz?.done ? 'пройдено ✓' : 'хто краще знає?')}
      ${tile('wordle', '🔤', 'Слово дня', wd?.done ? (wd.solved ? `вгадано за ${wd.guesses.length} ✓` : 'не вгадано') : 'вгадай слово')}
      ${tile('challenges', '📸', 'Челенджі тижня', `${myDone} з ${chs.length}`)}
      ${tile('grade', '✍️', 'Оцінити відповіді', pendingGrades().length ? `${pendingGrades().length} чекає` : 'все оцінено')}
      ${tile('ranks', '🏆', 'Ранги й сезони', `${rk.icon} ${rk.name}`)}
      ${tile('duels', '⚔️', 'Дуелі наживо', duelsUnlocked().ok ? dailyDuels(today()).length + ' нові сьогодні' : '🔒 з рангу «Муркотун»', duelsUnlocked().ok ? '' : 'dim')}
      ${tile('avatar', '🐱', 'Мій котик', avOf(me).name ? esc(avOf(me).name) : 'вигляд і гардероб')}
      ${tile('shop', '🛍', 'Магазин', `${wallet()} 🪙`)}
      ${((t) => tile('room', '🏠', 'Моя кімната', esc(t.t), 'wide' + (t.hot ? ' hot' : '')))(roomTile())}
      ${tile('workshop', '🎨', 'Творча майстерня', !wsUnlocked().ok ? '🔒 з рангу «Котик-романтик»' : pendingArt() ? `👉 чекає тебе: ${pendingArt()}` : '7 творчих ігор + альбом', !wsUnlocked().ok ? 'dim' : pendingArt() ? 'hot' : '')}
      ${tile('trivia', '🧹', 'Робота задарма', 'питання за 🪙 · 💎 +50')}
      ${tile('coop', '🧩', 'Дві половинки — 3D-квест удвох', coopUnlocked().ok ? 'Шкатулка · Маяк · Сад — легендарні нагороди' : '🔒 з рангу «Королівська висловуха»', coopUnlocked().ok ? 'wide' : 'wide dim')}
    </div></div>`;
  mountCat(document.getElementById('catStage'), [me, p].filter(Boolean).map((u) => ({ uid: u, av: avOf(u) })));
}

// ----- квіз -----
function openQuiz() {
  const p = pUid(); S.view = 'quiz';
  if (!surveyDone(p)) { S.quiz = null; return; }
  const id = `${today()}_${S.uid}`, ex = S.quizzes[id];
  S.quiz = { id, qids: ex?.qids || quizQuestions(today(), S.uid, ans(p)), about: p };
  S.qIdx = 0; S.qGuess = {};
}
function renderQuiz() {
  const p = pUid();
  if (!S.quiz) { app.innerHTML = `<div class="page">${top('Квіз дня')}<div class="card center">${catSVG(90)}<p>${p ? esc(nameOf(p)) + ' ще не пройшов(ла) опитування.' : 'Партнер ще не зареєструвався.'} Квіз відкриється після цього.</p></div></div>`; return; }
  const ex = S.quizzes[S.quiz.id];
  if (ex?.done) return renderQuizReview(ex);
  if (!S.quiz.qids.length) { app.innerHTML = `<div class="page">${top('Квіз дня')}<p>Немає питань.</p></div>`; return; }
  const qid = S.quiz.qids[S.qIdx], q = SURVEY_BY_ID[qid], n = S.quiz.qids.length;
  app.innerHTML = `<div class="page">${top('Квіз дня')}
    <div class="bar"><i style="width:${(S.qIdx / n) * 100}%"></i></div>
    <div class="muted small">Питання ${S.qIdx + 1} з ${n} · вгадай, що відповів(ла) ${esc(nameOf(p))}</div>
    <div class="card qcard"><div class="who ${sideOf(p)}">${esc(nameOf(p))} відповідав(ла) на питання:</div><h3>${esc(q.q)}</h3>${answerInput(q, S.qGuess[qid], 'quiz', p)}</div>
    <div class="row"><span></span><button class="btn" data-a="qNext">${S.qIdx === n - 1 ? 'Готово ✓' : 'Далі'}</button></div></div>`;
  const inp = document.getElementById('ansIn');
  if (inp) { inp.oninput = () => (S.qGuess[qid] = inp.value); inp.focus({ preventScroll: true }); }
}
async function quizNext() {
  const qid = S.quiz.qids[S.qIdx];
  if (!hasAnswer(S.qGuess[qid])) return toast('Спробуй вгадати 🙂');
  if (S.qIdx < S.quiz.qids.length - 1) { S.qIdx++; return render(); }
  await safe(async () => {
    const p = S.quiz.about, pa = ans(p), results = {};
    for (const id of S.quiz.qids) results[id] = autoGrade(SURVEY_BY_ID[id], S.qGuess[id], pa[id]);
    await setDoc(doc(db, 'quiz', S.quiz.id), { date: today(), guesser: S.uid, about: p, qids: S.quiz.qids, guesses: S.qGuess, results, done: true, ts: Date.now() });
    for (const id of S.quiz.qids) if (results[id] > 0) await award(`q_${S.quiz.id}_${id}`, S.uid, results[id], 'Квіз');
    if (Object.values(results).some((v) => v === null)) notify(p, '✍️ Оціни відповіді', `${nameOf(S.uid)} пройшов(ла) квіз про тебе — оціни розгорнуті відповіді`);
  });
  render();
}
function renderQuizReview(z) {
  const p = z.about, pa = ans(p);
  const rows = z.qids.map((id) => {
    const q = SURVEY_BY_ID[id], r = z.results?.[id];
    const lbl = (v) => (q.type === 'choice' ? optLabel(v, 'quiz', p) : v);
    return `<div class="card rv"><div class="muted small">${esc(q.q)}</div>
      <div>Твій варіант: <b>${esc(lbl(z.guesses?.[id]))}</b></div>
      <div>Відповідь ${esc(nameOf(p))}: <b>${esc(lbl(pa[id]))}</b></div>
      <div class="pts ${r > 0 ? 'ok' : r === 0 ? 'no' : 'wait'}">${r === null || r === undefined ? '⏳ оцінює ' + esc(nameOf(p)) : r > 0 ? '+' + r : '0'}</div></div>`;
  }).join('');
  const sum = z.qids.reduce((s, id) => s + (z.results?.[id] || 0), 0);
  app.innerHTML = `<div class="page">${top('Квіз дня')}<div class="card center">${catSVG(70)}<h3>Сьогодні: ${sum} балів</h3><p class="muted small">Новий квіз — завтра. Розгорнуті відповіді оцінює ${esc(nameOf(p))}.</p></div>${rows}</div>`;
}

// ----- оцінювання відповідей партнера -----
function pendingGrades() {
  return Object.values(S.quizzes).filter((z) => z.about === S.uid && z.done)
    .flatMap((z) => z.qids.filter((q) => z.results?.[q] === null).map((q) => ({ z, q })));
}
function renderGrade() {
  const list = pendingGrades(), me = S.uid;
  app.innerHTML = `<div class="page">${top('Оцінити відповіді')}
    ${!list.length ? `<div class="card center">${catSVG(80)}<p>Все оцінено ✓</p></div>` : ''}
    ${list.map(({ z, q }) => `<div class="card rv"><div class="muted small">${esc(SURVEY_BY_ID[q].q)}</div>
      <div>Твоя відповідь: <b>${esc(ans(me)[q])}</b></div>
      <div>${esc(nameOf(z.guesser))} вгадує: <b>${esc(z.guesses?.[q])}</b></div>
      <div class="row3"><button class="btn sm" data-a="grade" data-z="${z.id}" data-q="${q}" data-p="${PTS.quizFull}">Точно +${PTS.quizFull}</button>
      <button class="btn sm ghost" data-a="grade" data-z="${z.id}" data-q="${q}" data-p="${PTS.quizHalf}">Майже +${PTS.quizHalf}</button>
      <button class="btn sm ghost" data-a="grade" data-z="${z.id}" data-q="${q}" data-p="0">Ні</button></div></div>`).join('')}</div>`;
}
async function grade(el) {
  const z = S.quizzes[el.dataset.z], q = el.dataset.q, pts = Number(el.dataset.p);
  await safe(async () => {
    await updateDoc(doc(db, 'quiz', z.id), { ['results.' + q]: pts });
    await award(`q_${z.id}_${q}`, z.guesser, pts, 'Квіз');
  });
}

// ----- слово дня -----
const KB = ['йцукенгшщзхї', 'фівапролджєґ', '⏎ячсмитьбю⌫'];
function wdState() { return S.wordles[`${today()}_${S.uid}`] || { guesses: [] }; }
function renderWordle() {
  const st = wdState(), answer = wordOfDay(today()), gs = st.guesses || [], p = pUid(), pw = p && S.wordles[`${today()}_${p}`];
  const keyState = {};
  gs.forEach((g) => scoreGuess(g, answer).forEach((v, i) => { keyState[g[i]] = Math.max(keyState[g[i]] ?? -1, v); }));
  let grid = '';
  for (let r = 0; r < 6; r++) {
    const g = gs[r], sc = g ? scoreGuess(g, answer) : null, cur = !g && r === gs.length && !st.done ? S.wCur : '';
    grid += '<div class="wrow">' + Array.from({ length: 5 }, (_, i) => {
      const ch = g ? g[i] : cur[i] || '';
      return `<div class="cell ${sc ? ['s0', 's1', 's2'][sc[i]] : ch ? 'typed' : ''}">${esc(ch)}</div>`;
    }).join('') + '</div>';
  }
  const pStatus = !p ? '' : !pw ? `${esc(nameOf(p))} ще не грав(ла)` : pw.done ? (pw.solved ? `${esc(nameOf(p))} вгадав(ла) за ${pw.guesses.length} 🎉` : `${esc(nameOf(p))} не вгадав(ла)`) : `${esc(nameOf(p))} зараз грає…`;
  const kb = st.done ? '' : KB.map((row) => `<div class="krow">${[...row].map((k) => `<button class="key ${k === '⏎' || k === '⌫' ? 'wide' : ''} ${keyState[k] !== undefined ? 'k' + keyState[k] : ''}" data-a="key" data-k="${k}">${k}</button>`).join('')}</div>`).join('');
  app.innerHTML = `<div class="page">${top('Слово дня')}
    <p class="muted small center-t">Вгадай слово з 5 літер за 6 спроб. 🟩 — літера на місці, 🟨 — є в слові. Бали: ${PTS.wordleBase * 6} за 1 спробу … ${PTS.wordleBase} за 6, +${PTS.wordleFirst} тому, хто вгадав першим.</p>
    <div class="grid">${grid}</div>
    ${st.done ? `<div class="card center">${st.solved ? `🎉 Вгадано! Слово: <b>${answer.toUpperCase()}</b>` : `Слово було: <b>${answer.toUpperCase()}</b>`}<div class="muted small">Нове слово — завтра</div></div>` : ''}
    <div class="muted small center-t">${pStatus}</div>
    <div class="kb">${kb}</div></div>`;
}
async function wordleKey(k) {
  const st = wdState(); if (st.done || S.busy) return;
  if (k === '⌫' || k === 'Backspace') { S.wCur = S.wCur.slice(0, -1); return renderWordle(); }
  if (k === '⏎' || k === 'Enter') {
    if ([...S.wCur].length !== 5) return toast('Потрібно 5 літер');
    const answer = wordOfDay(today()), guesses = [...(st.guesses || []), S.wCur];
    const solved = S.wCur === answer, done = solved || guesses.length >= 6, p = pUid();
    S.wCur = '';
    await safe(async () => {
      await setDoc(doc(db, 'wordle', `${today()}_${S.uid}`), { date: today(), uid: S.uid, guesses, solved, done, ts: Date.now() });
      if (solved) {
        const pw = p && S.wordles[`${today()}_${p}`];
        const bonus = pw?.solved ? 0 : PTS.wordleFirst;
        await award(`w_${today()}_${S.uid}`, S.uid, PTS.wordleBase * (7 - guesses.length) + bonus, 'Слово дня');
        toast(`+${PTS.wordleBase * (7 - guesses.length) + bonus} балів!`);
      }
    });
    return renderWordle();
  }
  const ch = k.toLowerCase();
  if (UA_LETTERS.includes(ch) && ch.length === 1 && [...S.wCur].length < 5) { S.wCur += ch; renderWordle(); }
}
document.addEventListener('keydown', (e) => { if (S.view === 'wordle' && !e.metaKey && !e.ctrlKey) wordleKey(e.key); });

// ----- челенджі -----
function renderChallenges() {
  const w = week(), me = S.uid, p = pUid(), list = weekChallenges(w);
  const mineHtml = list.map((c) => {
    const d = S.challenges[`${w}_${c.id}_${me}`], st = d?.status;
    const badge = st === 'approved' ? `<span class="pts ok">✓ +${c.p}</span>` : st === 'pending' ? '<span class="pts wait">⏳ перевіряє партнер</span>' : st === 'rejected' ? '<span class="pts no">відхилено — спробуй ще</span>' : `<span class="pts">+${c.p}</span>`;
    const open = S.openCh === c.id;
    return `<div class="card ch"><div class="cht"><b>${esc(c.t)}</b>${badge}</div>
      ${!st || st === 'rejected' ? (open ? chForm(c) : `<button class="btn sm" data-a="chOpen" data-c="${c.id}">${c.proof === 'audio' ? 'Виконано! Записати голосове 🎙' : 'Виконано! Додати фото 📷'}</button>`) : ''}
      ${d?.proof === 'audio' && st !== 'rejected' ? `<button class="btn ghost sm" data-a="play" data-id="${d.id}">▶ Послухати своє</button><div id="pl_${d.id}"></div>` : ''}
    </div>`;
  }).join('');
  const toApprove = Object.values(S.challenges).filter((d) => d.uid === p && d.status === 'pending');
  const approveHtml = toApprove.map((d) => {
    const c = list.find((x) => x.id === d.cid) || { t: 'Челендж', p: 0 };
    return `<div class="card ch"><b>${esc(c.t)}</b>${d.photo ? `<img class="ph" src="${esc(d.photo)}" alt="">` : ''}${d.proof === 'audio' ? `<div><button class="btn ghost sm" data-a="play" data-id="${d.id}">▶ Слухати голосове${d.audioDur ? ' (' + fmtDur(d.audioDur) + ')' : ''}</button><div id="pl_${d.id}"></div></div>` : ''}${d.note ? `<p>${esc(d.note)}</p>` : ''}
      <div class="row"><button class="btn ghost sm" data-a="chRej" data-id="${d.id}">Не зараховую</button><button class="btn sm" data-a="chOk" data-id="${d.id}">Зараховую +${c.p}</button></div></div>`;
  }).join('');
  const gallery = Object.values(S.challenges).filter((d) => d.status === 'approved' && d.photo).map((d) => `<img class="thumb ${sideOf(d.uid)}" src="${esc(d.photo)}" alt="">`).join('');
  app.innerHTML = `<div class="page">${top('Челенджі тижня')}
    <p class="muted small center-t">Виконай завдання, додай фото або голосове — партнер підтверджує. Нові челенджі щопонеділка.</p>
    ${toApprove.length ? `<h3 class="sec">🔔 Перевір ${esc(nameOf(p))}</h3>${approveHtml}` : ''}
    <h3 class="sec">Мої завдання</h3>${mineHtml}
    ${gallery ? `<h3 class="sec">Галерея тижня</h3><div class="gallery">${gallery}</div>` : ''}</div>`;
  const f = document.getElementById('chFile');
  if (f) f.onchange = async () => {
    const file = f.files?.[0]; if (!file) return;
    try { S.chPhoto = await compress(file); document.getElementById('chPrev').innerHTML = `<img class="ph" src="${S.chPhoto}" alt="">`; }
    catch { toast('Не вдалося прочитати фото. Спробуй інше.'); }
  };
  const af = document.getElementById('chAudioFile');
  if (af) af.onchange = () => {
    const file = af.files?.[0]; if (!file) return;
    if (file.size > MAX_AUDIO_BYTES) return toast('Файл завеликий (макс. ~4 МБ)');
    setAudio(file, 0); render();
  };
}

// ----- голосові повідомлення -----
const MAX_REC_SEC = 180, MAX_AUDIO_BYTES = 4 * 1024 * 1024, PART = 700000;
const fmtDur = (sec) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
function chForm(c) {
  const note = `<textarea id="chNote" rows="2" placeholder="Коментар (необов'язково)">${esc(S.chNote || '')}</textarea>`;
  const btns = `<div class="row"><button class="btn ghost sm" data-a="chClose">Скасувати</button><button class="btn sm" data-a="chSend" data-c="${c.id}">Надіслати на перевірку</button></div>`;
  if (c.proof !== 'audio') return `<div class="chf"><label class="file">📷 Обрати фото<input type="file" accept="image/*" id="chFile"></label><div id="chPrev"></div>${note}${btns}</div>`;
  const r = S.rec;
  let body;
  if (r?.state === 'rec') body = `<div class="rec"><span class="dot"></span> Запис… <b id="recT">${fmtDur((Date.now() - r.t0) / 1000)}</b> / ${fmtDur(MAX_REC_SEC)}</div><button class="btn sm" data-a="recStop">⏹ Зупинити</button>`;
  else if (S.chAudio) body = `<audio controls src="${S.chAudio.url}"></audio><div class="muted small">Тривалість: ${S.chAudio.dur ? fmtDur(S.chAudio.dur) : '—'}</div><button class="btn ghost sm" data-a="recStart">🎙 Перезаписати</button>`;
  else body = `<button class="btn rec-btn" data-a="recStart">🎙 Почати запис</button><label class="link small">або обрати аудіофайл<input type="file" accept="audio/*" id="chAudioFile" hidden></label>`;
  return `<div class="chf"><div class="muted small">Для цього завдання доказом є голосове повідомлення (до ${MAX_REC_SEC / 60} хв).</div>${body}${note}${btns}</div>`;
}
function setAudio(blob, dur) {
  if (S.chAudio?.url) URL.revokeObjectURL(S.chAudio.url);
  S.chAudio = { blob, dur, url: URL.createObjectURL(blob), type: (blob.type || 'audio/webm').split(';')[0] };
}
function pickMime() {
  if (!window.MediaRecorder) return null;
  for (const m of ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus']) if (!MediaRecorder.isTypeSupported || MediaRecorder.isTypeSupported(m)) return m;
  return '';
}
async function recStart() {
  const mime = pickMime();
  if (mime === null) return toast('Цей браузер не вміє записувати. Обери аудіофайл.');
  S.chNote = document.getElementById('chNote')?.value || '';
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch { return toast('Немає доступу до мікрофона. Дозволь його в налаштуваннях браузера.'); }
  const opts = { audioBitsPerSecond: 32000 }; if (mime) opts.mimeType = mime;
  let mr; try { mr = new MediaRecorder(stream, opts); } catch { mr = new MediaRecorder(stream); }
  const chunks = [];
  mr.ondataavailable = (e) => e.data?.size && chunks.push(e.data);
  mr.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    clearInterval(S.rec?.timer);
    const dur = (Date.now() - S.rec.t0) / 1000, blob = new Blob(chunks, { type: mr.mimeType || mime || 'audio/webm' });
    S.rec = null;
    if (blob.size > MAX_AUDIO_BYTES) { toast('Запис завеликий, спробуй коротше'); return render(); }
    setAudio(blob, dur); render();
  };
  S.rec = { state: 'rec', mr, t0: Date.now() };
  S.rec.timer = setInterval(() => {
    const sec = (Date.now() - S.rec.t0) / 1000, el = document.getElementById('recT');
    if (el) el.textContent = fmtDur(sec);
    if (sec >= MAX_REC_SEC) recStop();
  }, 500);
  mr.start(1000); render();
}
function recStop() { S.chNote = document.getElementById('chNote')?.value || ''; if (S.rec?.mr?.state === 'recording') S.rec.mr.stop(); }
function recCancel() { if (S.rec?.mr?.state === 'recording') { S.rec.mr.onstop = null; S.rec.mr.stream.getTracks().forEach((t) => t.stop()); S.rec.mr.stop(); } clearInterval(S.rec?.timer); S.rec = null; if (S.chAudio?.url) URL.revokeObjectURL(S.chAudio.url); S.chAudio = null; S.chNote = ''; }
const blobToB64 = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
async function playAudio(id) {
  const box = document.getElementById('pl_' + id), d = S.challenges[id]; if (!box || !d) return;
  box.innerHTML = '<span class="muted small">Завантаження…</span>';
  try {
    let b64 = '';
    for (let i = 0; i < (d.audioParts || 0); i++) b64 += (await getDoc(doc(db, 'audio', `${id}_${i}`))).data()?.data || '';
    const bin = atob(b64), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([arr], { type: d.audioType || 'audio/webm' }));
    box.innerHTML = `<audio controls autoplay src="${url}"></audio>`;
  } catch (e) { console.error(e); box.innerHTML = '<span class="err">Не вдалося завантажити запис</span>'; }
}
async function compress(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    let max = 1000, q = 0.72, out = '';
    for (let k = 0; k < 6; k++) {
      const sc = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      out = c.toDataURL('image/jpeg', q);
      if (out.length < 700000) break;
      max *= 0.8; q = Math.max(0.4, q - 0.08);
    }
    return out;
  } finally { URL.revokeObjectURL(url); }
}
async function chSend(cid) {
  const c = weekChallenges(week()).find((x) => x.id === cid), audio = c?.proof === 'audio';
  if (audio && S.rec) return toast('Спершу зупини запис');
  if (audio ? !S.chAudio : !S.chPhoto) return toast(audio ? 'Запиши голосове повідомлення' : 'Додай фото-підтвердження');
  const w = week(), id = `${w}_${cid}_${S.uid}`, note = document.getElementById('chNote')?.value.trim() || '';
  await safe(async () => {
    const data = { week: w, cid, uid: S.uid, note, status: 'pending', ts: Date.now() };
    if (audio) {
      toast('Надсилаю голосове…');
      const b64 = await blobToB64(S.chAudio.blob), n = Math.ceil(b64.length / PART);
      for (let i = 0; i < n; i++) await setDoc(doc(db, 'audio', `${id}_${i}`), { data: b64.slice(i * PART, (i + 1) * PART) });
      Object.assign(data, { proof: 'audio', audioParts: n, audioType: S.chAudio.type, audioDur: Math.round(S.chAudio.dur || 0) });
    } else data.photo = S.chPhoto;
    await setDoc(doc(db, 'challenges', id), data);
    recCancel(); S.openCh = null; S.chPhoto = null; toast('Надіслано на перевірку 💌');
    notify(pUid(), '📸 Челендж на перевірку', `${nameOf(S.uid)} виконав(ла) челендж — зарахуй!`);
  });
  render();
}
async function chDecide(id, ok) {
  const d = S.challenges[id]; if (!d) return;
  const c = weekChallenges(d.week).find((x) => x.id === d.cid);
  await safe(async () => {
    await updateDoc(doc(db, 'challenges', id), { status: ok ? 'approved' : 'rejected' });
    if (ok && c) await award(`ch_${id}`, d.uid, c.p, 'Челендж');
  });
}

// ----- ранги та сезони -----
function renderRanks() {
  const { all, byWeek } = totals(), me = S.uid, p = pUid(), w = week();
  const card = (uid) => {
    const t = all[uid] || 0, r = rankFor(t), pr = r.next ? Math.round(((t - r.min) / (r.next.min - r.min)) * 100) : 100;
    return `<div class="card rc ${sideOf(uid)}"><div class="big">${r.icon}</div><b>${esc(uid === me ? 'Ти' : nameOf(uid))}</b><div>${esc(r.name)}</div>
      <div class="bar"><i style="width:${pr}%"></i></div><div class="muted small">${t} балів${r.next ? ` · до «${esc(r.next.name)}» ${r.next.min - t}` : ' · максимальний ранг!'}</div></div>`;
  };
  const weeks = Object.keys(byWeek).filter((x) => x < w).sort().reverse();
  const hist = weeks.map((x) => {
    const t = byWeek[x], a = t[me] || 0, b = p ? t[p] || 0 : 0, win = a === b ? 'Нічия' : a > b ? 'Ти' : nameOf(p);
    return `<div class="card hist"><div><b>${weekLabel(x)}</b><div class="muted small">🎁 ${esc(S.rewards[x]?.text || 'без нагороди')}</div></div><div class="right">🏆 ${esc(win)}<div class="muted small">${a} : ${b}</div></div></div>`;
  }).join('');
  app.innerHTML = `<div class="page">${top('Ранги й сезони')}
    <div class="rcs">${card(me)}${p ? card(p) : ''}</div>
    <h3 class="sec">Драбина рангів</h3><div class="card ladder">${RANKS.map((r) => `<div>${r.icon} ${esc(r.name)} <span class="muted">від ${r.min}</span></div>`).join('')}</div>
    <h3 class="sec">Минулі сезони</h3>${hist || '<p class="muted small">Перший сезон ще триває.</p>'}
    <div class="card"><b>Як заробляти бали</b><div class="muted small">Опитування +${PTS.survey} · Квіз до +${PTS.quizFull} за питання · Слово дня до +${PTS.wordleBase * 6 + PTS.wordleFirst} · Челенджі +20…50</div></div>
    <div class="card"><b>🔔 Сповіщення на телефон</b>
      <ol class="small steps"><li>Встанови застосунок <b>ntfy</b> (App Store / Google Play).</li><li>У ntfy натисни <b>+</b> і введи назву каналу (сервер — стандартний ntfy.sh):</li></ol>
      <div class="topic"><code id="myTopic">${esc(S.users[S.uid]?.ntfy || '…')}</code><button class="btn ghost sm" data-a="copyTopic">Копіювати</button></div>
      <p class="muted small">Прийдуть: виклики на дуель, подарунки, челенджі й відповіді на перевірку. Натисни на сповіщення — відкриється гра.</p>
      <button class="btn ghost sm" data-a="testPush">Надіслати тестове собі</button></div>
    <button class="btn ghost" data-a="logout">Вийти з акаунта</button></div>`;
}

// ----- нагорода -----
function renderReward() {
  const w = week(), r = S.rewards[w];
  app.innerHTML = `<div class="page">${top('Нагорода тижня')}<div class="card">
    <p>Що отримає переможець цього сезону (${weekLabel(w)})?</p>
    <textarea id="rwIn" rows="3" placeholder="Наприклад: сніданок у ліжко">${esc(r?.text || '')}</textarea>
    ${r ? `<p class="muted small">Вписав(ла): ${esc(r.by === S.uid ? 'ти' : nameOf(r.by))}</p>` : ''}
    <button class="btn" data-a="rwSave">Зберегти</button></div></div>`;
}

// «Дві половинки» завантажується лише при вході (3D-бібліотека не гальмує решту гри)
let coopMod = null;
const COOP_UNLOCK = RANKS.find((r) => r.name === 'Королівська висловуха').min;
function coopUnlocked() { const t = totals().all, p = pUid(); return { ok: !!p && (t[S.uid] || 0) >= COOP_UNLOCK && (t[p] || 0) >= COOP_UNLOCK, mine: t[S.uid] || 0, his: p ? t[p] || 0 : 0 }; }
function renderCoop() {
  const u = coopUnlocked();
  if (!u.ok) {
    const row = (n, v) => `<div class="lockrow"><b>${esc(n)}</b><div class="bar"><i style="width:${Math.min(100, (v / COOP_UNLOCK) * 100)}%"></i></div>${v}/${COOP_UNLOCK}</div>`;
    app.innerHTML = `<div class="page">${top('Дві половинки')}<div class="card center">${catSVG(90)}<h3>Відкривається з рангу «Королівська висловуха» 👑</h3>
      <p class="muted">Великий 3D-квест удвох. Обом гравцям потрібно щонайменше ${COOP_UNLOCK} балів.</p>${row('Ти', u.mine)}${row(nameOf(pUid()), u.his)}</div></div>`;
    return;
  }
  import('./coop.js').then((m) => { coopMod = m; if (S.view === 'coop') m.enterCoop(api); }).catch((e) => { console.error(e); toast('Не вдалося завантажити гру'); S.view = 'home'; render(); }); }

// ---------- дії ----------
function notify(uid, title, msg) { return sendPush(S.users[uid]?.ntfy, title, msg); }
const actions = {
  ...duelActions, ...shopActions, ...workshopActions, ...triviaActions, ...roomActions,
  copyTopic: () => { const t = S.users[S.uid]?.ntfy || ''; navigator.clipboard?.writeText(t).then(() => toast('Скопійовано ✓'), () => toast(t)); },
  testPush: () => { notify(S.uid, '🐱 Мур!', 'Сповіщення працюють 💕'); toast('Надіслано — перевір ntfy'); },
  go: (el) => { const to = el.dataset.to; if (S.view === 'coop' && to !== 'coop') coopMod?.leaveCoop(); recCancel(); resetWorkshop(); S.openCh = null; S.roomEdit = null; S.roomUnbox = null; S.roomPick = false; if (to === 'room') S.roomOf = null; if (to === 'quiz') openQuiz(); else { S.view = to; if (to === 'wordle') S.wCur = ''; } render(); },
  logout: () => signOut(auth),
  authMode: () => { S.authMode = S.authMode === 'login' ? 'register' : 'login'; S.authErr = ''; renderAuth(); },
  pick: (el) => {
    if (S.view === 'survey') { S.draft[SURVEY[S.sIdx].id] = el.dataset.v; }
    else if (S.view === 'quiz') { S.qGuess[S.quiz.qids[S.qIdx]] = el.dataset.v; }
    el.parentElement.querySelectorAll('.sel').forEach((b) => b.classList.remove('sel')); el.classList.add('sel');
  },
  sNext: surveyNext,
  sPrev: () => { S.sIdx = Math.max(0, S.sIdx - 1); render(); },
  qNext: quizNext,
  grade,
  key: (el) => wordleKey(el.dataset.k),
  chOpen: (el) => { recCancel(); S.openCh = el.dataset.c; S.chPhoto = null; render(); },
  chClose: () => { recCancel(); S.openCh = null; S.chPhoto = null; render(); },
  recStart, recStop: () => recStop(),
  play: (el) => playAudio(el.dataset.id),
  chSend: (el) => chSend(el.dataset.c),
  chOk: (el) => chDecide(el.dataset.id, true),
  chRej: (el) => chDecide(el.dataset.id, false),
  rwSave: async () => {
    const text = document.getElementById('rwIn').value.trim();
    await safe(() => setDoc(doc(db, 'rewards', week()), { text, by: S.uid, ts: Date.now() }));
    S.view = 'home'; render();
  },
};
app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  e.preventDefault(); actions[el.dataset.a]?.(el);
});

// ---------- спільні функції для модулів дуелей і магазину ----------
const api = { S, db, fb, doc, getDoc, setDoc, updateDoc, arrayUnion, increment, award, addPoints, app, esc, toast, safe, render, top, catSVG, nameOf, sideOf, ans, pUid, totals, today, week, notify };
initDuels(api); initShop(api); initWorkshop(api); initTrivia(api); initRoom(api);
