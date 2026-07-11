import type { EnemySpawn } from "./EncounterController";
import type { StageData } from "./FloorGenerator";
import { Enemy } from "./entities/Enemy";
import { acquireEnemy } from "./EntityPools";
import {
  getBossDefinition,
  getEnemyDefinition,
  getEnemyPool,
  getThemeForChapter,
  isEnemyId,
  type EnemyDefinition,
  type EnemyRole,
} from "./data/enemies";
import { applyStageDifficulty, getStageDifficulty } from "./combat/StageDifficulty";

function fallbackDefinition(stage: StageData, role: EnemyRole): EnemyDefinition {
  const theme = getThemeForChapter(stage.chapterIndex);
  if (role === "boss") return getBossDefinition(theme);
  return getEnemyPool(theme, role)[0] ?? getEnemyPool(theme)[0];
}

export class EnemyFactory {
  static create(stage: StageData, spawn: EnemySpawn): Enemy {
    const definition = isEnemyId(spawn.enemyId)
      ? getEnemyDefinition(spawn.enemyId)
      : fallbackDefinition(stage, spawn.type);
    const enemy = acquireEnemy(spawn.x, spawn.y, definition.role);
    EnemyFactory.applyDefinition(enemy, definition);
    applyStageDifficulty(enemy, getStageDifficulty(stage));
    if (spawn.isElite && enemy.type !== "boss") EnemyFactory.applyElite(enemy);
    return enemy;
  }

  static applyDefinition(enemy: Enemy, definition: EnemyDefinition): Enemy {
    enemy.enemyId = definition.id;
    enemy.name = definition.name;
    enemy.type = definition.role;
    enemy.behavior = definition.behavior;
    enemy.displayColor = definition.color;
    enemy.maxHp = definition.maxHp;
    enemy.hp = enemy.maxHp;
    enemy.speed = definition.speed;
    enemy.radius = Math.max(
      definition.role === "boss" ? 7 : 4,
      Math.round(definition.radius * (definition.role === "boss" ? 0.72 : 0.66)),
    );
    enemy.attackDamage = definition.attackDamage;
    enemy.attackInterval = definition.attackInterval;
    enemy.attackWindup = definition.attackWindup;
    enemy.projectileSpeed = definition.projectileSpeed ?? enemy.projectileSpeed;
    enemy.projectileCount = definition.projectileCount ?? enemy.projectileCount;
    enemy.projectileSpread = definition.projectileSpread ?? enemy.projectileSpread;
    enemy.chargeDistance = definition.chargeDistance ?? enemy.chargeDistance;
    enemy.areaRadius = definition.areaRadius ?? enemy.areaRadius;
    enemy.summonEnemyId = definition.summonEnemyId;
    enemy.statusEffect = definition.statusEffect;
    enemy.statusDuration = definition.statusDuration ?? 0;
    enemy.attackCooldown = Math.min(enemy.attackCooldown, enemy.attackInterval);
    return enemy;
  }

  static applyElite(enemy: Enemy): Enemy {
    enemy.isElite = true;
    enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * 1.8));
    enemy.hp = enemy.maxHp;
    enemy.speed *= 1.12;
    enemy.attackDamage += 1;
    enemy.projectileSpeed *= 1.08;
    enemy.attackInterval *= 0.84;
    enemy.attackWindup = Math.max(0.2, enemy.attackWindup * 0.9);
    enemy.eliteCoinReward = 18;
    return enemy;
  }
}
