import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path';
const DEV=new URL('.',import.meta.url).pathname.replace(/\/$/,''), ROOT=DEV.replace(/\/dev$/,'');
const GAME=ROOT, MOCK=DEV+'/mock2';
const U=await import(GAME+'/util.js'); const {SURVEY}=await import(GAME+'/data.js');
const today=U.kyivDate(), week=U.weekId(today);
const ans=(n,r)=>Object.fromEntries(SURVEY.map(q=>[q.id, q.id==='name'?n:q.id==='role'?r:q.opts?q.opts[0]:q.type==='scale'?'5':'x']));
const seed={ users:{p:{nick:'оля',ntfy:'murchyky-test-p'}, me:{nick:'богдан',ntfy:'murchyky-test-me'}}, surveys:{p:{answers:ans('Оля','Вона'),done:true}, me:{answers:ans('Богдан','Він'),done:true}}, members:{me:{}},
  points:{a:{uid:'me',amount:700,reason:'x',week:'2026-11-02',date:'2026-11-03'}, b:{uid:'p',amount:300,reason:'x',week:'2026-11-02',date:'2026-11-03'}},
  rewards:{}, quiz:{}, wordle:{}, challenges:{}, duels:{}, spend:{},
  avatars:{p:{fur:'ginger',eyes:'green',ears:'straight',pattern:'tabby',owned:['bow','sun'],eq:{head:'bow',eyes:'sun'},name:'Рудик'}} };
