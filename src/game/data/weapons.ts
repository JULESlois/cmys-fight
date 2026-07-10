export type WeaponCategory = "sidearm" | "shotgun" | "energy";
export type WeaponRarity = "common" | "uncommon" | "rare";
export type WeaponSlots = [string, string?];

export interface WeaponData {
  id: string;
  name: string;
  category: WeaponCategory;
  rarity: WeaponRarity;
  damage: number;
  fireRate: number; // shots per second
  bulletSpeed: number;
  manaCost: number;
  spread: number; // radians
  pelletCount: number;
  knockback: number;
  critChance: number;
  color: string;
}

export const WEAPONS: Record<string, WeaponData> = {
  pistol: {
    id: "pistol",
    name: "Old Pistol",
    category: "sidearm",
    rarity: "common",
    damage: 3,
    fireRate: 3, // 3 shots per second -> ~333ms cooldown
    bulletSpeed: 150,
    manaCost: 0,
    spread: 0.1,
    pelletCount: 1,
    knockback: 5,
    critChance: 0.08,
    color: "#F39C12",
  },
  shotgun: {
    id: "shotgun",
    name: "Rusty Shotgun",
    category: "shotgun",
    rarity: "uncommon",
    damage: 2, // per pellet
    fireRate: 1, // 1 shot per second
    bulletSpeed: 120,
    manaCost: 2,
    spread: 0.4,
    pelletCount: 5,
    knockback: 7,
    critChance: 0.05,
    color: "#E74C3C",
  },
  laser: {
    id: "laser",
    name: "Energy Blaster",
    category: "energy",
    rarity: "rare",
    damage: 5,
    fireRate: 5, // 5 shots per second
    bulletSpeed: 300,
    manaCost: 1,
    spread: 0,
    pelletCount: 1,
    knockback: 3,
    critChance: 0.12,
    color: "#00F2FE",
  }
};

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
