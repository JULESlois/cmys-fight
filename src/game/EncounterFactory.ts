import type { EncounterDef, EnemySpawn, Wave } from "./EncounterController";
import type { Room, StageData } from "./FloorGenerator";
import type { RoomTemplate } from "./data/roomTemplates";
import { Enemy } from "./entities/Enemy";
import { createSeededRandom, hashSeed } from "./Random";
import { getStageDifficulty } from "./combat/StageDifficulty";
import { EnemyFactory } from "./EnemyFactory";
import {
  getBossDefinition,
  getBossPool,
  getEnemyDefinition,
  getEnemyPool,
  getThemeForChapter,
  type EnemyDefinition,
  type EnemyRole,
} from "./data/enemies";

export interface EncounterFactoryInput {
  stage: StageData;
  room: Room;
  template: RoomTemplate;
}

function shuffle<T>(values: T[], random: () => number): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function choose<T>(values: T[], random: () => number): T {
  return values[Math.min(values.length - 1, Math.floor(random() * values.length))];
}

function isMovementController(definition: EnemyDefinition): boolean {
  return definition.statusEffect === "slow" || definition.statusEffect === "root";
}

export function isCrampedCombatTemplate(template: RoomTemplate): boolean {
  const walkableTiles = template.tiles.filter(tile => tile !== 1).length;
  return walkableTiles / Math.max(1, template.tiles.length) < 0.5;
}

function chooseEnemyForWave(
  theme: ReturnType<typeof getThemeForChapter>,
  stageIndex: number,
  preferredRole: EnemyRole,
  existingSpawns: EnemySpawn[],
  cramped: boolean,
  random: () => number,
): EnemyDefinition {
  const rolePool = getEnemyPool(theme, preferredRole, stageIndex);
  const fullPool = getEnemyPool(theme, undefined, stageIndex);
  const existingDefinitions = existingSpawns
    .map(spawn => spawn.enemyId ? getEnemyDefinition(spawn.enemyId) : null)
    .filter((definition): definition is EnemyDefinition => definition !== null);
  const usedIds = new Set(existingDefinitions.map(definition => definition.id));
  const areaUsed = existingDefinitions.some(definition => definition.behavior === "area");
  const controlUsed = existingDefinitions.some(isMovementController);

  const respectsThreatBudget = (definition: EnemyDefinition) =>
    !usedIds.has(definition.id) &&
    (!cramped || definition.behavior !== "area") &&
    (!areaUsed || definition.behavior !== "area") &&
    (!controlUsed || !isMovementController(definition));

  const respectsThreatBudgetWithDuplicates = (definition: EnemyDefinition) =>
    (!cramped || definition.behavior !== "area") &&
    (!areaUsed || definition.behavior !== "area") &&
    (!controlUsed || !isMovementController(definition));

  const noDuplicate = (definition: EnemyDefinition) =>
    !usedIds.has(definition.id) && (!cramped || definition.behavior !== "area");

  const candidateTiers = [
    rolePool.filter(respectsThreatBudget),
    fullPool.filter(respectsThreatBudget),
    rolePool.filter(respectsThreatBudgetWithDuplicates),
    fullPool.filter(respectsThreatBudgetWithDuplicates),
    rolePool.filter(noDuplicate),
    fullPool.filter(noDuplicate),
    fullPool.filter(definition => !cramped || definition.behavior !== "area"),
    fullPool,
  ];
  const candidates = candidateTiers.find(tier => tier.length > 0) ?? fullPool;
  return choose(candidates, random);
}

export class EncounterFactory {
  static create(input: EncounterFactoryInput): EncounterDef {
    const { stage, room, template } = input;
    const difficulty = getStageDifficulty(stage);
    const seed = room.encounterSeed ?? hashSeed(stage.seed, room.id);
    const random = createSeededRandom(seed);
    const baseTheme = getThemeForChapter(stage.routeDepth);
    const theme = (stage.worldNodeId as any) ?? baseTheme;

    if (room.type === "boss") {
      const point = template.enemySpawnPoints[0] ?? { x: 10, y: 6 };
      const boss = choose(getBossPool(theme), random);
      return {
        id: room.encounterId ?? `enc_boss_${stage.globalStageIndex}_${room.id}`,
        waves: [{
          delay: 0.75,
          telegraphTime: 0.85,
          spawns: [{
            x: point.x * 16 + 8,
            y: point.y * 16 + 8,
            type: "boss",
            enemyId: boss.id,
            isElite: false,
          }],
        }],
      };
    }

    const spawnPoints = template.enemySpawnPoints.length > 0
      ? template.enemySpawnPoints
      : [{ x: 10, y: 7 }];
    const cramped = isCrampedCombatTemplate(template);
    const waves: Wave[] = [];

    for (let waveIndex = 0; waveIndex < difficulty.normalWaveCount; waveIndex++) {
      const points = shuffle(spawnPoints, random);
      const spawnCount = Math.min(points.length, difficulty.enemiesPerWave);
      const spawns: EnemySpawn[] = [];
      for (let i = 0; i < spawnCount; i++) {
        const point = points[i];
        const role: EnemyRole = random() < difficulty.rangedChance ? "ranged" : "melee";
        const definition = chooseEnemyForWave(
          theme,
          stage.stageWithinNode,
          role,
          spawns,
          cramped,
          random,
        );
        spawns.push({
          x: point.x * 16 + 8,
          y: point.y * 16 + 8,
          type: definition.role,
          enemyId: definition.id,
          isElite: random() < difficulty.eliteChance,
        });
      }

      if (spawns.length > 1 && spawns.every(spawn => spawn.type === "ranged")) {
        const melee = chooseEnemyForWave(theme, stage.stageWithinNode, "melee", spawns.slice(1), cramped, random);
        spawns[0].type = melee.role;
        spawns[0].enemyId = melee.id;
      }
      if (spawns.length > 2 && spawns.every(spawn => spawn.type === "melee")) {
        const ranged = chooseEnemyForWave(
          theme,
          stage.stageWithinNode,
          "ranged",
          spawns.slice(0, -1),
          cramped,
          random,
        );
        spawns[spawns.length - 1].type = ranged.role;
        spawns[spawns.length - 1].enemyId = ranged.id;
      }

      waves.push({
        delay: waveIndex === 0 ? 0.5 : 0.9,
        telegraphTime: Math.max(0.38, 0.62 - (difficulty.difficultyStageIndex - 1) * 0.012),
        spawns,
      });
    }

    return {
      id: room.encounterId ?? `enc_combat_${stage.globalStageIndex}_${room.id}`,
      waves,
    };
  }

  static createEnemy(stage: StageData, spawn: EnemySpawn): Enemy {
    return EnemyFactory.create(stage, spawn);
  }
}
