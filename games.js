// ===== 21 гра для «Дуелей наживо» =====
// kind: 'sim' — обидва грають однакове завдання (результат: score), 'turn' — по черзі (стан у дуелі), 'phase' — етапами
import { SURVEY, WORDS } from './data.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const T = () => performance.now();
const pick = (rng, a) => a[Math.floor(rng() * a.length)];
const shuf = (rng, a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const secs = (s) => `${s.toFixed(2)} с`;
const timeHead = (root) => { const t0 = T(); const el = root.querySelector('.g-time'); const iv = setInterval(() => { if (el) el.textContent = ((T() - t0) / 1000).toFixed(1) + ' с'; }, 100); return { t0, stop: () => clearInterval(iv), sec: (pen = 0) => (T() - t0) / 1000 + pen }; };

// ---------- одночасні ігри ----------
const reaction = {
  name: 'Швидка лапка', icon: '⚡', desc: 'Тапни, щойно поле стане рожевим. 5 раундів, середній час. Зарано — +1000 мс.', kind: 'sim', better: 'low', fmt: (s) => `${Math.round(s)} мс`,
  play: (root, ctx) => new Promise((res) => {
    const delays = Array.from({ length: 5 }, () => 1200 + ctx.rng() * 2800); let i = 0, t0 = 0, st = 'wait', to; const times = [];
    root.innerHTML = '<div class="g-hint" id="gh"></div><button class="g-pad" id="pad"></button>';
    const pad = root.querySelector('#pad'), gh = root.querySelector('#gh');
    const next = () => {
      if (i >= 5) return res({ score: times.reduce((a, b) => a + b, 0) / 5 });
      st = 'wait'; pad.className = 'g-pad'; pad.textContent = 'Чекай… 🐾'; gh.textContent = `Раунд ${i + 1} з 5`;
      to = setTimeout(() => { st = 'go'; pad.className = 'g-pad go'; pad.textContent = 'ТАПАЙ!'; t0 = T(); }, delays[i]);
    };
    pad.onpointerdown = () => {
      if (st === 'wait') { clearTimeout(to); times.push(1000); pad.textContent = 'Зарано! +1000 мс'; }
      else if (st === 'go') { const t = T() - t0; times.push(t); pad.className = 'g-pad'; pad.textContent = `${Math.round(t)} мс`; }
      else return;
      i++; st = 'pause'; setTimeout(next, 900);
    };
    next();
  }),
};

const mice = {
  name: 'Лови мишку', icon: '🐭', desc: '30 секунд: тапай мишок, що вистрибують з нірок.', kind: 'sim', better: 'high', fmt: (s) => `${s} 🐭`,
  play: (root, ctx) => new Promise((res) => {
    const sched = []; for (let t = 500; t < 29300; t += 520 + ctx.rng() * 260) sched.push({ t, h: Math.floor(ctx.rng() * 12), hit: false });
    root.innerHTML = '<div class="g-hint">⏱ <b id="gt">30</b> с · 🐭 <b id="gs">0</b></div><div class="g-holes">' + '<button class="hole"></button>'.repeat(12) + '</div>';
    const holes = [...root.querySelectorAll('.hole')], t0 = T(); let score = 0;
    const active = () => { const n = T() - t0; const m = {}; for (const s of sched) if (!s.hit && n >= s.t && n < s.t + 950) m[s.h] = s; return m; };
    holes.forEach((b, k) => (b.onpointerdown = () => { const s = active()[k]; if (s) { s.hit = true; score++; root.querySelector('#gs').textContent = score; b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 200); } }));
    const iv = setInterval(() => {
      const n = T() - t0, m = active();
      holes.forEach((b, k) => (b.textContent = m[k] ? '🐭' : ''));
      root.querySelector('#gt').textContent = Math.max(0, Math.ceil(30 - n / 1000));
      if (n >= 30000) { clearInterval(iv); res({ score }); }
    }, 50);
  }),
};

const yarn = {
  name: 'Клубок', icon: '🧶', desc: 'Розмотай клубок — 60 тапів якнайшвидше.', kind: 'sim', better: 'low', fmt: secs,
  play: (root) => new Promise((res) => {
    root.innerHTML = '<div class="g-hint"><span class="g-time">0.0 с</span> · залишилось <b id="gl">60</b></div><button class="g-yarn" id="y">🧶</button>';
    const tm = timeHead(root); let n = 60; const y = root.querySelector('#y');
    y.onpointerdown = () => { if (n <= 0) return; n--; root.querySelector('#gl').textContent = n; y.style.transform = `scale(${0.45 + 0.55 * n / 60}) rotate(${n * 23}deg)`; if (!n) { tm.stop(); res({ score: tm.sec() }); } };
  }),
};

