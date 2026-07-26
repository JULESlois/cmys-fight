import {
  chestWorldPoint,
  getChestGeometry,
  type ChestKind,
} from "../dungeon/ChestGeometry";

type ChestTheme = "forest" | "dungeon" | "snow" | "lava";
export type ChestRenderPart = "shadow" | "lid" | "body" | "sparkle";

export interface ChestRenderData {
  x: number;
  y: number;
  kind: ChestKind;
  opened: boolean;
}

interface ChestPalette {
  bodyDark: string;
  body: string;
  bodyLight: string;
  bandDark: string;
  band: string;
  accent: string;
  accentLight: string;
}

const TREASURE_PALETTES: Record<ChestTheme, ChestPalette> = {
  forest: {
    bodyDark: "#3A2519", body: "#75492D", bodyLight: "#B37644",
    bandDark: "#5E431A", band: "#C99532", accent: "#70D29A", accentLight: "#D8FFD8",
  },
  dungeon: {
    bodyDark: "#242936", body: "#4B5361", bodyLight: "#818C99",
    bandDark: "#594518", band: "#C6A13A", accent: "#BD79E5", accentLight: "#F1D8FF",
  },
  snow: {
    bodyDark: "#203846", body: "#4B7180", bodyLight: "#91BBC3",
    bandDark: "#445A61", band: "#B8D1D6", accent: "#63D9E8", accentLight: "#E8FFFF",
  },
  lava: {
    bodyDark: "#2B2024", body: "#5F4E50", bodyLight: "#9C8B86",
    bandDark: "#71301F", band: "#D76732", accent: "#F27A39", accentLight: "#FFE47A",
  },
};

const BOSS_PALETTE: ChestPalette = {
  bodyDark: "#24162E", body: "#59366D", bodyLight: "#8D5CA8",
  bandDark: "#674B18", band: "#D6AE42", accent: "#C47AF0", accentLight: "#FFF0A8",
};

interface SparkleColors {
  core: string;
  edge: string;
  flash: string;
}

const SPARKLE_COLORS: Record<ChestTheme, SparkleColors> = {
  forest: { core: "#8CE07A", edge: "#E9FFDC", flash: "#FFFFFF" },
  dungeon: { core: "#BD79E5", edge: "#F1D8FF", flash: "#FFFFFF" },
  snow: { core: "#7FE6F2", edge: "#E8FFFF", flash: "#FFFFFF" },
  lava: { core: "#FF9A3C", edge: "#FFE9C2", flash: "#FFF6E0" },
};

const BOSS_SPARKLE: SparkleColors = { core: "#FFD95A", edge: "#FFF0A8", flash: "#FFFFFF" };

// Deterministic per-pixel hash so decoration jitter is stable frame to frame.
function pixHash(x: number, y: number, salt = 0): number {
  let h = ((x | 0) * 73856093) ^ ((y | 0) * 19349663) ^ ((salt | 0) * 83492791);
  h = (h ^ (h >>> 13)) >>> 0;
  h = (h * 2654435761) >>> 0;
  return (h % 1024) / 1024;
}

function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function palette(theme: string, kind: ChestKind): ChestPalette {
  if (kind === "boss") return BOSS_PALETTE;
  return TREASURE_PALETTES[theme as ChestTheme] ?? TREASURE_PALETTES.forest;
}

function sparkleColors(theme: string, kind: ChestKind): SparkleColors {
  if (kind === "boss") return BOSS_SPARKLE;
  return SPARKLE_COLORS[theme as ChestTheme] ?? SPARKLE_COLORS.forest;
}

function drawShadow(ctx: CanvasRenderingContext2D, boss: boolean): void {
  const half = boss ? 20 : 16;
  rect(ctx, "rgba(0,0,0,0.22)", -half - 2, 6, half * 2 + 4, 4);
  rect(ctx, "rgba(0,0,0,0.34)", -half, 9, half * 2, 4);
}

