export type EnemyRole = "melee" | "ranged" | "boss";
export type EnemyBehavior = "melee" | "charge" | "shoot" | "scatter" | "summon" | "area" | "boss";
export type EnemyTheme = "forest" | "dungeon" | "snow" | "lava";

export interface EnemyDefinition {
  id: string;
  name: string;
  theme: EnemyTheme;
  role: EnemyRole;
  behavior: EnemyBehavior;
  color: string;
  maxHp: number;
  speed: number;
  radius: number;
  attackDamage: number;
  attackInterval: number;
  attackWindup: number;
  projectileSpeed?: number;
  projectileCount?: number;
  projectileSpread?: number;
  chargeDistance?: number;
  areaRadius?: number;
  summonEnemyId?: string;
}

export const ENEMIES: Record<string, EnemyDefinition> = {
  moss_brute: {
    id: "moss_brute", name: "Moss Brute", theme: "forest", role: "melee", behavior: "melee",
    color: "#4CAF50", maxHp: 11, speed: 36, radius: 8, attackDamage: 2, attackInterval: 0.9, attackWindup: 0.34,
  },
  thorn_archer: {
    id: "thorn_archer", name: "Thorn Archer", theme: "forest", role: "ranged", behavior: "shoot",
    color: "#8BC34A", maxHp: 7, speed: 26, radius: 8, attackDamage: 2, attackInterval: 1.4, attackWindup: 0.48,
    projectileSpeed: 90,
  },
  boar_charger: {
    id: "boar_charger", name: "Bramble Boar", theme: "forest", role: "melee", behavior: "charge",
    color: "#795548", maxHp: 9, speed: 31, radius: 9, attackDamage: 3, attackInterval: 1.55, attackWindup: 0.62,
    chargeDistance: 54,
  },
  forest_guardian: {
    id: "forest_guardian", name: "Forest Guardian", theme: "forest", role: "boss", behavior: "boss",
    color: "#2E7D32", maxHp: 50, speed: 28, radius: 14, attackDamage: 3, attackInterval: 2.35, attackWindup: 0.65,
    projectileSpeed: 60, projectileCount: 8,
  },

  bone_guard: {
    id: "bone_guard", name: "Bone Guard", theme: "dungeon", role: "melee", behavior: "melee",
    color: "#B0BEC5", maxHp: 13, speed: 34, radius: 8, attackDamage: 2, attackInterval: 0.82, attackWindup: 0.3,
  },
  bolt_cultist: {
    id: "bolt_cultist", name: "Bolt Cultist", theme: "dungeon", role: "ranged", behavior: "scatter",
    color: "#9C27B0", maxHp: 8, speed: 23, radius: 8, attackDamage: 2, attackInterval: 1.6, attackWindup: 0.58,
    projectileSpeed: 86, projectileCount: 3, projectileSpread: 0.28,
  },
  grave_summoner: {
    id: "grave_summoner", name: "Grave Summoner", theme: "dungeon", role: "ranged", behavior: "summon",
    color: "#673AB7", maxHp: 10, speed: 20, radius: 9, attackDamage: 2, attackInterval: 2.7, attackWindup: 0.82,
    summonEnemyId: "bone_guard",
  },
  crypt_overseer: {
    id: "crypt_overseer", name: "Crypt Overseer", theme: "dungeon", role: "boss", behavior: "boss",
    color: "#6A1B9A", maxHp: 58, speed: 27, radius: 15, attackDamage: 3, attackInterval: 2.2, attackWindup: 0.62,
    projectileSpeed: 62, projectileCount: 10,
  },

  frost_hound: {
    id: "frost_hound", name: "Frost Hound", theme: "snow", role: "melee", behavior: "charge",
    color: "#81D4FA", maxHp: 10, speed: 40, radius: 8, attackDamage: 3, attackInterval: 1.4, attackWindup: 0.5,
    chargeDistance: 60,
  },
  ice_shaman: {
    id: "ice_shaman", name: "Ice Shaman", theme: "snow", role: "ranged", behavior: "area",
    color: "#4FC3F7", maxHp: 9, speed: 21, radius: 8, attackDamage: 3, attackInterval: 2.0, attackWindup: 0.78,
    areaRadius: 31,
  },
  snow_turret: {
    id: "snow_turret", name: "Snow Turret", theme: "snow", role: "ranged", behavior: "scatter",
    color: "#B3E5FC", maxHp: 12, speed: 14, radius: 9, attackDamage: 2, attackInterval: 1.35, attackWindup: 0.42,
    projectileSpeed: 100, projectileCount: 4, projectileSpread: 0.22,
  },
  frost_titan: {
    id: "frost_titan", name: "Frost Titan", theme: "snow", role: "boss", behavior: "boss",
    color: "#0288D1", maxHp: 64, speed: 25, radius: 16, attackDamage: 4, attackInterval: 2.15, attackWindup: 0.68,
    projectileSpeed: 64, projectileCount: 10,
  },

  ember_knight: {
    id: "ember_knight", name: "Ember Knight", theme: "lava", role: "melee", behavior: "melee",
    color: "#FF7043", maxHp: 15, speed: 36, radius: 9, attackDamage: 3, attackInterval: 0.75, attackWindup: 0.26,
  },
  magma_spitter: {
    id: "magma_spitter", name: "Magma Spitter", theme: "lava", role: "ranged", behavior: "scatter",
    color: "#FF5722", maxHp: 10, speed: 24, radius: 8, attackDamage: 3, attackInterval: 1.45, attackWindup: 0.46,
    projectileSpeed: 96, projectileCount: 5, projectileSpread: 0.34,
  },
  cinder_oracle: {
    id: "cinder_oracle", name: "Cinder Oracle", theme: "lava", role: "ranged", behavior: "area",
    color: "#FF9800", maxHp: 12, speed: 22, radius: 9, attackDamage: 4, attackInterval: 1.9, attackWindup: 0.7,
    areaRadius: 35,
  },
  inferno_core: {
    id: "inferno_core", name: "Inferno Core", theme: "lava", role: "boss", behavior: "boss",
    color: "#E64A19", maxHp: 70, speed: 29, radius: 16, attackDamage: 4, attackInterval: 2.0, attackWindup: 0.6,
    projectileSpeed: 68, projectileCount: 12,
  },
};

