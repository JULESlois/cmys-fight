import { BUFFS, BuffSystem } from "../combat/BuffSystem";
import { SkillController } from "../combat/SkillController";
import { WeaponController } from "../combat/WeaponController";
import { WEAPONS } from "../data/weapons";
import type { Player } from "../entities/Player";
import type { FloorData } from "../FloorGenerator";
import { uiFont } from "../i18n";
import { SpriteRenderer } from "./SpriteRenderer";
import {
  drawBadge,
  drawMeter,
  drawPixelPanel,
  drawUiIcon,
  UI_COLORS,
  type UiTone,
} from "./PixelUi";

function splitWeaponName(name: string): string[] {
  const normalized = name.toUpperCase();
  if (normalized.length <= 10) return [normalized];
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [normalized];

  let best = [normalized];
  let bestScore = Infinity;
  for (let split = 1; split < words.length; split++) {
    const first = words.slice(0, split).join(" ");
    const second = words.slice(split).join(" ");
    const score = Math.max(first.length, second.length) * 10 + Math.abs(first.length - second.length);
    if (score < bestScore) {
      best = [first, second];
      bestScore = score;
    }
  }
  return best;
}

function rarityColor(rarity: string): string {
  if (rarity === "myth") return "#D66BFF";
  if (rarity === "legendary") return UI_COLORS.orange;
  if (rarity === "rare") return UI_COLORS.cyan;
  if (rarity === "uncommon") return UI_COLORS.green;
  return UI_COLORS.muted;
}

