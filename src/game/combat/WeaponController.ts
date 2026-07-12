import { WEAPONS, getProjectileProfile, isWeaponId } from "../data/weapons";
import { Player } from "../entities/Player";
import { Projectile } from "../entities/Projectile";
import { acquireProjectile } from "../EntityPools";
import { SkillController } from "./SkillController";
import { BuffSystem } from "./BuffSystem";

export interface EquipWeaponResult {
  consumed: boolean;
  changed: boolean;
  activeSlot: 0 | 1;
  droppedWeaponId?: string;
}

export interface FireWeaponResult {
  fired: boolean;
  projectiles: Projectile[];
  recoil: number;
  reason?: "cooldown" | "energy" | "invalid_weapon";
}

export class WeaponController {
  static calculateEnergyCost(baseCost: number, multiplier = 1): number {
    return Math.round(Math.max(0, baseCost * Math.max(0, multiplier)) * 100) / 100;
  }

  static getChannelRatio(player: Player, weaponId = player.currentWeaponId): number {
    const weapon = WEAPONS[weaponId];
    if (!weapon || weapon.attackMode !== "channel" || weaponId !== player.currentWeaponId) return 0;
    return Math.max(0, Math.min(1, player.weaponChannelTime / Math.max(0.1, weapon.channelTime ?? 3.2)));
  }

  static getEnergyCost(player: Player, weaponId = player.currentWeaponId): number {
    const weapon = WEAPONS[weaponId];
    if (!weapon) return 0;
    const multiplier = BuffSystem.getWeaponModifiers(player).energyCostMultiplier;
    const channelMultiplier = 1 + WeaponController.getChannelRatio(player, weaponId);
    return WeaponController.calculateEnergyCost(weapon.manaCost * channelMultiplier, multiplier);
  }

  static formatEnergyCost(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
  }

  static switchWeapon(player: Player): boolean {
    if (!player.weaponSlots[1]) return false;
    player.activeWeaponSlot = player.activeWeaponSlot === 0 ? 1 : 0;
    player.weaponChannelTime = 0;
    return true;
  }

  static equipWeapon(player: Player, weaponId: string): EquipWeaponResult {
    if (!isWeaponId(weaponId)) {
      return {
        consumed: false,
        changed: false,
        activeSlot: player.activeWeaponSlot,
      };
    }

    const existingSlot = player.weaponSlots.findIndex(id => id === weaponId);
    if (existingSlot === 0 || existingSlot === 1) {
      const changed = player.activeWeaponSlot !== existingSlot;
      player.activeWeaponSlot = existingSlot;
      player.weaponChannelTime = 0;
      return {
        consumed: true,
        changed,
        activeSlot: player.activeWeaponSlot,
      };
    }

    if (!player.weaponSlots[1]) {
      player.weaponSlots[1] = weaponId;
      player.activeWeaponSlot = 1;
      player.weaponChannelTime = 0;
      return {
        consumed: true,
        changed: true,
        activeSlot: 1,
      };
    }

    const droppedWeaponId = player.currentWeaponId;
    player.weaponSlots[player.activeWeaponSlot] = weaponId;
    player.weaponChannelTime = 0;
    return {
      consumed: true,
      changed: true,
      activeSlot: player.activeWeaponSlot,
      droppedWeaponId,
    };
  }

