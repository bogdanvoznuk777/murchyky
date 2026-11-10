// ===== Чисті функції (дати, випадковість, підрахунок) =====
import { RANKS, WORDS, CHALLENGES, CHALLENGES_PER_WEEK, QUIZ_PER_DAY, SURVEY } from './data.js';

let TZ = 'Europe/Kyiv';
try { new Intl.DateTimeFormat('en-CA', { timeZone: TZ }); } catch { TZ = 'Europe/Kiev'; }

// Дата за Києвом у форматі YYYY-MM-DD
export function kyivDate(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
export function kyivHour(d = new Date()) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }).format(d)) % 24;
}
export const dayNum = (s) => { const [y, m, d] = s.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); };
export const fromDayNum = (n) => new Date(n * 86400000).toISOString().slice(0, 10);
export const dow = (s) => (new Date(dayNum(s) * 86400000).getUTCDay() + 6) % 7; // 0 = понеділок
export const weekId = (s) => fromDayNum(dayNum(s) - dow(s)); // дата понеділка

const MONTHS = ['січ.', 'лют.', 'бер.', 'квіт.', 'трав.', 'черв.', 'лип.', 'серп.', 'вер.', 'жовт.', 'лист.', 'груд.'];
export function weekLabel(w) {
  const a = w, b = fromDayNum(dayNum(w) + 6);
  const f = (s) => `${Number(s.slice(8))} ${MONTHS[Number(s.slice(5, 7)) - 1]}`;
  return `${f(a)} – ${f(b)}`;
}
export function timeLeftInWeek(d = new Date()) {
  const s = kyivDate(d);
  const hours = (6 - dow(s)) * 24 + (24 - kyivHour(d));
  return hours >= 24 ? `${Math.floor(hours / 24)} дн. ${hours % 24} год.` : `${hours} год.`;
}

// Детермінована випадковість
export function hash(str) { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return h >>> 0; }
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function shuffle(arr, seedStr) { const a = arr.slice(), r = rng(hash(seedStr)); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// Слово дня: проходимо весь список без повторів, потім нове коло
export function wordOfDay(date) {
  const n = dayNum(date), L = WORDS.length, cycle = Math.floor(n / L);
  return shuffle(WORDS, 'words' + cycle)[n % L];
}
// Оцінка спроби: 2 — на місці, 1 — є в слові, 0 — немає
export function scoreGuess(guess, answer) {
  const g = [...guess], a = [...answer], res = Array(g.length).fill(0), left = {};
  g.forEach((ch, i) => { if (ch === a[i]) res[i] = 2; else left[a[i]] = (left[a[i]] || 0) + 1; });
  g.forEach((ch, i) => { if (res[i] !== 2 && left[ch] > 0) { res[i] = 1; left[ch]--; } });
  return res;
}
export const UA_LETTERS = 'абвгґдеєжзиіїйклмнопрстуфхцчшщьюя';

export function weekChallenges(week) {
  // Перший сезон лишаємо без змін (тоді в пулі було 28 челенджів)
  const pool = week < '2026-11-16' ? CHALLENGES.slice(0, 28) : CHALLENGES;
  return shuffle(pool, 'ch' + week).slice(0, CHALLENGES_PER_WEEK);
}

// Питання квізу на день: ідемо по колу через усі відповіді партнера
export function quizQuestions(date, guesserUid, partnerAnswers) {
  const ids = SURVEY.filter((q) => q.quiz !== false && hasAnswer(partnerAnswers?.[q.id])).map((q) => q.id);
  if (!ids.length) return [];
  const order = shuffle(ids, 'quiz' + guesserUid);
  const n = Math.min(QUIZ_PER_DAY, order.length), start = (dayNum(date) * QUIZ_PER_DAY) % order.length;
  return Array.from({ length: n }, (_, i) => order[(start + i) % order.length]);
}
export const hasAnswer = (v) => v !== undefined && v !== null && String(v).trim() !== '';

// Автоматична оцінка: число балів або null (якщо оцінює партнер)
export function autoGrade(q, guess, answer) {
  if (q.type === 'choice') return String(guess) === String(answer) ? 10 : 0;
  if (q.type === 'scale') { const d = Math.abs(Number(guess) - Number(answer)); return d === 0 ? 10 : d === 1 ? 5 : 0; }
  return null;
}

export function rankFor(total) {
  let i = 0; RANKS.forEach((r, k) => { if (total >= r.min) i = k; });
  return { ...RANKS[i], idx: i, next: RANKS[i + 1] || null };
}
