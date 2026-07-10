import type { StageData } from "../FloorGenerator";
import type { Enemy } from "../entities/Enemy";
import { getChallengeDifficulty } from "../ChallengeSystem";

export interface StageDifficulty {
  globalStageIndex: number;
  chapterIndex: number;
  healthMultiplier: number;
  speedMultiplier: number;
  enemyDamage: number;
  rangedProjectileSpeed: number;
  attackCooldownMultiplier: number;
  normalWaveCount: number;
  enemiesPerWave: number;
  rangedChance: number;
  eliteChance: number;
  bossHealthMultiplier: number;
  bossProjectileSpeed: number;
  bossProjectileCount: number;
  rewardMultiplier: number;
}

export function getStageDifficulty(
  stage: Pick<StageData, "globalStageIndex" | "chapterIndex"> & Partial<Pick<StageData, "hardMode" | "challengeId">>,
): StageDifficulty {
  const globalStageIndex = Math.max(1, Math.floor(stage.globalStageIndex || 1));
  const chapterIndex = Math.max(1, Math.floor(stage.chapterIndex || 1));
  const progress = globalStageIndex - 1;
  const hard = stage.hardMode === true;
  const healthScale = hard ? 1.35 : 1;
  const speedScale = hard ? 1.08 : 1;
  const cooldownScale = hard ? 0.88 : 1;
  const rewardScale = hard ? 1.35 : 1;
  const challenge = getChallengeDifficulty(stage.challengeId);

  return {
    globalStageIndex,
    chapterIndex,
    healthMultiplier: (1 + progress * 0.12) * healthScale,
    speedMultiplier: (1 + Math.min(0.35, progress * 0.025)) * speedScale * challenge.speedMultiplier,
    enemyDamage: 2 + Math.floor(progress / 5) + (hard ? 1 : 0),
    rangedProjectileSpeed: (90 + Math.min(54, progress * 4)) * (hard ? 1.12 : 1),
    attackCooldownMultiplier: Math.max(0.62, (1 - progress * 0.025) * cooldownScale),
    normalWaveCount: Math.min(4, 1 + (globalStageIndex >= 3 ? 1 : 0) + (globalStageIndex >= 8 ? 1 : 0) + (hard ? 1 : 0)),
    enemiesPerWave: Math.min(4, 2 + Math.floor(progress / 3)),
    rangedChance: Math.min(0.65, 0.25 + progress * 0.035),
    eliteChance: globalStageIndex < 3 && !hard && challenge.eliteChanceBonus === 0
      ? 0
      : Math.min(
        0.55,
        0.08 + (globalStageIndex - 3) * 0.025 + (hard ? 0.12 : 0) + challenge.eliteChanceBonus,
      ),
    bossHealthMultiplier: (1 + (chapterIndex - 1) * 0.5 + progress * 0.05) * (hard ? 1.45 : 1),
    bossProjectileSpeed: (60 + Math.min(48, (chapterIndex - 1) * 8 + progress * 2)) * (hard ? 1.12 : 1),
    bossProjectileCount: Math.min(20, 8 + (chapterIndex - 1) * 2 + (hard ? 2 : 0)),
    rewardMultiplier: (1 + progress * 0.15) * rewardScale,
  };
}

export function applyStageDifficulty(enemy: Enemy, difficulty: StageDifficulty): Enemy {
  if (enemy.type === "boss") {
    enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * difficulty.bossHealthMultiplier));
    enemy.speed *= Math.min(1.25, difficulty.speedMultiplier);
    enemy.attackDamage += Math.floor((difficulty.globalStageIndex - 1) / 5);
    enemy.projectileSpeed = Math.max(enemy.projectileSpeed, difficulty.bossProjectileSpeed);
    enemy.projectileCount = Math.max(enemy.projectileCount, difficulty.bossProjectileCount);
    enemy.attackInterval *= difficulty.attackCooldownMultiplier;
    enemy.attackWindup = Math.max(0.42, enemy.attackWindup * difficulty.attackCooldownMultiplier);
  } else {
    enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * difficulty.healthMultiplier));
    enemy.speed *= difficulty.speedMultiplier;
    enemy.attackDamage += Math.max(0, difficulty.enemyDamage - 2);
    enemy.projectileSpeed = Math.max(
      enemy.projectileSpeed,
      difficulty.rangedProjectileSpeed * Math.max(0.8, enemy.projectileSpeed / 90),
    );
    enemy.attackInterval *= difficulty.attackCooldownMultiplier;
    enemy.attackWindup = Math.max(0.22, enemy.attackWindup * difficulty.attackCooldownMultiplier);
  }

  enemy.hp = enemy.maxHp;
  enemy.attackCooldown = Math.min(enemy.attackCooldown, enemy.attackInterval);
  return enemy;
}