function drawTreasureLid(ctx: CanvasRenderingContext2D, p: ChestPalette, opened: boolean): void {
  if (opened) {
    rect(ctx, p.bodyDark, -15, -6, 30, 8);
    rect(ctx, p.bodyDark, -12, -10, 24, 5);
    rect(ctx, p.body, -13, -7, 26, 7);
    rect(ctx, p.bodyLight, -10, -6, 20, 2);
    rect(ctx, p.bandDark, -2, -10, 4, 11);
    rect(ctx, p.band, -1, -9, 2, 8);
    rect(ctx, "#171319", -11, 0, 22, 3);
    return;
  }
  rect(ctx, p.bodyDark, -15, -7, 30, 8);
  rect(ctx, p.bodyDark, -12, -11, 24, 4);
  rect(ctx, p.body, -13, -9, 26, 9);
  rect(ctx, p.bodyLight, -10, -8, 20, 2);
  rect(ctx, p.bandDark, -2, -11, 4, 12);
  rect(ctx, p.band, -1, -10, 2, 10);
}

function drawTreasureBody(ctx: CanvasRenderingContext2D, p: ChestPalette, opened: boolean): void {
  rect(ctx, p.bodyDark, -16, -4, 32, 15);
  rect(ctx, p.body, -14, -2, 28, 11);
  if (opened) {
    rect(ctx, "#171319", -12, -4, 24, 7);
    rect(ctx, p.accent, -9, -3, 18, 2);
  } else {
    rect(ctx, p.bodyLight, -12, -1, 24, 2);
  }
  rect(ctx, p.bodyLight, -12, 5, 24, 2);
  rect(ctx, p.bandDark, -3, -4, 6, 13);
  rect(ctx, p.band, -2, opened ? 3 : -2, 4, opened ? 6 : 9);
  rect(ctx, "#171319", -2, 1, 4, 5);
  rect(ctx, p.accent, -1, 2, 2, 2);
  rect(ctx, p.bodyDark, -14, 8, 5, 4);
  rect(ctx, p.bodyDark, 9, 8, 5, 4);
  rect(ctx, p.bandDark, -12, -3, 3, 10);
  rect(ctx, p.bandDark, 9, -3, 3, 10);
  rect(ctx, p.band, -11, -2, 1, 7);
  rect(ctx, p.band, 10, -2, 1, 7);
}

// --- Forest: vines and moss creeping over the corners, wood grain streaks ---

const FOREST_MOSS = "#4E9440";
const FOREST_MOSS_LIGHT = "#8FD86E";
const FOREST_GRAIN = "#4A2C1A";

function drawForestBodyDecor(ctx: CanvasRenderingContext2D, opened: boolean): void {
  // Wood grain streaks on the side panels (hash-jittered, deterministic).
  for (let i = 0; i < 3; i++) {
    const lx = -13 + Math.floor(pixHash(i, 1) * 5);
    const rx = 5 + Math.floor(pixHash(i, 2) * 5);
    const gy = (opened ? 0 : -1) + i * 3;
    rect(ctx, FOREST_GRAIN, lx, gy, 3, 1);
    rect(ctx, FOREST_GRAIN, rx, gy + 1, 3, 1);
  }
  // Moss clumps hugging the top corners of the body.
  rect(ctx, FOREST_MOSS, -16, -4, 5, 2);
  rect(ctx, FOREST_MOSS_LIGHT, -15, -4, 2, 1);
  rect(ctx, FOREST_MOSS, 11, -4, 5, 2);
  rect(ctx, FOREST_MOSS_LIGHT, 13, -4, 2, 1);
  // Vines crawling down the corner trims.
  for (let vy = -2; vy <= 8; vy += 2) {
    const lj = pixHash(-15, vy) > 0.5 ? 1 : 0;
    const rj = pixHash(14, vy) > 0.5 ? -1 : 0;
    rect(ctx, FOREST_MOSS, -15 + lj, vy, 1, 2);
    rect(ctx, FOREST_MOSS, 14 + rj, vy, 1, 2);
    if (pixHash(vy, 7) > 0.66) {
      rect(ctx, FOREST_MOSS_LIGHT, -15 + lj, vy, 1, 1);
      rect(ctx, FOREST_MOSS_LIGHT, 14 + rj, vy, 1, 1);
    }
  }
}

