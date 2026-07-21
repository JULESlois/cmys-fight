import { isChallengeId, type ChallengeId } from "./ChallengeSystem";

export const STAGES_PER_CHAPTER = 4;
export const FINAL_CHAPTER = 4;
export const FINAL_GLOBAL_STAGE = FINAL_CHAPTER * STAGES_PER_CHAPTER;

export interface RunProgress {
  worldNodeId: string;
  routeDepth: number;
  stageWithinNode: number;
  routeHistory: string[];

  hardMode: boolean;
  challengeId?: ChallengeId;
  challengeKey?: string;
  
  // Legacy fields to be cleaned up gradually
  chapterIndex?: number;
  stageIndex?: number;
  globalStageIndex?: number;
  stagesCleared?: number;
}

export function migrateLegacyRunProgress(value: any): RunProgress {
  if (!value) return createInitialRunProgress();
  
  // If it's already using new format
  if (value.worldNodeId) {
    return {
      worldNodeId: value.worldNodeId,
      routeDepth: Number(value.routeDepth) || 1,
      stageWithinNode: Number(value.stageWithinNode) || 1,
      routeHistory: Array.isArray(value.routeHistory) ? value.routeHistory : [],
      hardMode: value.hardMode === true,
      challengeId: isChallengeId(value.challengeId) ? value.challengeId : undefined,
      challengeKey: typeof value.challengeKey === "string" ? value.challengeKey : undefined,
    };
  }

  // Migrate from legacy format
  const chapterIndex = Math.max(1, Math.floor(Number(value.chapterIndex) || 1));
  const stageIndex = Math.max(1, Math.floor(Number(value.stageIndex) || 1));
  
  let nodeId = "overgrown_archive";
  if (chapterIndex === 2) nodeId = "cooling_canal";
  if (chapterIndex === 3) nodeId = "sealed_armory";
  
  return {
    worldNodeId: nodeId,
    routeDepth: chapterIndex,
    stageWithinNode: stageIndex,
    routeHistory: [],
    hardMode: value.hardMode === true,
    challengeId: isChallengeId(value.challengeId) ? value.challengeId : undefined,
    challengeKey: typeof value.challengeKey === "string" ? value.challengeKey : undefined,
  };
}

export function createInitialRunProgress(
  hardMode = false,
  challengeId?: ChallengeId,
  challengeKey?: string,
): RunProgress {
  return {
    worldNodeId: "overgrown_archive",
    routeDepth: 1,
    stageWithinNode: 1,
    routeHistory: [],
    hardMode,
    challengeId: hardMode ? challengeId : undefined,
    challengeKey: hardMode && challengeId ? challengeKey : undefined,
  };
}

export function advanceRunProgress(progress: RunProgress): RunProgress {
  // In the future, this should take the selected exit destination.
  // For now, if we reach the end of the node, we just advance to the next node manually.
  
  const next = { ...progress };
  
  if (next.stageWithinNode >= STAGES_PER_CHAPTER) {
    next.stageWithinNode = 1;
    next.routeDepth += 1;
    next.routeHistory.push(next.worldNodeId);
    
    // Default advancement if no exit chosen (temporary)
    if (next.worldNodeId === "overgrown_archive") {
      next.worldNodeId = "cooling_canal";
    } else {
      next.worldNodeId = "sealed_armory";
    }
  } else {
    next.stageWithinNode += 1;
  }
  
  return next;
}

export function normalizeRunProgress(value: any): RunProgress {
  return migrateLegacyRunProgress(value);
}

export function getGlobalStageIndex(chapterIndex: number, stageIndex: number): number {
  return (chapterIndex - 1) * STAGES_PER_CHAPTER + stageIndex;
}

export function migrateLegacyGlobalStage(globalStageIndex: number): number {
  const safeLegacy = Math.max(1, Math.floor(Number(globalStageIndex) || 1));
  const chapterIndex = Math.min(FINAL_CHAPTER, Math.floor((safeLegacy - 1) / 5) + 1);
  const legacyStageIndex = ((safeLegacy - 1) % 5) + 1;
  const stageIndex = Math.min(STAGES_PER_CHAPTER, legacyStageIndex);
  return getGlobalStageIndex(chapterIndex, stageIndex);
}

export function createRunProgressFromGlobalStage(
  globalStageIndex: number,
  hardMode = false,
  challengeId?: ChallengeId,
  challengeKey?: string,
): RunProgress {
  const safeGlobal = Math.max(1, Math.floor(Number(globalStageIndex) || 1));
  const chapterIndex = Math.floor((safeGlobal - 1) / STAGES_PER_CHAPTER) + 1;
  const stageIndex = ((safeGlobal - 1) % STAGES_PER_CHAPTER) + 1;
  
  let nodeId = "overgrown_archive";
  if (chapterIndex === 2) nodeId = "cooling_canal";
  if (chapterIndex === 3) nodeId = "sealed_armory";
  
  return {
    worldNodeId: nodeId,
    routeDepth: chapterIndex,
    stageWithinNode: stageIndex,
    routeHistory: [],
    hardMode,
    challengeId: hardMode ? challengeId : undefined,
    challengeKey: hardMode && challengeId ? challengeKey : undefined,
  };
}

export function getDifficultyStageIndex(globalStageIndex: number): number {
  const progress = createRunProgressFromGlobalStage(globalStageIndex);
  return (progress.routeDepth - 1) * 5 + [1, 2, 4, 5][Math.max(0, Math.min(3, progress.stageWithinNode - 1))];
}

export function isBossStage(progress: Pick<RunProgress, "stageWithinNode">): boolean {
  return progress.stageWithinNode === STAGES_PER_CHAPTER;
}

export function isFinalStage(progress: Pick<RunProgress, "routeDepth" | "stageWithinNode">): boolean {
  return progress.routeDepth >= FINAL_CHAPTER && progress.stageWithinNode === STAGES_PER_CHAPTER;
}

export function getStageLabel(progress: Pick<RunProgress, "routeDepth" | "stageWithinNode">): string {
  return `${progress.routeDepth}-${progress.stageWithinNode}`;
}

