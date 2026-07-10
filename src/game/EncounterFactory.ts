import type { EncounterDef, EnemySpawn, Wave } from "./EncounterController";
import type { Room, StageData } from "./FloorGenerator";
import type { RoomTemplate } from "./data/roomTemplates";
import { Enemy } from "./entities/Enemy";
import { createSeededRandom, hashSeed } from "./Random";
import { applyStageDifficulty, getStageDifficulty } from "./combat/StageDifficulty";

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

export class EncounterFactory {
  static create(input: EncounterFactoryInput): EncounterDef {
    const { stage, room, template } = input;
    const difficulty = getStageDifficulty(stage);
    const seed = room.encounterSeed ?? hashSeed(stage.seed, room.id);
    const random = createSeededRandom(seed);

    if (room.type === "boss") {
      const point = template.enemySpawnPoints[0] ?? { x: 10, y: 6 };
      return {
        id: room.encounterId ?? `enc_boss_${stage.globalStageIndex}_${room.id}`,
        waves: [{
          delay: 0.75,
          telegraphTime: 0.85,
          spawns: [{ x: point.x * 16 + 8, y: point.y * 16 + 8, type: "boss" }],
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
        const ranged = random() < difficulty.rangedChance;
        spawns.push({
          x: point.x * 16 + 8,
          y: point.y * 16 + 8,
          type: ranged ? "ranged" : "melee",
        });
      }

      if (spawns.length > 1 && spawns.every(spawn => spawn.type === "ranged")) {
        spawns[0].type = "melee";
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
    return applyStageDifficulty(new Enemy(spawn.x, spawn.y, spawn.type), getStageDifficulty(stage));
  }
}
