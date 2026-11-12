const {L}=await import(process.argv[2]||'./levels_draft.mjs');
for(const [id,g] of Object.entries(L)){
  const H=g.length,W=g[0].length; if(g.some(r=>r.length!==W)) {console.log(id,'BAD WIDTH');continue;}
  let S,G,F; const sw=new Set();
  g.forEach((r,y)=>[...r].forEach((c,x)=>{if(c==='S')S=[x,y];if(c==='G')G=[x,y];if(c==='F')F=[x,y];if(/[a-z]/.test(c)&&c!=='c'||c==='c')sw.add(c);}));
  // BFS over (x,y,mask)
  const letters=[...new Set(g.join('').match(/[a-z]/g)||[])];
  const bit=c=>1<<letters.indexOf(c);
  const pass=(c,m)=>c!=='#'&&c!=='O'&&!( /[A-Z]/.test(c)&&!'SGF'.includes(c)&&!(m&bit(c.toLowerCase())) );
  const bfs=(skip)=>{const seen=new Set(),q=[[...S,0]];let goal=false,fish=false;while(q.length){let[x,y,m]=q.shift();const c=g[y][x];if(/[a-z]/.test(c)&&c!==skip)m|=bit(c);const k=x+','+y+','+m;if(seen.has(k))continue;seen.add(k);if(c==='G')goal=true;if(c==='F')fish=true;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(pass(g[ny][nx],m))q.push([nx,ny,m]);}}return{goal,fish}};
  const r=bfs(null); const req=letters.map(c=>c+':'+(bfs(c).goal?'optional':'REQUIRED'));
  console.log(id,W+'x'+H,'goal',r.goal,'fish',r.fish,req.join(' '));
}
