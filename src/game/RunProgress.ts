export const STAGES_PER_CHAPTER = 5;
export const FINAL_CHAPTER = 4;
export const FINAL_GLOBAL_STAGE = FINAL_CHAPTER * STAGES_PER_CHAPTER;

export interface RunProgress {
  chapterIndex: number;
  stageIndex: number;
  globalStageIndex: number;
  stagesCleared: number;
  hardMode: boolean;
}

export function getGlobalStageIndex(chapterIndex: number, stageIndex: number): number {
  return (chapterIndex - 1) * STAGES_PER_CHAPTER + stageIndex;
}

export function createInitialRunProgress(hardMode = false): RunProgress {
  return {
    chapterIndex: 1,
    stageIndex: 1,
    globalStageIndex: 1,
    stagesCleared: 0,
    hardMode,
  };
}

export function createRunProgressFromGlobalStage(globalStageIndex: number, hardMode = false): RunProgress {
  const safeGlobal = Math.max(1, Math.floor(Number(globalStageIndex) || 1));
  const chapterIndex = Math.floor((safeGlobal - 1) / STAGES_PER_CHAPTER) + 1;
  const stageIndex = ((safeGlobal - 1) % STAGES_PER_CHAPTER) + 1;
  return {
    chapterIndex,
    stageIndex,
    globalStageIndex: safeGlobal,
    stagesCleared: safeGlobal - 1,
    hardMode,
  };
}

export function normalizeRunProgress(value: Partial<RunProgress> | undefined): RunProgress {
  if (!value) return createInitialRunProgress();

  const chapterIndex = Math.max(1, Math.floor(Number(value.chapterIndex) || 1));
  const rawStage = Math.max(1, Math.floor(Number(value.stageIndex) || 1));
  const normalizedChapter = chapterIndex + Math.floor((rawStage - 1) / STAGES_PER_CHAPTER);
  const stageIndex = ((rawStage - 1) % STAGES_PER_CHAPTER) + 1;
  const globalStageIndex = getGlobalStageIndex(normalizedChapter, stageIndex);
  const stagesCleared = Math.max(
    globalStageIndex - 1,
    Math.floor(Number(value.stagesCleared) || 0),
  );
  const hardMode = value.hardMode === true;

  return {
    chapterIndex: normalizedChapter,
    stageIndex,
    globalStageIndex,
    stagesCleared,
    hardMode,
  };
}

export function advanceRunProgress(progress: RunProgress): RunProgress {
  const normalized = normalizeRunProgress(progress);
  const next = createRunProgressFromGlobalStage(normalized.globalStageIndex + 1, normalized.hardMode);
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
