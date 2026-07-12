import { WEAPONS, getProjectileProfile, isWeaponAvailableForCharacter, isWeaponId } from "../data/weapons";
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
  reason?: "cooldown" | "energy" | "overheated" | "invalid_weapon";
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

  static getHeatRatio(player: Player, weaponId = player.currentWeaponId): number {
    const weapon = WEAPONS[weaponId];
    if (!weapon?.maxHeat || player.weaponHeatWeaponId !== weapon.id) return 0;
    return Math.max(0, Math.min(1, player.weaponHeat / weapon.maxHeat));
  }

  static updateRuntime(player: Player, dt: number, fireHeld: boolean): void {
    const activeWeapon = WEAPONS[player.currentWeaponId];
    const heatWeapon = activeWeapon?.maxHeat
      ? activeWeapon
      : player.weaponHeatWeaponId
        ? WEAPONS[player.weaponHeatWeaponId]
        : undefined;
    if (!heatWeapon?.maxHeat) {
      player.weaponHeat = 0;
      player.weaponHeatWeaponId = "";
      player.weaponOverheatTimer = 0;
      return;
    }
    if (activeWeapon?.maxHeat && player.weaponHeatWeaponId !== activeWeapon.id) {
      player.weaponHeatWeaponId = activeWeapon.id;
      player.weaponHeat = 0;
      player.weaponOverheatTimer = 0;
    }
    const decayRate = Math.max(0, heatWeapon.heatDecayRate ?? 0);
    if (player.weaponOverheatTimer > 0) {
      player.weaponOverheatTimer = Math.max(0, player.weaponOverheatTimer - dt);
      player.weaponHeat = Math.max(0, player.weaponHeat - decayRate * 1.8 * dt);
      if (player.weaponOverheatTimer <= 0) {
        player.weaponHeat = Math.min(player.weaponHeat, heatWeapon.maxHeat * 0.35);
      }
    } else {
      const firingHeatWeapon = activeWeapon?.id === heatWeapon.id && fireHeld;
      player.weaponHeat = Math.max(0, player.weaponHeat - decayRate * (firingHeatWeapon ? 0.25 : 1) * dt);
    }
    if (player.weaponHeat <= 0 && activeWeapon?.id !== heatWeapon.id) {
      player.weaponHeat = 0;
      player.weaponHeatWeaponId = "";
      player.weaponOverheatTimer = 0;
    }
  }

  static resetWeaponRuntime(player: Player): void {
    player.weaponBurstIndex = 0;
    player.weaponBurstWeaponId = "";
    player.linkedShotStep = 0;
    player.linkedShotWeaponId = "";
  }

  static switchWeapon(player: Player): boolean {
    if (!player.weaponSlots[1]) return false;
    player.activeWeaponSlot = player.activeWeaponSlot === 0 ? 1 : 0;
    player.weaponChannelTime = 0;
    WeaponController.resetWeaponRuntime(player);
    return true;
  }

  static equipWeapon(player: Player, weaponId: string): EquipWeaponResult {
    if (!isWeaponId(weaponId) || !isWeaponAvailableForCharacter(WEAPONS[weaponId], player.characterId)) {
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
      WeaponController.resetWeaponRuntime(player);
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
      WeaponController.resetWeaponRuntime(player);
      return {
        consumed: true,
        changed: true,
        activeSlot: 1,
      };
    }

    const droppedWeaponId = player.currentWeaponId;
    player.weaponSlots[player.activeWeaponSlot] = weaponId;
    player.weaponChannelTime = 0;
    WeaponController.resetWeaponRuntime(player);
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
    if (!weapon || !isWeaponAvailableForCharacter(weapon, player.characterId)) {
      return { fired: false, projectiles: [], recoil: 0, reason: "invalid_weapon" };
    }
    if (player.fireCooldown > 0) {
      return { fired: false, projectiles: [], recoil: 0, reason: "cooldown" };
    }
    if (weapon.maxHeat && player.weaponHeatWeaponId === weapon.id && player.weaponOverheatTimer > 0) {
      return { fired: false, projectiles: [], recoil: 0, reason: "overheated" };
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

    let nextFireCooldown = 1 / weapon.fireRate;
    let burstStep = 0;
    if ((weapon.burstSize ?? 0) > 1) {
      if (player.weaponBurstWeaponId !== weapon.id) {
        player.weaponBurstWeaponId = weapon.id;
        player.weaponBurstIndex = 0;
      }
      const burstSize = Math.max(2, Math.floor(weapon.burstSize ?? 2));
      burstStep = Math.max(0, Math.min(burstSize - 1, player.weaponBurstIndex));
      player.weaponBurstIndex += 1;
      if (player.weaponBurstIndex < burstSize) {
        nextFireCooldown = Math.max(0.03, weapon.burstInterval ?? nextFireCooldown);
      } else {
        player.weaponBurstIndex = 0;
        nextFireCooldown = Math.max(0.05, weapon.burstRecovery ?? nextFireCooldown);
      }
    } else {
      player.weaponBurstIndex = 0;
      player.weaponBurstWeaponId = weapon.id;
    }

    if (weapon.maxHeat) {
      if (player.weaponHeatWeaponId !== weapon.id) {
        player.weaponHeatWeaponId = weapon.id;
        player.weaponHeat = 0;
        player.weaponOverheatTimer = 0;
      }
      player.weaponHeat = Math.min(weapon.maxHeat, player.weaponHeat + Math.max(0, weapon.heatPerShot ?? 0));
      if (player.weaponHeat >= weapon.maxHeat) {
        player.weaponOverheatTimer = Math.max(0.1, weapon.overheatLockout ?? 1);
        nextFireCooldown = Math.max(nextFireCooldown, player.weaponOverheatTimer);
      }
    }

    let linkedShotMode: "none" | "primer" | "catalyst" = "none";
    if (weapon.linkedShot) {
      if (player.linkedShotWeaponId !== weapon.id) {
        player.linkedShotWeaponId = weapon.id;
        player.linkedShotStep = 0;
      }
      linkedShotMode = player.linkedShotStep === 0 ? "primer" : "catalyst";
      player.linkedShotStep = player.linkedShotStep === 0 ? 1 : 0;
    } else {
      player.linkedShotStep = 0;
      player.linkedShotWeaponId = weapon.id;
    }

    player.fireCooldown = nextFireCooldown;
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
    const heatRatio = WeaponController.getHeatRatio(player, weapon.id);
    const heatSpreadMultiplier = 1 + heatRatio * Math.max(0, weapon.heatSpreadMultiplier ?? 0);
    const burstDamageMultiplier = Math.max(0.1, weapon.burstDamagePattern?.[burstStep] ?? 1);
    const burstPierceBonus = Math.max(0, Math.floor(weapon.burstPiercePattern?.[burstStep] ?? 0));
    const burstCritBonus = Math.max(0, weapon.burstCritBonusPattern?.[burstStep] ?? 0);
    const burstColor = weapon.burstColorPattern?.[burstStep];
    const burstRecoil = Math.max(0, weapon.burstRecoilPattern?.[burstStep] ?? weapon.recoil ?? 0.35);
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
          spreadOffset = (random() - 0.5) * weapon.spread * modifiers.spreadMultiplier * heatSpreadMultiplier;
        }
        const angle = aimAngle + volley.offset + spreadOffset;
        const critical = random() < Math.min(1, weapon.critChance + burstCritBonus + rogueCritBonus + modifiers.critChanceBonus);
        const channelDamageMultiplier = weapon.attackMode === "channel" ? 1 + channelRatio * 1.5 : 1;
        const baseDamage = Math.max(1, Math.round(weapon.damage * channelDamageMultiplier * burstDamageMultiplier));
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
          volley.echo
            ? "#C792EA"
            : linkedShotMode === "primer"
              ? "#F2D45C"
              : linkedShotMode === "catalyst"
                ? "#FF6B4A"
                : weapon.attackMode === "channel"
                  ? prismColors[i % prismColors.length]
                  : burstColor ?? weapon.color,
          weapon.knockback + modifiers.knockbackBonus,
          critical,
          modifiers.pierce + (weapon.pierce ?? 0) + burstPierceBonus + extraPierce,
          modifiers.wallBounces + (weapon.wallBounces ?? 0),
          projectileStatus?.id,
          projectileStatus?.duration ?? 0,
          false,
          projectileProfile,
        );
        projectile.anchorX = player.x;
        projectile.anchorY = player.y;
        projectile.linkedShotMode = linkedShotMode;
        projectiles.push(projectile);
      }
    }

    return {
      fired: true,
      projectiles,
      recoil: burstRecoil,
      echoTriggered,
    };
  }
}
