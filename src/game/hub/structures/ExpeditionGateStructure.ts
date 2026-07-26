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
  stoneCourses,
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

const TAU = Math.PI * 2;
const MORTAR_LIGHT = "rgba(129,116,145,0.42)";
const BLOCK_LIGHT = "rgba(129,116,145,0.16)";
const MORTAR_DARK = "rgba(18,22,29,0.42)";
const CRACK = "rgba(15,12,20,0.55)";
const CHIP = "rgba(203,193,216,0.28)";
const DAMP = "rgba(9,12,16,0.24)";
const PORTAL_BANDS = ["#241A34", "#33254A", "#49345F", "#5C3F7B", "#7A55A4", "#8B63C4"] as const;

function fract(value: number): number {
  return value - Math.floor(value);
}

function drawTorch(ctx: CanvasRenderingContext2D, tx: number, ty: number, time: number, seed: number): void {
  const frame = Math.floor(time * 8 + seed * 3) % 4;
  const lean = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  const tall = frame % 2;
  const halo = 6 + tall;
  rect(ctx, "rgba(242,150,64,0.12)", tx - halo, ty - 4 - halo, halo * 2 + 1, halo * 2 - 2);
  rect(ctx, "rgba(242,150,64,0.1)", tx - halo + 2, ty - 7 - halo, halo * 2 - 3, halo * 2 + 3);
  rect(ctx, "rgba(255,211,107,0.16)", tx - halo + 3, ty - 4 - halo + 2, halo * 2 - 5, halo * 2 - 6);
  rect(ctx, "#241F31", tx - 4, ty + 4, 9, 3);
  rect(ctx, "#3A3347", tx - 3, ty + 5, 7, 1);
  rect(ctx, "#54422E", tx - 1, ty - 2, 3, 7);
  rect(ctx, "#6B563B", tx - 1, ty - 2, 1, 6);
  rect(ctx, C.orange, tx - 3 + lean, ty - 8 - tall, 6, 8 + tall);
  rect(ctx, C.fire, tx - 2 + lean, ty - 7 - tall, 4, 6 + tall);
  rect(ctx, "#FFF3C4", tx - 1 + lean, ty - 5 - tall, 2, 3);
  if (frame === 1) rect(ctx, C.fire, tx + 1, ty - 11 - tall, 1, 1);
  if (frame === 3) rect(ctx, C.orange, tx - 2, ty - 12, 1, 1);
}

