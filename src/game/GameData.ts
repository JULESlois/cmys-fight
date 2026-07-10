import { FloorData, generateFloor } from "./FloorGenerator";
import { CHARACTERS } from "./data/characters";

export interface GameSave {
  player: {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    armor: number;
    maxArmor: number;
    mana: number;
    maxMana: number;
    currentWeaponId: string;
    level: number;
    exp: number;
    coins: number;
    characterId: string;
    speed: number;
  };
  settings: {
    masterVolume: number;
    screenShake: boolean;
    crtFilter: boolean;
  };
  recentEvents: string[];
  floor: FloorData;
  legacyData: {
    player: {
      x: number;
      y: number;
      hp: number;
      maxHp: number;
      level: number;
      exp: number;
    };
    clearedRooms: string[];
    legacyRewardsClaimed: string[];
  };
  saveVersion?: number;
}

export const defaultSave: GameSave = {
  player: {
    x: 160,
    y: 120,
    hp: 6,
    maxHp: 6,
    armor: 5,
    maxArmor: 5,
    mana: 100,
    maxMana: 100,
    currentWeaponId: "pistol",
    level: 1,
    exp: 0,
    coins: 0,
    characterId: "knight",
    speed: 80,
  },
  settings: {
    masterVolume: 100,
    screenShake: true,
    crtFilter: true,
  },
  recentEvents: ["Started the journey"],
  floor: generateFloor(1),
  legacyData: {
    player: {
      x: 2,
      y: 2,
      hp: 20,
      maxHp: 20,
      level: 1,
      exp: 0,
    },
    clearedRooms: [],
    legacyRewardsClaimed: [],
  },
  saveVersion: 2
};

export class GameData {
  public data: GameSave;

  constructor() {
    this.data = JSON.parse(JSON.stringify(defaultSave));
  }

  save() {
    localStorage.setItem("retro_rpg_save", JSON.stringify(this.data));
  }

  load() {
    const saved = localStorage.getItem("retro_rpg_save");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.data = { ...defaultSave, ...parsed };
        this.data.player = { ...defaultSave.player, ...(parsed.player || {}) };
        this.data.settings = { ...defaultSave.settings, ...(parsed.settings || {}) };
        this.data.legacyData = { ...defaultSave.legacyData, ...(parsed.legacyData || {}) };
        this.data.legacyData.player = { ...defaultSave.legacyData.player, ...(parsed.legacyData?.player || {}) };
        
        // Save migration
        if ((this.data.saveVersion || 0) < 2) {
           console.warn("Migrating save to version 2");
           if (this.data.floor && this.data.floor.rooms) {
              for (const r of this.data.floor.rooms) {
                 r.combatCleared = r.combatCleared ?? r.cleared;
                 r.rewardGenerated = r.rewardGenerated ?? false;
                 r.interactionCompleted = r.interactionCompleted ?? false;
                 if (r.type === "combat" || r.type === "boss") {
                    r.enemies = r.enemies ?? [];
                 }
              }
           }
           this.data.saveVersion = 2;
           this.save();
        }
      } catch (e) {
        console.error("Failed to load save:", e);
      }
    }
  }

  hasValidSave(): boolean {
    if (!localStorage.getItem("retro_rpg_save")) return false;
    if (this.data.player.hp <= 0) return false;
    return true;
  }

  startNewRun(characterId: string) {
    const char = CHARACTERS[characterId] || CHARACTERS["knight"];
    this.data.player.characterId = characterId;
    this.data.player.x = 160;
    this.data.player.y = 120;
    this.data.player.maxHp = char.maxHp;
    this.data.player.hp = char.maxHp;
    this.data.player.maxArmor = char.maxArmor;
    this.data.player.armor = char.maxArmor;
    this.data.player.maxMana = char.maxMana;
    this.data.player.mana = char.maxMana;
    this.data.player.speed = char.speed;
    this.data.player.currentWeaponId = char.starterWeapon;
    this.data.player.coins = 0;
    this.data.floor = generateFloor(1);
    this.save();
  }

  restartCurrentRun() {
    const char = CHARACTERS[this.data.player.characterId] || CHARACTERS["knight"];
    this.data.player.x = 160;
    this.data.player.y = 120;
    this.data.player.hp = char.maxHp;
    this.data.player.maxHp = char.maxHp;
    this.data.player.armor = char.maxArmor;
    this.data.player.maxArmor = char.maxArmor;
    this.data.player.mana = char.maxMana;
    this.data.player.maxMana = char.maxMana;
    this.data.player.speed = char.speed;
    this.data.player.currentWeaponId = char.starterWeapon;
    this.data.player.coins = 0;
    this.data.floor = generateFloor(1);
    this.save();
  }
  
  resetRun() {
    this.restartCurrentRun();
  }

  logEvent(event: string) {
    this.data.recentEvents.push(event);
    if (this.data.recentEvents.length > 5) {
      this.data.recentEvents.shift();
    }
  }
}
