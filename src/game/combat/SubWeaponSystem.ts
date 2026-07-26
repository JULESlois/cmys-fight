/**
 * Sub-weapon throwing and the Heart economy.
 *
 * Hearts are a run resource that only sub-weapons spend, which keeps the
 * primary weapon's own resource (energy, heat, magazine) independent. Hearts
 * refill from candle breaks and enemy drops rather than over time, so holding
 * the button is always a real cost.
 *
 * The system is a pure state machine over the player: it never touches the
 * renderer, and every spawn is returned to the caller so DungeonState stays the
 * single owner of the projectile list.
 */

import {
  MAX_HEARTS,
  SUB_WEAPONS,
  isSubWeaponId,
  type SubWeaponDefinition,
  type SubWeaponId,
} from "../data/subweapons";
import type { Player } from "../entities/Player";

export interface SubWeaponSpawn {
  subWeaponId: SubWeaponId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  lifetime: number;
  radius: number;
  maxHits: number;
  motion: SubWeaponDefinition["motion"];
  color: string;
  /** True when produced by an Item Crush rather than a normal throw. */
  crush: boolean;
}

export type ThrowResult =
  | { ok: true; spawns: SubWeaponSpawn[]; heartsSpent: number }
  | { ok: false; reason: "none_equipped" | "cooling_down" | "not_enough_hearts" };

/** Gravity applied to `arc` sub-weapons, in px/s². Exported so the projectile
 * bridge in DungeonState integrates arcs with the same constant. */
export const ARC_GRAVITY = 320;
/** Upward launch component that gives the axe its arc. */
const ARC_LAUNCH_VY = -140;
/** Projectiles produced by an Item Crush, spread evenly around the player. */
const CRUSH_PROJECTILE_COUNT = 8;

export class SubWeaponSystem {
  /**
   * Adds hearts, clamped to capacity. Returns how many were actually taken so
   * the caller can decide whether to show a "wasted" cue.
   */
  public static addHearts(player: Player, amount: number): number {
    if (amount <= 0) return 0;
    const capacity = SubWeaponSystem.getHeartCapacity(player);
    const before = player.hearts;
    player.hearts = Math.min(capacity, before + amount);
    return player.hearts - before;
  }

  public static getHeartCapacity(player: Player): number {
    return Math.max(1, Math.min(MAX_HEARTS * 2, player.maxHearts));
  }

  public static equip(player: Player, id: SubWeaponId): SubWeaponId | undefined {
    if (!isSubWeaponId(id)) return player.subWeaponId;
    const previous = player.subWeaponId;
    player.subWeaponId = id;
    // A fresh pickup should be usable immediately rather than inheriting the
    // previous weapon's remaining cooldown.
    player.subWeaponCooldown = 0;
    return previous;
  }

  public static update(player: Player, deltaTime: number): void {
    if (player.subWeaponCooldown > 0) {
      player.subWeaponCooldown = Math.max(0, player.subWeaponCooldown - deltaTime);
    }
  }

  public static canThrow(player: Player): boolean {
    if (!player.subWeaponId) return false;
    if (player.subWeaponCooldown > 0) return false;
    const weapon = SUB_WEAPONS[player.subWeaponId];
    return player.hearts >= SubWeaponSystem.getHeartCost(player, weapon);
  }

  /**
   * Heart cost after equipment modifiers. Kept as its own step so the HUD can
   * show the real number rather than the authored one.
   */
  public static getHeartCost(player: Player, weapon: SubWeaponDefinition): number {
    const discount = player.subWeaponCostMultiplier ?? 1;
    return Math.max(1, Math.round(weapon.heartCost * discount));
  }

