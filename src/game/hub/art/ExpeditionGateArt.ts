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
  ],
  animationChannels: [
    { id: "portal-flow", period: 1.2, property: "energy-bands" },
    { id: "seal-pulse", period: 2.4, phase: 0.4, property: "side-seals" },
  ],
};

export function drawExpeditionGateArt(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
  drawExpeditionGateStructure(ctx, object, time);
  const part = artPartOf(object);
  const { x, y } = originOf(object);
  const cx = x + 104;
  if (part === "steps") {
    rect(ctx, "#20212A", cx - 70, y + 121, 140, 3);
    rect(ctx, "#8A7C74", cx - 62, y + 116, 124, 2);
  } else if (part === "portal") {
    const phase = Math.floor(time * 8) % 5;
    rect(ctx, "rgba(196,241,255,0.72)", cx - 22 + phase, y + 53, 44 - phase * 2, 1);
    rect(ctx, "rgba(143,105,210,0.8)", cx - 27, y + 81 - phase, 54, 2);
  } else if (part === "lintel") {
    rect(ctx, "#A7978A", cx - 34, y + 7, 68, 2);
    rect(ctx, "#4A3B4E", cx - 25, y + 18, 50, 2);
  }
}
