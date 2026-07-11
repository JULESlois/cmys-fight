import type { StatusEffectId } from "../combat/StatusEffectSystem";
import type { PowerSeries } from "../PowerSeries";

export type WeaponCategory = "sidearm" | "shotgun" | "energy" | "rifle" | "launcher";
export type WeaponRarity = "common" | "uncommon" | "rare" | "legendary";
export type WeaponSlots = [string, string?];

export interface WeaponData {
  id: string;
  name: string;
  category: WeaponCategory;
  rarity: WeaponRarity;
  damage: number;
  fireRate: number;
  bulletSpeed: number;
  manaCost: number;
  spread: number;
  pelletCount: number;
  knockback: number;
  critChance: number;
  color: string;
  projectileRadius?: number;
  projectileLife?: number;
  pierce?: number;
  wallBounces?: number;
  statusEffect?: StatusEffectId;
  statusDuration?: number;
  series?: PowerSeries;
  minGlobalStage?: number;
}

export const WEAPONS: Record<string, WeaponData> = {
  pistol: {
    id: "pistol", name: "Old Pistol", category: "sidearm", rarity: "common",
    damage: 3, fireRate: 3, bulletSpeed: 150, manaCost: 0, spread: 0.1,
    pelletCount: 1, knockback: 5, critChance: 0.08, color: "#F39C12",
  },
  shotgun: {
    id: "shotgun", name: "Rusty Shotgun", category: "shotgun", rarity: "uncommon",
    damage: 2, fireRate: 1, bulletSpeed: 120, manaCost: 2, spread: 0.4,
    pelletCount: 5, knockback: 7, critChance: 0.05, color: "#E74C3C",
  },
  laser: {
    id: "laser", name: "Energy Blaster", category: "energy", rarity: "rare",
    damage: 5, fireRate: 5, bulletSpeed: 300, manaCost: 1, spread: 0,
    pelletCount: 1, knockback: 3, critChance: 0.12, color: "#00F2FE",
  },
  bell_repeater: {
    id: "bell_repeater", name: "Ding-Dong Repeater", category: "rifle", rarity: "common",
    damage: 2, fireRate: 7.2, bulletSpeed: 185, manaCost: 1, spread: 0.14,
    pelletCount: 1, knockback: 2, critChance: 0.07, color: "#F1C40F",
    projectileLife: 1.45,
  },
  mask_sprayer: {
    id: "mask_sprayer", name: "Mask Sprayer", category: "shotgun", rarity: "uncommon",
    damage: 1, fireRate: 2.1, bulletSpeed: 110, manaCost: 2, spread: 0.72,
    pelletCount: 8, knockback: 4, critChance: 0.03, color: "#ECF0F1",
    projectileLife: 1.05, statusEffect: "slow", statusDuration: 1.2,
  },
  code_scanner: {
    id: "code_scanner", name: "Code Scanner", category: "energy", rarity: "rare",
    damage: 4, fireRate: 3.4, bulletSpeed: 275, manaCost: 2, spread: 0.02,
    pelletCount: 1, knockback: 3, critChance: 0.14, color: "#2ECC71",
    pierce: 2, projectileLife: 2.3,
  },
  swab_lance: {
    id: "swab_lance", name: "Swab Lance", category: "launcher", rarity: "uncommon",
    damage: 8, fireRate: 0.82, bulletSpeed: 128, manaCost: 3, spread: 0.04,
    pelletCount: 1, knockback: 13, critChance: 0.1, color: "#D6EAF8",
    projectileRadius: 4, projectileLife: 2.8, pierce: 1,
  },
  vat_horse_cannon: {
    id: "vat_horse_cannon", name: "Vat-Horse Cannon", category: "launcher", rarity: "rare",
    damage: 5, fireRate: 1.15, bulletSpeed: 145, manaCost: 4, spread: 0.24,
    pelletCount: 3, knockback: 10, critChance: 0.08, color: "#FF8A65",
    projectileRadius: 4, projectileLife: 2.6, wallBounces: 1,
    statusEffect: "burn", statusDuration: 2.1,
  },

  kingmaker: {
    id: "kingmaker", name: "Kingmaker", category: "sidearm", rarity: "legendary",
    damage: 8, fireRate: 4.2, bulletSpeed: 225, manaCost: 2, spread: 0.04,
    pelletCount: 1, knockback: 7, critChance: 0.3, color: "#F9E79F",
    pierce: 1, projectileLife: 2.2, series: "vanguard", minGlobalStage: 7,
  },
  storm_repeater: {
    id: "storm_repeater", name: "Storm Repeater", category: "rifle", rarity: "legendary",
    damage: 4, fireRate: 8.5, bulletSpeed: 230, manaCost: 2, spread: 0.18,
    pelletCount: 2, knockback: 4, critChance: 0.14, color: "#F4D03F",
    wallBounces: 1, projectileLife: 1.9, series: "vanguard", minGlobalStage: 9,
  },
  starfall_array: {
    id: "starfall_array", name: "Starfall Array", category: "energy", rarity: "legendary",
    damage: 5, fireRate: 3.2, bulletSpeed: 245, manaCost: 4, spread: 0.48,
    pelletCount: 5, knockback: 4, critChance: 0.15, color: "#AF7AC5",
    pierce: 1, projectileLife: 2.15, series: "aether", minGlobalStage: 10,
  },
  void_rail: {
    id: "void_rail", name: "Void Rail", category: "energy", rarity: "legendary",
    damage: 16, fireRate: 0.9, bulletSpeed: 360, manaCost: 7, spread: 0,
    pelletCount: 1, knockback: 16, critChance: 0.25, color: "#BB8FCE",
    projectileRadius: 3, pierce: 5, projectileLife: 2.8, series: "aether", minGlobalStage: 12,
  },
  dragon_breath: {
    id: "dragon_breath", name: "Dragon Breath", category: "shotgun", rarity: "legendary",
    damage: 3, fireRate: 1.35, bulletSpeed: 138, manaCost: 5, spread: 0.86,
    pelletCount: 12, knockback: 7, critChance: 0.08, color: "#FF7043",
    projectileLife: 1.15, statusEffect: "burn", statusDuration: 2.8,
    series: "phoenix", minGlobalStage: 14,
  },
  siege_breaker: {
    id: "siege_breaker", name: "Siege Breaker", category: "launcher", rarity: "legendary",
    damage: 20, fireRate: 0.65, bulletSpeed: 112, manaCost: 8, spread: 0.02,
    pelletCount: 1, knockback: 20, critChance: 0.18, color: "#FF8C69",
    projectileRadius: 5, projectileLife: 3, pierce: 2, wallBounces: 1,
    statusEffect: "burn", statusDuration: 3, series: "phoenix", minGlobalStage: 16,
  },
};

export function getAvailableWeapons(globalStageIndex: number): WeaponData[] {
  const stage = Math.max(1, Math.floor(globalStageIndex || 1));
  return Object.values(WEAPONS).filter(weapon => (weapon.minGlobalStage ?? 1) <= stage);
}

export function isWeaponId(value: unknown): value is string {
  return typeof value === "string" && value in WEAPONS;
}

export function normalizeWeaponSlots(value: unknown, fallbackWeapon = "pistol"): WeaponSlots {
  const safeFallback = isWeaponId(fallbackWeapon) ? fallbackWeapon : "pistol";
  if (!Array.isArray(value)) return [safeFallback];
  const first = isWeaponId(value[0]) ? value[0] : safeFallback;
  const second = isWeaponId(value[1]) && value[1] !== first ? value[1] : undefined;
  return second ? [first, second] : [first];
}

export function createStarterWeaponSlots(starterWeapon: string): WeaponSlots {
  const starter = isWeaponId(starterWeapon) ? starterWeapon : "pistol";
  return starter === "pistol" ? ["pistol"] : [starter, "pistol"];
}
