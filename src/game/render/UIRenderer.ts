import { Player } from "../entities/Player";
import { WEAPONS } from "../data/weapons";
import { FloorData, Room } from "../FloorGenerator";

export class UIRenderer {
  public static draw(ctx: CanvasRenderingContext2D, player: Player, engine: any, floor: FloorData) {
    // Top Left: HUD (HP, Armor, Mana)
    ctx.fillStyle = "rgba(10, 15, 25, 0.85)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.fillRect(5, 5, 120, 40);
    ctx.strokeRect(5, 5, 120, 40);
    
    // HP
    const hpRatio = Math.max(0, player.hp) / player.maxHp;
    ctx.fillStyle = "#641E16"; // Dark red bg
    ctx.fillRect(10, 10, 80, 5);
    ctx.fillStyle = "#E74C3C"; // Bright red fg
    ctx.fillRect(10, 10, 80 * hpRatio, 5);
    
    // Armor
    if (player.maxArmor > 0) {
      const arRatio = Math.max(0, player.armor) / player.maxArmor;
      ctx.fillStyle = "#4D5656";
      ctx.fillRect(10, 17, 80, 3);
      ctx.fillStyle = "#BDC3C7";
      ctx.fillRect(10, 17, 80 * arRatio, 3);
    }
    
    // Mana
    const mpRatio = Math.max(0, player.mana) / player.maxMana;
    ctx.fillStyle = "#154360";
    ctx.fillRect(10, 22, 80, 3);
    ctx.fillStyle = "#3498DB";
    ctx.fillRect(10, 22, 80 * mpRatio, 3);
    
    // Labels
    ctx.fillStyle = "#FFF";
    ctx.font = "7px monospace";
    ctx.fillText(`HP`, 95, 15);
    ctx.fillText(`MP`, 95, 25);
    
    // Coins
    ctx.fillStyle = "#F1C40F";
    ctx.beginPath();
    ctx.arc(14, 34, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#F39C12";
    ctx.beginPath();
    ctx.arc(14, 34, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FFF";
    ctx.font = "9px monospace";
    ctx.fillText(`x ${engine.data.data.player.coins}`, 22, 37);
    
    // Bottom Left: Weapon Card
    const weapon = WEAPONS[player.currentWeaponId];
    ctx.fillStyle = "rgba(10, 15, 25, 0.85)";
    ctx.fillRect(5, 210, 100, 25);
    ctx.strokeRect(5, 210, 100, 25);
    
    ctx.fillStyle = "#00F2FE";
    ctx.font = "bold 9px monospace";
    ctx.fillText(weapon.name.toUpperCase(), 10, 222);
    ctx.fillStyle = "#8E9EAB";
    ctx.font = "7px monospace";
    ctx.fillText(`MP:-${weapon.manaCost} SPD:${weapon.fireRate}`, 10, 231);

    // Bottom Right: Room State
    const currentRoom = floor.rooms.find(r => r.x === floor.currentRoomX && r.y === floor.currentRoomY);
    ctx.fillStyle = "rgba(10, 15, 25, 0.85)";
    ctx.fillRect(200, 210, 115, 25);
    ctx.strokeRect(200, 210, 115, 25);
    
    ctx.textAlign = "right";
    ctx.fillStyle = "#FFF";
    ctx.font = "bold 9px monospace";
    ctx.fillText(`FLOOR ${floor.depth} - ${floor.theme.toUpperCase()}`, 310, 222);
    
    if (currentRoom) {
      let statusColor = currentRoom.cleared ? "#2ECC71" : "#E74C3C";
      let statusText = currentRoom.cleared ? "CLEARED" : "LOCKED";
      if (currentRoom.type === "start" || currentRoom.type === "npc") {
         statusColor = "#BDC3C7";
         statusText = "SAFE ZONE";
      }
      ctx.fillStyle = statusColor;
      ctx.font = "7px monospace";
      ctx.fillText(`[${currentRoom.type.toUpperCase()}] ${statusText}`, 310, 231);
    }
    ctx.textAlign = "left";
  }
}
