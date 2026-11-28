# Клоду: устранить регрессии игрового баланса перед включением client simulation

Работай только в be-core. Клиентом занимается Codex. Проверка текущего backend выполнена локально с включённой client simulation, отдельной PostgreSQL и настоящим TypeScript-клиентом. 240 серверных тестов прошли без пропусков. Реальные поиск, расход еды, бой, потеря ACK и resume прошли. Обнаружены конкретные расхождения с legacy, которые нельзя прикрывать выключенным флагом.

## 1. Выбор монстра игнорирует конфигурацию

`ClientSimulation.java`, создание Notice, сейчас `config.monsters().getFirst().id()`. То же упрощение пока в клиентском `monstrocity-local.api.ts`. В monstrocity-v5 конфигурация требует:
- день 0: mossback=1, twigwalker=0.3;
- с дня 3: mossback=1, twigwalker=0.7.

Новый режим навсегда убирает второго монстра. Подготовь серверный replay с выбором по положительным monsterWeights текущего tier в порядке массива config.monsters. Один PRNG draw для выбора при положительной сумме; нулевая сумма — первый монстр без draw. Порядок при создании Notice: random.id(), weighted selection, random.next() для optional. Прислать exact алгоритм и обновлённый cross-language fixture для синхронного обновления клиента Codex.

## 2. Клиенту не переданы публичные правила loot/target

Legacy balance v5: foodProbability=.7, waterProbability=.7, гарантированный старт food=1/water=1; меч берётся из override или config; indoor cupboard не должен быть пустым. Client simulation сейчас всегда выдаёт food+water. Combat target base/span привязаны в клиенте к строке версии вместо конфигурации. Для сохранения поведения передай в bootstrap публичную часть правил:
- loot: гарантированные стартовые количества, вероятности food/water, swordProbabilityOverride;
- combatTarget: baseY/spanY;
- гарантированные стартовые контейнеры конкретного run в seed (точные id, не предположение crate-start).

Не раскрывай приватную скорость офлайн-энергии вместе со всем balance.json. Предложи точные дополнения Config/SimulationState, совместимые с серверным типом. Для порядка random draws используй legacy правила: food draw, water draw, sword draw, при пустом обязательном indoor — отдельный draw выбора food/water; для гарантированного старта без draws.

## 3. Версия и миграция

Это изменение детерминированной симуляции. Нельзя молча менять правила старых активных checkpoint-сессий. Подготовь следующую engineVersion с переходом на create/resume, выдачей полного нового seed и отклонением пакетов предыдущего sessionId. Старый протокол должен продолжать работать. Включение новой версии — после синхронного изменения клиента и повторного cross-language/HTTP теста; не делай два разных алгоритма под одной версией без миграции.

## Проверки

- Веса {mossback:0,twigwalker:1}: каждый вызов выбирает twigwalker; обратные веса выбирают mossback.
- Фиксированный PRNG + последовательность встреч: одинаковые monsterId/optional и randomState в TS и Java.
- Loot 0/1 probabilities, guaranteedStart, пустой indoor cupboard, редкость меча.
- Оба монстра реально побеждаются; cooldown, полёт камня, sword-window и смерть.
- Без изменения защиты purchased, idempotency и offline settlement.
- Дай точный JSON bootstrap/seed и cross-language fixture. Не меняй клиент; Codex синхронно обновит TS и повторит проверку.

Исправления клиента, уже проверенные Codex и не требующие серверного изменения: дедупликация закрытия сессии при visibilitychange/pagehide/destroy; resume продолжает восстановление в рамках одной попытки после отказа устаревшего queued checkpoint, но не отбрасывает очередь при обычной сетевой ошибке.
