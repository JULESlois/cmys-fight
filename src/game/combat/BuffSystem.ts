import { createSeededRandom, normalizeSeed } from "../Random";
import { MAX_PLAYER_MANA, type Player } from "../entities/Player";
import type { PowerSeries } from "../PowerSeries";

export type BuffRarity = "common" | "uncommon" | "rare" | "legendary";
export type BuffCategory = "weapon" | "defense" | "skill";
export type BuffId =
  | "scattershot" | "rapid_fire" | "heavy_rounds" | "critical_focus"
  | "piercing_shots" | "rebound_rounds" | "reinforced_heart"
  | "armor_capacitor" | "fast_recharge" | "emergency_barrier"
  | "skill_accelerator" | "energy_feedback" | "status_resistance"
  | "elemental_rounds"
  | "overclock_core" | "execution_matrix" | "phase_storm"
  | "mana_well" | "skill_loop" | "entropy_engine"
  | "aegis_foundry" | "reactive_plating" | "phoenix_protocol";

export interface BuffDefinition {
  id: BuffId;
  name: string;
  description: string;
  shortCode: string;
  rarity: BuffRarity;
  category: BuffCategory;
  series?: PowerSeries;
  minGlobalStage?: number;
}

export const BUFFS: Record<BuffId, BuffDefinition> = {
  scattershot: { id: "scattershot", name: "PATTERN CALIBRATOR", description: "Spread -30%; critical chance +5%.", shortCode: "CAL", rarity: "common", category: "weapon" },
  rapid_fire: { id: "rapid_fire", name: "TRIGGER DISCIPLINE", description: "Spread -20%; projectile speed +12%.", shortCode: "TRG", rarity: "common", category: "weapon" },
  heavy_rounds: { id: "heavy_rounds", name: "HOLLOW-POINT KIT", description: "Critical damage +35%; knockback +3.", shortCode: "HPT", rarity: "uncommon", category: "weapon" },
  critical_focus: { id: "critical_focus", name: "CRITICAL FOCUS", description: "+15% critical chance.", shortCode: "CRT", rarity: "uncommon", category: "weapon" },
  piercing_shots: { id: "piercing_shots", name: "PHASE ROUNDS", description: "Projectiles pierce one enemy.", shortCode: "PRC", rarity: "rare", category: "weapon" },
  rebound_rounds: { id: "rebound_rounds", name: "REBOUND ROUNDS", description: "Projectiles bounce once from walls.", shortCode: "BNC", rarity: "rare", category: "weapon" },
  reinforced_heart: { id: "reinforced_heart", name: "REINFORCED HEART", description: "+2 maximum HP and heal 2.", shortCode: "HP+", rarity: "common", category: "defense" },
  armor_capacitor: { id: "armor_capacitor", name: "ARMOR CAPACITOR", description: "+2 maximum Armor and restore 2.", shortCode: "AR+", rarity: "uncommon", category: "defense" },
  fast_recharge: { id: "fast_recharge", name: "FAST RECHARGE", description: "Armor recharge delay reduced by 35%.", shortCode: "RCH", rarity: "common", category: "defense" },
  emergency_barrier: { id: "emergency_barrier", name: "EMERGENCY BARRIER", description: "Survive one lethal hit at 1 HP.", shortCode: "BAR", rarity: "rare", category: "defense" },
  skill_accelerator: { id: "skill_accelerator", name: "SKILL ACCELERATOR", description: "Skill cooldowns reduced by 20%.", shortCode: "CD-", rarity: "uncommon", category: "skill" },
  energy_feedback: { id: "energy_feedback", name: "ENERGY FEEDBACK", description: "Using a skill restores 10 Energy.", shortCode: "ENG", rarity: "common", category: "skill" },
  status_resistance: { id: "status_resistance", name: "PURIFIER CORE", description: "Negative status duration reduced by 40%.", shortCode: "RES", rarity: "uncommon", category: "defense" },
  elemental_rounds: { id: "elemental_rounds", name: "EMBER PAYLOAD", description: "Player projectiles inflict Burn.", shortCode: "FIR", rarity: "rare", category: "weapon" },

  overclock_core: { id: "overclock_core", name: "OVERCLOCK CORE", description: "Critical chance +12%; spread -30%; projectile speed +15%.", shortCode: "OVR", rarity: "legendary", category: "weapon", series: "vanguard", minGlobalStage: 7 },
  execution_matrix: { id: "execution_matrix", name: "EXECUTION MATRIX", description: "Critical chance +20%; critical damage +50%.", shortCode: "EXE", rarity: "legendary", category: "weapon", series: "vanguard", minGlobalStage: 9 },
  phase_storm: { id: "phase_storm", name: "PHASE STORM", description: "Projectiles gain pierce, wall bounce and +15% speed.", shortCode: "PHS", rarity: "legendary", category: "weapon", series: "vanguard", minGlobalStage: 11 },

  mana_well: { id: "mana_well", name: "MANA WELL", description: "+30 max Energy up to 120, faster recharge and -20% weapon cost.", shortCode: "WEL", rarity: "legendary", category: "skill", series: "aether", minGlobalStage: 7 },
  skill_loop: { id: "skill_loop", name: "SKILL LOOP", description: "-30% skill cooldown; skills restore 15 Energy.", shortCode: "LOP", rarity: "legendary", category: "skill", series: "aether", minGlobalStage: 9 },
  entropy_engine: { id: "entropy_engine", name: "ENTROPY ENGINE", description: "Kills restore 4 Energy and reduce recharge delay by 20%.", shortCode: "ENT", rarity: "legendary", category: "skill", series: "aether", minGlobalStage: 11 },

  aegis_foundry: { id: "aegis_foundry", name: "AEGIS FOUNDRY", description: "+4 max Armor and +75% recharge rate.", shortCode: "AEG", rarity: "legendary", category: "defense", series: "phoenix", minGlobalStage: 7 },
  reactive_plating: { id: "reactive_plating", name: "REACTIVE PLATING", description: "Armor recharge delay 1s; status duration -50%.", shortCode: "RPL", rarity: "legendary", category: "defense", series: "phoenix", minGlobalStage: 9 },
  phoenix_protocol: { id: "phoenix_protocol", name: "PHOENIX PROTOCOL", description: "Survive one lethal hit at 2 HP and restore 3 Armor.", shortCode: "PHX", rarity: "legendary", category: "defense", series: "phoenix", minGlobalStage: 12 },
};

