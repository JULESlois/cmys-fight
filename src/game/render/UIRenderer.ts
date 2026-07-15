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
  public static draw(ctx: CanvasRenderingContext2D, player: Player, engine: any, floor: FloorData, roomPhase = "exploration") {
    const language = engine.data.settings.language;

    // Compact player status block. Icons carry the meaning so the bars do not
    // rely on color alone.
    drawPixelPanel(ctx, 5, 5, 139, 55, "cyan", true);
    const statRows = [
      { kind: "heart" as const, y: 11, value: player.hp, max: player.maxHp, color: UI_COLORS.red },
      { kind: "shield" as const, y: 24, value: player.armor, max: Math.max(1, player.maxArmor), color: player.armorRechargeTimer <= 0 ? UI_COLORS.cyan : "#A7B2BC" },
      { kind: "energy" as const, y: 37, value: player.mana, max: player.maxMana, color: "#4A9EF0" },
    ];
    statRows.forEach(row => {
      drawUiIcon(ctx, row.kind, 11, row.y, row.color);
      drawMeter(ctx, 23, row.y + 1, 76, 7, row.max > 0 ? row.value / row.max : 0, row.color, 10);
      ctx.fillStyle = UI_COLORS.white;
      ctx.font = uiFont(language, 6, true);
      ctx.textAlign = "right";
      ctx.fillText(`${Math.floor(row.value)}/${row.max}`, 136, row.y + 7);
    });

    const skill = SkillController.getConfig(player.characterId);
    const skillCooldownTotal = Math.max(0.01, skill.cooldown * BuffSystem.getSkillCooldownMultiplier(player));
    const skillReady = Math.max(0, Math.min(1, 1 - player.skillCooldown / skillCooldownTotal));
    drawUiIcon(ctx, "skill", 11, 49, player.skillCooldown <= 0 ? UI_COLORS.green : UI_COLORS.purple);
    drawMeter(ctx, 23, 50, 76, 6, skillReady, player.skillCooldown <= 0 ? UI_COLORS.green : UI_COLORS.purple, 0);
    ctx.textAlign = "right";
    ctx.fillStyle = player.skillCooldown <= 0 ? UI_COLORS.green : UI_COLORS.text;
    ctx.font = uiFont(language, 5, true);
    ctx.fillText(player.skillCooldown <= 0 ? "READY" : `${player.skillCooldown.toFixed(1)}S`, 136, 55);

    // Coins and character-specific combat state sit in a separate narrow tag.
    drawPixelPanel(ctx, 5, 63, 139, 15, "yellow");
    drawUiIcon(ctx, "coin", 11, 67, UI_COLORS.yellow);
    ctx.textAlign = "left";
    ctx.fillStyle = UI_COLORS.white;
    ctx.font = uiFont(language, 7, true);
    ctx.fillText(String(engine.data.data.player.coins), 23, 74);
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
      ctx.textAlign = "right";
      ctx.fillStyle = combatTagColor;
      ctx.font = uiFont(language, 5, true);
      ctx.fillText(combatTag, 136, 73);
    }

    // Compact buff strip. Detailed skill and swap information lives on the pause screen.
    if (player.buffs.length > 0) {
      const visibleBuffCount = Math.min(player.buffs.length, BuffSystem.MAX_BUFFS);
      const columns = Math.min(6, visibleBuffCount);
      const rows = Math.ceil(visibleBuffCount / columns);
      const stripWidth = columns * 15 + 7;
      const stripHeight = rows * 12 + 5;
      const stripX = 197 - stripWidth;
      drawPixelPanel(ctx, stripX, 5, stripWidth, stripHeight, "purple");
      for (let index = 0; index < visibleBuffCount; index++) {
        const id = player.buffs[index];
        const buff = BUFFS[id];
        const x = stripX + 5 + (index % columns) * 15;
        const y = 8 + Math.floor(index / columns) * 12;
        ctx.fillStyle = UI_COLORS.dark;
        ctx.fillRect(x, y, 12, 9);
        ctx.strokeStyle = rarityColor(buff.rarity);
        ctx.strokeRect(x, y, 12, 9);
        ctx.fillStyle = rarityColor(buff.rarity);
        ctx.font = uiFont(language, 5, true);
        ctx.textAlign = "center";
        ctx.fillText(buff.shortCode, x + 6, y + 7);
      }
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
      drawPixelPanel(ctx, 149, 52, effects.length * 29 + 8, 15, "red");
      effects.forEach((status, index) => {
        const x = 154 + index * 29;
        ctx.fillStyle = statusColors[status.id] ?? UI_COLORS.white;
        ctx.font = uiFont(language, 5, true);
        ctx.textAlign = "left";
        ctx.fillText(`${statusCodes[status.id] ?? status.id.toUpperCase()}${status.stacks > 1 ? status.stacks : ""}`, x, 62);
      });
    }

    // Primary weapon receives most of the visual weight; the standby slot is
    // deliberately smaller to reduce the old two-card wall at the bottom.
    drawPixelPanel(ctx, 5, 199, 181, 36, "cyan", true);
    const activeWeapon = WEAPONS[player.currentWeaponId];
    if (activeWeapon) {
      const activeColor = rarityColor(activeWeapon.rarity);
      ctx.fillStyle = UI_COLORS.panelSoft;
      ctx.fillRect(9, 203, 112, 28);
      ctx.strokeStyle = activeColor;
      ctx.strokeRect(9, 203, 112, 28);
      SpriteRenderer.drawPixelSprite(ctx, `weapon_${activeWeapon.id}`, 29, 218, 1);
      const nameLines = splitWeaponName(activeWeapon.name);
      ctx.fillStyle = UI_COLORS.white;
      ctx.textAlign = "left";
      ctx.font = uiFont(language, nameLines.some(line => line.length > 10) ? 5 : 6, true);
      nameLines.slice(0, 2).forEach((line, index) => ctx.fillText(line, 50, 211 + index * 7));
      ctx.fillStyle = activeColor;
      ctx.font = uiFont(language, 5, true);
      const sustain = activeWeapon.sustainEnergyPerSecond ? ` +${activeWeapon.sustainEnergyPerSecond}/S` : "";
      ctx.fillText(`EN ${WeaponController.formatEnergyCost(WeaponController.getEnergyCost(player, activeWeapon.id))}${sustain}`, 50, 228);
      if (activeWeapon.maxHeat) {
        const heatRatio = WeaponController.getHeatRatio(player, activeWeapon.id);
        drawMeter(ctx, 87, 225, 29, 4, heatRatio, player.weaponOverheatTimer > 0 ? UI_COLORS.red : UI_COLORS.yellow);
      }
    }

    const standbyIndex = player.activeWeaponSlot === 0 ? 1 : 0;
    const standbyId = player.weaponSlots[standbyIndex];
    ctx.fillStyle = UI_COLORS.panelSoft;
    ctx.fillRect(126, 203, 55, 28);
    ctx.strokeStyle = standbyId ? rarityColor(WEAPONS[standbyId]?.rarity ?? "common") : UI_COLORS.edge;
    ctx.strokeRect(126, 203, 55, 28);
    ctx.fillStyle = UI_COLORS.muted;
    ctx.font = uiFont(language, 5, true);
    ctx.textAlign = "left";
    ctx.fillText(`SLOT ${standbyIndex + 1}`, 130, 210);
    if (standbyId && WEAPONS[standbyId]) {
      const weapon = WEAPONS[standbyId];
      SpriteRenderer.drawPixelSprite(ctx, `weapon_${weapon.id}`, 143, 223, 1);
      ctx.fillStyle = UI_COLORS.text;
      ctx.font = uiFont(language, 4, true);
      const shortName = splitWeaponName(weapon.name)[0];
      ctx.fillText(shortName.slice(0, 10), 130, 229);
    } else {
      ctx.fillStyle = UI_COLORS.muted;
      ctx.font = uiFont(language, 6);
      ctx.fillText("EMPTY", 136, 224);
    }

    const currentRoom = floor.rooms.find(room => room.x === floor.currentRoomX && room.y === floor.currentRoomY);
    if (currentRoom) {
      let statusText = "LOCKED";
      let tone: UiTone = "red";
      if (currentRoom.type === "start") { statusText = "SAFE"; tone = "neutral"; }
      else if (currentRoom.type === "npc") { statusText = currentRoom.interactionCompleted ? "SILENT" : "BROADCAST"; tone = "purple"; }
      else if (currentRoom.type === "wish_fountain") { statusText = currentRoom.interactionCompleted ? "SPENT" : "WISH"; tone = "purple"; }
      else if (currentRoom.type === "photo_booth") { statusText = currentRoom.interactionCompleted ? "PRINTED" : "PHOTO"; tone = "purple"; }
      else if (currentRoom.type === "exit") { statusText = "PORTAL"; tone = "cyan"; }
      else if (currentRoom.type === "shop") { statusText = "MERCHANT"; tone = "yellow"; }
      else if (roomPhase === "exploration" || roomPhase === "cleared") { statusText = roomPhase === "cleared" ? "CLEAR" : "OPEN"; tone = "green"; }
      else if (roomPhase === "reward") { statusText = "REWARD"; tone = "yellow"; }

      drawPixelPanel(ctx, 194, 211, 121, 24, tone);
      ctx.textAlign = "left";
      ctx.fillStyle = UI_COLORS.white;
      ctx.font = uiFont(language, 7, true);
      const modeLabel = floor.challengeId ? "+CH" : floor.hardMode ? "HARD" : "";
      ctx.fillText(`${floor.chapterIndex}-${floor.stageIndex} ${floor.theme.toUpperCase()} ${modeLabel}`, 200, 220);
      drawBadge(ctx, `${currentRoom.type.toUpperCase()} · ${statusText}`, 199, 223, 111, language, tone);
    }
    ctx.textAlign = "left";
  }
}
