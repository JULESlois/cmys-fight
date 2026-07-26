import type { WorldObjectDefinition } from "../../world/WorldMap";
import { ARMORY_STRUCTURE, drawArmoryStructure } from "../structures/ArmoryStructure";
import { artPartOf, originOf, rect } from "../structures/HubArtPrimitives";
import type { HubBuildingArtDefinition } from "./HubBuildingArt";

export const ARMORY_ART: HubBuildingArtDefinition = {
  id: ARMORY_STRUCTURE.id,
  designBounds: { ...ARMORY_STRUCTURE.visualBounds },
  physicalFootprint: [...ARMORY_STRUCTURE.colliders],
  interactionShells: [...ARMORY_STRUCTURE.interactions],
  promptAnchor: { ...ARMORY_STRUCTURE.interactions[0].promptAnchor },
  visualParts: [
    { id: "shadow", layer: "ground", bounds: { x: 0, y: 142, width: 240, height: 18 }, role: "ground-shadow" },
    { id: "facade", layer: "body", bounds: { x: 0, y: 24, width: 240, height: 136 }, sortY: 154, role: "fortified-curtain-wall" },
    { id: "armory_rack_prop", layer: "sorted", bounds: { x: 18, y: 126, width: 80, height: 62 }, sortY: 188, role: "weapon-rack-display" },
    { id: "roof", layer: "roof", bounds: { x: -6, y: -4, width: 252, height: 82 }, sortY: 98, role: "parapets-and-braziers" },
    { id: "gate_rails", layer: "front", bounds: { x: 90, y: 92, width: 60, height: 66 }, sortY: 156, role: "iron-portcullis" },
    { id: "armory_fx", layer: "fx", bounds: { x: 12, y: 6, width: 216, height: 92 }, role: "ember-motes" },
  ],
  occlusionParts: ARMORY_STRUCTURE.occluders.map(part => ({
    id: part.id,
    bounds: { ...part.bounds },
    sortY: part.sortY,
    groupId: ARMORY_STRUCTURE.id,
    minimumAlpha: 0.42,
  })),
  lightSources: [
    { id: "brazier-west", position: { x: 27, y: 28 }, radius: 30, color: "#E58945", intensity: 0.55 },
    { id: "brazier-east", position: { x: 213, y: 28 }, radius: 30, color: "#E58945", intensity: 0.55 },
    { id: "torch-west", position: { x: 63, y: 90 }, radius: 26, color: "#FFD36B", intensity: 0.5 },
    { id: "torch-east", position: { x: 177, y: 90 }, radius: 26, color: "#FFD36B", intensity: 0.5 },
    { id: "relic-case", position: { x: 213, y: 118 }, radius: 20, color: "#EACA89", intensity: 0.35 },
  ],
  animationChannels: [
    { id: "brazier-flicker", period: 0.4, property: "brazier-flame" },
    { id: "torch-flicker", period: 0.5, phase: 0.25, property: "torch-flame" },
    { id: "banner-sway", period: 3.6, property: "banner-cloth" },
    { id: "case-gleam", period: 4.8, phase: 0.1, property: "display-gleam" },
    { id: "relic-glint", period: 3.2, phase: 0.5, property: "gleam-glints" },
    { id: "ember-drift", period: 1.6, phase: 0.3, property: "ember-motes" },
  ],
};

export function drawArmoryArt(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
  drawArmoryStructure(ctx, object, time);
  const part = artPartOf(object);
  const { x, y } = originOf(object);
  const w = 240;
  if (part === "facade") {
    const caseX = x + w - 54 + 13;
    const sweep = (time / 4.8) % 1;
    if (sweep < 0.3) {
      const gleamX = caseX + 3 + Math.round((sweep / 0.3) * 22);
      rect(ctx, "rgba(255,255,255,0.4)", gleamX, y + 99, 2, 18);
      rect(ctx, "rgba(255,255,255,0.2)", gleamX - 2, y + 118, 2, 22);
    }
    if ((time / 3.2) % 1 < 0.12) rect(ctx, "#FFF7DC", x + 119, y + 48, 2, 3);
    return;
  }
  if (part === "armory_rack") {
    if ((time / 3.2 + 0.5) % 1 < 0.12) rect(ctx, "rgba(255,255,255,0.75)", x + 38, y + 136, 1, 4);
    return;
  }
  if (part === "armory_fx") {
    const sources: Array<[number, number, number]> = [
      [x + 27, y + 26, 0],
      [x + w - 27, y + 26, 3],
      [x + 63, y + 88, 5],
      [x + 177, y + 88, 7],
    ];
    for (const [emberX, emberY, seed] of sources) {
      for (let mote = 0; mote < 2; mote++) {
        const cycle = (time / 1.6 + mote * 0.5 + seed * 0.13) % 1;
        const alpha = 0.6 * (1 - cycle);
        if (alpha < 0.08) continue;
        const driftX = emberX + Math.round(Math.sin(cycle * 6.3 + seed + mote * 2.1) * 2);
        const driftY = emberY - Math.round(cycle * 14);
        const size = cycle < 0.45 ? 2 : 1;
        rect(ctx, `rgba(255,203,96,${alpha.toFixed(2)})`, driftX, driftY, size, size);
      }
    }
  }
}
