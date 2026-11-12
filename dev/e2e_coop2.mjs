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
await A.evaluate(()=>document.querySelector('[data-c=pick][data-id="1-1"]').click());
await B.waitForSelector('[data-c=accept]'); await B.click('[data-c=accept]');
await A.waitForSelector('.box3d'); await B.waitForSelector('.box3d'); await A.waitForTimeout(3900);
// рух: A (x) вправо
await A.evaluate(()=>window.__coopGame.setInput(1)); await A.waitForTimeout(1500);
const s1=await A.evaluate(()=>window.__coopGame.state()); console.log('moved x', s1.x.toFixed(2));
// B бачить клубок там же?
const dB=await B.evaluate(()=>1); 
// пауза: B відходить
await B.evaluate(async()=>{ const N=await import('/coopnet.js'); N.setPresence({v:'away'}); });
await A.waitForTimeout(800);
const p1=await A.evaluate(()=>document.getElementById('gOver').textContent); const s2=await A.evaluate(()=>window.__coopGame.state());
await A.waitForTimeout(800); const s3=await A.evaluate(()=>window.__coopGame.state());
console.log('pause overlay:', p1, '| frozen:', Math.abs(s3.x-s2.x)<1e-6);
await B.evaluate(async()=>{ const N=await import('/coopnet.js'); N.setPresence({v:'play'}); });
await A.waitForTimeout(800); console.log('resumed overlay empty:', (await A.evaluate(()=>document.getElementById('gOver').textContent))==='');
const before=await A.evaluate(()=>window.__coopGame.state());
// перезахід ведучого
await A.reload(); await A.waitForSelector('#authForm'); await A.fill('#nick','богдан'); await A.fill('#pass','123456'); await A.click('button[type=submit]'); await A.waitForSelector('.tiles');
await A.click('[data-to=coop]'); await A.waitForSelector('.box3d',{timeout:8000}); await A.waitForTimeout(1500);
const after=await A.evaluate(()=>window.__coopGame.state()); console.log('rejoin pos', before.x.toFixed(2), '->', after.x.toFixed(2));
// вихід
await A.click('#gQuit'); await A.click('#gQuit');
await A.waitForSelector('.lvls',{timeout:5000}); await B.waitForSelector('.lvls',{timeout:5000}); console.log('quit -> both on map ✓');
// повернення на головну закриває зʼєднання
await A.click('.back'); await A.waitForSelector('.tiles'); console.log('home ok');
console.log('ERRORS', errs.filter(e=>!e.includes('ERR_FAILED')).length?errs:'none'); await b.close();
