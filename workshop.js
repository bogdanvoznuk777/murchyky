// ===== Творча майстерня: 7 режимів + спільна галерея «Наш альбом» =====
import { shuffle } from './util.js';

let A;
export function initWorkshop(api) { A = api; }
const S = () => A.S;
const me = () => A.S.uid;
const esc = (s) => A.esc(s);
const artRef = (id) => A.doc(A.db, 'art', id);
const imgRef = (id) => A.doc(A.db, 'artimg', id);
const liveRef = (id) => A.doc(A.db, 'live', id);
const norm = (s) => String(s || '').toLowerCase().replace(/[’ʼ`]/g, "'").replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();

export const MODES = {
  memory: { icon: '💭', name: 'Намалюй наш спогад', desc: 'Намалюй момент із ваших стосунків — партнер вгадує, що це за спогад.', pts: '+20 / +10 тому, хто вгадав · +5 автору' },
  franken: { icon: '🧟', name: 'Котик-франкенштейн', desc: 'Малюєте котика по черзі: голова → тулуб → лапи, не бачачи, що намалював інший. Потім — велике відкриття!', pts: '+15 обом' },
  micro: { icon: '🔬', name: 'Мікрофото', desc: 'Сфотографуй щось зблизька. Партнер вгадує з 3 спроб — після кожної фото віддаляється.', pts: '+20 / +12 / +6 · +5 автору' },
  song: { icon: '🎵', name: 'Вгадай нашу пісню', desc: 'Намугикай пісню без слів — партнер вгадує. Найкраще — «ваші» пісні.', pts: '+20 / +10 · +5 автору' },
  emoji: { icon: '🧩', name: 'Емодзі-ребус', desc: 'Зашифруй фільм, пісню чи спогад смайликами — партнер розшифровує.', pts: '+15 / +7 · +3 автору' },
  blind: { icon: '🙈', name: 'Малюнок наосліп', desc: 'Ти бачиш картинку і описуєш її словами. Партнер малює за описом. Потім порівнюєте!', pts: 'до +20 обом' },
  live: { icon: '✏️', name: 'Малюй і вгадуй наживо', desc: 'Малюєш слово — партнер бачить малюнок у реальному часі й вгадує на швидкість.', pts: 'до +30 тому, хто вгадав · +10 художнику' },
};
const ORDER = ['memory', 'franken', 'micro', 'song', 'emoji', 'blind', 'live'];

// ---------- малювальне полотно ----------
const PALETTE = ['#3b2f3a', '#ff5c9a', '#e53935', '#f9a825', '#43a047', '#1e88e5', '#8e24aa', '#8d6e63', '#93a5ba', '#ffffff'];
export function drawPad(root, opts = {}) {
  const W = 600, H = opts.h || 600;
  root.innerHTML = `<div class="pad-wrap">${opts.hint ? `<img class="pad-hint" src="${opts.hint}" alt="">` : ''}<canvas class="pad" width="${W}" height="${H}"></canvas></div>
    <div class="pad-tools">${PALETTE.map((c, i) => `<button class="pc ${i ? '' : 'sel'}" data-c="${c}" style="background:${c}"></button>`).join('')}
    <button class="pt" data-w="6">•</button><button class="pt sel" data-w="12">●</button><button class="pt" data-w="24">⬤</button><button class="pt" data-u="1">↶</button><button class="pt" data-x="1">🗑</button></div>`;
  const cv = root.querySelector('canvas'), ctx = cv.getContext('2d'), strokes = []; let cur = null, col = PALETTE[0], wid = 12;
  const redraw = () => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); for (const s of strokes) paint(ctx, s, W, H); };
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [Math.round(((e.clientX - r.left) / r.width) * 1000), Math.round(((e.clientY - r.top) / r.height) * 1000)]; };
  cv.onpointerdown = (e) => { e.preventDefault(); cv.setPointerCapture(e.pointerId); cur = { c: col, w: wid, p: pos(e) }; strokes.push(cur); redraw(); opts.onChange?.(strokes); };
  cv.onpointermove = (e) => { if (!cur) return; e.preventDefault(); cur.p.push(...pos(e)); paint(ctx, cur, W, H); };
  cv.onpointerup = cv.onpointercancel = () => { if (cur) { cur = null; opts.onChange?.(strokes); } };
  root.querySelectorAll('.pc').forEach((b) => (b.onclick = () => { col = b.dataset.c; root.querySelectorAll('.pc').forEach((x) => x.classList.toggle('sel', x === b)); }));
  root.querySelectorAll('.pt').forEach((b) => (b.onclick = () => {
    if (b.dataset.w) { wid = +b.dataset.w; root.querySelectorAll('.pt[data-w]').forEach((x) => x.classList.toggle('sel', x === b)); }
    if (b.dataset.u) { strokes.pop(); redraw(); opts.onChange?.(strokes); }
    if (b.dataset.x) { strokes.length = 0; redraw(); opts.onChange?.(strokes); }
  }));
  redraw();
  return { strokes, empty: () => !strokes.length, jpeg: (q = 0.8, w = W) => scaled(cv, w, q) };
}
function paint(ctx, s, W, H) {
  const p = s.p; ctx.strokeStyle = s.c; ctx.fillStyle = s.c; ctx.lineWidth = s.w * (W / 600); ctx.lineCap = ctx.lineJoin = 'round';
  if (p.length <= 2) { ctx.beginPath(); ctx.arc((p[0] / 1000) * W, (p[1] / 1000) * H, ctx.lineWidth / 2, 0, 7); ctx.fill(); return; }
  ctx.beginPath(); ctx.moveTo((p[0] / 1000) * W, (p[1] / 1000) * H);
  for (let i = 2; i < p.length; i += 2) ctx.lineTo((p[i] / 1000) * W, (p[i + 1] / 1000) * H);
  ctx.stroke();
}
function scaled(src, w, q) { const c = document.createElement('canvas'); c.width = w; c.height = Math.round((src.height / src.width) * w); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(src, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', q); }
async function loadImg(url) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; }); }
async function compressFile(file, max = 1000) { const url = URL.createObjectURL(file); try { const img = await loadImg(url); const c = document.createElement('canvas'), s = Math.min(1, max / Math.max(img.width, img.height)); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return { full: c.toDataURL('image/jpeg', 0.72), thumb: scaled(c, 160, 0.6) }; } finally { URL.revokeObjectURL(url); } }
async function thumbOf(dataUrl) { const img = await loadImg(dataUrl); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0); return scaled(c, 160, 0.6); }
async function stackImages(urls) { const imgs = await Promise.all(urls.map(loadImg)); const w = 600, c = document.createElement('canvas'); c.width = w; c.height = imgs.reduce((h, i) => h + Math.round((i.height / i.width) * w), 0); const x = c.getContext('2d'); let y = 0; for (const i of imgs) { const h = Math.round((i.height / i.width) * w); x.drawImage(i, 0, y, w, h); y += h; } return c.toDataURL('image/jpeg', 0.78); }

// ---------- сцени для «Малюнка наосліп» ----------
const OBJ = {
  sun: (c) => `<circle r="22" fill="#ffc83d"/><g stroke="#ffc83d" stroke-width="5" stroke-linecap="round">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M0 -30 L0 -40" transform="rotate(${a})"/>`).join('')}</g>`,
  cloud: () => `<g fill="#cfe3f7"><circle cx="-14" cy="4" r="14"/><circle cx="6" cy="-4" r="18"/><circle cx="22" cy="6" r="12"/><rect x="-28" y="4" width="62" height="14" rx="7"/></g>`,
  house: (c) => `<rect x="-26" y="-6" width="52" height="40" fill="${c}"/><path d="M-34 -4 L0 -34 L34 -4Z" fill="#8d4b3a"/><rect x="-8" y="12" width="16" height="22" fill="#5d4037"/>`,
  tree: () => `<rect x="-5" y="4" width="10" height="34" fill="#8d6e63"/><circle cy="-10" r="26" fill="#5fae5a"/>`,
  cat: (c) => `<ellipse cy="14" rx="20" ry="18" fill="${c}"/><circle cy="-14" r="16" fill="${c}"/><path d="M-14 -24 L-12 -40 L-2 -28Z M14 -24 L12 -40 L2 -28Z" fill="${c}"/><circle cx="-6" cy="-15" r="2.5" fill="#222"/><circle cx="6" cy="-15" r="2.5" fill="#222"/>`,
  heart: (c) => `<path d="M0 24 C-40 -6 -22 -36 0 -16 C22 -36 40 -6 0 24Z" fill="${c}"/>`,
  star: (c) => `<path d="M0 -30 L8 -9 L30 -9 L12 4 L19 26 L0 13 L-19 26 L-12 4 L-30 -9 L-8 -9Z" fill="${c}"/>`,
  flower: (c) => `<rect x="-2" y="0" width="4" height="34" fill="#43a047"/>${[0, 72, 144, 216, 288].map((a) => `<ellipse cy="-12" rx="7" ry="12" fill="${c}" transform="rotate(${a})"/>`).join('')}<circle r="7" fill="#ffc83d"/>`,
  moon: () => `<path d="M8 -26 A26 26 0 1 0 8 26 A20 20 0 1 1 8 -26Z" fill="#ffd96a"/>`,
  fish: (c) => `<ellipse rx="24" ry="13" fill="${c}"/><path d="M20 0 L36 -12 L36 12Z" fill="${c}"/><circle cx="-12" cy="-3" r="2.5" fill="#222"/>`,
  ball: (c) => `<circle r="20" fill="${c}"/><path d="M-20 0 Q0 -14 20 0 M-20 0 Q0 14 20 0" stroke="#fff" stroke-width="3" fill="none"/>`,
  umbrella: (c) => `<path d="M-30 0 A30 26 0 0 1 30 0Z" fill="${c}"/><path d="M0 0 L0 30 Q0 36 -6 34" stroke="#555" stroke-width="3" fill="none"/>`,
};
const SC_COLORS = ['#ff5c9a', '#1e88e5', '#43a047', '#f9a825', '#8e24aa', '#e53935', '#93a5ba'];
export function sceneSVG(seed) {
  const r = shuffle([...Array(9).keys()], 'cell' + seed), keys = shuffle(Object.keys(OBJ), 'obj' + seed).slice(0, 3), cols = shuffle(SC_COLORS, 'col' + seed);
  const items = keys.map((k, i) => { const cell = r[i], x = 50 + (cell % 3) * 100, y = 50 + Math.floor(cell / 3) * 100, s = [0.8, 1, 1.25][(seed + i) % 3]; return `<g transform="translate(${x} ${y}) scale(${s})">${OBJ[k](cols[i])}</g>`; });
  return `<svg viewBox="0 0 300 300" class="scene"><rect width="300" height="300" fill="#fffaf2"/>${items.join('')}</svg>`;
}

// ---------- слова для «Малюй і вгадуй» ----------
const DRAW_WORDS = ['кіт', 'будинок', 'сонце', 'серце', 'квітка', 'дерево', 'риба', 'машина', 'літак', 'торт', 'морозиво', 'зірка', 'місяць', 'хмара', 'парасолька', 'окуляри', 'корона', 'яблуко', 'банан', 'гриб', 'равлик', 'сніговик', 'ялинка', 'подарунок', "м'яч", 'книга', 'чашка', 'ключ', 'телефон', 'годинник', 'лампа', 'ліжко', 'гітара', 'піца', 'веселка', 'гора', 'човен', 'метелик', 'павук', 'слон', 'жираф', 'черепаха', 'пінгвін', 'сова', 'мишка', 'кролик', 'змія', 'ведмідь', 'собака', 'кактус', 'листок', 'вогонь', 'свічка', 'кавун', 'морква', 'груша', 'вишня', 'сир', 'хліб', 'яйце', 'капелюх', 'черевик', 'шарф', 'рукавиця', 'ракета', 'робот', 'корабель', 'велосипед', 'автобус', 'потяг', 'міст', 'замок', 'маяк', 'пляж', 'острів', 'вулкан', 'дощ', 'сніжинка', 'блискавка', 'кит', 'дельфін', 'краб', 'бджола', 'жаба', 'качка', 'курка', 'корова', 'свиня', 'кінь', 'їжак', 'білка', 'лисиця', 'вовк', 'лев', 'тигр', 'мавпа', 'зебра', 'панда', 'жуйка', 'цукерка', 'пончик', 'кава', 'чайник', 'виделка', 'ножиці', 'олівець', 'пензлик', 'годинник', 'дзеркало', 'двері', 'вікно', 'сходи', 'обійми', 'поцілунок', 'кільце', 'троянда'];

// ---------- списки ----------
const others = (d) => (d.by === me() ? d.to : d.by);
function artStatus(d) {
  const mine = d.by === me();
  const st = {
    memory: { guess: mine ? `чекаємо, що вгадає ${A.nameOf(d.to)}` : '👉 вгадай!', grade: mine ? '👉 оціни відповідь' : 'чекаємо оцінку' },
    emoji: { guess: mine ? `чекаємо, що вгадає ${A.nameOf(d.to)}` : '👉 розгадай!', grade: mine ? '👉 оціни відповідь' : 'чекаємо оцінку' },
    micro: { guess: mine ? `чекаємо, що вгадає ${A.nameOf(d.to)}` : '👉 вгадай!', grade: mine ? '👉 оціни відповідь' : 'чекаємо оцінку' },
    song: { guess: mine ? `чекаємо, що вгадає ${A.nameOf(d.to)}` : '👉 вгадай пісню!', grade: mine ? '👉 оціни відповідь' : 'чекаємо оцінку' },
    franken: { s2: mine ? `${A.nameOf(d.to)} малює тулуб` : '👉 намалюй тулуб', s3: mine ? '👉 домалюй лапки' : `${A.nameOf(d.by)} малює лапки` },
    blind: { draw: mine ? `${A.nameOf(d.to)} малює за твоїм описом` : '👉 намалюй за описом', rate: mine ? '👉 оціни схожість' : 'чекаємо оцінку' },
  }[d.type] || {};
  return d.status === 'done' ? '✓ готово' : st[d.status] || '…';
}
const myTurn = (d) => d.status !== 'done' && (
  (['guess'].includes(d.status) && d.to === me()) || (['grade'].includes(d.status) && d.by === me()) ||
  (d.status === 's2' && d.to === me()) || (d.status === 's3' && d.by === me()) || (d.status === 'draw' && d.to === me()) || (d.status === 'rate' && d.by === me()));
export const pendingArt = () => Object.values(S().art).filter(myTurn).length + Object.values(S().live).filter((l) => l.guesser === me() && l.status === 'invited').length;

export function renderWorkshop() {
  const list = Object.values(S().art).filter((d) => d.status !== 'done').sort((a, b) => b.at - a.at);
  const lv = Object.values(S().live).filter((l) => l.status !== 'done' && l.status !== 'cancelled');
  A.app.innerHTML = `<div class="page">${A.top('Творча майстерня')}
    <button class="alb-btn" data-a="go" data-to="album">📖 Наш альбом <span>${Object.values(S().art).filter((d) => d.status === 'done').length}</span></button>
    ${list.length || lv.length ? `<h3 class="sec">Активне</h3>${lv.map((l) => `<button class="hist-row ${l.guesser === me() && l.status === 'invited' ? 'hot' : ''}" data-a="liveOpen" data-id="${l.id}"><span>✏️ Малюй і вгадуй наживо</span><span>${l.guesser === me() && l.status === 'invited' ? '👉 приєднатися!' : l.status === 'invited' ? 'чекаємо партнера' : 'триває'}</span></button>`).join('')}
      ${list.map((d) => `<button class="hist-row ${myTurn(d) ? 'hot' : ''}" data-a="artOpen" data-id="${d.id}"><span>${MODES[d.type].icon} ${esc(MODES[d.type].name)}</span><span>${esc(artStatus(d))}</span></button>`).join('')}` : ''}
    <h3 class="sec">Створити</h3>
    ${ORDER.map((k) => `<div class="card mode-c"><div class="dc-top"><span class="dc-ico">${MODES[k].icon}</span><div><b>${MODES[k].name}</b><div class="muted small">${MODES[k].pts}</div></div></div><p class="small">${MODES[k].desc}</p><button class="btn sm" data-a="artNew" data-m="${k}">Почати</button></div>`).join('')}
  </div>`;
}

// ---------- створення ----------
let pad = null, rec = null, media = null;
export const isEditing = () => !!(pad || rec || S().view === 'artnew');
export function renderArtNew() {
  const m = S().artMode, M = MODES[m], p = A.pUid();
  if (!p) { A.app.innerHTML = `<div class="page">${A.top(M.name)}<p>Потрібен партнер 🙂</p></div>`; return; }
  const head = `<div class="page">${A.top(`${M.icon} ${M.name}`)}<p class="muted small">${M.desc}</p>`;
  const send = '<button class="btn" data-a="artSend">Надіслати 💌</button>';
  if (m === 'memory') { A.app.innerHTML = head + `<div class="card"><div id="padBox"></div><input id="artAns" placeholder="Що це за спогад? (бачиш лише ти)"></div>${send}</div>`; pad = drawPad(document.getElementById('padBox')); }
  else if (m === 'franken') { A.app.innerHTML = head + `<div class="card"><b>Етап 1 з 3: намалюй ГОЛОВУ</b><p class="muted small">Низ голови/шиї доведи до нижнього краю — там почне ${esc(A.nameOf(p))}.</p><div id="padBox"></div></div>${send}</div>`; pad = drawPad(document.getElementById('padBox'), { h: 300 }); }
  else if (m === 'emoji') { A.app.innerHTML = head + `<div class="card"><input id="artEmoji" class="emoji-in" placeholder="🐱🍕🌧️🚕💋" inputmode="text"><input id="artAns" placeholder="Правильна відповідь (бачиш лише ти)"></div>${send}</div>`; }
  else if (m === 'micro') { A.app.innerHTML = head + `<div class="card"><label class="file">📷 Зробити / обрати фото<input type="file" accept="image/*" id="artFile"></label><div id="artPrev"></div><input id="artAns" placeholder="Що на фото? (бачиш лише ти)"></div>${send}</div>`;
    document.getElementById('artFile').onchange = async (e) => { const f = e.target.files?.[0]; if (!f) return; try { media = await compressFile(f); document.getElementById('artPrev').innerHTML = `<img class="ph" src="${media.full}">`; } catch { A.toast('Не вдалося прочитати фото'); } }; }
  else if (m === 'song') { A.app.innerHTML = head + `<div class="card"><div id="recBox"></div><input id="artAns" placeholder="Назва пісні (бачиш лише ти)"></div>${send}</div>`; recorder(document.getElementById('recBox')); }
  else if (m === 'blind') { S().blindSeed = S().blindSeed || Math.floor(Math.random() * 1e6); A.app.innerHTML = head + `<div class="card center">${sceneSVG(S().blindSeed)}<button class="link" data-a="blindNew">Інша картинка</button></div><div class="card"><textarea id="artDesc" rows="4" placeholder="Опиши картинку, не називаючи предмети прямо. Напр.: «угорі ліворуч щось кругле й гаряче…»"></textarea></div>${send}</div>`; }
  else if (m === 'live') { const opts = shuffle(DRAW_WORDS, 'w' + Date.now()).slice(0, 3); A.app.innerHTML = head + `<div class="card center"><p>Обери, що малюватимеш (${esc(A.nameOf(p))} не бачить):</p><div class="chips">${opts.map((w) => `<button class="chip" data-a="liveStart" data-w="${esc(w)}">${esc(w)}</button>`).join('')}</div><p class="muted small">Партнер отримає запрошення. Гра почнеться, коли він(вона) приєднається.</p></div></div>`; }
}

function recorder(box) {
  rec = { blob: null, url: null, mr: null };
  const draw = () => {
    box.innerHTML = rec.mr ? `<div class="rec"><span class="dot"></span> Запис… <b id="rt">0:00</b></div><button class="btn sm" id="rStop">⏹ Зупинити</button>`
      : rec.blob ? `<audio controls src="${rec.url}"></audio><button class="btn ghost sm" id="rGo">🎙 Перезаписати</button>` : `<button class="btn rec-btn" id="rGo">🎙 Почати мугикати</button>`;
    box.querySelector('#rGo')?.addEventListener('click', start); box.querySelector('#rStop')?.addEventListener('click', () => rec.mr?.stop());
  };
  const start = async () => {
    let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { return A.toast('Немає доступу до мікрофона'); }
    const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || '';
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : {}), ch = [], t0 = Date.now();
    mr.ondataavailable = (e) => e.data?.size && ch.push(e.data);
    mr.onstop = () => { stream.getTracks().forEach((t) => t.stop()); clearInterval(iv); rec.mr = null; rec.blob = new Blob(ch, { type: (mr.mimeType || mime || 'audio/webm').split(';')[0] }); rec.url = URL.createObjectURL(rec.blob); draw(); };
    const iv = setInterval(() => { const s = (Date.now() - t0) / 1000, el = document.getElementById('rt'); if (el) el.textContent = `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`; if (s > 60) mr.stop(); }, 300);
    rec.mr = mr; mr.start(1000); draw();
  };
  draw();
}
const b64 = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
async function saveAudio(id, blob) { const s = await b64(blob), n = Math.ceil(s.length / 700000); for (let i = 0; i < n; i++) await A.setDoc(A.doc(A.db, 'audio', `art_${id}_${i}`), { data: s.slice(i * 700000, (i + 1) * 700000) }); return n; }
async function loadAudio(id, n, type) { let s = ''; for (let i = 0; i < n; i++) s += (await A.getDoc(A.doc(A.db, 'audio', `art_${id}_${i}`))).data()?.data || ''; const bin = atob(s), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return URL.createObjectURL(new Blob([a], { type })); }

