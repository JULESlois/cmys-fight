/**
 * Hit-stop: a short global freeze on combat entity progression when a
 * meaningful hit lands (kill / crit / player hurt). The freeze is measured in
 * 60fps frames and is intentionally tiny (2–3 frames) so it reads as impact
 * weight rather than a stutter.
 *
 * Contracts:
 * - Max-combine: requesting a longer stop while one is active extends, never
 *   stacks additively (same budget discipline as Engine.triggerScreenShake).
 * - Non-recursive: this module never emits combat events and never reads
 *   damage payloads. Callers decide when to request.
 * - Accessibility: settings.reducedFlashing shortens the freeze because the
 *   accompanying flash is suppressed.
 */
export class HitStop {
  /** Remaining freeze time in seconds. */
  private static remaining = 0;
  /** Cap any single request so a bug cannot freeze combat for seconds. */
  private static readonly MAX_SECONDS = 0.06; // ~4 frames at 60fps

  static reset(): void {
    HitStop.remaining = 0;
  }

  /**
   * @param frames 60fps frames to freeze. Clamped to MAX_SECONDS.
   * @param reducedFlashing when true the freeze is halved (flash is gone, so
   *        a long freeze would feel like a hang).
   */
  static request(frames: number, reducedFlashing = false): void {
    const scaled = reducedFlashing ? frames * 0.5 : frames;
    const seconds = Math.min(HitStop.MAX_SECONDS, scaled / 60);
    HitStop.remaining = Math.max(HitStop.remaining, seconds);
  }

  static isActive(): boolean {
    return HitStop.remaining > 0;
  }

  /** Advance the freeze timer. Call once per frame regardless of isActive(). */
  static tick(dt: number): void {
    if (HitStop.remaining > 0) HitStop.remaining = Math.max(0, HitStop.remaining - dt);
  }

  /** Test hook: remaining seconds (0 when inactive). */
  static getRemaining(): number {
    return HitStop.remaining;
  }
}
