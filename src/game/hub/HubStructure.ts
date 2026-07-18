import type {
  WorldColliderDefinition,
  WorldInteractionDefinition,
  WorldInteractionZone,
  WorldObjectDefinition,
  WorldObjectType,
  WorldPoint,
  WorldRect,
} from "../world/WorldMap";
import { colliderToSpatialShape } from "../world/SpatialSemantics";

export type HubRearAccessRule = "blocked-footprint" | "roof-occluder" | "map-layout";
export type HubStructureVisualLayer = "back" | "sorted" | "upper";
export type HubCollisionPolicy = "none" | "footprint" | "custom";

export interface HubLocalVisualPart {
  id: string;
  artPart: string;
  bounds: WorldRect;
  layer: HubStructureVisualLayer;
  sortY?: number;
  visiblePropId?: string;
  collisionPolicy?: HubCollisionPolicy;
  properties?: Record<string, unknown>;
}

export interface HubLocalOccluderPart {
  id: string;
  artPart: string;
  bounds: WorldRect;
  sortY: number;
  visiblePropId?: string;
  collisionPolicy?: HubCollisionPolicy;
  properties?: Record<string, unknown>;
}

export type HubLocalColliderDefinition =
  | { id: string; shape: "rect"; x: number; y: number; width: number; height: number; visiblePropId?: string; properties?: Record<string, unknown> }
  | { id: string; shape: "rect"; fromVisualPartId: string; inset?: number; visiblePropId?: string; properties?: Record<string, unknown> }
  | { id: string; shape: "circle"; x: number; y: number; radius: number; visiblePropId?: string; properties?: Record<string, unknown> }
  | { id: string; shape: "polygon"; points: WorldPoint[]; visiblePropId?: string; properties?: Record<string, unknown> };

export interface HubLocalInteractionDefinition {
  id: string;
  type: Extract<WorldObjectType, "interactable" | "portal" | "npc">;
  action: string;
  promptKey: string;
  interaction: WorldInteractionDefinition;
  visiblePropId: string;
  properties?: Record<string, unknown>;
}

export interface HubStructureDefinition {
  id: string;
  artModule: string;
  origin: WorldPoint;
  visualBounds: WorldRect;
  visualParts: HubLocalVisualPart[];
  colliders: HubLocalColliderDefinition[];
  interactions: HubLocalInteractionDefinition[];
  anchors: Record<string, WorldPoint>;
  occluders: HubLocalOccluderPart[];
  rearAccessRule: HubRearAccessRule;
  properties?: Record<string, unknown>;
}

export interface MaterializedHubStructure {
  definition: HubStructureDefinition;
  visualBounds: WorldRect;
  objects: WorldObjectDefinition[];
  colliders: WorldColliderDefinition[];
  anchors: Record<string, WorldPoint>;
}

function worldPoint(origin: WorldPoint, point: WorldPoint): WorldPoint {
  return { x: origin.x + point.x, y: origin.y + point.y };
}

function worldRect(origin: WorldPoint, rect: WorldRect): WorldRect {
  return { x: origin.x + rect.x, y: origin.y + rect.y, width: rect.width, height: rect.height };
}

function worldZone(origin: WorldPoint, zone: WorldInteractionZone): WorldInteractionZone {
  if (zone.shape === "circle") {
    return { shape: "circle", x: origin.x + zone.x, y: origin.y + zone.y, radius: zone.radius };
  }
  return {
    shape: "rect",
    x: origin.x + zone.x,
    y: origin.y + zone.y,
    width: zone.width,
    height: zone.height,
  };
}

function worldInteraction(origin: WorldPoint, interaction: WorldInteractionDefinition): WorldInteractionDefinition {
  return {
    ...interaction,
    zone: worldZone(origin, interaction.zone),
    promptPoint: interaction.promptPoint ? worldPoint(origin, interaction.promptPoint) : undefined,
    lineOfSightTarget: interaction.lineOfSightTarget ? worldPoint(origin, interaction.lineOfSightTarget) : undefined,
  };
}

function worldCollider(structure: HubStructureDefinition, collider: HubLocalColliderDefinition): WorldColliderDefinition {
  const id = `${structure.id}:${collider.id}`;
  const referencedPart = collider.shape === "rect" && "fromVisualPartId" in collider
    ? [...structure.visualParts, ...structure.occluders].find(part => part.id === collider.fromVisualPartId)
    : undefined;
  const visiblePropId = collider.visiblePropId ?? referencedPart?.visiblePropId;
  const common = {
    id,
    sourceObjectId: structure.id,
    properties: {
      structureId: structure.id,
      localColliderId: collider.id,
      ...(visiblePropId ? { visiblePropId } : {}),
      ...collider.properties,
    },
  };
  if (collider.shape === "rect") {
    const sourcePart = referencedPart;
    if ("fromVisualPartId" in collider && !sourcePart) {
      throw new Error(`[HubStructure] ${structure.id} collider ${collider.id} references missing part ${collider.fromVisualPartId}`);
    }
    const inset = "fromVisualPartId" in collider ? collider.inset ?? 0 : 0;
    const rect: WorldRect = sourcePart
      ? {
          x: sourcePart.bounds.x + inset,
          y: sourcePart.bounds.y + inset,
          width: sourcePart.bounds.width - inset * 2,
          height: sourcePart.bounds.height - inset * 2,
        }
      : "x" in collider
        ? { x: collider.x, y: collider.y, width: collider.width, height: collider.height }
        : { x: 0, y: 0, width: 0, height: 0 };
    return {
      ...common,
      shape: "rect",
      x: structure.origin.x + rect.x,
      y: structure.origin.y + rect.y,
      width: rect.width,
      height: rect.height,
    };
  }
  if (collider.shape === "circle") {
    return {
      ...common,
      shape: "circle",
      x: structure.origin.x + collider.x,
      y: structure.origin.y + collider.y,
      radius: collider.radius,
    };
  }
  return {
    ...common,
    shape: "polygon",
    points: collider.points.map(point => worldPoint(structure.origin, point)),
  };
}

