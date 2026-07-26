import { SubWeaponSystem } from "../combat/SubWeaponSystem";
import { WeaponController } from "../combat/WeaponController";
import { ResourceStrategies } from "../combat/WeaponResourceStrategies";
import { SUB_WEAPONS } from "../data/subweapons";
import { WEAPONS, type WeaponData } from "../data/weapons";
import type { Player } from "../entities/Player";
import { t, uiFont, type Language } from "../i18n";
import { HUD_LAYOUT, type HudRect } from "./HudLayout";
import { drawPixelPanel, drawUiIcon, rarityColor, UI_COLORS } from "./PixelUi";
import { SpriteRenderer } from "./SpriteRenderer";

export interface WeaponHudDrawOptions {
  bounds?: HudRect;
  activeNameOverride?: string;
  standbyNameOverride?: string;
}

/**
 * Clamps a weapon name to the available width. This runs every frame, so the
 * fit is found by bisection instead of trimming one character at a time — a
 * long name costs ~log2(n) measureText calls rather than n.
 */
function fitText(
  ctx: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
): string {
  const normalized = value.toUpperCase();
  if (ctx.measureText(normalized).width <= maxWidth) return normalized;

  let low = 1;
  let high = normalized.length - 1;
  let best = 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (ctx.measureText(`${normalized.slice(0, mid)}…`).width <= maxWidth) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return `${normalized.slice(0, best)}…`;
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

function drawResourceTrack(
  ctx: CanvasRenderingContext2D,
  player: Player,
  slotIndex: 0 | 1,
  x: number,
  y: number,
  width: number,
): void {
  const slot = player.weaponLoadout.slots[slotIndex];
  if (!slot) return;
  const weapon = WEAPONS[slot.weaponId];
  if (!weapon) return;
  
  const strategy = ResourceStrategies[slot.resourceType];
  if (!strategy) return;
  
  const ratio = strategy.getRatio(slot, weapon);
  const color = slot.resourceType === "heat" ? (slot.customState.overheatTimer > 0 ? UI_COLORS.red : UI_COLORS.orange) 
    : slot.resourceType === "battery" ? UI_COLORS.cyan 
    : slot.resourceType === "magazine" ? UI_COLORS.white 
    : slot.resourceType === "charge" ? UI_COLORS.green : UI_COLORS.muted;
  
  ctx.fillStyle = "#17202A";
  ctx.fillRect(x, y, width, 4);
  
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.round(width * ratio), 4);
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
    const standbyIndex = player.weaponLoadout.activeSlot === 0 ? 1 : 0;
    const standbyId = player.weaponLoadout.slots[standbyIndex]?.weaponId;
    const standbyWeapon = standbyId ? WEAPONS[standbyId] : undefined;
    const activeSlot = player.weaponLoadout.activeSlot === 0 ? "I" : "II";
    const standbySlot = player.weaponLoadout.activeSlot === 0 ? "II" : "I";
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
    drawResourceTrack(ctx, player, player.weaponLoadout.activeSlot, trackX, bounds.y + 16, trackWidth);

    ctx.font = uiFont(language, 5, true);
    ctx.textAlign = "right";
    
    const activeSlotData = player.weaponLoadout.slots[player.weaponLoadout.activeSlot];
    const resourceVal = activeSlotData?.resourceState.value ?? 0;
    const resourceMax = activeSlotData?.resourceState.max ?? 0;
    
    const energyCost = WeaponController.getEnergyCost(player, activeWeapon.id);
    ctx.fillStyle = activeSlotData && ResourceStrategies[activeSlotData.resourceType] && !ResourceStrategies[activeSlotData.resourceType].canFire(activeSlotData, activeWeapon, player, energyCost) 
      ? UI_COLORS.red 
      : UI_COLORS.white;
      
    if (activeSlotData && activeSlotData.resourceType !== "action") {
      ctx.fillText(`${Math.floor(resourceVal)}/${Math.floor(resourceMax)}`, bounds.x + bounds.width - 5, bounds.y + 27);
    }
    
    if (activeWeapon.sustainEnergyPerSecond) {
      ctx.textAlign = "left";
      ctx.fillStyle = UI_COLORS.yellow;
      ctx.fillText(`-${activeWeapon.sustainEnergyPerSecond}/S`, trackX, bounds.y + 27);
    }

    ctx.restore();
  }

  /**
   * Castlevania cluster: heart ammo plus the equipped sub-weapon slot.
   *
   * The layer announces itself through the player's own state — a sub-weapon
   * picked up or at least one heart collected. Until then the method draws
   * nothing at all, so every screen from before the layer existed stays
   * pixel-identical. (maxHearts always starts above zero, which is why it
   * cannot serve as the gate.)
   */
  public static drawSubWeaponCluster(
    ctx: CanvasRenderingContext2D,
    player: Player,
    language: Language,
    bounds: HudRect = HUD_LAYOUT.rightSubWeapon,
  ): void {
    if (!player.subWeaponId && player.hearts <= 0) return;
    const weapon = player.subWeaponId ? SUB_WEAPONS[player.subWeaponId] : undefined;

    ctx.save();
    drawPixelPanel(ctx, bounds.x, bounds.y, bounds.width, bounds.height, "neutral", true);

    // Hearts row: glyph plus count. The count reddens once the next throw is
    // unaffordable, mirroring how the weapon HUD flags an empty resource.
    drawUiIcon(ctx, "heart", bounds.x + 5, bounds.y + 4, UI_COLORS.red);
    const capacity = SubWeaponSystem.getHeartCapacity(player);
    const affordable = !weapon || player.hearts >= SubWeaponSystem.getHeartCost(player, weapon);
    ctx.font = uiFont(language, 6, true);
    ctx.textAlign = "left";
    ctx.fillStyle = affordable ? UI_COLORS.white : UI_COLORS.red;
    ctx.fillText(`${Math.floor(player.hearts)}/${capacity}`, bounds.x + 16, bounds.y + 11);

    if (SubWeaponSystem.canCrush(player)) {
      ctx.font = uiFont(language, 5, true);
      ctx.textAlign = "right";
      ctx.fillStyle = UI_COLORS.orange;
      ctx.fillText(t(language, "hud.crush"), bounds.x + bounds.width - 5, bounds.y + 11);
    }

    // Sub-weapon slot: label, then a box carrying the localized short name.
    ctx.font = uiFont(language, 5, true);
    ctx.textAlign = "left";
    ctx.fillStyle = UI_COLORS.muted;
    const label = t(language, "hud.subWeapon");
    ctx.fillText(label, bounds.x + 5, bounds.y + 21);
    const slotX = bounds.x + 5 + Math.ceil(ctx.measureText(label).width) + 3;
    const slotY = bounds.y + 14;
    const slotWidth = bounds.x + bounds.width - 5 - slotX;
    const slotHeight = 9;

    ctx.fillStyle = UI_COLORS.dark;
    ctx.fillRect(slotX, slotY, slotWidth, slotHeight);
    ctx.strokeStyle = weapon ? weapon.color : UI_COLORS.edgeSoft;
    ctx.strokeRect(slotX, slotY, slotWidth, slotHeight);

    const name = weapon
      ? t(language, `subweapon.${weapon.id}` as Parameters<typeof t>[1])
      : t(language, "hud.noSubWeapon");
    ctx.textAlign = "center";
    ctx.fillStyle = weapon ? weapon.color : UI_COLORS.muted;
    ctx.fillText(fitText(ctx, name, slotWidth - 4), slotX + slotWidth / 2, slotY + 7);

    // Cooldown reads as a dimming wipe over the slot that recedes toward zero,
    // so "ready" is simply the box at full brightness.
    const cooldownRatio = weapon && weapon.cooldown > 0
      ? Math.max(0, Math.min(1, player.subWeaponCooldown / weapon.cooldown))
      : 0;
    if (cooldownRatio > 0) {
      ctx.fillStyle = "rgba(7, 11, 18, 0.72)";
      ctx.fillRect(slotX + 1, slotY + 1, Math.round((slotWidth - 2) * cooldownRatio), slotHeight - 2);
    }

    ctx.restore();
  }
}

