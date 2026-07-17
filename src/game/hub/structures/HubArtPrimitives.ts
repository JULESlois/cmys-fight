export const HUB_ART_COLORS = {
  ink: "#202631",
  void: "#09100F",
  stoneDark: "#252B35",
  stone: "#4B5260",
  stoneLight: "#737F8E",
  archive: "#433D52",
  archiveLight: "#817491",
  cyanStone: "#365866",
  cyanLight: "#72E0E8",
  cyanSoft: "#B7FAF5",
  wood: "#68472E",
  woodLight: "#9B6A3E",
  orange: "#E58945",
  red: "#C6554E",
  fire: "#FFD36B",
  armory: "#5A514A",
  gold: "#D8B45C",
  purple: "#9B74D5",
  purpleDark: "#49345F",
  water: "#4FB8C8",
  waterDark: "#256F83",
} as const;

export function rect(
  ctx: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  if (width <= 0 || height <= 0) return;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

export function pixelLine(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  color: string,
  gap = 4,
): void {
  ctx.fillStyle = color;
  for (let offset = 0; offset < width; offset += gap) {
    ctx.fillRect(Math.round(x + offset), Math.round(y), Math.min(2, width - offset), 1);
  }
}

export function groundShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  depth = 10,
): void {
  rect(ctx, "rgba(4,7,8,0.34)", x + 5, y, width - 10, depth);
  rect(ctx, "rgba(4,7,8,0.18)", x + 12, y + depth, width - 24, 3);
}

export function stoneFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  accent: string = HUB_ART_COLORS.stoneLight,
  base: string = HUB_ART_COLORS.stone,
): void {
  rect(ctx, HUB_ART_COLORS.stoneDark, x, y, width, height);
  rect(ctx, base, x + 3, y + 3, width - 6, height - 6);
  rect(ctx, accent, x + 4, y + 4, width - 8, 2);
  rect(ctx, accent, x + 4, y + 6, 2, height - 12);
  rect(ctx, "rgba(0,0,0,0.22)", x + 4, y + height - 7, width - 8, 3);
}

export function stoneCourses(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  light: string,
  dark = "rgba(18,22,29,0.35)",
): void {
  for (let row = 8; row < height - 5; row += 12) {
    rect(ctx, light, x + 4, y + row, width - 8, 1);
    const stagger = Math.floor(row / 12) % 2 === 0 ? 12 : 24;
    for (let joint = stagger; joint < width - 6; joint += 32) rect(ctx, dark, x + joint, y + row - 5, 1, 5);
  }
}

export function crenellations(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  color: string,
  merlonWidth = 9,
  gap = 6,
): void {
  rect(ctx, color, x, y + 7, width, 5);
  for (let offset = 0; offset < width; offset += merlonWidth + gap) {
    rect(ctx, color, x + offset, y, Math.min(merlonWidth, width - offset), 8);
  }
}

export function steppedSpire(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  topY: number,
  width: number,
  height: number,
  roof: string,
  trim: string,
): void {
  const steps = Math.max(3, Math.floor(height / 6));
  for (let step = 0; step < steps; step++) {
    const ratio = (step + 1) / steps;
    const rowWidth = Math.max(4, Math.round(width * ratio));
    const rowHeight = Math.ceil(height / steps);
    rect(ctx, roof, centerX - rowWidth / 2, topY + step * rowHeight, rowWidth, rowHeight + 1);
  }
  rect(ctx, trim, centerX - width / 2, topY + height - 2, width, 3);
  rect(ctx, trim, centerX - 1, topY - 7, 2, 8);
  rect(ctx, trim, centerX - 4, topY - 5, 8, 2);
}

