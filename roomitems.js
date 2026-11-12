// ===== Кімната котика: каталог меблів, стилі (набори), рівні затишку, види з вікна =====
// Координати кімнати — в «одиницях»: висота 300, ширина 360 / 480 / 600 (залежить від рівня затишку).
// Стіна — від 0 до WALL_H, підлога — нижче. Предмет підлоги стоїть нижнім краєм на FLOOR_Y.
import { kyivHour } from './util.js';

export const ROOM_H = 300, WALL_H = 206, FLOOR_Y = 290, BASE_W = 360;

// Набори (стилі). bonus — ексклюзиви для котика (avatar.js), fx — живий ефект у кімнаті
export const SETS = {
  cl: { name: 'Затишна класика', icon: '🧺', bonus: ['k_plaid', 'k_t_cozy'], fx: 'Теплі вогники' },
  pk: { name: 'Рожева мрія', icon: '🌸', bonus: ['k_tiara', 'k_t_pink'], fx: 'Пелюстки' },
  sc: { name: 'Шотландський замок', icon: '🏰', bonus: ['k_tartan', 'k_t_scot'], fx: 'Іскри каміна' },
  st: { name: 'Зоряна ніч', icon: '🌙', bonus: ['k_moon', 'k_t_star'], fx: 'Падаючі зірки' },
  ro: { name: 'Королівські покої', icon: '👑', bonus: ['k_ermine', 'k_t_royal'], fx: 'Золоті іскорки' },
};
export const FX_MIN_PLACED = 3; // живий ефект — коли набір зібрано і в кімнаті стоять щонайменше 3 його речі

// Рівні затишку: затишок = сума (ціна / 10) усіх твоїх меблів
export const LEVELS = [
  { n: 1, name: 'Куточок', min: 0, w: 360, view: 'city', gives: 'кімната, вид «Місто»' },
  { n: 2, name: 'Затишна кімната', min: 30, w: 360, view: 'garden', gives: 'полиці, вид «Сад»' },
  { n: 3, name: 'Простора кімната', min: 120, w: 480, view: 'sea', gives: 'кімната ширша, вид «Море»' },
  { n: 4, name: 'Котячий рай', min: 350, w: 480, view: 'hills', gives: 'вид «Гори»' },
  { n: 5, name: 'Палац мурчання', min: 900, w: 600, view: 'space', gives: 'найбільша кімната, вид «Космос»' },
];
export const VIEWS = { city: 'Місто', garden: 'Сад', sea: 'Море', hills: 'Гори', space: 'Космос' };
export const SHELF_LEVEL = 2;

// ---------- малюнки ----------
const heartPath = (cx, cy, s) => `M${cx} ${cy + 3 * s} C${cx - 6 * s} ${cy - 3 * s} ${cx - 4 * s} ${cy - 8 * s} ${cx} ${cy - 4 * s} C${cx + 4 * s} ${cy - 8 * s} ${cx + 6 * s} ${cy - 3 * s} ${cx} ${cy + 3 * s}Z`;
const star = (x, y, r, fill) => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; d += `${i ? 'L' : 'M'}${(x + rr * Math.cos(a)).toFixed(1)} ${(y + rr * Math.sin(a)).toFixed(1)} `; } return `<path d="${d}Z" fill="${fill}"/>`; };
// одинарні лапки: значення потрапляє в style="…", подвійні лапки його б обірвали
const svgUrl = (s) => `url('data:image/svg+xml,${encodeURIComponent(s).replace(/'/g, '%27')}')`;

// Вид з вікна: за київським часом (ранок/день/вечір/ніч) і порою року
export function dayPhase(h = kyivHour()) { return h >= 5 && h < 9 ? 'morning' : h >= 9 && h < 17 ? 'day' : h >= 17 && h < 21 ? 'evening' : 'night'; }
export function season(d = new Date()) { const m = d.getMonth() + 1; return m === 12 || m <= 2 ? 'winter' : m <= 5 ? 'spring' : m <= 8 ? 'summer' : 'autumn'; }
const SKY = { morning: ['#ffd1a8', '#ffeede'], day: ['#7cc4ff', '#cdeaff'], evening: ['#7a5ca8', '#ff9f80'], night: ['#141a3c', '#2c3570'] };
const GROUND = { winter: '#eef4fb', spring: '#9fd67a', summer: '#6cbf4f', autumn: '#d9a04a' };
const LEAF = { winter: '#dfe9f3', spring: '#ffc2d8', summer: '#4fa83b', autumn: '#e8873a' };