async function artSend() {
  const m = S().artMode, p = A.pUid(), id = `${m}_${Date.now().toString(36)}_${me().slice(0, 4)}`, ans = document.getElementById('artAns')?.value.trim() || '';
  const d = { type: m, by: me(), to: p, at: Date.now(), status: 'guess', guesses: [] };
  if (m === 'memory') { if (pad.empty()) return A.toast('Спершу намалюй 🙂'); if (!ans) return A.toast('Напиши, що це за спогад'); const full = pad.jpeg(0.8); await A.setDoc(imgRef(id), { img: full }); d.thumb = await thumbOf(full); d.answer = ans; }
  if (m === 'franken') { if (pad.empty()) return A.toast('Намалюй голову 🙂'); const full = pad.jpeg(0.8); await A.setDoc(imgRef(id + '_1'), { img: full }); d.status = 's2'; }
  if (m === 'emoji') { const e = document.getElementById('artEmoji').value.trim(); if (!e) return A.toast('Додай смайлики'); if (!ans) return A.toast('Напиши відповідь'); d.emoji = e; d.answer = ans; }
  if (m === 'micro') { if (!media) return A.toast('Додай фото'); if (!ans) return A.toast('Напиши, що на фото'); await A.setDoc(imgRef(id), { img: media.full }); d.thumb = media.thumb; d.answer = ans; d.level = 0; }
  if (m === 'song') { if (rec?.mr) return A.toast('Зупини запис'); if (!rec?.blob) return A.toast('Запиши мелодію'); if (!ans) return A.toast('Напиши назву пісні'); d.audioParts = await saveAudio(id, rec.blob); d.audioType = rec.blob.type || 'audio/webm'; d.answer = ans; }
  if (m === 'blind') { const t = document.getElementById('artDesc').value.trim(); if (t.length < 10) return A.toast('Опиши трохи детальніше'); d.seed = S().blindSeed; d.desc = t; d.status = 'draw'; S().blindSeed = 0; }
  await A.setDoc(artRef(id), d);
  A.notify(p, `${MODES[m].icon} Тобі завдання в майстерні`, `${A.nameOf(me())}: «${MODES[m].name}»`);
  pad = null; rec = null; media = null; A.toast('Надіслано 💌'); S().view = 'workshop'; A.render();
}

