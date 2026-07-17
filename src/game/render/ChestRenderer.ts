type ChestKind = "treasure" | "boss";
type ChestTheme = "forest" | "dungeon" | "snow" | "lava";

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

function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function palette(theme: string, kind: ChestKind): ChestPalette {
  if (kind === "boss") return BOSS_PALETTE;
  return TREASURE_PALETTES[theme as ChestTheme] ?? TREASURE_PALETTES.forest;
}

function drawShadow(ctx: CanvasRenderingContext2D, boss: boolean): void {
  const half = boss ? 18 : 15;
  rect(ctx, "rgba(0,0,0,0.34)", -half, 8, half - 3, 4);
  rect(ctx, "rgba(0,0,0,0.34)", 3, 8, half - 3, 4);
}

function drawClosedTreasureChest(ctx: CanvasRenderingContext2D, p: ChestPalette, time: number): void {
  rect(ctx, p.bodyDark, -15, -10, 30, 8);
  rect(ctx, p.bodyDark, -12, -14, 24, 4);
  rect(ctx, p.body, -13, -12, 26, 9);
  rect(ctx, p.bodyLight, -10, -11, 20, 2);
  rect(ctx, p.bandDark, -2, -14, 4, 12);
  rect(ctx, p.band, -1, -13, 2, 10);

  rect(ctx, p.bodyDark, -16, -3, 32, 13);
  rect(ctx, p.body, -14, -2, 28, 10);
  rect(ctx, p.bodyLight, -12, -1, 24, 2);
  rect(ctx, p.bandDark, -3, -3, 6, 11);
  rect(ctx, p.band, -2, -2, 4, 8);
  rect(ctx, "#171319", -2, 1, 4, 5);
  rect(ctx, p.accent, -1, 2, 2, 2);

  rect(ctx, p.bodyDark, -14, 8, 5, 4);
  rect(ctx, p.bodyDark, 9, 8, 5, 4);
  rect(ctx, p.bandDark, -12, -4, 3, 11);
  rect(ctx, p.bandDark, 9, -4, 3, 11);
  rect(ctx, p.band, -11, -3, 1, 8);
  rect(ctx, p.band, 10, -3, 1, 8);

  if (Math.floor(time * 4) % 5 === 0) {
    rect(ctx, p.accentLight, 8, -12, 2, 2);
    rect(ctx, p.accentLight, 10, -10, 1, 1);
  }
}

function drawOpenTreasureChest(ctx: CanvasRenderingContext2D, p: ChestPalette): void {
  rect(ctx, p.bodyDark, -15, -17, 30, 7);
  rect(ctx, p.bodyDark, -12, -20, 24, 4);
  rect(ctx, p.body, -13, -18, 26, 7);
  rect(ctx, p.bodyLight, -10, -17, 20, 2);
  rect(ctx, p.bandDark, -2, -20, 4, 10);
  rect(ctx, p.band, -1, -19, 2, 8);

  rect(ctx, p.bodyDark, -16, -5, 32, 15);
  rect(ctx, p.body, -14, -3, 28, 11);
  rect(ctx, "#171319", -12, -4, 24, 7);
  rect(ctx, p.accent, -9, -3, 18, 2);
  rect(ctx, p.bodyLight, -12, 4, 24, 2);
  rect(ctx, p.bandDark, -3, -5, 6, 13);
  rect(ctx, p.band, -2, 3, 4, 5);
  rect(ctx, p.bodyDark, -14, 8, 5, 4);
  rect(ctx, p.bodyDark, 9, 8, 5, 4);
}

function drawClosedBossChest(ctx: CanvasRenderingContext2D, p: ChestPalette, time: number): void {
  rect(ctx, p.bodyDark, -19, -12, 38, 9);
  rect(ctx, p.bodyDark, -15, -17, 30, 5);
  rect(ctx, p.body, -17, -14, 34, 10);
  rect(ctx, p.bodyLight, -13, -13, 26, 3);
  rect(ctx, p.bandDark, -3, -17, 6, 14);
  rect(ctx, p.band, -2, -16, 4, 12);

  rect(ctx, p.bodyDark, -20, -4, 40, 15);
  rect(ctx, p.body, -18, -2, 36, 11);
  rect(ctx, p.bodyLight, -15, -1, 30, 2);
  rect(ctx, p.bandDark, -4, -4, 8, 13);
  rect(ctx, p.band, -3, -3, 6, 10);

  for (const side of [-1, 1] as const) {
    const x = side * 18;
    rect(ctx, p.bodyDark, x - 3, -9, 6, 17);
    rect(ctx, p.bandDark, x - 2, -8, 4, 14);
    rect(ctx, p.band, x - 1, -7, 2, 10);
    rect(ctx, p.bodyDark, x - 4, 8, 8, 4);
  }

  const pulse = Math.floor(time * 6) % 4;
  rect(ctx, "#1A1021", -5, -1, 10, 8);
  rect(ctx, p.accent, -3, 0, 6, 6);
  rect(ctx, pulse % 2 === 0 ? p.accentLight : p.band, -1, 1, 2, 4);
  rect(ctx, p.accentLight, -7 - pulse, -10, 2, 2);
  rect(ctx, p.accentLight, 6 + pulse, -8, 2, 2);
}

function drawOpenBossChest(ctx: CanvasRenderingContext2D, p: ChestPalette, time: number): void {
  rect(ctx, p.bodyDark, -19, -20, 38, 8);
  rect(ctx, p.bodyDark, -15, -24, 30, 5);
  rect(ctx, p.body, -17, -21, 34, 8);
  rect(ctx, p.bodyLight, -13, -20, 26, 2);
  rect(ctx, p.bandDark, -3, -24, 6, 12);
  rect(ctx, p.band, -2, -23, 4, 10);

  rect(ctx, p.bodyDark, -20, -5, 40, 16);
  rect(ctx, p.body, -18, -2, 36, 11);
  rect(ctx, "#160E1C", -15, -4, 30, 8);
  rect(ctx, p.accent, -12, -3, 24, 2);
  rect(ctx, p.accentLight, -6 + (Math.floor(time * 4) % 3), -6, 12, 2);
  rect(ctx, p.bodyLight, -15, 4, 30, 2);
  rect(ctx, p.bandDark, -4, -5, 8, 14);
  rect(ctx, p.band, -3, 3, 6, 6);
  for (const side of [-1, 1] as const) {
    const x = side * 18;
    rect(ctx, p.bodyDark, x - 3, -4, 6, 12);
    rect(ctx, p.bandDark, x - 2, -3, 4, 10);
    rect(ctx, p.bodyDark, x - 4, 8, 8, 4);
  }
}

export class ChestRenderer {
  static drawChest(ctx: CanvasRenderingContext2D, chest: ChestRenderData, time: number, theme = "forest"): void {
    const boss = chest.kind === "boss";
    const p = palette(theme, chest.kind);
    ctx.save();
    ctx.translate(Math.round(chest.x), Math.round(chest.y));
    drawShadow(ctx, boss);
    if (boss) {
      if (chest.opened) drawOpenBossChest(ctx, p, time);
      else drawClosedBossChest(ctx, p, time);
    } else if (chest.opened) {
      drawOpenTreasureChest(ctx, p);
    } else {
      drawClosedTreasureChest(ctx, p, time);
    }
    ctx.restore();
  }
}
