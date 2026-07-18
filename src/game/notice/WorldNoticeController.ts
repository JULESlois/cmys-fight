export type WorldNoticeTone = "neutral" | "yellow" | "red" | "cyan";

export interface BottomNotice {
  kind: "bottom";
  text: string;
  tone: WorldNoticeTone;
  duration: number;
  remaining: number;
}

export interface RegionNotice {
  kind: "region";
  title: string;
  subtitle?: string;
  duration: number;
  remaining: number;
}

export class WorldNoticeController {
  private bottom: BottomNotice | null = null;
  private region: RegionNotice | null = null;

  public update(dt: number): void {
    const elapsed = Math.max(0, dt);
    if (this.bottom) {
      this.bottom.remaining = Math.max(0, this.bottom.remaining - elapsed);
      if (this.bottom.remaining <= 0) this.bottom = null;
    }
    if (this.region) {
      this.region.remaining = Math.max(0, this.region.remaining - elapsed);
      if (this.region.remaining <= 0) this.region = null;
    }
  }

  public showBottom(text: string, tone: WorldNoticeTone = "yellow", duration = 2.8): void {
    this.bottom = {
      kind: "bottom",
      text,
      tone,
      duration,
      remaining: duration,
    };
  }

  public showRegion(title: string, subtitle?: string, duration = 3.2): void {
    this.region = {
      kind: "region",
      title,
      subtitle,
      duration,
      remaining: duration,
    };
  }

  public getBottom(): Readonly<BottomNotice> | null {
    return this.bottom;
  }

  public getRegion(): Readonly<RegionNotice> | null {
    return this.region;
  }

  public clear(): void {
    this.bottom = null;
    this.region = null;
  }
}
