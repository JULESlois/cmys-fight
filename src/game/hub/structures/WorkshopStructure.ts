import type { WorldObjectDefinition } from "../../world/WorldMap";
import type { HubStructureDefinition } from "../HubStructure";
import {
  HUB_ART_COLORS as C,
  archWindow,
  artPartOf,
  banner,
  gabledRoof,
  groundShadow,
  originOf,
  rect,
  stoneCourses,
  stoneFrame,
  stoneSteps,
} from "./HubArtPrimitives";

export const WORKSHOP_STRUCTURE: HubStructureDefinition = {
  id: "workshop_keep",
  artModule: "workshop",
  origin: { x: 112, y: 320 },
  visualBounds: { x: -8, y: -18, width: 272, height: 202 },
  rearAccessRule: "blocked-footprint",
  visualParts: [
    { id: "shadow", artPart: "shadow", bounds: { x: 0, y: 140, width: 256, height: 18 }, layer: "back" },
    { id: "facade", artPart: "facade", bounds: { x: 0, y: 36, width: 256, height: 124 }, layer: "sorted", sortY: 154 },
    { id: "smoke", artPart: "smoke", bounds: { x: 8, y: -18, width: 74, height: 58 }, layer: "upper", collisionPolicy: "none" },
    { id: "enchanting_table_prop", artPart: "enchanting_table", bounds: { x: 164, y: 130, width: 58, height: 54 }, layer: "sorted", sortY: 184, visiblePropId: "enchanting_table", collisionPolicy: "custom" },
  ],
  occluders: [
    { id: "roof", artPart: "roof", bounds: { x: -8, y: 10, width: 272, height: 86 }, sortY: 100 },
    { id: "front_workbench", artPart: "blacksmith_workstation", bounds: { x: 72, y: 126, width: 72, height: 58 }, sortY: 184, visiblePropId: "blacksmith_workstation", collisionPolicy: "custom" },
    { id: "gantry", artPart: "gantry", bounds: { x: 176, y: 34, width: 78, height: 126 }, sortY: 152 },
  ],
  colliders: [
    { id: "rear_block", shape: "rect", x: 16, y: 72, width: 224, height: 28 },
    { id: "foundation_rear", shape: "rect", x: 8, y: 100, width: 240, height: 18 },
    { id: "furnace", shape: "rect", x: 4, y: 118, width: 66, height: 42 },
    { id: "front_center", shape: "rect", x: 104, y: 118, width: 72, height: 36 },
    { id: "annex", shape: "rect", x: 208, y: 118, width: 44, height: 42 },
    { id: "workbench", shape: "rect", x: 80, y: 160, width: 56, height: 12, visiblePropId: "blacksmith_workstation" },
    { id: "enchanting_table", shape: "rect", x: 172, y: 160, width: 42, height: 12, visiblePropId: "enchanting_table" },
  ],
  interactions: [
    {
      id: "blacksmith_forge",
      type: "interactable",
      action: "open_meta_upgrades",
      promptKey: "hub.blacksmith",
      visiblePropId: "blacksmith_workstation",
      interaction: {
        zone: { shape: "rect", x: 68, y: 150, width: 80, height: 48 },
        promptPoint: { x: 108, y: 156 },
        // Aim LOS at the player-facing edge of the workstation collider. The
        // visible prop remains behind this point, but its own footprint no
        // longer invalidates a legitimate south-side interaction.
        lineOfSightTarget: { x: 108, y: 174 },
        requireLineOfSight: true,
        side: "south",
      },
      properties: { tab: "body" },
    },
    {
      id: "enchanting_table",
      type: "interactable",
      action: "open_meta_upgrades",
      promptKey: "hub.enchanter",
      visiblePropId: "enchanting_table",
      interaction: {
        zone: { shape: "rect", x: 156, y: 150, width: 76, height: 48 },
        promptPoint: { x: 194, y: 156 },
        lineOfSightTarget: { x: 194, y: 174 },
        requireLineOfSight: true,
        side: "south",
      },
      properties: { tab: "arcane" },
    },
  ],
  anchors: {
    workshop_forge_entry: { x: 108, y: 182 },
    workshop_enchanting_entry: { x: 194, y: 182 },
    workshop_rear_test: { x: 128, y: 64 },
  },
};

