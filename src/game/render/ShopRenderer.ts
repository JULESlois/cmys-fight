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
import { drawBadge, drawPixelPanel, drawUiIcon, UI_COLORS, type UiTone } from "./PixelUi";
import { MerchantRenderer } from "./MerchantRenderer";
import { SpriteRenderer } from "./SpriteRenderer";

const RARITY_COLORS: Record<string, string> = {
  common: UI_COLORS.text,
  uncommon: UI_COLORS.green,
  rare: UI_COLORS.cyan,
  legendary: UI_COLORS.orange,
  myth: UI_COLORS.purple,
};

function rarityTone(rarity: string | undefined): UiTone {
  if (rarity === "myth") return "purple";
  if (rarity === "legendary") return "yellow";
  if (rarity === "rare") return "cyan";
  if (rarity === "uncommon") return "green";
  return "neutral";
}

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

function drawTalentSigil(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = UI_COLORS.dark;
  ctx.fillRect(x - 11, y - 9, 22, 18);
  ctx.strokeStyle = color;
  ctx.strokeRect(x - 11, y - 9, 22, 18);
  ctx.fillStyle = color;
  ctx.fillRect(x - 1, y - 7, 3, 14);
  ctx.fillRect(x - 7, y - 1, 14, 3);
  ctx.fillRect(x - 6, y - 6, 3, 3);
  ctx.fillRect(x + 4, y + 4, 3, 3);
}

export class ShopRenderer {
  static drawMerchant(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, theme = "forest") {
    MerchantRenderer.drawMerchant(ctx, x, y, time, theme);
  }

  static drawOverlay(
    ctx: CanvasRenderingContext2D,
    stock: ShopItem[],
    coins: number,
    failure?: ShopPurchaseFailure,
    selectedIndex = 0,
    confirmPrompt = "K",
    cyclePrompt = "A/D",
    closePrompt = "ESC",
    language: Language = "en",
  ) {
    ctx.save();
    ctx.fillStyle = "rgba(2, 5, 10, 0.9)";
    ctx.fillRect(0, 0, 320, 240);
    drawPixelPanel(ctx, 12, 14, 296, 211, "yellow", true);

    ctx.textAlign = "left";
    ctx.fillStyle = UI_COLORS.white;
    ctx.font = uiFont(language, 13, true);
    ctx.fillText(t(language, "shop.title"), 25, 36);
    drawUiIcon(ctx, "coin", 247, 25, UI_COLORS.yellow);
    ctx.textAlign = "right";
    ctx.fillStyle = UI_COLORS.yellow;
    ctx.font = uiFont(language, 8, true);
    ctx.fillText(t(language, "shop.coins", { coins }), 294, 34);

    const width = 68;
    const gap = 4;
    const startX = 20;
    stock.slice(0, 4).forEach((item, index) => {
      const display = getItemText(item, language);
      const x = startX + index * (width + gap);
      const y = index === selectedIndex ? 48 : 51;
      const selected = index === selectedIndex;
      const tone = item.purchased ? "neutral" : rarityTone(item.rarity);
      const color = item.purchased ? UI_COLORS.muted : RARITY_COLORS[item.rarity ?? "common"] ?? UI_COLORS.yellow;
      drawPixelPanel(ctx, x, y, width, 145, tone, selected);
      if (selected) {
        ctx.strokeStyle = UI_COLORS.white;
        ctx.strokeRect(x + 2, y + 2, width - 4, 141);
      }

      ctx.fillStyle = UI_COLORS.dark;
      ctx.fillRect(x + 7, y + 8, width - 14, 35);
      ctx.strokeStyle = color;
      ctx.strokeRect(x + 7, y + 8, width - 14, 35);
      if (item.kind === "weapon" && item.weaponId && WEAPONS[item.weaponId]) {
        SpriteRenderer.drawPixelSprite(ctx, `weapon_${item.weaponId}`, x + width / 2, y + 28, 1);
      } else {
        drawTalentSigil(ctx, x + width / 2, y + 25, color);
      }

      ctx.fillStyle = color;
      ctx.font = uiFont(language, language === "zh-CN" ? 6 : 7, true);
      ctx.textAlign = "center";
      wrapLocalized(display.name, language === "zh-CN" ? 12 : 13).slice(0, 2)
        .forEach((line, lineIndex) => ctx.fillText(line, x + width / 2, y + 54 + lineIndex * 8));
      ctx.fillStyle = UI_COLORS.muted;
      ctx.font = uiFont(language, 6, true);
      ctx.fillText(display.kind, x + width / 2, y + 73);
      ctx.fillStyle = UI_COLORS.text;
      ctx.font = uiFont(language, 6);
      wrapLocalized(display.description, language === "zh-CN" ? 13 : 15).slice(0, 4)
        .forEach((line, lineIndex) => ctx.fillText(line, x + width / 2, y + 88 + lineIndex * 8));

      drawBadge(
        ctx,
        item.purchased ? t(language, "common.sold") : t(language, "shop.price", { price: item.price }),
        x + 7,
        y + 131,
        width - 14,
        language,
        item.purchased ? "neutral" : "yellow",
      );
      if (item.purchased) {
        ctx.strokeStyle = UI_COLORS.red;
        ctx.beginPath();
        ctx.moveTo(x + 8, y + 10);
        ctx.lineTo(x + width - 8, y + 41);
        ctx.stroke();
      }
    });

    ctx.textAlign = "center";
    if (failure) {
      ctx.fillStyle = UI_COLORS.red;
      ctx.font = uiFont(language, 8, true);
      ctx.fillText(t(language, `shop.failure.${failure}` as Parameters<typeof t>[1]), 160, 207);
    } else {
      ctx.fillStyle = UI_COLORS.muted;
      ctx.font = uiFont(language, 7);
      ctx.fillText(t(language, "shop.footer", { cycle: cyclePrompt, confirm: confirmPrompt, close: closePrompt }), 160, 209);
    }
    ctx.restore();
  }
}
