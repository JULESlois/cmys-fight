import type { Projectile } from "../entities/Projectile";
import { PROJECTILE_ART, resolveProjectilePalette, type ProjectilePalette } from "../data/projectileArt";
import { SpriteRenderer } from "./SpriteRenderer";

const PRISM_COLORS = ["#E45B9D", "#F28A44", "#F0D94A", "#46D98A", "#37BDE0", "#625EA3"];

export class ProjectileArtRenderer {
  private static drawPixelLine(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    width = 1,
    alpha = 1,
    step = 2,
  ): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const samples = Math.max(1, Math.ceil(distance / Math.max(1, step)));
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    const size = Math.max(1, Math.round(width));
    for (let index = 0; index <= samples; index++) {
      const t = index / samples;
      ctx.fillRect(
        Math.round(x1 + dx * t - size / 2),
        Math.round(y1 + dy * t - size / 2),
        size,
        size,
      );
    }
    ctx.restore();
  }

  private static drawSegmentedTether(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    shadow: string,
    highlight: string,
  ): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const segments = Math.max(2, Math.ceil(distance / 5));
    for (let index = 0; index <= segments; index++) {
      if (index % 2 !== 0) continue;
      const t = index / segments;
      const x = Math.round(x1 + dx * t);
      const y = Math.round(y1 + dy * t);
      ctx.fillStyle = shadow;
      ctx.fillRect(x - 1, y - 1, 3, 3);
      ctx.fillStyle = highlight;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  private static drawBeam(ctx: CanvasRenderingContext2D, p: Projectile, palette: ProjectilePalette, reducedFlashing: boolean, prism: boolean): void {
    const speed = Math.hypot(p.vx, p.vy) || 1;
    const ux = p.vx / speed;
    const uy = p.vy / speed;
    const startX = p.x - ux * p.trailLength;
    const startY = p.y - uy * p.trailLength;
    const width = Math.max(1, p.beamWidth);

    if (prism) {
      const rayCount = reducedFlashing ? 3 : 5;
      for (let index = 0; index < rayCount; index++) {
        const centered = index - (rayCount - 1) / 2;
        const offset = centered * Math.max(1, width * 0.8);
        const color = PRISM_COLORS[(p.id + index) % PRISM_COLORS.length];
        ProjectileArtRenderer.drawPixelLine(
          ctx,
          startX - uy * offset,
          startY + ux * offset,
          p.x - uy * offset * 0.25,
          p.y + ux * offset * 0.25,
          color,
          1,
          reducedFlashing ? 0.52 : 0.78,
          2,
        );
      }
      ProjectileArtRenderer.drawPixelLine(ctx, startX, startY, p.x, p.y, palette.highlight, Math.max(1, width), reducedFlashing ? 0.58 : 0.92, 1);
    } else {
      ProjectileArtRenderer.drawPixelLine(ctx, startX, startY, p.x, p.y, palette.glow, width + 4, reducedFlashing ? 0.35 : 0.58, 2);
      ProjectileArtRenderer.drawPixelLine(ctx, startX, startY, p.x, p.y, palette.base, width + 2, reducedFlashing ? 0.62 : 0.88, 1);
      ProjectileArtRenderer.drawPixelLine(ctx, startX + ux * 3, startY + uy * 3, p.x, p.y, palette.highlight, Math.max(1, width - 1), 0.94, 1);
    }

    ctx.fillStyle = palette.shadow;
    ctx.fillRect(Math.round(p.x) - 2, Math.round(p.y) - 2, 5, 5);
    ctx.fillStyle = palette.highlight;
    ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3);
  }

  private static drawLightning(ctx: CanvasRenderingContext2D, p: Projectile, palette: ProjectilePalette, reducedFlashing: boolean): void {
    const speed = Math.hypot(p.vx, p.vy) || 1;
    const ux = p.vx / speed;
    const uy = p.vy / speed;
    const startX = p.x - ux * p.trailLength;
    const startY = p.y - uy * p.trailLength;
    const points: Array<[number, number]> = [];
    const segments = reducedFlashing ? 5 : 7;
    for (let index = 0; index <= segments; index++) {
      const t = index / segments;
      const jitter = index === 0 || index === segments
        ? 0
        : Math.sin(p.id * 1.91 + index * 3.17 + p.age * 35) * (reducedFlashing ? 1.5 : 3.2);
      points.push([
        startX + (p.x - startX) * t - uy * jitter,
        startY + (p.y - startY) * t + ux * jitter,
      ]);
    }

    for (let index = 1; index < points.length; index++) {
      const [x1, y1] = points[index - 1];
      const [x2, y2] = points[index];
      ProjectileArtRenderer.drawPixelLine(ctx, x1, y1, x2, y2, palette.shadow, 4, 0.72, 1);
      ProjectileArtRenderer.drawPixelLine(ctx, x1, y1, x2, y2, palette.base, 2, 0.94, 1);
      ProjectileArtRenderer.drawPixelLine(ctx, x1, y1, x2, y2, palette.highlight, 1, 1, 1);
      if (!reducedFlashing && index % 2 === 0 && index < points.length - 1) {
        const branchLength = 5 + (index % 3) * 2;
        ProjectileArtRenderer.drawPixelLine(
          ctx,
          x2,
          y2,
          x2 - uy * branchLength - ux * 2,
          y2 + ux * branchLength - uy * 2,
          palette.accent,
          1,
          0.72,
          1,
        );
      }
    }
  }

  private static drawTrailBlocks(ctx: CanvasRenderingContext2D, p: Projectile, palette: ProjectilePalette, steps: number, spacing: number, maxSize: number, reducedFlashing: boolean): void {
    const count = reducedFlashing ? Math.max(1, Math.ceil(steps * 0.55)) : steps;
    for (let index = 1; index <= count; index++) {
      const progress = index / (count + 1);
      const size = Math.max(1, Math.round(maxSize * (1 - progress * 0.7)));
      ctx.globalAlpha = (reducedFlashing ? 0.34 : 0.58) * (1 - progress * 0.65);
      ctx.fillStyle = index % 2 === 0 ? palette.accent : palette.base;
      ctx.fillRect(-index * spacing - size, -Math.floor(size / 2), size, size);
    }
    ctx.globalAlpha = 1;
  }

  private static drawEnemyProjectile(ctx: CanvasRenderingContext2D, p: Projectile, palette: ProjectilePalette, reducedFlashing: boolean): void {
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    ctx.rotate(Math.atan2(p.vy, p.vx));
    const radius = Math.max(2, Math.round(p.radius));
    ctx.fillStyle = "rgba(10,4,8,0.62)";
    ctx.fillRect(-radius - 4, -radius - 2, radius * 2 + 7, radius * 2 + 5);
    ctx.fillStyle = palette.shadow;
    ctx.fillRect(-radius - 2, -radius - 1, radius * 2 + 4, radius * 2 + 3);
    ctx.fillStyle = palette.base;
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    ctx.fillStyle = palette.highlight;
    ctx.fillRect(0, -radius + 1, Math.max(2, radius), 2);
    ctx.fillStyle = palette.accent;
    ctx.fillRect(-radius - 3, -1, 3, 2);
    if ((p.sourceBoss || p.damage >= 3) && !reducedFlashing) {
      ctx.fillStyle = "rgba(255,203,92,0.5)";
      ctx.fillRect(-1, -radius - 3, 2, 2);
      ctx.fillRect(-1, radius + 1, 2, 2);
      ctx.fillRect(radius + 1, -1, 2, 2);
    }
    ctx.restore();
  }


  private static drawLinkedMarker(
    ctx: CanvasRenderingContext2D,
    p: Projectile,
    palette: ProjectilePalette,
    reducedFlashing: boolean,
  ): void {
    const pulse = reducedFlashing ? 0 : Math.floor((Math.sin(p.age * 10) + 1) * 1.5);
    const radius = 6 + pulse;
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    ctx.globalAlpha = reducedFlashing ? 0.72 : 0.92;
    ctx.fillStyle = palette.shadow;
    ctx.fillRect(-radius, -radius, 4, 2);
    ctx.fillRect(radius - 3, -radius, 4, 2);
    ctx.fillRect(-radius, radius - 1, 4, 2);
    ctx.fillRect(radius - 3, radius - 1, 4, 2);
    ctx.fillRect(-radius, -radius, 2, 4);
    ctx.fillRect(radius - 1, -radius, 2, 4);
    ctx.fillRect(-radius, radius - 3, 2, 4);
    ctx.fillRect(radius - 1, radius - 3, 2, 4);
    ctx.fillStyle = palette.base;
    ctx.fillRect(-3, -1, 7, 3);
    ctx.fillRect(-1, -3, 3, 7);
    ctx.fillStyle = palette.highlight;
    ctx.fillRect(0, 0, 2, 2);
    ctx.fillStyle = palette.accent;
    ctx.fillRect(-radius - 2, -1, 2, 2);
    ctx.fillRect(radius + 1, -1, 2, 2);
    ctx.restore();
  }

  static draw(ctx: CanvasRenderingContext2D, p: Projectile, reducedFlashing = false): void {
    const art = PROJECTILE_ART[p.style];
    let palette = resolveProjectilePalette(p.style, p.weaponId, p.color, p.critical, p.faction);
    if (p.linkedShotMode === "primer") {
      palette = { shadow: "#4A3B16", base: "#E8D34F", highlight: "#FFF7B5", accent: "#69D6E8", glow: "rgba(232,211,79,0.34)" };
    } else if (p.linkedShotMode === "catalyst") {
      palette = { shadow: "#5A2418", base: "#FF6B43", highlight: "#FFE1B8", accent: "#F5C84B", glow: "rgba(255,107,67,0.36)" };
    }

    if (p.faction === "player" && p.linkedShotMode === "primer" && p.stuck) {
      ProjectileArtRenderer.drawLinkedMarker(ctx, p, palette, reducedFlashing);
      return;
    }

    if (p.faction === "enemy") {
      ProjectileArtRenderer.drawEnemyProjectile(ctx, p, palette, reducedFlashing);
      return;
    }

    if (p.style === "beam" || p.style === "prism") {
      ProjectileArtRenderer.drawBeam(ctx, p, palette, reducedFlashing, p.style === "prism");
      return;
    }
    if (p.style === "lightning") {
      ProjectileArtRenderer.drawLightning(ctx, p, palette, reducedFlashing);
      return;
    }
    if (p.style === "yoyo") {
      ctx.save();
      ProjectileArtRenderer.drawSegmentedTether(ctx, p.anchorX, p.anchorY - 2, p.x, p.y, palette.shadow, palette.highlight);
      ctx.translate(Math.round(p.x), Math.round(p.y));
      ctx.rotate(p.spinAngle);
      if (!reducedFlashing) {
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = palette.glow;
        ctx.fillRect(-9, -9, 18, 18);
        ctx.globalAlpha = 1;
      }
      SpriteRenderer.drawPixelSprite(ctx, "weapon_terrarian", 0, 0, 1);
      ctx.fillStyle = palette.highlight;
      ctx.fillRect(-1, -1, 3, 3);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    ctx.rotate(Math.atan2(p.vy, p.vx));

    if (p.style === "sword") {
      if (!reducedFlashing) {
        for (let index = 3; index >= 1; index--) {
          ctx.save();
          ctx.globalAlpha = 0.09 * (4 - index);
          ctx.translate(-index * 5, 0);
          ctx.rotate(-index * 0.04);
          SpriteRenderer.drawPixelSprite(ctx, "weapon_zenith", 0, 0, 1);
          ctx.restore();
        }
      }
      ctx.rotate(Math.sin(p.age * 15 + p.id) * 0.16);
      SpriteRenderer.drawPixelSprite(ctx, "weapon_zenith", 0, 0, 1);
      ctx.restore();
      return;
    }

    if (p.style === "dragon") {
      const segments = Math.max(4, 3 + p.summonLevel);
      for (let index = segments - 1; index >= 0; index--) {
        const x = -index * 5;
        const wave = Math.round(Math.sin(p.age * 9 - index * 0.75) * 2.5);
        const size = index === 0 ? 7 : Math.max(3, 6 - Math.floor(index / 3));
        ctx.fillStyle = palette.shadow;
        ctx.fillRect(x - Math.floor(size / 2) - 1, wave - Math.floor(size / 2) - 1, size + 2, size + 2);
        ctx.fillStyle = index === 0 ? palette.highlight : index % 2 === 0 ? palette.base : palette.accent;
        ctx.fillRect(x - Math.floor(size / 2), wave - Math.floor(size / 2), size, size);
        if (index === 0) {
          ctx.fillStyle = palette.shadow;
          ctx.fillRect(x + 2, wave - 2, 2, 2);
          ctx.fillStyle = palette.highlight;
          ctx.fillRect(x + 4, wave, 4, 2);
          ctx.fillStyle = palette.accent;
          ctx.fillRect(x - 2, wave - 5, 3, 2);
        }
      }
      ctx.restore();
      return;
    }

    if (p.style === "bullet") {
      ProjectileArtRenderer.drawTrailBlocks(ctx, p, palette, art.trailSteps, 3, 2, reducedFlashing);
      ctx.fillStyle = palette.shadow;
      ctx.fillRect(-4, -2, 8, 4);
      ctx.fillRect(4, -1, 2, 2);
      ctx.fillStyle = palette.base;
      ctx.fillRect(-3, -1, 7, 2);
      ctx.fillStyle = palette.highlight;
      ctx.fillRect(0, -1, 4, 1);
      ctx.fillStyle = palette.accent;
      ctx.fillRect(-4, -1, 2, 2);
    } else if (p.style === "tracer") {
      ProjectileArtRenderer.drawTrailBlocks(ctx, p, palette, art.trailSteps, Math.max(2, Math.floor(p.trailLength / Math.max(2, art.trailSteps))), 3, reducedFlashing);
      ctx.fillStyle = palette.shadow;
      ctx.fillRect(-5, -2, 10, 4);
      ctx.fillStyle = palette.base;
      ctx.fillRect(-5, -1, 11, 2);
      ctx.fillStyle = palette.highlight;
      ctx.fillRect(0, -1, 6, 1);
      ctx.fillStyle = palette.accent;
      ctx.fillRect(-6, -1, 2, 2);
    } else if (p.style === "plasma") {
      ProjectileArtRenderer.drawTrailBlocks(ctx, p, palette, art.trailSteps, 4, 3, reducedFlashing);
      const pulse = reducedFlashing ? 0 : Math.round((Math.sin(p.age * art.pulseRate) + 1) * 0.5);
      const radius = Math.max(3, Math.round(p.radius));
      ctx.globalAlpha = reducedFlashing ? 0.18 : 0.34;
      ctx.fillStyle = palette.glow;
      ctx.fillRect(-radius - 3 - pulse, -radius - 3 - pulse, (radius + 3 + pulse) * 2, (radius + 3 + pulse) * 2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = palette.shadow;
      ctx.fillRect(-radius - 1, -radius + 1, (radius + 1) * 2, Math.max(2, radius * 2 - 2));
      ctx.fillRect(-radius + 1, -radius - 1, Math.max(2, radius * 2 - 2), (radius + 1) * 2);
      ctx.fillStyle = palette.base;
      ctx.fillRect(-radius, -radius + 1, radius * 2, Math.max(2, radius * 2 - 2));
      ctx.fillRect(-radius + 1, -radius, Math.max(2, radius * 2 - 2), radius * 2);
      ctx.fillStyle = palette.highlight;
      ctx.fillRect(0, -radius + 1, Math.max(2, radius - 1), 2);
      ctx.fillRect(1, -1, 2, 2);
    } else if (p.style === "flame") {
      const wobble = Math.round(Math.sin(p.age * art.pulseRate + p.id) * 2);
      ctx.fillStyle = palette.shadow;
      ctx.fillRect(-8, -3 + wobble, 5, 6);
      ctx.fillStyle = palette.base;
      ctx.fillRect(-7, -2 + wobble, 7, 4);
      ctx.fillStyle = palette.accent;
      ctx.fillRect(-3, -3, 7, 6);
      ctx.fillStyle = palette.highlight;
      ctx.fillRect(0, -1, 5, 2);
      ctx.fillRect(2, -2, 2, 4);
    } else if (p.style === "rocket") {
      ProjectileArtRenderer.drawTrailBlocks(ctx, p, { ...palette, base: "#FF7043", accent: "#F2C14E" }, art.trailSteps, 3, 4, reducedFlashing);
      ctx.fillStyle = palette.shadow;
      ctx.fillRect(-5, -4, 9, 8);
      ctx.fillRect(-7, -3, 3, 6);
      ctx.fillStyle = palette.base;
      ctx.fillRect(-4, -3, 8, 6);
      ctx.fillStyle = palette.highlight;
      ctx.fillRect(-1, -2, 5, 2);
      ctx.fillStyle = palette.accent;
      ctx.fillRect(-6, -4, 3, 2);
      ctx.fillRect(-6, 2, 3, 2);
      ctx.fillStyle = "#FFF0A6";
      ctx.fillRect(-9, -1, 3, 2);
      ctx.fillStyle = "#FF7043";
      ctx.fillRect(-12, -2, 4, 4);
    } else if (p.style === "disc") {
      ProjectileArtRenderer.drawTrailBlocks(ctx, p, palette, art.trailSteps, 4, 2, reducedFlashing);
      ctx.rotate(p.spinAngle);
      const radius = Math.max(4, Math.round(p.radius));
      ctx.fillStyle = palette.shadow;
      ctx.fillRect(-radius - 1, -2, radius * 2 + 2, 5);
      ctx.fillRect(-2, -radius - 1, 5, radius * 2 + 2);
      ctx.fillStyle = palette.base;
      ctx.fillRect(-radius, -1, radius * 2, 3);
      ctx.fillRect(-1, -radius, 3, radius * 2);
      ctx.fillStyle = palette.highlight;
      ctx.fillRect(-1, -1, 3, 3);
      ctx.fillStyle = palette.accent;
      for (const [x, y] of [[radius,0],[-radius,0],[0,radius],[0,-radius]] as const) ctx.fillRect(x - 1, y - 1, 3, 3);
    } else if (p.style === "water") {
      ProjectileArtRenderer.drawTrailBlocks(ctx, p, palette, art.trailSteps, 4, 3, reducedFlashing);
      const radius = Math.max(3, Math.round(p.radius));
      ctx.fillStyle = palette.shadow;
      ctx.fillRect(-radius - 1, -radius + 1, (radius + 1) * 2, radius * 2 - 2);
      ctx.fillRect(-radius + 1, -radius - 1, radius * 2 - 2, (radius + 1) * 2);
      ctx.fillStyle = palette.base;
      ctx.fillRect(-radius, -radius + 1, radius * 2, radius * 2 - 2);
      ctx.fillRect(-radius + 1, -radius, radius * 2 - 2, radius * 2);
      ctx.fillStyle = palette.highlight;
      ctx.fillRect(-1, -radius + 1, 3, 2);
      ctx.fillRect(1, -1, 2, 2);
      ctx.fillStyle = palette.accent;
      ctx.fillRect(-radius - 5, -3, 2, 2);
      ctx.fillRect(-radius - 8, 2, 2, 2);
    }

    if (p.critical && !reducedFlashing) {
      ctx.fillStyle = "#FFF6B8";
      ctx.fillRect(5, -3, 2, 2);
      ctx.fillRect(5, 2, 2, 2);
    }
    ctx.restore();
  }
}
