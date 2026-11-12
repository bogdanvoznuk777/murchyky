const {L}=await import('./l2.mjs');
for(const [id,{lv,g}] of Object.entries(L)){
  const H=g.length,W=g[0].length; if(g.some(r=>r.length!==W)){console.log(id,'BAD WIDTH',g.map(r=>r.length).join(','));continue;}
  let S; g.forEach((r,y)=>[...r].forEach((c,x)=>{if(c==='S')S=[x,y];}));
  const lm=lv.map(s=>[...s].reduce((m,d)=>m|1<<(+d-1),0));
  const pass=(c,m)=>c!=='#'&&!(/[1-9]/.test(c)&&!(m&1<<(+c-1)));
  const bfs=(useLv)=>{const seen=new Set(),q=[[...S,0]];let goal=false,fish=false;while(q.length){const[x,y,m]=q.shift();const k=x+','+y+','+m;if(seen.has(k))continue;seen.add(k);const c=g[y][x];if(c==='G')goal=true;if(c==='F')fish=true;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(pass(g[ny][nx],m))q.push([nx,ny,m]);} if(useLv) for(const l of lm) q.push([x,y,m^l]);}return{goal,fish}};
  const r=bfs(true), r0=bfs(false);
  const traps=(g.join('').match(/[\^v]/g)||[]).length, doors=[...new Set(g.join('').match(/[1-9]/g)||[])].join('');
  // shortest path length (cells) with levers
  console.log(id, W+'x'+H, 'goal',r.goal,'fish',r.fish,'| without levers goal:',r0.goal, '| traps',traps,'doors',doors,'levers',lv.join(' '));
}
