import { Player } from "../entities/Player";
import { WEAPONS } from "../data/weapons";
import { FloorData, Room } from "../FloorGenerator";
import { SpriteRenderer } from "./SpriteRenderer";
import { SkillController } from "../combat/SkillController";
import { BUFFS, BuffSystem } from "../combat/BuffSystem";

export class UIRenderer {
  public static draw(ctx: CanvasRenderingContext2D, player: Player, engine: any, floor: FloorData, roomPhase: string = "exploration") {

    
    // Top Left: HUD (HP, Armor, Mana)
    ctx.fillStyle = "rgba(10, 15, 25, 0.85)";
    ctx.strokeStyle = "rgba(0, 242, 254, 0.5)";
    ctx.lineWidth = 1;
    ctx.fillRect(5, 5, 120, 45);
    ctx.strokeRect(5, 5, 120, 45);
    
    // Pixel corners
    ctx.fillStyle = "#00F2FE";
    ctx.fillRect(4, 4, 3, 3);
    ctx.fillRect(123, 4, 3, 3);
    ctx.fillRect(4, 48, 3, 3);
    ctx.fillRect(123, 48, 3, 3);
    
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

    // Top center: character skill
    const skill = SkillController.getConfig(player.characterId);
    const skillReady = player.skillCooldown <= 0;
    const skillActive = player.skillActiveTimer > 0;
    ctx.fillStyle = "rgba(10, 15, 25, 0.85)";
    ctx.strokeStyle = skillReady ? "#2ECC71" : "rgba(0, 242, 254, 0.5)";
    ctx.fillRect(132, 5, 92, 31);
    ctx.strokeRect(132, 5, 92, 31);
    ctx.fillStyle = skillReady ? "#2ECC71" : "#00F2FE";
    ctx.font = "bold 7px monospace";
    ctx.fillText(`E ${skill.name}`, 137, 15);
    ctx.fillStyle = "#1a1c2c";
    ctx.fillRect(137, 20, 81, 5);
    const effectiveSkillCooldown = skill.cooldown * BuffSystem.getSkillCooldownMultiplier(player);
    const skillProgress = skillReady
      ? 1
      : Math.max(0, 1 - player.skillCooldown / effectiveSkillCooldown);
    ctx.fillStyle = skillActive ? "#F1C40F" : skillReady ? "#2ECC71" : "#3498DB";
    ctx.fillRect(138, 21, Math.round(79 * skillProgress), 3);
    ctx.fillStyle = "#BDC3C7";
    ctx.font = "6px monospace";
    const skillStatus = skillActive
      ? "ACTIVE"
      : skillReady
        ? "READY"
        : `CD ${player.skillCooldown.toFixed(1)}S`;
    ctx.fillText(skillStatus, 137, 32);
    if (player.rogueCritTimer > 0) {
      ctx.fillStyle = "#F1C40F";
      ctx.fillText(`CRIT+ ${player.rogueCritTimer.toFixed(1)}S`, 178, 32);
    }

    ctx.fillStyle = "rgba(10, 15, 25, 0.85)";
    ctx.fillRect(132, 39, 92, 12);
    ctx.strokeStyle = "rgba(0, 242, 254, 0.35)";
    ctx.strokeRect(132, 39, 92, 12);
    player.buffs.forEach((id, index) => {
      const buff = BUFFS[id];
      const x = 135 + index * 17;
      ctx.fillStyle = buff.rarity === "rare" ? "#00F2FE" : buff.rarity === "uncommon" ? "#2ECC71" : "#BDC3C7";
      ctx.font = "bold 5px monospace";
      ctx.fillText(buff.shortCode, x, 47);
    });

    if (player.statusEffects.length > 0) {
      const statusColors: Record<string, string> = {
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

      SpriteRenderer.drawPixelSprite(ctx, `pickup_${weapon.id}`, x + 17, 218, 1);
      ctx.fillStyle = active ? "#FFF" : "#BDC3C7";
      ctx.font = "bold 7px monospace";
      ctx.fillText(weapon.name.toUpperCase().slice(0, 11), x + 27, 215);
      ctx.fillStyle = rarityColor(weapon.rarity);
      ctx.font = "6px monospace";
      ctx.fillText(`EN ${weapon.manaCost}  DMG ${weapon.damage}`, x + 27, 225);
    };

    drawWeaponSlot(0, 8);
    drawWeaponSlot(1, 101);
    ctx.fillStyle = "#F1C40F";
    ctx.font = "6px monospace";
    ctx.fillText("Q", 95, 219);

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
    ctx.fillText(`${floor.chapterIndex}-${floor.stageIndex} ${floor.theme.toUpperCase()}`, 310, 222);
    
    if (currentRoom) {
      let statusColor = "#C0392B";
      let statusText = "LOCKED";
      
      if (currentRoom.type === "start" || currentRoom.type === "npc") {
         statusColor = "#7F8C8D";
         statusText = "SAFE";
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
