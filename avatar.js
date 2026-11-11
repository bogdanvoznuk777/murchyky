// ===== Котик-аватар: базовий вигляд, предмети магазину, малювання (вид спереду і збоку) =====

export const FURS = {
  blue: { name: 'Блакитна', g: ['#8395ad', '#97a8bd', '#aebdcd'], d: ['#76889f', '#8b9cb2'], belly: '#b8c6d4', paw: '#a9b8c9', ear: '#7b8da4', stripe: '#6a7c94', wh: '#eef2f6' },
  ginger: { name: 'Руда', g: ['#d98a4a', '#e9a465', '#f4c08e'], d: ['#c47634', '#d4874a'], belly: '#f6d3ae', paw: '#f0c79f', ear: '#c47634', stripe: '#b8642a', wh: '#fff6ec' },
  cream: { name: 'Кремова', g: ['#dcc19c', '#e8d2b2', '#f4e6d2'], d: ['#cdb08a', '#d9bf9c'], belly: '#fbf2e6', paw: '#f5e6d2', ear: '#cdb08a', stripe: '#c09d72', wh: '#ffffff' },
  black: { name: 'Чорна', g: ['#2b2b34', '#383843', '#474753'], d: ['#22222a', '#2f2f38'], belly: '#55555f', paw: '#4a4a55', ear: '#22222a', stripe: '#1c1c22', wh: '#d9dde4' },
  white: { name: 'Біла', g: ['#dfe3ea', '#eceff4', '#fafbfd'], d: ['#cfd5df', '#dde2ea'], belly: '#ffffff', paw: '#f3f5f9', ear: '#cfd5df', stripe: '#c3cad6', wh: '#b9c3d1' },
  choco: { name: 'Шоколадна', g: ['#5f4234', '#735142', '#896352'], d: ['#4f362a', '#5f4234'], belly: '#a07a66', paw: '#8f6b58', ear: '#4f362a', stripe: '#43291e', wh: '#f2e6df' },
};
export const EYES = {
  amber: { name: 'Бурштинові', c: ['#ffd27a', '#e9a23b', '#c47d1c'] },
  green: { name: 'Зелені', c: ['#d4f59a', '#7cc443', '#4a8a22'] },
  blue: { name: 'Блакитні', c: ['#d6eeff', '#5aa9e6', '#2a6fb0'] },
  copper: { name: 'Мідні', c: ['#ffc39e', '#d9733a', '#9c4416'] },
};
export const EARS = { fold: 'Висловуха', straight: 'Звичайні вушка' };
export const PATTERNS = { solid: 'Однотонна', tabby: 'Смугаста', tuxedo: '«У смокінгу»', calico: 'Трибарвна' };
export const DEFAULT_AV = { fur: 'blue', eyes: 'amber', ears: 'fold', pattern: 'solid', owned: [], eq: {} };

// ---------- предмети ----------
// slot: head, eyes, neck, body, back, bg, fx, title. f/s — SVG для виду спереду і збоку
const HEART = (x, y, s, fill) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 3 C-6 -3 -4 -8 0 -4 C4 -8 6 -3 0 3Z" fill="${fill}"/>`;
const STAR = (x, y, r, fill) => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; d += `${i ? 'L' : 'M'}${(x + rr * Math.cos(a)).toFixed(1)} ${(y + rr * Math.sin(a)).toFixed(1)} `; } return `<path d="${d}Z" fill="${fill}"/>`; };
const FLOW = (x, y, c) => `<g transform="translate(${x} ${y})"><circle r="3.4" cx="0" cy="-3" fill="${c}"/><circle r="3.4" cx="3" cy="1" fill="${c}"/><circle r="3.4" cx="-3" cy="1" fill="${c}"/><circle r="2" fill="#ffd34d"/></g>`;

