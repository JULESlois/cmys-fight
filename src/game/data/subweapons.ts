/**
 * Castlevania-style sub-weapons.
 *
 * A sub-weapon is a secondary throw bound to its own button and paid for with
 * Hearts rather than the primary weapon's resource. Only one sub-weapon is
 * carried at a time; picking a new one up replaces the current one, which is
 * what makes the candle/heart economy a real decision rather than a menu.
 *
 * All values are authored, never rolled, so a seeded run stays deterministic.
 */

export type SubWeaponId =
  | "dagger"
  | "axe"
  | "cross"
  | "holy_water"
  | "stopwatch"
  | "bible";

/** How the projectile behaves once it leaves the player's hand. */
export type SubWeaponMotion =
  /** Straight line at constant speed, pierces nothing. */
  | "throw"
  /** Parabolic arc, damages on the way up and down. */
  | "arc"
  /** Flies out, then reverses and tracks back to the player. */
  | "boomerang"
  /** Drops at a point and leaves a lingering ground hazard. */
  | "ground"
  /** No projectile; applies a timed field effect centred on the player. */
  | "field"
  /** Orbits the player for a duration, hitting whatever it passes through. */
  | "orbit";

export interface SubWeaponDefinition {
  id: SubWeaponId;
  /** i18n key suffix: `subweapon.${id}.name`. */
  name: string;
  motion: SubWeaponMotion;
  /** Hearts consumed per throw. */
  heartCost: number;
  damage: number;
  /** Seconds before the sub-weapon can be thrown again. */
  cooldown: number;
  /** Pixels per second. Unused by `field`. */
  speed: number;
  /** Seconds the projectile or effect stays alive. */
  lifetime: number;
  /** Projectile collision radius in pixels. */
  radius: number;
  /** How many enemies a single throw may hit before expiring. 0 = unlimited. */
  maxHits: number;
  /**
   * Item Crush: a screen-clearing burst that costs the whole heart bar.
   * Authored per sub-weapon so each one keeps a distinct panic button.
   */
  crushHeartCost: number;
  crushDamage: number;
  /** Tint used by the HUD and the projectile renderer. */
  color: string;
}

export const SUB_WEAPONS: Record<SubWeaponId, SubWeaponDefinition> = {
  dagger: {
    id: "dagger",
    name: "DAGGER",
    motion: "throw",
    heartCost: 1,
    damage: 3,
    cooldown: 0.22,
    speed: 240,
    lifetime: 1.1,
    radius: 3,
    maxHits: 1,
    crushHeartCost: 8,
    crushDamage: 14,
    color: "#C4D0DA",
  },
  axe: {
    id: "axe",
    name: "AXE",
    motion: "arc",
    heartCost: 2,
    damage: 7,
    cooldown: 0.5,
    speed: 150,
    lifetime: 1.6,
    radius: 5,
    maxHits: 3,
    crushHeartCost: 10,
    crushDamage: 26,
    color: "#F0C45B",
  },
  cross: {
    id: "cross",
    name: "CROSS",
    motion: "boomerang",
    heartCost: 3,
    damage: 5,
    cooldown: 0.75,
    speed: 170,
    lifetime: 2.2,
    radius: 5,
    maxHits: 0,
    crushHeartCost: 12,
    crushDamage: 30,
    color: "#A8F7FF",
  },
  holy_water: {
    id: "holy_water",
    name: "HOLY WATER",
    motion: "ground",
    heartCost: 2,
    damage: 2,
    cooldown: 0.6,
    speed: 130,
    lifetime: 2.6,
    radius: 9,
    maxHits: 0,
    crushHeartCost: 10,
    crushDamage: 22,
    color: "#39D9E8",
  },
  stopwatch: {
    id: "stopwatch",
    name: "STOPWATCH",
    motion: "field",
    heartCost: 5,
    damage: 0,
    cooldown: 4,
    speed: 0,
    lifetime: 3,
    radius: 160,
    maxHits: 0,
    crushHeartCost: 14,
    crushDamage: 0,
    color: "#C388F5",
  },
  bible: {
    id: "bible",
    name: "BIBLE",
    motion: "orbit",
    heartCost: 4,
    damage: 4,
    cooldown: 1.2,
    speed: 3.4,
    lifetime: 4,
    radius: 6,
    maxHits: 0,
    crushHeartCost: 12,
    crushDamage: 24,
    color: "#F08A4B",
  },
};

export const SUB_WEAPON_IDS = Object.keys(SUB_WEAPONS) as SubWeaponId[];

/** Hearts a player can hold before pickups start being wasted. */
export const MAX_HEARTS = 30;
/** Hearts granted by a candle/urn break. */
export const HEART_PICKUP_SMALL = 1;
/** Hearts granted by the rarer large drop. */
export const HEART_PICKUP_LARGE = 5;

export function isSubWeaponId(value: unknown): value is SubWeaponId {
  return typeof value === "string" && value in SUB_WEAPONS;
}

export function getSubWeapon(id: SubWeaponId): SubWeaponDefinition {
  return SUB_WEAPONS[id];
}

/**
 * The stopwatch freezes rather than damages, so callers that only want
 * offensive options (drop tables, crush previews) filter on this.
 */
export function isOffensiveSubWeapon(id: SubWeaponId): boolean {
  return SUB_WEAPONS[id].damage > 0;
}
