import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path';
const DEV=new URL('.',import.meta.url).pathname.replace(/\/$/,''), ROOT=DEV.replace(/\/dev$/,'');
const GAME=ROOT, MOCK=DEV+'/mock4', LAT=+(process.env.LAT||70), LEVELS=(process.env.LEVELS||'1-1').split(',');
const {SURVEY}=await import(GAME+'/data.js'); const {levelById}=await import(GAME+'/levels.js');
const ans=(n,r)=>Object.fromEntries(SURVEY.map(q=>[q.id, q.id==='name'?n:q.id==='role'?r:q.opts?q.opts[0]:q.type==='scale'?'5':'x']));
const seedFor=(uid)=>({ users:{p:{nick:'оля'}, me:{nick:'богдан'}}, surveys:{p:{answers:ans('Оля','Вона'),done:true}, me:{answers:ans('Богдан','Він'),done:true}}, members:{[uid]:{}},
  points:{a:{uid:'me',amount:3300,reason:'x',week:'2026-11-02',date:'2026-11-03'}, b:{uid:'p',amount:3300,reason:'x',week:'2026-11-02',date:'2026-11-03'}}, rewards:{}, quiz:{}, wordle:{}, challenges:{}, duels:{}, spend:{}, avatars:{}, art:{}, artimg:{}, live:{}, audio:{}, coop:{me:{done:Object.fromEntries(['1-1','1-2','1-3','1-4','1-5','2-1','2-2','2-3','2-4','2-5',...(process.env.PRE||'').split(',').filter(Boolean)].map(k=>[k,{t:1}]))},p:{done:Object.fromEntries(['1-1','1-2','1-3','1-4','1-5','2-1','2-2','2-3','2-4','2-5',...(process.env.PRE||'').split(',').filter(Boolean)].map(k=>[k,{t:1}]))}} });
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
function plan(grid, sa, sb, latch0){ const H=grid.length,W=grid[0].length; const xs=[]; const plates={};
  grid.forEach((r,y)=>[...r].forEach((c,x)=>{ if(c==='x')xs.push(y*W+x); if(/[a-d]/.test(c)) (plates[c] ||= []).push(y*W+x);}));
  const at=i=>grid[Math.floor(i/W)][i%W]; const walk=c=>c!=='#'&&c!=='w';
  const open=(c,o,l)=>{ if(c==='X') return l; if(/[A-D]/.test(c)) return (plates[c.toLowerCase()]||[]).includes(o); return true; };
  const key=(a,b,l,f)=>a+','+b+','+l+','+f; const s0=[sa,sb,latch0,0]; const prev=new Map([[key(...s0),null]]); const q=[s0]; let end=null;
  while(q.length){ let [a,b,l,f]=q.shift(); const k0=key(a,b,l,f);
    if(at(a)==='G'&&at(b)==='G'&&a!==b&&f){end=k0;break;}
    for(const who of [0,1]) for(const d of [1,-1,W,-W]){ const cur=who?b:a, n=cur+d, c=at(n); if(!walk(c)) continue; const o=who?a:b; if(!open(c,o,l)) continue;
      let na=who?a:n, nb=who?n:b, nl=l, nf=f||at(n)==='F'?1:0; if(!nl&&xs.length&&xs.every(p=>p===na||p===nb)) nl=1;
      const k=key(na,nb,nl,nf); if(prev.has(k)) continue; prev.set(k,[k0,who,n]); q.push([na,nb,nl,nf]); } }
  const acts=[]; for(let k=end;k;){ const pv=prev.get(k); if(!pv) break; acts.unshift({who:pv[1], x:pv[2]%W-W/2+0.5, z:Math.floor(pv[2]/W)-H/2+0.5, c:at(pv[2])}); k=pv[0]; } return acts; }