export function gabledRoof(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  roof: string,
  trim: string,
): void {
  const center = x + width / 2;
  const rows = Math.max(4, Math.floor(height / 4));
  for (let row = 0; row < rows; row++) {
    const ratio = (row + 1) / rows;
    const rowWidth = Math.round(width * ratio);
    rect(ctx, roof, center - rowWidth / 2, y + row * 4, rowWidth, 5);
  }
  rect(ctx, trim, x - 2, y + height - 2, width + 4, 4);
  rect(ctx, trim, center - 2, y + 3, 4, height - 3);
}

export function archWindow(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  width: number,
  height: number,
  glow: string,
  frame: string = HUB_ART_COLORS.stoneDark,
): void {
  const x = Math.round(centerX - width / 2);
  rect(ctx, frame, x, y + 5, width, height - 5);
  rect(ctx, frame, x + 2, y + 2, width - 4, 4);
  rect(ctx, frame, x + 4, y, width - 8, 3);
  rect(ctx, glow, x + 3, y + 6, width - 6, height - 9);
  rect(ctx, "rgba(255,255,255,0.26)", x + 4, y + 7, 2, Math.max(2, height - 12));
  rect(ctx, frame, centerX, y + 5, 1, height - 8);
  rect(ctx, frame, x + 3, y + Math.floor(height * 0.58), width - 6, 1);
}

export function buttress(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  stone: string,
  light: string,
): void {
  rect(ctx, HUB_ART_COLORS.stoneDark, x - 2, y + 6, 14, height - 6);
  rect(ctx, HUB_ART_COLORS.stoneDark, x - 5, y + height - 18, 20, 18);
  rect(ctx, stone, x, y + 4, 10, height - 7);
  rect(ctx, stone, x - 2, y + height - 15, 14, 12);
  rect(ctx, light, x + 2, y + 8, 2, height - 15);
}

export function stoneSteps(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  width: number,
  steps: number,
  stone: string,
): void {
  for (let step = 0; step < steps; step++) {
    const stepWidth = width + step * 10;
    rect(ctx, step === 0 ? stone : HUB_ART_COLORS.stoneDark, centerX - stepWidth / 2, y + step * 4, stepWidth, 5);
    rect(ctx, stone, centerX - stepWidth / 2 + 2, y + step * 4, stepWidth - 4, 2);
  }
}

export function banner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  cloth: string,
  emblem: string,
  sway = 0,
): void {
  rect(ctx, HUB_ART_COLORS.stoneDark, x - 2, y - 3, width + 4, 3);
  rect(ctx, cloth, x, y, width + sway, height - 6);
  rect(ctx, cloth, x + 3, y + height - 6, Math.max(2, width - 6 + sway), 4);
  rect(ctx, emblem, x + Math.floor(width / 2) - 1, y + 6, 3, Math.max(4, height - 18));
  rect(ctx, emblem, x + 4, y + Math.floor(height / 2) - 1, Math.max(4, width - 8), 3);
}

export function runeLantern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  glow: string,
  time: number,
): void {
  const pulse = Math.floor(time * 5 + x * 0.03) % 2;
  rect(ctx, HUB_ART_COLORS.stoneDark, x - 4, y, 8, 22);
  rect(ctx, HUB_ART_COLORS.stoneDark, x - 8, y + 20, 16, 5);
  rect(ctx, HUB_ART_COLORS.stone, x - 2, y + 2, 4, 15);
  rect(ctx, glow, x - 4 - pulse, y - 7 - pulse, 8 + pulse * 2, 8 + pulse * 2);
  rect(ctx, "rgba(255,255,255,0.55)", x - 1, y - 5, 2, 4);
}

export function originOf(object: { properties?: Record<string, unknown> }): { x: number; y: number } {
  const x = object.properties?.originX;
  const y = object.properties?.originY;
  return {
    x: typeof x === "number" ? x : 0,
    y: typeof y === "number" ? y : 0,
  };
}

export function artPartOf(object: { properties?: Record<string, unknown> }): string {
  const part = object.properties?.artPart;
  return typeof part === "string" ? part : "";
}