function drawForestLidDecor(ctx: CanvasRenderingContext2D, opened: boolean): void {
  const top = opened ? -10 : -11;
  // Moss caps on the lid corners.
  rect(ctx, FOREST_MOSS, -12, top, 4, 2);
  rect(ctx, FOREST_MOSS_LIGHT, -11, top, 2, 1);
  rect(ctx, FOREST_MOSS, 8, top, 4, 2);
  rect(ctx, FOREST_MOSS_LIGHT, 9, top + 1, 2, 1);
  // Curved grain streaks across the lid face.
  for (let i = 0; i < 2; i++) {
    const gx = -10 + Math.floor(pixHash(i, 4) * 7);
    rect(ctx, FOREST_GRAIN, gx, top + 4 + i * 2, 4, 1);
    rect(ctx, FOREST_GRAIN, 4 - Math.floor(pixHash(i, 5) * 4), top + 5 + i * 2, 3, 1);
  }
}

// --- Dungeon: iron chains strapped around the chest plus a lock plaque ---

const IRON_DARK = "#31363F";
const IRON = "#5B6472";
const IRON_LIGHT = "#98A3B0";

function drawDungeonChain(ctx: CanvasRenderingContext2D, x: number, y0: number, y1: number): void {
  for (let y = y0; y <= y1 - 2; y += 3) {
    const off = pixHash(x, y) > 0.5 ? 1 : 0;
    rect(ctx, IRON_DARK, x - off, y, 2, 3);
    rect(ctx, IRON_LIGHT, x - off, y + 1, 1, 1);
  }
}

function drawDungeonBodyDecor(ctx: CanvasRenderingContext2D, opened: boolean): void {
  // Chains wrap the whole chest when sealed; hang loose on the lower half once opened.
  const chainTop = opened ? 2 : -4;
  drawDungeonChain(ctx, -8, chainTop, 11);
  drawDungeonChain(ctx, 7, chainTop, 11);
  // Iron lock plaque hanging beneath the clasp.
  rect(ctx, IRON_DARK, -4, 6, 8, 5);
  rect(ctx, IRON, -3, 7, 6, 3);
  rect(ctx, IRON_LIGHT, -3, 7, 6, 1);
  rect(ctx, "#171319", -1, 8, 2, 2);
}

function drawDungeonLidDecor(ctx: CanvasRenderingContext2D, opened: boolean): void {
  if (opened) {
    // Severed chain stubs left dangling from the lid rim.
    rect(ctx, IRON_DARK, -9, 0, 2, 3);
    rect(ctx, IRON_LIGHT, -9, 1, 1, 1);
    rect(ctx, IRON_DARK, 7, 0, 2, 3);
    rect(ctx, IRON_LIGHT, 7, 1, 1, 1);
    return;
  }
  drawDungeonChain(ctx, -8, -11, 1);
  drawDungeonChain(ctx, 7, -11, 1);
}

// --- Snow: frost dusting and icicles hanging from the rims ---

const FROST = "#EAFBFF";
const ICE = "#9FE8F5";

function drawSnowBodyDecor(ctx: CanvasRenderingContext2D): void {
  // Frost rim along the top edge, split around the clasp.
  rect(ctx, FROST, -14, -4, 9, 1);
  rect(ctx, FROST, 5, -4, 9, 1);
  // Hash-scattered frost speckles on the front panel.
  for (let i = 0; i < 8; i++) {
    const sx = -13 + Math.floor(pixHash(i, 11) * 26);
    const sy = -3 + Math.floor(pixHash(i, 12) * 6);
    if (sx > -4 && sx < 3) continue;
    rect(ctx, pixHash(sx, sy) > 0.5 ? FROST : ICE, sx, sy, 1, 1);
  }
  // Icicles hanging from the front lip.
  for (let i = 0; i < 5; i++) {
    const ix = -13 + i * 6 + (pixHash(i, 13) > 0.5 ? 1 : 0);
    if (ix > -5 && ix < 3) continue;
    const len = 2 + Math.floor(pixHash(ix, 14) * 3);
    rect(ctx, ICE, ix, 7, 2, len);
    rect(ctx, FROST, ix, 7, 1, len - 1);
  }
}

