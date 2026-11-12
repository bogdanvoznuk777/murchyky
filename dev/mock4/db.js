const tree={}; const ls=[]; const ready=(window.__rtdbInit?window.__rtdbInit():Promise.resolve('[]')).then(j=>{ for(const [p,v] of JSON.parse(j)) put(p,v); }); window.__rx=0; window.__tx=0;
const parts=p=>p.split('/').filter(Boolean);
const clone=v=>v===undefined?null:JSON.parse(JSON.stringify(v));
function get(p){ let o=tree; for(const k of parts(p)){ if(o==null||typeof o!=='object') return null; o=o[k]; } return o===undefined?null:clone(o); }
function put(p,v){ const ks=parts(p); let o=tree; for(let i=0;i<ks.length-1;i++){ if(o[ks[i]]==null||typeof o[ks[i]]!=='object') o[ks[i]]={}; o=o[ks[i]]; } const k=ks[ks.length-1]; if(v==null) delete o[k]; else o[k]=clone(v); }
const rel=(a,b)=>a===b||a.startsWith(b+'/')||b.startsWith(a+'/');
function notify(p){ for(const l of ls.slice()) if(rel(p,l.p)) l.cb({val:()=>get(l.p)}); }
const res=v=>{ if(v&&typeof v==='object'){ if(v['.sv']) return Date.now(); const o={}; for(const k in v) o[k]=res(v[k]); return o;} return v; };
export const getDatabase=()=>({}); export const ref=(db,p)=>({p});
export const serverTimestamp=()=>({'.sv':'timestamp'});
export const goOnline=()=>{}; export const goOffline=()=>{};
export function onValue(r,cb){ const l={p:r.p,cb}; if(r.p==='.info/connected'){ setTimeout(()=>cb({val:()=>true}),5); return ()=>{}; } if(r.p==='.info/serverTimeOffset'){ setTimeout(()=>cb({val:()=>0}),5); return ()=>{}; } ls.push(l); ready.then(()=>setTimeout(()=>cb({val:()=>get(r.p)}),5)); return ()=>{ const i=ls.indexOf(l); if(i>=0) ls.splice(i,1); }; }
function local(p,v){ put(p,v); notify(p); }
export async function set(r,v){ v=res(v); local(r.p,v); const m=JSON.stringify({p:r.p,v}); window.__tx+=m.length; window.__rtdbSend(m); }
export async function update(r,obj){ for(const k in obj) await set({p:(r.p.replace(/\/$/,'')+'/'+k).replace(/^\//,'')},obj[k]); }
export async function remove(r){ return set(r,null); }
export const onDisconnect=(r)=>({ remove(){ window.__rtdbOnDisc?.(r.p); return Promise.resolve(); }, cancel(){ return Promise.resolve(); } });
window.__rtdbRecv=(m)=>{ window.__rx+=m.length; const {p,v}=JSON.parse(m); local(p,v); };
window.__rtdbGet=get;
async function dbGet(r){ return {val:()=>window.__rtdbGet(r.p)}; }
export { dbGet as get };
