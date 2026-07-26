import type { WorldObjectDefinition } from "../../world/WorldMap";
import { WORKSHOP_STRUCTURE, drawWorkshopStructure } from "../structures/WorkshopStructure";
import { artPartOf, originOf, rect } from "../structures/HubArtPrimitives";
import { defineBuildingArtFromStructure } from "./HubBuildingArt";

export const WORKSHOP_ART = defineBuildingArtFromStructure(WORKSHOP_STRUCTURE, {
  visualParts: [
    { id: "shadow", layer: "ground", bounds: { x: 0, y: 140, width: 256, height: 18 }, role: "ground-shadow" },
    { id: "forge_apron", layer: "ground", bounds: { x: -6, y: 150, width: 132, height: 34 }, role: "warm-light-apron" },
    { id: "facade", layer: "body", bounds: { x: 0, y: 36, width: 256, height: 124 }, sortY: 154, role: "timber-stone-facade" },
    { id: "enchanting_table_prop", layer: "sorted", bounds: { x: 164, y: 130, width: 58, height: 54 }, sortY: 184, role: "enchanting-table" },
    { id: "front_workbench", layer: "front", bounds: { x: 72, y: 126, width: 72, height: 58 }, sortY: 184, role: "smith-workstation" },
    { id: "gantry", layer: "front", bounds: { x: 176, y: 34, width: 78, height: 126 }, sortY: 156, role: "timber-hoist" },
    { id: "roof", layer: "roof", bounds: { x: -8, y: 10, width: 272, height: 86 }, sortY: 100, role: "gabled-roofs-chimney" },
    { id: "smoke", layer: "fx", bounds: { x: 8, y: -18, width: 74, height: 58 }, role: "chimney-smoke" },
    { id: "forge_embers", layer: "fx", bounds: { x: 10, y: 88, width: 78, height: 68 }, role: "ember-sparks" },
  ],
  lightSources: [
    { id: "furnace-mouth", position: { x: 40, y: 126 }, radius: 52, color: "#FF9E4A", intensity: 0.85 },
    { id: "door-glow", position: { x: 88, y: 136 }, radius: 30, color: "#FFB65C", intensity: 0.55 },
    { id: "forge-lantern", position: { x: 116, y: 104 }, radius: 20, color: "#FFC46A", intensity: 0.4 },
    { id: "enchanter-windows", position: { x: 207, y: 114 }, radius: 30, color: "#9B74D5", intensity: 0.32 },
  ],
  animationChannels: [
    { id: "furnace-flicker", period: 0.44, property: "furnace-fire" },
    { id: "heat-shimmer", period: 0.8, phase: 0.25, property: "heat-shimmer" },
    { id: "chimney-smoke", period: 7, property: "smoke-puffs" },
    { id: "ember-drift", period: 2.8, phase: 0.4, property: "ember-sparks" },
    { id: "door-banner", period: 3.14, property: "sign-banner" },
    { id: "hoist-sway", period: 3.7, phase: 0.6, property: "gantry-chain" },
    { id: "lantern-pulse", period: 0.5, property: "wall-lantern" },
    { id: "quench-glint", period: 1, property: "quench-water" },
    { id: "enchant-hover", period: 2.09, phase: 0.1, property: "enchant-crystal" },
  ],
});

export function drawWorkshopArt(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
  drawWorkshopStructure(ctx, object, time);
  const part = artPartOf(object);
  const { x, y } = originOf(object);
  if (part === "facade") {
    // Warm rim light the furnace throws onto the stones flanking its arch.
    const glow = Math.floor(time * 9) % 4 < 2 ? 0.30 : 0.20;
    rect(ctx, `rgba(255,158,61,${glow})`, x + 4, y + 100, 3, 46);
    rect(ctx, `rgba(255,158,61,${glow})`, x + 74, y + 104, 2, 40);
    rect(ctx, "rgba(255,158,61,0.14)", x + 12, y + 90, 56, 2);
  } else if (part === "forge_apron") {
    // Pulsing threshold line right at the furnace mouth.
    const th = Math.floor(time * 6) % 2;
    rect(ctx, `rgba(255,214,140,${th === 0 ? 0.26 : 0.16})`, x + 24, y + 157, 32, 2);
  }
}
