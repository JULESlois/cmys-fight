import type { StatusEffectId } from "../combat/StatusEffectSystem";

export type EnemyRole = "melee" | "ranged" | "boss";
export type EnemyBehavior = "melee" | "charge" | "shoot" | "scatter" | "summon" | "area" | "sniper" | "lob" | "support" | "orbit" | "boss";
export type EnemyTheme = "forest" | "dungeon" | "snow" | "lava" | "sealed_library" | "forge_core" | "cooling_canal" | "ash_catacombs" | "deep_prison" | "deep_archive" | "observatory" | "sealed_armory" | "overgrown_archive" | string;
export type EnemyVisual = "brute" | "archer" | "beast" | "bird" | "mushroom" | "lancer" | "moth" | "guard" | "cultist" | "summoner" | "jailer" | "hound" | "coffin" | "lantern" | "shaman" | "turret" | "hazmat" | "wisp" | "sniper" | "servitor" | "knight" | "spitter" | "oracle" | "horse" | "beetle" | "mortar" | "smith" | "boss";
export type EnemyProjectileKind = "standard" | "needle" | "shell" | "orbit" | "support";
export type BossPattern = "grove" | "broadcast" | "crypt" | "kennel" | "frost" | "sample" | "inferno" | "code" | "tome_lord" | "forge_prime" | "glacier_director" | "war_engine" | "star_sentinel" | "bone_sovereign" | "warden_alpha" | "echo_mind";

export interface EnemyDefinition {
  id: string;
  name: string;
  theme: EnemyTheme;
  role: EnemyRole;
  behavior: EnemyBehavior;
  visual: EnemyVisual;
  bossPattern?: BossPattern;
  color: string;
  maxHp: number;
  speed: number;
  radius: number;
  /** Optional authored projectile hurtbox for native-resolution monster art. */
  hitboxRadius?: number;
  hitboxOffsetY?: number;
  /** Optional authored ground shadow width in screen pixels. */
  shadowWidth?: number;
  /** Runtime scale for authored pixel art. Defaults keep regulars near player size. */
  renderScale?: number;
  attackDamage: number;
  attackInterval: number;
  attackWindup: number;
  attackRange?: number;
  minimumWindup?: number;
  minimumAttackInterval?: number;
  requiresLineOfSight?: boolean;
  projectileSpeed?: number;
  projectileCount?: number;
  projectileSpread?: number;
  projectileKind?: EnemyProjectileKind;
  chargeDistance?: number;
  areaRadius?: number;
  summonEnemyId?: string;
  statusEffect?: StatusEffectId;
  statusDuration?: number;
  introducedAtStage?: number;
}

const enemy = (definition: EnemyDefinition) => definition;

