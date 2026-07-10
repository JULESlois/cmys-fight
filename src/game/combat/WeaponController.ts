import { WEAPONS, isWeaponId } from "../data/weapons";
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
  reason?: "cooldown" | "energy" | "invalid_weapon";
}

export class WeaponController {
  static switchWeapon(player: Player): boolean {
    if (!player.weaponSlots[1]) return false;
    player.activeWeaponSlot = player.activeWeaponSlot === 0 ? 1 : 0;
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
      return {
        consumed: true,
        changed,
        activeSlot: player.activeWeaponSlot,
      };
    }

    if (!player.weaponSlots[1]) {
      player.weaponSlots[1] = weaponId;
      player.activeWeaponSlot = 1;
      return {
        consumed: true,
        changed: true,
        activeSlot: 1,
      };
    }

    const droppedWeaponId = player.currentWeaponId;
    player.weaponSlots[player.activeWeaponSlot] = weaponId;
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
      return { fired: false, projectiles: [], reason: "invalid_weapon" };
    }
    if (player.fireCooldown > 0) {
      return { fired: false, projectiles: [], reason: "cooldown" };
    }
    if (player.mana < weapon.manaCost) {
      return { fired: false, projectiles: [], reason: "energy" };
    }

    const modifiers = BuffSystem.getWeaponModifiers(player);
    const projectileStatus = BuffSystem.getProjectileStatus(player);
    player.mana -= weapon.manaCost;
    player.fireCooldown = 1 / (weapon.fireRate * modifiers.fireRateMultiplier);
    player.muzzleFlash = 1;
    player.aimAngle = aimAngle;
    player.facing = Math.cos(aimAngle) >= 0 ? "right" : "left";
    player.facingLeft = player.facing === "left";

    const muzzle = player.getPlayerMuzzlePosition(aimAngle);
    const projectiles: Projectile[] = [];

    const dualFireActive = player.characterId === "knight" && player.skillActiveTimer > 0;
    const volleyCount = dualFireActive ? 2 : 1;
    const rogueCritBonus = player.characterId === "rogue" && player.rogueCritTimer > 0
      ? SkillController.ROGUE_CRIT_BONUS
      : 0;

    for (let volley = 0; volley < volleyCount; volley++) {
      const volleyOffset = dualFireActive ? (volley === 0 ? -0.035 : 0.035) : 0;
      for (let i = 0; i < weapon.pelletCount + modifiers.extraPellets; i++) {
        const angle = aimAngle + volleyOffset + (random() - 0.5) * weapon.spread;
        const critical = random() < Math.min(1, weapon.critChance + rogueCritBonus + modifiers.critChanceBonus);
        const baseDamage = Math.max(1, Math.round(weapon.damage * modifiers.damageMultiplier));
        const damage = critical ? baseDamage * 2 : baseDamage;
        projectiles.push(acquireProjectile(
          muzzle.x,
          muzzle.y,
          Math.cos(angle) * weapon.bulletSpeed,
          Math.sin(angle) * weapon.bulletSpeed,
          3,
          damage,
          "player",
          2,
          weapon.color,
          weapon.knockback + modifiers.knockbackBonus,
          critical,
          modifiers.pierce,
          modifiers.wallBounces,
          projectileStatus?.id,
          projectileStatus?.duration ?? 0,
        ));
      }
    }

    return { fired: true, projectiles };
  }
}
