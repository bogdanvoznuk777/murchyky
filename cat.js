// ===== Котики: гуляють, зупиняються, дивляться на тебе й муркочуть =====
// Кожен гравець має свого котика-аватара (вигляд і вбрання — з avatar.js).
// Сцени: 'home' — головний екран; 'room' — кімната котика (там котик ще й користується меблями: spots).
import { frontSVG, sideSVG, fxClass } from './avatar.js';
const SPEED = 24; // пікселів за секунду (під крок лап)
const stages = {};
let uid = 0, ac = null;
const rand = (a, b) => a + Math.random() * (b - a);
// Що котик каже в кожній дії
const SAY = { purr: 'Мррр… 💕', sleep: 'Zzz… 💤', stand: '👀', scratch: 'Шкряб ✨', eat: 'Ням 😋', play: '🧶', sit: '👑' };
// Класи поз: сон і «сидить» використовують позу спереду (як муркотіння/погляд)
const CLS = { sleep: 'purr sleep', sit: 'look sit', play: 'look play' };

// spots: [{ cx, lift, act, dir, say }] — місця в пікселях сцени (центр котика), куди він ходить і що там робить
export function mountCat(holder, cats, opts = {}) {
  if (!holder) return;
  const name = opts.key || 'home';
  let stage = stages[name];
  if (!stage) { stage = stages[name] = { el: document.createElement('div'), kits: {}, running: false }; stage.el.className = 'cat-stage'; }
  stage.spots = opts.spots || null; stage.speed = opts.speed || 1;
  for (const c of cats) {
    const key = JSON.stringify([c.av.fur, c.av.eyes, c.av.ears, c.av.pattern, c.av.eq, (c.av.owned || []).length]);
    let kt = stage.kits[c.uid];
    if (!kt) { kt = stage.kits[c.uid] = makeKitty(stage); stage.el.appendChild(kt.k); }
    if (kt.key !== key) { kt.key = key; draw(kt, c.av); }
  }
  for (const id of Object.keys(stage.kits)) if (!cats.some((c) => c.uid === id)) { stage.kits[id].k.remove(); delete stage.kits[id]; }
  // «Нерозлучні»: якщо обидва котики в цьому ефекті — гуляють разом, а між ними злітають сердечка
  stage.paired = cats.length === 2 && cats.every((c) => c.av.eq?.fx === 'c_pair') ? cats.map((c) => c.uid) : null;
  holder.appendChild(stage.el); // той самий елемент — котики не «перестрибують» при оновленні екрана
  if (!stage.running) { stage.running = true; stage.last = performance.now(); requestAnimationFrame((t) => tick(stage, t)); }
}

function makeKitty(stage) {
  const k = document.createElement('div');
  k.className = 'kitty walk'; k.dataset.dir = '1';
  const kt = { k, x: rand(0, 150), dir: 1, mode: 'walk', target: 0, until: 0, first: true, t: rand(0, 3), ph: rand(0, 1), lift: 0, ly: 0, goal: null };
  k.addEventListener('click', (e) => { e.stopPropagation(); pet(stage, kt); });
  return kt;
}
function draw(kt, av) {
  const n = ++uid;
  kt.k.innerHTML = `<div class="pose side">${sideSVG(av, 's' + n)}</div><div class="pose front">${frontSVG(av, 'f' + n)}</div><div class="bubble">${SAY[kt.mode] || SAY.purr}</div>`;
  kt.k.dataset.fx = fxClass(av);
  const q = (c) => kt.k.querySelector(c);
  kt.r = {
    legs: LEGS.map(([c, hind, dx, off]) => ({ up: q(`.${c} .up`), lo: q(`.${c} .lo`), hind, off, ux: (hind ? 58 : 136) + dx, lx: (hind ? 66 : 134) + dx, ly: hind ? 88 : 89 })),
    torso: q('.c-torso'), head: q('.c-head'), tail: q('.c-tail'), tail2: q('.c-tail2'), eyes: q('.eyes-open'), face: q('.c-face'), body: q('.c-body'),
  };
  kt.r.bubble = q('.bubble');
  kt.k.className = 'kitty ' + (CLS[kt.mode] || kt.mode) + ' ' + fxClass(av);
}

