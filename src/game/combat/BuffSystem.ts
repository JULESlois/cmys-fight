import { createSeededRandom, normalizeSeed } from "../Random";
import type { Player } from "../entities/Player";

export type BuffRarity = "common" | "uncommon" | "rare";
export type BuffCategory = "weapon" | "defense" | "skill";
export type BuffId =
  | "scattershot" | "rapid_fire" | "heavy_rounds" | "critical_focus"
  | "piercing_shots" | "rebound_rounds" | "reinforced_heart"
  | "armor_capacitor" | "fast_recharge" | "emergency_barrier"
  | "skill_accelerator" | "energy_feedback";

export interface BuffDefinition {
  id: BuffId;
  name: string;
  description: string;
  shortCode: string;
  rarity: BuffRarity;
  category: BuffCategory;
}

export const BUFFS: Record<BuffId, BuffDefinition> = {
  scattershot: { id: "scattershot", name: "SCATTER CORE", description: "+2 projectiles, -15% damage.", shortCode: "SCT", rarity: "common", category: "weapon" },
  rapid_fire: { id: "rapid_fire", name: "RAPID CYCLER", description: "+25% fire rate, -10% damage.", shortCode: "RPD", rarity: "common", category: "weapon" },
  heavy_rounds: { id: "heavy_rounds", name: "HEAVY ROUNDS", description: "+30% damage and knockback, -15% fire rate.", shortCode: "HVY", rarity: "uncommon", category: "weapon" },
  critical_focus: { id: "critical_focus", name: "CRITICAL FOCUS", description: "+15% critical chance.", shortCode: "CRT", rarity: "uncommon", category: "weapon" },
  piercing_shots: { id: "piercing_shots", name: "PHASE ROUNDS", description: "Projectiles pierce one enemy.", shortCode: "PRC", rarity: "rare", category: "weapon" },
  rebound_rounds: { id: "rebound_rounds", name: "REBOUND ROUNDS", description: "Projectiles bounce once from walls.", shortCode: "BNC", rarity: "rare", category: "weapon" },
  reinforced_heart: { id: "reinforced_heart", name: "REINFORCED HEART", description: "+2 maximum HP and heal 2.", shortCode: "HP+", rarity: "common", category: "defense" },
  armor_capacitor: { id: "armor_capacitor", name: "ARMOR CAPACITOR", description: "+2 maximum Armor and restore 2.", shortCode: "AR+", rarity: "uncommon", category: "defense" },
  fast_recharge: { id: "fast_recharge", name: "FAST RECHARGE", description: "Armor recharge delay reduced by 35%.", shortCode: "RCH", rarity: "common", category: "defense" },
  emergency_barrier: { id: "emergency_barrier", name: "EMERGENCY BARRIER", description: "Survive one lethal hit at 1 HP.", shortCode: "BAR", rarity: "rare", category: "defense" },
  skill_accelerator: { id: "skill_accelerator", name: "SKILL ACCELERATOR", description: "Skill cooldowns reduced by 20%.", shortCode: "CD-", rarity: "uncommon", category: "skill" },
  energy_feedback: { id: "energy_feedback", name: "ENERGY FEEDBACK", description: "Using a skill restores 10 Energy.", shortCode: "ENG", rarity: "common", category: "skill" },
};

const ALL_BUFF_IDS = Object.keys(BUFFS) as BuffId[];
const RARITY_WEIGHT: Record<BuffRarity, number> = { common: 6, uncommon: 3, rare: 1 };

export class BuffSystem {
  static readonly MAX_BUFFS = 5;

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

  static rollChoices(seed: number, owned: BuffId[], count = 3): BuffId[] {
    const random = createSeededRandom(normalizeSeed(seed));
    const candidates = ALL_BUFF_IDS.filter(id => !owned.includes(id));
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
    } else if (id === "emergency_barrier") {
      player.emergencyBarrierReady = true;
    }
    BuffSystem.applyRuntimeStats(player);
    return true;
  }

  static applyRuntimeStats(player: Player): void {
    player.armorRechargeDelay = BuffSystem.has(player, "fast_recharge") ? 1.95 : 3;
  }

  static getWeaponModifiers(player: Player) {
    let damageMultiplier = 1, fireRateMultiplier = 1, extraPellets = 0;
    let critChanceBonus = 0, knockbackBonus = 0, pierce = 0, wallBounces = 0;
    if (BuffSystem.has(player, "scattershot")) { extraPellets += 2; damageMultiplier *= 0.85; }
    if (BuffSystem.has(player, "rapid_fire")) { fireRateMultiplier *= 1.25; damageMultiplier *= 0.9; }
    if (BuffSystem.has(player, "heavy_rounds")) { damageMultiplier *= 1.3; fireRateMultiplier *= 0.85; knockbackBonus += 3; }
    if (BuffSystem.has(player, "critical_focus")) critChanceBonus += 0.15;
    if (BuffSystem.has(player, "piercing_shots")) pierce = 1;
    if (BuffSystem.has(player, "rebound_rounds")) wallBounces = 1;
    return { damageMultiplier, fireRateMultiplier, extraPellets, critChanceBonus, knockbackBonus, pierce, wallBounces };
  }

  static getSkillCooldownMultiplier(player: Player): number {
    return BuffSystem.has(player, "skill_accelerator") ? 0.8 : 1;
  }

  static getSkillEnergyRestore(player: Player): number {
    return BuffSystem.has(player, "energy_feedback") ? 10 : 0;
  }
}
