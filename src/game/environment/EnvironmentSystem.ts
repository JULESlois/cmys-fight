import type { Room, StageData } from "../FloorGenerator";
import { MAP_HEIGHT, MAP_WIDTH, TILE_SIZE } from "../MapData";
import { createSeededRandom, hashSeed } from "../Random";
import { getDifficultyStageIndex } from "../RunProgress";

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
    const stageGroups = 2 + Math.min(2, Math.floor(getDifficultyStageIndex(stage.globalStageIndex) / 6));
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
    const poisonTiles = new Set(
      hazards
        .filter(hazard => hazard.type === "poison_pool")
        .map(hazard => `${hazard.tileX},${hazard.tileY}`),
    );
    const spikeTiles = new Set(
      hazards
        .filter(hazard => hazard.type === "spikes")
        .map(hazard => `${hazard.tileX},${hazard.tileY}`),
    );
    const iceTiles = new Set(
      hazards
        .filter(hazard => hazard.type === "ice")
        .map(hazard => `${hazard.tileX},${hazard.tileY}`),
    );
    const lavaTiles = new Set(
      hazards
        .filter(hazard => hazard.type === "lava")
        .map(hazard => `${hazard.tileX},${hazard.tileY}`),
    );
    for (const hazard of hazards) {
      const left = hazard.tileX * TILE_SIZE + 1;
      const top = hazard.tileY * TILE_SIZE + 1;
      const size = TILE_SIZE - 2;
      if (hazard.type === "poison_pool") {
        // Stepped edges and moving spores make this read as toxic forest sap,
        // not a translucent green square pasted over the floor.
        ctx.fillStyle = "rgba(37, 66, 35, 0.86)";
        ctx.fillRect(left + 2, top, size - 4, size);
        ctx.fillRect(left, top + 2, size, size - 4);
        ctx.fillStyle = "rgba(80, 139, 57, 0.88)";
        ctx.fillRect(left + 3, top + 2, size - 6, size - 4);
        ctx.fillRect(left + 2, top + 4, size - 4, size - 8);
        ctx.fillStyle = "#77B957";
        ctx.fillRect(left + 3, top + 4, 5, 3);
        ctx.fillRect(left + 9, top + 9, 3, 3);
        ctx.fillStyle = "#B5DD72";
        const bubble = Math.floor((time + hazard.phase) * 4) % 3;
        ctx.fillRect(left + 5 + bubble, top + 3, 2, 2);
        ctx.fillRect(left + 10 - bubble, top + 8, 1, 1);
        ctx.fillStyle = "#29472B";
        ctx.fillRect(left + 8, top + 1, 2, 2);
        ctx.fillRect(left + 1, top + 9, 2, 2);

        const connectedLeft = poisonTiles.has(`${hazard.tileX - 1},${hazard.tileY}`);
        const connectedRight = poisonTiles.has(`${hazard.tileX + 1},${hazard.tileY}`);
        const connectedUp = poisonTiles.has(`${hazard.tileX},${hazard.tileY - 1}`);
        const connectedDown = poisonTiles.has(`${hazard.tileX},${hazard.tileY + 1}`);
        ctx.fillStyle = "rgba(80, 139, 57, 0.9)";
        if (connectedLeft) ctx.fillRect(left - 2, top + 3, 6, size - 6);
        if (connectedRight) ctx.fillRect(left + size - 3, top + 3, 6, size - 6);
        if (connectedUp) ctx.fillRect(left + 3, top - 2, size - 6, 6);
        if (connectedDown) ctx.fillRect(left + 3, top + size - 3, size - 6, 6);

        // Outline only exposed pool edges so adjacent cells become one shape.
        ctx.fillStyle = "rgba(22, 42, 25, 0.92)";
        if (!connectedUp) ctx.fillRect(left + 2, top, size - 4, 1);
        if (!connectedDown) ctx.fillRect(left + 2, top + size - 1, size - 4, 1);
        if (!connectedLeft) ctx.fillRect(left, top + 2, 1, size - 4);
        if (!connectedRight) ctx.fillRect(left + size - 1, top + 2, 1, size - 4);
      } else if (hazard.type === "lava") {
        const connectedLeft = lavaTiles.has(`${hazard.tileX - 1},${hazard.tileY}`);
        const connectedRight = lavaTiles.has(`${hazard.tileX + 1},${hazard.tileY}`);
        const connectedUp = lavaTiles.has(`${hazard.tileX},${hazard.tileY - 1}`);
        const connectedDown = lavaTiles.has(`${hazard.tileX},${hazard.tileY + 1}`);

        // Adjacent molten cells fuse into a single slag pool with exposed crust rims.
        ctx.fillStyle = "rgba(117, 35, 24, 0.96)";
        ctx.fillRect(left, top, size, size);
        ctx.fillStyle = "rgba(190, 52, 19, 0.96)";
        ctx.fillRect(left + 2, top + 2, size - 4, size - 4);
        if (connectedLeft) ctx.fillRect(left - 2, top + 2, 5, size - 4);
        if (connectedRight) ctx.fillRect(left + size - 3, top + 2, 5, size - 4);
        if (connectedUp) ctx.fillRect(left + 2, top - 2, size - 4, 5);
        if (connectedDown) ctx.fillRect(left + 2, top + size - 3, size - 4, 5);

        const flow = Math.floor((time + hazard.phase) * 4) % 4;
        ctx.fillStyle = "#F0611D";
        ctx.fillRect(left + 2 + flow, top + 4, 8, 3);
        ctx.fillRect(left + 7 - flow, top + 9, 5, 2);
        ctx.fillStyle = "#FFB42D";
        ctx.fillRect(left + 3 + flow, top + 4, 4, 1);
        ctx.fillRect(left + 8 - flow, top + 9, 3, 1);
        ctx.fillStyle = "#FFE56A";
        ctx.fillRect(left + 5 + flow, top + 5, 2, 1);

        // Dark slag chunks stay inside the pool and move independently of the glow.
        ctx.fillStyle = "#55241F";
        ctx.fillRect(left + 2, top + 10, 4, 2);
        ctx.fillRect(left + 10, top + 2, 2, 3);
        ctx.fillStyle = "#2C2024";
        if (!connectedUp) ctx.fillRect(left, top, size, 1);
        if (!connectedDown) ctx.fillRect(left, top + size - 1, size, 1);
        if (!connectedLeft) ctx.fillRect(left, top, 1, size);
        if (!connectedRight) ctx.fillRect(left + size - 1, top, 1, size);
      } else if (hazard.type === "ice") {
        const connectedLeft = iceTiles.has(`${hazard.tileX - 1},${hazard.tileY}`);
        const connectedRight = iceTiles.has(`${hazard.tileX + 1},${hazard.tileY}`);
        const connectedUp = iceTiles.has(`${hazard.tileX},${hazard.tileY - 1}`);
        const connectedDown = iceTiles.has(`${hazard.tileX},${hazard.tileY + 1}`);

        // Adjacent slick cells fuse into one frozen sheet with only exposed rims.
        ctx.fillStyle = "rgba(65, 139, 164, 0.9)";
        ctx.fillRect(left, top, size, size);
        ctx.fillStyle = "rgba(111, 188, 207, 0.92)";
        ctx.fillRect(left + 2, top + 2, size - 4, size - 4);
        if (connectedLeft) ctx.fillRect(left - 2, top + 2, 5, size - 4);
        if (connectedRight) ctx.fillRect(left + size - 3, top + 2, 5, size - 4);
        if (connectedUp) ctx.fillRect(left + 2, top - 2, size - 4, 5);
        if (connectedDown) ctx.fillRect(left + 2, top + size - 3, size - 4, 5);

        const glint = Math.floor((time + hazard.phase) * 3) % 4;
        ctx.fillStyle = "#CDEFF4";
        ctx.fillRect(left + 2 + glint, top + 3, 7, 2);
        ctx.fillRect(left + 8 - glint, top + 10, 4, 1);
        ctx.fillStyle = "#F0FEFF";
        ctx.fillRect(left + 3 + glint, top + 3, 3, 1);

        // Stepped fracture lines remain readable across the moving highlight.
        ctx.fillStyle = "#397E98";
        ctx.fillRect(left + 6, top + 5, 2, 5);
        ctx.fillRect(left + 7, top + 9, 5, 2);
        ctx.fillRect(left + 3, top + 11, 5, 1);
        ctx.fillStyle = "#93D3DF";
        ctx.fillRect(left + 7, top + 5, 1, 3);

        ctx.fillStyle = "rgba(31, 75, 94, 0.9)";
        if (!connectedUp) ctx.fillRect(left, top, size, 1);
        if (!connectedDown) ctx.fillRect(left, top + size - 1, size, 1);
        if (!connectedLeft) ctx.fillRect(left, top, 1, size);
        if (!connectedRight) ctx.fillRect(left + size - 1, top, 1, size);
      } else {
        const active = EnvironmentSystem.isSpikeActive(hazard, time);
        const connectedLeft = spikeTiles.has(`${hazard.tileX - 1},${hazard.tileY}`);
        const connectedRight = spikeTiles.has(`${hazard.tileX + 1},${hazard.tileY}`);
        const connectedUp = spikeTiles.has(`${hazard.tileX},${hazard.tileY - 1}`);
        const connectedDown = spikeTiles.has(`${hazard.tileX},${hazard.tileY + 1}`);

        // Joined iron pressure plates form one trap bed instead of isolated
        // red squares pasted on top of the dungeon floor.
        ctx.fillStyle = active ? "#4E2427" : "#303B46";
        ctx.fillRect(left, top, size, size);
        ctx.fillStyle = active ? "#713036" : "#46545F";
        ctx.fillRect(left + 2, top + 2, size - 4, size - 4);
        if (connectedLeft) ctx.fillRect(left - 2, top + 2, 5, size - 4);
        if (connectedRight) ctx.fillRect(left + size - 3, top + 2, 5, size - 4);
        if (connectedUp) ctx.fillRect(left + 2, top - 2, size - 4, 5);
        if (connectedDown) ctx.fillRect(left + 2, top + size - 3, size - 4, 5);

        ctx.fillStyle = active ? "#F1F1EA" : "#7B8990";
        const height = active ? 6 : 2;
        for (const [ox, oy] of [[3, 3], [9, 3], [3, 9], [9, 9]] as const) {
          ctx.fillRect(left + ox, top + oy + (6 - height), 3, height);
          ctx.fillStyle = active ? "#FFFFFF" : "#9AA6AA";
          ctx.fillRect(left + ox + 1, top + oy + (6 - height), 1, Math.max(1, height - 1));
          ctx.fillStyle = active ? "#F1F1EA" : "#7B8990";
          if (active) ctx.fillRect(left + ox + 1, top + oy - 1, 1, 2);
        }
        ctx.fillStyle = active ? "#B35A52" : "#64717A";
        ctx.fillRect(left + 6, top + 1, 2, size - 2);
        ctx.fillRect(left + 1, top + 6, size - 2, 2);
        ctx.fillStyle = active ? "#E0B55A" : "#98A1A2";
        ctx.fillRect(left + 6, top + 6, 2, 2);

        // Only exposed trap-bed edges receive a dark outline.
        ctx.fillStyle = "rgba(8, 15, 28, 0.82)";
        if (!connectedUp) ctx.fillRect(left, top, size, 1);
        if (!connectedDown) ctx.fillRect(left, top + size - 1, size, 1);
        if (!connectedLeft) ctx.fillRect(left, top, 1, size);
        if (!connectedRight) ctx.fillRect(left + size - 1, top, 1, size);
      }
      if (hazard.type !== "poison_pool" && hazard.type !== "spikes" && hazard.type !== "ice" && hazard.type !== "lava") {
        ctx.strokeStyle = "rgba(8, 15, 28, 0.75)";
        ctx.strokeRect(left, top, size, size);
      }
    }
    ctx.restore();
  }
}
