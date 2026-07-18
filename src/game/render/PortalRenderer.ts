import { PALETTES } from "../data/palettes";
import { PORTAL_FRAME_COLLISION_GEOMETRY } from "../dungeon/RoomObjectCollision";

export type PortalState = "spawning" | "idle" | "hovered" | "activating";
export type PortalRenderPart = "energy" | "supports";

export const PORTAL_OUTER_RING_POINTS = [
  [0, -20], [8, -18], [14, -14], [18, -8], [20, 0], [18, 8], [14, 14], [8, 18],
  [0, 20], [-8, 18], [-14, 14], [-18, 8], [-20, 0], [-18, -8], [-14, -14], [-8, -18],
] as const;

export const PORTAL_INNER_RING_POINTS = [
  [0, -13], [7, -11], [11, -7], [13, 0], [11, 7], [7, 11],
  [0, 13], [-7, 11], [-11, 7], [-13, 0], [-11, -7], [-7, -11],
] as const;

const PORTAL_PULSE_RING_POINTS = [
  [0, -23], [9, -21], [16, -16], [21, -9], [23, 0], [21, 9], [16, 16], [9, 21],
  [0, 23], [-9, 21], [-16, 16], [-21, 9], [-23, 0], [-21, -9], [-16, -16], [-9, -21],
] as const;

function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, width: number, height: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

function drawPixelCore(ctx: CanvasRenderingContext2D, radius: number, color: string): void {
  const r = Math.max(2, Math.round(radius));
  rect(ctx, color, -r, -Math.max(1, r - 2), r * 2, Math.max(2, (r - 2) * 2));
  rect(ctx, color, -Math.max(1, r - 2), -r, Math.max(2, (r - 2) * 2), r * 2);
}

export function getPortalPointIndex(index: number, phase: number, direction: 1 | -1, length: number): number {
  if (!Number.isFinite(length) || length <= 0) return 0;
  const raw = index + direction * phase;
  return ((raw % length) + length) % length;
}

function drawRingPoints(
  ctx: CanvasRenderingContext2D,
  points: readonly (readonly [number, number])[],
  phase: number,
  direction: 1 | -1,
  scale: number,
  color: string,
  highlight: string,
  pointCount: number,
): void {
  const count = Math.max(1, Math.min(points.length, pointCount));
  for (let index = 0; index < count; index++) {
    const pointIndex = getPortalPointIndex(index, phase, direction, points.length);
    const [sourceX, sourceY] = points[pointIndex];
    const x = Math.round(sourceX * scale);
    const y = Math.round(sourceY * scale);
    const bright = index % 4 === 0;
    rect(ctx, bright ? highlight : color, x - 1, y - 1, bright ? 3 : 2, 2);
  }
}

function drawPulseRing(
  ctx: CanvasRenderingContext2D,
  time: number,
  state: PortalState,
  color: string,
  highlight: string,
  ringOffset: number,
): void {
  const pulseSpeed = state === "activating" ? 14 : state === "hovered" ? 8 : 4;
  const phase = Math.floor(time * pulseSpeed + ringOffset * 5);
  const visibleModulo = state === "activating" ? 2 : 3;
  for (let index = 0; index < PORTAL_PULSE_RING_POINTS.length; index++) {
    if ((index + phase) % visibleModulo !== 0) continue;
    const [x, y] = PORTAL_PULSE_RING_POINTS[index];
    const offset = ringOffset === 0 ? 0 : ((phase + index) % 2 === 0 ? 2 : -2);
    rect(ctx, index % 4 === 0 ? highlight : color, x - 1 + Math.sign(x) * offset, y - 1 + Math.sign(y) * offset, 2, 2);
  }
}

function drawMinimalFrame(ctx: CanvasRenderingContext2D, energyColor: string, state: PortalState): void {
  rect(ctx, "rgba(0,0,0,0.34)", -27, 19, 18, 4);
  rect(ctx, "rgba(0,0,0,0.34)", 9, 19, 18, 4);

  const drawSupport = (local: { x: number; y: number; width: number; height: number }) => {
    rect(ctx, "#252B35", local.x, local.y, local.width, local.height);
    rect(ctx, "#5A626B", local.x + 2, local.y + 2, local.width - 4, local.height - 4);
    rect(ctx, "#89949C", local.x + 3, local.y + 3, 2, Math.max(2, local.height - 8));
    rect(ctx, state === "activating" ? "#FFFFFF" : energyColor, local.x + 2, local.y - 4, local.width - 4, 5);
  };
  drawSupport(PORTAL_FRAME_COLLISION_GEOMETRY.leftSupport);
  drawSupport(PORTAL_FRAME_COLLISION_GEOMETRY.rightSupport);

  for (const base of [PORTAL_FRAME_COLLISION_GEOMETRY.baseLeft, PORTAL_FRAME_COLLISION_GEOMETRY.baseRight]) {
    rect(ctx, "#252B35", base.x, base.y, base.width, base.height);
    rect(ctx, "#5A626B", base.x + 2, base.y + 1, base.width - 4, 3);
  }
}

