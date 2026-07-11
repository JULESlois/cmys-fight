import type { Pickup } from "../entities/Pickup";
import type { Projectile } from "../entities/Projectile";

interface FxParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  glow: boolean;
}

export class PixelFxSystem {
  private particles: FxParticle[] = [];

  getActiveCount(): number {
    return this.particles.length;
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.94, dt * 60);
      p.vy *= Math.pow(0.97, dt * 60);
    }
  }

  private emit(
    x: number,
    y: number,
    count: number,
    color: string,
    speed: number,
    life: number,
    options: { direction?: number; spread?: number; gravity?: number; glow?: boolean; size?: number } = {},
  ) {
    const direction = options.direction;
    const spread = options.spread ?? Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const angle = direction === undefined
        ? Math.random() * Math.PI * 2
        : direction + (Math.random() - 0.5) * spread;
      const magnitude = speed * (0.45 + Math.random() * 0.75);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * magnitude,
        vy: Math.sin(angle) * magnitude,
        life: life * (0.7 + Math.random() * 0.45),
        maxLife: life,
        size: Math.max(1, (options.size ?? 2) + Math.floor(Math.random() * 2)),
        color,
        gravity: options.gravity ?? 0,
        glow: options.glow === true,
      });
    }
    if (this.particles.length > 220) this.particles.splice(0, this.particles.length - 220);
  }

  emitMuzzle(projectile: Projectile, lowFx = false) {
    const direction = Math.atan2(projectile.vy, projectile.vx);
    const count = projectile.muzzleEffect === "flame" ? (lowFx ? 4 : 9)
      : projectile.muzzleEffect === "rocket" ? (lowFx ? 4 : 8)
        : projectile.muzzleEffect === "electric" || projectile.muzzleEffect === "beam" ? (lowFx ? 3 : 7)
          : lowFx ? 3 : 6;
    const speed = projectile.muzzleEffect === "rocket" ? 28
      : projectile.muzzleEffect === "flame" ? 52
        : projectile.muzzleEffect === "electric" ? 70
          : 44;
    const color = projectile.muzzleEffect === "rocket" ? "#B8C2CC"
      : projectile.muzzleEffect === "flame" ? "#FFB347"
        : projectile.color;
    this.emit(projectile.x, projectile.y, count, color, speed, projectile.muzzleEffect === "rocket" ? 0.3 : 0.18, {
      direction: direction + Math.PI,
      spread: projectile.muzzleEffect === "flame" ? 1.2 : 0.9,
      gravity: projectile.muzzleEffect === "rocket" ? -8 : 0,
      glow: projectile.muzzleEffect !== "rocket",
      size: projectile.muzzleEffect === "rocket" ? 3 : projectile.critical ? 3 : 2,
    });
  }

  emitProjectileImpact(projectile: Projectile, critical = false, lowFx = false) {
    const style = projectile.impactEffect;
    const count = lowFx ? 4
      : style === "explosion" ? 20
        : style === "electric" ? 13
          : style === "flame" ? 12
            : style === "slash" ? 10
              : critical ? 14 : 8;
    const speed = style === "explosion" ? 96
      : style === "electric" ? 78
        : style === "slash" ? 88
          : 62;
    const color = style === "explosion" ? "#FFB347"
      : style === "flame" ? "#FF7043"
        : style === "electric" ? "#8DF6FF"
          : style === "plasma" ? projectile.color
            : critical ? "#FFF3B0" : projectile.color;
    this.emit(projectile.x, projectile.y, count, color, speed, style === "explosion" ? 0.42 : 0.28, {
      gravity: style === "electric" ? 0 : 35,
      glow: style !== "slash" && style !== "spark",
      size: style === "explosion" ? 3 : critical ? 3 : 2,
    });
  }

  emitExplosion(x: number, y: number, radius: number, color: string, lowFx = false) {
    const rings = lowFx ? 1 : 2;
    for (let ring = 0; ring < rings; ring++) {
      const count = lowFx ? 8 : 14;
      for (let i = 0; i < count; i++) {
        const angle = i / count * Math.PI * 2 + ring * 0.17;
        this.emit(x, y, 1, ring === 0 ? color : "#FFE0A3", radius * (1.7 + ring * 0.45), 0.35, {
          direction: angle,
          spread: 0.04,
          gravity: 20,
          glow: true,
          size: ring === 0 ? 3 : 2,
        });
      }
    }
  }

  emitImpact(x: number, y: number, color: string, critical = false, lowFx = false) {
    this.emit(x, y, lowFx ? 4 : critical ? 14 : 8, critical ? "#FFF3B0" : color, critical ? 86 : 62, critical ? 0.36 : 0.25, {
      gravity: 40,
      glow: critical,
      size: critical ? 3 : 2,
    });
  }

  emitDamage(x: number, y: number, lowFx = false) {
    this.emit(x, y, lowFx ? 4 : 9, "#FF5D73", 72, 0.32, { gravity: 55, size: 2 });
  }

  emitPickup(pickup: Pickup, lowFx = false) {
    const color = pickup.type === "coin" ? "#F1C40F"
      : pickup.type === "hp" ? "#FF5D73"
        : pickup.type === "mana" ? "#45B7FF"
          : "#C77DFF";
    this.emit(pickup.x, pickup.y, lowFx ? 5 : 12, color, 52, 0.45, { gravity: -18, glow: true, size: 2 });
  }

  emitRoomClear(x = 160, y = 120, lowFx = false) {
    const colors = ["#00F2FE", "#F1C40F", "#FFFFFF"];
    for (let ring = 0; ring < (lowFx ? 1 : 3); ring++) {
      const count = lowFx ? 10 : 16;
      for (let i = 0; i < count; i++) {
        const angle = i / count * Math.PI * 2 + ring * 0.13;
        this.emit(x, y, 1, colors[ring % colors.length], 58 + ring * 24, 0.65, {
          direction: angle,
          spread: 0.02,
          gravity: 8,
          glow: true,
          size: 2,
        });
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, reducedFlashing = false) {
    ctx.save();
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = reducedFlashing ? alpha * 0.65 : alpha;
      if (p.glow && !reducedFlashing) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = p.color;
      const size = Math.max(1, Math.round(p.size * (0.45 + alpha * 0.55)));
      ctx.fillRect(Math.round(p.x - size / 2), Math.round(p.y - size / 2), size, size);
    }
    ctx.restore();
  }
}