function visualObject(
  structure: HubStructureDefinition,
  part: HubLocalVisualPart | HubLocalOccluderPart,
  role: "visual" | "occluder",
  colliders: readonly WorldColliderDefinition[],
): WorldObjectDefinition {
  const bounds = worldRect(structure.origin, part.bounds);
  const structureBounds = worldRect(structure.origin, structure.visualBounds);
  const layer = role === "occluder" ? "sorted" : (part as HubLocalVisualPart).layer;
  const sortY = part.sortY === undefined ? undefined : structure.origin.y + part.sortY;
  const physicalColliders = part.visiblePropId
    ? colliders.filter(collider => collider.properties?.visiblePropId === part.visiblePropId)
    : [];
  const fadeWhenOccluding = role === "occluder"
    || Boolean(part.visiblePropId && bounds.height >= 40 && layer === "sorted");
  return {
    id: `${structure.id}:${part.id}`,
    type: "decoration",
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    sortY,
    visualBounds: bounds,
    physicalFootprint: physicalColliders.map(colliderToSpatialShape),
    occlusionProjection: fadeWhenOccluding ? bounds : undefined,
    occlusionGroupId: role === "occluder" ? structure.id : part.visiblePropId,
    fadeWhenOccluding,
    minimumAlpha: 0.42,
    properties: {
      kind: "hub_structure_part",
      structureId: structure.id,
      artModule: structure.artModule,
      artPart: part.artPart,
      localPartId: part.id,
      visualGroup: structure.id,
      layer,
      role,
      originX: structure.origin.x,
      originY: structure.origin.y,
      rearAccessRule: structure.rearAccessRule,
      structureBounds,
      collisionPolicy: part.collisionPolicy ?? (part.visiblePropId ? "none" : undefined),
      physicalColliderIds: physicalColliders.map(collider => collider.id),
      ...part.properties,
      ...(part.visiblePropId
        ? { visiblePropId: part.visiblePropId }
        : {}),
    },
  };
}

function interactionObject(
  structure: HubStructureDefinition,
  local: HubLocalInteractionDefinition,
  colliders: readonly WorldColliderDefinition[],
): WorldObjectDefinition {
  const interaction = worldInteraction(structure.origin, local.interaction);
  const zone = interaction.zone;
  const bounds = zone.shape === "rect"
    ? { x: zone.x, y: zone.y, width: zone.width, height: zone.height }
    : { x: zone.x - zone.radius, y: zone.y - zone.radius, width: zone.radius * 2, height: zone.radius * 2 };
  const physicalColliders = colliders.filter(collider => collider.properties?.visiblePropId === local.visiblePropId);
  return {
    id: local.id,
    type: local.type,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    sortY: bounds.y + bounds.height,
    action: local.action,
    promptKey: local.promptKey,
    physicalFootprint: physicalColliders.map(colliderToSpatialShape),
    interactionShell: local.interaction.side || physicalColliders.length === 0
      ? undefined
      : { distance: 40 },
    interaction,
    properties: {
      kind: "hotspot",
      layer: "sorted",
      visible: false,
      structureId: structure.id,
      visiblePropId: local.visiblePropId,
      physicalColliderIds: physicalColliders.map(collider => collider.id),
      ...local.properties,
    },
  };
}

export function materializeHubStructure(definition: HubStructureDefinition): MaterializedHubStructure {
  const anchors = Object.fromEntries(
    Object.entries(definition.anchors).map(([id, point]) => [id, worldPoint(definition.origin, point)]),
  );
  const colliders = definition.colliders.map(collider => worldCollider(definition, collider));
  return {
    definition,
    visualBounds: worldRect(definition.origin, definition.visualBounds),
    colliders,
    objects: [
      ...definition.visualParts.map(part => visualObject(definition, part, "visual", colliders)),
      ...definition.occluders.map(part => visualObject(definition, part, "occluder", colliders)),
      ...definition.interactions.map(interaction => interactionObject(definition, interaction, colliders)),
    ],
    anchors,
  };
}

export function getStructureWorldPoint(definition: HubStructureDefinition, local: WorldPoint): WorldPoint {
  return worldPoint(definition.origin, local);
}

export function getStructureWorldRect(definition: HubStructureDefinition, local: WorldRect): WorldRect {
  return worldRect(definition.origin, local);
}
