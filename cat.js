// ===== Кішечка на головному екрані: гуляє, зупиняється, дивиться на тебе й муркоче =====
const SPEED = 24; // пікселів за секунду (під крок лап)

const GRAD = (k, u) => `<defs>
  <linearGradient id="furG${k}" ${u ? 'gradientUnits="userSpaceOnUse" x1="0" y1="38" x2="0" y2="122"' : 'x1="0" y1="0" x2="0" y2="1"'}><stop offset="0" stop-color="#8395ad"/><stop offset=".55" stop-color="#97a8bd"/><stop offset="1" stop-color="#aebdcd"/></linearGradient>
  <linearGradient id="furD${k}" ${u ? 'gradientUnits="userSpaceOnUse" x1="0" y1="30" x2="0" y2="120"' : 'x1="0" y1="0" x2="0" y2="1"'}><stop offset="0" stop-color="#76889f"/><stop offset="1" stop-color="#8b9cb2"/></linearGradient>
  <radialGradient id="eyeG${k}" cx=".45" cy=".4" r=".6"><stop offset="0" stop-color="#ffd27a"/><stop offset=".7" stop-color="#e9a23b"/><stop offset="1" stop-color="#c47d1c"/></radialGradient>
</defs>`;

// Вид збоку — під час ходьби (дивиться праворуч). Ноги з суглобами: стегно/плече + гомілка/передпліччя
const leg = (cls, hind, dx, fill, paw) => hind
  ? `<g class="leg ${cls} hind"><g class="up" style="transform-origin:${58 + dx}px 62px">
      <path d="M${46 + dx} 58 C${43 + dx} 76 ${52 + dx} 93 ${66 + dx} 93 C${76 + dx} 92 ${75 + dx} 78 ${70 + dx} 62Z" fill="${fill}"/>
      <g class="lo" style="transform-origin:${66 + dx}px 88px">
        <path d="M${66 + dx} 88 L${57 + dx} 105 L${60 + dx} 116" stroke="${fill}" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <ellipse cx="${63 + dx}" cy="117.5" rx="7" ry="3.6" fill="${paw}"/></g></g></g>`
  : `<g class="leg ${cls} fore"><g class="up" style="transform-origin:${136 + dx}px 62px">
      <path d="M${125 + dx} 58 C${123 + dx} 74 ${126 + dx} 88 ${132 + dx} 94 C${141 + dx} 94 ${146 + dx} 78 ${145 + dx} 60Z" fill="${fill}"/>
      <g class="lo" style="transform-origin:${134 + dx}px 89px">
        <path d="M${134 + dx} 89 L${136 + dx} 115" stroke="${fill}" stroke-width="8.5" fill="none" stroke-linecap="round"/>
        <ellipse cx="${139 + dx}" cy="117.5" rx="7" ry="3.6" fill="${paw}"/></g></g></g>`;

