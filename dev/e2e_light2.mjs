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
await A.evaluate(()=>document.querySelector('[data-c=pick][data-id="2-3"]').click());
await B.waitForSelector('[data-c=accept]'); await B.click('[data-c=accept]');
await A.waitForSelector('.box3d'); await B.waitForSelector('.box3d'); await A.waitForTimeout(3900);
const roleA=await A.evaluate(()=>window.__coopGame.info().role); const WK=roleA==='walker'?A:B, NV=roleA==='walker'?B:A; const wkName=roleA==='walker'?['me','богдан']:['p','оля'];
// рух
await WK.evaluate(()=>window.__coopGame.setInput(1,0)); await WK.waitForTimeout(1200); await WK.evaluate(()=>window.__coopGame.setInput(0,0)); await WK.waitForTimeout(400);
const ws=await WK.evaluate(()=>window.__coopGame.state()); console.log('walker moved x', ws.x.toFixed(2));
// штурман відчиняє двері 1 -> мандрівник бачить маску
await NV.evaluate(()=>window.__coopGame.pressLever(0)); await WK.waitForTimeout(500);
console.log('walker mask after lever', (await WK.evaluate(()=>window.__coopGame.state())).mask);
// підказка (пінг) і мяу
const box=await NV.$eval('.box3d',e=>{const r=e.getBoundingClientRect(); return [r.left+r.width/2, r.top+r.height/2];});
await NV.mouse.click(box[0],box[1]); await WK.waitForTimeout(500);
await WK.click('#lmeow'); await NV.waitForTimeout(500); console.log('nav flash:', await NV.evaluate(()=>document.getElementById('gOver').textContent));
await WK.waitForTimeout(200); await WK.screenshot({path:'li_ping_walker.png'});
// пауза
await NV.evaluate(async()=>{ const N=await import('/coopnet.js'); N.setPresence({v:'away'}); }); await WK.waitForTimeout(800);
console.log('walker pause:', await WK.evaluate(()=>document.getElementById('gOver').textContent));
await WK.evaluate(()=>window.__coopGame.setInput(1,0)); await WK.waitForTimeout(600); const p1=await WK.evaluate(()=>window.__coopGame.state().x); await WK.waitForTimeout(500); const p2=await WK.evaluate(()=>window.__coopGame.state().x); console.log('frozen while paused', Math.abs(p2-p1)<1e-6);
await NV.evaluate(async()=>{ const N=await import('/coopnet.js'); N.setPresence({v:'play'}); }); await WK.waitForTimeout(800);
const before=await WK.evaluate(()=>window.__coopGame.state());
// перезахід мандрівника
await WK.reload(); await WK.waitForSelector('#authForm'); await WK.fill('#nick',wkName[1]); await WK.fill('#pass','123456'); await WK.click('button[type=submit]'); await WK.waitForSelector('.tiles');
await WK.click('[data-to=coop]'); await WK.waitForSelector('.box3d',{timeout:8000}); await WK.waitForTimeout(1500);
const after=await WK.evaluate(()=>window.__coopGame.state()); console.log('rejoin walker', before.x.toFixed(2),'->',after.x.toFixed(2),'mask',after.mask);
// перезахід штурмана
await NV.reload(); await NV.waitForSelector('#authForm'); await NV.fill('#nick',roleA==='walker'?'оля':'богдан'); await NV.fill('#pass','123456'); await NV.click('button[type=submit]'); await NV.waitForSelector('.tiles');
await NV.click('[data-to=coop]'); await NV.waitForSelector('.box3d',{timeout:8000}); await NV.waitForTimeout(1200);
console.log('rejoin nav mask', (await NV.evaluate(()=>window.__coopGame.state())).mask, 'lever lit', await NV.evaluate(()=>document.querySelector('[data-lv="0"]').classList.contains('on')));
await NV.click('#gQuit'); await NV.click('#gQuit'); await A.waitForSelector('.lvls',{timeout:5000}); await B.waitForSelector('.lvls',{timeout:5000}); console.log('quit ok');
console.log('ERRORS', errs.filter(e=>!e.includes('ERR_FAILED')).length?errs.filter(e=>!e.includes('ERR_FAILED')):'none'); await b.close();
