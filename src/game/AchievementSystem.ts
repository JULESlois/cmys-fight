import type { MetaProgress } from "./MetaProgress";
import type { RunOutcome, RunStats } from "./RunStats";

export type AchievementId = "first_blood" | "elite_breaker" | "boss_untouched" | "one_weapon" | "speed_runner" | "hard_conqueror";

export interface AchievementDefinition {
  id: AchievementId;
  name: string;
  description: string;
  reward: number;
}

export const ACHIEVEMENTS: Record<AchievementId, AchievementDefinition> = {
  first_blood: { id: "first_blood", name: "FIRST BLOOD", description: "Defeat your first enemy.", reward: 10 },
  elite_breaker: { id: "elite_breaker", name: "ELITE BREAKER", description: "Defeat 10 Elite enemies across all Runs.", reward: 25 },
  boss_untouched: { id: "boss_untouched", name: "UNTOUCHABLE", description: "Defeat a Boss without taking Boss damage.", reward: 30 },
  one_weapon: { id: "one_weapon", name: "MONOGAMY", description: "Complete a Run after firing only one weapon.", reward: 35 },
  speed_runner: { id: "speed_runner", name: "CLOCKBREAKER", description: "Complete a Run in under 15 minutes.", reward: 50 },
  hard_conqueror: { id: "hard_conqueror", name: "DEEPER STILL", description: "Complete a Hard Mode Run.", reward: 75 },
};

export const ACHIEVEMENT_IDS = Object.keys(ACHIEVEMENTS) as AchievementId[];

export function isAchievementId(value: unknown): value is AchievementId {
  return typeof value === "string" && value in ACHIEVEMENTS;
}

export function evaluateAchievements(
  meta: MetaProgress,
  stats: RunStats,
  outcome: Exclude<RunOutcome, "active">,
  hardMode: boolean,
): AchievementId[] {
  const unlocked = new Set(meta.unlockedAchievements);
  const result: AchievementId[] = [];
  const add = (id: AchievementId, condition: boolean) => {
    if (condition && !unlocked.has(id)) result.push(id);
  };
  add("first_blood", meta.lifetimeKills >= 1);
  add("elite_breaker", meta.lifetimeEliteKills >= 10);
  add("boss_untouched", stats.noHitBossKills >= 1);
  add("one_weapon", outcome === "victory" && stats.weaponsUsed.length === 1);
  add("speed_runner", outcome === "victory" && stats.elapsedSeconds <= 15 * 60);
  add("hard_conqueror", outcome === "victory" && hardMode);
  return result;
}

export function getAchievementReward(ids: AchievementId[]): number {
  return ids.reduce((sum, id) => sum + ACHIEVEMENTS[id].reward, 0);
}
