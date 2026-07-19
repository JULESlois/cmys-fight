import type { WorldObjectDefinition } from "../../world/WorldMap";
import type { HubStructureDefinition } from "../HubStructure";
import {
  HUB_ART_COLORS as C,
  artPartOf,
  buttress,
  crenellations,
  groundShadow,
  originOf,
  rect,
  stoneFrame,
  stoneSteps,
} from "./HubArtPrimitives";

export const EXPEDITION_GATE_STRUCTURE: HubStructureDefinition = {
  id: "expedition_gate",
  artModule: "expedition_gate",
  origin: { x: 544, y: 816 },
  visualBounds: { x: -18, y: -12, width: 244, height: 144 },
  rearAccessRule: "map-layout",
  visualParts: [
    { id: "shadow", artPart: "shadow", bounds: { x: 0, y: 112, width: 208, height: 18 }, layer: "back" },
    { id: "ruined_wall", artPart: "ruined_wall", bounds: { x: -18, y: 58, width: 244, height: 70 }, layer: "back" },
    { id: "portal", artPart: "portal", bounds: { x: 54, y: 24, width: 100, height: 92 }, layer: "back", visiblePropId: "expedition_portal", collisionPolicy: "none" },
    { id: "steps", artPart: "steps", bounds: { x: 38, y: 94, width: 132, height: 38 }, layer: "back" },
    { id: "left_pier", artPart: "left_pier", bounds: { x: 8, y: 34, width: 42, height: 82 }, layer: "sorted", sortY: 116 },
    { id: "right_pier", artPart: "right_pier", bounds: { x: 158, y: 34, width: 42, height: 82 }, layer: "sorted", sortY: 116 },
    { id: "left_wall_foot", artPart: "left_wall_foot", bounds: { x: 0, y: 104, width: 56, height: 24 }, layer: "sorted", sortY: 128 },
    { id: "right_wall_foot", artPart: "right_wall_foot", bounds: { x: 152, y: 104, width: 56, height: 24 }, layer: "sorted", sortY: 128 },
  ],
  occluders: [
    { id: "lintel", artPart: "lintel", bounds: { x: 44, y: 4, width: 120, height: 38 }, sortY: 116 },
    { id: "gate_rails", artPart: "gate_rails", bounds: { x: 54, y: 40, width: 100, height: 72 }, sortY: 112 },
    { id: "side_seals", artPart: "side_seals", bounds: { x: 18, y: 60, width: 172, height: 48 }, sortY: 108 },
  ],
  colliders: [
    { id: "pier_west", shape: "rect", fromVisualPartId: "left_pier" },
    { id: "pier_east", shape: "rect", fromVisualPartId: "right_pier" },
    { id: "wall_west", shape: "rect", fromVisualPartId: "left_wall_foot" },
    { id: "wall_east", shape: "rect", fromVisualPartId: "right_wall_foot" },
  ],
  interactions: [
    {
      id: "expedition_gate",
      type: "portal",
      action: "open_expedition",
      promptKey: "hub.expeditionGate",
      promptAnchor: { x: 104, y: 24 },
      visiblePropId: "expedition_portal",
      interaction: {
        zone: { shape: "rect", x: 60, y: 0, width: 88, height: 58 },
        lineOfSightTarget: { x: 104, y: 36 },
        requireLineOfSight: true,
        side: "north",
      },
    },
  ],
  anchors: {
    expedition_entry: { x: 104, y: 8 },
    expedition_stair_top: { x: 104, y: 100 },
    expedition_stair_bottom: { x: 104, y: 122 },
    expedition_rear_test: { x: 104, y: 136 },
  },
};

