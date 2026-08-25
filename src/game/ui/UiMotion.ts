/**
 * Shared UI tween primitives. Every menu/HUD motion in the game derives from
 * these so easing stays consistent and smoke-testable without a canvas.
 */

/** Cubic ease-out: fast start, gentle landing. */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
}

/** Back ease-out: overshoots the target slightly then settles (punch-in). */
export function easeOutBack(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

/** Smoothstep: symmetric, zero-derivative at both ends. */
export function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/** A value that animates from `from` to `to` over `duration` seconds. */
export class Tween {
  private elapsed = 0;
  private from: number;
  private to: number;
  private duration: number;
  private ease: (t: number) => number;
  private done = false;
  private onDone?: () => void;

  constructor(from: number, to: number, duration: number, ease: (t: number) => number = easeOutCubic, onDone?: () => void) {
    this.from = from;
    this.to = to;
    this.duration = Math.max(1e-4, duration);
    this.ease = ease;
    this.onDone = onDone;
  }

  /** Current value; 0 once finished. */
  update(dt: number): number {
    if (this.done) return 0;
    this.elapsed += dt;
    if (this.elapsed >= this.duration) {
      this.done = true;
      const value = this.to;
      if (this.onDone) this.onDone();
      return value;
    }
    return this.from + (this.to - this.from) * this.ease(this.elapsed / this.duration);
  }

  isDone(): boolean {
    return this.done;
  }

  /** Test hook. */
  getProgress(): number {
    return Math.max(0, Math.min(1, this.elapsed / this.duration));
  }
}

/** Runs several tweens and advances them together; reports when all are done. */
export class TweenGroup {
  private tweens: Tween[] = [];

  add(from: number, to: number, duration: number, ease?: (t: number) => number, onDone?: () => void): Tween {
    const tween = new Tween(from, to, duration, ease, onDone);
    this.tweens.push(tween);
    return tween;
  }

  update(dt: number): void {
    for (const tween of this.tweens) tween.update(dt);
    this.tweens = this.tweens.filter(tween => !tween.isDone());
  }

  isIdle(): boolean {
    return this.tweens.length === 0;
  }

  clear(): void {
    this.tweens.length = 0;
  }
}

/**
 * Menu cursor pulse: a 0..1 oscillation used for focus ring breathing.
 * reducedFlashing keeps the swing shallow so it never strobes.
 */
export function cursorPulse(time: number, reducedFlashing = false): number {
  if (reducedFlashing) return 0.5;
  return 0.5 + 0.5 * Math.sin(time * 5);
}
