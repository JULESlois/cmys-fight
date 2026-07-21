import { BUFFS, BuffSystem, type BuffId, type BuffRarity } from "../combat/BuffSystem";
import { WEAPONS, isWeaponAvailableForCharacter, rollAvailableWeapon, type WeaponRarity } from "../data/weapons";
import type { Player } from "../entities/Player";
import type { Room, StageData } from "../FloorGenerator";
import { createSeededRandom, hashSeed, normalizeSeed } from "../Random";
import { WeaponController } from "../combat/WeaponController";
import { getDifficultyStageIndex } from "../RunProgress";

export type ShopItemKind = "weapon" | "buff";

export interface ShopItem {
  id: string;
  kind: ShopItemKind;
  name: string;
  description: string;
  price: number;
  purchased: boolean;
  weaponId?: string;
  buffId?: BuffId;
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
  legendary: 116,
};

// Shop talents remain broadly accessible while receiving a small high-tier bias.
const SHOP_BUFF_RARITY_WEIGHT: Record<BuffRarity, number> = {
  common: 1,
  uncommon: 1.05,
  rare: 1.2,
  legendary: 1.15,
};

function stagePrice(base: number, stage: StageData, discount = 0): number {
  const multiplier = 1 + Math.max(0, getDifficultyStageIndex(stage.globalStageIndex) - 1) * 0.07;
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

  static generateStock(stage: StageData, room: Room, player: Pick<Player, "characterId" | "buffs" | "weaponLoadout" | "shopDiscount">): ShopItem[] {
    const seed = ShopSystem.getSeed(stage, room);
    room.shopSeed = seed;
    const random = createSeededRandom(seed);

    const availableBuffSlots = Math.max(0, BuffSystem.MAX_BUFFS - player.buffs.length);
    const difficultyStageIndex = getDifficultyStageIndex(stage.globalStageIndex);
    const buffPool = (Object.keys(BUFFS) as BuffId[]).filter(id =>
      !player.buffs.includes(id) && (BUFFS[id].minGlobalStage ?? 1) <= difficultyStageIndex
    );
    const desiredBuffCount = Math.min(BASE_BUFF_SLOTS, availableBuffSlots, buffPool.length);
    const desiredWeaponCount = SHOP_STOCK_SIZE - desiredBuffCount;

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
    for (let index = 0; index < rows && stock.length < SHOP_STOCK_SIZE; index++) {
      if (weaponItems[index]) stock.push(weaponItems[index]);
      if (buffItems[index] && stock.length < SHOP_STOCK_SIZE) stock.push(buffItems[index]);
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
  ): ShopItem[] {
    const existing = ShopSystem.normalizeStock(room.shopStock);
    if (!existing) return ShopSystem.generateStock(stage, room, player);

    const generated = ShopSystem.generateStock(stage, room, player);
    const reconciled: ShopItem[] = [];
    const retainedIds = new Set<string>();
    const retainedWeaponIds = new Set<string>();
    const retainedBuffIds = new Set<BuffId>();

    for (const item of existing) {
      if (retainedIds.has(item.id)) continue;
      if (item.weaponId && retainedWeaponIds.has(item.weaponId)) continue;
      if (item.buffId && retainedBuffIds.has(item.buffId)) continue;
      const invalidBuff = item.kind === "buff" && !item.purchased && (
        !item.buffId || player.buffs.includes(item.buffId) || player.buffs.length >= BuffSystem.MAX_BUFFS
      );
      const invalidWeapon = item.kind === "weapon" && !item.purchased && (
        !item.weaponId || player.weaponLoadout.slots.map(s => s?.weaponId).includes(item.weaponId) ||
        !isWeaponAvailableForCharacter(WEAPONS[item.weaponId], player.characterId)
      );
      if (invalidBuff || invalidWeapon) continue;
      retainedIds.add(item.id);
      if (item.weaponId) retainedWeaponIds.add(item.weaponId);
      if (item.buffId) retainedBuffIds.add(item.buffId);
      reconciled.push(item);
      if (reconciled.length >= SHOP_STOCK_SIZE) break;
    }

    for (const item of generated) {
      if (reconciled.length >= SHOP_STOCK_SIZE) break;
      if (retainedIds.has(item.id)) continue;
      if (item.weaponId && retainedWeaponIds.has(item.weaponId)) continue;
      if (item.buffId && retainedBuffIds.has(item.buffId)) continue;
      retainedIds.add(item.id);
      if (item.weaponId) retainedWeaponIds.add(item.weaponId);
      if (item.buffId) retainedBuffIds.add(item.buffId);
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
      if (item.kind !== "weapon" && item.kind !== "buff") continue;
      if (item.kind === "weapon" && (!item.weaponId || !(item.weaponId in WEAPONS))) continue;
      if (item.kind === "buff" && (!item.buffId || !(item.buffId in BUFFS))) continue;
      const rarity = item.kind === "weapon"
        ? WEAPONS[item.weaponId!].rarity
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
        rarity,
      });
    }
    return normalized.length > 0 ? normalized.slice(0, SHOP_STOCK_SIZE) : undefined;
  }

  static purchase(player: Player, item: ShopItem, coins: number): ShopPurchaseResult {
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
