const store=window.__SEED||{};
const ls=[];
export const getFirestore=()=>({});
export const doc=(db,col,id)=>({col,id});
export const collection=(db,col)=>({col});
export const where=(f,op,v)=>({f,v});
export const query=(c,w)=>({col:c.col,w});
export const increment=(n)=>({__inc:n});
export const arrayUnion=(...items)=>({__au:items});
const clone=o=>JSON.parse(JSON.stringify(o));
const fire=()=>ls.forEach(l=>emit(l));
window.__fire=fire;
function emit(l){ const c=store[l.ref.col]||{}; const docs=Object.entries(c).filter(([id,d])=>!l.ref.w||d[l.ref.w.f]===l.ref.w.v).map(([id,d])=>({id,data:()=>clone(d)})); l.cb({forEach:f=>docs.forEach(f)}); }
export const onSnapshot=(ref,cb)=>{const l={ref,cb}; ls.push(l); setTimeout(()=>emit(l),5); return ()=>{}};
function apply(target, data, merge){ for(const [k,v] of Object.entries(data)){ if(v&&v.__inc!==undefined){ target[k]=(target[k]||0)+v.__inc; } else if(v&&v.__au){ const arr=Array.isArray(target[k])?target[k]:[]; for(const it of v.__au) if(!arr.some(x=>JSON.stringify(x)===JSON.stringify(it))) arr.push(clone(it)); target[k]=arr; } else if(merge && v && typeof v==='object' && !Array.isArray(v) && target[k] && typeof target[k]==='object' && !Array.isArray(target[k])) apply(target[k], v, true); else target[k]=clone(v); } }
export const setDoc=async(r,data,o)=>{ if((window.__writes||0)>3000) throw new Error('quota'); const c=(store[r.col] ||= {}); if(!o?.merge) c[r.id]={}; c[r.id]=c[r.id]||{}; apply(c[r.id],data,!!o?.merge); window.__writes=(window.__writes||0)+1; (window.__wlog||=[]).push(r.col); setTimeout(fire,0); await new Promise(z=>setTimeout(z,150)); };
export const updateDoc=async(r,data)=>{ if((window.__writes||0)>3000) throw new Error('quota'); window.__writes=(window.__writes||0)+1; (window.__wlog||=[]).push(r.col+'*'); const d=store[r.col][r.id]; for(const [k,v] of Object.entries(data)){ const p=k.split('.'); let o=d; while(p.length>1){const x=p.shift(); o=(o[x] ||= {});} if(v&&v.__au){ apply(o,{[p[0]]:v}); } else o[p[0]]=clone(v);} setTimeout(fire,0); await new Promise(z=>setTimeout(z,150)); };
export const getDoc=async(r)=>{ const d=(store[r.col]||{})[r.id]; return {exists:()=>!!d, data:()=>d}; };
window.__store=store;
