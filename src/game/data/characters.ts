export type CharacterCollectionId = "cmys" | "strinova" | "nte";

export interface CharacterCollectionConfig {
  id: CharacterCollectionId;
  name: string;
  color: string;
  description: string;
  characterIds: readonly string[];
}

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
  collectionId: CharacterCollectionId;
  formName?: string;
}

export const CHARACTER_COLLECTION_IDS: readonly CharacterCollectionId[] = ["cmys", "strinova", "nte"];

export const CHARACTER_COLLECTIONS: Record<CharacterCollectionId, CharacterCollectionConfig> = {
  cmys: {
    id: "cmys",
    name: "CMYS",
    color: "#F1C40F",
    description: "Three adaptive forms built for guard, arcane and swift combat.",
    characterIds: ["knight", "mage", "rogue"],
  },
  strinova: {
    id: "strinova",
    name: "STRINOVA",
    color: "#75D9FF",
    description: "Stringified operatives built around precision, control and protection.",
    characterIds: ["michele", "kanami", "celestia"],
  },
  nte: {
    id: "nte",
    name: "NTE",
    color: "#C79CFF",
    description: "Hethereau City's Espers turn appraisal and follow-up combat into explosive pressure.",
    characterIds: ["esper_zero", "nanally"],
  },
};

export const DETAILED_CHARACTER_IDS = ["michele", "kanami", "celestia", "esper_zero", "nanally"] as const;

export function usesDetailedCharacterArt(characterId: string): boolean {
  return (DETAILED_CHARACTER_IDS as readonly string[]).includes(characterId);
}

export const CHARACTERS: Record<string, CharacterConfig> = {
  knight: {
    id: "knight",
    name: "CMYS",
    title: "Guard Form",
    color: "#E74C3C",
    maxHp: 8,
    maxArmor: 10,
    maxMana: 25,
    manaRechargeDelay: 0.85,
    manaRechargeRate: 10,
    speed: 80,
    starterWeapon: "pistol",
    passive: "Full armor prepares a guard that reduces the next hit by 1",
    collectionId: "cmys",
    formName: "GUARD",
  },
  mage: {
    id: "mage",
    name: "CMYS",
    title: "Arcane Form",
    color: "#3498DB",
    maxHp: 4,
    maxArmor: 2,
    maxMana: 60,
    manaRechargeDelay: 1.1,
    manaRechargeRate: 12,
    speed: 90,
    starterWeapon: "laser",
    passive: "Spending 12 Energy echoes the triggering attack at 50% damage",
    collectionId: "cmys",
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
    collectionId: "strinova",
  },
  kanami: {
    id: "kanami",
    name: "Kanami",
    title: "Soul Diva",
    color: "#F06CA8",
    maxHp: 5,
    maxArmor: 4,
    maxMana: 48,
    manaRechargeDelay: 1.2,
    manaRechargeRate: 10,
    speed: 94,
    starterWeapon: "finale",
    passive: "Finale impacts release a resonant pulse that damages nearby enemies",
    collectionId: "strinova",
  },
  celestia: {
    id: "celestia",
    name: "Celestia",
    title: "Star Sanctuary Director",
    color: "#9CCBFF",
    maxHp: 5,
    maxArmor: 8,
    maxMana: 52,
    manaRechargeDelay: 1.05,
    manaRechargeRate: 11,
    speed: 92,
    starterWeapon: "polaris",
    passive: "Armor begins recharging sooner and recovers faster; Guardian Star grants temporary armor",
    collectionId: "strinova",
  },
  esper_zero: {
    id: "esper_zero",
    name: "Esper Zero",
    title: "The Zeroth Appraiser",
    color: "#BDA7FF",
    maxHp: 6,
    maxArmor: 5,
    maxMana: 50,
    manaRechargeDelay: 1,
    manaRechargeRate: 11,
    speed: 106,
    starterWeapon: "zeroth_sense",
    passive: "Appraise and Engrave empowers Zeroth Sense with stronger damage and an additional body of penetration",
    collectionId: "nte",
  },
  nanally: {
    id: "nanally",
    name: "Nanally",
    title: "Colucci Ichi-daime",
    color: "#FF668F",
    maxHp: 7,
    maxArmor: 5,
    maxMana: 44,
    manaRechargeDelay: 1.1,
    manaRechargeRate: 10,
    speed: 102,
    starterWeapon: "colucci_claws",
    passive: "Ichi-daime's Authority calls an Underboss follow-up strike with every claw combo",
    collectionId: "nte",
  },
  rogue: {
    id: "rogue",
    name: "CMYS",
    title: "Swift Form",
    color: "#2ECC71",
    maxHp: 6,
    maxArmor: 4,
    maxMana: 40,
    manaRechargeDelay: 1.35,
    manaRechargeRate: 9,
    speed: 120,
    starterWeapon: "shotgun",
    passive: "Dashing grants +25% critical chance for 2 seconds",
    collectionId: "cmys",
    formName: "SWIFT",
  },
};
