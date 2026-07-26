import { BUFFS, BuffSystem, type BuffId, type BuffRarity } from "../combat/BuffSystem";
import { WEAPONS, isWeaponAvailableForCharacter, rollAvailableWeapon, type WeaponRarity } from "../data/weapons";
import { EQUIPMENT, EQUIPMENT_IDS, isEquipmentId, type EquipmentDefinition, type StatKey } from "../data/equipment";
import { EquipmentSystem, type EquipmentProgress } from "../combat/EquipmentSystem";
import type { Player } from "../entities/Player";
import type { Room, StageData } from "../FloorGenerator";
import { createSeededRandom, hashSeed, normalizeSeed } from "../Random";
import { WeaponController } from "../combat/WeaponController";
import { getDifficultyStageIndex, getDifficultyStageIndexFromGlobalStage } from "../RunProgress";

export type ShopItemKind = "weapon" | "buff" | "equipment";

export interface ShopItem {
  id: string;
  kind: ShopItemKind;
  name: string;
  description: string;
  price: number;
  purchased: boolean;
  weaponId?: string;
  buffId?: BuffId;
  equipmentId?: string;
  rarity?: WeaponRarity | BuffRarity;
}

export type ShopPurchaseFailure =
  | "sold"
  | "coins"
  | "owned_weapon"
  | "owned_buff"
  | "buff_limit"
  | "invalid";

export interface ShopPurchaseResult {
  success: boolean;
  coinsAfter: number;
  reason?: ShopPurchaseFailure;
  droppedWeaponId?: string;
}

const SHOP_STOCK_SIZE = 4;
const BASE_BUFF_SLOTS = 2;

const WEAPON_PRICE: Record<WeaponRarity, number> = {
  common: 28,
  uncommon: 46,
  rare: 72,
  legendary: 118,
  myth: 188,
};

const BUFF_PRICE: Record<BuffRarity, number> = {
  common: 34,
  uncommon: 52,
  rare: 78,
};

// Shop talents remain broadly accessible while receiving a small high-tier bias.
const SHOP_BUFF_RARITY_WEIGHT: Record<BuffRarity, number> = {
  common: 1,
  uncommon: 1.05,
  rare: 1.2,
};

// Equipment is permanent meta gear, so it appears occasionally in one slot and
// cheap pieces surface first while high tiers stay possible.
const SHOP_EQUIPMENT_OFFER_CHANCE = 0.45;
const SHOP_EQUIPMENT_RARITY_WEIGHT: Record<EquipmentDefinition["rarity"], number> = {
  common: 1.2,
  uncommon: 1.1,
  rare: 1,
  legendary: 0.7,
  myth: 0.5,
};

const STAT_LABELS: Record<StatKey, string> = {
  strength: "STR",
  constitution: "CON",
  intelligence: "INT",
  luck: "LCK",
};

function stagePrice(base: number, stage: StageData, discount = 0): number {
  const multiplier = 1 + Math.max(0, getDifficultyStageIndexFromGlobalStage(stage.globalStageIndex) - 1) * 0.07;
  const safeDiscount = Math.max(0, Math.min(0.5, discount));
  return Math.max(1, Math.round(base * multiplier * (1 - safeDiscount)));
}

function rollBuff(candidates: BuffId[], random: () => number): BuffId | undefined {
  if (candidates.length === 0) return undefined;
  const total = candidates.reduce((sum, id) => sum + SHOP_BUFF_RARITY_WEIGHT[BUFFS[id].rarity], 0);
  let roll = Math.max(0, Math.min(0.999999, random())) * total;
  let selectedIndex = candidates.length - 1;
  for (let index = 0; index < candidates.length; index++) {
    roll -= SHOP_BUFF_RARITY_WEIGHT[BUFFS[candidates[index]].rarity];
    if (roll <= 0) {
      selectedIndex = index;
      break;
    }
  }
  return candidates.splice(selectedIndex, 1)[0];
}

function createWeaponItem(
  seed: number,
  slot: number,
  weaponId: string,
  stage: StageData,
  discount: number,
): ShopItem {
  const weapon = WEAPONS[weaponId];
  return {
    id: `${seed}:weapon:${slot}:${weapon.id}`,
    kind: "weapon",
    name: weapon.name.toUpperCase(),
    description: `${weapon.series ? `${weapon.series.toUpperCase()} ` : ""}${weapon.rarity.toUpperCase()} ${weapon.category.toUpperCase()}. ${weapon.mechanic}`,
    price: stagePrice(WEAPON_PRICE[weapon.rarity], stage, discount),
    weaponId: weapon.id,
    rarity: weapon.rarity,
    purchased: false,
  };
}

