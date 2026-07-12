import { Player, PLAYER_WEAPON_OFFSET_X, PLAYER_WEAPON_OFFSET_Y, PLAYER_MUZZLE_OFFSET_X, PLAYER_MUZZLE_OFFSET_Y, PLAYER_HAND_OFFSET_Y } from "../entities/Player";
import { Enemy } from "../entities/Enemy";
import { Projectile } from "../entities/Projectile";
import { Pickup } from "../entities/Pickup";
import { PLAYER_PALETTE } from "../data/sprites";
import { SpriteRenderer } from "./SpriteRenderer";
import { MonsterModelRenderer } from "./MonsterModelRenderer";
import { WEAPONS } from "../data/weapons";

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
    } else if (player.characterId === "mage" && player.skillActiveTimer > 0) {
      ctx.fillStyle = "rgba(142, 68, 173, 0.2)";
      ctx.fillRect(-13, -21, 26, 32);
      EntityRenderer.drawCornerFrame(ctx, 14, "rgba(199, 146, 234, 0.92)", 6);
      EntityRenderer.drawCornerFrame(ctx, 10, "rgba(0, 242, 254, 0.7)", 4);
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
    const weapon = WEAPONS[player.currentWeaponId];
    const renderX = weapon?.renderOffsetX ?? PLAYER_WEAPON_OFFSET_X;
    const renderY = weapon?.renderOffsetY ?? PLAYER_WEAPON_OFFSET_Y;
    SpriteRenderer.drawPixelSprite(ctx, `weapon_${player.currentWeaponId}`, renderX, renderY, 1, { outlineColor: "#02060A" });
    if (player.muzzleFlash > 0) {
      const mx = weapon?.muzzleOffsetX ?? PLAYER_MUZZLE_OFFSET_X;
      const my = weapon?.muzzleOffsetY ?? PLAYER_MUZZLE_OFFSET_Y;
      const effect = weapon?.muzzleEffect ?? "flash";
      ctx.globalAlpha = Math.min(1, player.muzzleFlash);
      if (effect === "beam") {
        ctx.fillStyle = weapon?.color ?? "#8DF6FF";
        ctx.fillRect(mx, my - 1, 12, 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(mx + 2, my, 8, 1);
      } else if (effect === "electric") {
        ctx.fillStyle = weapon?.color ?? "#8DF6FF";
        ctx.fillRect(mx, my - 3, 3, 2);
        ctx.fillRect(mx + 3, my - 1, 4, 2);
        ctx.fillRect(mx + 7, my - 4, 2, 4);
      } else if (effect === "flame") {
        ctx.fillStyle = "#FFF0A6";
        ctx.fillRect(mx, my - 2, 4, 4);
        ctx.fillStyle = "#FFB347";
        ctx.fillRect(mx + 4, my - 3, 5, 6);
        ctx.fillStyle = "#FF7043";
        ctx.fillRect(mx + 9, my - 1, 4, 3);
      } else if (effect === "rocket" || effect === "smoke") {
        ctx.fillStyle = effect === "rocket" ? "#FFB347" : "#E6E6E6";
        ctx.fillRect(mx, my - 2, 4, 4);
        ctx.fillStyle = effect === "rocket" ? "#FF7043" : "#8E9EAB";
        ctx.fillRect(mx + 4, my - 3, 3, 3);
        ctx.fillRect(mx + 6, my + 1, 3, 3);
      } else {
        ctx.fillStyle = "#F1C40F";
        ctx.fillRect(mx, my - 2, 4, 4); ctx.fillRect(mx + 4, my - 4, 2, 8); ctx.fillRect(mx + 6, my, 2, 4);
      }
    }
    ctx.restore();
  }

  private static drawPixelAttackLine(ctx: CanvasRenderingContext2D, angle: number, length: number, color: string): void {
    ctx.fillStyle = color;
    for (let distance = 8; distance <= length; distance += 7) {
      ctx.fillRect(Math.round(Math.cos(angle) * distance) - 1, Math.round(Math.sin(angle) * distance) - 1, 3, 3);
    }
  }

  private static drawAreaTiles(
    ctx: CanvasRenderingContext2D,
    localX: number,
    localY: number,
    radius: number,
    fillColor: string,
    outlineColor: string,
  ): void {
    const cells = Math.max(1, Math.ceil(radius / 16));
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1;
    for (let y = -cells; y <= cells; y++) {
      for (let x = -cells; x <= cells; x++) {
        if (x * x + y * y > cells * cells + 1) continue;
        const left = Math.round(localX + x * 16) - 7;
        const top = Math.round(localY + y * 16) - 7;
        ctx.fillRect(left, top, 14, 14);
        ctx.strokeRect(left, top, 14, 14);
      }
    }
    ctx.fillStyle = outlineColor;
    ctx.fillRect(Math.round(localX) - 2, Math.round(localY) - 2, 5, 5);
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
        EntityRenderer.drawAreaTiles(
          ctx,
          enemy.attackTargetX - enemy.x,
          enemy.attackTargetY - enemy.y,
          enemy.areaRadius,
          tileColor,
          lineColor,
        );
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
    const shadowWidth = enemy.type === "boss" ? 23 : 13;
    ctx.fillRect(-shadowWidth / 2, enemy.radius - 4, shadowWidth, 5);

    const animOffset = Math.round(Math.sin(time * 5 + enemy.x) * 2);
    ctx.translate(0, animOffset);
    let scale = enemy.isElite ? 1.62 : 1.42;
    if (enemy.type === "boss") scale = 2.15;
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

  public static drawProjectile(ctx: CanvasRenderingContext2D, p: Projectile, reducedFlashing = false) {
    if (p.faction === "player" && p.style === "yoyo") {
      ctx.save();
      ctx.strokeStyle = "rgba(184, 242, 232, 0.72)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(p.anchorX), Math.round(p.anchorY - 2));
      ctx.lineTo(Math.round(p.x), Math.round(p.y));
      ctx.stroke();
      ctx.translate(Math.round(p.x), Math.round(p.y));
      ctx.rotate(p.spinAngle);
      ctx.fillStyle = "#123C4A";
      ctx.fillRect(-7, -7, 14, 14);
      ctx.fillStyle = "#52D6C6";
      ctx.fillRect(-5, -5, 10, 10);
      ctx.fillStyle = "#D8FFF7";
      ctx.fillRect(-2, -2, 4, 4);
      ctx.fillStyle = "#7BFFF0";
      ctx.fillRect(4, -1, 3, 2);
      ctx.restore();
      return;
    }

    if (p.faction === "player" && (p.style === "beam" || p.style === "lightning" || p.style === "prism")) {
      const speed = Math.hypot(p.vx, p.vy) || 1;
      const ux = p.vx / speed;
      const uy = p.vy / speed;
      const startX = p.x - ux * p.trailLength;
      const startY = p.y - uy * p.trailLength;
      ctx.save();
      ctx.globalAlpha = reducedFlashing ? 0.46 : p.style === "lightning" ? 0.9 : 0.78;
      if (p.style === "beam" || p.style === "prism") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, p.beamWidth + 1);
        ctx.beginPath();
        ctx.moveTo(Math.round(startX), Math.round(startY));
        ctx.lineTo(Math.round(p.x), Math.round(p.y));
        ctx.stroke();
        if (!reducedFlashing) {
          ctx.strokeStyle = p.style === "prism" ? "rgba(255,255,255,0.88)" : "#FFFFFF";
          ctx.lineWidth = Math.max(1, p.beamWidth - 1);
          ctx.beginPath();
          ctx.moveTo(Math.round(startX + ux * 4), Math.round(startY + uy * 4));
          ctx.lineTo(Math.round(p.x), Math.round(p.y));
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = p.color;
        const segments = 6;
        for (let i = 0; i < segments; i++) {
          const t = i / (segments - 1);
          const jitter = Math.sin((p.id + i * 3 + p.age * 34) * 2.1) * 3;
          const x = startX + (p.x - startX) * t - uy * jitter;
          const y = startY + (p.y - startY) * t + ux * jitter;
          ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
        }
      }
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    ctx.rotate(Math.atan2(p.vy, p.vx));
    if (p.faction === "player") {
      if (p.style === "water") {
        const pulse = 1 + Math.floor((Math.sin(p.age * 12) + 1) * 0.5);
        ctx.fillStyle = "rgba(105, 200, 255, 0.24)";
        ctx.fillRect(-p.radius - pulse - 2, -p.radius - pulse - 2, (p.radius + pulse + 2) * 2, (p.radius + pulse + 2) * 2);
        ctx.fillStyle = "#2471A3";
        ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);
        ctx.fillStyle = "#69C8FF";
        ctx.fillRect(-p.radius + 2, -p.radius + 1, Math.max(2, p.radius), Math.max(2, p.radius));
        ctx.fillStyle = "#E9FAFF";
        ctx.fillRect(0, -2, 2, 2);
      } else if (p.style === "sword") {
        ctx.rotate(Math.sin(p.age * 15 + p.id) * 0.22);
        SpriteRenderer.drawPixelSprite(ctx, "weapon_zenith", 0, 0, 1, { outlineColor: "#07101A" });
      } else if (p.style === "dragon") {
        const segments = Math.max(3, 2 + p.summonLevel);
        for (let index = segments - 1; index >= 0; index--) {
          const x = -index * 5;
          const wave = Math.round(Math.sin(p.age * 9 - index * 0.8) * 2);
          ctx.fillStyle = index === 0 ? "#D8FFF7" : index % 2 === 0 ? "#5DADE2" : "#2E86C1";
          const size = index === 0 ? 7 : Math.max(3, 6 - Math.floor(index / 3));
          ctx.fillRect(x - Math.floor(size / 2), wave - Math.floor(size / 2), size, size);
          if (index === 0) {
            ctx.fillStyle = "#123C4A";
            ctx.fillRect(x + 2, wave - 2, 2, 2);
            ctx.fillStyle = "#8DF6FF";
            ctx.fillRect(x + 4, wave, 3, 2);
          }
        }
      } else if (p.style === "tracer") {
        ctx.fillStyle = reducedFlashing
          ? "rgba(255,255,255,0.18)"
          : p.critical ? "rgba(255,240,160,0.65)" : "rgba(255,255,255,0.35)";
        ctx.fillRect(-p.trailLength, -1, p.trailLength, 2);
        ctx.fillStyle = p.color;
        ctx.fillRect(-3, -p.radius / 2, 6, Math.max(2, p.radius));
      } else if (p.style === "plasma") {
        const pulse = 1 + Math.floor((Math.sin(p.age * 16) + 1) * 0.5);
        ctx.fillStyle = reducedFlashing ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.35)";
        ctx.fillRect(-p.radius - pulse, -p.radius - pulse, (p.radius + pulse) * 2, (p.radius + pulse) * 2);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(-1, -1, 2, 2);
      } else if (p.style === "flame") {
        ctx.fillStyle = "rgba(255,112,67,0.35)";
        ctx.fillRect(-8, -3, 8, 6);
        ctx.fillStyle = p.color;
        ctx.fillRect(-3, -p.radius, 6, p.radius * 2);
        ctx.fillStyle = "#FFF0A6";
        ctx.fillRect(0, -1, 3, 2);
      } else if (p.style === "rocket") {
        ctx.fillStyle = "#8E9EAB";
        ctx.fillRect(-8, -p.radius, 5, p.radius * 2);
        ctx.fillStyle = "#FF7043";
        ctx.fillRect(-11, -2, 4, 4);
        ctx.fillStyle = p.color;
        ctx.fillRect(-3, -p.radius, 7, p.radius * 2);
        ctx.fillStyle = "#F7F9F9";
        ctx.fillRect(3, -1, 3, 2);
      } else if (p.style === "disc") {
        ctx.rotate(p.spinAngle);
        ctx.fillStyle = "rgba(255,255,255,0.28)";
        ctx.fillRect(-p.radius - 2, -1, (p.radius + 2) * 2, 3);
        ctx.fillRect(-1, -p.radius - 2, 3, (p.radius + 2) * 2);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.radius, -2, p.radius * 2, 4);
        ctx.fillRect(-2, -p.radius, 4, p.radius * 2);
      } else {
        ctx.fillStyle = p.critical ? "rgba(255,215,0,0.55)" : "rgba(52,152,219,0.4)";
        ctx.fillRect(p.critical ? -8 : -6, -p.radius, p.critical ? 16 : 12, p.radius * 2);
        ctx.fillStyle = p.color; ctx.fillRect(-2, -p.radius / 2, 4, p.radius);
        if (p.critical) { ctx.fillStyle = "#FFF"; ctx.fillRect(0, -1, 3, 2); }
      }
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
