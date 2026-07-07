export interface CharacterConfig {
  id: string;
  name: string;
  title: string;
  color: string;
  maxHp: number;
  maxArmor: number;
  maxMana: number;
  speed: number;
  starterWeapon: string;
  passive: string;
}

export const CHARACTERS: Record<string, CharacterConfig> = {
  knight: {
    id: "knight",
    name: "Knight",
    title: "The Stalwart",
    color: "#E74C3C", // Red-ish
    maxHp: 8,
    maxArmor: 10,
    maxMana: 50,
    speed: 80,
    starterWeapon: "pistol",
    passive: "Starts with high armor"
  },
  mage: {
    id: "mage",
    name: "Mage",
    title: "The Scholar",
    color: "#3498DB", // Blue-ish
    maxHp: 4,
    maxArmor: 2,
    maxMana: 150,
    speed: 90,
    starterWeapon: "laser",
    passive: "High mana capacity"
  },
  rogue: {
    id: "rogue",
    name: "Rogue",
    title: "The Swift",
    color: "#2ECC71", // Green-ish
    maxHp: 6,
    maxArmor: 4,
    maxMana: 80,
    speed: 120,
    starterWeapon: "shotgun",
    passive: "High movement speed"
  }
};
