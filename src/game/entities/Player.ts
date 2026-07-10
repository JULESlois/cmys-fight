import type { WeaponSlots } from "../data/weapons";

export const PLAYER_WEAPON_OFFSET_X = 10;
export const PLAYER_WEAPON_OFFSET_Y = -2;
export const PLAYER_HAND_OFFSET_Y = -2;
export const PLAYER_MUZZLE_OFFSET_X = 18;
export const PLAYER_MUZZLE_OFFSET_Y = -4;

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
  
  public speed: number = 80;
  public characterId: string = "knight";
  public weaponSlots: WeaponSlots = ["pistol"];
  public activeWeaponSlot: 0 | 1 = 0;
  public fireCooldown: number = 0;
  public aimAngle: number = 0;
  
  public facingLeft: boolean = false;
  public facing: "right" | "left" = "right";
  public animState: "idle" | "walk" = "idle";
  public animTimer: number = 0;
  public animFrame: number = 0;

  public muzzleFlash: number = 0;
  public hitFlash: number = 0;
  public invulnerabilityTimer: number = 0;
  public armorRechargeTimer: number = 3;
  public armorRechargeDelay: number = 3;
  public armorRechargeRate: number = 4;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.maxHp = 6;
    this.hp = this.maxHp;
    this.maxMana = 100;
    this.mana = this.maxMana;
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

  public getPlayerMuzzlePosition(angle: number) {
    const handX = this.x;
    const handY = this.y + PLAYER_HAND_OFFSET_Y;
    const localMuzzleX = PLAYER_MUZZLE_OFFSET_X;
    const localMuzzleY = PLAYER_MUZZLE_OFFSET_Y;
    
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
