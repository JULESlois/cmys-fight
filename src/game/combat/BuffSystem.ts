import { createSeededRandom, normalizeSeed } from "../Random";
import { getDifficultyStageIndex, type RunProgress } from "../RunProgress";
import { CHARACTERS } from "../data/characters";
import { MAX_PLAYER_MANA, type Player } from "../entities/Player";
import type { PowerSeries } from "../PowerSeries";

export type BuffRarity = "common" | "uncommon" | "rare";
export type BuffCategory = "weapon" | "defense" | "skill";

export type BuffFamily =
  | "vanguard"
  | "echo"
  | "phoenix"
  | "aether"
  | "salvage"
  | "survey";

export type BuffTrigger =
  | "onShoot"
  | "onHit"
  | "onKill"
  | "onDodge"
  | "onPerfectDodge"
  | "onWeaponSwap"
  | "onSkillUsed"
  | "onArmorBreak"
  | "onPlayerHurt"
  | "onPropDestroyed"
  | "onHazardKill"
  | "onRoomEntered"
  | "onRoomPerfectClear"
  | "onBossPerfectClear"
  | "onFacilityUsed"
  | "onExitInspected";

export type BuffId = "counter_strike" | "scattershot" | "rapid_fire" | "heavy_rounds" | "critical_focus"
  | "piercing_shots" | "rebound_rounds" | "reinforced_heart"
  | "armor_capacitor" | "fast_recharge" | "emergency_barrier"
  | "skill_accelerator" | "energy_feedback" | "status_resistance"
  | "capacitor_cell" | "flux_regulator" | "elemental_rounds"
  | "overclock_core" | "execution_matrix" | "phase_storm"
  | "mana_well" | "skill_loop" | "entropy_engine"
  | "aegis_foundry" | "reactive_plating" | "phoenix_protocol"
  // New buffs from §20
  | "trigger_discipline" | "execution_window"
  | "afterimage_capture" | "cross_swap" | "alternating_current" | "momentum_store" | "graze_relay"
  | "reactive_armor" | "bulwark_memory"
  | "chain_directive"
  | "battlefield_salvage" | "hazard_lens" | "terminal_override"
  | "secret_sense" | "route_assessment" | "perfect_survey"
  // Anomalies
  | "blood_pact_engine" | "cursed_compass" | "hollow_armor";

export interface BuffDefinition {
  id: BuffId;
  name: string;
  description: string;
  shortCode: string;
  rarity: BuffRarity;
  category: BuffCategory;
  family: BuffFamily;
  tags: string[];
  triggers?: BuffTrigger[];
  synergyKeys?: string[];
  routeBias?: string[];
  series?: PowerSeries;
  minGlobalStage?: number;
}