function drawSnowLidDecor(ctx: CanvasRenderingContext2D, opened: boolean): void {
  const top = opened ? -10 : -11;
  // Snow cap on the lid crown plus frost shelves on the flanks.
  rect(ctx, FROST, -12, top, 24, 1);
  rect(ctx, FROST, -15, top + 4, 5, 1);
  rect(ctx, FROST, 10, top + 4, 5, 1);
  // Short icicles dripping off the lid rim (kept above the body seam).
  const rim = opened ? 1 : 0;
  for (let i = 0; i < 4; i++) {
    const ix = -12 + i * 7 + (pixHash(i, 15) > 0.5 ? 1 : 0);
    const len = 2 + (pixHash(ix, 16) > 0.6 ? 1 : 0);
    rect(ctx, ICE, ix, rim, 1, len);
  }
}

// --- Lava: riveted iron hoops with molten light leaking from the seams ---

const HOOP = "#3B3136";
const RIVET = "#FFD9A0";
const GLOW = "#FF4E1F";
const GLOW_HOT = "#FFB03A";

function drawLavaBodyDecor(ctx: CanvasRenderingContext2D, opened: boolean, time: number): void {
  const hot = Math.floor(time * 6) % 2 === 0;
  // Riveted iron hoop across the belly, split around the clasp.
  rect(ctx, HOOP, -14, 2, 11, 2);
  rect(ctx, HOOP, 3, 2, 11, 2);
  for (const rx of [-12, -7, 5, 10]) rect(ctx, RIVET, rx, 2, 1, 1);
  // Rivets studding the corner trims.
  for (const rx of [-11, 10]) {
    for (let ry = -2; ry <= 4; ry += 3) rect(ctx, RIVET, rx, ry, 1, 1);
  }
  // Molten glow leaking from the lid seam while sealed.
  if (!opened) {
    rect(ctx, GLOW, -13, -4, 10, 1);
    rect(ctx, GLOW, 3, -4, 10, 1);
    for (let i = 0; i < 4; i++) {
      const gx = -12 + Math.floor(pixHash(i, 21) * 24);
      rect(ctx, hot ? GLOW_HOT : GLOW, gx, -4, 2, 1);
    }
  }
  // Embers glowing in the floor seams.
  rect(ctx, hot ? GLOW_HOT : GLOW, -14, 7, 2, 1);
  rect(ctx, hot ? GLOW_HOT : GLOW, 12, 7, 2, 1);
}

function drawLavaLidDecor(ctx: CanvasRenderingContext2D, opened: boolean): void {
  const top = opened ? -10 : -11;
  // Iron strap across the lid face with rivets.
  rect(ctx, HOOP, -13, top + 6, 9, 1);
  rect(ctx, HOOP, 4, top + 6, 9, 1);
  for (const rx of [-11, -6, 6, 11]) rect(ctx, RIVET, rx, top + 6, 1, 1);
  rect(ctx, RIVET, -12, top + 2, 1, 1);
  rect(ctx, RIVET, 11, top + 2, 1, 1);
}

// --- Boss: golden crest work layered over the royal chest ---

const GOLD = "#D6AE42";
const GOLD_LIGHT = "#FFF0A8";
const GOLD_DARK = "#674B18";

