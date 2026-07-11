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
  getEnemyPool,
  getThemeForChapter,
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

export class EncounterFactory {
  static create(input: EncounterFactoryInput): EncounterDef {
    const { stage, room, template } = input;
    const difficulty = getStageDifficulty(stage);
    const seed = room.encounterSeed ?? hashSeed(stage.seed, room.id);
    const random = createSeededRandom(seed);
    const theme = getThemeForChapter(stage.chapterIndex);

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
    const waves: Wave[] = [];

    for (let waveIndex = 0; waveIndex < difficulty.normalWaveCount; waveIndex++) {
      const points = shuffle(spawnPoints, random);
      const spawnCount = Math.min(points.length, difficulty.enemiesPerWave);
      const spawns: EnemySpawn[] = [];
      for (let i = 0; i < spawnCount; i++) {
        const point = points[i];
        const role: EnemyRole = random() < difficulty.rangedChance ? "ranged" : "melee";
        const rolePool = getEnemyPool(theme, role, stage.stageIndex);
        const fullPool = getEnemyPool(theme, undefined, stage.stageIndex);
        const candidates = rolePool.filter(candidate => !spawns.some(spawn => spawn.enemyId === candidate.id));
        const definition = choose(candidates.length > 0 ? candidates : rolePool.length > 0 ? rolePool : fullPool, random);
        spawns.push({
          x: point.x * 16 + 8,
          y: point.y * 16 + 8,
          type: definition.role,
          enemyId: definition.id,
          isElite: random() < difficulty.eliteChance,
        });
      }

      if (spawns.length > 1 && spawns.every(spawn => spawn.type === "ranged")) {
        const melee = choose(getEnemyPool(theme, "melee", stage.stageIndex), random);
        spawns[0].type = "melee";
        spawns[0].enemyId = melee.id;
      }
      if (spawns.length > 2 && spawns.every(spawn => spawn.type === "melee")) {
        const rangedPool = getEnemyPool(theme, "ranged", stage.stageIndex);
        if (rangedPool.length > 0) {
          const ranged = choose(rangedPool, random);
          spawns[spawns.length - 1].type = "ranged";
          spawns[spawns.length - 1].enemyId = ranged.id;
        }
      }

      waves.push({
        delay: waveIndex === 0 ? 0.5 : 0.9,
        telegraphTime: Math.max(0.38, 0.62 - (difficulty.globalStageIndex - 1) * 0.012),
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