const SIDE = `<svg viewBox="0 0 200 130" class="cat-side" aria-hidden="true">${GRAD('s', true)}
  <ellipse cx="100" cy="121" rx="66" ry="4.5" fill="#5a3a4a" opacity=".1"/>
  <g class="c-tail"><path d="M44 58 C26 57 15 52 10 40 C7 32 12 26 18 29" stroke="url(#furDs)" stroke-width="10" fill="none" stroke-linecap="round"/></g>
  ${leg('lf2', false, -7, 'url(#furDs)', '#72849b')}
  ${leg('lh2', true, -7, 'url(#furDs)', '#72849b')}
  <g class="c-torso">
    <path d="M38 64 C37 50 47 43 62 43 C79 43 92 47 110 45 C127 43 141 41 151 47 C159 53 157 70 149 80 C143 87 132 87 122 84 C108 81 94 82 80 80 C70 79 60 85 50 82 C42 79 38 72 38 64Z" fill="url(#furGs)"/>
    <path d="M80 79 C95 82 110 82 124 84 C133 86 143 85 148 80 C140 83 130 83 120 81 C106 79 94 80 80 79Z" fill="#b8c6d4" opacity=".7"/>
    <path d="M56 46 C66 44 76 46 84 48" stroke="#7b8da4" stroke-width="2" fill="none" opacity=".35" stroke-linecap="round"/>
  </g>
  ${leg('lh1', true, 0, 'url(#furGs)', '#a9b8c9')}
  ${leg('lf1', false, 0, 'url(#furGs)', '#a9b8c9')}
  <g class="c-head">
    <path d="M147 40 C149 27 162 21 174 24 C183 27 188 34 189 41 C191 43 192 46 190 48 C189 51 186 53 183 54 C180 59 173 61 166 60 C156 59 148 54 146 47 C145 44 146 42 147 40Z" fill="url(#furGs)"/>
    <path d="M157 28 C159 19 170 17 175 23 C171 24 164 26 157 28Z" fill="#76889f"/>
    <path d="M160 26 C162 21 168 20 171 23 C168 24 164 25 160 26Z" fill="#f4b6c8"/>
    <path d="M176 49 C180 47 186 47 190 48 C189 52 185 55 180 55 C177 55 175 52 176 49Z" fill="#b8c6d4"/>
    <path d="M171 38 C173 34 179 33 181 37 C179 41 173 42 171 38Z" fill="url(#eyeGs)"/>
    <path d="M176.5 34.2 C175.6 36 175.6 39.5 176.6 41" stroke="#2b2b33" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <circle cx="178.5" cy="36" r="1" fill="#fff"/>
    <path d="M170.5 38 C173 33 180 32 182 37" stroke="#5d6a7c" stroke-width="1" fill="none" opacity=".6"/>
    <path d="M188 42.5 C190 42.5 191.5 44 191 46 L188.5 46Z" fill="#f08aa8"/>
    <path d="M189 49 C188 51 186 52 184 52" stroke="#5d6a7c" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <path d="M164 50 C166 54 170 56 175 57" stroke="#a6b5c7" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>
    <ellipse cx="168" cy="47" rx="5" ry="3" fill="#ff9ab8" opacity=".35"/>
    <g stroke="#eef2f6" stroke-width="1" stroke-linecap="round" opacity=".9"><path d="M182 50 L199 46M182 52 L199 53M181 54 L196 58"/></g>
  </g>
</svg>`;

// Вид спереду — сидить і дивиться в екран
const FRONT = `<svg viewBox="0 0 130 130" class="cat-front" aria-hidden="true">${GRAD('f')}
  <ellipse cx="65" cy="124" rx="42" ry="5" fill="#5a3a4a" opacity=".1"/>
  <path class="c-tail2" d="M92 118 C112 118 122 106 118 88" stroke="url(#furDf)" stroke-width="10" fill="none" stroke-linecap="round"/>
  <g class="c-body">
    <path d="M32 121 C26 96 38 70 65 66 C92 70 104 96 98 121Z" fill="url(#furGf)"/>
    <ellipse cx="65" cy="94" rx="16" ry="21" fill="#b8c6d4" opacity=".85"/>
    <ellipse cx="53" cy="119" rx="10" ry="6" fill="#a9b8c9"/><ellipse cx="77" cy="119" rx="10" ry="6" fill="#a9b8c9"/>
    <path d="M50 120 v3 M55 120 v3 M74 120 v3 M79 120 v3" stroke="#8a9ab0" stroke-width="1" stroke-linecap="round"/>
    <g class="c-face">
      <circle cx="65" cy="46" r="33" fill="url(#furGf)"/>
      <path d="M36 34 C34 16 49 10 57 18 C50 21 43 27 36 34Z" fill="#7b8da4"/>
      <path d="M94 34 C96 16 81 10 73 18 C80 21 87 27 94 34Z" fill="#7b8da4"/>
      <path d="M40 30 C40 21 47 18 52 21 C47 23 43 26 40 30Z" fill="#f4b6c8"/>
      <path d="M90 30 C90 21 83 18 78 21 C83 23 87 26 90 30Z" fill="#f4b6c8"/>
      <ellipse cx="65" cy="59" rx="18" ry="13" fill="#b8c6d4"/>
      <g class="eyes-open">
        <ellipse cx="52" cy="45" rx="7.5" ry="8" fill="url(#eyeGf)"/><ellipse cx="78" cy="45" rx="7.5" ry="8" fill="url(#eyeGf)"/>
        <ellipse cx="52.5" cy="45.5" rx="3" ry="6.5" fill="#2b2b33"/><ellipse cx="78.5" cy="45.5" rx="3" ry="6.5" fill="#2b2b33"/>
        <circle cx="55" cy="42" r="2" fill="#fff"/><circle cx="81" cy="42" r="2" fill="#fff"/>
      </g>
      <g class="eyes-closed" stroke="#4b5568" stroke-width="2.2" fill="none" stroke-linecap="round">
        <path d="M45 46 Q52 41 59 46"/><path d="M71 46 Q78 41 85 46"/>
      </g>
      <path d="M61 54 L69 54 L65 58.5Z" fill="#f08aa8"/>
      <path d="M65 58.5 Q65 64 59 64 M65 58.5 Q65 64 71 64" stroke="#5d6a7c" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <ellipse cx="41" cy="56" rx="6" ry="3.5" fill="#ff9ab8" opacity=".5"/><ellipse cx="89" cy="56" rx="6" ry="3.5" fill="#ff9ab8" opacity=".5"/>
      <g stroke="#eef2f6" stroke-width="1.3" stroke-linecap="round"><path d="M47 59 L24 55M47 63 L25 67M83 59 L106 55M83 63 L105 67"/></g>
    </g>
  </g>
</svg>`;

