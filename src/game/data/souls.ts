/**
 * Aria-of-Sorrow style soul drops.
 *
 * Every enemy in the roster owns exactly one soul. Killing that enemy rolls
 * against `dropRate`; a successful roll grants the soul permanently (it is meta
 * progress, not run progress) and unlocks it for the loadout.
 *
 * Four soul types map onto four independent equip slots, so a build is always
 * one of each rather than four copies of the best one:
 *   bullet   — an active throw, fired on the sub-weapon button, costs mana
 *   guardian — a sustained aura, costs mana per second while held
 *   enchant  — a passive stat or rule modifier, always on
 *   ability  — a traversal power that also opens map gates (see AbilityGates)
 */

import { ENEMIES } from "./enemies";

export type SoulType = "bullet" | "guardian" | "enchant" | "ability";

/**
 * Traversal powers. These double as the metroidvania gate keys, so the set is
 * intentionally small — every one of them must have authored gates to open.
 */
export type SoulAbility =
  | "double_jump"
  | "slide"
  | "mist"
  | "grapple"
  | "ice_walk"
  | "heat_ward";

export interface SoulDefinition {
  id: string;
  /** Enemy that drops it. One-to-one with the roster. */
  enemyId: string;
  type: SoulType;
  /** i18n key suffix: `soul.${id}.name`. */
  name: string;
  /** Probability per kill, 0..1. Bosses are guaranteed. */
  dropRate: number;
  /** Mana cost per activation (bullet) or per second (guardian). 0 otherwise. */
  manaCost: number;
  /** Scalar the consuming system interprets per type. */
  power: number;
  /** Only meaningful for `ability` souls. */
  ability?: SoulAbility;
  /** Machine-readable effect tag consumed by SoulSystem. */
  effect: SoulEffect;
}

/**
 * Effect tags. Kept as a closed union so SoulSystem's switch is exhaustive and
 * a new soul cannot be added without deciding what it actually does.
 */
export type SoulEffect =
  // bullet
  | "projectile_spread"
  | "projectile_pierce"
  | "projectile_homing"
  | "projectile_heavy"
  | "summon_familiar"
  // guardian
  | "aura_damage"
  | "aura_shield"
  | "aura_slow"
  | "aura_regen"
  // enchant
  | "stat_strength"
  | "stat_constitution"
  | "stat_intelligence"
  | "stat_luck"
  | "heart_capacity"
  | "heart_greed"
  | "soul_greed"
  | "coin_greed"
  | "crit_chance"
  | "damage_reduction"
  | "move_speed"
  | "mana_regen"
  // ability
  | "traversal";

/**
 * Souls are authored per enemy. The table is intentionally explicit rather than
 * generated, because drop rate and effect are balance decisions per monster.
 */
