export interface WeaponData {
  id: string;
  name: string;
  damage: number;
  fireRate: number; // shots per second
  bulletSpeed: number;
  manaCost: number;
  spread: number; // radians
  pelletCount: number;
  color: string;
}

export const WEAPONS: Record<string, WeaponData> = {
  pistol: {
    id: "pistol",
    name: "Old Pistol",
    damage: 3,
    fireRate: 3, // 3 shots per second -> ~333ms cooldown
    bulletSpeed: 150,
    manaCost: 0,
    spread: 0.1,
    pelletCount: 1,
    color: "#F39C12",
  },
  shotgun: {
    id: "shotgun",
    name: "Rusty Shotgun",
    damage: 2, // per pellet
    fireRate: 1, // 1 shot per second
    bulletSpeed: 120,
    manaCost: 2,
    spread: 0.4,
    pelletCount: 5,
    color: "#E74C3C",
  },
  laser: {
    id: "laser",
    name: "Energy Blaster",
    damage: 5,
    fireRate: 5, // 5 shots per second
    bulletSpeed: 300,
    manaCost: 1,
    spread: 0,
    pelletCount: 1,
    color: "#00F2FE",
  }
};