let st = null;
const rand = (a, b) => a + Math.random() * (b - a);

export function mountCat(holder) {
  if (!holder) return;
  if (!st) st = create();
  holder.appendChild(st.el); // той самий елемент — кішка не «перестрибує» при оновленні екрана
  if (!st.running) { st.running = true; st.last = performance.now(); requestAnimationFrame(tick); }
}

function create() {
  const el = document.createElement('div');
  el.className = 'cat-stage';
  el.innerHTML = `<div class="kitty walk" data-dir="1"><div class="pose side">${SIDE}</div><div class="pose front">${FRONT}</div><div class="bubble">Мррр… 💕</div></div>`;
  const k = el.querySelector('.kitty');
  k.addEventListener('click', (e) => { e.stopPropagation(); pet(); });
  return { el, k, x: rand(0, 120), dir: 1, mode: 'walk', target: 0, until: 0, running: false, first: true };
}

function setMode(m, dur = 0) { st.mode = m; st.until = performance.now() + dur; st.k.className = 'kitty ' + m; }

function tick(now) {
  if (!st.el.isConnected) { st.running = false; return; }
  const dt = Math.min(0.05, (now - st.last) / 1000); st.last = now;
  const W = st.el.clientWidth, cw = st.k.offsetWidth || 110, max = Math.max(0, W - cw);
  if (st.first) { st.first = false; st.target = rand(0, max); }
  if (st.mode === 'walk') {
    const dx = st.target - st.x;
    if (Math.abs(dx) < 2) setMode('look', rand(1200, 2200));
    else { st.dir = Math.sign(dx); st.x += st.dir * Math.min(Math.abs(dx), SPEED * dt); }
  } else if (now > st.until) {
    if (st.mode === 'look') setMode('purr', rand(2800, 4200));
    else {
      let t = rand(0, max);
      if (Math.abs(t - st.x) < 70) t = st.x < max / 2 ? max : 0; // щоб пройшлася помітно
      st.target = t; setMode('walk');
    }
  }
  st.x = Math.max(0, Math.min(max, st.x));
  st.k.style.transform = `translateX(${st.x}px)`;
  st.k.dataset.dir = st.dir;
  st.k.dataset.side = st.x > max / 2 ? 'r' : 'l';
  requestAnimationFrame(tick);
}

// Погладити: торкнутися кішки
function pet() {
  setMode('purr', 3500);
  purrSound();
  for (let i = 0; i < 5; i++) {
    const h = document.createElement('span'); h.className = 'pet-heart'; h.textContent = '❤';
    h.style.left = `${st.x + rand(20, 90)}px`; h.style.animationDelay = `${i * 0.12}s`;
    st.el.appendChild(h); setTimeout(() => h.remove(), 1800);
  }
}

// Звук муркотіння (синтезований, звучить лише після дотику)
function purrSound() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ac = st.ac || (st.ac = new AC()); ac.resume?.();
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
