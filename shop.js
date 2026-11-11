// ===== Мій котик (вигляд, гардероб) і магазин (гаманець, вітрина, подарунки, ексклюзиви) =====
import { ITEMS, SLOTS, FURS, EYES, EARS, PATTERNS, DEFAULT_AV, portrait, rarity, titleOf } from './avatar.js';
import { shuffle } from './util.js';

let A;
export function initShop(api) { A = api; }
const S = () => A.S;
const me = () => A.S.uid;
export const avOf = (uid) => ({ ...DEFAULT_AV, ...(A.S.avatars[uid] || {}), eq: { ...(A.S.avatars[uid]?.eq || {}) }, owned: A.S.avatars[uid]?.owned || [] });
const avRef = (uid) => A.doc(A.db, 'avatars', uid);

// ---------- гаманець ----------
export function wallet(uid = me()) {
  const earned = A.totals().all[uid] || 0;
  const spent = S().spends.filter((s) => s.uid === uid).reduce((a, s) => a + s.price, 0);
  return earned - spent;
}
export function seasonWins(uid = me()) {
  const { byWeek } = A.totals(), p = A.pUid(), w = A.week();
  return Object.keys(byWeek).filter((k) => k < w && (byWeek[k][uid] || 0) > (p ? byWeek[k][p] || 0 : 0)).length;
}
const buyable = () => Object.entries(ITEMS).filter(([, it]) => !it.wins && it.price > 0).map(([id]) => id);
export function vitrine() { return shuffle(buyable(), 'vit' + A.week()).slice(0, 6); }
const priceOf = (id) => (vitrine().includes(id) ? Math.round((ITEMS[id].price * 0.7) / 10) * 10 : ITEMS[id].price);

// Ексклюзиви за перемоги в сезонах додаються автоматично
let exBusy = false;
export function ensureExclusives() {
  const uid = me(); if (!uid || !S().loaded.has('avatars') || exBusy) return;
  const wins = seasonWins(uid), owned = avOf(uid).owned;
  const add = Object.entries(ITEMS).filter(([id, it]) => it.wins && wins >= it.wins && !owned.includes(id)).map(([id]) => id);
  if (add.length) { exBusy = true; A.setDoc(avRef(uid), { owned: A.arrayUnion(...add) }, { merge: true }).catch(() => {}).finally(() => (exBusy = false)); }
}

// ---------- екран «Мій котик» ----------
export function renderAvatar() {
  const av = avOf(me()), tab = S().avTab || 'look', gifts = (av.gifts || []).filter((g) => !g.seen);
  const opt = (field, map, labelFn) => `<div class="chips">${Object.entries(map).map(([k, v]) => `<button class="chip ${av[field] === k ? 'sel' : ''}" data-a="avSet" data-f="${field}" data-v="${k}">${labelFn ? labelFn(k, v) : A.esc(v)}</button>`).join('')}</div>`;
  const look = `<div class="card"><b>Ім'я котика</b><div class="row"><input id="avName" maxlength="20" value="${A.esc(av.name || '')}" placeholder="Напр. Мурчик"><button class="btn sm" data-a="avName">OK</button></div>
    <b>Забарвлення</b>${opt('fur', FURS, (k, v) => `<span class="dot" style="background:${v.g[1]}"></span>${A.esc(v.name)}`)}
    <b>Очі</b>${opt('eyes', EYES, (k, v) => `<span class="dot" style="background:${v.c[1]}"></span>${A.esc(v.name)}`)}
    <b>Вушка</b>${opt('ears', EARS)}<b>Візерунок</b>${opt('pattern', PATTERNS)}</div>`;
  const ward = Object.entries(SLOTS).map(([slot, nm]) => {
    const mine = av.owned.filter((id) => ITEMS[id]?.slot === slot); if (!mine.length) return '';
    return `<div class="card"><b>${nm}</b><div class="chips">${mine.map((id) => `<button class="chip ${av.eq[slot] === id ? 'sel' : ''}" data-a="avEq" data-id="${id}">${A.esc(ITEMS[id].name)}</button>`).join('')}
      ${av.eq[slot] ? `<button class="chip" data-a="avUneq" data-s="${slot}">✕ зняти</button>` : ''}</div></div>`;
  }).join('') || '<div class="card center"><p>Гардероб порожній. Зазирни в магазин! 🛍</p></div>';
  A.app.innerHTML = `<div class="page">${A.top('Мій котик')}
    ${gifts.length ? `<div class="note">🎁 ${A.esc(A.nameOf(gifts[0].from))} подарував(ла) тобі: <b>${A.esc(ITEMS[gifts[0].item]?.name || '')}</b>! <button class="link" data-a="avGiftSeen">Дякую 💕</button></div>` : ''}
    <div class="center">${portrait(av, 190, 'big')}<b class="big">${A.esc(av.name || 'Мій котик')}</b>${titleOf(av) ? `<div class="title-badge">${A.esc(titleOf(av))}</div>` : ''}</div>
    <div class="tabs"><button class="${tab === 'look' ? 'sel' : ''}" data-a="avTab" data-t="look">Вигляд</button><button class="${tab === 'ward' ? 'sel' : ''}" data-a="avTab" data-t="ward">Гардероб (${av.owned.length})</button><button data-a="go" data-to="shop">Магазин 🛍</button></div>
    ${tab === 'look' ? look : ward}</div>`;
}

