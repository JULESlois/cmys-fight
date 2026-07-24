import { FINAL_GLOBAL_STAGE, type RunProgress } from "./RunProgress";

export type RunOutcome = "active" | "victory" | "defeat";

export interface RunStats {
  runId: string;
  elapsedSeconds: number;
  kills: number;
  eliteKills: number;
  bossKills: number;
  highestStage: number;
  stagesCleared: number;
  weaponsUsed: string[];
  bossFightActive: boolean;
  currentBossDamageTaken: number;
  noHitBossKills: number;
  challengeCompleted: boolean;
  outcome: RunOutcome;
  settled: boolean;
}

export interface RunSummary extends RunStats {
  baseReward: number;
  challengeReward: number;
  achievementReward: number;
  newAchievements: string[];
  rewardEarned: number;
  totalCurrency: number;
  newUnlocks: string[];
  alreadyClaimed: boolean;
}

function createRunId(): string {
  const cryptoObject = globalThis.crypto as Crypto | undefined;
  if (cryptoObject?.randomUUID) return cryptoObject.randomUUID();
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createRunStats(progress: RunProgress): RunStats {
  return {
    runId: createRunId(),
    elapsedSeconds: 0,
    kills: 0,
    eliteKills: 0,
    bossKills: 0,
    highestStage: Math.max(1, progress.globalStageIndex),
    stagesCleared: Math.max(0, progress.stagesCleared),
    weaponsUsed: [],
    bossFightActive: false,
    currentBossDamageTaken: 0,
    noHitBossKills: 0,
    challengeCompleted: false,
    outcome: "active",
    settled: false,
  };
}

export function normalizeRunStats(value: unknown, progress: RunProgress): RunStats {
  const fallback = createRunStats(progress);
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Partial<RunStats>;
  const outcome: RunOutcome = raw.outcome === "victory" || raw.outcome === "defeat"
    ? raw.outcome
    : "active";
  const runId = typeof raw.runId === "string" && raw.runId.length > 0
    ? raw.runId
    : fallback.runId;
  return {
    runId,
    elapsedSeconds: Math.max(0, Number(raw.elapsedSeconds) || 0),
    kills: Math.max(0, Math.floor(Number(raw.kills) || 0)),
    eliteKills: Math.max(0, Math.floor(Number(raw.eliteKills) || 0)),
    bossKills: Math.max(0, Math.floor(Number(raw.bossKills) || 0)),
    highestStage: Math.max(1, Math.floor(Number(raw.highestStage) || 1)),
    stagesCleared: Math.max(0, Math.floor(Number(raw.stagesCleared) || 0)),
    weaponsUsed: Array.isArray(raw.weaponsUsed)
      ? [...new Set(raw.weaponsUsed.filter(value => typeof value === "string"))]
      : [],
    bossFightActive: raw.bossFightActive === true,
    currentBossDamageTaken: Math.max(0, Number(raw.currentBossDamageTaken) || 0),
    noHitBossKills: Math.max(0, Math.floor(Number(raw.noHitBossKills) || 0)),
    challengeCompleted: raw.challengeCompleted === true,
    outcome,
    settled: raw.settled === true || outcome !== "active",
  };
}

export function calculateRunReward(stats: RunStats, outcome: Exclude<RunOutcome, "active">): number {
  // Preserve the former 20-stage full-run reward after compressing the run to
  // four stages per chapter.
  const stageReward = Math.round(stats.stagesCleared * (100 / FINAL_GLOBAL_STAGE));
  const killReward = stats.kills;
  const eliteReward = stats.eliteKills * 6;
  const bossReward = stats.bossKills * 15;
  const victoryReward = outcome === "victory" ? 80 : 0;
  return Math.max(0, Math.floor(stageReward + killReward + eliteReward + bossReward + victoryReward));
}

