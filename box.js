// ===== Розділ 1 «Шкатулка»: 3D-лабіринт, який нахиляють удвох =====
// Фізику рахує лише один телефон («ведучий»), інший показує й надсилає свій нахил — без розбіжностей.
import * as T from './three-lite.js';

const MAXT = 0.2, G = 16, R = 0.3, FRICTION = 1.1, VMAX = 6, SEND_MS = 80, TILT_RATE = 1.6;
const PAL = { floor: 0xffe6ef, wall: 0xff8fb8, wallTop: 0xffb3cf, hole: 0x5b2a4a, goal: 0xc98b4d, fish: 0xff9a3c, bg: 0xfff4f8 };
const SW_COL = [0x7c4dff, 0x26a69a, 0xffa000, 0x42a5f5];

export function startBox(ctx) {
  const { holder, grid, isHost, axis } = ctx;
  const H = grid.length, W = grid[0].length;
  const cell = (x, y) => (y < 0 || y >= H || x < 0 || x >= W ? '#' : grid[y][x]);
  const cx = (x) => x - W / 2 + 0.5, cz = (y) => y - H / 2 + 0.5;
  const toCell = (v, n) => Math.floor(v + n / 2);
  let start = [1, 1];
  const letters = [];
  grid.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'S') start = [x, y]; if (/[a-z]/.test(c) && !letters.includes(c)) letters.push(c); }));

  // ---------- стан ----------
  const st = { x: cx(start[0]), z: cz(start[1]), vx: 0, vz: 0, cp: [...start], sw: '', fish: 0, falls: 0, fallT: 0, won: false };
  let tilt = { x: 0, z: 0 }, target = { x: 0, z: 0 }, myIn = 0, partnerIn = 0, paused = true, stopped = false;
  let disp = { x: st.x, z: st.z }, net = null, lastSent = 0, lastTiltSent = 0, sentTilt = null, lastWorld = '';

  // ---------- 3D ----------
  const canvas = document.createElement('canvas'); canvas.className = 'box3d'; holder.appendChild(canvas);
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene(); scene.background = new T.Color(PAL.bg);
  const cam = new T.PerspectiveCamera(38, 1, 0.1, 100);
  scene.add(new T.HemisphereLight(0xffffff, 0xffc4d8, 1.6));
  const sun = new T.DirectionalLight(0xffffff, 1.4); sun.position.set(-3, 10, 6); scene.add(sun);
  const board = new T.Group(); scene.add(board);
  const lam = (c, o = {}) => new T.MeshLambertMaterial({ color: c, ...o });

  // підлога + рамка
  const floor = new T.Mesh(new T.BoxGeometry(W, 0.3, H), lam(PAL.floor)); floor.position.y = -0.15; board.add(floor);
  // стіни одним викликом малювання (InstancedMesh)
  const walls = []; const gates = {};
  grid.forEach((r, y) => [...r].forEach((c, x) => { if (c === '#') walls.push([x, y]); }));
  const wm = new T.InstancedMesh(new T.BoxGeometry(1, 0.6, 1), lam(PAL.wall), walls.length);
  const o3 = new T.Object3D();
  walls.forEach(([x, y], i) => { o3.position.set(cx(x), 0.3, cz(y)); o3.updateMatrix(); wm.setMatrixAt(i, o3.matrix); });
  board.add(wm);
  // ямки, кнопки, ворота, рибка, кошик
  const holeG = new T.CircleGeometry(0.42, 24), holeM = new T.MeshBasicMaterial({ color: PAL.hole });
  let fishMesh = null, goalPos = null;
  grid.forEach((r, y) => [...r].forEach((c, x) => {
    const px = cx(x), pz = cz(y);
    if (c === 'O') { const h = new T.Mesh(holeG, holeM); h.rotation.x = -Math.PI / 2; h.position.set(px, 0.005, pz); board.add(h); }
    else if (/[a-z]/.test(c)) {
      const col = SW_COL[letters.indexOf(c) % SW_COL.length];
      const b = new T.Mesh(new T.CylinderGeometry(0.34, 0.38, 0.12, 20), lam(col)); b.position.set(px, 0.06, pz); b.userData.sw = c; board.add(b);
      gates[c] = gates[c] || { btn: [], walls: [] }; gates[c].btn.push(b);
    } else if (/[A-Z]/.test(c) && !'SGF'.includes(c)) {
      const k = c.toLowerCase(), col = SW_COL[letters.indexOf(k) % SW_COL.length];
      const g = new T.Mesh(new T.BoxGeometry(1, 0.6, 1), lam(col, { transparent: true, opacity: 0.85 })); g.position.set(px, 0.3, pz); board.add(g);
      gates[k] = gates[k] || { btn: [], walls: [] }; gates[k].walls.push(g);
    } else if (c === 'F') {
      const f = new T.Group();
      const body = new T.Mesh(new T.SphereGeometry(0.2, 16, 12), lam(PAL.fish)); body.scale.set(1.4, 0.8, 0.7); f.add(body);
      const tail = new T.Mesh(new T.ConeGeometry(0.14, 0.22, 3), lam(PAL.fish)); tail.rotation.z = Math.PI / 2; tail.position.x = -0.36; f.add(tail);
      f.position.set(px, 0.32, pz); board.add(f); fishMesh = f;
    } else if (c === 'G') {
      goalPos = [x, y];
      const g = new T.Group();
      const base = new T.Mesh(new T.CylinderGeometry(0.42, 0.34, 0.22, 22), lam(PAL.goal)); base.position.y = 0.11; g.add(base);
      const rim = new T.Mesh(new T.TorusGeometry(0.42, 0.05, 8, 24), lam(0xa86b34)); rim.rotation.x = Math.PI / 2; rim.position.y = 0.22; g.add(rim);
      const heart = new T.Mesh(new T.SphereGeometry(0.1, 10, 8), lam(0xff4d8d)); heart.position.y = 0.62; g.add(heart); g.userData.heart = heart;
      g.position.set(px, 0, pz); board.add(g); goalPos.mesh = g;
    }
  }));
  // клубок
  const tex = (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 64; const x = c.getContext('2d');
    x.fillStyle = '#ff5c9a'; x.fillRect(0, 0, 128, 64); x.strokeStyle = '#ffd1e3'; x.lineWidth = 3;
    for (let i = -64; i < 192; i += 10) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 40, 64); x.stroke(); }
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  })();
  const ballG = new T.Group(); board.add(ballG);
  const ball = new T.Mesh(new T.SphereGeometry(R, 24, 16), lam(0xffffff, { map: tex })); ballG.add(ball);
  const shadow = new T.Mesh(new T.CircleGeometry(R * 0.95, 20), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 }));
  shadow.rotation.x = -Math.PI / 2; board.add(shadow);

  function fit() {
    const w = holder.clientWidth || 360, h = holder.clientHeight || 420;
    renderer.setSize(w, h, false); cam.aspect = w / h;
    const vf = (cam.fov * Math.PI) / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * cam.aspect);
    const need = Math.max((H * 0.62 + 1) / Math.tan(vf / 2), (W / 2 + 0.6) / Math.tan(hf / 2));
    cam.position.set(0, need * 0.93, need * 0.38); cam.lookAt(0, 0, 0.35); cam.updateProjectionMatrix();
  }
  fit();
  const ro = new ResizeObserver(fit); ro.observe(holder);

  // ---------- фізика (лише ведучий) ----------
  const solid = (c) => c === '#' || (/[A-Z]/.test(c) && !'SGF'.includes(c) && !st.sw.includes(c.toLowerCase()));
  function collide() {
    const gx = toCell(st.x, W), gy = toCell(st.z, H);
    for (let y = gy - 1; y <= gy + 1; y++) for (let x = gx - 1; x <= gx + 1; x++) {
      if (!solid(cell(x, y))) continue;
      const minx = cx(x) - 0.5, maxx = minx + 1, minz = cz(y) - 0.5, maxz = minz + 1;
      const px = Math.max(minx, Math.min(st.x, maxx)), pz = Math.max(minz, Math.min(st.z, maxz));
      const dx = st.x - px, dz = st.z - pz, d2 = dx * dx + dz * dz;
      if (d2 >= R * R) continue;
      const d = Math.sqrt(d2) || 1e-6, nx = dx / d, nz = dz / d;
      st.x = px + nx * R; st.z = pz + nz * R;
      const vn = st.vx * nx + st.vz * nz;
      if (vn < 0) { st.vx -= 1.35 * vn * nx; st.vz -= 1.35 * vn * nz; if (vn < -2.2) ctx.onBump?.(); }
    }
  }
  function step(dt) {
    if (st.fallT) { if (performance.now() - st.fallT > 650) respawn(); return; }
    st.vx += G * Math.sin(tilt.x) * dt; st.vz += G * Math.sin(tilt.z) * dt;
    const k = Math.max(0, 1 - FRICTION * dt); st.vx *= k; st.vz *= k;
    const sp = Math.hypot(st.vx, st.vz); if (sp > VMAX) { st.vx *= VMAX / sp; st.vz *= VMAX / sp; }
    st.x += st.vx * dt; st.z += st.vz * dt;
    collide();
    const gx = toCell(st.x, W), gy = toCell(st.z, H), c = cell(gx, gy), dc = Math.hypot(st.x - cx(gx), st.z - cz(gy));
    if (c === 'O' && dc < 0.36) { st.fallT = performance.now(); st.falls++; st.vx = st.vz = 0; ctx.onFall?.(); pushWorld(); }
    else if (/[a-z]/.test(c) && dc < 0.4 && !st.sw.includes(c)) { st.sw += c; st.cp = [gx, gy]; ctx.onSwitch?.(); pushWorld(); }
    else if (c === 'F' && dc < 0.45 && !st.fish) { st.fish = 1; ctx.onFish?.(); pushWorld(); }
    else if (c === 'G' && dc < 0.32 && !st.won) { st.won = true; st.vx = st.vz = 0; pushWorld(); ctx.onWin?.({ fish: st.fish, falls: st.falls }); }
  }
  function respawn() { st.fallT = 0; st.x = cx(st.cp[0]); st.z = cz(st.cp[1]); st.vx = st.vz = 0; pushWorld(); }
  function pushWorld() {
    const w = `${st.sw}|${st.fish}|${st.falls}|${st.fallT ? 1 : 0}|${st.won ? 1 : 0}`;
    if (w !== lastWorld) { lastWorld = w; ctx.sendWorld(w); }
  }

  // ---------- мережа ----------
  function netTick(t) {
    const v = Math.round(myIn * 100) / 100;
    if (v !== sentTilt && t - lastTiltSent >= SEND_MS) { sentTilt = v; lastTiltSent = t; ctx.sendTilt(v); }
    if (isHost && t - lastSent >= SEND_MS) {
      const s = `${st.x.toFixed(3)},${st.z.toFixed(3)},${st.vx.toFixed(2)},${st.vz.toFixed(2)}`;
      if (s !== net) { net = s; lastSent = t; ctx.sendState(s); }
    }
  }
  let remote = null;
  function applyWorld(w) {
    if (!w) return; const [sw, f, falls, fall, won] = w.split('|');
    st.sw = sw || ''; st.fish = +f; st.falls = +falls; st.won = won === '1';
    if (fall === '1' && !st.fallT) st.fallT = performance.now(); if (fall === '0') st.fallT = 0;
  }

  // ---------- кадр ----------
  let raf = 0, last = performance.now(), acc = 0; const AX = new T.Vector3(); let slow = 0;
  function frame(t) {
    if (stopped) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    // якщо телефон не встигає (>35 мс на кадр протягом ~3 с) — знижуємо чіткість, щоб гра не гальмувала
    slow = slow * 0.98 + (dt > 0.035 ? 1 : 0) * 0.02;
    if (slow > 0.6 && renderer.getPixelRatio() > 1) { renderer.setPixelRatio(1); fit(); slow = 0; }
    // нахил: свій — одразу, партнера — з мережі, обидва плавно (обмежена швидкість)
    target[axis] = myIn * MAXT; target[axis === 'x' ? 'z' : 'x'] = partnerIn * MAXT;
    for (const a of ['x', 'z']) { const d = target[a] - tilt[a], m = TILT_RATE * dt; tilt[a] += Math.max(-m, Math.min(m, d)); }
    if (isHost && !paused && !st.won) { acc += dt; while (acc >= 1 / 120) { step(1 / 120); acc -= 1 / 120; } } else acc = 0;
    if (!paused) netTick(t);
    // позиція клубка для показу
    let tx = st.x, tz = st.z;
    if (!isHost && remote) {
      const age = Math.min(0.12, (t - remote.t) / 1000);
      tx = remote.x + remote.vx * age; tz = remote.z + remote.vz * age;
    }
    const k = isHost ? 1 : 1 - Math.exp(-dt * 18);
    const ox = disp.x, oz = disp.z;
    disp.x += (tx - disp.x) * k; disp.z += (tz - disp.z) * k;
    if (!isHost && Math.hypot(tx - disp.x, tz - disp.z) > 1.5) { disp.x = tx; disp.z = tz; }
    const mvx = disp.x - ox, mvz = disp.z - oz, mv = Math.hypot(mvx, mvz);
    if (mv > 1e-5) ball.rotateOnWorldAxis(AX.set(mvz / mv, 0, -mvx / mv), mv / R);
    const sink = st.fallT ? Math.min(1, (performance.now() - st.fallT) / 500) : 0;
    ballG.position.set(disp.x, R - sink * 0.9, disp.z); ballG.scale.setScalar(1 - sink * 0.5);
    shadow.position.set(disp.x, 0.01, disp.z); shadow.visible = !sink;
    board.rotation.z = -tilt.x; board.rotation.x = tilt.z;
    // ворота / кнопки / рибка
    for (const k2 in gates) {
      const open = st.sw.includes(k2);
      gates[k2].walls.forEach((g) => { const s = open ? 0.06 : 1; g.scale.y += (s - g.scale.y) * 0.2; g.position.y = 0.3 * g.scale.y; });
      gates[k2].btn.forEach((b) => (b.scale.y = open ? 0.35 : 1));
    }
    if (fishMesh) { fishMesh.visible = !st.fish; fishMesh.rotation.y = t / 600; fishMesh.position.y = 0.32 + Math.sin(t / 300) * 0.05; }
    if (goalPos?.mesh) goalPos.mesh.userData.heart.position.y = 0.62 + Math.sin(t / 250) * 0.06;
    renderer.render(scene, cam);
  }
  raf = requestAnimationFrame(frame);
  const onLost = (e) => { e.preventDefault(); cancelAnimationFrame(raf); };
  const onRestored = () => { last = performance.now(); raf = requestAnimationFrame(frame); };
  canvas.addEventListener('webglcontextlost', onLost); canvas.addEventListener('webglcontextrestored', onRestored);

  return {
    setInput(v) { myIn = Math.max(-1, Math.min(1, v)); },
    partnerTilt(v) { partnerIn = typeof v === 'number' ? Math.max(-1, Math.min(1, v)) : 0; },
    hostState(s) {
      if (isHost || !s) return; const [x, z, vx, vz] = s.split(',').map(Number);
      if ([x, z, vx, vz].some(isNaN)) return; remote = { x, z, vx, vz, t: performance.now() };
    },
    world(w) { if (!isHost) applyWorld(w); },
    // ведучий перезайшов посеред рівня — продовжуємо з того ж місця
    restore(s, w) {
      if (!isHost) return;
      if (w) { applyWorld(w); st.fallT = 0; lastWorld = ''; }
      const [x, z] = (s || '').split(',').map(Number);
      if (!isNaN(x) && !isNaN(z) && !solid(cell(toCell(x, W), toCell(z, H)))) { st.x = disp.x = x; st.z = disp.z = z; }
    },
    pause(p) { paused = p; if (p) { myIn = 0; } },
    state: () => ({ ...st }),
    stop() {
      stopped = true; cancelAnimationFrame(raf); ro.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost); canvas.removeEventListener('webglcontextrestored', onRestored);
      scene.traverse((o) => { o.geometry?.dispose(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach((mm) => { mm.map?.dispose(); mm.dispose(); }); });
      renderer.dispose(); renderer.forceContextLoss?.(); canvas.remove();
    },
  };
}
