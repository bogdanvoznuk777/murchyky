import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path';
const DEV=new URL('.',import.meta.url).pathname.replace(/\/$/,''), ROOT=DEV.replace(/\/dev$/,'');
const GAME=process.argv[2]||ROOT, MOCK=DEV+'/mock2';
const U=await import(GAME+'/util.js'); const {SURVEY}=await import(GAME+'/data.js');
const ans=(n,r)=>Object.fromEntries(SURVEY.map(q=>[q.id, q.id==='name'?n:q.id==='role'?r:q.opts?q.opts[0]:q.type==='scale'?'5':'x']));
const seed={ users:{p:{nick:'оля',ntfy:'t1'}, me:{nick:'богдан',ntfy:'t2'}}, surveys:{p:{answers:ans('Оля','Вона'),done:true}, me:{answers:ans('Богдан','Він'),done:true}}, members:{me:{}},
  points:{a:{uid:'me',amount:1300,reason:'x',week:'2026-11-02',date:'2026-11-03'}, b:{uid:'p',amount:1300,reason:'x',week:'2026-11-02',date:'2026-11-03'}}, rewards:{}, quiz:{}, wordle:{}, challenges:{}, duels:{}, spend:{}, avatars:{}, art:{}, artimg:{}, live:{}, audio:{} };
const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:390,height:844}});
const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR '+e.message));
await pg.addInitScript(s=>{window.__SEED=s}, seed);
await pg.route('**/*', r=>{ const u=r.request().url();
  if(u.startsWith('https://ntfy.sh')) return r.fulfill({status:200,body:'{}'});
  if(u.includes('gstatic.com/firebasejs')){ const f=u.includes('auth')?'auth.js':u.includes('firestore')?'fs.js':'app.js'; return r.fulfill({contentType:'text/javascript',body:fs.readFileSync(MOCK+'/'+f)}); }
  if(u.startsWith('http://localhost:5555/')){ let p=new URL(u).pathname.slice(1)||'index.html'; const fp=path.join(GAME,p); if(!fs.existsSync(fp)) return r.fulfill({status:404}); return r.fulfill({contentType:p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(fp)}); }
  return r.abort(); });
await pg.goto('http://localhost:5555/'); await pg.waitForSelector('#authForm');
await pg.fill('#nick','богдан'); await pg.fill('#pass','123456'); await pg.click('button[type=submit]');
await pg.waitForSelector('.tiles'); await pg.waitForTimeout(1500);
const w0=await pg.evaluate(()=>window.__writes||0);
console.log('writes on app start:', w0);
await pg.evaluate((d)=>{ window.__store.duels['dx']={date:d, game:'mice', from:'p', to:'me', status:'accepted', seed:1, createdAt:Date.now(), res:{p:{score:5},me:{score:9}}}; window.__fire(); }, U.kyivDate());
await pg.waitForTimeout(5000); const t0=Date.now()-5000; const w=(await pg.evaluate(()=>window.__writes))-w0;
console.log('writes from ONE finished duel:', w, 'in', Date.now()-t0, 'ms', '');
const log=await pg.evaluate(()=>window.__wlog); const cnt={}; for(const c of log) cnt[c]=(cnt[c]||0)+1; console.log(cnt);
const fin=await pg.evaluate(()=>window.__store.duels.dx.final); const dp=await pg.evaluate(()=>Object.entries(window.__store.points).filter(([k])=>k.startsWith('d_dx')).map(([k,v])=>k+'='+v.amount)); console.log('final', JSON.stringify(fin), dp);
console.log('ERRORS', errs.length?errs:'none'); await b.close();
