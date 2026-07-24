import { getWeaponArtOffsets } from "./weaponArt";

import type { StatusEffectId } from "../combat/StatusEffectSystem";
import type { PowerSeries } from "../PowerSeries";
import { getDifficultyStageIndex, getDifficultyStageIndexFromGlobalStage } from "../RunProgress";

export type WeaponCategory = "sidearm" | "shotgun" | "energy" | "rifle" | "smg" | "launcher" | "special" | "sword" | "yoyo" | "magic" | "summon";
export type WeaponRarity = "common" | "uncommon" | "rare" | "legendary" | "myth";
export type WeaponSlots = [string, string?];

export type ProjectileStyle =
  | "bullet"
  | "tracer"
  | "beam"
  | "lightning"
  | "plasma"
  | "flame"
  | "rocket"
  | "disc"
  | "water"
  | "sword"
  | "yoyo"
  | "prism"
  | "dragon";

export type WeaponAttackMode = "projectile" | "melee" | "yoyo" | "channel" | "summon";

export type MuzzleEffect = "flash" | "smoke" | "electric" | "beam" | "flame" | "rocket";
export type ImpactEffect = "spark" | "electric" | "plasma" | "flame" | "explosion" | "slash";

export interface ProjectileProfile {
  weaponId: string;
  style: ProjectileStyle;
  trailLength: number;
  beamWidth: number;
  explosionRadius: number;
  explosionDamageMultiplier: number;
  chainCount: number;
  chainRange: number;
  chainDamageMultiplier: number;
  homingStrength: number;
  acceleration: number;
  drag: number;
  spinRate: number;
  muzzleEffect: MuzzleEffect;
  impactEffect: ImpactEffect;
  attackMode: WeaponAttackMode;
  ignoreWalls: boolean;
  repeatHitDelay: number;
  tetherRange: number;
  returnStrength: number;
  linkedShot: boolean;
  linkedExplosionRadius: number;
  linkedExplosionDamageMultiplier: number;
  linkedTriggerRange: number;
  linkedMarkerLife: number;
  highHealthDamageThreshold: number;
  highHealthDamageMultiplier: number;
  criticalExplosionRadius: number;
  criticalExplosionDamageMultiplier: number;
  closeRangeDamageMultiplier: number;
  closeRangeFalloffDistance: number;
}

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
  critMultiplier?: number;
  color: string;
  projectileRadius?: number;
  projectileLife?: number;
  pierce?: number;
  wallBounces?: number;
  statusEffect?: StatusEffectId;
  statusDuration?: number;
  series?: PowerSeries;
  mechanic: string;
  projectileStyle: ProjectileStyle;
  trailLength?: number;
  beamWidth?: number;
  explosionRadius?: number;
  explosionDamageMultiplier?: number;
  chainCount?: number;
  chainRange?: number;
  chainDamageMultiplier?: number;
  homingStrength?: number;
  acceleration?: number;
  drag?: number;
  spinRate?: number;
  muzzleEffect?: MuzzleEffect;
  impactEffect?: ImpactEffect;
  recoil?: number;
  renderOffsetX?: number;
  renderOffsetY?: number;
  muzzleOffsetX?: number;
  muzzleOffsetY?: number;
  attackMode?: WeaponAttackMode;
  channelTime?: number;
  ignoreWalls?: boolean;
  repeatHitDelay?: number;
  tetherRange?: number;
  returnStrength?: number;
  burstSize?: number;
  burstInterval?: number;
  burstRecovery?: number;
  resourceType?: "magazine" | "battery" | "heat" | "charge" | "action";
  magazineSize?: number;
  reloadTime?: number;
  batteryCapacity?: number;
  batteryRechargeRate?: number;
  batteryRechargeDelay?: number;
  chargeSlots?: number;
  chargeTime?: number;
  heatPerShot?: number;
  heatDecayRate?: number;
  maxHeat?: number;
  overheatLockout?: number;
  heatSpreadMultiplier?: number;
  linkedShot?: boolean;
  linkedExplosionRadius?: number;
  linkedExplosionDamageMultiplier?: number;
  linkedTriggerRange?: number;
  linkedMarkerLife?: number;
  burstDamagePattern?: number[];
  burstPiercePattern?: number[];
  burstCritBonusPattern?: number[];
  burstColorPattern?: string[];
  burstRecoilPattern?: number[];
  highHealthDamageThreshold?: number;
  highHealthDamageMultiplier?: number;
  criticalExplosionRadius?: number;
  criticalExplosionDamageMultiplier?: number;
  closeRangeDamageMultiplier?: number;
  closeRangeFalloffDistance?: number;
  exclusiveCharacterId?: string;
  markedTargetDamageMultiplier?: number;
  dualWield?: boolean;
  sustainEnergyPerSecond?: number;
  linkedCatalystEnergyCost?: number;
}

export const SHOTGUN_CLOSE_RANGE_MULTIPLIER = 3;
export const SHOTGUN_CLOSE_RANGE_FALLOFF_DISTANCE = 96;