export const SOULS: Record<string, SoulDefinition> = {
  // ---- forest ----------------------------------------------------------
  soul_moss_brute: { id: "soul_moss_brute", enemyId: "moss_brute", type: "enchant", name: "MOSS HIDE", dropRate: 0.08, manaCost: 0, power: 2, effect: "stat_constitution" },
  soul_thorn_archer: { id: "soul_thorn_archer", enemyId: "thorn_archer", type: "bullet", name: "THORN VOLLEY", dropRate: 0.07, manaCost: 8, power: 3, effect: "projectile_spread" },
  soul_boar_charger: { id: "soul_boar_charger", enemyId: "boar_charger", type: "enchant", name: "BOAR RUSH", dropRate: 0.07, manaCost: 0, power: 0.12, effect: "move_speed" },
  soul_dingdong_fowl: { id: "soul_dingdong_fowl", enemyId: "dingdong_fowl", type: "enchant", name: "FOWL LUCK", dropRate: 0.06, manaCost: 0, power: 3, effect: "stat_luck" },
  soul_spore_mimic: { id: "soul_spore_mimic", enemyId: "spore_mimic", type: "guardian", name: "SPORE VEIL", dropRate: 0.05, manaCost: 4, power: 2, effect: "aura_slow" },
  soul_root_lancer: { id: "soul_root_lancer", enemyId: "root_lancer", type: "bullet", name: "ROOT LANCE", dropRate: 0.07, manaCost: 10, power: 6, effect: "projectile_pierce" },
  soul_petal_moth: { id: "soul_petal_moth", enemyId: "petal_moth", type: "ability", name: "PETAL DRIFT", dropRate: 0.05, manaCost: 6, power: 1, ability: "double_jump", effect: "traversal" },
  soul_forest_guardian: { id: "soul_forest_guardian", enemyId: "forest_guardian", type: "guardian", name: "GROVE WARD", dropRate: 1, manaCost: 6, power: 3, effect: "aura_shield" },
  soul_broadcast_rooster: { id: "soul_broadcast_rooster", enemyId: "broadcast_rooster", type: "enchant", name: "SIGNAL GREED", dropRate: 1, manaCost: 0, power: 0.25, effect: "coin_greed" },

  // ---- dungeon ---------------------------------------------------------
  soul_bone_guard: { id: "soul_bone_guard", enemyId: "bone_guard", type: "enchant", name: "BONE PLATE", dropRate: 0.08, manaCost: 0, power: 0.08, effect: "damage_reduction" },
  soul_bolt_cultist: { id: "soul_bolt_cultist", enemyId: "bolt_cultist", type: "bullet", name: "BOLT HEX", dropRate: 0.07, manaCost: 9, power: 5, effect: "projectile_homing" },
  soul_grave_summoner: { id: "soul_grave_summoner", enemyId: "grave_summoner", type: "bullet", name: "GRAVE CALL", dropRate: 0.05, manaCost: 18, power: 4, effect: "summon_familiar" },
  soul_bark_hound: { id: "soul_bark_hound", enemyId: "bark_hound", type: "enchant", name: "HOUND SENSE", dropRate: 0.07, manaCost: 0, power: 0.06, effect: "crit_chance" },
  soul_chain_jailer: { id: "soul_chain_jailer", enemyId: "chain_jailer", type: "ability", name: "CHAIN HOOK", dropRate: 0.05, manaCost: 8, power: 1, ability: "grapple", effect: "traversal" },
  soul_coffin_lobber: { id: "soul_coffin_lobber", enemyId: "coffin_lobber", type: "bullet", name: "COFFIN LOB", dropRate: 0.07, manaCost: 12, power: 9, effect: "projectile_heavy" },
  soul_lantern_wraith: { id: "soul_lantern_wraith", enemyId: "lantern_wraith", type: "ability", name: "WRAITH MIST", dropRate: 0.05, manaCost: 10, power: 1, ability: "mist", effect: "traversal" },
  soul_crypt_overseer: { id: "soul_crypt_overseer", enemyId: "crypt_overseer", type: "guardian", name: "CRYPT AEGIS", dropRate: 1, manaCost: 7, power: 4, effect: "aura_damage" },
  soul_kennel_warden: { id: "soul_kennel_warden", enemyId: "kennel_warden", type: "enchant", name: "WARDEN GREED", dropRate: 1, manaCost: 0, power: 0.3, effect: "soul_greed" },

  // ---- snow ------------------------------------------------------------
  soul_frost_hound: { id: "soul_frost_hound", enemyId: "frost_hound", type: "enchant", name: "FROST COAT", dropRate: 0.08, manaCost: 0, power: 2, effect: "stat_constitution" },
  soul_ice_shaman: { id: "soul_ice_shaman", enemyId: "ice_shaman", type: "guardian", name: "GLACIER AURA", dropRate: 0.06, manaCost: 5, power: 3, effect: "aura_slow" },
  soul_snow_turret: { id: "soul_snow_turret", enemyId: "snow_turret", type: "bullet", name: "TURRET BURST", dropRate: 0.07, manaCost: 7, power: 4, effect: "projectile_spread" },
  soul_white_sampler: { id: "soul_white_sampler", enemyId: "white_sampler", type: "enchant", name: "SAMPLE MIND", dropRate: 0.06, manaCost: 0, power: 3, effect: "stat_intelligence" },
  soul_mirror_wisp: { id: "soul_mirror_wisp", enemyId: "mirror_wisp", type: "enchant", name: "MIRROR FLOW", dropRate: 0.05, manaCost: 0, power: 2.5, effect: "mana_regen" },
  soul_icicle_sniper: { id: "soul_icicle_sniper", enemyId: "icicle_sniper", type: "bullet", name: "ICICLE SHOT", dropRate: 0.07, manaCost: 11, power: 8, effect: "projectile_pierce" },
  soul_lab_servitor: { id: "soul_lab_servitor", enemyId: "lab_servitor", type: "ability", name: "SERVO SLIDE", dropRate: 0.05, manaCost: 4, power: 1, ability: "slide", effect: "traversal" },
  soul_frost_titan: { id: "soul_frost_titan", enemyId: "frost_titan", type: "ability", name: "TITAN TREAD", dropRate: 1, manaCost: 0, power: 1, ability: "ice_walk", effect: "traversal" },
  soul_white_director: { id: "soul_white_director", enemyId: "white_director", type: "enchant", name: "DIRECTOR EDGE", dropRate: 1, manaCost: 0, power: 4, effect: "stat_intelligence" },

  // ---- lava ------------------------------------------------------------
  soul_ember_knight: { id: "soul_ember_knight", enemyId: "ember_knight", type: "enchant", name: "EMBER EDGE", dropRate: 0.08, manaCost: 0, power: 3, effect: "stat_strength" },
  soul_magma_spitter: { id: "soul_magma_spitter", enemyId: "magma_spitter", type: "bullet", name: "MAGMA SPIT", dropRate: 0.07, manaCost: 9, power: 6, effect: "projectile_heavy" },
  soul_cinder_oracle: { id: "soul_cinder_oracle", enemyId: "cinder_oracle", type: "guardian", name: "CINDER HALO", dropRate: 0.06, manaCost: 6, power: 4, effect: "aura_damage" },
  soul_code_horse: { id: "soul_code_horse", enemyId: "code_horse", type: "enchant", name: "CODE GALLOP", dropRate: 0.06, manaCost: 0, power: 0.15, effect: "move_speed" },
  soul_furnace_beetle: { id: "soul_furnace_beetle", enemyId: "furnace_beetle", type: "enchant", name: "FURNACE SHELL", dropRate: 0.07, manaCost: 0, power: 0.1, effect: "damage_reduction" },
  soul_magma_mortar: { id: "soul_magma_mortar", enemyId: "magma_mortar", type: "bullet", name: "MORTAR ARC", dropRate: 0.07, manaCost: 13, power: 11, effect: "projectile_heavy" },
  soul_heat_smith_drone: { id: "soul_heat_smith_drone", enemyId: "heat_smith_drone", type: "enchant", name: "SMITH CACHE", dropRate: 0.06, manaCost: 0, power: 6, effect: "heart_capacity" },
  soul_inferno_core: { id: "soul_inferno_core", enemyId: "inferno_core", type: "ability", name: "INFERNO WARD", dropRate: 1, manaCost: 0, power: 1, ability: "heat_ward", effect: "traversal" },
  soul_vat_horse_prime: { id: "soul_vat_horse_prime", enemyId: "vat_horse_prime", type: "guardian", name: "PRIME REGEN", dropRate: 1, manaCost: 8, power: 1.5, effect: "aura_regen" },

  // ---- sealed library (route depth 2) ----------------------------------
  soul_cursed_tome: { id: "soul_cursed_tome", enemyId: "cursed_tome", type: "bullet", name: "PAGE STORM", dropRate: 0.07, manaCost: 9, power: 5, effect: "projectile_homing" },
  soul_arcane_guard: { id: "soul_arcane_guard", enemyId: "arcane_guard", type: "enchant", name: "ARCANE PLATE", dropRate: 0.08, manaCost: 0, power: 0.08, effect: "damage_reduction" },
  soul_ink_summoner: { id: "soul_ink_summoner", enemyId: "ink_summoner", type: "bullet", name: "INK CALL", dropRate: 0.05, manaCost: 17, power: 4, effect: "summon_familiar" },
  soul_glyph_sniper: { id: "soul_glyph_sniper", enemyId: "glyph_sniper", type: "bullet", name: "GLYPH BOLT", dropRate: 0.07, manaCost: 10, power: 7, effect: "projectile_pierce" },
  soul_tome_lord: { id: "soul_tome_lord", enemyId: "tome_lord", type: "enchant", name: "LEXICON MIND", dropRate: 1, manaCost: 0, power: 4, effect: "mana_regen" },

  // ---- cooling canal (route depth 2) ------------------------------------
  soul_canal_warden: { id: "soul_canal_warden", enemyId: "canal_warden", type: "enchant", name: "CANAL GUARD", dropRate: 0.08, manaCost: 0, power: 2, effect: "stat_constitution" },
  soul_crystal_drifter: { id: "soul_crystal_drifter", enemyId: "crystal_drifter", type: "bullet", name: "CRYSTAL SHARDS", dropRate: 0.07, manaCost: 7, power: 4, effect: "projectile_spread" },
  soul_cryo_lancer: { id: "soul_cryo_lancer", enemyId: "cryo_lancer", type: "bullet", name: "CRYO LANCE", dropRate: 0.07, manaCost: 11, power: 8, effect: "projectile_pierce" },
  soul_glacier_director: { id: "soul_glacier_director", enemyId: "glacier_director", type: "guardian", name: "GLACIER FIELD", dropRate: 1, manaCost: 6, power: 4, effect: "aura_slow" },

  // ---- sealed armory (route depth 3) ------------------------------------
  soul_iron_sentinel: { id: "soul_iron_sentinel", enemyId: "iron_sentinel", type: "enchant", name: "IRON PLATE", dropRate: 0.08, manaCost: 0, power: 0.09, effect: "damage_reduction" },
  soul_siege_mortar: { id: "soul_siege_mortar", enemyId: "siege_mortar", type: "bullet", name: "SIEGE SHELL", dropRate: 0.07, manaCost: 13, power: 11, effect: "projectile_heavy" },
  soul_armory_commander: { id: "soul_armory_commander", enemyId: "armory_commander", type: "enchant", name: "COMMANDER CACHE", dropRate: 0.06, manaCost: 0, power: 6, effect: "heart_capacity" },
  soul_war_engine: { id: "soul_war_engine", enemyId: "war_engine", type: "guardian", name: "WAR AURA", dropRate: 1, manaCost: 7, power: 5, effect: "aura_damage" },

  // ---- observatory (route depth 3) ---------------------------------------
  soul_void_moth: { id: "soul_void_moth", enemyId: "void_moth", type: "ability", name: "VOID DRIFT", dropRate: 0.05, manaCost: 6, power: 1, ability: "double_jump", effect: "traversal" },
  soul_star_caster: { id: "soul_star_caster", enemyId: "star_caster", type: "guardian", name: "STARFIELD", dropRate: 0.06, manaCost: 5, power: 3, effect: "aura_slow" },
  soul_astral_shade: { id: "soul_astral_shade", enemyId: "astral_shade", type: "enchant", name: "ASTRAL STEP", dropRate: 0.07, manaCost: 0, power: 0.12, effect: "move_speed" },
  soul_star_sentinel: { id: "soul_star_sentinel", enemyId: "star_sentinel", type: "enchant", name: "STAR FAVOR", dropRate: 1, manaCost: 0, power: 4, effect: "stat_luck" },

  // ---- forge core (route depth 3) ----------------------------------------
  soul_forge_mech: { id: "soul_forge_mech", enemyId: "forge_mech", type: "enchant", name: "FORGE ARMS", dropRate: 0.08, manaCost: 0, power: 3, effect: "stat_strength" },
  soul_slag_crawler: { id: "soul_slag_crawler", enemyId: "slag_crawler", type: "guardian", name: "SLAG HALO", dropRate: 0.06, manaCost: 6, power: 3, effect: "aura_damage" },
  soul_anvil_guard: { id: "soul_anvil_guard", enemyId: "anvil_guard", type: "enchant", name: "ANVIL TITHE", dropRate: 0.06, manaCost: 0, power: 0.25, effect: "heart_greed" },
  soul_forge_prime: { id: "soul_forge_prime", enemyId: "forge_prime", type: "enchant", name: "PRIME FORGE", dropRate: 1, manaCost: 0, power: 5, effect: "stat_strength" },

  // ---- ash catacombs (route depth 4) -------------------------------------
  soul_ashen_revenant: { id: "soul_ashen_revenant", enemyId: "ashen_revenant", type: "enchant", name: "ASHEN EDGE", dropRate: 0.07, manaCost: 0, power: 0.05, effect: "crit_chance" },
  soul_ash_lobber: { id: "soul_ash_lobber", enemyId: "ash_lobber", type: "bullet", name: "ASH BOMB", dropRate: 0.07, manaCost: 12, power: 10, effect: "projectile_heavy" },
  soul_bone_sovereign: { id: "soul_bone_sovereign", enemyId: "bone_sovereign", type: "bullet", name: "SOVEREIGN CALL", dropRate: 1, manaCost: 16, power: 6, effect: "summon_familiar" },

  // ---- deep prison (route depth 4) ---------------------------------------
  soul_chain_specter: { id: "soul_chain_specter", enemyId: "chain_specter", type: "guardian", name: "SPECTER CHAINS", dropRate: 0.05, manaCost: 4, power: 2, effect: "aura_slow" },
  soul_prison_brute: { id: "soul_prison_brute", enemyId: "prison_brute", type: "enchant", name: "BRUTE HIDE", dropRate: 0.08, manaCost: 0, power: 3, effect: "stat_constitution" },
  soul_warden_alpha: { id: "soul_warden_alpha", enemyId: "warden_alpha", type: "guardian", name: "ALPHA AEGIS", dropRate: 1, manaCost: 7, power: 4, effect: "aura_shield" },

  // ---- deep archive (final route node) ------------------------------------
  soul_archive_construct: { id: "soul_archive_construct", enemyId: "archive_construct", type: "enchant", name: "CONSTRUCT SHELL", dropRate: 0.07, manaCost: 0, power: 0.1, effect: "damage_reduction" },
  soul_void_cultist: { id: "soul_void_cultist", enemyId: "void_cultist", type: "bullet", name: "VOID VOLLEY", dropRate: 0.07, manaCost: 8, power: 4, effect: "projectile_spread" },
  soul_echo_mind: { id: "soul_echo_mind", enemyId: "echo_mind", type: "enchant", name: "ECHO RESONANCE", dropRate: 1, manaCost: 0, power: 0.35, effect: "soul_greed" },
};

