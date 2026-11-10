// ===== Мурчики: сезон кохання — основна логіка =====
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, setDoc, updateDoc, onSnapshot, collection, query, where } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig } from './config.js';
import { SURVEY, RANKS, PTS } from './data.js';
import { kyivDate, weekId, weekLabel, timeLeftInWeek, wordOfDay, scoreGuess, UA_LETTERS, weekChallenges, quizQuestions, hasAnswer, autoGrade, rankFor } from './util.js';

const app = document.getElementById('app');
const fb = initializeApp(firebaseConfig);
const auth = getAuth(fb);
const db = getFirestore(fb);

const S = {
  uid: null, registering: false, users: {}, surveys: {}, points: [], rewards: {}, quizzes: {}, wordles: {}, challenges: {},
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
async function safe(fn) {
  if (S.busy) return; S.busy = true;
  try { await fn(); } catch (e) { console.error(e); toast('Помилка: ' + (e.code || e.message || 'невідома')); }
  finally { S.busy = false; }
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
  Object.assign(S, { uid: user?.uid || null, users: {}, surveys: {}, points: [], rewards: {}, quizzes: {}, wordles: {}, challenges: {}, loaded: new Set(), denied: false });
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
const LIVE = new Set(['home', 'ranks', 'grade', 'wordle']);
function onData() {
  if (S.loaded.size < 7) return;
  if (S.view === 'loading') {
    if (!surveyDone(S.uid)) startSurvey(); else S.view = 'home';
    render(); return;
  }
  if (LIVE.has(S.view) || (S.view === 'challenges' && !S.openCh)) render();
}

// ---------- рендер ----------
function render() {
  if (S.denied) return renderDenied();
  const v = { loading: renderLoading, auth: renderAuth, survey: renderSurvey, home: renderHome, quiz: renderQuiz, grade: renderGrade, wordle: renderWordle, challenges: renderChallenges, ranks: renderRanks, reward: renderReward }[S.view];
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
    <header class="hello">${catSVG(56)}<div><div class="muted small">Привіт,</div><b class="big">${esc(nameOf(me))}</b></div><button class="rk" data-a="go" data-to="ranks">${rk.icon}</button></header>
    ${!p ? `<div class="note">Партнер(ка) ще не зареєструвався(лась). Надішли їй (йому) посилання на гру ${heart}</div>` : !partnerReady ? `<div class="note">Чекаємо, поки ${esc(nameOf(p))} пройде опитування — тоді відкриється квіз.</div>` : ''}
    <section class="card score">
      <div class="muted small center-t">Сезон: ${weekLabel(w)} · до фіналу ${timeLeftInWeek()}</div>
      <div class="vs">${side(me, mine)}<div class="vsx">VS</div>${p ? side(p, theirs) : '<div class="pl"><div class="pn">?</div><div class="pp">0</div></div>'}</div>
      <button class="reward" data-a="go" data-to="reward">🎁 Нагорода тижня: <b>${reward ? esc(reward) : 'ще не обрано — натисни, щоб вписати'}</b></button>
    </section>
    ${toCheck ? `<button class="alert" data-a="go" data-to="${pendingGrades().length ? 'grade' : 'challenges'}">🔔 Потрібна твоя перевірка: ${toCheck}</button>` : ''}
    <div class="tiles">
      ${tile('quiz', '💭', 'Квіз дня', !partnerReady ? 'чекає партнера' : qz?.done ? 'пройдено ✓' : 'хто краще знає?')}
      ${tile('wordle', '🔤', 'Слово дня', wd?.done ? (wd.solved ? `вгадано за ${wd.guesses.length} ✓` : 'не вгадано') : 'вгадай слово')}
      ${tile('challenges', '📸', 'Челенджі тижня', `${myDone} з ${chs.length}`)}
      ${tile('grade', '✍️', 'Оцінити відповіді', pendingGrades().length ? `${pendingGrades().length} чекає` : 'все оцінено')}
      ${tile('ranks', '🏆', 'Ранги й сезони', `${rk.icon} ${rk.name}`)}
      <div class="tile locked"><span class="ti">⚡</span><b>Дуелі наживо</b><span class="ts">скоро</span></div>
      <div class="tile locked"><span class="ti">🎨</span><b>Малюй і вгадуй</b><span class="ts">скоро</span></div>
      <div class="tile locked wide"><span class="ti">🧩</span><b>Дві половинки — кооперативний фінал</b><span class="ts">скоро</span></div>
    </div></div>`;
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
      ${!st || st === 'rejected' ? (open ? `<div class="chf"><label class="file">📷 Обрати фото<input type="file" accept="image/*" id="chFile"></label><div id="chPrev"></div>
        <textarea id="chNote" rows="2" placeholder="Коментар (необов'язково)"></textarea>
        <div class="row"><button class="btn ghost sm" data-a="chClose">Скасувати</button><button class="btn sm" data-a="chSend" data-c="${c.id}">Надіслати на перевірку</button></div></div>`
        : `<button class="btn sm" data-a="chOpen" data-c="${c.id}">Виконано! Додати фото</button>`) : ''}
    </div>`;
  }).join('');
  const toApprove = Object.values(S.challenges).filter((d) => d.uid === p && d.status === 'pending');
  const approveHtml = toApprove.map((d) => {
    const c = list.find((x) => x.id === d.cid) || { t: 'Челендж', p: 0 };
    return `<div class="card ch"><b>${esc(c.t)}</b>${d.photo ? `<img class="ph" src="${esc(d.photo)}" alt="">` : ''}${d.note ? `<p>${esc(d.note)}</p>` : ''}
      <div class="row"><button class="btn ghost sm" data-a="chRej" data-id="${d.id}">Не зараховую</button><button class="btn sm" data-a="chOk" data-id="${d.id}">Зараховую +${c.p}</button></div></div>`;
  }).join('');
  const gallery = Object.values(S.challenges).filter((d) => d.status === 'approved' && d.photo).map((d) => `<img class="thumb ${sideOf(d.uid)}" src="${esc(d.photo)}" alt="">`).join('');
  app.innerHTML = `<div class="page">${top('Челенджі тижня')}
    <p class="muted small center-t">Виконай завдання, додай фото — партнер підтверджує. Нові челенджі щопонеділка.</p>
    ${toApprove.length ? `<h3 class="sec">🔔 Перевір ${esc(nameOf(p))}</h3>${approveHtml}` : ''}
    <h3 class="sec">Мої завдання</h3>${mineHtml}
    ${gallery ? `<h3 class="sec">Галерея тижня</h3><div class="gallery">${gallery}</div>` : ''}</div>`;
  const f = document.getElementById('chFile');
  if (f) f.onchange = async () => {
    const file = f.files?.[0]; if (!file) return;
    try { S.chPhoto = await compress(file); document.getElementById('chPrev').innerHTML = `<img class="ph" src="${S.chPhoto}" alt="">`; }
    catch { toast('Не вдалося прочитати фото. Спробуй інше.'); }
  };
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
  if (!S.chPhoto) return toast('Додай фото-підтвердження');
  const w = week(), note = document.getElementById('chNote')?.value.trim() || '';
  await safe(async () => {
    await setDoc(doc(db, 'challenges', `${w}_${cid}_${S.uid}`), { week: w, cid, uid: S.uid, photo: S.chPhoto, note, status: 'pending', ts: Date.now() });
    S.openCh = null; S.chPhoto = null; toast('Надіслано на перевірку 💌');
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

// ---------- дії ----------
const actions = {
  go: (el) => { const to = el.dataset.to; S.openCh = null; if (to === 'quiz') openQuiz(); else { S.view = to; if (to === 'wordle') S.wCur = ''; } render(); },
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
  chOpen: (el) => { S.openCh = el.dataset.c; S.chPhoto = null; render(); },
  chClose: () => { S.openCh = null; S.chPhoto = null; render(); },
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