const clock = {
  name: 'Внутрішній годинник', icon: '⏱', desc: 'Натисни «Старт», а потім «Стоп» рівно на 10,00 с. Таймер зникне через 3 с. Дві спроби, рахується краща.', kind: 'sim', better: 'low', fmt: (s) => `±${s.toFixed(3)} с`,
  play: (root) => new Promise((res) => {
    let tries = 0, best = 99, t0 = 0, iv;
    root.innerHTML = '<div class="g-hint" id="gh">Спроба 1 з 2</div><div class="g-big" id="gv">0.00</div><button class="btn" id="gb">Старт</button>';
    const gv = root.querySelector('#gv'), gb = root.querySelector('#gb');
    gb.onclick = () => {
      if (!t0) { t0 = T(); gb.textContent = 'Стоп'; iv = setInterval(() => { const s = (T() - t0) / 1000; gv.textContent = s < 3 ? s.toFixed(2) : '❓❓'; }, 30); return; }
      clearInterval(iv); const s = (T() - t0) / 1000, d = Math.abs(s - 10); best = Math.min(best, d); tries++; t0 = 0;
      gv.textContent = s.toFixed(3) + ' с';
      if (tries >= 2) { gb.disabled = true; setTimeout(() => res({ score: best }), 1200); }
      else { root.querySelector('#gh').textContent = 'Спроба 2 з 2'; gb.textContent = 'Старт'; }
    };
  }),
};

const rhythm = {
  name: 'Котячий ритм', icon: '🎵', desc: 'Після 4 відлікових ударів тапай у такт 16 разів. Рахується середня неточність.', kind: 'sim', better: 'low', fmt: (s) => `${Math.round(s)} мс`,
  play: (root) => new Promise((res) => {
    const BEAT = 600, COUNT = 4, N = 16; let ac = null; try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { }
    root.innerHTML = '<div class="g-hint" id="gh">Натисни «Почати» і слухай/дивись ритм</div><button class="g-pad" id="pad">🐾</button><button class="btn" id="gb">Почати</button>';
    const pad = root.querySelector('#pad'), gh = root.querySelector('#gh'); const taps = []; let t0 = 0;
    const click = (hi) => { if (!ac) return; const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = hi ? 1200 : 800; g.gain.setValueAtTime(0.25, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.08); o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.09); };
    root.querySelector('#gb').onclick = (e) => {
      e.target.remove(); ac?.resume?.(); t0 = T() + 500;
      for (let k = 0; k < COUNT + N; k++) setTimeout(() => { click(k < COUNT); pad.classList.add('go'); setTimeout(() => pad.classList.remove('go'), 120); gh.textContent = k < COUNT ? `Відлік ${COUNT - k}…` : `Удар ${k - COUNT + 1} з ${N}`; }, 500 + k * BEAT);
      setTimeout(() => {
        const beats = Array.from({ length: N }, (_, k) => t0 + (COUNT + k) * BEAT); let sum = 0;
        for (const b of beats) { let m = 300; for (const t of taps) m = Math.min(m, Math.abs(t - b)); sum += m; }
        res({ score: sum / N });
      }, 500 + (COUNT + N) * BEAT + 400);
    };
    pad.onpointerdown = () => { if (t0) taps.push(T()); pad.classList.add('tap'); setTimeout(() => pad.classList.remove('tap'), 100); };
  }),
};

const memory = {
  name: 'Котяча пам\'ять', icon: '🃏', desc: 'Знайди всі 6 пар карток якнайшвидше.', kind: 'sim', better: 'low', fmt: secs,
  play: (root, ctx) => new Promise((res) => {
    const cards = shuf(ctx.rng, ['🐟', '🐟', '🧶', '🧶', '🐭', '🐭', '🥛', '🥛', '🌸', '🌸', '💖', '💖']);
    root.innerHTML = '<div class="g-hint"><span class="g-time">0.0 с</span></div><div class="g-cards">' + cards.map((c, i) => `<button class="card-b" data-i="${i}"><span>${c}</span></button>`).join('') + '</div>';
    const tm = timeHead(root), els = [...root.querySelectorAll('.card-b')]; let open = [], found = 0, lock = false;
    els.forEach((b) => (b.onclick = () => {
      if (lock || b.classList.contains('up')) return; b.classList.add('up'); open.push(b);
      if (open.length === 2) {
        const [a, c] = open; open = [];
        if (cards[a.dataset.i] === cards[c.dataset.i]) { a.classList.add('ok'); c.classList.add('ok'); if (++found === 6) { tm.stop(); res({ score: tm.sec() }); } }
        else { lock = true; setTimeout(() => { a.classList.remove('up'); c.classList.remove('up'); lock = false; }, 650); }
      }
    }));
  }),
};

const simon = {
  name: 'Мур-послідовність', icon: '🎶', desc: 'Запам\'ятай, які лапки світились, і повтори. Щораз на одну довше.', kind: 'sim', better: 'high', fmt: (s) => `${s} кроків`,
  play: (root, ctx) => new Promise((res) => {
    const seq = Array.from({ length: 40 }, () => Math.floor(ctx.rng() * 4)); let len = 1, pos = 0, input = false;
    root.innerHTML = '<div class="g-hint" id="gh">Дивись…</div><div class="g-simon">' + ['#ff8fbb', '#9ec5ff', '#ffd27a', '#a5e3b5'].map((c, i) => `<button class="sp" data-i="${i}" style="--c:${c}">🐾</button>`).join('') + '</div>';
    const pads = [...root.querySelectorAll('.sp')], gh = root.querySelector('#gh');
    const flash = (i, d = 380) => { pads[i].classList.add('lit'); setTimeout(() => pads[i].classList.remove('lit'), d); };
    const show = () => { input = false; gh.textContent = `Дивись… (${len})`; seq.slice(0, len).forEach((v, k) => setTimeout(() => flash(v), 600 + k * 600)); setTimeout(() => { input = true; pos = 0; gh.textContent = 'Твоя черга!'; }, 600 + len * 600); };
    pads.forEach((p) => (p.onpointerdown = () => {
      if (!input) return; const i = +p.dataset.i; flash(i, 180);
      if (i !== seq[pos]) { input = false; gh.textContent = 'Помилка!'; return setTimeout(() => res({ score: len - 1 }), 700); }
      if (++pos === len) { if (len >= 40) return res({ score: 40 }); len++; input = false; setTimeout(show, 500); }
    }));
    show();
  }),
};

