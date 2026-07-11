import type { Room } from "./FloorGenerator";
import type { RoomTemplate } from "./data/roomTemplates";
import { createSeededRandom, hashSeed } from "./Random";

export type RoomTheme = "forest" | "dungeon" | "snow" | "lava" | string;

type Cell = readonly [number, number];

const ANCHORS: Cell[] = [
  [3, 3], [5, 3], [14, 3], [16, 3],
  [3, 10], [5, 10], [14, 10], [16, 10],
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

function isReserved(x: number, y: number, template: RoomTemplate): boolean {
  // Preserve the permanent cross-shaped navigation spine used by every door.
  if ((x >= 8 && x <= 11) || (y >= 6 && y <= 8)) return true;
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
  const random = createSeededRandom(hashSeed(room.encounterSeed ?? 0, `obstacles:${theme}:${template.id}`));
  const anchors = [...ANCHORS];
  for (let index = anchors.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [anchors[index], anchors[swapIndex]] = [anchors[swapIndex], anchors[index]];
  }
  const clusterCount = room.type === "boss" ? 2 : 2 + Math.floor(random() * 2);

  for (let cluster = 0; cluster < clusterCount; cluster++) {
    const [anchorX, anchorY] = anchors[cluster % anchors.length];
    const shape = family[Math.floor(random() * family.length)];
    const flipX = random() < 0.5;
    const flipY = random() < 0.5;
    for (const [rawX, rawY] of shape) {
      const x = anchorX + (flipX ? -rawX : rawX);
      const y = anchorY + (flipY ? -rawY : rawY);
      if (x <= 1 || x >= width - 2 || y <= 1 || y >= height - 2) continue;
      if (isReserved(x, y, template)) continue;
      const index = y * width + x;
      if (data[index] === 0 || data[index] === 2) data[index] = 1;
    }
  }
}
