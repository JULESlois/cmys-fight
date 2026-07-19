import type {
  HubLocalColliderDefinition,
  HubLocalInteractionDefinition,
  HubStructureDefinition,
} from "../HubStructure";
import type { WorldPoint, WorldRect } from "../../world/WorldMap";

export type HubBuildingVisualLayer =
  | "ground"
  | "back"
  | "body"
  | "sorted"
  | "front"
  | "roof"
  | "fx";

export interface HubBuildingVisualPart {
  id: string;
  layer: HubBuildingVisualLayer;
  bounds: WorldRect;
  sortY?: number;
  role?: string;
}

export interface HubBuildingOcclusionPart {
  id: string;
  bounds: WorldRect;
  sortY: number;
  groupId?: string;
  minimumAlpha?: number;
}

export interface HubBuildingLightSource {
  id: string;
  position: WorldPoint;
  radius: number;
  color: string;
  intensity?: number;
}

export interface HubBuildingAnimationChannel {
  id: string;
  period: number;
  phase?: number;
  property: string;
}

export interface HubBuildingArtDefinition {
  id: string;
  designBounds: WorldRect;
  physicalFootprint: HubLocalColliderDefinition[];
  interactionShells: HubLocalInteractionDefinition[];
  promptAnchor: WorldPoint;
  visualParts: HubBuildingVisualPart[];
  occlusionParts: HubBuildingOcclusionPart[];
  lightSources?: HubBuildingLightSource[];
  animationChannels?: HubBuildingAnimationChannel[];
}

export function defineBuildingArtFromStructure(
  structure: HubStructureDefinition,
  overrides: Partial<HubBuildingArtDefinition> = {},
): HubBuildingArtDefinition {
  const primaryPrompt = structure.interactions[0]?.promptAnchor
    ?? { x: structure.visualBounds.x + structure.visualBounds.width / 2, y: structure.visualBounds.y };
  return {
    id: structure.id,
    designBounds: { ...structure.visualBounds },
    physicalFootprint: [...structure.colliders],
    interactionShells: [...structure.interactions],
    promptAnchor: { ...primaryPrompt },
    visualParts: [
      ...structure.visualParts.map(part => ({
        id: part.id,
        layer: part.layer === "back" ? "back" as const : part.layer === "upper" ? "fx" as const : "sorted" as const,
        bounds: { ...part.bounds },
        sortY: part.sortY,
        role: part.artPart,
      })),
      ...structure.occluders.map(part => ({
        id: part.id,
        layer: "roof" as const,
        bounds: { ...part.bounds },
        sortY: part.sortY,
        role: part.artPart,
      })),
    ],
    occlusionParts: structure.occluders.map(part => ({
      id: part.id,
      bounds: { ...part.bounds },
      sortY: part.sortY,
      groupId: structure.id,
      minimumAlpha: 0.42,
    })),
    ...overrides,
  };
}

