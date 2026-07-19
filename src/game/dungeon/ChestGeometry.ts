import type { WorldPoint, WorldRect } from "../world/WorldMap";

export type ChestKind = "treasure" | "boss";

export interface ChestGeometry {
  bodyAnchor: WorldPoint;
  closedLidAnchor: WorldPoint;
  openedLidAnchor: WorldPoint;
  lootDropAnchor: WorldPoint;
  interactionAnchor: WorldPoint;
  physicalFootprint: WorldRect;
  sortY: number;
  lidSortY: number;
}

const GEOMETRIES: Record<ChestKind, ChestGeometry> = {
  treasure: {
    bodyAnchor: { x: 0, y: 0 },
    closedLidAnchor: { x: 0, y: -3 },
    openedLidAnchor: { x: 0, y: -15 },
    lootDropAnchor: { x: 0, y: 23 },
    interactionAnchor: { x: 0, y: 8 },
    physicalFootprint: { x: -14, y: -1, width: 28, height: 11 },
    sortY: 11,
    lidSortY: -9,
  },
  boss: {
    bodyAnchor: { x: 0, y: 0 },
    closedLidAnchor: { x: 0, y: -4 },
    openedLidAnchor: { x: 0, y: -18 },
    lootDropAnchor: { x: 0, y: 28 },
    interactionAnchor: { x: 0, y: 9 },
    physicalFootprint: { x: -18, y: -2, width: 36, height: 13 },
    sortY: 13,
    lidSortY: -11,
  },
};

const SLOT_LAYOUTS: Record<number, readonly WorldPoint[]> = {
  1: [{ x: 0, y: 0 }],
  2: [{ x: -10, y: 0 }, { x: 10, y: 0 }],
  3: [{ x: -14, y: 0 }, { x: 0, y: 4 }, { x: 14, y: 0 }],
};

export function getChestGeometry(kind: ChestKind): ChestGeometry {
  const source = GEOMETRIES[kind];
  return {
    ...source,
    bodyAnchor: { ...source.bodyAnchor },
    closedLidAnchor: { ...source.closedLidAnchor },
    openedLidAnchor: { ...source.openedLidAnchor },
    lootDropAnchor: { ...source.lootDropAnchor },
    interactionAnchor: { ...source.interactionAnchor },
    physicalFootprint: { ...source.physicalFootprint },
  };
}

export function chestWorldPoint(
  chest: { x: number; y: number },
  point: WorldPoint,
): WorldPoint {
  return { x: chest.x + point.x, y: chest.y + point.y };
}

export function getChestLootSlotOffsets(count: number): WorldPoint[] {
  const safeCount = Math.max(1, Math.floor(count));
  if (safeCount <= 3) return SLOT_LAYOUTS[safeCount].map(point => ({ ...point }));

  const result: WorldPoint[] = [];
  const columns = Math.min(4, safeCount);
  const spacing = 12;
  for (let index = 0; index < safeCount; index++) {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const rowCount = Math.min(columns, safeCount - row * columns);
    result.push({
      x: (column - (rowCount - 1) / 2) * spacing,
      y: row * 8,
    });
  }
  return result;
}

export interface ChestLootPlacementOptions {
  kind: ChestKind;
  chestX: number;
  chestY: number;
  count: number;
  isBlocked: (x: number, y: number, radius: number) => boolean;
  occupied?: readonly WorldPoint[];
  pickupRadius?: number;
  minimumSpacing?: number;
}

function candidateOffsets(): WorldPoint[] {
  const result: WorldPoint[] = [{ x: 0, y: 0 }];
  for (let forward = 4; forward <= 40; forward += 4) {
    result.push({ x: 0, y: forward });
    for (let lateral = 4; lateral <= Math.min(24, forward + 8); lateral += 4) {
      result.push({ x: -lateral, y: forward }, { x: lateral, y: forward });
    }
  }
  for (let lateral = 4; lateral <= 28; lateral += 4) {
    result.push({ x: -lateral, y: 0 }, { x: lateral, y: 0 });
  }
  return result;
}

const FORWARD_SEARCH_OFFSETS = candidateOffsets();

export function resolveChestLootPositions(options: ChestLootPlacementOptions): WorldPoint[] {
  const geometry = getChestGeometry(options.kind);
  const anchor = chestWorldPoint(
    { x: options.chestX, y: options.chestY },
    geometry.lootDropAnchor,
  );
  const slots = getChestLootSlotOffsets(options.count);
  const radius = Math.max(1, options.pickupRadius ?? 5);
  const spacing = Math.max(radius * 2, options.minimumSpacing ?? 11);
  const occupied: WorldPoint[] = (options.occupied ?? []).map(point => ({ ...point }));
  const result: WorldPoint[] = [];

  for (let index = 0; index < slots.length; index++) {
    const slot = slots[index];
    const desired = { x: anchor.x + slot.x, y: anchor.y + slot.y };
    let resolved: WorldPoint | undefined;
    for (const offset of FORWARD_SEARCH_OFFSETS) {
      const candidate = { x: desired.x + offset.x, y: desired.y + offset.y };
      if (options.isBlocked(candidate.x, candidate.y, radius)) continue;
      if (occupied.some(point => Math.hypot(point.x - candidate.x, point.y - candidate.y) < spacing)) continue;
      resolved = candidate;
      break;
    }
    // A blocked room should still keep the fallback in front of the chest;
    // the caller may perform its broader tile normalization afterwards.
    resolved ??= { x: desired.x, y: desired.y + 44 };
    result.push(resolved);
    occupied.push(resolved);
  }
  return result;
}

