import { BUFFS, type BuffId } from "./combat/BuffSystem";
import { ENEMIES } from "./data/enemies";
import { WEAPONS } from "./data/weapons";

export interface CodexProgress {
  enemies: string[];
  bosses: string[];
  weapons: string[];
  buffs: BuffId[];
}

export function createDefaultCodex(): CodexProgress {
  return { enemies: [], bosses: [], weapons: ["pistol"], buffs: [] };
}

function normalizeIds(value: unknown, allowed: Set<string>): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(entry => typeof entry === "string" && allowed.has(entry)))];
}

export function normalizeCodex(value: unknown): CodexProgress {
  const raw = value && typeof value === "object" ? value as Partial<CodexProgress> : {};
  const enemyIds = new Set(Object.keys(ENEMIES).filter(id => ENEMIES[id].role !== "boss"));
  const bossIds = new Set(Object.keys(ENEMIES).filter(id => ENEMIES[id].role === "boss"));
  const weaponIds = new Set(Object.keys(WEAPONS));
  const buffIds = new Set(Object.keys(BUFFS));
  const codex: CodexProgress = {
    enemies: normalizeIds(raw.enemies, enemyIds),
    bosses: normalizeIds(raw.bosses, bossIds),
    weapons: normalizeIds(raw.weapons, weaponIds),
    buffs: normalizeIds(raw.buffs, buffIds) as BuffId[],
  };
  if (!codex.weapons.includes("pistol")) codex.weapons.unshift("pistol");
  return codex;
}
