import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path';
const DEV=new URL('.',import.meta.url).pathname.replace(/\/$/,''), ROOT=DEV.replace(/\/dev$/,'');
const GAME=ROOT, MOCK=DEV+'/mock2';
const U=await import(GAME+'/util.js'); const {SURVEY}=await import(GAME+'/data.js');
const today=U.kyivDate();
const ans=(n,r)=>Object.fromEntries(SURVEY.map(q=>[q.id, q.id==='name'?n:q.id==='role'?r:q.opts?q.opts[0]:q.type==='scale'?'5':'x']));
const seed={ users:{p:{nick:'оля'}, me:{nick:'богдан'}}, surveys:{p:{answers:ans('Оля','Вона'),done:true}, me:{answers:ans('Богдан','Він'),done:true}}, members:{me:{}}, points:{x1:{uid:'me',amount:1300,reason:'x',week:'2026-11-02',date:'2026-11-03'},x2:{uid:'p',amount:1250,reason:'x',week:'2026-11-02',date:'2026-11-03'}}, rewards:{}, quiz:{}, wordle:{}, challenges:{}, duels:{}, spend:{}, avatars:{}, art:{}, artimg:{}, live:{}, audio:{} };
const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR '+e.message)); pg.on('console',m=>{if(m.type()==='error'&&!m.text().includes('ERR_FAILED'))errs.push(m.text())});
await pg.addInitScript(s=>{window.__SEED=s}, seed);
await pg.route('**/*', r=>{ const u=r.request().url();
  if(u.startsWith('https://ntfy.sh')) return r.fulfill({status:200,body:'{}'});
  if(u.includes('gstatic.com/firebasejs')){ const f=u.includes('auth')?'auth.js':u.includes('firestore')?'fs.js':'app.js'; return r.fulfill({contentType:'text/javascript',body:fs.readFileSync(MOCK+'/'+f)}); }
  if(u.startsWith('http://localhost:5555/')){ let p=new URL(u).pathname.slice(1)||'index.html'; const fp=path.join(GAME,p); if(!fs.existsSync(fp)) return r.fulfill({status:404}); const ct=p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.png')?'image/png':'text/html'; return r.fulfill({contentType:ct,body:fs.readFileSync(fp)}); }
  return r.abort(); });
const shot=n=>pg.screenshot({path:`/tmp/w_${n}.png`});
const act=async(a,attrs={})=>pg.evaluate(([a,attrs])=>{ const b=document.createElement('button'); b.dataset.a=a; Object.assign(b.dataset,attrs); document.getElementById('app').appendChild(b); b.click(); },[a,attrs]);
const st=()=>pg.evaluate(()=>window.__store);
const mut=(fn,arg)=>pg.evaluate(([f,arg])=>{ new Function('S','arg','return ('+f+')(S,arg)')(window.__store,arg); window.__fire(); },[fn.toString(),arg]);
const scribble=async()=>{ const c=await pg.locator('canvas.pad').last().boundingBox(); await pg.mouse.move(c.x+30,c.y+30); await pg.mouse.down(); for(let i=0;i<10;i++) await pg.mouse.move(c.x+30+i*20,c.y+30+(i%2)*40); await pg.mouse.up(); };
await pg.goto('http://localhost:5555/'); await pg.waitForSelector('#authForm');
await pg.fill('#nick','богдан'); await pg.fill('#pass','123456'); await pg.click('button[type=submit]');
await pg.waitForSelector('.tiles'); await pg.waitForTimeout(500); await shot('0home');
// trivia
await act('go',{to:'trivia'}); await pg.waitForSelector('#tvO'); await shot('1trivia');
for(let i=0;i<12;i++){ await pg.locator('#tvO .opt').first().click(); await pg.waitForTimeout(1200); }
let s=await st(); console.log('trivia pts', Object.values(s.points).filter(p=>p.reason==='Робота задарма').reduce((a,p)=>a+p.amount,0));
// memory
await act('go',{to:'workshop'}); await pg.waitForTimeout(200); await shot('2workshop');
await act('artNew',{m:'memory'}); await pg.waitForSelector('canvas.pad'); await scribble(); await pg.fill('#artAns','Перше побачення в парку'); await shot('3memory'); await act('artSend'); await pg.waitForTimeout(300);
s=await st(); const mid=Object.keys(s.art)[0]; console.log('memory', s.art[mid].status, !!s.artimg[mid], (s.art[mid].thumb||'').length);
await mut((S,id)=>{ S.art[id].guesses=[{text:'парк',at:1}]; S.art[id].status='grade'; }, mid);
await act('artOpen',{id:mid}); await pg.waitForTimeout(300); await shot('4grade'); await act('artGrade',{v:'2'}); await pg.waitForTimeout(400);
s=await st(); console.log('memory done', s.art[mid].status, Object.entries(s.points).filter(([k])=>k.startsWith('art_')).map(([k,v])=>k.slice(-1)+'='+v.amount).join(','));
// emoji
await act('artNew',{m:'emoji'}); await pg.fill('#artEmoji','🐱🍕🌧️'); await pg.fill('#artAns','Кіт і піца'); await act('artSend'); await pg.waitForTimeout(300);
// franken
await act('artNew',{m:'franken'}); await pg.waitForSelector('canvas.pad'); await scribble(); await act('artSend'); await pg.waitForTimeout(300);
s=await st(); const fid=Object.keys(s.art).find(k=>k.startsWith('franken')); const img1=s.artimg[fid+'_1'].img;
await mut((S,a)=>{ S.artimg[a.id+'_2']={img:a.img}; S.art[a.id].status='s3'; }, {id:fid, img:img1});
await act('artOpen',{id:fid}); await pg.waitForTimeout(600); await shot('5frank3'); await scribble(); await act('frankSend'); await pg.waitForTimeout(800);
s=await st(); console.log('franken', s.art[fid].status, !!s.artimg[fid]);
// blind
await act('artNew',{m:'blind'}); await pg.waitForTimeout(200); await shot('6blind'); await pg.fill('#artDesc','Угорі ліворуч щось кругле й гаряче, внизу будиночок'); await act('artSend'); await pg.waitForTimeout(300);
s=await st(); const bid=Object.keys(s.art).find(k=>k.startsWith('blind'));
await mut((S,a)=>{ S.art[a.id].thumb=a.img; S.artimg[a.id]={img:a.img}; S.art[a.id].status='rate'; }, {id:bid, img:img1});
await act('artOpen',{id:bid}); await pg.waitForTimeout(300); await shot('7rate'); await act('blindRate',{v:'4'}); await pg.waitForTimeout(400);
// micro
await act('artNew',{m:'micro'}); await pg.setInputFiles('#artFile', GAME+'/icon-512.png'); await pg.waitForSelector('#artPrev img'); await pg.fill('#artAns','іконка'); await act('artSend'); await pg.waitForTimeout(300);
s=await st(); const xid=Object.keys(s.art).find(k=>k.startsWith('micro'));
await mut((S,id)=>{ S.art[id].guesses=[{text:'кіт',at:1}]; S.art[id].status='grade'; }, xid); await act('artOpen',{id:xid}); await pg.waitForTimeout(200); await act('artGrade',{v:'0'}); await pg.waitForTimeout(300);
s=await st(); console.log('micro after wrong', s.art[xid].status, s.art[xid].level);
// live as guesser
await mut((S,d)=>{ S.live['live_t']={date:d,drawer:'p',guesser:'me',word:'кіт',status:'on',startAt:Date.now(),at:Date.now(),strokes:[{c:'#ff5c9a',w:12,p:[100,100,500,500,900,200]}],guesses:[]}; }, today);
await act('liveOpen',{id:'live_t'}); await pg.waitForTimeout(300); await shot('8live'); await pg.fill('#lvIn','собака'); await act('liveGuess'); await pg.waitForTimeout(200); await pg.fill('#lvIn','Кіт'); await act('liveGuess'); await pg.waitForTimeout(600); await shot('9livedone');
s=await st(); console.log('live', s.live.live_t.status, s.live.live_t.pts, !!s.art.live_t);
// live as drawer
await act('artNew',{m:'live'}); await pg.waitForTimeout(200); await pg.locator('[data-a=liveStart]').first().click(); await pg.waitForTimeout(300);
s=await st(); const lid=Object.keys(s.live).find(k=>k!=='live_t'); await mut((S,id)=>{ S.live[id].status='on'; S.live[id].startAt=Date.now(); }, lid); await pg.waitForTimeout(300);
await scribble(); await pg.waitForTimeout(900); s=await st(); console.log('drawer strokes pushed', s.live[lid].strokes.length);
// album
await act('go',{to:'album'}); await pg.waitForTimeout(300); await shot('10album');
s=await st(); const any=Object.keys(s.art).find(k=>s.art[k].status==='done'); await act('artOpen',{id:any}); await pg.waitForTimeout(400); await act('artLike'); await pg.waitForTimeout(300); await shot('11detail');
console.log('TOTAL WRITES (latency mock):', await pg.evaluate(()=>window.__writes), JSON.stringify(await pg.evaluate(()=>{const c={}; for(const x of window.__wlog||[]) c[x]=(c[x]||0)+1; return c;})));
console.log('ERRORS', errs.length?errs:'none'); await b.close();
