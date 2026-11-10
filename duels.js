// ===== Дуелі наживо: виклики, гра наживо або пізніше, підрахунок балів =====
import { GAMES, GAME_IDS } from './games.js';
import { dayNum, shuffle, rng, hash, rankFor } from './util.js';

export const UNLOCK = 200; // ранг «Муркотун»
const FULL = { win: 60, draw: 30, part: 10 }, REPEAT = { win: 20, draw: 10, part: 3 }; // повтори — 1/3
const WAIT_MS = 2 * 60 * 1000;

export function dailyDuels(date) {
  const n = dayNum(date), order = shuffle(GAME_IDS, 'duel' + Math.floor(n / 7));
  return order.slice((n % 7) * 3, (n % 7) * 3 + 3);
}

let A; // api з app.js
export function initDuels(api) { A = api; }

const S = () => A.S;
const me = () => A.S.uid;
const dRef = (id) => A.doc(A.db, 'duels', id);
const kindLabel = (g) => (g.kind === 'sim' ? '⚡ одночасно' : g.live ? '🔄 по черзі, наживо' : '✍️ етапами');
const canAsync = (g) => g.kind === 'sim' || g.live === false;

export function unlocked() {
  const t = A.totals().all, p = A.pUid();
  return { ok: !!p && (t[me()] || 0) >= UNLOCK && (t[p] || 0) >= UNLOCK, mine: t[me()] || 0, his: p ? t[p] || 0 : 0 };
}

// ---------- підрахунок результату ----------
function outcome(d) {
  const g = GAMES[d.game]; if (!g) return null;
  if (g.kind === 'sim') {
    const a = d.res?.[d.from], b = d.res?.[d.to]; if (!a || !b) return null;
    const sa = a.void ? -1e9 : a.score, sb = b.void ? -1e9 : b.score;
    if (Math.abs(sa - sb) < 1e-9) return { winner: null };
    const aBetter = g.better === 'high' ? sa > sb : sa < sb;
    return { winner: aBetter ? d.from : d.to };
  }
  const r = g.result(d.state || {}, d.from, d.to); return r.done ? { winner: r.winner || null } : null;
}
function repIndex(d, uid) {
  const list = Object.values(S().duels).filter((x) => x.date === d.date && x.game === d.game && (x.from === uid || x.to === uid) && !['declined', 'cancelled'].includes(x.status))
    .sort((x, y) => x.createdAt - y.createdAt || (x.id < y.id ? -1 : 1));
  return Math.max(0, list.findIndex((x) => x.id === d.id));
}
const tier = (d, uid) => (repIndex(d, uid) === 0 ? FULL : REPEAT);
const pts = (id, uid, amount, reason) => A.setDoc(A.doc(A.db, 'points', id), { uid, amount, reason, date: A.today(), week: A.week(), ts: Date.now() });

export async function settle(d) {
  const o = outcome(d); if (!o) return;
  const same = d.final && d.final.winner === o.winner;
  if (!same) await A.updateDoc(dRef(d.id), { final: { winner: o.winner, at: Date.now() } });
  if (same && d.final.paid) return;
  for (const uid of [d.from, d.to]) {
    const t = tier(d, uid), extra = o.winner === null ? t.draw - t.part : o.winner === uid ? t.win - t.part : 0;
    await pts(`d_${d.id}_${uid}_p`, uid, t.part, 'Дуель');
    await pts(`d_${d.id}_${uid}_w`, uid, extra, 'Дуель');
  }
  await A.updateDoc(dRef(d.id), { 'final.paid': true });
}

// ---------- дії ----------
async function invite(game) {
  const p = A.pUid(), id = `${A.today()}_${game}_${Date.now().toString(36)}`;
  const d = { date: A.today(), game, from: me(), to: p, status: 'invited', seed: Math.floor(Math.random() * 2 ** 31), createdAt: Date.now(), res: {} };
  const g = GAMES[game]; if (g.kind === 'turn') d.state = g.init(rng(d.seed), me(), p);
  await A.setDoc(dRef(id), d);
  A.notify(p, '⚔️ Тебе викликали на дуель!', `${A.nameOf(me())} кличе на «${g.name}». Відкрий гру, щоб прийняти.`);
  S().duelId = id; S().view = 'duel'; A.render();
}
async function accept(id) {
  const d = S().duels[id], upd = { status: 'accepted', startAt: Date.now() + 5000, acceptedAt: Date.now() };
  if (d?.state) { const st = JSON.parse(JSON.stringify(d.state)); st.last = Date.now(); if (st.deadline) st.deadline = Date.now() + 25000; upd.state = st; }
  await A.updateDoc(dRef(id), upd);
  S().duelId = id; S().view = 'duel'; A.render();
}
export async function act(d, fn) {
  const st = JSON.parse(JSON.stringify(S().duels[d.id]?.state || {}));
  fn(st);
  await A.updateDoc(dRef(d.id), { state: st });
}

