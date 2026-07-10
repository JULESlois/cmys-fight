import type { StatusEffectId } from "../combat/StatusEffectSystem";

export class Projectile {
  public id: number;
  public x: number;
  public y: number;
  public previousX: number;
  public previousY: number;
  public vx: number;
  public vy: number;
  public radius: number;
  public damage: number;
  public faction: "player" | "enemy";
  public life: number;
  public color: string;
  public knockback: number;
  public critical: boolean;
  public pierceRemaining: number;
  public wallBouncesRemaining: number;
  public statusEffect?: StatusEffectId;
  public statusDuration: number;
  public sourceBoss: boolean;
  public hitEnemyIds: Set<number> = new Set();

  private static nextId = 0;

  constructor(
    x: number, y: number, 
    vx: number, vy: number, 
    radius: number, damage: number, 
    faction: "player" | "enemy", 
    life: number = 2.0,
    color: string = "#FFF",
    knockback: number = 0,
    critical: boolean = false,
    pierceRemaining: number = 0,
    wallBouncesRemaining: number = 0,
    statusEffect?: StatusEffectId,
    statusDuration: number = 0,
    sourceBoss: boolean = false,
  ) {
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
  }

  update(dt: number) {
    this.previousX = this.x;
    this.previousY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
  }
}