export const ITEMS = {
  // головні убори
  bow: { slot: 'head', name: 'Бантик', price: 120, f: `<g transform="translate(84 16) rotate(18)"><path d="M0 0 C-14 -12 -16 10 0 0 C14 -12 16 10 0 0Z" fill="#ff5c9a"/><circle r="3.5" fill="#d6336c"/></g>`, s: `<g transform="translate(171 20) rotate(15) scale(.75)"><path d="M0 0 C-14 -12 -16 10 0 0 C14 -12 16 10 0 0Z" fill="#ff5c9a"/><circle r="3.5" fill="#d6336c"/></g>` },
  beret: { slot: 'head', name: 'Берет', price: 150, f: `<ellipse cx="60" cy="14" rx="27" ry="9" fill="#c2185b"/><ellipse cx="60" cy="16" rx="24" ry="5" fill="#a3134c"/><rect x="58" y="2" width="4" height="5" rx="2" fill="#a3134c"/>`, s: `<ellipse cx="164" cy="21" rx="16" ry="6" fill="#c2185b" transform="rotate(-8 164 21)"/><rect x="162" y="12" width="3" height="4" rx="1.5" fill="#a3134c"/>` },
  party: { slot: 'head', name: 'Святковий ковпак', price: 120, f: `<path d="M51 16 L79 16 L66 -17Z" fill="#7ad3ff"/><path d="M57 2 L74 2 M54 10 L77 10" stroke="#ff5c9a" stroke-width="3"/><circle cx="66" cy="-18" r="4.5" fill="#ffd34d"/>`, s: `<path d="M156 25 L177 21 L170 -6Z" fill="#7ad3ff"/><path d="M161 12 L174 10" stroke="#ff5c9a" stroke-width="3"/><circle cx="170" cy="-7" r="4" fill="#ffd34d"/>` },
  bunny: { slot: 'head', name: 'Вушка-зайчики', price: 200, f: `<ellipse cx="50" cy="-2" rx="7" ry="18" fill="#fff" transform="rotate(-12 50 -2)"/><ellipse cx="50" cy="-1" rx="3.5" ry="13" fill="#ffc2d6" transform="rotate(-12 50 -1)"/><ellipse cx="80" cy="-2" rx="7" ry="18" fill="#fff" transform="rotate(12 80 -2)"/><ellipse cx="80" cy="-1" rx="3.5" ry="13" fill="#ffc2d6" transform="rotate(12 80 -1)"/><rect x="44" y="11" width="42" height="5" rx="2.5" fill="#ff8fbb"/>`, s: `<ellipse cx="163" cy="3" rx="6" ry="16" fill="#fff" transform="rotate(-18 163 3)"/><ellipse cx="163" cy="4" rx="3" ry="11" fill="#ffc2d6" transform="rotate(-18 163 4)"/>` },
  flower: { slot: 'head', name: 'Квітковий вінок', price: 250, f: FLOW(40, 22, '#ff8fbb') + FLOW(52, 14, '#ffd1e3') + FLOW(65, 11, '#ff5c9a') + FLOW(78, 14, '#ffd1e3') + FLOW(90, 22, '#ff8fbb'), s: FLOW(155, 27, '#ff8fbb') + FLOW(164, 22, '#ffd1e3') + FLOW(174, 23, '#ff5c9a') },
  horns: { slot: 'head', name: 'Ріжки', price: 250, f: `<path d="M44 20 C40 8 44 2 48 -2 C48 6 52 12 52 16Z" fill="#e53950"/><path d="M86 20 C90 8 86 2 82 -2 C82 6 78 12 78 16Z" fill="#e53950"/>`, s: `<path d="M163 24 C160 12 164 6 168 3 C168 10 171 16 171 21Z" fill="#e53950"/>` },
  santa: { slot: 'head', name: 'Новорічна шапка', price: 300, f: `<path d="M38 16 C40 -6 72 -14 92 4 L80 16Z" fill="#e53935"/><circle cx="93" cy="5" r="5.5" fill="#fff"/><rect x="34" y="12" width="62" height="8" rx="4" fill="#fff"/>`, s: `<path d="M154 26 C154 6 176 -2 190 12 L178 22Z" fill="#e53935"/><circle cx="191" cy="12" r="4.5" fill="#fff"/><rect x="151" y="20" width="30" height="7" rx="3.5" fill="#fff" transform="rotate(-8 166 23)"/>` },
  headph: { slot: 'head', name: 'Навушники', price: 300, f: `<path d="M30 46 C30 6 100 6 100 46" stroke="#ff5c9a" stroke-width="5" fill="none"/><rect x="24" y="38" width="12" height="20" rx="6" fill="#ff8fbb"/><rect x="94" y="38" width="12" height="20" rx="6" fill="#ff8fbb"/>`, s: `<path d="M150 36 C152 10 180 8 186 26" stroke="#ff5c9a" stroke-width="4" fill="none"/><ellipse cx="160" cy="38" rx="7" ry="10" fill="#ff8fbb"/>` },
  wizard: { slot: 'head', name: 'Капелюх чарівника', price: 350, f: `<ellipse cx="65" cy="15" rx="36" ry="7" fill="#5b3fa8"/><path d="M45 15 L85 15 L70 -20 C66 -22 62 -18 60 -12Z" fill="#6f4fc4"/>${STAR(64, 2, 5, '#ffd34d')}${STAR(74, -8, 3, '#ffd34d')}`, s: `<ellipse cx="166" cy="22" rx="22" ry="5" fill="#5b3fa8" transform="rotate(-8 166 22)"/><path d="M154 22 L178 18 L172 -10 L164 -4Z" fill="#6f4fc4"/>${STAR(168, 6, 3.5, '#ffd34d')}` },
  tophat: { slot: 'head', name: 'Циліндр', price: 450, f: `<ellipse cx="65" cy="15" rx="30" ry="6" fill="#26262e"/><rect x="48" y="-16" width="34" height="31" rx="3" fill="#2f2f38"/><rect x="48" y="6" width="34" height="6" fill="#ff5c9a"/>`, s: `<ellipse cx="166" cy="22" rx="18" ry="4.5" fill="#26262e" transform="rotate(-8 166 22)"/><rect x="156" y="-4" width="20" height="25" rx="2" fill="#2f2f38" transform="rotate(-8 166 10)"/><rect x="156" y="13" width="20" height="5" fill="#ff5c9a" transform="rotate(-8 166 15)"/>` },
  halo: { slot: 'head', name: 'Німб', price: 800, f: `<ellipse cx="65" cy="-6" rx="24" ry="6" fill="none" stroke="#ffd34d" stroke-width="4"/><ellipse cx="65" cy="-6" rx="24" ry="6" fill="none" stroke="#fff3b0" stroke-width="1.5"/>`, s: `<ellipse cx="166" cy="6" rx="15" ry="4" fill="none" stroke="#ffd34d" stroke-width="3.5"/>` },
  crown: { slot: 'head', name: 'Корона', price: 1200, f: `<path d="M46 17 L50 1 L58 10 L65 -2 L72 10 L80 1 L84 17Z" fill="#ffd34d" stroke="#e0a800" stroke-width="1.5"/><circle cx="65" cy="12" r="2.6" fill="#ff5c9a"/><circle cx="55" cy="13" r="2" fill="#7ad3ff"/><circle cx="75" cy="13" r="2" fill="#7ad3ff"/>`, s: `<path d="M156 25 L157 11 L163 18 L167 8 L171 17 L177 9 L179 22Z" fill="#ffd34d" stroke="#e0a800" stroke-width="1.2"/><circle cx="167" cy="19" r="2" fill="#ff5c9a"/>` },
  // окуляри
  nerd: { slot: 'eyes', name: 'Круглі окуляри', price: 150, f: `<g fill="none" stroke="#3b2f2f" stroke-width="2"><circle cx="52" cy="45" r="10"/><circle cx="78" cy="45" r="10"/><path d="M62 45 L68 45 M42 44 L34 41 M88 44 L96 41"/></g>`, s: `<g fill="none" stroke="#3b2f2f" stroke-width="1.6"><circle cx="177" cy="38" r="6.5"/><path d="M170.5 38 L156 36"/></g>` },
  hearts: { slot: 'eyes', name: 'Окуляри-сердечка', price: 200, f: `${HEART(52, 44, 2.1, '#ff5c9a')}${HEART(78, 44, 2.1, '#ff5c9a')}<path d="M61 43 L69 43" stroke="#d6336c" stroke-width="2"/>`, s: `${HEART(177, 37, 1.5, '#ff5c9a')}<path d="M170 37 L156 35" stroke="#d6336c" stroke-width="1.5"/>` },
  sun: { slot: 'eyes', name: 'Сонячні окуляри', price: 250, f: `<rect x="41" y="38" width="21" height="14" rx="6" fill="#26262e"/><rect x="68" y="38" width="21" height="14" rx="6" fill="#26262e"/><path d="M62 42 L68 42" stroke="#26262e" stroke-width="2.5"/><path d="M45 41 L52 41" stroke="#fff" stroke-width="1.5" opacity=".5"/>`, s: `<rect x="170" y="33" width="13" height="10" rx="4" fill="#26262e"/><path d="M170 36 L156 35" stroke="#26262e" stroke-width="2"/>` },
  monocle: { slot: 'eyes', name: 'Монокль', price: 300, f: `<circle cx="78" cy="45" r="10" fill="#fff" fill-opacity=".15" stroke="#d4a017" stroke-width="2.2"/><path d="M86 52 C92 62 88 72 82 78" stroke="#d4a017" stroke-width="1.2" fill="none"/>`, s: `<circle cx="177" cy="38" r="7" fill="#fff" fill-opacity=".15" stroke="#d4a017" stroke-width="1.8"/><path d="M180 44 C182 52 178 58 172 60" stroke="#d4a017" stroke-width="1" fill="none"/>` },
  stars: { slot: 'eyes', name: 'Окуляри-зірочки', price: 350, f: `${STAR(52, 45, 11, '#ffd34d')}${STAR(78, 45, 11, '#ffd34d')}<path d="M62 44 L68 44" stroke="#e0a800" stroke-width="2"/>`, s: `${STAR(177, 38, 8, '#ffd34d')}<path d="M170 37 L156 35" stroke="#e0a800" stroke-width="1.5"/>` },
  // шия
  bell: { slot: 'neck', name: 'Нашийник з дзвіночком', price: 100, f: `<path d="M42 76 Q65 86 88 76" stroke="#e53950" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="65" cy="85" r="5" fill="#ffd34d" stroke="#e0a800"/><path d="M62 86 L68 86" stroke="#a67c00" stroke-width="1"/>`, s: `<path d="M147 47 C146 56 149 63 155 67" stroke="#e53950" stroke-width="4.5" fill="none" stroke-linecap="round"/><circle cx="157" cy="69" r="4" fill="#ffd34d" stroke="#e0a800"/>` },
  bowtie: { slot: 'neck', name: 'Метелик', price: 150, f: `<path d="M65 80 L52 73 L52 87Z M65 80 L78 73 L78 87Z" fill="#26262e"/><circle cx="65" cy="80" r="3" fill="#3a3a44"/>`, s: `<path d="M152 64 L144 59 L145 69Z M152 64 L160 59 L159 69Z" fill="#26262e"/>` },
  bandana: { slot: 'neck', name: 'Бандана', price: 150, f: `<path d="M40 74 Q65 84 90 74 L65 100Z" fill="#43a3e0"/><circle cx="58" cy="82" r="1.6" fill="#fff"/><circle cx="70" cy="86" r="1.6" fill="#fff"/><circle cx="64" cy="92" r="1.4" fill="#fff"/>`, s: `<path d="M146 46 C145 56 149 64 156 68 L148 80 C144 70 142 58 146 46Z" fill="#43a3e0"/>` },
  scarf: { slot: 'neck', name: 'Шарфик', price: 180, f: `<path d="M38 72 Q65 88 92 72 L92 80 Q65 96 38 80Z" fill="#ff5c9a"/><rect x="72" y="80" width="11" height="26" rx="3" fill="#ff5c9a"/><path d="M72 100 L83 100" stroke="#fff" stroke-width="2"/>`, s: `<path d="M144 44 C142 56 147 66 156 70 L158 64 C152 60 149 54 150 45Z" fill="#ff5c9a"/><path d="M146 56 C136 60 128 62 120 60 L121 66 C130 68 140 66 148 62Z" fill="#ff5c9a"/>` },
  medal: { slot: 'neck', name: 'Медалька', price: 250, f: `<path d="M50 72 L62 92 M80 72 L68 92" stroke="#43a3e0" stroke-width="5"/><circle cx="65" cy="96" r="7" fill="#ffd34d" stroke="#e0a800" stroke-width="1.5"/>${STAR(65, 96, 4, '#fff3b0')}`, s: `<path d="M148 50 L156 70" stroke="#43a3e0" stroke-width="4"/><circle cx="157" cy="74" r="5" fill="#ffd34d" stroke="#e0a800"/>` },
  pearls: { slot: 'neck', name: 'Перлинове намисто', price: 400, f: Array.from({ length: 9 }, (_, i) => { const a = Math.PI * (0.15 + 0.7 * i / 8); return `<circle cx="${(65 - 26 * Math.cos(a)).toFixed(1)}" cy="${(72 + 12 * Math.sin(a)).toFixed(1)}" r="3.2" fill="#fffaf2" stroke="#e8dccb" stroke-width=".6"/>`; }).join(''), s: [0, 1, 2, 3, 4].map((i) => `<circle cx="${147 + i * 2.2}" cy="${48 + i * 4.5}" r="2.6" fill="#fffaf2" stroke="#e8dccb" stroke-width=".5"/>`).join('') },
  // тіло
  sweater: { slot: 'body', name: 'Светрик', price: 300, f: `<path d="M34 120 C30 98 40 74 65 72 C90 74 100 98 96 120Z" fill="#ff8fbb"/><path d="M40 92 L90 92 M38 104 L92 104" stroke="#fff" stroke-width="2" stroke-dasharray="4 3"/>`, s: `<path d="M62 46 C80 46 92 49 110 47 C127 45 140 44 148 50 C152 62 148 76 144 82 C134 84 124 83 114 81 C100 80 90 81 80 79 C72 78 64 80 60 76 C58 66 58 54 62 46Z" fill="#ff8fbb"/><path d="M70 62 L140 62 M72 72 L138 72" stroke="#fff" stroke-width="2" stroke-dasharray="4 3"/>` },
  // спина
  backpack: { slot: 'back', name: 'Рюкзачок-сердечко', price: 250, f: `<path d="M44 76 L50 112 M86 76 L80 112" stroke="#d6336c" stroke-width="3"/>`, s: HEART(95, 46, 3, '#ff5c9a') + `<path d="M80 50 L80 72 M110 50 L112 72" stroke="#d6336c" stroke-width="2.5"/>`, top: true },
  cape: { slot: 'back', name: 'Плащ супергероя', price: 350, f: `<path d="M38 74 C20 96 22 116 26 124 L104 124 C108 116 110 96 92 74Z" fill="#e53935"/>`, s: `<path d="M150 50 C130 40 90 40 60 46 C50 60 44 80 48 96 C70 92 100 86 120 70 C134 62 144 56 150 50Z" fill="#e53935"/>`, top: true },
  bwings: { slot: 'back', name: 'Крила метелика', price: 500, f: `<path d="M50 84 C20 50 0 70 10 92 C2 108 26 116 50 96Z" fill="#b38cff" opacity=".9"/><path d="M80 84 C110 50 130 70 120 92 C128 108 104 116 80 96Z" fill="#b38cff" opacity=".9"/><circle cx="24" cy="80" r="6" fill="#ffd1e3"/><circle cx="106" cy="80" r="6" fill="#ffd1e3"/>`, s: `<path d="M100 46 C80 6 50 10 56 36 C40 44 60 64 100 50Z" fill="#b38cff" opacity=".9"/><circle cx="70" cy="30" r="6" fill="#ffd1e3"/>`, top: true },
  awings: { slot: 'back', name: 'Крила янгола', price: 1200, f: `<path d="M48 82 C20 60 2 74 4 96 C14 92 18 104 30 100 C34 108 44 104 50 96Z" fill="#fff" stroke="#e3e8f0"/><path d="M82 82 C110 60 128 74 126 96 C116 92 112 104 100 100 C96 108 86 104 80 96Z" fill="#fff" stroke="#e3e8f0"/>`, s: `<path d="M104 46 C90 12 60 4 40 14 C52 18 46 26 58 28 C50 34 62 40 70 40 C66 46 84 52 104 50Z" fill="#fff" stroke="#e3e8f0"/>`, top: true },
  // фони (лише на портреті)
  bg_night: { slot: 'bg', name: 'Зоряне небо', price: 200, cls: 'bg-night' },
  bg_sakura: { slot: 'bg', name: 'Сакура', price: 200, cls: 'bg-sakura' },
  bg_beach: { slot: 'bg', name: 'Пляж', price: 250, cls: 'bg-beach' },
  bg_snow: { slot: 'bg', name: 'Сніжна казка', price: 250, cls: 'bg-snow' },
  bg_neon: { slot: 'bg', name: 'Неонове серце', price: 400, cls: 'bg-neon' },
  bg_rainbow: { slot: 'bg', name: 'Веселка', price: 400, cls: 'bg-rainbow' },
  // ефекти
  fx_hearts: { slot: 'fx', name: 'Сердечка навколо', price: 300, cls: 'fx-hearts' },
  fx_sparkle: { slot: 'fx', name: 'Іскорки', price: 300, cls: 'fx-sparkle' },
  fx_stars: { slot: 'fx', name: 'Зірочки', price: 350, cls: 'fx-stars' },
  fx_glow: { slot: 'fx', name: 'Райдужне сяйво', price: 2000, cls: 'fx-glow' },
  // титули
  t_queen: { slot: 'title', name: 'Королева мурчання', price: 150 },
  t_lord: { slot: 'title', name: 'Лорд подушок', price: 150 },
  t_hunter: { slot: 'title', name: 'Мисливець за сердечками', price: 200 },
  t_genius: { slot: 'title', name: 'Пухнастий геній', price: 200 },
  t_hugs: { slot: 'title', name: 'Хранитель обіймів', price: 250 },
  t_duel: { slot: 'title', name: 'Майстер дуелей', price: 300 },
  // ексклюзиви — лише за перемоги в сезонах
  x_cup: { slot: 'title', name: '🏆 Чемпіон сезону', price: 0, wins: 1 },
  x_crown: { slot: 'head', name: 'Корона чемпіона', price: 0, wins: 3, f: `<path d="M44 17 L48 -2 L57 9 L65 -6 L73 9 L82 -2 L86 17Z" fill="#ffcf33" stroke="#c99400" stroke-width="1.6"/><circle cx="65" cy="10" r="3.4" fill="#e53950"/><circle cx="53" cy="12" r="2.4" fill="#43a3e0"/><circle cx="77" cy="12" r="2.4" fill="#43a3e0"/>${STAR(65, -1, 3, '#fff3b0')}`, s: `<path d="M155 25 L156 7 L163 16 L167 3 L172 15 L178 6 L180 22Z" fill="#ffcf33" stroke="#c99400" stroke-width="1.3"/><circle cx="167" cy="18" r="2.4" fill="#e53950"/>` },
  x_robe: { slot: 'back', name: 'Мантія легенди', price: 0, wins: 5, f: `<path d="M34 72 C14 96 16 118 20 126 L110 126 C114 118 116 96 96 72Z" fill="#7b1fa2"/><path d="M34 72 Q65 86 96 72" stroke="#fff" stroke-width="6" fill="none" stroke-dasharray="2 3"/>`, s: `<path d="M152 48 C130 36 88 36 56 44 C44 60 38 84 42 100 C70 96 104 86 124 70 C138 60 148 54 152 48Z" fill="#7b1fa2"/><path d="M152 48 C130 38 90 38 58 45" stroke="#fff" stroke-width="5" fill="none" stroke-dasharray="2 3"/>`, top: true },
  c_yarn: { slot: 'fx', name: 'Зоряний клубок', price: 0, coop: 'Розділ 1 «Шкатулка»', cls: 'fx-yarn' },
  c_wings: { slot: 'back', name: 'Пелюсткові крила', price: 0, coop: 'Розділ 3 «Сад»', f: `<path d="M42 76 C12 56 0 90 16 104 C24 111 36 101 45 91Z" fill="#ffb3d1" stroke="#ff7fb0" stroke-width="1.5"/><path d="M42 92 C16 96 12 118 27 120 C36 121 43 109 47 100Z" fill="#ffd6e6" stroke="#ff7fb0" stroke-width="1.5"/><path d="M 88 76 C 118 56 130 90 114 104 C 106 111 94 101 85 91 Z" fill="#ffb3d1" stroke="#ff7fb0" stroke-width="1.5"/><path d="M 88 92 C 114 96 118 118 103 120 C 94 121 87 109 83 100 Z" fill="#ffd6e6" stroke="#ff7fb0" stroke-width="1.5"/><circle cx="22" cy="86" r="3" fill="#fff"/><circle cx="108" cy="86" r="3" fill="#fff"/>`, s: `<path d="M112 50 C102 8 134 -2 144 18 C150 32 134 46 118 53Z" fill="#ffb3d1" stroke="#ff7fb0" stroke-width="1.4"/><path d="M100 52 C78 18 98 4 112 18 C120 30 114 44 106 53Z" fill="#ffd6e6" stroke="#ff7fb0" stroke-width="1.4"/>` },
  c_suit_royal: { slot: 'body', name: 'Королівське вбрання', price: 0, coop: 'Фінал квесту (на вибір)', f: `<path d="M32 122 C28 96 40 74 65 72 C90 74 102 96 98 122Z" fill="#6a1b9a"/><path d="M36 112 C50 117 80 117 94 112" stroke="#ffcf33" stroke-width="3" fill="none"/><path d="M65 86 L65 120" stroke="#ffcf33" stroke-width="2.5"/><circle cx="65" cy="96" r="2.8" fill="#ffcf33"/><circle cx="65" cy="106" r="2.8" fill="#ffcf33"/><path d="M42 78 C52 90 78 90 88 78 C82 72 48 72 42 78Z" fill="#fff"/><circle cx="53" cy="81" r="1.6" fill="#222"/><circle cx="65" cy="84" r="1.6" fill="#222"/><circle cx="77" cy="81" r="1.6" fill="#222"/>`, s: `<path d="M62 46 C80 46 92 49 110 47 C127 45 140 44 148 50 C152 62 148 76 144 82 C134 84 124 83 114 81 C100 80 90 81 80 79 C72 78 64 80 60 76 C58 66 58 54 62 46Z" fill="#6a1b9a"/><path d="M62 74 C90 80 120 82 146 78" stroke="#ffcf33" stroke-width="3" fill="none"/><path d="M138 46 C146 50 152 60 150 70 C144 64 138 56 132 50Z" fill="#fff"/><circle cx="142" cy="56" r="1.4" fill="#222"/>` },
  c_suit_space: { slot: 'body', name: 'Зоряний скафандр', price: 0, coop: 'Фінал квесту (на вибір)', f: `<path d="M32 122 C28 96 40 74 65 72 C90 74 102 96 98 122Z" fill="#e8eef6" stroke="#9fb3c8" stroke-width="2"/><path d="M42 80 C55 87 75 87 88 80" stroke="#9fb3c8" stroke-width="5" fill="none"/><rect x="51" y="92" width="28" height="16" rx="4" fill="#3d7bd9"/><circle cx="58" cy="100" r="2.6" fill="#ff5c5c"/><circle cx="65" cy="100" r="2.6" fill="#ffd23d"/><circle cx="72" cy="100" r="2.6" fill="#5cd67a"/><path d="M84 112 l2 4 4 .5 -3 3 .8 4 -3.8-2 -3.8 2 .8-4 -3-3 4-.5Z" fill="#ffd23d"/>`, s: `<path d="M62 46 C80 46 92 49 110 47 C127 45 140 44 148 50 C152 62 148 76 144 82 C134 84 124 83 114 81 C100 80 90 81 80 79 C72 78 64 80 60 76 C58 66 58 54 62 46Z" fill="#e8eef6" stroke="#9fb3c8" stroke-width="2"/><path d="M66 64 L144 64" stroke="#3d7bd9" stroke-width="5"/><rect x="88" y="34" width="26" height="16" rx="4" fill="#cfd9e6" stroke="#9fb3c8" stroke-width="1.5"/>` },
  c_suit_wed: { slot: 'body', name: 'Весільне вбрання', price: 0, coop: 'Фінал квесту (на вибір)', f: `<path d="M30 122 C26 96 40 74 65 72 C90 74 104 96 100 122Z" fill="#fffafc" stroke="#f3c6d8" stroke-width="2"/><path d="M34 114 Q42 107 50 114 Q58 107 66 114 Q74 107 82 114 Q90 107 98 114" stroke="#f3a6c4" stroke-width="2" fill="none"/><path d="M38 102 Q46 96 54 102 Q62 96 70 102 Q78 96 86 102 Q92 97 96 102" stroke="#f9d3e2" stroke-width="2" fill="none"/><path d="M54 80 L65 86 L76 80 L76 92 L65 86 L54 92Z" fill="#ff8fbb"/><circle cx="65" cy="86" r="3.2" fill="#ff5c9a"/><circle cx="48" cy="78" r="1.8" fill="#fff" stroke="#e8c8d6"/><circle cx="82" cy="78" r="1.8" fill="#fff" stroke="#e8c8d6"/>`, s: `<path d="M62 46 C80 46 92 49 110 47 C127 45 140 44 148 50 C152 62 148 76 144 82 C134 84 124 83 114 81 C100 80 90 81 80 79 C72 78 64 80 60 76 C58 66 58 54 62 46Z" fill="#fffafc" stroke="#f3c6d8" stroke-width="2"/><path d="M62 74 Q70 68 78 75 Q86 69 94 76 Q102 70 110 77 Q118 71 126 78 Q134 72 144 78" stroke="#f3a6c4" stroke-width="2" fill="none"/><path d="M134 50 l8 4 0 -8Z M142 50 l8 4 0 -8Z" fill="#ff8fbb"/>` },
  c_title: { slot: 'title', name: '💞 Дві половинки', price: 0, coop: 'Увесь квест' },
  c_pair: { slot: 'fx', name: 'Нерозлучні', price: 0, coop: 'Усі 15 рибок', cls: 'fx-pair' },
  c_eyes: { slot: 'fx', name: 'Світло маяка', price: 0, coop: 'Розділ 2 «Маяк»', cls: 'fx-beam' },
};
export const SLOTS = { head: 'Головні убори', eyes: 'Окуляри', neck: 'На шию', body: 'Одяг', back: 'Спина', bg: 'Фони', fx: 'Ефекти', title: 'Титули' };
export const rarity = (it) => (it.coop ? { n: 'Легендарне · квест', c: 'leg' } : it.wins ? { n: 'Ексклюзив', c: 'ex' } : it.price >= 2000 ? { n: 'Легендарне', c: 'leg' } : it.price >= 600 ? { n: 'Епічне', c: 'epic' } : it.price >= 250 ? { n: 'Рідкісне', c: 'rare' } : { n: 'Звичайне', c: 'common' });

