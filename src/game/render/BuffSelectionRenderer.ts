import { BUFFS, type BuffId, type BuffRarity } from "../combat/BuffSystem";
import { categoryLabel, getBuffText, rarityLabel, seriesLabel, t, uiFont, wrapLocalized, type Language } from "../i18n";

const RARITY_COLORS: Record<BuffRarity, string> = {
  common: "#BDC3C7",
  uncommon: "#2ECC71",
  rare: "#00F2FE",
  legendary: "#FFB347",
};

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
    ctx.fillStyle = "rgba(0, 0, 0, 0.84)";
    ctx.fillRect(0, 0, 320, 240);
    ctx.textAlign = "center";
    ctx.fillStyle = "#F1C40F";
    ctx.font = uiFont(language, 14, true);
    ctx.fillText(t(language, "buff.title"), 160, 44);
    ctx.fillStyle = "#8E9EAB";
    ctx.font = uiFont(language, 7);
    const rerollText = rerollsRemaining > 0
      ? t(language, "buff.reroll", { prompt: rerollPrompt, count: rerollsRemaining })
      : "";
    ctx.fillText(t(language, "buff.footer", { cycle: cyclePrompt, confirm: confirmPrompt, reroll: rerollText }), 160, 57);

    const cardWidth = 92;
    const cardHeight = 118;
    const gap = 8;
    const startX = 14;
    options.forEach((id, index) => {
      const buff = BUFFS[id];
      const localized = getBuffText(id, buff, language);
      const x = startX + index * (cardWidth + gap);
      const y = 70;
      const color = RARITY_COLORS[buff.rarity];
      ctx.fillStyle = "rgba(12, 18, 30, 0.96)";
      ctx.fillRect(x, y, cardWidth, cardHeight);
      const selected = index === selectedIndex;
      ctx.strokeStyle = selected ? "#FFFFFF" : color;
      ctx.lineWidth = selected ? 3 : 2;
      ctx.strokeRect(x, y, cardWidth, cardHeight);
      if (selected) {
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(x + 3, y + 3, cardWidth - 6, cardHeight - 6);
      }
      ctx.fillStyle = color;
      ctx.font = uiFont(language, 11, true);
      ctx.fillText(String(index + 1), x + cardWidth / 2, y + 18);
      ctx.font = uiFont(language, language === "zh-CN" ? 7 : 8, true);
      ctx.fillText(localized.name, x + cardWidth / 2, y + 38);
      ctx.font = uiFont(language, 6);
      ctx.fillStyle = "#8E9EAB";
      const group = buff.series ? seriesLabel(buff.series, language) : categoryLabel(buff.category, language);
      ctx.fillText(group, x + cardWidth / 2, y + 50);

      const lines = wrapLocalized(localized.description, language === "zh-CN" ? 18 : 20);
      ctx.fillStyle = "#ECF0F1";
      ctx.font = uiFont(language, 7);
      lines.slice(0, 4).forEach((text, lineIndex) => {
        ctx.fillText(text, x + cardWidth / 2, y + 70 + lineIndex * 10);
      });
      ctx.fillStyle = color;
      ctx.font = uiFont(language, 6);
      ctx.fillText(rarityLabel(buff.rarity, language), x + cardWidth / 2, y + 108);
    });
    ctx.restore();
  }
}
