import { PALETTES } from "../data/palettes";

export type PortalState = "spawning" | "idle" | "hovered" | "activating";

const OUTER_STEPS = [
  [0, -16], [6, -14], [11, -11], [14, -6], [16, 0], [14, 6], [11, 11], [6, 14],
  [0, 16], [-6, 14], [-11, 11], [-14, 6], [-16, 0], [-14, -6], [-11, -11], [-6, -14],
] as const;
const INNER_STEPS = [
  [0, -10], [5, -8], [8, -5], [10, 0], [8, 5], [5, 8], [0, 10],
  [-5, 8], [-8, 5], [-10, 0], [-8, -5], [-5, -8],
] as const;

function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawForestFrame(ctx: CanvasRenderingContext2D, color: string): void {
  rect(ctx, "#231B16", -22, -17, 7, 32);
  rect(ctx, "#5C3D29", -20, -18, 5, 31);
  rect(ctx, "#8B6340", -18, -16, 2, 25);
  rect(ctx, "#231B16", 15, -17, 7, 32);
  rect(ctx, "#5C3D29", 15, -18, 5, 31);
  rect(ctx, "#8B6340", 16, -16, 2, 25);
  rect(ctx, "#231B16", -20, -24, 40, 8);
  rect(ctx, "#5C3D29", -18, -23, 36, 6);
  rect(ctx, "#76A15A", -22, -25, 13, 5);
  rect(ctx, "#8DBA67", 9, -25, 13, 5);
  rect(ctx, "#E98EAC", -18, -27, 3, 3);
  rect(ctx, "#F4D86C", 16, -26, 3, 3);
  rect(ctx, "#231B16", -27, 12, 15, 5);
  rect(ctx, "#5C3D29", -26, 13, 13, 3);
  rect(ctx, "#231B16", 12, 12, 15, 5);
  rect(ctx, "#5C3D29", 13, 13, 13, 3);
  rect(ctx, color, -1, -28, 3, 4);
}

function drawDungeonFrame(ctx: CanvasRenderingContext2D, color: string): void {
  rect(ctx, "#121722", -24, -20, 8, 37);
  rect(ctx, "#464F5D", -22, -19, 6, 35);
  rect(ctx, "#8994A0", -20, -18, 2, 27);
  rect(ctx, "#121722", 16, -20, 8, 37);
  rect(ctx, "#464F5D", 16, -19, 6, 35);
  rect(ctx, "#8994A0", 18, -18, 2, 27);
  rect(ctx, "#121722", -22, -28, 44, 9);
  rect(ctx, "#464F5D", -20, -27, 40, 7);
  rect(ctx, "#8994A0", -17, -26, 34, 2);
  for (const x of [-14, -7, 0, 7, 14]) {
    rect(ctx, "#252C39", x - 1, -23, 3, 5);
    rect(ctx, color, x, -22, 1, 3);
  }
  for (const side of [-1, 1] as const) {
    const x = side * 26;
    rect(ctx, "#171D28", x - 3, -13, 6, 25);
    for (let y = -10; y <= 8; y += 6) {
      rect(ctx, "#8D98A4", x - 2, y, 4, 3);
      rect(ctx, "#303946", x - 1, y + 1, 2, 1);
    }
  }
  rect(ctx, color, -2, -33, 5, 4);
}

function drawSnowFrame(ctx: CanvasRenderingContext2D, color: string): void {
  for (const side of [-1, 1] as const) {
    const x = side * 21;
    rect(ctx, "#173543", x - 7, -22, 14, 41);
    rect(ctx, "#597984", x - 5, -21, 10, 39);
    rect(ctx, "#D4E9EC", x - 3, -19, 6, 4);
    rect(ctx, "#203F4D", x - 3, -12, 6, 18);
    rect(ctx, color, x - 2, -9, 4, 9);
    rect(ctx, "#E9FFFF", x - 1, -8, 2, 4);
    rect(ctx, "#D65760", x - 3, 10, 3, 3);
    rect(ctx, "#E7B64B", x + 1, 10, 3, 3);
  }
  rect(ctx, "#173543", -22, -29, 44, 9);
  rect(ctx, "#597984", -20, -28, 40, 7);
  rect(ctx, "#D4E9EC", -17, -27, 34, 2);
  rect(ctx, "#173543", -12, 16, 24, 5);
  rect(ctx, "#9DBCC3", -10, 17, 20, 2);
  rect(ctx, color, -2, -33, 5, 4);
}

