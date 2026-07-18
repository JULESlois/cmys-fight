import type { Language } from "../i18n";
import { uiFont } from "../i18n";
import { drawPixelPanel, UI_COLORS } from "../render/PixelUi";
import type { BottomNotice, RegionNotice, WorldNoticeTone } from "./WorldNoticeController";

function fadeAlpha(remaining: number, duration: number): number {
  const elapsed = duration - remaining;
  const fadeIn = Math.min(1, elapsed / 0.18);
  const fadeOut = Math.min(1, remaining / 0.35);
  return Math.max(0, Math.min(fadeIn, fadeOut));
}

function panelTone(tone: WorldNoticeTone): "neutral" | "yellow" | "red" | "cyan" {
  return tone;
}

export class WorldNoticeRenderer {
  public static drawBottom(ctx: CanvasRenderingContext2D, notice: BottomNotice, language: Language): void {
    ctx.save();
    ctx.globalAlpha = fadeAlpha(notice.remaining, notice.duration);
    drawPixelPanel(ctx, 43, 207, 234, 23, panelTone(notice.tone), true);
    ctx.fillStyle = UI_COLORS.white;
    ctx.font = uiFont(language, 7, true);
    ctx.textAlign = "center";
    ctx.fillText(notice.text, 160, 222);
    ctx.restore();
  }

  public static drawRegion(ctx: CanvasRenderingContext2D, notice: RegionNotice, language: Language): void {
    ctx.save();
    ctx.globalAlpha = fadeAlpha(notice.remaining, notice.duration);
    const hasSubtitle = Boolean(notice.subtitle);
    drawPixelPanel(ctx, 82, 35, 156, hasSubtitle ? 32 : 23, "neutral", true);
    ctx.fillStyle = UI_COLORS.white;
    ctx.font = uiFont(language, hasSubtitle ? 8 : 9, true);
    ctx.textAlign = "center";
    ctx.fillText(notice.title, 160, hasSubtitle ? 48 : 51);
    if (notice.subtitle) {
      ctx.fillStyle = UI_COLORS.muted;
      ctx.font = uiFont(language, 6, true);
      ctx.fillText(notice.subtitle, 160, 61);
    }
    ctx.restore();
  }

  public static draw(
    ctx: CanvasRenderingContext2D,
    notices: { bottom: BottomNotice | null; region: RegionNotice | null },
    language: Language,
  ): void {
    if (notices.region) this.drawRegion(ctx, notices.region, language);
    if (notices.bottom) this.drawBottom(ctx, notices.bottom, language);
  }
}