export const ENEMIES: Record<string, EnemyDefinition> = {
  moss_brute: enemy({
    id: "moss_brute", name: "Moss Brute", theme: "forest", role: "melee", behavior: "melee", visual: "brute",
    color: "#4CAF50", maxHp: 11, speed: 36, radius: 8, hitboxRadius: 18, hitboxOffsetY: -15, shadowWidth: 21,
    attackDamage: 2, attackInterval: 0.9, attackWindup: 0.34,
  }),
  thorn_archer: enemy({
    id: "thorn_archer", name: "Thorn Archer", theme: "forest", role: "ranged", behavior: "shoot", visual: "archer",
    color: "#8BC34A", maxHp: 7, speed: 26, radius: 8, hitboxRadius: 17, hitboxOffsetY: -15, shadowWidth: 18,
    attackDamage: 2, attackInterval: 1.4, attackWindup: 0.48,
    projectileSpeed: 90, statusEffect: "poison", statusDuration: 2.4,
  }),
  boar_charger: enemy({
    id: "boar_charger", name: "Bramble Boar", theme: "forest", role: "melee", behavior: "charge", visual: "beast",
    color: "#795548", maxHp: 9, speed: 31, radius: 9, hitboxRadius: 17, hitboxOffsetY: -12, shadowWidth: 28,
    attackDamage: 3, attackInterval: 1.55, attackWindup: 0.62,
    chargeDistance: 54, statusEffect: "root", statusDuration: 0.65,
  }),
  dingdong_fowl: enemy({
    id: "dingdong_fowl", name: "Ding-Dong Fowl", theme: "forest", role: "ranged", behavior: "scatter", visual: "bird", introducedAtStage: 2,
    color: "#F1C40F", maxHp: 6, speed: 34, radius: 7, hitboxRadius: 20, hitboxOffsetY: -18, shadowWidth: 19,
    attackDamage: 1, attackInterval: 1.05, attackWindup: 0.34,
    projectileSpeed: 118, projectileCount: 4, projectileSpread: 0.2,
  }),
  spore_mimic: enemy({
    id: "spore_mimic", name: "Spore Mimic", theme: "forest", role: "ranged", behavior: "area", visual: "mushroom", introducedAtStage: 3,
    color: "#9CCC65", maxHp: 12, speed: 18, radius: 9, hitboxRadius: 19, hitboxOffsetY: -15, shadowWidth: 27,
    attackDamage: 2, attackInterval: 2.2, attackWindup: 0.82,
    attackRange: 145, minimumWindup: 0.65, minimumAttackInterval: 1.55, requiresLineOfSight: true,
    areaRadius: 20, statusEffect: "poison", statusDuration: 3,
  }),
  root_lancer: enemy({
    id: "root_lancer", name: "Root Lancer", theme: "forest", role: "ranged", behavior: "sniper", visual: "lancer", introducedAtStage: 2,
    color: "#6F9F4B", maxHp: 9, speed: 18, radius: 7, hitboxRadius: 19, hitboxOffsetY: -18, shadowWidth: 21,
    attackDamage: 3, attackInterval: 1.9, attackWindup: 0.88, attackRange: 178, requiresLineOfSight: true,
    projectileSpeed: 205, projectileKind: "needle", statusEffect: "root", statusDuration: 0.35,
  }),
  petal_moth: enemy({
    id: "petal_moth", name: "Petal Moth", theme: "forest", role: "ranged", behavior: "orbit", visual: "moth", introducedAtStage: 3,
    color: "#E98FB2", maxHp: 7, speed: 38, radius: 7, hitboxRadius: 18, hitboxOffsetY: -17, shadowWidth: 20,
    attackDamage: 1, attackInterval: 1.15, attackWindup: 0.42, attackRange: 150,
    projectileSpeed: 92, projectileCount: 3, projectileSpread: 0.48, projectileKind: "orbit", statusEffect: "poison", statusDuration: 1.8,
  }),
  forest_guardian: enemy({
    id: "forest_guardian", name: "Forest Guardian", theme: "forest", role: "boss", behavior: "boss", visual: "boss", bossPattern: "grove",
    color: "#2E7D32", maxHp: 50, speed: 28, radius: 14, hitboxRadius: 32, hitboxOffsetY: -23, shadowWidth: 39,
    attackDamage: 3, attackInterval: 2.35, attackWindup: 0.65,
    projectileSpeed: 60, projectileCount: 8, summonEnemyId: "dingdong_fowl", statusEffect: "poison", statusDuration: 2.2,
  }),
  broadcast_rooster: enemy({
    id: "broadcast_rooster", name: "Broadcast Rooster", theme: "forest", role: "boss", behavior: "boss", visual: "bird", bossPattern: "broadcast",
    color: "#D4AC0D", maxHp: 48, speed: 34, radius: 14, hitboxRadius: 34, hitboxOffsetY: -26, shadowWidth: 37,
    attackDamage: 3, attackInterval: 1.95, attackWindup: 0.52,
    projectileSpeed: 78, projectileCount: 6, summonEnemyId: "dingdong_fowl",
  }),

  bone_guard: enemy({
    id: "bone_guard", name: "Bone Guard", theme: "dungeon", role: "melee", behavior: "melee", visual: "guard",
    color: "#B0BEC5", maxHp: 13, speed: 34, radius: 8, hitboxRadius: 19, hitboxOffsetY: -16, shadowWidth: 21,
    attackDamage: 2, attackInterval: 0.82, attackWindup: 0.3,
  }),
  bolt_cultist: enemy({
    id: "bolt_cultist", name: "Bolt Cultist", theme: "dungeon", role: "ranged", behavior: "scatter", visual: "cultist",
    color: "#9C27B0", maxHp: 8, speed: 23, radius: 8, hitboxRadius: 18, hitboxOffsetY: -16, shadowWidth: 20,
    attackDamage: 2, attackInterval: 1.6, attackWindup: 0.58,
    projectileSpeed: 86, projectileCount: 3, projectileSpread: 0.28,
  }),
  grave_summoner: enemy({
    id: "grave_summoner", name: "Grave Summoner", theme: "dungeon", role: "ranged", behavior: "summon", visual: "summoner",
    color: "#673AB7", maxHp: 10, speed: 20, radius: 9, hitboxRadius: 22, hitboxOffsetY: -20, shadowWidth: 23,
    attackDamage: 2, attackInterval: 2.7, attackWindup: 0.82,
    summonEnemyId: "bone_guard",
  }),
  bark_hound: enemy({
    id: "bark_hound", name: "Bark Hound", theme: "dungeon", role: "melee", behavior: "charge", visual: "hound", introducedAtStage: 2,
    color: "#8D6E63", maxHp: 10, speed: 43, radius: 8, hitboxRadius: 18, hitboxOffsetY: -13, shadowWidth: 35,
    attackDamage: 3, attackInterval: 1.35, attackWindup: 0.42,
    chargeDistance: 66,
  }),
  chain_jailer: enemy({
    id: "chain_jailer", name: "Chain Jailer", theme: "dungeon", role: "ranged", behavior: "area", visual: "jailer", introducedAtStage: 3,
    color: "#78909C", maxHp: 14, speed: 18, radius: 10, hitboxRadius: 22, hitboxOffsetY: -18, shadowWidth: 27,
    attackDamage: 2, attackInterval: 2.15, attackWindup: 0.85,
    attackRange: 140, minimumWindup: 0.7, minimumAttackInterval: 1.55, requiresLineOfSight: true,
    areaRadius: 18, statusEffect: "root", statusDuration: 0.65,
  }),
  coffin_lobber: enemy({
    id: "coffin_lobber", name: "Coffin Lobber", theme: "dungeon", role: "ranged", behavior: "lob", visual: "coffin", introducedAtStage: 2,
    color: "#6E6578", maxHp: 14, speed: 16, radius: 9, hitboxRadius: 23, hitboxOffsetY: -17, shadowWidth: 29,
    attackDamage: 3, attackInterval: 2.15, attackWindup: 0.78, attackRange: 155, requiresLineOfSight: true,
    projectileSpeed: 46, projectileCount: 3, projectileSpread: 0.22, projectileKind: "shell",
  }),
  lantern_wraith: enemy({
    id: "lantern_wraith", name: "Lantern Wraith", theme: "dungeon", role: "ranged", behavior: "orbit", visual: "lantern", introducedAtStage: 3,
    color: "#A66BCE", maxHp: 8, speed: 35, radius: 7, hitboxRadius: 19, hitboxOffsetY: -18, shadowWidth: 21,
    attackDamage: 2, attackInterval: 1.3, attackWindup: 0.5, attackRange: 150,
    projectileSpeed: 86, projectileCount: 4, projectileSpread: 0.62, projectileKind: "orbit",
  }),
  crypt_overseer: enemy({
    id: "crypt_overseer", name: "Crypt Overseer", theme: "dungeon", role: "boss", behavior: "boss", visual: "boss", bossPattern: "crypt",
    color: "#6A1B9A", maxHp: 58, speed: 27, radius: 15, hitboxRadius: 36, hitboxOffsetY: -25, shadowWidth: 45,
    attackDamage: 3, attackInterval: 2.2, attackWindup: 0.62,
    projectileSpeed: 62, projectileCount: 10, summonEnemyId: "bone_guard",
  }),
  kennel_warden: enemy({
    id: "kennel_warden", name: "Kennel Warden", theme: "dungeon", role: "boss", behavior: "boss", visual: "hound", bossPattern: "kennel",
    color: "#8D6E63", maxHp: 62, speed: 31, radius: 15, hitboxRadius: 36, hitboxOffsetY: -22, shadowWidth: 58,
    attackDamage: 4, attackInterval: 2.05, attackWindup: 0.56,
    projectileSpeed: 70, projectileCount: 8, summonEnemyId: "bark_hound", statusEffect: "root", statusDuration: 0.55,
  }),

  frost_hound: enemy({
    id: "frost_hound", name: "Frost Hound", theme: "snow", role: "melee", behavior: "charge", visual: "hound",
    color: "#81D4FA", maxHp: 10, speed: 40, radius: 8, hitboxRadius: 20, hitboxOffsetY: -14, shadowWidth: 31,
    attackDamage: 3, attackInterval: 1.4, attackWindup: 0.5,
    chargeDistance: 60,
  }),
  ice_shaman: enemy({
    id: "ice_shaman", name: "Ice Shaman", theme: "snow", role: "ranged", behavior: "area", visual: "shaman",
    color: "#4FC3F7", maxHp: 9, speed: 21, radius: 8, hitboxRadius: 22, hitboxOffsetY: -20, shadowWidth: 25,
    attackDamage: 2, attackInterval: 2.3, attackWindup: 0.95,
    attackRange: 135, minimumWindup: 0.75, minimumAttackInterval: 1.65, requiresLineOfSight: true,
    areaRadius: 18, statusEffect: "slow", statusDuration: 1.25,
  }),
  snow_turret: enemy({
    id: "snow_turret", name: "Snow Turret", theme: "snow", role: "ranged", behavior: "scatter", visual: "turret",
    color: "#B3E5FC", maxHp: 12, speed: 14, radius: 9, hitboxRadius: 20, hitboxOffsetY: -14, shadowWidth: 31,
    attackDamage: 2, attackInterval: 1.35, attackWindup: 0.42,
    projectileSpeed: 100, projectileCount: 4, projectileSpread: 0.22, statusEffect: "slow", statusDuration: 0.85,
  }),
  white_sampler: enemy({
    id: "white_sampler", name: "White Sampler", theme: "snow", role: "ranged", behavior: "shoot", visual: "hazmat", introducedAtStage: 2,
    color: "#ECEFF1", maxHp: 11, speed: 25, radius: 8, hitboxRadius: 22, hitboxOffsetY: -19, shadowWidth: 25,
    attackDamage: 2, attackInterval: 1.15, attackWindup: 0.4,
    projectileSpeed: 132, statusEffect: "root", statusDuration: 0.4,
  }),
  mirror_wisp: enemy({
    id: "mirror_wisp", name: "Mirror Wisp", theme: "snow", role: "ranged", behavior: "scatter", visual: "wisp", introducedAtStage: 3,
    color: "#80DEEA", maxHp: 7, speed: 32, radius: 7, hitboxRadius: 19, hitboxOffsetY: -16, shadowWidth: 21,
    attackDamage: 2, attackInterval: 1.3, attackWindup: 0.44,
    projectileSpeed: 120, projectileCount: 2, projectileSpread: 0.52,
  }),
  icicle_sniper: enemy({
    id: "icicle_sniper", name: "Icicle Sniper", theme: "snow", role: "ranged", behavior: "sniper", visual: "sniper", introducedAtStage: 2,
    color: "#8FD9E8", maxHp: 9, speed: 19, radius: 7, hitboxRadius: 20, hitboxOffsetY: -19, shadowWidth: 21,
    attackDamage: 3, attackInterval: 1.82, attackWindup: 0.9, attackRange: 184, requiresLineOfSight: true,
    projectileSpeed: 220, projectileKind: "needle", statusEffect: "slow", statusDuration: 0.9,
  }),
  lab_servitor: enemy({
    id: "lab_servitor", name: "Lab Servitor", theme: "snow", role: "ranged", behavior: "support", visual: "servitor", introducedAtStage: 3,
    color: "#D8EDF0", maxHp: 13, speed: 23, radius: 8, hitboxRadius: 21, hitboxOffsetY: -17, shadowWidth: 24,
    attackDamage: 1, attackInterval: 2.55, attackWindup: 0.72, attackRange: 135,
    projectileSpeed: 72, projectileCount: 4, projectileSpread: 1.57, projectileKind: "support",
  }),
  frost_titan: enemy({
    id: "frost_titan", name: "Frost Titan", theme: "snow", role: "boss", behavior: "boss", visual: "boss", bossPattern: "frost",
    color: "#0288D1", maxHp: 64, speed: 25, radius: 16, hitboxRadius: 39, hitboxOffsetY: -28, shadowWidth: 53,
    attackDamage: 4, attackInterval: 2.15, attackWindup: 0.68,
    projectileSpeed: 64, projectileCount: 10, statusEffect: "slow", statusDuration: 1.2,
  }),
  white_director: enemy({
    id: "white_director", name: "White Director", theme: "snow", role: "boss", behavior: "boss", visual: "hazmat", bossPattern: "sample",
    color: "#ECEFF1", maxHp: 61, speed: 24, radius: 15, hitboxRadius: 38, hitboxOffsetY: -27, shadowWidth: 48,
    attackDamage: 3, attackInterval: 1.88, attackWindup: 0.58,
    projectileSpeed: 82, projectileCount: 8, summonEnemyId: "white_sampler", statusEffect: "slow", statusDuration: 1,
  }),

  ember_knight: enemy({
    id: "ember_knight", name: "Ember Knight", theme: "lava", role: "melee", behavior: "melee", visual: "knight",
    color: "#FF7043", maxHp: 15, speed: 36, radius: 9, hitboxRadius: 22, hitboxOffsetY: -18, shadowWidth: 25,
    attackDamage: 3, attackInterval: 0.75, attackWindup: 0.26,
    statusEffect: "burn", statusDuration: 2.2,
  }),
  magma_spitter: enemy({
    id: "magma_spitter", name: "Magma Spitter", theme: "lava", role: "ranged", behavior: "scatter", visual: "spitter",
    color: "#FF5722", maxHp: 10, speed: 24, radius: 8, hitboxRadius: 21, hitboxOffsetY: -12, shadowWidth: 29,
    attackDamage: 3, attackInterval: 1.45, attackWindup: 0.46,
    projectileSpeed: 96, projectileCount: 5, projectileSpread: 0.34, statusEffect: "burn", statusDuration: 2.5,
  }),
  cinder_oracle: enemy({
    id: "cinder_oracle", name: "Cinder Oracle", theme: "lava", role: "ranged", behavior: "area", visual: "oracle",
    color: "#FF9800", maxHp: 12, speed: 22, radius: 9, hitboxRadius: 24, hitboxOffsetY: -21, shadowWidth: 24,
    attackDamage: 4, attackInterval: 2.05, attackWindup: 0.82,
    attackRange: 145, minimumWindup: 0.65, minimumAttackInterval: 1.5, requiresLineOfSight: true,
    areaRadius: 24, statusEffect: "burn", statusDuration: 3,
  }),
  code_horse: enemy({
    id: "code_horse", name: "Code Horse", theme: "lava", role: "melee", behavior: "charge", visual: "horse", introducedAtStage: 2,
    color: "#FFB74D", maxHp: 16, speed: 38, radius: 10, hitboxRadius: 24, hitboxOffsetY: -15, shadowWidth: 36,
    attackDamage: 4, attackInterval: 1.5, attackWindup: 0.5,
    chargeDistance: 72, statusEffect: "burn", statusDuration: 1.7,
  }),
  furnace_beetle: enemy({
    id: "furnace_beetle", name: "Furnace Beetle", theme: "lava", role: "ranged", behavior: "shoot", visual: "beetle", introducedAtStage: 3,
    color: "#D84315", maxHp: 14, speed: 20, radius: 9, hitboxRadius: 22, hitboxOffsetY: -11, shadowWidth: 32,
    attackDamage: 4, attackInterval: 1.65, attackWindup: 0.5,
    projectileSpeed: 76, statusEffect: "burn", statusDuration: 2.8,
  }),
  magma_mortar: enemy({
    id: "magma_mortar", name: "Magma Mortar", theme: "lava", role: "ranged", behavior: "lob", visual: "mortar", introducedAtStage: 2,
    color: "#D9582D", maxHp: 15, speed: 15, radius: 9, hitboxRadius: 23, hitboxOffsetY: -15, shadowWidth: 31,
    attackDamage: 4, attackInterval: 2.05, attackWindup: 0.74, attackRange: 158, requiresLineOfSight: true,
    projectileSpeed: 52, projectileCount: 3, projectileSpread: 0.24, projectileKind: "shell", statusEffect: "burn", statusDuration: 2.3,
  }),
  heat_smith_drone: enemy({
    id: "heat_smith_drone", name: "Heat-Smith Drone", theme: "lava", role: "ranged", behavior: "support", visual: "smith", introducedAtStage: 3,
    color: "#F08A35", maxHp: 14, speed: 25, radius: 8, hitboxRadius: 21, hitboxOffsetY: -17, shadowWidth: 25,
    attackDamage: 2, attackInterval: 2.45, attackWindup: 0.68, attackRange: 138,
    projectileSpeed: 78, projectileCount: 4, projectileSpread: 1.57, projectileKind: "support", statusEffect: "burn", statusDuration: 1.5,
  }),
  inferno_core: enemy({
    id: "inferno_core", name: "Inferno Core", theme: "lava", role: "boss", behavior: "boss", visual: "boss", bossPattern: "inferno",
    color: "#E64A19", maxHp: 70, speed: 29, radius: 16, hitboxRadius: 42, hitboxOffsetY: -28, shadowWidth: 56,
    attackDamage: 4, attackInterval: 2.0, attackWindup: 0.6,
    projectileSpeed: 68, projectileCount: 12, statusEffect: "burn", statusDuration: 2.8,
  }),
  vat_horse_prime: enemy({
    id: "vat_horse_prime", name: "Vat-Horse Prime", theme: "lava", role: "boss", behavior: "boss", visual: "horse", bossPattern: "code",
    color: "#FF8A65", maxHp: 74, speed: 32, radius: 16, hitboxRadius: 44, hitboxOffsetY: -27, shadowWidth: 66,
    attackDamage: 4, attackInterval: 1.82, attackWindup: 0.5,
    projectileSpeed: 76, projectileCount: 10, summonEnemyId: "code_horse", statusEffect: "burn", statusDuration: 2.4,
  }),
  // === PHASE 5: SEALED LIBRARY ===
  cursed_tome: enemy({
    id: "cursed_tome", name: "Cursed Tome", theme: "sealed_library", role: "ranged", behavior: "orbit", visual: "wisp",
    color: "#D17CFF", maxHp: 12, speed: 30, radius: 8, hitboxRadius: 18, hitboxOffsetY: -12, shadowWidth: 20,
    attackDamage: 3, attackInterval: 1.8, attackWindup: 0.5, attackRange: 160,
    projectileSpeed: 75, projectileCount: 3, projectileSpread: 0.3, projectileKind: "orbit", statusEffect: "silence", statusDuration: 2.5,
  }),
  arcane_guard: enemy({
    id: "arcane_guard", name: "Arcane Guard", theme: "sealed_library", role: "melee", behavior: "charge", visual: "guard",
    color: "#782A9C", maxHp: 18, speed: 28, radius: 10, hitboxRadius: 22, hitboxOffsetY: -18, shadowWidth: 26,
    attackDamage: 4, attackInterval: 1.5, attackWindup: 0.6,
    chargeDistance: 60, statusEffect: "silence", statusDuration: 1.5,
  }),
  ink_summoner: enemy({
    id: "ink_summoner", name: "Ink Summoner", theme: "sealed_library", role: "ranged", behavior: "summon", visual: "summoner",
    color: "#9B59B6", maxHp: 14, speed: 18, radius: 9, hitboxRadius: 21, hitboxOffsetY: -18, shadowWidth: 24,
    attackDamage: 2, attackInterval: 3.0, attackWindup: 1.0,
    summonEnemyId: "cursed_tome", statusEffect: "silence", statusDuration: 1.2,
  }),
  glyph_sniper: enemy({
    id: "glyph_sniper", name: "Glyph Sniper", theme: "sealed_library", role: "ranged", behavior: "sniper", visual: "sniper", introducedAtStage: 2,
    color: "#C39BD3", maxHp: 11, speed: 17, radius: 8, hitboxRadius: 19, hitboxOffsetY: -18, shadowWidth: 22,
    attackDamage: 4, attackInterval: 2.1, attackWindup: 1.0, attackRange: 190, requiresLineOfSight: true,
    projectileSpeed: 230, projectileKind: "needle", statusEffect: "silence", statusDuration: 0.7,
  }),
  // Boss: Sealed Library
  tome_lord: enemy({
    id: "tome_lord", name: "Tome Lord", theme: "sealed_library", role: "boss", behavior: "boss", visual: "boss", bossPattern: "tome_lord",
    color: "#8E44AD", maxHp: 72, speed: 22, radius: 16, hitboxRadius: 40, hitboxOffsetY: -28, shadowWidth: 52,
    attackDamage: 4, attackInterval: 2.1, attackWindup: 0.6,
    projectileSpeed: 70, projectileCount: 10, summonEnemyId: "cursed_tome", statusEffect: "silence", statusDuration: 2.8,
  }),

  // === PHASE 5: FORGE CORE ===
  forge_mech: enemy({
    id: "forge_mech", name: "Forge Mech", theme: "forge_core", role: "melee", behavior: "melee", visual: "servitor",
    color: "#FF5500", maxHp: 22, speed: 20, radius: 10, hitboxRadius: 24, hitboxOffsetY: -20, shadowWidth: 28,
    attackDamage: 5, attackInterval: 1.2, attackWindup: 0.4,
    statusEffect: "burn", statusDuration: 3.0,
  }),
  slag_crawler: enemy({
    id: "slag_crawler", name: "Slag Crawler", theme: "forge_core", role: "ranged", behavior: "area", visual: "beetle",
    color: "#FF2200", maxHp: 15, speed: 18, radius: 9, hitboxRadius: 20, hitboxOffsetY: -12, shadowWidth: 24,
    attackDamage: 4, attackInterval: 2.2, attackWindup: 0.7, attackRange: 120, requiresLineOfSight: true,
    minimumWindup: 0.62, minimumAttackInterval: 1.48,
    areaRadius: 28, statusEffect: "burn", statusDuration: 2.5,
  }),
  anvil_guard: enemy({
    id: "anvil_guard", name: "Anvil Guard", theme: "forge_core", role: "melee", behavior: "charge", visual: "knight", introducedAtStage: 2,
    color: "#C0392B", maxHp: 20, speed: 30, radius: 10, hitboxRadius: 23, hitboxOffsetY: -19, shadowWidth: 30,
    attackDamage: 5, attackInterval: 1.6, attackWindup: 0.55,
    chargeDistance: 68, statusEffect: "burn", statusDuration: 2.0,
  }),
  // Boss: Forge Core
  forge_prime: enemy({
    id: "forge_prime", name: "Forge Prime", theme: "forge_core", role: "boss", behavior: "boss", visual: "boss", bossPattern: "forge_prime",
    color: "#E74C3C", maxHp: 80, speed: 26, radius: 17, hitboxRadius: 45, hitboxOffsetY: -30, shadowWidth: 60,
    attackDamage: 5, attackInterval: 1.9, attackWindup: 0.55,
    projectileSpeed: 72, projectileCount: 14, summonEnemyId: "forge_mech", statusEffect: "burn", statusDuration: 3.0,
  }),

  // === PHASE 5: COOLING CANAL ===
  crystal_drifter: enemy({
    id: "crystal_drifter", name: "Crystal Drifter", theme: "cooling_canal", role: "ranged", behavior: "scatter", visual: "wisp",
    color: "#AEE6FF", maxHp: 9, speed: 35, radius: 7, hitboxRadius: 18, hitboxOffsetY: -15, shadowWidth: 20,
    attackDamage: 2, attackInterval: 1.2, attackWindup: 0.38,
    projectileSpeed: 112, projectileCount: 3, projectileSpread: 0.38, statusEffect: "slow", statusDuration: 0.9,
  }),
  canal_warden: enemy({
    id: "canal_warden", name: "Canal Warden", theme: "cooling_canal", role: "melee", behavior: "melee", visual: "guard",
    color: "#5DADE2", maxHp: 16, speed: 32, radius: 9, hitboxRadius: 21, hitboxOffsetY: -17, shadowWidth: 26,
    attackDamage: 3, attackInterval: 0.9, attackWindup: 0.3, statusEffect: "slow", statusDuration: 0.6,
  }),
  cryo_lancer: enemy({
    id: "cryo_lancer", name: "Cryo Lancer", theme: "cooling_canal", role: "ranged", behavior: "sniper", visual: "lancer", introducedAtStage: 2,
    color: "#85C1E9", maxHp: 10, speed: 19, radius: 8, hitboxRadius: 20, hitboxOffsetY: -18, shadowWidth: 23,
    attackDamage: 3, attackInterval: 1.95, attackWindup: 0.92, attackRange: 182, requiresLineOfSight: true,
    projectileSpeed: 215, projectileKind: "needle", statusEffect: "slow", statusDuration: 1.1,
  }),
  // Boss: Cooling Canal
  glacier_director: enemy({
    id: "glacier_director", name: "Glacier Director", theme: "cooling_canal", role: "boss", behavior: "boss", visual: "boss", bossPattern: "glacier_director",
    color: "#1A8FC1", maxHp: 68, speed: 24, radius: 16, hitboxRadius: 41, hitboxOffsetY: -29, shadowWidth: 54,
    attackDamage: 4, attackInterval: 2.05, attackWindup: 0.62,
    projectileSpeed: 66, projectileCount: 11, summonEnemyId: "crystal_drifter", statusEffect: "slow", statusDuration: 1.4,
  }),

  // === PHASE 5: SEALED ARMORY ===
  iron_sentinel: enemy({
    id: "iron_sentinel", name: "Iron Sentinel", theme: "sealed_armory", role: "melee", behavior: "melee", visual: "knight",
    color: "#AAB7B8", maxHp: 20, speed: 28, radius: 10, hitboxRadius: 23, hitboxOffsetY: -19, shadowWidth: 27,
    attackDamage: 4, attackInterval: 1.0, attackWindup: 0.35, statusEffect: "root", statusDuration: 0.5,
  }),
  siege_mortar: enemy({
    id: "siege_mortar", name: "Siege Mortar", theme: "sealed_armory", role: "ranged", behavior: "lob", visual: "mortar", introducedAtStage: 2,
    color: "#717D7E", maxHp: 18, speed: 13, radius: 9, hitboxRadius: 23, hitboxOffsetY: -16, shadowWidth: 32,
    attackDamage: 5, attackInterval: 2.2, attackWindup: 0.8, attackRange: 162, requiresLineOfSight: true,
    projectileSpeed: 50, projectileCount: 4, projectileSpread: 0.26, projectileKind: "shell", statusEffect: "root", statusDuration: 0.55,
  }),
  armory_commander: enemy({
    id: "armory_commander", name: "Armory Commander", theme: "sealed_armory", role: "ranged", behavior: "support", visual: "servitor", introducedAtStage: 3,
    color: "#A9CCE3", maxHp: 16, speed: 22, radius: 9, hitboxRadius: 22, hitboxOffsetY: -18, shadowWidth: 27,
    attackDamage: 2, attackInterval: 2.4, attackWindup: 0.7, attackRange: 138,
    projectileSpeed: 74, projectileCount: 4, projectileSpread: 1.57, projectileKind: "support",
  }),
  // Boss: Sealed Armory
  war_engine: enemy({
    id: "war_engine", name: "War Engine", theme: "sealed_armory", role: "boss", behavior: "boss", visual: "boss", bossPattern: "war_engine",
    color: "#95A5A6", maxHp: 76, speed: 23, radius: 17, hitboxRadius: 43, hitboxOffsetY: -29, shadowWidth: 57,
    attackDamage: 5, attackInterval: 1.95, attackWindup: 0.58,
    projectileSpeed: 70, projectileCount: 12, summonEnemyId: "iron_sentinel", statusEffect: "root", statusDuration: 0.6,
  }),

  // === PHASE 5: OBSERVATORY ===
  void_moth: enemy({
    id: "void_moth", name: "Void Moth", theme: "observatory", role: "ranged", behavior: "orbit", visual: "moth",
    color: "#D2B4DE", maxHp: 8, speed: 40, radius: 7, hitboxRadius: 18, hitboxOffsetY: -17, shadowWidth: 20,
    attackDamage: 2, attackInterval: 1.1, attackWindup: 0.38, attackRange: 155,
    projectileSpeed: 96, projectileCount: 4, projectileSpread: 0.52, projectileKind: "orbit", statusEffect: "slow", statusDuration: 1.0,
  }),
  star_caster: enemy({
    id: "star_caster", name: "Star Caster", theme: "observatory", role: "ranged", behavior: "area", visual: "oracle", introducedAtStage: 2,
    color: "#A9CCE3", maxHp: 13, speed: 20, radius: 9, hitboxRadius: 23, hitboxOffsetY: -20, shadowWidth: 26,
    attackDamage: 3, attackInterval: 2.0, attackWindup: 0.78,
    attackRange: 148, minimumWindup: 0.62, minimumAttackInterval: 1.48, requiresLineOfSight: true,
    areaRadius: 22, statusEffect: "slow", statusDuration: 1.0,
  }),
  astral_shade: enemy({
    id: "astral_shade", name: "Astral Shade", theme: "observatory", role: "melee", behavior: "charge", visual: "wisp", introducedAtStage: 2,
    color: "#7FB3D3", maxHp: 12, speed: 36, radius: 8, hitboxRadius: 19, hitboxOffsetY: -14, shadowWidth: 22,
    attackDamage: 3, attackInterval: 1.35, attackWindup: 0.44,
    chargeDistance: 58, statusEffect: "silence", statusDuration: 1.3,
  }),
  // Boss: Observatory
  star_sentinel: enemy({
    id: "star_sentinel", name: "Star Sentinel", theme: "observatory", role: "boss", behavior: "boss", visual: "boss", bossPattern: "star_sentinel",
    color: "#5DADE2", maxHp: 70, speed: 26, radius: 16, hitboxRadius: 40, hitboxOffsetY: -27, shadowWidth: 52,
    attackDamage: 4, attackInterval: 2.0, attackWindup: 0.6,
    projectileSpeed: 68, projectileCount: 11, summonEnemyId: "void_moth", statusEffect: "slow", statusDuration: 1.5,
  }),

  // === PHASE 5: ASH CATACOMBS ===
  ashen_revenant: enemy({
    id: "ashen_revenant", name: "Ashen Revenant", theme: "ash_catacombs", role: "melee", behavior: "charge", visual: "coffin",
    color: "#808B96", maxHp: 17, speed: 34, radius: 9, hitboxRadius: 21, hitboxOffsetY: -16, shadowWidth: 29,
    attackDamage: 4, attackInterval: 1.4, attackWindup: 0.5,
    chargeDistance: 62, statusEffect: "poison", statusDuration: 2.0,
  }),
  ash_lobber: enemy({
    id: "ash_lobber", name: "Ash Lobber", theme: "ash_catacombs", role: "ranged", behavior: "lob", visual: "mortar", introducedAtStage: 2,
    color: "#5D6D7E", maxHp: 16, speed: 14, radius: 9, hitboxRadius: 22, hitboxOffsetY: -16, shadowWidth: 30,
    attackDamage: 4, attackInterval: 2.0, attackWindup: 0.76, attackRange: 150, requiresLineOfSight: true,
    projectileSpeed: 48, projectileCount: 3, projectileSpread: 0.2, projectileKind: "shell", statusEffect: "poison", statusDuration: 2.2,
  }),
  // Boss: Ash Catacombs
  bone_sovereign: enemy({
    id: "bone_sovereign", name: "Bone Sovereign", theme: "ash_catacombs", role: "boss", behavior: "boss", visual: "boss", bossPattern: "bone_sovereign",
    color: "#7F8C8D", maxHp: 82, speed: 25, radius: 17, hitboxRadius: 44, hitboxOffsetY: -30, shadowWidth: 58,
    attackDamage: 5, attackInterval: 2.05, attackWindup: 0.6,
    projectileSpeed: 66, projectileCount: 12, summonEnemyId: "ashen_revenant", statusEffect: "poison", statusDuration: 2.5,
  }),

  // === PHASE 5: DEEP PRISON ===
  chain_specter: enemy({
    id: "chain_specter", name: "Chain Specter", theme: "deep_prison", role: "ranged", behavior: "area", visual: "lantern",
    color: "#5DADE2", maxHp: 14, speed: 22, radius: 8, hitboxRadius: 20, hitboxOffsetY: -17, shadowWidth: 24,
    attackDamage: 3, attackInterval: 2.1, attackWindup: 0.82,
    attackRange: 138, minimumWindup: 0.68, minimumAttackInterval: 1.52, requiresLineOfSight: true,
    areaRadius: 20, statusEffect: "root", statusDuration: 0.6,
  }),
  prison_brute: enemy({
    id: "prison_brute", name: "Prison Brute", theme: "deep_prison", role: "melee", behavior: "melee", visual: "brute",
    color: "#566573", maxHp: 24, speed: 30, radius: 10, hitboxRadius: 24, hitboxOffsetY: -18, shadowWidth: 30,
    attackDamage: 5, attackInterval: 0.95, attackWindup: 0.32, statusEffect: "root", statusDuration: 0.5,
  }),
  // Boss: Deep Prison
  warden_alpha: enemy({
    id: "warden_alpha", name: "Warden Alpha", theme: "deep_prison", role: "boss", behavior: "boss", visual: "boss", bossPattern: "warden_alpha",
    color: "#1C2833", maxHp: 88, speed: 28, radius: 17, hitboxRadius: 46, hitboxOffsetY: -31, shadowWidth: 62,
    attackDamage: 5, attackInterval: 1.85, attackWindup: 0.52,
    projectileSpeed: 74, projectileCount: 13, summonEnemyId: "chain_specter", statusEffect: "root", statusDuration: 0.65,
  }),

  // === PHASE 5: DEEP ARCHIVE (FINAL ZONE) ===
  archive_construct: enemy({
    id: "archive_construct", name: "Archive Construct", theme: "deep_archive", role: "melee", behavior: "melee", visual: "guard",
    color: "#9B59B6", maxHp: 20, speed: 28, radius: 10, hitboxRadius: 23, hitboxOffsetY: -19, shadowWidth: 27,
    attackDamage: 5, attackInterval: 1.0, attackWindup: 0.3, statusEffect: "silence", statusDuration: 1.5,
  }),
  void_cultist: enemy({
    id: "void_cultist", name: "Void Cultist", theme: "deep_archive", role: "ranged", behavior: "scatter", visual: "cultist",
    color: "#6C3483", maxHp: 12, speed: 25, radius: 8, hitboxRadius: 20, hitboxOffsetY: -18, shadowWidth: 22,
    attackDamage: 4, attackInterval: 1.5, attackWindup: 0.5,
    projectileSpeed: 95, projectileCount: 4, projectileSpread: 0.3, statusEffect: "silence", statusDuration: 1.0,
  }),
  // Boss: Deep Archive (Final Boss)
  echo_mind: enemy({
    id: "echo_mind", name: "Echo Mind", theme: "deep_archive", role: "boss", behavior: "boss", visual: "boss", bossPattern: "echo_mind",
    color: "#4A235A", maxHp: 100, speed: 24, radius: 18, hitboxRadius: 50, hitboxOffsetY: -34, shadowWidth: 68,
    attackDamage: 6, attackInterval: 1.8, attackWindup: 0.55,
    projectileSpeed: 78, projectileCount: 16, summonEnemyId: "void_cultist", statusEffect: "silence", statusDuration: 3.0,
  }),
};