export class UIRenderer {
  private static lastCoinAmount: number = -1;
  private static coinDisplayUntil: number = 0;
  public static draw(ctx: CanvasRenderingContext2D, player: Player, engine: any, floor: FloorData, roomPhase = "exploration") {
    const language = engine.data.settings.language;

    // Compact player status block. Icons carry the meaning so the bars do not
    // rely on color alone.
    drawPixelPanel(ctx, 5, 5, 80, 42, "cyan", true);
    const statRows = [
      { kind: "heart" as const, y: 11, value: player.hp, max: player.maxHp, color: UI_COLORS.red },
      { kind: "shield" as const, y: 24, value: player.armor, max: Math.max(1, player.maxArmor), color: player.armorRechargeTimer <= 0 ? UI_COLORS.cyan : "#A7B2BC" },
    ];
    statRows.forEach(row => {
      drawUiIcon(ctx, row.kind, 11, row.y, row.color);
      drawMeter(ctx, 23, row.y + 1, 32, 7, row.max > 0 ? row.value / row.max : 0, row.color, 10);
      ctx.fillStyle = UI_COLORS.white;
      ctx.font = uiFont(language, 6, true);
      ctx.textAlign = "right";
      ctx.fillText(`${Math.floor(row.value)}/${row.max}`, 80, row.y + 7);
    });

    const skill = SkillController.getConfig(player.characterId);
    const skillCooldownTotal = Math.max(0.01, skill.cooldown * BuffSystem.getSkillCooldownMultiplier(player));
    const skillReady = Math.max(0, Math.min(1, 1 - player.skillCooldown / skillCooldownTotal));
    drawUiIcon(ctx, "skill", 11, 37, player.skillCooldown <= 0 ? UI_COLORS.green : UI_COLORS.purple);
    drawMeter(ctx, 23, 38, 32, 6, skillReady, player.skillCooldown <= 0 ? UI_COLORS.green : UI_COLORS.purple, 0);
    ctx.textAlign = "right";
    ctx.fillStyle = player.skillCooldown <= 0 ? UI_COLORS.green : UI_COLORS.text;
    ctx.font = uiFont(language, 5, true);
    ctx.fillText(player.skillCooldown <= 0 ? "READY" : `${player.skillCooldown.toFixed(1)}S`, 80, 43);

    let currentY = 51;
    // Compact buff strip, no pixelui.
    if (player.buffs.length > 0) {
      const visibleBuffCount = Math.min(player.buffs.length, BuffSystem.MAX_BUFFS);
      const columns = Math.min(6, visibleBuffCount);
      const rows = Math.ceil(visibleBuffCount / columns);
      const stripX = 5;
      for (let index = 0; index < visibleBuffCount; index++) {
        const id = player.buffs[index];
        const buff = BUFFS[id];
        const x = stripX + (index % columns) * 15;
        const y = currentY + Math.floor(index / columns) * 12;
        ctx.fillStyle = UI_COLORS.dark;
        ctx.fillRect(x, y, 12, 9);
        ctx.strokeStyle = rarityColor(buff.rarity);
        ctx.strokeRect(x, y, 12, 9);
        ctx.fillStyle = rarityColor(buff.rarity);
        ctx.font = uiFont(language, 5, true);
        ctx.textAlign = "center";
        ctx.fillText(buff.shortCode, x + 6, y + 7);
      }
      currentY += rows * 12 + 4;
    }

    let combatTag = "";
    let combatTagColor: string = UI_COLORS.muted;
    if (player.characterId === "mage") {
      combatTag = `ECHO ${Math.min(SkillController.MAGE_ECHO_THRESHOLD, Math.floor(player.mageArcaneCharge * 10) / 10)}/${SkillController.MAGE_ECHO_THRESHOLD}`;
      combatTagColor = UI_COLORS.purple;
    } else if (player.characterId === "michele" && player.micheleMarkTimer > 0) {
      combatTag = `TRACE ${player.micheleMarkTimer.toFixed(1)}S`;
      combatTagColor = UI_COLORS.yellow;
    } else if (player.characterId === "celestia" && player.celestiaTemporaryArmor > 0) {
      combatTag = `STAR AR +${Math.ceil(player.celestiaTemporaryArmor)}`;
      combatTagColor = UI_COLORS.cyanBright;
    }

    if (combatTag) {
      ctx.textAlign = "left";
      ctx.fillStyle = combatTagColor;
      ctx.font = uiFont(language, 5, true);
      ctx.fillText(combatTag, 5, currentY + 6);
      currentY += 12;
    }

    const currentCoins = engine.data.data.player.coins;
    if (UIRenderer.lastCoinAmount === -1) {
      UIRenderer.lastCoinAmount = currentCoins;
      UIRenderer.coinDisplayUntil = 0;
    } else if (currentCoins !== UIRenderer.lastCoinAmount) {
      UIRenderer.lastCoinAmount = currentCoins;
      UIRenderer.coinDisplayUntil = Date.now() + 3000;
    }

    const timeRemaining = UIRenderer.coinDisplayUntil - Date.now();
    if (timeRemaining > 0) {
      let alpha = 1;
      if (timeRemaining > 2500) {
        alpha = (3000 - timeRemaining) / 500;
      } else if (timeRemaining < 500) {
        alpha = timeRemaining / 500;
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      drawUiIcon(ctx, "coin", 5, currentY, UI_COLORS.yellow);
      ctx.textAlign = "left";
      ctx.fillStyle = UI_COLORS.white;
      ctx.font = uiFont(language, 7, true);
      ctx.fillText(String(currentCoins), 15, currentY + 7);
      ctx.restore();
    }

    if (player.statusEffects.length > 0) {
      const accessible = engine.data.settings.colorblindMode !== "off";
      const statusColors: Record<string, string> = accessible ? {
        poison: UI_COLORS.yellow,
        burn: UI_COLORS.white,
        slow: UI_COLORS.cyan,
        root: UI_COLORS.purple,
      } : {
        poison: "#8BC34A",
        burn: "#FF7043",
        slow: "#81D4FA",
        root: "#A1887F",
      };
      const statusCodes: Record<string, string> = { poison: "PSN", burn: "BRN", slow: "SLW", root: "ROT" };
      const effects = player.statusEffects.slice(0, 4);
      drawPixelPanel(ctx, 90, 52, effects.length * 29 + 8, 15, "red");
      effects.forEach((status, index) => {
        const x = 95 + index * 29;
        ctx.fillStyle = statusColors[status.id] ?? UI_COLORS.white;
        ctx.font = uiFont(language, 5, true);
        ctx.textAlign = "left";
        ctx.fillText(`${statusCodes[status.id] ?? status.id.toUpperCase()}${status.stacks > 1 ? status.stacks : ""}`, x, 62);
      });
    }

        // FPS Style Weapon UI - Bottom Right
    const activeWeapon = WEAPONS[player.currentWeaponId];
    if (activeWeapon) {
      const activeColor = rarityColor(activeWeapon.rarity);
      const standbyIndex = player.activeWeaponSlot === 0 ? 1 : 0;
      const standbyId = player.weaponSlots[standbyIndex];
      
      const bottomY = 226;
      const rightX = 310;
      
      // Energy Bar
      const energyY = bottomY - 28;
      const energyWidth = 55;
      
      drawMeter(ctx, rightX - energyWidth, energyY, energyWidth, 4, player.maxMana > 0 ? player.mana / player.maxMana : 0, "#4A9EF0", 0);
      
      ctx.fillStyle = UI_COLORS.white;
      ctx.font = uiFont(language, 6, true);
      ctx.textAlign = "right";
      ctx.fillText(`${Math.floor(player.mana)}`, rightX - energyWidth - 4, energyY + 5);

      // Standby Weapon
      if (standbyId && WEAPONS[standbyId]) {
        const weapon = WEAPONS[standbyId];
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = UI_COLORS.text;
        ctx.textAlign = "right";
        ctx.font = uiFont(language, 5, true);
        ctx.fillText(weapon.name.toUpperCase(), rightX, bottomY - 14);
        
        ctx.save();
        ctx.translate(rightX - 55, bottomY - 17);
        ctx.scale(-1, 1);
        SpriteRenderer.drawPixelSprite(ctx, `weapon_${weapon.id}`, 0, 0, 0.7);
        ctx.restore();
        ctx.globalAlpha = 1.0;
      }

      // Active Weapon
      ctx.textAlign = "right";
      ctx.fillStyle = activeColor;
      ctx.font = uiFont(language, 6, true);
      ctx.fillText(activeWeapon.name.toUpperCase(), rightX, bottomY);
      
      ctx.fillStyle = UI_COLORS.white;
      ctx.font = uiFont(language, 8, true);
      const sustain = activeWeapon.sustainEnergyPerSecond ? ` +${activeWeapon.sustainEnergyPerSecond}/S` : "";
      const costStr = WeaponController.formatEnergyCost(WeaponController.getEnergyCost(player, activeWeapon.id));
      ctx.fillText(`${costStr}${sustain}`, rightX, bottomY + 9);
      
      ctx.save();
      ctx.translate(rightX - 65, bottomY - 4);
      ctx.scale(-1, 1);
      SpriteRenderer.drawPixelSprite(ctx, `weapon_${activeWeapon.id}`, 0, 0, 1.0);
      ctx.restore();

      if (activeWeapon.maxHeat) {
        const heatRatio = WeaponController.getHeatRatio(player, activeWeapon.id);
        drawMeter(ctx, rightX - 40, bottomY + 13, 40, 2, heatRatio, player.weaponOverheatTimer > 0 ? UI_COLORS.red : UI_COLORS.yellow, 0);
      }
    }

    ctx.textAlign = "right";
    ctx.fillStyle = UI_COLORS.white;
    ctx.font = uiFont(language, 7, true);
    ctx.fillText(`${floor.chapterIndex}-${floor.stageIndex}`, 312, 14);
    ctx.textAlign = "left";
  }
}
