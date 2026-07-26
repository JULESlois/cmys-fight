import { BUFFS, type BuffId, type BuffFamily } from "./BuffSystem";
import { SYNERGIES, ALL_SYNERGY_IDS } from "./SynergySystem";
import { createSeededRandom, normalizeSeed } from "../Random";

// ============================================================
// Build Protection & Weight System (buff-system-plan §2.4)
// 抽卡保护:
//  - 同系列加权(有协同后收敛)
//  - 保底:连续 PITY_THRESHOLD 次没抽到同系列后,强制给一个
//  - 每次至少一个"机制型"buff(带 triggers 的),避免整轮全是数值
// ============================================================

const TAG_BOOST_NO_SYNERGY = 1.8;
const TAG_BOOST_ONE_SYNERGY = 1.35;
export const PITY_THRESHOLD = 2;

function getOwnedFamilies(owned: readonly BuffId[]): Set<BuffFamily> {
  const families = new Set<BuffFamily>();
  for (const id of owned) {
    const def = BUFFS[id];
    if (def) families.add(def.family);
  }
  return families;
}

function countActiveSynergies(owned: readonly BuffId[]): number {
  const ownedSet = new Set(owned);
  let count = 0;
  for (const id of ALL_SYNERGY_IDS) {
    const def = SYNERGIES[id];
    if (def.experimental) continue;
    const [a, b] = def.requiredBuffs;
    if (ownedSet.has(a) && ownedSet.has(b)) count++;
  }
  return count;
}

function getTagBoost(owned: readonly BuffId[]): number {
  const synergyCount = countActiveSynergies(owned);
  if (synergyCount === 0) return TAG_BOOST_NO_SYNERGY;
  if (synergyCount === 1) return TAG_BOOST_ONE_SYNERGY;
  return 1.0;
}

function isMechanismBuff(id: BuffId): boolean {
  const def = BUFFS[id];
  return !!def && !!def.triggers && def.triggers.length > 0;
}

export interface RollContext {
  seed: number;
  owned: readonly BuffId[];
  count: number;
  /** 难度阶段索引,用于 minGlobalStage 过滤 */
  difficultyStageIndex: number;
  /** 连续多少次抽卡没有出现同系列选项(保底计数) */
  consecutiveNoTagChoices: number;
}

export function rollBuffChoices(ctx: RollContext): BuffId[] {
  const random = createSeededRandom(normalizeSeed(ctx.seed));
  const ownedSet = new Set(ctx.owned);
  const ownedFamilies = getOwnedFamilies(ctx.owned);
  const tagBoost = getTagBoost(ctx.owned);
  const needPity = ctx.consecutiveNoTagChoices >= PITY_THRESHOLD;

  const available = (Object.keys(BUFFS) as BuffId[]).filter(id =>
    !ownedSet.has(id)
    && !BUFFS[id].experimental
    && (BUFFS[id].minGlobalStage ?? 1) <= ctx.difficultyStageIndex
  );
  if (available.length === 0) return [];

  const availableWeights = available.map(id => {
    const def = BUFFS[id];
    let weight = def.rarity === "common" ? 6 : def.rarity === "uncommon" ? 3 : 1;
    if (ownedFamilies.has(def.family)) weight *= tagBoost;
    return weight;
  });

  const choices: BuffId[] = [];
  const takeAt = (index: number) => {
    choices.push(available[index]);
    available.splice(index, 1);
    availableWeights.splice(index, 1);
  };

  // Pity: force at least one buff matching owned families
  if (needPity && ownedFamilies.size > 0) {
    const matching = available
      .map((id, i) => ({ id, i }))
      .filter(({ id }) => ownedFamilies.has(BUFFS[id].family));
    if (matching.length > 0) {
      takeAt(matching[Math.floor(random() * matching.length)].i);
    }
  }

  // Ensure at least one mechanism-changing buff in the roll
  if (choices.length < ctx.count && !choices.some(isMechanismBuff)) {
    const mech = available
      .map((id, i) => ({ id, i }))
      .filter(({ id }) => isMechanismBuff(id));
    if (mech.length > 0) {
      takeAt(mech[Math.floor(random() * mech.length)].i);
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
    takeAt(selectedIndex);
  }

  return choices;
}

/** 本轮选项里是否至少有一个与已持有系列同源(用于更新保底计数) */
export function checkTagRelevance(choices: readonly BuffId[], owned: readonly BuffId[]): boolean {
  const ownedFamilies = getOwnedFamilies(owned);
  if (ownedFamilies.size === 0) return true;
  return choices.some(id => ownedFamilies.has(BUFFS[id].family));
}