export const WEAPONS: Record<string, WeaponData> = {
  pistol: {
    id: "pistol", name: "Old Pistol", category: "sidearm", rarity: "common",
    damage: 4, fireRate: 3.1, bulletSpeed: 190, manaCost: 0, spread: 0.08,
    resourceType: "magazine", magazineSize: 12, reloadTime: 1.2,
    pelletCount: 1, knockback: 5, critChance: 0.08, color: "#F39C12",
    mechanic: "Reliable zero-energy ballistic sidearm.", projectileStyle: "bullet",
  },
  shotgun: {
    id: "shotgun", name: "Rusty Shotgun", category: "shotgun", rarity: "uncommon",
    damage: 2, fireRate: 1.35, bulletSpeed: 185, manaCost: 2, spread: 0.38,
    resourceType: "magazine", magazineSize: 4, reloadTime: 1.8,
    pelletCount: 5, knockback: 7, critChance: 0.05, color: "#E74C3C",
    mechanic: "Wide five-pellet close-range blast.", projectileStyle: "bullet",
    muzzleEffect: "smoke", recoil: 1.15,
  },
  laser: {
    id: "laser", name: "Energy Blaster", category: "energy", rarity: "rare",
    damage: 5, fireRate: 4.2, bulletSpeed: 300, manaCost: 1, spread: 0,
    resourceType: "battery", batteryCapacity: 30, batteryRechargeRate: 8, batteryRechargeDelay: 1.0,
    pelletCount: 1, knockback: 3, critChance: 0.12, color: "#00F2FE",
    mechanic: "Fast coherent beam with a long luminous trace.", projectileStyle: "beam",
    trailLength: 34, beamWidth: 2, muzzleEffect: "beam", impactEffect: "plasma",
  },
  bell_repeater: {
    id: "bell_repeater", name: "Ding-Dong Repeater", category: "rifle", rarity: "common",
    damage: 2, fireRate: 6.8, bulletSpeed: 220, manaCost: 1, spread: 0.12,
    resourceType: "magazine", magazineSize: 25, reloadTime: 1.5,
    pelletCount: 1, knockback: 2, critChance: 0.07, color: "#F1C40F",
    projectileLife: 1.45,
    mechanic: "Rapid ringing tracer rounds.", projectileStyle: "tracer", trailLength: 15,
  },
  mask_sprayer: {
    id: "mask_sprayer", name: "Mask Sprayer", category: "shotgun", rarity: "uncommon",
    damage: 1, fireRate: 2.2, bulletSpeed: 170, manaCost: 2, spread: 0.68,
    resourceType: "heat", maxHeat: 100, heatPerShot: 15, heatDecayRate: 35, overheatLockout: 2.5,
    pelletCount: 8, knockback: 4, critChance: 0.03, color: "#ECF0F1",
    projectileLife: 1.05, statusEffect: "slow", statusDuration: 1.2,
    mechanic: "Short-lived freezing particulate spray.", projectileStyle: "flame",
    drag: 1.5, muzzleEffect: "smoke", impactEffect: "plasma",
  },
  code_scanner: {
    id: "code_scanner", name: "Code Scanner", category: "energy", rarity: "rare",
    damage: 5, fireRate: 2.8, bulletSpeed: 275, manaCost: 2, spread: 0.02,
    resourceType: "battery", batteryCapacity: 40, batteryRechargeRate: 15, batteryRechargeDelay: 0.8,
    pelletCount: 1, knockback: 3, critChance: 0.14, color: "#2ECC71",
    pierce: 2, projectileLife: 2.3,
    mechanic: "Scanning beam penetrates multiple targets.", projectileStyle: "beam",
    trailLength: 28, beamWidth: 1, muzzleEffect: "beam", impactEffect: "plasma",
  },
  swab_lance: {
    id: "swab_lance", name: "Swab Lance", category: "launcher", rarity: "uncommon",
    damage: 12, fireRate: 0.95, bulletSpeed: 128, manaCost: 3, spread: 0.04,
    resourceType: "charge", chargeSlots: 3, chargeTime: 3.5,
    pelletCount: 1, knockback: 13, critChance: 0.1, color: "#D6EAF8",
    projectileRadius: 4, projectileLife: 2.8, pierce: 1,
    mechanic: "Heavy lance accelerates after leaving the barrel.", projectileStyle: "tracer",
    trailLength: 18, acceleration: 75, muzzleEffect: "smoke", recoil: 1.25,
  },
  vat_horse_cannon: {
    id: "vat_horse_cannon", name: "Vat-Horse Cannon", category: "launcher", rarity: "rare",
    damage: 5, fireRate: 1.2, bulletSpeed: 145, manaCost: 4, spread: 0.24,
    resourceType: "magazine", magazineSize: 3, reloadTime: 2.2,
    pelletCount: 3, knockback: 10, critChance: 0.08, color: "#FF8A65",
    projectileRadius: 4, projectileLife: 2.6, wallBounces: 1,
    statusEffect: "burn", statusDuration: 2.1,
    mechanic: "Three bouncing incendiary plasma shells.", projectileStyle: "plasma",
    trailLength: 10, spinRate: 7, muzzleEffect: "rocket", impactEffect: "flame", recoil: 1.4,
  },

  service_revolver: {
    id: "service_revolver", name: "Service Revolver", category: "sidearm", rarity: "uncommon",
    damage: 6, fireRate: 1.55, bulletSpeed: 205, manaCost: 0, spread: 0.035,
    pelletCount: 1, knockback: 8, critChance: 0.18, critMultiplier: 2.25, color: "#F5C16C",
    projectileLife: 2.1,
    mechanic: "Zero-energy heavy round with strong critical hits.", projectileStyle: "bullet",
    trailLength: 8, muzzleEffect: "smoke", recoil: 0.9,
  },
  nail_driver: {
    id: "nail_driver", name: "Nail Driver", category: "smg", rarity: "common",
    damage: 1, fireRate: 9.2, bulletSpeed: 215, manaCost: 0, spread: 0.1,
    pelletCount: 1, knockback: 3, critChance: 0.06, color: "#C7D3DD",
    pierce: 1, projectileLife: 1.7,
    mechanic: "Free rapid nails that penetrate one target.", projectileStyle: "tracer", trailLength: 9,
  },
  liberator: {
    id: "liberator", name: "Liberator Pistol", category: "sidearm", rarity: "uncommon",
    damage: 13, fireRate: 0.5, bulletSpeed: 180, manaCost: 0, spread: 0.16,
    pelletCount: 1, knockback: 12, critChance: 0.3, critMultiplier: 2.5, color: "#D8C6A1",
    projectileLife: 2.25,
    mechanic: "Crude single-shot pistol: slow, inaccurate and brutally strong.", projectileStyle: "bullet",
    trailLength: 12, muzzleEffect: "smoke", recoil: 1.6,
  },
  vector_9: {
    id: "vector_9", name: "Vector-9", category: "smg", rarity: "rare",
    damage: 1, fireRate: 14, bulletSpeed: 275, manaCost: 0, spread: 0.095,
    pelletCount: 1, knockback: 2, critChance: 0.09, color: "#79D7FF",
    projectileLife: 1.35,
    mechanic: "Zero-energy hyper-burst SMG: extreme rate, low per-shot damage.", projectileStyle: "tracer",
    trailLength: 17, muzzleEffect: "flash", recoil: 0.15,
  },
  plasma_caster: {
    id: "plasma_caster", name: "Plasma Caster", category: "energy", rarity: "rare",
    damage: 7, fireRate: 2.2, bulletSpeed: 145, manaCost: 2, spread: 0.05,
    pelletCount: 1, knockback: 6, critChance: 0.1, color: "#7DFFB3",
    projectileRadius: 4, projectileLife: 2.5,
    mechanic: "Slow plasma sphere bends toward nearby enemies.", projectileStyle: "plasma",
    homingStrength: 2.8, trailLength: 10, muzzleEffect: "electric", impactEffect: "plasma",
  },
  tesla_carbine: {
    id: "tesla_carbine", name: "Tesla Carbine", category: "special", rarity: "rare",
    damage: 5, fireRate: 3, bulletSpeed: 245, manaCost: 3, spread: 0.03,
    pelletCount: 1, knockback: 3, critChance: 0.12, color: "#8DF6FF",
    projectileLife: 1.9,
    mechanic: "Lightning bolt chains through two nearby targets.", projectileStyle: "lightning",
    trailLength: 24, chainCount: 2, chainRange: 58, chainDamageMultiplier: 0.72,
    muzzleEffect: "electric", impactEffect: "electric",
  },
  ripper_disc: {
    id: "ripper_disc", name: "Ripper Disc", category: "special", rarity: "rare",
    damage: 6, fireRate: 2, bulletSpeed: 165, manaCost: 3, spread: 0.02,
    pelletCount: 1, knockback: 7, critChance: 0.14, color: "#FF6B9A",
    projectileRadius: 5, projectileLife: 3.2, pierce: 2, wallBounces: 3,
    mechanic: "Spinning disc pierces enemies and ricochets three times.", projectileStyle: "disc",
    spinRate: 16, trailLength: 8, impactEffect: "slash",
  },
  micro_rocket: {
    id: "micro_rocket", name: "Micro-Rocket Pod", category: "launcher", rarity: "rare",
    damage: 10, fireRate: 1.25, bulletSpeed: 118, manaCost: 4, spread: 0.06,
    pelletCount: 1, knockback: 12, critChance: 0.1, color: "#FFB36B",
    projectileRadius: 4, projectileLife: 3,
    mechanic: "Homing rocket detonates in a damaging blast.", projectileStyle: "rocket",
    homingStrength: 1.45, acceleration: 42, explosionRadius: 30, explosionDamageMultiplier: 0.8,
    muzzleEffect: "rocket", impactEffect: "explosion", recoil: 1.2,
  },

  kingmaker: {
    id: "kingmaker", name: "Kingmaker", category: "sidearm", rarity: "legendary",
    damage: 7, fireRate: 3, bulletSpeed: 225, manaCost: 2, spread: 0.04,
    pelletCount: 1, knockback: 7, critChance: 0.3, critMultiplier: 2.25, color: "#F9E79F",
    pierce: 1, projectileLife: 2.2, series: "vanguard",
    mechanic: "Royal high-caliber beam round pierces one target.", projectileStyle: "tracer",
    trailLength: 20, muzzleEffect: "smoke", recoil: 0.85,
  },
  storm_repeater: {
    id: "storm_repeater", name: "Storm Repeater", category: "rifle", rarity: "legendary",
    damage: 3, fireRate: 4.5, bulletSpeed: 230, manaCost: 3, spread: 0.18,
    pelletCount: 2, knockback: 4, critChance: 0.14, color: "#F4D03F",
    wallBounces: 1, projectileLife: 1.9, series: "vanguard",
    mechanic: "Twin storm tracers ricochet from walls.", projectileStyle: "lightning",
    trailLength: 20, muzzleEffect: "electric", impactEffect: "electric",
  },
  starfall_array: {
    id: "starfall_array", name: "Starfall Array", category: "energy", rarity: "legendary",
    damage: 3, fireRate: 1.8, bulletSpeed: 245, manaCost: 5, spread: 0.48,
    pelletCount: 5, knockback: 4, critChance: 0.15, color: "#AF7AC5",
    pierce: 1, projectileLife: 2.15, series: "aether",
    mechanic: "Five homing star-plasma shards spread across the room.", projectileStyle: "plasma",
    homingStrength: 1.25, trailLength: 14, spinRate: 5, muzzleEffect: "electric", impactEffect: "plasma",
  },
  void_rail: {
    id: "void_rail", name: "Void Rail", category: "energy", rarity: "legendary",
    damage: 18, fireRate: 0.9, bulletSpeed: 360, manaCost: 7, spread: 0,
    resourceType: "battery", batteryCapacity: 21, batteryRechargeRate: 7, batteryRechargeDelay: 0.7,
    pelletCount: 1, knockback: 16, critChance: 0.25, color: "#BB8FCE",
    projectileRadius: 3, pierce: 5, projectileLife: 2.8, series: "aether",
    mechanic: "Room-cutting rail beam penetrates six targets.", projectileStyle: "beam",
    trailLength: 54, beamWidth: 3, muzzleEffect: "beam", impactEffect: "plasma", recoil: 1.5,
  },
  dragon_breath: {
    id: "dragon_breath", name: "Dragon Breath", category: "shotgun", rarity: "legendary",
    damage: 2, fireRate: 1.1, bulletSpeed: 185, manaCost: 6, spread: 0.86,
    pelletCount: 12, knockback: 7, critChance: 0.08, color: "#FF7043",
    projectileLife: 1.15, statusEffect: "burn", statusDuration: 2.8,
    series: "phoenix",
    mechanic: "Twelve-particle incendiary flame cone.", projectileStyle: "flame",
    drag: 1.25, muzzleEffect: "flame", impactEffect: "flame", recoil: 1.2,
  },
  siege_breaker: {
    id: "siege_breaker", name: "Siege Breaker", category: "launcher", rarity: "legendary",
    damage: 24, fireRate: 0.6, bulletSpeed: 112, manaCost: 8, spread: 0.02,
    resourceType: "charge", chargeSlots: 3, chargeTime: 2.4,
    pelletCount: 1, knockback: 20, critChance: 0.18, color: "#FF8C69",
    projectileRadius: 5, projectileLife: 3, wallBounces: 1,
    statusEffect: "burn", statusDuration: 3, series: "phoenix",
    mechanic: "Massive bouncing siege rocket explodes on impact.", projectileStyle: "rocket",
    explosionRadius: 40, explosionDamageMultiplier: 0.9, acceleration: 28,
    muzzleEffect: "rocket", impactEffect: "explosion", recoil: 1.8,
  },
  ballistic_knife: {
    id: "ballistic_knife", name: "Ballistic Knife", category: "special", rarity: "uncommon",
    damage: 9, fireRate: 1.1, bulletSpeed: 320, manaCost: 0, spread: 0, pelletCount: 1, knockback: 5, critChance: 0.15, color: "#BDC3C7",
    projectileRadius: 3, projectileLife: 1.2, pierce: 3,
    mechanic: "Thrown blade silently pierces multiple enemies.", projectileStyle: "disc", trailLength: 5, spinRate: 20,
  },
  olympia: {
    id: "olympia", name: "Olympia", category: "shotgun", rarity: "common",
    damage: 1, fireRate: 0.9, bulletSpeed: 215, manaCost: 0, spread: 0.84, pelletCount: 12, knockback: 8, critChance: 0.08, color: "#E67E22",
    projectileLife: 1, mechanic: "Classic double barrel burst with devastating close range spread.", projectileStyle: "bullet", trailLength: 4,
  },
  ksg_12: {
    id: "ksg_12", name: "KSG", category: "shotgun", rarity: "rare",
    damage: 22, fireRate: 0.65, bulletSpeed: 300, manaCost: 2, spread: 0.04, pelletCount: 1, knockback: 18, critChance: 0.2, color: "#F1C40F",
    projectileLife: 2.5, pierce: 1, mechanic: "Slug shotgun fires a powerful accurate projectile.", projectileStyle: "tracer", trailLength: 16,
  },
  akimbo_scorpion: {
    id: "akimbo_scorpion", name: "Akimbo Skorpion", category: "smg", rarity: "rare",
    damage: 1, fireRate: 6.2, bulletSpeed: 270, manaCost: 0, spread: 0.24, pelletCount: 2, knockback: 2, critChance: 0.07, color: "#27AE60",
    projectileLife: 1.5, dualWield: true, mechanic: "Twin machine pistols unleash an uncontrollable bullet storm.", projectileStyle: "tracer", trailLength: 10, recoil: 0.3,
  },
  scavenger: {
    id: "scavenger", name: "Scavenger", category: "launcher", rarity: "rare",
    damage: 18, fireRate: 0.7, bulletSpeed: 110, manaCost: 5, spread: 0, pelletCount: 1, knockback: 20, critChance: 0.15, color: "#3498DB",
    projectileLife: 3, explosionRadius: 32, explosionDamageMultiplier: 1, mechanic: "Explosive sniper round creates a huge blast on impact.", projectileStyle: "rocket", trailLength: 20,
  },
  venom_x: {
    id: "venom_x", name: "Venom-X", category: "energy", rarity: "rare",
    damage: 12, fireRate: 1.4, bulletSpeed: 150, manaCost: 5, spread: 0.05, pelletCount: 1, knockback: 10, critChance: 0.1, color: "#2ECC71",
    projectileLife: 2.5, homingStrength: 1.8, mechanic: "Toxic tracking projectile leaves a poisonous cloud.", projectileStyle: "plasma", trailLength: 18,
  },
  ray_gun: {
    id: "ray_gun", name: "Ray Gun", category: "energy", rarity: "legendary",
    damage: 20, fireRate: 1.6, bulletSpeed: 260, manaCost: 6, spread: 0, pelletCount: 1, knockback: 14, critChance: 0.25, color: "#00F2FE",
    projectileRadius: 5, projectileLife: 2, explosionRadius: 24, explosionDamageMultiplier: 0.9, mechanic: "Classic wonder weapon fires explosive plasma shots.", projectileStyle: "plasma", trailLength: 28,
  },
  wunderwaffe: {
    id: "wunderwaffe", name: "Wunderwaffe DG-2", category: "energy", rarity: "legendary",
    damage: 16, fireRate: 0.75, bulletSpeed: 280, manaCost: 8, spread: 0, pelletCount: 1, knockback: 12, critChance: 0.2, color: "#8DF6FF",
    projectileLife: 2, chainCount: 5, chainRange: 80, chainDamageMultiplier: 0.65, mechanic: "Lightning bolt jumps between groups of enemies.", projectileStyle: "lightning", trailLength: 35,
  },

  cx_9: {
    id: "cx_9", name: "CX-9", category: "smg", rarity: "common",
    damage: 1, fireRate: 13, bulletSpeed: 300, manaCost: 0, spread: 0.052,
    pelletCount: 1, knockback: 2, critChance: 0.09, color: "#D7DEE3",
    projectileLife: 1.45,
    mechanic: "Lightweight automatic SMG with a high fire rate, tight spread and manageable recoil.",
    projectileStyle: "tracer", trailLength: 14, muzzleEffect: "flash", recoil: 0.12,
  },
  r9_0: {
    id: "r9_0", name: "R9-0 Shotgun", category: "shotgun", rarity: "uncommon",
    damage: 1, fireRate: 2.3, bulletSpeed: 220, manaCost: 1, spread: 0.72,
    pelletCount: 6, knockback: 8, critChance: 0.05, color: "#D8DEE3",
    projectileLife: 0.95, burstSize: 2, burstInterval: 0.12, burstRecovery: 0.72,
    mechanic: "Fires two rapid shotgun blasts before a longer pump-action recovery.",
    projectileStyle: "bullet", trailLength: 5, muzzleEffect: "smoke", recoil: 1.05,
  },
  bp50: {
    id: "bp50", name: "BP50", category: "rifle", rarity: "rare",
    damage: 3, fireRate: 9, bulletSpeed: 305, manaCost: 1.5, spread: 0.038,
    pelletCount: 1, knockback: 3, critChance: 0.12, color: "#D7E0DD",
    projectileLife: 1.8,
    mechanic: "Fast-firing bullpup rifle combines exceptional accuracy with strong mid-range velocity.",
    projectileStyle: "tracer", trailLength: 18, muzzleEffect: "flash", recoil: 0.22,
  },
  mx_guardian: {
    id: "mx_guardian", name: "MX Guardian", category: "shotgun", rarity: "rare",
    damage: 1, fireRate: 3.2, bulletSpeed: 205, manaCost: 2, spread: 0.76,
    pelletCount: 5, knockback: 5, critChance: 0.04, color: "#D9DEE2",
    projectileLife: 0.82,
    mechanic: "Fully automatic shotgun floods close range with repeated five-pellet blasts.",
    projectileStyle: "bullet", trailLength: 4, muzzleEffect: "smoke", recoil: 0.72,
  },
  mg42: {
    id: "mg42", name: "MG42", category: "rifle", rarity: "rare",
    damage: 1, fireRate: 15, bulletSpeed: 275, manaCost: 0, spread: 0.085,
    resourceType: "heat",
    pelletCount: 1, knockback: 3, critChance: 0.1, color: "#F0C56A",
    projectileLife: 1.8, pierce: 2,
    heatPerShot: 2.3, heatDecayRate: 24, maxHeat: 100, overheatLockout: 1.1, heatSpreadMultiplier: 1.65,
    mechanic: "Buzzsaw-rate machine gun builds heat and spread until an overheat lockout forces cooling.",
    projectileStyle: "tracer", trailLength: 16, muzzleEffect: "smoke", recoil: 0.28,
  },
  na_45: {
    id: "na_45", name: "NA-45", category: "launcher", rarity: "legendary",
    damage: 6, fireRate: 1.55, bulletSpeed: 310, manaCost: 4, spread: 0.015,
    pelletCount: 1, knockback: 10, critChance: 0.15, color: "#E1D06B",
    projectileRadius: 3, projectileLife: 3,
    linkedShot: true, linkedExplosionRadius: 42, linkedExplosionDamageMultiplier: 2.1,
    linkedTriggerRange: 82, linkedMarkerLife: 2, linkedCatalystEnergyCost: 0,
    mechanic: "Primer rounds stick to a surface; the following Catalyst detonates a nearby Primer in a wide blast.",
    projectileStyle: "tracer", trailLength: 22, muzzleEffect: "electric", impactEffect: "spark", recoil: 1.4,
  },

  bayonet_ruby: {
    id: "bayonet_ruby", name: "Bayonet | Doppler Ruby", category: "sword", rarity: "legendary",
    damage: 9, fireRate: 2.2, bulletSpeed: 185, manaCost: 1.5, spread: 0,
    pelletCount: 1, knockback: 7, critChance: 0.18, critMultiplier: 2.3, color: "#D9233F",
    projectileRadius: 5, projectileLife: 0.26, pierce: 2,
    mechanic: "A long ruby bayonet thrust reaches farther than other knives and pierces a line of enemies.",
    projectileStyle: "sword", attackMode: "melee", impactEffect: "slash", recoil: 0.55,
  },
  butterfly_emerald: {
    id: "butterfly_emerald", name: "Butterfly Knife | Gamma Doppler Emerald", category: "sword", rarity: "legendary",
    damage: 2, fireRate: 4.8, bulletSpeed: 165, manaCost: 1, spread: 0.72,
    pelletCount: 3, knockback: 3, critChance: 0.14, critMultiplier: 2.1, color: "#28D878",
    projectileRadius: 4, projectileLife: 0.2, pierce: 1,
    mechanic: "A rapid three-cut fan slash trades per-hit damage for the fastest close-range coverage.",
    projectileStyle: "sword", attackMode: "melee", impactEffect: "slash", recoil: 0.2,
  },
  karambit_emerald: {
    id: "karambit_emerald", name: "Karambit | Gamma Doppler Emerald", category: "sword", rarity: "legendary",
    damage: 4, fireRate: 3.7, bulletSpeed: 170, manaCost: 1, spread: 0.38,
    pelletCount: 2, knockback: 4, critChance: 0.3, critMultiplier: 2.5, color: "#20C96E",
    projectileRadius: 5, projectileLife: 0.18, pierce: 1,
    mechanic: "Twin crossing claw slashes have the highest critical chance and critical damage among the knives.",
    projectileStyle: "sword", attackMode: "melee", impactEffect: "slash", recoil: 0.3,
  },
  m4a1_s_cyrex: {
    id: "m4a1_s_cyrex", name: "M4A1-S | Cyrex", category: "rifle", rarity: "rare",
    damage: 3, fireRate: 7.8, bulletSpeed: 310, manaCost: 1.5, spread: 0.028,
    pelletCount: 1, knockback: 3, critChance: 0.13, critMultiplier: 2.05, color: "#E53745",
    projectileLife: 2, pierce: 1,
    mechanic: "A suppressed precision rifle combines extremely low spread, mild recoil and one-target penetration.",
    projectileStyle: "tracer", trailLength: 19, muzzleEffect: "smoke", impactEffect: "spark", recoil: 0.16,
  },
  m4a4_coalition: {
    id: "m4a4_coalition", name: "M4A4 | The Coalition", category: "rifle", rarity: "legendary",
    damage: 4, fireRate: 7.1, bulletSpeed: 305, manaCost: 2, spread: 0.04,
    resourceType: "magazine", magazineSize: 18, reloadTime: 1.25,
    pelletCount: 1, knockback: 4, critChance: 0.16, critMultiplier: 2.15, color: "#D6B347",
    projectileLife: 2.1, pierce: 1,
    mechanic: "A disciplined gold-and-black assault rifle delivers high sustained damage, penetration and reliable critical hits.",
    projectileStyle: "tracer", trailLength: 20, muzzleEffect: "flash", impactEffect: "spark", recoil: 0.28,
  },

  ultimate: {
    id: "ultimate", name: "Ultimate", category: "smg", rarity: "myth",
    damage: 1, fireRate: 18, bulletSpeed: 335, manaCost: 0.8, spread: 0.16,
    pelletCount: 2, knockback: 1, critChance: 0.14, critMultiplier: 2, color: "#66ECFF",
    projectileLife: 1.45, pierce: 1, dualWield: true,
    heatPerShot: 2, heatDecayRate: 26, maxHeat: 100, overheatLockout: 1.2, heatSpreadMultiplier: 0.9,
    mechanic: "Twin electronically fired machine pistols discharge paired rounds at an extreme rate; sustained fire builds heat and bloom before lockout.",
    projectileStyle: "tracer", trailLength: 20, muzzleEffect: "electric", impactEffect: "spark", recoil: 0.08,
  },

  so_14: {
    id: "so_14", name: "SO-14", category: "rifle", rarity: "myth",
    damage: 8, fireRate: 2.4, bulletSpeed: 315, manaCost: 3, spread: 0.022,
    pelletCount: 1, knockback: 6, critChance: 0.14, critMultiplier: 2.2, color: "#D9DDE2",
    projectileLife: 2.3, burstSize: 3, burstInterval: 0.09, burstRecovery: 0.52,
    burstDamagePattern: [1.75, 0.8, 0.8], burstPiercePattern: [2, 0, 0],
    burstCritBonusPattern: [0.2, 0, 0],
    burstColorPattern: ["#F4D35E", "#CFA7FF", "#8FD9FF"],
    burstRecoilPattern: [1.05, 0.28, 0.28],
    mechanic: "Adaptive three-shot cycle opens with a mythic overmatch round, then delivers two rapid controlled follow-ups.",
    projectileStyle: "tracer", trailLength: 24, muzzleEffect: "flash", recoil: 0.45,
  },
  aa_12: {
    id: "aa_12", name: "AA-12", category: "shotgun", rarity: "rare",
    damage: 1, fireRate: 4.8, bulletSpeed: 225, manaCost: 2.5, spread: 0.82,
    pelletCount: 6, knockback: 5, critChance: 0.03, color: "#D8C89A",
    projectileLife: 0.82,
    mechanic: "Fully automatic combat shotgun sustains a dense six-pellet close-range barrage.",
    projectileStyle: "bullet", trailLength: 4, muzzleEffect: "smoke", recoil: 0.82,
  },
  awp_dragon_lore: {
    id: "awp_dragon_lore", name: "AWP | Dragon Lore", category: "rifle", rarity: "myth",
    damage: 28, fireRate: 0.55, bulletSpeed: 400, manaCost: 7, spread: 0,
    pelletCount: 1, knockback: 18, critChance: 0.25, critMultiplier: 2.6, color: "#F4C95D",
    projectileRadius: 3, projectileLife: 3, pierce: 3,
    highHealthDamageThreshold: 0.75, highHealthDamageMultiplier: 1.75,
    mechanic: "Mythic opening shot deals 75% more damage to targets above 75% health and pierces four bodies.",
    projectileStyle: "tracer", trailLength: 34, muzzleEffect: "smoke", impactEffect: "spark", recoil: 1.85,
  },
  ak47_wild_lotus: {
    id: "ak47_wild_lotus", name: "AK-47 | Wild Lotus", category: "rifle", rarity: "legendary",
    damage: 4, fireRate: 5.5, bulletSpeed: 290, manaCost: 2, spread: 0.055,
    pelletCount: 1, knockback: 4, critChance: 0.16, critMultiplier: 2.2, color: "#65D69A",
    projectileLife: 1.95, pierce: 1,
    criticalExplosionRadius: 18, criticalExplosionDamageMultiplier: 0.45,
    mechanic: "Accurate lotus-pattern rifle; critical hits bloom into a short-range petal burst.",
    projectileStyle: "tracer", trailLength: 18, muzzleEffect: "flash", impactEffect: "plasma", recoil: 0.38,
  },

  zeroth_sense: {
    id: "zeroth_sense", name: "Appraiser's Edge", category: "sword", rarity: "rare",
    damage: 5, fireRate: 2.8, bulletSpeed: 190, manaCost: 1.5, spread: 0.34,
    pelletCount: 2, knockback: 5, critChance: 0.2, critMultiplier: 2.2, color: "#BDA7FF",
    projectileRadius: 5, projectileLife: 0.24, pierce: 1, exclusiveCharacterId: "esper_zero",
    mechanic: "Zero's slim appraisal sword releases paired cuts; Engraving Appraisal raises their damage and lets them pierce one additional target.",
    projectileStyle: "sword", attackMode: "melee", impactEffect: "slash", recoil: 0.4,
  },
  colucci_claws: {
    id: "colucci_claws", name: "Collins Heavy Fists", category: "special", rarity: "rare",
    damage: 2, fireRate: 4.6, bulletSpeed: 175, manaCost: 1, spread: 0.58,
    pelletCount: 3, knockback: 3, critChance: 0.15, critMultiplier: 2.1, color: "#FF668F",
    projectileRadius: 4, projectileLife: 0.2, pierce: 1, exclusiveCharacterId: "nanally", dualWield: true,
    mechanic: "Nanally's oversized paired gauntlets drive three close-range impacts; Collins Howl Art repeats the combo as an Anima follow-up.",
    projectileStyle: "sword", attackMode: "melee", impactEffect: "slash", recoil: 0.2,
  },


  finale: {
    id: "finale", name: "Finale", category: "rifle", rarity: "rare",
    damage: 18, fireRate: 0.72, bulletSpeed: 360, manaCost: 5, spread: 0.005,
    pelletCount: 1, knockback: 14, critChance: 0.18, critMultiplier: 2.3, color: "#F06CA8",
    projectileRadius: 3, projectileLife: 2.8,
    explosionRadius: 22, explosionDamageMultiplier: 0.35,
    exclusiveCharacterId: "kanami",
    mechanic: "Kanami-exclusive precision sniper; every impact releases a resonant sonic burst.",
    projectileStyle: "tracer", trailLength: 30, muzzleEffect: "smoke", impactEffect: "plasma", recoil: 1.55,
  },

  inspector: {
    id: "inspector", name: "Inspector", category: "rifle", rarity: "rare",
    damage: 3, fireRate: 5.6, bulletSpeed: 285, manaCost: 1, spread: 0.045,
    pelletCount: 1, knockback: 2, critChance: 0.1, critMultiplier: 2, color: "#70D7FF",
    projectileLife: 1.9, exclusiveCharacterId: "michele", markedTargetDamageMultiplier: 1.35,
    mechanic: "Michele-exclusive balanced automatic rifle; marked attackers take 35% more damage.",
    projectileStyle: "tracer", trailLength: 19, muzzleEffect: "flash", impactEffect: "spark", recoil: 0.24,
  },
  polaris: {
    id: "polaris", name: "Polaris", category: "rifle", rarity: "rare",
    damage: 3, fireRate: 6.4, bulletSpeed: 300, manaCost: 1, spread: 0.032,
    pelletCount: 1, knockback: 2, critChance: 0.09, critMultiplier: 2, color: "#9ED8FF",
    projectileLife: 2, exclusiveCharacterId: "celestia",
    mechanic: "Celestia-exclusive ergonomic automatic rifle with excellent heat control, stable recoil, and precise close-range bursts.",
    projectileStyle: "tracer", trailLength: 20, muzzleEffect: "flash", impactEffect: "spark", recoil: 0.2,
  },
  minishark: {
    id: "minishark", name: "Minishark", category: "rifle", rarity: "common",
    damage: 1, fireRate: 11.5, bulletSpeed: 235, manaCost: 0, spread: 0.17,
    pelletCount: 1, knockback: 0, critChance: 0.05, color: "#D6A14D",
    projectileLife: 1.55,
    mechanic: "Shark-bodied rotary gun trades per-shot damage for extreme automatic fire.",
    projectileStyle: "tracer", trailLength: 9, recoil: 0.12,
  },
  water_bolt: {
    id: "water_bolt", name: "Water Bolt", category: "magic", rarity: "uncommon",
    damage: 6, fireRate: 1.5, bulletSpeed: 92, manaCost: 3, spread: 0,
    pelletCount: 1, knockback: 4, critChance: 0.08, color: "#4FC3F7",
    projectileRadius: 5, projectileLife: 6, pierce: 9, wallBounces: 5,
    mechanic: "A slow luminous water sphere pierces enemies and ricochets five times.",
    projectileStyle: "water", trailLength: 12, repeatHitDelay: 0.45, impactEffect: "plasma",
  },
  stardust_dragon_staff: {
    id: "stardust_dragon_staff", name: "Stardust Dragon Staff", category: "summon", rarity: "rare",
    damage: 6, fireRate: 0.4, bulletSpeed: 135, manaCost: 8, spread: 0,
    pelletCount: 1, knockback: 2, critChance: 0, color: "#5DADE2",
    projectileRadius: 5, projectileLife: 8, pierce: 99, homingStrength: 5.4,
    mechanic: "Summons a wall-phasing dragon; recasting lengthens and strengthens the existing summon.",
    projectileStyle: "dragon", trailLength: 18, attackMode: "summon", ignoreWalls: true, repeatHitDelay: 0.6, tetherRange: 150, returnStrength: 7,
    muzzleEffect: "electric", impactEffect: "plasma", recoil: 0.2,
  },
  terrarian: {
    id: "terrarian", name: "Terrarian", category: "yoyo", rarity: "legendary",
    damage: 10, fireRate: 0.9, bulletSpeed: 210, manaCost: 5, spread: 0,
    pelletCount: 1, knockback: 6, critChance: 0.18, color: "#52D6C6",
    projectileRadius: 6, projectileLife: 0.35, pierce: 99, homingStrength: 7.2, sustainEnergyPerSecond: 1.5,
    mechanic: "A thrown luminite yoyo grinds targets and emits short-lived green homing orbs while sustained.",
    projectileStyle: "yoyo", attackMode: "yoyo", repeatHitDelay: 0.35, tetherRange: 108, returnStrength: 10,
    impactEffect: "plasma", recoil: 0.15,
  },
  last_prism: {
    id: "last_prism", name: "Last Prism", category: "magic", rarity: "legendary",
    damage: 1, fireRate: 4, bulletSpeed: 360, manaCost: 1.5, spread: 0.52,
    resourceType: "battery", batteryCapacity: 24, batteryRechargeRate: 6, batteryRechargeDelay: 0.5,
    pelletCount: 6, knockback: 2, critChance: 0.12, color: "#FFFFFF",
    projectileRadius: 2, projectileLife: 0.42, pierce: 4,
    mechanic: "Six rotating rays converge while held, becoming a thicker, stronger and more costly beam.",
    projectileStyle: "prism", trailLength: 58, beamWidth: 1, attackMode: "channel", channelTime: 3.2,
    muzzleEffect: "beam", impactEffect: "plasma", recoil: 0.15,
  },
  zenith: {
    id: "zenith", name: "Zenith", category: "sword", rarity: "legendary",
    damage: 6, fireRate: 1.4, bulletSpeed: 225, manaCost: 6, spread: 1.7,
    pelletCount: 3, knockback: 7, critChance: 0.2, color: "#66F7C5",
    projectileRadius: 6, projectileLife: 1.9, pierce: 99, homingStrength: 4.2,
    mechanic: "Three spectral swords arc through walls, seek enemies and strike again on their return path.",
    projectileStyle: "sword", attackMode: "melee", ignoreWalls: true, repeatHitDelay: 0.22, tetherRange: 210, returnStrength: 3.4,
    muzzleEffect: "electric", impactEffect: "slash", recoil: 0.7,
  },

};

