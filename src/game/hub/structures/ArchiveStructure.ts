import type { WorldObjectDefinition } from "../../world/WorldMap";
import type { HubStructureDefinition } from "../HubStructure";
import {
  HUB_ART_COLORS as C,
  archWindow,
  artPartOf,
  buttress,
  crenellations,
  groundShadow,
  originOf,
  pixelLine,
  rect,
  steppedSpire,
  stoneCourses,
  stoneFrame,
  stoneSteps,
} from "./HubArtPrimitives";

export const ARCHIVE_STRUCTURE: HubStructureDefinition = {
  id: "archive_keep",
  artModule: "archive",
  origin: { x: 144, y: 64 },
  visualBounds: { x: -8, y: -10, width: 256, height: 198 },
  rearAccessRule: "blocked-footprint",
  visualParts: [
    { id: "shadow", artPart: "shadow", bounds: { x: -4, y: 126, width: 248, height: 18 }, layer: "back" },
    { id: "facade", artPart: "facade", bounds: { x: 0, y: 24, width: 240, height: 120 }, layer: "sorted", sortY: 140 },
    { id: "archive_monument_prop", artPart: "archive_monument", bounds: { x: 92, y: 128, width: 56, height: 60 }, layer: "sorted", sortY: 188, visiblePropId: "archive_monument", collisionPolicy: "custom" },
    { id: "codex_lectern_prop", artPart: "codex_lectern", bounds: { x: 56, y: 136, width: 40, height: 52 }, layer: "sorted", sortY: 188, visiblePropId: "codex_lectern", collisionPolicy: "custom" },
    { id: "honor_wall_prop", artPart: "honor_wall", bounds: { x: 148, y: 132, width: 48, height: 56 }, layer: "sorted", sortY: 188, visiblePropId: "honor_wall", collisionPolicy: "custom" },
    { id: "study_fx", artPart: "study_fx", bounds: { x: 92, y: 44, width: 56, height: 102 }, layer: "upper", collisionPolicy: "none" },
  ],
  occluders: [
    { id: "roof", artPart: "roof", bounds: { x: -8, y: -10, width: 256, height: 112 }, sortY: 100 },
    { id: "door_pillars", artPart: "door_pillars", bounds: { x: 88, y: 86, width: 64, height: 58 }, sortY: 142 },
  ],
  colliders: [
    { id: "rear_block", shape: "rect", x: 18, y: 70, width: 204, height: 26 },
    { id: "foundation_rear", shape: "rect", x: 10, y: 96, width: 220, height: 18 },
    { id: "foot_west", shape: "rect", x: 6, y: 114, width: 88, height: 30 },
    { id: "foot_east", shape: "rect", x: 146, y: 114, width: 88, height: 30 },
    { id: "buttress_west", shape: "rect", x: 0, y: 112, width: 10, height: 30 },
    { id: "buttress_east", shape: "rect", x: 230, y: 112, width: 10, height: 30 },
    { id: "archive_monument_foot", shape: "rect", x: 92, y: 166, width: 56, height: 22, visiblePropId: "archive_monument" },
    { id: "codex_lectern_foot", shape: "rect", x: 62, y: 168, width: 28, height: 20, visiblePropId: "codex_lectern" },
    { id: "honor_wall_foot", shape: "rect", x: 148, y: 166, width: 48, height: 22, visiblePropId: "honor_wall" },
  ],
  interactions: [
    {
      id: "archive_monument",
      type: "interactable",
      action: "open_records",
      promptKey: "hub.records",
      promptAnchor: { x: 120, y: 132 },
      visiblePropId: "archive_monument",
      interaction: {
        zone: { shape: "rect", x: 88, y: 132, width: 64, height: 58 },
        lineOfSightTarget: { x: 120, y: 190 },
        requireLineOfSight: true,
      },
      properties: { tab: "overview" },
    },
    {
      id: "codex_lectern",
      type: "interactable",
      action: "open_records",
      promptKey: "hub.codex",
      promptAnchor: { x: 76, y: 136 },
      visiblePropId: "codex_lectern",
      interaction: {
        zone: { shape: "rect", x: 48, y: 142, width: 48, height: 48 },
        lineOfSightTarget: { x: 76, y: 190 },
        requireLineOfSight: true,
      },
      properties: { tab: "enemies" },
    },
    {
      id: "honor_wall",
      type: "interactable",
      action: "open_records",
      promptKey: "hub.achievements",
      promptAnchor: { x: 172, y: 136 },
      visiblePropId: "honor_wall",
      interaction: {
        zone: { shape: "rect", x: 144, y: 140, width: 52, height: 50 },
        lineOfSightTarget: { x: 172, y: 190 },
        requireLineOfSight: true,
        side: "south",
      },
      properties: { tab: "achievements" },
    },
  ],
  anchors: {
    archive_entry: { x: 120, y: 160 },
    archive_rear_test: { x: 120, y: 62 },
  },
};

