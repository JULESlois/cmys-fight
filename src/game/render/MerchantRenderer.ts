type MerchantTheme = "forest" | "dungeon" | "snow" | "lava";

interface MerchantThemePalette {
  accent: string;
  accentLight: string;
  accentDark: string;
  stall: string;
  stallLight: string;
  stallDark: string;
}

const MERCHANT_THEMES: Record<MerchantTheme, MerchantThemePalette> = {
  forest: {
    accent: "#64C98A", accentLight: "#D8FFD8", accentDark: "#2D6543",
    stall: "#765035", stallLight: "#B98254", stallDark: "#332219",
  },
  dungeon: {
    accent: "#B875E2", accentLight: "#F1D8FF", accentDark: "#5C3972",
    stall: "#505866", stallLight: "#8E99A6", stallDark: "#202630",
  },
  snow: {
    accent: "#62D8E8", accentLight: "#E8FFFF", accentDark: "#2D7280",
    stall: "#537280", stallLight: "#9CC0C8", stallDark: "#203B46",
  },
  lava: {
    accent: "#F07836", accentLight: "#FFE47A", accentDark: "#8A3527",
    stall: "#65585A", stallLight: "#A4AAA7", stallDark: "#2B2227",
  },
};

const IDENTITY = {
  outline: "#15131B",
  coatDark: "#30233D",
  coat: "#59416F",
  coatLight: "#8760A5",
  scarfDark: "#8A5A18",
  scarf: "#E0A73A",
  scarfLight: "#FFE08A",
  skinDark: "#9B654C",
  skin: "#D9A47F",
  skinLight: "#F2C7A4",
  leatherDark: "#33251D",
  leather: "#664A34",
  leatherLight: "#A4774D",
  metal: "#99A5B0",
  metalLight: "#D5E0E8",
  lens: "#73E1E8",
};

function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function palette(theme: string): MerchantThemePalette {
  return MERCHANT_THEMES[theme as MerchantTheme] ?? MERCHANT_THEMES.forest;
}

function drawSeparatedShadow(ctx: CanvasRenderingContext2D): void {
  rect(ctx, "rgba(0,0,0,0.34)", -31, 13, 17, 4);
  rect(ctx, "rgba(0,0,0,0.34)", -9, 14, 18, 4);
  rect(ctx, "rgba(0,0,0,0.34)", 14, 13, 17, 4);
}

function drawStallBack(ctx: CanvasRenderingContext2D, p: MerchantThemePalette, time: number): void {
  rect(ctx, p.stallDark, -31, -30, 5, 43);
  rect(ctx, p.stall, -29, -29, 3, 41);
  rect(ctx, p.stallDark, 26, -30, 5, 43);
  rect(ctx, p.stall, 26, -29, 3, 41);
  rect(ctx, p.stallDark, -33, -34, 66, 7);
  rect(ctx, p.stall, -31, -33, 62, 5);
  for (let x = -29; x <= 25; x += 9) {
    rect(ctx, (x / 9) % 2 === 0 ? p.accentDark : p.stallLight, x, -32, 7, 3);
  }

  const sway = Math.floor(time * 3) % 3 - 1;
  rect(ctx, p.stallDark, -24, -27, 2, 9);
  rect(ctx, p.accent, -26 + sway, -19, 6, 8);
  rect(ctx, p.accentLight, -24 + sway, -18, 2, 3);
  rect(ctx, p.stallDark, 21, -27, 2, 8);
  rect(ctx, p.accentDark, 18 - sway, -20, 8, 7);
  rect(ctx, p.accentLight, 20 - sway, -19, 3, 2);

  if (p === MERCHANT_THEMES.forest) {
    rect(ctx, "#5D7A43", -31, -25, 7, 4);
    rect(ctx, "#D98DA8", 25, -25, 4, 4);
  } else if (p === MERCHANT_THEMES.dungeon) {
    rect(ctx, "#7F8792", -31, -23, 6, 8);
    rect(ctx, "#CAB5DC", 26, -24, 3, 7);
  } else if (p === MERCHANT_THEMES.snow) {
    rect(ctx, "#DCEFF2", -31, -27, 8, 3);
    rect(ctx, "#D65A62", 25, -24, 4, 4);
  } else {
    rect(ctx, "#9D3D2B", -31, -23, 7, 6);
    rect(ctx, "#E8B44F", 24, -24, 5, 4);
  }
}

function drawBackpack(ctx: CanvasRenderingContext2D, p: MerchantThemePalette): void {
  rect(ctx, IDENTITY.outline, -17, -25, 13, 31);
  rect(ctx, IDENTITY.leatherDark, -15, -24, 10, 28);
  rect(ctx, IDENTITY.leather, -14, -22, 8, 25);
  rect(ctx, IDENTITY.leatherLight, -13, -21, 3, 17);
  rect(ctx, IDENTITY.outline, -19, -17, 5, 13);
  rect(ctx, p.accentDark, -18, -15, 3, 9);
  rect(ctx, IDENTITY.metal, -11, 1, 5, 3);
  rect(ctx, p.accent, -18, -4, 4, 7);
  rect(ctx, p.accentLight, -17, -3, 2, 2);
}

