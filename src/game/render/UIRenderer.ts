import { Player } from "../entities/Player";
import { WEAPONS } from "../data/weapons";
import { FloorData, Room } from "../FloorGenerator";
import { SpriteRenderer } from "./SpriteRenderer";
import { BUFFS, BuffSystem } from "../combat/BuffSystem";
import { WeaponController } from "../combat/WeaponController";
import { SkillController } from "../combat/SkillController";

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

export class UIRenderer {
  public static draw(ctx: CanvasRenderingContext2D, player: Player, engine: any, floor: FloorData, roomPhase: string = "exploration") {

    
    // Top Left: HUD (HP, Armor, Mana)
    ctx.fillStyle = "rgba(10, 15, 25, 0.85)";
    ctx.strokeStyle = "rgba(0, 242, 254, 0.5)";
    ctx.lineWidth = 1;
    ctx.fillRect(5, 5, 132, 50);
    ctx.strokeRect(5, 5, 132, 50);
    
    // Pixel corners
    ctx.fillStyle = "#00F2FE";
    ctx.fillRect(4, 4, 3, 3);
    ctx.fillRect(135, 4, 3, 3);
    ctx.fillRect(4, 53, 3, 3);
    ctx.fillRect(135, 53, 3, 3);
    
    // Pixel UI Layout for Stats
    
    // Pixel UI Layout for Stats
    const drawBar = (x: number, y: number, current: number, max: number, maxBlocks: number, size: number, colorOn: string, colorOff: string, hasShine: boolean = false) => {
        const blocks = Math.min(max, maxBlocks);
        const fillBlocks = Math.ceil((current / max) * blocks);
        for (let i = 0; i < blocks; i++) {
            const bx = x + i * (size + 1);
            ctx.fillStyle = "#1a1c2c";
            ctx.fillRect(bx, y, size, size);
            if (i < fillBlocks) {
                ctx.fillStyle = colorOn;
                ctx.fillRect(bx + 1, y + 1, size - 2, size - 2);
                if (hasShine) {
                    ctx.fillStyle = "#fff";
                    ctx.fillRect(bx + 2, y + 2, 1, 1);
                }
            } else {
                ctx.fillStyle = colorOff;
                ctx.fillRect(bx + 1, y + 1, size - 2, size - 2);
            }
        }
        
        // Value text
        ctx.fillStyle = "#FFF";
        ctx.font = "8px monospace";
        ctx.fillText(`${Math.floor(current)}/${max}`, x + blocks * (size + 1) + 4, y + size - 1);
    };

    // HP - Red Blocks (max 10 blocks)
    drawBar(10, 10, player.hp, player.maxHp, 10, 6, "#e43b44", "#641E16", true);
    
    // Armor - Silver Blocks (max 10 blocks)
    if (player.maxArmor > 0) {
        const armorRecharging = player.armor < player.maxArmor && player.armorRechargeTimer <= 0;
        drawBar(10, 18, player.armor, player.maxArmor, 10, 5, armorRecharging ? "#00F2FE" : "#BDC3C7", "#4D5656", false);
        if (player.armor < player.maxArmor) {
            const readiness = armorRecharging
              ? 1
              : Math.max(0, 1 - player.armorRechargeTimer / player.armorRechargeDelay);
            ctx.fillStyle = "#1a1c2c";
            ctx.fillRect(10, 24, 59, 1);
            ctx.fillStyle = armorRecharging ? "#00F2FE" : "#F1C40F";
            ctx.fillRect(10, 24, Math.round(59 * readiness), 1);
        }
    }
    
    // Mana - Blue Gems (max 10 blocks)
    const manaY = player.maxArmor > 0 ? 25 : 18;
    drawBar(10, manaY, player.mana, player.maxMana, 10, 5, "#29adff", "#154360", false);
    
    // Coins
    SpriteRenderer.drawPixelSprite(ctx, "pickup_coin", 14, 38, 1);
    ctx.fillStyle = "#FFF";
    ctx.font = "9px monospace";
    ctx.fillText(`x ${engine.data.data.player.coins}`, 22, 42);
    if (player.characterId === "mage") {
      const threshold = SkillController.MAGE_ECHO_THRESHOLD;
      const charge = Math.min(threshold, Math.floor(player.mageArcaneCharge * 10) / 10);
      ctx.fillStyle = charge >= threshold ? "#F5D0FF" : "#C792EA";
      ctx.font = "bold 6px monospace";
      ctx.fillText(`ECHO ${charge}/${threshold}`, 67, 42);
    } else if (player.characterId === "michele" && player.micheleMarkTimer > 0) {
      ctx.fillStyle = "#F4D35E";
      ctx.font = "bold 6px monospace";
      ctx.fillText(`TRACE ${player.micheleMarkTimer.toFixed(1)}S`, 67, 42);
    }

    const skill = SkillController.getConfig(player.characterId);
    const skillCooldownTotal = Math.max(0.01, skill.cooldown * BuffSystem.getSkillCooldownMultiplier(player));
    const skillReady = Math.max(0, Math.min(1, 1 - player.skillCooldown / skillCooldownTotal));
    ctx.fillStyle = "#1A1C2C";
    ctx.fillRect(67, 46, 63, 5);
    ctx.fillStyle = player.skillCooldown <= 0 ? "#2ECC71" : "#C792EA";
    ctx.fillRect(68, 47, Math.round(61 * skillReady), 3);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 5px monospace";
    ctx.fillText(player.skillCooldown <= 0 ? "SKILL READY" : `SKILL ${player.skillCooldown.toFixed(1)}S`, 8, 51);

    // Compact buff strip. Detailed skill and swap information lives on the pause screen.
    if (player.buffs.length > 0) {
      ctx.fillStyle = "rgba(10, 15, 25, 0.85)";
      ctx.fillRect(143, 5, 172, 12);
      ctx.strokeStyle = "rgba(0, 242, 254, 0.35)";
      ctx.strokeRect(143, 5, 172, 12);
      for (let index = 0; index < BuffSystem.MAX_BUFFS; index++) {
        const x = 146 + index * 14;
        ctx.fillStyle = "#1A1C2C";
        ctx.fillRect(x - 1, 7, 12, 8);
        ctx.strokeStyle = "#34495E";
        ctx.strokeRect(x - 1, 7, 12, 8);
        const id = player.buffs[index];
        if (!id) continue;
        const buff = BUFFS[id];
        ctx.fillStyle = buff.rarity === "legendary" ? "#FFB347" : buff.rarity === "rare" ? "#00F2FE" : buff.rarity === "uncommon" ? "#2ECC71" : "#BDC3C7";
        ctx.font = "bold 5px monospace";
        ctx.fillText(buff.shortCode, x, 13);
      }
    }

    if (player.statusEffects.length > 0) {
      const accessible = engine.data.settings.colorblindMode !== "off";
      const statusColors: Record<string, string> = accessible ? {
        poison: "#F1C40F",
        burn: "#FFFFFF",
        slow: "#00F2FE",
        root: "#D980FA",
      } : {
        poison: "#8BC34A",
        burn: "#FF7043",
        slow: "#81D4FA",
        root: "#A1887F",
      };
      const statusCodes: Record<string, string> = {
        poison: "PSN",
        burn: "BRN",
        slow: "SLW",
        root: "ROT",
      };
      ctx.fillStyle = "rgba(10, 15, 25, 0.85)";
      ctx.fillRect(5, 53, 120, 12);
      ctx.strokeStyle = "rgba(231, 76, 60, 0.45)";
      ctx.strokeRect(5, 53, 120, 12);
      player.statusEffects.slice(0, 4).forEach((status, index) => {
        const x = 9 + index * 29;
        ctx.fillStyle = statusColors[status.id] ?? "#FFF";
        ctx.font = "bold 5px monospace";
        ctx.fillText(`${statusCodes[status.id] ?? status.id.toUpperCase()}${status.stacks > 1 ? status.stacks : ""}`, x, 61);
      });
    }
    
    // Bottom Left: Dual weapon slots
    ctx.fillStyle = "rgba(10, 15, 25, 0.85)";
    ctx.strokeStyle = "rgba(0, 242, 254, 0.5)";
    ctx.fillRect(5, 202, 190, 33);
    ctx.strokeRect(5, 202, 190, 33);

    const rarityColor = (rarity: string) => {
      if (rarity === "myth") return "#D66BFF";
      if (rarity === "legendary") return "#FFB347";
      if (rarity === "rare") return "#00F2FE";
      if (rarity === "uncommon") return "#2ECC71";
      return "#8E9EAB";
    };

    const drawWeaponSlot = (slotIndex: 0 | 1, x: number) => {
      const weaponId = player.weaponSlots[slotIndex];
      const weapon = weaponId ? WEAPONS[weaponId] : undefined;
      const active = player.activeWeaponSlot === slotIndex;

      ctx.fillStyle = active ? "rgba(0, 242, 254, 0.12)" : "rgba(255, 255, 255, 0.03)";
      ctx.fillRect(x, 205, 86, 25);
      ctx.strokeStyle = active ? "#00F2FE" : weapon ? rarityColor(weapon.rarity) : "#34495E";
      ctx.strokeRect(x, 205, 86, 25);

      ctx.fillStyle = active ? "#00F2FE" : "#7F8C8D";
      ctx.font = "bold 7px monospace";
      ctx.fillText(`${active ? ">" : " "}${slotIndex + 1}`, x + 3, 212);

      if (!weapon) {
        ctx.fillStyle = "#566573";
        ctx.font = "7px monospace";
        ctx.fillText("EMPTY", x + 27, 219);
        return;
      }

      // Weapon slots must use the full weapon model namespace. The pickup namespace only
      // contains legacy icons for a few starter weapons and otherwise falls back to one generic icon.
      SpriteRenderer.drawPixelSprite(ctx, `weapon_${weapon.id}`, x + 20, 218, 1);
      ctx.fillStyle = active ? "#FFF" : "#BDC3C7";
      const nameLines = splitWeaponName(weapon.name);
      const longestNameLine = Math.max(...nameLines.map(line => line.length));
      const nameFontSize = longestNameLine <= 8 ? 6 : longestNameLine <= 10 ? 5 : 4;
      ctx.font = `bold ${nameFontSize}px monospace`;
      if (nameLines.length === 1) {
        ctx.fillText(nameLines[0], x + 39, 215);
      } else {
        ctx.fillText(nameLines[0], x + 39, 212);
        ctx.fillText(nameLines[1], x + 39, 218);
      }
      ctx.fillStyle = rarityColor(weapon.rarity);
      ctx.font = "5px monospace";
      const sustain = weapon.sustainEnergyPerSecond ? `+${weapon.sustainEnergyPerSecond}/S` : "";
      ctx.fillText(`EN ${WeaponController.formatEnergyCost(WeaponController.getEnergyCost(player, weapon.id))}${sustain} D${weapon.damage}`, x + 39, 226);
      if (active && weapon.maxHeat) {
        const heatRatio = WeaponController.getHeatRatio(player, weapon.id);
        const overheated = player.weaponOverheatTimer > 0;
        ctx.fillStyle = "#1A1C2C";
        ctx.fillRect(x + 40, 227, 39, 3);
        ctx.fillStyle = overheated ? "#FF4057" : heatRatio >= 0.7 ? "#FFB347" : "#F1C40F";
        ctx.fillRect(x + 41, 228, Math.round(37 * heatRatio), 1);
        if (overheated) {
          ctx.fillStyle = "#FFF3B0";
          ctx.font = "bold 5px monospace";
          ctx.fillText("HOT", x + 68, 212);
        }
      }
    };

    drawWeaponSlot(0, 8);
    drawWeaponSlot(1, 101);
    // Bottom Right: Room State
    const currentRoom = floor.rooms.find(r => r.x === floor.currentRoomX && r.y === floor.currentRoomY);
    ctx.fillStyle = "rgba(10, 15, 25, 0.85)";
    ctx.strokeStyle = "rgba(0, 242, 254, 0.5)";
    ctx.fillRect(200, 210, 115, 25);
    ctx.strokeRect(200, 210, 115, 25);
    
    // Pixel corners
    ctx.fillStyle = "#00F2FE";
    ctx.fillRect(199, 209, 3, 3);
    ctx.fillRect(313, 209, 3, 3);
    ctx.fillRect(199, 233, 3, 3);
    ctx.fillRect(313, 233, 3, 3);
    
    ctx.textAlign = "right";
    ctx.fillStyle = "#FFF";
    ctx.font = "bold 9px monospace";
    const modeLabel = floor.challengeId ? " HARD+CH" : floor.hardMode ? " HARD" : "";
    ctx.fillText(`${floor.chapterIndex}-${floor.stageIndex} ${floor.theme.toUpperCase()}${modeLabel}`, 310, 222);
    
    if (currentRoom) {
      let statusColor = "#C0392B";
      let statusText = "LOCKED";
      
      if (currentRoom.type === "start") {
         statusColor = "#7F8C8D";
         statusText = "SAFE";
      } else if (currentRoom.type === "npc") {
         statusColor = "#8E44AD";
         statusText = currentRoom.interactionCompleted ? "SILENT" : "BROADCAST";
      } else if (currentRoom.type === "wish_fountain") {
         statusColor = "#8E44AD";
         statusText = currentRoom.interactionCompleted ? "SPENT" : "WISH";
      } else if (currentRoom.type === "photo_booth") {
         statusColor = "#A569BD";
         statusText = currentRoom.interactionCompleted ? "PRINTED" : "PHOTO";
      } else if (currentRoom.type === "exit") {
         statusColor = "#16A085";
         statusText = "PORTAL";
      } else if (currentRoom.type === "shop") {
         statusColor = "#D4AC0D";
         statusText = "MERCHANT";
      } else if (roomPhase === "exploration") {
         statusColor = "#27AE60";
         statusText = "OPEN";
      } else if (roomPhase === "cleared") {
         statusColor = "#2980B9";
         statusText = "CLEAR";
      } else if (roomPhase === "reward") {
         statusColor = "#F39C12";
         statusText = "REWARD";
      }
      
      // Badge background
      ctx.fillStyle = statusColor;
      ctx.fillRect(205, 224, 105, 9);
      
      // Badge text
      ctx.fillStyle = "#FFF";
      ctx.font = "7px monospace";
      ctx.fillText(`${currentRoom.type.toUpperCase()} : ${statusText}`, 308, 231);
    }
    ctx.textAlign = "left";
  }
}
