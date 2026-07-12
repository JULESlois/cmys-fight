import type { StatusEffectId } from "../combat/StatusEffectSystem";
import type { PowerSeries } from "../PowerSeries";

export type WeaponCategory = "sidearm" | "shotgun" | "energy" | "rifle" | "smg" | "launcher" | "special" | "sword" | "yoyo" | "magic" | "summon";
export type WeaponRarity = "common" | "uncommon" | "rare" | "legendary";
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
}

export const WEAPONS: Record<string, WeaponData> = {
  pistol: {
    id: "pistol", name: "Old Pistol", category: "sidearm", rarity: "common",
    damage: 3, fireRate: 2.8, bulletSpeed: 150, manaCost: 0, spread: 0.1,
    pelletCount: 1, knockback: 5, critChance: 0.08, color: "#F39C12",
    mechanic: "Reliable zero-energy ballistic sidearm.", projectileStyle: "bullet",
    renderOffsetX: 11, renderOffsetY: -2, muzzleOffsetX: 19, muzzleOffsetY: -4,
  },
  shotgun: {
    id: "shotgun", name: "Rusty Shotgun", category: "shotgun", rarity: "uncommon",
    damage: 2, fireRate: 1.25, bulletSpeed: 120, manaCost: 2, spread: 0.4,
    pelletCount: 5, knockback: 7, critChance: 0.05, color: "#E74C3C",
    mechanic: "Wide five-pellet close-range blast.", projectileStyle: "bullet",
    muzzleEffect: "smoke", recoil: 1.15,
    renderOffsetX: 14, renderOffsetY: -2, muzzleOffsetX: 25, muzzleOffsetY: -4,
  },
  laser: {
    id: "laser", name: "Energy Blaster", category: "energy", rarity: "rare",
    damage: 5, fireRate: 4.2, bulletSpeed: 300, manaCost: 1, spread: 0,
    pelletCount: 1, knockback: 3, critChance: 0.12, color: "#00F2FE",
    mechanic: "Fast coherent beam with a long luminous trace.", projectileStyle: "beam",
    trailLength: 34, beamWidth: 2, muzzleEffect: "beam", impactEffect: "plasma",
    renderOffsetX: 11, renderOffsetY: -2, muzzleOffsetX: 20, muzzleOffsetY: -4,
  },
  bell_repeater: {
    id: "bell_repeater", name: "Ding-Dong Repeater", category: "rifle", rarity: "common",
    damage: 2, fireRate: 6.2, bulletSpeed: 185, manaCost: 1, spread: 0.14,
    pelletCount: 1, knockback: 2, critChance: 0.07, color: "#F1C40F",
    projectileLife: 1.45,
    mechanic: "Rapid ringing tracer rounds.", projectileStyle: "tracer", trailLength: 15,
    renderOffsetX: 12, renderOffsetY: -1, muzzleOffsetX: 22, muzzleOffsetY: -4,
  },
  mask_sprayer: {
    id: "mask_sprayer", name: "Mask Sprayer", category: "shotgun", rarity: "uncommon",
    damage: 1, fireRate: 2, bulletSpeed: 110, manaCost: 2, spread: 0.72,
    pelletCount: 8, knockback: 4, critChance: 0.03, color: "#ECF0F1",
    projectileLife: 1.05, statusEffect: "slow", statusDuration: 1.2,
    mechanic: "Short-lived freezing particulate spray.", projectileStyle: "flame",
    drag: 1.5, muzzleEffect: "smoke", impactEffect: "plasma",
    renderOffsetX: 11, renderOffsetY: -1, muzzleOffsetX: 20, muzzleOffsetY: -4,
  },
  code_scanner: {
    id: "code_scanner", name: "Code Scanner", category: "energy", rarity: "rare",
    damage: 5, fireRate: 2.8, bulletSpeed: 275, manaCost: 2, spread: 0.02,
    pelletCount: 1, knockback: 3, critChance: 0.14, color: "#2ECC71",
    pierce: 2, projectileLife: 2.3,
    mechanic: "Scanning beam penetrates multiple targets.", projectileStyle: "beam",
    trailLength: 28, beamWidth: 1, muzzleEffect: "beam", impactEffect: "plasma",
    renderOffsetX: 12, renderOffsetY: -1, muzzleOffsetX: 22, muzzleOffsetY: -4,
  },
  swab_lance: {
    id: "swab_lance", name: "Swab Lance", category: "launcher", rarity: "uncommon",
    damage: 12, fireRate: 0.95, bulletSpeed: 128, manaCost: 3, spread: 0.04,
    pelletCount: 1, knockback: 13, critChance: 0.1, color: "#D6EAF8",
    projectileRadius: 4, projectileLife: 2.8, pierce: 1,
    mechanic: "Heavy lance accelerates after leaving the barrel.", projectileStyle: "tracer",
    trailLength: 18, acceleration: 75, muzzleEffect: "smoke", recoil: 1.25,
    renderOffsetX: 14, renderOffsetY: -1, muzzleOffsetX: 25, muzzleOffsetY: -4,
  },
  vat_horse_cannon: {
    id: "vat_horse_cannon", name: "Vat-Horse Cannon", category: "launcher", rarity: "rare",
    damage: 5, fireRate: 1.2, bulletSpeed: 145, manaCost: 4, spread: 0.24,
    pelletCount: 3, knockback: 10, critChance: 0.08, color: "#FF8A65",
    projectileRadius: 4, projectileLife: 2.6, wallBounces: 1,
    statusEffect: "burn", statusDuration: 2.1,
    mechanic: "Three bouncing incendiary plasma shells.", projectileStyle: "plasma",
    trailLength: 10, spinRate: 7, muzzleEffect: "rocket", impactEffect: "flame", recoil: 1.4,
    renderOffsetX: 13, renderOffsetY: -1, muzzleOffsetX: 23, muzzleOffsetY: -4,
  },

  service_revolver: {
    id: "service_revolver", name: "Service Revolver", category: "sidearm", rarity: "uncommon",
    damage: 6, fireRate: 1.55, bulletSpeed: 205, manaCost: 0, spread: 0.035,
    pelletCount: 1, knockback: 8, critChance: 0.18, critMultiplier: 2.25, color: "#F5C16C",
    projectileLife: 2.1,
    mechanic: "Zero-energy heavy round with strong critical hits.", projectileStyle: "bullet",
    trailLength: 8, muzzleEffect: "smoke", recoil: 0.9,
    renderOffsetX: 12, renderOffsetY: -2, muzzleOffsetX: 22, muzzleOffsetY: -4,
  },
  nail_driver: {
    id: "nail_driver", name: "Nail Driver", category: "smg", rarity: "common",
    damage: 1, fireRate: 8, bulletSpeed: 175, manaCost: 0, spread: 0.12,
    pelletCount: 1, knockback: 3, critChance: 0.06, color: "#C7D3DD",
    pierce: 1, projectileLife: 1.7,
    mechanic: "Free rapid nails that penetrate one target.", projectileStyle: "tracer", trailLength: 9,
    renderOffsetX: 13, renderOffsetY: -1, muzzleOffsetX: 23, muzzleOffsetY: -4,
  },
  liberator: {
    id: "liberator", name: "Liberator Pistol", category: "sidearm", rarity: "uncommon",
    damage: 13, fireRate: 0.5, bulletSpeed: 180, manaCost: 0, spread: 0.16,
    pelletCount: 1, knockback: 12, critChance: 0.3, critMultiplier: 2.5, color: "#D8C6A1",
    projectileLife: 2.25,
    mechanic: "Crude single-shot pistol: slow, inaccurate and brutally strong.", projectileStyle: "bullet",
    trailLength: 12, muzzleEffect: "smoke", recoil: 1.6,
    renderOffsetX: 11, renderOffsetY: -1, muzzleOffsetX: 20, muzzleOffsetY: -4,
  },
  vector_9: {
    id: "vector_9", name: "Vector-9", category: "smg", rarity: "rare",
    damage: 1, fireRate: 10, bulletSpeed: 220, manaCost: 0, spread: 0.16,
    pelletCount: 1, knockback: 1, critChance: 0.05, color: "#79D7FF",
    projectileLife: 1.35,
    mechanic: "Zero-energy hyper-burst SMG: extreme rate, low per-shot damage.", projectileStyle: "tracer",
    trailLength: 17, muzzleEffect: "flash", recoil: 0.15,
    renderOffsetX: 14, renderOffsetY: -1, muzzleOffsetX: 24, muzzleOffsetY: -4,
  },
  plasma_caster: {
    id: "plasma_caster", name: "Plasma Caster", category: "energy", rarity: "rare",
    damage: 7, fireRate: 2.2, bulletSpeed: 145, manaCost: 2, spread: 0.05,
    pelletCount: 1, knockback: 6, critChance: 0.1, color: "#7DFFB3",
    projectileRadius: 4, projectileLife: 2.5,
    mechanic: "Slow plasma sphere bends toward nearby enemies.", projectileStyle: "plasma",
    homingStrength: 2.8, trailLength: 10, muzzleEffect: "electric", impactEffect: "plasma",
    renderOffsetX: 12, renderOffsetY: -1, muzzleOffsetX: 22, muzzleOffsetY: -4,
  },
  tesla_carbine: {
    id: "tesla_carbine", name: "Tesla Carbine", category: "special", rarity: "rare",
    damage: 5, fireRate: 3, bulletSpeed: 245, manaCost: 3, spread: 0.03,
    pelletCount: 1, knockback: 3, critChance: 0.12, color: "#8DF6FF",
    projectileLife: 1.9,
    mechanic: "Lightning bolt chains through two nearby targets.", projectileStyle: "lightning",
    trailLength: 24, chainCount: 2, chainRange: 58, chainDamageMultiplier: 0.72,
    muzzleEffect: "electric", impactEffect: "electric",
    renderOffsetX: 13, renderOffsetY: -1, muzzleOffsetX: 23, muzzleOffsetY: -4,
  },
  ripper_disc: {
    id: "ripper_disc", name: "Ripper Disc", category: "special", rarity: "rare",
    damage: 6, fireRate: 2, bulletSpeed: 165, manaCost: 3, spread: 0.02,
    pelletCount: 1, knockback: 7, critChance: 0.14, color: "#FF6B9A",
    projectileRadius: 5, projectileLife: 3.2, pierce: 2, wallBounces: 3,
    mechanic: "Spinning disc pierces enemies and ricochets three times.", projectileStyle: "disc",
    spinRate: 16, trailLength: 8, impactEffect: "slash",
    renderOffsetX: 11, renderOffsetY: -1, muzzleOffsetX: 20, muzzleOffsetY: -4,
  },
  micro_rocket: {
    id: "micro_rocket", name: "Micro-Rocket Pod", category: "launcher", rarity: "rare",
    damage: 10, fireRate: 1.25, bulletSpeed: 118, manaCost: 4, spread: 0.06,
    pelletCount: 1, knockback: 12, critChance: 0.1, color: "#FFB36B",
    projectileRadius: 4, projectileLife: 3,
    mechanic: "Homing rocket detonates in a damaging blast.", projectileStyle: "rocket",
    homingStrength: 1.45, acceleration: 42, explosionRadius: 30, explosionDamageMultiplier: 0.8,
    muzzleEffect: "rocket", impactEffect: "explosion", recoil: 1.2,
    renderOffsetX: 14, renderOffsetY: -1, muzzleOffsetX: 25, muzzleOffsetY: -4,
  },

  kingmaker: {
    id: "kingmaker", name: "Kingmaker", category: "sidearm", rarity: "legendary",
    damage: 7, fireRate: 3, bulletSpeed: 225, manaCost: 2, spread: 0.04,
    pelletCount: 1, knockback: 7, critChance: 0.3, critMultiplier: 2.25, color: "#F9E79F",
    pierce: 1, projectileLife: 2.2, series: "vanguard",
    mechanic: "Royal high-caliber beam round pierces one target.", projectileStyle: "tracer",
    trailLength: 20, muzzleEffect: "smoke", recoil: 0.85,
    renderOffsetX: 12, renderOffsetY: -1, muzzleOffsetX: 22, muzzleOffsetY: -4,
  },
  storm_repeater: {
    id: "storm_repeater", name: "Storm Repeater", category: "rifle", rarity: "legendary",
    damage: 3, fireRate: 4.5, bulletSpeed: 230, manaCost: 3, spread: 0.18,
    pelletCount: 2, knockback: 4, critChance: 0.14, color: "#F4D03F",
    wallBounces: 1, projectileLife: 1.9, series: "vanguard",
    mechanic: "Twin storm tracers ricochet from walls.", projectileStyle: "lightning",
    trailLength: 20, muzzleEffect: "electric", impactEffect: "electric",
    renderOffsetX: 13, renderOffsetY: -1, muzzleOffsetX: 23, muzzleOffsetY: -4,
  },
  starfall_array: {
    id: "starfall_array", name: "Starfall Array", category: "energy", rarity: "legendary",
    damage: 3, fireRate: 1.8, bulletSpeed: 245, manaCost: 5, spread: 0.48,
    pelletCount: 5, knockback: 4, critChance: 0.15, color: "#AF7AC5",
    pierce: 1, projectileLife: 2.15, series: "aether",
    mechanic: "Five homing star-plasma shards spread across the room.", projectileStyle: "plasma",
    homingStrength: 1.25, trailLength: 14, spinRate: 5, muzzleEffect: "electric", impactEffect: "plasma",
    renderOffsetX: 12, renderOffsetY: -1, muzzleOffsetX: 22, muzzleOffsetY: -4,
  },
  void_rail: {
    id: "void_rail", name: "Void Rail", category: "energy", rarity: "legendary",
    damage: 18, fireRate: 0.9, bulletSpeed: 360, manaCost: 7, spread: 0,
    pelletCount: 1, knockback: 16, critChance: 0.25, color: "#BB8FCE",
    projectileRadius: 3, pierce: 5, projectileLife: 2.8, series: "aether",
    mechanic: "Room-cutting rail beam penetrates six targets.", projectileStyle: "beam",
    trailLength: 54, beamWidth: 3, muzzleEffect: "beam", impactEffect: "plasma", recoil: 1.5,
    renderOffsetX: 15, renderOffsetY: -1, muzzleOffsetX: 27, muzzleOffsetY: -4,
  },
  dragon_breath: {
    id: "dragon_breath", name: "Dragon Breath", category: "shotgun", rarity: "legendary",
    damage: 2, fireRate: 1.1, bulletSpeed: 138, manaCost: 6, spread: 0.86,
    pelletCount: 12, knockback: 7, critChance: 0.08, color: "#FF7043",
    projectileLife: 1.15, statusEffect: "burn", statusDuration: 2.8,
    series: "phoenix",
    mechanic: "Twelve-particle incendiary flame cone.", projectileStyle: "flame",
    drag: 1.25, muzzleEffect: "flame", impactEffect: "flame", recoil: 1.2,
    renderOffsetX: 14, renderOffsetY: -1, muzzleOffsetX: 25, muzzleOffsetY: -4,
  },
  siege_breaker: {
    id: "siege_breaker", name: "Siege Breaker", category: "launcher", rarity: "legendary",
    damage: 24, fireRate: 0.6, bulletSpeed: 112, manaCost: 8, spread: 0.02,
    pelletCount: 1, knockback: 20, critChance: 0.18, color: "#FF8C69",
    projectileRadius: 5, projectileLife: 3, wallBounces: 1,
    statusEffect: "burn", statusDuration: 3, series: "phoenix",
    mechanic: "Massive bouncing siege rocket explodes on impact.", projectileStyle: "rocket",
    explosionRadius: 40, explosionDamageMultiplier: 0.9, acceleration: 28,
    muzzleEffect: "rocket", impactEffect: "explosion", recoil: 1.8,
    renderOffsetX: 15, renderOffsetY: -1, muzzleOffsetX: 27, muzzleOffsetY: -4,
  },
  ballistic_knife: {
    id: "ballistic_knife", name: "Ballistic Knife", category: "special", rarity: "uncommon",
    damage: 9, fireRate: 1.1, bulletSpeed: 320, manaCost: 0, spread: 0, pelletCount: 1, knockback: 5, critChance: 0.15, color: "#BDC3C7",
    projectileRadius: 3, projectileLife: 1.2, pierce: 3,
    mechanic: "Thrown blade silently pierces multiple enemies.", projectileStyle: "disc", trailLength: 5, spinRate: 20,
    renderOffsetX: 13, renderOffsetY: -1, muzzleOffsetX: 22, muzzleOffsetY: -3,
  },
  olympia: {
    id: "olympia", name: "Olympia", category: "shotgun", rarity: "common",
    damage: 1, fireRate: 0.8, bulletSpeed: 160, manaCost: 0, spread: 0.9, pelletCount: 12, knockback: 8, critChance: 0.08, color: "#E67E22",
    projectileLife: 1, mechanic: "Classic double barrel burst with devastating close range spread.", projectileStyle: "bullet", trailLength: 4,
    renderOffsetX: 13, renderOffsetY: -1, muzzleOffsetX: 24, muzzleOffsetY: -4,
  },
  ksg_12: {
    id: "ksg_12", name: "KSG 12", category: "shotgun", rarity: "rare",
    damage: 22, fireRate: 0.65, bulletSpeed: 300, manaCost: 2, spread: 0.04, pelletCount: 1, knockback: 18, critChance: 0.2, color: "#F1C40F",
    projectileLife: 2.5, pierce: 1, mechanic: "Slug shotgun fires a powerful accurate projectile.", projectileStyle: "tracer", trailLength: 16,
    renderOffsetX: 14, renderOffsetY: -1, muzzleOffsetX: 26, muzzleOffsetY: -4,
  },
  akimbo_scorpion: {
    id: "akimbo_scorpion", name: "Akimbo Scorpion", category: "smg", rarity: "rare",
    damage: 1, fireRate: 5.5, bulletSpeed: 240, manaCost: 0, spread: 0.3, pelletCount: 2, knockback: 1, critChance: 0.05, color: "#27AE60",
    projectileLife: 1.5, mechanic: "Twin machine pistols unleash an uncontrollable bullet storm.", projectileStyle: "tracer", trailLength: 10,
    renderOffsetX: 12, renderOffsetY: -1, muzzleOffsetX: 23, muzzleOffsetY: -4,
  },
  scavenger: {
    id: "scavenger", name: "Scavenger", category: "launcher", rarity: "rare",
    damage: 18, fireRate: 0.7, bulletSpeed: 110, manaCost: 5, spread: 0, pelletCount: 1, knockback: 20, critChance: 0.15, color: "#3498DB",
    projectileLife: 3, explosionRadius: 32, explosionDamageMultiplier: 1, mechanic: "Explosive sniper round creates a huge blast on impact.", projectileStyle: "rocket", trailLength: 20,
    muzzleEffect: "rocket", impactEffect: "explosion", renderOffsetX: 15, renderOffsetY: -1, muzzleOffsetX: 27, muzzleOffsetY: -4,
  },
  venom_x: {
    id: "venom_x", name: "Venom-X", category: "energy", rarity: "rare",
    damage: 12, fireRate: 1.4, bulletSpeed: 150, manaCost: 5, spread: 0.05, pelletCount: 1, knockback: 10, critChance: 0.1, color: "#2ECC71",
    projectileLife: 2.5, homingStrength: 1.8, mechanic: "Toxic tracking projectile leaves a poisonous cloud.", projectileStyle: "plasma", trailLength: 18,
    impactEffect: "flame", renderOffsetX: 14, renderOffsetY: -1, muzzleOffsetX: 25, muzzleOffsetY: -4,
  },
  ray_gun: {
    id: "ray_gun", name: "Ray Gun", category: "energy", rarity: "legendary",
    damage: 20, fireRate: 1.6, bulletSpeed: 260, manaCost: 6, spread: 0, pelletCount: 1, knockback: 14, critChance: 0.25, color: "#00F2FE",
    projectileRadius: 5, projectileLife: 2, explosionRadius: 24, explosionDamageMultiplier: 0.9, mechanic: "Classic wonder weapon fires explosive plasma shots.", projectileStyle: "plasma", trailLength: 28,
    impactEffect: "explosion", muzzleEffect: "beam", renderOffsetX: 14, renderOffsetY: -1, muzzleOffsetX: 26, muzzleOffsetY: -4,
  },
  wunderwaffe: {
    id: "wunderwaffe", name: "Wunderwaffe DG-2", category: "energy", rarity: "legendary",
    damage: 16, fireRate: 0.75, bulletSpeed: 280, manaCost: 8, spread: 0, pelletCount: 1, knockback: 12, critChance: 0.2, color: "#8DF6FF",
    projectileLife: 2, chainCount: 5, chainRange: 80, chainDamageMultiplier: 0.65, mechanic: "Lightning bolt jumps between groups of enemies.", projectileStyle: "lightning", trailLength: 35,
    impactEffect: "electric", muzzleEffect: "electric", renderOffsetX: 15, renderOffsetY: -1, muzzleOffsetX: 27, muzzleOffsetY: -4,
  },
  minishark: {
    id: "minishark", name: "Minishark", category: "rifle", rarity: "common",
    damage: 1, fireRate: 11.5, bulletSpeed: 235, manaCost: 0, spread: 0.17,
    pelletCount: 1, knockback: 0, critChance: 0.05, color: "#D6A14D",
    projectileLife: 1.55,
    mechanic: "Shark-bodied rotary gun trades per-shot damage for extreme automatic fire.",
    projectileStyle: "tracer", trailLength: 9, recoil: 0.12,
    renderOffsetX: 13, renderOffsetY: -1, muzzleOffsetX: 25, muzzleOffsetY: -4,
  },
  water_bolt: {
    id: "water_bolt", name: "Water Bolt", category: "magic", rarity: "uncommon",
    damage: 6, fireRate: 1.5, bulletSpeed: 92, manaCost: 3, spread: 0,
    pelletCount: 1, knockback: 4, critChance: 0.08, color: "#4FC3F7",
    projectileRadius: 5, projectileLife: 6, pierce: 9, wallBounces: 5,
    mechanic: "A slow luminous water sphere pierces enemies and ricochets five times.",
    projectileStyle: "water", trailLength: 12, repeatHitDelay: 0.45, impactEffect: "plasma",
    renderOffsetX: 10, renderOffsetY: -1, muzzleOffsetX: 18, muzzleOffsetY: -4,
  },
  stardust_dragon_staff: {
    id: "stardust_dragon_staff", name: "Stardust Dragon Staff", category: "summon", rarity: "rare",
    damage: 6, fireRate: 0.4, bulletSpeed: 135, manaCost: 8, spread: 0,
    pelletCount: 1, knockback: 2, critChance: 0, color: "#5DADE2",
    projectileRadius: 5, projectileLife: 8, pierce: 99, homingStrength: 5.4,
    mechanic: "Summons a wall-phasing dragon; recasting lengthens and strengthens the existing summon.",
    projectileStyle: "dragon", trailLength: 18, attackMode: "summon", ignoreWalls: true, repeatHitDelay: 0.6, tetherRange: 150, returnStrength: 7,
    muzzleEffect: "electric", impactEffect: "plasma", recoil: 0.2,
    renderOffsetX: 13, renderOffsetY: -1, muzzleOffsetX: 22, muzzleOffsetY: -4,
  },
  terrarian: {
    id: "terrarian", name: "Terrarian", category: "yoyo", rarity: "legendary",
    damage: 8, fireRate: 0.9, bulletSpeed: 190, manaCost: 4, spread: 0,
    pelletCount: 1, knockback: 6, critChance: 0.18, color: "#52D6C6",
    projectileRadius: 6, projectileLife: 0.35, pierce: 99, homingStrength: 6.2,
    mechanic: "A luminite yoyo remains tethered to the wielder and repeatedly grinds nearby targets.",
    projectileStyle: "yoyo", attackMode: "yoyo", repeatHitDelay: 0.35, tetherRange: 108, returnStrength: 10,
    impactEffect: "plasma", recoil: 0.15,
    renderOffsetX: 9, renderOffsetY: -1, muzzleOffsetX: 17, muzzleOffsetY: -3,
  },
  last_prism: {
    id: "last_prism", name: "Last Prism", category: "magic", rarity: "legendary",
    damage: 1, fireRate: 4, bulletSpeed: 360, manaCost: 1.5, spread: 0.52,
    pelletCount: 6, knockback: 2, critChance: 0.12, color: "#FFFFFF",
    projectileRadius: 2, projectileLife: 0.42, pierce: 4,
    mechanic: "Six rotating rays converge while held, becoming a thicker, stronger and more costly beam.",
    projectileStyle: "prism", trailLength: 58, beamWidth: 1, attackMode: "channel", channelTime: 3.2,
    muzzleEffect: "beam", impactEffect: "plasma", recoil: 0.15,
    renderOffsetX: 12, renderOffsetY: -1, muzzleOffsetX: 22, muzzleOffsetY: -4,
  },
  zenith: {
    id: "zenith", name: "Zenith", category: "sword", rarity: "legendary",
    damage: 6, fireRate: 1.4, bulletSpeed: 225, manaCost: 6, spread: 1.7,
    pelletCount: 3, knockback: 7, critChance: 0.2, color: "#66F7C5",
    projectileRadius: 6, projectileLife: 1.9, pierce: 99, homingStrength: 4.2,
    mechanic: "Three spectral swords arc through walls, seek enemies and strike again on their return path.",
    projectileStyle: "sword", attackMode: "melee", ignoreWalls: true, repeatHitDelay: 0.22, tetherRange: 210, returnStrength: 3.4,
    muzzleEffect: "electric", impactEffect: "slash", recoil: 0.7,
    renderOffsetX: 12, renderOffsetY: -1, muzzleOffsetX: 23, muzzleOffsetY: -4,
  },

};

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
  };
}

