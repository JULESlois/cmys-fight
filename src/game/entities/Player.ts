import { WEAPONS, type WeaponSlots } from "../data/weapons";
import type { BuffId } from "../combat/BuffSystem";
import type { ActiveStatusEffect } from "../combat/StatusEffectSystem";

export const PLAYER_WEAPON_OFFSET_X = 10;
export const PLAYER_WEAPON_OFFSET_Y = -2;
export const PLAYER_HAND_OFFSET_Y = -2;
export const PLAYER_MUZZLE_OFFSET_X = 18;
export const PLAYER_MUZZLE_OFFSET_Y = -4;
export const MAX_PLAYER_MANA = 80;
export const DEFAULT_MANA_RECHARGE_DELAY = 1.35;
export const DEFAULT_MANA_RECHARGE_RATE = 9;

export class Player {
  public x: number;
  public y: number;
  public vx: number = 0;
  public vy: number = 0;
  
  public radius: number = 6;
  public hp: number;
  public maxHp: number;
  public armor: number = 0;
  public maxArmor: number = 5;
  public mana: number;
  public maxMana: number;
  public manaRechargeTimer: number = 0;
  public manaRechargeDelay: number = DEFAULT_MANA_RECHARGE_DELAY;
  public manaRechargeRate: number = DEFAULT_MANA_RECHARGE_RATE;
  
  public speed: number = 80;
  public characterId: string = "knight";
  public weaponSlots: WeaponSlots = ["pistol"];
  public activeWeaponSlot: 0 | 1 = 0;
  public fireCooldown: number = 0;
  public weaponChannelTime: number = 0;
  public weaponBurstIndex: number = 0;
  public weaponBurstWeaponId: string = "";
  public weaponHeat: number = 0;
  public weaponHeatWeaponId: string = "";
  public weaponOverheatTimer: number = 0;
  public linkedShotStep: 0 | 1 = 0;
  public linkedShotWeaponId: string = "";
  public aimAngle: number = 0;
  
  public facingLeft: boolean = false;
  public facing: "right" | "left" = "right";
  public animState: "idle" | "walk" = "idle";
  public animTimer: number = 0;
  public animFrame: number = 0;

  public muzzleFlash: number = 0;
  public weaponRecoilVisual: number = 0;
  public activeYoyoWeaponId: string = "";
  public terrarianOrbCooldown: number = 0;
  public hitFlash: number = 0;
  public invulnerabilityTimer: number = 0;
  public armorRechargeTimer: number = 3;
  public armorRechargeDelay: number = 3;
  public armorRechargeRate: number = 4;
  public skillCooldown: number = 0;
  public skillActiveTimer: number = 0;
  public skillDirectionX: number = 0;
  public skillDirectionY: number = 0;
  public rogueCritTimer: number = 0;
  public mageArcaneCharge: number = 0;
  public knightGuardReady: boolean = false;
  public micheleMarkedEnemyId: number = -1;
  public micheleMarkTimer: number = 0;
  public micheleTurretX: number = 0;
  public micheleTurretY: number = 0;
  public micheleTurretFireCooldown: number = 0;
  public micheleTurretActive: boolean = false;
  public micheleTurretHitsRemaining: number = 0;
  public kanamiBeaconX: number = 0;
  public kanamiBeaconY: number = 0;
  public kanamiBeaconVx: number = 0;
  public kanamiBeaconVy: number = 0;
  public kanamiBeaconFlightTimer: number = 0;
  public kanamiBeaconDeployed: boolean = false;
  public buffs: BuffId[] = [];
  public emergencyBarrierReady: boolean = false;
  public phoenixProtocolReady: boolean = false;
  public statusEffects: ActiveStatusEffect[] = [];
  public buffRerollsRemaining: number = 0;
  public shopDiscount: number = 0;
  public supplyDropBonus: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.maxHp = 6;
    this.hp = this.maxHp;
    this.maxMana = 25;
    this.mana = this.maxMana;
    this.manaRechargeDelay = 0.85;
    this.manaRechargeRate = 10;
    this.armor = this.maxArmor;
  }

  public get currentWeaponId(): string {
    return this.weaponSlots[this.activeWeaponSlot] ?? this.weaponSlots[0] ?? "pistol";
  }

  public set currentWeaponId(weaponId: string) {
    this.weaponSlots[this.activeWeaponSlot] = weaponId;
  }

  public setWeaponLoadout(slots: WeaponSlots, activeSlot: 0 | 1): void {
    this.weaponSlots = slots[1] ? [slots[0], slots[1]] : [slots[0]];
    this.activeWeaponSlot = activeSlot === 1 && this.weaponSlots[1] ? 1 : 0;
  }

  public get weaponHandOffsetY(): number {
    return PLAYER_HAND_OFFSET_Y;
  }

  public getPlayerMuzzlePosition(angle: number) {
    const handX = this.x;
    const handY = this.y + this.weaponHandOffsetY;
    const weapon = WEAPONS[this.currentWeaponId];
    const localMuzzleX = weapon?.muzzleOffsetX ?? PLAYER_MUZZLE_OFFSET_X;
    const localMuzzleY = weapon?.muzzleOffsetY ?? PLAYER_MUZZLE_OFFSET_Y;
    
    let my = localMuzzleY;
    if (Math.abs(angle) > Math.PI / 2) {
      my = -my;
    }
    
    return {
      x: handX + Math.cos(angle) * localMuzzleX - Math.sin(angle) * my,
      y: handY + Math.sin(angle) * localMuzzleX + Math.cos(angle) * my
    };
  }
}
