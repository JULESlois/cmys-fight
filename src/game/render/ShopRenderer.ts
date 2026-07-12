import { BUFFS } from "../combat/BuffSystem";
import { WEAPONS } from "../data/weapons";
import {
  categoryLabel,
  getBuffText,
  getWeaponMechanic,
  rarityLabel,
  seriesLabel,
  t,
  uiFont,
  wrapLocalized,
  type Language,
} from "../i18n";
import type { ShopItem, ShopPurchaseFailure } from "../shop/ShopSystem";

const RARITY_COLORS: Record<string, string> = {
  common: "#BDC3C7",
  uncommon: "#2ECC71",
  rare: "#00F2FE",
  legendary: "#FFB347",
};

function getItemText(item: ShopItem, language: Language): { name: string; description: string; kind: string } {
  if (item.kind === "buff" && item.buffId) {
    const buff = BUFFS[item.buffId];
    const localized = getBuffText(item.buffId, buff, language);
    return { name: localized.name, description: localized.description, kind: t(language, "shop.talent") };
  }
  if (item.kind === "weapon" && item.weaponId) {
    const weapon = WEAPONS[item.weaponId];
    const prefix = [
      weapon.series ? seriesLabel(weapon.series, language) : "",
      rarityLabel(weapon.rarity, language),
      categoryLabel(weapon.category, language),
    ].filter(Boolean).join(" ");
    return {
      name: weapon.name.toUpperCase(),
      description: `${prefix}${language === "zh-CN" ? "。" : ". "}${getWeaponMechanic(weapon.id, weapon.mechanic, language)}`,
      kind: t(language, "shop.weapon"),
    };
  }
  return { name: item.name, description: item.description, kind: item.kind.toUpperCase() };
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
    language: Language = "en",
  ) {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.88)";
    ctx.fillRect(0, 0, 320, 240);
    ctx.textAlign = "center";
    ctx.fillStyle = "#F1C40F";
    ctx.font = uiFont(language, 14, true);
    ctx.fillText(t(language, "shop.title"), 160, 30);
    ctx.fillStyle = "#ECF0F1";
    ctx.font = uiFont(language, 8);
    ctx.fillText(t(language, "shop.coins", { coins }), 160, 44);

    const width = 70;
    const gap = 6;
    const startX = 11;
    stock.slice(0, 4).forEach((item, index) => {
      const display = getItemText(item, language);
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
      ctx.font = uiFont(language, 11, true);
      ctx.fillText(String(index + 1), x + width / 2, y + 17);
      ctx.font = uiFont(language, language === "zh-CN" ? 6 : 7, true);
      wrapLocalized(display.name, language === "zh-CN" ? 18 : 14).slice(0, 2).forEach((line, lineIndex) => {
        ctx.fillText(line, x + width / 2, y + 34 + lineIndex * 9);
      });
      ctx.fillStyle = "#8E9EAB";
      ctx.font = uiFont(language, 6);
      ctx.fillText(display.kind, x + width / 2, y + 57);
      ctx.fillStyle = "#ECF0F1";
      wrapLocalized(display.description, language === "zh-CN" ? 14 : 16).slice(0, 4).forEach((line, lineIndex) => {
        ctx.fillText(line, x + width / 2, y + 75 + lineIndex * 9);
      });
      ctx.fillStyle = item.purchased ? "#7F8C8D" : "#F1C40F";
      ctx.font = uiFont(language, 8, true);
      ctx.fillText(item.purchased ? t(language, "common.sold") : t(language, "shop.price", { price: item.price }), x + width / 2, y + 122);
    });

    if (failure) {
      ctx.fillStyle = "#E74C3C";
      ctx.font = uiFont(language, 9, true);
      ctx.fillText(t(language, `shop.failure.${failure}` as Parameters<typeof t>[1]), 160, 211);
    } else {
      ctx.fillStyle = "#8E9EAB";
      ctx.font = uiFont(language, 7);
      ctx.fillText(t(language, "shop.footer", { cycle: cyclePrompt, confirm: confirmPrompt, close: closePrompt }), 160, 211);
    }
    ctx.restore();
  }
}