export function getAvailableWeapons(_globalStageIndex = 1): WeaponData[] {
  return Object.values(WEAPONS);
}

export type WeaponRollContext = "shop" | "treasure" | "boss";

const WEAPON_ROLL_WEIGHTS: Record<WeaponRollContext, Record<WeaponRarity, number>> = {
  shop: { common: 4.6, uncommon: 3.15, rare: 1.55, legendary: 0.48 },
  treasure: { common: 2.1, uncommon: 3.4, rare: 2.5, legendary: 0.72 },
  boss: { common: 0.15, uncommon: 1.2, rare: 5.5, legendary: 3.2 },
};

export function rollAvailableWeapon(
  globalStageIndex: number,
  random: () => number = Math.random,
  context: WeaponRollContext = "shop",
  excludedIds: Iterable<string> = [],
): WeaponData {
  const excluded = new Set(excludedIds);
  const pool = getAvailableWeapons(globalStageIndex).filter(weapon => !excluded.has(weapon.id));
  const fallback = getAvailableWeapons(globalStageIndex)[0] ?? WEAPONS.pistol;
  if (pool.length === 0) return fallback;

  const stage = Math.max(1, Math.floor(globalStageIndex || 1));
  const weights = pool.map(weapon => {
    const base = WEAPON_ROLL_WEIGHTS[context][weapon.rarity];
    if (weapon.rarity !== "legendary") return base;
    return base * (1 + Math.max(0, stage - 10) * 0.07);
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

export function createStarterWeaponSlots(starterWeapon: string): WeaponSlots {
  const starter = isWeaponId(starterWeapon) ? starterWeapon : "pistol";
  return starter === "pistol" ? ["pistol"] : [starter, "pistol"];
}
