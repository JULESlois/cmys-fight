import type { StatusEffectId } from "../combat/StatusEffectSystem";
import type { ImpactEffect, MuzzleEffect, ProjectileProfile, ProjectileStyle } from "../data/weapons";

export type LinkedShotMode = "none" | "primer" | "catalyst";

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
  public weaponId = "";
  public style: ProjectileStyle = "bullet";
  public trailLength = 6;
  public beamWidth = 1;
  public explosionRadius = 0;
  public explosionDamageMultiplier = 0.75;
  public chainCount = 0;
  public chainRange = 0;
  public chainDamageMultiplier = 0.7;
  public homingStrength = 0;
  public acceleration = 0;
  public drag = 0;
  public spinRate = 0;
  public spinAngle = 0;
  public age = 0;
  public maxLife = 0;
  public detonated = false;
  public muzzleEffect: MuzzleEffect = "flash";
  public impactEffect: ImpactEffect = "spark";
  public ignoreWalls = false;
  public repeatHitDelay = 0;
  public repeatHitTimer = 0;
  public tetherRange = 0;
  public returnStrength = 0;
  public anchorX = 0;
  public anchorY = 0;
  public summonLevel = 1;
  public linkedShotMode: LinkedShotMode = "none";
  public linkedExplosionRadius = 0;
  public linkedExplosionDamageMultiplier = 1;
  public linkedTriggerRange = 0;
  public linkedMarkerLife = 0;
  public stuck = false;

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
    profile?: ProjectileProfile,
  ) {
    this.reset(x, y, vx, vy, radius, damage, faction, life, color, knockback, critical, pierceRemaining, wallBouncesRemaining, statusEffect, statusDuration, sourceBoss, profile);
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
    profile?: ProjectileProfile,
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
    this.maxLife = life;
    this.color = color;
    this.knockback = knockback;
    this.critical = critical;
    this.pierceRemaining = pierceRemaining;
    this.wallBouncesRemaining = wallBouncesRemaining;
    this.statusEffect = statusEffect;
    this.statusDuration = statusDuration;
    this.sourceBoss = sourceBoss;
    this.weaponId = profile?.weaponId ?? "";
    this.style = profile?.style ?? "bullet";
    this.trailLength = profile?.trailLength ?? 6;
    this.beamWidth = profile?.beamWidth ?? 1;
    this.explosionRadius = profile?.explosionRadius ?? 0;
    this.explosionDamageMultiplier = profile?.explosionDamageMultiplier ?? 0.75;
    this.chainCount = profile?.chainCount ?? 0;
    this.chainRange = profile?.chainRange ?? 0;
    this.chainDamageMultiplier = profile?.chainDamageMultiplier ?? 0.7;
    this.homingStrength = profile?.homingStrength ?? 0;
    this.acceleration = profile?.acceleration ?? 0;
    this.drag = profile?.drag ?? 0;
    this.spinRate = profile?.spinRate ?? 0;
    this.spinAngle = 0;
    this.age = 0;
    this.detonated = false;
    this.muzzleEffect = profile?.muzzleEffect ?? "flash";
    this.impactEffect = profile?.impactEffect ?? "spark";
    this.ignoreWalls = profile?.ignoreWalls ?? false;
    this.repeatHitDelay = profile?.repeatHitDelay ?? 0;
    this.repeatHitTimer = 0;
    this.tetherRange = profile?.tetherRange ?? 0;
    this.returnStrength = profile?.returnStrength ?? 0;
    this.anchorX = x;
    this.anchorY = y;
    this.summonLevel = 1;
    this.linkedShotMode = "none";
    this.linkedExplosionRadius = profile?.linkedExplosionRadius ?? 0;
    this.linkedExplosionDamageMultiplier = profile?.linkedExplosionDamageMultiplier ?? 1;
    this.linkedTriggerRange = profile?.linkedTriggerRange ?? 0;
    this.linkedMarkerLife = profile?.linkedMarkerLife ?? 0;
    this.stuck = false;
    this.hitEnemyIds.clear();
    return this;
  }

  update(dt: number) {
    this.previousX = this.x;
    this.previousY = this.y;

    if (this.stuck) {
      this.life -= dt;
      this.age += dt;
      return;
    }

    if (this.repeatHitDelay > 0 && this.hitEnemyIds.size > 0) {
      if (this.repeatHitTimer <= 0) this.repeatHitTimer = this.repeatHitDelay;
      else {
        this.repeatHitTimer -= dt;
        if (this.repeatHitTimer <= 0) {
          this.hitEnemyIds.clear();
          this.repeatHitTimer = 0;
        }
      }
    }

    const speed = Math.hypot(this.vx, this.vy);
    if (speed > 0 && this.acceleration !== 0) {
      const nextSpeed = Math.max(18, speed + this.acceleration * dt);
      const scale = nextSpeed / speed;
      this.vx *= scale;
      this.vy *= scale;
    }
    if (this.drag > 0) {
      const retention = Math.exp(-this.drag * dt);
      this.vx *= retention;
      this.vy *= retention;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    this.age += dt;
    this.spinAngle += this.spinRate * dt;
  }
}
