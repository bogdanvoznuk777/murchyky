// ===== Котики на головному екрані: гуляють, зупиняються, дивляться на тебе й муркочуть =====
// Кожен гравець має свого котика-аватара (вигляд і вбрання — з avatar.js)
import { frontSVG, sideSVG, fxClass } from './avatar.js';
const SPEED = 24; // пікселів за секунду (під крок лап)
let stage = null, uid = 0;
const rand = (a, b) => a + Math.random() * (b - a);

export function mountCat(holder, cats) {
  if (!holder) return;
  if (!stage) { stage = { el: document.createElement('div'), kits: {}, running: false }; stage.el.className = 'cat-stage'; }
  for (const c of cats) {
    const key = JSON.stringify([c.av.fur, c.av.eyes, c.av.ears, c.av.pattern, c.av.eq, (c.av.owned || []).length]);
    let kt = stage.kits[c.uid];
    if (!kt) { kt = stage.kits[c.uid] = makeKitty(); stage.el.appendChild(kt.k); }
    if (kt.key !== key) { kt.key = key; draw(kt, c.av); }
  }
  for (const id of Object.keys(stage.kits)) if (!cats.some((c) => c.uid === id)) { stage.kits[id].k.remove(); delete stage.kits[id]; }
  holder.appendChild(stage.el); // той самий елемент — котики не «перестрибують» при оновленні екрана
  if (!stage.running) { stage.running = true; stage.last = performance.now(); requestAnimationFrame(tick); }
}

function makeKitty() {
  const k = document.createElement('div');
  k.className = 'kitty walk'; k.dataset.dir = '1';
  const kt = { k, x: rand(0, 150), dir: 1, mode: 'walk', target: 0, until: 0, first: true, t: rand(0, 3), ph: rand(0, 1) };
  k.addEventListener('click', (e) => { e.stopPropagation(); pet(kt); });
  return kt;
}
function draw(kt, av) {
  const n = ++uid;
  kt.k.innerHTML = `<div class="pose side">${sideSVG(av, 's' + n)}</div><div class="pose front">${frontSVG(av, 'f' + n)}</div><div class="bubble">Мррр… 💕</div>`;
  kt.k.dataset.fx = fxClass(av);
  const q = (c) => kt.k.querySelector(c);
  kt.r = {
    legs: LEGS.map(([c, hind, dx, off]) => ({ up: q(`.${c} .up`), lo: q(`.${c} .lo`), hind, off, ux: (hind ? 58 : 136) + dx, lx: (hind ? 66 : 134) + dx, ly: hind ? 88 : 89 })),
    torso: q('.c-torso'), head: q('.c-head'), tail: q('.c-tail'), tail2: q('.c-tail2'), eyes: q('.eyes-open'), face: q('.c-face'), body: q('.c-body'),
  };
  kt.k.className = 'kitty ' + kt.mode + ' ' + fxClass(av);
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
const REDUCED = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const rot = (el, a, x, y, extra = '') => el && el.setAttribute('transform', `${extra}rotate(${a.toFixed(2)} ${x} ${y})`);

function animate(st, dt) {
  if (REDUCED || !st.r) return;
  const r = st.r, T = (st.t += dt);
  if (st.mode === 'walk') {
    st.ph = (st.ph + dt / STEP) % 1;
    for (const L of r.legs) {
      const p = (st.ph + L.off) % 1;
      rot(L.up, interp(L.hind ? K.hindUp : K.foreUp, p), L.ux, 62);
      rot(L.lo, interp(L.hind ? K.hindLo : K.foreLo, p), L.lx, L.ly);
    }
    const s = wave(st.ph * 2);
    rot(r.torso, 0.6 * s, 100, 62, `translate(0 ${(1.2 * s).toFixed(2)}) `);
    rot(r.head, -1 * s, 150, 50, `translate(0 ${(0.8 * s).toFixed(2)}) `);
  }
  rot(r.tail, -4 + 13 * wave(T / 1.8), 44, 58);
  // поза «сидить»
  rot(r.tail2, -14 * wave(T / 2.4), 92, 118);
  const bp = (T % 4) / 4, blink = bp > 0.93 && bp < 0.99 ? 0.1 : 1;
  r.eyes?.setAttribute('transform', `translate(0 ${45 * (1 - blink)}) scale(1 ${blink})`);
  rot(r.face, st.mode === 'look' ? -7 * wave(T / 2.2) : 0, 65, 69);
  if (st.mode === 'purr') { const q = wave(T / 0.18); r.body?.setAttribute('transform', `translate(${(-65 * 0.012 * q).toFixed(2)} ${(121 * 0.01 * q).toFixed(2)}) scale(${(1 + 0.012 * q).toFixed(4)} ${(1 - 0.01 * q).toFixed(4)})`); }
  else r.body?.removeAttribute('transform');
}

function setMode(kt, m, dur = 0) { kt.mode = m; kt.until = performance.now() + dur; kt.k.className = 'kitty ' + m + ' ' + (kt.k.dataset.fx || ''); }

function tick(now) {
  if (!stage.el.isConnected) { stage.running = false; return; }
  const dt = Math.min(0.05, (now - stage.last) / 1000); stage.last = now;
  const W = stage.el.clientWidth;
  for (const kt of Object.values(stage.kits)) {
    const cw = kt.k.offsetWidth || 158, max = Math.max(0, W - cw);
    if (kt.first) { kt.first = false; kt.x = rand(0, max); kt.target = rand(0, max); }
    if (kt.mode === 'walk') {
      const dx = kt.target - kt.x;
      if (Math.abs(dx) < 2) setMode(kt, 'look', rand(1200, 2200));
      else { kt.dir = Math.sign(dx); kt.x += kt.dir * Math.min(Math.abs(dx), SPEED * dt); }
    } else if (now > kt.until) {
      if (kt.mode === 'look') setMode(kt, 'purr', rand(2800, 4200));
      else { let t = rand(0, max); if (Math.abs(t - kt.x) < 70) t = kt.x < max / 2 ? max : 0; kt.target = t; setMode(kt, 'walk'); }
    }
    kt.x = Math.max(0, Math.min(max, kt.x));
    kt.k.style.transform = `translateX(${kt.x}px)`;
    kt.k.dataset.dir = kt.dir;
    kt.k.dataset.side = kt.x > max / 2 ? 'r' : 'l';
    animate(kt, dt);
  }
  requestAnimationFrame(tick);
}

// Погладити: торкнутися котика
function pet(kt) {
  setMode(kt, 'purr', 3500);
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
    const ac = stage.ac || (stage.ac = new AC()); ac.resume?.();
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
