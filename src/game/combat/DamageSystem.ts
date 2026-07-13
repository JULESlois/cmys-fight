import type { Enemy } from "../entities/Enemy";
import type { Player } from "../entities/Player";
import { BuffSystem } from "./BuffSystem";

export interface DamageResult {
  applied: boolean;
  armorDamage: number;
  hpDamage: number;
  killed: boolean;
}

const NO_DAMAGE: DamageResult = {
  applied: false,
  armorDamage: 0,
  hpDamage: 0,
  killed: false,
};

export class DamageSystem {
  static updatePlayer(player: Player, dt: number): void {
    player.invulnerabilityTimer = Math.max(0, player.invulnerabilityTimer - dt);
    if (player.hp <= 0) return;

    if (player.maxArmor > 0) {
      player.armorRechargeTimer = Math.max(0, player.armorRechargeTimer - dt);
      if (player.armor < player.maxArmor && player.armorRechargeTimer <= 0) {
        player.armor = Math.min(player.maxArmor, player.armor + player.armorRechargeRate * dt);
      }

      if (
        player.characterId === "knight" &&
        player.armor >= player.maxArmor &&
        player.armorRechargeTimer <= 0
      ) {
        player.knightGuardReady = true;
      }
    }

    player.manaRechargeTimer = Math.max(0, player.manaRechargeTimer - dt);
    if (player.mana < player.maxMana && player.manaRechargeTimer <= 0) {
      player.mana = Math.min(player.maxMana, player.mana + player.manaRechargeRate * dt);
    }
  }

  static damagePlayer(player: Player, amount: number, invulnerabilityDuration = 0.55): DamageResult {
    let damage = Math.max(0, amount);
    if (damage <= 0 || player.hp <= 0 || player.invulnerabilityTimer > 0) {
      return { ...NO_DAMAGE, killed: player.hp <= 0 };
    }

    if (player.characterId === "knight" && player.knightGuardReady) {
      damage = Math.max(0, damage - 1);
      player.knightGuardReady = false;
    }

    const temporaryArmorDamage = Math.min(player.celestiaTemporaryArmor, damage);
    player.celestiaTemporaryArmor = Math.max(0, player.celestiaTemporaryArmor - temporaryArmorDamage);
    if (player.celestiaTemporaryArmor <= 0) player.celestiaTemporaryArmorTimer = 0;
    damage -= temporaryArmorDamage;

    const normalArmorDamage = Math.min(player.armor, damage);
    const armorDamage = temporaryArmorDamage + normalArmorDamage;
    const hpDamage = damage - normalArmorDamage;

    player.armor = Math.max(0, player.armor - normalArmorDamage);
    const hpBefore = player.hp;
    player.hp = Math.max(0, player.hp - hpDamage);
    let actualHpDamage = hpBefore - player.hp;
    if (player.hp <= 0 && player.phoenixProtocolReady && BuffSystem.has(player, "phoenix_protocol")) {
      player.hp = Math.min(player.maxHp, 2);
      player.armor = Math.min(player.maxArmor, player.armor + 3);
      actualHpDamage = Math.max(0, hpBefore - player.hp);
      player.phoenixProtocolReady = false;
    } else if (player.hp <= 0 && player.emergencyBarrierReady && BuffSystem.has(player, "emergency_barrier")) {
      player.hp = 1;
      actualHpDamage = Math.max(0, hpBefore - 1);
      player.emergencyBarrierReady = false;
    }
    player.invulnerabilityTimer = invulnerabilityDuration;
    player.armorRechargeTimer = player.armorRechargeDelay;
    player.hitFlash = actualHpDamage > 0 ? 0.2 : 0.1;

    return {
      applied: true,
      armorDamage,
      hpDamage: actualHpDamage,
      killed: player.hp <= 0,
    };
  }

  static damageEnemy(enemy: Enemy, amount: number): DamageResult {
    const damage = Math.max(0, amount);
    if (damage <= 0 || enemy.hp <= 0) {
      return { ...NO_DAMAGE, killed: enemy.hp <= 0 };
    }

    const hpBefore = enemy.hp;
    enemy.hp = Math.max(0, enemy.hp - damage);
    enemy.hitFlash = 0.1;

    return {
      applied: true,
      armorDamage: 0,
      hpDamage: hpBefore - enemy.hp,
      killed: enemy.hp <= 0,
    };
  }
}
