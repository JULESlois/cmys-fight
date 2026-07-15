import { uiFont, type Language } from "../i18n";
import { drawMeter, drawPixelButton, drawPixelPanel, UI_COLORS } from "./PixelUi";

export class MenuRenderer {
  static drawPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    drawPixelPanel(ctx, x, y, w, h, "cyan");
  }

  static drawTitle(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    language: Language = "en",
    size = 24,
  ) {
    ctx.fillStyle = UI_COLORS.cyan;
    ctx.font = uiFont(language, size, true);
    ctx.textAlign = "center";
    ctx.fillText(text, x, y);
    // Glitch shadow
    ctx.fillStyle = "rgba(232, 91, 101, 0.52)";
    ctx.fillText(text, x + 2, y);
    ctx.textAlign = "left";
  }

  static drawButton(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, selected: boolean, language: Language = "en") {
    drawPixelButton(ctx, x - 10, y - 11, 120, 18, selected, "cyan");
    ctx.font = uiFont(language, 12, selected);
    if (selected) {
      // Cursor animation
      const t = Date.now() / 200;
      const cursorX = x - 5 + Math.sin(t) * 2;
      ctx.fillStyle = UI_COLORS.cyan;
      ctx.fillRect(cursorX, y - 8, 4, 14);
      ctx.fillStyle = UI_COLORS.white;
      ctx.fillText("  " + text, x, y);
    } else {
      ctx.fillStyle = UI_COLORS.text;
      ctx.fillText("  " + text, x, y);
    }
  }

  static drawStatBar(ctx: CanvasRenderingContext2D, label: string, val: number, max: number, x: number, y: number, color: string, width = 50) {
    ctx.fillStyle = UI_COLORS.white;
    ctx.font = "7px monospace";
    ctx.fillText(label, x, y);
    const ratio = max > 0 ? Math.max(0, Math.min(1, val / max)) : 0;
    drawMeter(ctx, x + 27, y - 7, width, 5, ratio, color, 5);
  }
}