  public static throw(player: Player, angle: number, damageMultiplier = 1): ThrowResult {
    if (!player.subWeaponId) return { ok: false, reason: "none_equipped" };
    if (player.subWeaponCooldown > 0) return { ok: false, reason: "cooling_down" };

    const weapon = SUB_WEAPONS[player.subWeaponId];
    const cost = SubWeaponSystem.getHeartCost(player, weapon);
    if (player.hearts < cost) return { ok: false, reason: "not_enough_hearts" };

    player.hearts -= cost;
    player.subWeaponCooldown = weapon.cooldown;

    const damage = Math.max(1, Math.round(weapon.damage * damageMultiplier));
    const spawns: SubWeaponSpawn[] = [];

    if (weapon.motion === "field" || weapon.motion === "orbit") {
      // Both stay attached to the player, so direction is irrelevant.
      spawns.push(SubWeaponSystem.makeSpawn(weapon, player.x, player.y, 0, 0, damage, false));
    } else if (weapon.motion === "arc") {
      spawns.push(SubWeaponSystem.makeSpawn(
        weapon, player.x, player.y,
        Math.cos(angle) * weapon.speed,
        Math.sin(angle) * weapon.speed + ARC_LAUNCH_VY,
        damage, false,
      ));
    } else {
      spawns.push(SubWeaponSystem.makeSpawn(
        weapon, player.x, player.y,
        Math.cos(angle) * weapon.speed,
        Math.sin(angle) * weapon.speed,
        damage, false,
      ));
    }

    return { ok: true, spawns, heartsSpent: cost };
  }

  public static canCrush(player: Player): boolean {
    if (!player.subWeaponId) return false;
    const weapon = SUB_WEAPONS[player.subWeaponId];
    return player.hearts >= SubWeaponSystem.getCrushCost(player, weapon);
  }

  public static getCrushCost(player: Player, weapon: SubWeaponDefinition): number {
    const discount = player.crushCostMultiplier ?? 1;
    return Math.max(1, Math.round(weapon.crushHeartCost * discount));
  }

  /**
   * Item Crush: spends the heart bar for a ring of high-damage projectiles.
   * The stopwatch has no crush damage by design, so it produces a field burst
   * instead of a ring.
   */
  public static crush(player: Player, damageMultiplier = 1): ThrowResult {
    if (!player.subWeaponId) return { ok: false, reason: "none_equipped" };
    const weapon = SUB_WEAPONS[player.subWeaponId];
    const cost = SubWeaponSystem.getCrushCost(player, weapon);
    if (player.hearts < cost) return { ok: false, reason: "not_enough_hearts" };

    player.hearts -= cost;
    player.subWeaponCooldown = Math.max(player.subWeaponCooldown, weapon.cooldown);

    const damage = Math.max(0, Math.round(weapon.crushDamage * damageMultiplier));
    const spawns: SubWeaponSpawn[] = [];

    if (weapon.crushDamage <= 0) {
      spawns.push(SubWeaponSystem.makeSpawn(weapon, player.x, player.y, 0, 0, 0, true));
    } else {
      for (let index = 0; index < CRUSH_PROJECTILE_COUNT; index++) {
        const angle = (Math.PI * 2 * index) / CRUSH_PROJECTILE_COUNT;
        spawns.push(SubWeaponSystem.makeSpawn(
          weapon, player.x, player.y,
          Math.cos(angle) * weapon.speed,
          Math.sin(angle) * weapon.speed,
          damage, true,
        ));
      }
    }

    return { ok: true, spawns, heartsSpent: cost };
  }

  /** Per-frame integration for a live sub-weapon projectile. */
  public static integrate(spawn: SubWeaponSpawn, deltaTime: number): void {
    if (spawn.motion === "arc") spawn.vy += ARC_GRAVITY * deltaTime;
    spawn.x += spawn.vx * deltaTime;
    spawn.y += spawn.vy * deltaTime;
    spawn.lifetime -= deltaTime;
  }

  private static makeSpawn(
    weapon: SubWeaponDefinition,
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage: number,
    crush: boolean,
  ): SubWeaponSpawn {
    return {
      subWeaponId: weapon.id,
      x, y, vx, vy,
      damage,
      lifetime: weapon.lifetime,
      radius: crush ? weapon.radius + 1 : weapon.radius,
      maxHits: crush ? 0 : weapon.maxHits,
      motion: weapon.motion,
      color: weapon.color,
      crush,
    };
  }
}