function viewSVG(id, type, w, h, ph, se) {
  const night = ph === 'night' || type === 'space', sky = type === 'space' ? ['#0b0f2a', '#1c2152'] : SKY[ph];
  const g = `<defs><linearGradient id="sk${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#sk${id})"/>`;
  let body = '';
  // небесне світило
  if (type === 'space') body += `${star(w * 0.2, h * 0.2, 2, '#fff')}${star(w * 0.75, h * 0.15, 1.6, '#fff8c8')}${star(w * 0.55, h * 0.45, 1.3, '#fff')}${star(w * 0.15, h * 0.7, 1.5, '#cfe0ff')}<circle cx="${w * 0.66}" cy="${h * 0.62}" r="${h * 0.16}" fill="#ff9e6b"/><ellipse cx="${w * 0.66}" cy="${h * 0.62}" rx="${h * 0.28}" ry="${h * 0.06}" fill="none" stroke="#ffd59e" stroke-width="2"/><circle cx="${w * 0.3}" cy="${h * 0.42}" r="${h * 0.07}" fill="#8ad0ff"/>`;
  else if (night) body += `<circle cx="${w * 0.72}" cy="${h * 0.24}" r="${h * 0.09}" fill="#fff6c8"/><circle cx="${w * 0.76}" cy="${h * 0.21}" r="${h * 0.08}" fill="${sky[0]}"/>${star(w * 0.2, h * 0.18, 1.8, '#fff')}${star(w * 0.45, h * 0.3, 1.3, '#fff')}${star(w * 0.32, h * 0.12, 1.1, '#fff')}`;
  else { const pos = { morning: [0.22, 0.55, '#ffb35c'], day: [0.7, 0.2, '#ffe14d'], evening: [0.78, 0.58, '#ff6a4d'] }[ph]; body += `<circle cx="${w * pos[0]}" cy="${h * pos[1]}" r="${h * 0.1}" fill="${pos[2]}"/>${ph === 'day' ? `<g fill="#fff" opacity=".9"><ellipse cx="${w * 0.3}" cy="${h * 0.22}" rx="${w * 0.14}" ry="${h * 0.05}"/><ellipse cx="${w * 0.38}" cy="${h * 0.19}" rx="${w * 0.1}" ry="${h * 0.05}"/></g>` : ''}`; }
  const gr = GROUND[se], lit = night ? '#ffd76a' : '#cfe6ff';
  if (type === 'city') { const bs = [[0, 0.5, 0.2], [0.18, 0.35, 0.18], [0.34, 0.55, 0.16], [0.48, 0.28, 0.22], [0.68, 0.45, 0.16], [0.82, 0.32, 0.2]]; body += bs.map(([x, t, bw], i) => `<rect x="${w * x}" y="${h * t}" width="${w * bw}" height="${h}" fill="${night ? '#2b2f52' : ['#c9b6d9', '#b3c4e0', '#d8c2c9'][i % 3]}"/><rect x="${w * (x + bw * 0.25)}" y="${h * (t + 0.08)}" width="${w * bw * 0.18}" height="${h * 0.06}" fill="${lit}"/><rect x="${w * (x + bw * 0.6)}" y="${h * (t + 0.2)}" width="${w * bw * 0.18}" height="${h * 0.06}" fill="${lit}"/>`).join('') + `<rect y="${h * 0.9}" width="${w}" height="${h * 0.1}" fill="${gr}"/>`; }
  if (type === 'garden') body += `<rect y="${h * 0.72}" width="${w}" height="${h * 0.28}" fill="${gr}"/><rect x="${w * 0.24}" y="${h * 0.5}" width="${w * 0.05}" height="${h * 0.25}" fill="#8b5a3c"/><circle cx="${w * 0.265}" cy="${h * 0.46}" r="${h * 0.16}" fill="${LEAF[se]}"/><rect x="${w * 0.7}" y="${h * 0.56}" width="${w * 0.04}" height="${h * 0.18}" fill="#8b5a3c"/><circle cx="${w * 0.72}" cy="${h * 0.52}" r="${h * 0.12}" fill="${LEAF[se]}"/>${se === 'winter' ? '' : `<circle cx="${w * 0.45}" cy="${h * 0.84}" r="2.5" fill="#ff7fb0"/><circle cx="${w * 0.55}" cy="${h * 0.9}" r="2.5" fill="#ffd34d"/><circle cx="${w * 0.12}" cy="${h * 0.88}" r="2.5" fill="#fff"/>`}`;
  if (type === 'sea') body += `<rect y="${h * 0.55}" width="${w}" height="${h * 0.45}" fill="${night ? '#1d3a6b' : '#3d8fd6'}"/><path d="M0 ${h * 0.68} q${w * 0.1} -4 ${w * 0.2} 0 t${w * 0.2} 0 t${w * 0.2} 0 t${w * 0.2} 0 t${w * 0.2} 0" stroke="#bfe3ff" stroke-width="1.5" fill="none" opacity=".7"/><path d="M0 ${h * 0.82} q${w * 0.1} -4 ${w * 0.2} 0 t${w * 0.2} 0 t${w * 0.2} 0 t${w * 0.2} 0 t${w * 0.2} 0" stroke="#bfe3ff" stroke-width="1.5" fill="none" opacity=".6"/><path d="M${w * 0.62} ${h * 0.6} l${w * 0.1} 0 l-${w * 0.02} ${h * 0.05} l-${w * 0.06} 0Z M${w * 0.665} ${h * 0.6} l0 -${h * 0.14} l${w * 0.05} ${h * 0.12}Z" fill="#fff"/>${se === 'winter' ? '' : `<rect y="${h * 0.93}" width="${w}" height="${h * 0.07}" fill="#f3d9a4"/>`}`;
  if (type === 'hills') body += `<path d="M0 ${h * 0.75} L${w * 0.3} ${h * 0.32} L${w * 0.55} ${h * 0.7} L${w * 0.78} ${h * 0.38} L${w} ${h * 0.7} L${w} ${h} L0 ${h}Z" fill="${night ? '#3a4470' : '#7d8fb3'}"/><path d="M${w * 0.3} ${h * 0.32} l-${w * 0.07} ${h * 0.1} l${w * 0.04} -${h * 0.02} l${w * 0.03} ${h * 0.03} l${w * 0.035} -${h * 0.03} l${w * 0.035} ${h * 0.02}Z M${w * 0.78} ${h * 0.38} l-${w * 0.06} ${h * 0.09} l${w * 0.035} -${h * 0.02} l${w * 0.03} ${h * 0.03} l${w * 0.05} -${h * 0.04}Z" fill="#fff"/><rect y="${h * 0.85}" width="${w}" height="${h * 0.15}" fill="${gr}"/>`;
  // пора року: сніг, пелюстки, листя (падають)
  if (se !== 'summer' && type !== 'space') { const c = se === 'winter' ? '#fff' : LEAF[se]; body += [0.12, 0.34, 0.56, 0.78, 0.9, 0.24].map((x, i) => `<circle class="rv-fall" style="animation-delay:${(-i * 1.1).toFixed(1)}s;animation-duration:${5 + (i % 3)}s" cx="${(w * x).toFixed(1)}" cy="-4" r="${se === 'winter' ? 1.8 : 2.2}" fill="${c}"/>`).join(''); }
  return g + body;
}
// Вікно: рамка + вид усередині (clip)
const winWrap = (o, clip, inner, frame, vx, vy, vw, vh) => `<defs><clipPath id="wc${o.id}">${clip}</clipPath></defs><g clip-path="url(#wc${o.id})"><svg x="${vx}" y="${vy}" width="${vw}" height="${vh}" viewBox="0 0 ${vw} ${vh}" overflow="hidden">${viewSVG(o.id, o.view, vw, vh, o.phase, o.season)}</svg>${inner || ''}</g>${frame}`;
// Фоторамка: фото з альбому (або котик-заглушка)
const photo = (o, clip, x, y, w, h) => `<defs><clipPath id="pc${o.id}">${clip}</clipPath></defs><g clip-path="url(#pc${o.id})"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fde6ef"/>${o.photo ? `<image href="${o.photo}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>` : `<path d="${heartPath(x + w / 2, y + h / 2, Math.min(w, h) / 22)}" fill="#ffb3cf"/>`}</g>`;