const CHAPTER_POOLS: Record<EnemyTheme, string[]> = {
  forest: ["moss_brute", "thorn_archer", "boar_charger", "dingdong_fowl", "spore_mimic", "root_lancer", "petal_moth"],
  dungeon: ["bone_guard", "bolt_cultist", "grave_summoner", "bark_hound", "chain_jailer", "coffin_lobber", "lantern_wraith"],
  snow: ["frost_hound", "ice_shaman", "snow_turret", "white_sampler", "mirror_wisp", "icicle_sniper", "lab_servitor"],
  lava: ["ember_knight", "magma_spitter", "cinder_oracle", "code_horse", "furnace_beetle", "magma_mortar", "heat_smith_drone"],
  sealed_library: ["cursed_tome", "arcane_guard", "ink_summoner", "glyph_sniper", "bolt_cultist", "lantern_wraith"],
  forge_core: ["forge_mech", "slag_crawler", "anvil_guard", "ember_knight", "magma_mortar", "heat_smith_drone"],
  overgrown_archive: ["moss_brute", "thorn_archer", "petal_moth", "spore_mimic", "boar_charger"],
  cooling_canal: ["crystal_drifter", "canal_warden", "cryo_lancer", "frost_hound", "lab_servitor", "snow_turret"],
  ash_catacombs: ["ashen_revenant", "ash_lobber", "bone_guard", "grave_summoner", "cinder_oracle", "coffin_lobber"],
  deep_prison: ["chain_specter", "prison_brute", "chain_jailer", "coffin_lobber", "bone_guard", "bark_hound"],
  deep_archive: ["archive_construct", "void_cultist", "bolt_cultist", "grave_summoner", "lantern_wraith", "cursed_tome"],
  sealed_armory: ["iron_sentinel", "siege_mortar", "armory_commander", "chain_jailer", "furnace_beetle", "bone_guard"],
  observatory: ["void_moth", "star_caster", "astral_shade", "mirror_wisp", "ice_shaman", "bolt_cultist"],
};