function drawLavaFrame(ctx: CanvasRenderingContext2D, color: string): void {
  const plates = [
    [-20, -26, 14, 8], [6, -26, 14, 8], [-28, -16, 9, 13], [19, -16, 9, 13],
    [-28, 4, 9, 13], [19, 4, 9, 13], [-20, 16, 14, 7], [6, 16, 14, 7],
  ] as const;
  for (const [x, y, w, h] of plates) {
    rect(ctx, "#171217", x - 1, y - 1, w + 2, h + 2);
    rect(ctx, "#555154", x, y, w, h);
    rect(ctx, "#9B9F9C", x + 2, y + 1, Math.max(2, w - 4), 2);
    rect(ctx, "#9B3B29", x + Math.floor(w / 2) - 1, y + Math.floor(h / 2), 3, 3);
  }
  for (const side of [-1, 1] as const) {
    const x = side * 31;
    rect(ctx, "#171217", x - 5, -16, 10, 34);
    rect(ctx, "#514B4F", x - 3, -14, 6, 30);
    rect(ctx, "#9B9F9C", x - 2, -12, 2, 22);
    rect(ctx, color, x - 2, 12, 4, 6);
  }
  rect(ctx, "#3C1F20", -8, -31, 16, 6);
  rect(ctx, color, -3, -30, 6, 4);
}

function drawThemeFrame(ctx: CanvasRenderingContext2D, theme: string, color: string): void {
  if (theme === "dungeon") drawDungeonFrame(ctx, color);
  else if (theme === "snow") drawSnowFrame(ctx, color);
  else if (theme === "lava") drawLavaFrame(ctx, color);
  else drawForestFrame(ctx, color);
}

function drawPortalBody(
  ctx: CanvasRenderingContext2D,
  color: string,
  time: number,
  state: PortalState,
): void {
  const speed = state === "activating" ? 18 : state === "spawning" ? 14 : 10;
  const phase = Math.floor(time * speed);
  const drift = [-1, 0, 1, 0][phase % 4];

  // The aperture and all motion remain behind the chapter-specific frame.
  rect(ctx, "#050910", -14, -18, 28, 36);
  rect(ctx, "rgba(9,16,26,0.72)", -12, -16, 24, 32);

  // Discrete scan bands flow vertically and laterally without scaling or
  // rotating the frame, preserving crisp pixel edges.
  for (let row = 0; row < 7; row++) {
    const y = -14 + row * 5;
    const inset = Math.abs(3 - row) * 2;
    const width = 22 - inset;
    const offset = ((phase + row * 2) % 5) - 2;
    rect(ctx, row % 2 === 0 ? color : "#FFFFFF", -Math.floor(width / 2) + offset, y, width, 2);
    if ((phase + row) % 3 === 0) rect(ctx, "#FFFFFF", drift + offset - 1, y, 3, 2);
  }

  // Energy motes advance through fixed pixel paths, creating rotation in the
  // portal body while the structural frame remains completely static.
  for (let index = 0; index < 8; index++) {
    const [x, y] = OUTER_STEPS[(index * 2 + phase) % OUTER_STEPS.length];
    rect(ctx, index % 3 === 0 ? "#FFFFFF" : color, x - 1, y - 1, 2, 2);
  }
  for (let index = 0; index < 6; index++) {
    const [x, y] = INNER_STEPS[(index * 2 + phase * 2) % INNER_STEPS.length];
    rect(ctx, index % 2 === 0 ? "#FFFFFF" : color, x - 1, y - 1, 2, 2);
  }

  const coreWidth = state === "hovered" || state === "activating" ? 8 : 6;
  rect(ctx, color, -Math.floor(coreWidth / 2) + drift, -8, coreWidth, 16);
  rect(ctx, "rgba(9,16,26,0.6)", -2 + drift, -6, 4, 12);
  rect(ctx, "#FFFFFF", drift, -4 + (phase % 3), 2, 8);
}

export class PortalRenderer {
  static drawPortal(ctx: CanvasRenderingContext2D, portal: {x: number, y: number, state: PortalState, timer: number}, time: number, theme: string) {
    const portalColor = PALETTES[theme] ? PALETTES[theme].portal : "#00FFFF";
    ctx.save();
    ctx.translate(Math.round(portal.x), Math.round(portal.y));

    // Fragmented contact shadows ground the frame without reading as a
    // rectangular portal platform.
    rect(ctx, "rgba(0,0,0,0.35)", -25, 18, 16, 3);
    rect(ctx, "rgba(0,0,0,0.35)", -7, 20, 14, 3);
    rect(ctx, "rgba(0,0,0,0.35)", 9, 18, 16, 3);
    drawPortalBody(ctx, portalColor, time, portal.state);
    drawThemeFrame(ctx, theme, portalColor);

    if (portal.state === "hovered" || portal.state === "activating") {
      rect(ctx, "#FFFFFF", -1, -22, 3, 3);
      rect(ctx, "#FFFFFF", 20, -1, 3, 3);
      rect(ctx, "#FFFFFF", -1, 20, 3, 3);
      rect(ctx, "#FFFFFF", -22, -1, 3, 3);
    }
    ctx.restore();
  }
}