// ---------- каталог ----------
// kind: wall (на стіні, y — верх), floor (на підлозі), rug (килим, під котиком), paper (шпалери), flooring (підлога)
// act — що котик робить біля предмета; seat — на яку висоту він застрибує; side — стає збоку (дряпка, миска)
export const RITEMS = {
  // безкоштовне — є в кожного
  base_paper: { set: null, kind: 'paper', name: 'Рожеві шпалери', price: 0, css: 'linear-gradient(180deg,#ffe6ef,#ffd6e5)' },
  base_floor: { set: null, kind: 'flooring', name: 'Світла підлога', price: 0, css: 'repeating-linear-gradient(90deg,#f1d7bf 0 58px,#e6c7aa 58px 60px)' },
  box0: { set: null, kind: 'floor', name: 'Картонна коробка', price: 0, w: 74, h: 42, act: 'sleep', seat: 8, say: 'Моя коробка 📦',
    svg: () => `<path d="M4 12 L70 12 L70 42 L4 42Z" fill="#d9a066"/><path d="M4 12 L-2 2 L30 2 L37 12Z M70 12 L76 2 L44 2 L37 12Z" fill="#e8b57c"/><path d="M4 12 L70 12" stroke="#b9824c" stroke-width="2"/><path d="M28 24 h18" stroke="#b9824c" stroke-width="3" stroke-linecap="round"/>` },

  // ===== Затишна класика =====
  cl_paper: { set: 'cl', kind: 'paper', name: 'Шпалери в смужку', price: 60, css: 'repeating-linear-gradient(90deg,#fff4e6 0 18px,#ffe7cf 18px 36px)' },
  cl_floor: { set: 'cl', kind: 'flooring', name: "Дерев'яна підлога", price: 60, css: 'repeating-linear-gradient(90deg,#d9a46c 0 44px,#c48d58 44px 46px,#e2b27d 46px 90px,#c48d58 90px 92px)' },
  cl_window: { set: 'cl', kind: 'wall', name: 'Віконце з фіранками', price: 120, w: 90, h: 96, y: 30, act: 'stand', win: true,
    svg: (o) => winWrap(o, '<rect x="13" y="8" width="64" height="70"/>', '', `<rect x="10" y="5" width="70" height="76" rx="3" fill="none" stroke="#fff" stroke-width="6"/><path d="M45 8 V78 M13 43 H77" stroke="#fff" stroke-width="4"/><path d="M4 2 C14 30 8 60 20 84 L4 84Z" fill="#ff9ec0"/><path d="M86 2 C76 30 82 60 70 84 L86 84Z" fill="#ff9ec0"/><rect x="0" y="0" width="90" height="5" rx="2" fill="#c48d58"/><rect x="4" y="82" width="82" height="9" rx="3" fill="#fff"/>`, 13, 8, 64, 70) },
  cl_bed: { set: 'cl', kind: 'floor', name: 'Лежанка-подушка', price: 100, w: 104, h: 30, act: 'sleep', seat: 12,
    svg: () => `<ellipse cx="52" cy="20" rx="52" ry="10" fill="#e58aa8"/><ellipse cx="52" cy="15" rx="46" ry="11" fill="#ffc2d6"/><ellipse cx="52" cy="14" rx="36" ry="6" fill="#ffd9e6"/><path d="M14 16 Q52 26 90 16" stroke="#e58aa8" stroke-width="1.5" fill="none" stroke-dasharray="3 3"/>` },
  cl_scratch: { set: 'cl', kind: 'floor', name: 'Дряпка-стовпчик', price: 80, w: 34, h: 82, act: 'scratch', side: true,
    svg: () => `<rect x="2" y="74" width="30" height="8" rx="3" fill="#b07a4f"/><rect x="10" y="8" width="14" height="66" fill="#e2c38f"/>${Array.from({ length: 8 }, (_, i) => `<path d="M10 ${12 + i * 8} L24 ${16 + i * 8}" stroke="#c9a46a" stroke-width="2"/>`).join('')}<rect x="4" y="2" width="26" height="8" rx="3" fill="#b07a4f"/><circle cx="26" cy="24" r="4" fill="#ff5c9a"/><path d="M26 10 V20" stroke="#ff5c9a"/>` },
  cl_bowl: { set: 'cl', kind: 'floor', name: 'Мисочки', price: 50, w: 52, h: 16, act: 'eat', side: true,
    svg: () => `<path d="M2 6 H24 L21 16 H5Z" fill="#7ab8e8"/><ellipse cx="13" cy="6" rx="11" ry="3" fill="#a8d6f7"/><ellipse cx="13" cy="6" rx="8" ry="2" fill="#c6884f"/><path d="M28 6 H50 L47 16 H31Z" fill="#ff8fbb"/><ellipse cx="39" cy="6" rx="11" ry="3" fill="#ffc2d6"/><ellipse cx="39" cy="6" rx="8" ry="2" fill="#9fd3ff"/>` },
  cl_rug: { set: 'cl', kind: 'rug', name: 'Круглий килимок', price: 70, w: 132, h: 24,
    svg: () => `<ellipse cx="66" cy="12" rx="66" ry="12" fill="#f4a3a3"/><ellipse cx="66" cy="12" rx="52" ry="9" fill="#fbd0b0"/><ellipse cx="66" cy="12" rx="36" ry="6" fill="#f4a3a3"/><ellipse cx="66" cy="12" rx="20" ry="3.4" fill="#fff1d6"/>` },
  cl_frame: { set: 'cl', kind: 'wall', name: 'Фоторамка', price: 90, w: 52, h: 62, y: 54, photo: true,
    svg: (o) => `<rect x="0" y="0" width="52" height="62" rx="3" fill="#c48d58"/>${photo(o, '<rect x="6" y="6" width="40" height="50"/>', 6, 6, 40, 50)}<rect x="6" y="6" width="40" height="50" fill="none" stroke="#8d5f36" stroke-width="1"/>` },
  cl_shelf: { set: 'cl', kind: 'wall', name: 'Полиця з книжками', price: 150, w: 86, h: 42, y: 60, shelf: true,
    svg: () => `<rect x="0" y="34" width="86" height="6" rx="2" fill="#a8743f"/><path d="M8 40 l4 0 l0 2 l-4 0Z M74 40 l4 0 l0 2 l-4 0Z" fill="#8d5f36"/><rect x="6" y="10" width="9" height="24" fill="#e57373"/><rect x="16" y="6" width="8" height="28" fill="#64b5f6"/><rect x="25" y="12" width="10" height="22" fill="#ffd54f"/><rect x="36" y="8" width="7" height="26" fill="#81c784"/><rect x="45" y="18" width="16" height="16" rx="2" transform="rotate(-12 53 26)" fill="#ba68c8"/><path d="M66 34 C66 20 82 20 82 34Z" fill="#7cb86a"/><rect x="68" y="26" width="12" height="8" fill="#d9a066"/>` },

  // ===== Рожева мрія =====
  pk_paper: { set: 'pk', kind: 'paper', name: 'Шпалери з сердечками', price: 150, css: `${svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><path d="${heartPath(11, 12, 1)}" fill="#ffb3cf"/><path d="${heartPath(33, 34, 1)}" fill="#ffc9dc"/></svg>`)} 0 0/44px 44px, #ffe1ec` },
  pk_window: { set: 'pk', kind: 'wall', name: 'Вікно-арка з квітами', price: 300, w: 84, h: 108, y: 22, act: 'stand', win: true,
    svg: (o) => winWrap(o, '<path d="M12 90 V40 A30 30 0 0 1 72 40 V90Z"/>', '', `<path d="M12 90 V40 A30 30 0 0 1 72 40 V90Z" fill="none" stroke="#fff" stroke-width="6"/><path d="M42 12 V90 M12 56 H72" stroke="#fff" stroke-width="4"/><rect x="4" y="88" width="76" height="14" rx="4" fill="#ff8fbb"/>${[14, 28, 42, 56, 70].map((x, i) => `<circle cx="${x}" cy="86" r="5" fill="${['#ff5c9a', '#fff', '#ffd34d', '#fff', '#ff5c9a'][i]}"/>`).join('')}<path d="M10 98 C20 106 30 102 32 108 M52 108 C56 102 66 106 74 98" stroke="#7cc46a" stroke-width="2.5" fill="none"/>`, 12, 10, 60, 80) },
  pk_bed: { set: 'pk', kind: 'floor', name: 'Ліжко-сердечко', price: 400, w: 114, h: 46, act: 'sleep', seat: 18,
    svg: () => `<path d="M57 46 C10 46 0 30 8 16 C14 4 34 2 44 12 C50 18 54 20 57 22 C60 20 64 18 70 12 C80 2 100 4 106 16 C114 30 104 46 57 46Z" fill="#ff5c9a"/><path d="M57 40 C20 40 12 30 16 22 C20 14 34 14 44 22 C50 26 54 28 57 28 C60 28 64 26 70 22 C80 14 94 14 98 22 C102 30 94 40 57 40Z" fill="#ffd1e3"/><ellipse cx="57" cy="32" rx="30" ry="6" fill="#fff0f6"/>` },
  pk_tree: { set: 'pk', kind: 'floor', name: 'Котяче дерево-хмаринка', price: 500, w: 74, h: 156, act: 'sit', seat: 120, say: '☁️',
    svg: () => `<rect x="6" y="146" width="62" height="10" rx="4" fill="#e9b3c9"/><rect x="30" y="34" width="14" height="114" fill="#e2c38f"/>${Array.from({ length: 12 }, (_, i) => `<path d="M30 ${42 + i * 9} L44 ${46 + i * 9}" stroke="#c9a46a" stroke-width="2"/>`).join('')}<path d="M8 40 C0 40 0 26 10 26 C10 14 28 12 32 22 C36 10 56 12 56 24 C68 22 74 38 62 40Z" fill="#fff" stroke="#ffc2d6" stroke-width="2"/><path d="M40 98 C34 98 34 88 42 88 C44 80 58 80 60 88 C68 88 68 98 62 98Z" fill="#fff" stroke="#ffc2d6" stroke-width="2"/><circle cx="16" cy="60" r="4" fill="#ff5c9a"/><path d="M16 40 V56" stroke="#ff5c9a"/>` },
  pk_rug: { set: 'pk', kind: 'rug', name: 'Килимок-сердечко', price: 200, w: 120, h: 26,
    svg: () => `<path d="M60 26 C10 24 0 14 8 6 C16 -2 40 2 60 8 C80 2 104 -2 112 6 C120 14 110 24 60 26Z" fill="#ff8fbb"/><path d="M60 21 C22 20 16 13 22 9 C28 5 44 7 60 12 C76 7 92 5 98 9 C104 13 98 20 60 21Z" fill="#ffd1e3"/>` },
  pk_frame: { set: 'pk', kind: 'wall', name: 'Рамка-сердечко', price: 250, w: 64, h: 58, y: 52, photo: true,
    svg: (o) => `<path d="${heartPath(32, 30, 4.4)}" fill="#ff5c9a"/>${photo(o, `<path d="${heartPath(32, 30, 3.6)}"/>`, 6, 2, 52, 48)}` },
  pk_garland: { set: 'pk', kind: 'wall', name: 'Гірлянда з сердечок', price: 300, w: 184, h: 36, y: 4,
    svg: () => `<path d="M0 4 Q92 34 184 4" stroke="#c98aa4" stroke-width="1.5" fill="none"/>${[14, 38, 62, 92, 122, 146, 170].map((x, i) => { const y = 4 + 30 * (1 - ((x - 92) / 92) ** 2) * 0.95; return `<path class="rf-twinkle" style="animation-delay:${i * 0.3}s" d="${heartPath(x, y + 6, 1.3)}" fill="${['#ff5c9a', '#ffd34d', '#ff8fbb', '#fff'][i % 4]}"/>`; }).join('')}` },
  pk_toys: { set: 'pk', kind: 'floor', name: 'Клубочки в кошику', price: 200, w: 52, h: 36, act: 'play',
    svg: () => `<circle cx="16" cy="14" r="10" fill="#ff8fbb"/><path d="M8 10 Q16 18 24 8 M7 17 Q16 24 25 15" stroke="#ff5c9a" stroke-width="1.2" fill="none"/><circle cx="34" cy="12" r="9" fill="#9fd3ff"/><path d="M27 9 Q34 16 41 7" stroke="#5aa9e6" stroke-width="1.2" fill="none"/><path d="M4 18 H48 L44 36 H8Z" fill="#d9a066"/><path d="M6 24 H46 M7 30 H45" stroke="#b9824c" stroke-width="1.5"/>` },
  pk_shelf: { set: 'pk', kind: 'wall', name: 'Полиця з іграшками', price: 350, w: 92, h: 44, y: 56, shelf: true,
    svg: () => `<rect x="0" y="36" width="92" height="6" rx="3" fill="#ff8fbb"/><circle cx="16" cy="26" r="10" fill="#ffd1e3"/><circle cx="12" cy="24" r="1.5" fill="#4a2c3a"/><circle cx="20" cy="24" r="1.5" fill="#4a2c3a"/><path d="M8 18 L10 10 L14 16Z M24 18 L22 10 L18 16Z" fill="#ffd1e3"/><path d="${heartPath(46, 26, 1.6)}" fill="#ff5c9a"/><rect x="60" y="14" width="24" height="22" rx="3" fill="#fff"/><path d="M60 22 H84 M72 14 V36" stroke="#ff5c9a" stroke-width="3"/>` },

  // ===== Шотландський замок =====
  sc_paper: { set: 'sc', kind: 'paper', name: "Кам'яна стіна", price: 300, css: `${svgUrl('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="40"><rect width="64" height="40" fill="#bcae99"/><g fill="#cbbfac" stroke="#a69780" stroke-width="2"><rect x="1" y="1" width="30" height="18" rx="3"/><rect x="33" y="1" width="30" height="18" rx="3"/><rect x="-15" y="21" width="30" height="18" rx="3"/><rect x="17" y="21" width="30" height="18" rx="3"/><rect x="49" y="21" width="30" height="18" rx="3"/></g></svg>')} 0 0/64px 40px` },
  sc_floor: { set: 'sc', kind: 'flooring', name: 'Паркет «ялинка»', price: 300, css: 'repeating-linear-gradient(45deg,#a87444 0 16px,#8a5c33 16px 18px),repeating-linear-gradient(-45deg,#b98250 0 16px,#8a5c33 16px 18px)' },
  sc_window: { set: 'sc', kind: 'wall', name: 'Вітраж', price: 600, w: 74, h: 124, y: 14, act: 'stand', win: true,
    svg: (o) => winWrap(o, '<path d="M10 116 V44 Q10 14 37 4 Q64 14 64 44 V116Z"/>', `<g opacity=".55"><path d="M10 44 Q10 14 37 4 V44Z" fill="#e53950"/><path d="M64 44 Q64 14 37 4 V44Z" fill="#3d7bd9"/><rect x="10" y="90" width="27" height="26" fill="#2e9e5b"/><rect x="37" y="90" width="27" height="26" fill="#ffcf33"/></g>`, `<path d="M10 116 V44 Q10 14 37 4 Q64 14 64 44 V116Z" fill="none" stroke="#6b6157" stroke-width="7"/><path d="M37 4 V116 M10 44 H64 M10 90 H64" stroke="#4a443d" stroke-width="2.5"/><rect x="4" y="114" width="66" height="10" rx="2" fill="#9a8c78"/>`, 10, 4, 54, 112) },
  sc_fire: { set: 'sc', kind: 'floor', name: 'Камін', price: 1200, w: 124, h: 116, act: 'sleep', seat: 0, side: true, say: 'Тепло… 🔥',
    svg: () => `<rect x="0" y="0" width="124" height="14" rx="3" fill="#8a7c69"/><rect x="8" y="14" width="108" height="102" fill="#a89a85"/><g fill="#968873"><rect x="8" y="14" width="20" height="12"/><rect x="40" y="14" width="20" height="12"/><rect x="72" y="14" width="20" height="12"/><rect x="24" y="30" width="20" height="12"/><rect x="88" y="30" width="20" height="12"/></g><path d="M28 116 V66 Q62 40 96 66 V116Z" fill="#2b2420"/><rect x="34" y="104" width="56" height="8" rx="3" fill="#6b4226"/><g class="rf-flame"><path d="M46 106 C40 90 52 84 50 72 C60 82 66 74 64 64 C78 78 80 92 76 106Z" fill="#ff7a2e"/><path d="M52 106 C50 96 58 92 58 84 C64 92 70 90 68 106Z" fill="#ffcf33"/></g><rect x="0" y="0" width="124" height="5" fill="#6b6157"/>` },
  sc_chair: { set: 'sc', kind: 'floor', name: 'Тартанове крісло', price: 800, w: 104, h: 80, act: 'sleep', seat: 30,
    svg: () => `<defs><pattern id="tart" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#b3222c"/><rect x="5" width="6" height="16" fill="#1f5c3a" opacity=".85"/><rect y="5" width="16" height="6" fill="#1f5c3a" opacity=".6"/><path d="M8 0 V16 M0 8 H16" stroke="#ffcf33" stroke-width=".8"/></pattern></defs><rect x="10" y="0" width="84" height="50" rx="16" fill="url(#tart)"/><rect x="0" y="30" width="22" height="42" rx="10" fill="url(#tart)"/><rect x="82" y="30" width="22" height="42" rx="10" fill="url(#tart)"/><rect x="16" y="40" width="72" height="26" rx="8" fill="#c43a43"/><rect x="10" y="64" width="84" height="10" rx="4" fill="#7a1820"/><rect x="14" y="72" width="8" height="8" fill="#4a2a1c"/><rect x="82" y="72" width="8" height="8" fill="#4a2a1c"/>` },
  sc_shield: { set: 'sc', kind: 'wall', name: 'Щит із котиком', price: 500, w: 56, h: 66, y: 46,
    svg: () => `<path d="M4 4 H52 V30 C52 50 40 60 28 66 C16 60 4 50 4 30Z" fill="#1f4f8f" stroke="#ffcf33" stroke-width="3"/><path d="M28 4 V66" stroke="#ffcf33" stroke-width="1" opacity=".4"/><circle cx="28" cy="34" r="12" fill="#93a5ba"/><path d="M17 28 C15 18 22 18 24 23Z M39 28 C41 18 34 18 32 23Z" fill="#7b8da4"/><circle cx="24" cy="33" r="2" fill="#e9a23b"/><circle cx="32" cy="33" r="2" fill="#e9a23b"/><path d="M26 39 L30 39 L28 41Z" fill="#f08aa8"/><path d="M14 10 L20 16 M42 10 L36 16" stroke="#ffcf33" stroke-width="2"/>` },
  sc_rug: { set: 'sc', kind: 'rug', name: 'Тартановий килим', price: 400, w: 150, h: 26,
    svg: () => `<defs><pattern id="tartR" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="scale(1 .45)"><rect width="18" height="18" fill="#2a6b45"/><rect x="6" width="6" height="18" fill="#b3222c" opacity=".8"/><rect y="6" width="18" height="6" fill="#b3222c" opacity=".6"/><path d="M9 0 V18 M0 9 H18" stroke="#ffcf33" stroke-width=".8"/></pattern></defs><path d="M10 0 H140 L150 26 H0Z" fill="url(#tartR)"/><path d="M0 26 H150" stroke="#ffcf33" stroke-width="2" stroke-dasharray="2 3"/>` },
  sc_shelf: { set: 'sc', kind: 'wall', name: 'Полиця з кубками', price: 700, w: 100, h: 48, y: 52, shelf: true,
    svg: () => `<rect x="0" y="40" width="100" height="7" rx="2" fill="#6b4226"/><path d="M6 47 l8 0 l-4 4Z M86 47 l8 0 l-4 4Z" fill="#4a2a1c"/><path d="M12 12 H34 C34 26 28 30 23 30 C18 30 12 26 12 12Z" fill="#ffcf33"/><path d="M12 16 C4 16 6 26 14 24 M34 16 C42 16 40 26 32 24" stroke="#e0a800" stroke-width="2.5" fill="none"/><rect x="20" y="30" width="6" height="6" fill="#e0a800"/><rect x="15" y="35" width="16" height="5" rx="1" fill="#4a2a1c"/><path d="M44 18 H58 C58 28 54 31 51 31 C48 31 44 28 44 18Z" fill="#cfd8dc"/><rect x="48" y="31" width="6" height="4" fill="#b0bec5"/><rect x="45" y="35" width="12" height="5" rx="1" fill="#4a2a1c"/>${star(78, 26, 10, '#e53950')}<circle cx="78" cy="26" r="4" fill="#ffcf33"/><path d="M74 36 L72 40 M82 36 L84 40" stroke="#1f4f8f" stroke-width="3"/>` },

  // ===== Зоряна ніч =====
  st_paper: { set: 'st', kind: 'paper', name: 'Шпалери «нічне небо»', price: 400, css: `${svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">${star(14, 18, 3, '#fff8c8')}${star(56, 40, 2.2, '#fff')}<circle cx="32" cy="62" r="1.3" fill="#fff"/><circle cx="70" cy="10" r="1" fill="#fff"/><circle cx="8" cy="48" r="1" fill="#cfe0ff"/></svg>`)} 0 0/80px 80px, linear-gradient(180deg,#141a3c,#2c3570)` },
  st_window: { set: 'st', kind: 'wall', name: 'Ілюмінатор', price: 800, w: 82, h: 82, y: 40, act: 'stand', win: true,
    svg: (o) => winWrap(o, '<circle cx="41" cy="41" r="30"/>', `<ellipse cx="30" cy="26" rx="10" ry="5" fill="#fff" opacity=".25" transform="rotate(-30 30 26)"/>`, `<circle cx="41" cy="41" r="34" fill="none" stroke="#c9a14a" stroke-width="8"/><circle cx="41" cy="41" r="38" fill="none" stroke="#8d6d2a" stroke-width="1.5"/>${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<circle cx="${(41 + 34 * Math.cos(i * Math.PI / 4)).toFixed(1)}" cy="${(41 + 34 * Math.sin(i * Math.PI / 4)).toFixed(1)}" r="2" fill="#8d6d2a"/>`).join('')}`, 11, 11, 60, 60) },
  st_planets: { set: 'st', kind: 'wall', name: 'Планети під стелею', price: 900, w: 176, h: 76, y: 0,
    svg: () => `<path d="M30 0 V36 M88 0 V54 M146 0 V30" stroke="#c9b8e8" stroke-width="1"/><g class="rf-swing"><circle cx="30" cy="44" r="10" fill="#ff9e6b"/><ellipse cx="30" cy="44" rx="17" ry="4" fill="none" stroke="#ffd59e" stroke-width="2"/></g><g class="rf-swing" style="animation-delay:-1s"><circle cx="88" cy="62" r="13" fill="#5aa9e6"/><path d="M78 56 C84 60 90 54 98 60 M80 68 C86 66 92 70 98 66" stroke="#7cc46a" stroke-width="3" fill="none"/></g><g class="rf-swing" style="animation-delay:-2s"><circle cx="146" cy="38" r="8" fill="#ffe14d"/><circle cx="143" cy="36" r="2" fill="#f0c419"/></g>${star(60, 20, 4, '#fff8c8')}${star(118, 14, 3.5, '#fff8c8')}` },
  st_bed: { set: 'st', kind: 'floor', name: 'Ліжко-місяць', price: 1000, w: 120, h: 54, act: 'sleep', seat: 16,
    svg: () => `<path d="M6 30 C6 46 30 54 60 54 C90 54 114 46 114 30 C100 40 80 44 60 44 C40 44 20 40 6 30Z" fill="#ffe14d"/><path d="M6 30 C2 12 14 2 26 4 C14 12 16 24 24 34Z" fill="#ffd21a"/><ellipse cx="62" cy="38" rx="42" ry="8" fill="#5b4fb3"/><ellipse cx="62" cy="36" rx="38" ry="6" fill="#7e72d6"/>${star(48, 36, 2.4, '#ffe14d')}${star(76, 37, 2, '#ffe14d')}` },
  st_rocket: { set: 'st', kind: 'floor', name: 'Ракета-дряпка', price: 1200, w: 60, h: 146, act: 'scratch', side: true,
    svg: () => `<path d="M30 0 C46 18 50 40 48 70 L48 116 H12 L12 70 C10 40 14 18 30 0Z" fill="#f2f5fb"/><path d="M12 70 C10 40 14 18 30 0 C24 20 22 44 22 70 L22 116 H12Z" fill="#d7deea"/><circle cx="30" cy="44" r="10" fill="#5aa9e6" stroke="#c9a14a" stroke-width="3"/><path d="M12 92 L0 124 L12 116Z M48 92 L60 124 L48 116Z" fill="#e53950"/><path d="M30 6 C36 12 40 18 42 24 H18 C20 18 24 12 30 6Z" fill="#e53950"/><rect x="16" y="116" width="28" height="14" fill="#c9a46a"/>${Array.from({ length: 4 }, (_, i) => `<path d="M16 ${119 + i * 3} H44" stroke="#a88a5a"/>`).join('')}<g class="rf-flame"><path d="M20 130 C22 140 26 144 30 146 C34 144 38 140 40 130Z" fill="#ff9e3d"/></g>` },
  st_scope: { set: 'st', kind: 'floor', name: 'Телескоп', price: 1500, w: 66, h: 96, act: 'stand', side: true, say: 'Зірочки ✨',
    svg: () => `<path d="M32 50 L14 96 M32 50 L50 96 M32 50 V96" stroke="#6b4226" stroke-width="3"/><g transform="rotate(-32 32 46)"><rect x="4" y="36" width="58" height="16" rx="4" fill="#3d4b8f"/><rect x="54" y="33" width="10" height="22" rx="2" fill="#c9a14a"/><rect x="0" y="40" width="8" height="8" rx="1" fill="#c9a14a"/><rect x="26" y="34" width="4" height="20" fill="#c9a14a"/></g>` },
  st_rug: { set: 'st', kind: 'rug', name: 'Килим-галактика', price: 600, w: 152, h: 28,
    svg: () => `<ellipse cx="76" cy="14" rx="76" ry="14" fill="#2c3570"/><path d="M76 14 C96 4 120 10 116 16 C110 24 84 22 76 14 C56 24 32 20 36 12 C42 4 66 6 76 14Z" fill="#7e72d6" opacity=".8"/><ellipse cx="76" cy="14" rx="10" ry="4" fill="#ffe7a8"/>${star(30, 16, 2, '#fff')}${star(124, 10, 2, '#fff')}${star(100, 22, 1.5, '#fff')}` },
  st_frame: { set: 'st', kind: 'wall', name: "Рамка «сузір'я»", price: 700, w: 60, h: 60, y: 92, photo: true,
    svg: (o) => `<circle cx="30" cy="30" r="29" fill="#2c3570" stroke="#c9a14a" stroke-width="2"/>${photo(o, '<circle cx="30" cy="30" r="22"/>', 8, 8, 44, 44)}${[0, 1, 2, 3, 4, 5].map((i) => star(30 + 26 * Math.cos(i * Math.PI / 3 - 0.5), 30 + 26 * Math.sin(i * Math.PI / 3 - 0.5), 2.4, '#ffe14d')).join('')}` },

  // ===== Королівські покої =====
  ro_paper: { set: 'ro', kind: 'paper', name: 'Шовкові шпалери з коронами', price: 800, css: `${svgUrl('<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><path d="M18 22 L20 14 L24 19 L27 11 L30 19 L34 14 L36 22Z" fill="#d4a737" opacity=".55"/><circle cx="48" cy="46" r="2" fill="#d4a737" opacity=".5"/><circle cx="6" cy="50" r="1.5" fill="#d4a737" opacity=".5"/></svg>')} 0 0/60px 60px, linear-gradient(180deg,#8e1b3a,#6d1330)` },
  ro_floor: { set: 'ro', kind: 'flooring', name: 'Мармурова підлога', price: 800, css: 'conic-gradient(#f6f2ea 25%,#d9d1c3 0 50%,#f6f2ea 0 75%,#d9d1c3 0) 0 0/44px 44px' },
  ro_window: { set: 'ro', kind: 'wall', name: 'Палацове вікно з портьєрами', price: 1500, w: 116, h: 150, y: 6, act: 'stand', win: true,
    svg: (o) => winWrap(o, '<path d="M28 136 V40 A30 30 0 0 1 88 40 V136Z"/>', '', `<path d="M28 136 V40 A30 30 0 0 1 88 40 V136Z" fill="none" stroke="#d4a737" stroke-width="5"/><path d="M58 10 V136 M28 72 H88 M28 104 H88" stroke="#d4a737" stroke-width="2.5"/><path d="M0 8 C20 50 10 100 26 150 L0 150Z" fill="#b3122f"/><path d="M116 8 C96 50 106 100 90 150 L116 150Z" fill="#b3122f"/><path d="M0 2 H116 V20 C96 30 76 18 58 26 C40 18 20 30 0 20Z" fill="#8e0f27"/><path d="M0 20 C20 30 40 18 58 26 C76 18 96 30 116 20" stroke="#d4a737" stroke-width="2.5" fill="none"/><circle cx="18" cy="96" r="5" fill="#d4a737"/><circle cx="98" cy="96" r="5" fill="#d4a737"/><rect x="22" y="134" width="72" height="10" rx="2" fill="#f6f2ea"/>`, 28, 10, 60, 126) },
  ro_canopy: { set: 'ro', kind: 'floor', name: 'Ліжко з балдахіном', price: 2500, w: 144, h: 156, act: 'sleep', seat: 30,
    svg: () => `<rect x="6" y="18" width="6" height="138" fill="#d4a737"/><rect x="132" y="18" width="6" height="138" fill="#d4a737"/><path d="M0 8 H144 V26 C120 36 96 22 72 30 C48 22 24 36 0 26Z" fill="#b3122f"/><path d="M62 10 L64 2 L68 7 L72 0 L76 7 L80 2 L82 10Z" fill="#d4a737"/><path d="M12 26 C24 60 16 100 26 122 L12 122Z M132 26 C120 60 128 100 118 122 L132 122Z" fill="#e8495f" opacity=".85"/><rect x="10" y="114" width="124" height="28" rx="8" fill="#f6f2ea"/><rect x="10" y="126" width="124" height="18" rx="6" fill="#b3122f"/><path d="M10 128 H134" stroke="#d4a737" stroke-width="2"/><ellipse cx="34" cy="114" rx="16" ry="7" fill="#fff"/><rect x="10" y="142" width="124" height="6" fill="#7a0e22"/>` },
  ro_throne: { set: 'ro', kind: 'floor', name: 'Котячий трон', price: 2000, w: 74, h: 116, act: 'sit', seat: 40,
    svg: () => `<path d="M8 50 V8 L20 18 L30 2 L37 14 L44 2 L54 18 L66 8 V50Z" fill="#d4a737"/><path d="M14 46 V20 L22 26 L30 12 L37 22 L44 12 L52 26 L60 20 V46Z" fill="#b3122f"/><circle cx="37" cy="30" r="4" fill="#4fc3f7"/><rect x="2" y="48" width="70" height="16" rx="6" fill="#d4a737"/><rect x="8" y="56" width="58" height="12" rx="5" fill="#e8495f"/><rect x="4" y="64" width="66" height="34" rx="4" fill="#b3122f"/><path d="M4 70 H70" stroke="#d4a737" stroke-width="2"/><rect x="6" y="96" width="10" height="20" fill="#d4a737"/><rect x="58" y="96" width="10" height="20" fill="#d4a737"/>` },
  ro_chand: { set: 'ro', kind: 'wall', name: 'Кришталева люстра', price: 1800, w: 96, h: 84, y: 0,
    svg: () => `<path d="M48 0 V24" stroke="#d4a737" stroke-width="2"/><path d="M14 40 Q48 58 82 40" stroke="#d4a737" stroke-width="3" fill="none"/><path d="M24 30 Q48 44 72 30" stroke="#d4a737" stroke-width="2.5" fill="none"/><ellipse cx="48" cy="26" rx="10" ry="4" fill="#d4a737"/>${[14, 30, 48, 66, 82].map((x, i) => `<rect x="${x - 2}" y="${i === 2 ? 46 : 36}" width="4" height="8" fill="#fff"/><path class="rf-twinkle" style="animation-delay:${i * 0.25}s" d="M${x} ${i === 2 ? 38 : 28} c3 4 3 6 0 8 c-3 -2 -3 -4 0 -8Z" fill="#ffcf33"/>`).join('')}${[20, 34, 48, 62, 76].map((x, i) => `<path d="M${x} ${52 + (i % 2) * 6} l4 8 l-4 8 l-4 -8Z" fill="#d6f1ff" stroke="#9fd3ff" stroke-width=".8"/>`).join('')}` },
  ro_rug: { set: 'ro', kind: 'rug', name: 'Червона доріжка', price: 1000, w: 176, h: 24,
    svg: () => `<path d="M12 0 H164 L176 24 H0Z" fill="#b3122f"/><path d="M16 4 H160 L168 20 H8Z" fill="none" stroke="#d4a737" stroke-width="2"/>${[30, 60, 88, 116, 146].map((x) => `<path d="M${x} 8 l4 4 l-4 4 l-4 -4Z" fill="#d4a737"/>`).join('')}` },
  ro_frame: { set: 'ro', kind: 'wall', name: 'Золота рама-портрет', price: 1200, w: 66, h: 80, y: 40, photo: true,
    svg: (o) => `<rect x="0" y="6" width="66" height="74" rx="6" fill="#d4a737"/><rect x="3" y="9" width="60" height="68" rx="5" fill="none" stroke="#a37b1c" stroke-width="2"/><path d="M22 8 L25 1 L29 5 L33 0 L37 5 L41 1 L44 8Z" fill="#d4a737"/>${photo(o, '<ellipse cx="33" cy="43" rx="24" ry="29"/>', 9, 14, 48, 58)}<ellipse cx="33" cy="43" rx="24" ry="29" fill="none" stroke="#a37b1c" stroke-width="1.5"/>` },
};

// Порядок предметів у наборі (для магазину й прогресу)
export const SET_ITEMS = Object.fromEntries(Object.keys(SETS).map((s) => [s, Object.keys(RITEMS).filter((id) => RITEMS[id].set === s)]));
export const FREE = Object.keys(RITEMS).filter((id) => RITEMS[id].price === 0);
export const DEFAULT_ROOM = { paper: 'base_paper', flooring: 'base_floor', view: 'city', layout: [{ i: 'box0', x: 220 }] };

export const cosyOf = (owned) => owned.reduce((a, id) => a + Math.round((RITEMS[id]?.price || 0) / 10), 0);
export const levelOf = (cosy) => LEVELS.reduce((l, L) => (cosy >= L.min ? L : l), LEVELS[0]);
export const viewOk = (view, lvl) => LEVELS.some((L) => L.view === view && L.n <= lvl.n);
// Набір зібрано: є всі його предмети
export const setDone = (set, owned) => SET_ITEMS[set].every((id) => owned.includes(id));

// SVG предмета для превʼю в магазині (вид з вікна — «день, літо, сад»)
let pid = 0;
export function itemSVG(id, o = {}) {
  const it = RITEMS[id]; if (!it?.svg) return '';
  const opt = { id: 'p' + pid++, view: 'garden', phase: 'day', season: 'summer', ...o };
  return `<svg viewBox="0 0 ${it.w} ${it.h}" width="100%" height="100%" overflow="visible" preserveAspectRatio="xMidYMax meet">${it.svg(opt)}</svg>`;
}