export function drawWorkshopStructure(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
  const { x, y } = originOf(object);
  const part = artPartOf(object);
  const w = 256;
  if (part === "shadow") {
    groundShadow(ctx, x + 2, y + 154, w - 4, 11);
    return;
  }
  if (part === "smoke") {
    const rise = Math.floor(time * 7) % 12;
    rect(ctx, "rgba(90,82,73,0.52)", x + 13, y + 4 - rise, 18, 8);
    rect(ctx, "rgba(107,102,95,0.44)", x + 27, y - 7 - rise, 14, 9);
    rect(ctx, "rgba(90,82,73,0.48)", x + 53, y + 15 - Math.floor(rise / 2), 16, 7);
    return;
  }
  if (part === "roof") {
    gabledRoof(ctx, x + 40, y + 20, w - 46, 42, "#493225", C.woodLight);
    gabledRoof(ctx, x - 4, y + 46, 104, 33, "#3D2A20", C.orange);
    gabledRoof(ctx, x + 164, y + 58, 94, 30, "#513729", C.purple);
    rect(ctx, C.stoneDark, x + 16, y + 14, 26, 62);
    rect(ctx, C.stoneDark, x + 56, y + 27, 18, 48);
    rect(ctx, "#5C4030", x + 20, y + 18, 18, 55);
    rect(ctx, "#5C4030", x + 60, y + 31, 10, 42);
    return;
  }
  if (part === "facade") {
    stoneFrame(ctx, x + 56, y + 56, w - 78, 101, "#8D6747", "#704E37");
    stoneCourses(ctx, x + 58, y + 58, w - 82, 94, "rgba(229,137,69,0.16)");
    rect(ctx, C.wood, x + 71, y + 61, 5, 92);
    rect(ctx, C.wood, x + 114, y + 61, 5, 92);
    rect(ctx, C.wood, x + 157, y + 61, 5, 92);
    rect(ctx, C.wood, x + 200, y + 61, 5, 92);
    for (const beam of [71, 114, 157, 200]) rect(ctx, C.wood, x + beam - 8, y + 84, 21, 4);

    stoneFrame(ctx, x + 3, y + 72, 92, 85, C.woodLight, "#69594C");
    rect(ctx, "#211712", x + 20, y + 101, 56, 48);
    rect(ctx, "#211712", x + 25, y + 94, 46, 10);
    const firePulse = Math.floor(time * 8) % 3;
    rect(ctx, C.red, x + 27, y + 112, 42, 32);
    rect(ctx, C.orange, x + 31, y + 107 - firePulse, 34, 35 + firePulse);
    rect(ctx, C.fire, x + 38, y + 103 - firePulse * 2, 20, 37 + firePulse);
    rect(ctx, "#FFF2B0", x + 45, y + 119, 8, 19);

    const annexX = x + w - 92;
    stoneFrame(ctx, annexX, y + 82, 88, 75, "#8D6747", "#654432");
    archWindow(ctx, annexX + 24, y + 104, 14, 27, C.purple, "#2E2238");
    archWindow(ctx, annexX + 62, y + 104, 14, 27, C.cyanLight, "#2E2238");
    stoneSteps(ctx, x + 108, y + 153, 34, 2, C.woodLight);
    stoneSteps(ctx, x + 194, y + 153, 34, 2, C.woodLight);
    banner(ctx, x + 98, y + 70, 16, 32, "#7D3E2C", C.fire, Math.round(Math.sin(time * 2) * 1));
    return;
  }
  if (part === "gantry") {
    rect(ctx, C.wood, x + w - 30, y + 36, 7, 120);
    rect(ctx, C.wood, x + w - 80, y + 40, 60, 7);
    rect(ctx, C.wood, x + w - 76, y + 47, 5, 24);
    rect(ctx, C.stoneLight, x + w - 78, y + 68, 9, 18);
    rect(ctx, C.gold, x + w - 76, y + 72, 5, 10);
    return;
  }
  if (part === "blacksmith_workstation") {
    const cx = x + 108;
    const bottom = y + 184;
    groundShadow(ctx, cx - 36, bottom - 7, 72, 8);
    rect(ctx, C.wood, cx - 36, bottom - 44, 72, 9);
    rect(ctx, C.woodLight, cx - 32, bottom - 42, 64, 3);
    rect(ctx, C.wood, cx - 29, bottom - 35, 7, 31);
    rect(ctx, C.wood, cx + 22, bottom - 35, 7, 31);
    for (let billet = 0; billet < 4; billet++) rect(ctx, C.stoneLight, cx - 24 + billet * 13, bottom - 52 - (billet % 2) * 3, 10, 5);
    rect(ctx, C.gold, cx - 8, bottom - 71, 16, 5);
    rect(ctx, C.gold, cx - 2, bottom - 78, 4, 18);
    rect(ctx, "#25282D", cx + 17, bottom - 21, 27, 6);
    rect(ctx, "#25282D", cx + 23, bottom - 28, 16, 8);
    return;
  }
  if (part === "enchanting_table") {
    const cx = x + 194;
    const bottom = y + 184;
    const hover = Math.round(Math.sin(time * 3) * 2);
    groundShadow(ctx, cx - 28, bottom - 7, 56, 7);
    rect(ctx, C.stoneDark, cx - 26, bottom - 28, 52, 17);
    rect(ctx, C.archive, cx - 22, bottom - 24, 44, 10);
    rect(ctx, C.wood, cx - 29, bottom - 37, 58, 9);
    rect(ctx, "#E7D8AD", cx - 22, bottom - 49, 20, 12);
    rect(ctx, "#E7D8AD", cx + 2, bottom - 49, 20, 12);
    rect(ctx, C.purpleDark, cx - 2, bottom - 50, 4, 14);
    for (const crystalX of [cx - 27, cx + 23]) {
      rect(ctx, C.cyanLight, crystalX, bottom - 54, 5, 12);
      rect(ctx, C.cyanSoft, crystalX + 2, bottom - 59, 2, 8);
    }
    rect(ctx, C.purple, cx - 6, bottom - 69 - hover, 12, 12);
    rect(ctx, C.cyanSoft, cx - 2, bottom - 75 - hover, 4, 18);
  }
}