const stats=[];
for(const id of (process.env.LEVELS||'3-1,3-2,3-3,3-4,3-5').split(',')){
  const lvl=levelById(id); const H=lvl.grid.length, W=lvl.grid[0].length;
  await A.evaluate(id=>document.querySelector(`[data-c=pick][data-id="${id}"]`).click(), id);
  await B.waitForSelector('[data-c=accept]',{timeout:8000}); await B.click('[data-c=accept]');
  await A.waitForSelector('.box3d'); await B.waitForSelector('.box3d'); await A.waitForTimeout(3900);
  const roleA=await A.evaluate(()=>window.__coopGame.info().role); const P={A:roleA==='A'?A:B, B:roleA==='A'?B:A};
  await P.A.screenshot({path:`ga_${id}_A.png`}); await P.B.screenshot({path:`ga_${id}_B.png`});
  const rx0=await A.evaluate(()=>window.__rx);
  const cellOf=(s)=>Math.floor(s.z+H/2)*W+Math.floor(s.x+W/2);
  const replan=async()=>{ const sa=await P.A.evaluate(()=>window.__coopGame.state()), sb=await P.B.evaluate(()=>window.__coopGame.state()); return plan(lvl.grid, cellOf(sa), cellOf(sb), sa.latch.includes('x')?1:0); };
  let acts=await replan(); let i=0; const ts=Date.now(); let hits=0;
  while(Date.now()-ts<240000){
    if(await A.$('.res')) break; const sa=await P.A.evaluate(()=>window.__coopGame.state()); if(sa.won) break;
    if(i>=acts.length){ await A.waitForTimeout(200); const r=await A.$('.res'); if(r) break; continue; }
    const a=acts[i], pg=a.who?P.B:P.A, st=a.who?await P.B.evaluate(()=>window.__coopGame.state()):sa;
    if(st.hitT){ await pg.evaluate(()=>window.__coopGame.setInput(0,0)); await pg.waitForTimeout(900); hits++; acts=await replan(); i=0; continue; }
    const dx=a.x-st.x, dz=a.z-st.z, d=Math.hypot(dx,dz);
    if(d<0.12){ await pg.evaluate(()=>window.__coopGame.setInput(0,0)); i++; continue; }
    // бджоли: чекаємо, якщо бджола близько до цілі
    const inf=await pg.evaluate(()=>window.__coopGame.info()); const danger=inf.bees.some(([bx,bz])=>Math.abs(bz-a.z)<0.5 && Math.abs(bx-a.x)<1.7) && Math.abs(st.z-a.z)>0.3;
    if(danger){ await pg.evaluate(()=>window.__coopGame.setInput(0,0)); await pg.waitForTimeout(30); continue; }
    await pg.evaluate(([x,z])=>window.__coopGame.setInput(x,z),[dx/d,dz/d]); await pg.waitForTimeout(25);
  }
  for(const pg of [A,B]) await pg.evaluate(()=>window.__coopGame?.setInput(0,0));
  await A.waitForSelector('.res',{timeout:15000}); await B.waitForSelector('.res',{timeout:15000});
  const secs=(Date.now()-ts)/1000; const rx=(await A.evaluate(()=>window.__rx))-rx0;
  stats.push(id+' '+secs.toFixed(0)+'s res="'+(await A.$eval('.res p',e=>e.textContent))+'" botHits='+hits+' A_rxBps='+Math.round(rx/secs));
}
console.log(stats.join('\n'));
for(const [n,pg,u] of [['A',A,'me'],['B',B,'p']]){ const r=await pg.evaluate(u=>({pts:Object.entries(window.__store.points).filter(([k])=>k.startsWith('coop_3')).map(([k,v])=>k+'='+v.amount).join(','), owned:window.__store.avatars[u]?.owned, writes:window.__writes}),u); console.log(n, JSON.stringify(r)); }
console.log('ERRORS', errs.filter(e=>!e.includes('ERR_FAILED')).length?errs.filter(e=>!e.includes('ERR_FAILED')):'none'); await b.close();
