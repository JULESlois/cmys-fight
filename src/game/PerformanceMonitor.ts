export interface PerformanceSnapshot {
  fps: number;
  frameTimeMs: number;
  degraded: boolean;
  sampleCount: number;
}

export class PerformanceMonitor {
  private samples: number[] = [];
  private lowFpsDuration = 0;
  private recoveryDuration = 0;
  private degraded = false;
  private fps = 60;

  update(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const frameMs = Math.min(250, dt * 1000);
    this.samples.push(frameMs);
    if (this.samples.length > 120) this.samples.shift();
    const averageMs = this.samples.reduce((sum, value) => sum + value, 0) / this.samples.length;
    this.fps = averageMs > 0 ? Math.min(240, 1000 / averageMs) : 60;

    if (this.fps < 45) {
      this.lowFpsDuration += dt;
      this.recoveryDuration = 0;
    } else if (this.fps > 54) {
      this.recoveryDuration += dt;
      this.lowFpsDuration = Math.max(0, this.lowFpsDuration - dt * 0.5);
    } else {
      this.recoveryDuration = 0;
    }

    if (!this.degraded && this.lowFpsDuration >= 3) this.degraded = true;
    if (this.degraded && this.recoveryDuration >= 8) {
      this.degraded = false;
      this.lowFpsDuration = 0;
      this.recoveryDuration = 0;
    }
  }

  isDegraded(): boolean {
    return this.degraded;
  }

  getSnapshot(): PerformanceSnapshot {
    return {
      fps: Math.round(this.fps),
      frameTimeMs: this.fps > 0 ? Number((1000 / this.fps).toFixed(2)) : 0,
      degraded: this.degraded,
      sampleCount: this.samples.length,
    };
  }
}
