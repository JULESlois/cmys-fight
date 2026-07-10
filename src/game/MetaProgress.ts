export interface MetaProgress {
  version: number;
  currency: number;
  highestStage: number;
  bestVictoryTime: number | null;
  totalRuns: number;
  victories: number;
  unlockedCharacters: string[];
  unlockedStarterWeapons: string[];
  claimedRunIds: string[];
}

export const META_SAVE_VERSION = 1;

export function createDefaultMetaProgress(): MetaProgress {
  return {
    version: META_SAVE_VERSION,
    currency: 0,
    highestStage: 1,
    bestVictoryTime: null,
    totalRuns: 0,
    victories: 0,
    unlockedCharacters: ["knight"],
    unlockedStarterWeapons: ["pistol"],
    claimedRunIds: [],
  };
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(entry => typeof entry === "string" && entry.length > 0))];
}

const CHARACTER_IDS = new Set(["knight", "mage", "rogue"]);
const STARTER_WEAPON_IDS = new Set(["pistol", "shotgun", "laser"]);

export function normalizeMetaProgress(value: unknown): MetaProgress {
  const fallback = createDefaultMetaProgress();
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Partial<MetaProgress>;
  const bestVictoryTime = Number(raw.bestVictoryTime);
  const meta: MetaProgress = {
    version: META_SAVE_VERSION,
    currency: Math.max(0, Math.floor(Number(raw.currency) || 0)),
    highestStage: Math.max(1, Math.floor(Number(raw.highestStage) || 1)),
    bestVictoryTime: Number.isFinite(bestVictoryTime) && bestVictoryTime > 0 ? bestVictoryTime : null,
    totalRuns: Math.max(0, Math.floor(Number(raw.totalRuns) || 0)),
    victories: Math.max(0, Math.floor(Number(raw.victories) || 0)),
    unlockedCharacters: uniqueStrings(raw.unlockedCharacters).filter(id => CHARACTER_IDS.has(id)),
    unlockedStarterWeapons: uniqueStrings(raw.unlockedStarterWeapons).filter(id => STARTER_WEAPON_IDS.has(id)),
    claimedRunIds: uniqueStrings(raw.claimedRunIds).slice(-100),
  };
  if (!meta.unlockedCharacters.includes("knight")) meta.unlockedCharacters.unshift("knight");
  if (!meta.unlockedStarterWeapons.includes("pistol")) meta.unlockedStarterWeapons.unshift("pistol");
  applyMetaUnlocks(meta);
  return meta;
}

export function applyMetaUnlocks(meta: MetaProgress): string[] {
  const unlocks: string[] = [];
  const unlock = (collection: string[], id: string, label: string) => {
    if (collection.includes(id)) return;
    collection.push(id);
    unlocks.push(label);
  };

  if (meta.highestStage >= 5 || meta.currency >= 30) {
    unlock(meta.unlockedStarterWeapons, "shotgun", "Rusty Shotgun");
  }
  if (meta.highestStage >= 6 || meta.currency >= 50) {
    unlock(meta.unlockedCharacters, "mage", "Mage");
  }
  if (meta.victories >= 1) {
    unlock(meta.unlockedStarterWeapons, "laser", "Energy Blaster");
    unlock(meta.unlockedCharacters, "rogue", "Rogue");
  } else if (meta.currency >= 120) {
    unlock(meta.unlockedCharacters, "rogue", "Rogue");
  }
  return unlocks;
}

