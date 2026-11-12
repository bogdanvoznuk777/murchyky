# dev/ — тести «Мурчиків» (не частина гри)

Запуск з цієї папки (потрібен Playwright: `/opt/npm-tools/node_modules/playwright`):

- `node e2e_coop.mjs` — 2 телефони, розділ 1 «Шкатулка» (`LEVELS=1-1,1-2`, `LAT=200` — затримка мережі, мс)
- `node e2e_coop2.mjs` — пауза/перезахід/вихід, розділ 1
- `PRE=2-1 LEVELS=2-2 node e2e_light.mjs` — розділ 2 «Маяк» (PRE — які рівні вважати пройденими)
- `PRE=2-1,2-2 node e2e_light2.mjs` — стрес «Маяк»
- `node e2e_garden.mjs` / `PRE=3-1,3-2 node e2e_garden2.mjs` — розділ 3 «Сад»
- `e2e_final.mjs` — фінальний костюм + «Нерозлучні»; `e2e_lock2.mjs` — замок рангом
- регресія решти гри: `e2e_storm.mjs` (дуелі), `e2e_items.mjs` (магазин), `e2e_v2b.mjs`, `e2e_wsb.mjs` (майстерня), `e2e_rm.mjs` (анімація котика)
- `node e2e_room.mjs` — кімната котика: магазин меблів, облаштування, бонуси, гості, 💕, записки, подарунки
- `node room_catalog.mjs` / `node room_seats.mjs` — знімки всіх наборів, видів з вікна, ексклюзивів і поз котика біля меблів (/tmp/rc_*.png, /tmp/seats.png)
- `node room_light.mjs` — кімната в різний час доби (/tmp/room_light.png); `node room_perf.mjs` — кадри/с (CPU ×4)
- `node e2e_sw.mjs` — сервіс-воркер (кеш, офлайн, оновлення; піднімає локальний сервер на 5555)
- `node e2e_fx.mjs` — переходи, конфеті, сцени нового рангу й перемоги в сезоні
- `node reads.mjs` — скільки документів читає відкриття гри (історія ~4 міс.), гаманець, альбом на вимогу
- `node sw_version.mjs` — оновити версію sw.js перед публікацією (`--check` — лише перевірити)
- `levelcheck/` — перевірка прохідності рівнів (BFS): `node v2.mjs`, `node v3.mjs`

`mock*/` — підмінені модулі Firebase (Firestore/Auth/Realtime DB) з затримкою й лічильниками записів.
Шрифти Google у тестах блокуються — помилка `ERR_FAILED` в консолі очікувана.
