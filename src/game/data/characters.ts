export interface CharacterConfig {
  id: string;
  name: string;
  title: string;
  color: string;
  maxHp: number;
  maxArmor: number;
  maxMana: number;
  manaRechargeDelay: number;
  manaRechargeRate: number;
  speed: number;
  starterWeapon: string;
  passive: string;
  familyId: "cmys" | "michele";
  formName?: string;
}

export const CHARACTERS: Record<string, CharacterConfig> = {
  knight: {
    id: "knight",
    name: "CMYS",
    title: "Guard Form",
    color: "#E74C3C", // Red-ish
    maxHp: 8,
    maxArmor: 10,
    maxMana: 25,
    manaRechargeDelay: 0.85,
    manaRechargeRate: 10,
    speed: 80,
    starterWeapon: "pistol",
    passive: "Full armor prepares a guard that reduces the next hit by 1",
    familyId: "cmys",
    formName: "GUARD",
  },
  mage: {
    id: "mage",
    name: "CMYS",
    title: "Arcane Form",
    color: "#3498DB", // Blue-ish
    maxHp: 4,
    maxArmor: 2,
    maxMana: 60,
    manaRechargeDelay: 1.1,
    manaRechargeRate: 12,
    speed: 90,
    starterWeapon: "laser",
    passive: "Spending 12 Energy echoes the triggering attack at 50% damage",
    familyId: "cmys",
    formName: "ARCANE",
  },

  michele: {
    id: "michele",
    name: "Michele",
    title: "The Rookie Inspector",
    color: "#4FC3F7",
    maxHp: 6,
    maxArmor: 7,
    maxMana: 42,
    manaRechargeDelay: 1.1,
    manaRechargeRate: 10,
    speed: 96,
    starterWeapon: "inspector",
    passive: "Taking damage marks the attacker for 2 seconds; Inspector deals +35% damage to marked targets",
    familyId: "michele",
  },
  rogue: {
    id: "rogue",
    name: "CMYS",
    title: "Swift Form",
    color: "#2ECC71", // Green-ish
    maxHp: 6,
    maxArmor: 4,
    maxMana: 40,
    manaRechargeDelay: 1.35,
    manaRechargeRate: 9,
    speed: 120,
    starterWeapon: "shotgun",
    passive: "Dashing grants +25% critical chance for 2 seconds",
    familyId: "cmys",
    formName: "SWIFT",
  }
};