  static fire(
    player: Player,
    aimAngle: number,
    random: () => number = Math.random,
  ): FireWeaponResult {
    const weapon = WEAPONS[player.currentWeaponId];
    if (!weapon) {
      return { fired: false, projectiles: [], recoil: 0, reason: "invalid_weapon" };
    }
    if (player.fireCooldown > 0) {
      return { fired: false, projectiles: [], recoil: 0, reason: "cooldown" };
    }
    const modifiers = BuffSystem.getWeaponModifiers(player);
    const channelRatio = WeaponController.getChannelRatio(player, weapon.id);
    const energyCost = WeaponController.getEnergyCost(player, weapon.id);
    if (player.mana + 1e-9 < energyCost) {
      return { fired: false, projectiles: [], recoil: 0, reason: "energy" };
    }

    const buffProjectileStatus = BuffSystem.getProjectileStatus(player);
    const projectileStatus = weapon.statusEffect
      ? { id: weapon.statusEffect, duration: weapon.statusDuration ?? 0 }
      : buffProjectileStatus;
    player.mana = Math.max(0, player.mana - energyCost);
    if (energyCost > 0) player.manaRechargeTimer = player.manaRechargeDelay;
    player.fireCooldown = 1 / weapon.fireRate;
    player.muzzleFlash = 1;
    player.aimAngle = aimAngle;
    player.facing = Math.cos(aimAngle) >= 0 ? "right" : "left";
    player.facingLeft = player.facing === "left";

    const muzzle = player.getPlayerMuzzlePosition(aimAngle);
    const projectiles: Projectile[] = [];
    const projectileProfile = {
      ...getProjectileProfile(weapon),
      beamWidth: weapon.attackMode === "channel"
        ? Math.max(1, (weapon.beamWidth ?? 1) + Math.floor(channelRatio * 3))
        : Math.max(1, weapon.beamWidth ?? 1),
    };
    const prismColors = ["#FF5C8A", "#FFB347", "#F8F16A", "#62F6A7", "#69C8FF", "#C792EA"];

    const dualFireActive = player.characterId === "knight" && player.skillActiveTimer > 0;
    const volleyCount = dualFireActive ? 2 : 1;
    const rogueCritBonus = player.characterId === "rogue" && player.rogueCritTimer > 0
      ? SkillController.ROGUE_CRIT_BONUS
      : 0;

    for (let volley = 0; volley < volleyCount; volley++) {
      const volleyOffset = dualFireActive ? (volley === 0 ? -0.035 : 0.035) : 0;
      for (let i = 0; i < weapon.pelletCount; i++) {
        const centeredIndex = i - (weapon.pelletCount - 1) / 2;
        const patternedSpread = weapon.pelletCount > 1
          ? centeredIndex / Math.max(1, weapon.pelletCount - 1)
          : 0;
        let spreadOffset: number;
        if (weapon.attackMode === "channel") {
          const convergence = 1 - channelRatio * 0.94;
          spreadOffset = patternedSpread * weapon.spread * convergence;
        } else if (weapon.attackMode === "melee") {
          spreadOffset = patternedSpread * weapon.spread;
        } else {
          spreadOffset = (random() - 0.5) * weapon.spread * modifiers.spreadMultiplier;
        }
        const angle = aimAngle + volleyOffset + spreadOffset;
        const critical = random() < Math.min(1, weapon.critChance + rogueCritBonus + modifiers.critChanceBonus);
        const channelDamageMultiplier = weapon.attackMode === "channel" ? 1 + channelRatio * 1.5 : 1;
        const baseDamage = Math.max(1, Math.round(weapon.damage * channelDamageMultiplier));
        const criticalMultiplier = Math.max(1, (weapon.critMultiplier ?? 2) + modifiers.critDamageBonus);
        const damage = critical ? Math.max(baseDamage + 1, Math.round(baseDamage * criticalMultiplier)) : baseDamage;
        const projectile = acquireProjectile(
          muzzle.x,
          muzzle.y,
          Math.cos(angle) * weapon.bulletSpeed * modifiers.projectileSpeedMultiplier,
          Math.sin(angle) * weapon.bulletSpeed * modifiers.projectileSpeedMultiplier,
          weapon.projectileRadius ?? 3,
          damage,
          "player",
          weapon.projectileLife ?? 2,
          weapon.attackMode === "channel" ? prismColors[i % prismColors.length] : weapon.color,
          weapon.knockback + modifiers.knockbackBonus,
          critical,
          modifiers.pierce + (weapon.pierce ?? 0),
          modifiers.wallBounces + (weapon.wallBounces ?? 0),
          projectileStatus?.id,
          projectileStatus?.duration ?? 0,
          false,
          projectileProfile,
        );
        projectile.anchorX = player.x;
        projectile.anchorY = player.y;
        projectiles.push(projectile);
      }
    }

    return { fired: true, projectiles, recoil: Math.max(0, weapon.recoil ?? 0.35) };
  }
}
