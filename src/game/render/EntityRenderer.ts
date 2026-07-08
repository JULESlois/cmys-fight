import { Player } from "../entities/Player";
import { Enemy } from "../entities/Enemy";
import { Projectile } from "../entities/Projectile";
import { Pickup } from "../entities/Pickup";
import { PALETTES } from "../data/palettes";
import { CHARACTERS } from "../data/characters";
import { SpriteRenderer } from "./SpriteRenderer";

export class EntityRenderer {
  public static drawPlayer(ctx: CanvasRenderingContext2D, player: Player, engine: any, theme: string) {
    if (player.hp <= 0) return;

    ctx.save();
    ctx.translate(player.x, player.y);

    if (player.facingLeft) {
      ctx.scale(-1, 1);
    }

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, 8, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    const isHit = player.hitFlash > 0;

    const charConfig = CHARACTERS[player.characterId] || CHARACTERS["knight"];
    // Body (Cloak)
    ctx.fillStyle = isHit ? "#FFF" : (charConfig ? charConfig.color : "#3498DB");
    ctx.beginPath();
    ctx.moveTo(-5, -2);
    ctx.lineTo(5, -2);
    ctx.lineTo(7, 8);
    ctx.lineTo(-7, 8);
    ctx.fill();

    // Head (Helmet)
    ctx.fillStyle = isHit ? "#FFF" : "#BDC3C7";
    ctx.beginPath();
    ctx.arc(0, -6, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Visor
    ctx.fillStyle = "#2C3E50";
    ctx.fillRect(1, -8, 4, 3);
    
    // Weapon Hint
    ctx.fillStyle = "#95A5A6";
    ctx.fillRect(4, -1, 8, 2);

    if (player.muzzleFlash > 0) {
      ctx.fillStyle = "rgba(241, 196, 15, " + player.muzzleFlash + ")";
      ctx.beginPath();
      ctx.arc(14, 0, 4 + player.muzzleFlash * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  public static drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number, theme: string) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, enemy.radius, enemy.radius, enemy.radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    const animOffset = Math.sin(time * 5 + enemy.x) * 2; // Simple bobbing
    const isHit = enemy.hitFlash > 0;

    if (enemy.type === "melee") {
      ctx.translate(0, animOffset);
      ctx.fillStyle = isHit ? "#FFF" : "#E74C3C";
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Horns
      ctx.fillStyle = isHit ? "#FFF" : "#C0392B";
      ctx.beginPath();
      ctx.moveTo(-enemy.radius, 0);
      ctx.lineTo(-enemy.radius - 4, -8);
      ctx.lineTo(-enemy.radius / 2, -enemy.radius);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(enemy.radius, 0);
      ctx.lineTo(enemy.radius + 4, -8);
      ctx.lineTo(enemy.radius / 2, -enemy.radius);
      ctx.fill();

      // Eye
      ctx.fillStyle = "#F1C40F";
      ctx.fillRect(-2, -2, 4, 2);

    } else if (enemy.type === "ranged") {
      ctx.translate(0, animOffset);
      ctx.fillStyle = isHit ? "#FFF" : "#9B59B6";
      ctx.fillRect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2);
      
      // Cannon eye
      ctx.fillStyle = "#8E44AD";
      ctx.fillRect(2, -2, 8, 4);
      ctx.fillStyle = "#E74C3C";
      ctx.fillRect(8, -1, 2, 2);

    } else if (enemy.type === "boss") {
      const auraScale = 1 + Math.sin(time * 3) * 0.1;
      ctx.fillStyle = "rgba(241, 196, 15, 0.3)";
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * 1.5 * auraScale, 0, Math.PI * 2);
      ctx.fill();

      ctx.translate(0, animOffset * 0.5);
      
      ctx.fillStyle = isHit ? "#FFF" : "#D35400";
      ctx.beginPath();
      ctx.moveTo(0, -enemy.radius);
      ctx.lineTo(enemy.radius, 0);
      ctx.lineTo(0, enemy.radius);
      ctx.lineTo(-enemy.radius, 0);
      ctx.fill();

      ctx.fillStyle = isHit ? "#FFF" : "#F1C40F";
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#FFF";
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = isHit ? "#FFF" : "#E74C3C";
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // HP bar
    ctx.fillStyle = "#E74C3C";
    ctx.fillRect(enemy.x - 10, enemy.y - enemy.radius - 8, 20, 3);
    ctx.fillStyle = "#2ECC71";
    ctx.fillRect(enemy.x - 10, enemy.y - enemy.radius - 8, 20 * (enemy.hp / enemy.maxHp), 3);
  }

  public static drawProjectile(ctx: CanvasRenderingContext2D, p: Projectile) {
    ctx.save();
    ctx.translate(p.x, p.y);
    
    // Rotate towards direction
    const angle = Math.atan2(p.vy, p.vx);
    ctx.rotate(angle);

    if (p.faction === "player") {
      ctx.fillStyle = "rgba(52, 152, 219, 0.4)";
      ctx.fillRect(-6, -p.radius, 12, p.radius*2);
      ctx.fillStyle = p.color;
      ctx.fillRect(-2, -p.radius/2, 4, p.radius);
    } else {
      if (p.damage >= 3) {
         ctx.fillStyle = "rgba(241, 196, 15, 0.6)";
         ctx.fillRect(-p.radius*1.5, -p.radius*1.5, p.radius*3, p.radius*3);
         ctx.fillStyle = "#E74C3C";
         ctx.fillRect(-p.radius, -p.radius, p.radius*2, p.radius*2);
      } else {
         ctx.fillStyle = p.color;
         ctx.fillRect(-p.radius, -p.radius, p.radius*2, p.radius*2);
      }
    }

    ctx.restore();
  }

  public static drawPickup(ctx: CanvasRenderingContext2D, p: Pickup, time: number) {
    ctx.save();
    ctx.translate(p.x, p.y);
    const floatOffset = Math.sin(time * 4) * 2;
    ctx.translate(0, floatOffset);

    ctx.fillStyle = p.type === "mana" ? "rgba(52, 152, 219, 0.3)" : 
                    (p.type === "hp" ? "rgba(46, 204, 113, 0.3)" : 
                    (p.type === "weapon" ? "rgba(231, 76, 60, 0.3)" : "rgba(241, 196, 15, 0.3)"));
    ctx.beginPath();
    ctx.arc(0, 0, p.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    SpriteRenderer.drawPixelSprite(ctx, `pickup_${p.type}`, 0, 0, 2);

    ctx.restore();
  }
}
