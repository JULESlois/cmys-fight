import { Player, PLAYER_WEAPON_OFFSET_X, PLAYER_WEAPON_OFFSET_Y, PLAYER_MUZZLE_OFFSET_X, PLAYER_MUZZLE_OFFSET_Y, PLAYER_HAND_OFFSET_Y } from "../entities/Player";
import { Enemy } from "../entities/Enemy";
import { Projectile } from "../entities/Projectile";
import { Pickup } from "../entities/Pickup";
import { KANAMI_PLAYER_PALETTE, MICHELE_PLAYER_PALETTE, PLAYER_PALETTE } from "../data/sprites";
import { SpriteRenderer } from "./SpriteRenderer";
import { MonsterModelRenderer } from "./MonsterModelRenderer";
import { WEAPONS } from "../data/weapons";
import { ProjectileArtRenderer } from "./ProjectileArtRenderer";

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
    ctx.translate(Math.round(enemy.hitboxX), Math.round(enemy.hitboxY));
    EntityRenderer.drawCornerFrame(ctx, enemy.hitboxRadius + 2 + pulse, "rgba(0, 242, 254, 0.9)", 4);
    ctx.fillStyle = "rgba(0, 242, 254, 0.8)";
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }

  public static drawMicheleMark(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number): void {
    const pulse = Math.floor(time * 10) % 2;
    const half = enemy.hitboxRadius + 3 + pulse;
    ctx.save();
    ctx.translate(Math.round(enemy.hitboxX), Math.round(enemy.hitboxY));
    EntityRenderer.drawCornerFrame(ctx, half, "rgba(244, 211, 94, 0.95)", 5);
    ctx.fillStyle = "rgba(112, 215, 255, 0.95)";
    ctx.fillRect(-5, -half - 4, 3, 3);
    ctx.fillRect(2, -half - 4, 3, 3);
    ctx.fillRect(-3, -half - 2, 6, 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(-1, -half - 1, 2, 2);
    ctx.restore();
  }

  public static drawMicheleTurret(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    time: number,
    hitsRemaining = 6,
  ): void {
    const blink = Math.floor(time * 8) % 2 === 0;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.fillRect(-9, 7, 18, 4);
    ctx.fillStyle = "#101827";
    ctx.fillRect(-8, -6, 16, 14);
    ctx.fillStyle = "#E8F5FF";
    ctx.fillRect(-6, -4, 12, 8);
    ctx.fillStyle = "#4C8FD1";
    ctx.fillRect(-5, -3, 10, 6);
    ctx.fillStyle = "#70D7FF";
    ctx.fillRect(-3, -1, 6, 3);
    ctx.fillStyle = blink ? "#F4D35E" : "#FFFFFF";
    ctx.fillRect(-1, 0, 2, 2);
    ctx.fillStyle = "#101827";
    ctx.fillRect(-7, -9, 4, 4);
    ctx.fillRect(3, -9, 4, 4);
    ctx.fillStyle = "#70D7FF";
    ctx.fillRect(-6, -8, 2, 2);
    ctx.fillRect(4, -8, 2, 2);
    ctx.fillStyle = "#263B55";
    ctx.fillRect(-7, 8, 4, 4);
    ctx.fillRect(3, 8, 4, 4);
    for (let hit = 0; hit < 6; hit++) {
      ctx.fillStyle = hit < hitsRemaining ? "#70D7FF" : "#263B55";
      ctx.fillRect(-8 + hit * 3, 13, 2, 2);
    }
    ctx.restore();
  }


  public static drawKanamiBeacon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    deployed: boolean,
    time: number,
  ): void {
    const pulse = Math.floor(time * 8) % 3;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (deployed) {
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = "#F06CA8";
      ctx.lineWidth = 1;
      for (let ring = 0; ring < 3; ring++) {
        const radius = 12 + ((pulse + ring) % 3) * 8;
        ctx.strokeRect(-radius, -radius / 2, radius * 2, radius);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(-8, 7, 16, 4);
      ctx.fillStyle = "#171722";
      ctx.fillRect(-6, -8, 12, 16);
      ctx.fillStyle = "#3D3B49";
      ctx.fillRect(-4, -6, 8, 11);
      ctx.fillStyle = "#F06CA8";
      ctx.fillRect(-2, -4, 4, 7);
      ctx.fillStyle = "#FFF1F8";
      ctx.fillRect(-1, -3, 2, 2);
      ctx.fillStyle = "#8FD9FF";
      ctx.fillRect(-4, 6, 3, 3);
      ctx.fillRect(1, 6, 3, 3);
      ctx.fillStyle = "#F06CA8";
      ctx.fillRect(-11, -8 - pulse, 2, 4);
      ctx.fillRect(9, -12 + pulse, 2, 4);
    } else {
      ctx.rotate(time * 8);
      ctx.fillStyle = "#171722";
      ctx.fillRect(-5, -3, 10, 6);
      ctx.fillStyle = "#F06CA8";
      ctx.fillRect(-3, -2, 6, 4);
      ctx.fillStyle = "#FFF1F8";
      ctx.fillRect(-1, -1, 2, 2);
    }
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
    } else if (player.characterId === "michele" && player.micheleTurretActive) {
      EntityRenderer.drawCornerFrame(ctx, 13, "rgba(112, 215, 255, 0.85)", 5);
      ctx.fillStyle = "rgba(244, 211, 94, 0.8)";
      ctx.fillRect(-5, -23, 3, 3);
      ctx.fillRect(2, -23, 3, 3);
    } else if (player.characterId === "kanami" && player.skillActiveTimer > 0) {
      EntityRenderer.drawCornerFrame(ctx, 13, "rgba(240, 108, 168, 0.88)", 5);
      ctx.fillStyle = "rgba(143, 217, 255, 0.8)";
      ctx.fillRect(-7, -23, 3, 2);
      ctx.fillRect(4, -20, 2, 3);
    }

    if (player.characterId === "knight" && player.knightGuardReady) {
      EntityRenderer.drawCornerFrame(ctx, 13, "rgba(0, 242, 254, 0.7)", 5);
    }

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(-10, 6, 20, 5);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(-7, 11, 14, 2);

    if (player.invulnerabilityTimer > 0 && Math.floor(player.invulnerabilityTimer * 24) % 2 === 0) ctx.globalAlpha = 0.45;
    const playerSpritePrefix = player.characterId === "michele"
      ? "player_michele_side"
      : player.characterId === "kanami"
        ? "player_kanami_side"
        : "player_main_side";
    const playerPalette = player.characterId === "michele"
      ? MICHELE_PLAYER_PALETTE
      : player.characterId === "kanami"
        ? KANAMI_PLAYER_PALETTE
        : PLAYER_PALETTE;
    let spriteName = `${playerSpritePrefix}_idle`;
    if (player.animState === "walk") spriteName = `${playerSpritePrefix}_walk_${player.animFrame}`;
    const activeWeapon = WEAPONS[player.currentWeaponId];
    const yoyoDeployed = activeWeapon?.attackMode === "yoyo" && player.activeYoyoWeaponId === activeWeapon.id;
    if (activeWeapon?.dualWield && !yoyoDeployed) {
      EntityRenderer.drawPlayerWeapon(ctx, player, "back");
    }
    SpriteRenderer.drawPixelSprite(ctx, spriteName, 0, -8, 2, {
      hitFlash: player.hitFlash > 0 && !engine.data.settings.reducedFlashing,
      flipX: player.facing === "left",
      paletteOverride: playerPalette,
      outlineColor: "#09101A",
    });
    // Normal weapons are drawn in front of the body. Akimbo weapons split the
    // pair across the body layers, while a deployed yoyo hides its held copy.
    if (!yoyoDeployed) EntityRenderer.drawPlayerWeapon(ctx, player);
    ctx.restore();
  }

  private static drawPlayerWeapon(
    ctx: CanvasRenderingContext2D,
    player: Player,
    layer: "front" | "back" = "front",
  ) {
    ctx.save();
    ctx.translate(0, PLAYER_HAND_OFFSET_Y);
    ctx.rotate(player.aimAngle);
    if (Math.abs(player.aimAngle) > Math.PI / 2) ctx.scale(1, -1);
    const weapon = WEAPONS[player.currentWeaponId];
    const recoilOffset = Math.max(0, player.weaponRecoilVisual) * (layer === "back" ? 0.75 : 1);
    ctx.translate(-recoilOffset, layer === "back" ? -3 : weapon?.dualWield ? 2 : 0);
    if (layer === "back") ctx.globalAlpha *= 0.82;
    const renderX = (weapon?.renderOffsetX ?? PLAYER_WEAPON_OFFSET_X) + (layer === "back" ? -2 : 0);
    const renderY = weapon?.renderOffsetY ?? PLAYER_WEAPON_OFFSET_Y;
    SpriteRenderer.drawPixelSprite(ctx, `weapon_${player.currentWeaponId}`, renderX, renderY, 1);
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
    if (enemy.statusEffects.length > 0) {
      EntityRenderer.drawStatusChips(ctx, enemy.statusEffects, enemy.hitboxOffsetY - enemy.hitboxRadius - 5);
    }

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

    if (enemy.isElite) {
      ctx.save();
      ctx.translate(0, enemy.hitboxOffsetY);
      EntityRenderer.drawCornerFrame(ctx, enemy.hitboxRadius + 3, "rgba(241,196,15,0.9)", 6);
      ctx.restore();
    }
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
    const barY = Math.round(enemy.hitboxY - enemy.hitboxRadius) - (enemy.type === "boss" ? 8 : 5);
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
    ProjectileArtRenderer.draw(ctx, p, reducedFlashing);
  }

  public static drawPickup(ctx: CanvasRenderingContext2D, p: Pickup, time: number) {
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(-6, 5, 12, 3);
    ctx.translate(0, Math.round(Math.sin(time * 4) * 2));
    if (p.type === "weapon" && p.weaponId) {
      SpriteRenderer.drawPixelSprite(ctx, `weapon_${p.weaponId}`, 0, -4, 1);
    } else {
      SpriteRenderer.drawPixelSprite(ctx, `pickup_${p.type}`, 0, -4, 1);
    }
    ctx.restore();
  }
}
