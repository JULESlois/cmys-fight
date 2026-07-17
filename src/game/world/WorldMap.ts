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
  properties?: Record<string, unknown>;
}

export interface WorldMapDefinition {
  id: string;
  version: number;
  widthTiles: number;
  heightTiles: number;
  tileSize: number;
  layers: WorldMapLayer[];
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
