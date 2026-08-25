import { UI_COLORS } from "./PixelUi";

export type FloatingTextKind = "damage" | "crit" | "heal" | "playerHurt" | "info";

interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  crit: boolean;
}

const KIND_COLORS: Record<FloatingTextKind, string> = {
  damage: UI_COLORS.white,
  crit: UI_COLORS.yellow,
  heal: UI_COLORS.green,
  playerHurt: UI_COLORS.red,
  info: UI_COLORS.cyan,
};

/**
 * Pooled floating combat text (damage numbers, heals, crits). Owned by a game
 * state (DungeonState) which calls update/draw each frame after the FX layer.
 *
 * Contracts:
 * - Fixed pool; overflow recycles the oldest entry so hot combat never grows.
 * - Crits render larger with a trailing "!" and a brief pop-in scale.
 * - reducedFlashing keeps full opacity (no strobing); only lifetime is shorter.
 */
export class FloatingTextRenderer {
  static readonly MAX_ENTRIES = 48;

  private entries: FloatingText[] = [];

  getActiveCount(): number {
    return this.entries.length;
  }

  spawn(x: number, y: number, text: string, kind: FloatingTextKind = "damage"): void {
    const crit = kind === "crit";
    if (this.entries.length >= FloatingTextRenderer.MAX_ENTRIES) {
      // Recycle the oldest (lowest life consumed) rather than dropping the new one.
      let oldest = 0;
      for (let i = 1; i < this.entries.length; i++) {
        if (this.entries[i].life < this.entries[oldest].life) oldest = i;
      }
      this.entries.splice(oldest, 1);
    }
    this.entries.push({
      x,
      y,
      vy: crit ? -26 : -20,
      text: crit ? `${text}!` : text,
      color: KIND_COLORS[kind],
      life: crit ? 0.9 : 0.7,
      maxLife: crit ? 0.9 : 0.7,
      crit,
    });
  }

  update(dt: number): void {
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const e = this.entries[i];
      e.life -= dt;
      if (e.life <= 0) {
        this.entries.splice(i, 1);
        continue;
      }
      e.y += e.vy * dt;
      e.vy *= Math.pow(0.9, dt * 60); // ease to a float
    }
  }

  draw(ctx: CanvasRenderingContext2D, reducedFlashing = false): void {
    if (this.entries.length === 0) return;
    ctx.save();
    ctx.textAlign = "center";
    for (const e of this.entries) {
      const progress = 1 - e.life / e.maxLife;
      const alpha = Math.max(0, Math.min(1, e.life / e.maxLife * 1.6));
      // Pop-in: crits overshoot slightly in the first 20%.
      const pop = e.crit && progress < 0.2 ? 1 + (1 - progress / 0.2) * 0.35 : 1;
      const size = Math.max(5, Math.round((e.crit ? 8 : 6) * pop));
      ctx.globalAlpha = reducedFlashing ? Math.min(1, alpha * 1.2) : alpha;
      ctx.font = `bold ${size}px monospace`;
      const px = Math.round(e.x);
      const py = Math.round(e.y);
      // 1px dark ink outline so numbers stay legible over bright floors.
      ctx.fillStyle = "#07101A";
      ctx.fillText(e.text, px - 1, py);
      ctx.fillText(e.text, px + 1, py);
      ctx.fillText(e.text, px, py - 1);
      ctx.fillText(e.text, px, py + 1);
      ctx.fillStyle = e.color;
      ctx.fillText(e.text, px, py);
    }
    ctx.restore();
  }

  clear(): void {
    this.entries.length = 0;
  }
}
