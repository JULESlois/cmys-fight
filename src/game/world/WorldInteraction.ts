import type { WorldObjectDefinition } from "./WorldMap";

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

export class WorldInteraction {
  public findNearest(
    playerX: number,
    playerY: number,
    objects: WorldObjectDefinition[],
    defaultDistance = 40,
  ): WorldInteractionTarget | null {
    let nearest: WorldInteractionTarget | null = null;
    for (const object of objects) {
      if (object.enabled === false) continue;
      if (object.type !== "interactable" && object.type !== "portal" && object.type !== "npc") continue;
      const x = numericProperty(object, "interactionX") ?? object.x + (object.width ?? 0) / 2;
      const y = numericProperty(object, "interactionY") ?? object.y + (object.height ?? 0) / 2;
      const maxDistance = numericProperty(object, "interactionRadius") ?? defaultDistance;
      const distance = Math.hypot(x - playerX, y - playerY);
      if (distance > maxDistance) continue;
      if (!nearest || distance < nearest.distance) nearest = { object, distance, x, y };
    }
    return nearest;
  }
}