// ---------- відкрите завдання ----------
export function renderArt() {
  const d = S().art[S().artId]; if (!d) { A.app.innerHTML = `<div class="page">${A.top('Майстерня')}<p>Не знайдено.</p></div>`; return; }
  const M = MODES[d.type], mine = d.by === me(), p = others(d), pn = esc(A.nameOf(p));
  const page = (html) => { A.app.innerHTML = `<div class="page">${A.top(`${M.icon} ${M.name}`)}${html}</div>`; };
  if (d.status === 'done') return page(albumDetailHTML(d));
  const guessForm = (label) => `<div class="row"><input id="gIn" placeholder="${label}" autocomplete="off"><button class="btn sm" data-a="artGuess">OK</button></div>`;
  const prevGuesses = (d.guesses || []).map((g) => `<div class="small">❌ «${esc(g.text)}»</div>`).join('');
  const gradeBox = (g) => `<div class="card"><div class="muted small">Правильна відповідь: <b>${esc(d.answer)}</b></div><p>${pn} вгадує: <b>«${esc(g)}»</b></p>
    <div class="row3"><button class="btn sm" data-a="artGrade" data-v="2">Точно ✓</button>${['memory', 'emoji', 'song'].includes(d.type) ? '<button class="btn ghost sm" data-a="artGrade" data-v="1">Майже</button>' : ''}<button class="btn ghost sm" data-a="artGrade" data-v="0">Ні ✗</button></div></div>`;

  if (['memory', 'emoji', 'micro', 'song'].includes(d.type)) {
    let media = '';
    if (d.type === 'memory') media = `<div class="card center"><img class="ph" id="artImg" src="${d.thumb}"></div>`;
    if (d.type === 'emoji') media = `<div class="card center"><div class="emoji-big">${esc(d.emoji)}</div></div>`;
    if (d.type === 'micro') { const z = [4, 2.2, 1][Math.min(2, d.level || 0)]; media = `<div class="card center"><div class="micro" id="microBox" style="--z:${mine ? 1 : z}"><img id="artImg" src="${d.thumb}"></div>${mine ? '' : `<div class="muted small">Спроба ${(d.level || 0) + 1} з 3 · збільшення ×${z}</div>`}</div>`; }
    if (d.type === 'song') media = `<div class="card center"><button class="btn ghost" data-a="artPlay">▶ Слухати мелодію</button><div id="artAud"></div></div>`;
    if (d.status === 'guess') return page(media + (mine ? `<p class="muted center-t">Чекаємо, що вгадає ${pn}… Твоя відповідь: <b>${esc(d.answer)}</b></p>` : prevGuesses + guessForm(d.type === 'song' ? 'Назва пісні' : 'Твоя відповідь')), loadFull(d));
    if (d.status === 'grade') { const g = d.guesses[d.guesses.length - 1].text; page(media + (mine ? gradeBox(g) : `<p class="center-t">Твоя відповідь «${esc(g)}» на перевірці в ${pn}…</p>`)); return loadFull(d); }
  }
  if (d.type === 'franken') {
    const stage = d.status === 's2' ? 2 : 3, turn = (stage === 2 && !mine) || (stage === 3 && mine);
    if (!turn) return page(`<div class="card center">${A.catSVG(80, 'bob')}<p>${stage === 2 ? `${pn} малює тулуб…` : `${pn} домальовує лапки…`}</p><p class="muted small">Ти побачиш результат, коли все буде готово!</p></div>`);
    page(`<div class="card"><b>Етап ${stage} з 3: намалюй ${stage === 2 ? 'ТУЛУБ' : 'ЛАПКИ й ХВІСТ'}</b><p class="muted small">Зверху видно лише краєчок попереднього малюнка — продовж лінії від нього.</p><div id="padBox"></div></div><button class="btn" data-a="frankSend">${stage === 3 ? 'Завершити і відкрити! 🎉' : 'Передати далі 💌'}</button>`);
    A.getDoc(imgRef(`${d.id}_${stage - 1}`)).then(async (s) => { const src = s.data()?.img; const strip = src ? await cropBottom(src, 0.12) : null; if (document.getElementById('padBox')) pad = drawPad(document.getElementById('padBox'), { h: 300, hint: strip }); });
    return;
  }
  if (d.type === 'blind') {
    if (d.status === 'draw') {
      if (mine) return page(`<div class="card center">${sceneSVG(d.seed)}<p>Твій опис: «${esc(d.desc)}»</p><p class="muted">${pn} малює…</p></div>`);
      page(`<div class="card"><b>Опис від ${pn}:</b><p class="quote">«${esc(d.desc)}»</p><div id="padBox"></div></div><button class="btn" data-a="blindSend">Готово — порівняти! 👀</button>`);
      pad = drawPad(document.getElementById('padBox')); return;
    }
    if (d.status === 'rate') {
      page(`<div class="cmp"><div><div class="muted small">Оригінал</div>${sceneSVG(d.seed)}</div><div><div class="muted small">Малюнок ${mine ? pn : 'твій'}</div><img id="artImg" src="${d.thumb}"></div></div>
        ${mine ? `<div class="card center"><p>Наскільки схоже?</p><div class="stars">${[1, 2, 3, 4, 5].map((n) => `<button data-a="blindRate" data-v="${n}">⭐</button>`).join('')}</div></div>` : `<p class="center-t muted">${pn} оцінює схожість…</p>`}`);
      return loadFull(d);
    }
  }
}
function loadFull(d) { A.getDoc(imgRef(d.id)).then((s) => { const el = document.getElementById('artImg'), src = s.data()?.img; if (el && src) el.src = src; }).catch(() => {}); }
async function cropBottom(src, frac) { const img = await loadImg(src); const c = document.createElement('canvas'); c.width = img.width; c.height = Math.round(img.height * frac); c.getContext('2d').drawImage(img, 0, img.height - c.height, img.width, c.height, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.8); }