// ---- анімація через SVG-атрибут transform (однаково працює на iPhone і Android) ----
const LEGS = [ // клас, задня?, зсув, фаза кроку (ЛЗ, ЛП, ПЗ, ПП)
  ['lh1', true, 0, 0], ['lf1', false, 0, 0.25], ['lh2', true, -7, 0.5], ['lf2', false, -7, 0.75],
];
// ключові кадри [частка циклу, кут]
const K = {
  hindUp: [[0, -15], [0.62, 17], [0.8, 2], [1, -15]],
  hindLo: [[0, 0], [0.6, 0], [0.72, 30], [0.88, 8], [1, 0]],
  foreUp: [[0, -13], [0.62, 15], [0.8, 0], [1, -13]],
  foreLo: [[0, 0], [0.6, 0], [0.7, 42], [0.86, 10], [1, 0]],
};
const interp = (kf, p) => { for (let i = 1; i < kf.length; i++) if (p <= kf[i][0]) { const [a, va] = kf[i - 1], [b, vb] = kf[i]; return va + (vb - va) * ((p - a) / (b - a)); } return kf[kf.length - 1][1]; };
const wave = (t) => (1 - Math.cos(2 * Math.PI * t)) / 2; // 0→1→0
const STEP = 0.9; // секунд на повний крок
const rot = (el, a, x, y, extra = '') => el && el.setAttribute('transform', `${extra}rotate(${a.toFixed(2)} ${x} ${y})`);

function animate(st, dt, sp = 1) {
  // Не вимикаємо кроки при «Зменшенні руху» на iPhone: котик однаково йде екраном, тож без кроків він «ковзає»
  if (!st.r) return;
  const r = st.r, T = (st.t += dt);
  if (st.mode === 'walk') {
    st.ph = (st.ph + (dt * sp) / STEP) % 1;
    for (const L of r.legs) {
      const p = (st.ph + L.off) % 1;
      rot(L.up, interp(L.hind ? K.hindUp : K.foreUp, p), L.ux, 62);
      rot(L.lo, interp(L.hind ? K.hindLo : K.foreLo, p), L.lx, L.ly);
    }
    const s = wave(st.ph * 2);
    rot(r.torso, 0.6 * s, 100, 62, `translate(0 ${(1.2 * s).toFixed(2)}) `);
    rot(r.head, -1 * s, 150, 50, `translate(0 ${(0.8 * s).toFixed(2)}) `);
  } else if (st.mode === 'stand' || st.mode === 'eat' || st.mode === 'scratch') {
    // стоїть (біля вікна / миски) або дряпає: задні лапи рівно, передні — рівно чи по черзі вгору
    const sp = (T / 0.32) % 1;
    for (const L of r.legs) {
      const fast = st.mode === 'scratch' && !L.hind;
      rot(L.up, fast ? interp(K.foreUp, (sp + L.off * 2) % 1) - 18 : 0, L.ux, 62);
      rot(L.lo, fast ? 20 * wave(sp + L.off * 2) : 0, L.lx, L.ly);
    }
    rot(r.torso, 0, 100, 62);
    rot(r.head, st.mode === 'eat' ? 14 + 3 * wave(T / 0.5) : st.mode === 'stand' ? -10 : 0, 150, 50);
  }
  rot(r.tail, -4 + 13 * wave(T / 1.8), 44, 58);
  // поза «сидить»
  rot(r.tail2, -14 * wave(T / 2.4), 92, 118);
  const bp = (T % 4) / 4, blink = bp > 0.93 && bp < 0.99 ? 0.1 : 1;
  r.eyes?.setAttribute('transform', `translate(0 ${45 * (1 - blink)}) scale(1 ${blink})`);
  rot(r.face, st.mode === 'look' ? -7 * wave(T / 2.2) : 0, 65, 69);
  if (st.mode === 'purr' || st.mode === 'sleep') { const q = wave(T / (st.mode === 'sleep' ? 1.6 : 0.18)); r.body?.setAttribute('transform', `translate(${(-65 * 0.012 * q).toFixed(2)} ${(121 * 0.01 * q).toFixed(2)}) scale(${(1 + 0.012 * q).toFixed(4)} ${(1 - 0.01 * q).toFixed(4)})`); }
  else r.body?.removeAttribute('transform');
}

function setMode(kt, m, dur = 0, say) {
  kt.mode = m; kt.until = performance.now() + dur; kt.k.className = 'kitty ' + (CLS[m] || m) + ' ' + (kt.k.dataset.fx || '');
  if (kt.r?.bubble) kt.r.bubble.textContent = say || SAY[m] || SAY.purr;
}
// Тривалість дій біля меблів, мс
const ACT_MS = { sleep: [6000, 9000], stand: [2500, 4000], scratch: [2200, 3200], eat: [2500, 3500], play: [2500, 3500], sit: [4000, 6000] };