export const SOUL_IDS = Object.keys(SOULS);

export function isSoulId(value: unknown): value is string {
  return typeof value === "string" && value in SOULS;
}

/** Reverse index so a kill can find its soul in O(1). */
const SOUL_BY_ENEMY: Record<string, SoulDefinition> = (() => {
  const index: Record<string, SoulDefinition> = {};
  for (const soul of Object.values(SOULS)) index[soul.enemyId] = soul;
  return index;
})();

export function getSoulForEnemy(enemyId: string): SoulDefinition | undefined {
  return SOUL_BY_ENEMY[enemyId];
}

export function getSoulsByType(type: SoulType): SoulDefinition[] {
  return Object.values(SOULS).filter(soul => soul.type === type);
}

/** Every ability the player could theoretically hold, for gate authoring. */
export function getAbilitySouls(): SoulDefinition[] {
  return Object.values(SOULS).filter(soul => soul.type === "ability");
}

/**
 * Guards the one-to-one invariant. Called by the smoke test rather than at
 * runtime, but exported so the check lives beside the data it validates.
 */
export function findSoulCoverageGaps(): { missing: string[]; orphaned: string[] } {
  const enemyIds = new Set(Object.keys(ENEMIES));
  const covered = new Set(Object.values(SOULS).map(soul => soul.enemyId));
  return {
    missing: [...enemyIds].filter(id => !covered.has(id)),
    orphaned: [...covered].filter(id => !enemyIds.has(id)),
  };
}
