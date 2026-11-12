import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path';
const ROOT = new URL('..', import.meta.url).pathname;
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1500, height: 700 } });
await pg.route('**/*', (r) => { const u = r.request().url(); if (u.startsWith('http://localhost:5555/')) { const p = new URL(u).pathname.slice(1); if (p === 't.html') return r.fulfill({ contentType: 'text/html', body: '<link rel=stylesheet href=styles.css><div id=w style="display:flex;flex-wrap:wrap;gap:8px"></div>' }); return r.fulfill({ contentType: p.endsWith('.js') ? 'text/javascript' : 'text/css', body: fs.readFileSync(path.join(ROOT, p)) }); } return r.abort(); });
await pg.goto('http://localhost:5555/t.html');
await pg.evaluate(async () => {
  const { RITEMS, itemSVG, FLOOR_Y } = await import('./roomitems.js'); const { frontSVG, sideSVG } = await import('./avatar.js');
  const av = { fur: 'blue', eyes: 'amber', ears: 'fold', pattern: 'solid', owned: [], eq: {} }; const s = 105 / 158; let n = 0;
  for (const [id, it] of Object.entries(RITEMS)) { if (!it.act) continue;
    const cx = 180, x = cx - it.w / 2, side = it.side && it.act !== 'sleep', front = !side && it.act !== 'stand';
    const ccx = it.side && it.act === 'sleep' ? x - 34 : cx; const cat = front ? `<div style="position:absolute;left:${ccx - 42 * s}px;bottom:${6 + (it.seat || 0)}px;width:${84 * s}px">${frontSVG(av, 'f' + n++).replace('<svg', '<svg width="100%"')}</div>` : `<div style="position:absolute;left:${(it.act === 'eat' ? cx - 36 : x - 58) - 79 * s}px;bottom:${6}px;width:${158 * s}px">${sideSVG(av, 's' + n++).replace('<svg', '<svg width="100%"')}</div>`;
    const top = it.kind === 'wall' ? it.y : FLOOR_Y - it.h;
    document.getElementById('w').insertAdjacentHTML('beforeend', `<div style="position:relative;width:360px;height:300px;background:#fde;overflow:hidden"><div style="position:absolute;top:206px;left:0;right:0;bottom:0;background:#e6c7aa"></div><div style="position:absolute;left:${x}px;top:${top}px;width:${it.w}px;height:${it.h}px">${itemSVG(id)}</div>${cat}<b style="position:absolute;left:4px;top:2px">${it.name} · ${it.act}</b></div>`);
  }
});
await pg.screenshot({ path: '/tmp/seats.png', fullPage: true }); await b.close();
