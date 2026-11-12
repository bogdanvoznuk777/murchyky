import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path';
const DEV=new URL('.',import.meta.url).pathname.replace(/\/$/,''), ROOT=DEV.replace(/\/dev$/,'');
const GAME=process.argv[2]||ROOT, MOCK=DEV+'/mock';
const U=await import(GAME+'/util.js'); const {SURVEY}=await import(GAME+'/data.js');
const ans=(n,r)=>Object.fromEntries(SURVEY.map(q=>[q.id, q.id==='name'?n:q.id==='role'?r:q.opts?q.opts[0]:q.type==='scale'?'5':'x']));
const seed={ users:{p:{nick:'оля'}, me:{nick:'богдан'}}, surveys:{p:{answers:ans('Оля','Вона'),done:true}, me:{answers:ans('Богдан','Він'),done:true}}, members:{me:{}}, points:{}, rewards:{}, quiz:{}, wordle:{}, challenges:{}, duels:{}, spend:{}, avatars:{} };
const b=await chromium.launch();
for (const rm of ['no-preference','reduce']) {
  const ctx=await b.newContext({viewport:{width:390,height:844},reducedMotion:rm}); const pg=await ctx.newPage();
  await pg.addInitScript(s=>{window.__SEED=s}, seed);
  await pg.route('**/*', r=>{ const u=r.request().url();
    if(u.includes('gstatic.com/firebasejs')){ const f=u.includes('auth')?'auth.js':u.includes('firestore')?'fs.js':'app.js'; return r.fulfill({contentType:'text/javascript',body:fs.readFileSync(MOCK+'/'+f)}); }
    if(u.startsWith('http://localhost:5555/')){ let p=new URL(u).pathname.slice(1)||'index.html'; const fp=path.join(GAME,p); if(!fs.existsSync(fp)) return r.fulfill({status:404}); const ct=p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html'; return r.fulfill({contentType:ct,body:fs.readFileSync(fp)}); }
    return r.abort(); });
  await pg.goto('http://localhost:5555/'); await pg.waitForSelector('#authForm');
  await pg.fill('#nick','богдан'); await pg.fill('#pass','123456'); await pg.click('button[type=submit]');
  await pg.waitForSelector('.kitty'); await pg.evaluate(()=>document.querySelectorAll('.kitty').forEach(k=>k.className='kitty walk'));
  const a=[]; for(let i=0;i<3;i++){ a.push(await pg.evaluate(()=>document.querySelector('.kitty .lh1 .up')?.getAttribute('transform'))); await pg.waitForTimeout(200); }
  console.log(rm, a);
  await ctx.close();
}
await b.close();