// ---------- екрани ----------
export function renderDuels() {
  const u = unlocked();
  if (!u.ok) {
    A.app.innerHTML = `<div class="page">${A.top('Дуелі наживо')}<div class="card center">${A.catSVG(90)}
      <h3>Відкривається з рангу «Муркотун»</h3><p class="muted">Обом гравцям потрібно щонайменше ${UNLOCK} балів.</p>
      <div class="lockrow"><b>Ти</b><div class="bar"><i style="width:${Math.min(100, (u.mine / UNLOCK) * 100)}%"></i></div>${u.mine}/${UNLOCK}</div>
      <div class="lockrow"><b>${A.esc(A.nameOf(A.pUid()))}</b><div class="bar"><i style="width:${Math.min(100, (u.his / UNLOCK) * 100)}%"></i></div>${u.his}/${UNLOCK}</div></div></div>`;
    return;
  }
  const ids = dailyDuels(A.today()), all = Object.values(S().duels).sort((a, b) => b.createdAt - a.createdAt);
  const mine = (gid) => all.filter((d) => d.game === gid && d.final);
  const cards = ids.map((gid) => {
    const g = GAMES[gid], played = mine(gid), wins = played.filter((d) => d.final.winner === me()).length;
    return `<div class="card duel-c"><div class="dc-top"><span class="dc-ico">${g.icon}</span><div><b>${A.esc(g.name)}</b><div class="muted small">${kindLabel(g)}</div></div></div>
      <p class="small">${A.esc(g.desc)}</p><div class="row"><span class="muted small">${played.length ? `Зіграно: ${played.length}, перемог: ${wins}` : 'Сьогодні ще не грали'}</span>
      <button class="btn sm" data-a="dInvite" data-g="${gid}">Викликати ⚔️</button></div></div>`;
  }).join('');
  const act = all.filter((d) => !d.final && !['declined', 'cancelled'].includes(d.status));
  const done = all.filter((d) => d.final).slice(0, 10);
  const row = (d) => { const g = GAMES[d.game], inc = d.to === me() && d.status === 'invited';
    const st = d.final ? (d.final.winner === null ? '🤝 нічия' : d.final.winner === me() ? '🏆 перемога' : '😿 поразка') : inc ? '📩 тебе викликали' : d.status === 'invited' ? '⏳ чекає' : '🎮 триває';
    return `<button class="hist-row" data-a="dOpen" data-id="${d.id}"><span>${g?.icon || '⚔️'} ${A.esc(g?.name || d.game)}</span><span>${st}</span></button>`; };
  A.app.innerHTML = `<div class="page">${A.top('Дуелі наживо')}
    <p class="muted small center-t">3 дуелі на день, щодня нові. Перша гра кожної дуелі: перемога +${FULL.win}, нічия +${FULL.draw}, участь +${FULL.part}. Повтори — третина.</p>
    ${act.length ? `<h3 class="sec">Активні</h3>${act.map(row).join('')}` : ''}
    <h3 class="sec">Сьогоднішні дуелі</h3>${cards}
    ${done.length ? `<h3 class="sec">Результати за сьогодні</h3>${done.map(row).join('')}` : ''}</div>`;
}

let running = null, stallT = 0, countT = 0; // поточна одночасна гра (щоб не перемальовувати під час гри)
export const isPlaying = () => !!running;

