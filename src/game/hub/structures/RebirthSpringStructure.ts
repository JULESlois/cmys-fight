import type { WorldObjectDefinition } from "../../world/WorldMap";
import type { HubStructureDefinition } from "../HubStructure";
import {
  HUB_ART_COLORS as C,
  artPartOf,
  groundShadow,
  originOf,
  rect,
  runeLantern,
  stoneSteps,
} from "./HubArtPrimitives";

export const REBIRTH_SPRING_STRUCTURE: HubStructureDefinition = {
  id: "rebirth_spring",
  artModule: "rebirth_spring",
  origin: { x: 576, y: 432 },
  visualBounds: { x: -20, y: -18, width: 184, height: 132 },
  rearAccessRule: "roof-occluder",
  visualParts: [
    { id: "court", artPart: "court", bounds: { x: -20, y: 0, width: 184, height: 100 }, layer: "back" },
    { id: "basin", artPart: "basin", bounds: { x: 4, y: 14, width: 136, height: 84 }, layer: "sorted", sortY: 80, visiblePropId: "rebirth_spring_visual" },
    { id: "soul_motes", artPart: "soul_motes", bounds: { x: 34, y: -18, width: 76, height: 74 }, layer: "upper" },
  ],
  occluders: [
    { id: "crystal", artPart: "crystal", bounds: { x: 46, y: 10, width: 52, height: 72 }, sortY: 78 },
    { id: "front_rim", artPart: "front_rim", bounds: { x: 12, y: 66, width: 120, height: 24 }, sortY: 82 },
    { id: "lantern_pylons", artPart: "lantern_pylons", bounds: { x: -12, y: 4, width: 168, height: 94 }, sortY: 96 },
  ],
  colliders: [
    { id: "water_surface", shape: "rect", x: 22, y: 38, width: 100, height: 26 },
    { id: "rim_north", shape: "rect", x: 22, y: 30, width: 100, height: 8 },
    { id: "rim_west", shape: "rect", x: 12, y: 38, width: 10, height: 36 },
    { id: "rim_east", shape: "rect", x: 122, y: 38, width: 10, height: 36 },
    { id: "rim_south_west", shape: "rect", x: 22, y: 72, width: 42, height: 8 },
    { id: "rim_south_east", shape: "rect", x: 80, y: 72, width: 42, height: 8 },
    { id: "corner_nw", shape: "circle", x: 22, y: 38, radius: 8 },
    { id: "corner_ne", shape: "circle", x: 122, y: 38, radius: 8 },
    { id: "corner_sw", shape: "circle", x: 22, y: 72, radius: 8 },
    { id: "corner_se", shape: "circle", x: 122, y: 72, radius: 8 },
    { id: "lantern_nw", shape: "circle", x: 0, y: 26, radius: 6 },
    { id: "lantern_ne", shape: "circle", x: 144, y: 26, radius: 6 },
    { id: "lantern_sw", shape: "circle", x: -4, y: 76, radius: 6 },
    { id: "lantern_se", shape: "circle", x: 148, y: 76, radius: 6 },
  ],
  interactions: [
    {
      id: "rebirth_spring",
      type: "interactable",
      action: "open_rebirth_spring",
      promptKey: "hub.rebirthSpring",
      visiblePropId: "rebirth_spring_visual",
      interaction: {
        zone: { shape: "rect", x: 44, y: 80, width: 56, height: 44 },
        promptPoint: { x: 72, y: 84 },
        lineOfSightTarget: { x: 72, y: 82 },
        requireLineOfSight: true,
        side: "south",
      },
    },
  ],
  anchors: {
    rebirth_entry: { x: 72, y: 116 },
    rebirth_stair_top: { x: 72, y: 82 },
    rebirth_stair_mid: { x: 72, y: 86 },
    rebirth_stair_bottom: { x: 72, y: 90 },
  },
};

