import { isChallengeId, type ChallengeId } from "./ChallengeSystem";

export const LEGACY_STAGES_PER_CHAPTER = 5;
export const STAGES_PER_CHAPTER = 4;
export const FINAL_CHAPTER = 4;
export const FINAL_GLOBAL_STAGE = FINAL_CHAPTER * STAGES_PER_CHAPTER;

export interface RunProgress {
  chapterIndex: number;
  stageIndex: number;
  globalStageIndex: number;
  stagesCleared: number;
  hardMode: boolean;
  challengeId?: ChallengeId;
  challengeKey?: string;
}

export function getGlobalStageIndex(chapterIndex: number, stageIndex: number): number {
  return (chapterIndex - 1) * STAGES_PER_CHAPTER + stageIndex;
}

export function getDifficultyStageIndex(globalStageIndex: number): number {
  const progress = createRunProgressFromGlobalStage(globalStageIndex);
  const withinChapter = [1, 2, 4, 5][Math.max(0, Math.min(3, progress.stageIndex - 1))];
  return (progress.chapterIndex - 1) * LEGACY_STAGES_PER_CHAPTER + withinChapter;
}

export function migrateLegacyGlobalStage(globalStageIndex: number): number {
  const safeLegacy = Math.max(1, Math.floor(Number(globalStageIndex) || 1));
  const chapterIndex = Math.min(FINAL_CHAPTER, Math.floor((safeLegacy - 1) / LEGACY_STAGES_PER_CHAPTER) + 1);
  const legacyStageIndex = ((safeLegacy - 1) % LEGACY_STAGES_PER_CHAPTER) + 1;
  const stageIndex = Math.min(STAGES_PER_CHAPTER, legacyStageIndex);
  return getGlobalStageIndex(chapterIndex, stageIndex);
}

export function migrateLegacyRunProgress(value: Partial<RunProgress> | undefined): RunProgress {
  if (!value) return createInitialRunProgress();
  const chapterIndex = Math.max(1, Math.floor(Number(value.chapterIndex) || 1));
  const stageIndex = Math.max(1, Math.floor(Number(value.stageIndex) || 1));
  const legacyGlobalStage = Number.isFinite(Number(value.globalStageIndex))
    ? Number(value.globalStageIndex)
    : (chapterIndex - 1) * LEGACY_STAGES_PER_CHAPTER + stageIndex;
  const migrated = createRunProgressFromGlobalStage(
    migrateLegacyGlobalStage(legacyGlobalStage),
    value.hardMode === true,
    isChallengeId(value.challengeId) ? value.challengeId : undefined,
    typeof value.challengeKey === "string" ? value.challengeKey : undefined,
  );
  migrated.stagesCleared = migrated.globalStageIndex - 1;
  return migrated;
}

export function createInitialRunProgress(
  hardMode = false,
  challengeId?: ChallengeId,
  challengeKey?: string,
): RunProgress {
  return {
    chapterIndex: 1,
    stageIndex: 1,
    globalStageIndex: 1,
    stagesCleared: 0,
    hardMode,
    challengeId: hardMode ? challengeId : undefined,
    challengeKey: hardMode && challengeId ? challengeKey : undefined,
  };
}

export function createRunProgressFromGlobalStage(
  globalStageIndex: number,
  hardMode = false,
  challengeId?: ChallengeId,
  challengeKey?: string,
): RunProgress {
  const safeGlobal = Math.min(FINAL_GLOBAL_STAGE, Math.max(1, Math.floor(Number(globalStageIndex) || 1)));
  const chapterIndex = Math.floor((safeGlobal - 1) / STAGES_PER_CHAPTER) + 1;
  const stageIndex = ((safeGlobal - 1) % STAGES_PER_CHAPTER) + 1;
  return {
    chapterIndex,
    stageIndex,
    globalStageIndex: safeGlobal,
    stagesCleared: safeGlobal - 1,
    hardMode,
    challengeId: hardMode ? challengeId : undefined,
    challengeKey: hardMode && challengeId ? challengeKey : undefined,
  };
}

export function normalizeRunProgress(value: Partial<RunProgress> | undefined): RunProgress {
  if (!value) return createInitialRunProgress();

  const chapterIndex = Math.max(1, Math.floor(Number(value.chapterIndex) || 1));
  const rawStage = Math.max(1, Math.floor(Number(value.stageIndex) || 1));
  const normalizedChapter = chapterIndex + Math.floor((rawStage - 1) / STAGES_PER_CHAPTER);
  const stageIndex = ((rawStage - 1) % STAGES_PER_CHAPTER) + 1;
  const normalized = createRunProgressFromGlobalStage(getGlobalStageIndex(normalizedChapter, stageIndex));
  const globalStageIndex = normalized.globalStageIndex;
  const stagesCleared = Math.max(
    globalStageIndex - 1,
    Math.min(FINAL_GLOBAL_STAGE - 1, Math.floor(Number(value.stagesCleared) || 0)),
  );
  const hardMode = value.hardMode === true;
  const challengeId = hardMode && isChallengeId(value.challengeId) ? value.challengeId : undefined;
  const challengeKey = challengeId && typeof value.challengeKey === "string" && value.challengeKey.length > 0
    ? value.challengeKey
    : undefined;

  return {
    chapterIndex: normalized.chapterIndex,
    stageIndex: normalized.stageIndex,
    globalStageIndex,
    stagesCleared,
    hardMode,
    challengeId,
    challengeKey,
  };
}

export function advanceRunProgress(progress: RunProgress): RunProgress {
  const normalized = normalizeRunProgress(progress);
  const next = createRunProgressFromGlobalStage(
    normalized.globalStageIndex + 1,
    normalized.hardMode,
    normalized.challengeId,
    normalized.challengeKey,
  );
  next.stagesCleared = normalized.stagesCleared + 1;
  return next;
}

export function isBossStage(progress: Pick<RunProgress, "stageIndex">): boolean {
  return progress.stageIndex === STAGES_PER_CHAPTER;
}

export function isFinalStage(progress: Pick<RunProgress, "chapterIndex" | "stageIndex">): boolean {
  return progress.chapterIndex === FINAL_CHAPTER && progress.stageIndex === STAGES_PER_CHAPTER;
}

export function getStageLabel(progress: Pick<RunProgress, "chapterIndex" | "stageIndex">): string {
  return `${progress.chapterIndex}-${progress.stageIndex}`;
}
