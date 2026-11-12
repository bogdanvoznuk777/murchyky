let cbs=[]; let user=null;
export const getAuth=()=>({});
export const onAuthStateChanged=(a,cb)=>{cbs.push(cb); setTimeout(()=>cb(user),10); return ()=>{}};
const set=u=>{user=u; cbs.forEach(c=>c(u));};
export const signInWithEmailAndPassword=async(a,e,p)=>{ set({uid:(window.__UID||'me'),email:e}); return {user}; };
export const createUserWithEmailAndPassword=async(a,e,p)=>{ window.__email=e; const u={uid:(window.__UID||'me'),email:e,delete:async()=>set(null)}; set(u); return {user:u}; };
export const signOut=async()=>set(null);
