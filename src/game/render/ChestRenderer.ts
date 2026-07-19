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

function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function palette(theme: string, kind: ChestKind): ChestPalette {
  if (kind === "boss") return BOSS_PALETTE;
  return TREASURE_PALETTES[theme as ChestTheme] ?? TREASURE_PALETTES.forest;
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

function drawSparkle(ctx: CanvasRenderingContext2D, chest: ChestRenderData, p: ChestPalette, time: number): void {
  if (!chest.opened) return;
  const geometry = getChestGeometry(chest.kind);
  const loot = chestWorldPoint({ x: 0, y: 0 }, geometry.lootDropAnchor);
  const pulse = Math.floor(time * 6) % 4;
  rect(ctx, p.accentLight, loot.x - 12 - pulse, loot.y - 10, 2, 2);
  rect(ctx, p.accentLight, loot.x + 10 + pulse, loot.y - 7, 2, 2);
  rect(ctx, p.accent, loot.x - 1, loot.y - 15 - pulse, 2, 5);
  rect(ctx, "#FFFFFF", loot.x - 3, loot.y - 13 - pulse, 6, 1);
}

export class ChestRenderer {
  public static drawPart(
    ctx: CanvasRenderingContext2D,
    chest: ChestRenderData,
    time: number,
    theme: string,
    part: ChestRenderPart,
  ): void {
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
    } else if (part === "body") {
      ctx.translate(geometry.bodyAnchor.x, geometry.bodyAnchor.y);
      if (chest.kind === "boss") drawBossBody(ctx, p, chest.opened, time);
      else drawTreasureBody(ctx, p, chest.opened);
    } else {
      drawSparkle(ctx, chest, p, time);
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