function drawBossCrestLidDecor(ctx: CanvasRenderingContext2D, opened: boolean): void {
  const top = opened ? -12 : -13;
  // Gold caps on the lid corners.
  rect(ctx, GOLD, -17, top + 5, 3, 2);
  rect(ctx, GOLD_LIGHT, -17, top + 5, 1, 1);
  rect(ctx, GOLD, 14, top + 5, 3, 2);
  rect(ctx, GOLD_LIGHT, 16, top + 5, 1, 1);
  // Crest wings flanking the central crown band.
  for (const side of [-1, 1] as const) {
    rect(ctx, GOLD_DARK, side * 8 - 1, top + 3, 2, 4);
    rect(ctx, GOLD, side * 8 - 1, top + 4, 2, 2);
    rect(ctx, GOLD_LIGHT, side * 6 - 1, top + 5, 2, 1);
    rect(ctx, GOLD, side * 11 - 1, top + 6, 2, 2);
  }
}

function drawBossCrestBodyDecor(ctx: CanvasRenderingContext2D): void {
  // Gold frame corners around the pulsing medallion core.
  rect(ctx, GOLD, -6, -2, 2, 1);
  rect(ctx, GOLD, 4, -2, 2, 1);
  rect(ctx, GOLD, -6, 7, 2, 1);
  rect(ctx, GOLD, 4, 7, 2, 1);
  rect(ctx, GOLD_LIGHT, -6, -2, 1, 1);
  rect(ctx, GOLD_LIGHT, 5, -2, 1, 1);
  // Filigree scrolls near the base corners.
  for (const side of [-1, 1] as const) {
    const x = side * 13;
    rect(ctx, GOLD_DARK, x - 1, 3, 3, 1);
    rect(ctx, GOLD, x - 1, 4, 1, 2);
    rect(ctx, GOLD, x + 1, 4, 1, 1);
    rect(ctx, GOLD_LIGHT, x, 3, 1, 1);
  }
}

function drawLidDecor(ctx: CanvasRenderingContext2D, theme: string, kind: ChestKind, opened: boolean): void {
  if (kind === "boss") {
    drawBossCrestLidDecor(ctx, opened);
    return;
  }
  switch (theme as ChestTheme) {
    case "dungeon": drawDungeonLidDecor(ctx, opened); break;
    case "snow": drawSnowLidDecor(ctx, opened); break;
    case "lava": drawLavaLidDecor(ctx, opened); break;
    default: drawForestLidDecor(ctx, opened);
  }
}

function drawBodyDecor(
  ctx: CanvasRenderingContext2D,
  theme: string,
  kind: ChestKind,
  opened: boolean,
  time: number,
): void {
  if (kind === "boss") {
    drawBossCrestBodyDecor(ctx);
    return;
  }
  switch (theme as ChestTheme) {
    case "dungeon": drawDungeonBodyDecor(ctx, opened); break;
    case "snow": drawSnowBodyDecor(ctx); break;
    case "lava": drawLavaBodyDecor(ctx, opened, time); break;
    default: drawForestBodyDecor(ctx, opened);
  }
}

function drawBossLid(ctx: CanvasRenderingContext2D, p: ChestPalette, opened: boolean): void {
  if (opened) {
    rect(ctx, p.bodyDark, -19, -7, 38, 9);
    rect(ctx, p.bodyDark, -15, -12, 30, 6);
    rect(ctx, p.body, -17, -9, 34, 8);
    rect(ctx, p.bodyLight, -13, -8, 26, 2);
    rect(ctx, p.bandDark, -3, -12, 6, 13);
    rect(ctx, p.band, -2, -11, 4, 10);
    rect(ctx, "#160E1C", -14, 0, 28, 3);
    return;
  }
  rect(ctx, p.bodyDark, -19, -8, 38, 9);
  rect(ctx, p.bodyDark, -15, -13, 30, 5);
  rect(ctx, p.body, -17, -10, 34, 10);
  rect(ctx, p.bodyLight, -13, -9, 26, 3);
  rect(ctx, p.bandDark, -3, -13, 6, 14);
  rect(ctx, p.band, -2, -12, 4, 12);
}