for (const weapon of Object.values(WEAPONS)) {
  const offsets = getWeaponArtOffsets(weapon.id);
  if (offsets) Object.assign(weapon, offsets);
}

export function getProjectileProfile(weapon: WeaponData): ProjectileProfile {
  return {
    weaponId: weapon.id,
    style: weapon.projectileStyle,
    trailLength: Math.max(0, weapon.trailLength ?? 6),
    beamWidth: Math.max(1, weapon.beamWidth ?? 1),
    explosionRadius: Math.max(0, weapon.explosionRadius ?? 0),
    explosionDamageMultiplier: Math.max(0, weapon.explosionDamageMultiplier ?? 0.75),
    chainCount: Math.max(0, Math.floor(weapon.chainCount ?? 0)),
    chainRange: Math.max(0, weapon.chainRange ?? 0),
    chainDamageMultiplier: Math.max(0, weapon.chainDamageMultiplier ?? 0.7),
    homingStrength: Math.max(0, weapon.homingStrength ?? 0),
    acceleration: weapon.acceleration ?? 0,
    drag: Math.max(0, weapon.drag ?? 0),
    spinRate: weapon.spinRate ?? 0,
    muzzleEffect: weapon.muzzleEffect ?? "flash",
    impactEffect: weapon.impactEffect ?? "spark",
    attackMode: weapon.attackMode ?? "projectile",
    ignoreWalls: weapon.ignoreWalls === true,
    repeatHitDelay: Math.max(0, weapon.repeatHitDelay ?? 0),
    tetherRange: Math.max(0, weapon.tetherRange ?? 0),
    returnStrength: Math.max(0, weapon.returnStrength ?? 0),
    linkedShot: weapon.linkedShot === true,
    linkedExplosionRadius: Math.max(0, weapon.linkedExplosionRadius ?? 0),
    linkedExplosionDamageMultiplier: Math.max(0, weapon.linkedExplosionDamageMultiplier ?? 1),
    linkedTriggerRange: Math.max(0, weapon.linkedTriggerRange ?? 0),
    linkedMarkerLife: Math.max(0, weapon.linkedMarkerLife ?? 0),
    highHealthDamageThreshold: Math.max(0, Math.min(1, weapon.highHealthDamageThreshold ?? 0)),
    highHealthDamageMultiplier: Math.max(1, weapon.highHealthDamageMultiplier ?? 1),
    criticalExplosionRadius: Math.max(0, weapon.criticalExplosionRadius ?? 0),
    criticalExplosionDamageMultiplier: Math.max(0, weapon.criticalExplosionDamageMultiplier ?? 0.5),
    closeRangeDamageMultiplier: Math.max(1, weapon.closeRangeDamageMultiplier ?? (weapon.category === "shotgun" ? SHOTGUN_CLOSE_RANGE_MULTIPLIER : 1)),
    closeRangeFalloffDistance: Math.max(0, weapon.closeRangeFalloffDistance ?? (weapon.category === "shotgun" ? SHOTGUN_CLOSE_RANGE_FALLOFF_DISTANCE : 0)),
  };
}