export const BUFFS: Record<BuffId, BuffDefinition> = {
  // === Vanguard (先锋协议) ===
  scattershot: { id: "scattershot", name: "BALLISTIC CALIBRATOR", description: "Spread -25%; critical chance +5%.", shortCode: "CAL", rarity: "common", category: "weapon", family: "vanguard", tags: ["spread", "crit"], synergyKeys: ["scattershot"] },
  rapid_fire: { id: "rapid_fire", name: "TRIGGER DISCIPLINE", description: "Spread -20%; projectile speed +12%.", shortCode: "TRG", rarity: "common", category: "weapon", family: "vanguard", tags: ["spread", "speed"], synergyKeys: ["trigger_discipline"] },
  trigger_discipline: { id: "trigger_discipline", name: "SUSTAINED FIRE", description: "After 0.8s continuous fire: speed +15%, spread tightens. Fades 0.5s after stopping.", shortCode: "SUS", rarity: "common", category: "weapon", family: "vanguard", tags: ["speed", "spread"], triggers: ["onShoot"], synergyKeys: ["trigger_discipline", "execution_window"] },
  heavy_rounds: { id: "heavy_rounds", name: "HOLLOW-POINT KIT", description: "Critical damage +35%; knockback +3.", shortCode: "HPT", rarity: "uncommon", category: "weapon", family: "vanguard", tags: ["crit", "knockback"] },
  critical_focus: { id: "critical_focus", name: "CRITICAL FOCUS", description: "+15% critical chance.", shortCode: "CRT", rarity: "uncommon", category: "weapon", family: "vanguard", tags: ["crit"] },
  piercing_shots: { id: "piercing_shots", name: "PHASE ROUNDS", description: "Projectiles pierce one enemy. Damage -10% per pierce.", shortCode: "PRC", rarity: "uncommon", category: "weapon", family: "vanguard", tags: ["pierce"], synergyKeys: ["piercing_shots", "rebound_rounds"] },
  rebound_rounds: { id: "rebound_rounds", name: "REBOUND ROUNDS", description: "Projectiles bounce once from walls.", shortCode: "BNC", rarity: "uncommon", category: "weapon", family: "vanguard", tags: ["bounce"], synergyKeys: ["rebound_rounds", "elemental_rounds", "piercing_shots"] },
  elemental_rounds: { id: "elemental_rounds", name: "EMBER PAYLOAD", description: "Player projectiles inflict Burn (2.4s). Refreshes on hit. Ignites spores and oil.", shortCode: "FIR", rarity: "uncommon", category: "weapon", family: "vanguard", tags: ["burn", "environment"], triggers: ["onHit"], synergyKeys: ["elemental_rounds", "rebound_rounds"] },
  execution_window: { id: "execution_window", name: "EXECUTION WINDOW", description: "Enemies below 25% HP are marked. Bonus damage to marked. Kills restore 1 energy. Boss: 15% threshold.", shortCode: "EXW", rarity: "rare", category: "weapon", family: "vanguard", tags: ["execute", "energy"], triggers: ["onHit", "onKill"], synergyKeys: ["execution_window", "trigger_discipline"] },
  counter_strike: { id: "counter_strike", name: "COUNTER STRIKE", description: "Perfect dodge empowers next attack: Bonus damage, +20% speed for 3s.", shortCode: "CTR", rarity: "common", category: "weapon", family: "echo", tags: ["dodge", "damage"], triggers: ["onPerfectDodge"], synergyKeys: ["counter_strike", "afterimage_capture"] },

  // === Echo (回响协议) ===
  afterimage_capture: { id: "afterimage_capture", name: "AFTERIMAGE CAPTURE", description: "Perfect dodge leaves a 1.5s decoy that attracts projectiles. 6s cooldown.", shortCode: "AFT", rarity: "uncommon", category: "defense", family: "echo", tags: ["dodge", "decoy"], triggers: ["onPerfectDodge"], synergyKeys: ["afterimage_capture", "counter_strike"] },
  cross_swap: { id: "cross_swap", name: "CROSS SWAP", description: "After weapon swap: +attack speed for 1.2s, refund some energy. 3s cooldown.", shortCode: "XSW", rarity: "common", category: "weapon", family: "echo", tags: ["swap", "speed"], triggers: ["onWeaponSwap"], synergyKeys: ["cross_swap", "alternating_current"] },
  alternating_current: { id: "alternating_current", name: "ALTERNATING CURRENT", description: "Alternate hits with 2 weapons within 2s builds sync. At 4 stacks: chain arc to nearby enemies.", shortCode: "ALT", rarity: "uncommon", category: "weapon", family: "echo", tags: ["swap", "chain"], triggers: ["onHit"], synergyKeys: ["alternating_current", "cross_swap"] },
  momentum_store: { id: "momentum_store", name: "MOMENTUM STORE", description: "Move 1.5s continuously: next attack gains +1 pierce, +knockback, small shockwave. Lost on hit/stop.", shortCode: "MOM", rarity: "uncommon", category: "weapon", family: "echo", tags: ["movement", "pierce"], synergyKeys: ["momentum_store", "hazard_lens"] },
  graze_relay: { id: "graze_relay", name: "GRAZE RELAY", description: "Near-miss dodges accumulate. Every 5 grazes: restore 8 energy, -0.5s dodge cooldown.", shortCode: "GRZ", rarity: "rare", category: "defense", family: "echo", tags: ["dodge", "energy"], triggers: ["onDodge"] },

  // === Phoenix (凤凰协议) ===
  reinforced_heart: { id: "reinforced_heart", name: "REINFORCED HEART", description: "+2 maximum HP and heal 2.", shortCode: "HP+", rarity: "common", category: "defense", family: "phoenix", tags: ["hp"] },
  armor_capacitor: { id: "armor_capacitor", name: "ARMOR CAPACITOR", description: "+2 maximum Armor and restore 2.", shortCode: "AR+", rarity: "common", category: "defense", family: "phoenix", tags: ["armor"] },
  fast_recharge: { id: "fast_recharge", name: "FAST RECHARGE", description: "Armor recharge delay -35%. Grants base recharge if none.", shortCode: "RCH", rarity: "common", category: "defense", family: "phoenix", tags: ["armor", "recharge"], synergyKeys: ["fast_recharge", "bulwark_memory"] },
  reactive_armor: { id: "reactive_armor", name: "REACTIVE ARMOR", description: "On armor break: 2s projectile damage reduction + knockback pulse. Once per room.", shortCode: "RCT", rarity: "uncommon", category: "defense", family: "phoenix", tags: ["armor", "defense"], triggers: ["onArmorBreak"] },
  emergency_barrier: { id: "emergency_barrier", name: "EMERGENCY BARRIER", description: "Once per chapter: survive lethal at 1 HP, clear nearby projectiles. 3s no-invuln after.", shortCode: "BAR", rarity: "rare", category: "defense", family: "phoenix", tags: ["survival", "clear"], triggers: ["onPlayerHurt"], synergyKeys: ["emergency_barrier", "elemental_rounds"] },
  bulwark_memory: { id: "bulwark_memory", name: "BULWARK MEMORY", description: "Near structures/cover: armor recharge +50%, knockback reduced. Ends when leaving.", shortCode: "BLW", rarity: "uncommon", category: "defense", family: "phoenix", tags: ["armor", "environment"], synergyKeys: ["bulwark_memory", "fast_recharge"] },
  status_resistance: { id: "status_resistance", name: "PURIFIER CORE", description: "Negative status duration -40%.", shortCode: "RES", rarity: "uncommon", category: "defense", family: "phoenix", tags: ["status"] },

  // === Aether (以太协议) ===
  capacitor_cell: { id: "capacitor_cell", name: "CAPACITOR CELL", description: "+8 maximum Energy and restore 8.", shortCode: "CAP", rarity: "common", category: "skill", family: "aether", tags: ["energy"] },
  flux_regulator: { id: "flux_regulator", name: "FLUX REGULATOR", description: "Energy recharge rate +25%.", shortCode: "FLX", rarity: "common", category: "skill", family: "aether", tags: ["energy", "recharge"] },
  skill_accelerator: { id: "skill_accelerator", name: "SKILL ACCELERATOR", description: "Skill cooldowns -20%.", shortCode: "CD-", rarity: "uncommon", category: "skill", family: "aether", tags: ["skill", "cooldown"] },
  energy_feedback: { id: "energy_feedback", name: "ENERGY FEEDBACK", description: "After skill use: restore 5 energy (0.5s delay). No multi-trigger.", shortCode: "ENG", rarity: "common", category: "skill", family: "aether", tags: ["energy", "skill"], triggers: ["onSkillUsed"], synergyKeys: ["energy_feedback", "chain_directive"] },
  entropy_engine: { id: "entropy_engine", name: "ENTROPY ENGINE", description: "Kills restore 2 energy. Max 8/s to prevent infinite loops.", shortCode: "ENT", rarity: "uncommon", category: "skill", family: "aether", tags: ["energy", "kill"], triggers: ["onKill"], synergyKeys: ["entropy_engine", "battlefield_salvage"], series: "aether", minGlobalStage: 11 },
  chain_directive: { id: "chain_directive", name: "CHAIN DIRECTIVE", description: "After skill: next attack chains to 1 nearby enemy for 35% damage. No re-chain. 3s timeout.", shortCode: "CHN", rarity: "rare", category: "skill", family: "aether", tags: ["skill", "chain"], triggers: ["onSkillUsed", "onHit"], synergyKeys: ["chain_directive", "energy_feedback"] },

  // === Salvage (拾荒协议) ===
  battlefield_salvage: { id: "battlefield_salvage", name: "BATTLEFIELD SALVAGE", description: "Every 5 props destroyed: spawn supply orb (alternates energy/coins). Max 2/room.", shortCode: "SLV", rarity: "common", category: "weapon", family: "salvage", tags: ["props", "resource"], triggers: ["onPropDestroyed"], synergyKeys: ["battlefield_salvage", "entropy_engine"] },
  hazard_lens: { id: "hazard_lens", name: "HAZARD LENS", description: "Environmental damage taken -30%. Enemies take +20% environmental damage.", shortCode: "HZL", rarity: "common", category: "defense", family: "salvage", tags: ["environment", "defense"], synergyKeys: ["hazard_lens", "momentum_store"] },
  terminal_override: { id: "terminal_override", name: "TERMINAL OVERRIDE", description: "Facilities gain +1 option. 1 facility reroll per chapter. High-risk options show corruption cost.", shortCode: "OVR", rarity: "rare", category: "skill", family: "salvage", tags: ["facility", "corruption"], triggers: ["onFacilityUsed"] },

  // === Survey (星图协议) ===
  secret_sense: { id: "secret_sense", name: "SECRET SENSE", description: "In rooms with hidden connections: subtle audio shift. After clear: direction flickers briefly.", shortCode: "SEC", rarity: "common", category: "skill", family: "survey", tags: ["hidden", "map"], triggers: ["onRoomEntered"], synergyKeys: ["secret_sense", "route_assessment"] },
  route_assessment: { id: "route_assessment", name: "ROUTE ASSESSMENT", description: "Exit inspection shows +1 info: enemy/env/reward tags or threat delta.", shortCode: "RTA", rarity: "uncommon", category: "skill", family: "survey", tags: ["exit", "info"], triggers: ["onExitInspected"], synergyKeys: ["route_assessment", "secret_sense"] },
  perfect_survey: { id: "perfect_survey", name: "PERFECT SURVEY", description: "Perfect room clear: reveal hidden connection as rumor, or reveal adjacent reward, or grant reroll shard.", shortCode: "PSV", rarity: "rare", category: "skill", family: "survey", tags: ["hidden", "perfect"], triggers: ["onRoomPerfectClear"], synergyKeys: ["perfect_survey"] },

  // === Legacy legendary (kept as rare for save compat, will become evolutions) ===
  overclock_core: { id: "overclock_core", name: "OVERCLOCK CORE", description: "Critical chance +12%; spread -30%; projectile speed +15%.", shortCode: "OVR", rarity: "rare", category: "weapon", family: "vanguard", tags: ["crit", "spread", "speed"], series: "vanguard", minGlobalStage: 7 },
  execution_matrix: { id: "execution_matrix", name: "EXECUTION MATRIX", description: "Critical chance +20%; critical damage +50%.", shortCode: "EXE", rarity: "rare", category: "weapon", family: "vanguard", tags: ["crit"], series: "vanguard", minGlobalStage: 9 },
  phase_storm: { id: "phase_storm", name: "PHASE STORM", description: "Projectiles gain pierce, wall bounce and +15% speed.", shortCode: "PHS", rarity: "rare", category: "weapon", family: "vanguard", tags: ["pierce", "bounce", "speed"], series: "vanguard", minGlobalStage: 11 },
  mana_well: { id: "mana_well", name: "MANA WELL", description: "+12 maximum Energy and recharge delay -25%.", shortCode: "WEL", rarity: "rare", category: "skill", family: "aether", tags: ["energy"], series: "aether", minGlobalStage: 7 },
  skill_loop: { id: "skill_loop", name: "SKILL LOOP", description: "Skill cooldown -25%; skills restore 7 Energy.", shortCode: "LOP", rarity: "rare", category: "skill", family: "aether", tags: ["skill", "energy"], series: "aether", minGlobalStage: 9 },
  aegis_foundry: { id: "aegis_foundry", name: "AEGIS FOUNDRY", description: "+4 max Armor and +75% recharge rate.", shortCode: "AEG", rarity: "rare", category: "defense", family: "phoenix", tags: ["armor"], series: "phoenix", minGlobalStage: 7 },
  reactive_plating: { id: "reactive_plating", name: "REACTIVE PLATING", description: "Armor recharge delay 1s; status duration -50%.", shortCode: "RPL", rarity: "rare", category: "defense", family: "phoenix", tags: ["armor", "status"], series: "phoenix", minGlobalStage: 9 },
  phoenix_protocol: { id: "phoenix_protocol", name: "PHOENIX PROTOCOL", description: "Survive one lethal hit at 2 HP and restore 3 Armor.", shortCode: "PHX", rarity: "rare", category: "defense", family: "phoenix", tags: ["survival"], series: "phoenix", minGlobalStage: 12 },

  // === Anomalies (异常 Buff) ===
  blood_pact_engine: { id: "blood_pact_engine", name: "BLOOD PACT ENGINE", description: "-2 max HP. +20% all direct damage. Perfect room clear: +1 HP. Min HP: 3.", shortCode: "BLD", rarity: "rare", category: "weapon", family: "vanguard", tags: ["anomaly", "damage", "risk"], triggers: ["onRoomPerfectClear"] },
  cursed_compass: { id: "cursed_compass", name: "CURSED COMPASS", description: "Exit reward hints hidden. Hidden room/exit rate up. Hidden rewards +1 quality. Observatory partial.", shortCode: "CRS", rarity: "rare", category: "skill", family: "survey", tags: ["anomaly", "hidden", "map"] },
  hollow_armor: { id: "hollow_armor", name: "HOLLOW ARMOR", description: "+4 max Armor. No combat regen. Armor break: large clear pulse. +1 armor on room clear.", shortCode: "HLW", rarity: "rare", category: "defense", family: "phoenix", tags: ["anomaly", "armor", "clear"], triggers: ["onArmorBreak", "onRoomPerfectClear"] },
};

