import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path';
const DEV=new URL('.',import.meta.url).pathname.replace(/\/$/,''), ROOT=DEV.replace(/\/dev$/,'');
const GAME=ROOT, MOCK=DEV+'/mock4', LAT=+(process.env.LAT||70), LEVELS=(process.env.LEVELS||'1-1').split(',');
const {SURVEY}=await import(GAME+'/data.js'); const {levelById}=await import(GAME+'/levels.js');
const ans=(n,r)=>Object.fromEntries(SURVEY.map(q=>[q.id, q.id==='name'?n:q.id==='role'?r:q.opts?q.opts[0]:q.type==='scale'?'5':'x']));
const seedFor=(uid)=>({ users:{p:{nick:'оля'}, me:{nick:'богдан'}}, surveys:{p:{answers:ans('Оля','Вона'),done:true}, me:{answers:ans('Богдан','Він'),done:true}}, members:{[uid]:{}},
  points:{a:{uid:'me',amount:3300,reason:'x',week:'2026-11-02',date:'2026-11-03'}, b:{uid:'p',amount:3300,reason:'x',week:'2026-11-02',date:'2026-11-03'}}, rewards:{}, quiz:{}, wordle:{}, challenges:{}, duels:{}, spend:{}, avatars:{}, art:{}, artimg:{}, live:{}, audio:{}, coop:{} });
const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--enable-unsafe-swiftshader']});
const pages=[]; const errs=[]; const SERVER=[];
async function mk(uid,nick,pass){
  const ctx=await b.newContext({viewport:{width:390,height:800}, permissions:['microphone']}); const pg=await ctx.newPage();
  pg.on('pageerror',e=>errs.push(uid+' PAGEERR '+e.message)); pg.on('console',m=>{ if(m.type()==='error') errs.push(uid+' CONSOLE '+m.text()); });
  await pg.addInitScript(([s,u])=>{window.__SEED=s; window.__UID=u;}, [seedFor(uid),uid]);
  await pg.exposeBinding('__rtdbInit',()=>JSON.stringify(SERVER.map(m=>{const o=JSON.parse(m);return [o.p,o.v];})));
  await pg.exposeBinding('__rtdbSend',(src,m)=>{ SERVER.push(m); for(const o of pages) if(o!==pg) setTimeout(()=>o.evaluate(x=>window.__rtdbRecv(x),m).catch(()=>{}),LAT); });
  await pg.route('**/*', r=>{ const u=r.request().url();
    if(u.startsWith('https://ntfy.sh')) return r.fulfill({status:200,body:'{}'});
    if(u.includes('gstatic.com/firebasejs')){ const f=u.includes('auth')?'auth.js':u.includes('firestore')?'fs.js':u.includes('database')?'db.js':'app.js'; return r.fulfill({contentType:'text/javascript',body:fs.readFileSync(MOCK+'/'+f)}); }
    if(u.startsWith('http://localhost:5555/')){ let p=new URL(u).pathname.slice(1)||'index.html'; const fp=path.join(GAME,p); if(!fs.existsSync(fp)) return r.fulfill({status:404}); return r.fulfill({contentType:p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(fp)}); }
    return r.abort(); });
  pages.push(pg);
  await pg.goto('http://localhost:5555/'); await pg.waitForSelector('#authForm');
  await pg.fill('#nick',nick); await pg.fill('#pass','123456'); await pg.click('button[type=submit]');
  await pg.waitForSelector('.tiles'); return pg;
}
const A=await mk('me','богдан'), B=await mk('p','оля');
for(const pg of [A,B]) await pg.click('[data-to=coop]');
await A.waitForSelector('.lvls'); await B.waitForSelector('.lvls');
await A.screenshot({path:'co_map.png'});
const t0=Date.now();
// голос
await A.click('[data-c=vOn]'); await B.click('[data-c=vOn]');
// autopilot
function plan(grid){ const H=grid.length,W=grid[0].length; let S; const letters=[...new Set(grid.join('').match(/[a-z]/g)||[])]; grid.forEach((r,y)=>[...r].forEach((c,x)=>{if(c==='S')S=[x,y];}));
  const bit=c=>1<<letters.indexOf(c); const pass=(c,m)=>c!=='#'&&c!=='O'&&!(/[A-Z]/.test(c)&&!'SGF'.includes(c)&&!(m&bit(c.toLowerCase())));
  const allm=(1<<letters.length)-1; const prev=new Map(); const q=[[...S,0,0]]; const key=(x,y,m,f)=>x+','+y+','+m+','+f; prev.set(key(...S,0,0),null); let end=null;
  while(q.length){ let [x,y,m,f]=q.shift(); const k0=key(x,y,m,f); const c=grid[y][x]; if(c==='G'&&f){end=k0;break;} for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,nc=grid[ny][nx]; if(!pass(nc,m))continue; let nm=m; if(/[a-z]/.test(nc)) nm|=bit(nc); const nf=f||nc==='F'?1:0; if(nc==='G'&&!nf) continue; const k=key(nx,ny,nm,nf); if(prev.has(k))continue; prev.set(k,k0); q.push([nx,ny,nm,nf]);}}
  const pts=[]; for(let k=end;k;k=prev.get(k)){const [x,y]=k.split(',').map(Number); pts.unshift([x-W/2+0.5,y-H/2+0.5]);} return pts; }
