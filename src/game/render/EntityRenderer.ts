import { Player, PLAYER_WEAPON_OFFSET_X, PLAYER_WEAPON_OFFSET_Y, PLAYER_MUZZLE_OFFSET_X, PLAYER_MUZZLE_OFFSET_Y, PLAYER_HAND_OFFSET_Y } from "../entities/Player";
import { Enemy } from "../entities/Enemy";
import { Projectile } from "../entities/Projectile";
import { Pickup } from "../entities/Pickup";
import { PALETTES } from "../data/palettes";
import { CHARACTERS } from "../data/characters";
import { PLAYER_PALETTE } from "../data/sprites";
import { SpriteRenderer } from "./SpriteRenderer";

export class EntityRenderer {
    public static drawPlayer(ctx: CanvasRenderingContext2D, player: Player, engine: any, theme: string) {
    if (player.hp <= 0) return;

    ctx.save();
    ctx.translate(Math.round(player.x), Math.round(player.y));

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, 8, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (player.invulnerabilityTimer > 0 && Math.floor(player.invulnerabilityTimer * 24) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    const weaponBehindBody = Math.sin(player.aimAngle) < -0.35;

    if (weaponBehindBody) {
       EntityRenderer.drawPlayerWeapon(ctx, player);
    }

    // Body
    ctx.save();
    let spriteName = "player_main_side_idle";

    if (player.animState === "walk") {
      spriteName = `player_main_side_walk_${player.animFrame}`;
    }

    const flipX = player.facing === "left";
    
    SpriteRenderer.drawPixelSprite(ctx, spriteName, 0, -8, 2, { 
      hitFlash: player.hitFlash > 0,
      flipX,
      paletteOverride: PLAYER_PALETTE
    });
    ctx.restore();

    if (!weaponBehindBody) {
       EntityRenderer.drawPlayerWeapon(ctx, player);
    }

    ctx.restore();
  }

  private static drawPlayerWeapon(ctx: CanvasRenderingContext2D, player: Player) {
    ctx.save();
    ctx.translate(0, PLAYER_HAND_OFFSET_Y); // Roughly hand level
    ctx.rotate(player.aimAngle);
    if (Math.abs(player.aimAngle) > Math.PI / 2) {
      ctx.scale(1, -1);
    }
    
    // Shift weapon forward
    SpriteRenderer.drawPixelSprite(ctx, `weapon_${player.currentWeaponId}`, PLAYER_WEAPON_OFFSET_X, PLAYER_WEAPON_OFFSET_Y, 1, {
      
    });

    if (player.muzzleFlash > 0) {
      // Pixel muzzle flash at barrel end
      ctx.fillStyle = "rgba(241, 196, 15, " + player.muzzleFlash + ")";
      const mx = PLAYER_MUZZLE_OFFSET_X;
      const my = PLAYER_MUZZLE_OFFSET_Y;
      ctx.fillRect(mx, my - 2, 4, 4);
      ctx.fillRect(mx + 4, my - 4, 2, 8);
      ctx.fillRect(mx + 6, my, 2, 4);
    }
    ctx.restore();
  }

  public static drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number, theme: string) {
    ctx.save();
    ctx.translate(Math.round(enemy.x), Math.round(enemy.y));

    if (enemy.attackState === "windup") {
      const pulse = 0.55 + Math.sin(time * 22) * 0.2;
      ctx.strokeStyle = `rgba(231, 76, 60, ${pulse})`;
      ctx.fillStyle = `rgba(231, 76, 60, ${pulse * 0.2})`;
      ctx.lineWidth = 2;

      if (enemy.type === "melee") {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 22, enemy.attackAngle - 0.85, enemy.attackAngle + 0.85);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (enemy.type === "ranged") {
        ctx.beginPath();
        ctx.moveTo(Math.cos(enemy.attackAngle) * 8, Math.sin(enemy.attackAngle) * 8);
        ctx.lineTo(Math.cos(enemy.attackAngle) * 34, Math.sin(enemy.attackAngle) * 34);
        ctx.stroke();
        ctx.fillRect(
          Math.round(Math.cos(enemy.attackAngle) * 34) - 2,
          Math.round(Math.sin(enemy.attackAngle) * 34) - 2,
          4,
          4
        );
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, 28 + Math.sin(time * 18) * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    let shadowRad = enemy.type === "boss" ? 16 : 8;
    ctx.beginPath();
    ctx.ellipse(0, enemy.radius - 2, shadowRad, shadowRad * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    const animOffset = Math.round(Math.sin(time * 5 + enemy.x) * 2); // Simple bobbing
    const isHit = enemy.hitFlash > 0;
    
    ctx.translate(0, animOffset);
    let scale = 2;
    if (enemy.type === "boss") scale = 3;
    
    SpriteRenderer.drawPixelSprite(ctx, `enemy_${enemy.type}_idle`, 0, -8, scale, { hitFlash: isHit });
    ctx.restore();

    // Pixel HP bar
    const barW = enemy.type === "boss" ? 40 : 16;
    const barH = 2;
    const barX = Math.round(enemy.x) - barW / 2;
    const barY = Math.round(enemy.y) - enemy.radius - (enemy.type === "boss" ? 16 : 10);
    
    ctx.fillStyle = "#1a1c2c";
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    ctx.fillStyle = "#e43b44";
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = "#2ECC71";
    ctx.fillRect(barX, barY, Math.round(barW * (enemy.hp / enemy.maxHp)), barH);
  }
public static drawProjectile(ctx: CanvasRenderingContext2D, p: Projectile) {
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    
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
    ctx.translate(Math.round(p.x), Math.round(p.y));
    
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, 6, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    const floatOffset = Math.round(Math.sin(time * 4) * 2);
    ctx.translate(0, floatOffset);

    let spriteName = `pickup_${p.type}`;
    if (p.type === "weapon" && p.weaponId) {
        spriteName = `pickup_${p.weaponId}`;
    }

    SpriteRenderer.drawPixelSprite(ctx, spriteName, 0, -4, 1);
    ctx.restore();
  }
}
