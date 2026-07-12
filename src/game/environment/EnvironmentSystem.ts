import type { Room, StageData } from "../FloorGenerator";
import { MAP_HEIGHT, MAP_WIDTH, TILE_SIZE } from "../MapData";
import { createSeededRandom, hashSeed } from "../Random";

export type EnvironmentHazardType = "poison_pool" | "spikes" | "ice" | "lava";

export interface EnvironmentHazard {
  id: string;
  type: EnvironmentHazardType;
  tileX: number;
  tileY: number;
  x: number;
  y: number;
  radius: number;
  phase: number;
  triggerCooldown: number;
}

type Offset = readonly [number, number];
const TILE_PATTERNS: Offset[][] = [
  [[0, 0]],
  [[0, 0], [1, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [1, 0], [0, 1]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0]],
];

function typeForChapter(chapterIndex: number): EnvironmentHazardType {
  const index = (Math.max(1, chapterIndex) - 1) % 4;
  return ["poison_pool", "spikes", "ice", "lava"][index] as EnvironmentHazardType;
}

function isDoorSpine(tileX: number, tileY: number): boolean {
  return (tileX >= 8 && tileX <= 11) || (tileY >= 6 && tileY <= 8);
}

export class EnvironmentSystem {
  static generate(stage: StageData, room: Room, mapData: number[]): EnvironmentHazard[] {
    if (room.type !== "combat" && room.type !== "boss") return [];
    const type = typeForChapter(stage.chapterIndex);
    const random = createSeededRandom(hashSeed(room.encounterSeed ?? stage.seed, `environment:${type}`));
    const walkableTiles = mapData.filter(tile => tile !== 1).length;
    const walkableRatio = walkableTiles / Math.max(1, mapData.length);
    const stageGroups = 2 + Math.min(2, Math.floor(stage.globalStageIndex / 6));
    const groupCount = room.type === "boss"
      ? 4
      : walkableRatio < 0.5 ? 1
        : walkableRatio < 0.65 ? Math.min(2, stageGroups)
          : Math.min(3, stageGroups);
    const hazards: EnvironmentHazard[] = [];
    const occupied = new Set<string>();

    for (let group = 0; group < groupCount; group++) {
      const pattern = TILE_PATTERNS[Math.floor(random() * TILE_PATTERNS.length)];
      const phase = random() * 2.1;
      let origin: { x: number; y: number } | null = null;
      for (let attempt = 0; attempt < 100; attempt++) {
        const tileX = 2 + Math.floor(random() * (MAP_WIDTH - 5));
        const tileY = 2 + Math.floor(random() * (MAP_HEIGHT - 5));
        const valid = pattern.every(([dx, dy]) => {
          const x = tileX + dx;
          const y = tileY + dy;
          if (x <= 1 || x >= MAP_WIDTH - 2 || y <= 1 || y >= MAP_HEIGHT - 2) return false;
          if (isDoorSpine(x, y)) return false;
          if (mapData[y * MAP_WIDTH + x] === 1) return false;
          if (occupied.has(`${x},${y}`)) return false;
          return Math.hypot(x - 10, y - 7.5) >= 3;
        });
        if (valid) {
          origin = { x: tileX, y: tileY };
          break;
        }
      }
      if (!origin) continue;

      pattern.forEach(([dx, dy], cellIndex) => {
        const tileX = origin!.x + dx;
        const tileY = origin!.y + dy;
        occupied.add(`${tileX},${tileY}`);
        hazards.push({
          id: `${room.id}:${type}:${group}:${cellIndex}`,
          type,
          tileX,
          tileY,
          x: tileX * TILE_SIZE + TILE_SIZE / 2,
          y: tileY * TILE_SIZE + TILE_SIZE / 2,
          radius: TILE_SIZE / 2 - 1,
          phase,
          triggerCooldown: 0,
        });
      });
    }
    return hazards;
  }

  static contains(hazard: EnvironmentHazard, x: number, y: number, radius = 0): boolean {
    const half = TILE_SIZE / 2 - 1;
    const dx = Math.max(Math.abs(x - hazard.x) - half, 0);
    const dy = Math.max(Math.abs(y - hazard.y) - half, 0);
    return dx * dx + dy * dy <= radius * radius;
  }

  static isSpikeActive(hazard: EnvironmentHazard, time: number): boolean {
    return ((time + hazard.phase) % 2.1) < 0.72;
  }

  static draw(ctx: CanvasRenderingContext2D, hazards: EnvironmentHazard[], time: number): void {
    ctx.save();
    ctx.lineWidth = 1;
    for (const hazard of hazards) {
      const left = hazard.tileX * TILE_SIZE + 1;
      const top = hazard.tileY * TILE_SIZE + 1;
      const size = TILE_SIZE - 2;
      if (hazard.type === "poison_pool") {
        ctx.fillStyle = "rgba(82, 148, 62, 0.72)";
        ctx.fillRect(left, top, size, size);
        ctx.fillStyle = "#A6D96A";
        ctx.fillRect(left + 2, top + 3, 4, 3);
        ctx.fillRect(left + 9, top + 8, 3, 4);
        ctx.fillStyle = "#395C2B";
        ctx.fillRect(left + 7, top + 2, 2, 2);
      } else if (hazard.type === "lava") {
        ctx.fillStyle = "#7A2E1B";
        ctx.fillRect(left, top, size, size);
        ctx.fillStyle = "#FF7A1A";
        ctx.fillRect(left + 2, top + 5, 10, 3);
        ctx.fillRect(left + 7, top + 2, 3, 10);
        ctx.fillStyle = "#FFD54F";
        ctx.fillRect(left + 8, top + 6, 2, 2);
      } else if (hazard.type === "ice") {
        ctx.fillStyle = "rgba(126, 196, 222, 0.82)";
        ctx.fillRect(left, top, size, size);
        ctx.fillStyle = "#E8F8FF";
        ctx.fillRect(left + 2, top + 2, 8, 2);
        ctx.fillRect(left + 5, top + 4, 2, 7);
        ctx.fillStyle = "#5BA6C4";
        ctx.fillRect(left + 7, top + 8, 5, 2);
      } else {
        const active = EnvironmentSystem.isSpikeActive(hazard, time);
        ctx.fillStyle = active ? "#7B2722" : "#46535A";
        ctx.fillRect(left, top, size, size);
        ctx.fillStyle = active ? "#F2F3F4" : "#829096";
        const height = active ? 5 : 2;
        for (const [ox, oy] of [[3, 3], [9, 3], [3, 9], [9, 9]] as const) {
          ctx.fillRect(left + ox, top + oy + (5 - height), 3, height);
          if (active) ctx.fillRect(left + ox + 1, top + oy, 1, 1);
        }
      }
      ctx.strokeStyle = "rgba(8, 15, 28, 0.75)";
      ctx.strokeRect(left, top, size, size);
    }
    ctx.restore();
  }
}
