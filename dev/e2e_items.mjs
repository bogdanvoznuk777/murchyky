import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path';
const DEV=new URL('.',import.meta.url).pathname.replace(/\/$/,''), ROOT=DEV.replace(/\/dev$/,'');
const GAME=ROOT;
const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:1400,height:900}});
const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
await pg.route('**/*', r=>{ const u=r.request().url(); if(u.startsWith('http://localhost:5555/')){ let p=new URL(u).pathname.slice(1); if(p==='t.html') return r.fulfill({contentType:'text/html',body:'<link rel=stylesheet href=styles.css><style>body{background:#fff}.w{display:flex;flex-wrap:wrap;gap:6px}.w>div{width:170px;text-align:center;font:11px sans-serif}</style><div class=w id=w></div>'}); const fp=path.join(GAME,p); return r.fulfill({contentType:p.endsWith('.css')?'text/css':'text/javascript',body:fs.readFileSync(fp)}); } return r.abort(); });
await pg.goto('http://localhost:5555/t.html');
await pg.evaluate(async()=>{
  const {ITEMS,frontSVG,sideSVG}=await import('./avatar.js'); const w=document.getElementById('w'); let k=0;
  const ids=Object.keys(ITEMS).filter(id=>ITEMS[id].f);
  for(const id of ids){ const it=ITEMS[id]; const av={fur:['blue','ginger','cream','black','white','choco'][k%6],eyes:'amber',ears:k%2?'straight':'fold',pattern:['solid','tabby','tuxedo','calico'][k%4],owned:[id],eq:{[it.slot]:id}};
    w.insertAdjacentHTML('beforeend',`<div><div style="height:90px">${sideSVG(av,'s'+k).replace('<svg','<svg width="160"')}</div><div style="height:100px">${frontSVG(av,'f'+k).replace('<svg','<svg width="80"')}</div>${it.name}</div>`); k++; }
});
await pg.screenshot({path:'/tmp/items.png',fullPage:true});
console.log('ERRORS', errs.length?errs:'none'); await b.close();
