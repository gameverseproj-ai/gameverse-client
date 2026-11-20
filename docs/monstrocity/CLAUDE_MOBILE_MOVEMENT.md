# Claude: устранить растягивание мобильного движения после сетевой задержки

Работай только в be-core, клиент уже исправлен. Не меняй скорость героя и не сбрасывай забеги.

В MonstrocityService.sync(), около строки 440, сейчас perFrame = elapsedMs / fresh.size(). Поэтому один оставшийся кадр moveX=1 после секунды задержки двигает героя на 3,2 м вместо одного тика 50 мс (0,16 м). Аналогично старое направление растягивается на сетевую паузу после отпускания пальца. Это вызывает догоняющие рывки на клиенте даже при мощном телефоне.

Клиент теперь отображает неподтверждённые фиксированные тики с коллизиями, удаляет их по session.lastAcceptedInputSequence и сверяет положение со snapshot. Сохраняются тот же wire format, sequence и идемпотентность. На blur/pointercancel/lost capture джойстик сбрасывается. Отрисовка корректирующего движения ограничена скоростью из config.

Исправь серверный расчёт:
- Каждый fresh input имеет максимум config.transport.inputTickMs времени движения.
- Общий movement budget = min(elapsedMs, fresh.size * inputTickMs). Ранние/частые запросы не получают лишнего времени и не могут ускорять игру.
- Остаток elapsedMs отработай нейтральным вводом, затем обрабатывай fresh кадры по порядку с perFrame = movementBudget / fresh.size. Последовательность событий времени/энергии/боя/смерти должна оставаться авторитетной. Нельзя просто откинуть остаток времени. Даже отклонённая команда не откатывает settlement.
- Пустой sync — весь elapsedMs с нейтральным вводом. Дубликаты sequence не дают движения, новая session не наследует ввод старой.
- Не сохраняй последнее направление как удерживаемое без новых кадров.
- Сохрани ограничения disconnect/grace, batch, непрерывность sequence, revision и текущие правила боёв.

Клиентский LocalMonstrocityApi использует этот алгоритм как проверяемый пример; клиентский protocol уточняется тем же правилом. Не изменяй клиент.

Регрессии в изолированном тестовом игроке/БД:
1. 1 fresh движущийся кадр после 1000 мс: дистанция <= speed * 0.05, activeElapsedMs прибавляет полную секунду, энергия тратится за полную секунду.
2. 5 кадров после 250 мс: обычная дистанция speed * .25.
3. 5 кадров после 1000 мс: дистанция <= speed * .25, остальное время нейтрально.
4. Кадры движения, затем нули/отпускание: не происходит движения во время следующего пустого heartbeat; повтор batch не сдвигает героя.
5. Ранние запросы/быстрый spam не обходят бюджет серверного времени.
6. Стена, диагональ, смерть от энергии в нейтральном промежутке, начало боя: корректные хронологические переходы без движения мёртвого героя и без rollback settlement.
7. После resume/takeover старые sequence не меняют новое состояние.

Подними сервер после исправления и подтверди реальным HTTP сценарий задержанного кадра, вернув позиции/elapsed/sequence без токенов. Не называй баг исправленным только по локальному preview.

## Cloud verification — 2026-11-13 (required deployment follow-up)

Real HTTP against https://gameverse-core.onrender.com, using a disposable anonymous player (disconnected after verification):
- Bootstrap RTT: 600, 611, 593 ms. Transport: inputTickMs=50, syncIntervalMs=250, maxBatchFrames=10, disconnectAfterSeconds=5.
- Actual sync RTT: 897, 711, 788 ms.
- One moving sample (sequence=1, moveX=1, moveZ=0) moved X by **2.864 units**, despite speed=3.2 and a 50 ms sample (expected maximum **0.16 units**). Subsequent neutral samples moved 0.

The previously requested movement-time fix is therefore NOT active in the cloud deployment. Correct local source alone is insufficient: deploy and verify the exact cloud instance above. Include deployed commit/config version in the result.

There is a second transport bottleneck: 10 frames cover only 500 ms, whereas a sequential sync takes 711–897 ms here. The client stops sampling at the queue limit, causing periodic stops and oversized authoritative corrections. Maintain the single request queue and sequence/idempotency rules; do not allow parallel sync requests as a workaround.

Required config: start with maxBatchFrames=40 (2 seconds at 50 ms per sample), inputTickMs=50, syncIntervalMs=250. Ensure server validation accepts this configured limit, with no hidden hardcoded 10. Preserve the 5-second disconnect policy. Treat this as a bounded tolerance window, not unlimited offline simulation. Promote through a versioned config and ensure existing active runs receive the updated transport settings safely at bootstrap/resume; report both active-run and new-run config versions.

The client now uses config.transport.maxBatchFrames for its unsent input queue instead of hardcoded 10, and config.transport.syncIntervalMs instead of hardcoded 250. A full batch is dispatched as soon as the preceding request completes. Until the cloud publishes the larger batch limit AND the fixed movement time budget, stutter cannot be considered resolved.

Acceptance: run 30 seconds of continuous movement with sequential requests and simulated 800 ms round trips, at least one 1.5-second response delay, then release input. Assert bounded queue, continuous sequence, no duplicate movement, no enlarged step duration, and zero movement on neutral heartbeat after release. Movement at steady input must approach configured speed rather than the throughput limit of 10/RTT samples. Verify a fresh player and an existing run. Repeat the single-sample HTTP case above against the deployed cloud: displacement <=0.16, full elapsed time still settled, no reset of user progress.