const P = { memory: [0, 10, 20, 5], emoji: [0, 7, 15, 3], song: [0, 10, 20, 5] }; // [ні, майже, точно, автору]
async function finish(d, upd, pts) {
  await A.updateDoc(artRef(d.id), { ...upd, status: 'done', doneAt: Date.now() });
  for (const [uid, amt, tag] of pts) if (amt > 0) await A.award(`art_${d.id}_${tag}`, uid, amt, 'Майстерня');
}
async function artGuess() {
  const d = S().art[S().artId], t = document.getElementById('gIn').value.trim(); if (!t) return;
  await A.updateDoc(artRef(d.id), { guesses: [...(d.guesses || []), { text: t, at: Date.now() }], status: 'grade' });
  A.notify(d.by, '✍️ Оціни відповідь', `${A.nameOf(me())} вгадує у «${MODES[d.type].name}»`);
}
async function artGrade(v) {
  const d = S().art[S().artId], gs = [...d.guesses]; gs[gs.length - 1] = { ...gs[gs.length - 1], v };
  if (d.type === 'micro') {
    const lvl = d.level || 0;
    if (v === 2) return finish(d, { guesses: gs, result: 2 }, [[d.to, [20, 12, 6][lvl], 'g'], [d.by, 5, 'a']]);
    if (lvl >= 2) return finish(d, { guesses: gs, result: 0 }, [[d.by, 5, 'a']]);
    return A.updateDoc(artRef(d.id), { guesses: gs, level: lvl + 1, status: 'guess' });
  }
  if (d.type === 'song' && v === 0 && gs.length < 2) return A.updateDoc(artRef(d.id), { guesses: gs, status: 'guess' });
  const t = P[d.type]; return finish(d, { guesses: gs, result: v }, [[d.to, t[v], 'g'], [d.by, t[3], 'a']]);
}
async function frankSend() {
  const d = S().art[S().artId]; if (!pad || pad.empty()) return A.toast('Спершу намалюй 🙂');
  const stage = d.status === 's2' ? 2 : 3; await A.setDoc(imgRef(`${d.id}_${stage}`), { img: pad.jpeg(0.8) }); pad = null;
  if (stage === 2) { await A.updateDoc(artRef(d.id), { status: 's3' }); A.notify(d.by, '🧟 Твоя черга!', 'Домалюй лапки котику-франкенштейну'); return A.render(); }
  const parts = await Promise.all([1, 2, 3].map((i) => A.getDoc(imgRef(`${d.id}_${i}`)).then((s) => s.data()?.img)));
  const full = await stackImages(parts); await A.setDoc(imgRef(d.id), { img: full });
  await finish(d, { thumb: await thumbOf(full) }, [[d.by, 15, 'a'], [d.to, 15, 'g']]);
  A.notify(d.to, '🧟 Франкенштейн готовий!', 'Відкривай альбом — подивись, що вийшло 😂');
  A.render();
}
async function blindSend() {
  const d = S().art[S().artId]; if (!pad || pad.empty()) return A.toast('Спершу намалюй 🙂');
  const full = pad.jpeg(0.8); pad = null; await A.setDoc(imgRef(d.id), { img: full });
  await A.updateDoc(artRef(d.id), { thumb: await thumbOf(full), status: 'rate' });
  A.notify(d.by, '🙈 Малюнок готовий', 'Порівняй з оригіналом і оціни схожість');
}

