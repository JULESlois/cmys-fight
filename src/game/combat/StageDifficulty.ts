import type { StageData } from "../FloorGenerator";
import type { Enemy } from "../entities/Enemy";

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

export function getStageDifficulty(stage: Pick<StageData, "globalStageIndex" | "chapterIndex">): StageDifficulty {
  const globalStageIndex = Math.max(1, Math.floor(stage.globalStageIndex || 1));
  const chapterIndex = Math.max(1, Math.floor(stage.chapterIndex || 1));
  const progress = globalStageIndex - 1;

  return {
    globalStageIndex,
    chapterIndex,
    healthMultiplier: 1 + progress * 0.12,
    speedMultiplier: 1 + Math.min(0.35, progress * 0.025),
    enemyDamage: 2 + Math.floor(progress / 5),
    rangedProjectileSpeed: 90 + Math.min(54, progress * 4),
    attackCooldownMultiplier: Math.max(0.72, 1 - progress * 0.025),
    normalWaveCount: Math.min(3, 1 + (globalStageIndex >= 3 ? 1 : 0) + (globalStageIndex >= 8 ? 1 : 0)),
    enemiesPerWave: Math.min(4, 2 + Math.floor(progress / 3)),
    rangedChance: Math.min(0.65, 0.25 + progress * 0.035),
    eliteChance: globalStageIndex < 3 ? 0 : Math.min(0.3, 0.08 + (globalStageIndex - 3) * 0.025),
    bossHealthMultiplier: 1 + (chapterIndex - 1) * 0.5 + progress * 0.05,
    bossProjectileSpeed: 60 + Math.min(48, (chapterIndex - 1) * 8 + progress * 2),
    bossProjectileCount: Math.min(16, 8 + (chapterIndex - 1) * 2),
    rewardMultiplier: 1 + progress * 0.15,
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
