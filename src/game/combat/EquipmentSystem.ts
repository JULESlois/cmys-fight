/**
 * Equipment loadout and the single place stats are resolved.
 *
 * Stat sources are additive and resolved in one pass:
 *   base character stats + equipment stats + enchant-soul stats
 * The result is folded into DerivedStats, which is what combat actually reads.
 * Nothing else in the codebase should be summing stat contributions.
 */

import {
  DEFAULT_EQUIPMENT,
  EQUIPMENT,
  addStats,
  createBaseStats,
  deriveStats,
  isEquipmentId,
  type DerivedStats,
  type EquipSlot,
  type EquipmentModifier,
  type StatBlock,
} from "../data/equipment";
import { SoulSystem, type SoulCollection, type SoulEffects } from "./SoulSystem";
import { MAX_HEARTS } from "../data/subweapons";
import type { Player } from "../entities/Player";

export type EquipmentLoadout = Record<EquipSlot, string>;

export interface EquipmentProgress {
  /** Equipment the player has bought or found. */
  owned: string[];
  equipped: EquipmentLoadout;
}

const SLOTS: EquipSlot[] = ["hand", "armor", "accessory"];

export function createDefaultEquipmentProgress(): EquipmentProgress {
  return {
    owned: [...Object.values(DEFAULT_EQUIPMENT)],
    equipped: { ...DEFAULT_EQUIPMENT },
  };
}

export function normalizeEquipmentProgress(value: unknown): EquipmentProgress {
  const fallback = createDefaultEquipmentProgress();
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Partial<EquipmentProgress>;

  // The starting items are always owned, so a corrupt save can never leave the
  // player with an empty slot they cannot refill.
  const owned = [...new Set([
    ...Object.values(DEFAULT_EQUIPMENT),
    ...(Array.isArray(raw.owned) ? raw.owned.filter(isEquipmentId) : []),
  ])];
  const ownedSet = new Set(owned);

  const equipped = { ...DEFAULT_EQUIPMENT };
  const rawEquipped = (raw.equipped ?? {}) as Record<string, unknown>;
  for (const slot of SLOTS) {
    const id = rawEquipped[slot];
    if (isEquipmentId(id) && ownedSet.has(id) && EQUIPMENT[id].slot === slot) {
      equipped[slot] = id;
    }
  }
  return { owned, equipped };
}

/** Everything combat needs, resolved once per loadout change. */
export interface ResolvedLoadout {
  stats: StatBlock;
  derived: DerivedStats;
  modifiers: Set<EquipmentModifier>;
  /** Multiplier on sub-weapon heart cost. */
  subWeaponCostMultiplier: number;
  /** Multiplier on Item Crush heart cost. */
  crushCostMultiplier: number;
  /** Extra heart capacity from gear and souls. */
  bonusHeartCapacity: number;
  /** Multiplier on soul drop chance. */
  soulDropMultiplier: number;
  /** Flat mana per second added to the recharge rate (souls + gear rider). */
  manaRegenBonus: number;
}

export class EquipmentSystem {
  public static equip(progress: EquipmentProgress, itemId: string): boolean {
    if (!isEquipmentId(itemId)) return false;
    if (!progress.owned.includes(itemId)) return false;
    progress.equipped[EQUIPMENT[itemId].slot] = itemId;
    return true;
  }

  public static acquire(progress: EquipmentProgress, itemId: string): boolean {
    if (!isEquipmentId(itemId)) return false;
    if (progress.owned.includes(itemId)) return false;
    progress.owned.push(itemId);
    return true;
  }

  public static getEquipped(progress: EquipmentProgress, slot: EquipSlot) {
    return EQUIPMENT[progress.equipped[slot]];
  }