// ---------- наживо ----------
let liveTimer = 0, livePush = 0;
async function liveStart(word) {
  const p = A.pUid(), id = `live_${Date.now().toString(36)}`;
  await A.setDoc(liveRef(id), { date: A.today(), drawer: me(), guesser: p, word, status: 'invited', at: Date.now(), strokes: [], guesses: [] });
  A.notify(p, '✏️ Малюй і вгадуй наживо!', `${A.nameOf(me())} кличе вгадувати малюнок — заходь у Творчу майстерню`);
  S().liveId = id; S().view = 'live'; A.render();
}
export function renderLive() {
  const l = S().live[S().liveId]; if (!l) { A.app.innerHTML = `<div class="page">${A.top('Наживо')}<p>Гру не знайдено.</p></div>`; return; }
  const drawer = l.drawer === me(), on = l.status === 'on', left = l.startAt ? Math.max(0, 90 - Math.floor((Date.now() - l.startAt) / 1000)) : 90;
  const top = A.top('✏️ Малюй і вгадуй');
  if (l.status === 'invited') {
    A.app.innerHTML = `<div class="page">${top}<div class="card center">${drawer ? `<p>Чекаємо на ${esc(A.nameOf(l.guesser))}…</p><p class="muted small">Слово: <b>${esc(l.word)}</b></p><button class="link" data-a="liveCancel">Скасувати</button>` : `<p>${esc(A.nameOf(l.drawer))} малюватиме — а ти вгадуєш!</p><button class="btn" data-a="liveJoin">Приєднатися ✏️</button>`}</div></div>`; return;
  }
  if (l.status === 'done' || l.status === 'cancelled') {
    A.app.innerHTML = `<div class="page">${top}<div class="card center"><h2>${l.solvedBy ? '🎉 Вгадано!' : '⏰ Час вийшов'}</h2><p>Слово: <b>${esc(l.word)}</b></p>${l.solvedBy ? `<p>За ${l.solvedSec} с · ${drawer ? 'тобі +10' : `тобі +${l.pts}`}</p>` : ''}<canvas class="pad view" id="lvC" width="600" height="600"></canvas>
      <div class="row"><button class="btn ghost" data-a="go" data-to="workshop">До майстерні</button><button class="btn" data-a="artNew" data-m="live">Ще раз</button></div></div></div>`;
    paintAll(document.getElementById('lvC'), l.strokes); return;
  }
  if (drawer) {
    if (!pad) {
      A.app.innerHTML = `<div class="page">${top}<div class="g-hint">Малюй: <b>${esc(l.word)}</b> · ⏱ <b id="lvT">${left}</b> с</div><div class="card"><div id="padBox"></div></div><div id="lvG" class="g-log"></div></div>`;
      pad = drawPad(document.getElementById('padBox'), { onChange: () => { clearTimeout(livePush); livePush = setTimeout(pushStrokes, 250); } });
      document.querySelector('.pad').addEventListener('pointermove', () => { if (!livePush) livePush = setTimeout(pushStrokes, 400); });
    }
    const g = document.getElementById('lvG'); if (g) g.innerHTML = (l.guesses || []).slice(-5).reverse().map((x) => `<div class="op">${esc(x)}</div>`).join('');
  } else {
    if (!document.getElementById('lvC')) {
      A.app.innerHTML = `<div class="page">${top}<div class="g-hint">Що малює ${esc(A.nameOf(l.drawer))}? · ⏱ <b id="lvT">${left}</b> с</div><div class="card"><canvas class="pad view" id="lvC" width="600" height="600"></canvas></div>
        <div class="row"><input id="lvIn" placeholder="Твоя здогадка" autocomplete="off"><button class="btn sm" data-a="liveGuess">OK</button></div><div id="lvG" class="g-log"></div></div>`;
      document.getElementById('lvIn').onkeydown = (e) => e.key === 'Enter' && liveGuess();
    }
    paintAll(document.getElementById('lvC'), l.strokes);
    document.getElementById('lvG').innerHTML = (l.guesses || []).slice(-5).reverse().map((x) => `<div class="me">${esc(x)}</div>`).join('');
  }
  clearInterval(liveTimer);
  liveTimer = setInterval(() => {
    const cur = S().live[S().liveId]; if (!cur || S().view !== 'live' || cur.status !== 'on') return clearInterval(liveTimer);
    const s = Math.max(0, 90 - Math.floor((Date.now() - cur.startAt) / 1000)), el = document.getElementById('lvT'); if (el) el.textContent = s;
    if (s <= 0) { clearInterval(liveTimer); A.updateDoc(liveRef(cur.id), { status: 'done' }).catch(() => {}); }
  }, 500);
}
function paintAll(cv, strokes) { if (!cv) return; const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); for (const s of strokes || []) paint(x, s, cv.width, cv.height); }
async function pushStrokes() { livePush = 0; const l = S().live[S().liveId]; if (!l || !pad || l.status !== 'on') return; await A.updateDoc(liveRef(l.id), { strokes: pad.strokes.map((s) => ({ c: s.c, w: s.w, p: s.p.slice() })) }).catch(() => {}); }
async function liveGuess() {
  const l = S().live[S().liveId], inp = document.getElementById('lvIn'), t = inp.value.trim(); if (!t || l.status !== 'on') return; inp.value = '';
  if (norm(t) === norm(l.word)) {
    const sec = Math.round((Date.now() - l.startAt) / 1000), pts = Math.max(10, 30 - Math.floor(sec / 6));
    await A.updateDoc(liveRef(l.id), { status: 'done', solvedBy: me(), solvedSec: sec, pts, guesses: [...(l.guesses || []), t] });
    await A.award(`live_${l.id}_g`, me(), pts, 'Майстерня'); await A.award(`live_${l.id}_d`, l.drawer, 10, 'Майстерня');
    const thumbC = document.getElementById('lvC'); if (thumbC) { const full = thumbC.toDataURL('image/jpeg', 0.8); await A.setDoc(imgRef(l.id), { img: full }); await A.setDoc(artRef(l.id), { type: 'live', by: l.drawer, to: me(), at: l.at, status: 'done', doneAt: Date.now(), answer: l.word, thumb: await thumbOf(full), result: 2, guesses: [{ text: t, v: 2 }] }); }
  } else await A.updateDoc(liveRef(l.id), { guesses: [...(l.guesses || []), t] });
}
export function onLiveUpdate() { if (S().view === 'live') renderLive(); }