export function renderDuel() {
  const d = S().duels[S().duelId];
  if (!d) { A.app.innerHTML = `<div class="page">${A.top('Дуель')}<p>Дуель не знайдено.</p></div>`; return; }
  const g = GAMES[d.game], p = d.from === me() ? d.to : d.from, pn = A.esc(A.nameOf(p));
  const head = `<div class="page">${A.top(`${g.icon} ${A.esc(g.name)}`)}<div class="vs mini"><div class="pl ${A.sideOf(me())}"><div class="pn">Ти</div></div><div class="vsx">VS</div><div class="pl ${A.sideOf(p)}"><div class="pn">${pn}</div></div></div>`;
  const out = (html) => { A.app.innerHTML = head + html + '</div>'; };
  if (d.status === 'declined' || d.status === 'cancelled') return out(`<div class="card center"><p>${d.status === 'declined' ? `${pn} відхилив(ла) виклик` : 'Дуель скасовано'}.</p></div>`);
  if (d.final) return out(resultHTML(d, g, p, pn));

  // запрошення
  if (d.status === 'invited' && d.to === me()) {
    return out(`<div class="card center"><p>${A.esc(A.nameOf(d.from))} викликає тебе на дуель!</p><p class="small muted">${A.esc(g.desc)}</p>
      <div class="row"><button class="btn ghost" data-a="dDecline" data-id="${d.id}">Відхилити</button><button class="btn" data-a="dAccept" data-id="${d.id}">Прийняти ⚔️</button></div></div>`);
  }
  const myRes = d.res?.[me()];
  if (d.status === 'invited' && d.from === me() && !d.async) {
    const waited = Date.now() - d.createdAt, left = Math.max(0, Math.ceil((WAIT_MS - waited) / 1000));
    setTimeout(() => { if (S().view === 'duel' && S().duelId === d.id && !running) renderDuel(); }, left > 0 ? 1000 : 5000);
    return out(`<div class="card center">${A.catSVG(70, 'bob')}<p>Чекаємо, поки ${pn} прийме виклик…</p><p class="muted small">Сповіщення надіслано.</p>
      ${left > 0 ? `<p class="muted small">${canAsync(g) ? `Зіграти без партнера можна через ${left} с` : ''}</p>` : canAsync(g) ? `<button class="btn" data-a="dAsync" data-id="${d.id}">Зіграти зараз — ${pn} зіграє пізніше</button>` : '<p class="muted small">Ця гра лише наживо.</p>'}
      <button class="link" data-a="dCancel" data-id="${d.id}">Скасувати виклик</button></div>`);
  }

  // покрокові
  if (g.kind === 'turn') {
    const keep = {}; document.querySelectorAll('#gArea input').forEach((i) => { if (i.id) keep[i.id] = i.value; else if (i.type === 'radio' && i.checked) keep['r_' + i.value] = true; });
    out('<div id="gArea" class="card g-area"></div>');
    g.view(document.getElementById('gArea'), turnCtx(d, p));
    document.querySelectorAll('#gArea input').forEach((i) => { if (i.id && keep[i.id] !== undefined && !i.value) i.value = keep[i.id]; if (i.type === 'radio' && keep['r_' + i.value]) i.checked = true; });
    clearTimeout(stallT); stallT = setTimeout(() => { if (S().view === 'duel' && S().duelId === d.id) renderDuel(); }, 30000);
    return;
  }

  // одночасні
  if (myRes) return out(`<div class="card center"><p>Твій результат: <b>${g.fmt(myRes.score)}</b></p><p class="muted">Чекаємо результат ${pn}…</p>${A.catSVG(60, 'bob')}</div>`);
  const startAt = d.startAt && !d.async ? d.startAt : 0;
  out(`<div id="gArea" class="card g-area"><p class="small">${A.esc(g.desc)}</p><div class="g-count" id="gc"></div><button class="btn" id="gStart">${startAt > Date.now() ? 'Готуємось…' : 'Почати!'}</button></div>`);
  const btn = document.getElementById('gStart');
  const begin = () => { clearInterval(countT); const area = document.getElementById('gArea'); if (area && S().duelId === d.id) runSim(d, g, area); };
  clearInterval(countT);
  if (startAt > Date.now()) {
    btn.disabled = true;
    countT = setInterval(() => { const s = Math.ceil((startAt - Date.now()) / 1000), el = document.getElementById('gc'); if (el) el.textContent = s > 0 ? s : ''; if (s <= 0) begin(); }, 200);
  } else btn.onclick = begin;
}

async function runSim(d, g, area) {
  if (running) return; running = d.id;
  area.innerHTML = '<div class="g-play" id="gp"></div>';
  const r = await g.play(document.getElementById('gp'), { rng: rng(d.seed >>> 0 || hash(d.id)), partnerAnswers: A.ans(d.from === me() ? d.to : d.from), partnerName: A.nameOf(d.from === me() ? d.to : d.from) });
  running = null;
  if (S().duelId !== d.id) return; // гравець пішов з екрана
  const res = { score: r.score, at: Date.now() }; if (r.word !== undefined) res.word = r.word;
  await A.updateDoc(dRef(d.id), { ['res.' + me()]: res });
  const fresh = S().duels[d.id] || d;
  await pts(`d_${d.id}_${me()}_p`, me(), tier(fresh, me()).part, 'Дуель');
  await settle(S().duels[d.id] || fresh);
  renderDuel();
}