function rollEquipment(candidates: string[], random: () => number): string | undefined {
  if (candidates.length === 0) return undefined;
  const total = candidates.reduce((sum, id) => sum + SHOP_EQUIPMENT_RARITY_WEIGHT[EQUIPMENT[id].rarity], 0);
  let roll = Math.max(0, Math.min(0.999999, random())) * total;
  let selectedIndex = candidates.length - 1;
  for (let index = 0; index < candidates.length; index++) {
    roll -= SHOP_EQUIPMENT_RARITY_WEIGHT[EQUIPMENT[candidates[index]].rarity];
    if (roll <= 0) {
      selectedIndex = index;
      break;
    }
  }
  return candidates.splice(selectedIndex, 1)[0];
}

function describeEquipment(definition: EquipmentDefinition): string {
  const stats = (Object.keys(STAT_LABELS) as StatKey[])
    .filter(key => (definition.stats[key] ?? 0) !== 0)
    .map(key => `${STAT_LABELS[key]} +${definition.stats[key]}`)
    .join(", ");
  const modifier = definition.modifier ? ` ${definition.modifier.replace(/_/g, " ").toUpperCase()}.` : "";
  return `${definition.rarity.toUpperCase()} ${definition.slot.toUpperCase()} GEAR. ${stats}.${modifier}`;
}

function createEquipmentItem(
  seed: number,
  slot: number,
  equipmentId: string,
  stage: StageData,
  discount: number,
): ShopItem {
  const definition = EQUIPMENT[equipmentId];
  // The i18n layer localizes via `equip.${id}.name`; the raw data name is the fallback.
  return {
    id: `${seed}:equipment:${slot}:${definition.id}`,
    kind: "equipment",
    name: definition.name,
    description: describeEquipment(definition),
    price: stagePrice(definition.cost, stage, discount),
    equipmentId: definition.id,
    rarity: definition.rarity,
    purchased: false,
  };
}

function createBuffItem(
  seed: number,
  slot: number,
  buffId: BuffId,
  stage: StageData,
  discount: number,
): ShopItem {
  const buff = BUFFS[buffId];
  return {
    id: `${seed}:buff:${slot}:${buff.id}`,
    kind: "buff",
    name: buff.name,
    description: buff.description,
    price: stagePrice(BUFF_PRICE[buff.rarity], stage, discount),
    buffId,
    rarity: buff.rarity,
    purchased: false,
  };
}

export class ShopSystem {
  static getSeed(stage: StageData, room: Room): number {
    return normalizeSeed(room.shopSeed ?? hashSeed(stage.seed, `shop:${room.id}`));
  }

