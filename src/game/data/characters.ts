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
    passive: "Full armor prepares a guard that reduces the next hit by 1"
  },
  mage: {
    id: "mage",
    name: "Mage",
    title: "The Scholar",
    color: "#3498DB", // Blue-ish
    maxHp: 4,
    maxArmor: 2,
    maxMana: 120,
    speed: 90,
    starterWeapon: "laser",
    passive: "Clearing a combat room restores 15 energy"
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
    passive: "Dashing grants +25% critical chance for 2 seconds"
  }
};
