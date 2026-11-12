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
await A.evaluate(()=>document.querySelector('[data-c=pick][data-id="3-3"]').click());
await B.waitForSelector('[data-c=accept]'); await B.click('[data-c=accept]');
await A.waitForSelector('.box3d'); await B.waitForSelector('.box3d'); await A.waitForTimeout(3900);
const roleA=await A.evaluate(()=>window.__coopGame.info().role); const PA=roleA==='A'?A:B, PB=roleA==='A'?B:A;
const lvl=levelById('3-3'); const H=lvl.grid.length,W=lvl.grid[0].length; const C=(x,y)=>[x-W/2+0.5,y-H/2+0.5];
async function goto(pg,[tx,tz]){ for(let k=0;k<300;k++){ const s=await pg.evaluate(()=>window.__coopGame.state()); const dx=tx-s.x,dz=tz-s.z,d=Math.hypot(dx,dz); if(d<0.1) break; await pg.evaluate(([x,z])=>window.__coopGame.setInput(x,z),[dx/d,dz/d]); await pg.waitForTimeout(25);} await pg.evaluate(()=>window.__coopGame.setInput(0,0)); }
// 1) ваги: лише один на вазі -> ворота закриті
await goto(PA,C(3,3)); await goto(PA,C(3,4)); await goto(PA,C(5,4)); await PA.waitForTimeout(300);
let s=await PA.evaluate(()=>window.__coopGame.state()); console.log('A blocked by closed X gate (z stays above row5):', s.z < (5-H/2), 'latch', JSON.stringify(s.latch));
await goto(PA,C(3,3)); await goto(PB,C(9,3)); await A.waitForTimeout(700);
const la=await PA.evaluate(()=>window.__coopGame.state().latch), lb=await PB.evaluate(()=>window.__coopGame.state().latch); console.log('latch both', la, lb, 'flash', await A.evaluate(()=>document.getElementById('gOver').textContent));
// сходять із ваг — ворота лишаються відкриті
await goto(PA,C(5,4)); await goto(PA,C(5,5)); await goto(PA,C(5,6)); s=await PA.evaluate(()=>window.__coopGame.state()); console.log('A passed latched gate:', s.z > (5-H/2));
// 2) плита: A стає на a(2,7), B проходить ворота A (7,8)? -> ворота A відкриває плита a
await goto(PA,C(2,7)); await goto(PB,C(9,4)); await goto(PB,C(7,4)); await goto(PB,C(7,5)); await goto(PB,C(7,6)); await goto(PB,C(7,7)); await PB.waitForTimeout(300); await goto(PB,C(7,8)); await goto(PB,C(7,9));
s=await PB.evaluate(()=>window.__coopGame.state()); console.log('B passed momentary gate A while A on plate:', Math.floor(s.z+H/2)===9);
// A сходить з плити -> ворота A закриваються для B на шляху назад
await goto(PA,C(3,7)); await PB.waitForTimeout(400); await goto(PB,C(7,8)); await goto(PB,C(7,7)); s=await PB.evaluate(()=>window.__coopGame.state()); console.log('B blocked when plate released:', Math.floor(s.z+H/2)>=8);
// 3) вода
await goto(PA,C(3,6)); await PA.evaluate(()=>window.__coopGame.setInput(0,1)); await PA.waitForTimeout(100);
// бджола: стоїмо в її ряду
const bs=await PA.evaluate(()=>window.__coopGame.info().bees); console.log('bees', bs.length);
// пауза + перезахід
const before=await PB.evaluate(()=>window.__coopGame.state());
await PB.reload(); await PB.waitForSelector('#authForm'); await PB.fill('#nick',roleA==='A'?'оля':'богдан'); await PB.fill('#pass','123456'); await PB.click('button[type=submit]'); await PB.waitForSelector('.tiles');
const ov=await PA.evaluate(()=>document.getElementById('gOver').textContent); console.log('partner away overlay:', ov);
await PB.click('[data-to=coop]'); await PB.waitForSelector('.box3d',{timeout:8000}); await PB.waitForTimeout(1200);
const after=await PB.evaluate(()=>window.__coopGame.state()); console.log('rejoin', before.x.toFixed(2),before.z.toFixed(2),'->',after.x.toFixed(2),after.z.toFixed(2),'latch',after.latch);
await PA.click('#gQuit'); await PA.click('#gQuit'); await A.waitForSelector('.lvls',{timeout:5000}); await B.waitForSelector('.lvls',{timeout:5000}); console.log('quit ok');
console.log('ERRORS', errs.filter(e=>!e.includes('ERR_FAILED')).length?errs.filter(e=>!e.includes('ERR_FAILED')):'none'); await b.close();
