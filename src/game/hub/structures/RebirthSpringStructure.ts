import type { WorldObjectDefinition } from "../../world/WorldMap";
import type { HubStructureDefinition } from "../HubStructure";
import { artPartOf, originOf, rect } from "./HubArtPrimitives";

export const REBIRTH_SPRING_STRUCTURE: HubStructureDefinition = {
  id: "rebirth_spring",
  artModule: "rebirth_spring",
  origin: { x: 576, y: 432 },
  visualBounds: { x: -20, y: -18, width: 184, height: 132 },
  rearAccessRule: "roof-occluder",
  visualParts: [
    { id: "court", artPart: "court", bounds: { x: -20, y: 0, width: 184, height: 100 }, layer: "back" },
    { id: "basin", artPart: "basin", bounds: { x: 4, y: 14, width: 136, height: 84 }, layer: "sorted", sortY: 80, visiblePropId: "rebirth_spring_visual", collisionPolicy: "custom" },
    { id: "soul_motes", artPart: "soul_motes", bounds: { x: 34, y: -18, width: 76, height: 74 }, layer: "upper", collisionPolicy: "none" },
  ],
  occluders: [
    { id: "crystal", artPart: "crystal", bounds: { x: 46, y: 10, width: 52, height: 72 }, sortY: 81 },
    { id: "front_rim", artPart: "front_rim", bounds: { x: 12, y: 66, width: 120, height: 24 }, sortY: 82 },
    { id: "lantern_pylons", artPart: "lantern_pylons", bounds: { x: -12, y: 4, width: 168, height: 94 }, sortY: 96 },
  ],
  colliders: [
    { id: "water_surface", shape: "rect", x: 22, y: 38, width: 100, height: 26, visiblePropId: "rebirth_spring_visual" },
    { id: "rim_north", shape: "rect", x: 22, y: 30, width: 100, height: 8, visiblePropId: "rebirth_spring_visual" },
    { id: "rim_west", shape: "rect", x: 12, y: 38, width: 10, height: 36, visiblePropId: "rebirth_spring_visual" },
    { id: "rim_east", shape: "rect", x: 122, y: 38, width: 10, height: 36, visiblePropId: "rebirth_spring_visual" },
    { id: "rim_south_west", shape: "rect", x: 22, y: 72, width: 42, height: 8, visiblePropId: "rebirth_spring_visual" },
    { id: "rim_south_east", shape: "rect", x: 80, y: 72, width: 42, height: 8, visiblePropId: "rebirth_spring_visual" },
    { id: "corner_nw", shape: "circle", x: 22, y: 38, radius: 8, visiblePropId: "rebirth_spring_visual" },
    { id: "corner_ne", shape: "circle", x: 122, y: 38, radius: 8, visiblePropId: "rebirth_spring_visual" },
    { id: "corner_sw", shape: "circle", x: 22, y: 72, radius: 8, visiblePropId: "rebirth_spring_visual" },
    { id: "corner_se", shape: "circle", x: 122, y: 72, radius: 8, visiblePropId: "rebirth_spring_visual" },
    { id: "lantern_nw", shape: "circle", x: 0, y: 26, radius: 6, visiblePropId: "rebirth_spring_visual" },
    { id: "lantern_ne", shape: "circle", x: 144, y: 26, radius: 6, visiblePropId: "rebirth_spring_visual" },
    { id: "lantern_sw", shape: "circle", x: -4, y: 76, radius: 6, visiblePropId: "rebirth_spring_visual" },
    { id: "lantern_se", shape: "circle", x: 148, y: 76, radius: 6, visiblePropId: "rebirth_spring_visual" },
  ],
  interactions: [
    {
      id: "rebirth_spring",
      type: "interactable",
      action: "open_rebirth_spring",
      promptKey: "hub.rebirthSpring",
      promptAnchor: { x: 72, y: 78 },
      visiblePropId: "rebirth_spring_visual",
      interaction: {
        zone: { shape: "rect", x: 44, y: 80, width: 56, height: 44 },
        lineOfSightTarget: { x: 72, y: 82 },
        requireLineOfSight: true,
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

// ---------------------------------------------------------------------------
// Sacred spring painter. All coordinates are centered on the water axis:
// world (origin + 72, origin + 52). Colliders in this file share the same
// centered frame offset by (-72, -52), so art and physics stay aligned:
//   water   x -50..50, y -14..12      rims   8-10px bands around the water
//   corners r8 at (+-50,-14)/(+-50,20) stairs y 30..42, opening |x| <= 8
//   pylons  (-72,-26) (72,-26) (-76,24) (76,24)
// Animation is strictly a function of `time` (seconds) - no per-frame RNG.
// ---------------------------------------------------------------------------

const TAU = Math.PI * 2;

const C = {
  outline: "#141922",
  stoneDeep: "#2A313C",
  stoneDark: "#38404C",
  stone: "#4E5764",
  stoneMid: "#5C6673",
  stoneLight: "#6E7985",
  stoneEdge: "#7B8792",
  paveDark: "#424A56",
  pave: "#4E5763",
  paveLight: "#5A6472",
  goldDark: "#6B5526",
  gold: "#D8B45C",
  goldLight: "#F1DA9C",
  waterDeep: "#16404F",
  waterDark: "#1B4B5A",
  water: "#256F83",
  waterMid: "#2F8B9C",
  waterBody: "#3FA9B8",
  waterLight: "#72E0E8",
  waterGlow: "#B7FAF5",
  white: "#ECFFFE",
  crystalOutline: "#123138",
  crystalDark: "#3E93A4",
  crystal: "#72E0E8",
  crystalLight: "#B7FAF5",
  moss: "#4E6B4A",
  mossDark: "#3A5239",
  runeBase: "#2B323E",
  rune: "#4E8A94",
} as const;

/** Rounded-rect approximation: cross of two rects plus a mid-step inset. */
function oct(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, width: number, height: number, corner: number): void {
  rect(ctx, color, x + corner, y, width - corner * 2, height);
  rect(ctx, color, x, y + corner, width, height - corner * 2);
  const step = Math.max(1, Math.round(corner * 0.45));
  rect(ctx, color, x + step, y + step, width - step * 2, height - step * 2);
}

function glowRgba(alpha: number): string {
  return `rgba(114,224,232,${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}

function brightRgba(alpha: number): string {
  return `rgba(183,250,245,${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}

/** True when a centered point sits on the visible water surface. */
function isOnWater(x: number, y: number): boolean {
  if (y < -14 || y > 12) return false;
  const ax = Math.abs(x);
  if (ax > 47) return false;
  if (ax > 40 && (y < -10 || y > 8)) return false;
  return true;
}

function drawMossClump(ctx: CanvasRenderingContext2D, x: number, y: number, flip = false): void {
  rect(ctx, C.mossDark, x, y, 4, 2);
  rect(ctx, C.moss, x + (flip ? 2 : 0), y - 1, 3, 2);
  rect(ctx, C.moss, x + (flip ? -1 : 3), y + 1, 2, 1);
}

// --- court -----------------------------------------------------------------

function drawCourt(ctx: CanvasRenderingContext2D, time: number): void {
  // Soft cast shadow where the raised court meets the plaza.
  rect(ctx, "rgba(5,8,11,0.28)", -82, 46, 164, 3);
  rect(ctx, "rgba(5,8,11,0.16)", -72, 49, 144, 2);

  // Chamfered court slab: dark outline, worn cool paving, inlaid border band.
  oct(ctx, C.outline, -90, -50, 180, 97, 12);
  oct(ctx, C.paveDark, -89, -49, 178, 95, 11);
  oct(ctx, C.paveLight, -87, -47, 174, 91, 10);
  oct(ctx, C.pave, -85, -45, 170, 87, 9);
  // Key light along the north and west outer edges.
  rect(ctx, C.stoneLight, -76, -48, 152, 1);
  rect(ctx, "rgba(110,121,133,0.55)", -87, -34, 1, 62);

  // Tonal variation: a few lighter / darker flags break up the field.
  const lightFlags: Array<[number, number]> = [[-82, -36], [46, -36], [-46, -22], [64, 6], [-82, 20], [28, 34]];
  for (const [x, y] of lightFlags) rect(ctx, "rgba(122,133,145,0.10)", x, y, 36, 13);
  const darkFlags: Array<[number, number]> = [[-46, -36], [10, -22], [-82, 6], [46, 20], [-28, 34]];
  for (const [x, y] of darkFlags) rect(ctx, "rgba(16,20,27,0.10)", x, y, 36, 13);

  // Flagstone joints - staggered courses kept faint so the court reads flat.
  for (let row = 0; row < 6; row++) {
    const y = -36 + row * 14;
    rect(ctx, "rgba(16,20,27,0.32)", -82, y, 164, 1);
    rect(ctx, "rgba(122,133,145,0.14)", -82, y + 1, 164, 1);
    const stagger = row % 2 === 0 ? -70 : -52;
    for (let x = stagger; x < 82; x += 36) rect(ctx, "rgba(16,20,27,0.24)", x, y - 9, 1, 9);
  }

  // Cool spring light washing the paving around the basin, warm pools by the pylons.
  oct(ctx, "rgba(114,224,232,0.045)", -74, -36, 148, 74, 12);
  oct(ctx, "rgba(114,224,232,0.05)", -68, -32, 136, 66, 10);
  rect(ctx, "rgba(216,180,92,0.10)", -80, -32, 16, 7);
  rect(ctx, "rgba(216,180,92,0.10)", 64, -32, 16, 7);
  rect(ctx, "rgba(216,180,92,0.09)", -84, 18, 16, 7);
  rect(ctx, "rgba(216,180,92,0.09)", 68, 18, 16, 7);

  // Worn highlights and dark chips.
  const wearLight: Array<[number, number]> = [[-79, -41], [-30, -44], [55, -40], [80, -12], [-83, 8], [70, 33], [-49, 40], [24, 44]];
  for (const [x, y] of wearLight) rect(ctx, "rgba(123,135,146,0.30)", x, y, 3, 1);
  const wearDark: Array<[number, number]> = [[-64, -38], [40, -43], [83, 20], [-77, 26], [-16, 43], [58, 42], [76, -34]];
  for (const [x, y] of wearDark) rect(ctx, "rgba(12,16,22,0.30)", x, y, 2, 1);

  // Hairline cracks.
  rect(ctx, "rgba(14,18,24,0.40)", -72, 12, 5, 1);
  rect(ctx, "rgba(14,18,24,0.40)", -68, 13, 1, 4);
  rect(ctx, "rgba(14,18,24,0.40)", -68, 17, 6, 1);
  rect(ctx, "rgba(14,18,24,0.40)", 66, 36, 6, 1);
  rect(ctx, "rgba(14,18,24,0.40)", 71, 32, 1, 4);
  rect(ctx, "rgba(14,18,24,0.40)", 72, 31, 5, 1);

  // Inlaid mosaic ring around the basin with eight breathing rune medallions.
  for (let i = 0; i < 44; i++) {
    const angle = (i / 44) * TAU;
    const x = Math.cos(angle) * 78;
    const y = 1 + Math.sin(angle) * 42;
    rect(ctx, "rgba(78,138,148,0.45)", x - 1, y, 2, 1);
  }
  for (let i = 0; i < 44; i += 2) {
    const angle = (i / 44) * TAU + 0.07;
    const x = Math.cos(angle) * 72;
    const y = 1 + Math.sin(angle) * 38;
    rect(ctx, "rgba(114,224,232,0.16)", x, y, 1, 1);
  }
  for (let k = 0; k < 8; k++) {
    if (k === 2) continue; // south-center medallion would sit under the stairs
    const angle = (k / 8) * TAU;
    const x = Math.round(Math.cos(angle) * 78);
    const y = Math.round(1 + Math.sin(angle) * 42);
    // Rounded medallion: outline cross, carved base, inlaid glyph.
    rect(ctx, C.outline, x - 3, y - 2, 7, 5);
    rect(ctx, C.outline, x - 2, y - 3, 5, 7);
    rect(ctx, C.runeBase, x - 2, y - 2, 5, 5);
    rect(ctx, C.rune, x, y - 2, 1, 5);
    rect(ctx, C.rune, x - 2, y, 5, 1);
    const breath = 0.10 + 0.22 * (0.5 + 0.5 * Math.sin(time * TAU / 4.2 + k * 0.8));
    rect(ctx, glowRgba(breath), x - 2, y - 2, 5, 5);
  }

  // Engraved votive floor plaques on the empty north corners.
  for (const side of [-1, 1]) {
    const x = side * 52;
    rect(ctx, C.outline, x - 4, -41, 9, 8);
    rect(ctx, C.paveLight, x - 3, -40, 7, 6);
    rect(ctx, "rgba(16,20,27,0.35)", x - 3, -37, 7, 1);
    rect(ctx, C.rune, x - 1, -39, 3, 1);
    rect(ctx, C.rune, x, -40, 1, 5);
    const breath = 0.08 + 0.16 * (0.5 + 0.5 * Math.sin(time * TAU / 4.2 + 2.2 + side));
    rect(ctx, glowRgba(breath), x - 3, -40, 7, 6);
  }

  // Moss creeping over the paving.
  drawMossClump(ctx, -83, 31);
  drawMossClump(ctx, 63, -43, true);
  drawMossClump(ctx, 78, 34);
  drawMossClump(ctx, -57, -46, true);

  // Entrance stairs descending south from the rim opening (y 30..42 walkable).
  const stairs: Array<{ y: number; half: number }> = [
    { y: 30, half: 24 },
    { y: 34, half: 20 },
    { y: 38, half: 17 },
  ];
  for (const stair of stairs) {
    rect(ctx, C.outline, -stair.half - 1, stair.y, stair.half * 2 + 2, 5);
    rect(ctx, C.stoneMid, -stair.half, stair.y, stair.half * 2, 4);
    rect(ctx, C.stoneEdge, -stair.half + 1, stair.y, stair.half * 2 - 2, 1);
    rect(ctx, C.stoneDeep, -stair.half, stair.y + 3, stair.half * 2, 1);
  }
  rect(ctx, C.outline, -14, 42, 28, 2);
  // Cool spring light spilling down the top treads.
  rect(ctx, glowRgba(0.14), -9, 30, 18, 2);
  rect(ctx, glowRgba(0.08), -7, 34, 14, 1);
}

// --- shared rim pieces -----------------------------------------------------

function drawRimRunes(ctx: CanvasRenderingContext2D, time: number): void {
  const runes: Array<[number, number, number]> = [[-40, -23, 0], [-14, -23, 1], [14, -23, 2], [40, -23, 3]];
  for (const [x, y, k] of runes) {
    rect(ctx, C.stoneDeep, x - 2, y, 5, 4);
    rect(ctx, C.rune, x - 1, y + 1, 3, 1);
    rect(ctx, C.rune, x, y, 1, 4);
    const breath = 0.14 + 0.26 * (0.5 + 0.5 * Math.sin(time * TAU / 4.2 + 1.1 + k * 1.3));
    rect(ctx, glowRgba(breath), x - 2, y, 5, 4);
  }
}

function drawSouthRim(ctx: CanvasRenderingContext2D, time: number): void {
  // Two rim segments flanking the landing opening (|x| <= 8 stays open).
  for (const side of [-1, 1]) {
    const inner = side * 9;
    const outer = side * 62;
    const left = Math.min(inner, outer);
    const width = Math.abs(outer - inner);
    rect(ctx, C.outline, left, 13, width, 17);
    // Waterside lip, walkable-looking top, then the lit south face.
    rect(ctx, C.stone, left + (side < 0 ? 1 : 0), 14, width - 1, 3);
    rect(ctx, C.stoneMid, left + (side < 0 ? 1 : 0), 17, width - 1, 8);
    rect(ctx, C.stoneEdge, left + (side < 0 ? 2 : 0), 17, width - 2, 1);
    rect(ctx, C.stoneDark, left + (side < 0 ? 2 : 1), 25, width - 3, 4);
    rect(ctx, "rgba(12,16,22,0.35)", left + (side < 0 ? 2 : 1), 28, width - 3, 1);
    // Rounded outer corner chamfer.
    rect(ctx, C.pave, side * 58, 27, 5, 3);
    rect(ctx, C.pave, side * 60, 24, 3, 5);
    // Carved joint lines on the face.
    rect(ctx, "rgba(12,16,22,0.35)", side * 30, 25, 1, 4);
    rect(ctx, "rgba(12,16,22,0.35)", side * 46, 25, 1, 4);
  }
  // Gold corner studs where the rim turns.
  for (const side of [-1, 1]) {
    rect(ctx, C.goldDark, side * 52 - 1, 18, 3, 3);
    rect(ctx, C.gold, side * 52 - 1, 18, 2, 2);
  }
  // Landing jamb posts: flared bases rooted on the landing, gold collars,
  // pulsing finial gems framing the opening.
  for (const side of [-1, 1]) {
    const x = side * 12;
    // Flared base plate.
    rect(ctx, C.outline, x - 4, 24, 9, 6);
    rect(ctx, C.stone, x - 3, 25, 7, 4);
    rect(ctx, C.stoneLight, x - 3, 25, 7, 1);
    // Shaft.
    rect(ctx, C.outline, x - 3, 8, 7, 18);
    rect(ctx, C.stone, x - 2, 9, 5, 16);
    rect(ctx, C.stoneLight, x - 2, 9, 1, 15);
    rect(ctx, C.stoneDark, x + 2, 10, 1, 14);
    // Gold collar.
    rect(ctx, C.goldDark, x - 3, 12, 7, 2);
    rect(ctx, C.gold, x - 3, 12, 6, 1);
    // Finial gem: a small pointed shard crowning the post.
    const gem = 0.35 + 0.30 * (0.5 + 0.5 * Math.sin(time * TAU / 2.6 + (side < 0 ? 0.4 : 1.9)));
    rect(ctx, glowRgba(0.10 + 0.14 * gem), x - 4, 0, 9, 11);
    drawCrystalShard(ctx, x, 5, 2.5, 5);
    rect(ctx, brightRgba(gem), x - 1, 3, 2, 2);
  }
  // Landing floor between the posts, kissed by spring light.
  rect(ctx, C.outline, -9, 13, 18, 1);
  rect(ctx, C.paveLight, -8, 14, 16, 14);
  rect(ctx, "rgba(16,20,27,0.30)", -8, 21, 16, 1);
  rect(ctx, glowRgba(0.30), -8, 14, 16, 1);
  rect(ctx, glowRgba(0.10), -7, 15, 14, 4);
  drawMossClump(ctx, -57, 27);
  drawMossClump(ctx, 48, 28, true);
}

// --- basin -----------------------------------------------------------------

function drawBasin(ctx: CanvasRenderingContext2D, time: number): void {
  // Contact shadow.
  oct(ctx, "rgba(6,10,14,0.30)", -63, -24, 128, 58, 10);
  rect(ctx, "rgba(6,10,14,0.20)", -54, 31, 108, 3);

  // Carved ring: outline, wall stone, twin-tone rim top.
  oct(ctx, C.outline, -62, -27, 124, 58, 10);
  oct(ctx, C.stoneDark, -61, -26, 122, 56, 10);
  oct(ctx, "#66707C", -59, -24, 118, 50, 9);
  oct(ctx, C.stone, -54, -20, 108, 42, 7);

  // Two-level lighting: sky-lit north/west edges, shaded inner slope.
  rect(ctx, C.stoneEdge, -46, -25, 92, 1);
  rect(ctx, C.stoneEdge, -58, -12, 1, 24);
  rect(ctx, "rgba(123,135,146,0.45)", 57, -12, 1, 24);
  rect(ctx, "rgba(12,16,22,0.28)", -50, -18, 100, 1);

  // Gold inlay tracing the north rim.
  rect(ctx, C.goldDark, -44, -20, 88, 1);
  for (let x = -42; x <= 40; x += 7) rect(ctx, C.gold, x, -20, 3, 1);
  for (const side of [-1, 1]) {
    rect(ctx, C.goldDark, side * 52 - 1, -21, 3, 3);
    rect(ctx, C.gold, side * 52 - 1, -21, 2, 2);
  }

  drawRimRunes(ctx, time);

  // Twin carved spouts feeding the pool from the north rim.
  for (const side of [-1, 1]) {
    const x = side * 26;
    rect(ctx, C.outline, x - 4, -26, 8, 9);
    rect(ctx, C.stone, x - 3, -25, 6, 7);
    rect(ctx, C.stoneLight, x - 3, -25, 6, 1);
    rect(ctx, C.gold, x - 2, -24, 4, 1);
    rect(ctx, "#10161D", x - 2, -22, 4, 3);
    // Falling water thread with a travelling bright bead.
    rect(ctx, glowRgba(0.55), x - 1, -19, 1, 5);
    const bead = -19 + Math.floor(((time * 7 + (side < 0 ? 0 : 2.5)) % 5));
    rect(ctx, C.white, x - 1, bead, 1, 1);
    const splash = 0.30 + 0.25 * Math.sin(time * TAU / 0.9 + (side < 0 ? 0 : 1.4));
    rect(ctx, brightRgba(splash), x - 2, -14, 4, 1);
  }

  // Water: layered depth falling toward a luminous heart.
  oct(ctx, "#0F151C", -52, -19, 104, 36, 8);
  oct(ctx, C.waterDeep, -51, -18, 102, 34, 8);
  oct(ctx, C.waterDark, -49, -17, 98, 31, 7);
  oct(ctx, C.water, -45, -14, 90, 26, 6);
  oct(ctx, C.waterMid, -38, -11, 76, 19, 5);
  oct(ctx, C.waterBody, -28, -8, 56, 12, 4);
  // Rim shadow falling on the north water edge, sunlit waterline hugging the lip.
  rect(ctx, "rgba(5,16,22,0.50)", -46, -17, 92, 2);
  rect(ctx, "rgba(216,255,252,0.50)", -40, 12, 80, 1);
  rect(ctx, brightRgba(0.28), -47, -8, 1, 16);
  rect(ctx, brightRgba(0.28), 46, -8, 1, 16);
  // Breathing luminosity in the pool's heart.
  const heartGlow = 0.05 + 0.06 * (0.5 + 0.5 * Math.sin(time * TAU / 2.8));
  oct(ctx, brightRgba(heartGlow), -24, -7, 48, 10, 3);

  // Slow shimmer: two drifting light bands plus pulsing still sparkles.
  const drift1 = Math.sin(time * TAU / 5.6) * 9;
  const drift2 = Math.sin(time * TAU / 5.6 + 2.7) * 7;
  rect(ctx, glowRgba(0.20), -28 + drift1, -4, 30, 2);
  rect(ctx, glowRgba(0.15), 2 + drift2, 5, 26, 2);
  const sparkles: Array<[number, number]> = [[-34, -7], [28, -9], [-12, 7], [38, 3], [-42, 1], [14, -1]];
  for (let i = 0; i < sparkles.length; i++) {
    const alpha = 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(time * TAU / 2.2 + i * 1.7));
    rect(ctx, `rgba(233,255,253,${alpha.toFixed(3)})`, sparkles[i][0], sparkles[i][1], 1, 1);
  }

  drawSouthRim(ctx, time);

  // Weathering on the outer stone.
  drawMossClump(ctx, -59, 22);
  drawMossClump(ctx, 53, -24, true);
  rect(ctx, "rgba(12,16,22,0.30)", -34, 27, 3, 1);
  rect(ctx, "rgba(123,135,146,0.35)", 20, 16, 4, 1);
}

// --- crystal ---------------------------------------------------------------

function shardRowWidth(row: number, halfWidth: number, halfHeight: number): number {
  // Elongated hexagon: sharp 1px tips, flat mid section - reads as a cut shard.
  const t = 1 - Math.abs(row + 0.5) / halfHeight;
  return Math.max(1, Math.round(halfWidth * 2 * Math.min(1, t * 1.8)));
}

function drawCrystalShard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  halfWidth: number,
  halfHeight: number,
): void {
  // Outline pass: silhouette expanded by 1px on every side; the rows above and
  // below the shape only carry the 1px tip so points stay sharp.
  for (let row = -halfHeight - 1; row < halfHeight + 1; row++) {
    const outside = row < -halfHeight || row >= halfHeight;
    const w = outside ? 1 : shardRowWidth(row, halfWidth, halfHeight) + 2;
    rect(ctx, C.crystalOutline, x - Math.floor(w / 2), y + row, w, 1);
  }
  // Facet pass: bright left plane, mid body, shaded right plane.
  for (let row = -halfHeight; row < halfHeight; row++) {
    const w = shardRowWidth(row, halfWidth, halfHeight);
    const left = x - Math.floor(w / 2);
    rect(ctx, C.crystal, left, y + row, w, 1);
    if (w > 3) rect(ctx, C.crystalLight, left, y + row, Math.max(1, Math.round(w * 0.36)), 1);
    if (w > 5) rect(ctx, C.crystalDark, left + w - Math.max(1, Math.round(w * 0.27)), y + row, Math.max(1, Math.round(w * 0.27)), 1);
  }
  // Inner core slit and a single glint.
  rect(ctx, C.white, x, y - halfHeight + 3, 1, Math.max(1, halfHeight * 2 - 7));
  if (halfWidth > 3) rect(ctx, C.white, x + 2, y - Math.round(halfHeight * 0.3), 1, 2);
}

function drawCrystal(ctx: CanvasRenderingContext2D, time: number): void {
  const pulse = 0.5 + 0.5 * Math.sin(time * TAU / 1.8 + 0.4);
  const bob = Math.round(Math.sin(time * TAU / 3.4) * 2);
  const heart = -33 + bob;

  // Touchdown glow where the light meets the pool.
  oct(ctx, glowRgba(0.10 + 0.10 * pulse), -14, -9, 28, 12, 4);
  oct(ctx, brightRgba(0.08 + 0.10 * pulse), -8, -7, 16, 8, 3);

  // Concentric ripples breathing out from beneath the crystal: dense dashed
  // ellipses so each ring reads as a wavefront, not scattered sparks.
  for (let ring = 0; ring < 3; ring++) {
    const progress = ((time / 2.8) + ring / 3) % 1;
    const radius = 5 + progress * 40;
    const alpha = 0.05 + 0.38 * (1 - progress);
    const color = brightRgba(alpha);
    for (let i = 0; i < 44; i++) {
      const angle = (i / 44) * TAU;
      const px = Math.cos(angle) * radius;
      const py = -2 + Math.sin(angle) * radius * 0.42;
      if (isOnWater(px, py)) rect(ctx, color, px - 1, py, 2, 1);
    }
  }

  // Wobbling reflection column in the water.
  const wobble = Math.round(Math.sin(time * TAU / 5.6) * 1);
  rect(ctx, glowRgba(0.20), -3 + wobble, -13, 6, 21);
  rect(ctx, brightRgba(0.26), -1 + wobble, -11, 2, 17);
  rect(ctx, "rgba(233,255,253,0.35)", -2 + wobble, 9, 4, 1);

  // Light beam linking shard and spring.
  rect(ctx, glowRgba(0.08 + 0.07 * pulse), -4, -30 + bob, 8, 16 - bob);
  rect(ctx, brightRgba(0.10 + 0.08 * pulse), -1, -30 + bob, 2, 16 - bob);

  // A luminous droplet falls on the ripple clock.
  const dropPhase = (time / 2.8) % 1;
  if (dropPhase < 0.32) {
    const dy = -26 + (dropPhase / 0.32) * 12;
    rect(ctx, C.white, -1, dy, 1, 2);
  } else if (dropPhase < 0.44) {
    const fade = 1 - (dropPhase - 0.32) / 0.12;
    rect(ctx, brightRgba(0.5 * fade), -3, -13, 2, 1);
    rect(ctx, brightRgba(0.5 * fade), 1, -13, 2, 1);
  }

  // Pulsing halo behind the shard.
  oct(ctx, glowRgba(0.07 + 0.07 * pulse), -17, heart - 16, 34, 32, 8);
  oct(ctx, brightRgba(0.08 + 0.09 * pulse), -11, heart - 12, 22, 24, 5);

  // Twin satellite shards in slow orbit (one behind, one in front).
  const orbit = time * TAU / 6.8;
  const backX = Math.round(Math.cos(orbit) * 15);
  const backY = heart + Math.round(Math.sin(orbit) * 4);
  drawCrystalShard(ctx, backX, backY, 2, 4);

  drawCrystalShard(ctx, 0, heart, 6, 12);
  // Tip sparkle.
  const glint = 0.35 + 0.45 * pulse;
  rect(ctx, `rgba(236,255,254,${glint.toFixed(3)})`, 0, heart - 14, 1, 2);
  rect(ctx, `rgba(236,255,254,${(glint * 0.7).toFixed(3)})`, -1, heart - 13, 3, 1);

  const frontX = Math.round(Math.cos(orbit + Math.PI) * 15);
  const frontY = heart + Math.round(Math.sin(orbit + Math.PI) * 4);
  drawCrystalShard(ctx, frontX, frontY, 2, 3);

  // Slow twin sparks circling the halo.
  for (let k = 0; k < 2; k++) {
    const angle = time * TAU / 4.6 + k * Math.PI;
    const sx = Math.round(Math.cos(angle) * 16);
    const sy = heart + Math.round(Math.sin(angle) * 6);
    rect(ctx, brightRgba(0.55), sx, sy, 1, 1);
  }
}

// --- front rim / pylons / motes -------------------------------------------

function drawFrontRim(ctx: CanvasRenderingContext2D, time: number): void {
  drawSouthRim(ctx, time);
}

function drawPylons(ctx: CanvasRenderingContext2D, time: number): void {
  const pylons: Array<[number, number]> = [[-72, -26], [72, -26], [-76, 24], [76, 24]];
  for (let i = 0; i < pylons.length; i++) {
    const [x, y] = pylons[i];
    const flick = 0.5 + 0.5 * Math.sin(time * TAU / 2.6 + i * 1.7);

    rect(ctx, "rgba(5,8,11,0.32)", x - 7, y + 14, 14, 4);
    rect(ctx, "rgba(5,8,11,0.16)", x - 9, y + 17, 18, 2);

    // Two-tier plinth.
    rect(ctx, C.outline, x - 7, y + 8, 14, 8);
    rect(ctx, C.stone, x - 6, y + 9, 12, 6);
    rect(ctx, C.stoneLight, x - 6, y + 9, 12, 1);
    rect(ctx, C.outline, x - 5, y + 3, 10, 6);
    rect(ctx, C.stoneDark, x - 4, y + 4, 8, 5);
    rect(ctx, C.stoneLight, x - 4, y + 4, 8, 1);

    // Carved column with a groove.
    rect(ctx, C.outline, x - 4, y - 9, 8, 14);
    rect(ctx, C.stone, x - 3, y - 8, 6, 12);
    rect(ctx, C.stoneLight, x - 3, y - 8, 1, 12);
    rect(ctx, C.stoneDark, x + 1, y - 7, 1, 10);

    // Gold capital.
    rect(ctx, C.goldDark, x - 5, y - 12, 10, 4);
    rect(ctx, C.gold, x - 4, y - 12, 8, 3);
    rect(ctx, C.goldLight, x - 4, y - 12, 3, 1);

    // Floating flame-crystal with halo.
    rect(ctx, glowRgba(0.08 + 0.12 * flick), x - 6, y - 23, 12, 12);
    rect(ctx, brightRgba(0.08 + 0.10 * flick), x - 4, y - 21, 8, 8);
    rect(ctx, C.crystalOutline, x - 3, y - 20, 6, 8);
    rect(ctx, C.crystal, x - 2, y - 19, 4, 6);
    rect(ctx, C.crystalLight, x - 2, y - 19, 2, 3);
    rect(ctx, `rgba(236,255,254,${(0.4 + 0.4 * flick).toFixed(3)})`, x - 1, y - 18, 1, 2);

    // A single ember drifting up.
    const ember = (time / 2.4 + i * 0.31) % 1;
    const ex = x + Math.round(Math.sin(ember * TAU + i) * 2);
    rect(ctx, brightRgba(0.5 * (1 - ember)), ex, y - 21 - ember * 8, 1, 1);

    drawMossClump(ctx, x - 6, y + 13, i % 2 === 0);
  }
}

function drawSoulMotes(ctx: CanvasRenderingContext2D, time: number): void {
  for (let i = 0; i < 9; i++) {
    const period = 3.2 + (i % 3) * 0.7;
    const phase = (time / period + i * 0.37) % 1;
    const baseX = ((i * 23) % 64) - 32;
    const sway = Math.sin(time * TAU / 4.4 + i * 1.3) * 3;
    const x = baseX + Math.round(sway);
    const y = 2 - phase * 50;
    const alpha = Math.sin(phase * Math.PI) * 0.65;
    const size = i % 3 === 0 ? 2 : 1;
    rect(ctx, i % 2 === 0 ? brightRgba(alpha) : glowRgba(alpha), x, y, size, size);
  }
  // Two larger soul wisps with faint tails.
  for (let k = 0; k < 2; k++) {
    const phase = (time / 5.2 + k * 0.5) % 1;
    const x = (k === 0 ? -18 : 14) + Math.round(Math.sin(time * TAU / 3.8 + k * 2.1) * 4);
    const y = 0 - phase * 46;
    const alpha = Math.sin(phase * Math.PI) * 0.45;
    rect(ctx, brightRgba(alpha), x, y, 2, 2);
    rect(ctx, glowRgba(alpha * 0.5), x, y + 2, 2, 2);
    rect(ctx, glowRgba(alpha * 0.25), x, y + 4, 1, 2);
  }
}

export function drawRebirthSpringStructure(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
  const { x, y } = originOf(object);
  const part = artPartOf(object);
  ctx.save();
  ctx.translate(x + 72, y + 52);
  if (part === "court") drawCourt(ctx, time);
  else if (part === "basin") drawBasin(ctx, time);
  else if (part === "crystal") drawCrystal(ctx, time);
  else if (part === "front_rim") drawFrontRim(ctx, time);
  else if (part === "lantern_pylons") drawPylons(ctx, time);
  else if (part === "soul_motes") drawSoulMotes(ctx, time);
  ctx.restore();
}