// ---------- малювання ----------
const grads = (k, F, E, side) => `<defs>
  <linearGradient id="furG${k}" ${side ? 'gradientUnits="userSpaceOnUse" x1="0" y1="38" x2="0" y2="122"' : 'x1="0" y1="0" x2="0" y2="1"'}><stop offset="0" stop-color="${F.g[0]}"/><stop offset=".55" stop-color="${F.g[1]}"/><stop offset="1" stop-color="${F.g[2]}"/></linearGradient>
  <linearGradient id="furD${k}" ${side ? 'gradientUnits="userSpaceOnUse" x1="0" y1="30" x2="0" y2="120"' : 'x1="0" y1="0" x2="0" y2="1"'}><stop offset="0" stop-color="${F.d[0]}"/><stop offset="1" stop-color="${F.d[1]}"/></linearGradient>
  <radialGradient id="eyeG${k}" cx=".45" cy=".4" r=".6"><stop offset="0" stop-color="${E.c[0]}"/><stop offset=".7" stop-color="${E.c[1]}"/><stop offset="1" stop-color="${E.c[2]}"/></radialGradient>
  ${side ? `<clipPath id="ct${k}"><path d="${TORSO}"/></clipPath><clipPath id="chd${k}"><path d="${HEAD_S}"/></clipPath>` : `<clipPath id="cb${k}"><path d="${BODY_F}"/></clipPath><clipPath id="cf${k}"><circle cx="65" cy="46" r="33"/></clipPath>`}
</defs>`;
const BODY_F = 'M32 121 C26 96 38 70 65 66 C92 70 104 96 98 121Z';
const TORSO = 'M38 64 C37 50 47 43 62 43 C79 43 92 47 110 45 C127 43 141 41 151 47 C159 53 157 70 149 80 C143 87 132 87 122 84 C108 81 94 82 80 80 C70 79 60 85 50 82 C42 79 38 72 38 64Z';
const HEAD_S = 'M147 40 C149 27 162 21 174 24 C183 27 188 34 189 41 C191 43 192 46 190 48 C189 51 186 53 183 54 C180 59 173 61 166 60 C156 59 148 54 146 47 C145 44 146 42 147 40Z';
const it = (id) => ITEMS[id];
const eqd = (av, slot) => { const id = av.eq?.[slot]; return id && it(id) && (av.owned || []).includes(id) ? it(id) : null; };