const CHAPTER_POOLS: Record<EnemyTheme, string[]> = {
  forest: ["moss_brute", "thorn_archer", "boar_charger"],
  dungeon: ["bone_guard", "bolt_cultist", "grave_summoner"],
  snow: ["frost_hound", "ice_shaman", "snow_turret"],
  lava: ["ember_knight", "magma_spitter", "cinder_oracle"],
};

const CHAPTER_BOSSES: Record<EnemyTheme, string> = {
  forest: "forest_guardian",
  dungeon: "crypt_overseer",
  snow: "frost_titan",
  lava: "inferno_core",
};

export function isEnemyId(value: unknown): value is string {
  return typeof value === "string" && value in ENEMIES;
}

export function getEnemyDefinition(id: string): EnemyDefinition {
  return ENEMIES[id] ?? ENEMIES.moss_brute;
}

export function getEnemyPool(theme: EnemyTheme, role?: EnemyRole): EnemyDefinition[] {
  const pool = (CHAPTER_POOLS[theme] ?? CHAPTER_POOLS.forest).map(id => ENEMIES[id]);
  return role ? pool.filter(definition => definition.role === role) : pool;
}

export function getBossDefinition(theme: EnemyTheme): EnemyDefinition {
  return ENEMIES[CHAPTER_BOSSES[theme] ?? CHAPTER_BOSSES.forest];
}

export function getThemeForChapter(chapterIndex: number): EnemyTheme {
  const themes: EnemyTheme[] = ["forest", "dungeon", "snow", "lava"];
  return themes[(Math.max(1, Math.floor(chapterIndex)) - 1) % themes.length];
}
