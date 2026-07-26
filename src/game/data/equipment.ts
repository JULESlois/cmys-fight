/**
 * Equipment and the four-stat RPG layer.
 *
 * Three slots (weapon-hand / armor / accessory) feed a single stat block that
 * the combat systems read through EquipmentSystem. Stats are deliberately few
 * and each one owns a distinct derived value, so an upgrade is never ambiguous:
 *
 *   STR — primary and sub-weapon damage
 *   CON — max HP and flat damage reduction
 *   INT — soul damage and max mana
 *   LCK — crit chance and soul/heart drop rate
 *
 * Equipment is meta progress: it survives death and is chosen in the Hub.
 */

export type EquipSlot = "hand" | "armor" | "accessory";

export type StatKey = "strength" | "constitution" | "intelligence" | "luck";

export interface StatBlock {
  strength: number;
  constitution: number;
  intelligence: number;
  luck: number;
}

export interface EquipmentDefinition {
  id: string;
  /** i18n key suffix: `equip.${id}.name`. */
  name: string;
  slot: EquipSlot;
  /** Shares the weapon rarity scale so the HUD tint helper is reused. */
  rarity: "common" | "uncommon" | "rare" | "legendary" | "myth";
  stats: Partial<StatBlock>;
  /** Shard cost in the Hub. 0 means it is a starting item. */
  cost: number;
  /** Optional rule rider, interpreted by EquipmentSystem. */
  modifier?: EquipmentModifier;
}

export type EquipmentModifier =
  | "heart_capacity_up"
  | "subweapon_cost_down"
  | "soul_drop_up"
  | "crush_cost_down"
  | "mana_regen_up"
  | "no_armor_regen";

export const BASE_STATS: StatBlock = {
  strength: 10,
  constitution: 10,
  intelligence: 10,
  luck: 5,
};

export const EQUIPMENT: Record<string, EquipmentDefinition> = {
  // ---- hand ------------------------------------------------------------
  worn_gauntlet: { id: "worn_gauntlet", name: "WORN GAUNTLET", slot: "hand", rarity: "common", stats: { strength: 2 }, cost: 0 },
  hunter_glove: { id: "hunter_glove", name: "HUNTER GLOVE", slot: "hand", rarity: "uncommon", stats: { strength: 4, luck: 1 }, cost: 40 },
  vampire_killer_grip: { id: "vampire_killer_grip", name: "KILLER GRIP", slot: "hand", rarity: "rare", stats: { strength: 7 }, cost: 110, modifier: "subweapon_cost_down" },
  alchemy_bracer: { id: "alchemy_bracer", name: "ALCHEMY BRACER", slot: "hand", rarity: "rare", stats: { intelligence: 6, strength: 2 }, cost: 120, modifier: "mana_regen_up" },
  belmont_relic: { id: "belmont_relic", name: "BELMONT RELIC", slot: "hand", rarity: "legendary", stats: { strength: 11, constitution: 3 }, cost: 260, modifier: "crush_cost_down" },

  // ---- armor -----------------------------------------------------------
  travel_cloak: { id: "travel_cloak", name: "TRAVEL CLOAK", slot: "armor", rarity: "common", stats: { constitution: 2 }, cost: 0 },
  chain_vest: { id: "chain_vest", name: "CHAIN VEST", slot: "armor", rarity: "uncommon", stats: { constitution: 5 }, cost: 45 },
  mirror_plate: { id: "mirror_plate", name: "MIRROR PLATE", slot: "armor", rarity: "rare", stats: { constitution: 8, intelligence: 2 }, cost: 130 },
  soul_shroud: { id: "soul_shroud", name: "SOUL SHROUD", slot: "armor", rarity: "rare", stats: { intelligence: 7, constitution: 3 }, cost: 135, modifier: "soul_drop_up" },
  dracula_mantle: { id: "dracula_mantle", name: "DRACULA MANTLE", slot: "armor", rarity: "myth", stats: { constitution: 12, intelligence: 6 }, cost: 320, modifier: "no_armor_regen" },

  // ---- accessory -------------------------------------------------------
  copper_ring: { id: "copper_ring", name: "COPPER RING", slot: "accessory", rarity: "common", stats: { luck: 2 }, cost: 0 },
  heart_locket: { id: "heart_locket", name: "HEART LOCKET", slot: "accessory", rarity: "uncommon", stats: { constitution: 2, luck: 2 }, cost: 50, modifier: "heart_capacity_up" },
  moon_charm: { id: "moon_charm", name: "MOON CHARM", slot: "accessory", rarity: "rare", stats: { luck: 6 }, cost: 125, modifier: "soul_drop_up" },
  scholar_lens: { id: "scholar_lens", name: "SCHOLAR LENS", slot: "accessory", rarity: "rare", stats: { intelligence: 8 }, cost: 128 },
  crimson_seal: { id: "crimson_seal", name: "CRIMSON SEAL", slot: "accessory", rarity: "legendary", stats: { strength: 5, intelligence: 5, luck: 5 }, cost: 275 },
};