function tick(stage, now) {
  if (!stage.el.isConnected) { stage.running = false; return; }
  const dt = Math.min(0.05, (now - stage.last) / 1000); stage.last = now;
  const W = stage.el.clientWidth;
  const pair = stage.paired && stage.paired.every((id) => stage.kits[id]) ? stage.paired.map((id) => stage.kits[id]) : null;
  if (pair) {
    const [lead, fol] = pair, cw = fol.k.offsetWidth || 158, max = Math.max(0, W - cw);
    // другий котик іде поруч із першим, а стоїть і муркоче разом із ним
    const want = Math.max(0, Math.min(max, lead.x - lead.dir * 64));
    if (lead.mode === 'walk' || Math.abs(want - fol.x) > 8) { if (fol.mode !== 'walk') setMode(fol, 'walk'); fol.target = want; fol.until = Infinity; }
    else if (fol.mode !== lead.mode) setMode(fol, lead.mode, lead.until - now);
    if (!stage.nextHeart || now > stage.nextHeart) {
      stage.nextHeart = now + 900;
      const h = document.createElement('span'); h.className = 'pair-heart'; h.textContent = Math.random() < 0.5 ? '💗' : '💞';
      h.style.left = `${(lead.x + fol.x) / 2 + 70 + rand(-12, 12)}px`; stage.el.appendChild(h); setTimeout(() => h.remove(), 2300);
    }
  }
  for (const kt of Object.values(stage.kits)) {
    const follower = pair && kt === pair[1];
    const cw = kt.k.offsetWidth || 158, max = Math.max(0, W - cw);
    if (kt.first) { kt.first = false; kt.x = rand(0, max); kt.target = rand(0, max); }
    if (kt.mode === 'walk') {
      const dx = kt.target - kt.x;
      if (Math.abs(dx) < 2) {
        if (follower) { kt.dir = pair[0].dir; setMode(kt, pair[0].mode === 'walk' ? 'walk' : pair[0].mode, 0); }
        else if (kt.goal) { const g = kt.goal; kt.goal = null; if (g.dir) kt.dir = g.dir; kt.lift = g.lift || 0; setMode(kt, g.act, rand(...(ACT_MS[g.act] || [2500, 3500])), g.say); }
        else setMode(kt, 'look', rand(1200, 2200));
      }
      else { kt.dir = Math.sign(dx); kt.x += kt.dir * Math.min(Math.abs(dx), SPEED * stage.speed * dt); }
    } else if (!follower && now > kt.until) {
      kt.lift = 0;
      const spots = stage.spots, g = spots?.length && kt.mode !== 'look' && Math.random() < 0.75 ? spots[Math.floor(Math.random() * spots.length)] : null;
      if (kt.mode === 'look') setMode(kt, 'purr', rand(2800, 4200));
      else if (g && g !== kt.last) { kt.goal = kt.last = g; kt.target = Math.max(0, Math.min(max, g.cx - cw / 2)); setMode(kt, 'walk'); }
      else { let t = rand(0, max); if (Math.abs(t - kt.x) < 70) t = kt.x < max / 2 ? max : 0; kt.target = t; kt.last = null; setMode(kt, 'walk'); }
    }
    kt.x = Math.max(0, Math.min(max, kt.x));
    // стрибок на ліжко / крісло і назад (плавно); у «грі» — легкі підскоки
    kt.ly += (kt.lift - kt.ly) * Math.min(1, dt * 9);
    const hop = kt.mode === 'play' ? 7 * Math.abs(Math.sin(kt.t * 6)) : 0;
    kt.k.style.transform = kt.ly > 0.5 || hop ? `translate(${kt.x}px, ${-(kt.ly + hop).toFixed(1)}px)` : `translateX(${kt.x}px)`;
    kt.k.dataset.dir = kt.dir;
    kt.k.dataset.side = kt.x > max / 2 ? 'r' : 'l';
    animate(kt, dt, stage.speed);
  }
  requestAnimationFrame((t) => tick(stage, t));
}

// Погладити: торкнутися котика
function pet(stage, kt) {
  if (kt.mode === 'walk') kt.lift = 0;
  kt.goal = null; setMode(kt, kt.mode === 'sleep' ? 'sleep' : 'purr', 3500, kt.mode === 'sleep' ? 'Мрр… 😽' : undefined);
  purrSound();
  for (let i = 0; i < 5; i++) {
    const h = document.createElement('span'); h.className = 'pet-heart'; h.textContent = '❤';
    h.style.left = `${kt.x + rand(20, 110)}px`; h.style.animationDelay = `${i * 0.12}s`;
    stage.el.appendChild(h); setTimeout(() => h.remove(), 1800);
  }
}

// Звук муркотіння (синтезований, звучить лише після дотику)
function purrSound() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ac ||= new AC(); ac.resume?.();
    const dur = 2.6, sr = ac.sampleRate, buf = ac.createBuffer(1, Math.floor(sr * dur), sr), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    const t = ac.currentTime, src = ac.createBufferSource(); src.buffer = buf;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
    const am = ac.createGain(); am.gain.value = 0.55;
    const lfo = ac.createOscillator(); lfo.frequency.value = 26; const lfoG = ac.createGain(); lfoG.gain.value = 0.45;
    lfo.connect(lfoG).connect(am.gain);
    const env = ac.createGain();
    env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(0.9, t + 0.3);
    env.gain.setValueAtTime(0.9, t + dur - 0.6); env.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(lp).connect(am).connect(env).connect(ac.destination);
    lfo.start(t); src.start(t); src.stop(t + dur); lfo.stop(t + dur);
  } catch { /* без звуку — не страшно */ }
}
