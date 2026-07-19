import type { WorldObjectDefinition } from "../../world/WorldMap";
import { drawRitualSpringPart, type RitualSpringPart } from "../../render/RitualSpringRenderer";
import { REBIRTH_SPRING_STRUCTURE } from "../structures/RebirthSpringStructure";
import { artPartOf, originOf, rect } from "../structures/HubArtPrimitives";
import type { HubBuildingArtDefinition } from "./HubBuildingArt";

export const REBIRTH_SPRING_ART: HubBuildingArtDefinition = {
  id: REBIRTH_SPRING_STRUCTURE.id,
  designBounds: { ...REBIRTH_SPRING_STRUCTURE.visualBounds },
  physicalFootprint: [...REBIRTH_SPRING_STRUCTURE.colliders],
  interactionShells: [...REBIRTH_SPRING_STRUCTURE.interactions],
  promptAnchor: { ...REBIRTH_SPRING_STRUCTURE.interactions[0].promptAnchor },
  visualParts: [
    { id: "court", layer: "ground", bounds: { x: -20, y: 0, width: 184, height: 100 }, role: "rune-court" },
    { id: "basin", layer: "body", bounds: { x: 4, y: 14, width: 136, height: 84 }, sortY: 80, role: "multi-ring-basin" },
    { id: "crystal", layer: "sorted", bounds: { x: 46, y: 10, width: 52, height: 72 }, sortY: 78, role: "rebirth-crystal" },
    { id: "front_rim", layer: "front", bounds: { x: 12, y: 66, width: 120, height: 24 }, sortY: 82, role: "front-pool-edge" },
    { id: "lantern_pylons", layer: "front", bounds: { x: -12, y: 4, width: 168, height: 94 }, sortY: 96, role: "four-lanterns" },
    { id: "soul_motes", layer: "fx", bounds: { x: 34, y: -18, width: 76, height: 74 }, role: "soul-particles" },
  ],
  occlusionParts: REBIRTH_SPRING_STRUCTURE.occluders.map(part => ({
    id: part.id,
    bounds: { ...part.bounds },
    sortY: part.sortY,
    groupId: REBIRTH_SPRING_STRUCTURE.id,
    minimumAlpha: 0.42,
  })),
  lightSources: [
    { id: "crystal-light", position: { x: 72, y: 32 }, radius: 48, color: "#7EF4FF", intensity: 0.9 },
    { id: "pool-light", position: { x: 72, y: 57 }, radius: 64, color: "#75D8D2", intensity: 0.55 },
  ],
  animationChannels: [
    { id: "water-cycle", period: 2.4, property: "water-ripple" },
    { id: "soul-cycle", period: 3.2, phase: 0.35, property: "soul-motes" },
    { id: "crystal-pulse", period: 1.6, phase: 0.2, property: "crystal-glow" },
  ],
};

export function drawRebirthSpringArt(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
  const { x, y } = originOf(object);
  const part = artPartOf(object) as RitualSpringPart;
  const centerX = x + 72;
  const centerY = y + 52;

  if (part === "court") {
    rect(ctx, "rgba(6,18,24,0.22)", centerX - 78, centerY + 30, 156, 12);
    for (let segment = 0; segment < 8; segment++) {
      const angle = segment * Math.PI / 4;
      const runeX = Math.round(centerX + Math.cos(angle) * 60);
      const runeY = Math.round(centerY + 4 + Math.sin(angle) * 32);
      rect(ctx, segment % 2 === 0 ? "#3C7B79" : "#315C68", runeX - 3, runeY - 1, 7, 2);
      rect(ctx, "#82D8D0", runeX, runeY - 3, 1, 6);
    }
  }

  drawRitualSpringPart(ctx, part, {
    x: centerX,
    y: centerY,
    time,
    theme: "hub",
  });

  if (part === "basin") {
    rect(ctx, "rgba(158,242,237,0.55)", centerX - 44, centerY - 8, 88, 1);
    rect(ctx, "rgba(33,94,101,0.75)", centerX - 48, centerY + 17, 39, 2);
    rect(ctx, "rgba(33,94,101,0.75)", centerX + 9, centerY + 17, 39, 2);
  } else if (part === "crystal") {
    const pulse = Math.floor(time * 6) % 3;
    rect(ctx, "#D9FFFF", centerX - 2, centerY - 37 - pulse, 4, 8);
    rect(ctx, "#73DDE7", centerX - 7, centerY - 28, 14, 22);
    rect(ctx, "#E8FFFF", centerX - 2, centerY - 25, 3, 15);
  } else if (part === "front_rim") {
    rect(ctx, "#A5BEC1", centerX - 10, centerY + 29, 20, 2);
    rect(ctx, "#4E7479", centerX - 8, centerY + 32, 16, 2);
  }
}
