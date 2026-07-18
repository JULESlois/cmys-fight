import type { WorldObjectDefinition } from "../../world/WorldMap";
import type { HubStructureDefinition } from "../HubStructure";
import {
  HUB_ART_COLORS as C,
  archWindow,
  artPartOf,
  banner,
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
    { id: "archive_monument_foot", shape: "rect", x: 92, y: 175, width: 56, height: 13, visiblePropId: "archive_monument" },
    { id: "codex_lectern_foot", shape: "rect", x: 64, y: 176, width: 24, height: 12, visiblePropId: "codex_lectern" },
    { id: "honor_wall_foot", shape: "rect", x: 148, y: 176, width: 48, height: 12, visiblePropId: "honor_wall" },
  ],
  interactions: [
    {
      id: "archive_monument",
      type: "interactable",
      action: "open_records",
      promptKey: "hub.records",
      visiblePropId: "archive_monument",
      interaction: {
        zone: { shape: "rect", x: 88, y: 132, width: 64, height: 58 },
        promptPoint: { x: 120, y: 140 },
        lineOfSightTarget: { x: 120, y: 190 },
        requireLineOfSight: true,
        side: "south",
      },
      properties: { tab: "overview" },
    },
    {
      id: "codex_lectern",
      type: "interactable",
      action: "open_records",
      promptKey: "hub.codex",
      visiblePropId: "codex_lectern",
      interaction: {
        zone: { shape: "rect", x: 48, y: 142, width: 48, height: 48 },
        promptPoint: { x: 76, y: 146 },
        lineOfSightTarget: { x: 76, y: 190 },
        requireLineOfSight: true,
        side: "south",
      },
      properties: { tab: "enemies" },
    },
    {
      id: "honor_wall",
      type: "interactable",
      action: "open_records",
      promptKey: "hub.achievements",
      visiblePropId: "honor_wall",
      interaction: {
        zone: { shape: "rect", x: 144, y: 140, width: 52, height: 50 },
        promptPoint: { x: 172, y: 146 },
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
    return;
  }
  if (part === "facade") {
    for (const wingX of [x + 34, x + w - 110]) {
      stoneFrame(ctx, wingX, y + 58, 76, 82, C.archiveLight, C.archive);
      stoneCourses(ctx, wingX + 2, y + 60, 72, 76, "rgba(155,132,177,0.24)");
      archWindow(ctx, wingX + 20, y + 74, 11, 25, "#785FA2");
      archWindow(ctx, wingX + 56, y + 74, 11, 25, "#785FA2");
      banner(ctx, wingX + 30, y + 103, 16, 30, C.archive, C.gold, Math.round(Math.sin(time * 1.8 + wingX) * 1));
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
    rect(ctx, C.stoneDark, center - 25, y + 96, 50, 48);
    rect(ctx, C.stoneDark, center - 20, y + 90, 40, 8);
    rect(ctx, "#1A1523", center - 18, y + 102, 36, 42);
    rect(ctx, C.gold, center - 2, y + 108, 4, 24);
    rect(ctx, C.gold, center - 10, y + 117, 20, 4);
    pixelLine(ctx, x + 54, y + 68, w - 108, "rgba(216,180,92,0.72)", 11);
    stoneSteps(ctx, center, y + 140, 48, 3, C.archiveLight);
    for (const lampX of [center - 58, center + 58]) {
      rect(ctx, C.stoneDark, lampX - 2, y + 111, 4, 23);
      rect(ctx, "#D9B7FF", lampX - 4, y + 104, 8, 9);
      rect(ctx, "#FFFFFF", lampX - 1, y + 106, 2, 4);
    }
    return;
  }
  if (part === "door_pillars") {
    for (const pillarX of [center - 27, center + 19]) {
      rect(ctx, C.stoneDark, pillarX, y + 92, 8, 52);
      rect(ctx, C.archiveLight, pillarX + 2, y + 96, 3, 42);
    }
    return;
  }
  if (part === "archive_monument") {
    const cx = x + 120;
    const bottom = y + 188;
    groundShadow(ctx, cx - 30, bottom - 5, 60, 7);
    rect(ctx, C.stoneDark, cx - 29, bottom - 13, 58, 13);
    rect(ctx, C.stoneDark, cx - 23, bottom - 20, 46, 8);
    rect(ctx, C.stoneDark, cx - 18, bottom - 57, 36, 39);
    rect(ctx, C.archive, cx - 13, bottom - 53, 26, 31);
    rect(ctx, C.archiveLight, cx - 10, bottom - 50, 20, 3);
    rect(ctx, C.gold, cx - 11, bottom - 39, 22, 3);
    rect(ctx, C.gold, cx - 2, bottom - 48, 4, 22);
    return;
  }
  if (part === "codex_lectern") {
    const cx = x + 76;
    const bottom = y + 188;
    rect(ctx, C.wood, cx - 6, bottom - 34, 12, 34);
    rect(ctx, C.wood, cx - 20, bottom - 37, 40, 8);
    rect(ctx, "#D9C59A", cx - 19, bottom - 48, 18, 12);
    rect(ctx, "#D9C59A", cx + 1, bottom - 48, 18, 12);
    rect(ctx, C.purple, cx - 1, bottom - 48, 2, 12);
    rect(ctx, Math.floor(time * 3) % 2 === 0 ? C.cyanLight : C.cyanSoft, cx - 2, bottom - 57, 4, 5);
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
  }
}
