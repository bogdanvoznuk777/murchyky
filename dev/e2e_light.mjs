import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path';
const DEV=new URL('.',import.meta.url).pathname.replace(/\/$/,''), ROOT=DEV.replace(/\/dev$/,'');
const GAME=ROOT, MOCK=DEV+'/mock4', LAT=+(process.env.LAT||70), LEVELS=(process.env.LEVELS||'1-1').split(',');
const {SURVEY}=await import(GAME+'/data.js'); const {levelById}=await import(GAME+'/levels.js');
const ans=(n,r)=>Object.fromEntries(SURVEY.map(q=>[q.id, q.id==='name'?n:q.id==='role'?r:q.opts?q.opts[0]:q.type==='scale'?'5':'x']));
const seedFor=(uid)=>({ users:{p:{nick:'оля'}, me:{nick:'богдан'}}, surveys:{p:{answers:ans('Оля','Вона'),done:true}, me:{answers:ans('Богдан','Він'),done:true}}, members:{[uid]:{}},
  points:{a:{uid:'me',amount:3300,reason:'x',week:'2026-11-02',date:'2026-11-03'}, b:{uid:'p',amount:3300,reason:'x',week:'2026-11-02',date:'2026-11-03'}}, rewards:{}, quiz:{}, wordle:{}, challenges:{}, duels:{}, spend:{}, avatars:{}, art:{}, artimg:{}, live:{}, audio:{}, coop:{me:{done:Object.fromEntries(['1-1','1-2','1-3','1-4','1-5',...(process.env.PRE||'').split(',').filter(Boolean)].map(k=>[k,{t:1}]))},p:{done:Object.fromEntries(['1-1','1-2','1-3','1-4','1-5',...(process.env.PRE||'').split(',').filter(Boolean)].map(k=>[k,{t:1}]))}} });
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
const {trapOn}=await import(GAME+'/lighthouse.js');
function plan(grid, levers){ const H=grid.length,W=grid[0].length; let S; grid.forEach((r,y)=>[...r].forEach((c,x)=>{if(c==='S')S=[x,y];}));
  const lm=levers.map(s=>[...s].reduce((m,d)=>m|1<<(+d-1),0)); const pass=(c,m)=>c!=='#'&&!(/[1-9]/.test(c)&&!(m&1<<(+c-1)));
  const key=(x,y,m,f)=>[x,y,m,f].join(','); const prev=new Map(); prev.set(key(...S,0,0),null); const q=[[...S,0,0]]; let end=null;
  while(q.length){ const [x,y,m,f]=q.shift(); const k0=key(x,y,m,f); if(grid[y][x]==='G'&&f){end=k0;break;}
    const nb=[]; for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,c=grid[ny][nx]; if(!pass(c,m))continue; const nf=f||c==='F'?1:0; if(c==='G'&&!nf)continue; nb.push([nx,ny,m,nf,null]);}
    lm.forEach((l,i)=>nb.push([x,y,m^l,f,i]));
    for(const [nx,ny,nm,nf,lv] of nb){ const k=key(nx,ny,nm,nf); if(prev.has(k))continue; prev.set(k,[k0,lv]); q.push([nx,ny,nm,nf]); } }
  const acts=[]; for(let k=end;k;){ const pv=prev.get(k); if(!pv)break; const [x,y]=k.split(',').map(Number); acts.unshift(pv[1]!=null?{lever:pv[1]}:{x:x-W/2+0.5,z:y-H/2+0.5,c:grid[y][x]}); k=pv[0]; } return acts; }
const stats=[];
for(const id of (process.env.LEVELS||'2-1,2-2,2-3,2-4,2-5').split(',')){
  const lvl=levelById(id);
  await A.evaluate(id=>document.querySelector(`[data-c=pick][data-id="${id}"]`).click(), id);
  await B.waitForSelector('[data-c=accept]',{timeout:8000}); await B.click('[data-c=accept]');
  await A.waitForSelector('.box3d'); await B.waitForSelector('.box3d'); await A.waitForTimeout(3900);
  const roleA=await A.evaluate(()=>window.__coopGame.info().role); const WK=roleA==='walker'?A:B, NV=roleA==='walker'?B:A;
  await WK.screenshot({path:`li_${id}_walker.png`}); await NV.screenshot({path:`li_${id}_nav.png`});
  const rx0=[await WK.evaluate(()=>window.__rx), await NV.evaluate(()=>window.__rx)];
  const acts=plan(lvl.grid, lvl.levers); const ts=Date.now(); let i=0, hitsSeen=0;
  while(i<acts.length && Date.now()-ts<150000){
    const a=acts[i];
    if(a.lever!=null){ await NV.evaluate(n=>window.__coopGame.pressLever(n), a.lever); await WK.waitForTimeout(450); i++; continue; }
    const st=await WK.evaluate(()=>window.__coopGame.state()); if(st.won) break;
    if(st.hitT){ await WK.evaluate(()=>window.__coopGame.setInput(0,0)); await WK.waitForTimeout(800); // respawn: find nearest preceding move action to checkpoint
      const s2=await WK.evaluate(()=>window.__coopGame.state()); let best=0,bd=1e9; for(let j=0;j<=i;j++){ if(acts[j].lever!=null) continue; const d=Math.hypot(acts[j].x-s2.x,acts[j].z-s2.z); if(d<bd){bd=d;best=j;} } i=best; hitsSeen++; continue; }
    const dx=a.x-st.x, dz=a.z-st.z, d=Math.hypot(dx,dz);
    if(d<0.12){ i++; continue; }
    if((a.c==='^'||a.c==='v')){ const inf=await WK.evaluate(()=>window.__coopGame.info()); const t=inf.now-inf.at, ph=((t%2400)+2400)%2400; const offStart = a.c==='^'?0:1200; const into=(ph-offStart+2400)%2400; if(!(into<350 && !trapOn(a.c,t))){ await WK.evaluate(()=>window.__coopGame.setInput(0,0)); await WK.waitForTimeout(30); continue; } }
    await WK.evaluate(([x,z])=>window.__coopGame.setInput(x,z), [dx/d, dz/d]); await WK.waitForTimeout(25);
  }
  await WK.evaluate(()=>window.__coopGame?.setInput(0,0));
  await A.waitForSelector('.res',{timeout:15000}); await B.waitForSelector('.res',{timeout:15000});
  const secs=(Date.now()-ts)/1000; const rx=[(await WK.evaluate(()=>window.__rx))-rx0[0],(await NV.evaluate(()=>window.__rx))-rx0[1]];
  stats.push(id+' '+secs.toFixed(0)+'s res="'+(await A.$eval('.res p',e=>e.textContent))+'" hits='+hitsSeen+' navRxBps='+Math.round(rx[1]/secs)+' walkerRxBps='+Math.round(rx[0]/secs)+' walker='+(roleA==='walker'?'A':'B'));
}
console.log(stats.join('\n'));
for(const [n,pg,u] of [['A',A,'me'],['B',B,'p']]){ const r=await pg.evaluate(u=>({pts:Object.entries(window.__store.points).filter(([k])=>k.startsWith('coop_2')).map(([k,v])=>k+'='+v.amount).join(','), owned:window.__store.avatars[u]?.owned, writes:window.__writes}),u); console.log(n, JSON.stringify(r)); }
console.log('ERRORS', errs.filter(e=>!e.includes('ERR_FAILED')).length?errs.filter(e=>!e.includes('ERR_FAILED')):'none'); await b.close();
