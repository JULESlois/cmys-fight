import { BUFFS, type BuffId, type BuffRarity } from "../combat/BuffSystem";

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
    confirmPrompt = "SPACE",
    cyclePrompt = "Q",
  ) {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.84)";
    ctx.fillRect(0, 0, 320, 240);
    ctx.textAlign = "center";
    ctx.fillStyle = "#F1C40F";
    ctx.font = "bold 14px monospace";
    ctx.fillText("TALENT", 160, 44);
    ctx.fillStyle = "#8E9EAB";
    ctx.font = "7px monospace";
    const rerollText = rerollsRemaining > 0 ? `   R ×${rerollsRemaining}` : "";
    ctx.fillText(`[${cyclePrompt}] CYCLE   [${confirmPrompt}] TAKE${rerollText}`, 160, 57);

    const cardWidth = 92;
    const cardHeight = 118;
    const gap = 8;
    const startX = 14;
    options.forEach((id, index) => {
      const buff = BUFFS[id];
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
      ctx.font = "bold 11px monospace";
      ctx.fillText(String(index + 1), x + cardWidth / 2, y + 18);
      ctx.font = "bold 8px monospace";
      ctx.fillText(buff.name, x + cardWidth / 2, y + 38);
      ctx.font = "6px monospace";
      ctx.fillStyle = "#8E9EAB";
      ctx.fillText((buff.series ?? buff.category).toUpperCase(), x + cardWidth / 2, y + 50);

      const words = buff.description.split(" ");
      const lines: string[] = [];
      let line = "";
      for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (next.length > 20) {
          lines.push(line);
          line = word;
        } else {
          line = next;
        }
      }
      if (line) lines.push(line);
      ctx.fillStyle = "#ECF0F1";
      ctx.font = "7px monospace";
      lines.slice(0, 4).forEach((text, lineIndex) => {
        ctx.fillText(text, x + cardWidth / 2, y + 70 + lineIndex * 10);
      });
      ctx.fillStyle = color;
      ctx.font = "6px monospace";
      ctx.fillText(buff.rarity.toUpperCase(), x + cardWidth / 2, y + 108);
    });
    ctx.restore();
  }
}