export const EQUIPMENT_IDS = Object.keys(EQUIPMENT);

export const DEFAULT_EQUIPMENT: Record<EquipSlot, string> = {
  hand: "worn_gauntlet",
  armor: "travel_cloak",
  accessory: "copper_ring",
};

export function isEquipmentId(value: unknown): value is string {
  return typeof value === "string" && value in EQUIPMENT;
}

export function getEquipmentBySlot(slot: EquipSlot): EquipmentDefinition[] {
  return Object.values(EQUIPMENT).filter(item => item.slot === slot);
}

export function createBaseStats(): StatBlock {
  return { ...BASE_STATS };
}

export function addStats(target: StatBlock, source: Partial<StatBlock>): StatBlock {
  return {
    strength: target.strength + (source.strength ?? 0),
    constitution: target.constitution + (source.constitution ?? 0),
    intelligence: target.intelligence + (source.intelligence ?? 0),
    luck: target.luck + (source.luck ?? 0),
  };
}

/**
 * Derived combat values. Centralised here so balance lives in one place and
 * the individual systems stay dumb consumers.
 */
export interface DerivedStats {
  /** Multiplier applied to primary weapon damage. */
  damageMultiplier: number;
  /** Multiplier applied to sub-weapon damage. */
  subWeaponMultiplier: number;
  /** Multiplier applied to soul damage. */
  soulMultiplier: number;
  /** Flat HP added on top of the character's base. */
  bonusMaxHp: number;
  /** Flat mana added on top of the character's base. */
  bonusMaxMana: number;
  /** Fraction of incoming damage removed, 0..0.6. */
  damageReduction: number;
  /** Additive crit chance, 0..1. */
  critChance: number;
  /** Multiplier on soul and heart drop rates. */
  dropRateMultiplier: number;
}

export function deriveStats(stats: StatBlock): DerivedStats {
  return {
    damageMultiplier: 1 + (stats.strength - BASE_STATS.strength) * 0.03,
    subWeaponMultiplier: 1 + (stats.strength - BASE_STATS.strength) * 0.025,
    soulMultiplier: 1 + (stats.intelligence - BASE_STATS.intelligence) * 0.04,
    bonusMaxHp: Math.floor((stats.constitution - BASE_STATS.constitution) * 0.5),
    bonusMaxMana: Math.floor((stats.intelligence - BASE_STATS.intelligence) * 1.5),
    // Capped so stacking CON can never reach immunity.
    damageReduction: Math.min(0.6, Math.max(0, (stats.constitution - BASE_STATS.constitution) * 0.012)),
    critChance: Math.min(0.5, Math.max(0, (stats.luck - BASE_STATS.luck) * 0.008)),
    dropRateMultiplier: 1 + Math.max(0, stats.luck - BASE_STATS.luck) * 0.02,
  };
}
