import type { WorldObjectDefinition } from "../../world/WorldMap";
import type { HubStructureDefinition } from "../HubStructure";
import {
  HUB_ART_COLORS as C,
  artPartOf,
  buttress,
  crenellations,
  groundShadow,
  originOf,
  pixelLine,
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
    { id: "armory_fx", artPart: "armory_fx", bounds: { x: 12, y: 6, width: 216, height: 92 }, layer: "upper", collisionPolicy: "none" },
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
      promptAnchor: { x: 58, y: 146 },
      visiblePropId: "armory_rack",
      interaction: {
        zone: { shape: "rect", x: 12, y: 148, width: 92, height: 52 },
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

const IRON_EDGE = "#20242C";
const IRON_PLATE = "#333944";
const IRON_LIGHT = "#454D5A";
const RIVET = "#8B95A4";
const STEEL = "#A9B4C0";
const STEEL_EDGE = "#E3E9EF";
const GOLD_LIGHT = "#EACA89";
const GOLD_DARK = "#A5854B";
const CLOTH = "#7D302F";
const CLOTH_LIGHT = "#8E3434";
const CLOTH_DARK = "#5A2321";
const DARK_WOOD = "#241E19";
const BOARD_WOOD = "#3B3129";
const FLAME_TIP = "#FFF3C4";

function drawFlame(ctx: CanvasRenderingContext2D, cx: number, baseY: number, flick: number): void {
  const lift = flick % 2;
  rect(ctx, C.orange, cx - 2, baseY - 8 - lift, 5, 8 + lift);
  rect(ctx, C.orange, cx - 1, baseY - 11 - lift, 3, 3);
  rect(ctx, C.fire, cx - 1 + (flick === 3 ? 1 : 0), baseY - 7 - lift, 2, 5);
  rect(ctx, FLAME_TIP, cx, baseY - 6 - lift, 1, 2);
}

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
    const flick = Math.floor(time * 10) % 4;
    for (const side of [0, 1] as const) {
      const brazierX = side === 0 ? x + 27 : x + w - 27;
      rect(ctx, C.stoneDark, brazierX - 3, y + 37, 6, 3);
      rect(ctx, C.stoneDark, brazierX - 7, y + 32, 14, 5);
      rect(ctx, IRON_LIGHT, brazierX - 6, y + 32, 12, 1);
      rect(ctx, C.orange, brazierX - 4, y + 31, 8, 2);
      drawFlame(ctx, brazierX, y + 33, (flick + side * 2) % 4);
    }
    crenellations(ctx, x + 18, y + 54, w - 36, "#4D4540", 10, 6);
    for (const bastionX of [x, x + w - 54]) crenellations(ctx, bastionX + 1, y + 40, 53, "#4A413B", 9, 5);
    const tail = Math.round(Math.sin(time * 1.745 + 0.8));
    rect(ctx, C.stoneDark, center - 1, y - 1, 2, 18);
    rect(ctx, C.gold, center - 2, y - 4, 4, 3);
    rect(ctx, CLOTH, center + 1, y + 1, 9, 5);
    rect(ctx, CLOTH, center + 10, y + 2 + tail, 4, 3);
    rect(ctx, C.gold, center + 1, y + 1, 2, 5);
    crenellations(ctx, center - 47, y + 16, 94, "#4A413B", 11, 5);
    return;
  }
  if (part === "facade") {
    const sway = Math.round(Math.sin(time * 1.745));
    stoneFrame(ctx, x + 20, y + 66, w - 40, 90, "#8A7565", C.armory);
    stoneCourses(ctx, x + 22, y + 68, w - 44, 84, "rgba(216,180,92,0.15)");
    rect(ctx, "#3B342E", x + 26, y + 71, w - 52, 1);
    pixelLine(ctx, x + 28, y + 70, w - 56, C.gold, 9);
    for (const stripX of [x + 56, x + 168]) {
      rect(ctx, IRON_EDGE, stripX, y + 141, 16, 14);
      rect(ctx, IRON_PLATE, stripX + 1, y + 142, 14, 12);
      rect(ctx, IRON_LIGHT, stripX + 1, y + 142, 14, 1);
      rect(ctx, RIVET, stripX + 3, y + 146, 1, 1);
      rect(ctx, RIVET, stripX + 12, y + 146, 1, 1);
    }
    for (const side of [0, 1] as const) {
      const bX = side === 0 ? x : x + w - 54;
      stoneFrame(ctx, bX, y + 50, 54, 106, "#8A7565", C.armory);
      buttress(ctx, bX - 3, y + 80, 76, C.armory, "#8A7565");
      buttress(ctx, bX + 46, y + 80, 76, C.armory, "#8A7565");
      rect(ctx, IRON_EDGE, bX + 5, y + 56, 44, 12);
      rect(ctx, IRON_PLATE, bX + 6, y + 57, 42, 10);
      rect(ctx, IRON_LIGHT, bX + 6, y + 57, 42, 2);
      for (let rivet = 0; rivet < 5; rivet++) rect(ctx, RIVET, bX + 9 + rivet * 9, y + 62, 1, 1);
      for (const slitX of [bX + 15, bX + 35]) {
        rect(ctx, "#6B5B4C", slitX - 2, y + 70, 7, 2);
        rect(ctx, C.stoneDark, slitX - 1, y + 72, 5, 22);
        rect(ctx, C.gold, slitX + 1, y + 75, 1, 16);
      }
      if (side === 0) {
        rect(ctx, C.stoneDark, bX + 18, y + 99, 18, 13);
        rect(ctx, C.stoneDark, bX + 20, y + 112, 14, 4);
        rect(ctx, C.stoneDark, bX + 23, y + 116, 8, 3);
        rect(ctx, C.stoneDark, bX + 26, y + 119, 2, 2);
        rect(ctx, CLOTH, bX + 20, y + 101, 14, 11);
        rect(ctx, CLOTH, bX + 22, y + 112, 10, 3);
        rect(ctx, CLOTH, bX + 25, y + 115, 4, 3);
        rect(ctx, CLOTH_LIGHT, bX + 21, y + 102, 12, 2);
        rect(ctx, C.gold, bX + 25, y + 105, 4, 4);
        rect(ctx, GOLD_LIGHT, bX + 26, y + 106, 2, 2);
        rect(ctx, C.gold, bX + 21, y + 102, 1, 1);
        rect(ctx, C.gold, bX + 32, y + 102, 1, 1);
        rect(ctx, C.gold, bX + 26, y + 116, 2, 2);
      } else {
        rect(ctx, C.stoneDark, bX + 9, y + 94, 36, 56);
        rect(ctx, BOARD_WOOD, bX + 11, y + 96, 32, 52);
        rect(ctx, "#15181E", bX + 13, y + 98, 28, 44);
        rect(ctx, C.gold, bX + 13, y + 98, 28, 1);
        rect(ctx, C.gold, bX + 13, y + 141, 28, 1);
        rect(ctx, GOLD_DARK, bX + 13, y + 98, 1, 44);
        rect(ctx, GOLD_DARK, bX + 40, y + 98, 1, 44);
        rect(ctx, IRON_EDGE, bX + 16, y + 134, 22, 6);
        rect(ctx, IRON_LIGHT, bX + 17, y + 135, 20, 2);
        const relicX = bX + 27;
        rect(ctx, GOLD_LIGHT, relicX, y + 101, 1, 2);
        rect(ctx, GOLD_LIGHT, relicX - 1, y + 103, 3, 23);
        rect(ctx, "#FFF7DC", relicX, y + 105, 1, 18);
        rect(ctx, C.gold, relicX - 5, y + 126, 11, 2);
        rect(ctx, C.wood, relicX - 1, y + 128, 3, 5);
        rect(ctx, C.gold, relicX - 2, y + 132, 5, 2);
        rect(ctx, "rgba(183,250,245,0.08)", bX + 13, y + 98, 28, 44);
        rect(ctx, "rgba(255,255,255,0.28)", bX + 14, y + 99, 1, 9);
      }
    }
    stoneFrame(ctx, center - 46, y + 28, 92, 128, "#9B856F", C.armory);
    stoneCourses(ctx, center - 44, y + 30, 88, 121, "rgba(234,202,137,0.16)");
    buttress(ctx, center - 52, y + 59, 97, "#5B5048", "#9B856F");
    buttress(ctx, center + 42, y + 59, 97, "#5B5048", "#9B856F");
    rect(ctx, "#3B342E", center - 40, y + 36, 80, 1);
    pixelLine(ctx, center - 38, y + 35, 76, C.gold, 7);
    rect(ctx, C.stoneDark, center - 23, y + 40, 46, 46);
    rect(ctx, CLOTH, center - 21, y + 42, 42, 42);
    rect(ctx, CLOTH_LIGHT, center - 18, y + 45, 36, 36);
    rect(ctx, CLOTH_DARK, center - 21, y + 81, 42, 3);
    rect(ctx, GOLD_LIGHT, center - 1, y + 47, 2, 20);
    rect(ctx, "#FFF7DC", center, y + 49, 1, 14);
    rect(ctx, C.gold, center - 7, y + 66, 14, 3);
    rect(ctx, C.wood, center - 1, y + 69, 2, 6);
    rect(ctx, C.gold, center - 2, y + 74, 4, 3);
    for (const chevron of [-1, 1] as const) {
      rect(ctx, C.gold, center + chevron * 13 - 1, y + 53, 2, 2);
      rect(ctx, C.gold, center + chevron * 11 - 1, y + 56, 2, 2);
      rect(ctx, C.gold, center + chevron * 13 - 1, y + 59, 2, 2);
    }
    for (const tasselX of [center - 17, center - 1, center + 15]) rect(ctx, C.gold, tasselX, y + 84, 2, 3);
    for (const side of [-1, 1] as const) {
      const bannerX = center + (side < 0 ? -42 : 28);
      const drift = side < 0 ? sway : -sway;
      rect(ctx, C.stoneDark, bannerX - 2, y + 33, 18, 3);
      rect(ctx, CLOTH, bannerX, y + 36, 14, 16);
      rect(ctx, CLOTH_LIGHT, bannerX + 2, y + 38, 10, 12);
      rect(ctx, C.gold, bannerX + 5, y + 41, 4, 4);
      rect(ctx, CLOTH, bannerX + drift, y + 52, 14, 9);
      rect(ctx, CLOTH_DARK, bannerX + drift, y + 59, 14, 2);
      rect(ctx, CLOTH, bannerX + drift + 1, y + 61, 5, 3);
      rect(ctx, CLOTH, bannerX + drift + 8, y + 61, 5, 3);
      rect(ctx, C.gold, bannerX + drift + 6, y + 54, 2, 4);
    }
    rect(ctx, C.stoneDark, center - 28, y + 92, 56, 64);
    rect(ctx, "#6B5B4C", center - 26, y + 94, 52, 4);
    rect(ctx, IRON_EDGE, center - 24, y + 98, 48, 8);
    rect(ctx, IRON_PLATE, center - 23, y + 99, 46, 6);
    rect(ctx, IRON_LIGHT, center - 23, y + 99, 46, 1);
    for (let rivet = 0; rivet < 6; rivet++) rect(ctx, RIVET, center - 20 + rivet * 8, y + 102, 1, 1);
    rect(ctx, C.gold, center - 2, y + 91, 4, 6);
    rect(ctx, GOLD_DARK, center - 2, y + 96, 4, 1);
    rect(ctx, "#15120F", center - 21, y + 106, 42, 50);
    rect(ctx, "#211D1C", center - 21, y + 114, 42, 42);
    rect(ctx, "rgba(216,180,92,0.08)", center - 19, y + 122, 38, 34);
    rect(ctx, IRON_PLATE, center - 24, y + 106, 3, 50);
    rect(ctx, IRON_PLATE, center + 21, y + 106, 3, 50);
    for (const jambY of [y + 112, y + 134]) {
      rect(ctx, RIVET, center - 23, jambY, 1, 1);
      rect(ctx, RIVET, center + 22, jambY, 1, 1);
    }
    stoneSteps(ctx, center, y + 152, 58, 3, "#8A7565");
    for (const torchX of [x + 63, x + 177]) {
      const flick = Math.floor(time * 8 + (torchX > center ? 2 : 0)) % 4;
      rect(ctx, C.stoneDark, torchX - 3, y + 102, 7, 5);
      rect(ctx, IRON_LIGHT, torchX - 2, y + 103, 5, 2);
      rect(ctx, RIVET, torchX, y + 104, 1, 1);
      rect(ctx, C.wood, torchX - 1, y + 96, 2, 8);
      drawFlame(ctx, torchX, y + 96, flick);
    }
    return;
  }
  if (part === "gate_rails") {
    for (let bar = -18; bar <= 18; bar += 6) {
      rect(ctx, IRON_EDGE, center + bar, y + 104, 2, 48);
      rect(ctx, "#565E6A", center + bar, y + 104, 1, 48);
    }
    for (let rail = 0; rail < 3; rail++) {
      const railY = y + 112 + rail * 14;
      rect(ctx, IRON_EDGE, center - 20, railY, 40, 3);
      rect(ctx, "#565E6A", center - 20, railY, 40, 1);
      rect(ctx, RIVET, center - 19, railY + 1, 1, 1);
      rect(ctx, RIVET, center + 18, railY + 1, 1, 1);
    }
    for (let bar = -18; bar <= 18; bar += 6) rect(ctx, C.gold, center + bar, y + 152, 1, 3);
    return;
  }
  if (part === "armory_rack") {
    const px = x + 18;
    const width = 80;
    const bottom = y + 188;
    groundShadow(ctx, px - 3, bottom - 5, width + 6, 7);
    rect(ctx, C.stoneDark, px, bottom - 11, width, 9);
    rect(ctx, IRON_PLATE, px + 2, bottom - 10, width - 4, 6);
    rect(ctx, IRON_LIGHT, px + 2, bottom - 10, width - 4, 1);
    rect(ctx, RIVET, px + 5, bottom - 8, 1, 1);
    rect(ctx, RIVET, px + width - 6, bottom - 8, 1, 1);
    rect(ctx, DARK_WOOD, px + 1, bottom - 62, 7, 52);
    rect(ctx, C.wood, px + 2, bottom - 61, 5, 50);
    rect(ctx, C.woodLight, px + 3, bottom - 60, 1, 48);
    rect(ctx, DARK_WOOD, px + width - 8, bottom - 62, 7, 52);
    rect(ctx, C.wood, px + width - 7, bottom - 61, 5, 50);
    rect(ctx, C.woodLight, px + width - 6, bottom - 60, 1, 48);
    rect(ctx, DARK_WOOD, px, bottom - 67, width, 7);
    rect(ctx, C.wood, px + 1, bottom - 66, width - 2, 5);
    rect(ctx, C.woodLight, px + 2, bottom - 65, width - 4, 1);
    rect(ctx, C.gold, px, bottom - 67, 2, 2);
    rect(ctx, C.gold, px + width - 2, bottom - 67, 2, 2);
    rect(ctx, DARK_WOOD, px + 8, bottom - 60, width - 16, 49);
    rect(ctx, BOARD_WOOD, px + 9, bottom - 59, width - 18, 47);
    rect(ctx, DARK_WOOD, px + 9, bottom - 36, width - 18, 2);
    const swordX = px + 20;
    rect(ctx, STEEL, swordX, bottom - 57, 1, 2);
    rect(ctx, STEEL, swordX - 1, bottom - 55, 3, 21);
    rect(ctx, STEEL_EDGE, swordX, bottom - 54, 1, 18);
    rect(ctx, C.gold, swordX - 4, bottom - 34, 9, 2);
    rect(ctx, C.wood, swordX - 1, bottom - 32, 3, 5);
    rect(ctx, C.gold, swordX - 1, bottom - 27, 3, 2);
    const spearX = px + 39;
    rect(ctx, STEEL, spearX, bottom - 58, 1, 2);
    rect(ctx, STEEL, spearX - 1, bottom - 56, 3, 5);
    rect(ctx, STEEL_EDGE, spearX, bottom - 56, 1, 4);
    rect(ctx, C.gold, spearX - 1, bottom - 51, 3, 2);
    rect(ctx, C.woodLight, spearX, bottom - 49, 1, 32);
    rect(ctx, IRON_EDGE, spearX - 1, bottom - 17, 3, 2);
    const rifleX = px + 56;
    rect(ctx, IRON_LIGHT, rifleX + 1, bottom - 55, 1, 2);
    rect(ctx, IRON_LIGHT, rifleX, bottom - 53, 2, 20);
    rect(ctx, RIVET, rifleX, bottom - 51, 1, 16);
    rect(ctx, C.gold, rifleX - 1, bottom - 41, 4, 2);
    rect(ctx, C.wood, rifleX - 1, bottom - 33, 4, 8);
    rect(ctx, IRON_EDGE, rifleX + 2, bottom - 28, 2, 3);
    rect(ctx, C.wood, rifleX - 2, bottom - 25, 4, 6);
    rect(ctx, DARK_WOOD, rifleX - 3, bottom - 19, 4, 3);
    rect(ctx, C.woodLight, rifleX - 1, bottom - 31, 1, 5);
    const buckX = px + 69;
    rect(ctx, C.stoneDark, buckX - 2, bottom - 20, 4, 1);
    rect(ctx, C.stoneDark, buckX - 4, bottom - 19, 8, 7);
    rect(ctx, C.stoneDark, buckX - 2, bottom - 12, 4, 1);
    rect(ctx, C.stone, buckX - 2, bottom - 18, 4, 1);
    rect(ctx, C.stone, buckX - 3, bottom - 17, 6, 4);
    rect(ctx, C.stone, buckX - 2, bottom - 13, 4, 1);
    rect(ctx, C.stoneLight, buckX - 2, bottom - 17, 4, 1);
    rect(ctx, C.gold, buckX - 1, bottom - 16, 2, 2);
    rect(ctx, C.gold, px + width / 2 - 5, bottom - 9, 10, 4);
    rect(ctx, GOLD_DARK, px + width / 2 - 4, bottom - 7, 8, 1);
  }
}
