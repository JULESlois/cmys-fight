import type { StatusEffectId } from "../combat/StatusEffectSystem";

export class Projectile {
  public id = 0;
  public x = 0;
  public y = 0;
  public previousX = 0;
  public previousY = 0;
  public vx = 0;
  public vy = 0;
  public radius = 1;
  public damage = 0;
  public faction: "player" | "enemy" = "player";
  public life = 0;
  public color = "#FFF";
  public knockback = 0;
  public critical = false;
  public pierceRemaining = 0;
  public wallBouncesRemaining = 0;
  public statusEffect?: StatusEffectId;
  public statusDuration = 0;
  public sourceBoss = false;
  public hitEnemyIds: Set<number> = new Set();

  private static nextId = 0;

  constructor(
    x: number, y: number,
    vx: number, vy: number,
    radius: number, damage: number,
    faction: "player" | "enemy",
    life = 2.0,
    color = "#FFF",
    knockback = 0,
    critical = false,
    pierceRemaining = 0,
    wallBouncesRemaining = 0,
    statusEffect?: StatusEffectId,
    statusDuration = 0,
    sourceBoss = false,
  ) {
    this.reset(x, y, vx, vy, radius, damage, faction, life, color, knockback, critical, pierceRemaining, wallBouncesRemaining, statusEffect, statusDuration, sourceBoss);
  }

  reset(
    x: number, y: number,
    vx: number, vy: number,
    radius: number, damage: number,
    faction: "player" | "enemy",
    life = 2.0,
    color = "#FFF",
    knockback = 0,
    critical = false,
    pierceRemaining = 0,
    wallBouncesRemaining = 0,
    statusEffect?: StatusEffectId,
    statusDuration = 0,
    sourceBoss = false,
  ): this {
    this.id = Projectile.nextId++;
    this.x = x;
    this.y = y;
    this.previousX = x;
    this.previousY = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.damage = damage;
    this.faction = faction;
    this.life = life;
    this.color = color;
    this.knockback = knockback;
    this.critical = critical;
    this.pierceRemaining = pierceRemaining;
    this.wallBouncesRemaining = wallBouncesRemaining;
    this.statusEffect = statusEffect;
    this.statusDuration = statusDuration;
    this.sourceBoss = sourceBoss;
    this.hitEnemyIds.clear();
    return this;
  }

  update(dt: number) {
    this.previousX = this.x;
    this.previousY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
  }
}