// ---------- альбом ----------
const FILTERS = [['all', 'Усе'], ...ORDER.map((k) => [k, MODES[k].icon])];
export function renderAlbum() {
  const f = S().albF || 'all', list = Object.values(S().art).filter((d) => d.status === 'done' && (f === 'all' || d.type === f)).sort((a, b) => (b.doneAt || b.at) - (a.doneAt || a.at));
  A.app.innerHTML = `<div class="page">${A.top('📖 Наш альбом')}
    <div class="tabs scroll">${FILTERS.map(([k, n]) => `<button class="${f === k ? 'sel' : ''}" data-a="albF" data-f="${k}">${n}</button>`).join('')}</div>
    ${list.length ? `<div class="alb-grid">${list.map((d) => `<button class="alb-it" data-a="artOpen" data-id="${d.id}">${d.thumb ? `<img src="${d.thumb}">` : d.type === 'emoji' ? `<div class="alb-emo">${esc(d.emoji)}</div>` : `<div class="alb-emo">${MODES[d.type].icon}</div>`}
      <span class="alb-like">${Object.keys(d.likes || {}).length ? '❤ ' + Object.keys(d.likes).length : ''}</span></button>`).join('')}</div>` : '<div class="card center"><p>Тут з\'являтимуться ваші малюнки, фото й пісні 💕</p></div>'}</div>`;
}
function albumDetailHTML(d) {
  const M = MODES[d.type], liked = !!d.likes?.[me()], who = (u) => esc(u === me() ? 'Ти' : A.nameOf(u));
  let body = '';
  if (d.type === 'emoji') body = `<div class="emoji-big">${esc(d.emoji)}</div>`;
  else if (d.type === 'song') body = `<button class="btn ghost" data-a="artPlay">▶ Слухати</button><div id="artAud"></div>`;
  else if (d.type === 'blind') body = `<div class="cmp"><div><div class="muted small">Оригінал</div>${sceneSVG(d.seed)}</div><div><div class="muted small">Малюнок</div><img id="artImg" src="${d.thumb}"></div></div><p class="quote">«${esc(d.desc)}»</p><p>Схожість: ${'⭐'.repeat(d.rating || 0)}</p>`;
  else body = `<img class="ph" id="artImg" src="${d.thumb}">`;
  setTimeout(() => loadFull(d), 0);
  const res = d.result === 2 ? '✅ вгадано' : d.result === 1 ? '🙂 майже' : d.result === 0 ? '❌ не вгадано' : '';
  return `<div class="card center">${body}
    ${d.answer ? `<p>Відповідь: <b>${esc(d.answer)}</b></p>` : ''}${d.guesses?.length ? `<p class="small">Здогадки: ${d.guesses.map((g) => `«${esc(g.text)}»`).join(', ')} ${res}</p>` : ''}
    <p class="muted small">${M.icon} ${esc(M.name)} · автор: ${who(d.by)} · ${new Date(d.doneAt || d.at).toLocaleDateString('uk-UA')}</p>
    <div class="row"><button class="btn ghost sm" data-a="artLike">${liked ? '❤' : '🤍'} ${Object.keys(d.likes || {}).length}</button>${d.type === 'song' || d.type === 'emoji' ? '' : '<button class="btn ghost sm" data-a="artDl">⬇ Зберегти</button>'}<button class="btn sm" data-a="go" data-to="album">До альбому</button></div></div>`;
}

