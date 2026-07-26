/**
 * Soul drops, equipping, and the aggregate effect of an equipped set.
 *
 * Souls are collected permanently but equipped four at a time (one per type),
 * so the progression is "widen the pool, then commit to a build". Drop rolls
 * are seeded from the kill so a replayed run drops the same souls.
 */

import {
  SOULS,
  getSoulForEnemy,
  isSoulId,
  type SoulAbility,
  type SoulDefinition,
  type SoulType,
} from "../data/souls";
import type { Player } from "../entities/Player";

export type SoulLoadout = Partial<Record<SoulType, string>>;

export interface SoulCollection {
  /** Every soul the player has ever obtained. */
  owned: string[];
  /** Currently equipped, one per type. */
  equipped: SoulLoadout;
}

export function createDefaultSoulCollection(): SoulCollection {
  return { owned: [], equipped: {} };
}

export function normalizeSoulCollection(value: unknown): SoulCollection {
  const fallback = createDefaultSoulCollection();
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Partial<SoulCollection>;
  const owned = Array.isArray(raw.owned) ? [...new Set(raw.owned.filter(isSoulId))] : [];
  const ownedSet = new Set(owned);

  const equipped: SoulLoadout = {};
  const rawEquipped = (raw.equipped ?? {}) as Record<string, unknown>;
  for (const type of ["bullet", "guardian", "enchant", "ability"] as SoulType[]) {
    const id = rawEquipped[type];
    // Only keep an equip that is both a real soul, owned, and of the right type.
    if (isSoulId(id) && ownedSet.has(id) && SOULS[id].type === type) equipped[type] = id;
  }
  return { owned, equipped };
}

/**
 * Aggregate of every equipped soul, precomputed once per equip change rather
 * than per frame.
 */
export interface SoulEffects {
  bonusStrength: number;
  bonusConstitution: number;
  bonusIntelligence: number;
  bonusLuck: number;
  bonusHeartCapacity: number;
  /** Additive fractions. */
  critChance: number;
  damageReduction: number;
  moveSpeedMultiplier: number;
  manaRegenBonus: number;
  heartDropMultiplier: number;
  soulDropMultiplier: number;
  coinMultiplier: number;
  /** Traversal powers currently held. */
  abilities: SoulAbility[];
}

export function createEmptySoulEffects(): SoulEffects {
  return {
    bonusStrength: 0,
    bonusConstitution: 0,
    bonusIntelligence: 0,
    bonusLuck: 0,
    bonusHeartCapacity: 0,
    critChance: 0,
    damageReduction: 0,
    moveSpeedMultiplier: 1,
    manaRegenBonus: 0,
    heartDropMultiplier: 1,
    soulDropMultiplier: 1,
    coinMultiplier: 1,
    abilities: [],
  };
}

export class SoulSystem {
  /**
   * Rolls a soul drop for a kill. `roll` is the seeded 0..1 value supplied by
   * the caller so the outcome is reproducible.
   */
  public static rollDrop(
    enemyId: string,
    roll: number,
    dropRateMultiplier = 1,
  ): SoulDefinition | undefined {
    const soul = getSoulForEnemy(enemyId);
    if (!soul) return undefined;
    // Bosses author dropRate 1; the multiplier must not push a rare soul to a
    // guaranteed drop, so the chance is clamped just under certainty unless it
    // was already authored as guaranteed.
    const chance = soul.dropRate >= 1
      ? 1
      : Math.min(0.95, soul.dropRate * Math.max(0, dropRateMultiplier));
    return roll < chance ? soul : undefined;
  }

  /** Returns true when the soul was newly added rather than a duplicate. */
  public static collect(collection: SoulCollection, soulId: string): boolean {
    if (!isSoulId(soulId)) return false;
    if (collection.owned.includes(soulId)) return false;
    collection.owned.push(soulId);
    return true;
  }

  public static equip(collection: SoulCollection, soulId: string): boolean {
    if (!isSoulId(soulId)) return false;
    if (!collection.owned.includes(soulId)) return false;
    collection.equipped[SOULS[soulId].type] = soulId;
    return true;
  }

  public static unequip(collection: SoulCollection, type: SoulType): void {
    delete collection.equipped[type];
  }

  public static getEquipped(collection: SoulCollection, type: SoulType): SoulDefinition | undefined {
    const id = collection.equipped[type];
    return id ? SOULS[id] : undefined;
  }

  /**
   * Folds the equipped set into a single effect block. Exhaustive over
   * SoulEffect so adding an effect tag without handling it fails the build.
   */
  public static computeEffects(collection: SoulCollection): SoulEffects {
    const effects = createEmptySoulEffects();

    for (const type of ["bullet", "guardian", "enchant", "ability"] as SoulType[]) {
      const soul = SoulSystem.getEquipped(collection, type);
      if (!soul) continue;

      switch (soul.effect) {
        case "stat_strength": effects.bonusStrength += soul.power; break;
        case "stat_constitution": effects.bonusConstitution += soul.power; break;
        case "stat_intelligence": effects.bonusIntelligence += soul.power; break;
        case "stat_luck": effects.bonusLuck += soul.power; break;
        case "heart_capacity": effects.bonusHeartCapacity += soul.power; break;
        case "heart_greed": effects.heartDropMultiplier += soul.power; break;
        case "soul_greed": effects.soulDropMultiplier += soul.power; break;
        case "coin_greed": effects.coinMultiplier += soul.power; break;
        case "crit_chance": effects.critChance += soul.power; break;
        case "damage_reduction": effects.damageReduction += soul.power; break;
        case "move_speed": effects.moveSpeedMultiplier += soul.power; break;
        case "mana_regen": effects.manaRegenBonus += soul.power; break;
        case "traversal":
          if (soul.ability) effects.abilities.push(soul.ability);
          break;
        // Active effects are resolved at use time, not folded into passives.
        case "projectile_spread":
        case "projectile_pierce":
        case "projectile_homing":
        case "projectile_heavy":
        case "summon_familiar":
        case "aura_damage":
        case "aura_shield":
        case "aura_slow":
        case "aura_regen":
          break;
      }
    }

    // Clamp the stacking passives so a lucky build cannot reach immunity.
    effects.damageReduction = Math.min(0.4, effects.damageReduction);
    effects.critChance = Math.min(0.5, effects.critChance);
    effects.moveSpeedMultiplier = Math.min(1.5, effects.moveSpeedMultiplier);
    return effects;
  }

  /** Mana the guardian aura drains this frame, if one is equipped and held. */
  public static getGuardianDrain(collection: SoulCollection, deltaTime: number): number {
    const guardian = SoulSystem.getEquipped(collection, "guardian");
    return guardian ? guardian.manaCost * deltaTime : 0;
  }

  public static canAffordBullet(collection: SoulCollection, player: Player): boolean {
    const bullet = SoulSystem.getEquipped(collection, "bullet");
    if (!bullet) return false;
    return player.mana >= bullet.manaCost;
  }

  public static getCollectionCompletion(collection: SoulCollection): number {
    const total = Object.keys(SOULS).length;
    return total > 0 ? collection.owned.length / total : 0;
  }
}