const PAIRS = [['🐱', '😺'], ['🌸', '🌺'], ['🍎', '🍅'], ['⭐', '🌟'], ['💗', '💖'], ['🐟', '🐠'], ['🌙', '🌛'], ['🎀', '🎁'], ['🐭', '🐹'], ['☁️', '🌥️']];
const findcat = {
  name: 'Знайди котика', icon: '🔍', desc: '10 рівнів: знайди один значок, що відрізняється. Помилка — +2 с.', kind: 'sim', better: 'low', fmt: secs,
  play: (root, ctx) => new Promise((res) => {
    let lv = 0, pen = 0; root.innerHTML = '<div class="g-hint"><span class="g-time">0.0 с</span> · рівень <b id="gl">1</b>/10</div><div id="gg"></div>';
    const tm = timeHead(root), gg = root.querySelector('#gg');
    const draw = () => {
      const n = 3 + Math.floor(lv / 3), [a, b] = pick(ctx.rng, PAIRS), odd = Math.floor(ctx.rng() * n * n);
      gg.className = 'g-grid'; gg.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
      gg.innerHTML = Array.from({ length: n * n }, (_, i) => `<button data-o="${i === odd ? 1 : 0}">${i === odd ? b : a}</button>`).join('');
      gg.querySelectorAll('button').forEach((x) => (x.onclick = () => {
        if (x.dataset.o === '1') { if (++lv >= 10) { tm.stop(); return res({ score: tm.sec(pen) }); } root.querySelector('#gl').textContent = lv + 1; draw(); }
        else { pen += 2; x.classList.add('bad'); }
      }));
    };
    draw();
  }),
};

const COLORS = [['червоний', '#e53935'], ['синій', '#1e88e5'], ['зелений', '#43a047'], ['жовтий', '#f9c80e'], ['фіолетовий', '#8e24aa']];
const stroop = {
  name: 'Кольорова пастка', icon: '🎨', desc: 'Обери КОЛІР, яким написане слово (не саме слово). 15 раундів, помилка — +2 с.', kind: 'sim', better: 'low', fmt: secs,
  play: (root, ctx) => new Promise((res) => {
    let r = 0, pen = 0; root.innerHTML = '<div class="g-hint"><span class="g-time">0.0 с</span> · <b id="gr">1</b>/15</div><div class="g-word" id="gw"></div><div class="g-opts" id="go"></div>';
    const tm = timeHead(root);
    const draw = () => {
      const w = pick(ctx.rng, COLORS); let ink; do ink = pick(ctx.rng, COLORS); while (ink === w);
      const gw = root.querySelector('#gw'); gw.textContent = w[0]; gw.style.color = ink[1];
      const opts = shuf(ctx.rng, [ink, w, ...shuf(ctx.rng, COLORS.filter((c) => c !== ink && c !== w)).slice(0, 2)]);
      root.querySelector('#go').innerHTML = opts.map((o) => `<button class="opt">${o[0]}</button>`).join('');
      root.querySelectorAll('#go button').forEach((b, k) => (b.onclick = () => {
        if (opts[k] === ink) { if (++r >= 15) { tm.stop(); return res({ score: tm.sec(pen) }); } root.querySelector('#gr').textContent = r + 1; draw(); }
        else { pen += 2; b.classList.add('bad'); }
      }));
    };
    draw();
  }),
};

const math = {
  name: 'Швидкий рахунок', icon: '🧮', desc: '15 прикладів. Обирай правильну відповідь. Помилка — +3 с.', kind: 'sim', better: 'low', fmt: secs,
  play: (root, ctx) => new Promise((res) => {
    let r = 0, pen = 0; root.innerHTML = '<div class="g-hint"><span class="g-time">0.0 с</span> · <b id="gr">1</b>/15</div><div class="g-word" id="gw"></div><div class="g-opts two" id="go"></div>';
    const tm = timeHead(root), ri = (a, b) => a + Math.floor(ctx.rng() * (b - a + 1));
    const draw = () => {
      const op = pick(ctx.rng, ['+', '−', '×']); let a, b, v;
      if (op === '+') { a = ri(12, 69); b = ri(8, 49); v = a + b; } else if (op === '−') { a = ri(30, 99); b = ri(5, a - 5); v = a - b; } else { a = ri(3, 12); b = ri(3, 12); v = a * b; }
      root.querySelector('#gw').textContent = `${a} ${op} ${b} = ?`;
      const set = new Set([v]); while (set.size < 4) set.add(v + pick(ctx.rng, [-10, -2, -1, 1, 2, 10, -3, 3]));
      const opts = shuf(ctx.rng, [...set]);
      root.querySelector('#go').innerHTML = opts.map((o) => `<button class="opt">${o}</button>`).join('');
      root.querySelectorAll('#go button').forEach((x, k) => (x.onclick = () => {
        if (opts[k] === v) { if (++r >= 15) { tm.stop(); return res({ score: tm.sec(pen) }); } root.querySelector('#gr').textContent = r + 1; draw(); }
        else { pen += 3; x.classList.add('bad'); }
      }));
    };
    draw();
  }),
};

