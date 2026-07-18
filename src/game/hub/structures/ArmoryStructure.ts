import type { WorldObjectDefinition } from "../../world/WorldMap";
import type { HubStructureDefinition } from "../HubStructure";
import {
  HUB_ART_COLORS as C,
  artPartOf,
  banner,
  buttress,
  crenellations,
  groundShadow,
  originOf,
  rect,
  stoneCourses,
  stoneFrame,
  stoneSteps,
} from "./HubArtPrimitives";

export const ARMORY_STRUCTURE: HubStructureDefinition = {
  id: "armory_keep",
  artModule: "armory",
  origin: { x: 944, y: 320 },
  visualBounds: { x: -6, y: -4, width: 252, height: 192 },
  rearAccessRule: "blocked-footprint",
  visualParts: [
    { id: "shadow", artPart: "shadow", bounds: { x: 0, y: 142, width: 240, height: 18 }, layer: "back" },
    { id: "facade", artPart: "facade", bounds: { x: 0, y: 24, width: 240, height: 136 }, layer: "sorted", sortY: 154 },
    { id: "armory_rack_prop", artPart: "armory_rack", bounds: { x: 18, y: 126, width: 80, height: 62 }, layer: "sorted", sortY: 188, visiblePropId: "armory_rack", collisionPolicy: "custom" },
  ],
  occluders: [
    { id: "roof", artPart: "roof", bounds: { x: -6, y: -4, width: 252, height: 82 }, sortY: 98 },
    { id: "gate_rails", artPart: "gate_rails", bounds: { x: 90, y: 92, width: 60, height: 66 }, sortY: 156 },
  ],
  colliders: [
    { id: "rear_block", shape: "rect", x: 18, y: 72, width: 204, height: 28 },
    { id: "foundation_rear", shape: "rect", x: 10, y: 100, width: 220, height: 18 },
    { id: "foot_west", shape: "rect", x: 6, y: 118, width: 84, height: 42 },
    { id: "foot_east", shape: "rect", x: 150, y: 118, width: 84, height: 42 },
    { id: "bastion_west", shape: "rect", x: 0, y: 106, width: 26, height: 50 },
    { id: "bastion_east", shape: "rect", x: 214, y: 106, width: 26, height: 50 },
    { id: "rack", shape: "rect", x: 24, y: 156, width: 68, height: 20, visiblePropId: "armory_rack" },
  ],
  interactions: [
    {
      id: "armory_rack",
      type: "interactable",
      action: "open_armory",
      promptKey: "hub.armory",
      visiblePropId: "armory_rack",
      interaction: {
        zone: { shape: "rect", x: 12, y: 148, width: 92, height: 52 },
        promptPoint: { x: 58, y: 156 },
        lineOfSightTarget: { x: 58, y: 178 },
        requireLineOfSight: true,
      },
    },
  ],
  anchors: {
    armory_entry: { x: 120, y: 182 },
    armory_rack_entry: { x: 58, y: 182 },
    armory_rear_test: { x: 120, y: 64 },
  },
};

