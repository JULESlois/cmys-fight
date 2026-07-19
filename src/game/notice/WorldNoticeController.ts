export type WorldNoticeTone = "neutral" | "yellow" | "red" | "cyan";

export interface BottomNoticeRequest {
  id?: string;
  text: string;
  tone?: WorldNoticeTone;
  duration?: number;
  replaceExisting?: boolean;
  dedupe?: boolean;
  dedupeWindow?: number;
}

export interface BottomNotice {
  kind: "bottom";
  id?: string;
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
  private elapsed = 0;
  private readonly recentBottomIds = new Map<string, number>();

  public update(dt: number): void {
    const elapsed = Math.max(0, dt);
    this.elapsed += elapsed;
    if (this.bottom) {
      this.bottom.remaining = Math.max(0, this.bottom.remaining - elapsed);
      if (this.bottom.remaining <= 0) this.bottom = null;
    }
    if (this.region) {
      this.region.remaining = Math.max(0, this.region.remaining - elapsed);
      if (this.region.remaining <= 0) this.region = null;
    }
    for (const [id, shownAt] of this.recentBottomIds) {
      if (this.elapsed - shownAt > 30) this.recentBottomIds.delete(id);
    }
  }

  public showBottom(text: string, tone?: WorldNoticeTone, duration?: number): boolean;
  public showBottom(request: BottomNoticeRequest): boolean;
  public showBottom(
    requestOrText: string | BottomNoticeRequest,
    tone: WorldNoticeTone = "yellow",
    duration = 2.8,
  ): boolean {
    const request: BottomNoticeRequest = typeof requestOrText === "string"
      ? { text: requestOrText, tone, duration }
      : requestOrText;
    const noticeId = request.id;
    const dedupeWindow = Math.max(0, request.dedupeWindow ?? 8);
    if (request.dedupe && noticeId) {
      if (this.bottom?.id === noticeId) return false;
      const lastShown = this.recentBottomIds.get(noticeId);
      if (lastShown !== undefined && this.elapsed - lastShown <= dedupeWindow) return false;
    }
    if (request.replaceExisting === false && this.bottom) return false;

    const resolvedDuration = Math.max(0.1, request.duration ?? 2.8);
    this.bottom = {
      kind: "bottom",
      id: noticeId,
      text: request.text,
      tone: request.tone ?? "yellow",
      duration: resolvedDuration,
      remaining: resolvedDuration,
    };
    if (noticeId) this.recentBottomIds.set(noticeId, this.elapsed);
    return true;
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
    this.recentBottomIds.clear();
    this.elapsed = 0;
  }
}