const turnCtxs = {};
function turnCtx(d, p) {
  const c = turnCtxs[d.id] || (turnCtxs[d.id] = {});
  Object.assign(c, { state: d.state || {}, me: me(), op: p, myName: A.nameOf(me()), opName: A.nameOf(p), act: (fn) => act(d, fn), rerender: () => renderDuel() });
  return c;
}

function resultHTML(d, g, p, pn) {
  const w = d.final.winner, t = tier(d, me()), my = w === null ? t.draw : w === me() ? t.win : t.part;
  const title = w === null ? '🤝 Нічия!' : w === me() ? '🏆 Перемога!' : `😿 Переміг(ла) ${pn}`;
  let det = '';
  if (g.kind === 'sim') {
    const a = d.res[me()], b = d.res[p];
    det = `<div class="res-grid"><div><div class="muted small">Ти</div><b>${a.void ? 'анульовано' : g.fmt(a.score)}</b>${a.word ? `<div>«${A.esc(a.word)}»</div>` : ''}</div>
      <div><div class="muted small">${pn}</div><b>${b.void ? 'анульовано' : g.fmt(b.score)}</b>${b.word ? `<div>«${A.esc(b.word)}»</div>` : ''}
      ${g.challengeable && b.word && !b.void ? `<button class="link small" data-a="dVoid" data-id="${d.id}">Такого слова немає</button>` : ''}</div></div>`;
  } else if (d.state?.note) det = `<p class="muted small">${A.esc(d.state.note)}</p>`;
  return `<div class="card center"><h2>${title}</h2>${det}<p>Тобі: <b>+${my}</b> ${repIndex(d, me()) ? '<span class="muted small">(повторна гра — 1/3)</span>' : ''}</p>
    <div class="row"><button class="btn ghost" data-a="go" data-to="duels">До дуелей</button><button class="btn" data-a="dInvite" data-g="${d.game}">Реванш ⚔️</button></div></div>`;
}

// ---------- смуга вхідного виклику (на будь-якому екрані) ----------
export function inviteBar() {
  let bar = document.getElementById('inviteBar');
  const d = Object.values(S().duels).filter((x) => x.to === me() && x.status === 'invited' && Date.now() - x.createdAt < 6 * 3600e3).sort((a, b) => b.createdAt - a.createdAt)[0];
  if (!d || (S().view === 'duel' && S().duelId === d.id) || !S().uid) { bar?.remove(); return; }
  if (!bar) { bar = document.createElement('div'); bar.id = 'inviteBar'; document.body.appendChild(bar); }
  bar.innerHTML = `<span>⚔️ ${A.esc(A.nameOf(d.from))} кличе на «${A.esc(GAMES[d.game]?.name || '')}»</span><button data-id="${d.id}" id="ibGo">Відкрити</button>`;
  bar.querySelector('#ibGo').onclick = () => { S().duelId = d.id; S().view = 'duel'; A.render(); };
}

export const duelActions = {
  dInvite: (el) => A.safe(() => invite(el.dataset.g)),
  dOpen: (el) => { S().duelId = el.dataset.id; S().view = 'duel'; A.render(); },
  dAccept: (el) => A.safe(() => accept(el.dataset.id)),
  dDecline: (el) => A.safe(async () => { await A.updateDoc(dRef(el.dataset.id), { status: 'declined' }); S().view = 'duels'; A.render(); }),
  dCancel: (el) => A.safe(async () => { await A.updateDoc(dRef(el.dataset.id), { status: 'cancelled' }); S().view = 'duels'; A.render(); }),
  dAsync: (el) => A.safe(async () => { await A.updateDoc(dRef(el.dataset.id), { async: true }); renderDuel(); }),
  dVoid: (el) => A.safe(async () => {
    const d = S().duels[el.dataset.id], p = d.from === me() ? d.to : d.from;
    await A.updateDoc(dRef(d.id), { [`res.${p}.void`]: true, 'final.paid': false });
  }),
};

// викликається з app.js при кожному оновленні дуелей
export function onDuelsUpdate() {
  for (const d of Object.values(S().duels)) {
    if ((d.from === me() || d.to === me()) && !['declined', 'cancelled'].includes(d.status)) {
      const o = outcome(d);
      if (o && (!d.final || d.final.winner !== o.winner || !d.final.paid)) settle(d).catch(() => {});
    }
  }
  inviteBar();
}
export { rankFor };
