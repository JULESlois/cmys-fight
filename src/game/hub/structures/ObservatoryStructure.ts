import type { WorldObjectDefinition } from "../../world/WorldMap";
import type { HubStructureDefinition } from "../HubStructure";
import {
  HUB_ART_COLORS as C,
  archWindow,
  artPartOf,
  banner,
  buttress,
  groundShadow,
  originOf,
  rect,
  stoneCourses,
  stoneFrame,
  stoneSteps,
} from "./HubArtPrimitives";

export const OBSERVATORY_STRUCTURE: HubStructureDefinition = {
  id: "observatory_keep",
  artModule: "observatory",
  origin: { x: 944, y: 64 },
  visualBounds: { x: -8, y: -8, width: 240, height: 196 },
  rearAccessRule: "blocked-footprint",
  visualParts: [
    { id: "shadow", artPart: "shadow", bounds: { x: 4, y: 130, width: 216, height: 18 }, layer: "back" },
    { id: "facade", artPart: "facade", bounds: { x: 4, y: 40, width: 216, height: 108 }, layer: "sorted", sortY: 140 },
    { id: "astral_console_prop", artPart: "astral_console", bounds: { x: 76, y: 126, width: 72, height: 62 }, layer: "sorted", sortY: 188, visiblePropId: "astral_console", collisionPolicy: "custom" },
  ],
  occluders: [
    { id: "dome", artPart: "dome", bounds: { x: 30, y: 0, width: 164, height: 82 }, sortY: 92 },
    { id: "door_pillars", artPart: "door_pillars", bounds: { x: 80, y: 88, width: 64, height: 58 }, sortY: 144 },
  ],
  colliders: [
    { id: "rear_block", shape: "rect", x: 26, y: 68, width: 172, height: 28 },
    { id: "foundation_rear", shape: "rect", x: 14, y: 96, width: 196, height: 18 },
    { id: "foot_west", shape: "rect", x: 10, y: 114, width: 76, height: 30 },
    { id: "foot_east", shape: "rect", x: 138, y: 114, width: 76, height: 30 },
    { id: "pylon_west", shape: "rect", x: 4, y: 92, width: 24, height: 46 },
    { id: "pylon_east", shape: "rect", x: 196, y: 92, width: 24, height: 46 },
    { id: "astral_console_foot", shape: "rect", x: 77, y: 164, width: 70, height: 24, visiblePropId: "astral_console" },
  ],
  interactions: [
    {
      id: "astral_console",
      type: "interactable",
      action: "open_settings",
      promptKey: "hub.settings",
      promptAnchor: { x: 112, y: 136 },
      visiblePropId: "astral_console",
      interaction: {
        zone: { shape: "rect", x: 72, y: 136, width: 80, height: 54 },
        lineOfSightTarget: { x: 112, y: 190 },
        requireLineOfSight: true,
      },
    },
  ],
  anchors: {
    observatory_entry: { x: 112, y: 198 },
    observatory_rear_test: { x: 112, y: 58 },
  },
};

