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

export class PortalRenderer {
  static drawPortal(ctx: CanvasRenderingContext2D, portal: {x: number, y: number, state: PortalState, timer: number}, time: number, theme: string) {
    const portalColor = PALETTES[theme] ? PALETTES[theme].portal : "#00FFFF";
    ctx.save();
    ctx.translate(Math.round(portal.x), Math.round(portal.y));

    let scale = 1;
    let alpha = 1;
    if (portal.state === "spawning") {
      const progress = Math.min(1, (0.6 - portal.timer) / 0.6);
      scale = Math.max(0.1, progress);
      alpha = progress;
    } else if (portal.state === "activating") {
      const progress = Math.min(1, (0.4 - portal.timer) / 0.4);
      scale = 1 + progress * 2;
      alpha = 1 - progress;
    }
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;

    const outerOffset = Math.floor(time * 8) % OUTER_STEPS.length;
    OUTER_STEPS.forEach(([x, y], index) => {
      ctx.fillStyle = (index + outerOffset) % 3 === 0 ? "#FFFFFF" : portalColor;
      const size = portal.state === "hovered" && index % 2 === 0 ? 4 : 3;
      ctx.fillRect(x - Math.floor(size / 2), y - Math.floor(size / 2), size, size);
    });

    const innerOffset = Math.floor(time * 11) % INNER_STEPS.length;
    INNER_STEPS.forEach(([x, y], index) => {
      ctx.globalAlpha = alpha * ((index + innerOffset) % 2 === 0 ? 0.85 : 0.4);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(x - 1, y - 1, 3, 3);
    });

    ctx.globalAlpha = alpha * (portal.state === "hovered" ? 1 : 0.7);
    ctx.fillStyle = portalColor;
    ctx.fillRect(-5, -5, 10, 10);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(-2, -2, 4, 4);

    if (portal.state === "hovered" || portal.state === "activating") {
      const distance = 12 - (Math.floor(time * 20) % 12);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(-1, -distance - 1, 3, 3);
      ctx.fillRect(distance - 1, -1, 3, 3);
      ctx.fillRect(-1, distance - 1, 3, 3);
      ctx.fillRect(-distance - 1, -1, 3, 3);
    }
    ctx.restore();
  }
}
