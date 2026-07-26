import { uiFont, type Language } from "../i18n";
import { UI_COLORS } from "./PixelUi";

export class MenuRenderer {
  static drawPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    ctx.fillStyle = UI_COLORS.panel;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = UI_COLORS.edge;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Corners
    ctx.fillStyle = UI_COLORS.cyan;
    ctx.fillRect(x - 1, y - 1, 3, 3);
    ctx.fillRect(x + w - 2, y - 1, 3, 3);
    ctx.fillRect(x - 1, y + h - 2, 3, 3);
    ctx.fillRect(x + w - 2, y + h - 2, 3, 3);
  }

  static drawTitle(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, language: Language = "en") {
    ctx.fillStyle = UI_COLORS.cyan;
    ctx.font = uiFont(language, 24, true);
    ctx.textAlign = "center";
    ctx.fillText(text, x, y);
    // Glitch shadow
    ctx.fillStyle = "rgba(232, 91, 101, 0.5)";
    ctx.fillText(text, x + 2, y);
    ctx.textAlign = "left";
  }

  static drawButton(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, selected: boolean, language: Language = "en") {
    ctx.font = uiFont(language, 12);
    if (selected) {
      ctx.fillStyle = "rgba(57, 217, 232, 0.2)";
      ctx.fillRect(x - 10, y - 10, 120, 18);

      ctx.fillStyle = UI_COLORS.white;
      ctx.fillText("  " + text, x, y);
    } else {
      ctx.fillStyle = UI_COLORS.text;
      ctx.fillText("  " + text, x, y);
    }
  }

  static drawStatBar(ctx: CanvasRenderingContext2D, label: string, val: number, max: number, x: number, y: number, color: string, width = 50, language: Language = "en") {
    ctx.fillStyle = UI_COLORS.white;
    ctx.font = uiFont(language, 8, true);
    ctx.fillText(label, x, y);

    const w = width;
    const h = 4;
    const ratio = max > 0 ? Math.max(0, Math.min(1, val / max)) : 0;
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(x + 30, y - 6, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x + 30, y - 6, w * ratio, h);
  }
}