const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERR '+e.message)); pg.on('console',m=>{if(m.type()==='error'&&!m.text().includes('ERR_FAILED'))errs.push(m.text())});
const pushes=[];
await pg.addInitScript(s=>{window.__SEED=s}, seed);
await pg.route('**/*', r=>{ const u=r.request().url();
  if(u.startsWith('https://ntfy.sh')){ pushes.push(r.request().postData()); return r.fulfill({status:200,body:'{}'}); }
  if(u.includes('gstatic.com/firebasejs')){ const f=u.includes('auth')?'auth.js':u.includes('firestore')?'fs.js':'app.js'; return r.fulfill({contentType:'text/javascript',body:fs.readFileSync(MOCK+'/'+f)}); }
  if(u.startsWith('http://localhost:5555/')){ let p=new URL(u).pathname.slice(1)||'index.html'; const fp=path.join(GAME,p); if(!fs.existsSync(fp)) return r.fulfill({status:404}); const ct=p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.png')?'image/png':p.endsWith('.json')?'application/json':'text/html'; return r.fulfill({contentType:ct,body:fs.readFileSync(fp)}); }
  return r.abort(); });
const shot=n=>pg.screenshot({path:`/tmp/v_${n}.png`});
const act=async(a,attrs={})=>pg.evaluate(([a,attrs])=>{ const b=document.createElement('button'); b.dataset.a=a; Object.assign(b.dataset,attrs); document.getElementById('app').appendChild(b); b.click(); },[a,attrs]);
const st=()=>pg.evaluate(()=>window.__store);
await pg.goto('http://localhost:5555/'); await pg.waitForSelector('#authForm');
await pg.fill('#nick','богдан'); await pg.fill('#pass','123456'); await pg.click('button[type=submit]');
await pg.waitForSelector('.tiles'); await pg.waitForTimeout(800); await shot('1home');
console.log('kitties', await pg.locator('.kitty').count());
// avatar
await pg.click('[data-to=avatar]'); await pg.waitForSelector('.portrait.big'); await act('avSet',{f:'fur',v:'black'}); await act('avSet',{f:'pattern',v:'tuxedo'}); await act('avSet',{f:'ears',v:'straight'}); await pg.waitForTimeout(300); await shot('2avatar');
// shop
await act('go',{to:'shop'}); await pg.waitForSelector('.shop-grid'); await shot('3shop');
await act('buy',{id:'crown'}); await pg.waitForTimeout(300);
await act('shopCat',{c:'head'}); await pg.waitForTimeout(200); await shot('4shophead');
await act('buy',{id:'wizard'}); await act('gift',{id:'halo'}); await pg.waitForTimeout(300);
let s=await st(); console.log('my av', JSON.stringify(s.avatars.me), '| p owned', s.avatars.p.owned.join(','), '| gifts', JSON.stringify(s.avatars.p.gifts), '| spends', Object.values(s.spend).map(x=>x.item+':'+x.price).join(','));
await act('go',{to:'avatar'}); await act('avTab',{t:'ward'}); await pg.waitForTimeout(200); await shot('5ward');
// duels
await act('go',{to:'duels'}); await pg.waitForTimeout(300); await shot('6duels');
await act('dInvite',{g:'clock'}); await pg.waitForTimeout(300); await shot('7wait');
s=await st(); const did=Object.keys(s.duels)[0]; console.log('duel', did, s.duels[did].status, 'pushes', pushes.length);
await pg.evaluate((id)=>{ const d=window.__store.duels[id]; d.status='accepted'; d.startAt=Date.now()+1500; window.__fire(); }, did);
await pg.waitForTimeout(2600); await shot('8play');
await pg.click('#gb'); await pg.waitForTimeout(10100); await pg.click('#gb'); await pg.waitForTimeout(400); await pg.click('#gb'); await pg.waitForTimeout(9800); await pg.click('#gb'); await pg.waitForTimeout(1800);
await pg.evaluate((id)=>{ const d=window.__store.duels[id]; d.res=d.res||{}; d.res.p={score:0.5,at:Date.now()}; window.__fire(); }, did);
await pg.waitForTimeout(800); await shot('9result');
s=await st(); console.log('final', JSON.stringify(s.duels[did].final), 'res', JSON.stringify(s.duels[did].res), 'duel pts', Object.entries(s.points).filter(([k])=>k.startsWith('d_')).map(([k,v])=>k.split('_').slice(-2).join('_')+'='+v.amount).join(' '));
// turn game ttt
await act('dInvite',{g:'ttt'}); await pg.waitForTimeout(300);
s=await st(); const tid=Object.keys(s.duels).find(k=>k.includes('ttt'));
await pg.evaluate((id)=>{ const d=window.__store.duels[id]; d.status='accepted'; window.__fire(); }, tid); await pg.waitForTimeout(300);
const myMove=async(i)=>{ await pg.click(`.g-ttt button[data-i="${i}"]`); await pg.waitForTimeout(150); };
const opMove=async(i)=>pg.evaluate(([id,i])=>{ const st=window.__store.duels[id].state; st.board[i]=st.mark.p; st.turn='me'; st.last=Date.now(); window.__fire(); },[tid,i]);
for (let r=0;r<3;r++){ // me wins 3 rounds quickly: me 0,1,2 ; op 3,4
  const s0=(await st()).duels[tid].state; if(s0.turn!=='me'){ await opMove(8); await pg.waitForTimeout(150);} 
  await myMove(0); await opMove(3); await pg.waitForTimeout(100); await myMove(1); await opMove(4); await pg.waitForTimeout(100); await myMove(2); await pg.waitForTimeout(300);
}
await shot('10ttt');
s=await st(); console.log('ttt', JSON.stringify(s.duels[tid].state.wins), JSON.stringify(s.duels[tid].final));
// invite bar
await act('go',{to:'home'}); await pg.evaluate(()=>{ window.__store.duels['x1']={date:window.__store.duels[Object.keys(window.__store.duels)[0]].date, game:'math', from:'p', to:'me', status:'invited', seed:5, createdAt:Date.now(), res:{}}; window.__fire(); });
await pg.waitForTimeout(400); await shot('11bar'); console.log('bar', await pg.locator('#inviteBar').count());
await act('go',{to:'ranks'}); await pg.waitForTimeout(200); await pg.screenshot({path:'/tmp/v_12ranks.png',fullPage:true}); await act('testPush');
await pg.waitForTimeout(300); console.log('pushes', pushes.length, pushes[0]);
console.log('TOTAL WRITES (latency mock):', await pg.evaluate(()=>window.__writes), JSON.stringify(await pg.evaluate(()=>{const c={}; for(const x of window.__wlog||[]) c[x]=(c[x]||0)+1; return c;})));
console.log('ERRORS', errs.length?errs:'none'); await b.close();
