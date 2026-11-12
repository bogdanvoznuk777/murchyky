// Оновлює VERSION у sw.js: хеш усіх файлів гри. Запускати перед кожною публікацією: node dev/sw_version.mjs
// З ключем --check лише перевіряє (код виходу 1, якщо версія застаріла).
import fs from 'fs'; import crypto from 'crypto'; import path from 'path';
const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const list = (name) => JSON.parse(sw.match(new RegExp(`const ${name} = (\\[[^\\]]*\\]);`))[1].replace(/'/g, '"'));
const files = [...list('CORE'), ...list('LAZY')].filter((f) => f !== './');
const h = crypto.createHash('sha256');
for (const f of files) { const p = path.join(ROOT, f); if (!fs.existsSync(p)) { console.error('немає файлу', f); process.exit(1); } h.update(f).update(fs.readFileSync(p)); }
// файли, які гра імпортує, мають бути в списках (інакше без інтернету вони не відкриються)
const imported = new Set();
for (const f of fs.readdirSync(ROOT).filter((x) => x.endsWith('.js') && x !== 'sw.js')) for (const m of fs.readFileSync(path.join(ROOT, f), 'utf8').matchAll(/(?:from |import\()'\.\/([\w-]+\.js)'/g)) imported.add(m[1]);
const missing = [...imported].filter((f) => !files.includes(f));
if (missing.length) { console.error('sw.js: файли не в CORE/LAZY:', missing.join(', ')); process.exit(1); }
const v = 'murchyky-' + h.digest('hex').slice(0, 12), cur = sw.match(/const VERSION = '([^']+)'/)[1];
if (process.argv.includes('--check')) { console.log(cur === v ? `sw ok ${v}` : `sw ЗАСТАРІЛА: ${cur} ≠ ${v} — запусти node dev/sw_version.mjs`); process.exit(cur === v ? 0 : 1); }
fs.writeFileSync(path.join(ROOT, 'sw.js'), sw.replace(/const VERSION = '[^']+'/, `const VERSION = '${v}'`));
console.log('sw VERSION', v);
