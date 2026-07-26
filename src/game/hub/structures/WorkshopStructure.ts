import type { WorldObjectDefinition } from "../../world/WorldMap";
import type { HubStructureDefinition } from "../HubStructure";
import {
  HUB_ART_COLORS as C,
  archWindow,
  artPartOf,
  banner,
  groundShadow,
  originOf,
  rect,
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
    { id: "forge_apron", artPart: "forge_apron", bounds: { x: -6, y: 150, width: 132, height: 34 }, layer: "back", collisionPolicy: "none" },
    { id: "facade", artPart: "facade", bounds: { x: 0, y: 36, width: 256, height: 124 }, layer: "sorted", sortY: 154 },
    { id: "smoke", artPart: "smoke", bounds: { x: 8, y: -18, width: 74, height: 58 }, layer: "upper", collisionPolicy: "none" },
    { id: "forge_embers", artPart: "forge_embers", bounds: { x: 10, y: 88, width: 78, height: 68 }, layer: "upper", collisionPolicy: "none" },
    { id: "enchanting_table_prop", artPart: "enchanting_table", bounds: { x: 164, y: 130, width: 58, height: 54 }, layer: "sorted", sortY: 184, visiblePropId: "enchanting_table", collisionPolicy: "custom" },
  ],
  occluders: [
    { id: "roof", artPart: "roof", bounds: { x: -8, y: 10, width: 272, height: 86 }, sortY: 100 },
    { id: "front_workbench", artPart: "blacksmith_workstation", bounds: { x: 72, y: 126, width: 72, height: 58 }, sortY: 184, visiblePropId: "blacksmith_workstation", collisionPolicy: "custom" },
    { id: "gantry", artPart: "gantry", bounds: { x: 176, y: 34, width: 78, height: 126 }, sortY: 156 },
  ],
  colliders: [
    { id: "rear_block", shape: "rect", x: 16, y: 72, width: 224, height: 28 },
    { id: "foundation_rear", shape: "rect", x: 8, y: 100, width: 240, height: 18 },
    { id: "furnace", shape: "rect", x: 4, y: 118, width: 66, height: 42 },
    { id: "front_center", shape: "rect", x: 104, y: 118, width: 72, height: 36 },
    { id: "annex", shape: "rect", x: 208, y: 118, width: 44, height: 42 },
    { id: "workbench", shape: "rect", x: 80, y: 152, width: 56, height: 20, visiblePropId: "blacksmith_workstation" },
    { id: "enchanting_table", shape: "rect", x: 172, y: 152, width: 42, height: 20, visiblePropId: "enchanting_table" },
  ],
  interactions: [
    {
      id: "blacksmith_forge",
      type: "interactable",
      action: "open_meta_upgrades",
      promptKey: "hub.blacksmith",
      promptAnchor: { x: 108, y: 148 },
      visiblePropId: "blacksmith_workstation",
      interaction: {
        zone: { shape: "rect", x: 68, y: 150, width: 80, height: 48 },
        // Aim LOS at the player-facing edge of the workstation collider. The
        // visible prop remains behind this point, but its own footprint no
        // longer invalidates a legitimate south-side interaction.
        lineOfSightTarget: { x: 108, y: 174 },
        requireLineOfSight: true,
      },
      properties: { tab: "body" },
    },
    {
      id: "enchanting_table",
      type: "interactable",
      action: "open_meta_upgrades",
      promptKey: "hub.enchanter",
      promptAnchor: { x: 194, y: 148 },
      visiblePropId: "enchanting_table",
      interaction: {
        zone: { shape: "rect", x: 156, y: 150, width: 76, height: 48 },
        lineOfSightTarget: { x: 194, y: 174 },
        requireLineOfSight: true,
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

// -- forge palette --------------------------------------------------------
const OUT = "#171210";
const TIMBER_DARK = "#3B2818";
const TIMBER = "#5C3E28";
const TIMBER_LIGHT = "#8A5E38";
const PLASTER = "#7C5C42";
const PLASTER_LIGHT = "#94714F";
const STONE_WARM = "#5E5348";
const STONE_WARM_DARK = "#463C32";
const STONE_WARM_LIGHT = "#7A6C5C";
const MORTAR = "#2E2620";
const IRON = "#272B33";
const IRON_LIGHT = "#4A5260";
const BRICK_A = "#8A4A33";
const BRICK_B = "#6E3A28";
const FIRE_DEEP = "#61180D";
const FIRE_RED = "#9E2B14";
const FIRE_HOT = "#C64B28";
const FIRE_ORANGE = "#F08A2E";
const FIRE_BRIGHT = "#FFC257";
const FIRE_CORE = "#FFF0BE";

/** Coursed stone with staggered joints and deterministic per-block tint. */
function blockCourses(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  base: string = STONE_WARM,
  light: string = STONE_WARM_LIGHT,
  dark: string = STONE_WARM_DARK,
  mortar: string = MORTAR,
): void {
  rect(ctx, base, x, y, width, height);
  const rowHeight = 9;
  for (let row = 0; row * rowHeight < height; row++) {
    const rowY = y + row * rowHeight;
    const rowH = Math.min(rowHeight, height - row * rowHeight);
    rect(ctx, mortar, x, rowY + rowH - 1, width, 1);
    const stagger = row % 2 === 0 ? 0 : 8;
    for (let joint = 16 - stagger; joint < width - 1; joint += 16) {
      rect(ctx, mortar, x + joint, rowY, 1, rowH - 1);
      const seed = (row * 5 + joint) % 48;
      if (seed < 8) rect(ctx, light, x + joint + 2, rowY + 1, 6, 2);
      else if (seed >= 32 && seed < 42) rect(ctx, dark, x + joint - 7, rowY + 2, 6, Math.max(1, rowH - 4));
    }
  }
}

/** Stepped gable with plank banding, 1px stepped outline, eave board and ridge cap. */
function shadedGable(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  base: string,
  dark: string,
  lit: string,
): void {
  const centre = x + width / 2;
  const rows = Math.max(4, Math.floor(height / 4));
  for (let row = 0; row < rows; row++) {
    const ratio = (row + 1) / rows;
    const rowW = Math.round(width * ratio);
    const rowY = y + row * 4;
    rect(ctx, OUT, centre - rowW / 2 - 1, rowY, rowW + 2, 6);
    rect(ctx, row % 3 === 2 ? dark : base, centre - rowW / 2, rowY, rowW, 5);
  }
  rect(ctx, OUT, x - 3, y + height - 1, width + 6, 6);
  rect(ctx, dark, x - 2, y + height, width + 4, 4);
  rect(ctx, lit, x - 2, y + height, width + 4, 1);
  rect(ctx, OUT, centre - 4, y - 3, 8, 4);
  rect(ctx, lit, centre - 3, y - 2, 6, 2);
}

function post(ctx: CanvasRenderingContext2D, x: number, y: number, height: number): void {
  rect(ctx, OUT, x - 1, y - 1, 7, height + 2);
  rect(ctx, TIMBER, x, y, 5, height);
  rect(ctx, TIMBER_LIGHT, x + 1, y, 1, height);
}

function beam(ctx: CanvasRenderingContext2D, x: number, y: number, width: number): void {
  rect(ctx, OUT, x - 1, y - 1, width + 2, 6);
  rect(ctx, TIMBER, x, y, width, 4);
  rect(ctx, TIMBER_LIGHT, x, y, width, 1);
}

function brace(ctx: CanvasRenderingContext2D, x: number, y: number, steps: number, dir: 1 | -1): void {
  for (let step = 0; step < steps; step++) {
    rect(ctx, OUT, x + step * 3 * dir - 1, y + step * 3, 6, 6);
    rect(ctx, TIMBER, x + step * 3 * dir, y + step * 3 + 1, 4, 4);
  }
}

export function drawWorkshopStructure(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
  const { x, y } = originOf(object);
  const part = artPartOf(object);
  const w = 256;
  const lift = [0, 1, 2, 1][Math.floor(time * 9) % 4];

  if (part === "shadow") {
    groundShadow(ctx, x + 2, y + 154, w - 4, 11);
    return;
  }

  if (part === "forge_apron") {
    // Warm furnace light spilling onto the courtyard flagstones (contrast to
    // the hub's cool palette). Soot rings and stray embers around the mouth.
    rect(ctx, "rgba(20,15,11,0.30)", x + 6, y + 158, 88, 10);
    rect(ctx, "rgba(20,15,11,0.16)", x + 12, y + 168, 78, 8);
    rect(ctx, `rgba(255,132,46,${0.36 + lift * 0.03})`, x + 16 - lift, y + 157, 48 + lift * 2, 7);
    rect(ctx, `rgba(255,148,64,${0.24 + lift * 0.02})`, x + 8 - lift, y + 164, 64 + lift * 2, 7);
    rect(ctx, "rgba(255,164,84,0.15)", x + 2, y + 171, 78, 7);
    rect(ctx, "rgba(255,214,140,0.30)", x + 28, y + 157, 24, 3);
    // Spill from the open workshop door (centered on the walkable pocket).
    rect(ctx, "rgba(255,160,80,0.26)", x + 78, y + 162, 20, 6);
    rect(ctx, "rgba(255,176,100,0.15)", x + 74, y + 168, 28, 8);
    // Fixed debris: cooled slag, coal bits, a couple of live embers.
    rect(ctx, "#241C15", x + 18, y + 172, 3, 2);
    rect(ctx, "#2E241C", x + 62, y + 175, 4, 2);
    rect(ctx, "#241C15", x + 96, y + 173, 3, 2);
    rect(ctx, C.orange, x + 28, y + 166, 1, 1);
    rect(ctx, "#9E2B14", x + 52, y + 170, 2, 1);
    rect(ctx, C.orange, x + 82, y + 161, 1, 1);
    return;
  }

  if (part === "smoke") {
    // Slow deterministic puff train drifting up-right from the chimney flue.
    for (let puff = 0; puff < 3; puff++) {
      const cycle = ((time / 7) + puff / 3) % 1;
      const puffX = x + 30 + Math.round(Math.sin(cycle * Math.PI * 2 + puff * 2.1) * 3 + cycle * 10);
      const puffY = y + 10 - Math.round(cycle * 26);
      const size = 6 + Math.round(cycle * 9);
      const fade = Math.max(0.1, 0.5 * (1 - cycle) + 0.08);
      rect(ctx, `rgba(126,120,112,${fade.toFixed(3)})`, puffX - size / 2, puffY - 2, size, Math.max(3, size - 3));
      rect(ctx, `rgba(152,146,138,${(fade * 0.7).toFixed(3)})`, puffX - size / 2 + 2, puffY - 4, size - 3, 3);
    }
    const emberCycle = (time / 2.8) % 1;
    if (emberCycle < 0.5) {
      rect(ctx, FIRE_ORANGE, x + 34 + Math.round(emberCycle * 10), y + 8 - Math.round(emberCycle * 30), 1, 1);
    }
    return;
  }

  if (part === "forge_embers") {
    // Sparks climbing off the coal bed in front of the furnace glow.
    for (let spark = 0; spark < 5; spark++) {
      const cycle = ((time / 2.8) + spark * 0.23) % 1;
      if (cycle < 0.05) continue;
      const sparkX = x + 22 + spark * 8 + Math.round(Math.sin(cycle * Math.PI * 4 + spark * 1.9) * 3);
      const sparkY = y + 146 - Math.round(cycle * 50);
      const color = cycle < 0.35 ? FIRE_CORE : cycle < 0.7 ? FIRE_BRIGHT : C.red;
      const size = cycle < 0.5 ? 2 : 1;
      rect(ctx, color, sparkX, sparkY, size, size);
    }
    return;
  }

  if (part === "roof") {
    // Main hall gable with plank banding, then the two lower wings in front.
    shadedGable(ctx, x + 38, y + 18, 214, 40, "#4F3524", "#33220F", TIMBER_LIGHT);
    // Iron stovepipe punching through the main roof.
    rect(ctx, OUT, x + 149, y + 23, 12, 25);
    rect(ctx, "#3A3E46", x + 150, y + 26, 10, 21);
    rect(ctx, IRON_LIGHT, x + 151, y + 26, 1, 21);
    rect(ctx, OUT, x + 147, y + 22, 16, 3);
    rect(ctx, IRON, x + 148, y + 23, 14, 2);
    // Furnace wing roof (warm) and enchanter annex roof (cool violet).
    shadedGable(ctx, x - 4, y + 44, 104, 30, "#3D2A20", "#2A1B12", C.orange);
    shadedGable(ctx, x + 160, y + 56, 98, 28, "#3F2F3C", "#241C2A", C.purple);
    // Great stone chimney over the furnace.
    rect(ctx, OUT, x + 17, y + 15, 32, 42);
    blockCourses(ctx, x + 18, y + 18, 30, 38, "#4A4038", "#6B5D4E", "#3A322A", "#28211B");
    rect(ctx, OUT, x + 14, y + 12, 38, 6);
    rect(ctx, "#595046", x + 15, y + 13, 36, 4);
    rect(ctx, STONE_WARM_LIGHT, x + 15, y + 13, 36, 1);
    rect(ctx, "#141210", x + 22, y + 10, 22, 3);
    const flueGlow = (time / 2.8) % 1 < 0.5;
    rect(ctx, flueGlow ? "rgba(240,138,46,0.85)" : "rgba(198,85,78,0.6)", x + 26 + (flueGlow ? 0 : 6), y + 11, 3, 1);
    return;
  }

  if (part === "facade") {
    const shim = Math.floor(time * 5) % 4;

    // ---- main hall: timber frame over a coursed stone base ----
    rect(ctx, OUT, x + 55, y + 55, 181, 103);
    rect(ctx, PLASTER, x + 57, y + 57, 177, 99);
    rect(ctx, PLASTER_LIGHT, x + 57, y + 57, 177, 2);
    rect(ctx, "rgba(58,42,28,0.20)", x + 120, y + 66, 30, 12);
    rect(ctx, "rgba(58,42,28,0.14)", x + 152, y + 74, 22, 8);
    blockCourses(ctx, x + 57, y + 120, 177, 37);
    rect(ctx, "#241C15", x + 57, y + 119, 177, 1);
    beam(ctx, x + 57, y + 58, 177);
    beam(ctx, x + 57, y + 90, 177);
    post(ctx, x + 58, y + 57, 63);
    post(ctx, x + 106, y + 57, 63);
    post(ctx, x + 143, y + 57, 63);
    post(ctx, x + 186, y + 57, 63);
    brace(ctx, x + 112, y + 66, 5, 1);
    brace(ctx, x + 139, y + 66, 5, -1);
    brace(ctx, x + 149, y + 66, 5, 1);
    brace(ctx, x + 178, y + 66, 5, -1);

    // Warm shuttered window between door and tool wall.
    archWindow(ctx, x + 132, y + 94, 14, 24, "#F5A54A", "#2A2018");
    rect(ctx, "rgba(255,160,70,0.18)", x + 126, y + 118, 13, 2);

    // Tool wall: peg rail with hung hammer and tongs silhouettes.
    rect(ctx, TIMBER_DARK, x + 147, y + 92, 17, 2);
    rect(ctx, TIMBER_DARK, x + 152, y + 95, 2, 13);
    rect(ctx, "#20242B", x + 149, y + 94, 8, 4);
    rect(ctx, "#20242B", x + 158, y + 95, 1, 12);
    rect(ctx, "#20242B", x + 161, y + 95, 1, 12);
    rect(ctx, "#20242B", x + 158, y + 101, 4, 1);

    // ---- enchanter annex: cooler stone, arcane windows ----
    rect(ctx, OUT, x + 163, y + 81, 90, 77);
    blockCourses(ctx, x + 165, y + 83, 86, 73, "#5B5352", "#787074", "#48413F", "#2B2732");
    archWindow(ctx, x + 188, y + 100, 15, 30, C.purple, "#241F2E");
    archWindow(ctx, x + 226, y + 100, 15, 30, C.cyanLight, "#241F2E");
    rect(ctx, "rgba(155,116,213,0.16)", x + 181, y + 130, 15, 4);
    rect(ctx, "rgba(114,224,232,0.14)", x + 219, y + 130, 15, 4);
    rect(ctx, OUT, x + 163, y + 147, 90, 1);
    rect(ctx, STONE_WARM_DARK, x + 165, y + 148, 86, 9);

    // ---- furnace wing: heavy soot-stained stone ----
    rect(ctx, OUT, x + 2, y + 71, 95, 87);
    blockCourses(ctx, x + 4, y + 73, 91, 83);
    rect(ctx, STONE_WARM_LIGHT, x + 4, y + 73, 2, 83);
    rect(ctx, "rgba(16,12,10,0.35)", x + 24, y + 74, 36, 12);
    rect(ctx, "rgba(16,12,10,0.30)", x + 16, y + 84, 52, 12);
    // Horseshoe nailed by the corner for luck.
    rect(ctx, "#3A3E46", x + 8, y + 78, 6, 2);
    rect(ctx, "#3A3E46", x + 8, y + 80, 2, 4);
    rect(ctx, "#3A3E46", x + 12, y + 80, 2, 4);

    // Brick arch around the furnace mouth.
    rect(ctx, OUT, x + 7, y + 92, 66, 1);
    rect(ctx, OUT, x + 7, y + 92, 1, 60);
    rect(ctx, OUT, x + 72, y + 92, 1, 60);
    for (let brick = 0; brick < 8; brick++) {
      rect(ctx, brick % 2 === 0 ? BRICK_A : BRICK_B, x + 8 + brick * 8, y + 93, 8, 8);
    }
    for (let course = 0; course < 6; course++) {
      rect(ctx, course % 2 === 0 ? BRICK_B : BRICK_A, x + 8, y + 101 + course * 8, 6, 8);
      rect(ctx, course % 2 === 0 ? BRICK_A : BRICK_B, x + 66, y + 101 + course * 8, 6, 8);
    }

    // Furnace interior: layered fire with ember flicker, coals, grate bars.
    rect(ctx, "#140B06", x + 14, y + 101, 52, 48);
    rect(ctx, FIRE_DEEP, x + 16, y + 112, 48, 36);
    rect(ctx, FIRE_RED, x + 18, y + 115, 44, 33);
    rect(ctx, FIRE_HOT, x + 20, y + 114 - lift, 40, 34 + lift);
    rect(ctx, FIRE_ORANGE, x + 24, y + 111 - lift, 32, 37 + lift);
    rect(ctx, FIRE_BRIGHT, x + 30, y + 109 - lift * 2, 20, 39 + lift * 2);
    rect(ctx, FIRE_CORE, x + 36, y + 116 - lift, 8, 28);
    if (lift > 0) {
      rect(ctx, FIRE_ORANGE, x + 22, y + 106 - lift, 4, 6);
      rect(ctx, FIRE_BRIGHT, x + 50, y + 104 - lift * 2, 3, 7);
    } else {
      rect(ctx, FIRE_ORANGE, x + 48, y + 107, 4, 5);
    }
    rect(ctx, "#FFD98A", x + 20, y + 141, 40, 1);
    for (let coal = 0; coal < 7; coal++) {
      rect(ctx, coal % 2 === 0 ? "#1C100A" : "#2B1810", x + 15 + coal * 7, y + 143, 7, 6);
    }
    rect(ctx, "#FF9E3D", x + 21 + lift * 14, y + 145, 1, 2);
    rect(ctx, "#FF9E3D", x + 56 - lift * 7, y + 146, 1, 2);
    for (const bar of [24, 39, 54]) rect(ctx, "#1B130C", x + bar, y + 109, 2, 40);
    // Hearth lip.
    rect(ctx, OUT, x + 8, y + 149, 64, 1);
    rect(ctx, "#6B5B4C", x + 6, y + 150, 68, 4);
    rect(ctx, "#8A7A66", x + 6, y + 150, 68, 1);

    // Heat shimmer rising off the arch.
    rect(ctx, "rgba(255,190,120,0.12)", x + 20 + (shim % 2) * 2, y + 88 - shim, 40, 2);
    rect(ctx, "rgba(255,190,120,0.08)", x + 26 - (shim % 2) * 2, y + 80 - shim, 30, 2);

    // Iron wall lantern hung from the mid rail, between door and window.
    const lanternPulse = Math.floor(time * 4) % 2;
    rect(ctx, "#20242B", x + 112, y + 95, 9, 2);
    rect(ctx, "#20242B", x + 116, y + 97, 1, 3);
    rect(ctx, `rgba(255,196,106,${lanternPulse === 0 ? 0.28 : 0.18})`, x + 112 - lanternPulse, y + 99 - lanternPulse, 9 + lanternPulse * 2, 11 + lanternPulse * 2);
    rect(ctx, OUT, x + 113, y + 100, 7, 9);
    rect(ctx, "#FFC46A", x + 114, y + 101, 5, 7);
    rect(ctx, FIRE_CORE, x + 116, y + 103, 2, 3);
    rect(ctx, "#20242B", x + 114, y + 99, 5, 1);

    // ---- open workshop door on the walkable pocket (centered x+88) ----
    rect(ctx, OUT, x + 73, y + 107, 30, 50);
    beam(ctx, x + 75, y + 110, 26);
    rect(ctx, TIMBER, x + 75, y + 115, 4, 42);
    rect(ctx, TIMBER_LIGHT, x + 76, y + 115, 1, 42);
    rect(ctx, TIMBER, x + 97, y + 115, 4, 42);
    rect(ctx, TIMBER_LIGHT, x + 98, y + 115, 1, 42);
    rect(ctx, "#1C1109", x + 79, y + 115, 18, 42);
    rect(ctx, "rgba(255,138,48,0.40)", x + 80, y + 124, 16, 33);
    rect(ctx, `rgba(255,176,80,${0.32 + lift * 0.05})`, x + 82, y + 132, 12, 25);
    rect(ctx, "rgba(255,214,130,0.34)", x + 84, y + 141, 8, 16);
    // Anvil silhouette inside, backlit by the forge.
    rect(ctx, "#0F0906", x + 82, y + 138, 10, 4);
    rect(ctx, "#0F0906", x + 91, y + 137, 3, 2);
    rect(ctx, "#0F0906", x + 84, y + 142, 6, 3);
    rect(ctx, "#0F0906", x + 82, y + 145, 10, 3);

    // Smithy sign banner above the door.
    banner(ctx, x + 81, y + 76, 14, 28, "#7D3E2C", C.fire, Math.round(Math.sin(time * 2) * 1));

    // Entry steps.
    stoneSteps(ctx, x + 88, y + 153, 30, 2, "#8A7A66");
    stoneSteps(ctx, x + 194, y + 153, 34, 2, "#8A7A66");
    return;
  }

  if (part === "gantry") {
    // Timber hoist in front of the annex: mast, jib, chain and ingot crate.
    const sway = Math.round(Math.sin(time * 1.7) * 1);
    rect(ctx, OUT, x + 243, y + 40, 9, 118);
    rect(ctx, TIMBER, x + 244, y + 41, 7, 116);
    rect(ctx, TIMBER_LIGHT, x + 245, y + 41, 1, 116);
    rect(ctx, OUT, x + 240, y + 150, 15, 8);
    rect(ctx, STONE_WARM, x + 241, y + 151, 13, 6);
    rect(ctx, OUT, x + 198, y + 41, 48, 7);
    rect(ctx, TIMBER, x + 199, y + 42, 46, 5);
    rect(ctx, TIMBER_LIGHT, x + 199, y + 42, 46, 1);
    for (let strut = 0; strut < 6; strut++) {
      rect(ctx, TIMBER_DARK, x + 240 - strut * 5, y + 62 - strut * 3, 6, 4);
    }
    rect(ctx, OUT, x + 199, y + 48, 6, 6);
    rect(ctx, IRON_LIGHT, x + 200, y + 49, 4, 4);
    // Crate of billets hoisted high, clear of the enchanter's table below.
    const chainX = x + 202 + sway;
    for (let link = y + 54; link < y + 62; link += 4) rect(ctx, IRON, chainX, link, 1, 3);
    rect(ctx, IRON, chainX - 1, y + 62, 3, 4);
    rect(ctx, C.stoneLight, chainX - 4, y + 64, 9, 3);
    rect(ctx, "#5A6472", chainX - 2, y + 63, 5, 1);
    rect(ctx, OUT, chainX - 7, y + 66, 15, 13);
    rect(ctx, TIMBER, chainX - 6, y + 67, 13, 11);
    rect(ctx, TIMBER_LIGHT, chainX - 6, y + 67, 13, 2);
    return;
  }

  if (part === "blacksmith_workstation") {
    const cx = x + 108;
    const bottom = y + 184;
    groundShadow(ctx, cx - 36, bottom - 8, 74, 8);
    // Quench barrel with animated water glint.
    rect(ctx, OUT, cx - 37, bottom - 27, 15, 19);
    rect(ctx, "#4E3B2A", cx - 36, bottom - 26, 13, 17);
    rect(ctx, "#3B2C1E", cx - 36, bottom - 26, 2, 17);
    rect(ctx, IRON, cx - 36, bottom - 22, 13, 1);
    rect(ctx, IRON, cx - 36, bottom - 13, 13, 1);
    rect(ctx, C.waterDark, cx - 34, bottom - 25, 9, 2);
    if (Math.floor(time * 2) % 2 === 0) rect(ctx, C.cyanSoft, cx - 32, bottom - 25, 2, 1);
    // Workbench with hammer and billet stock.
    rect(ctx, OUT, cx - 21, bottom - 44, 38, 6);
    rect(ctx, "#6B4A30", cx - 20, bottom - 43, 36, 4);
    rect(ctx, C.woodLight, cx - 20, bottom - 43, 36, 1);
    rect(ctx, TIMBER_DARK, cx - 17, bottom - 38, 4, 24);
    rect(ctx, TIMBER_DARK, cx + 10, bottom - 38, 4, 24);
    rect(ctx, TIMBER_DARK, cx - 15, bottom - 22, 26, 2);
    rect(ctx, TIMBER_DARK, cx - 14, bottom - 47, 9, 2);
    rect(ctx, "#20242B", cx - 6, bottom - 48, 4, 4);
    rect(ctx, C.stoneLight, cx + 2, bottom - 52, 2, 9);
    rect(ctx, "#5A6472", cx + 5, bottom - 50, 2, 7);
    // Anvil on an oak stump, working a glowing billet.
    rect(ctx, OUT, cx + 19, bottom - 34, 18, 15);
    rect(ctx, "#4E3B2A", cx + 20, bottom - 33, 16, 13);
    rect(ctx, "#3B2C1E", cx + 20, bottom - 29, 16, 1);
    rect(ctx, OUT, cx + 22, bottom - 39, 12, 5);
    rect(ctx, IRON, cx + 23, bottom - 38, 10, 3);
    rect(ctx, IRON, cx + 25, bottom - 42, 6, 4);
    rect(ctx, OUT, cx + 15, bottom - 48, 21, 7);
    rect(ctx, IRON, cx + 16, bottom - 47, 19, 5);
    rect(ctx, IRON, cx + 35, bottom - 46, 3, 3);
    rect(ctx, IRON_LIGHT, cx + 16, bottom - 47, 18, 1);
    rect(ctx, FIRE_ORANGE, cx + 19, bottom - 49, 8, 2);
    rect(ctx, lift < 2 ? FIRE_BRIGHT : FIRE_CORE, cx + 21, bottom - 49, 4, 1);
    if (lift === 1) rect(ctx, FIRE_BRIGHT, cx + 26, bottom - 52, 1, 1);
    if (lift === 2) rect(ctx, FIRE_ORANGE, cx + 23, bottom - 53, 1, 1);
    return;
  }

  if (part === "enchanting_table") {
    const cx = x + 194;
    const bottom = y + 184;
    const hover = Math.round(Math.sin(time * 3) * 2);
    groundShadow(ctx, cx - 28, bottom - 7, 56, 7);
    rect(ctx, C.stoneDark, cx - 26, bottom - 28, 52, 17);
    rect(ctx, C.archive, cx - 22, bottom - 24, 44, 10);
    rect(ctx, OUT, cx - 30, bottom - 38, 60, 2);
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
