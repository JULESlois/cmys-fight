import type { Room } from "./FloorGenerator";
import type { RoomTemplate } from "./data/roomTemplates";
import { createSeededRandom, hashSeed } from "./Random";
import {
  TILE_BREAKABLE,
  TILE_BRIDGE,
  TILE_FLOOR,
  TILE_STRUCTURE,
  TILE_WALL,
} from "./MapData";

export type RoomTheme = "forest" | "dungeon" | "snow" | "lava" | string;

type Cell = readonly [number, number];

const ANCHORS: Cell[] = [
  [2, 3], [4, 3], [6, 3], [13, 3], [15, 3], [17, 3],
  [2, 10], [4, 10], [6, 10], [13, 10], [15, 10], [17, 10],
];

const SHAPES: Record<string, Cell[][]> = {
  forest: [
    [[0, 0], [1, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1]],
    [[0, 0], [0, 1], [1, 1]],
  ],
  dungeon: [
    [[0, 0], [0, 1]],
    [[0, 0], [1, 0]],
    [[0, 0], [0, 1], [0, 2]],
  ],
  snow: [
    [[0, 0], [1, 0], [2, 0]],
    [[0, 0], [0, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1]],
  ],
  lava: [
    [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [2, 0]],
    [[0, 0], [0, 1], [1, 1]],
  ],
};

const STRUCTURE_SHAPES: Record<string, Cell[][]> = {
  forest: [
    [[0, 0], [1, 0]],
    [[0, 0], [0, 1]],
    [[0, 0], [1, 0], [0, 1]],
  ],
  dungeon: [
    [[0, 0], [1, 0]],
    [[0, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1]],
  ],
  snow: [
    [[0, 0], [1, 0]],
    [[0, 0], [0, 1]],
    [[0, 0], [1, 0], [0, 1], [1, 1]],
  ],
  lava: [
    [[0, 0], [1, 0]],
    [[0, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1]],
  ],
};

const BREAKABLE_SHAPES: Cell[][] = [
  [[0, 0]],
  [[0, 0], [1, 0]],
  [[0, 0], [0, 1]],
];

function isReserved(x: number, y: number, template: RoomTemplate, room: Room): boolean {
  // Preserve the permanent cross-shaped navigation spine used by every door.
  if ((x >= 8 && x <= 11) || (y >= 6 && y <= 8)) return true;
  // Every normal combat room keeps a wall-free 7x5 central maneuvering field.
  if (x >= 7 && x <= 13 && y >= 5 && y <= 9) return true;
  // Boss/special arena facilities require the wider 14x9 central field.
  if (room.type === "boss" && x >= 3 && x <= 16 && y >= 3 && y <= 11) return true;
  const points = [
    ...template.enemySpawnPoints,
    ...template.pickupSpawnPoints,
    ...(template.portalSpawnPoint ? [template.portalSpawnPoint] : []),
    ...(template.legacySpawnPoint ? [template.legacySpawnPoint] : []),
  ];
  return points.some(point => Math.abs(point.x - x) <= 1 && Math.abs(point.y - y) <= 1);
}

export function getRoomVariantSignature(room: Room, theme: RoomTheme): string {
  const seed = hashSeed(room.encounterSeed ?? 0, `variant:${theme}:${room.templateId ?? "none"}`);
  return `${theme}:${Math.abs(seed) % 12}`;
}

export function applyRoomVariant(
  data: number[],
  room: Room,
  theme: RoomTheme,
  template: RoomTemplate,
  width = 20,
  height = 15,
): void {
  if (room.type !== "combat" && room.type !== "boss") return;
  const family = SHAPES[theme] ?? SHAPES.dungeon;
  const structures = STRUCTURE_SHAPES[theme] ?? STRUCTURE_SHAPES.dungeon;
  const random = createSeededRandom(hashSeed(room.encounterSeed ?? 0, `obstacles:${theme}:${template.id}`));
  const anchors = [...ANCHORS];
  for (let index = anchors.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [anchors[index], anchors[swapIndex]] = [anchors[swapIndex], anchors[index]];
  }
  const wallClusterCount = room.type === "boss" ? 2 : 3 + Math.floor(random() * 2);
  const structureClusterCount = room.type === "boss" ? 2 : 2 + Math.floor(random() * 2);
  const breakableClusterCount = room.type === "boss" ? 2 : 3 + Math.floor(random() * 2);

  const placeShape = (anchor: Cell, shape: Cell[], tileId: number, flipX: boolean, flipY: boolean): void => {
    const [anchorX, anchorY] = anchor;
    for (const [rawX, rawY] of shape) {
      const x = anchorX + (flipX ? -rawX : rawX);
      const y = anchorY + (flipY ? -rawY : rawY);
      if (x <= 1 || x >= width - 2 || y <= 1 || y >= height - 2) continue;
      if (isReserved(x, y, template, room)) continue;
      const index = y * width + x;
      if (data[index] === TILE_FLOOR || data[index] === TILE_BRIDGE) data[index] = tileId;
    }
  };

  for (let cluster = 0; cluster < wallClusterCount; cluster++) {
    const anchor = anchors[cluster % anchors.length];
    const shape = family[Math.floor(random() * family.length)];
    const flipX = random() < 0.5;
    const flipY = random() < 0.5;
    placeShape(anchor, shape, TILE_WALL, flipX, flipY);
  }

  for (let cluster = 0; cluster < structureClusterCount; cluster++) {
    const anchor = anchors[(wallClusterCount + cluster) % anchors.length];
    const shape = structures[Math.floor(random() * structures.length)];
    placeShape(anchor, shape, TILE_STRUCTURE, random() < 0.5, random() < 0.5);
  }

  for (let cluster = 0; cluster < breakableClusterCount; cluster++) {
    const anchor = anchors[(wallClusterCount + structureClusterCount + cluster) % anchors.length];
    const shape = BREAKABLE_SHAPES[Math.floor(random() * BREAKABLE_SHAPES.length)];
    placeShape(anchor, shape, TILE_BREAKABLE, random() < 0.5, random() < 0.5);
  }
}