  static generateStock(
    stage: StageData,
    room: Room,
    player: Pick<Player, "characterId" | "buffs" | "weaponLoadout" | "shopDiscount">,
    equipment?: EquipmentProgress,
  ): ShopItem[] {
    const seed = ShopSystem.getSeed(stage, room);
    room.shopSeed = seed;
    const random = createSeededRandom(seed);

    const availableBuffSlots = Math.max(0, BuffSystem.MAX_BUFFS - player.buffs.length);
    const difficultyStageIndex = getDifficultyStageIndexFromGlobalStage(stage.globalStageIndex);
    const buffPool = (Object.keys(BUFFS) as BuffId[]).filter(id =>
      !player.buffs.includes(id) && (BUFFS[id].minGlobalStage ?? 1) <= difficultyStageIndex && !(BUFFS[id] as any).experimental
    );
    const desiredBuffCount = Math.min(BASE_BUFF_SLOTS, availableBuffSlots, buffPool.length);

    // Equipment is opt-in: legacy callers that do not pass meta equipment keep
    // the exact historical stock (and seeded random sequence). At most one slot
    // is spent on unowned gear, taking a weapon slot so talents are untouched.
    const equipmentPool = equipment
      ? EQUIPMENT_IDS.filter(id => !equipment.owned.includes(id) && EQUIPMENT[id].cost > 0)
      : [];
    const desiredEquipmentCount = equipmentPool.length > 0 && random() < SHOP_EQUIPMENT_OFFER_CHANCE ? 1 : 0;
    const desiredWeaponCount = SHOP_STOCK_SIZE - desiredBuffCount - desiredEquipmentCount;

    const equipmentItems: ShopItem[] = [];
    for (let slot = 0; slot < desiredEquipmentCount; slot++) {
      const equipmentId = rollEquipment(equipmentPool, random);
      if (!equipmentId) break;
      equipmentItems.push(createEquipmentItem(seed, slot, equipmentId, stage, player.shopDiscount));
    }

    const weaponItems: ShopItem[] = [];
    const excludedWeapons = new Set((player.weaponLoadout.slots.map(s => s?.weaponId).filter(Boolean) as string[]));
    for (let slot = 0; slot < desiredWeaponCount && excludedWeapons.size < Object.keys(WEAPONS).length; slot++) {
      const weapon = rollAvailableWeapon(stage.globalStageIndex, random, "shop", excludedWeapons, player.characterId);
      if (excludedWeapons.has(weapon.id)) break;
      excludedWeapons.add(weapon.id);
      weaponItems.push(createWeaponItem(seed, slot, weapon.id, stage, player.shopDiscount));
    }

    const buffItems: ShopItem[] = [];
    for (let slot = 0; slot < desiredBuffCount; slot++) {
      const buffId = rollBuff(buffPool, random);
      if (!buffId) break;
      buffItems.push(createBuffItem(seed, slot, buffId, stage, player.shopDiscount));
    }

    // Interleave the two item classes so the four-card layout is easy to scan.
    const stock: ShopItem[] = [];
    const rows = Math.max(weaponItems.length, buffItems.length);
    for (let index = 0; index < rows && stock.length < SHOP_STOCK_SIZE - equipmentItems.length; index++) {
      if (weaponItems[index]) stock.push(weaponItems[index]);
      if (buffItems[index] && stock.length < SHOP_STOCK_SIZE - equipmentItems.length) stock.push(buffItems[index]);
    }
    for (const item of equipmentItems) {
      if (stock.length < SHOP_STOCK_SIZE) stock.push(item);
    }

    // Weapon stock is the fallback whenever there are too few eligible talents.
    while (stock.length < SHOP_STOCK_SIZE && excludedWeapons.size < Object.keys(WEAPONS).length) {
      const weapon = rollAvailableWeapon(stage.globalStageIndex, random, "shop", excludedWeapons, player.characterId);
      if (excludedWeapons.has(weapon.id)) break;
      excludedWeapons.add(weapon.id);
      const item = createWeaponItem(seed, weaponItems.length, weapon.id, stage, player.shopDiscount);
      weaponItems.push(item);
      stock.push(item);
    }

    return stock.slice(0, SHOP_STOCK_SIZE);
  }

  static reconcileStock(
    stage: StageData,
    room: Room,
    player: Pick<Player, "characterId" | "buffs" | "weaponLoadout" | "shopDiscount">,
    equipment?: EquipmentProgress,
  ): ShopItem[] {
    const existing = ShopSystem.normalizeStock(room.shopStock);
    if (!existing) return ShopSystem.generateStock(stage, room, player, equipment);

    const generated = ShopSystem.generateStock(stage, room, player, equipment);
    const reconciled: ShopItem[] = [];
    const retainedIds = new Set<string>();
    const retainedWeaponIds = new Set<string>();
    const retainedBuffIds = new Set<BuffId>();
    const retainedEquipmentIds = new Set<string>();

    for (const item of existing) {
      if (retainedIds.has(item.id)) continue;
      if (item.weaponId && retainedWeaponIds.has(item.weaponId)) continue;
      if (item.buffId && retainedBuffIds.has(item.buffId)) continue;
      if (item.equipmentId && retainedEquipmentIds.has(item.equipmentId)) continue;
      const invalidBuff = item.kind === "buff" && !item.purchased && (
        !item.buffId || player.buffs.includes(item.buffId) || player.buffs.length >= BuffSystem.MAX_BUFFS
      );
      const invalidWeapon = item.kind === "weapon" && !item.purchased && (
        !item.weaponId || player.weaponLoadout.slots.map(s => s?.weaponId).includes(item.weaponId) ||
        !isWeaponAvailableForCharacter(WEAPONS[item.weaponId], player.characterId)
      );
      // Without meta equipment progress ownership cannot be verified, so
      // unpurchased gear cards are dropped rather than sold twice.
      const invalidEquipment = item.kind === "equipment" && !item.purchased && (
        !item.equipmentId || !equipment || equipment.owned.includes(item.equipmentId)
      );
      if (invalidBuff || invalidWeapon || invalidEquipment) continue;
      retainedIds.add(item.id);
      if (item.weaponId) retainedWeaponIds.add(item.weaponId);
      if (item.buffId) retainedBuffIds.add(item.buffId);
      if (item.equipmentId) retainedEquipmentIds.add(item.equipmentId);
      reconciled.push(item);
      if (reconciled.length >= SHOP_STOCK_SIZE) break;
    }

    for (const item of generated) {
      if (reconciled.length >= SHOP_STOCK_SIZE) break;
      if (retainedIds.has(item.id)) continue;
      if (item.weaponId && retainedWeaponIds.has(item.weaponId)) continue;
      if (item.buffId && retainedBuffIds.has(item.buffId)) continue;
      if (item.equipmentId && retainedEquipmentIds.has(item.equipmentId)) continue;
      retainedIds.add(item.id);
      if (item.weaponId) retainedWeaponIds.add(item.weaponId);
      if (item.buffId) retainedBuffIds.add(item.buffId);
      if (item.equipmentId) retainedEquipmentIds.add(item.equipmentId);
      reconciled.push(item);
    }

    return ShopSystem.normalizeStock(reconciled) ?? generated;
  }

