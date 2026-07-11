import type { ShopItem, ShopPurchaseFailure } from "../shop/ShopSystem";

const RARITY_COLORS: Record<string, string> = {
  common: "#BDC3C7",
  uncommon: "#2ECC71",
  rare: "#00F2FE",
  legendary: "#FFB347",
};

const FAILURE_TEXT: Record<ShopPurchaseFailure, string> = {
  sold: "ITEM ALREADY SOLD",
  coins: "NOT ENOUGH COINS",
  full_hp: "HP ALREADY FULL",
  full_armor: "ARMOR ALREADY FULL",
  owned_weapon: "WEAPON ALREADY OWNED",
  owned_buff: "TALENT ALREADY OWNED",
  buff_limit: "TALENT LIMIT REACHED",
  invalid: "ITEM UNAVAILABLE",
};

function wrap(text: string, width: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > width) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export class ShopRenderer {
  static drawMerchant(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y + Math.sin(time * 2.5)));
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(-9, 9, 18, 4);
    ctx.fillStyle = "#8E44AD";
    ctx.fillRect(-8, -4, 16, 14);
    ctx.fillStyle = "#F5CBA7";
    ctx.fillRect(-6, -12, 12, 9);
    ctx.fillStyle = "#F1C40F";
    ctx.fillRect(-8, -14, 16, 3);
    ctx.fillStyle = "#1A1C2C";
    ctx.fillRect(-3, -8, 2, 2);
    ctx.fillRect(2, -8, 2, 2);
    ctx.fillStyle = "#F39C12";
    ctx.fillRect(-12, -2, 4, 4);
    ctx.restore();
  }

  static drawOverlay(
    ctx: CanvasRenderingContext2D,
    stock: ShopItem[],
    coins: number,
    failure?: ShopPurchaseFailure,
    selectedIndex = 0,
    confirmPrompt = "SPACE",
    cyclePrompt = "Q",
    closePrompt = "ESC",
  ) {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.88)";
    ctx.fillRect(0, 0, 320, 240);
    ctx.textAlign = "center";
    ctx.fillStyle = "#F1C40F";
    ctx.font = "bold 14px monospace";
    ctx.fillText("SHOP", 160, 30);
    ctx.fillStyle = "#ECF0F1";
    ctx.font = "8px monospace";
    ctx.fillText(`COINS ${coins}`, 160, 44);

    const width = 70;
    const gap = 6;
    const startX = 11;
    stock.slice(0, 4).forEach((item, index) => {
      const x = startX + index * (width + gap);
      const y = 58;
      const color = item.purchased ? "#566573" : RARITY_COLORS[item.rarity ?? "common"] ?? "#F1C40F";
      ctx.fillStyle = item.purchased ? "rgba(35, 42, 50, 0.95)" : "rgba(12, 18, 30, 0.97)";
      ctx.fillRect(x, y, width, 132);
      const selected = index === selectedIndex;
      ctx.strokeStyle = selected ? "#FFFFFF" : color;
      ctx.lineWidth = selected ? 3 : 2;
      ctx.strokeRect(x, y, width, 132);
      if (selected) {
        ctx.fillStyle = "rgba(255,255,255,0.07)";
        ctx.fillRect(x + 3, y + 3, width - 6, 126);
      }

      ctx.fillStyle = color;
      ctx.font = "bold 11px monospace";
      ctx.fillText(String(index + 1), x + width / 2, y + 17);
      ctx.font = "bold 7px monospace";
      wrap(item.name, 14).slice(0, 2).forEach((line, lineIndex) => {
        ctx.fillText(line, x + width / 2, y + 34 + lineIndex * 9);
      });
      ctx.fillStyle = "#8E9EAB";
      ctx.font = "6px monospace";
      ctx.fillText(item.kind === "buff" ? "TALENT" : item.kind.toUpperCase(), x + width / 2, y + 57);
      ctx.fillStyle = "#ECF0F1";
      wrap(item.description, 16).slice(0, 4).forEach((line, lineIndex) => {
        ctx.fillText(line, x + width / 2, y + 75 + lineIndex * 9);
      });
      ctx.fillStyle = item.purchased ? "#7F8C8D" : "#F1C40F";
      ctx.font = "bold 8px monospace";
      ctx.fillText(item.purchased ? "SOLD" : `${item.price} COINS`, x + width / 2, y + 122);
    });

    if (failure) {
      ctx.fillStyle = "#E74C3C";
      ctx.font = "bold 9px monospace";
      ctx.fillText(FAILURE_TEXT[failure], 160, 211);
    } else {
      ctx.fillStyle = "#8E9EAB";
      ctx.font = "7px monospace";
      ctx.fillText(`[${cyclePrompt}] MOVE   [${confirmPrompt}] BUY   [${closePrompt}] EXIT`, 160, 211);
    }
    ctx.restore();
  }
}
