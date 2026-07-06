import { Player } from "../entities/Player";
import { Enemy } from "../entities/Enemy";
import { Projectile } from "../entities/Projectile";
import { Pickup } from "../entities/Pickup";

export class EntityRenderer {
  public static drawPlayer(ctx: CanvasRenderingContext2D, player: Player, engine: any) {
    if (player.hp <= 0) return;

    ctx.save();
    ctx.translate(player.x, player.y);

    // Player direction state inference
    // Very simple direction logic based on mouse axis or last movement if needed.
    // For now, let's keep a standard knight shape facing right, mirrored if facing left.
    let axis = engine.input.getAxis();
    let facingLeft = false;
    // Basic heuristics: if mouse is left of player, face left, but we don't have mouse pos easily available here
    // Let's use movement axis.
    if (axis.x < 0) facingLeft = true;

    if (facingLeft) {
      ctx.scale(-1, 1);
    }

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, 8, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body (Cloak)
    ctx.fillStyle = "#3498DB";
    ctx.beginPath();
    ctx.moveTo(-5, -2);
    ctx.lineTo(5, -2);
    ctx.lineTo(7, 8);
    ctx.lineTo(-7, 8);
    ctx.fill();

    // Head (Helmet)
    ctx.fillStyle = "#BDC3C7";
    ctx.beginPath();
    ctx.arc(0, -6, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Visor
    ctx.fillStyle = "#2C3E50";
    ctx.fillRect(1, -8, 4, 3);
    
    // Weapon Hint
    ctx.fillStyle = "#95A5A6";
    ctx.fillRect(4, -1, 8, 2);

    // Hit flash? For now just basic shapes.

    ctx.restore();
  }

  public static drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, enemy.radius, enemy.radius, enemy.radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    const animOffset = Math.sin(time * 5 + enemy.x) * 2; // Simple bobbing

    if (enemy.type === "melee") {
      // Red melee with horns
      ctx.translate(0, animOffset);
      ctx.fillStyle = "#E74C3C";
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Horns
      ctx.fillStyle = "#C0392B";
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
      // Purple ranged with cannon
      ctx.translate(0, animOffset);
      ctx.fillStyle = "#9B59B6";
      ctx.fillRect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2);
      
      // Cannon eye
      ctx.fillStyle = "#8E44AD";
      ctx.fillRect(2, -2, 8, 4);
      ctx.fillStyle = "#E74C3C";
      ctx.fillRect(8, -1, 2, 2);

    } else if (enemy.type === "boss") {
      // Big Boss with Aura
      const auraScale = 1 + Math.sin(time * 3) * 0.1;
      ctx.fillStyle = "rgba(241, 196, 15, 0.3)";
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * 1.5 * auraScale, 0, Math.PI * 2);
      ctx.fill();

      ctx.translate(0, animOffset * 0.5);
      
      // Outer Armor
      ctx.fillStyle = "#D35400";
      ctx.beginPath();
      ctx.moveTo(0, -enemy.radius);
      ctx.lineTo(enemy.radius, 0);
      ctx.lineTo(0, enemy.radius);
      ctx.lineTo(-enemy.radius, 0);
      ctx.fill();

      // Core
      ctx.fillStyle = "#F1C40F";
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#FFF";
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Fallback
      ctx.fillStyle = "#E74C3C";
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
      // Player: Bright pellet with short trail
      ctx.fillStyle = "rgba(52, 152, 219, 0.4)";
      ctx.beginPath();
      ctx.ellipse(-4, 0, 8, p.radius, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Enemy: Red/Purple danger color with stroke
      if (p.damage >= 3) {
         // Boss projectile
         ctx.fillStyle = "rgba(241, 196, 15, 0.6)";
         ctx.beginPath();
         ctx.arc(0, 0, p.radius * 1.5, 0, Math.PI * 2);
         ctx.fill();

         ctx.fillStyle = "#E74C3C";
         ctx.beginPath();
         ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
         ctx.fill();
         ctx.strokeStyle = "#F1C40F";
         ctx.lineWidth = 1;
         ctx.stroke();
      } else {
         ctx.fillStyle = p.color;
         ctx.beginPath();
         ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
         ctx.fill();
         ctx.strokeStyle = "#C0392B";
         ctx.lineWidth = 1;
         ctx.stroke();
      }
    }

    ctx.restore();
  }

  public static drawPickup(ctx: CanvasRenderingContext2D, p: Pickup, time: number) {
    ctx.save();
    ctx.translate(p.x, p.y);
    const floatOffset = Math.sin(time * 4) * 2;
    ctx.translate(0, floatOffset);

    // Glow
    ctx.fillStyle = p.type === "mana" ? "rgba(52, 152, 219, 0.3)" : 
                    (p.type === "hp" ? "rgba(46, 204, 113, 0.3)" : 
                    (p.type === "weapon" ? "rgba(231, 76, 60, 0.3)" : "rgba(241, 196, 15, 0.3)"));
    ctx.beginPath();
    ctx.arc(0, 0, p.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    if (p.type === "hp") {
      // Green cross / potion
      ctx.fillStyle = "#2ECC71";
      ctx.fillRect(-2, -6, 4, 12);
      ctx.fillRect(-6, -2, 12, 4);
    } else if (p.type === "mana") {
      // Blue diamond
      ctx.fillStyle = "#3498DB";
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 6);
      ctx.lineTo(-5, 0);
      ctx.fill();
    } else if (p.type === "coin") {
      // Gold coin
      ctx.fillStyle = "#F1C40F";
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#F39C12";
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      // Highlight
      ctx.fillStyle = "#FFF";
      ctx.fillRect(-2, -3, 2, 2);
    } else if (p.type === "weapon") {
      // Tiny weapon silhouette
      ctx.fillStyle = "#E74C3C";
      ctx.fillRect(-5, -1, 10, 3);
      ctx.fillStyle = "#C0392B";
      ctx.fillRect(-3, -3, 3, 5);
      ctx.fillStyle = "#F1C40F";
      ctx.fillRect(4, -2, 2, 5);
    }

    ctx.restore();
  }
}
