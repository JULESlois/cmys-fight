import { Player } from "../entities/Player";
import { WEAPONS } from "../data/weapons";

export class HudRenderer {
  public static draw(ctx: CanvasRenderingContext2D, player: Player, engine: any) {
    // HUD base
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(5, 5, 140, 50);

    // HP Bar
    ctx.fillStyle = "#C0392B"; // Dark red bg
    ctx.fillRect(10, 10, 60, 6);
    ctx.fillStyle = "#E74C3C"; // Bright red fg
    ctx.fillRect(10, 10, 60 * (Math.max(0, player.hp) / player.maxHp), 6);
    
    // Armor Bar
    if (player.maxArmor > 0) {
      ctx.fillStyle = "#7F8C8D"; // Dark gray
      ctx.fillRect(10, 18, 60, 4);
      ctx.fillStyle = "#BDC3C7"; // Light gray
      ctx.fillRect(10, 18, 60 * (Math.max(0, player.armor) / player.maxArmor), 4);
    }

    // Mana Bar
    ctx.fillStyle = "#2980B9";
    ctx.fillRect(10, 24, 60, 4);
    ctx.fillStyle = "#3498DB";
    ctx.fillRect(10, 24, 60 * (Math.max(0, player.mana) / player.maxMana), 4);

    // Texts & Icons
    ctx.fillStyle = "#FFF";
    ctx.font = "8px monospace";
    ctx.fillText(`HP ${Math.max(0, player.hp)}/${player.maxHp}`, 75, 16);
    ctx.fillText(`MP ${player.mana}/${player.maxMana}`, 75, 28);
    
    ctx.fillStyle = "#F1C40F";
    ctx.beginPath();
    ctx.arc(14, 40, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#F39C12";
    ctx.beginPath();
    ctx.arc(14, 40, 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#FFF";
    ctx.font = "9px monospace";
    ctx.fillText(`x ${engine.data.data.player.coins}`, 22, 43);

    // Weapon
    ctx.fillStyle = "#FFF";
    ctx.textAlign = "right";
    ctx.fillText(`WPN: ${WEAPONS[player.currentWeaponId].name}`, 140, 43);
    ctx.textAlign = "left";
  }
}
