// ===== «Дві половинки»: мережа реального часу (Firebase Realtime Database) + голос (WebRTC) =====
// Realtime Database не рахує записи (лише обсяг даних), тому підходить для 10+ оновлень на секунду.
const V = '10.12.2';
export const DB_URL = 'https://murchyky-6aa20-default-rtdb.europe-west1.firebasedatabase.app';
let D = null, db = null, me = null, offset = 0, conn = false, presVal = null, presRef = null;
const subs = [];

export async function netInit(fbApp, uid) {
  if (!D) {
    D = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-database.js`);
    db = D.getDatabase(fbApp, DB_URL);
    D.onValue(D.ref(db, '.info/serverTimeOffset'), (s) => (offset = s.val() || 0));
    D.onValue(D.ref(db, '.info/connected'), (s) => {
      conn = !!s.val();
      if (conn && presVal && presRef) { D.onDisconnect(presRef).remove(); D.set(presRef, { ...presVal, t: D.serverTimestamp() }).catch(() => {}); }
      netState.onConn?.(conn);
    });
  }
  me = uid; presRef = D.ref(db, 'coop/pres/' + uid);
  D.goOnline(db);
}
export const netState = { onConn: null };
export const now = () => Date.now() + offset;
export const online = () => conn;
const R = (p) => D.ref(db, 'coop/' + p);
export const set = (p, v) => D.set(R(p), v).catch((e) => console.warn('rtdb set', p, e?.code || e));
export const upd = (p, v) => D.update(R(p), v).catch((e) => console.warn('rtdb upd', p, e?.code || e));
export const remove = (p) => D.remove(R(p)).catch(() => {});
export const stamp = () => D.serverTimestamp();
export const once = (p) => D.get(R(p)).then((s) => s.val()).catch(() => null);
export function listen(p, cb) { const u = D.onValue(R(p), (s) => cb(s.val())); subs.push(u); return u; }
export function setPresence(v) {
  presVal = v;
  if (!D || !presRef) return;
  if (!v) { D.onDisconnect(presRef).cancel(); D.remove(presRef).catch(() => {}); return; }
  D.onDisconnect(presRef).remove(); D.set(presRef, { ...v, t: D.serverTimestamp() }).catch(() => {});
}
export function netStop() {
  subs.splice(0).forEach((u) => u());
  setPresence(null);
  if (D && db) setTimeout(() => { if (!presVal) D.goOffline(db); }, 300); // закриваємо зʼєднання, коли поза грою — 0 трафіку
}

// ---------- голос (WebRTC, пряме зʼєднання телефон–телефон; Open Relay як запасний шлях) ----------
const STUN = [{ urls: 'stun:stun.cloudflare.com:3478' }];
// Запасний сервер-посередник (Metered, безкоштовний тариф) — лише коли пряме зʼєднання неможливе
const TU = 'ad84a082657153734709951e', TC = 'mEAIu7qhj39I3wn2';
const TURN = [{ urls: ['turn:global.relay.metered.ca:80', 'turns:global.relay.metered.ca:443?transport=tcp'], username: TU, credential: TC }];
const iceServers = async () => [...STUN, ...TURN];

export const voice = { on: false, muted: false, state: 'off', relay: false, onChange: null, needTap: false };
let pc = null, stream = null, audioEl = null, partner = null, host = false, gen = 0, retryT = 0, sigUnsub = null, lastSig = '';
const vset = (k) => { Object.assign(voice, k); voice.onChange?.(); };

// Мінімальний бітрейт голосу: 24 кбіт/с моно (менше трафіку, чутність як у месенджерах)
const lowBitrate = (sdp) => sdp.replace(/a=fmtp:(\d+) (.*useinbandfec=1.*)/g, (m, pt, rest) => (rest.includes('maxaveragebitrate') ? m : `a=fmtp:${pt} ${rest};stereo=0;maxaveragebitrate=24000`));

export async function voiceStart(partnerUid, isHost) {
  partner = partnerUid; host = isHost;
  if (!audioEl) { audioEl = document.createElement('audio'); audioEl.autoplay = true; audioEl.setAttribute('playsinline', ''); audioEl.style.display = 'none'; document.body.appendChild(audioEl); }
  audioEl.play?.().catch(() => {}); // «розблокувати» відтворення в межах натискання
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
  } catch (e) { vset({ on: false, state: 'nomic' }); return false; }
  vset({ on: true, muted: false, state: 'wait' });
  setPresence({ ...(presVal || {}), voice: true });
  if (!sigUnsub) sigUnsub = listen('rtc', onSignal);
  if (host) connect();
  return true;
}
export function voiceStop() {
  gen++; clearTimeout(retryT);
  sigUnsub?.(); sigUnsub = null;
  pc?.close(); pc = null;
  stream?.getTracks().forEach((t) => t.stop()); stream = null;
  if (audioEl) audioEl.srcObject = null;
  if (presVal) setPresence({ ...presVal, voice: false });
  vset({ on: false, state: 'off', relay: false, needTap: false });
}
export function voiceMute(m) { voice.muted = m; stream?.getAudioTracks().forEach((t) => (t.enabled = !m)); vset({}); }
export function voiceTap() { audioEl?.play().then(() => vset({ needTap: false })).catch(() => {}); }
// викликається, коли партнер увімкнув/вимкнув голос
export function voicePartner(partnerOn) {
  if (!voice.on) return;
  if (!partnerOn) { pc?.close(); pc = null; vset({ state: 'wait', relay: false }); return; }
  if (host && (!pc || ['failed', 'closed'].includes(pc.connectionState))) connect();
}

async function newPc() {
  pc?.close();
  const p = new RTCPeerConnection({ iceServers: await iceServers(), bundlePolicy: 'max-bundle' });
  stream.getTracks().forEach((t) => p.addTrack(t, stream));
  p.ontrack = (e) => {
    audioEl.srcObject = e.streams[0];
    audioEl.play().then(() => vset({ needTap: false })).catch(() => vset({ needTap: true }));
  };
  p.onconnectionstatechange = () => {
    const s = p.connectionState;
    if (s === 'connected') { vset({ state: 'ok' }); applyBitrate(p); checkRelay(p); }
    else if (s === 'failed') { vset({ state: 'fail' }); if (host) { clearTimeout(retryT); retryT = setTimeout(connect, 3000); } }
    else if (s === 'disconnected') vset({ state: 'wait' });
  };
  return p;
}
function applyBitrate(p) {
  p.getSenders().forEach((s) => { if (s.track?.kind !== 'audio') return; const prm = s.getParameters(); if (!prm.encodings?.length) prm.encodings = [{}]; prm.encodings[0].maxBitrate = 24000; s.setParameters(prm).catch(() => {}); });
}
async function checkRelay(p) {
  try {
    const st = await p.getStats(); let pair = null;
    st.forEach((r) => { if (r.type === 'transport' && r.selectedCandidatePairId) pair = st.get(r.selectedCandidatePairId); });
    if (!pair) st.forEach((r) => { if (r.type === 'candidate-pair' && r.nominated && r.state === 'succeeded') pair = r; });
    const loc = pair && st.get(pair.localCandidateId);
    vset({ relay: loc?.candidateType === 'relay' });
  } catch {}
}
// Без «trickle»: збираємо адреси й надсилаємо один запис. Чекаємо до завершення збору,
// але не довше 0.4 с після адреси сервера-посередника (зазвичай ~0.4 с) і не більше 2.5 с загалом.
const gathered = (p) => new Promise((res) => {
  if (p.iceGatheringState === 'complete') return res();
  let t2 = 0; const done = () => { clearTimeout(t1); clearTimeout(t2); res(); };
  const t1 = setTimeout(done, 2500);
  p.addEventListener('icecandidate', (e) => { if (!e.candidate) done(); else if (e.candidate.type === 'relay' && !t2) t2 = setTimeout(done, 400); });
  p.addEventListener('icegatheringstatechange', () => { if (p.iceGatheringState === 'complete') done(); });
});
async function connect() {
  if (!voice.on || !stream) return;
  const my = ++gen;
  pc = await newPc(); if (my !== gen) return;
  const offer = await pc.createOffer();
  await pc.setLocalDescription({ type: 'offer', sdp: lowBitrate(offer.sdp) });
  await gathered(pc); if (my !== gen) return;
  vset({ state: 'wait' });
  set('rtc', { offer: pc.localDescription.sdp, from: me, n: Date.now(), answer: null });
}
async function onSignal(v) {
  if (!v || !voice.on || !stream) return;
  if (host) {
    if (v.answer && v.ans_n === v.n && pc && pc.signalingState === 'have-local-offer' && v.ansFrom !== me) {
      try { await pc.setRemoteDescription({ type: 'answer', sdp: v.answer }); } catch (e) { console.warn('answer', e); }
    }
    return;
  }
  if (!v.offer || v.from === me || lastSig === String(v.n) || v.answer) return;
  lastSig = String(v.n);
  const my = ++gen;
  pc = await newPc(); if (my !== gen) return;
  try {
    await pc.setRemoteDescription({ type: 'offer', sdp: v.offer });
    const ans = await pc.createAnswer();
    await pc.setLocalDescription({ type: 'answer', sdp: lowBitrate(ans.sdp) });
    await gathered(pc); if (my !== gen) return;
    upd('rtc', { answer: pc.localDescription.sdp, ans_n: v.n, ansFrom: me });
  } catch (e) { console.warn('offer', e); }
}
