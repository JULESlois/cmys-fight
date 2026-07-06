import { FloorData, generateFloor } from "./FloorGenerator";

export interface GameSave {
  player: {
    x: number;
    y: number;
    level: number;
    hp: number;
    maxHp: number;
    exp: number;
  };
  recentEvents: string[];
  floor: FloorData;
}

export const defaultSave: GameSave = {
  player: {
    x: 10,
    y: 7,
    level: 1,
    hp: 20,
    maxHp: 20,
    exp: 0,
  },
  recentEvents: ["Started the journey"],
  floor: generateFloor(1),
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
        this.data = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load save:", e);
      }
    }
  }

  logEvent(event: string) {
    this.data.recentEvents.push(event);
    if (this.data.recentEvents.length > 5) {
      this.data.recentEvents.shift();
    }
  }
}
