const store=window.__SEED||{};
const ls=[];
export const getFirestore=()=>({});
export const initializeFirestore=()=>({});
export const persistentLocalCache=()=>({});
export const persistentMultipleTabManager=()=>({});
export const doc=(db,col,id)=>({col,id});
export const collection=(db,col)=>({col});
export const where=(f,op,v)=>({f,op,v});
export const query=(c,...ws)=>({col:c.col,ws});
export const increment=(n)=>({__inc:n});
export const arrayUnion=(...items)=>({__au:items});
const clone=o=>JSON.parse(JSON.stringify(o));
const fire=()=>ls.forEach(l=>emit(l));
window.__fire=fire;
// фільтри запитів як у Firestore: ==, !=, <, <=, >, >= (документ без поля не проходить)
const ok=(d,w)=>{ const x=d[w.f]; if(x===undefined) return false; return w.op==='=='?x===w.v:w.op==='!='?x!==w.v:w.op==='<'?x<w.v:w.op==='<='?x<=w.v:w.op==='>'?x>w.v:w.op==='>='?x>=w.v:false; };
const match=(ref)=>Object.entries(store[ref.col]||{}).filter(([id,d])=>(ref.ws||[]).every(w=>ok(d,w))).map(([id,d])=>({id,data:()=>clone(d)}));
// лічильник «читань»: перший знімок кожного слухача + getDocs/getDoc (як рахує Firestore при відкритті гри)
const count=(n)=>{ window.__reads=(window.__reads||0)+n; };
function emit(l){
  if(l.ref.id!==undefined){ const d=(store[l.ref.col]||{})[l.ref.id]; if(!l.n){ l.n=1; count(1); } return l.cb({id:l.ref.id,exists:()=>!!d,data:()=>d?clone(d):undefined,metadata:{fromCache:false}}); }
  const docs=match(l.ref); if(!l.n){ l.n=1; count(docs.length||1); } l.cb({docs,size:docs.length,forEach:f=>docs.forEach(f),metadata:{fromCache:false}});
}
export const onSnapshot=(ref,cb)=>{const l={ref,cb}; ls.push(l); setTimeout(()=>emit(l),5); return ()=>{ const i=ls.indexOf(l); if(i>=0) ls.splice(i,1); }};
export const getDocs=async(ref)=>{ const docs=match(ref); count(docs.length||1); return {docs,size:docs.length,forEach:f=>docs.forEach(f)}; };
function apply(target, data, merge){ for(const [k,v] of Object.entries(data)){ if(v&&v.__inc!==undefined){ target[k]=(target[k]||0)+v.__inc; } else if(v&&v.__au){ const arr=Array.isArray(target[k])?target[k]:[]; for(const it of v.__au) if(!arr.some(x=>JSON.stringify(x)===JSON.stringify(it))) arr.push(clone(it)); target[k]=arr; } else if(merge && v && typeof v==='object' && !Array.isArray(v) && target[k] && typeof target[k]==='object' && !Array.isArray(target[k])) apply(target[k], v, true); else target[k]=clone(v); } }
export const setDoc=async(r,data,o)=>{ const c=(store[r.col] ||= {}); if(!o?.merge) c[r.id]={}; c[r.id]=c[r.id]||{}; apply(c[r.id],data,!!o?.merge); window.__writes=(window.__writes||0)+1; setTimeout(fire,0); if(window.__hang) await new Promise(()=>{}); };
export const updateDoc=async(r,data)=>{ const d=store[r.col][r.id]; for(const [k,v] of Object.entries(data)){ const p=k.split('.'); let o=d; while(p.length>1){const x=p.shift(); o=(o[x] ||= {});} if(v&&v.__au){ apply(o,{[p[0]]:v}); } else o[p[0]]=clone(v);} setTimeout(fire,0); if(window.__hang) await new Promise(()=>{}); };
export const getDoc=async(r)=>{ count(1); const d=(store[r.col]||{})[r.id]; return {id:r.id,exists:()=>!!d, data:()=>d}; };
window.__store=store;
