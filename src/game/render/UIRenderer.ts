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
    
    // Pixel UI Layout for Stats
    
    // HP - Red Hearts/Blocks
    for (let i = 0; i < player.maxHp; i++) {
        const x = 10 + i * 7;
        const y = 10;
        ctx.fillStyle = "#1a1c2c";
        ctx.fillRect(x, y, 6, 6);
        if (i < player.hp) {
           ctx.fillStyle = "#e43b44";
           ctx.fillRect(x + 1, y + 1, 4, 4);
           ctx.fillStyle = "#fff";
           ctx.fillRect(x + 2, y + 2, 1, 1); // shine
        } else {
           ctx.fillStyle = "#641E16";
           ctx.fillRect(x + 1, y + 1, 4, 4);
        }
    }
    
    // Armor - Silver Shields
    if (player.maxArmor > 0) {
        for (let i = 0; i < player.maxArmor; i++) {
            const x = 10 + i * 6;
            const y = 18;
            ctx.fillStyle = "#1a1c2c";
            ctx.fillRect(x, y, 5, 5);
            if (i < player.armor) {
               ctx.fillStyle = "#BDC3C7";
               ctx.fillRect(x + 1, y + 1, 3, 3);
            } else {
               ctx.fillStyle = "#4D5656";
               ctx.fillRect(x + 1, y + 1, 3, 3);
            }
        }
    }
    
    // Mana - Blue Gems
    for (let i = 0; i < player.maxMana; i++) {
        const x = 10 + i * 5;
        const y = player.maxArmor > 0 ? 25 : 18; // Shift up if no armor
        ctx.fillStyle = "#1a1c2c";
        ctx.fillRect(x, y, 4, 4);
        if (i < player.mana) {
           ctx.fillStyle = "#29adff";
           ctx.fillRect(x + 1, y + 1, 2, 2);
        } else {
           ctx.fillStyle = "#154360";
           ctx.fillRect(x + 1, y + 1, 2, 2);
        }
    }
    
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
    SpriteRenderer.drawPixelSprite(ctx, `pickup_${weapon.id}`, 14, 222, 1);
    ctx.fillStyle = "#8E9EAB";
    ctx.font = "7px monospace";
    ctx.fillText(`MP:-${weapon.manaCost} SPD:${weapon.fireRate}`, 24, 231);

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
    ctx.fillText(`FLOOR ${floor.depth} ${floor.theme.toUpperCase()}`, 310, 222);
    
    if (currentRoom) {
      let statusColor = currentRoom.cleared ? "#27AE60" : "#C0392B";
      let statusText = currentRoom.cleared ? "CLEARED" : "LOCKED";
      if (currentRoom.type === "start" || currentRoom.type === "npc") {
         statusColor = "#7F8C8D";
         statusText = "SAFE ZONE";
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
