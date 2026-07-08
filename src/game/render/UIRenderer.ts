import { Player } from "../entities/Player";
import { WEAPONS } from "../data/weapons";
import { FloorData, Room } from "../FloorGenerator";
import { SpriteRenderer } from "./SpriteRenderer";

export class UIRenderer {
  public static draw(ctx: CanvasRenderingContext2D, player: Player, engine: any, floor: FloorData) {

    
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
    
    // HP (Segmented)
    const hpRatio = Math.max(0, player.hp) / player.maxHp;
    ctx.fillStyle = "#641E16";
    ctx.fillRect(10, 10, 80, 6);
    ctx.fillStyle = "#E74C3C";
    ctx.fillRect(10, 10, 80 * hpRatio, 6);
    for(let i=1; i<10; i++) {
       ctx.fillStyle = "rgba(0,0,0,0.5)";
       ctx.fillRect(10 + i * 8 - 1, 10, 1, 6);
    }
    
    // Armor (Segmented)
    if (player.maxArmor > 0) {
      const arRatio = Math.max(0, player.armor) / player.maxArmor;
      ctx.fillStyle = "#4D5656";
      ctx.fillRect(10, 19, 80, 4);
      ctx.fillStyle = "#BDC3C7";
      ctx.fillRect(10, 19, 80 * arRatio, 4);
    }
    
    // Mana
    const mpRatio = Math.max(0, player.mana) / player.maxMana;
    ctx.fillStyle = "#154360";
    ctx.fillRect(10, 26, 80, 4);
    ctx.fillStyle = "#3498DB";
    ctx.fillRect(10, 26, 80 * mpRatio, 4);
    
    // Labels
    ctx.fillStyle = "#FFF";
    ctx.font = "8px monospace";
    ctx.fillText(`HP`, 95, 16);
    ctx.fillText(`MP`, 95, 30);
    
    // Coins
    SpriteRenderer.drawPixelSprite(ctx, "pickup_coin", 14, 38, 1);
    ctx.fillStyle = "#FFF";
    ctx.font = "9px monospace";
    ctx.fillText(`x ${engine.data.data.player.coins}`, 22, 42);
    
    // Bottom Left: Weapon Card
    const weapon = WEAPONS[player.currentWeaponId];
    ctx.fillStyle = "rgba(10, 15, 25, 0.85)";
    ctx.strokeStyle = "rgba(0, 242, 254, 0.5)";
    ctx.fillRect(5, 210, 100, 25);
    ctx.strokeRect(5, 210, 100, 25);
    
    ctx.fillStyle = "#00F2FE";
    ctx.fillRect(4, 209, 3, 3);
    ctx.fillRect(103, 209, 3, 3);
    ctx.fillRect(4, 233, 3, 3);
    ctx.fillRect(103, 233, 3, 3);
    
    ctx.fillStyle = "#00F2FE";
    ctx.font = "bold 9px monospace";
    ctx.fillText(weapon.name.toUpperCase(), 24, 222);
    SpriteRenderer.drawPixelSprite(ctx, "pickup_weapon", 14, 222, 1.5);
    ctx.fillStyle = "#8E9EAB";
    ctx.font = "7px monospace";
    ctx.fillText(`MP:-${weapon.manaCost} SPD:${weapon.fireRate}`, 24, 231);

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
