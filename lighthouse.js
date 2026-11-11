// ===== Розділ 2 «Маяк»: один іде темним лабіринтом з ліхтариком, інший бачить мапу, пастки й керує важелями =====
// Кожен телефон відповідає за своє: «мандрівник» — за свій рух і пастки, «штурман» — за двері.
// Пастки рахуються від спільного серверного часу, тому їх не треба пересилати мережею.
import * as T from './three-lite.js';

const LAMP = 7, SPEED = 2.6, R = 0.27, SEND_MS = 100, TRAP_P = 2400, PING_MS = 4500;
const DOOR_COL = { 1: 0x9b6bff, 2: 0x2bb5a8, 3: 0xffa63d, 4: 0x4aa8ff };
const DOOR_EMO = { 1: '🟣', 2: '🟢', 3: '🟠', 4: '🔵' };
export const trapOn = (c, ms) => { const ph = Math.floor(((ms % TRAP_P) + TRAP_P) % TRAP_P / (TRAP_P / 2)); return c === '^' ? ph === 1 : ph === 0; };

export function startLight(ctx) {
  const { holder, ctlEl, grid, levers, role } = ctx;
  const walker = role === 'walker';
  const H = grid.length, W = grid[0].length;
  const cell = (x, y) => (y < 0 || y >= H || x < 0 || x >= W ? '#' : grid[y][x]);
  const cx = (x) => x - W / 2 + 0.5, cz = (y) => y - H / 2 + 0.5, toCell = (v, n) => Math.floor(v + n / 2);
  const lvMask = levers.map((s) => [...s].reduce((m, d) => m | (1 << (+d - 1)), 0));
  let start = [1, 1], goal = [1, 1], fishC = null; const traps = [], doors = [];
  grid.forEach((r, y) => [...r].forEach((c, x) => {
    if (c === 'S') start = [x, y]; else if (c === 'G') goal = [x, y]; else if (c === 'F') fishC = [x, y];
    else if (c === '^' || c === 'v') traps.push([x, y, c]); else if (/[1-9]/.test(c)) doors.push([x, y, +c]);
  }));

  // ---------- стан ----------
  const st = { x: cx(start[0]), z: cz(start[1]), h: 0, cp: [...start], fish: 0, falls: 0, won: false, hitT: 0, mask: 0 };
  let joy = { x: 0, z: 0 }, paused = true, stopped = false, remote = null, disp = { x: st.x, z: st.z, h: 0 }, lastSent = 0, sentPos = '', lastW = '';
  const pings = [];

  // ---------- 3D ----------
  const canvas = document.createElement('canvas'); canvas.className = 'box3d'; holder.appendChild(canvas);
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene();
  const BG = walker ? 0x0d0816 : 0x1a1230;
  scene.background = new T.Color(BG);
  if (walker) scene.fog = new T.Fog(BG, 6.4, 10); // туман рахується від камери (~6 од. від котика)
  const lam = (c, o = {}) => new T.MeshLambertMaterial({ color: c, ...o });
  const glow = (c, o = {}) => new T.MeshBasicMaterial({ color: c, fog: false, ...o });
  if (walker) { scene.add(new T.HemisphereLight(0x6655aa, 0x110818, 0.55)); }
  else { scene.add(new T.HemisphereLight(0xffffff, 0x9988cc, 1.7)); const d = new T.DirectionalLight(0xffffff, 1); d.position.set(-2, 10, 4); scene.add(d); }

  const floor = new T.Mesh(new T.BoxGeometry(W, 0.2, H), lam(walker ? 0xa898bf : 0x3e3060)); floor.position.y = -0.1; scene.add(floor);
  const walls = []; grid.forEach((r, y) => [...r].forEach((c, x) => { if (c === '#') walls.push([x, y]); }));
  const wm = new T.InstancedMesh(new T.BoxGeometry(1, 0.9, 1), lam(walker ? 0x4a3a6e : 0x8c74c9), walls.length);
  const o3 = new T.Object3D();
  walls.forEach(([x, y], i) => { o3.position.set(cx(x), 0.45, cz(y)); o3.updateMatrix(); wm.setMatrixAt(i, o3.matrix); });
  scene.add(wm);
  // двері
  const doorM = doors.map(([x, y, d]) => { const m = new T.Mesh(new T.BoxGeometry(0.96, 0.9, 0.96), lam(DOOR_COL[d], { transparent: true, opacity: 0.9 })); m.position.set(cx(x), 0.45, cz(y)); m.userData.d = d; scene.add(m); return m; });
  // пастки — бачить лише штурман
  const trapM = walker ? [] : traps.map(([x, y, c]) => {
    const g = new T.Group(); g.position.set(cx(x), 0, cz(y));
    const base = new T.Mesh(new T.BoxGeometry(0.86, 0.04, 0.86), new T.MeshBasicMaterial({ color: 0x552233 })); base.position.y = 0.02; g.add(base);
    const sp = new T.Group(); [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22], [0, 0]].forEach(([a, b]) => { const k = new T.Mesh(new T.ConeGeometry(0.11, 0.42, 6), lam(0xff3355)); k.position.set(a, 0.21, b); sp.add(k); });
    g.add(sp); g.userData = { c, sp, base }; scene.add(g); return g;
  });
  // рибка
  let fishM = null;
  if (fishC) {
    fishM = new T.Group();
    const b = new T.Mesh(new T.SphereGeometry(0.2, 14, 10), walker ? lam(0xff9a3c) : glow(0xffa64d)); b.scale.set(1.4, 0.8, 0.7); fishM.add(b);
    const t = new T.Mesh(new T.ConeGeometry(0.14, 0.22, 3), walker ? lam(0xff9a3c) : glow(0xffa64d)); t.rotation.z = Math.PI / 2; t.position.x = -0.36; fishM.add(t);
    fishM.position.set(cx(fishC[0]), 0.4, cz(fishC[1])); scene.add(fishM);
  }
  // маяк (мета): верхній вогник видно здалеку навіть у темряві
  const tower = new T.Group(); tower.position.set(cx(goal[0]), 0, cz(goal[1]));
  [0, 1, 2].forEach((i) => { const s = new T.Mesh(new T.CylinderGeometry(0.3 - i * 0.05, 0.34 - i * 0.05, 0.4, 16), lam(i % 2 ? 0xffffff : 0xff4d6d)); s.position.y = 0.2 + i * 0.4; tower.add(s); });
  const lamp = new T.Mesh(new T.SphereGeometry(0.2, 14, 10), glow(0xffe28a)); lamp.position.y = 1.4; tower.add(lamp);
  scene.add(tower);
  if (walker) { const tl = new T.PointLight(0xffd38a, 10, 3.2, 1.2); tl.position.set(0, 1.4, 0); tower.add(tl); }
  // котик
  function makeCat() {
    const g = new T.Group(), fur = lam(0x8fa3bf), dark = lam(0x5d6f8a);
    const body = new T.Mesh(new T.CapsuleGeometry(0.17, 0.3, 4, 10), fur); body.rotation.x = Math.PI / 2; body.position.y = 0.28; g.add(body);
    const head = new T.Mesh(new T.SphereGeometry(0.17, 14, 12), fur); head.position.set(0, 0.47, -0.27); g.add(head);
    [-1, 1].forEach((s) => { const e = new T.Mesh(new T.ConeGeometry(0.07, 0.1, 4), dark); e.position.set(s * 0.09, 0.6, -0.25); e.rotation.set(-0.9, 0, s * 0.3); g.add(e); });
    [-1, 1].forEach((s) => { const e = new T.Mesh(new T.SphereGeometry(0.03, 6, 6), glow(0x2b2b2b)); e.position.set(s * 0.06, 0.5, -0.42); g.add(e); });
    const tail = new T.Mesh(new T.CylinderGeometry(0.035, 0.05, 0.42, 6), dark); tail.position.set(0, 0.42, 0.33); tail.rotation.x = -0.7; g.add(tail);
    const lant = new T.Mesh(new T.SphereGeometry(0.07, 10, 8), glow(0xffd36b)); lant.position.set(0.16, 0.36, -0.36); g.add(lant);
    return g;
  }
  // стрілка до підказки штурмана, якщо вона за межами екрана
  const arrow = walker ? Object.assign(document.createElement('div'), { className: 'ping-arrow', innerHTML: '<span><svg width="38" height="30" viewBox="0 0 38 30"><path d="M2 9 H22 V2 L37 15 L22 28 V21 H2 Z" fill="#7ee7ff" stroke="#fff" stroke-width="2"/></svg></span>' }) : null;
  if (arrow) holder.appendChild(arrow);
  const cat = makeCat(); scene.add(cat); if (!walker) cat.scale.setScalar(1.5);
  let light = null;
  if (walker) { light = new T.PointLight(0xffe2a8, LAMP, 4.4, 1.4); light.position.set(0, 1.4, -1.1); cat.add(light); }
  const reach = walker ? null : new T.Mesh(new T.CircleGeometry(2.4, 32), new T.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.13 }));
  if (reach) { reach.rotation.x = -Math.PI / 2; reach.position.y = 0.03; scene.add(reach); }

  // камера
  const cam = walker ? new T.PerspectiveCamera(50, 1, 0.1, 50) : new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
  function fit() {
    const w = holder.clientWidth || 360, h = holder.clientHeight || 420; renderer.setSize(w, h, false);
    if (walker) { cam.aspect = w / h; cam.updateProjectionMatrix(); return; }
    const a = w / h, hw = Math.max(W / 2 + 0.3, ((H / 2 + 0.3) * a)), hh = hw / a;
    cam.left = -hw; cam.right = hw; cam.top = hh; cam.bottom = -hh; cam.up.set(0, 0, -1); cam.position.set(0, 20, 0); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
  }
  fit(); const ro = new ResizeObserver(fit); ro.observe(holder);

  // ---------- рух мандрівника ----------
  const myCell = () => [toCell(st.x, W), toCell(st.z, H)];
  const solid = (x, y) => { const c = cell(x, y); if (c === '#') return true; if (/[1-9]/.test(c) && !(st.mask & (1 << (+c - 1)))) { const [mx, my] = myCell(); return !(mx === x && my === y); } return false; };
  function collide() {
    const gx = toCell(st.x, W), gy = toCell(st.z, H);
    for (let y = gy - 1; y <= gy + 1; y++) for (let x = gx - 1; x <= gx + 1; x++) {
      if (!solid(x, y)) continue;
      const minx = cx(x) - 0.5, minz = cz(y) - 0.5, px = Math.max(minx, Math.min(st.x, minx + 1)), pz = Math.max(minz, Math.min(st.z, minz + 1));
      const dx = st.x - px, dz = st.z - pz, d2 = dx * dx + dz * dz; if (d2 >= R * R) continue;
      const d = Math.sqrt(d2) || 1e-6; st.x = px + (dx / d) * R; st.z = pz + (dz / d) * R;
    }
  }
  function step(dt, nowMs) {
    if (st.hitT) { if (performance.now() - st.hitT > 700) { st.hitT = 0; st.x = cx(st.cp[0]); st.z = cz(st.cp[1]); } return; }
    const m = Math.hypot(joy.x, joy.z); if (m > 0.05) st.h = Math.atan2(-joy.x, -joy.z);
    // дрібні кроки, щоб не «проскочити» крізь стіну
    const n = 3; for (let i = 0; i < n; i++) { st.x += (joy.x * SPEED * dt) / n; st.z += (joy.z * SPEED * dt) / n; collide(); }
    const [gx, gy] = myCell(), c = cell(gx, gy), dc = Math.hypot(st.x - cx(gx), st.z - cz(gy));
    if ((c === '^' || c === 'v') && dc < 0.38 && trapOn(c, nowMs - ctx.at)) { st.hitT = performance.now(); st.falls++; ctx.onFall?.(); pushW(); }
    else if (/[1-9]/.test(c) || c === 'S') { if (dc < 0.3 && (st.cp[0] !== gx || st.cp[1] !== gy)) st.cp = [gx, gy]; }
    if (c === 'F' && dc < 0.45 && !st.fish) { st.fish = 1; ctx.onFish?.(); pushW(); }
    if (c === 'G' && dc < 0.4 && !st.won) { st.won = true; pushW(); ctx.onWin?.({ fish: st.fish, falls: st.falls }); }
  }
  function pushW() { const w = `${st.fish}|${st.falls}|${st.won ? 1 : 0}|${st.hitT ? 1 : 0}`; if (w !== lastW) { lastW = w; ctx.send('w', w); } }
  function applyW(w) { if (!w) return; const [f, falls, won, hit] = w.split('|'); st.fish = +f; st.falls = +falls; st.won = won === '1'; if (hit === '1' && !st.hitT) { st.hitT = performance.now(); ctx.onFall?.(); } if (hit === '0') st.hitT = 0; }
  function applyMask(m) { st.mask = +m || 0; paintLevers(); }

  // ---------- керування ----------
  const offs = [];
  const on = (el, ev, f, o) => { el.addEventListener(ev, f, o); offs.push(() => el.removeEventListener(ev, f, o)); };
  function paintLevers() {
    if (walker) return;
    ctlEl.querySelectorAll('[data-lv]').forEach((b) => {
      const m = lvMask[+b.dataset.lv]; b.classList.toggle('on', (st.mask & m) === m && m > 0);
    });
    const ds = [...new Set(doors.map((d) => d[2]))].sort();
    const el = ctlEl.querySelector('.lv-doors'); if (el) el.innerHTML = ds.map((d) => `${DOOR_EMO[d]} ${st.mask & (1 << (d - 1)) ? 'відчинено' : 'зачинено'}`).join(' · ');
  }
  if (walker) {
    ctlEl.innerHTML = `<div class="g-lab">🏮 Ти — <b>мандрівник</b>. Довкола темно, а пастки ти не бачиш! Слухай штурмана.</div>
      <div class="joy-row"><div class="joy" id="ljoy"><div class="joy-k" id="ljk"></div></div><button class="btn ghost meow" id="lmeow">Мяу! 🐾</button></div>`;
    const base = ctlEl.querySelector('#ljoy'), k = ctlEl.querySelector('#ljk'); let pid = null;
    const set = (e) => { const r = base.getBoundingClientRect(), rad = r.width / 2; let dx = e.clientX - (r.left + rad), dz = e.clientY - (r.top + rad); const d = Math.hypot(dx, dz), mx = rad * 0.75; if (d > mx) { dx *= mx / d; dz *= mx / d; } joy = { x: dx / mx, z: dz / mx }; k.style.transform = `translate(${dx}px,${dz}px)`; };
    const end = (e) => { if (e.pointerId !== pid) return; pid = null; joy = { x: 0, z: 0 }; k.style.transform = ''; };
    on(base, 'pointerdown', (e) => { pid = e.pointerId; base.setPointerCapture(pid); set(e); });
    on(base, 'pointermove', (e) => { if (e.pointerId === pid) set(e); });
    on(base, 'pointerup', end); on(base, 'pointercancel', end);
    let mn = 0; on(ctlEl.querySelector('#lmeow'), 'click', () => { if (Date.now() - mn < 1500) return; mn = Date.now(); ctx.send('mw', Math.round(ctx.now())); });
    const keys = {}; const kb = () => { joy = { x: (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0), z: (keys.ArrowDown ? 1 : 0) - (keys.ArrowUp ? 1 : 0) }; };
    on(window, 'keydown', (e) => { if (e.key.startsWith('Arrow')) { keys[e.key] = 1; kb(); } }); on(window, 'keyup', (e) => { if (e.key.startsWith('Arrow')) { keys[e.key] = 0; kb(); } });
  } else {
    ctlEl.innerHTML = `<div class="g-lab">🗺 Ти — <b>штурман</b>: бачиш мапу й пастки 🔺. Важелі відчиняють/зачиняють двері — з'ясуй, які. Торкнись мапи, щоб засвітити підказку.</div>
      <div class="lv-row">${levers.map((_, i) => `<button class="lv" data-lv="${i}">Важіль ${i + 1}</button>`).join('')}</div><div class="lv-doors muted small"></div>`;
    ctlEl.querySelectorAll('[data-lv]').forEach((b) => on(b, 'click', () => {
      if (paused) return; st.mask ^= lvMask[+b.dataset.lv]; ctx.send('dr', st.mask); paintLevers(); navigator.vibrate?.(15);
    }));
    let pn = 0;
    on(canvas, 'pointerdown', (e) => {
      if (paused || Date.now() - pn < 600) return; pn = Date.now();
      const r = canvas.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * 2 - 1, y = ((e.clientY - r.top) / r.height) * 2 - 1;
      const wx = x * cam.right, wz = y * cam.top;
      if (Math.abs(wx) > W / 2 || Math.abs(wz) > H / 2) return;
      const p = { x: +wx.toFixed(2), z: +wz.toFixed(2), n: Math.round(ctx.now()) }; ctx.send('pg', p); addPing(p);
    });
    paintLevers();
  }
  function addPing(p) {
    if (!p || pings.some((q) => q.n === p.n) || ctx.now() - p.n > PING_MS) return;
    const g = new T.Group(); g.position.set(p.x, 0, p.z);
    const col = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, walker ? 4 : 0.2, 12, 1, true), glow(0x7ee7ff, { transparent: true, opacity: 0.55, side: T.DoubleSide })); col.position.y = walker ? 2 : 0.1; g.add(col);
    const ring = new T.Mesh(new T.RingGeometry(0.25, 0.4, 24), glow(0x7ee7ff, { transparent: true, opacity: 0.8, side: T.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring);
    scene.add(g); pings.push({ n: p.n, g, t0: performance.now() });
  }

  // ---------- мережа ----------
  const unsub = [];
  if (walker) { unsub.push(ctx.listen('dr', applyMask), ctx.listen('pg', addPing)); }
  else {
    unsub.push(ctx.listen('pos', (v) => { if (!v) return; const [x, z, h] = v.split(',').map(Number); if (![x, z, h].some(isNaN)) remote = { x, z, h, t: performance.now() }; }));
    unsub.push(ctx.listen('w', applyW));
    let lastMw = 0; unsub.push(ctx.listen('mw', (n) => { if (n && n !== lastMw) { if (ctx.now() - n < 5000) ctx.flash?.('🐱 Мяу! Мандрівник кличе'); lastMw = n; } }));
  }

  // ---------- кадр ----------
  let raf = 0, last = performance.now(), slow = 0;
  function frame(t) {
    if (stopped) return; raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    slow = slow * 0.98 + (dt > 0.035 ? 0.02 : 0); if (slow > 0.6 && renderer.getPixelRatio() > 1) { renderer.setPixelRatio(1); fit(); slow = 0; }
    const nowMs = ctx.now();
    if (walker && !paused && !st.won) {
      step(dt, nowMs);
      if (t - lastSent >= SEND_MS) { const s = `${st.x.toFixed(2)},${st.z.toFixed(2)},${st.h.toFixed(1)}`; if (s !== sentPos) { sentPos = s; lastSent = t; ctx.send('pos', s); } }
    }
    let tx = st.x, tz = st.z, th = st.h;
    if (!walker && remote) { tx = remote.x; tz = remote.z; th = remote.h; }
    const k = walker ? 1 : 1 - Math.exp(-dt * 14);
    const moved = Math.hypot(tx - disp.x, tz - disp.z);
    if (!walker && moved > 2) { disp.x = tx; disp.z = tz; }
    disp.x += (tx - disp.x) * k; disp.z += (tz - disp.z) * k;
    let dh = th - disp.h; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI; disp.h += dh * Math.min(1, dt * 12);
    const hit = st.hitT ? Math.min(1, (performance.now() - st.hitT) / 300) : 0;
    const walking = walker ? Math.hypot(joy.x, joy.z) > 0.05 : moved > 0.01;
    cat.position.set(disp.x, walking ? Math.abs(Math.sin(t / 110)) * 0.05 : 0, disp.z); cat.rotation.y = disp.h;
    cat.visible = !(st.hitT && Math.floor(t / 90) % 2);
    if (reach) reach.position.set(disp.x, 0.03, disp.z);
    if (light) light.intensity = hit ? LAMP * 0.25 : LAMP;
    if (walker) { cam.position.set(disp.x, 5.2, disp.z + 3.0); cam.lookAt(disp.x, 0, disp.z + 0.2); }
    // двері, пастки, рибка, підказки
    doorM.forEach((m) => { const open = st.mask & (1 << (m.userData.d - 1)); const s = open ? 0.05 : 1; m.scale.y += (s - m.scale.y) * 0.2; m.position.y = 0.45 * m.scale.y; });
    trapM.forEach((g) => { const a = trapOn(g.userData.c, nowMs - ctx.at); g.userData.sp.scale.y += ((a ? 1 : 0.12) - g.userData.sp.scale.y) * 0.3; g.userData.base.material.color.setHex(a ? 0xff2a55 : 0x4a2a44); });
    if (fishM) { fishM.visible = !st.fish; fishM.rotation.y = t / 600; fishM.position.y = 0.4 + Math.sin(t / 300) * 0.05; }
    lamp.scale.setScalar(1 + Math.sin(t / 300) * 0.15);
    for (let i = pings.length - 1; i >= 0; i--) {
      const p = pings[i], age = performance.now() - p.t0;
      if (age > PING_MS) { scene.remove(p.g); p.g.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); }); pings.splice(i, 1); continue; }
      p.g.children[1].scale.setScalar(1 + ((age / 600) % 1) * 0.8); p.g.children.forEach((c) => (c.material.opacity = 0.7 * (1 - age / PING_MS)));
    }
    if (arrow) {
      const p = pings[pings.length - 1];
      const dx = p ? p.g.position.x - disp.x : 0, dz = p ? p.g.position.z - disp.z : 0;
      if (p && Math.hypot(dx, dz) > 2.2) { const a = Math.atan2(dz, dx); arrow.style.display = 'block'; arrow.style.transform = `translate(-50%,-50%) rotate(${a}rad) translateX(min(38vw, 30vh))`; }
      else arrow.style.display = 'none';
    }
    renderer.render(scene, cam);
  }
  raf = requestAnimationFrame(frame);
  const onLost = (e) => { e.preventDefault(); cancelAnimationFrame(raf); };
  const onRest = () => { last = performance.now(); raf = requestAnimationFrame(frame); };
  canvas.addEventListener('webglcontextlost', onLost); canvas.addEventListener('webglcontextrestored', onRest);

  return {
    pause(p) { paused = p; if (p) joy = { x: 0, z: 0 }; },
    state: () => ({ ...st }),
    // для тестів і перезаходу
    setInput(x, z) { joy = { x, z }; },
    info: () => ({ at: ctx.at, now: ctx.now(), role }),
    pressLever(i) { ctlEl.querySelector(`[data-lv="${i}"]`)?.click(); },
    restore(pos, w, dr) {
      if (dr != null) applyMask(dr);
      if (walker) { if (w) { applyW(w); st.hitT = 0; lastW = ''; } const [x, z] = (pos || '').split(',').map(Number); if (!isNaN(x) && !isNaN(z) && cell(toCell(x, W), toCell(z, H)) !== '#') { st.x = disp.x = x; st.z = disp.z = z; } }
    },
    stop() {
      stopped = true; cancelAnimationFrame(raf); ro.disconnect(); offs.forEach((f) => f()); unsub.forEach((u) => u?.());
      canvas.removeEventListener('webglcontextlost', onLost); canvas.removeEventListener('webglcontextrestored', onRest);
      scene.traverse((o) => { o.geometry?.dispose(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach((mm) => mm.dispose()); });
      renderer.dispose(); renderer.forceContextLoss?.(); canvas.remove(); arrow?.remove(); ctlEl.innerHTML = '';
    },
  };
}
