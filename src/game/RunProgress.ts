export const STAGES_PER_CHAPTER = 5;

export interface RunProgress {
  chapterIndex: number;
  stageIndex: number;
  globalStageIndex: number;
  stagesCleared: number;
}

export function getGlobalStageIndex(chapterIndex: number, stageIndex: number): number {
  return (chapterIndex - 1) * STAGES_PER_CHAPTER + stageIndex;
}

export function createInitialRunProgress(): RunProgress {
  return {
    chapterIndex: 1,
    stageIndex: 1,
    globalStageIndex: 1,
    stagesCleared: 0,
  };
}

export function createRunProgressFromGlobalStage(globalStageIndex: number): RunProgress {
  const safeGlobal = Math.max(1, Math.floor(Number(globalStageIndex) || 1));
  const chapterIndex = Math.floor((safeGlobal - 1) / STAGES_PER_CHAPTER) + 1;
  const stageIndex = ((safeGlobal - 1) % STAGES_PER_CHAPTER) + 1;
  return {
    chapterIndex,
    stageIndex,
    globalStageIndex: safeGlobal,
    stagesCleared: safeGlobal - 1,
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

  return {
    chapterIndex: normalizedChapter,
    stageIndex,
    globalStageIndex,
    stagesCleared,
  };
}

export function advanceRunProgress(progress: RunProgress): RunProgress {
  const normalized = normalizeRunProgress(progress);
  const next = createRunProgressFromGlobalStage(normalized.globalStageIndex + 1);
  next.stagesCleared = normalized.stagesCleared + 1;
  return next;
}

export function isBossStage(progress: Pick<RunProgress, "stageIndex">): boolean {
  return progress.stageIndex === STAGES_PER_CHAPTER;
}

export function getStageLabel(progress: Pick<RunProgress, "chapterIndex" | "stageIndex">): string {
  return `${progress.chapterIndex}-${progress.stageIndex}`;
}