  static normalizeStock(value: unknown): ShopItem[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const normalized: ShopItem[] = [];
    for (const raw of value) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as Partial<ShopItem> & { kind?: string };
      if (!item.id || !item.kind || !item.name || !Number.isFinite(Number(item.price))) continue;
      // Legacy healing, armor and energy stock is intentionally discarded.
      if (item.kind !== "weapon" && item.kind !== "buff" && item.kind !== "equipment") continue;
      if (item.kind === "weapon" && (!item.weaponId || !(item.weaponId in WEAPONS))) continue;
      if (item.kind === "buff" && (!item.buffId || !(item.buffId in BUFFS))) continue;
      if (item.kind === "equipment" && (!item.equipmentId || !(item.equipmentId in EQUIPMENT))) continue;
      const rarity = item.kind === "weapon"
        ? WEAPONS[item.weaponId!].rarity
        : item.kind === "equipment"
          ? EQUIPMENT[item.equipmentId!].rarity
          : BUFFS[item.buffId!].rarity;
      normalized.push({
        id: String(item.id),
        kind: item.kind,
        name: String(item.name),
        description: String(item.description ?? ""),
        price: Math.max(0, Math.floor(Number(item.price))),
        purchased: item.purchased === true,
        weaponId: item.weaponId,
        buffId: item.buffId,
        equipmentId: item.equipmentId,
        rarity,
      });
    }
    return normalized.length > 0 ? normalized.slice(0, SHOP_STOCK_SIZE) : undefined;
  }

  static purchase(player: Player, item: ShopItem, coins: number, equipment?: EquipmentProgress): ShopPurchaseResult {
    if (item.purchased) return { success: false, coinsAfter: coins, reason: "sold" };
    if (coins < item.price) return { success: false, coinsAfter: coins, reason: "coins" };

    let droppedWeaponId: string | undefined;
    if (item.kind === "weapon") {
      if (!item.weaponId || !(item.weaponId in WEAPONS)) {
        return { success: false, coinsAfter: coins, reason: "invalid" };
      }
      if (player.weaponLoadout.slots.map(s => s?.weaponId).includes(item.weaponId)) {
        return { success: false, coinsAfter: coins, reason: "owned_weapon" };
      }
      const result = WeaponController.equipWeapon(player, item.weaponId);
      if (!result.consumed) return { success: false, coinsAfter: coins, reason: "invalid" };
      droppedWeaponId = result.droppedWeaponId;
    } else if (item.kind === "buff") {
      if (!item.buffId || !(item.buffId in BUFFS)) {
        return { success: false, coinsAfter: coins, reason: "invalid" };
      }
      if (player.buffs.includes(item.buffId)) {
        return { success: false, coinsAfter: coins, reason: "owned_buff" };
      }
      if (player.buffs.length >= BuffSystem.MAX_BUFFS) {
        return { success: false, coinsAfter: coins, reason: "buff_limit" };
      }
      if (!BuffSystem.acquire(player, item.buffId)) {
        return { success: false, coinsAfter: coins, reason: "invalid" };
      }
    } else if (item.kind === "equipment") {
      // Ownership is recorded on meta equipment progress (meta.equipment); the
      // caller passes it in and persists meta afterwards (see purchaseMetaUpgrade
      // for the save pattern). Already-owned gear reports "invalid" because a
      // dedicated failure key does not exist in i18n yet.
      if (!item.equipmentId || !isEquipmentId(item.equipmentId) || !equipment) {
        return { success: false, coinsAfter: coins, reason: "invalid" };
      }
      if (!EquipmentSystem.acquire(equipment, item.equipmentId)) {
        return { success: false, coinsAfter: coins, reason: "invalid" };
      }
    } else {
      return { success: false, coinsAfter: coins, reason: "invalid" };
    }

    item.purchased = true;
    return {
      success: true,
      coinsAfter: coins - item.price,
      droppedWeaponId,
    };
  }
}