const TAU = Math.PI * 2;

/** Muted spine palette pulled from the hub set: leather reds, ink purples, gilt, teal. */
const BOOK_SPINE_COLORS = [
  "#7D302F", "#9B74D5", "#D8B45C", "#3E6B63", "#68472E", "#5A6E9E", "#B75E4A", "#6B4E86",
] as const;

/**
 * A carved shelf bay recessed into the stone: 1px ink surround, wooden boards,
 * and rows of book spines with deterministic per-slot width/height/color variety.
 */
function shelfBay(
  ctx: CanvasRenderingContext2D,
  bayX: number,
  bayY: number,
  width: number,
  height: number,
  seed: number,
): void {
  rect(ctx, "#171221", bayX - 1, bayY - 1, width + 2, height + 2);
  rect(ctx, "#241D33", bayX, bayY, width, height);
  const rowHeight = 10;
  const rows = Math.floor(height / rowHeight);
  for (let row = 0; row < rows; row++) {
    const shelfY = bayY + row * rowHeight;
    let cursor = 1;
    let book = seed * 7 + row * 13;
    while (cursor < width - 2) {
      const spineWidth = Math.min(2 + (book * 5 + 3) % 3, width - 1 - cursor);
      const spineHeight = 7 - (book * 3 + seed) % 2;
      const color = BOOK_SPINE_COLORS[(book * 11 + row) % BOOK_SPINE_COLORS.length];
      rect(ctx, color, bayX + cursor, shelfY + rowHeight - 2 - spineHeight, spineWidth, spineHeight);
      if ((book + seed) % 3 === 0) {
        rect(ctx, "rgba(255,244,214,0.25)", bayX + cursor, shelfY + rowHeight - 2 - spineHeight, 1, spineHeight);
      }
      cursor += spineWidth + (book % 4 === 0 ? 1 : 0);
      book++;
    }
    rect(ctx, "#4A3524", bayX, shelfY + rowHeight - 2, width, 2);
    rect(ctx, "#7A5A38", bayX, shelfY + rowHeight - 2, width, 1);
  }
}

/** Small candle flame with a 0.5s deterministic flicker and a warm halo. */
function candleFlame(ctx: CanvasRenderingContext2D, cx: number, baseY: number, time: number, seed: number): void {
  const flick = Math.floor(time * 6 + seed * 0.7) % 3;
  const flameHeight = 4 + (flick === 0 ? 1 : 0);
  const lean = flick === 2 ? 1 : 0;
  rect(ctx, "rgba(255,211,107,0.16)", cx - 4, baseY - flameHeight - 4, 9, flameHeight + 6);
  rect(ctx, "#E58945", cx - 1 + lean, baseY - flameHeight, 2, flameHeight);
  rect(ctx, "#FFD36B", cx - 1 + lean, baseY - flameHeight, 2, Math.max(1, flameHeight - 2));
  rect(ctx, "#FFF3C4", cx + lean, baseY - flameHeight, 1, 1);
}

/** Candle-lit ink glass cycling through three violet shades (period 2.5s). */
function windowInk(time: number, seed: number): string {
  const shades = ["#6F5899", "#785FA2", "#8168AE"] as const;
  return shades[Math.floor(time * 1.2 + seed * 0.9) % 3];
}