export function isWeaponAvailableForCharacter(weapon: WeaponData, characterId?: string): boolean {
  return !characterId || !weapon.exclusiveCharacterId || weapon.exclusiveCharacterId === characterId;
}

export function getAvailableWeapons(_globalStageIndex = 1, characterId?: string): WeaponData[] {
  return Object.values(WEAPONS).filter(weapon => isWeaponAvailableForCharacter(weapon, characterId));
}

export type WeaponRollContext = "shop" | "treasure" | "boss";

export const MYTH_DROP_RATE_MULTIPLIER = 2.5;
const LEGACY_MYTH_WEAPON_COUNT = 2;
const currentMythWeaponCount = Math.max(1, Object.values(WEAPONS).filter(weapon => weapon.rarity === "myth").length);
const mythPerWeaponWeightScale = MYTH_DROP_RATE_MULTIPLIER * LEGACY_MYTH_WEAPON_COUNT / currentMythWeaponCount;

const WEAPON_ROLL_WEIGHTS: Record<WeaponRollContext, Record<WeaponRarity, number>> = {
  shop: { common: 4.6, uncommon: 3.15, rare: 1.55, legendary: 0.37, myth: 0.06 * mythPerWeaponWeightScale },
  treasure: { common: 2.1, uncommon: 3.4, rare: 2.5, legendary: 0.55, myth: 0.16 * mythPerWeaponWeightScale },
  boss: { common: 0.15, uncommon: 1.2, rare: 5.5, legendary: 2.45, myth: 1.3 * mythPerWeaponWeightScale },
};

