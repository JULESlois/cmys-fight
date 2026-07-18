import type { HubRearAccessRule } from "../hub/HubStructure";
import type { WorldObjectDefinition, WorldRect } from "./WorldMap";
import { rectsIntersect } from "./SpatialSemantics";

interface OcclusionGroupState {
  alpha: number;
  targetAlpha: number;
}

function rearRuleOf(object: WorldObjectDefinition): HubRearAccessRule | undefined {
  const value = object.properties?.rearAccessRule;
  return value === "blocked-footprint" || value === "roof-occluder" || value === "map-layout"
    ? value
    : undefined;
}

function playerIsBehind(object: WorldObjectDefinition, playerFootY: number): boolean {
  const projection = object.occlusionProjection;
  if (!projection) return false;
  const frontY = object.sortY ?? projection.y + projection.height;
  const rule = rearRuleOf(object);
  if (rule === "blocked-footprint") return playerFootY < frontY;
  if (rule === "roof-occluder") return playerFootY <= frontY;
  if (rule === "map-layout") return playerFootY < projection.y + projection.height;
  return playerFootY < frontY;
}

export class OcclusionController {
  private readonly groups = new Map<string, OcclusionGroupState>();

  public reset(): void {
    this.groups.clear();
  }

  public update(
    dt: number,
    playerSpriteRect: WorldRect,
    playerFootY: number,
    objects: readonly WorldObjectDefinition[],
  ): void {
    const targets = new Map<string, number>();
    for (const object of objects) {
      if (!object.fadeWhenOccluding || !object.occlusionProjection) continue;
      const groupId = object.occlusionGroupId ?? object.id;
      const minimumAlpha = Math.max(0.35, Math.min(0.5, object.minimumAlpha ?? 0.42));
      const occluding = rectsIntersect(playerSpriteRect, object.occlusionProjection)
        && playerIsBehind(object, playerFootY);
      const target = occluding ? minimumAlpha : 1;
      targets.set(groupId, Math.min(targets.get(groupId) ?? 1, target));
    }

    for (const groupId of new Set([...this.groups.keys(), ...targets.keys()])) {
      const state = this.groups.get(groupId) ?? { alpha: 1, targetAlpha: 1 };
      state.targetAlpha = targets.get(groupId) ?? 1;
      const speed = state.targetAlpha < state.alpha ? 8 : 5;
      const factor = Math.min(1, Math.max(0, dt) * speed);
      state.alpha += (state.targetAlpha - state.alpha) * factor;
      if (Math.abs(state.alpha - state.targetAlpha) < 0.002) state.alpha = state.targetAlpha;
      this.groups.set(groupId, state);
    }
  }

  public getAlpha(groupId: string | undefined): number {
    if (!groupId) return 1;
    return this.groups.get(groupId)?.alpha ?? 1;
  }

  public getTargetAlpha(groupId: string): number {
    return this.groups.get(groupId)?.targetAlpha ?? 1;
  }
}
