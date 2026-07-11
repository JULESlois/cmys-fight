import { Player, PLAYER_WEAPON_OFFSET_X, PLAYER_WEAPON_OFFSET_Y, PLAYER_MUZZLE_OFFSET_X, PLAYER_MUZZLE_OFFSET_Y, PLAYER_HAND_OFFSET_Y } from "../entities/Player";
import { Enemy } from "../entities/Enemy";
import { Projectile } from "../entities/Projectile";
import { Pickup } from "../entities/Pickup";
import { PLAYER_PALETTE } from "../data/sprites";
import { SpriteRenderer } from "./SpriteRenderer";
import { MonsterModelRenderer } from "./MonsterModelRenderer";

export class EntityRenderer {
  private static adjustHex(color: string, amount: number): string {
    const value = color.replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(value)) return color;
    const number = Number.parseInt(value, 16);
    const clamp = (component: number) => Math.max(0, Math.min(255, component + amount));
    const r = clamp((number >> 16) & 255);
    const g = clamp((number >> 8) & 255);
    const b = clamp(number & 255);
    return `#${[r, g, b].map(component => component.toString(16).padStart(2, "0")).join("")}`;
  }

  private static drawCornerFrame(ctx: CanvasRenderingContext2D, half: number, color: string, size = 5): void {
    ctx.fillStyle = color;
    const segments = [
      [-half, -half, size, 2], [-half, -half, 2, size],
      [half - size, -half, size, 2], [half - 2, -half, 2, size],
      [-half, half - 2, size, 2], [-half, half - size, 2, size],
      [half - size, half - 2, size, 2], [half - 2, half - size, 2, size],
    ] as const;
    for (const [x, y, w, h] of segments) ctx.fillRect(x, y, w, h);
  }

  private static drawStatusChips(ctx: CanvasRenderingContext2D, statuses: Array<{ id: string; stacks: number }>, y: number): void {
    const colors: Record<string, string> = {
      poison: "#8BC34A", burn: "#FF7043", slow: "#81D4FA", root: "#A1887F",
    };
    statuses.slice(0, 3).forEach((status, index) => {
      const x = (index - (Math.min(3, statuses.length) - 1) / 2) * 6;
      ctx.fillStyle = "#09101A";
      ctx.fillRect(Math.round(x) - 3, y - 3, 6, 6);
      ctx.fillStyle = colors[status.id] ?? "#FFFFFF";
      ctx.fillRect(Math.round(x) - 2, y - 2, 4, 4);
      if (status.stacks > 1) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(Math.round(x) + 1, y - 2, 1, Math.min(3, status.stacks));
      }
    });
  }


  public static drawTargetMarker(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number) {
    const pulse = Math.floor(time * 8) % 2;
    ctx.save();
    ctx.translate(Math.round(enemy.x), Math.round(enemy.y + enemy.radius + 5));
    EntityRenderer.drawCornerFrame(ctx, enemy.type === "boss" ? 14 + pulse : 9 + pulse, "rgba(0, 242, 254, 0.9)", 4);
    ctx.fillStyle = "rgba(0, 242, 254, 0.8)";
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }

  public static drawPlayer(ctx: CanvasRenderingContext2D, player: Player, engine: any, theme: string) {
    if (player.hp <= 0) return;
    ctx.save();
    ctx.translate(Math.round(player.x), Math.round(player.y));

    if (player.statusEffects.length > 0) EntityRenderer.drawStatusChips(ctx, player.statusEffects, -24);

    if (player.characterId === "knight" && player.skillActiveTimer > 0) {
      EntityRenderer.drawCornerFrame(ctx, 13, "rgba(241, 196, 15, 0.9)", 7);
    } else if (player.characterId === "rogue" && player.skillActiveTimer > 0) {
      ctx.fillStyle = "rgba(46, 204, 113, 0.25)";
      ctx.fillRect(Math.round(-player.skillDirectionX * 18) - 7, Math.round(-player.skillDirectionY * 18) - 14, 14, 22);
    }

    if (player.characterId === "knight" && player.knightGuardReady) {
      EntityRenderer.drawCornerFrame(ctx, 13, "rgba(0, 242, 254, 0.7)", 5);
    }

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(-10, 6, 20, 5);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(-7, 11, 14, 2);

    if (player.invulnerabilityTimer > 0 && Math.floor(player.invulnerabilityTimer * 24) % 2 === 0) ctx.globalAlpha = 0.45;
    const weaponBehindBody = Math.sin(player.aimAngle) < -0.35;
    if (weaponBehindBody) EntityRenderer.drawPlayerWeapon(ctx, player);

    let spriteName = "player_main_side_idle";
    if (player.animState === "walk") spriteName = `player_main_side_walk_${player.animFrame}`;
    SpriteRenderer.drawPixelSprite(ctx, spriteName, 0, -8, 2, {
      hitFlash: player.hitFlash > 0 && !engine.data.settings.reducedFlashing,
      flipX: player.facing === "left",
      paletteOverride: PLAYER_PALETTE,
      outlineColor: "#09101A",
    });
    if (!weaponBehindBody) EntityRenderer.drawPlayerWeapon(ctx, player);
    ctx.restore();
  }

  private static drawPlayerWeapon(ctx: CanvasRenderingContext2D, player: Player) {
    ctx.save();
    ctx.translate(0, PLAYER_HAND_OFFSET_Y);
    ctx.rotate(player.aimAngle);
    if (Math.abs(player.aimAngle) > Math.PI / 2) ctx.scale(1, -1);
    SpriteRenderer.drawPixelSprite(ctx, `weapon_${player.currentWeaponId}`, PLAYER_WEAPON_OFFSET_X, PLAYER_WEAPON_OFFSET_Y, 1, { outlineColor: "#09101A" });
    if (player.muzzleFlash > 0) {
      ctx.fillStyle = `rgba(241, 196, 15, ${player.muzzleFlash})`;
      const mx = PLAYER_MUZZLE_OFFSET_X;
      const my = PLAYER_MUZZLE_OFFSET_Y;
      ctx.fillRect(mx, my - 2, 4, 4); ctx.fillRect(mx + 4, my - 4, 2, 8); ctx.fillRect(mx + 6, my, 2, 4);
    }
    ctx.restore();
  }

  private static drawPixelAttackLine(ctx: CanvasRenderingContext2D, angle: number, length: number, color: string): void {
    ctx.fillStyle = color;
    for (let distance = 8; distance <= length; distance += 7) {
      ctx.fillRect(Math.round(Math.cos(angle) * distance) - 1, Math.round(Math.sin(angle) * distance) - 1, 3, 3);
    }
  }

  private static drawAreaTiles(ctx: CanvasRenderingContext2D, localX: number, localY: number, radius: number, color: string): void {
    const cells = Math.max(1, Math.ceil(radius / 16));
    ctx.fillStyle = color;
    for (let y = -cells; y <= cells; y++) {
      for (let x = -cells; x <= cells; x++) {
        if (x * x + y * y > cells * cells + 1) continue;
        ctx.fillRect(Math.round(localX + x * 16) - 7, Math.round(localY + y * 16) - 7, 14, 14);
      }
    }
  }

  public static drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number, theme: string, reducedFlashing = false) {
    ctx.save();
    ctx.translate(Math.round(enemy.x), Math.round(enemy.y));
    if (enemy.statusEffects.length > 0) EntityRenderer.drawStatusChips(ctx, enemy.statusEffects, -enemy.radius - 13);

    if (enemy.attackState === "windup") {
      const blink = Math.floor(time * 16) % 2 === 0;
      const lineColor = enemy.isElite ? "rgba(241,196,15,0.9)" : "rgba(231,76,60,0.85)";
      const tileColor = blink ? "rgba(231,76,60,0.28)" : "rgba(231,76,60,0.14)";
      if (enemy.behavior === "charge") {
        EntityRenderer.drawPixelAttackLine(ctx, enemy.attackAngle, enemy.chargeDistance, lineColor);
        ctx.strokeStyle = lineColor;
        ctx.strokeRect(Math.round(Math.cos(enemy.attackAngle) * enemy.chargeDistance) - 5, Math.round(Math.sin(enemy.attackAngle) * enemy.chargeDistance) - 5, 10, 10);
      } else if (enemy.behavior === "area") {
        EntityRenderer.drawAreaTiles(ctx, enemy.attackTargetX - enemy.x, enemy.attackTargetY - enemy.y, enemy.areaRadius, tileColor);
      } else if (enemy.behavior === "summon") {
        ctx.fillStyle = tileColor;
        for (const [x, y] of [[0, -18], [18, 0], [0, 18], [-18, 0], [0, 0]] as const) ctx.fillRect(x - 4, y - 4, 8, 8);
      } else if (enemy.behavior === "melee") {
        for (const offset of [-0.45, 0, 0.45]) EntityRenderer.drawPixelAttackLine(ctx, enemy.attackAngle + offset, 22, lineColor);
      } else if (enemy.behavior === "scatter") {
        const spread = Math.max(0.18, enemy.projectileSpread * Math.max(1, enemy.projectileCount - 1));
        for (const offset of [-spread / 2, 0, spread / 2]) EntityRenderer.drawPixelAttackLine(ctx, enemy.attackAngle + offset, 34, lineColor);
      } else if (enemy.behavior === "shoot") {
        EntityRenderer.drawPixelAttackLine(ctx, enemy.attackAngle, 34, lineColor);
      } else if (enemy.behavior === "boss") {
        EntityRenderer.drawCornerFrame(ctx, 25 + enemy.bossPhase * 3 + (blink ? 2 : 0), lineColor, 10);
        EntityRenderer.drawCornerFrame(ctx, 17 + enemy.bossPhase * 2, tileColor, 7);
      }
    }

    if (enemy.isElite) EntityRenderer.drawCornerFrame(ctx, enemy.radius + 6, "rgba(241,196,15,0.9)", 6);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    const shadowWidth = enemy.type === "boss" ? 27 : 15;
    ctx.fillRect(-shadowWidth / 2, enemy.radius - 4, shadowWidth, 5);

    const animOffset = Math.round(Math.sin(time * 5 + enemy.x) * 2);
    ctx.translate(0, animOffset);
    let scale = enemy.isElite ? 1.85 : 1.62;
    if (enemy.type === "boss") scale = 2.45;
    MonsterModelRenderer.draw(ctx, enemy, time, reducedFlashing, scale);
    ctx.restore();

    const barW = enemy.type === "boss" ? 40 : 16;
    const barH = 2;
    const barX = Math.round(enemy.x) - barW / 2;
    const barY = Math.round(enemy.y) - enemy.radius - (enemy.type === "boss" ? 14 : 9);
    ctx.fillStyle = "#1a1c2c"; ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    ctx.fillStyle = "#e43b44"; ctx.fillRect(barX, barY, barW, barH);
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
    ctx.rotate(Math.atan2(p.vy, p.vx));
    if (p.faction === "player") {
      ctx.fillStyle = p.critical ? "rgba(255,215,0,0.55)" : "rgba(52,152,219,0.4)";
      ctx.fillRect(p.critical ? -8 : -6, -p.radius, p.critical ? 16 : 12, p.radius * 2);
      ctx.fillStyle = p.color; ctx.fillRect(-2, -p.radius / 2, 4, p.radius);
      if (p.critical) { ctx.fillStyle = "#FFF"; ctx.fillRect(0, -1, 3, 2); }
    } else if (p.damage >= 3) {
      ctx.fillStyle = "rgba(241,196,15,0.6)"; ctx.fillRect(-p.radius * 1.5, -p.radius * 1.5, p.radius * 3, p.radius * 3);
      ctx.fillStyle = p.color; ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);
    } else {
      ctx.fillStyle = p.color; ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);
    }
    ctx.restore();
  }

  public static drawPickup(ctx: CanvasRenderingContext2D, p: Pickup, time: number) {
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(-6, 5, 12, 3);
    ctx.translate(0, Math.round(Math.sin(time * 4) * 2));
    if (p.type === "weapon" && p.weaponId) {
      SpriteRenderer.drawPixelSprite(ctx, `weapon_${p.weaponId}`, 0, -4, 1, { outlineColor: "#09101A" });
    } else {
      SpriteRenderer.drawPixelSprite(ctx, `pickup_${p.type}`, 0, -4, 1);
    }
    ctx.restore();
  }
}
