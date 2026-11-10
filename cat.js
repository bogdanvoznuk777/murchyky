// ===== Кішечка на головному екрані: гуляє, зупиняється, дивиться на тебе й муркоче =====
const SPEED = 38; // пікселів за секунду

const GRAD = (k) => `<defs>
  <linearGradient id="furG${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8395ad"/><stop offset=".55" stop-color="#97a8bd"/><stop offset="1" stop-color="#aebdcd"/></linearGradient>
  <linearGradient id="furD${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#76889f"/><stop offset="1" stop-color="#8b9cb2"/></linearGradient>
  <radialGradient id="eyeG${k}" cx=".45" cy=".4" r=".6"><stop offset="0" stop-color="#ffd27a"/><stop offset=".7" stop-color="#e9a23b"/><stop offset="1" stop-color="#c47d1c"/></radialGradient>
</defs>`;

// Вид збоку — під час ходьби (дивиться праворуч)
const SIDE = `<svg viewBox="0 0 170 120" class="cat-side" aria-hidden="true">${GRAD('s')}
  <ellipse cx="88" cy="113" rx="56" ry="5" fill="#5a3a4a" opacity=".1"/>
  <path class="c-tail" d="M42 62 C22 60 12 40 22 18" stroke="url(#furDs)" stroke-width="10" fill="none" stroke-linecap="round"/>
  <g class="leg la far"><rect x="102" y="62" width="12" height="40" rx="6" fill="url(#furDs)"/><ellipse cx="109" cy="102" rx="8" ry="4.5" fill="#7b8da4"/></g>
  <g class="leg lb far"><rect x="46" y="62" width="12" height="40" rx="6" fill="url(#furDs)"/><ellipse cx="53" cy="102" rx="8" ry="4.5" fill="#7b8da4"/></g>
  <path d="M36 62 C36 44 58 38 86 40 C112 41 130 45 132 59 C133 72 118 81 86 81 C55 81 36 76 36 62Z" fill="url(#furGs)"/>
  <path d="M58 76 C74 83 104 83 118 74 C112 82 70 86 58 76Z" fill="#b8c6d4" opacity=".8"/>
  <g class="leg lb near"><rect x="56" y="64" width="13" height="40" rx="6.5" fill="url(#furGs)"/><ellipse cx="63" cy="104" rx="9" ry="5" fill="#a9b8c9"/></g>
  <g class="leg la near"><rect x="112" y="64" width="13" height="40" rx="6.5" fill="url(#furGs)"/><ellipse cx="119" cy="104" rx="9" ry="5" fill="#a9b8c9"/></g>
  <g class="c-head">
    <ellipse cx="134" cy="42" rx="25" ry="22" fill="url(#furGs)"/>
    <path d="M118 25 C121 13 136 11 141 20 C135 22 126 25 118 25Z" fill="#7b8da4"/>
    <path d="M122 23 C125 17 132 16 136 20 C131 21 127 22 122 23Z" fill="#f4b6c8"/>
    <ellipse cx="149" cy="51" rx="11" ry="8" fill="#b8c6d4"/>
    <ellipse cx="142" cy="38" rx="5.5" ry="6.5" fill="url(#eyeGs)"/>
    <ellipse cx="143.5" cy="38.5" rx="1.8" ry="5" fill="#2b2b33"/>
    <circle cx="144" cy="35.5" r="1.5" fill="#fff"/>
    <path d="M155 45 L160 46 L156 50Z" fill="#f08aa8"/>
    <path d="M156 50 Q155 56 149 55" stroke="#5d6a7c" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <ellipse cx="135" cy="50" rx="5" ry="3" fill="#ff9ab8" opacity=".45"/>
    <g stroke="#eef2f6" stroke-width="1.2" stroke-linecap="round"><path d="M150 51 L168 47M150 54 L168 56"/></g>
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
