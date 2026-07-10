import type { RunProgress } from "./RunProgress";

export type RunOutcome = "active" | "victory" | "defeat";

export interface RunStats {
  runId: string;
  elapsedSeconds: number;
  kills: number;
  eliteKills: number;
  bossKills: number;
  highestStage: number;
  stagesCleared: number;
  outcome: RunOutcome;
  settled: boolean;
}

export interface RunSummary extends RunStats {
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
    highestStage: Math.max(1, Math.floor(Number(raw.highestStage) || progress.globalStageIndex)),
    stagesCleared: Math.max(0, Math.floor(Number(raw.stagesCleared) || progress.stagesCleared)),
    outcome,
    settled: raw.settled === true || outcome !== "active",
  };
}

export function calculateRunReward(stats: RunStats, outcome: Exclude<RunOutcome, "active">): number {
  const stageReward = stats.stagesCleared * 5;
  const killReward = stats.kills;
  const eliteReward = stats.eliteKills * 6;
  const bossReward = stats.bossKills * 15;
  const victoryReward = outcome === "victory" ? 80 : 0;
  return Math.max(0, Math.floor(stageReward + killReward + eliteReward + bossReward + victoryReward));
}

