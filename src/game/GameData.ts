import { FloorData, generateFloor } from "./FloorGenerator";

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
  }
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
        this.data.legacyData = { ...defaultSave.legacyData, ...(parsed.legacyData || {}) };
        this.data.legacyData.player = { ...defaultSave.legacyData.player, ...(parsed.legacyData?.player || {}) };
        
        // Save migration
        let needsMigration = false;
        if (this.data.floor && this.data.floor.rooms) {
           for (const r of this.data.floor.rooms) {
              if (r.templateId === undefined || !r.enemies) {
                 needsMigration = true;
                 break;
              }
           }
        }
        if (needsMigration) {
           console.warn("Old floor data migrated");
           this.data.floor = generateFloor(this.data.floor.depth || 1);
        }
      } catch (e) {
        console.error("Failed to load save:", e);
      }
    }
  }

  resetRun() {
    this.data.player.hp = this.data.player.maxHp;
    this.data.player.armor = this.data.player.maxArmor;
    this.data.player.mana = this.data.player.maxMana;
    this.data.player.currentWeaponId = "pistol";
    this.data.player.coins = 0;
    this.data.floor = generateFloor(1);
    this.save();
  }

  logEvent(event: string) {
    this.data.recentEvents.push(event);
    if (this.data.recentEvents.length > 5) {
      this.data.recentEvents.shift();
    }
  }
}