export function drawRebirthSpringStructure(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
  const { x, y } = originOf(object);
  const part = artPartOf(object);
  const cx = x + 72;
  const cy = y + 52;
  if (part === "court") {
    groundShadow(ctx, cx - 84, y + 88, 168, 11);
    rect(ctx, C.stoneDark, cx - 82, y + 16, 164, 76);
    rect(ctx, C.stoneDark, cx - 90, y + 30, 180, 48);
    rect(ctx, "#555E67", cx - 78, y + 20, 156, 68);
    rect(ctx, "#555E67", cx - 86, y + 34, 172, 40);
    rect(ctx, C.stoneLight, cx - 74, y + 23, 148, 3);
    rect(ctx, C.stoneLight, cx - 82, y + 37, 164, 3);
    for (let rune = -60; rune <= 60; rune += 20) {
      rect(ctx, "rgba(114,224,232,0.42)", cx + rune - 2, y + 83, 5, 2);
      rect(ctx, "rgba(114,224,232,0.42)", cx + rune, y + 79, 1, 10);
    }
    stoneSteps(ctx, cx, y + 82, 40, 3, C.stoneLight);
    return;
  }
  if (part === "basin") {
    rect(ctx, C.stoneDark, cx - 60, y + 30, 120, 50);
    rect(ctx, C.stoneDark, cx - 68, y + 40, 136, 30);
    rect(ctx, "#6B7680", cx - 56, y + 34, 112, 42);
    rect(ctx, "#6B7680", cx - 63, y + 43, 126, 24);
    rect(ctx, C.waterDark, cx - 50, y + 38, 100, 28);
    rect(ctx, C.waterDark, cx - 56, y + 45, 112, 14);
    rect(ctx, C.water, cx - 46, y + 41, 92, 4);
    rect(ctx, C.water, cx - 52, y + 48, 104, 2);
    const shimmer = Math.floor(time * 10) % 24;
    rect(ctx, C.cyanSoft, cx - 42 + shimmer, y + 52, 22, 2);
    rect(ctx, C.cyanSoft, cx + 12 - Math.floor(shimmer / 2), y + 59, 28, 2);
    return;
  }
  if (part === "crystal") {
    const pulse = Math.floor(time * 6) % 3;
    rect(ctx, C.stoneDark, cx - 25, y + 45, 50, 14);
    rect(ctx, C.stoneDark, cx - 18, y + 2, 36, 47);
    rect(ctx, C.stone, cx - 20, y + 48, 40, 8);
    rect(ctx, C.stone, cx - 13, y + 6, 26, 39);
    rect(ctx, C.gold, cx - 16, y + 35, 32, 3);
    rect(ctx, C.gold, cx - 2, y + 22, 4, 20);
    rect(ctx, C.cyanLight, cx - 9, y + 8, 18, 27);
    rect(ctx, C.cyanLight, cx - 5, y - 3, 10, 44);
    rect(ctx, C.cyanLight, cx - 13, y + 18, 26, 8);
    rect(ctx, C.cyanSoft, cx - 2, y + 1 - pulse, 4, 28 + pulse);
    rect(ctx, C.cyanSoft, cx - 7, y + 12, 5, 12);
    return;
  }
  if (part === "front_rim") {
    rect(ctx, C.stoneDark, cx - 60, y + 66, 44, 14);
    rect(ctx, C.stoneDark, cx + 16, y + 66, 44, 14);
    rect(ctx, C.stoneLight, cx - 56, y + 68, 40, 5);
    rect(ctx, C.stoneLight, cx + 16, y + 68, 40, 5);
    return;
  }
  if (part === "lantern_pylons") {
    for (const [px, py] of [
      [cx - 72, y + 20],
      [cx + 72, y + 20],
      [cx - 76, y + 70],
      [cx + 76, y + 70],
    ] as const) runeLantern(ctx, px, py, C.cyanLight, time);
    return;
  }
  if (part === "soul_motes") {
    for (let i = 0; i < 8; i++) {
      const radius = 18 + (i % 4) * 7;
      const px = cx + Math.round(Math.sin(time * 1.7 + i * 1.4) * radius);
      const py = cy - 17 - ((Math.floor(time * 17) + i * 9) % 38);
      rect(ctx, i % 3 === 0 ? C.cyanSoft : C.cyanLight, px, py, i % 2 === 0 ? 2 : 3, 2);
    }
  }
}
