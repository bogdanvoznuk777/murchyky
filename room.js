// ===== Кімната котика: облаштування, магазин меблів, гості, подарунки, бонуси за набори =====
// Дані: rooms/{uid} = { owned[], layout[{i,x,f,p}], paper, flooring, view, gifts[{item,from,ts}], visit{by,at}, note{text,by,at,seen}, liked, likes, pushAt }
// Записи: збереження кімнати — 1; візит — 1 (не частіше ніж раз на 10 хв); 💕 — 1 + бали; записка — 1; покупка — 2.
import { RITEMS, SETS, SET_ITEMS, FREE, LEVELS, VIEWS, SHELF_LEVEL, DEFAULT_ROOM, ROOM_H, WALL_H, FLOOR_Y, BASE_W, FX_MIN_PLACED, cosyOf, levelOf, viewOk, setDone, itemSVG, litSVG, dayPhase, season } from './roomitems.js';
import { ITEMS, portrait } from './avatar.js';
import { avOf, wallet } from './shop.js';
import { mountCat } from './cat.js';
import { shuffle } from './util.js';

let A;
export function initRoom(api) { A = api; }
const S = () => A.S;
const me = () => A.S.uid;
const roomRef = (uid) => A.doc(A.db, 'rooms', uid);
const CAT_W = 105; // ширина котика в кімнаті, одиниць
const LIKE_PTS = 10, PUSH_GAP = 3600e3, VISIT_GAP = 600e3;

// Кімната гравця з усіма типовими значеннями
export function roomOf(uid) {
  const r = S().rooms?.[uid] || {};
  const owned = [...new Set([...FREE, ...(r.owned || [])])].filter((id) => RITEMS[id]);
  const layout = (r.layout || DEFAULT_ROOM.layout).filter((e) => owned.includes(e.i) && RITEMS[e.i]?.svg);
  return { ...DEFAULT_ROOM, ...r, owned, layout, gifts: r.gifts || [] };
}
const lvlOf = (uid) => levelOf(cosyOf(roomOf(uid).owned));

// ---------- вітрина й ціни ----------
const buyable = () => Object.keys(RITEMS).filter((id) => RITEMS[id].price > 0);
const vitrine = () => shuffle(buyable(), 'rvit' + A.week()).slice(0, 6);
const priceOf = (id) => (vitrine().includes(id) ? Math.round((RITEMS[id].price * 0.7) / 10) * 10 : RITEMS[id].price);
const rar = (p) => (p >= 2000 ? 'leg' : p >= 600 ? 'epic' : p >= 250 ? 'rare' : 'common');
const RAR_N = { leg: 'Легендарне', epic: 'Епічне', rare: 'Рідкісне', common: 'Звичайне' };

