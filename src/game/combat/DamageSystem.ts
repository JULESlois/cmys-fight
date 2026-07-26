import type { Enemy } from "../entities/Enemy";
import type { Player } from "../entities/Player";
import { BuffSystem } from "./BuffSystem";
import { CombatEventDispatcher } from "./CombatEvents";

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
      // The Dracula Mantle trades its huge stat block for a shell that never
      // self-repairs (`no_armor_regen`).
      if (player.armor < player.maxArmor && player.armorRechargeTimer <= 0 && !player.armorRegenDisabled) {
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
      // Souls (mirror wisp) and gear (alchemy bracer) add flat mana/second.
      const manaRate = player.manaRechargeRate + Math.max(0, player.soulEffects?.manaRegenBonus ?? 0);
      player.mana = Math.min(player.maxMana, player.mana + manaRate * dt);
    }
  }

  static damagePlayer(player: Player, amount: number, invulnerabilityDuration = 0.55, source?: import("./CombatEvents").CombatSource): DamageResult {
    let damage = Math.max(0, amount);
    // Equipment/soul damage reduction (CON-derived plus soul passives, both
    // capped upstream). Applied before armor so the caps stay meaningful.
    const reduction = Math.max(0, Math.min(0.7, player.derivedStats?.damageReduction ?? 0));
    if (reduction > 0 && damage > 0) {
      damage = Math.round(damage * (1 - reduction) * 100) / 100;
    }
    if (damage <= 0 || player.hp <= 0) {
      return { ...NO_DAMAGE, killed: player.hp <= 0 };
    }
    
    if (player.perfectDodgeWindow > 0 && !player.justPerfectDodged) {
      player.justPerfectDodged = true;
      CombatEventDispatcher.emit("player_perfect_dodge", { player });
    }
    
    if (player.invulnerabilityTimer > 0) {
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

    const totalDamage = armorDamage + actualHpDamage;
    if (totalDamage > 0) {
      CombatEventDispatcher.emit("player_damaged", { player, damage: totalDamage, source });
    }

    return {
      applied: true,
      armorDamage,
      hpDamage: actualHpDamage,
      killed: player.hp <= 0,
    };
  }

  static damageEnemy(enemy: Enemy, amount: number, player?: Player, isCrit?: boolean, source?: import("./CombatEvents").CombatSource): DamageResult {
    let damage = Math.max(0, amount);
    // STR-derived damage multiplier from the equipment/soul layer. Sub-weapon
    // spawns are excluded: their damage was already scaled by the dedicated
    // subWeaponMultiplier when SubWeaponSystem produced them.
    const isSubWeapon = source?.weaponId?.startsWith("subweapon:") === true;
    if (player && damage > 0 && !isSubWeapon) {
      damage = Math.round(damage * (player.derivedStats?.damageMultiplier ?? 1) * 100) / 100;
    }
    // Bonus crit chance from LCK/souls, layered on top of the weapon's own
    // crit roll (which arrives here as isCrit). Uses the game's default 2x.
    if (player && damage > 0 && !isCrit) {
      const bonusCrit = Math.max(0, Math.min(0.75, player.derivedStats?.critChance ?? 0));
      if (bonusCrit > 0 && Math.random() < bonusCrit) {
        isCrit = true;
        damage = Math.round(damage * 2 * 100) / 100;
      }
    }
    if (damage <= 0 || enemy.hp <= 0) {
      return { ...NO_DAMAGE, killed: enemy.hp <= 0 };
    }

    const hpBefore = enemy.hp;
    enemy.hp = Math.max(0, enemy.hp - damage);
    enemy.hitFlash = 0.1;

    const result = {
      applied: true,
      armorDamage: 0,
      hpDamage: hpBefore - enemy.hp,
      killed: enemy.hp <= 0,
    };
    if (player && result.hpDamage > 0) {
      const finalSource = source ?? { kind: "unknown", canTriggerBuffs: false, canTriggerSynergies: false };
      CombatEventDispatcher.emit("player_hit_enemy", { player, enemy, damage: result.hpDamage, isCrit: isCrit ?? false, source: finalSource });
      if (result.killed) {
        CombatEventDispatcher.emit("player_kill_enemy", { player, enemy, source: finalSource });
      }
    }
    return result;
  }
}