export function frontSVG(av, k, extraCls = '') {
  const F = FURS[av.fur] || FURS.blue, E = EYES[av.eyes] || EYES.amber, P = av.pattern || 'solid', fold = av.ears !== 'straight';
  const back = eqd(av, 'back'), body = eqd(av, 'body'), neck = eqd(av, 'neck'), eyes = eqd(av, 'eyes'), head = eqd(av, 'head');
  const white = '#f7f8fb', chest = P === 'tuxedo' ? white : F.belly, paw = P === 'tuxedo' ? white : F.paw, muzzle = P === 'tuxedo' ? white : F.belly;
  const pat = P === 'tabby' ? `<g stroke="${F.stripe}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"><path d="M36 92 C42 90 46 92 48 96M34 104 C40 102 44 104 46 108M94 92 C88 90 84 92 82 96M96 104 C90 102 86 104 84 108"/></g>`
    : P === 'calico' ? `<g clip-path="url(#cb${k})"><ellipse cx="38" cy="96" rx="12" ry="16" fill="#e08a3c"/><ellipse cx="94" cy="108" rx="12" ry="12" fill="#3a3a42"/></g>` : '';
  const patH = P === 'tabby' ? `<g stroke="${F.stripe}" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".75"><path d="M58 18 L60 28M65 16 L65 27M72 18 L70 28M33 46 L40 47M97 46 L90 47"/></g>`
    : P === 'calico' ? `<g clip-path="url(#cf${k})"><ellipse cx="42" cy="26" rx="16" ry="14" fill="#e08a3c"/><ellipse cx="90" cy="30" rx="13" ry="12" fill="#3a3a42"/></g>` : '';
  const ears = fold
    ? `<path d="M36 34 C34 16 49 10 57 18 C50 21 43 27 36 34Z" fill="${F.ear}"/><path d="M94 34 C96 16 81 10 73 18 C80 21 87 27 94 34Z" fill="${F.ear}"/><path d="M40 30 C40 21 47 18 52 21 C47 23 43 26 40 30Z" fill="#f4b6c8"/><path d="M90 30 C90 21 83 18 78 21 C83 23 87 26 90 30Z" fill="#f4b6c8"/>`
    : '';
  const earsUnder = fold ? '' : `<path d="M34 32 L40 4 L58 18Z" fill="${F.ear}"/><path d="M96 32 L90 4 L72 18Z" fill="${F.ear}"/><path d="M38 26 L41 11 L51 19Z" fill="#f4b6c8"/><path d="M92 26 L89 11 L79 19Z" fill="#f4b6c8"/>`;
  return `<svg viewBox="0 -22 130 152" class="cat-front ${extraCls}" aria-hidden="true">${grads(k, F, E, false)}
  <ellipse cx="65" cy="124" rx="42" ry="5" fill="#5a3a4a" opacity=".1"/>
  ${back && !back.top ? back.f : ''}${back && back.top ? back.f : ''}
  <path class="c-tail2" d="M92 118 C112 118 122 106 118 88" stroke="url(#furD${k})" stroke-width="10" fill="none" stroke-linecap="round"/>
  <g class="c-body">
    <path d="${BODY_F}" fill="url(#furG${k})"/>${pat}
    <ellipse cx="65" cy="94" rx="16" ry="21" fill="${chest}" opacity=".9"/>
    ${body ? body.f : ''}
    <ellipse cx="53" cy="119" rx="10" ry="6" fill="${paw}"/><ellipse cx="77" cy="119" rx="10" ry="6" fill="${paw}"/>
    <path d="M50 120 v3 M55 120 v3 M74 120 v3 M79 120 v3" stroke="${F.stripe}" stroke-width="1" stroke-linecap="round" opacity=".6"/>
    ${neck ? neck.f : ''}
    <g class="c-face">
      ${earsUnder}
      <circle cx="65" cy="46" r="33" fill="url(#furG${k})"/>${patH}
      ${ears}
      <ellipse cx="65" cy="59" rx="18" ry="13" fill="${muzzle}"/>
      <g class="eyes-open">
        <ellipse cx="52" cy="45" rx="7.5" ry="8" fill="url(#eyeG${k})"/><ellipse cx="78" cy="45" rx="7.5" ry="8" fill="url(#eyeG${k})"/>
        <ellipse cx="52.5" cy="45.5" rx="3" ry="6.5" fill="#2b2b33"/><ellipse cx="78.5" cy="45.5" rx="3" ry="6.5" fill="#2b2b33"/>
        <circle cx="55" cy="42" r="2" fill="#fff"/><circle cx="81" cy="42" r="2" fill="#fff"/>
      </g>
      <g class="eyes-closed" stroke="#4b5568" stroke-width="2.2" fill="none" stroke-linecap="round"><path d="M45 46 Q52 41 59 46"/><path d="M71 46 Q78 41 85 46"/></g>
      <path d="M61 54 L69 54 L65 58.5Z" fill="#f08aa8"/>
      <path d="M65 58.5 Q65 64 59 64 M65 58.5 Q65 64 71 64" stroke="#5d6a7c" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <ellipse cx="41" cy="56" rx="6" ry="3.5" fill="#ff9ab8" opacity=".5"/><ellipse cx="89" cy="56" rx="6" ry="3.5" fill="#ff9ab8" opacity=".5"/>
      <g stroke="${F.wh}" stroke-width="1.3" stroke-linecap="round"><path d="M47 59 L24 55M47 63 L25 67M83 59 L106 55M83 63 L105 67"/></g>
      ${eyes ? eyes.f : ''}${head ? head.f : ''}
    </g>
  </g>
</svg>`;
}

