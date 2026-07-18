export type WorldTileLayerId =
  | "ground"
  | "groundDetail"
  | "collision"
  | "backObjects"
  | "upperObjects"
  | "roof";

export interface WorldPoint {
  x: number;
  y: number;
}

export interface WorldRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WorldCircle {
  x: number;
  y: number;
  radius: number;
}

interface WorldColliderBase {
  id: string;
  enabled?: boolean;
  sourceObjectId?: string;
  properties?: Record<string, unknown>;
}

export type WorldColliderDefinition =
  | (WorldColliderBase & { shape: "rect"; x: number; y: number; width: number; height: number })
  | (WorldColliderBase & { shape: "circle"; x: number; y: number; radius: number })
  | (WorldColliderBase & { shape: "polygon"; points: WorldPoint[] });

export type WorldSpatialShape =
  | { shape: "rect"; x: number; y: number; width: number; height: number }
  | { shape: "circle"; x: number; y: number; radius: number }
  | { shape: "polygon"; points: WorldPoint[] };

export interface WorldInteractionShell {
  distance: number;
  footprintIds?: string[];
}

export type WorldInteractionSide = "north" | "east" | "south" | "west";
export type WorldInteractionFacing = WorldInteractionSide | "left" | "right";

export type WorldInteractionZone =
  | { shape: "circle"; x: number; y: number; radius: number }
  | { shape: "rect"; x: number; y: number; width: number; height: number };

export interface WorldInteractionDefinition {
  zone: WorldInteractionZone;
  promptPoint?: WorldPoint;
  lineOfSightTarget?: WorldPoint;
  requireLineOfSight?: boolean;
  side?: WorldInteractionSide;
  facing?: WorldInteractionFacing;
}

export type WorldObjectType =
  | "interactable"
  | "npc"
  | "decoration"
  | "spawn"
  | "portal"
  | "collider"
  | "region";

export interface WorldMapLayer {
  id: WorldTileLayerId;
  tiles: number[];
  visible?: boolean;
}

export interface WorldObjectDefinition {
  id: string;
  type: WorldObjectType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  sortY?: number;
  action?: string;
  promptKey?: string;
  enabled?: boolean;
  visualBounds?: WorldRect;
  physicalFootprint?: WorldSpatialShape[];
  occlusionProjection?: WorldRect;
  interactionShell?: WorldInteractionShell;
  occlusionGroupId?: string;
  fadeWhenOccluding?: boolean;
  minimumAlpha?: number;
  interaction?: WorldInteractionDefinition;
  properties?: Record<string, unknown>;
}

export interface WorldMapDefinition {
  id: string;
  version: number;
  widthTiles: number;
  heightTiles: number;
  tileSize: number;
  layers: WorldMapLayer[];
  colliders?: WorldColliderDefinition[];
  objects: WorldObjectDefinition[];
  spawnPoints: Record<string, WorldPoint>;
}

export function getWorldSize(map: WorldMapDefinition): { width: number; height: number } {
  return {
    width: map.widthTiles * map.tileSize,
    height: map.heightTiles * map.tileSize,
  };
}

export function getWorldLayer(map: WorldMapDefinition, id: WorldTileLayerId): WorldMapLayer | undefined {
  return map.layers.find(layer => layer.id === id);
}
