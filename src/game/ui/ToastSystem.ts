import { t, uiFont, type Language } from "../i18n";
import { drawPixelPanel, toneColor, type UiTone } from "../render/PixelUi";
import { easeOutCubic } from "./UiMotion";

interface ToastEntry {
  text: string;
  tone: UiTone;
  startedAt: number;
}

const SLIDE_IN_MS = 160;
const LIFETIME_MS = 2600;
const FADE_OUT_MS = 300;
const MAX_QUEUE = 4;
const MAX_VISIBLE = 3;

/**
 * Right-rail notification stack for one-off feedback ("archived to codex").
 * Anchored under the minimap column at x=312, y=128 — below the sub-weapon
 * cluster (y 99-125) and above the dungeon notice strip, so it never overlaps
 * a reserved HUD rect. Entries slide in, hold, and fade; pruning happens in
 * draw() so callers only ever push().
 */
export class ToastSystem {
  private static queue: ToastEntry[] = [];

  public static push(text: string, tone: UiTone = "cyan"): void {
    ToastSystem.queue.push({ text, tone, startedAt: Date.now() });
    if (ToastSystem.queue.length > MAX_QUEUE) {
      ToastSystem.queue.splice(0, ToastSystem.queue.length - MAX_QUEUE);
    }
  }

  public static draw(ctx: CanvasRenderingContext2D, language: Language, nowMs: number): void {
    ToastSystem.queue = ToastSystem.queue.filter(entry => nowMs - entry.startedAt < LIFETIME_MS);
    const visible = ToastSystem.queue.slice(0, MAX_VISIBLE);

    ctx.save();
    ctx.textAlign = "right";
    visible.forEach((entry, index) => {
      const age = nowMs - entry.startedAt;
      const anchorX = 312;
      const y = 128 + index * 13;
      const slide = age >= SLIDE_IN_MS ? 1 : easeOutCubic(age / SLIDE_IN_MS);
      const x = anchorX + Math.round((1 - slide) * 40);
      let alpha = 1;
      if (age > LIFETIME_MS - FADE_OUT_MS) {
        alpha = Math.max(0, (LIFETIME_MS - age) / FADE_OUT_MS);
      }
      ctx.globalAlpha = alpha;

      ctx.font = uiFont(language, 6, true);
      const maxTextWidth = 84;
      let text = entry.text;
      if (ctx.measureText(text).width > maxTextWidth) {
        while (text.length > 1 && ctx.measureText(`${text}…`).width > maxTextWidth) {
          text = text.slice(0, -1);
        }
        text = `${text}…`;
      }
      const textWidth = Math.ceil(ctx.measureText(text).width);
      const panelWidth = textWidth + 12;

      drawPixelPanel(ctx, x - panelWidth, y, panelWidth, 11, entry.tone);
      ctx.fillStyle = toneColor(entry.tone);
      ctx.fillText(text, x - 6, y + 8);
    });
    ctx.restore();
  }

  public static clear(): void {
    ToastSystem.queue = [];
  }

  /** Test hook: snapshot the pending queue. */
  public static pending(): readonly ToastEntry[] {
    return ToastSystem.queue;
  }
}

/** Convenience: localized "archived to codex" toast text. */
export function archivedToastText(name: string, language: Language): string {
  return t(language, "toast.archived", { name });
}
