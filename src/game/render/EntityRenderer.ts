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

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, 8, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.save();
    if (player.facingLeft) {
      ctx.scale(-1, 1);
    }

    const isHit = player.hitFlash > 0;
    const charConfig = CHARACTERS[player.characterId] || CHARACTERS["knight"];
    
    const spriteName = `player_${player.characterId}_idle`;
    const paletteOverride = charConfig ? { "2": charConfig.color } : undefined;
    
    SpriteRenderer.drawPixelSprite(ctx, spriteName, 0, -8, 1.5, { 
      hitFlash: isHit,
      paletteOverride
    });
    ctx.restore();

    // Weapon
    ctx.save();
    ctx.translate(0, -2); // Roughly hand level
    ctx.rotate(player.aimAngle);
    if (Math.abs(player.aimAngle) > Math.PI / 2) {
      ctx.scale(1, -1);
    }
    
    // Shift weapon forward
    SpriteRenderer.drawPixelSprite(ctx, `pickup_${player.currentWeaponId}`, 10, -2, 1);

    if (player.muzzleFlash > 0) {
      // Pixel muzzle flash at barrel end
      ctx.fillStyle = "rgba(241, 196, 15, " + player.muzzleFlash + ")";
      ctx.fillRect(18, -6, 4, 4);
      ctx.fillRect(22, -8, 2, 8);
      ctx.fillRect(24, -4, 2, 4);
      ctx.fillStyle = "rgba(255, 255, 255, " + player.muzzleFlash + ")";
      ctx.fillRect(20, -4, 2, 2);
    }
    ctx.restore();

    ctx.restore();
  }
  public static drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number, theme: string) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    let shadowRad = enemy.type === "boss" ? 16 : 8;
    ctx.beginPath();
    ctx.ellipse(0, enemy.radius - 2, shadowRad, shadowRad * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    const animOffset = Math.sin(time * 5 + enemy.x) * 2; // Simple bobbing
    const isHit = enemy.hitFlash > 0;
    
    ctx.translate(0, animOffset);
    let scale = 1.5;
    if (enemy.type === "boss") scale = 2.5;
    
    SpriteRenderer.drawPixelSprite(ctx, `enemy_${enemy.type}_idle`, 0, -8, scale, { hitFlash: isHit });
    ctx.restore();

    // Pixel HP bar
    const barW = enemy.type === "boss" ? 40 : 16;
    const barH = 2;
    const barX = enemy.x - barW / 2;
    const barY = enemy.y - enemy.radius - (enemy.type === "boss" ? 16 : 10);
    
    ctx.fillStyle = "#1a1c2c";
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    ctx.fillStyle = "#e43b44";
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = "#2ECC71";
    ctx.fillRect(barX, barY, barW * (enemy.hp / enemy.maxHp), barH);
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
    
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, 6, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    const floatOffset = Math.sin(time * 4) * 2;
    ctx.translate(0, floatOffset);

    let spriteName = `pickup_${p.type}`;
    if (p.type === "weapon" && p.weaponId) {
        spriteName = `pickup_${p.weaponId}`;
    }

    SpriteRenderer.drawPixelSprite(ctx, spriteName, 0, -4, 1);
    ctx.restore();
  }
}