const slide = {
  name: 'П\'ятнашки 3×3', icon: '🧩', desc: 'Розстав плитки по порядку 1–8. Тапай плитку біля порожньої клітинки.', kind: 'sim', better: 'low', fmt: secs,
  play: (root, ctx) => new Promise((res) => {
    let b = [1, 2, 3, 4, 5, 6, 7, 8, 0], prev = -1;
    const nb = (i) => [i - 3, i + 3, i % 3 ? i - 1 : -1, i % 3 < 2 ? i + 1 : -1].filter((x) => x >= 0 && x < 9);
    for (let k = 0; k < 80; k++) { const z = b.indexOf(0); const opts = nb(z).filter((x) => x !== prev); const m = pick(ctx.rng, opts); prev = z; [b[z], b[m]] = [b[m], b[z]]; }
    if (b.join() === '1,2,3,4,5,6,7,8,0') { [b[7], b[8]] = [b[8], b[7]]; [b[5], b[8]] = [b[8], b[5]]; }
    root.innerHTML = '<div class="g-hint"><span class="g-time">0.0 с</span></div><div class="g-slide" id="gs"></div>';
    const tm = timeHead(root), gs = root.querySelector('#gs');
    const draw = () => {
      gs.innerHTML = b.map((v, i) => `<button data-i="${i}" class="${v ? '' : 'empty'}">${v ? v : '🐾'}</button>`).join('');
      gs.querySelectorAll('button').forEach((x) => (x.onclick = () => {
        const i = +x.dataset.i, z = b.indexOf(0); if (!nb(z).includes(i)) return;
        [b[z], b[i]] = [b[i], b[z]]; draw();
        if (b.join() === '1,2,3,4,5,6,7,8,0') { tm.stop(); res({ score: tm.sec() }); }
      }));
    };
    draw();
  }),
};

const maze = {
  name: 'Лабіринт', icon: '🌀', desc: 'Проведи кошеня 🐱 до миски 🥣. Кнопки-стрілки або свайп.', kind: 'sim', better: 'low', fmt: secs,
  play: (root, ctx) => new Promise((res) => {
    const N = 7, W = Array.from({ length: N * N }, () => ({ n: 1, s: 1, e: 1, w: 1 })), seen = new Set([0]), stack = [0];
    const dirs = { n: [-1, 0, 's'], s: [1, 0, 'n'], e: [0, 1, 'w'], w: [0, -1, 'e'] };
    while (stack.length) {
      const c = stack[stack.length - 1], r = Math.floor(c / N), q = c % N;
      const opts = Object.entries(dirs).filter(([, [dr, dq]]) => { const rr = r + dr, qq = q + dq; return rr >= 0 && rr < N && qq >= 0 && qq < N && !seen.has(rr * N + qq); });
      if (!opts.length) { stack.pop(); continue; }
      const [d, [dr, dq, op]] = pick(ctx.rng, opts), nx = (r + dr) * N + q + dq; W[c][d] = 0; W[nx][op] = 0; seen.add(nx); stack.push(nx);
    }
    let pos = 0;
    root.innerHTML = `<div class="g-hint"><span class="g-time">0.0 с</span></div><div class="g-maze" id="gm" style="grid-template-columns:repeat(${N},1fr)"></div>
      <div class="g-arrows"><span></span><button data-d="n">⬆️</button><span></span><button data-d="w">⬅️</button><button data-d="s">⬇️</button><button data-d="e">➡️</button></div>`;
    const tm = timeHead(root), gm = root.querySelector('#gm');
    const draw = () => { gm.innerHTML = W.map((c, i) => `<div style="border-top-width:${c.n * 3}px;border-bottom-width:${c.s * 3}px;border-left-width:${c.w * 3}px;border-right-width:${c.e * 3}px">${i === pos ? '🐱' : i === N * N - 1 ? '🥣' : ''}</div>`).join(''); };
    const move = (d) => { if (W[pos][d]) return; pos += dirs[d][0] * N + dirs[d][1]; draw(); if (pos === N * N - 1) { tm.stop(); res({ score: tm.sec() }); } };
    root.querySelectorAll('.g-arrows button').forEach((b) => (b.onpointerdown = (e) => { e.preventDefault(); move(b.dataset.d); }));
    let sx, sy; gm.ontouchstart = (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
    gm.ontouchend = (e) => { const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return; move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'e' : 'w') : (dy > 0 ? 's' : 'n')); };
    draw();
  }),
};

const guess = {
  name: 'Вгадай число', icon: '🔢', desc: 'Загадано число від 1 до 100. Підказки «більше/менше». Хто за меншу кількість спроб.', kind: 'sim', better: 'low', fmt: (s) => `${Math.floor(s)} спроб`,
  play: (root, ctx) => new Promise((res) => {
    const target = 1 + Math.floor(ctx.rng() * 100); let n = 0; const t0 = T();
    root.innerHTML = '<div class="g-hint" id="gh">Введи число 1–100</div><div class="row"><input id="gi" type="number" inputmode="numeric" min="1" max="100"><button class="btn sm" id="gb">OK</button></div><div class="g-log" id="gl"></div>';
    const gi = root.querySelector('#gi');
    const go = () => {
      const v = Math.round(+gi.value); if (!(v >= 1 && v <= 100)) return; n++; gi.value = ''; gi.focus();
      const msg = v === target ? '🎉 Вгадано!' : v < target ? '⬆️ Більше' : '⬇️ Менше';
      root.querySelector('#gl').insertAdjacentHTML('afterbegin', `<div>${v} — ${msg}</div>`);
      if (v === target) res({ score: n + Math.min(0.99, (T() - t0) / 1e6) });
    };
    root.querySelector('#gb').onclick = go; gi.onkeydown = (e) => e.key === 'Enter' && go(); gi.focus();
  }),
};

