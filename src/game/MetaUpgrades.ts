export type MetaUpgradeId =
  | "vitality"
  | "armor"
  | "starting_coins"
  | "buff_reroll"
  | "shop_discount"
  | "supply_drop";

export type MetaUpgradeLevels = Record<MetaUpgradeId, number>;

export interface MetaUpgradeDefinition {
  id: MetaUpgradeId;
  name: string;
  description: string;
  maxLevel: number;
  costs: number[];
}

export const META_UPGRADES: Record<MetaUpgradeId, MetaUpgradeDefinition> = {
  vitality: { id: "vitality", name: "VITALITY CORE", description: "+1 maximum HP per level.", maxLevel: 3, costs: [30, 60, 100] },
  armor: { id: "armor", name: "PLATED FRAME", description: "+1 starting and maximum Armor per level.", maxLevel: 3, costs: [25, 50, 85] },
  starting_coins: { id: "starting_coins", name: "FIELD STIPEND", description: "+10 starting Coins per level.", maxLevel: 3, costs: [20, 40, 70] },
  buff_reroll: { id: "buff_reroll", name: "FATE RELAY", description: "+1 Buff reroll per Run per level.", maxLevel: 2, costs: [45, 90] },
  shop_discount: { id: "shop_discount", name: "MERCHANT LINK", description: "Shop prices -5% per level.", maxLevel: 3, costs: [35, 70, 120] },
  supply_drop: { id: "supply_drop", name: "SALVAGE PROTOCOL", description: "Enemy supply drop chance +5% per level.", maxLevel: 3, costs: [30, 65, 110] },
};

export const META_UPGRADE_IDS = Object.keys(META_UPGRADES) as MetaUpgradeId[];

export function createDefaultMetaUpgrades(): MetaUpgradeLevels {
  return { vitality: 0, armor: 0, starting_coins: 0, buff_reroll: 0, shop_discount: 0, supply_drop: 0 };
}

export function normalizeMetaUpgrades(value: unknown): MetaUpgradeLevels {
  const result = createDefaultMetaUpgrades();
  if (!value || typeof value !== "object") return result;
  const raw = value as Partial<Record<MetaUpgradeId, unknown>>;
  for (const id of META_UPGRADE_IDS) {
    result[id] = Math.max(0, Math.min(META_UPGRADES[id].maxLevel, Math.floor(Number(raw[id]) || 0)));
  }
  return result;
}

export function getUpgradeCost(id: MetaUpgradeId, currentLevel: number): number | null {
  const definition = META_UPGRADES[id];
  const level = Math.max(0, Math.floor(currentLevel));
  return level >= definition.maxLevel ? null : definition.costs[level];
}

export function getUpgradeInvestment(levels: MetaUpgradeLevels): number {
  return META_UPGRADE_IDS.reduce((total, id) => {
    const level = Math.min(META_UPGRADES[id].maxLevel, levels[id]);
    return total + META_UPGRADES[id].costs.slice(0, level).reduce((sum, cost) => sum + cost, 0);
  }, 0);
}

export function getMetaBonuses(levels: MetaUpgradeLevels) {
  return {
    maxHp: levels.vitality,
    maxArmor: levels.armor,
    startingCoins: levels.starting_coins * 10,
    buffRerolls: levels.buff_reroll,
    shopDiscount: levels.shop_discount * 0.05,
    supplyDropBonus: levels.supply_drop * 0.05,
  };
}