const ALL_BUFF_IDS = Object.keys(BUFFS) as BuffId[];
const RARITY_WEIGHT: Record<BuffRarity, number> = { common: 6, uncommon: 3, rare: 1, legendary: 0.35 };

export class BuffSystem {
  static readonly MAX_BUFFS = 6;

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

  static rollChoices(seed: number, owned: BuffId[], count = 3, globalStageIndex = 1): BuffId[] {
    const random = createSeededRandom(normalizeSeed(seed));
    const candidates = ALL_BUFF_IDS.filter(id =>
      !owned.includes(id) && (BUFFS[id].minGlobalStage ?? 1) <= globalStageIndex
    );
    const choices: BuffId[] = [];
    while (choices.length < count && candidates.length > 0) {
      const total = candidates.reduce((sum, id) => sum + RARITY_WEIGHT[BUFFS[id].rarity], 0);
      let roll = random() * total;
      let selectedIndex = 0;
      for (let i = 0; i < candidates.length; i++) {
        roll -= RARITY_WEIGHT[BUFFS[candidates[i]].rarity];
        if (roll <= 0) { selectedIndex = i; break; }
      }
      choices.push(candidates.splice(selectedIndex, 1)[0]);
    }
    return choices;
  }

  static acquire(player: Player, id: BuffId): boolean {
    if (!(id in BUFFS) || player.buffs.includes(id) || player.buffs.length >= BuffSystem.MAX_BUFFS) return false;
    player.buffs.push(id);
    if (id === "reinforced_heart") {
      player.maxHp += 2;
      player.hp = Math.min(player.maxHp, player.hp + 2);
    } else if (id === "armor_capacitor") {
      player.maxArmor += 2;
      player.armor = Math.min(player.maxArmor, player.armor + 2);
    } else if (id === "mana_well") {
      const previousMax = player.maxMana;
      player.maxMana = Math.min(MAX_PLAYER_MANA, player.maxMana + 30);
      player.mana = Math.min(player.maxMana, player.mana + (player.maxMana - previousMax));
    } else if (id === "aegis_foundry") {
      player.maxArmor += 4;
      player.armor = Math.min(player.maxArmor, player.armor + 4);
    } else if (id === "emergency_barrier") {
      player.emergencyBarrierReady = true;
    } else if (id === "phoenix_protocol") {
      player.phoenixProtocolReady = true;
    }
    BuffSystem.applyRuntimeStats(player);
    return true;
  }

  static applyManaRuntimeStats(player: Pick<Player, "buffs" | "manaRechargeDelay" | "manaRechargeRate">): void {
    player.manaRechargeDelay = BuffSystem.has(player, "mana_well") ? 0.9 : 1.35;
    if (BuffSystem.has(player, "entropy_engine")) player.manaRechargeDelay *= 0.8;
    player.manaRechargeRate = BuffSystem.has(player, "mana_well") ? 15 : 9;
  }

  static applyRuntimeStats(player: Pick<
    Player,
    "buffs" | "armorRechargeDelay" | "armorRechargeRate" | "manaRechargeDelay" | "manaRechargeRate"
  >): void {
    player.armorRechargeDelay = BuffSystem.has(player, "reactive_plating")
      ? 1
      : BuffSystem.has(player, "fast_recharge") ? 1.95 : 3;
    player.armorRechargeRate = BuffSystem.has(player, "aegis_foundry") ? 7 : 4;
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
    let energyCostMultiplier = 1;
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
    if (BuffSystem.has(player, "mana_well")) energyCostMultiplier *= 0.8;
    return {
      spreadMultiplier,
      projectileSpeedMultiplier,
      critChanceBonus,
      critDamageBonus,
      knockbackBonus,
      pierce,
      wallBounces,
      energyCostMultiplier,
    };
  }

  static getSkillCooldownMultiplier(player: Player): number {
    let multiplier = BuffSystem.has(player, "skill_accelerator") ? 0.8 : 1;
    if (BuffSystem.has(player, "skill_loop")) multiplier *= 0.7;
    return multiplier;
  }

  static getSkillEnergyRestore(player: Player): number {
    return (BuffSystem.has(player, "energy_feedback") ? 10 : 0) + (BuffSystem.has(player, "skill_loop") ? 15 : 0);
  }

  static getKillEnergyRestore(player: Player): number {
    return BuffSystem.has(player, "entropy_engine") ? 4 : 0;
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