const ALL_BUFF_IDS = Object.keys(BUFFS) as BuffId[];
const RARITY_WEIGHT: Record<BuffRarity, number> = { common: 6, uncommon: 3, rare: 1 };
const CAPACITOR_CELL_BONUS = 8;
const MANA_WELL_BONUS = 12;
const MIN_MANA_RECHARGE_DELAY = 0.5;

type ManaRuntimePlayer = Pick<
  Player,
  "characterId" | "buffs" | "mana" | "maxMana" | "manaRechargeDelay" | "manaRechargeRate"
>;

type RuntimePlayer = ManaRuntimePlayer & Pick<Player, "armorRechargeDelay" | "armorRechargeRate">;

import { CombatEventDispatcher } from "./CombatEvents";
import { initBuffEventHandlers } from "./BuffEventHandlers";
import { initWeaponModuleHandlers } from "./WeaponModules";
import { initSynergyHandlers } from "./SynergySystem";

export class BuffSystem {
  static init() {
    CombatEventDispatcher.on("player_perfect_dodge", (payload) => {
      if (BuffSystem.has(payload.player, "counter_strike")) {
        payload.player.buffState.counterStrikeReady = true;
      }
    });
    initBuffEventHandlers();
    initWeaponModuleHandlers();
    initSynergyHandlers();
  }

