import { WEAPONS, isWeaponId } from "../data/weapons";
import { Player } from "../entities/Player";
import { Projectile } from "../entities/Projectile";

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

    player.mana -= weapon.manaCost;
    player.fireCooldown = 1 / weapon.fireRate;
    player.muzzleFlash = 1;
    player.aimAngle = aimAngle;
    player.facing = Math.cos(aimAngle) >= 0 ? "right" : "left";
    player.facingLeft = player.facing === "left";

    const muzzle = player.getPlayerMuzzlePosition(aimAngle);
    const projectiles: Projectile[] = [];

    for (let i = 0; i < weapon.pelletCount; i++) {
      const angle = aimAngle + (random() - 0.5) * weapon.spread;
      const critical = random() < weapon.critChance;
      const damage = critical ? weapon.damage * 2 : weapon.damage;
      projectiles.push(new Projectile(
        muzzle.x,
        muzzle.y,
        Math.cos(angle) * weapon.bulletSpeed,
        Math.sin(angle) * weapon.bulletSpeed,
        3,
        damage,
        "player",
        2,
        weapon.color,
        weapon.knockback,
        critical,
      ));
    }

    return { fired: true, projectiles };
  }
}