const leg = (cls, hind, dx, fill, paw) => hind
  ? `<g class="leg ${cls} hind"><g class="up"><path d="M${46 + dx} 58 C${43 + dx} 76 ${52 + dx} 93 ${66 + dx} 93 C${76 + dx} 92 ${75 + dx} 78 ${70 + dx} 62Z" fill="${fill}"/>
      <g class="lo"><path d="M${66 + dx} 88 L${57 + dx} 105 L${60 + dx} 116" stroke="${fill}" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="${63 + dx}" cy="117.5" rx="7" ry="3.6" fill="${paw}"/></g></g></g>`
  : `<g class="leg ${cls} fore"><g class="up"><path d="M${125 + dx} 58 C${123 + dx} 74 ${126 + dx} 88 ${132 + dx} 94 C${141 + dx} 94 ${146 + dx} 78 ${145 + dx} 60Z" fill="${fill}"/>
      <g class="lo"><path d="M${134 + dx} 89 L${136 + dx} 115" stroke="${fill}" stroke-width="8.5" fill="none" stroke-linecap="round"/><ellipse cx="${139 + dx}" cy="117.5" rx="7" ry="3.6" fill="${paw}"/></g></g></g>`;

export function sideSVG(av, k) {
  const F = FURS[av.fur] || FURS.blue, E = EYES[av.eyes] || EYES.amber, P = av.pattern || 'solid', fold = av.ears !== 'straight';
  const back = eqd(av, 'back'), body = eqd(av, 'body'), neck = eqd(av, 'neck'), eyes = eqd(av, 'eyes'), head = eqd(av, 'head');
  const white = '#f7f8fb', belly = P === 'tuxedo' ? white : F.belly, pawN = P === 'tuxedo' ? white : F.paw, muzzle = P === 'tuxedo' ? white : F.belly;
  const patT = P === 'tabby' ? `<g clip-path="url(#ct${k})" stroke="${F.stripe}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".6"><path d="M66 42 C62 54 64 66 70 76M84 44 C80 56 82 68 88 78M102 44 C98 56 100 68 106 80M120 42 C116 54 118 66 124 80"/></g>`
    : P === 'calico' ? `<g clip-path="url(#ct${k})"><ellipse cx="70" cy="52" rx="20" ry="14" fill="#e08a3c"/><ellipse cx="120" cy="60" rx="14" ry="12" fill="#3a3a42"/></g>`
    : P === 'tuxedo' ? `<g clip-path="url(#ct${k})"><path d="M138 56 C150 58 158 68 152 84 L126 86 C130 76 132 64 138 56Z" fill="${white}"/></g>` : '';
  const patH = P === 'tabby' ? `<g clip-path="url(#chd${k})" stroke="${F.stripe}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"><path d="M160 26 L158 34M166 24 L165 33M172 25 L172 32"/></g>`
    : P === 'calico' ? `<g clip-path="url(#chd${k})"><ellipse cx="158" cy="32" rx="12" ry="10" fill="#e08a3c"/></g>` : '';
  const earFold = fold ? `<path d="M157 28 C159 19 170 17 175 23 C171 24 164 26 157 28Z" fill="${F.d[0]}"/><path d="M160 26 C162 21 168 20 171 23 C168 24 164 25 160 26Z" fill="#f4b6c8"/>` : '';
  const earUp = fold ? '' : `<path d="M155 30 L160 6 L174 24Z" fill="${F.d[0]}"/><path d="M158 26 L161 12 L169 23Z" fill="#f4b6c8"/>`;
  const legs2 = `${leg('lf2', false, -7, `url(#furD${k})`, F.d[0])}${leg('lh2', true, -7, `url(#furD${k})`, F.d[0])}`;
  return `<svg viewBox="0 -16 200 146" class="cat-side" aria-hidden="true">${grads(k, F, E, true)}
  <ellipse cx="100" cy="121" rx="66" ry="4.5" fill="#5a3a4a" opacity=".1"/>
  <g class="c-tail"><path d="M44 58 C26 57 15 52 10 40 C7 32 12 26 18 29" stroke="url(#furD${k})" stroke-width="10" fill="none" stroke-linecap="round"/>${P === 'tabby' ? `<path d="M30 56 L28 50M20 50 L16 46" stroke="${F.stripe}" stroke-width="3" opacity=".6"/>` : ''}</g>
  ${legs2}
  <g class="c-torso">
    <path d="${TORSO}" fill="url(#furG${k})"/>${patT}
    <path d="M80 79 C95 82 110 82 124 84 C133 86 143 85 148 80 C140 83 130 83 120 81 C106 79 94 80 80 79Z" fill="${belly}" opacity=".85"/>
    ${body ? body.s : ''}${back ? back.s : ''}
  </g>
  ${leg('lh1', true, 0, `url(#furG${k})`, pawN)}${leg('lf1', false, 0, `url(#furG${k})`, pawN)}
  ${neck ? neck.s : ''}
  <g class="c-head">
    ${earUp}
    <path d="${HEAD_S}" fill="url(#furG${k})"/>${patH}
    ${earFold}
    <path d="M176 49 C180 47 186 47 190 48 C189 52 185 55 180 55 C177 55 175 52 176 49Z" fill="${muzzle}"/>
    <path d="M171 38 C173 34 179 33 181 37 C179 41 173 42 171 38Z" fill="url(#eyeG${k})"/>
    <path d="M176.5 34.2 C175.6 36 175.6 39.5 176.6 41" stroke="#2b2b33" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <circle cx="178.5" cy="36" r="1" fill="#fff"/>
    <path d="M170.5 38 C173 33 180 32 182 37" stroke="#5d6a7c" stroke-width="1" fill="none" opacity=".6"/>
    <path d="M188 42.5 C190 42.5 191.5 44 191 46 L188.5 46Z" fill="#f08aa8"/>
    <path d="M189 49 C188 51 186 52 184 52" stroke="#5d6a7c" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <ellipse cx="168" cy="47" rx="5" ry="3" fill="#ff9ab8" opacity=".35"/>
    <g stroke="${F.wh}" stroke-width="1" stroke-linecap="round" opacity=".9"><path d="M182 50 L199 46M182 52 L199 53M181 54 L196 58"/></g>
    ${eyes ? eyes.s : ''}${head ? head.s : ''}
  </g>
</svg>`;
}

let pk = 0;
// Портрет (вид спереду з фоном та ефектом)
export function portrait(av, size = 120, cls = '') {
  const bg = eqd(av, 'bg'), fx = eqd(av, 'fx');
  return `<div class="portrait ${bg ? bg.cls : 'bg-none'} ${fx ? fx.cls : ''} ${cls}" style="width:${size}px;height:${size}px">${frontSVG(av, 'p' + (pk++))}</div>`;
}
export const fxClass = (av) => eqd(av, 'fx')?.cls || '';
export const titleOf = (av) => eqd(av, 'title')?.name || '';
