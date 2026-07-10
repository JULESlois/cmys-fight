import { FloorData, generateFloor } from "./FloorGenerator";
import { CHARACTERS } from "./data/characters";
import { normalizeRoomState } from "./RoomState";
import {
  createStarterWeaponSlots,
  isWeaponId,
  normalizeWeaponSlots,
  type WeaponSlots,
} from "./data/weapons";

const CURRENT_SAVE_VERSION = 5;

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
    weaponSlots: WeaponSlots;
    activeWeaponSlot: 0 | 1;
    /** Compatibility mirror for saves created before dual weapon slots. */
    currentWeaponId: string;
    level: number;
    exp: number;
    coins: number;
    characterId: string;
    speed: number;
    skillCooldown: number;
    skillActiveTimer: number;
    skillDirectionX: number;
    skillDirectionY: number;
    rogueCritTimer: number;
    knightGuardReady: boolean;
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
  saveVersion: number;
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
    weaponSlots: ["pistol"],
    activeWeaponSlot: 0,
    currentWeaponId: "pistol",
    level: 1,
    exp: 0,
    coins: 0,
    characterId: "knight",
    speed: 80,
    skillCooldown: 0,
    skillActiveTimer: 0,
    skillDirectionX: 0,
    skillDirectionY: 0,
    rogueCritTimer: 0,
    knightGuardReady: true,
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
  saveVersion: CURRENT_SAVE_VERSION
};

export class GameData {
  public data: GameSave;

  constructor() {
    this.data = JSON.parse(JSON.stringify(defaultSave));
  }

  save() {
    this.normalizePlayerWeapons();
    this.normalizePlayerSkills();
    if (this.data.floor && Array.isArray(this.data.floor.rooms)) {
      for (const room of this.data.floor.rooms) {
        normalizeRoomState(room);
      }
    }
    this.data.saveVersion = CURRENT_SAVE_VERSION;
    localStorage.setItem("retro_rpg_save", JSON.stringify(this.data));
  }

  load() {
    const saved = localStorage.getItem("retro_rpg_save");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.data = { ...defaultSave, ...parsed };
        this.data.player = { ...defaultSave.player, ...(parsed.player || {}) };
        if (!Array.isArray(parsed.player?.weaponSlots)) {
          const legacyWeapon = isWeaponId(parsed.player?.currentWeaponId)
            ? parsed.player.currentWeaponId
            : "pistol";
          this.data.player.weaponSlots = [legacyWeapon];
          this.data.player.activeWeaponSlot = 0;
        }
        this.normalizePlayerWeapons();
        if (typeof parsed.player?.knightGuardReady !== "boolean") {
          this.data.player.knightGuardReady = this.data.player.characterId === "knight";
        }
        this.normalizePlayerSkills();
        this.data.settings = { ...defaultSave.settings, ...(parsed.settings || {}) };
        this.data.legacyData = { ...defaultSave.legacyData, ...(parsed.legacyData || {}) };
        this.data.legacyData.player = { ...defaultSave.legacyData.player, ...(parsed.legacyData?.player || {}) };
        
        const loadedVersion = Number(parsed.saveVersion || 0);
        const needsMigration = loadedVersion < CURRENT_SAVE_VERSION;

        if (needsMigration) {
          console.warn(`Migrating save from version ${loadedVersion} to ${CURRENT_SAVE_VERSION}`);
        }

        if (!this.data.floor || !Array.isArray(this.data.floor.rooms)) {
          this.data.floor = generateFloor(1);
        } else {
          for (const room of this.data.floor.rooms) {
            normalizeRoomState(room);
          }
        }

        this.data.saveVersion = CURRENT_SAVE_VERSION;
        if (needsMigration) this.save();
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
    this.data.player.characterId = char.id;
    this.data.player.x = 160;
    this.data.player.y = 120;
    this.data.player.maxHp = char.maxHp;
    this.data.player.hp = char.maxHp;
    this.data.player.maxArmor = char.maxArmor;
    this.data.player.armor = char.maxArmor;
    this.data.player.maxMana = char.maxMana;
    this.data.player.mana = char.maxMana;
    this.data.player.speed = char.speed;
    this.setStarterWeapons(char.starterWeapon);
    this.resetSkillState(char.id);
    this.data.player.coins = 0;
    this.data.floor = generateFloor(1);
    this.data.saveVersion = CURRENT_SAVE_VERSION;
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
    this.setStarterWeapons(char.starterWeapon);
    this.resetSkillState(this.data.player.characterId);
    this.data.player.coins = 0;
    this.data.floor = generateFloor(1);
    this.data.saveVersion = CURRENT_SAVE_VERSION;
    this.save();
  }
  
  resetRun() {
    this.restartCurrentRun();
  }

  resetAll() {
    localStorage.removeItem("retro_rpg_save");
    this.data = JSON.parse(JSON.stringify(defaultSave));
    this.data.floor = generateFloor(1);
    this.data.saveVersion = CURRENT_SAVE_VERSION;
    this.save();
  }

  private setStarterWeapons(starterWeapon: string) {
    const slots = createStarterWeaponSlots(starterWeapon);
    this.data.player.weaponSlots = slots[1] ? [slots[0], slots[1]] : [slots[0]];
    this.data.player.activeWeaponSlot = 0;
    this.data.player.currentWeaponId = this.data.player.weaponSlots[0];
  }

  private normalizePlayerWeapons() {
    const player = this.data.player;
    const fallback = isWeaponId(player.currentWeaponId) ? player.currentWeaponId : "pistol";
    player.weaponSlots = normalizeWeaponSlots(player.weaponSlots, fallback);
    player.activeWeaponSlot = player.activeWeaponSlot === 1 && player.weaponSlots[1] ? 1 : 0;
    player.currentWeaponId = player.weaponSlots[player.activeWeaponSlot] ?? player.weaponSlots[0];
  }

  private resetSkillState(characterId: string) {
    const player = this.data.player;
    player.skillCooldown = 0;
    player.skillActiveTimer = 0;
    player.skillDirectionX = 0;
    player.skillDirectionY = 0;
    player.rogueCritTimer = 0;
    player.knightGuardReady = characterId === "knight";
  }

  private normalizePlayerSkills() {
    const player = this.data.player;
    const finiteNonNegative = (value: unknown) => {
      const number = Number(value);
      return Number.isFinite(number) ? Math.max(0, number) : 0;
    };
    player.skillCooldown = finiteNonNegative(player.skillCooldown);
    player.skillActiveTimer = finiteNonNegative(player.skillActiveTimer);
    player.skillDirectionX = Number.isFinite(Number(player.skillDirectionX)) ? Number(player.skillDirectionX) : 0;
    player.skillDirectionY = Number.isFinite(Number(player.skillDirectionY)) ? Number(player.skillDirectionY) : 0;
    player.rogueCritTimer = finiteNonNegative(player.rogueCritTimer);
    player.knightGuardReady = player.characterId === "knight" && player.knightGuardReady === true;
  }

  logEvent(event: string) {
    this.data.recentEvents.push(event);
    if (this.data.recentEvents.length > 5) {
      this.data.recentEvents.shift();
    }
  }
}
