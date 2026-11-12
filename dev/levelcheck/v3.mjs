const {L}=await import('./l3.mjs');
for(const [id,g] of Object.entries(L)){
  const H=g.length,W=g[0].length; const bad=g.map((r,i)=>r.length!==W?i+':'+r.length:null).filter(Boolean); if(bad.length){console.log(id,'BAD WIDTH',bad.join(' '));continue;}
  let SA,SB; const xs=[]; const plates={}; g.forEach((r,y)=>[...r].forEach((c,x)=>{if(c==='S')SA=y*W+x;if(c==='T')SB=y*W+x;if(c==='x')xs.push(y*W+x); if(/[a-d]/.test(c)) (plates[c] ||= []).push(y*W+x);}));
  const at=(i)=>g[Math.floor(i/W)][i%W];
  const open=(c,a,b,latch)=>{ if(c==='X') return latch; if(/[A-D]/.test(c)){ const ps=plates[c.toLowerCase()]||[]; return ps.includes(a)||ps.includes(b);} return true; };
  const walk=(c)=>c!=='#'&&c!=='w';
  const seen=new Set(); const q=[[SA,SB,0,0]]; let win=false, fish=false, states=0;
  while(q.length){ let [a,b,l,f]=q.shift(); if(!l && xs.length && xs.every(p=>p===a||p===b)) l=1; if(at(a)==='F'||at(b)==='F') f=1;
    const k=a+','+b+','+l+','+f; if(seen.has(k)) continue; seen.add(k); states++;
    if(at(a)==='G'&&at(b)==='G'&&a!==b){ win=true; if(f){fish=true;break;} }
    for(const who of [0,1]) for(const d of [1,-1,W,-W]){ const cur=who?b:a, n=cur+d, c=at(n); if(!walk(c)) continue; const na=who?a:n, nb=who?n:b; if(!open(c, na===n?b:a, na===n?b:a, l)) { // gate: check plates pressed by the OTHER cat (mover is entering gate cell)
          continue; }
        q.push([na,nb,l,f]); } }
  // самотня перевірка: чи може один котик (A) дійти до G без B, якщо B стоїть на старті
  console.log(id, W+'x'+H, 'win',win,'withFish',fish,'states',states);
}
