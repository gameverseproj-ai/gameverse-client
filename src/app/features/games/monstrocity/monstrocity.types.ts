// Types mirror docs/monstrocity/openapi.json v0.1.0.
export type Point = {
    x: number;
    z: number;
};
export type Phase = "day" | "evening" | "night" | "morning";
export type ItemId = "food" | "water" | "sword";
export type ItemStack = {
    itemId: ItemId;
    collected: number;
    purchased: number;
};
export type Profile = {
    character: "male" | "female";
    bestSurvivedDays: number;
    inventory: (ItemStack)[];
};
export type Shelter = {
    id: string;
    position: Point;
    source: "start" | "exploration" | "resident";
};
export type Resource = {
    id: string;
    position: Point;
    kind: "container" | "building" | "resident" | "shelter";
    state: "available" | "searched" | "discovered";
};
export type Monster = {
    id: string;
    artId: string;
    hitsToDefeat: number;
    approachSeconds: number;
    motion: "straight" | "zigzag" | "stop-start";
    swordWindowSeconds: number;
    hitRadius: number;
    /** First survived day with evasive movement; omitted keeps legacy server behavior. */
    motionStartsDay?: number;
    motionAmplitude: number;
    motionPeriodSeconds: number;
};
export type DifficultyTier = {
    fromDay: number;
    encountersPerActiveMinute: number;
    monsterWeights: Record<string, number>;
    optionalEncounterProbability: number;
};
export type Config = {
    version: string;
    mapVersion: string;
    assetManifestVersion: string;
    phaseSeconds: {
        day: number;
        evening: number;
        night: number;
        morning: number;
    };
    energyMax: number;
    onlineEnergyPerSecond: number;
    restoreEnergy: {
        food: number;
        water: number;
    };
    outsideDisconnectGraceSeconds: number;
    recoveryActiveSeconds: number;
    stoneCooldownSeconds: number;
    stoneFlightSeconds: number;
    encounterWarningSeconds: number;
    combatResultHoldSeconds: number;
    searchActiveSeconds: number;
    moveUnitsPerSecond: number;
    interactionRadius: number;
    shelterRadius: number;
    noticeSeconds: number;
    escapeDistance: number;
    loseSightSeconds: number;
    swordLootProbability: number;
    lootTableVersion: string;
    monsters: (Monster)[];
    difficulty: (DifficultyTier)[];
    fog: {
        chancePerPhase: number;
        durationSeconds: number;
    };
    transport: {
        inputTickMs: number;
        syncIntervalMs: number;
        maxBatchFrames: number;
        disconnectAfterSeconds: number;
    };
};
export type Combat = {
    encounterId: string;
    monsterId: string;
    phase: "warning" | "approaching" | "sword-window" | "won" | "lost";
    elapsedActiveMs: number;
    hitsRemaining: number;
    target: {
        x: number;
        y: number;
    };
    swordWindowRemainingMs: number;
    nextThrowActiveMs: number;
};
export type Notice = {
    encounterId: string;
    monsterId: string;
    optional: boolean;
    attention: number;
    position: Point;
};
export type Search = {
    targetId: string;
    remainingActiveMs: number;
};
export type Dialogue = {
    residentId: string;
    textKey: string;
    revealedShelterId: string | null;
};
export type Run = {
    id: string;
    revision: number;
    configVersion: string;
    mapVersion: string;
    status: "active" | "dead";
    activeElapsedMs: number;
    survivedDays: number;
    phase: Phase;
    phaseRemainingMs: number;
    energy: number;
    position: Point;
    shelterId: string | null;
    recoveryRemainingActiveMs: number | null;
    knownShelters: (Shelter)[];
    nearby: (Resource)[];
    notice: Notice | null;
    search: Search | null;
    dialogue: Dialogue | null;
    combat: Combat | null;
    fogRemainingActiveMs: number;
    deathReason: "energy" | "monster" | "disconnected" | null;
};
export type Session = {
    id: string;
    status: "active" | "paused" | "disconnected";
    pauseReason: "map" | "inventory" | "dialogue" | null;
    lastAcceptedInputSequence: number;
    lastSeenAt: string;
    outsideReturnDeadline: string | null;
};
export type Snapshot = {
    serverTime: string;
    profile: Profile;
    run: Run | null;
    session: Session | null;
};
export type Bootstrap = {
    config: Config;
    snapshot: Snapshot;
};
export type CreateRun = {
    character: "male" | "female";
    configVersion: string;
};
export type Resume = {
    takeover: boolean;
};
export type Input = {
    sequence: number;
    moveX: number;
    moveZ: number;
};
export type Sync = {
    sessionId: string;
    frames: (Input)[];
};
export type CommandBase = {
    sessionId: string;
    expectedRevision: number;
};
export type Pause = {
    sessionId: string;
    expectedRevision: number;
    reason: "map" | "inventory" | "dialogue";
};
export type Unpause = {
    sessionId: string;
    expectedRevision: number;
};
export type Consume = {
    sessionId: string;
    expectedRevision: number;
    itemId: "food" | "water";
};
export type Target = {
    sessionId: string;
    expectedRevision: number;
    targetId: string;
};
export type Throw = {
    sessionId: string;
    expectedRevision: number;
    encounterId: string;
    aimX: number;
    aimY: number;
};
export type Sword = {
    sessionId: string;
    expectedRevision: number;
    encounterId: string;
};
export type Disconnect = {
    sessionId: string;
    expectedRevision: number;
};
