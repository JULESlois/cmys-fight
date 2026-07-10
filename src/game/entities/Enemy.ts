import type { EnemyBehavior, EnemyRole } from "../data/enemies";
import type { ActiveStatusEffect, StatusEffectId } from "../combat/StatusEffectSystem";

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
    this.id = Enemy.nextId++;
    this.x = x;
    this.y = y;
    this.type = type;
    this.enemyId = type;
    this.behavior = type === "melee" ? "melee" : type === "ranged" ? "shoot" : "boss";
    
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
  }
}
