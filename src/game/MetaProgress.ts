import { createDefaultMetaUpgrades, normalizeMetaUpgrades, type MetaUpgradeLevels } from "./MetaUpgrades";
import { createDefaultCodex, normalizeCodex, type CodexProgress } from "./Codex";
import { isAchievementId, type AchievementId } from "./AchievementSystem";
import { isChallengeId, type ChallengeId } from "./ChallengeSystem";

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
  upgrades: MetaUpgradeLevels;
  hardModeUnlocked: boolean;
  preferredHardMode: boolean;
  preferredChallengeId?: ChallengeId;
  lifetimeKills: number;
  lifetimeEliteKills: number;
  lifetimeBossKills: number;
  completedChallenges: number;
  claimedChallengeKeys: string[];
  unlockedAchievements: AchievementId[];
  claimedAchievementRewards: AchievementId[];
  codex: CodexProgress;
}

export const META_SAVE_VERSION = 5;

export function createDefaultMetaProgress(): MetaProgress {
  return {
    version: META_SAVE_VERSION,
    currency: 0,
    highestStage: 1,
    bestVictoryTime: null,
    totalRuns: 0,
    victories: 0,
    unlockedCharacters: ["knight", "michele", "kanami"],
    unlockedStarterWeapons: ["pistol", "inspector", "finale"],
    claimedRunIds: [],
    upgrades: createDefaultMetaUpgrades(),
    hardModeUnlocked: false,
    preferredHardMode: false,
    preferredChallengeId: undefined,
    lifetimeKills: 0,
    lifetimeEliteKills: 0,
    lifetimeBossKills: 0,
    completedChallenges: 0,
    claimedChallengeKeys: [],
    unlockedAchievements: [],
    claimedAchievementRewards: [],
    codex: createDefaultCodex(),
  };
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(entry => typeof entry === "string" && entry.length > 0))];
}

const CHARACTER_IDS = new Set(["knight", "mage", "rogue", "michele", "kanami"]);
const STARTER_WEAPON_IDS = new Set(["pistol", "shotgun", "laser", "inspector", "finale"]);

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
    upgrades: normalizeMetaUpgrades(raw.upgrades),
    hardModeUnlocked: raw.hardModeUnlocked === true || Math.max(0, Math.floor(Number(raw.victories) || 0)) > 0,
    preferredHardMode: raw.preferredHardMode === true,
    preferredChallengeId: isChallengeId(raw.preferredChallengeId) ? raw.preferredChallengeId : undefined,
    lifetimeKills: Math.max(0, Math.floor(Number(raw.lifetimeKills) || 0)),
    lifetimeEliteKills: Math.max(0, Math.floor(Number(raw.lifetimeEliteKills) || 0)),
    lifetimeBossKills: Math.max(0, Math.floor(Number(raw.lifetimeBossKills) || 0)),
    completedChallenges: Math.max(0, Math.floor(Number(raw.completedChallenges) || 0)),
    claimedChallengeKeys: uniqueStrings(raw.claimedChallengeKeys).slice(-100),
    unlockedAchievements: uniqueStrings(raw.unlockedAchievements).filter(isAchievementId),
    claimedAchievementRewards: uniqueStrings(raw.claimedAchievementRewards).filter(isAchievementId),
    codex: normalizeCodex(raw.codex),
  };
  if (!meta.unlockedCharacters.includes("knight")) meta.unlockedCharacters.unshift("knight");
  if (!meta.unlockedStarterWeapons.includes("pistol")) meta.unlockedStarterWeapons.unshift("pistol");
  applyMetaUnlocks(meta);
  meta.preferredHardMode = meta.hardModeUnlocked && meta.preferredHardMode;
  if (!meta.preferredHardMode) meta.preferredChallengeId = undefined;
  return meta;
}

export function applyMetaUnlocks(meta: MetaProgress): string[] {
  const unlocks: string[] = [];
  const unlock = (collection: string[], id: string, label: string) => {
    if (collection.includes(id)) return;
    collection.push(id);
    unlocks.push(label);
  };

  unlock(meta.unlockedCharacters, "michele", "Michele");
  unlock(meta.unlockedStarterWeapons, "inspector", "Inspector");
  unlock(meta.unlockedCharacters, "kanami", "Kanami");
  unlock(meta.unlockedStarterWeapons, "finale", "Finale");

  if (meta.highestStage >= 5 || meta.currency >= 30) {
    unlock(meta.unlockedStarterWeapons, "shotgun", "Rusty Shotgun");
  }
  if (meta.highestStage >= 6 || meta.currency >= 50) {
    unlock(meta.unlockedCharacters, "mage", "CMYS Arcane Form");
  }
  if (meta.victories >= 1) {
    if (!meta.hardModeUnlocked) {
      meta.hardModeUnlocked = true;
      unlocks.push("Hard Mode");
    }
    unlock(meta.unlockedStarterWeapons, "laser", "Energy Blaster");
    unlock(meta.unlockedCharacters, "rogue", "CMYS Swift Form");
  } else if (meta.currency >= 120) {
    unlock(meta.unlockedCharacters, "rogue", "CMYS Swift Form");
  }
  return unlocks;
}

