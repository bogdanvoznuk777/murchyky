// ===== Живий інтерфейс: конфеті, урочисті сцени (новий ранг, перемога в сезоні) =====
// Лише transform/opacity — легко для телефона. Зменшення руху на iPhone конфеті не вимикає (так задумано: це коротке свято).
const COLORS = ['#ff5c9a', '#ff8fbb', '#ffd34d', '#7ad3ff', '#b38cff', '#7cc46a', '#fff'];
const rnd = (a, b) => a + Math.random() * (b - a);
let layer = null;

// Конфеті: n шматочків вилітають угору й падають; через 3,2 с прибираються
export function confetti(n = 70) {
  if (!layer || !layer.isConnected) { layer = document.createElement('div'); layer.className = 'fx-conf'; document.body.appendChild(layer); }
  const kids = [];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i'), heart = i % 7 === 0;
    if (heart) { p.className = 'h'; p.textContent = '❤'; }
    p.style.cssText = `left:${rnd(5, 95).toFixed(1)}%;--dx:${rnd(-120, 120).toFixed(0)}px;--up:${rnd(-62, -32).toFixed(0)}vh;--r:${rnd(-720, 720).toFixed(0)}deg;--d:${rnd(2, 2.9).toFixed(2)}s;animation-delay:${rnd(0, 0.25).toFixed(2)}s;${heart ? `color:${COLORS[i % 2]}` : `background:${COLORS[i % COLORS.length]}`}`;
    kids.push(p);
  }
  layer.append(...kids);
  setTimeout(() => kids.forEach((k) => k.remove()), 3400);
  try { navigator.vibrate?.([30, 40, 30]); } catch { /* */ }
}

// Урочиста сцена поверх гри (черга, якщо їх кілька)
const queue = [];
let open = false;
export function scene({ icon, title, text, art = '', btn = 'Мур! 💕' }) {
  queue.push({ icon, title, text, art, btn });
  if (!open) next();
}
function next() {
  const s = queue.shift(); if (!s) { open = false; return; }
  open = true;
  const el = document.createElement('div');
  el.className = 'fx-scene';
  el.innerHTML = `<div class="fx-card"><div class="fx-rays"></div><div class="fx-icon">${s.icon}</div><h2>${s.title}</h2>${s.art ? `<div class="fx-art">${s.art}</div>` : ''}<p>${s.text}</p><button class="btn" type="button">${s.btn}</button></div>`;
  document.body.appendChild(el);
  confetti(90);
  const close = () => { el.classList.add('out'); setTimeout(() => { el.remove(); next(); }, 260); };
  el.querySelector('button').addEventListener('click', close, { once: true });
}

// Свято один раз на ключ (наприклад, перемога в конкретній дуелі): елемент <i data-celebrate="ключ" hidden>
const SEEN_KEY = 'fxSeen';
function seen() { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch { return []; } }
export function once(key, fn) {
  const s = seen(); if (s.includes(key)) return false;
  s.push(key); try { localStorage.setItem(SEEN_KEY, JSON.stringify(s.slice(-300))); } catch { /* */ }
  fn(); return true;
}
export function watch(root) {
  // лише зміна вмісту екрана (не кожна анімація всередині)
  new MutationObserver(() => { for (const m of root.querySelectorAll('[data-celebrate]')) once(m.dataset.celebrate, () => confetti()); }).observe(root, { childList: true });
}
