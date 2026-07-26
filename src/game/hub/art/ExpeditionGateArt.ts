import type { WorldObjectDefinition } from "../../world/WorldMap";
import { EXPEDITION_GATE_STRUCTURE, drawExpeditionGateStructure } from "../structures/ExpeditionGateStructure";
import { artPartOf, originOf, rect } from "../structures/HubArtPrimitives";
import type { HubBuildingArtDefinition } from "./HubBuildingArt";

export const EXPEDITION_GATE_ART: HubBuildingArtDefinition = {
  id: EXPEDITION_GATE_STRUCTURE.id,
  designBounds: { ...EXPEDITION_GATE_STRUCTURE.visualBounds },
  physicalFootprint: [...EXPEDITION_GATE_STRUCTURE.colliders],
  interactionShells: [...EXPEDITION_GATE_STRUCTURE.interactions],
  promptAnchor: { ...EXPEDITION_GATE_STRUCTURE.interactions[0].promptAnchor },
  visualParts: [
    { id: "shadow", layer: "ground", bounds: { x: 0, y: 112, width: 208, height: 18 }, role: "ground-shadow" },
    { id: "ruined_wall", layer: "back", bounds: { x: -18, y: 58, width: 244, height: 70 }, role: "flanking-wall" },
    { id: "portal", layer: "body", bounds: { x: 54, y: 24, width: 100, height: 92 }, role: "energy-aperture" },
    { id: "steps", layer: "ground", bounds: { x: 38, y: 94, width: 132, height: 38 }, role: "complete-stair" },
    { id: "piers", layer: "sorted", bounds: { x: 8, y: 34, width: 192, height: 82 }, sortY: 116, role: "load-bearing-piers" },
    { id: "lintel", layer: "roof", bounds: { x: 44, y: 4, width: 120, height: 38 }, sortY: 116, role: "heavy-lintel" },
    { id: "seals", layer: "front", bounds: { x: 18, y: 60, width: 172, height: 48 }, sortY: 108, role: "functional-seals" },
    { id: "portal-fx", layer: "fx", bounds: { x: 54, y: 24, width: 100, height: 92 }, role: "portal-energy" },
  ],
  occlusionParts: EXPEDITION_GATE_STRUCTURE.occluders.map(part => ({
    id: part.id,
    bounds: { ...part.bounds },
    sortY: part.sortY,
    groupId: EXPEDITION_GATE_STRUCTURE.id,
    minimumAlpha: 0.42,
  })),
  lightSources: [
    { id: "portal-core", position: { x: 104, y: 68 }, radius: 62, color: "#9E73D8", intensity: 0.85 },
    { id: "portal-crosslight", position: { x: 104, y: 70 }, radius: 42, color: "#73E4F2", intensity: 0.5 },
    { id: "torch-west", position: { x: 45, y: 74 }, radius: 24, color: "#F2A048", intensity: 0.5 },
    { id: "torch-east", position: { x: 163, y: 74 }, radius: 24, color: "#F2A048", intensity: 0.5 },
  ],
  animationChannels: [
    { id: "portal-flow", period: 6, property: "portal-swirl-bands" },
    { id: "portal-pulse", period: 5, property: "portal-ring-and-keystone-gem" },
    { id: "edge-shimmer", period: 2.4, property: "portal-rim-sparks" },
    { id: "core-breathe", period: 2, property: "portal-core-and-step-glow" },
    { id: "torch-flicker", period: 0.5, property: "pier-torch-flames" },
    { id: "gold-glint", period: 3.2, property: "emblem-and-lintel-trim" },
    { id: "seal-pulse", period: 2.4, phase: 0.4, property: "side-seal-gems" },
    { id: "chain-sway", period: 2.6, property: "gate-chain-links" },
    { id: "banner-sway", period: 1.8, property: "lintel-banners" },
    { id: "rune-chase", period: 4.2, property: "landing-runes" },
  ],
};

const TAU = Math.PI * 2;

function fract(value: number): number {
  return value - Math.floor(value);
}

export function drawExpeditionGateArt(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
  drawExpeditionGateStructure(ctx, object, time);
  const part = artPartOf(object);
  const { x, y } = originOf(object);
  const cx = x + 104;
  if (part === "steps") {
    rect(ctx, "#20212A", cx - 70, y + 121, 140, 3);
    rect(ctx, "#8E8198", cx - 62, y + 116, 124, 2);
  } else if (part === "portal") {
    const pcy = y + 68;
    for (let spark = 0; spark < 2; spark++) {
      const angle = TAU * (time / 2.4) + spark * Math.PI;
      const sparkX = cx + Math.round(Math.cos(angle) * 30);
      const sparkY = pcy + Math.round(Math.sin(angle) * 27);
      rect(ctx, "rgba(183,250,245,0.85)", sparkX - 1, sparkY - 1, 2, 2);
      const trail = angle - 0.45;
      rect(ctx, "rgba(183,250,245,0.35)", cx + Math.round(Math.cos(trail) * 30) - 1, pcy + Math.round(Math.sin(trail) * 27), 2, 1);
    }
    const pulse = fract(time / 5);
    if (pulse < 0.36) {
      const progress = pulse / 0.36;
      const radius = 0.15 + progress * 0.85;
      const ringColor = `rgba(203,177,255,${((1 - progress) * 0.55).toFixed(3)})`;
      for (let row = -15; row <= 15; row++) {
        const ny = row / 15.5;
        if (Math.abs(ny) > radius) continue;
        const nx = Math.sqrt(radius * radius - ny * ny);
        const dx = Math.round(nx * 32);
        rect(ctx, ringColor, cx - dx - 1, pcy + row * 2, 2, 2);
        rect(ctx, ringColor, cx + dx - 1, pcy + row * 2, 2, 2);
      }
    }
  } else if (part === "lintel") {
    rect(ctx, "#B9A9C9", cx - 34, y + 7, 68, 1);
    rect(ctx, "#4A3B4E", cx - 25, y + 18, 50, 2);
  }
}