const stats=[];
for(const id of LEVELS){
  const lvl=levelById(id);
  await A.evaluate(id=>document.querySelector(`[data-c=pick][data-id="${id}"]`).click(), id);
  await B.waitForSelector('[data-c=accept]',{timeout:8000}); await B.click('[data-c=accept]');
  await A.waitForSelector('.box3d'); await B.waitForSelector('.box3d');
  await A.waitForTimeout(3800);
  const axA=await A.evaluate(()=>document.getElementById('gCtl').classList.contains('x')?'x':'z');
  const rx0=[await A.evaluate(()=>window.__rx), await B.evaluate(()=>window.__rx)], tx0=[await A.evaluate(()=>window.__tx), await B.evaluate(()=>window.__tx)];
  await A.waitForTimeout(300); await A.screenshot({path:'co_play_'+id+'_A.png'}); await B.screenshot({path:'co_play_'+id+'_B.png'});
  const pts=plan(lvl.grid); let wi=1; const ts=Date.now(); let done=false;
  while(Date.now()-ts<120000){
    const st=await A.evaluate(()=>window.__coopGame?.state()); if(!st){done=true;break;} if(st.won){done=true;break;}
    const [tx,tz]=pts[Math.min(wi,pts.length-1)]; if(Math.hypot(tx-st.x,tz-st.z)<0.22 && wi<pts.length-1) wi++;
    if(st.fallT){ /* respawn: back to nearest waypoint */ wi=1; let best=1e9; pts.forEach(([px,pz],i)=>{const d=Math.hypot(px-st.x,pz-st.z); if(d<best){best=d;}}); }
    const ux=Math.max(-1,Math.min(1,(tx-st.x)*1.6-st.vx*0.9)), uz=Math.max(-1,Math.min(1,(tz-st.z)*1.6-st.vz*0.9));
    const a=axA==='x'?ux:uz, bb=axA==='x'?uz:ux;
    await A.evaluate(v=>window.__coopGame?.setInput(v),a); await B.evaluate(v=>window.__coopGame?.setInput(v),bb);
    await A.waitForTimeout(40);
  }
  // re-plan after respawn handled crudely: nearest waypoint index
  await A.waitForSelector('.res',{timeout:15000}); await B.waitForSelector('.res',{timeout:15000});
  const secs=(Date.now()-ts)/1000;
  const rx=[(await A.evaluate(()=>window.__rx))-rx0[0],(await B.evaluate(()=>window.__rx))-rx0[1]], txx=[(await A.evaluate(()=>window.__tx))-tx0[0],(await B.evaluate(()=>window.__tx))-tx0[1]];
  stats.push({id, secs:secs.toFixed(1), resA:await A.$eval('.res p',e=>e.textContent), payloadBps:{A_tx:Math.round(txx[0]/secs),B_tx:Math.round(txx[1]/secs),A_rx:Math.round(rx[0]/secs),B_rx:Math.round(rx[1]/secs)}});
  await A.screenshot({path:`co_res_${id}.png`});
}
await A.screenshot({path:'co_last.png'});
console.log(JSON.stringify(stats,null,1));
const voice=[await A.evaluate(()=>document.querySelector('.vst')?.textContent), await B.evaluate(()=>document.querySelector('.vst')?.textContent)]; console.log('voice', voice);
for(const [n,pg,u] of [['A',A,'me'],['B',B,'p']]){ const r=await pg.evaluate(u=>({pts:Object.entries(window.__store.points).filter(([k])=>k.startsWith('coop_')).map(([k,v])=>k+'='+v.amount), prog:window.__store.coop[u], owned:window.__store.avatars[u]?.owned, writes:window.__writes}),u); console.log(n, JSON.stringify(r)); }
console.log('ERRORS', errs.length?errs.slice(0,20):'none'); await b.close();
