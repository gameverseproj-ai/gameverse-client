# Monstrocity: интеграционная проверка, 21 октября 2026

> Повторная проверка после исправлений Клода: все три серверные регрессии проходят через реальный API/БД; 49/49 серверных тестов и 74 ответа по схемам без ошибок. Новые забеги используют monstrocity-v2. Повторный реальный браузерный E2E также PASS: новый вход двойным кликом по аватару, обыск, карта/пауза, идемпотентный расход после потери ответа, reload, бой, takeover и мобильный инвентарь; JS errors отсутствуют. Свидетельства — output/monstrocity/integration-recheck/. Исходный отчёт ниже сохранён как история обнаружения дефектов.

Клиент подключён к реальному серверу по умолчанию. Сервер be-core запущен локально на :8080, клиент на :4300. Серверный исходный код в рамках этой проверки не изменялся. Для запуска создана отдельная PostgreSQL БД `monstro_codex_e2e_20261021`; для серверных integration tests — `monstro_codex_it_20261021`. Пользовательские игровые базы не использовались.

**Результат: основной пользовательский E2E проходит, но выпуск блокируют подтверждённые серверные дефекты.** Задание на исправление: [CLAUDE_BACKEND_FOLLOWUP.md](CLAUDE_BACKEND_FOLLOWUP.md).

## Проверено

| Проверка | Результат |
| --- | --- |
| Production Angular build | PASS, предупреждения бюджета bundle/styles |
| Клиент: HTTP adapter, local engine, SessionGate, MusicService | 36/36 PASS |
| Backend: MonstrocityEngineTest + MonstrocityIntegrationTest на PostgreSQL | 39/39 PASS (16 + 23) |
| Валидация серверных Bootstrap/Snapshot/Error по схемам | 65 ответов, 0 ошибок |
| Реальный браузер, Chrome + настоящие API и PostgreSQL | PASS |
| Сохранение смерти при отклонённой команде | FAIL: snapshot dead, БД и следующий GET active |
| Background settlement disconnected-сессии | FAIL: после sweep active, смерть только на GET |
| Параллельные bootstrap нового пользователя | FAIL: часть ответов 500 |

Браузерный сценарий: anonymous authentication → серверный standalone catalog в Worlds → старт → движение джойстиком и обыск → пауза карты → инвентарь/еда → потеря настоящего успешного consume-response → повтор с тем же idempotency key без двойного расхода → reload/continue → выход из убежища → встреча → прицельные броски и победа над mossback → конфликт с другой HTTP-сессией → явный takeover → отказ отозванной сессии → мобильный viewport 844×390. JavaScript errors отсутствуют. Вторая сессия проверена через настоящий HTTP, а не второй графический браузер.

Сутки, офлайн grace/recovery, меч, purchased/collected, NPC и конкурентное использование предметов покрыты серверными integration tests с управляемым временем. Это не 12 минут ожидания реального дня в браузере. Google login, физические Android-устройства, их производительность, реальные покупки и реклама не проверялись. Twigwalker отображается отдельной вариацией модели; браузерная победа в этом прогоне была над mossback.

## Исправления клиента

- Общий ApiError сохраняет исходное тело ошибки; Monstrocity получает authoritative snapshot даже через общий interceptor.
- Транспортные ошибки/таймаут повторяются один раз с прежним телом и ключом. REVISION_CONFLICT повторяется один раз с новой revision/key только для того же активного забега и текущей сессии. Takeover всегда явный.
- При pagehide отправляется authenticated keepalive disconnect, сохраняется серверная страховка heartbeat.
- Смерть закрывает меню; ожидаемые отказы игровых действий показывают сообщение, не блокирующий экран переподключения. Новая игра обновляет bootstrap/config.
- Worlds использует серверный standalone catalog. Локальный preview доступен только явно через `?preview=1` в dev-сборке на localhost; нет автоматического fallback и переноса локальных сохранений в аккаунт.
- Два вида боевых моделей по artId, локализованное имя twigwalker. Backend пока выдаёт v1; клиент её соблюдает. Переход новых серверных забегов на v2 включён в задание Клоду.

## Воспроизводимость

Нужны Node 20+, Java 25, PostgreSQL и Chrome/Playwright. Dev proxy направляет `/api` на localhost:8080. Использованы Flyway V1–V13. Сервер запущен с DB_JDBC_URL/DB_R2DBC_URL на выделенную БД и CORS для localhost/127.0.0.1:4300.

```sh
npm run build
npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/features/games/monstrocity/monstrocity-http.spec.ts --include=src/app/features/games/monstrocity/monstrocity-local.spec.ts --include=src/app/core/api/http/session.gate.spec.ts --include=src/app/core/audio/music.service.spec.ts
node scripts/monstrocity-e2e.cjs
MONSTROCITY_TEST_DB=monstro_codex_e2e_20261021 node scripts/monstrocity-server-audit.cjs
```

Для браузерного скрипта при необходимости указать PLAYWRIGHT_MODULE (путь установленного Playwright). Аудит требует docker-контейнер gameverse-db и намеренно меняет fixtures только новых тестовых забегов в указанной отдельной БД; при известных дефектах завершается с кодом 1.

В be-core запускались `./mvnw test -Dtest=MonstrocityEngineTest,MonstrocityIntegrationTest -Dgameverse.integration=true` с параметрами `gameverse.test.db.jdbc`, `gameverse.test.db.r2dbc`, `gameverse.test.db.username`, `gameverse.test.db.password` выделенной тестовой БД. Затем `node scripts/monstrocity-validate-samples.cjs` с доступным Ajv.

Артефакты: `output/monstrocity/integration/browser-e2e.json`, `database.json`, `server-defects.json`, `bootstrap-race.json`, `browser-mobile.png`. В них нет токенов. База подтверждает сохранение забега, инвентаря, версии конфигурации, сессии и боевых receipts. Снимок состояния БД относится к моменту проверки, не обещает неизменность последующих состояний.

## Дополнительная проверка после полного отчёта Клода

В полном отчёте Claude сообщил о двух HTTP 500 в одном промежуточном прогоне конкурентного bootstrap; причина того эпизода не установлена. Поэтому утверждение об устранении всех ошибок следует понимать как результат пройденных регрессий, а не доказательство отсутствия редкой гонки.

Независимый повтор: `node scripts/monstrocity-bootstrap-stress.cjs`, 24 новых anonymous игрока, у каждого одновременно 7 bootstrap + 1 create-run. Все 192 ответа HTTP 200, без повторов запросов. В отдельной БД подтверждены 24 профиля, 72 стека предметов и 24 забега. Свидетельство: `output/monstrocity/integration-recheck/bootstrap-stress.json`. Редкий 500 не воспроизведён; при повторении нужен stack trace `Monstrocity request failed` из того же прогона. Скрипт рассчитан на локальный сервер :8080 с отдельной тестовой БД.