  static readonly MAX_BUFFS = 12;
  static readonly ACTIVE_REWARD_BUFF_LIMIT = 6;

  static normalizeBuffs(value: unknown): BuffId[] {
    if (!Array.isArray(value)) return [];
    const unique = new Set<BuffId>();
    for (const entry of value) {
      if (typeof entry === "string" && entry in BUFFS) unique.add(entry as BuffId);
      if (unique.size >= BuffSystem.MAX_BUFFS) break;
    }
    return [...unique];
  }

  static has(player: Pick<Player, "buffs">, id: BuffId): boolean {
    return player.buffs.includes(id);
  }

  static rollChoices(seed: number, owned: BuffId[], count = 3, progress: Pick<RunProgress, "routeDepth" | "stageWithinNode"> = { routeDepth: 1, stageWithinNode: 1 }): BuffId[] {
    const random = createSeededRandom(normalizeSeed(seed));
    const difficultyStageIndex = getDifficultyStageIndex(progress);
    const candidates = ALL_BUFF_IDS.filter(id =>
      !owned.includes(id) && (BUFFS[id].minGlobalStage ?? 1) <= difficultyStageIndex
    );

    // Build protection: boost weights for buffs matching owned families
    const ownedFamilies = new Set<BuffFamily>();
    for (const id of owned) {
      const def = BUFFS[id];
      if (def) ownedFamilies.add(def.family);
    }
    const familyBoost = ownedFamilies.size === 0 ? 1.0 : owned.length < 4 ? 1.8 : 1.35;

    const choices: BuffId[] = [];
    while (choices.length < count && candidates.length > 0) {
      const weights = candidates.map(id => {
        let w = RARITY_WEIGHT[BUFFS[id].rarity];
        if (ownedFamilies.has(BUFFS[id].family)) w *= familyBoost;
        return w;
      });
      const total = weights.reduce((sum, w) => sum + w, 0);
      let roll = random() * total;
      let selectedIndex = 0;
      for (let i = 0; i < candidates.length; i++) {
        roll -= weights[i];
        if (roll <= 0) { selectedIndex = i; break; }
      }
      choices.push(candidates.splice(selectedIndex, 1)[0]);
    }
    return choices;
  }

