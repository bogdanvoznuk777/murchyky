// ===== Розділ 3 «Сад»: два котики в одному саду. Плити, ворота, ваги, невидимі містки, бджоли =====
// Кожен телефон рухає свого котика; ворота й плити рахуються на обох телефонах з позицій обох котиків;
// бджоли летять за спільним серверним часом; «ваги» (x) фіксує ведучий.
import * as T from './three-lite.js';

const SPEED = 2.5, R = 0.26, SEND_MS = 90, BEE_R = 0.48;
const GATE_COL = { A: 0x9b6bff, B: 0x2bb5a8, C: 0xffa63d, D: 0x4aa8ff, X: 0xffc93d };
const isGate = (c) => /[A-DX]/.test(c), isPlate = (c) => /[a-dx]/.test(c);

export function startGarden(ctx) {
  const { holder, ctlEl, grid, role, isHost } = ctx; // role: 'A' | 'B'
  const H = grid.length, W = grid[0].length, other = role === 'A' ? 'B' : 'A';
  const cell = (x, y) => (y < 0 || y >= H || x < 0 || x >= W ? '#' : grid[y][x]);
  const cx = (x) => x - W / 2 + 0.5, cz = (y) => y - H / 2 + 0.5, toCell = (v, n) => Math.floor(v + n / 2);
  const blindTile = role === 'A' ? '1' : '2'; // місток, якого я НЕ бачу
  let startMe = [1, 1], startP = [1, 1], fishC = null; const plates = {}, bees = [], goals = [];
  grid.forEach((r, y) => [...r].forEach((c, x) => {
    if (c === (role === 'A' ? 'S' : 'T')) startMe = [x, y]; if (c === (role === 'A' ? 'T' : 'S')) startP = [x, y];
    if (c === 'F') fishC = [x, y]; if (c === 'G') goals.push([x, y]); if (isPlate(c)) (plates[c] ||= []).push([x, y]);
    if (c === 'z') {
      let l = x, r = x; while (l > x - 3 && !'#w'.includes(cell(l - 1, y))) l--; while (r < x + 3 && !'#w'.includes(cell(r + 1, y))) r++;
      const amp = (r - l) / 2; bees.push({ y, c: (cx(l) + cx(r)) / 2, amp, per: Math.max(1600, (4 * amp / 1.7) * 1000), ph: (x * 7 + y * 13) % 10 / 10 });
    }
  }));

  // ---------- стан ----------
  const st = { x: cx(startMe[0]), z: cz(startMe[1]), h: 0, cp: [...startMe], falls: 0, hitT: 0, hitKind: '', fish: 0, latch: '', won: false };
  let joy = { x: 0, z: 0 }, paused = true, stopped = false, sent = '', lastSent = 0, inGoalT = 0;
  const pp = { x: cx(startP[0]), z: cz(startP[1]), h: 0, falls: 0, hit: 0, t: 0, seen: false }, pd = { x: pp.x, z: pp.z, h: 0 };

  // ---------- 3D ----------
  const canvas = document.createElement('canvas'); canvas.className = 'box3d'; holder.appendChild(canvas);
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene(); scene.background = new T.Color(0xeaf7e4);
  scene.add(new T.HemisphereLight(0xffffff, 0xb8d8a8, 1.7));
  const sun = new T.DirectionalLight(0xffffff, 1.2); sun.position.set(-4, 10, 6); scene.add(sun);
  const lam = (c, o = {}) => new T.MeshLambertMaterial({ color: c, ...o });
  const o3 = new T.Object3D();
  const inst = (geo, mat, list, y) => { const m = new T.InstancedMesh(geo, mat, Math.max(1, list.length)); list.forEach(([x, z], i) => { o3.position.set(cx(x), y, cz(z)); o3.rotation.set(0, 0, 0); o3.scale.set(1, 1, 1); o3.updateMatrix(); m.setMatrixAt(i, o3.matrix); }); m.count = list.length; scene.add(m); return m; };
  const L = (pred) => { const a = []; grid.forEach((r, y) => [...r].forEach((c, x) => { if (pred(c)) a.push([x, y]); })); return a; };
  const ground = new T.Mesh(new T.BoxGeometry(W, 0.2, H), lam(0x9fd67a)); ground.position.y = -0.12; scene.add(ground);
  inst(new T.BoxGeometry(1, 0.7, 1), lam(0x3f9a4f), L((c) => c === '#'), 0.35);
  // вода (і невидимі для мене містки теж малюються водою)
  inst(new T.BoxGeometry(1, 0.06, 1), lam(0x6cc6ff), L((c) => c === 'w' || c === blindTile), -0.0);
  inst(new T.BoxGeometry(0.92, 0.1, 0.92), lam(0xc68b59), L((c) => (c === '1' || c === '2') && c !== blindTile), 0.03);
  // квіти-чекпойнти
  L((c) => c === '*').forEach(([x, y]) => { const f = new T.Group(); f.position.set(cx(x), 0, cz(y)); const s = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.35, 5), lam(0x3f9a4f)); s.position.y = 0.17; f.add(s); const b = new T.Mesh(new T.SphereGeometry(0.13, 10, 8), lam(0xff6fa8)); b.position.y = 0.38; f.add(b); scene.add(f); });
  // плити
  const plateM = [];
  Object.entries(plates).forEach(([k, list]) => list.forEach(([x, y]) => {
    const g = new T.Group(); g.position.set(cx(x), 0, cz(y));
    const ring = new T.Mesh(new T.CylinderGeometry(0.42, 0.44, 0.06, 20), lam(GATE_COL[k.toUpperCase()])); ring.position.y = 0.03; g.add(ring);
    const top = new T.Mesh(new T.CylinderGeometry(0.32, 0.34, 0.1, 20), lam(k === 'x' ? 0xfff1b8 : 0xf3e6d6)); top.position.y = 0.09; g.add(top);
    g.userData = { k, x, y, top }; scene.add(g); plateM.push(g);
  }));
  // ворота
  const gateM = L(isGate).map(([x, y]) => { const c = cell(x, y); const m = new T.Mesh(new T.BoxGeometry(0.94, 0.7, 0.94), lam(GATE_COL[c], { transparent: true, opacity: 0.88 })); m.position.set(cx(x), 0.35, cz(y)); m.userData = { c, x, y }; scene.add(m); return m; });
  // рибка
  let fishM = null;
  if (fishC) { fishM = new T.Group(); const b = new T.Mesh(new T.SphereGeometry(0.2, 14, 10), lam(0xff9a3c)); b.scale.set(1.4, 0.8, 0.7); fishM.add(b); const t = new T.Mesh(new T.ConeGeometry(0.14, 0.22, 3), lam(0xff9a3c)); t.rotation.z = Math.PI / 2; t.position.x = -0.36; fishM.add(t); fishM.position.set(cx(fishC[0]), 0.4, cz(fishC[1])); scene.add(fishM); }
  // альтанка-серце
  goals.forEach(([x, y]) => { const g = new T.Group(); g.position.set(cx(x), 0, cz(y)); const p = new T.Mesh(new T.CylinderGeometry(0.44, 0.44, 0.04, 20), lam(0xffc2d9)); p.position.y = 0.02; g.add(p); const a = new T.Mesh(new T.TorusGeometry(0.38, 0.05, 6, 20, Math.PI), lam(0xff4d8d)); a.position.y = 0.05; g.add(a); scene.add(g); });
  // бджоли
  const beeM = bees.map(() => { const g = new T.Group(); const b = new T.Mesh(new T.SphereGeometry(0.16, 10, 8), lam(0xffd23d)); b.scale.set(1.3, 1, 1); g.add(b); const s = new T.Mesh(new T.CylinderGeometry(0.165, 0.165, 0.06, 10), lam(0x222222)); s.rotation.z = Math.PI / 2; g.add(s); [-1, 1].forEach((k) => { const w = new T.Mesh(new T.SphereGeometry(0.1, 6, 4), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })); w.scale.set(0.6, 0.2, 1); w.position.set(0, 0.14, k * 0.1); g.add(w); }); g.scale.setScalar(1.5); scene.add(g); return g; });
  // котики (кольори з аватарів)
  function makeCat(col) {
    const g = new T.Group(), fur = lam(col), dark = lam(new T.Color(col).multiplyScalar(0.7));
    const body = new T.Mesh(new T.CapsuleGeometry(0.17, 0.3, 4, 10), fur); body.rotation.x = Math.PI / 2; body.position.y = 0.28; g.add(body);
    const head = new T.Mesh(new T.SphereGeometry(0.17, 14, 12), fur); head.position.set(0, 0.47, -0.27); g.add(head);
    [-1, 1].forEach((s) => { const e = new T.Mesh(new T.ConeGeometry(0.07, 0.1, 4), dark); e.position.set(s * 0.09, 0.6, -0.25); e.rotation.set(-0.9, 0, s * 0.3); g.add(e); });
    const tail = new T.Mesh(new T.CylinderGeometry(0.035, 0.05, 0.42, 6), dark); tail.position.set(0, 0.42, 0.33); tail.rotation.x = -0.7; g.add(tail);
    g.scale.setScalar(1.5); return g;
  }
  const meCat = makeCat(ctx.colMe || 0x8fa3bf), pCat = makeCat(ctx.colP || 0xd9a7c7);
  const marker = new T.Mesh(new T.ConeGeometry(0.14, 0.26, 8), new T.MeshBasicMaterial({ color: 0xff4d8d })); marker.rotation.x = Math.PI; meCat.add(marker); marker.position.y = 0.95;
  scene.add(meCat, pCat);

  const cam = new T.PerspectiveCamera(38, 1, 0.1, 100);
  function fit() {
    const w = holder.clientWidth || 360, h = holder.clientHeight || 420; renderer.setSize(w, h, false); cam.aspect = w / h;
    const vf = (cam.fov * Math.PI) / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * cam.aspect);
    const need = Math.max((H * 0.6 + 0.6) / Math.tan(vf / 2), (W / 2 + 0.5) / Math.tan(hf / 2));
    cam.position.set(0, need * 0.95, need * 0.3); cam.lookAt(0, 0, 0.3); cam.updateProjectionMatrix();
  }
  fit(); const ro = new ResizeObserver(fit); ro.observe(holder);

  // ---------- логіка ----------
  const myCell = () => [toCell(st.x, W), toCell(st.z, H)];
  const pCell = () => [toCell(pp.x, W), toCell(pp.z, H)];
  const on = (c, [x, y]) => c[0] === x && c[1] === y;
  const pressed = (k) => (plates[k] || []).some((p) => on(myCell(), p) || (pp.seen && on(pCell(), p)));
  const gateOpen = (c) => (c === 'X' ? st.latch.includes('x') : pressed(c.toLowerCase()));
  const solid = (x, y) => { const c = cell(x, y); if (c === '#') return true; if (isGate(c) && !gateOpen(c)) { const [mx, my] = myCell(); return !(mx === x && my === y); } return false; };
  function collide() {
    const gx = toCell(st.x, W), gy = toCell(st.z, H);
    for (let y = gy - 1; y <= gy + 1; y++) for (let x = gx - 1; x <= gx + 1; x++) {
      if (!solid(x, y)) continue;
      const minx = cx(x) - 0.5, minz = cz(y) - 0.5, px = Math.max(minx, Math.min(st.x, minx + 1)), pz = Math.max(minz, Math.min(st.z, minz + 1));
      const dx = st.x - px, dz = st.z - pz, d2 = dx * dx + dz * dz; if (d2 >= R * R) continue;
      const d = Math.sqrt(d2) || 1e-6; st.x = px + (dx / d) * R; st.z = pz + (dz / d) * R;
    }
  }
  const beePos = (b, ms) => [b.c + b.amp * Math.sin(2 * Math.PI * (ms / b.per + b.ph)), cz(b.y)];
  function hit(kind) { st.hitT = performance.now(); st.hitKind = kind; st.falls++; ctx.onFall?.(kind, true); }
  function step(dt, ms) {
    if (st.hitT) { if (performance.now() - st.hitT > 750) { st.hitT = 0; st.x = cx(st.cp[0]); st.z = cz(st.cp[1]); } return; }
    if (Math.hypot(joy.x, joy.z) > 0.05) st.h = Math.atan2(-joy.x, -joy.z);
    for (let i = 0; i < 3; i++) { st.x += (joy.x * SPEED * dt) / 3; st.z += (joy.z * SPEED * dt) / 3; collide(); }
    const [gx, gy] = myCell(), c = cell(gx, gy), dc = Math.hypot(st.x - cx(gx), st.z - cz(gy));
    if (c === 'w') return hit('water');
    for (const b of bees) { const [bx, bz] = beePos(b, ms); if (Math.hypot(st.x - bx, st.z - bz) < BEE_R) return hit('bee'); }
    if (c === '*' && dc < 0.4) st.cp = [gx, gy];
    if (c === 'F' && dc < 0.45 && !st.fish) { st.fish = 1; ctx.send('f', 1); ctx.onFish?.(); }
  }
  // ведучий фіксує «ваги» і перемогу (обидва котики в альтанці)
  function hostCheck(dt) {
    if (!isHost || st.won) return;
    if (!st.latch.includes('x') && plates.x?.length && plates.x.every((p) => on(myCell(), p) || (pp.seen && on(pCell(), p)))) { st.latch += 'x'; ctx.send('lt', st.latch); ctx.onLatch?.(); }
    const both = goals.some((g) => on(myCell(), g)) && pp.seen && goals.some((g) => on(pCell(), g)) && !on(myCell(), pCell());
    inGoalT = both && !st.hitT && !pp.hit ? inGoalT + dt : 0;
    if (inGoalT > 0.5) { st.won = true; ctx.onWin?.({ fish: st.fish, falls: st.falls + pp.falls }); }
  }

  // ---------- керування ----------
  const offs = []; const onEv = (el, ev, f, o) => { el.addEventListener(ev, f, o); offs.push(() => el.removeEventListener(ev, f, o)); };
  ctlEl.innerHTML = `<div class="g-lab">${ctx.hint || ''}</div>
    <div class="joy-row"><div class="joy" id="gjoy"><div class="joy-k" id="gjk"></div></div><button class="btn ghost meow" id="gmeow">Мяу! 🐾</button></div>`;
  const base = ctlEl.querySelector('#gjoy'), knob = ctlEl.querySelector('#gjk'); let pid = null;
  const setJ = (e) => { const r = base.getBoundingClientRect(), rad = r.width / 2; let dx = e.clientX - (r.left + rad), dz = e.clientY - (r.top + rad); const d = Math.hypot(dx, dz), mx = rad * 0.75; if (d > mx) { dx *= mx / d; dz *= mx / d; } joy = { x: dx / mx, z: dz / mx }; knob.style.transform = `translate(${dx}px,${dz}px)`; };
  const endJ = (e) => { if (e.pointerId !== pid) return; pid = null; joy = { x: 0, z: 0 }; knob.style.transform = ''; };
  onEv(base, 'pointerdown', (e) => { pid = e.pointerId; base.setPointerCapture(pid); setJ(e); });
  onEv(base, 'pointermove', (e) => { if (e.pointerId === pid) setJ(e); });
  onEv(base, 'pointerup', endJ); onEv(base, 'pointercancel', endJ);
  let mn = 0; onEv(ctlEl.querySelector('#gmeow'), 'click', () => { if (Date.now() - mn < 1500) return; mn = Date.now(); ctx.send('mw_' + role, Math.round(ctx.now())); });
  const keys = {}; const kb = () => { joy = { x: (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0), z: (keys.ArrowDown ? 1 : 0) - (keys.ArrowUp ? 1 : 0) }; };
  onEv(window, 'keydown', (e) => { if (e.key.startsWith('Arrow')) { keys[e.key] = 1; kb(); } }); onEv(window, 'keyup', (e) => { if (e.key.startsWith('Arrow')) { keys[e.key] = 0; kb(); } });

  // ---------- мережа ----------
  const unsub = [];
  unsub.push(ctx.listen('p_' + other, (v) => {
    if (!v) return; const [x, z, h, f, hi] = v.split(',').map(Number); if ([x, z, h].some(isNaN)) return;
    if (hi && !pp.hit) ctx.onFall?.('', false);
    Object.assign(pp, { x, z, h, falls: f || 0, hit: hi || 0, t: performance.now(), seen: true });
  }));
  unsub.push(ctx.listen('f', (v) => { if (v && !st.fish) { st.fish = 1; ctx.onFish?.(); } }));
  unsub.push(ctx.listen('lt', (v) => { if (v && v !== st.latch) { st.latch = v; ctx.onLatch?.(); } }));
  let lastMw = 0; unsub.push(ctx.listen('mw_' + other, (n) => { if (n && n !== lastMw) { if (ctx.now() - n < 5000) ctx.flash?.('🐱 Мяу! Партнер кличе'); lastMw = n; } }));

  // ---------- кадр ----------
  let raf = 0, last = performance.now(), slow = 0;
  function frame(t) {
    if (stopped) return; raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    slow = slow * 0.98 + (dt > 0.035 ? 0.02 : 0); if (slow > 0.6 && renderer.getPixelRatio() > 1) { renderer.setPixelRatio(1); fit(); slow = 0; }
    const ms = ctx.now() - ctx.at;
    if (!paused && !st.won) {
      step(dt, ms); hostCheck(dt);
      if (t - lastSent >= SEND_MS) { const s = `${st.x.toFixed(2)},${st.z.toFixed(2)},${st.h.toFixed(1)},${st.falls},${st.hitT ? 1 : 0}`; if (s !== sent) { sent = s; lastSent = t; ctx.send('p_' + role, s); } }
    }
    // показ котиків
    const k = 1 - Math.exp(-dt * 14);
    if (Math.hypot(pp.x - pd.x, pp.z - pd.z) > 2) { pd.x = pp.x; pd.z = pp.z; }
    const pmv = Math.hypot(pp.x - pd.x, pp.z - pd.z);
    pd.x += (pp.x - pd.x) * k; pd.z += (pp.z - pd.z) * k;
    let dh = pp.h - pd.h; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI; pd.h += dh * Math.min(1, dt * 12);
    const walking = Math.hypot(joy.x, joy.z) > 0.05 && !paused;
    const sink = (h) => (h ? 0.25 : 0);
    meCat.position.set(st.x, (walking ? Math.abs(Math.sin(t / 110)) * 0.05 : 0) - sink(st.hitT && st.hitKind === 'water'), st.z); meCat.rotation.y = st.h;
    meCat.visible = !(st.hitT && Math.floor(t / 90) % 2);
    pCat.position.set(pd.x, (pmv > 0.01 ? Math.abs(Math.sin(t / 110)) * 0.05 : 0), pd.z); pCat.rotation.y = pd.h; pCat.visible = pp.seen && !(pp.hit && Math.floor(t / 90) % 2);
    marker.position.y = 0.95 + Math.sin(t / 250) * 0.08;
    // плити, ворота, бджоли, рибка
    plateM.forEach((g) => { const d = on(myCell(), [g.userData.x, g.userData.y]) || (pp.seen && on(pCell(), [g.userData.x, g.userData.y])); g.userData.top.position.y = d ? 0.04 : 0.09; });
    gateM.forEach((m) => { const s = gateOpen(m.userData.c) ? 0.05 : 1; m.scale.y += (s - m.scale.y) * 0.25; m.position.y = 0.35 * m.scale.y; });
    bees.forEach((b, i) => { const [bx, bz] = beePos(b, ms); beeM[i].position.set(bx, 0.45 + Math.sin(t / 120 + i) * 0.05, bz); beeM[i].rotation.y = Math.cos(2 * Math.PI * (ms / b.per + b.ph)) > 0 ? 0 : Math.PI; });
    if (fishM) { fishM.visible = !st.fish; fishM.rotation.y = t / 600; }
    renderer.render(scene, cam);
  }
  raf = requestAnimationFrame(frame);
  const onLost = (e) => { e.preventDefault(); cancelAnimationFrame(raf); };
  const onRest = () => { last = performance.now(); raf = requestAnimationFrame(frame); };
  canvas.addEventListener('webglcontextlost', onLost); canvas.addEventListener('webglcontextrestored', onRest);

  return {
    pause(p) { paused = p; if (p) joy = { x: 0, z: 0 }; },
    state: () => ({ ...st, falls: st.falls + pp.falls, myFalls: st.falls }),
    info: () => ({ role, at: ctx.at, now: ctx.now(), bees: bees.map((b) => beePos(b, ctx.now() - ctx.at)), p: { x: pp.x, z: pp.z } }),
    setInput(x, z) { joy = { x, z }; },
    restore(pos, f, lt) {
      if (f) st.fish = 1; if (lt) st.latch = lt;
      const [x, z, h, fl] = (pos || '').split(',').map(Number);
      if (!isNaN(x) && !isNaN(z) && !'#w'.includes(cell(toCell(x, W), toCell(z, H)))) { st.x = x; st.z = z; st.falls = fl || 0; }
    },
    stop() {
      stopped = true; cancelAnimationFrame(raf); ro.disconnect(); offs.forEach((f) => f()); unsub.forEach((u) => u?.());
      canvas.removeEventListener('webglcontextlost', onLost); canvas.removeEventListener('webglcontextrestored', onRest);
      scene.traverse((o) => { o.geometry?.dispose(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach((mm) => mm.dispose()); });
      renderer.dispose(); renderer.forceContextLoss?.(); canvas.remove(); ctlEl.innerHTML = '';
    },
  };
}