function drawBossBody(ctx: CanvasRenderingContext2D, p: ChestPalette, opened: boolean, time: number): void {
  rect(ctx, p.bodyDark, -20, -5, 40, 16);
  rect(ctx, p.body, -18, -2, 36, 11);
  if (opened) {
    rect(ctx, "#160E1C", -15, -4, 30, 8);
    rect(ctx, p.accent, -12, -3, 24, 2);
  } else {
    rect(ctx, p.bodyLight, -15, -1, 30, 2);
  }
  rect(ctx, p.bodyLight, -15, 5, 30, 2);
  rect(ctx, p.bandDark, -4, -5, 8, 14);
  rect(ctx, p.band, -3, opened ? 3 : -3, 6, opened ? 6 : 11);

  for (const side of [-1, 1] as const) {
    const x = side * 18;
    rect(ctx, p.bodyDark, x - 3, -4, 6, 12);
    rect(ctx, p.bandDark, x - 2, -3, 4, 10);
    rect(ctx, p.band, x - 1, -2, 2, 7);
    rect(ctx, p.bodyDark, x - 4, 8, 8, 4);
  }

  const pulse = Math.floor(time * 6) % 4;
  rect(ctx, "#1A1021", -5, -1, 10, 8);
  rect(ctx, p.accent, -3, 0, 6, 6);
  rect(ctx, pulse % 2 === 0 ? p.accentLight : p.band, -1, 1, 2, 4);
}

function drawSparkle(ctx: CanvasRenderingContext2D, chest: ChestRenderData, theme: string, time: number): void {
  if (!chest.opened) return;
  const geometry = getChestGeometry(chest.kind);
  const loot = chestWorldPoint({ x: 0, y: 0 }, geometry.lootDropAnchor);
  const s = sparkleColors(theme, chest.kind);
  const pulse = Math.floor(time * 6) % 4;
  rect(ctx, s.edge, loot.x - 12 - pulse, loot.y - 10, 2, 2);
  rect(ctx, s.edge, loot.x + 10 + pulse, loot.y - 7, 2, 2);
  rect(ctx, s.core, loot.x - 1, loot.y - 15 - pulse, 2, 5);
  rect(ctx, s.flash, loot.x - 3, loot.y - 13 - pulse, 6, 1);
}

export class ChestRenderer {
  public static drawPart(
    ctx: CanvasRenderingContext2D,
    chest: ChestRenderData,
    time: number,
    theme: string,
    part: ChestRenderPart,
  ): void {
    if (!chest) return;
    const geometry = getChestGeometry(chest.kind);
    const p = palette(theme, chest.kind);
    ctx.save();
    ctx.translate(Math.round(chest.x), Math.round(chest.y));

    if (part === "shadow") {
      ctx.translate(geometry.bodyAnchor.x, geometry.bodyAnchor.y);
      drawShadow(ctx, chest.kind === "boss");
    } else if (part === "lid") {
      const anchor = chest.opened ? geometry.openedLidAnchor : geometry.closedLidAnchor;
      ctx.translate(anchor.x, anchor.y);
      if (chest.kind === "boss") drawBossLid(ctx, p, chest.opened);
      else drawTreasureLid(ctx, p, chest.opened);
      drawLidDecor(ctx, theme, chest.kind, chest.opened);
    } else if (part === "body") {
      ctx.translate(geometry.bodyAnchor.x, geometry.bodyAnchor.y);
      if (chest.kind === "boss") drawBossBody(ctx, p, chest.opened, time);
      else drawTreasureBody(ctx, p, chest.opened);
      drawBodyDecor(ctx, theme, chest.kind, chest.opened, time);
    } else {
      drawSparkle(ctx, chest, theme, time);
    }
    ctx.restore();
  }

  public static drawChest(ctx: CanvasRenderingContext2D, chest: ChestRenderData, time: number, theme = "forest"): void {
    this.drawPart(ctx, chest, time, theme, "shadow");
    this.drawPart(ctx, chest, time, theme, "lid");
    this.drawPart(ctx, chest, time, theme, "body");
    this.drawPart(ctx, chest, time, theme, "sparkle");
  }
}