  static acquire(player: Player, id: BuffId): boolean {
    if (!(id in BUFFS) || player.buffs.includes(id) || player.buffs.length >= BuffSystem.MAX_BUFFS) return false;
    const previousMaxMana = player.maxMana;
    player.buffs.push(id);
    if (id === "reinforced_heart") {
      player.maxHp += 2;
      player.hp = Math.min(player.maxHp, player.hp + 2);
    } else if (id === "armor_capacitor") {
      player.maxArmor += 2;
      player.armor = Math.min(player.maxArmor, player.armor + 2);
    } else if (id === "aegis_foundry") {
      player.maxArmor += 4;
      player.armor = Math.min(player.maxArmor, player.armor + 4);
    } else if (id === "emergency_barrier") {
      player.emergencyBarrierReady = true;
    } else if (id === "phoenix_protocol") {
      player.phoenixProtocolReady = true;
    } else if (id === "blood_pact_engine") {
      player.maxHp = Math.max(3, player.maxHp - 2);
      player.hp = Math.min(player.hp, player.maxHp);
    } else if (id === "hollow_armor") {
      player.maxArmor += 4;
      player.armor = Math.min(player.maxArmor, player.armor + 4);
    } else if (id === "cursed_compass") {
      player.buffState["cursedCompassActive"] = true;
    }
    BuffSystem.applyRuntimeStats(player);
    if (id === "capacitor_cell" || id === "mana_well") {
      player.mana = Math.min(player.maxMana, player.mana + Math.max(0, player.maxMana - previousMaxMana));
    }
    return true;
  }