function stateParameters(portal: { state: PortalState; timer: number }, time: number): {
  speed: number;
  scale: number;
  outerCount: number;
  innerCount: number;
  coreRadius: number;
  flash: boolean;
} {
  if (portal.state === "spawning") {
    const progress = Math.max(0, Math.min(1, 1 - portal.timer / 0.6));
    const discreteScale = Math.max(0.2, Math.round(progress * 5) / 5);
    return {
      speed: 10,
      scale: discreteScale,
      outerCount: Math.max(2, Math.floor(PORTAL_OUTER_RING_POINTS.length * progress)),
      innerCount: Math.max(1, Math.floor(PORTAL_INNER_RING_POINTS.length * progress)),
      coreRadius: Math.max(2, Math.round(7 * progress)),
      flash: false,
    };
  }
  if (portal.state === "activating") {
    const remaining = Math.max(0, Math.min(0.4, portal.timer));
    const progress = 1 - remaining / 0.4;
    return {
      speed: 22,
      scale: 1,
      outerCount: PORTAL_OUTER_RING_POINTS.length,
      innerCount: PORTAL_INNER_RING_POINTS.length,
      coreRadius: Math.max(1, Math.round(7 * (1 - progress))),
      flash: progress > 0.78 || Math.floor(time * 30) % 3 === 0,
    };
  }
  if (portal.state === "hovered") {
    return {
      speed: 10,
      scale: 1,
      outerCount: PORTAL_OUTER_RING_POINTS.length,
      innerCount: PORTAL_INNER_RING_POINTS.length,
      coreRadius: 8,
      flash: false,
    };
  }
  return {
    speed: 4,
    scale: 1,
    outerCount: PORTAL_OUTER_RING_POINTS.length,
    innerCount: PORTAL_INNER_RING_POINTS.length,
    coreRadius: 7,
    flash: false,
  };
}

export class PortalRenderer {
  static drawPortalPart(
    ctx: CanvasRenderingContext2D,
    portal: { x: number; y: number; state: PortalState; timer: number },
    time: number,
    theme: string,
    part: PortalRenderPart,
  ): void {
    const energyColor = PALETTES[theme]?.portal ?? "#00FFFF";
    const highlight = portal.state === "hovered" || portal.state === "activating" ? "#FFFFFF" : "#D8FFFF";
    const params = stateParameters(portal, time);
    const phase = Math.floor(time * params.speed);

    ctx.save();
    ctx.translate(Math.round(portal.x), Math.round(portal.y));

    if (part === "energy") {
      drawPulseRing(ctx, time, portal.state, energyColor, highlight, 0);
      drawPulseRing(ctx, time, portal.state, energyColor, highlight, 1);
      drawRingPoints(ctx, PORTAL_OUTER_RING_POINTS, phase, 1, params.scale, energyColor, highlight, params.outerCount);
      drawRingPoints(ctx, PORTAL_INNER_RING_POINTS, phase, -1, params.scale, energyColor, highlight, params.innerCount);
      drawPixelCore(ctx, Math.max(3, 10 * params.scale), "#050910");
      drawPixelCore(ctx, params.coreRadius, params.flash ? "#FFFFFF" : energyColor);
      if (!params.flash) drawPixelCore(ctx, Math.max(1, params.coreRadius - 3), "#101827");
      if (params.flash) {
        rect(ctx, "#FFFFFF", -2, -25, 4, 50);
        rect(ctx, "#FFFFFF", -25, -2, 50, 4);
      }
    } else {
      drawMinimalFrame(ctx, energyColor, portal.state);
    }
    ctx.restore();
  }

  static drawPortal(
    ctx: CanvasRenderingContext2D,
    portal: { x: number; y: number; state: PortalState; timer: number },
    time: number,
    theme: string,
  ): void {
    this.drawPortalPart(ctx, portal, time, theme, "energy");
    this.drawPortalPart(ctx, portal, time, theme, "supports");
  }
}