export function drawExpeditionGateStructure(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
  const { x, y } = originOf(object);
  const part = artPartOf(object);
  const cx = x + 104;
  const bottom = y + 128;
  if (part === "shadow") {
    groundShadow(ctx, x + 8, bottom - 8, 192, 10);
    return;
  }
  if (part === "ruined_wall") {
    rect(ctx, "rgba(7,5,11,0.48)", x - 18, y + 68, 244, 56);
    rect(ctx, C.stoneDark, x - 18, y + 76, 52, 44);
    rect(ctx, C.archive, x - 14, y + 80, 48, 36);
    stoneCourses(ctx, x - 14, y + 78, 48, 40, MORTAR_LIGHT, MORTAR_DARK);
    rect(ctx, C.stoneDark, x + 174, y + 70, 52, 50);
    rect(ctx, C.archive, x + 174, y + 74, 48, 42);
    stoneCourses(ctx, x + 174, y + 72, 48, 46, MORTAR_LIGHT, MORTAR_DARK);
    crenellations(ctx, x - 12, y + 64, 42, C.archive, 8, 5);
    rect(ctx, "rgba(129,116,145,0.4)", x - 12, y + 64, 42, 1);
    rect(ctx, "rgba(9,12,16,0.38)", x - 13, y + 76, 44, 2);
    crenellations(ctx, x + 178, y + 58, 42, C.archive, 8, 5);
    rect(ctx, "rgba(129,116,145,0.4)", x + 178, y + 58, 42, 1);
    rect(ctx, "rgba(9,12,16,0.38)", x + 177, y + 70, 44, 2);
    rect(ctx, C.archiveLight, x - 8, y + 82, 5, 2);
    rect(ctx, C.archiveLight, x + 196, y + 76, 4, 2);
    rect(ctx, CRACK, x + 4, y + 88, 1, 9);
    rect(ctx, CRACK, x + 5, y + 95, 1, 5);
    rect(ctx, CRACK, x + 198, y + 84, 1, 8);
    rect(ctx, CRACK, x + 197, y + 90, 1, 6);
    rect(ctx, DAMP, x - 14, y + 110, 48, 6);
    rect(ctx, DAMP, x + 174, y + 110, 48, 6);
    return;
  }
  if (part === "portal") {
    rect(ctx, "#17111F", cx - 46, y + 28, 92, 78);
    rect(ctx, "#17111F", cx - 39, y + 20, 78, 12);
    rect(ctx, C.purpleDark, cx - 39, y + 35, 78, 67);
    rect(ctx, C.purpleDark, cx - 33, y + 26, 66, 12);
    for (const sx of [cx - 37, cx + 34]) {
      for (let notch = y + 44; notch <= y + 92; notch += 13) rect(ctx, "#5C4B73", sx, notch, 3, 5);
    }
    rect(ctx, C.gold, cx - 38, y + 37, 3, 3);
    rect(ctx, C.gold, cx + 35, y + 37, 3, 3);
    rect(ctx, C.gold, cx - 38, y + 97, 3, 3);
    rect(ctx, C.gold, cx + 35, y + 97, 3, 3);
    rect(ctx, "#120C1C", cx - 35, y + 36, 70, 64);
    const pcy = y + 68;
    for (let row = -15; row <= 15; row++) {
      const ny = row / 15.5;
      const half = Math.round(Math.sqrt(Math.max(0, 1 - ny * ny)) * 33);
      if (half < 2) continue;
      const rowY = pcy + row * 2;
      const depth = Math.abs(ny);
      const wobble = Math.sin(TAU * (time / 6) + row * 0.5);
      const idx = Math.min(5, Math.max(0, Math.round((1 - depth) * 3.4 + wobble * 1.1 + 1)));
      rect(ctx, PORTAL_BANDS[idx], cx - half, rowY, half * 2, 2);
      const armX = Math.round(Math.sin(TAU * (time / 6) + row * 0.42) * Math.max(0, half - 5));
      const armW = Math.min(7, Math.max(3, Math.round(half * 0.22)));
      rect(ctx, PORTAL_BANDS[Math.min(5, idx + 2)], cx + armX - armW / 2, rowY, armW, 2);
      if (Math.abs(row) < 10) rect(ctx, "#C9A8F2", cx + armX, rowY, 1, 2);
    }
    const breathe = Math.round(0.5 + 0.5 * Math.sin(TAU * time / 2));
    rect(ctx, "#9F73D8", cx - 2 - breathe, pcy - 6 - breathe, 4 + breathe * 2, 12 + breathe * 2);
    rect(ctx, "#C9A8F2", cx - 4 - breathe, pcy - 4, 8 + breathe * 2, 8);
    rect(ctx, "#C9A8F2", cx - 2, pcy - 5 - breathe, 4, 10 + breathe * 2);
    rect(ctx, "#EFE2FF", cx - 3, pcy - 3, 6, 6);
    rect(ctx, "#EFE2FF", cx - 1, pcy - 4, 2, 8);
    rect(ctx, C.cyanSoft, cx - 1, pcy - 1, 2, 2);
    return;
  }
  if (part === "steps") {
    stoneSteps(ctx, cx, y + 98, 86, 5, C.archiveLight);
    rect(ctx, "rgba(18,22,29,0.35)", cx - 40, y + 100, 12, 1);
    rect(ctx, "rgba(18,22,29,0.35)", cx + 28, y + 104, 14, 1);
    rect(ctx, C.stoneDark, cx - 86, y + 104, 172, 18);
    rect(ctx, C.archive, cx - 78, y + 108, 156, 10);
    rect(ctx, MORTAR_LIGHT, cx - 78, y + 108, 156, 1);
    for (let seam = -66; seam <= 66; seam += 22) rect(ctx, "rgba(18,22,29,0.3)", cx + seam, y + 109, 1, 8);
    rect(ctx, CRACK, cx - 52, y + 113, 7, 1);
    rect(ctx, CRACK, cx - 46, y + 114, 4, 1);
    const spill = 0.09 + 0.05 * (0.5 + 0.5 * Math.sin(TAU * time / 2));
    rect(ctx, `rgba(155,116,213,${spill.toFixed(3)})`, cx - 40, y + 96, 80, 24);
    const activeRune = Math.floor(time / 0.6) % 7;
    for (let runeIndex = 0; runeIndex < 7; runeIndex++) {
      const runeX = -60 + runeIndex * 20;
      rect(ctx, C.gold, cx + runeX - 2, y + 111, 5, 2);
      rect(ctx, C.gold, cx + runeX, y + 108, 1, 8);
      if (runeIndex === activeRune) {
        rect(ctx, "#F7EAC0", cx + runeX - 2, y + 111, 5, 2);
        rect(ctx, "#F7EAC0", cx + runeX, y + 108, 1, 8);
        rect(ctx, "#FFF7DC", cx + runeX, y + 111, 1, 2);
        rect(ctx, "rgba(247,234,192,0.3)", cx + runeX - 4, y + 105, 9, 12);
      }
    }
    return;
  }
  if (part === "left_pier" || part === "right_pier") {
    const isLeft = part === "left_pier";
    const pierX = isLeft ? x + 8 : x + 158;
    const seed = isLeft ? 0 : 1.7;
    stoneFrame(ctx, pierX, y + 34, 42, 82, C.archiveLight, C.archive);
    const blocks = isLeft
      ? [[4, 66, 10, 7], [22, 90, 12, 7], [30, 66, 8, 7], [6, 90, 8, 7]]
      : [[28, 66, 10, 7], [8, 90, 12, 7], [4, 66, 8, 7], [28, 90, 8, 7]];
    for (const [dx, dy, w, h] of blocks) rect(ctx, BLOCK_LIGHT, pierX + dx, y + dy, w, h);
    stoneCourses(ctx, pierX + 1, y + 38, 40, 74, MORTAR_LIGHT, MORTAR_DARK);
    buttress(ctx, pierX - 6, y + 60, 58, C.archive, C.archiveLight);
    buttress(ctx, pierX + 34, y + 60, 58, C.archive, C.archiveLight);
    crenellations(ctx, pierX + 1, y + 24, 40, C.archive, 8, 5);
    rect(ctx, "rgba(129,116,145,0.5)", pierX + 1, y + 24, 40, 1);
    rect(ctx, "rgba(9,12,16,0.4)", pierX + 3, y + 36, 36, 3);
    rect(ctx, C.archiveLight, pierX + 3, y + 39, 36, 2);
    const cracks = isLeft
      ? [[7, 70, 1, 7], [8, 76, 1, 4], [30, 46, 1, 6], [29, 51, 1, 3]]
      : [[34, 68, 1, 8], [33, 75, 1, 4], [11, 44, 1, 5], [12, 48, 1, 3]];
    for (const [dx, dy, w, h] of cracks) rect(ctx, CRACK, pierX + dx, y + dy, w, h);
    rect(ctx, CHIP, pierX + (isLeft ? 12 : 26), y + 58, 2, 1);
    rect(ctx, CHIP, pierX + (isLeft ? 26 : 10), y + 88, 2, 1);
    rect(ctx, DAMP, pierX + 3, y + 106, 36, 8);
    rect(ctx, "#332C42", pierX + 12, y + 41, 18, 22);
    rect(ctx, "rgba(129,116,145,0.5)", pierX + 12, y + 41, 18, 1);
    rect(ctx, "#241F31", pierX + 12, y + 61, 18, 2);
    const emblemX = pierX + 21;
    rect(ctx, C.gold, emblemX - 1, y + 43, 3, 18);
    rect(ctx, C.gold, emblemX - 5, y + 48, 11, 3);
    rect(ctx, C.gold, emblemX - 2, y + 58, 5, 3);
    rect(ctx, "#8A6F33", emblemX + 1, y + 45, 1, 14);
    const glint = fract(time / 3.2 + seed * 0.31);
    if (glint < 0.45) {
      rect(ctx, "#F7EAC0", emblemX - 1, y + 43 + Math.round((glint / 0.45) * 15), 3, 2);
    }
    drawTorch(ctx, isLeft ? pierX + 37 : pierX + 5, y + 78, time, seed);
    return;
  }
  if (part === "left_wall_foot" || part === "right_wall_foot") {
    const isLeft = part === "left_wall_foot";
    const wallX = isLeft ? x : x + 152;
    rect(ctx, C.stoneDark, wallX, y + 104, 56, 24);
    rect(ctx, C.archive, wallX + 4, y + 108, 48, 16);
    rect(ctx, C.archiveLight, wallX + 6, y + 110, 44, 3);
    for (let joint = 10; joint < 52; joint += 12) rect(ctx, MORTAR_DARK, wallX + joint, y + 114, 1, 8);
    rect(ctx, MORTAR_LIGHT, wallX + 4, y + 117, 48, 1);
    rect(ctx, DAMP, wallX + 4, y + 120, 48, 4);
    rect(ctx, CRACK, wallX + (isLeft ? 20 : 38), y + 116, 1, 6);
    rect(ctx, CHIP, wallX + (isLeft ? 14 : 30), y + 111, 3, 1);
    return;
  }
  if (part === "lintel") {
    rect(ctx, C.stoneDark, cx - 52, y + 7, 104, 18);
    rect(ctx, C.stoneDark, cx - 45, y, 90, 10);
    rect(ctx, C.stone, cx - 47, y + 11, 94, 10);
    rect(ctx, C.stone, cx - 40, y + 4, 80, 8);
    rect(ctx, "rgba(129,116,145,0.5)", cx - 47, y + 11, 94, 1);
    rect(ctx, "rgba(220,228,238,0.22)", cx - 40, y + 4, 80, 1);
    for (let block = -44; block <= 36; block += 16) rect(ctx, MORTAR_DARK, cx + block + 8, y + 12, 1, 8);
    rect(ctx, CRACK, cx - 33, y + 6, 1, 5);
    rect(ctx, CRACK, cx + 27, y + 15, 1, 5);
    rect(ctx, "#241F31", cx - 6, y + 10, 12, 12);
    rect(ctx, C.archiveLight, cx - 5, y + 11, 10, 10);
    rect(ctx, "#B9A9C9", cx - 5, y + 11, 10, 1);
    const gemPulse = fract(time / 5);
    rect(ctx, gemPulse < 0.36 ? "#C9A8F2" : "#7A55A4", cx - 2, y + 15, 4, 4);
    if (gemPulse < 0.36) rect(ctx, "rgba(201,168,242,0.35)", cx - 4, y + 13, 8, 8);
    rect(ctx, C.gold, cx - 40, y + 21, 80, 2);
    rect(ctx, "#8A6F33", cx - 40, y + 23, 80, 1);
    const sweep = fract(time / 3.2);
    rect(ctx, "#F7EAC0", cx - 40 + Math.round(sweep * 77), y + 21, 4, 2);
    rect(ctx, "rgba(9,12,16,0.32)", cx - 45, y + 24, 90, 2);
    rect(ctx, C.gold, cx - 3, y - 4, 6, 13);
    rect(ctx, C.gold, cx - 12, y + 2, 24, 4);
    rect(ctx, "#8A6F33", cx + 1, y - 2, 1, 10);
    if (fract(time / 3.2 + 0.5) < 0.12) rect(ctx, "#FFF7DC", cx - 1, y - 3, 2, 2);
    for (const side of [-1, 1]) {
      const bannerX = cx + side * 46 - 3;
      const sway = Math.round(Math.sin(TAU * (time / 1.8) + side * 1.2));
      rect(ctx, C.stoneDark, bannerX - 1, y + 24, 8, 2);
      rect(ctx, C.purpleDark, bannerX, y + 26, 6, 10);
      rect(ctx, "#5C4370", bannerX + 1, y + 26, 2, 9);
      rect(ctx, C.purpleDark, bannerX + sway, y + 36, 6, 4);
      rect(ctx, C.gold, bannerX + 2, y + 29, 2, 4);
      rect(ctx, C.gold, bannerX + 1 + sway, y + 39, 4, 1);
    }
    return;
  }
  if (part === "gate_rails") {
    for (let tooth = -32; tooth <= 32; tooth += 16) {
      rect(ctx, "#2B2436", cx + tooth - 1, y + 40, 3, 9);
      rect(ctx, "#4A3F5C", cx + tooth - 1, y + 40, 1, 8);
      rect(ctx, C.gold, cx + tooth - 1, y + 49, 3, 2);
    }
    for (const side of [-1, 1]) {
      const chainX = cx + side * 40;
      rect(ctx, "#4A4038", chainX, y + 36, 3, 3);
      for (let link = 0; link < 4; link++) {
        const sway = Math.round(Math.sin(TAU * (time / 2.6) + link * 0.65 + side) * (link / 3));
        const linkX = chainX + sway + side * (link % 2);
        rect(ctx, link % 2 === 0 ? "#7B6B63" : "#5E534B", linkX, y + 38 + link * 9, 3, 6);
        rect(ctx, "#93857B", linkX, y + 38 + link * 9, 1, 2);
      }
    }
    return;
  }
  if (part === "side_seals") {
    for (const [sealIndex, sealX] of [cx - 40, cx + 40].entries()) {
      const pulse = 0.5 + 0.5 * Math.sin(TAU * (time / 2.4 + 0.4) + sealIndex * Math.PI * 0.5);
      rect(ctx, "rgba(4,7,8,0.3)", sealX - 8, y + 95, 19, 4);
      rect(ctx, C.stoneDark, sealX - 8, y + 93, 19, 4);
      rect(ctx, C.stoneDark, sealX - 7, y + 70, 17, 24);
      rect(ctx, "#332C42", sealX - 5, y + 72, 13, 20);
      rect(ctx, "rgba(129,116,145,0.5)", sealX - 5, y + 72, 13, 1);
      rect(ctx, "rgba(129,116,145,0.35)", sealX - 5, y + 72, 1, 19);
      rect(ctx, C.stoneDark, sealX - 8, y + 67, 19, 3);
      rect(ctx, C.archiveLight, sealX - 7, y + 67, 17, 1);
      rect(ctx, C.gold, sealX, y + 75, 3, 9);
      rect(ctx, C.gold, sealX - 3, y + 78, 9, 3);
      rect(ctx, "#8A6F33", sealX + 2, y + 76, 1, 7);
      rect(ctx, CRACK, sealX + (sealIndex === 0 ? -4 : 6), y + 87, 1, 5);
      const bright = pulse > 0.5;
      rect(ctx, bright ? "#C9A8F2" : "#7A55A4", sealX, y + 87, 3, 2);
      if (bright) {
        rect(ctx, `rgba(155,116,213,${(0.14 + 0.2 * (pulse - 0.5) * 2).toFixed(3)})`, sealX - 4, y + 83, 11, 8);
      }
    }
  }
}