  static getManaCapacity(player: Pick<Player, "characterId" | "buffs">): number {
    const character = CHARACTERS[player.characterId] ?? CHARACTERS.knight;
    let capacity = character.maxMana;
    if (BuffSystem.has(player, "capacitor_cell")) capacity += CAPACITOR_CELL_BONUS;
    if (BuffSystem.has(player, "mana_well")) capacity += MANA_WELL_BONUS;
    return Math.min(MAX_PLAYER_MANA, capacity);
  }

  static applyManaRuntimeStats(player: ManaRuntimePlayer): void {
    const character = CHARACTERS[player.characterId] ?? CHARACTERS.knight;
    player.maxMana = BuffSystem.getManaCapacity(player);
    player.mana = Math.max(0, Math.min(player.maxMana, Number(player.mana) || 0));

    let rechargeDelay = character.manaRechargeDelay;
    if (BuffSystem.has(player, "mana_well")) rechargeDelay *= 0.75;
    if (BuffSystem.has(player, "entropy_engine")) rechargeDelay *= 0.8;
    player.manaRechargeDelay = Math.max(MIN_MANA_RECHARGE_DELAY, rechargeDelay);

    let rechargeRate = character.manaRechargeRate;
    if (BuffSystem.has(player, "flux_regulator")) rechargeRate *= 1.25;
    player.manaRechargeRate = rechargeRate;
  }

