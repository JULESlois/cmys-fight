import type { Room, StageData } from "../FloorGenerator";
import { MAP_HEIGHT, MAP_WIDTH, TILE_SIZE } from "../MapData";
import { createSeededRandom, hashSeed } from "../Random";

export type EnvironmentHazardType = "poison_pool" | "spikes" | "ice" | "lava";

export interface EnvironmentHazard {
  id: string;
  type: EnvironmentHazardType;
  x: number;
  y: number;
  radius: number;
  phase: number;
  triggerCooldown: number;
}

function typeForChapter(chapterIndex: number): EnvironmentHazardType {
  const index = (Math.max(1, chapterIndex) - 1) % 4;
  return ["poison_pool", "spikes", "ice", "lava"][index] as EnvironmentHazardType;
}

export class EnvironmentSystem {
  static generate(stage: StageData, room: Room, mapData: number[]): EnvironmentHazard[] {
    if (room.type !== "combat" && room.type !== "boss") return [];
    const type = typeForChapter(stage.chapterIndex);
    const random = createSeededRandom(hashSeed(room.encounterSeed ?? stage.seed, `environment:${type}`));
    const count = room.type === "boss" ? 4 : 2 + Math.min(2, Math.floor(stage.globalStageIndex / 5));
    const hazards: EnvironmentHazard[] = [];

    for (let index = 0; index < count; index++) {
      let selected: { x: number; y: number } | null = null;
      for (let attempt = 0; attempt < 80; attempt++) {
        const tileX = 2 + Math.floor(random() * (MAP_WIDTH - 4));
        const tileY = 2 + Math.floor(random() * (MAP_HEIGHT - 4));
        const tile = mapData[tileY * MAP_WIDTH + tileX];
        if (tile === 1) continue;
        const x = tileX * TILE_SIZE + TILE_SIZE / 2;
        const y = tileY * TILE_SIZE + TILE_SIZE / 2;
        if (Math.hypot(x - 160, y - 120) < 42) continue;
        if (hazards.some(hazard => Math.hypot(hazard.x - x, hazard.y - y) < 34)) continue;
        selected = { x, y };
        break;
      }
      if (!selected) continue;
      hazards.push({
        id: `${room.id}:${type}:${index}`,
        type,
        x: selected.x,
        y: selected.y,
        radius: type === "spikes" ? 14 : type === "ice" ? 24 : 20,
        phase: random() * 2,
        triggerCooldown: 0,
      });
    }
    return hazards;
  }

  static contains(hazard: EnvironmentHazard, x: number, y: number, radius = 0): boolean {
    return Math.hypot(x - hazard.x, y - hazard.y) <= hazard.radius + radius;
  }

  static isSpikeActive(hazard: EnvironmentHazard, time: number): boolean {
    return ((time + hazard.phase) % 2.1) < 0.72;
  }

  static draw(ctx: CanvasRenderingContext2D, hazards: EnvironmentHazard[], time: number): void {
    ctx.save();
    for (const hazard of hazards) {
      if (hazard.type === "poison_pool") {
        ctx.fillStyle = "rgba(92, 184, 92, 0.32)";
        ctx.strokeStyle = "rgba(137, 224, 89, 0.75)";
      } else if (hazard.type === "lava") {
        ctx.fillStyle = "rgba(255, 87, 34, 0.34)";
        ctx.strokeStyle = "rgba(255, 193, 7, 0.8)";
      } else if (hazard.type === "ice") {
        ctx.fillStyle = "rgba(129, 212, 250, 0.28)";
        ctx.strokeStyle = "rgba(224, 247, 250, 0.8)";
      } else {
        const active = EnvironmentSystem.isSpikeActive(hazard, time);
        ctx.fillStyle = active ? "rgba(192, 57, 43, 0.42)" : "rgba(127, 140, 141, 0.22)";
        ctx.strokeStyle = active ? "rgba(231, 76, 60, 0.9)" : "rgba(149, 165, 166, 0.55)";
      }
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(hazard.x, hazard.y, hazard.radius + Math.sin(time * 3 + hazard.phase) * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (hazard.type === "spikes") {
        const active = EnvironmentSystem.isSpikeActive(hazard, time);
        ctx.fillStyle = active ? "#ECF0F1" : "#7F8C8D";
        for (let i = 0; i < 6; i++) {
          const angle = Math.PI * 2 * i / 6;
          ctx.fillRect(Math.round(hazard.x + Math.cos(angle) * 8) - 1, Math.round(hazard.y + Math.sin(angle) * 8) - 1, 3, 3);
        }
      }
    }
    ctx.restore();
  }
}
