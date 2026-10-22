import { Config } from './monstrocity.types';
/** Local preview only; the HTTP adapter receives all balance from bootstrap. */
export const LOCAL_CONFIG: Config = {
    "version": "monstrocity-v2",
    "mapVersion": "courtyard-v1",
    "assetManifestVersion": "art-v1",
    "phaseSeconds": {
        "day": 240,
        "evening": 120,
        "night": 240,
        "morning": 120
    },
    "energyMax": 100,
    "onlineEnergyPerSecond": 0.08,
    "restoreEnergy": {
        "food": 30,
        "water": 18
    },
    "outsideDisconnectGraceSeconds": 120,
    "recoveryActiveSeconds": 60,
    "stoneCooldownSeconds": 0.9,
    "stoneFlightSeconds": 0.45,
    "encounterWarningSeconds": 1.5,
    "combatResultHoldSeconds": 1.2,
    "searchActiveSeconds": 2,
    "moveUnitsPerSecond": 3.2,
    "interactionRadius": 1.8,
    "shelterRadius": 2,
    "noticeSeconds": 4,
    "escapeDistance": 9,
    "loseSightSeconds": 1.5,
    "swordLootProbability": 0.04,
    "lootTableVersion": "loot-v1",
    "monsters": [
        {
            "id": "mossback",
            "artId": "mossback",
            "hitsToDefeat": 2,
            "approachSeconds": 40,
            "motion": "straight",
            "swordWindowSeconds": 3,
            "hitRadius": 0.18,
            "motionAmplitude": 0,
            "motionPeriodSeconds": 4
        },
        {
            "id": "twigwalker",
            "artId": "twigwalker",
            "hitsToDefeat": 2,
            "approachSeconds": 40,
            "motion": "zigzag",
            "motionStartsDay": 30,
            "swordWindowSeconds": 3,
            "hitRadius": 0.18,
            "motionAmplitude": 0.04,
            "motionPeriodSeconds": 8
        }
    ],
    "difficulty": [
        {
            "fromDay": 0,
            "encountersPerActiveMinute": 0.6,
            "monsterWeights": {
                "mossback": 1,
                "twigwalker": 0.3
            },
            "optionalEncounterProbability": 0.65
        },
        {
            "fromDay": 3,
            "encountersPerActiveMinute": 0.85,
            "monsterWeights": {
                "mossback": 1,
                "twigwalker": 0.7
            },
            "optionalEncounterProbability": 0.6
        }
    ],
    "fog": {
        "chancePerPhase": 0.2,
        "durationSeconds": 75
    },
    "transport": {
        "inputTickMs": 50,
        "syncIntervalMs": 250,
        "maxBatchFrames": 10,
        "disconnectAfterSeconds": 5
    }
};
