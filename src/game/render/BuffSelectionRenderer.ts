import { BUFFS, type BuffId, type BuffRarity } from "../combat/BuffSystem";
import { categoryLabel, getBuffText, rarityLabel, seriesLabel, t, uiFont, wrapLocalized, type Language } from "../i18n";
import { drawBadge, drawPixelPanel, UI_COLORS } from "./PixelUi";

const RARITY_COLORS: Record<BuffRarity, string> = {
  common: UI_COLORS.text,
  uncommon: UI_COLORS.green,
  rare: UI_COLORS.cyan,
};

function drawBuffSigil(ctx: CanvasRenderingContext2D, code: string, x: number, y: number, color: string, selected: boolean): void {
  ctx.fillStyle = UI_COLORS.dark;
  ctx.fillRect(x - 12, y - 12, 24, 24);
  ctx.strokeStyle = selected ? UI_COLORS.white : color;
  ctx.lineWidth = selected ? 2 : 1;
  ctx.strokeRect(x - 12, y - 12, 24, 24);
  ctx.fillStyle = color;
  ctx.fillRect(x - 1, y - 9, 3, 18);
  ctx.fillRect(x - 9, y - 1, 18, 3);
  ctx.fillRect(x - 6, y - 6, 4, 4);
  ctx.fillRect(x + 3, y + 3, 4, 4);
  ctx.fillStyle = UI_COLORS.white;
  ctx.font = "bold 5px monospace";
  ctx.textAlign = "center";
  ctx.fillText(code, x, y + 2);
}

export class BuffSelectionRenderer {
  static draw(
    ctx: CanvasRenderingContext2D,
    options: BuffId[],
    rerollsRemaining = 0,
    selectedIndex = 0,
    confirmPrompt = "K",
    cyclePrompt = "D-PAD",
    rerollPrompt = "J",
    language: Language = "en",
  ) {
    ctx.save();
    ctx.fillStyle = "rgba(2, 5, 10, 0.88)";
    ctx.fillRect(0, 0, 320, 240);

    drawPixelPanel(ctx, 18, 18, 284, 204, "purple", true);
    ctx.textAlign = "center";
    ctx.fillStyle = UI_COLORS.white;
    ctx.font = uiFont(language, 14, true);
    ctx.fillText(t(language, "buff.title"), 160, 39);
    ctx.fillStyle = UI_COLORS.muted;
    ctx.font = uiFont(language, 7);
    const rerollText = rerollsRemaining > 0
      ? t(language, "buff.reroll", { prompt: rerollPrompt, count: rerollsRemaining })
      : "";
    ctx.fillText(t(language, "buff.footer", { cycle: cyclePrompt, confirm: confirmPrompt, reroll: rerollText }), 160, 51);

    const cardWidth = 86;
    const cardHeight = 143;
    const gap = 7;
    const totalWidth = options.length * cardWidth + Math.max(0, options.length - 1) * gap;
    const startX = Math.round(160 - totalWidth / 2);
    options.forEach((id, index) => {
      const buff = BUFFS[id];
      const localized = getBuffText(id, buff, language);
      const x = startX + index * (cardWidth + gap);
      const y = index === selectedIndex ? 61 : 64;
      const color = RARITY_COLORS[buff.rarity];
      drawPixelPanel(ctx, x, y, cardWidth, cardHeight, buff.rarity === "rare" ? "cyan" : buff.rarity === "uncommon" ? "green" : "neutral", index === selectedIndex);
      if (index === selectedIndex) {
        ctx.strokeStyle = UI_COLORS.white;
        ctx.strokeRect(x + 2, y + 2, cardWidth - 4, cardHeight - 4);
      }

      drawBuffSigil(ctx, buff.shortCode, x + cardWidth / 2, y + 28, color, index === selectedIndex);
      ctx.fillStyle = color;
      ctx.font = uiFont(language, language === "zh-CN" ? 7 : 8, true);
      ctx.textAlign = "center";
      wrapLocalized(localized.name, language === "zh-CN" ? 12 : 14).slice(0, 2)
        .forEach((line, lineIndex) => ctx.fillText(line, x + cardWidth / 2, y + 52 + lineIndex * 9));

      const group = buff.series ? seriesLabel(buff.series, language) : categoryLabel(buff.category, language);
      ctx.fillStyle = UI_COLORS.muted;
      ctx.font = uiFont(language, 6, true);
      ctx.fillText(group, x + cardWidth / 2, y + 72);

      ctx.fillStyle = UI_COLORS.text;
      ctx.font = uiFont(language, 7);
      wrapLocalized(localized.description, language === "zh-CN" ? 16 : 19).slice(0, 4)
        .forEach((text, lineIndex) => ctx.fillText(text, x + cardWidth / 2, y + 88 + lineIndex * 9));

      drawBadge(ctx, rarityLabel(buff.rarity, language), x + 8, y + 129, cardWidth - 16, language, buff.rarity === "rare" ? "cyan" : buff.rarity === "uncommon" ? "green" : "neutral");
    });
    ctx.restore();
  }
}
