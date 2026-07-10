import { ObjectPool } from "./ObjectPool";
import { Enemy } from "./entities/Enemy";
import { Pickup, type PickupType } from "./entities/Pickup";
import { Projectile } from "./entities/Projectile";
import type { EnemyRole } from "./data/enemies";
import type { StatusEffectId } from "./combat/StatusEffectSystem";

const projectilePool = new ObjectPool(
  () => new Projectile(0, 0, 0, 0, 1, 0, "player", 0),
  projectile => {
    projectile.life = 0;
    projectile.hitEnemyIds.clear();
  },
  512,
);

const enemyPool = new ObjectPool(
  () => new Enemy(0, 0, "melee"),
  enemy => {
    enemy.hp = 0;
    enemy.statusEffects = [];
  },
  96,
);

const pickupPool = new ObjectPool(
  () => new Pickup(0, 0, "coin", 0),
  pickup => pickup.reset(0, 0, "coin", 0),
  128,
);

export function acquireProjectile(
  x: number, y: number,
  vx: number, vy: number,
  radius: number, damage: number,
  faction: "player" | "enemy",
  life = 2,
  color = "#FFF",
  knockback = 0,
  critical = false,
  pierceRemaining = 0,
  wallBouncesRemaining = 0,
  statusEffect?: StatusEffectId,
  statusDuration = 0,
  sourceBoss = false,
): Projectile {
  return projectilePool.acquire().reset(
    x, y, vx, vy, radius, damage, faction, life, color, knockback, critical,
    pierceRemaining, wallBouncesRemaining, statusEffect, statusDuration, sourceBoss,
  );
}

export function releaseProjectile(projectile: Projectile): void {
  projectilePool.release(projectile);
}

export function acquireEnemy(x: number, y: number, role: EnemyRole): Enemy {
  return enemyPool.acquire().reset(x, y, role);
}

export function releaseEnemy(enemy: Enemy): void {
  enemyPool.release(enemy);
}

export function acquirePickup(x: number, y: number, type: PickupType, value: number, weaponId?: string): Pickup {
  return pickupPool.acquire().reset(x, y, type, value, weaponId);
}

export function releasePickup(pickup: Pickup): void {
  pickupPool.release(pickup);
}

export function getEntityPoolStats() {
  return {
    projectiles: projectilePool.getStats(),
    enemies: enemyPool.getStats(),
    pickups: pickupPool.getStats(),
  };
}