const anagram = {
  name: 'Анаграми', icon: '🔤', desc: 'Розгадай 5 слів з переплутаними літерами. Пропуск — +20 с.', kind: 'sim', better: 'low', fmt: secs,
  play: (root, ctx) => new Promise((res) => {
    const list = shuf(ctx.rng, WORDS).slice(0, 5); let i = 0, pen = 0;
    root.innerHTML = '<div class="g-hint"><span class="g-time">0.0 с</span> · <b id="gn">1</b>/5</div><div class="g-word" id="gw"></div><div class="row"><input id="gi" autocapitalize="none" autocomplete="off"><button class="btn sm" id="gb">OK</button></div><button class="link" id="gs">Пропустити (+20 с)</button>';
    const tm = timeHead(root), gi = root.querySelector('#gi');
    const draw = () => { let s; do s = shuf(ctx.rng, [...list[i]]).join(''); while (s === list[i]); root.querySelector('#gw').textContent = s.toUpperCase(); root.querySelector('#gn').textContent = i + 1; gi.value = ''; gi.focus(); };
    const next = () => { if (++i >= 5) { tm.stop(); return res({ score: tm.sec(pen) }); } draw(); };
    const ok = () => { if (gi.value.trim().toLowerCase() === list[i]) next(); else { gi.classList.add('bad'); setTimeout(() => gi.classList.remove('bad'), 300); } };
    root.querySelector('#gb').onclick = ok; gi.onkeydown = (e) => e.key === 'Enter' && ok();
    root.querySelector('#gs').onclick = () => { pen += 20; next(); };
    draw();
  }),
};

const BASE9 = ['мандрівка', 'шоколадка', 'поцілунок', 'відпустка', 'черевички', 'закоханий', 'подарунок', 'кошенятко', 'романтика'];
const letters = {
  name: 'Слово з букв', icon: '📝', desc: '60 секунд: склади найдовше слово з 9 літер (кожну літеру — не більше разів, ніж вона є). Суперник може оскаржити слово.', kind: 'sim', better: 'high', fmt: (s) => `${Math.floor(s)} літер`, challengeable: true,
  play: (root, ctx) => new Promise((res) => {
    const base = pick(ctx.rng, BASE9), lets = shuf(ctx.rng, [...base]); let best = '', bestT = 0; const t0 = T();
    root.innerHTML = `<div class="g-hint">⏱ <b id="gt">60</b> с · найкраще: <b id="gb2">—</b></div><div class="g-letters">${lets.map((l) => `<span>${l.toUpperCase()}</span>`).join('')}</div><div class="row"><input id="gi" autocapitalize="none" autocomplete="off"><button class="btn sm" id="gb">OK</button></div><button class="link" id="gf">Завершити</button>`;
    const gi = root.querySelector('#gi');
    const valid = (w) => { const c = {}; for (const l of lets) c[l] = (c[l] || 0) + 1; for (const l of w) { if (!c[l]) return false; c[l]--; } return w.length >= 2; };
    const finish = () => { clearInterval(iv); res({ score: best.length + (best ? 1 - Math.min(0.99, bestT / 100) : 0), word: best }); };
    const ok = () => { const w = gi.value.trim().toLowerCase(); gi.value = ''; if (!valid(w)) { gi.classList.add('bad'); setTimeout(() => gi.classList.remove('bad'), 300); return; } if (w.length > best.length) { best = w; bestT = (T() - t0) / 1000; root.querySelector('#gb2').textContent = w; } };
    root.querySelector('#gb').onclick = ok; gi.onkeydown = (e) => e.key === 'Enter' && ok(); root.querySelector('#gf').onclick = finish;
    const iv = setInterval(() => { const s = 60 - (T() - t0) / 1000; root.querySelector('#gt').textContent = Math.max(0, Math.ceil(s)); if (s <= 0) finish(); }, 200);
    gi.focus();
  }),
};

const blitz = {
  name: 'Бліц «Знаю тебе»', icon: '💞', desc: '10 швидких питань: як відповів(ла) партнер в опитуванні? Важить точність, потім швидкість.', kind: 'sim', better: 'high', fmt: (s) => `${Math.floor(s)}/10`,
  play: (root, ctx) => new Promise((res) => {
    const pa = ctx.partnerAnswers || {};
    const qs = shuf(ctx.rng, SURVEY.filter((q) => q.quiz !== false && (q.type === 'choice' || q.type === 'scale') && pa[q.id] !== undefined)).slice(0, 10);
    if (!qs.length) { root.innerHTML = '<p>Партнер ще не пройшов опитування.</p>'; return setTimeout(() => res({ score: 0 }), 1500); }
    let i = 0, ok = 0; const t0 = T();
    root.innerHTML = '<div class="g-hint"><b id="gn">1</b>/' + qs.length + ' · вгадано <b id="gk">0</b></div><h3 id="gq"></h3><div class="g-opts" id="go"></div>';
    const lbl = (o) => (o === 'SELF' ? ctx.partnerName : o === 'PARTNER' ? 'Ти' : o === 'SAME' ? 'Однаково' : o);
    const draw = () => {
      const q = qs[i]; root.querySelector('#gq').textContent = q.q; root.querySelector('#gn').textContent = i + 1;
      const opts = q.type === 'scale' ? Array.from({ length: 10 }, (_, k) => String(k + 1)) : q.opts;
      const go = root.querySelector('#go'); go.className = 'g-opts' + (q.type === 'scale' ? ' five' : '');
      go.innerHTML = opts.map((o) => `<button class="opt">${esc(lbl(o))}</button>`).join('');
      go.querySelectorAll('button').forEach((b, k) => (b.onclick = () => {
        const right = String(opts[k]) === String(pa[q.id]); if (right) ok++; b.classList.add(right ? 'good' : 'bad'); root.querySelector('#gk').textContent = ok;
        setTimeout(() => { if (++i >= qs.length) res({ score: ok + 1 - Math.min(0.99, (T() - t0) / 1e5) }); else draw(); }, 350);
      }));
    };
    draw();
  }),
};

