import type { Player } from "../entities/Player";
import { BUFFS, BuffSystem, type BuffId, type BuffFamily } from "./BuffSystem";
import { detectActiveSynergies } from "./SynergySystem";
import { createSeededRandom, normalizeSeed } from "../Random";

// ============================================================
// Build Protection & Weight System (§2.4)
// ============================================================

const TAG_BOOST_NO_SYNERGY = 1.8;
const TAG_BOOST_ONE_SYNERGY = 1.35;
const PITY_THRESHOLD = 2;

function getOwnedFamilies(player: Player): Set<BuffFamily> {
  const families = new Set<BuffFamily>();
  for (const id of player.buffs) {
    const def = BUFFS[id];
    if (def) families.add(def.family);
  }
  return families;
}

function getTagBoost(player: Player): number {
  const synergyCount = detectActiveSynergies(player).length;
  if (synergyCount === 0) return TAG_BOOST_NO_SYNERGY;
  if (synergyCount === 1) return TAG_BOOST_ONE_SYNERGY;
  return 1.0;
}

function hasMechanismBuff(ids: BuffId[]): boolean {
  return ids.some(id => {
    const def = BUFFS[id];
    return def && def.triggers && def.triggers.length > 0;
  });
}

export interface RollContext {
  seed: number;
  owned: BuffId[];
  count: number;
  globalStageIndex: number;
  player: Player;
  consecutiveNoTagChoices: number;
}

export function rollBuffChoices(ctx: RollContext): BuffId[] {
  const random = createSeededRandom(normalizeSeed(ctx.seed));
  const ownedSet = new Set(ctx.owned);
  const ownedFamilies = getOwnedFamilies(ctx.player);
  const tagBoost = getTagBoost(ctx.player);
  const needPity = ctx.consecutiveNoTagChoices >= PITY_THRESHOLD;

  const candidates = (Object.keys(BUFFS) as BuffId[]).filter(id =>
    !ownedSet.has(id) && (BUFFS[id].minGlobalStage ?? 1) <= ctx.globalStageIndex
  );

  if (candidates.length === 0) return [];

  const weights = candidates.map(id => {
    const def = BUFFS[id];
    let weight = def.rarity === "common" ? 6 : def.rarity === "uncommon" ? 3 : 1;
    if (ownedFamilies.has(def.family)) {
      weight *= tagBoost;
    }
    return weight;
  });

  const choices: BuffId[] = [];
  const available = [...candidates];
  const availableWeights = [...weights];

  // Pity: force at least one buff matching owned families
  if (needPity && ownedFamilies.size > 0) {
    const matchingIndices = available
      .map((id, i) => ({ id, i }))
      .filter(({ id }) => ownedFamilies.has(BUFFS[id].family));
    if (matchingIndices.length > 0) {
      const pick = matchingIndices[Math.floor(random() * matchingIndices.length)];
      choices.push(pick.id);
      available.splice(pick.i, 1);
      availableWeights.splice(pick.i, 1);
    }
  }

  // Ensure at least one mechanism-changing buff
  if (choices.length < ctx.count && !hasMechanismBuff(choices)) {
    const mechIndices = available
      .map((id, i) => ({ id, i }))
      .filter(({ id }) => BUFFS[id].triggers && BUFFS[id].triggers.length > 0);
    if (mechIndices.length > 0) {
      const pick = mechIndices[Math.floor(random() * mechIndices.length)];
      if (!choices.includes(pick.id)) {
        choices.push(pick.id);
        available.splice(pick.i, 1);
        availableWeights.splice(pick.i, 1);
      }
    }
  }

  // Fill remaining slots with weighted random
  while (choices.length < ctx.count && available.length > 0) {
    const total = availableWeights.reduce((sum, w) => sum + w, 0);
    let roll = random() * total;
    let selectedIndex = 0;
    for (let i = 0; i < available.length; i++) {
      roll -= availableWeights[i];
      if (roll <= 0) { selectedIndex = i; break; }
    }
    choices.push(available[selectedIndex]);
    available.splice(selectedIndex, 1);
    availableWeights.splice(selectedIndex, 1);
  }

  return choices;
}

export function checkTagRelevance(choices: BuffId[], player: Player): boolean {
  const ownedFamilies = getOwnedFamilies(player);
  if (ownedFamilies.size === 0) return true;
  return choices.some(id => ownedFamilies.has(BUFFS[id].family));
}
