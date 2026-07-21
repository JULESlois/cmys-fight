import { WeaponLoadoutRuntime, createWeaponRuntimeState } from "../combat/WeaponRuntimeState";
import { WEAPONS, type WeaponSlots } from "../data/weapons";
import { usesDetailedCharacterArt } from "../data/characters";
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

  public weaponLoadout: WeaponLoadoutRuntime = {
    slots: [
      createWeaponRuntimeState("pistol")
    ],
    activeSlot: 0,
    swapTimer: 0
  };

  /** @deprecated use weaponLoadout */
  public get weaponSlots(): [string, string?] {
    return [
      this.weaponLoadout.slots[0].weaponId,
      this.weaponLoadout.slots[1]?.weaponId
    ];
  }

  /** @deprecated use weaponLoadout */
  public set weaponSlots(slots: [string, string?]) {
    this.weaponLoadout.slots[0] = createWeaponRuntimeState(slots[0]);
    if (slots[1]) {
      this.weaponLoadout.slots[1] = createWeaponRuntimeState(slots[1]);
    } else {
      this.weaponLoadout.slots.pop(); // Remove second element
    }
  }

  /** @deprecated use weaponLoadout */
  public get activeWeaponSlot(): 0 | 1 {
    return this.weaponLoadout.activeSlot;
  }

  /** @deprecated use weaponLoadout */
  public set activeWeaponSlot(slot: 0 | 1) {
    this.weaponLoadout.activeSlot = slot;
  }

  // Remove the old weapon states here:
  // fireCooldown, weaponChannelTime, weaponBurstIndex, weaponBurstWeaponId,
  // weaponHeat, weaponHeatWeaponId, weaponOverheatTimer, linkedShotStep, linkedShotWeaponId

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
  public dodgeTimer: number = 0;
  public dodgeCooldown: number = 0;
  public dodgeDirectionX: number = 0;
  public dodgeDirectionY: number = 0;
  public perfectDodgeWindow: number = 0;
  public justPerfectDodged: boolean = false;
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
  public celestiaTemporaryArmor: number = 0;
  public celestiaTemporaryArmorTimer: number = 0;
  public buffs: BuffId[] = [];
  public buffState: Record<string, any> = {};
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
    return this.weaponLoadout.slots[this.weaponLoadout.activeSlot]?.weaponId ?? this.weaponLoadout.slots[0]?.weaponId ?? "pistol";
  }

  public set currentWeaponId(weaponId: string) {
    if (this.weaponLoadout.slots[this.weaponLoadout.activeSlot]) this.weaponLoadout.slots[this.weaponLoadout.activeSlot]!.weaponId = weaponId;
  }

  public setWeaponLoadout(slots: WeaponSlots, activeSlot: 0 | 1): void {
    this.weaponLoadout.slots = slots[1] ? [createWeaponRuntimeState(slots[0]), createWeaponRuntimeState(slots[1])] : [createWeaponRuntimeState(slots[0])];
    this.weaponLoadout.activeSlot = activeSlot === 1 && this.weaponLoadout.slots[1] ? 1 : 0;
  }

  public get weaponHandOffsetY(): number {
    return usesDetailedCharacterArt(this.characterId)
      ? -5
      : PLAYER_HAND_OFFSET_Y;
  }

  public get weaponRenderScale(): number {
    return usesDetailedCharacterArt(this.characterId)
      ? 0.8
      : 1;
  }

  public get weaponAnimationOffsetY(): number {
    if (
      this.animState !== "walk" ||
      !usesDetailedCharacterArt(this.characterId)
    ) return 0;
    return [0, 1, 0, -1][this.animFrame % 4] ?? 0;
  }

  public get effectiveWeaponHandOffsetY(): number {
    return this.weaponHandOffsetY + this.weaponAnimationOffsetY;
  }

  public getPlayerMuzzlePosition(angle: number) {
    const handX = this.x;
    const handY = this.y + this.effectiveWeaponHandOffsetY;
    const weapon = WEAPONS[this.currentWeaponId];
    const localMuzzleX = (weapon?.muzzleOffsetX ?? PLAYER_MUZZLE_OFFSET_X) * this.weaponRenderScale;
    const localMuzzleY = (weapon?.muzzleOffsetY ?? PLAYER_MUZZLE_OFFSET_Y) * this.weaponRenderScale;
    
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
