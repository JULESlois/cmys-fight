import { Player, PLAYER_WEAPON_OFFSET_X, PLAYER_WEAPON_OFFSET_Y, PLAYER_MUZZLE_OFFSET_X, PLAYER_MUZZLE_OFFSET_Y, PLAYER_HAND_OFFSET_Y } from "../entities/Player";
import { Enemy } from "../entities/Enemy";
import { Projectile } from "../entities/Projectile";
import { Pickup } from "../entities/Pickup";
import { PALETTES } from "../data/palettes";
import { CHARACTERS } from "../data/characters";
import { PLAYER_PALETTE } from "../data/sprites";
import { SpriteRenderer } from "./SpriteRenderer";

export class EntityRenderer {
  public static drawTargetMarker(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number) {
    const pulse = 1 + Math.sin(time * 8) * 0.15;
    const radius = (enemy.type === "boss" ? 18 : 11) * pulse;
    ctx.save();
    ctx.translate(Math.round(enemy.x), Math.round(enemy.y + enemy.radius + 4));
    ctx.strokeStyle = "rgba(0, 242, 254, 0.9)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius, radius * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(0, 242, 254, 0.75)";
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }

    public static drawPlayer(ctx: CanvasRenderingContext2D, player: Player, engine: any, theme: string) {
    if (player.hp <= 0) return;

    ctx.save();
    ctx.translate(Math.round(player.x), Math.round(player.y));

    if (player.characterId === "knight" && player.skillActiveTimer > 0) {
      ctx.strokeStyle = "rgba(241, 196, 15, 0.9)";
      ctx.lineWidth = 2;
      ctx.strokeRect(-12, -18, 24, 26);
    } else if (player.characterId === "rogue" && player.skillActiveTimer > 0) {
      ctx.fillStyle = "rgba(46, 204, 113, 0.25)";
      ctx.fillRect(
        Math.round(-player.skillDirectionX * 18) - 7,
        Math.round(-player.skillDirectionY * 18) - 14,
        14,
        22,
      );
    }

    if (player.characterId === "knight" && player.knightGuardReady) {
      ctx.strokeStyle = "rgba(0, 242, 254, 0.65)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, -4, 13, 0, Math.PI * 2);
      ctx.stroke();
    }

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

      if (enemy.behavior === "charge") {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(
          Math.cos(enemy.attackAngle) * enemy.chargeDistance,
          Math.sin(enemy.attackAngle) * enemy.chargeDistance,
        );
        ctx.stroke();
        ctx.strokeRect(
          Math.round(Math.cos(enemy.attackAngle) * enemy.chargeDistance) - 4,
          Math.round(Math.sin(enemy.attackAngle) * enemy.chargeDistance) - 4,
          8,
          8,
        );
      } else if (enemy.behavior === "area") {
        ctx.beginPath();
        ctx.arc(
          enemy.attackTargetX - enemy.x,
          enemy.attackTargetY - enemy.y,
          enemy.areaRadius,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.stroke();
      } else if (enemy.behavior === "summon") {
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius + 12 + Math.sin(time * 18) * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (enemy.behavior === "melee") {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 22, enemy.attackAngle - 0.85, enemy.attackAngle + 0.85);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (enemy.behavior === "scatter") {
        const spread = Math.max(0.18, enemy.projectileSpread * Math.max(1, enemy.projectileCount - 1));
        for (const offset of [-spread / 2, 0, spread / 2]) {
          ctx.beginPath();
          ctx.moveTo(Math.cos(enemy.attackAngle + offset) * 8, Math.sin(enemy.attackAngle + offset) * 8);
          ctx.lineTo(Math.cos(enemy.attackAngle + offset) * 34, Math.sin(enemy.attackAngle + offset) * 34);
          ctx.stroke();
        }
      } else if (enemy.behavior === "shoot") {
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
      } else if (enemy.behavior === "boss") {
        ctx.beginPath();
        ctx.arc(0, 0, 26 + enemy.bossPhase * 3 + Math.sin(time * 18) * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    if (enemy.isElite) {
      const elitePulse = 0.5 + Math.sin(time * 8 + enemy.id) * 0.2;
      ctx.strokeStyle = `rgba(241, 196, 15, ${elitePulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -2, enemy.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
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
    let scale = enemy.isElite ? 2.35 : 2;
    if (enemy.type === "boss") scale = 3;
    
    SpriteRenderer.drawPixelSprite(ctx, `enemy_${enemy.type}_idle`, 0, -8, scale, { hitFlash: isHit });
    ctx.fillStyle = enemy.displayColor;
    ctx.globalAlpha = enemy.isElite ? 0.9 : 0.65;
    ctx.fillRect(-2, -enemy.radius - 8, 4, 3);
    ctx.globalAlpha = 1;
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
    ctx.fillStyle = enemy.isElite ? "#F1C40F" : "#2ECC71";
    ctx.fillRect(barX, barY, Math.round(barW * (enemy.hp / enemy.maxHp)), barH);

    if (enemy.type === "boss") {
      for (let phase = 1; phase <= 3; phase++) {
        ctx.fillStyle = phase <= enemy.bossPhase ? enemy.displayColor : "#34495E";
        ctx.fillRect(barX + (phase - 1) * 6, barY - 5, 4, 2);
      }
    }
  }
public static drawProjectile(ctx: CanvasRenderingContext2D, p: Projectile) {
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    
    // Rotate towards direction
    const angle = Math.atan2(p.vy, p.vx);
    ctx.rotate(angle);

    if (p.faction === "player") {
      ctx.fillStyle = p.critical ? "rgba(255, 215, 0, 0.55)" : "rgba(52, 152, 219, 0.4)";
      ctx.fillRect(p.critical ? -8 : -6, -p.radius, p.critical ? 16 : 12, p.radius*2);
      ctx.fillStyle = p.color;
      ctx.fillRect(-2, -p.radius/2, 4, p.radius);
      if (p.critical) {
        ctx.fillStyle = "#FFF";
        ctx.fillRect(0, -1, 3, 2);
      }
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