export function drawArchiveStructure(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
  const { x, y } = originOf(object);
  const part = artPartOf(object);
  const w = 240;
  const center = x + w / 2;
  if (part === "shadow") {
    groundShadow(ctx, x + 2, y + 140, w - 4, 11);
    return;
  }
  if (part === "roof") {
    for (const wingX of [x + 34, x + w - 110]) {
      crenellations(ctx, wingX + 3, y + 51, 73, C.archive, 9, 6);
      steppedSpire(ctx, wingX + 18, y + 4, 48, 34, "#2D273A", C.archiveLight);
    }
    for (const towerX of [x + 2, x + w - 48]) {
      steppedSpire(ctx, towerX + 24, y - 2, 52, 38, "#2D273A", C.archiveLight);
      crenellations(ctx, towerX + 1, y + 38, 46, C.archive, 8, 5);
    }
    steppedSpire(ctx, center, y - 10, 88, 38, "#312A42", C.gold);
    crenellations(ctx, center - 43, y + 25, 86, C.archive, 10, 5);
    // Ink pennant riding the central spire mast (gentle 4.2s sway).
    const sway = Math.round(Math.sin(time * TAU / 4.2));
    rect(ctx, C.purple, center + 1, y - 15, 6 + sway, 3);
    rect(ctx, "#C9A6FF", center + 1, y - 15, 2, 3);
    return;
  }
  if (part === "facade") {
    for (let wingIndex = 0; wingIndex < 2; wingIndex++) {
      const wingX = wingIndex === 0 ? x + 34 : x + w - 110;
      stoneFrame(ctx, wingX, y + 58, 76, 82, C.archiveLight, C.archive);
      stoneCourses(ctx, wingX + 2, y + 60, 72, 76, "rgba(155,132,177,0.24)");
      archWindow(ctx, wingX + 20, y + 74, 11, 25, windowInk(time, wingIndex));
      archWindow(ctx, wingX + 56, y + 74, 11, 25, windowInk(time, wingIndex + 2));
      // Carved shelf bays lined with book spines replace the bare lower wall.
      rect(ctx, "rgba(155,116,213,0.4)", wingX + 5, y + 101, 66, 1);
      shelfBay(ctx, wingX + 6, y + 104, 28, 30, wingIndex * 3 + 1);
      shelfBay(ctx, wingX + 42, y + 104, 28, 30, wingIndex * 3 + 2);
    }
    for (const towerX of [x + 2, x + w - 48]) {
      stoneFrame(ctx, towerX, y + 32, 48, 112, C.archiveLight, C.archive);
      stoneCourses(ctx, towerX + 2, y + 35, 44, 104, "rgba(155,132,177,0.28)");
      buttress(ctx, towerX - 2, y + 62, 82, C.archive, C.archiveLight);
      buttress(ctx, towerX + 40, y + 62, 82, C.archive, C.archiveLight);
      archWindow(ctx, towerX + 24, y + 54, 14, 34, "#7E67A8");
    }
    stoneFrame(ctx, center - 43, y + 24, 86, 120, C.archiveLight, C.archive);
    stoneCourses(ctx, center - 41, y + 27, 82, 112, "rgba(155,132,177,0.3)");
    buttress(ctx, center - 49, y + 50, 94, C.archive, C.archiveLight);
    buttress(ctx, center + 39, y + 50, 94, C.archive, C.archiveLight);
    archWindow(ctx, center, y + 43, 18, 36, "#9A7BC6", C.archive);
    if (Math.floor(time * 1.2) % 3 === 0) rect(ctx, "rgba(240,230,255,0.35)", center - 1, y + 50, 2, 6);
    // Ink sigil above the door pulses on a 2s cycle.
    const sigilPulse = Math.floor(time) % 2;
    rect(ctx, "rgba(155,116,213,0.18)", center - 5 - sigilPulse, y + 81 - sigilPulse, 10 + sigilPulse * 2, 10 + sigilPulse * 2);
    rect(ctx, C.purpleDark, center - 4, y + 82, 8, 8);
    rect(ctx, C.purple, center - 3, y + 83, 6, 6);
    rect(ctx, "#D9B7FF", center - 1, y + 85, 2, 2);
    // Doorway.
    rect(ctx, C.stoneDark, center - 25, y + 96, 50, 48);
    rect(ctx, C.stoneDark, center - 20, y + 90, 40, 8);
    rect(ctx, "#1A1523", center - 18, y + 102, 36, 42);
    rect(ctx, "rgba(255,211,107,0.14)", center - 18, y + 102, 36, 3);
    rect(ctx, C.gold, center - 2, y + 108, 4, 24);
    rect(ctx, C.gold, center - 10, y + 117, 20, 4);
    // Tall shelf columns flank the doorway inside the central block.
    shelfBay(ctx, center - 41, y + 100, 15, 40, 4);
    shelfBay(ctx, center + 26, y + 100, 15, 40, 6);
    pixelLine(ctx, x + 54, y + 68, w - 108, "rgba(216,180,92,0.72)", 11);
    pixelLine(ctx, x + 58, y + 71, w - 116, "rgba(155,116,213,0.45)", 13);
    stoneSteps(ctx, center, y + 140, 48, 3, C.archiveLight);
    return;
  }
  if (part === "door_pillars") {
    for (const pillarX of [center - 27, center + 19]) {
      rect(ctx, "#171221", pillarX - 1, y + 91, 10, 54);
      rect(ctx, C.stoneDark, pillarX, y + 92, 8, 52);
      rect(ctx, C.archiveLight, pillarX + 2, y + 96, 3, 42);
      rect(ctx, C.gold, pillarX + 1, y + 92, 6, 2);
      candleFlame(ctx, pillarX + 4, y + 92, time, pillarX);
    }
    return;
  }
  if (part === "archive_monument") {
    const cx = x + 120;
    const bottom = y + 188;
    groundShadow(ctx, cx - 30, bottom - 5, 60, 7);
    rect(ctx, "#171221", cx - 30, bottom - 14, 60, 14);
    rect(ctx, C.stoneDark, cx - 29, bottom - 13, 58, 13);
    rect(ctx, C.stoneDark, cx - 23, bottom - 20, 46, 8);
    rect(ctx, "#171221", cx - 19, bottom - 58, 38, 40);
    rect(ctx, C.stoneDark, cx - 18, bottom - 57, 36, 39);
    rect(ctx, C.archive, cx - 13, bottom - 53, 26, 31);
    rect(ctx, C.archiveLight, cx - 10, bottom - 50, 20, 3);
    rect(ctx, C.gold, cx - 11, bottom - 39, 22, 3);
    rect(ctx, C.gold, cx - 2, bottom - 48, 4, 22);
    // Ink inlays shimmer around the sigil on a slow 2.4s walk.
    const shimmer = Math.floor(time * 1.25) % 3;
    rect(ctx, shimmer === 0 ? "#C9A6FF" : "#6B4E86", cx - 11, bottom - 51, 2, 3);
    rect(ctx, shimmer === 1 ? "#C9A6FF" : "#6B4E86", cx + 9, bottom - 51, 2, 3);
    rect(ctx, shimmer === 2 ? "#C9A6FF" : "#6B4E86", cx - 1, bottom - 26, 2, 2);
    return;
  }
  if (part === "codex_lectern") {
    const cx = x + 76;
    const bottom = y + 188;
    groundShadow(ctx, cx - 16, bottom - 4, 32, 5);
    rect(ctx, "#171221", cx - 7, bottom - 35, 14, 35);
    rect(ctx, C.wood, cx - 6, bottom - 34, 12, 34);
    rect(ctx, C.woodLight, cx - 4, bottom - 32, 2, 30);
    rect(ctx, "#171221", cx - 21, bottom - 38, 42, 10);
    rect(ctx, C.wood, cx - 20, bottom - 37, 40, 8);
    rect(ctx, C.woodLight, cx - 18, bottom - 36, 36, 2);
    // Open codex with inked script and a purple spine.
    rect(ctx, "#B39A6F", cx - 20, bottom - 49, 40, 13);
    rect(ctx, "#D9C59A", cx - 19, bottom - 48, 18, 12);
    rect(ctx, "#D9C59A", cx + 1, bottom - 48, 18, 12);
    rect(ctx, "#EFE3C2", cx - 19, bottom - 48, 18, 2);
    rect(ctx, "#EFE3C2", cx + 1, bottom - 48, 18, 2);
    rect(ctx, C.purple, cx - 1, bottom - 48, 2, 12);
    rect(ctx, "rgba(73,52,95,0.55)", cx - 16, bottom - 44, 12, 1);
    rect(ctx, "rgba(73,52,95,0.55)", cx - 16, bottom - 41, 9, 1);
    rect(ctx, "rgba(73,52,95,0.55)", cx + 4, bottom - 44, 12, 1);
    rect(ctx, "rgba(73,52,95,0.55)", cx + 4, bottom - 41, 9, 1);
    // Floating ink rune bobs over the pages (1.6s) with a soft violet halo.
    const bob = Math.round(Math.sin(time * TAU / 1.6));
    rect(ctx, "rgba(155,116,213,0.20)", cx - 5, bottom - 61 + bob, 10, 10);
    rect(ctx, Math.floor(time * 2.5) % 2 === 0 ? "#D9B7FF" : C.purple, cx - 2, bottom - 58 + bob, 4, 4);
    rect(ctx, "#F1E7FF", cx - 1, bottom - 57 + bob, 2, 2);
    // Reading candle set on the desk edge.
    rect(ctx, "#E6DCC4", cx - 17, bottom - 43, 3, 6);
    candleFlame(ctx, cx - 16, bottom - 43, time, 5);
    return;
  }
  if (part === "honor_wall") {
    const px = x + 148;
    const py = y + 132;
    stoneFrame(ctx, px, py + 5, 48, 51, C.gold, C.archive);
    rect(ctx, "#7D302F", px + 7, py + 13, 12, 30);
    rect(ctx, "#7D302F", px + 29, py + 13, 12, 30);
    rect(ctx, C.gold, px + 10, py + 20, 6, 12);
    rect(ctx, C.gold, px + 32, py + 20, 6, 12);
    // Lamplight glint sweeps between the twin honor banners (1.7s).
    const glint = Math.floor(time * 1.2) % 2;
    rect(ctx, "rgba(255,240,200,0.35)", px + 7 + glint * 22, py + 14, 12, 1);
    return;
  }
  if (part === "study_fx") {
    // Light shaft falling from the rose window across the entry (7s breathing).
    const shaftGlow = 0.75 + Math.sin(time * TAU / 7) * 0.25;
    for (let row = 0; row < 16; row++) {
      const t = row / 15;
      const shaftWidth = 12 + Math.round(t * 22);
      const alpha = (0.13 - t * 0.085) * shaftGlow;
      rect(ctx, `rgba(216,198,255,${alpha.toFixed(3)})`, center - shaftWidth / 2, y + 76 + row * 4, shaftWidth, 4);
    }
    rect(ctx, `rgba(233,222,255,${(0.10 * shaftGlow).toFixed(3)})`, center - 2, y + 78, 1, 58);
    rect(ctx, `rgba(233,222,255,${(0.08 * shaftGlow).toFixed(3)})`, center + 4, y + 82, 1, 50);
    // Dust motes drift down the shaft with individual twinkle phases.
    for (let mote = 0; mote < 7; mote++) {
      const speed = 5 + (mote % 3);
      const fall = ((time * speed + mote * 37) % 88) / 88;
      const blink = Math.floor(time * 3 + mote * 1.7) % 4;
      if (blink === 3) continue;
      const moteX = center - 17 + ((mote * 29) % 35) + Math.sin(time * TAU / 5.2 + mote * 2.1) * 2.5;
      const moteY = y + 52 + fall * 84;
      const size = mote % 3 === 0 ? 2 : 1;
      rect(ctx, blink === 0 ? "rgba(244,238,255,0.8)" : "rgba(214,198,246,0.5)", moteX, moteY, size, size);
    }
  }
}