function drawMerchantBody(ctx: CanvasRenderingContext2D, p: MerchantThemePalette, time: number): void {
  const frame = Math.floor(time * 3) % 4;
  const bodyY = frame === 1 ? -1 : 0;
  const blink = frame === 3;

  ctx.save();
  ctx.translate(0, bodyY);
  drawBackpack(ctx, p);

  rect(ctx, IDENTITY.outline, -9, 1, 7, 12);
  rect(ctx, IDENTITY.leatherDark, -8, 3, 5, 9);
  rect(ctx, IDENTITY.outline, 3, 2, 7, 11);
  rect(ctx, IDENTITY.leatherDark, 4, 4, 5, 8);
  rect(ctx, IDENTITY.outline, -12, -22, 24, 27);
  rect(ctx, IDENTITY.coatDark, -10, -21, 20, 25);
  rect(ctx, IDENTITY.coat, -8, -20, 16, 23);
  rect(ctx, IDENTITY.coatLight, 2, -18, 5, 17);
  rect(ctx, IDENTITY.coatDark, -8, 0, 7, 8);
  rect(ctx, IDENTITY.coat, 1, 0, 8, 7);

  rect(ctx, IDENTITY.scarfDark, -8, -23, 16, 6);
  rect(ctx, IDENTITY.scarf, -7, -22, 14, 4);
  rect(ctx, IDENTITY.scarfLight, -5, -22, 5, 2);
  rect(ctx, IDENTITY.scarfDark, 5, -19, 5, 15);
  rect(ctx, IDENTITY.scarf, 6, -18, 3, 13);
  if (frame % 2 === 1) rect(ctx, IDENTITY.scarfLight, 7, -6, 2, 3);

  rect(ctx, IDENTITY.outline, -10, -40, 20, 18);
  rect(ctx, IDENTITY.coatDark, -12, -42, 24, 8);
  rect(ctx, IDENTITY.coat, -10, -41, 20, 6);
  rect(ctx, IDENTITY.outline, -8, -35, 16, 13);
  rect(ctx, IDENTITY.skinDark, -6, -34, 12, 11);
  rect(ctx, IDENTITY.skin, -5, -33, 10, 9);
  rect(ctx, IDENTITY.skinLight, -4, -32, 5, 3);
  rect(ctx, IDENTITY.outline, -6, -29, 12, 4);
  rect(ctx, IDENTITY.coatDark, -5, -28, 10, 4);
  rect(ctx, IDENTITY.outline, 1, -32, 7, 7);
  rect(ctx, IDENTITY.lens, 2, -31, 5, 4);
  rect(ctx, IDENTITY.metalLight, 3, -31, 2, 1);
  rect(ctx, IDENTITY.outline, -3, blink ? -30 : -31, 2, blink ? 1 : 2);

  rect(ctx, IDENTITY.outline, -16, -19, 7, 17);
  rect(ctx, IDENTITY.coatDark, -14, -18, 5, 14);
  rect(ctx, IDENTITY.skin, -13, -5, 4, 4);
  rect(ctx, IDENTITY.outline, -19, -9, 9, 8);
  rect(ctx, p.accentDark, -18, -8, 7, 6);
  rect(ctx, p.accentLight, -17, -7, 5, 2);
  rect(ctx, IDENTITY.outline, 9, -18, 8, 18);
  rect(ctx, IDENTITY.coat, 9, -17, 6, 14);
  rect(ctx, IDENTITY.skinDark, 10, -4, 6, 5);
  rect(ctx, IDENTITY.skin, 11, -4, 4, 4);

  rect(ctx, IDENTITY.leatherDark, -7, -6, 14, 4);
  rect(ctx, IDENTITY.leather, -6, -5, 12, 2);
  rect(ctx, IDENTITY.outline, -9, -3, 6, 7);
  rect(ctx, IDENTITY.leather, -8, -2, 4, 5);
  rect(ctx, IDENTITY.metal, 5, -3, 2, 7);
  rect(ctx, IDENTITY.metalLight, 7, 2, 3, 2);
  ctx.restore();
}

function drawCounterFront(ctx: CanvasRenderingContext2D, p: MerchantThemePalette, time: number): void {
  rect(ctx, p.stallDark, -32, -2, 64, 16);
  rect(ctx, p.stall, -30, -1, 60, 13);
  rect(ctx, p.stallLight, -28, 0, 56, 3);
  rect(ctx, p.stallDark, -27, 7, 54, 4);
  rect(ctx, p.stallLight, -24, 8, 48, 1);
  rect(ctx, p.stallDark, -27, 11, 6, 5);
  rect(ctx, p.stallDark, 21, 11, 6, 5);

  const glint = Math.floor(time * 4) % 5;
  const goods = [-23, -14, 15, 23];
  goods.forEach((gx, index) => {
    rect(ctx, IDENTITY.outline, gx - 2, -8, 7, 7);
    rect(ctx, index % 2 === 0 ? p.accent : p.accentDark, gx - 1, -7, 5, 5);
    if (index === glint % goods.length) rect(ctx, p.accentLight, gx, -7, 2, 2);
  });
}

export class MerchantRenderer {
  static drawMerchant(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, theme = "forest"): void {
    const p = palette(theme);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    drawSeparatedShadow(ctx);
    drawStallBack(ctx, p, time);
    drawMerchantBody(ctx, p, time);
    drawCounterFront(ctx, p, time);
    ctx.restore();
  }
}