// ---------- покрокові ігри (стан зберігається в дуелі) ----------
// turn.init(rng, a, b) → state; turn.view(root, ctx) ; ctx: { state, me, op, myName, opName, act(fn) }
const lastLetter = (w) => { const s = w.replace(/[ь']/g, ''); return s[s.length - 1]; };
const chain = {
  name: 'Ланцюжок слів', icon: '🔗', desc: 'По черзі називайте слова на останню літеру попереднього (ь пропускається). 15 с на хід, без повторів. Можна оскаржити неіснуюче слово.', kind: 'turn', live: true,
  init: (rng, a) => ({ turn: a, words: [], need: pick(rng, [...'бвгдзклмнпрст']), deadline: Date.now() + 25000, winner: null }),
  view: (root, c) => {
    const s = c.state, myTurn = s.turn === c.me && !s.winner, last = s.words[s.words.length - 1];
    root.innerHTML = `<div class="g-hint">${s.winner ? '' : myTurn ? `Твій хід! Слово на літеру <b>${s.need.toUpperCase()}</b>` : `Хід ${esc(c.opName)}…`} · <b id="gt"></b></div>
      <div class="g-log">${s.words.map((w) => `<div class="${w.by === c.me ? 'me' : 'op'}">${esc(w.w)}</div>`).reverse().join('') || '<div class="muted">Поки порожньо</div>'}</div>
      ${myTurn ? '<div class="row"><input id="gi" autocapitalize="none" autocomplete="off"><button class="btn sm" id="gb">OK</button></div>' : ''}
      ${!s.winner && last && last.by !== c.me && myTurn ? '<button class="link" id="gc">Такого слова немає!</button>' : ''}`;
    const iv = setInterval(() => { const el = root.querySelector('#gt'); if (!el || !root.isConnected) return clearInterval(iv); const left = Math.ceil((s.deadline - Date.now()) / 1000); el.textContent = left > 0 ? `${left} с` : '⏰'; if (left <= 0 && !s.winner) { clearInterval(iv); c.act((st) => { if (!st.winner && Date.now() > st.deadline) st.winner = st.turn === c.me ? c.op : c.me; }); } }, 300);
    const gi = root.querySelector('#gi');
    const send = () => {
      const w = gi.value.trim().toLowerCase(); if (!/^[а-яіїєґ']{2,}$/.test(w) || w[0] !== s.need) return gi.classList.add('bad');
      if (s.words.some((x) => x.w === w)) { gi.value = ''; gi.placeholder = 'Вже було!'; return; }
      c.act((st) => { st.words.push({ w, by: c.me }); st.need = lastLetter(w); st.turn = c.op; st.deadline = Date.now() + 15000; });
    };
    if (gi) { gi.focus(); gi.onkeydown = (e) => e.key === 'Enter' && send(); root.querySelector('#gb').onclick = send; }
    const gc = root.querySelector('#gc'); if (gc) gc.onclick = () => c.act((st) => { st.winner = c.me; st.note = `«${last.w}» оскаржено`; });
  },
  result: (s) => (s.winner ? { done: true, winner: s.winner } : { done: false }),
};

const truth = {
  name: 'Правда чи вигадка', icon: '🤥', desc: 'Напиши про себе 2 правди й 1 вигадку. Потім угадай вигадку партнера.', kind: 'turn', live: false,
  init: () => ({ st: {}, guess: {} }),
  view: (root, c) => {
    const s = c.state, mine = s.st?.[c.me], his = s.st?.[c.op], g = s.guess?.[c.me];
    if (!mine) {
      root.innerHTML = `<div class="g-hint">Напиши 3 твердження про себе і познач, яке з них — вигадка</div>${[0, 1, 2].map((i) => `<div class="row"><input id="t${i}" placeholder="Твердження ${i + 1}"><label class="lie"><input type="radio" name="lie" value="${i}"> вигадка</label></div>`).join('')}<button class="btn" id="gb">Готово</button>`;
      root.querySelector('#gb').onclick = () => {
        const list = [0, 1, 2].map((i) => root.querySelector('#t' + i).value.trim()), lie = root.querySelector('input[name=lie]:checked');
        if (list.some((x) => !x) || !lie) return alertBad(root);
        c.act((st) => { st.st = st.st || {}; st.st[c.me] = { list, lie: +lie.value }; });
      };
      return;
    }
    if (!his) { root.innerHTML = `<div class="g-hint">Чекаємо, поки ${esc(c.opName)} напише свої твердження…</div>`; return; }
    if (g === undefined) {
      root.innerHTML = `<div class="g-hint">Що з цього вигадка ${esc(c.opName)}?</div><div class="g-opts one">${his.list.map((t, i) => `<button class="opt" data-i="${i}">${esc(t)}</button>`).join('')}</div>`;
      root.querySelectorAll('.opt').forEach((b) => (b.onclick = () => c.act((st) => { st.guess = st.guess || {}; st.guess[c.me] = +b.dataset.i; })));
      return;
    }
    root.innerHTML = `<div class="g-hint">${g === his.lie ? '✅ Ти вгадав(ла) вигадку!' : `❌ Вигадка була: «${esc(his.list[his.lie])}»`}</div><div class="muted small">Чекаємо на відповідь ${esc(c.opName)}…</div>`;
  },
  result: (s, a, b) => {
    if (s.guess?.[a] === undefined || s.guess?.[b] === undefined) return { done: false };
    const ra = s.guess[a] === s.st[b].lie, rb = s.guess[b] === s.st[a].lie;
    return { done: true, winner: ra === rb ? null : ra ? a : b };
  },
};
function alertBad(root) { root.querySelector('.g-hint')?.classList.add('bad'); }

const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const ttt = {
  name: 'Хрестики-нулики «Кіт проти миші»', icon: '❌', desc: 'Кіт 🐱 проти миші 🐭. Грає до 3 перемог (не більше 7 партій).', kind: 'turn', live: true,
  init: (rng, a, b) => ({ board: Array(9).fill(''), first: a, turn: a, round: 1, wins: { [a]: 0, [b]: 0 }, mark: { [a]: '🐱', [b]: '🐭' }, winner: null, over: false, last: Date.now() }),
  view: (root, c) => {
    const s = c.state, my = s.turn === c.me && !s.over;
    root.innerHTML = `<div class="g-hint">Партія ${s.round} · ${s.mark[c.me]} ти ${s.wins[c.me]} : ${s.wins[c.op]} ${esc(c.opName)} ${s.mark[c.op]}<br>${s.over ? '' : my ? 'Твій хід' : 'Хід суперника…'}</div><div class="g-ttt">${s.board.map((v, i) => `<button data-i="${i}" ${v || !my ? 'disabled' : ''}>${v}</button>`).join('')}</div>${stall(c)}`;
    root.querySelectorAll('.g-ttt button').forEach((b) => (b.onclick = () => c.act((st) => {
      const i = +b.dataset.i; if (st.board[i] || st.turn !== c.me || st.over) return;
      st.board[i] = st.mark[c.me]; st.last = Date.now();
      const won = LINES.some((l) => l.every((k) => st.board[k] === st.mark[c.me]));
      if (won || st.board.every(Boolean)) {
        if (won) st.wins[c.me]++;
        const done = st.wins[c.me] >= 3 || st.round >= 7;
        if (done) { st.over = true; st.winner = st.wins[c.me] === st.wins[c.op] ? 'draw' : st.wins[c.me] > st.wins[c.op] ? c.me : c.op; }
        else { st.round++; st.board = Array(9).fill(''); st.first = st.first === c.me ? c.op : c.me; st.turn = st.first; }
      } else st.turn = c.op;
    })));
    bindStall(root, c);
  },
  result: (s) => (s.over ? { done: true, winner: s.winner === 'draw' ? null : s.winner } : { done: false }),
};

const c4 = {
  name: '4 в ряд', icon: '🔴', desc: 'По черзі кидайте фішки. Хто перший збере 4 в ряд (по горизонталі, вертикалі чи діагоналі).', kind: 'turn', live: true,
  init: (rng, a, b) => ({ g: Array(42).fill(0), turn: a, p: { [a]: 1, [b]: 2 }, winner: null, over: false, last: Date.now() }),
  view: (root, c) => {
    const s = c.state, my = s.turn === c.me && !s.over, chip = ['', '🔴', '🟡'];
    root.innerHTML = `<div class="g-hint">Ти ${chip[s.p[c.me]]} · ${esc(c.opName)} ${chip[s.p[c.op]]} · ${s.over ? '' : my ? 'Твій хід' : 'Хід суперника…'}</div><div class="g-c4">${s.g.map((v, i) => `<button data-c="${i % 7}" ${my ? '' : 'disabled'}>${chip[v] || ''}</button>`).join('')}</div>${stall(c)}`;
    root.querySelectorAll('.g-c4 button').forEach((b) => (b.onclick = () => c.act((st) => {
      if (st.turn !== c.me || st.over) return; const col = +b.dataset.c; let row = -1;
      for (let r = 5; r >= 0; r--) if (!st.g[r * 7 + col]) { row = r; break; } if (row < 0) return;
      const v = st.p[c.me]; st.g[row * 7 + col] = v; st.last = Date.now();
      const at = (r, q) => (r >= 0 && r < 6 && q >= 0 && q < 7 ? st.g[r * 7 + q] : 0);
      const win = [[0, 1], [1, 0], [1, 1], [1, -1]].some(([dr, dq]) => { let n = 1; for (const sg of [1, -1]) { let r = row + dr * sg, q = col + dq * sg; while (at(r, q) === v) { n++; r += dr * sg; q += dq * sg; } } return n >= 4; });
      if (win) { st.over = true; st.winner = c.me; } else if (st.g.every(Boolean)) { st.over = true; st.winner = 'draw'; } else st.turn = c.op;
    })));
    bindStall(root, c);
  },
  result: (s) => (s.over ? { done: true, winner: s.winner === 'draw' ? null : s.winner } : { done: false }),
};

const SHIPS = [3, 2, 2, 1, 1];
function placeShips(rng) {
  for (;;) {
    const occ = new Set(), cells = [];
    const ok = SHIPS.every((len) => {
      for (let t = 0; t < 200; t++) {
        const hz = rng() < 0.5, r = Math.floor(rng() * (hz ? 6 : 7 - len)), q = Math.floor(rng() * (hz ? 7 - len : 6));
        const cs = Array.from({ length: len }, (_, k) => (r + (hz ? 0 : k)) * 6 + q + (hz ? k : 0));
        const near = (i) => { const rr = Math.floor(i / 6), qq = i % 6; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const x = rr + a, y = qq + b; if (x >= 0 && x < 6 && y >= 0 && y < 6 && occ.has(x * 6 + y)) return true; } return false; };
        if (cs.every((i) => !near(i))) { cs.forEach((i) => occ.add(i)); cells.push(...cs); return true; }
      }
      return false;
    });
    if (ok) return cells;
  }
}
const sea = {
  name: 'Морський бій «Рибки»', icon: '🐟', desc: 'Поле 6×6, рибки: 3, 2, 2, 1, 1 клітинки. Влучив — стріляєш ще. Хто першим зловить усіх рибок.', kind: 'turn', live: true,
  init: (rng, a, b) => ({ ships: {}, shots: { [a]: [], [b]: [] }, ready: {}, turn: a, winner: null, over: false, last: Date.now() }),
  view: (root, c) => {
    const s = c.state;
    if (!s.ready?.[c.me]) {
      c.tmp = c.tmp || placeShips(Math.random);
      root.innerHTML = `<div class="g-hint">Твої рибки розставлені. Можна перемішати.</div>${grid6((i) => (c.tmp.includes(i) ? '🐟' : ''), false)}<div class="row"><button class="btn ghost sm" id="gr">Перемішати</button><button class="btn sm" id="gb">Готово</button></div>`;
      root.querySelector('#gr').onclick = () => { c.tmp = placeShips(Math.random); truthy(c); };
      root.querySelector('#gb').onclick = () => { const cells = c.tmp; c.act((st) => { st.ships = st.ships || {}; st.ships[c.me] = cells; st.ready = st.ready || {}; st.ready[c.me] = true; st.last = Date.now(); }); };
      return;
    }
    if (!s.ready?.[c.op]) { root.innerHTML = `<div class="g-hint">Чекаємо, поки ${esc(c.opName)} розставить рибок…</div>`; return; }
    const my = s.turn === c.me && !s.over, mySh = s.shots[c.me] || [], opSh = s.shots[c.op] || [], opShips = s.ships[c.op], myShips = s.ships[c.me];
    const hits = mySh.filter((i) => opShips.includes(i)).length, total = SHIPS.reduce((a, b) => a + b, 0);
    root.innerHTML = `<div class="g-hint">${s.over ? '' : my ? 'Твій постріл!' : 'Стріляє суперник…'} · спіймано ${hits}/${total}</div>
      <div class="muted small">Поле суперника</div>${grid6((i) => (mySh.includes(i) ? (opShips.includes(i) ? '🎣' : '·') : ''), my, 'tgt')}
      <div class="muted small">Твоє поле</div>${grid6((i) => (opSh.includes(i) ? (myShips.includes(i) ? '💥' : '·') : myShips.includes(i) ? '🐟' : ''), false, 'own')}${stall(c)}`;
    root.querySelectorAll('.tgt button').forEach((b) => (b.onclick = () => c.act((st) => {
      const i = +b.dataset.i, sh = st.shots[c.me]; if (st.turn !== c.me || st.over || sh.includes(i)) return; sh.push(i); st.last = Date.now();
      const hit = st.ships[c.op].includes(i);
      if (st.ships[c.op].every((k) => sh.includes(k))) { st.over = true; st.winner = c.me; } else if (!hit) st.turn = c.op;
    })));
    bindStall(root, c);
  },
  result: (s) => (s.over ? { done: true, winner: s.winner } : { done: false }),
};
function truthy(c) { c.rerender?.(); }
const grid6 = (cell, clickable, cls = '') => `<div class="g-sea ${cls}">${Array.from({ length: 36 }, (_, i) => `<button data-i="${i}" ${clickable && !cell(i) ? '' : 'disabled'}>${cell(i)}</button>`).join('')}</div>`;
// Якщо суперник довго не ходить — можна забрати перемогу
const stall = (c) => (!c.state.over && c.state.turn === c.op && Date.now() - (c.state.last || Date.now()) > 90000 ? '<button class="link" id="gstall">Суперник не відповідає 90 с — забрати перемогу</button>' : '');
const bindStall = (root, c) => { const b = root.querySelector('#gstall'); if (b) b.onclick = () => c.act((st) => { if (st.turn === c.op && Date.now() - st.last > 90000) { st.over = true; st.winner = c.me; } }); };

export const GAMES = { reaction, mice, yarn, clock, rhythm, memory, simon, findcat, stroop, math, slide, maze, guess, anagram, chain, letters, blitz, truth, ttt, c4, sea };
export const GAME_IDS = Object.keys(GAMES);
