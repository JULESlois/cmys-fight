import { WeaponController } from "../combat/WeaponController";
import { WEAPONS, type WeaponData } from "../data/weapons";
import type { Player } from "../entities/Player";
import { uiFont, type Language } from "../i18n";
import { HUD_LAYOUT, type HudRect } from "./HudLayout";
import { drawPixelPanel, UI_COLORS } from "./PixelUi";
import { SpriteRenderer } from "./SpriteRenderer";

export interface WeaponHudDrawOptions {
  bounds?: HudRect;
  activeNameOverride?: string;
  standbyNameOverride?: string;
}

function rarityColor(rarity: string): string {
  if (rarity === "myth") return "#D66BFF";
  if (rarity === "legendary") return UI_COLORS.orange;
  if (rarity === "rare") return UI_COLORS.cyan;
  if (rarity === "uncommon") return UI_COLORS.green;
  return UI_COLORS.muted;
}

function fitText(
  ctx: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
): string {
  const normalized = value.toUpperCase();
  if (ctx.measureText(normalized).width <= maxWidth) return normalized;
  let result = normalized;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

function drawWeaponIcon(
  ctx: CanvasRenderingContext2D,
  weapon: WeaponData,
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  ctx.translate(x + width - 1, y + Math.floor(height / 2));
  ctx.scale(-1, 1);
  SpriteRenderer.drawPixelSprite(ctx, `weapon_${weapon.id}`, 0, 0, scale);
  ctx.restore();
}

function drawEnergyCells(
  ctx: CanvasRenderingContext2D,
  player: Player,
  weapon: WeaponData,
  x: number,
  y: number,
  width: number,
): void {
  const cells = 14;
  const gap = 1;
  const cellWidth = Math.floor((width - (cells - 1) * gap) / cells);
  const maxMana = Math.max(1, player.maxMana);
  const current = Math.max(0, Math.min(maxMana, player.mana));
  const attackCost = Math.max(0, WeaponController.getEnergyCost(player, weapon.id));
  const insufficient = current + 1e-9 < attackCost;
  const remainingAfterAttack = Math.max(0, current - attackCost);

  for (let index = 0; index < cells; index++) {
    const cellStart = index / cells * maxMana;
    const cellEnd = (index + 1) / cells * maxMana;
    let color = "#17202A";
    if (cellStart < current) color = UI_COLORS.cyan;
    if (attackCost > 0 && cellEnd > remainingAfterAttack && cellStart < current) {
      color = insufficient ? UI_COLORS.red : UI_COLORS.yellow;
    }
    ctx.fillStyle = color;
    ctx.fillRect(x + index * (cellWidth + gap), y, cellWidth, 4);
  }
}

export class WeaponHudRenderer {
  public static draw(
    ctx: CanvasRenderingContext2D,
    player: Player,
    language: Language,
    options: WeaponHudDrawOptions = {},
  ): void {
    const activeWeapon = WEAPONS[player.currentWeaponId];
    if (!activeWeapon) return;
    const bounds = options.bounds ?? HUD_LAYOUT.bottomRightWeapon;
    const standbyIndex = player.activeWeaponSlot === 0 ? 1 : 0;
    const standbyId = player.weaponSlots[standbyIndex];
    const standbyWeapon = standbyId ? WEAPONS[standbyId] : undefined;
    const activeSlot = player.activeWeaponSlot === 0 ? "I" : "II";
    const standbySlot = player.activeWeaponSlot === 0 ? "II" : "I";
    const activeName = options.activeNameOverride ?? activeWeapon.name;

    ctx.save();
    drawPixelPanel(ctx, bounds.x, bounds.y, bounds.width, bounds.height, "neutral", true);
    ctx.strokeStyle = rarityColor(activeWeapon.rarity);
    ctx.strokeRect(bounds.x + 1, bounds.y + 1, bounds.width - 2, bounds.height - 2);

    ctx.font = uiFont(language, 5, true);
    ctx.textAlign = "left";
    ctx.fillStyle = UI_COLORS.white;
    ctx.fillText(activeSlot, bounds.x + 5, bounds.y + 9);

    ctx.font = uiFont(language, 6, true);
    ctx.fillStyle = rarityColor(activeWeapon.rarity);
    const reserveWidth = standbyWeapon ? 16 : 2;
    const nameWidth = bounds.width - 25 - reserveWidth;
    ctx.fillText(fitText(ctx, activeName, nameWidth), bounds.x + 17, bounds.y + 9);

    if (standbyWeapon) {
      const reserveX = bounds.x + bounds.width - 17;
      ctx.fillStyle = "#121A22";
      ctx.fillRect(reserveX, bounds.y + 3, 13, 10);
      ctx.strokeStyle = rarityColor(standbyWeapon.rarity);
      ctx.strokeRect(reserveX, bounds.y + 3, 13, 10);
      ctx.fillStyle = UI_COLORS.muted;
      ctx.font = uiFont(language, 4, true);
      ctx.fillText(standbySlot, reserveX + 2, bounds.y + 10);
      drawWeaponIcon(ctx, standbyWeapon, reserveX + 5, bounds.y + 4, 7, 8, 0.32);
    }

    drawWeaponIcon(ctx, activeWeapon, bounds.x + 4, bounds.y + 14, 20, 18, 0.62);
    const trackX = bounds.x + 27;
    const trackWidth = bounds.width - 32;
    drawEnergyCells(ctx, player, activeWeapon, trackX, bounds.y + 16, trackWidth);

    ctx.font = uiFont(language, 5, true);
    ctx.textAlign = "right";
    ctx.fillStyle = player.mana + 1e-9 < WeaponController.getEnergyCost(player, activeWeapon.id)
      ? UI_COLORS.red
      : UI_COLORS.white;
    ctx.fillText(`${Math.floor(player.mana)}/${Math.floor(player.maxMana)}`, bounds.x + bounds.width - 5, bounds.y + 27);

    if (activeWeapon.sustainEnergyPerSecond) {
      ctx.textAlign = "left";
      ctx.fillStyle = UI_COLORS.yellow;
      ctx.fillText(`-${activeWeapon.sustainEnergyPerSecond}/S`, trackX, bounds.y + 27);
    }

    if (activeWeapon.maxHeat) {
      const heatRatio = WeaponController.getHeatRatio(player, activeWeapon.id);
      ctx.fillStyle = "#17202A";
      ctx.fillRect(trackX, bounds.y + 32, trackWidth, 3);
      ctx.fillStyle = player.weaponOverheatTimer > 0 ? UI_COLORS.red : UI_COLORS.yellow;
      ctx.fillRect(trackX, bounds.y + 32, Math.round(trackWidth * heatRatio), 3);
    }
    ctx.restore();
  }
}