export function drawExpeditionGateStructure(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
  const { x, y } = originOf(object);
  const part = artPartOf(object);
  const cx = x + 104;
  const bottom = y + 128;
  const phase = Math.floor(time * 5) % 4;
  if (part === "shadow") {
    groundShadow(ctx, x + 8, bottom - 8, 192, 10);
    return;
  }
  if (part === "ruined_wall") {
    rect(ctx, "rgba(7,5,11,0.48)", x - 18, y + 68, 244, 56);
    rect(ctx, C.stoneDark, x - 18, y + 76, 52, 44);
    rect(ctx, C.archive, x - 14, y + 80, 48, 36);
    rect(ctx, C.stoneDark, x + 174, y + 70, 52, 50);
    rect(ctx, C.archive, x + 174, y + 74, 48, 42);
    crenellations(ctx, x - 12, y + 64, 42, C.archive, 8, 5);
    crenellations(ctx, x + 178, y + 58, 42, C.archive, 8, 5);
    return;
  }
  if (part === "portal") {
    rect(ctx, "#17111F", cx - 46, y + 28, 92, 78);
    rect(ctx, "#17111F", cx - 39, y + 20, 78, 12);
    rect(ctx, C.purpleDark, cx - 39, y + 35, 78, 67);
    rect(ctx, C.purpleDark, cx - 33, y + 26, 66, 12);
    rect(ctx, phase < 2 ? "#8B63C4" : "#9F73D8", cx - 32, y + 40, 64, 56);
    for (let band = 0; band < 5; band++) {
      const inset = band * 4;
      rect(ctx, "#5C3F7B", cx - 28 + inset, y + 45 + band * 9, 56 - inset * 2, 2);
    }
    rect(ctx, C.cyanSoft, cx - 3 + phase, y + 43, 5, 45);
    rect(ctx, C.cyanSoft, cx - 18, y + 63 + phase, 36, 2);
    return;
  }
  if (part === "steps") {
    stoneSteps(ctx, cx, y + 98, 86, 5, C.archiveLight);
    rect(ctx, C.stoneDark, cx - 86, y + 104, 172, 18);
    rect(ctx, C.archive, cx - 78, y + 108, 156, 10);
    for (let runeX = -62; runeX <= 62; runeX += 20) {
      rect(ctx, C.gold, cx + runeX - 2, y + 111, 5, 2);
      rect(ctx, C.gold, cx + runeX, y + 108, 1, 8);
    }
    return;
  }
  if (part === "left_pier" || part === "right_pier") {
    const pierX = part === "left_pier" ? x + 8 : x + 158;
    stoneFrame(ctx, pierX, y + 34, 42, 82, C.archiveLight, C.archive);
    buttress(ctx, pierX - 6, y + 60, 58, C.archive, C.archiveLight);
    buttress(ctx, pierX + 34, y + 60, 58, C.archive, C.archiveLight);
    crenellations(ctx, pierX + 1, y + 24, 40, C.archive, 8, 5);
    rect(ctx, C.gold, pierX + 17, y + 48, 8, 8);
    rect(ctx, C.gold, pierX + 19, y + 53, 4, 22);
    rect(ctx, C.gold, pierX + 15, y + 62, 12, 4);
    rect(ctx, C.stoneDark, pierX + 5, y + 76, 10, 24);
    rect(ctx, C.orange, pierX + 7, y + 80, 6, 14 + (phase % 2) * 2);
    rect(ctx, C.fire, pierX + 9, y + 84 - (phase % 2), 2, 10);
    return;
  }
  if (part === "left_wall_foot" || part === "right_wall_foot") {
    const wallX = part === "left_wall_foot" ? x : x + 152;
    rect(ctx, C.stoneDark, wallX, y + 104, 56, 24);
    rect(ctx, C.archive, wallX + 4, y + 108, 48, 16);
    rect(ctx, C.archiveLight, wallX + 6, y + 110, 44, 3);
    return;
  }
  if (part === "lintel") {
    rect(ctx, C.stoneDark, cx - 52, y + 7, 104, 18);
    rect(ctx, C.stoneDark, cx - 45, y, 90, 10);
    rect(ctx, C.stone, cx - 47, y + 11, 94, 10);
    rect(ctx, C.stone, cx - 40, y + 4, 80, 8);
    rect(ctx, C.archiveLight, cx - 40, y + 14, 80, 2);
    rect(ctx, C.gold, cx - 3, y - 4, 6, 18);
    rect(ctx, C.gold, cx - 12, y + 2, 24, 4);
    return;
  }
  if (part === "gate_rails") {
    for (const side of [-1, 1]) {
      const chainX = cx + side * 40;
      for (let link = 0; link < 6; link++) {
        rect(ctx, "#7B6B63", chainX + side * (link % 2), y + 38 + link * 9, 3, 6);
      }
    }
    return;
  }
  if (part === "side_seals") {
    for (const sealX of [cx - 73, cx + 73]) {
      rect(ctx, C.stoneDark, sealX - 8, y + 63, 16, 20);
      rect(ctx, C.archive, sealX - 5, y + 67, 10, 12);
      rect(ctx, C.gold, sealX - 1, y + 69, 3, 8);
      rect(ctx, C.gold, sealX - 4, y + 72, 8, 3);
    }
  }
}
