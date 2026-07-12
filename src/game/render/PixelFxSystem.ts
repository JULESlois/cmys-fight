import type { Pickup } from "../entities/Pickup";
import type { Projectile } from "../entities/Projectile";

type FxParticleShape = "pixel" | "streak" | "smoke";
type FxPulseKind = "ring" | "cross";

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
  shape: FxParticleShape;
}

interface FxPulse {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
  kind: FxPulseKind;
}

export class PixelFxSystem {
  private particles: FxParticle[] = [];
  private pulses: FxPulse[] = [];

  getActiveCount(): number {
    return this.particles.length + this.pulses.length;
  }

  update(dt: number) {
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const pulse = this.pulses[i];
      pulse.life -= dt;
      if (pulse.life <= 0) this.pulses.splice(i, 1);
    }
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
    options: { direction?: number; spread?: number; gravity?: number; glow?: boolean; size?: number; shape?: FxParticleShape } = {},
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
        shape: options.shape ?? "pixel",
      });
    }
    if (this.particles.length > 220) this.particles.splice(0, this.particles.length - 220);
  }

  private emitPulse(x: number, y: number, radius: number, color: string, kind: FxPulseKind, life = 0.24): void {
    this.pulses.push({ x, y, radius, color, kind, life, maxLife: life });
    if (this.pulses.length > 28) this.pulses.splice(0, this.pulses.length - 28);
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
    const x = projectile.x;
    const y = projectile.y;
    const direction = Math.atan2(projectile.vy, projectile.vx) + Math.PI;

    if (style === "explosion") {
      this.emitPulse(x, y, Math.max(8, projectile.explosionRadius * 0.45), "#FFB347", "ring", 0.32);
      this.emit(x, y, lowFx ? 4 : 9, "#7C685C", 34, 0.42, { gravity: -10, size: 3, shape: "smoke" });
      this.emit(x, y, lowFx ? 5 : 13, "#FFE0A3", 96, 0.3, { direction, spread: Math.PI * 1.7, gravity: 28, glow: true, size: 2, shape: "streak" });
      return;
    }

    if (style === "electric") {
      this.emitPulse(x, y, 9, "#8DF6FF", "cross", 0.2);
      this.emit(x, y, lowFx ? 4 : 12, "#8DF6FF", 82, 0.24, { direction, spread: Math.PI * 1.5, glow: true, size: 2, shape: "streak" });
      return;
    }

    if (style === "plasma") {
      this.emitPulse(x, y, Math.max(6, projectile.radius * 2.5), projectile.color, "ring", 0.24);
      this.emit(x, y, lowFx ? 4 : 10, projectile.color, 58, 0.3, { gravity: 8, glow: true, size: critical ? 3 : 2 });
      return;
    }

    if (style === "flame") {
      this.emit(x, y, lowFx ? 3 : 7, "#6D5148", 28, 0.38, { gravity: -18, size: 3, shape: "smoke" });
      this.emit(x, y, lowFx ? 4 : 10, "#FF7043", 68, 0.27, { direction, spread: Math.PI * 1.4, gravity: 24, glow: true, size: 2, shape: "streak" });
      return;
    }

    if (style === "slash") {
      this.emitPulse(x, y, 8, critical ? "#FFF3B0" : projectile.color, "cross", 0.16);
      this.emit(x, y, lowFx ? 4 : 10, critical ? "#FFF3B0" : projectile.color, 92, 0.2, { direction, spread: 1.25, gravity: 0, glow: critical, size: 2, shape: "streak" });
      return;
    }

    this.emit(x, y, lowFx ? 4 : critical ? 14 : 8, critical ? "#FFF3B0" : projectile.color, critical ? 88 : 64, critical ? 0.34 : 0.24, {
      direction,
      spread: Math.PI * 1.35,
      gravity: 38,
      glow: critical,
      size: critical ? 3 : 2,
      shape: "streak",
    });
  }

  emitExplosion(x: number, y: number, radius: number, color: string, lowFx = false) {
    this.emitPulse(x, y, radius * 0.45, color, "ring", 0.32);
    if (!lowFx) this.emitPulse(x, y, radius * 0.72, "#FFE0A3", "ring", 0.42);
    this.emit(x, y, lowFx ? 4 : 9, "#675B55", radius * 0.55, 0.5, { gravity: -16, size: 4, shape: "smoke" });
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
          shape: "streak",
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
    for (const pulse of this.pulses) {
      const alpha = Math.max(0, pulse.life / pulse.maxLife);
      const progress = 1 - alpha;
      const radius = Math.max(2, Math.round(pulse.radius * (0.45 + progress * 0.75)));
      ctx.globalAlpha = reducedFlashing ? alpha * 0.42 : alpha * 0.72;
      ctx.fillStyle = pulse.color;
      if (pulse.kind === "ring") {
        const segment = Math.max(2, Math.round(radius * 0.38));
        ctx.fillRect(pulse.x - radius, pulse.y - radius, segment, 2);
        ctx.fillRect(pulse.x + radius - segment, pulse.y - radius, segment, 2);
        ctx.fillRect(pulse.x - radius, pulse.y + radius - 2, segment, 2);
        ctx.fillRect(pulse.x + radius - segment, pulse.y + radius - 2, segment, 2);
        ctx.fillRect(pulse.x - radius, pulse.y - radius, 2, segment);
        ctx.fillRect(pulse.x + radius - 2, pulse.y - radius, 2, segment);
        ctx.fillRect(pulse.x - radius, pulse.y + radius - segment, 2, segment);
        ctx.fillRect(pulse.x + radius - 2, pulse.y + radius - segment, 2, segment);
      } else {
        const arm = Math.max(3, Math.round(radius * 0.65));
        ctx.fillRect(Math.round(pulse.x - arm), Math.round(pulse.y) - 1, arm * 2, 2);
        ctx.fillRect(Math.round(pulse.x) - 1, Math.round(pulse.y - arm), 2, arm * 2);
      }
    }

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
      if (p.shape === "streak") {
        const speed = Math.hypot(p.vx, p.vy);
        const length = Math.max(3, Math.min(8, Math.round(size + speed / 26)));
        ctx.save();
        ctx.translate(Math.round(p.x), Math.round(p.y));
        ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.fillRect(-length, -Math.max(1, Math.floor(size / 3)), length, Math.max(1, Math.ceil(size / 2)));
        ctx.restore();
      } else if (p.shape === "smoke") {
        ctx.globalAlpha *= 0.56;
        ctx.fillRect(Math.round(p.x - size / 2), Math.round(p.y - size / 2), size + 1, size + 1);
        ctx.fillRect(Math.round(p.x - size), Math.round(p.y), Math.max(1, size - 1), Math.max(1, size - 1));
      } else {
        ctx.fillRect(Math.round(p.x - size / 2), Math.round(p.y - size / 2), size, size);
      }
    }
    ctx.restore();
  }

}
