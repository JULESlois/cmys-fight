import type { EnemyBehavior, EnemyRole } from "../data/enemies";
import type { ActiveStatusEffect, StatusEffectId } from "../combat/StatusEffectSystem";

export type EnemyFacing = "left" | "right";
export type EnemyAnimationState = "idle" | "walk" | "attack" | "hurt";

export class Enemy {
  public id: number;
  public x: number;
  public y: number;
  public radius: number = 8;
  public hp: number;
  public maxHp: number;
  public speed: number;
  public type: EnemyRole;
  public enemyId: string;
  public name: string = "Enemy";
  public behavior: EnemyBehavior;
  public displayColor: string = "#FFFFFF";
  public isElite: boolean = false;
  public eliteCoinReward: number = 0;
  public state: "idle" | "chase" | "flee" = "chase";
  public hitFlash: number = 0;
  public facing: EnemyFacing = "right";
  public animState: EnemyAnimationState = "idle";
  public animFrame: number = 0;
  public animTimer: number = 0;
  public attackState: "idle" | "windup" | "recover" = "idle";
  public attackCooldown: number = 0;
  public attackTimer: number = 0;
  public attackAngle: number = 0;
  public attackDamage: number = 2;
  public projectileSpeed: number = 90;
  public projectileCount: number = 1;
  public projectileSpread: number = 0.28;
  public attackInterval: number = 1;
  public attackWindup: number = 0.4;
  public attackRange: number = 190;
  public minimumWindup: number = 0.22;
  public minimumAttackInterval: number = 0.6;
  public requiresLineOfSight: boolean = false;
  public attackAnimationDuration: number = 0.4;
  public attackTargetX: number = 0;
  public attackTargetY: number = 0;
  public chargeDistance: number = 48;
  public areaRadius: number = 30;
  public summonEnemyId?: string;
  public bossPhase: 1 | 2 | 3 = 1;
  public attackSequence: number = 0;
  public statusEffect?: StatusEffectId;
  public statusDuration: number = 0;
  public statusEffects: ActiveStatusEffect[] = [];

  private static nextId = 0;

  constructor(x: number, y: number, type: EnemyRole) {
    this.reset(x, y, type);
  }

  reset(x: number, y: number, type: EnemyRole): this {
    this.id = Enemy.nextId++;
    this.x = x;
    this.y = y;
    this.radius = 8;
    this.type = type;
    this.enemyId = type;
    this.name = "Enemy";
    this.behavior = type === "melee" ? "melee" : type === "ranged" ? "shoot" : "boss";
    this.displayColor = "#FFFFFF";
    this.isElite = false;
    this.eliteCoinReward = 0;
    this.state = "chase";
    this.hitFlash = 0;
    this.facing = "right";
    this.animState = "idle";
    this.animFrame = 0;
    this.animTimer = 0;
    this.attackState = "idle";
    this.attackCooldown = 0;
    this.attackTimer = 0;
    this.attackAngle = 0;
    this.attackDamage = 2;
    this.projectileSpeed = 90;
    this.projectileCount = 1;
    this.projectileSpread = 0.28;
    this.attackInterval = 1;
    this.attackWindup = 0.4;
    this.attackRange = 190;
    this.minimumWindup = 0.22;
    this.minimumAttackInterval = 0.6;
    this.requiresLineOfSight = false;
    this.attackAnimationDuration = 0.4;
    this.attackTargetX = 0;
    this.attackTargetY = 0;
    this.chargeDistance = 48;
    this.areaRadius = 30;
    this.summonEnemyId = undefined;
    this.bossPhase = 1;
    this.attackSequence = 0;
    this.statusEffect = undefined;
    this.statusDuration = 0;
    this.statusEffects = [];

    if (type === "melee") {
      this.maxHp = 10;
      this.speed = 40;
      this.attackCooldown = 0.35;
      this.attackDamage = 2;
      this.attackInterval = 0.85;
      this.attackWindup = 0.32;
    } else if (type === "ranged") {
      this.maxHp = 6;
      this.speed = 25;
      this.attackCooldown = 0.8;
      this.attackDamage = 2;
      this.projectileSpeed = 90;
      this.attackInterval = 1.45;
      this.attackWindup = 0.5;
    } else {
      this.maxHp = 50;
      this.speed = 30;
      this.attackCooldown = 1.2;
      this.attackDamage = 3;
      this.projectileSpeed = 60;
      this.projectileCount = 8;
      this.attackInterval = 2.35;
      this.attackWindup = 0.65;
    }
    this.hp = this.maxHp;
    return this;
  }

}
