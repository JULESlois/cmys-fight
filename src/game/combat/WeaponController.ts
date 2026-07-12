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
  echoTriggered?: boolean;
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
    if (SkillController.isMageOverdriveActive(player)) return 0;
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

    const attackMode = weapon.attackMode ?? "projectile";
    const echoEligible = attackMode !== "summon" && attackMode !== "yoyo";
    let echoTriggered = false;
    if (player.characterId === "mage" && energyCost > 0) {
      player.mageArcaneCharge += energyCost;
      if (echoEligible && player.mageArcaneCharge + 1e-9 >= SkillController.MAGE_ECHO_THRESHOLD) {
        player.mageArcaneCharge -= SkillController.MAGE_ECHO_THRESHOLD;
        echoTriggered = true;
      }
    }

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
    const mageOverdriveActive = SkillController.isMageOverdriveActive(player);
    const projectileSpeedMultiplier = modifiers.projectileSpeedMultiplier * (
      mageOverdriveActive ? SkillController.MAGE_OVERDRIVE_PROJECTILE_SPEED : 1
    );
    const extraPierce = mageOverdriveActive ? SkillController.MAGE_OVERDRIVE_PIERCE : 0;
    const rogueCritBonus = player.characterId === "rogue" && player.rogueCritTimer > 0
      ? SkillController.ROGUE_CRIT_BONUS
      : 0;
    const volleys = dualFireActive
      ? [
          { offset: -0.035, damageMultiplier: 1, echo: false },
          { offset: 0.035, damageMultiplier: 1, echo: false },
        ]
      : echoTriggered
        ? [
            { offset: -0.025, damageMultiplier: 1, echo: false },
            { offset: 0.045, damageMultiplier: SkillController.MAGE_ECHO_DAMAGE_MULTIPLIER, echo: true },
          ]
        : [{ offset: 0, damageMultiplier: 1, echo: false }];

    for (const volley of volleys) {
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
        const angle = aimAngle + volley.offset + spreadOffset;
        const critical = random() < Math.min(1, weapon.critChance + rogueCritBonus + modifiers.critChanceBonus);
        const channelDamageMultiplier = weapon.attackMode === "channel" ? 1 + channelRatio * 1.5 : 1;
        const baseDamage = Math.max(1, Math.round(weapon.damage * channelDamageMultiplier));
        const criticalMultiplier = Math.max(1, (weapon.critMultiplier ?? 2) + modifiers.critDamageBonus);
        const fullDamage = critical ? Math.max(baseDamage + 1, Math.round(baseDamage * criticalMultiplier)) : baseDamage;
        const damage = volley.echo
          ? Math.max(0.5, Math.round(fullDamage * volley.damageMultiplier * 2) / 2)
          : fullDamage;
        const projectile = acquireProjectile(
          muzzle.x,
          muzzle.y,
          Math.cos(angle) * weapon.bulletSpeed * projectileSpeedMultiplier,
          Math.sin(angle) * weapon.bulletSpeed * projectileSpeedMultiplier,
          weapon.projectileRadius ?? 3,
          damage,
          "player",
          weapon.projectileLife ?? 2,
          volley.echo ? "#C792EA" : weapon.attackMode === "channel" ? prismColors[i % prismColors.length] : weapon.color,
          weapon.knockback + modifiers.knockbackBonus,
          critical,
          modifiers.pierce + (weapon.pierce ?? 0) + extraPierce,
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

    return {
      fired: true,
      projectiles,
      recoil: Math.max(0, weapon.recoil ?? 0.35),
      echoTriggered,
    };
  }
}