  static applyRuntimeStats(player: RuntimePlayer): void {
    const baseArmorRechargeDelay = player.characterId === "celestia" ? 2 : 3;
    const baseArmorRechargeRate = player.characterId === "celestia" ? 5.5 : 4;
    player.armorRechargeDelay = BuffSystem.has(player, "reactive_plating")
      ? 1
      : BuffSystem.has(player, "fast_recharge") ? baseArmorRechargeDelay * 0.65 : baseArmorRechargeDelay;
    player.armorRechargeRate = BuffSystem.has(player, "aegis_foundry")
      ? baseArmorRechargeRate + 3
      : baseArmorRechargeRate;
    BuffSystem.applyManaRuntimeStats(player);
  }

  static getWeaponModifiers(player: Player) {
    let spreadMultiplier = 1;
    let projectileSpeedMultiplier = 1;
    let critChanceBonus = 0;
    let critDamageBonus = 0;
    let knockbackBonus = 0;
    let pierce = 0;
    let wallBounces = 0;
    let damageMultiplier = 1;
    const energyCostMultiplier = 1;
    if (BuffSystem.has(player, "scattershot")) { spreadMultiplier *= 0.7; critChanceBonus += 0.05; }
    if (BuffSystem.has(player, "rapid_fire")) { spreadMultiplier *= 0.8; projectileSpeedMultiplier *= 1.12; }
    if (BuffSystem.has(player, "heavy_rounds")) { critDamageBonus += 0.35; knockbackBonus += 3; }
    if (BuffSystem.has(player, "critical_focus")) critChanceBonus += 0.15;
    if (BuffSystem.has(player, "piercing_shots")) pierce += 1;
    if (BuffSystem.has(player, "rebound_rounds")) wallBounces += 1;
    if (BuffSystem.has(player, "overclock_core")) {
      critChanceBonus += 0.12;
      spreadMultiplier *= 0.7;
      projectileSpeedMultiplier *= 1.15;
    }
    if (BuffSystem.has(player, "execution_matrix")) { critChanceBonus += 0.2; critDamageBonus += 0.5; }
    if (BuffSystem.has(player, "phase_storm")) {
      pierce += 1;
      wallBounces += 1;
      projectileSpeedMultiplier *= 1.15;
    }
    if (BuffSystem.has(player, "blood_pact_engine")) damageMultiplier *= 1.2;
    return {
      spreadMultiplier,
      projectileSpeedMultiplier,
      critChanceBonus,
      critDamageBonus,
      knockbackBonus,
      pierce,
      wallBounces,
      damageMultiplier,
      energyCostMultiplier,
    };
  }

  static getSkillCooldownMultiplier(player: Player): number {
    let multiplier = BuffSystem.has(player, "skill_accelerator") ? 0.8 : 1;
    if (BuffSystem.has(player, "skill_loop")) multiplier *= 0.75;
    return multiplier;
  }

  static getSkillEnergyRestore(player: Player): number {
    return (BuffSystem.has(player, "energy_feedback") ? 5 : 0) + (BuffSystem.has(player, "skill_loop") ? 7 : 0);
  }

  static getKillEnergyRestore(player: Player): number {
    return BuffSystem.has(player, "entropy_engine") ? 2 : 0;
  }

  static getStatusDurationMultiplier(player: Player): number {
    let multiplier = BuffSystem.has(player, "status_resistance") ? 0.6 : 1;
    if (BuffSystem.has(player, "reactive_plating")) multiplier *= 0.5;
    return multiplier;
  }

  static getProjectileStatus(player: Player): { id: "burn"; duration: number } | null {
    return BuffSystem.has(player, "elemental_rounds") ? { id: "burn", duration: 2.4 } : null;
  }
}
BuffSystem.init();