// ---------- сцена кімнати ----------
function sceneHTML(uid, R, lvl, edit) {
  const cw = Math.min(488, (A.app.clientWidth || 390) - 32), k = cw / BASE_W, W = lvl.w, s = (CAT_W * k) / 158;
  const ph = dayPhase(), se = season(), list = edit ? edit.layout : R.layout;
  const order = (e) => ({ wall: 0, rug: 1, floor: 2 }[RITEMS[e.i].kind] ?? 2);
  const items = list.map((e, ix) => ({ e, ix, it: RITEMS[e.i] })).sort((a, b) => order(a.e) - order(b.e) || a.ix - b.ix);
  const box = (it, x) => { const top = it.kind === 'wall' ? it.y : it.kind === 'rug' ? FLOOR_Y + 8 - it.h : FLOOR_Y - it.h; return `left:${(x * k).toFixed(1)}px;top:${(top * k).toFixed(1)}px;width:${(it.w * k).toFixed(1)}px;height:${(it.h * k).toFixed(1)}px`; };
  const html = items.map(({ e, ix, it }) => {
    const ph2 = it.photo && e.p ? S().art?.[e.p]?.thumb : null;
    return `<div class="r-it ${it.kind}${e.f ? ' flip' : ''}${edit && edit.sel === ix ? ' sel' : ''}" data-ix="${ix}" style="${box(it, e.x)}">${itemSVG(e.i, { view: (edit || R).view, phase: ph, season: se, photo: ph2 })}</div>`;
  }).join('');
  // подарунки, що чекають на розпакування (лише господарю)
  const gifts = !edit && uid === me() ? R.gifts.map((g, i) => `<button class="r-gift" data-a="roomUnbox" data-ts="${g.ts}" style="left:${((14 + i * 46) * k).toFixed(1)}px;bottom:${(8 * k).toFixed(1)}px;font-size:${(34 * k).toFixed(0)}px">🎁</button>`).join('') : '';
  // живі ефекти зібраних наборів
  const fx = Object.keys(SETS).filter((st) => setDone(st, R.owned) && R.layout.filter((e) => RITEMS[e.i].set === st).length >= FX_MIN_PLACED)
    .map((st) => `<div class="r-fx rfx-${st}">${Array.from({ length: 8 }, (_, i) => `<i style="left:${(6 + i * 12 + (i % 3) * 3)}%;animation-delay:${(-i * 0.9).toFixed(1)}s"></i>`).join('')}</div>`).join('');
  // світло: промінь із кожного вікна (нахил — за сонцем), вечірнє/нічне затемнення, сяйво каміна / люстри / гірлянди
  const LIGHT = { morning: ['255,220,170', 0.4, 60, 0.06, '255,190,140'], day: ['255,250,225', 0.42, 18, 0, ''], evening: ['255,170,110', 0.36, -60, 0.14, '90,40,90'], night: ['170,190,255', 0.16, 0, 0.32, '14,20,70'] }[ph];
  const lx = (e, it, x, w = 0) => (e.f ? e.x + it.w - x - w : e.x + x);
  let light = '';
  for (const e of list) {
    const it = RITEMS[e.i];
    if (it.beam) { const [bx, bw, by] = it.beam, x1 = lx(e, it, bx, bw), x2 = x1 + bw, y = it.y + by, d = LIGHT[2];
      light += `<div class="r-beam" style="clip-path:polygon(${(x1 * k).toFixed(1)}px ${(y * k).toFixed(1)}px,${(x2 * k).toFixed(1)}px ${(y * k).toFixed(1)}px,${((x2 + d + 30) * k).toFixed(1)}px ${(ROOM_H * k).toFixed(1)}px,${((x1 + d - 22) * k).toFixed(1)}px ${(ROOM_H * k).toFixed(1)}px);background:linear-gradient(180deg,rgba(${LIGHT[0]},${LIGHT[1]}),rgba(${LIGHT[0]},0) 92%)"></div>`; }
  }
  if (LIGHT[3]) light += `<div class="r-tint" style="background:rgba(${LIGHT[4]},${LIGHT[3]})"></div>`;
  for (const e of list) {
    const it = RITEMS[e.i]; if (!it.glow) continue;
    const [gx, gy, gr, gc, gm] = it.glow, top = it.kind === 'wall' ? it.y : FLOOR_Y - it.h, a = (ph === 'night' ? 0.5 : ph === 'evening' ? 0.38 : e.i === 'sc_fire' ? 0.2 : 0.08) * gm;
    light += `<div class="r-glow" style="left:${((lx(e, it, gx) - gr) * k).toFixed(1)}px;top:${((top + gy - gr) * k).toFixed(1)}px;width:${(gr * 2 * k).toFixed(1)}px;height:${(gr * 2 * k).toFixed(1)}px;background:radial-gradient(closest-side,rgba(${gc},${a}),rgba(${gc},0))"></div>`;
  }
  // увечері й уночі джерела світла не темніють
  if (ph === 'evening' || ph === 'night') for (const { e, it } of items) if (it.lit) light += `<div class="r-lit${e.f ? ' flip' : ''}" style="${box(it, e.x)}">${litSVG(e.i)}</div>`;
  light += '<div class="r-vig"></div>';
  const P = edit || R, paper = RITEMS[P.paper]?.css || RITEMS.base_paper.css, floor = RITEMS[P.flooring]?.css || RITEMS.base_floor.css;
  // місця, де котик щось робить (у пікселях сцени котика)
  const spots = [];
  if (!edit) for (const e of R.layout) {
    const it = RITEMS[e.i]; if (!it.act) continue;
    let cx = e.x + it.w / 2, dir;
    if (it.side) { const off = { eat: 36, scratch: CAT_W / 2 + 6, sleep: 34 }[it.act] ?? CAT_W / 2; if (e.x - off - CAT_W / 2 >= 0) { cx = (it.act === 'eat' ? e.x + it.w / 2 : e.x) - off; dir = 1; } else { cx = (it.act === 'eat' ? e.x + it.w / 2 : e.x + it.w) + off; dir = -1; } }
    cx = Math.max(CAT_W / 2, Math.min(W - CAT_W / 2, cx));
    spots.push({ cx: (cx * k) / s, lift: ((it.seat || 0) * k) / s, act: it.act, dir, say: it.say });
  }
  return {
    html: `<div class="room-wrap"><div class="room${edit ? ' edit' : ''}" id="room" style="--k:${k.toFixed(4)};width:${(W * k).toFixed(1)}px;height:${(ROOM_H * k).toFixed(1)}px">
      <div class="r-paper" style="height:${(WALL_H * k).toFixed(1)}px;background:${paper}"></div><div class="r-floor" style="top:${(WALL_H * k).toFixed(1)}px;background:${floor}"></div><div class="r-base" style="top:${((WALL_H - 6) * k).toFixed(1)}px;height:${(8 * k).toFixed(1)}px"></div>
      ${html}${gifts}<div class="r-cat" id="roomCat" style="bottom:${((ROOM_H - FLOOR_Y - 4) * k).toFixed(1)}px;width:${((W * k) / s).toFixed(1)}px;transform:scale(${s.toFixed(4)})"></div>${light}${fx}</div></div>`,
    spots, k, W,
  };
}
function mountRoomCats(uid, spots) {
  const cats = [{ uid, av: avOf(uid) }]; if (uid !== me()) cats.push({ uid: me(), av: avOf(me()) });
  mountCat(document.getElementById('roomCat'), cats, { key: 'room', spots, speed: 1.5 }); // крок частіший — котик у кімнаті менший, тож без цього він ледь повзе
}

