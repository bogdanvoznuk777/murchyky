// Візуальна перевірка каталогу кімнати: усі набори, шпалери/підлога, види з вікна (час доби × пора року). Знімки — /tmp/rc_*.png
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path';
const ROOT = new URL('..', import.meta.url).pathname;
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1500, height: 700 }, deviceScaleFactor: 2 });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.route('**/*', (r) => { const u = r.request().url(); if (u.startsWith('http://localhost:5555/')) { const p = new URL(u).pathname.slice(1); if (p === 't.html') return r.fulfill({ contentType: 'text/html', body: '<link rel=stylesheet href=styles.css><div id=w style="display:flex;flex-wrap:wrap;gap:8px"></div>' }); return r.fulfill({ contentType: p.endsWith('.js') ? 'text/javascript' : 'text/css', body: fs.readFileSync(path.join(ROOT, p)) }); } return r.abort(); });
await pg.goto('http://localhost:5555/t.html');
// 1) кожен набір — у своїй кімнаті 480 шириною
await pg.evaluate(async () => {
  const { RITEMS, SET_ITEMS, SETS, itemSVG, FLOOR_Y, WALL_H } = await import('./roomitems.js');
  const w = document.getElementById('w');
  for (const st of Object.keys(SETS)) {
    const ids = SET_ITEMS[st], paper = ids.find((i) => RITEMS[i].kind === 'paper'), fl = ids.find((i) => RITEMS[i].kind === 'flooring');
    let wx = 4, fx = 4, html = '';
    for (const id of ids) { const it = RITEMS[id]; if (!it.svg) continue;
      let x; if (it.kind === 'wall') { x = wx; wx += it.w + 6; } else { x = fx; fx += it.w + 4; }
      const top = it.kind === 'wall' ? it.y : it.kind === 'rug' ? FLOOR_Y + 8 - it.h : FLOOR_Y - it.h;
      html += `<div class="r-it ${it.kind}" style="left:${x}px;top:${top}px;width:${it.w}px;height:${it.h}px">${itemSVG(id, { view: 'city', phase: 'evening', season: 'winter' })}</div>`; }
    w.insertAdjacentHTML('beforeend', `<div class="room" style="width:720px;height:300px"><div class="r-paper" style="height:${WALL_H}px;background:${RITEMS[paper]?.css || RITEMS.base_paper.css}"></div><div class="r-floor" style="top:${WALL_H}px;background:${RITEMS[fl]?.css || RITEMS.base_floor.css}"></div><div class="r-base" style="top:${WALL_H - 6}px;height:8px"></div>${html}<b style="position:absolute;z-index:9;left:6px;bottom:2px;background:#fff">${SETS[st].name}</b></div>`);
  }
});
await pg.waitForTimeout(800); await pg.screenshot({ path: '/tmp/rc_sets.png', fullPage: true });
// 2) види з вікна
await pg.evaluate(async () => {
  const { itemSVG } = await import('./roomitems.js'); const w = document.getElementById('w'); w.innerHTML = '';
  for (const view of ['city', 'garden', 'sea', 'hills', 'space']) for (const phase of ['morning', 'day', 'evening', 'night']) for (const season of ['winter', 'spring', 'summer', 'autumn'])
    if (season === 'summer' || phase === 'day') w.insertAdjacentHTML('beforeend', `<div style="width:90px;height:96px;background:#fde;font-size:9px">${itemSVG('cl_window', { view, phase, season })}<div>${view} ${phase} ${season}</div></div>`);
});
await pg.waitForTimeout(500); await pg.screenshot({ path: '/tmp/rc_views.png', fullPage: true });
// 3) ексклюзиви на котику
await pg.evaluate(async () => {
  const { ITEMS, frontSVG, sideSVG } = await import('./avatar.js'); const w = document.getElementById('w'); w.innerHTML = '';
  for (const id of Object.keys(ITEMS).filter((i) => ITEMS[i].room && ITEMS[i].f)) for (const fur of ['blue', 'ginger', 'black']) {
    const av = { fur, eyes: 'amber', ears: 'fold', pattern: 'solid', owned: [id], eq: { [ITEMS[id].slot]: id } };
    w.insertAdjacentHTML('beforeend', `<div><div style="height:100px">${sideSVG(av, 's' + id + fur).replace('<svg', '<svg width="170"')}</div><div style="height:120px">${frontSVG(av, 'f' + id + fur).replace('<svg', '<svg width="100"')}</div>${ITEMS[id].name}</div>`);
  }
});
await pg.waitForTimeout(300); await pg.screenshot({ path: '/tmp/rc_ex.png', fullPage: true });
console.log('ERRORS', errs.length ? errs : 'none'); await b.close();
