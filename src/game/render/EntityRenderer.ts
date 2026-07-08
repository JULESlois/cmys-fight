import { Player, PLAYER_WEAPON_OFFSET_X, PLAYER_WEAPON_OFFSET_Y, PLAYER_MUZZLE_OFFSET_X, PLAYER_MUZZLE_OFFSET_Y, PLAYER_HAND_OFFSET_Y } from "../entities/Player";
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


    const isHit = player.hitFlash > 0;
    const charConfig = CHARACTERS[player.characterId] || CHARACTERS["knight"];
    
    let animFacing: string = player.facing;
    let flipX = false;
    if (animFacing === "left") {
        animFacing = "side";
        flipX = true;
    } else if (animFacing === "right") {
        animFacing = "side";
    }
    
    let spriteName = `player_${player.characterId}_${player.animState}_${animFacing}`;
    if (player.animState === "walk") {
        spriteName += `_${player.animFrame}`;
    }
    
    const paletteOverride = charConfig ? { "2": charConfig.color } : undefined;
    
    SpriteRenderer.drawPixelSprite(ctx, spriteName, 0, -8, 2, { 
      hitFlash: isHit,
      paletteOverride,
      flipX
    });
    ctx.restore();

    // Weapon
    ctx.save();
    ctx.translate(0, PLAYER_HAND_OFFSET_Y); // Roughly hand level
    ctx.rotate(player.aimAngle);
    if (Math.abs(player.aimAngle) > Math.PI / 2) {
      ctx.scale(1, -1);
    }
    
    // Shift weapon forward
    SpriteRenderer.drawPixelSprite(ctx, `pickup_${player.currentWeaponId}`, PLAYER_WEAPON_OFFSET_X, PLAYER_WEAPON_OFFSET_Y, 1);

    if (player.muzzleFlash > 0) {
      // Pixel muzzle flash at barrel end
      ctx.fillStyle = "rgba(241, 196, 15, " + player.muzzleFlash + ")";
      const mx = PLAYER_MUZZLE_OFFSET_X;
      const my = PLAYER_MUZZLE_OFFSET_Y;
      ctx.fillRect(mx, my - 2, 4, 4);
      ctx.fillRect(mx + 4, my - 4, 2, 8);
      ctx.fillRect(mx + 6, my, 2, 4);
      ctx.fillStyle = "rgba(255, 255, 255, " + player.muzzleFlash + ")";
      ctx.fillRect(mx + 2, my, 2, 2);
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
    let scale = 2;
    if (enemy.type === "boss") scale = 3;
    
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