// ---------- магазин ----------
export function renderShop() {
  const av = avOf(me()), cat = S().shopCat || 'vit', p = A.pUid(), bal = wallet(), wins = seasonWins();
  const card = (id) => {
    const it = ITEMS[id], has = av.owned.includes(id), pr = priceOf(id), sale = pr !== it.price, r = rarity(it);
    const tryAv = { ...av, owned: [...av.owned, id], eq: { ...av.eq, [it.slot]: id } };
    const prev = it.slot === 'title' ? `<div class="title-badge">${A.esc(it.name)}</div>` : portrait(tryAv, 92);
    const btns = it.wins ? `<span class="muted small">${has ? '✓ Твій' : `За ${it.wins} перемог${it.wins > 1 ? 'и' : 'у'} в сезонах (${wins}/${it.wins})`}</span>`
      : `${has ? '<span class="own">✓ Є</span>' : `<button class="btn sm ${bal < pr ? 'off' : ''}" data-a="buy" data-id="${id}">Купити</button>`}${p ? `<button class="btn ghost sm ${bal < pr ? 'off' : ''}" data-a="gift" data-id="${id}">🎁</button>` : ''}`;
    return `<div class="shop-c ${r.c}"><div class="sc-prev">${prev}</div><b>${A.esc(it.name)}</b><div class="muted small">${r.n}</div>
      <div class="price">${it.wins ? '🏆' : `${sale ? `<s>${it.price}</s> ` : ''}<b>${pr}</b> 🪙`}</div><div class="sc-btn">${btns}</div></div>`;
  };
  const ids = cat === 'vit' ? vitrine() : cat === 'ex' ? Object.keys(ITEMS).filter((id) => ITEMS[id].wins) : Object.keys(ITEMS).filter((id) => ITEMS[id].slot === cat && !ITEMS[id].wins);
  const tabs = [['vit', '🔥 Вітрина −30%'], ...Object.entries(SLOTS), ['ex', '🏆 Ексклюзиви']];
  A.app.innerHTML = `<div class="page">${A.top('Магазин')}
    <div class="card wallet"><span>Гаманець</span><b>${bal} 🪙</b><span class="muted small">Покупки не зменшують ранг і бали сезону</span></div>
    <div class="tabs scroll">${tabs.map(([k, n]) => `<button class="${cat === k ? 'sel' : ''}" data-a="shopCat" data-c="${k}">${n}</button>`).join('')}</div>
    ${cat === 'vit' ? '<p class="muted small center-t">Щотижня нові 6 предметів зі знижкою</p>' : ''}
    <div class="shop-grid">${ids.map(card).join('')}</div></div>`;
}

async function purchase(id, forUid) {
  const it = ITEMS[id], pr = priceOf(id);
  if (wallet() < pr) return A.toast(`Не вистачає монет: потрібно ${pr}, у тебе ${wallet()}`);
  if (avOf(forUid).owned.includes(id)) return A.toast(forUid === me() ? 'Вже є' : 'У партнера це вже є');
  await A.setDoc(A.doc(A.db, 'spend', `${me()}_${id}_${Date.now()}`), { uid: me(), item: id, price: pr, for: forUid, ts: Date.now(), week: A.week() });
  const upd = { owned: A.arrayUnion(id) };
  if (forUid !== me()) upd.gifts = A.arrayUnion({ item: id, from: me(), ts: Date.now(), seen: false });
  else upd.eq = { ...avOf(me()).eq, [it.slot]: id };
  await A.setDoc(avRef(forUid), upd, { merge: true });
  if (forUid !== me()) { A.notify(forUid, '🎁 Тобі подарунок!', `${A.nameOf(me())} подарував(ла) «${it.name}» твоєму котику`); A.toast('Подарунок надіслано 💌'); }
  else A.toast(`«${it.name}» вже на котику!`);
}

export const shopActions = {
  avTab: (el) => { S().avTab = el.dataset.t; renderAvatar(); },
  avSet: (el) => A.safe(() => A.setDoc(avRef(me()), { [el.dataset.f]: el.dataset.v }, { merge: true })),
  avName: () => A.safe(() => A.setDoc(avRef(me()), { name: document.getElementById('avName').value.trim().slice(0, 20) }, { merge: true })),
  avEq: (el) => A.safe(() => A.setDoc(avRef(me()), { eq: { ...avOf(me()).eq, [ITEMS[el.dataset.id].slot]: el.dataset.id } }, { merge: true })),
  avUneq: (el) => A.safe(() => { const eq = { ...avOf(me()).eq }; delete eq[el.dataset.s]; return A.updateDoc(avRef(me()), { eq }); }),
  avGiftSeen: () => A.safe(() => A.updateDoc(avRef(me()), { gifts: (avOf(me()).gifts || []).map((g) => ({ ...g, seen: true })) })),
  shopCat: (el) => { S().shopCat = el.dataset.c; renderShop(); },
  buy: (el) => A.safe(() => purchase(el.dataset.id, me())),
  gift: (el) => A.safe(() => purchase(el.dataset.id, A.pUid())),
};
