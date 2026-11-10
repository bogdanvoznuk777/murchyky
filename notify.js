// ===== Сповіщення через безкоштовний сервіс ntfy.sh (застосунок «ntfy» на телефоні) =====
export const GAME_URL = location.origin + location.pathname;
export const newTopic = () => 'murchyky-' + Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');

export function sendPush(topic, title, message) {
  if (!topic) return Promise.resolve();
  // text/plain без заголовків — «простий» запит, тож браузер надсилає його без попередньої перевірки
  return fetch('https://ntfy.sh/', { method: 'POST', mode: 'no-cors', body: JSON.stringify({ topic, title, message, click: GAME_URL, tags: ['cat'] }) }).catch(() => {});
}
