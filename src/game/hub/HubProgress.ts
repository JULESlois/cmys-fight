import type { WorldMapDefinition, WorldPoint } from "../world/WorldMap";
import type { WorldCollision } from "../world/WorldCollision";

export interface HubProgress {
  mapVersion: number;
  anchorId: string;
  x?: number;
  y?: number;
  selectedCharacterId: string;
  selectedStarterWeaponId: string;
  visitedZones: string[];
  unlockedFacilities: string[];
}

export function createDefaultHubProgress(mapVersion = 1): HubProgress {
  return {
    mapVersion,
    anchorId: "rebirth_spring",
    selectedCharacterId: "knight",
    selectedStarterWeaponId: "pistol",
    visitedZones: [],
    unlockedFacilities: ["rebirth_spring", "expedition_gate", "workshop", "archive", "observatory"],
  };
}

function uniqueStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter(entry => typeof entry === "string" && entry.length > 0))]
    : [];
}

export function normalizeHubProgress(value: unknown, mapVersion = 1): HubProgress {
  const fallback = createDefaultHubProgress(mapVersion);
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Partial<HubProgress>;
  const x = Number(raw.x);
  const y = Number(raw.y);
  return {
    mapVersion: Math.max(0, Math.floor(Number(raw.mapVersion) || 0)),
    anchorId: typeof raw.anchorId === "string" && raw.anchorId ? raw.anchorId : fallback.anchorId,
    x: Number.isFinite(x) ? x : undefined,
    y: Number.isFinite(y) ? y : undefined,
    selectedCharacterId: typeof raw.selectedCharacterId === "string" && raw.selectedCharacterId
      ? raw.selectedCharacterId
      : fallback.selectedCharacterId,
    selectedStarterWeaponId: typeof raw.selectedStarterWeaponId === "string" && raw.selectedStarterWeaponId
      ? raw.selectedStarterWeaponId
      : fallback.selectedStarterWeaponId,
    visitedZones: uniqueStrings(raw.visitedZones),
    unlockedFacilities: uniqueStrings(raw.unlockedFacilities).length > 0
      ? uniqueStrings(raw.unlockedFacilities)
      : fallback.unlockedFacilities,
  };
}

export function resolveHubSpawn(
  progress: HubProgress,
  map: WorldMapDefinition,
  collision: WorldCollision,
  forceAnchor?: string,
): WorldPoint {
  const fallback = map.spawnPoints.rebirth_spring ?? { x: 160, y: 120 };
  if (forceAnchor) return map.spawnPoints[forceAnchor] ?? fallback;
  if (
    progress.mapVersion === map.version
    && Number.isFinite(progress.x)
    && Number.isFinite(progress.y)
    && !collision.isCircleBlocked(progress.x!, progress.y!, 6)
  ) {
    return { x: progress.x!, y: progress.y! };
  }
  return map.spawnPoints[progress.anchorId] ?? fallback;
}
