import type { WorldCollision } from "./WorldCollision";
import type {
  WorldInteractionDefinition,
  WorldInteractionFacing,
  WorldInteractionZone,
  WorldObjectDefinition,
  WorldPoint,
} from "./WorldMap";
import { closestPointOnFootprints } from "./SpatialSemantics";

export interface WorldInteractionTarget {
  object: WorldObjectDefinition;
  distance: number;
  x: number;
  y: number;
}

function numericProperty(object: WorldObjectDefinition, key: string): number | undefined {
  const value = object.properties?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function legacyInteraction(object: WorldObjectDefinition, defaultDistance: number): WorldInteractionDefinition {
  const x = numericProperty(object, "interactionX") ?? object.x + (object.width ?? 0) / 2;
  const y = numericProperty(object, "interactionY") ?? object.y + (object.height ?? 0) / 2;
  return {
    zone: {
      shape: "circle",
      x,
      y,
      radius: numericProperty(object, "interactionRadius") ?? defaultDistance,
    },
    promptPoint: { x, y },
  };
}

function zoneCenter(zone: WorldInteractionZone): WorldPoint {
  if (zone.shape === "circle") return { x: zone.x, y: zone.y };
  return { x: zone.x + zone.width / 2, y: zone.y + zone.height / 2 };
}

function distanceToZone(playerX: number, playerY: number, zone: WorldInteractionZone): number | null {
  if (zone.shape === "circle") {
    const distance = Math.hypot(playerX - zone.x, playerY - zone.y);
    return distance <= zone.radius ? distance : null;
  }
  if (
    playerX < zone.x || playerY < zone.y
    || playerX > zone.x + zone.width || playerY > zone.y + zone.height
  ) return null;
  const center = zoneCenter(zone);
  return Math.hypot(playerX - center.x, playerY - center.y);
}

function isOnRequiredSide(playerX: number, playerY: number, interaction: WorldInteractionDefinition): boolean {
  if (!interaction.side) return true;
  const center = zoneCenter(interaction.zone);
  if (interaction.side === "north") return playerY <= center.y;
  if (interaction.side === "south") return playerY >= center.y;
  if (interaction.side === "west") return playerX <= center.x;
  return playerX >= center.x;
}

function matchesFacing(actual: WorldInteractionFacing | undefined, required: WorldInteractionFacing | undefined): boolean {
  if (!required) return true;
  if (!actual) return false;
  if (required === "west") return actual === "left" || actual === "west";
  if (required === "east") return actual === "right" || actual === "east";
  return actual === required;
}

export class WorldInteraction {
  constructor(private readonly collision?: WorldCollision) {}

  public findNearest(
    playerX: number,
    playerY: number,
    objects: WorldObjectDefinition[],
    defaultDistance = 40,
    facing?: WorldInteractionFacing,
  ): WorldInteractionTarget | null {
    let nearest: WorldInteractionTarget | null = null;
    for (const object of objects) {
      if (object.enabled === false) continue;
      if (object.type !== "interactable" && object.type !== "portal" && object.type !== "npc") continue;
      const interaction = object.interaction ?? legacyInteraction(object, defaultDistance);
      const shellPoint = object.interactionShell && object.physicalFootprint?.length
        ? closestPointOnFootprints(object.physicalFootprint, playerX, playerY)
        : null;
      const distance = shellPoint
        ? shellPoint.distance <= object.interactionShell!.distance ? shellPoint.distance : null
        : distanceToZone(playerX, playerY, interaction.zone);
      if (distance === null) continue;
      if (!isOnRequiredSide(playerX, playerY, interaction)) continue;
      if (!matchesFacing(facing, interaction.facing)) continue;

      const prompt = shellPoint ?? interaction.promptPoint ?? zoneCenter(interaction.zone);
      const losTarget = shellPoint ?? interaction.lineOfSightTarget ?? prompt;
      const ignoredColliderIds = Array.isArray(object.properties?.physicalColliderIds)
        ? object.properties.physicalColliderIds.filter((id): id is string => typeof id === "string")
        : [];
      if (
        interaction.requireLineOfSight === true
        && this.collision
        && !this.collision.hasLineOfSight(playerX, playerY, losTarget.x, losTarget.y, ignoredColliderIds)
      ) continue;

      if (!nearest || distance < nearest.distance) {
        nearest = { object, distance, x: prompt.x, y: prompt.y };
      }
    }
    return nearest;
  }
}
