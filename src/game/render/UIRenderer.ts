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
        drawBar(10, 18, player.armor, player.maxArmor, 10, 5, "#BDC3C7", "#4D5656", false);
    }
    
    // Mana - Blue Gems (max 10 blocks)
    const manaY = player.maxArmor > 0 ? 25 : 18;
    drawBar(10, manaY, player.mana, player.maxMana, 10, 5, "#29adff", "#154360", false);
    
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