  /**
   * Resolves gear plus soul passives into the block combat reads. `soulEffects`
   * is optional so the Hub can preview gear alone.
   */
  public static resolve(progress: EquipmentProgress, soulEffects?: SoulEffects): ResolvedLoadout {
    let stats = createBaseStats();
    const modifiers = new Set<EquipmentModifier>();

    for (const slot of SLOTS) {
      const item = EquipmentSystem.getEquipped(progress, slot);
      if (!item) continue;
      stats = addStats(stats, item.stats);
      if (item.modifier) modifiers.add(item.modifier);
    }

    if (soulEffects) {
      stats = addStats(stats, {
        strength: soulEffects.bonusStrength,
        constitution: soulEffects.bonusConstitution,
        intelligence: soulEffects.bonusIntelligence,
        luck: soulEffects.bonusLuck,
      });
    }

    const derived = deriveStats(stats);

    // Soul passives layer on top of the stat-derived values rather than being
    // folded into stats, so their caps stay independent.
    if (soulEffects) {
      derived.critChance = Math.min(0.75, derived.critChance + soulEffects.critChance);
      derived.damageReduction = Math.min(0.7, derived.damageReduction + soulEffects.damageReduction);
      derived.dropRateMultiplier *= soulEffects.soulDropMultiplier;
    }

    let bonusHeartCapacity = soulEffects?.bonusHeartCapacity ?? 0;
    if (modifiers.has("heart_capacity_up")) bonusHeartCapacity += 10;

    let soulDropMultiplier = soulEffects?.soulDropMultiplier ?? 1;
    if (modifiers.has("soul_drop_up")) soulDropMultiplier *= 1.5;

    // The alchemy bracer's rider is expressed in the same units as the
    // mirror-wisp soul (mana per second), sized just above it.
    let manaRegenBonus = soulEffects?.manaRegenBonus ?? 0;
    if (modifiers.has("mana_regen_up")) manaRegenBonus += 3;

    return {
      stats,
      derived,
      modifiers,
      subWeaponCostMultiplier: modifiers.has("subweapon_cost_down") ? 0.5 : 1,
      crushCostMultiplier: modifiers.has("crush_cost_down") ? 0.7 : 1,
      bonusHeartCapacity,
      soulDropMultiplier,
      manaRegenBonus,
    };
  }

  /**
   * Resolves the meta loadout and writes the result onto the run's Player.
   * This is the single seam DungeonState calls at run start and whenever the
   * soul or equipment loadout changes, so combat only ever reads player fields.
   *
   * Flat max-HP/max-mana bonuses are intentionally NOT applied here: they touch
   * persisted player state, so the caller applies them once per run.
   */
  public static applyToPlayer(
    player: Player,
    souls: SoulCollection,
    equipment: EquipmentProgress,
  ): ResolvedLoadout {
    const soulEffects = SoulSystem.computeEffects(souls);
    const resolved = EquipmentSystem.resolve(equipment, soulEffects);

    // Fold the gear rider into the effect block so DamageSystem reads one field.
    soulEffects.manaRegenBonus = resolved.manaRegenBonus;

    player.soulEffects = soulEffects;
    player.stats = resolved.stats;
    player.derivedStats = resolved.derived;
    player.subWeaponCostMultiplier = resolved.subWeaponCostMultiplier;
    player.crushCostMultiplier = resolved.crushCostMultiplier;
    player.abilities = [...soulEffects.abilities];
    player.armorRegenDisabled = resolved.modifiers.has("no_armor_regen");
    player.maxHearts = Math.min(MAX_HEARTS * 2, MAX_HEARTS + Math.max(0, resolved.bonusHeartCapacity));
    player.hearts = Math.min(player.hearts, player.maxHearts);
    return resolved;
  }

  /** Total shard cost of everything not yet owned, for the Hub's progress row. */
  public static getRemainingCost(progress: EquipmentProgress): number {
    const owned = new Set(progress.owned);
    return Object.values(EQUIPMENT)
      .filter(item => !owned.has(item.id))
      .reduce((total, item) => total + item.cost, 0);
  }
}