export const workshopActions = {
  artNew: (el) => { S().artMode = el.dataset.m; pad = null; rec = null; media = null; S().view = 'artnew'; A.render(); },
  artSend: () => A.safe(artSend),
  artOpen: (el) => { S().artId = el.dataset.id; pad = null; S().view = 'art'; A.render(); },
  artGuess: () => A.safe(artGuess),
  artGrade: (el) => A.safe(() => artGrade(+el.dataset.v)),
  frankSend: () => A.safe(frankSend),
  blindSend: () => A.safe(blindSend),
  blindNew: () => { S().blindSeed = Math.floor(Math.random() * 1e6); renderArtNew(); },
  blindRate: (el) => A.safe(async () => { const d = S().art[S().artId], n = +el.dataset.v; await finish(d, { rating: n }, [[d.by, n * 4, 'a'], [d.to, n * 4, 'g']]); }),
  artPlay: () => A.safe(async () => { const d = S().art[S().artId], box = document.getElementById('artAud'); box.innerHTML = '<span class="muted small">Завантаження…</span>'; box.innerHTML = `<audio controls autoplay src="${await loadAudio(d.id, d.audioParts, d.audioType)}"></audio>`; }),
  artLike: () => A.safe(() => { const d = S().art[S().artId], likes = { ...(d.likes || {}) }; if (likes[me()]) delete likes[me()]; else likes[me()] = true; return A.updateDoc(artRef(d.id), { likes }); }),
  artDl: () => { const src = document.getElementById('artImg')?.src; if (!src) return; const a = document.createElement('a'); a.href = src; a.download = `murchyky-${S().artId}.jpg`; document.body.appendChild(a); a.click(); a.remove(); },
  albF: (el) => { S().albF = el.dataset.f; renderAlbum(); },
  liveStart: (el) => A.safe(() => liveStart(el.dataset.w)),
  liveOpen: (el) => { S().liveId = el.dataset.id; pad = null; S().view = 'live'; A.render(); },
  liveJoin: () => A.safe(() => A.updateDoc(liveRef(S().liveId), { status: 'on', startAt: Date.now() })),
  liveCancel: () => A.safe(async () => { await A.updateDoc(liveRef(S().liveId), { status: 'cancelled' }); S().view = 'workshop'; A.render(); }),
  liveGuess: () => A.safe(liveGuess),
};
export const resetWorkshop = () => { pad = null; rec?.mr?.stop?.(); rec = null; media = null; };
