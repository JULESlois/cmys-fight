import type { WeaponData } from "./data/weapons";

export interface WeaponBalanceMetrics {
  expectedDamagePerProjectile: number;
  expectedVolleyDamage: number;
  directDps: number;
  effectiveEnergyCost: number;
  energyPerSecond: number;
  directDamagePerEnergy: number | null;
  fullManaBurstSeconds: number | null;
  sustainedCycleDps: number;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Calculates deterministic direct-hit output. It intentionally excludes pierce,
 * ricochets, chain lightning, explosions, status damage, homing accuracy and CC.
 */
export function getWeaponBalanceMetrics(
  weapon: WeaponData,
  maxMana = 80,
  manaRechargeRate = 9,
  manaRechargeDelay = 1.35,
  energyCostMultiplier = 1,
): WeaponBalanceMetrics {
  const criticalMultiplier = Math.max(1, weapon.critMultiplier ?? 2);
  const criticalChance = Math.max(0, Math.min(1, weapon.critChance));
  const expectedDamagePerProjectile = weapon.damage * (
    1 + criticalChance * (criticalMultiplier - 1)
  );
  const expectedVolleyDamage = expectedDamagePerProjectile * Math.max(1, weapon.pelletCount);
  const directDps = expectedVolleyDamage * Math.max(0, weapon.fireRate);
  const effectiveEnergyCost = Math.max(0, weapon.manaCost) * Math.max(0, energyCostMultiplier);
  const energyPerSecond = effectiveEnergyCost * Math.max(0, weapon.fireRate);
  const directDamagePerEnergy = effectiveEnergyCost > 0
    ? expectedVolleyDamage / effectiveEnergyCost
    : null;
  const fullManaBurstSeconds = energyPerSecond > 0
    ? Math.max(0, maxMana) / energyPerSecond
    : null;
  const rechargeSeconds = manaRechargeRate > 0
    ? Math.max(0, manaRechargeDelay) + Math.max(0, maxMana) / manaRechargeRate
    : Number.POSITIVE_INFINITY;
  const sustainedCycleDps = fullManaBurstSeconds === null
    ? directDps
    : directDps * fullManaBurstSeconds / (fullManaBurstSeconds + rechargeSeconds);

  return {
    expectedDamagePerProjectile: round(expectedDamagePerProjectile),
    expectedVolleyDamage: round(expectedVolleyDamage),
    directDps: round(directDps),
    effectiveEnergyCost: round(effectiveEnergyCost),
    energyPerSecond: round(energyPerSecond),
    directDamagePerEnergy: directDamagePerEnergy === null ? null : round(directDamagePerEnergy),
    fullManaBurstSeconds: fullManaBurstSeconds === null ? null : round(fullManaBurstSeconds),
    sustainedCycleDps: round(sustainedCycleDps),
  };
}

export function hasWeaponUtility(weapon: WeaponData): boolean {
  return Boolean(
    (weapon.pierce ?? 0) > 0 ||
    (weapon.wallBounces ?? 0) > 0 ||
    (weapon.chainCount ?? 0) > 0 ||
    (weapon.explosionRadius ?? 0) > 0 ||
    (weapon.homingStrength ?? 0) > 0 ||
    weapon.statusEffect ||
    weapon.projectileStyle === "beam" ||
    weapon.projectileStyle === "flame" ||
    weapon.projectileStyle === "disc"
  );
}