const CHAPTER_BOSSES: Record<EnemyTheme, string[]> = {
  forest: ["forest_guardian", "broadcast_rooster"],
  dungeon: ["crypt_overseer", "kennel_warden"],
  snow: ["frost_titan", "white_director"],
  lava: ["inferno_core", "vat_horse_prime"],
  sealed_library: ["tome_lord"],
  forge_core: ["forge_prime"],
  cooling_canal: ["glacier_director"],
  sealed_armory: ["war_engine"],
  observatory: ["star_sentinel"],
  ash_catacombs: ["bone_sovereign"],
  deep_prison: ["warden_alpha"],
  deep_archive: ["echo_mind"],
  overgrown_archive: ["forest_guardian", "broadcast_rooster"],
};

export function isEnemyId(value: unknown): value is string {
  return typeof value === "string" && value in ENEMIES;
}

export function getEnemyDefinition(id: string): EnemyDefinition {
  return ENEMIES[id] ?? ENEMIES.moss_brute;
}

export function getEnemyRenderScale(definition: EnemyDefinition, isElite = false): number {
  const base = definition.renderScale ?? (definition.role === "boss" ? 0.78 : 0.74);
  if (isElite && definition.role !== "boss") return Math.min(0.84, base + 0.08);
  return base;
}

export function getEnemyPool(theme: EnemyTheme, role?: EnemyRole, stageIndex = 5): EnemyDefinition[] {
  const pool = (CHAPTER_POOLS[theme] ?? CHAPTER_POOLS.forest)
    .map(id => ENEMIES[id])
    .filter(definition => (definition.introducedAtStage ?? 1) <= stageIndex);
  return role ? pool.filter(definition => definition.role === role) : pool;
}

export function getBossPool(theme: EnemyTheme): EnemyDefinition[] {
  return (CHAPTER_BOSSES[theme] ?? CHAPTER_BOSSES.forest).map(id => ENEMIES[id]);
}

export function getBossDefinition(theme: EnemyTheme): EnemyDefinition {
  return getBossPool(theme)[0];
}

export function getThemeForChapter(chapterIndex: number): EnemyTheme {
  const themes: EnemyTheme[] = ["forest", "dungeon", "snow", "lava"];
  return themes[(Math.max(1, Math.floor(chapterIndex)) - 1) % themes.length];
}