// ---------- екран кімнати ----------
const when = (ts) => { const d = new Date(ts), t = d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kyiv' }); return new Date(ts).toDateString() === new Date().toDateString() ? `сьогодні о ${t}` : `${d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', timeZone: 'Europe/Kyiv' })} о ${t}`; };
let noteMarked = 0;
export function renderRoom() {
  const uid = S().roomOf || me(), guest = uid !== me(), p = A.pUid(), R = roomOf(uid), cosy = cosyOf(R.owned), lvl = levelOf(cosy);
  const edit = !guest ? S().roomEdit : null;
  const sc = sceneHTML(uid, R, lvl, edit), nm = A.nameOf(uid);
  let below = '';
  if (edit) below = editPanel(R, lvl, edit);
  else if (guest) {
    const liked = R.liked === A.today();
    below = `<div class="card center"><b>Кімната: ${A.esc(nm)} 🏠</b><div class="muted small">Затишок: рівень ${lvl.n} «${A.esc(lvl.name)}» · 💕 ${R.likes || 0}</div>
      <div class="row3"><button class="btn sm ${liked ? 'off' : ''}" data-a="roomLike">${liked ? '💕 Уже сьогодні' : `💕 Подобається (+${LIKE_PTS} балів)`}</button><button class="btn ghost sm" data-a="go" data-to="roomshop">🎁 Подарувати річ</button></div></div>
      <div class="card"><b>💌 Залишити записку</b><textarea id="roomNote" rows="2" maxlength="100" placeholder="До 100 символів: «Твій котик такий милий!»"></textarea><div class="row"><span class="muted small" id="roomNoteN">0/100</span><button class="btn sm" data-a="roomNote">Залишити</button></div></div>
      <button class="btn ghost" data-a="roomHome">← До моєї кімнати</button>`;
  } else {
    const nx = LEVELS.find((L) => L.min > cosy), vis = R.visit && R.visit.by !== me() && Date.now() - R.visit.at < 7 * 864e5 ? R.visit : null;
    const note = R.note && R.note.by !== me() ? R.note : null;
    if (note && !note.seen && noteMarked !== note.at) { noteMarked = note.at; A.updateDoc(roomRef(me()), { 'note.seen': true }).catch(() => {}); }
    below = `${vis ? `<div class="note">👣 ${A.esc(A.nameOf(vis.by))} заходив(ла) ${when(vis.at)}${R.liked === A.today() ? ' і поставив(ла) 💕' : ''}</div>` : ''}
      ${note ? `<div class="card r-note"><div class="muted small">💌 Записка · ${A.esc(A.nameOf(note.by))} · ${when(note.at)}</div><p>«${A.esc(note.text)}»</p></div>` : ''}
      ${R.gifts.length ? `<div class="note">🎁 Тобі подарунок! Натисни на коробку в кімнаті, щоб розпакувати.</div>` : ''}
      <div class="row3 r-btns"><button class="btn sm" data-a="roomEdit">✏️ Облаштувати</button><button class="btn sm ghost" data-a="go" data-to="roomshop">🛍 Меблі · ${wallet()} 🪙</button>${p ? `<button class="btn sm ghost" data-a="roomVisit">🏠 У гості: ${A.esc(A.nameOf(p))}</button>` : ''}</div>
      <div class="card"><div class="row" style="margin:0"><b>🛋 Затишок: ${cosy}</b><span>💕 ${R.likes || 0}</span></div>
        <div class="muted small">Рівень ${lvl.n} «${A.esc(lvl.name)}»${nx ? ` · до рівня ${nx.n}: ${nx.min - cosy}` : ' · максимальний!'}</div>
        ${nx ? `<div class="bar"><i style="width:${Math.round(((cosy - lvl.min) / (nx.min - lvl.min)) * 100)}%"></i></div>` : ''}
        <div class="r-levels">${LEVELS.map((L) => `<div class="${L.n <= lvl.n ? 'ok' : ''}">${L.n <= lvl.n ? '✓' : '🔒'} <b>${L.n}. ${A.esc(L.name)}</b> <span class="muted">від ${L.min}</span><div class="muted small">${A.esc(L.gives)}</div></div>`).join('')}</div>
        <p class="muted small">Кожна річ додає затишок: ціна ÷ 10.</p></div>
      <h3 class="sec">Набори</h3>${setsHTML(R)}`;
  }
  const scrollY = window.scrollY, sl = document.querySelector('.room-wrap')?.scrollLeft || 0;
  A.app.innerHTML = `<div class="page">${A.top(guest ? `🏠 У гостях: ${A.esc(nm)}` : 'Моя кімната')}${sc.html}${below}</div>${S().roomUnbox ? unboxHTML() : ''}`;
  const wrap = document.querySelector('.room-wrap'); if (wrap) wrap.scrollLeft = sl;
  if (S().roomKeep) window.scrollTo(0, scrollY);
  mountRoomCats(uid, sc.spots);
  if (edit) bindDrag(sc.k, sc.W);
  const ta = document.getElementById('roomNote');
  if (ta) ta.oninput = () => { document.getElementById('roomNoteN').textContent = `${ta.value.length}/100`; };
  if (guest) visitOnce(uid);
}
function setsHTML(R) {
  return Object.entries(SETS).map(([st, set]) => {
    const ids = SET_ITEMS[st], n = ids.filter((id) => R.owned.includes(id)).length, done = n === ids.length;
    const placed = R.layout.filter((e) => RITEMS[e.i].set === st).length;
    const av = avOf(me()), [cl, tt] = set.bonus;
    return `<div class="card r-set ${done ? 'done' : ''}"><div class="r-set-h"><div>${portrait({ ...av, owned: [...av.owned, cl], eq: { ...av.eq, [ITEMS[cl].slot]: cl } }, 64)}</div>
      <div><b>${set.icon} ${A.esc(set.name)}</b> <span class="muted small">${n}/${ids.length}</span><div class="bar"><i style="width:${(n / ids.length) * 100}%"></i></div>
      <div class="small">Бонус: «${A.esc(ITEMS[cl].name)}», титул «${A.esc(ITEMS[tt].name)}», ефект «${A.esc(set.fx)}»</div>
      <div class="muted small">${done ? (placed >= FX_MIN_PLACED ? '✓ Зібрано · ефект увімкнено' : `✓ Зібрано · постав у кімнату ${FX_MIN_PLACED}+ речі набору, щоб увімкнути ефект`) : 'Збери всі речі набору'}</div></div></div></div>`;
  }).join('');
}

// ---------- облаштування ----------
function editPanel(R, lvl, edit) {
  const sel = edit.sel != null ? edit.layout[edit.sel] : null, it = sel && RITEMS[sel.i];
  const placed = new Set(edit.layout.map((e) => e.i));
  const inv = R.owned.filter((id) => RITEMS[id].svg && !placed.has(id));
  const chips = (kind, field) => R.owned.filter((id) => RITEMS[id].kind === kind).map((id) => `<button class="chip ${edit[field] === id ? 'sel' : ''}" data-a="roomSet" data-f="${field}" data-v="${id}"><span class="r-dot" style="background:${RITEMS[id].css}"></span>${A.esc(RITEMS[id].name)}</button>`).join('');
  const views = Object.entries(VIEWS).map(([v, n]) => { const ok = viewOk(v, lvl), L = LEVELS.find((x) => x.view === v); return `<button class="chip ${edit.view === v ? 'sel' : ''} ${ok ? '' : 'off'}" data-a="roomSet" data-f="view" data-v="${v}">${ok ? '' : '🔒 '}${A.esc(n)}${ok ? '' : ` · рів. ${L.n}`}</button>`; }).join('');
  const tools = sel ? `<div class="card r-tools"><b>${A.esc(it.name)}</b><div class="row3"><button class="btn ghost sm" data-a="roomMove" data-d="-10">◀</button><button class="btn ghost sm" data-a="roomMove" data-d="10">▶</button><button class="btn ghost sm" data-a="roomFlip">⇋ Віддзеркалити</button>${it.photo ? '<button class="btn ghost sm" data-a="roomPick">🖼 Фото</button>' : ''}<button class="btn ghost sm" data-a="roomDel">🗑 Прибрати</button></div><p class="muted small">Тягни річ пальцем уліво-вправо.</p></div>` : '<p class="muted small center-t">Торкнись речі в кімнаті, щоб її рухати. Тягни пальцем уліво-вправо.</p>';
  const picker = S().roomPick ? photoPicker() : '';
  return `${picker}${tools}
    <div class="row"><button class="btn ghost" data-a="roomCancel">Скасувати</button><button class="btn" data-a="roomSave">Зберегти ✓</button></div>
    <div class="card"><b>Додати в кімнату</b>${inv.length ? `<div class="r-inv">${inv.map((id) => { const x = RITEMS[id], lock = x.shelf && lvl.n < SHELF_LEVEL; return `<button class="r-inv-it ${lock ? 'off' : ''}" data-a="roomAdd" data-id="${id}"><div class="r-prev">${itemSVG(id)}</div><span>${lock ? '🔒 ' : ''}${A.esc(x.name)}</span></button>`; }).join('')}</div>` : '<p class="muted small">Усі твої речі вже в кімнаті. Більше — у магазині меблів 🛍</p>'}</div>
    <div class="card"><b>Шпалери</b><div class="chips">${chips('paper', 'paper')}</div><b>Підлога</b><div class="chips">${chips('flooring', 'flooring')}</div><b>Вид з вікна</b><div class="chips">${views}</div><p class="muted small">Вид змінюється сам: ранок, день, вечір, ніч (за Києвом) і пора року.</p></div>`;
}
function photoPicker() {
  const list = Object.values(S().art || {}).filter((d) => d.status === 'done' && d.thumb).sort((a, b) => (b.doneAt || b.at) - (a.doneAt || a.at));
  return `<div class="card"><b>🖼 Обери фото з «Нашого альбому»</b>${list.length ? `<div class="alb-grid">${list.map((d) => `<button class="alb-it" data-a="roomPhoto" data-id="${d.id}"><img src="${d.thumb}"></button>`).join('')}</div>` : '<p class="muted small">Тут будуть ваші малюнки й фото з «Творчої майстерні» 🎨</p>'}<button class="link" data-a="roomPhoto" data-id="">Без фото</button></div>`;
}
function bindDrag(k, W) {
  const room = document.getElementById('room'); if (!room) return;
  let d = null;
  room.onpointerdown = (e) => {
    const el = e.target.closest('.r-it'); if (!el) return;
    const ix = +el.dataset.ix, E = S().roomEdit; e.preventDefault();
    d = { ix, el, x: e.clientX, x0: E.layout[ix].x, moved: false, newSel: E.sel !== ix };
    E.sel = ix; room.querySelectorAll('.r-it.sel').forEach((n) => n.classList.remove('sel')); el.classList.add('sel');
    try { el.setPointerCapture(e.pointerId); } catch { /* */ }
  };
  room.onpointermove = (e) => {
    if (!d) return; const E = S().roomEdit, it = RITEMS[E.layout[d.ix].i];
    const nx = Math.max(0, Math.min(W - it.w, d.x0 + (e.clientX - d.x) / k));
    if (Math.abs(e.clientX - d.x) > 3) d.moved = true;
    E.layout[d.ix].x = nx; d.el.style.left = `${(nx * k).toFixed(1)}px`;
  };
  const up = () => { if (!d) return; const ns = d.newSel; d = null; if (ns) { S().roomKeep = true; renderRoom(); S().roomKeep = false; } };
  room.onpointerup = up; room.onpointercancel = up;
}

// ---------- магазин меблів ----------
export function renderRoomShop() {
  const p = A.pUid(), R = roomOf(me()), Rp = p ? roomOf(p) : null, lvl = levelOf(cosyOf(R.owned)), bal = wallet();
  const cat = S().roomShopCat || 'vit', vit = vitrine(), forGuest = S().roomOf && S().roomOf !== me();
  const card = (id) => {
    const it = RITEMS[id], has = R.owned.includes(id), pr = priceOf(id), sale = pr !== it.price, r = rar(it.price);
    const lock = it.shelf && lvl.n < SHELF_LEVEL, pLock = it.shelf && Rp && levelOf(cosyOf(Rp.owned)).n < SHELF_LEVEL;
    const pHas = Rp && (Rp.owned.includes(id) || Rp.gifts.some((g) => g.item === id));
    const prev = it.css ? `<div class="r-sw" style="background:${it.css}"></div>` : `<div class="r-prev big">${itemSVG(id)}</div>`;
    const buy = forGuest ? '' : has ? '<span class="own">✓ Є</span>' : lock ? `<span class="muted small">🔒 Затишок рів. ${SHELF_LEVEL}</span>` : `<button class="btn sm ${bal < pr ? 'off' : ''}" data-a="roomBuy" data-id="${id}">Купити</button>`;
    const gift = !p ? '' : pHas ? '<span class="muted small">🎁 вже має</span>' : pLock ? '' : `<button class="btn ghost sm ${bal < pr ? 'off' : ''}" data-a="roomGift" data-id="${id}">🎁</button>`;
    return `<div class="shop-c ${r}"><div class="sc-prev">${prev}</div><b>${A.esc(it.name)}</b><div class="muted small">${RAR_N[r]}${cat === 'vit' ? ` · ${SETS[it.set].icon}` : ''}</div>
      <div class="price">${sale ? `<s>${it.price}</s> ` : ''}<b>${pr}</b> 🪙</div><div class="sc-btn">${buy}${gift}</div></div>`;
  };
  const ids = cat === 'vit' ? vit : SET_ITEMS[cat];
  const tabs = [['vit', '🔥 Вітрина −30%'], ...Object.entries(SETS).map(([k, s]) => [k, `${s.icon} ${s.name}`])];
  const set = SETS[cat], n = set ? SET_ITEMS[cat].filter((id) => R.owned.includes(id)).length : 0;
  A.app.innerHTML = `<div class="page"><header class="top"><button class="back" data-a="roomBack">←</button><h2>${forGuest ? `🎁 Подарунок: ${A.esc(A.nameOf(S().roomOf))}` : 'Меблі для кімнати'}</h2><span></span></header>
    <div class="card wallet"><span>Гаманець</span><b>${bal} 🪙</b><span class="muted small">Покупки не зменшують ранг і бали сезону. Подарунок приходить запакованою коробкою.</span></div>
    <div class="tabs scroll">${tabs.map(([k, nm]) => `<button class="${cat === k ? 'sel' : ''}" data-a="roomShopCat" data-c="${k}">${A.esc(nm)}</button>`).join('')}</div>
    ${cat === 'vit' ? '<p class="muted small center-t">Щотижня нові 6 речей зі знижкою</p>' : `<p class="muted small center-t">Зібрано ${n}/${SET_ITEMS[cat].length} · бонус: «${A.esc(ITEMS[set.bonus[0]].name)}», титул і ефект «${A.esc(set.fx)}»</p>`}
    <div class="shop-grid">${ids.map(card).join('')}</div></div>`;
}

// ---------- запис і дії ----------
// Сповіщення господарю — не частіше ніж раз на годину; повертає поле для того самого запису
function pushOnce(host, title, msg) {
  if (Date.now() - (S().rooms?.[host]?.pushAt || 0) < PUSH_GAP) return {};
  A.notify(host, title, msg); return { pushAt: Date.now() };
}
const visited = {};
function visitOnce(host) {
  const v = S().rooms?.[host]?.visit, now = Date.now();
  if ((visited[host] && now - visited[host] < VISIT_GAP) || (v?.by === me() && now - v.at < VISIT_GAP)) return;
  visited[host] = now;
  A.setDoc(roomRef(host), { visit: { by: me(), at: now }, ...pushOnce(host, '🐾 У тебе гості!', `${A.nameOf(me())} зазирнув(ла) у твою кімнату`) }, { merge: true }).catch((e) => console.error(e));
}
async function buy(id, forUid) {
  const it = RITEMS[id], pr = priceOf(id), R = roomOf(forUid), self = forUid === me();
  if (!it || !(it.price > 0)) return;
  if (wallet() < pr) return A.toast(`Не вистачає монет: потрібно ${pr}, у тебе ${wallet()}`);
  if (R.owned.includes(id)) return A.toast(self ? 'Вже є' : 'У партнера це вже є');
  if (!self && R.gifts.some((g) => g.item === id)) return A.toast('Цей подарунок уже чекає на розпакування');
  if (it.shelf && levelOf(cosyOf(R.owned)).n < SHELF_LEVEL) return A.toast(`Полиці — з рівня затишку ${SHELF_LEVEL}`);
  const ts = Date.now();
  await A.setDoc(A.doc(A.db, 'spend', `${me()}_${id}_${ts}`), { uid: me(), item: id, price: pr, for: forUid, ts, week: A.week(), room: true });
  if (self) { await A.setDoc(roomRef(me()), { owned: A.arrayUnion(id) }, { merge: true }); A.toast(`«${it.name}» твоя! Постав її через ✏️ Облаштувати`); }
  else {
    await A.setDoc(roomRef(forUid), { gifts: A.arrayUnion({ item: id, from: me(), ts }), ...pushOnce(forUid, '🎁 Подарунок у кімнату!', `${A.nameOf(me())} надіслав(ла) тобі коробку з сюрпризом 🎀`) }, { merge: true });
    A.toast('Подарунок надіслано 💌');
  }
}
function unboxHTML() {
  const g = S().roomUnbox, it = RITEMS[g.item]; if (!it) return '';
  return `<div class="unbox ${g.open ? 'open' : ''}"><div class="card center">
    ${g.open ? `<div class="ub-item">${it.css ? `<div class="r-sw" style="background:${it.css}"></div>` : `<div class="r-prev big">${itemSVG(g.item)}</div>`}</div><h3>${A.esc(it.name)}</h3><p class="muted small">Подарунок · від: ${A.esc(A.nameOf(g.from))} 💕</p><button class="btn" data-a="roomUnboxOk">Дякую! 💕</button>`
      : `<div class="ub-box">🎁</div><p>🎀 Сюрприз! Від: ${A.esc(A.nameOf(g.from))}</p><button class="btn" data-a="roomUnboxOpen">Розпакувати 🎀</button>`}</div></div>`;
}
// Бонус за зібраний набір: ексклюзивна річ і титул котику (один запис)
let bonusBusy = false;
export function ensureRoomBonus() {
  const uid = me(); if (!uid || bonusBusy || !S().loaded.has('rooms') || !S().loaded.has('avatars')) return;
  const R = roomOf(uid), owned = avOf(uid).owned, done = Object.keys(SETS).filter((st) => setDone(st, R.owned));
  const add = done.flatMap((st) => SETS[st].bonus).filter((id) => !owned.includes(id));
  if (!add.length) return;
  bonusBusy = true;
  A.setDoc(A.doc(A.db, 'avatars', uid), { owned: A.arrayUnion(...add) }, { merge: true })
    .then(() => A.toast(`🎉 Набір зібрано! Котик отримав: ${add.map((id) => `«${ITEMS[id].name}»`).join(', ')}`))
    .catch((e) => console.error(e)).finally(() => (bonusBusy = false));
}
// Статус для плитки на головній
export function roomTile() {
  const R = roomOf(me());
  if (R.gifts.length) return { t: '🎁 тобі подарунок!', hot: true };
  if (R.note && R.note.by !== me() && !R.note.seen) return { t: '💌 нова записка', hot: true };
  const L = levelOf(cosyOf(R.owned)); return { t: `затишок: рів. ${L.n} «${L.name}»`, hot: false };
}
// Оновлення екрана, коли прийшли нові дані (не заважаємо облаштуванню і набору тексту)
export function roomRefresh() {
  if (S().view === 'roomshop') { const y = window.scrollY; renderRoomShop(); window.scrollTo(0, y); return; }
  if (S().roomEdit || S().roomUnbox || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  S().roomKeep = true; renderRoom(); S().roomKeep = false;
}
// Нова річ стає туди, де вона найменше перекриває інші речі свого шару (стіна / підлога), ближче до видимого центру
function freeX(layout, it, W) {
  const wall = it.kind === 'wall', wrap = document.querySelector('.room-wrap'), k = parseFloat(document.getElementById('room')?.style.getPropertyValue('--k')) || 1;
  const mid = wrap ? (wrap.scrollLeft + wrap.clientWidth / 2) / k : W / 2;
  const same = layout.map((e) => ({ e, o: RITEMS[e.i] })).filter(({ o }) => (o.kind === 'wall') === wall);
  let best = null;
  for (let x = 0; x <= W - it.w; x += 6) {
    const over = same.reduce((a, { e, o }) => a + Math.max(0, Math.min(x + it.w, e.x + o.w) - Math.max(x, e.x)), 0);
    const score = over * 10 + Math.abs(x + it.w / 2 - mid);
    if (!best || score < best.s) best = { x, s: score };
  }
  return best ? best.x : 0;
}
const rr = () => { S().roomKeep = true; renderRoom(); S().roomKeep = false; };

export const roomActions = {
  roomHome: () => { S().roomOf = null; S().roomEdit = null; S().view = 'room'; A.render(); },
  roomVisit: () => { const p = A.pUid(); if (!p) return; S().roomOf = p; S().roomEdit = null; S().view = 'room'; A.render(); },
  roomBack: () => { S().view = 'room'; A.render(); },
  roomShopCat: (el) => { S().roomShopCat = el.dataset.c; renderRoomShop(); },
  roomBuy: (el) => A.safe(() => buy(el.dataset.id, me())),
  roomGift: (el) => A.safe(() => buy(el.dataset.id, A.pUid())),
  roomEdit: () => { const R = roomOf(me()); S().roomEdit = { layout: R.layout.map((e) => ({ ...e })), paper: R.paper, flooring: R.flooring, view: R.view, sel: null }; S().roomPick = false; A.render(); },
  roomCancel: () => { S().roomEdit = null; S().roomPick = false; A.render(); },
  roomSave: () => A.safe(async () => {
    const E = S().roomEdit; if (!E) return;
    const layout = E.layout.map((e) => { const o = { i: e.i, x: Math.round(e.x) }; if (e.f) o.f = 1; if (e.p) o.p = e.p; return o; });
    await A.setDoc(roomRef(me()), { layout, paper: E.paper, flooring: E.flooring, view: E.view }, { merge: true });
    S().roomEdit = null; S().roomPick = false; A.toast('Кімнату збережено 🏠'); A.render();
  }),
  roomAdd: (el) => {
    const E = S().roomEdit, id = el.dataset.id, it = RITEMS[id]; if (!E || !it) return;
    const lvl = lvlOf(me()); if (it.shelf && lvl.n < SHELF_LEVEL) return A.toast(`Полиці — з рівня затишку ${SHELF_LEVEL}`);
    E.layout.push({ i: id, x: freeX(E.layout, it, lvl.w) }); E.sel = E.layout.length - 1; rr();
  },
  roomMove: (el) => { const E = S().roomEdit; if (E?.sel == null) return; const e = E.layout[E.sel], w = lvlOf(me()).w; e.x = Math.max(0, Math.min(w - RITEMS[e.i].w, e.x + Number(el.dataset.d))); rr(); },
  roomFlip: () => { const E = S().roomEdit; if (E?.sel == null) return; const e = E.layout[E.sel]; if (e.f) delete e.f; else e.f = 1; rr(); },
  roomDel: () => { const E = S().roomEdit; if (E?.sel == null) return; E.layout.splice(E.sel, 1); E.sel = null; S().roomPick = false; rr(); },
  roomPick: () => { S().roomPick = !S().roomPick; rr(); },
  roomPhoto: (el) => { const E = S().roomEdit; if (E?.sel == null) return; const e = E.layout[E.sel]; if (el.dataset.id) e.p = el.dataset.id; else delete e.p; S().roomPick = false; rr(); },
  roomSet: (el) => {
    const E = S().roomEdit; if (!E) return; const f = el.dataset.f, v = el.dataset.v;
    if (f === 'view' && !viewOk(v, lvlOf(me()))) return A.toast(`Цей вид — з рівня затишку ${LEVELS.find((L) => L.view === v).n}`);
    E[f] = v; rr();
  },
  roomLike: () => A.safe(async () => {
    const host = S().roomOf, R = roomOf(host); if (!host || host === me()) return;
    if (R.liked === A.today()) return A.toast('Сьогодні ти вже ставив(ла) 💕');
    await A.setDoc(roomRef(host), { liked: A.today(), likes: A.increment(1), ...pushOnce(host, '💕 Твоя кімната сподобалась!', `${A.nameOf(me())} поставив(ла) 💕 твоїй кімнаті (+${LIKE_PTS})`) }, { merge: true });
    A.addPoints(`rlike_${A.today()}_${host}`, host, LIKE_PTS, 'Кімната 💕');
    A.toast(`💕 Надіслано! +${LIKE_PTS} балів`);
  }),
  roomNote: () => A.safe(async () => {
    const host = S().roomOf, t = (document.getElementById('roomNote')?.value || '').trim().slice(0, 100);
    if (!host || host === me()) return; if (!t) return A.toast('Напиши хоч кілька слів 🙂');
    await A.setDoc(roomRef(host), { note: { text: t, by: me(), at: Date.now(), seen: false }, ...pushOnce(host, '💌 Записка в кімнаті', `${A.nameOf(me())}: «${t}»`) }, { merge: true });
    document.getElementById('roomNote').value = ''; A.toast('Записку залишено 💌');
  }),
  roomUnbox: (el) => { const g = roomOf(me()).gifts.find((x) => String(x.ts) === el.dataset.ts); if (!g) return; S().roomUnbox = { ...g, open: false }; rr(); },
  roomUnboxOpen: () => A.safe(async () => {
    const g = S().roomUnbox; if (!g) return; const R = roomOf(me());
    const rest = R.gifts.filter((x) => !(x.ts === g.ts && x.item === g.item));
    await A.updateDoc(roomRef(me()), { gifts: rest, owned: A.arrayUnion(g.item) });
    S().roomUnbox = { ...g, open: true }; rr();
  }),
  roomUnboxOk: () => { S().roomUnbox = null; rr(); },
};
