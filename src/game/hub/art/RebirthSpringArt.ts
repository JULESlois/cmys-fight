import type { WorldObjectDefinition } from "../../world/WorldMap";
import { REBIRTH_SPRING_STRUCTURE, drawRebirthSpringStructure } from "../structures/RebirthSpringStructure";
import type { HubBuildingArtDefinition } from "./HubBuildingArt";

export const REBIRTH_SPRING_ART: HubBuildingArtDefinition = {
  id: REBIRTH_SPRING_STRUCTURE.id,
  designBounds: { ...REBIRTH_SPRING_STRUCTURE.visualBounds },
  physicalFootprint: [...REBIRTH_SPRING_STRUCTURE.colliders],
  interactionShells: [...REBIRTH_SPRING_STRUCTURE.interactions],
  promptAnchor: { ...REBIRTH_SPRING_STRUCTURE.interactions[0].promptAnchor },
  visualParts: [
    { id: "court", layer: "ground", bounds: { x: -20, y: 0, width: 184, height: 100 }, role: "carved-rune-court" },
    { id: "basin", layer: "body", bounds: { x: 4, y: 14, width: 136, height: 84 }, sortY: 80, role: "tiered-sacred-basin" },
    { id: "crystal", layer: "sorted", bounds: { x: 46, y: 10, width: 52, height: 72 }, sortY: 81, role: "floating-rebirth-crystal" },
    { id: "front_rim", layer: "front", bounds: { x: 12, y: 66, width: 120, height: 24 }, sortY: 82, role: "front-balustrade-landing" },
    { id: "lantern_pylons", layer: "front", bounds: { x: -12, y: 4, width: 168, height: 94 }, sortY: 96, role: "four-flame-pylons" },
    { id: "soul_motes", layer: "fx", bounds: { x: 34, y: -18, width: 76, height: 74 }, role: "rising-soul-motes" },
  ],
  occlusionParts: REBIRTH_SPRING_STRUCTURE.occluders.map(part => ({
    id: part.id,
    bounds: { ...part.bounds },
    sortY: part.sortY,
    groupId: REBIRTH_SPRING_STRUCTURE.id,
    minimumAlpha: 0.42,
  })),
  lightSources: [
    // Local coordinates: the floating shard's heart, the luminous pool, and
    // the four pylon flame-crystals.
    { id: "crystal-light", position: { x: 72, y: 19 }, radius: 52, color: "#7EF4FF", intensity: 0.95 },
    { id: "pool-light", position: { x: 72, y: 50 }, radius: 60, color: "#75D8D2", intensity: 0.6 },
    { id: "pylon-nw", position: { x: 0, y: 10 }, radius: 16, color: "#9FF2EF", intensity: 0.5 },
    { id: "pylon-ne", position: { x: 144, y: 10 }, radius: 16, color: "#9FF2EF", intensity: 0.5 },
    { id: "pylon-sw", position: { x: -4, y: 60 }, radius: 16, color: "#9FF2EF", intensity: 0.5 },
    { id: "pylon-se", position: { x: 148, y: 60 }, radius: 16, color: "#9FF2EF", intensity: 0.5 },
  ],
  animationChannels: [
    { id: "water-ripple", period: 2.8, property: "water-ripple" },
    { id: "water-shimmer", period: 5.6, phase: 0.5, property: "water-shimmer" },
    { id: "crystal-bob", period: 3.4, property: "crystal-bob" },
    { id: "crystal-pulse", period: 1.8, phase: 0.2, property: "crystal-glow" },
    { id: "rune-breathe", period: 4.2, phase: 0.1, property: "rune-glow" },
    { id: "soul-cycle", period: 3.6, phase: 0.35, property: "soul-motes" },
    { id: "pylon-flame", period: 2.6, phase: 0.6, property: "lantern-glow" },
  ],
};

export function drawRebirthSpringArt(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
  drawRebirthSpringStructure(ctx, object, time);
}
