import type { RunOutcome, RunStats } from "./RunStats";

export type ChallengeId = "elite_hunt" | "pistol_oath" | "speed_trial";

export interface ChallengeDefinition {
  id: ChallengeId;
  name: string;
  description: string;
  shortObjective: string;
  reward: number;
}

export const CHALLENGES: Record<ChallengeId, ChallengeDefinition> = {
  elite_hunt: {
    id: "elite_hunt",
    name: "ELITE HUNT",
    description: "Defeat at least 5 Elite enemies.",
    shortObjective: "DEFEAT 5 ELITES",
    reward: 35,
  },
  pistol_oath: {
    id: "pistol_oath",
    name: "PISTOL OATH",
    description: "Complete the Run after firing only the Pistol.",
    shortObjective: "PISTOL-ONLY WIN",
    reward: 60,
  },
  speed_trial: {
    id: "speed_trial",
    name: "SPEED TRIAL",
    description: "Complete the Run in under 15 minutes.",
    shortObjective: "WIN UNDER 15:00",
    reward: 75,
  },
};

export const CHALLENGE_IDS = Object.keys(CHALLENGES) as ChallengeId[];

export function isChallengeId(value: unknown): value is ChallengeId {
  return typeof value === "string" && value in CHALLENGES;
}

export function getDailyChallengeId(date = new Date()): ChallengeId {
  const dayIndex = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000);
  return CHALLENGE_IDS[((dayIndex % CHALLENGE_IDS.length) + CHALLENGE_IDS.length) % CHALLENGE_IDS.length];
}

export function getChallengeDateKey(challengeId: ChallengeId, date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}:${challengeId}`;
}

export function getDailyChallengeKey(date = new Date()): string {
  return getChallengeDateKey(getDailyChallengeId(date), date);
}

export function evaluateChallenge(
  challengeId: ChallengeId | undefined,
  stats: RunStats,
  outcome: Exclude<RunOutcome, "active">,
): boolean {
  if (!challengeId) return false;
  if (challengeId === "elite_hunt") return stats.eliteKills >= 5;
  if (challengeId === "pistol_oath") {
    return outcome === "victory" && stats.weaponsUsed.length === 1 && stats.weaponsUsed[0] === "pistol";
  }
  return outcome === "victory" && stats.elapsedSeconds <= 15 * 60;
}

export function getChallengeReward(challengeId: ChallengeId | undefined): number {
  return challengeId ? CHALLENGES[challengeId].reward : 0;
}

export function getChallengeDifficulty(challengeId: ChallengeId | undefined) {
  return {
    eliteChanceBonus: challengeId === "elite_hunt" ? 0.15 : 0,
    speedMultiplier: challengeId === "speed_trial" ? 1.1 : 1,
  };
}