export function drawArmoryStructure(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
  const { x, y } = originOf(object);
  const part = artPartOf(object);
  const w = 240;
  const center = x + w / 2;
  if (part === "shadow") {
    groundShadow(ctx, x + 2, y + 154, w - 4, 11);
    return;
  }
  if (part === "roof") {
    crenellations(ctx, x + 18, y + 54, w - 36, "#4D4540", 10, 6);
    for (const bastionX of [x, x + w - 54]) crenellations(ctx, bastionX + 1, y + 40, 53, "#4A413B", 9, 5);
    crenellations(ctx, center - 47, y + 16, 94, "#4A413B", 11, 5);
    return;
  }
  if (part === "facade") {
    stoneFrame(ctx, x + 20, y + 66, w - 40, 90, "#8A7565", C.armory);
    stoneCourses(ctx, x + 22, y + 68, w - 44, 84, "rgba(216,180,92,0.15)");
    for (const bastionX of [x, x + w - 54]) {
      stoneFrame(ctx, bastionX, y + 50, 54, 106, "#8A7565", C.armory);
      buttress(ctx, bastionX - 3, y + 80, 76, C.armory, "#8A7565");
      buttress(ctx, bastionX + 46, y + 80, 76, C.armory, "#8A7565");
      rect(ctx, C.stoneDark, bastionX + 14, y + 78, 5, 34);
      rect(ctx, C.stoneDark, bastionX + 35, y + 78, 5, 34);
      rect(ctx, C.gold, bastionX + 16, y + 82, 1, 26);
      rect(ctx, C.gold, bastionX + 37, y + 82, 1, 26);
    }
    stoneFrame(ctx, center - 46, y + 28, 92, 128, "#9B856F", C.armory);
    stoneCourses(ctx, center - 44, y + 30, 88, 121, "rgba(234,202,137,0.16)");
    buttress(ctx, center - 52, y + 59, 97, "#5B5048", "#9B856F");
    buttress(ctx, center + 42, y + 59, 97, "#5B5048", "#9B856F");
    rect(ctx, C.red, center - 20, y + 44, 40, 38);
    rect(ctx, "#8E3434", center - 14, y + 49, 28, 29);
    rect(ctx, C.gold, center - 2, y + 48, 4, 33);
    rect(ctx, C.gold, center - 12, y + 60, 24, 4);
    rect(ctx, C.gold, center - 18, y + 42, 3, 42);
    rect(ctx, C.gold, center + 15, y + 42, 3, 42);
    rect(ctx, C.stoneDark, center - 26, y + 102, 52, 54);
    rect(ctx, C.stoneDark, center - 20, y + 95, 40, 9);
    rect(ctx, "#211D1C", center - 19, y + 107, 38, 49);
    stoneSteps(ctx, center, y + 152, 58, 3, "#8A7565");
    for (let rack = 0; rack < 3; rack++) {
      const rackX = x + 55 + rack * 64;
      rect(ctx, C.wood, rackX, y + 100, 30, 5);
      rect(ctx, C.wood, rackX + 3, y + 105, 4, 27);
      rect(ctx, C.wood, rackX + 23, y + 105, 4, 27);
      rect(ctx, rack % 2 === 0 ? C.stoneLight : C.gold, rackX + 13, y + 90, 3, 37);
      rect(ctx, rack % 2 === 0 ? C.stoneLight : C.gold, rackX + 7, y + 97, 15, 3);
    }
    banner(ctx, x + 58, y + 68, 16, 38, "#7D302F", C.gold, Math.round(Math.sin(time * 1.7) * 1));
    banner(ctx, x + w - 74, y + 68, 16, 38, "#7D302F", C.gold, -Math.round(Math.sin(time * 1.7) * 1));
    return;
  }
  if (part === "gate_rails") {
    for (let bar = -14; bar <= 14; bar += 7) rect(ctx, "#6D645C", center + bar, y + 109, 2, 44);
    for (let rail = 0; rail < 3; rail++) rect(ctx, "#6D645C", center - 18, y + 116 + rail * 13, 36, 2);
    return;
  }
  if (part === "armory_rack") {
    const px = x + 18;
    const width = 80;
    const bottom = y + 188;
    groundShadow(ctx, px - 3, bottom - 5, width + 6, 7);
    rect(ctx, C.wood, px, bottom - 59, width, 8);
    rect(ctx, C.wood, px, bottom - 18, width, 8);
    rect(ctx, C.wood, px + 4, bottom - 62, 7, 57);
    rect(ctx, C.wood, px + width - 11, bottom - 62, 7, 57);
    rect(ctx, C.woodLight, px + 5, bottom - 56, width - 10, 3);
    for (let merlon = 4; merlon < width - 5; merlon += 15) rect(ctx, C.stoneDark, px + merlon, bottom - 67, 9, 8);
    const rackCenter = px + width / 2;
    rect(ctx, "#7D302F", rackCenter - 13, bottom - 48, 26, 24);
    rect(ctx, "#7D302F", rackCenter - 9, bottom - 24, 18, 5);
    rect(ctx, C.gold, rackCenter - 2, bottom - 45, 4, 20);
    rect(ctx, C.gold, rackCenter - 9, bottom - 37, 18, 3);
    rect(ctx, C.stoneLight, px + 20, bottom - 54, 3, 35);
    rect(ctx, C.stoneLight, px + width - 23, bottom - 54, 3, 35);
    rect(ctx, C.gold, px + 31, bottom - 54, 3, 38);
    rect(ctx, C.gold, px + width - 35, bottom - 52, 3, 35);
    rect(ctx, "#493225", rackCenter - 22, bottom - 17, 44, 12);
    rect(ctx, C.gold, rackCenter - 3, bottom - 14, 6, 7);
  }
}