export function rollAvailableWeapon(
  globalStageIndex: number,
  random: () => number = Math.random,
  context: WeaponRollContext = "shop",
  excludedIds: Iterable<string> = [],
  characterId?: string,
): WeaponData {
  const excluded = new Set(excludedIds);
  const available = getAvailableWeapons(globalStageIndex, characterId);
  const pool = available.filter(weapon => !excluded.has(weapon.id));
  const fallback = available[0] ?? WEAPONS.pistol;
  if (pool.length === 0) return fallback;

  const stage = getDifficultyStageIndexFromGlobalStage(globalStageIndex);
  const weights = pool.map(weapon => {
    const base = WEAPON_ROLL_WEIGHTS[context][weapon.rarity];
    if (weapon.rarity === "myth") return base * (1 + Math.max(0, stage - 12) * 0.1);
    if (weapon.rarity === "legendary") return base * (1 + Math.max(0, stage - 10) * 0.07);
    return base;
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = Math.max(0, Math.min(0.999999, random())) * total;
  for (let index = 0; index < pool.length; index++) {
    roll -= weights[index];
    if (roll <= 0) return pool[index];
  }
  return pool[pool.length - 1];
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

export function createStarterWeaponSlots(starterWeapon: string, characterId?: string): WeaponSlots {
  const starter = isWeaponId(starterWeapon) ? starterWeapon : "pistol";
  const weapon = WEAPONS[starter];
  if (starter === "pistol") return ["pistol"];
  if (characterId === "michele" || weapon?.exclusiveCharacterId) return [starter];
  return [starter, "pistol"];
}