export function drawObservatoryStructure(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
  const { x, y } = originOf(object);
  const part = artPartOf(object);
  const w = 224;
  const center = x + w / 2;
  if (part === "shadow") {
    groundShadow(ctx, x + 8, y + 140, w - 16, 11);
    return;
  }
  if (part === "dome") {
    const domeRows = [148, 138, 124, 104, 80, 54, 26, 10];
    domeRows.forEach((rowWidth, row) => {
      rect(ctx, row % 2 === 0 ? "#335869" : "#3D6879", center - rowWidth / 2, y + 15 + row * 5, rowWidth, 6);
    });
    rect(ctx, C.cyanLight, center - 2, y + 6, 4, 16);
    rect(ctx, C.cyanLight, center - 7, y + 9, 14, 3);
    ctx.strokeStyle = "#7FDCE5";
    ctx.lineWidth = 2;
    ctx.strokeRect(center - 48, y + 29, 96, 34);
    ctx.strokeStyle = "rgba(155,116,213,0.82)";
    ctx.strokeRect(center - 37, y + 22, 74, 48);
    const orbit = Math.floor(time * 6) % 28;
    rect(ctx, C.cyanSoft, center - 46 + orbit * 3, y + 27, 4, 4);
    rect(ctx, C.purple, center + 34 - orbit * 2, y + 65, 4, 4);
    rect(ctx, C.gold, center - 3, y + 43, 6, 6);
    return;
  }
  if (part === "facade") {
    stoneSteps(ctx, center, y + 138, w - 64, 4, "#5C7F8E");
    stoneFrame(ctx, x + 22, y + 70, w - 44, 72, "#658CA0", C.cyanStone);
    stoneCourses(ctx, x + 24, y + 72, w - 48, 66, "rgba(114,224,232,0.16)");
    for (const towerX of [x + 4, x + w - 50]) {
      stoneFrame(ctx, towerX, y + 54, 46, 88, "#658CA0", C.cyanStone);
      buttress(ctx, towerX - 4, y + 80, 62, C.cyanStone, "#658CA0");
      buttress(ctx, towerX + 38, y + 80, 62, C.cyanStone, "#658CA0");
      rect(ctx, C.stoneDark, towerX + 9, y + 42, 28, 17);
      rect(ctx, "#416C7D", towerX + 13, y + 37, 20, 19);
      rect(ctx, C.cyanSoft, towerX + 21, y + 26, 4, 25);
      rect(ctx, C.cyanSoft, towerX + 17, y + 35, 12, 4);
      archWindow(ctx, towerX + 23, y + 78, 14, 28, "#72D7E2", "#263D48");
    }
    stoneFrame(ctx, center - 54, y + 46, 108, 96, "#6D95A6", C.cyanStone);
    stoneCourses(ctx, center - 52, y + 48, 104, 90, "rgba(164,225,232,0.2)");
    archWindow(ctx, center - 31, y + 80, 14, 29, "#5CCBD7", "#263D48");
    archWindow(ctx, center + 31, y + 80, 14, 29, "#5CCBD7", "#263D48");
    rect(ctx, C.stoneDark, center - 18, y + 103, 36, 39);
    rect(ctx, C.stoneDark, center - 13, y + 97, 26, 8);
    rect(ctx, "#18272E", center - 12, y + 107, 24, 35);
    for (let rune = -42; rune <= 42; rune += 14) {
      rect(ctx, C.cyanLight, center + rune - 1, y + 71, 3, 3);
      rect(ctx, C.cyanLight, center + rune, y + 67, 1, 11);
    }
    banner(ctx, x + 58, y + 106, 14, 28, "#315E72", C.cyanSoft, Math.round(Math.sin(time * 2) * 1));
    banner(ctx, x + w - 72, y + 106, 14, 28, "#315E72", C.cyanSoft, -Math.round(Math.sin(time * 2) * 1));
    return;
  }
  if (part === "door_pillars") {
    for (const pillarX of [center - 25, center + 17]) {
      rect(ctx, C.stoneDark, pillarX, y + 92, 8, 52);
      rect(ctx, "#658CA0", pillarX + 2, y + 96, 3, 42);
    }
    return;
  }
  if (part === "astral_console") {
    const cx = center;
    const bottom = y + 188;
    const orbit = Math.floor(time * 7) % 28;
    groundShadow(ctx, cx - 36, bottom - 7, 72, 8);
    rect(ctx, C.stoneDark, cx - 35, bottom - 16, 70, 16);
    rect(ctx, C.stoneDark, cx - 30, bottom - 34, 60, 19);
    rect(ctx, "#365D6E", cx - 26, bottom - 30, 52, 12);
    rect(ctx, "#527F91", cx - 22, bottom - 28, 44, 3);
    for (let key = -18; key <= 18; key += 9) rect(ctx, C.cyanLight, cx + key, bottom - 24, 4, 3);
    rect(ctx, C.stoneDark, cx - 5, bottom - 62, 10, 30);
    ctx.strokeStyle = C.cyanLight;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 22, bottom - 79, 44, 29);
    ctx.strokeStyle = C.purple;
    ctx.strokeRect(cx - 15, bottom - 85, 30, 41);
    rect(ctx, C.gold, cx - 3, bottom - 70, 6, 6);
    rect(ctx, C.cyanSoft, cx - 20 + orbit, bottom - 77, 4, 4);
    rect(ctx, C.purple, cx + 16 - orbit, bottom - 52, 4, 4);
  }
}
