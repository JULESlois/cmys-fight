import { BUFFS, BuffSystem, type BuffId, type BuffRarity } from "../combat/BuffSystem";
import { WEAPONS, type WeaponRarity } from "../data/weapons";
import type { Player } from "../entities/Player";
import type { Room, StageData } from "../FloorGenerator";
import { createSeededRandom, hashSeed, normalizeSeed } from "../Random";
import { WeaponController } from "../combat/WeaponController";

export type ShopItemKind = "heal" | "armor" | "weapon" | "buff";

export interface ShopItem {
  id: string;
  kind: ShopItemKind;
  name: string;
  description: string;
  price: number;
  purchased: boolean;
  amount?: number;
  weaponId?: string;
  buffId?: BuffId;
  rarity?: WeaponRarity | BuffRarity;
}

export type ShopPurchaseFailure =
  | "sold"
  | "coins"
  | "full_hp"
  | "full_armor"
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

const WEAPON_PRICE: Record<WeaponRarity, number> = {
  common: 28,
  uncommon: 46,
  rare: 72,
};

const BUFF_PRICE: Record<BuffRarity, number> = {
  common: 34,
  uncommon: 52,
  rare: 78,
};

function stagePrice(base: number, stage: StageData, discount = 0): number {
  const multiplier = 1 + Math.max(0, stage.globalStageIndex - 1) * 0.07;
  const safeDiscount = Math.max(0, Math.min(0.5, discount));
  return Math.max(1, Math.round(base * multiplier * (1 - safeDiscount)));
}

function choose<T>(values: T[], random: () => number): T | undefined {
  if (values.length === 0) return undefined;
  return values[Math.min(values.length - 1, Math.floor(random() * values.length))];
}

export class ShopSystem {
  static getSeed(stage: StageData, room: Room): number {
    return normalizeSeed(room.shopSeed ?? hashSeed(stage.seed, `shop:${room.id}`));
  }

  static generateStock(stage: StageData, room: Room, player: Pick<Player, "buffs" | "weaponSlots" | "shopDiscount">): ShopItem[] {
    const seed = ShopSystem.getSeed(stage, room);
    room.shopSeed = seed;
    const random = createSeededRandom(seed);
    const supplyScale = 1 + Math.floor((stage.globalStageIndex - 1) / 5);

    const ownedWeapons = new Set(player.weaponSlots.filter(Boolean));
    const weaponPool = Object.values(WEAPONS).filter(weapon => !ownedWeapons.has(weapon.id));
    const weapon = choose(weaponPool.length > 0 ? weaponPool : Object.values(WEAPONS), random)!;

    const buffPool = (Object.keys(BUFFS) as BuffId[]).filter(id => !player.buffs.includes(id));
    const buffId = choose(buffPool, random);

    const stock: ShopItem[] = [
      {
        id: `${seed}:heal`,
        kind: "heal",
        name: "FIELD MEDKIT",
        description: `Restore ${2 + supplyScale} HP.`,
        price: stagePrice(14, stage, player.shopDiscount),
        amount: 2 + supplyScale,
        purchased: false,
      },
      {
        id: `${seed}:armor`,
        kind: "armor",
        name: "ARMOR PATCH",
        description: `Restore ${2 + supplyScale} Armor.`,
        price: stagePrice(16, stage, player.shopDiscount),
        amount: 2 + supplyScale,
        purchased: false,
      },
      {
        id: `${seed}:weapon:${weapon.id}`,
        kind: "weapon",
        name: weapon.name.toUpperCase(),
        description: `${weapon.rarity.toUpperCase()} ${weapon.category.toUpperCase()}.`,
        price: stagePrice(WEAPON_PRICE[weapon.rarity], stage, player.shopDiscount),
        weaponId: weapon.id,
        rarity: weapon.rarity,
        purchased: false,
      },
    ];

    if (buffId && player.buffs.length < BuffSystem.MAX_BUFFS) {
      const buff = BUFFS[buffId];
      stock.push({
        id: `${seed}:buff:${buff.id}`,
        kind: "buff",
        name: buff.name,
        description: buff.description,
        price: stagePrice(BUFF_PRICE[buff.rarity], stage, player.shopDiscount),
        buffId,
        rarity: buff.rarity,
        purchased: false,
      });
    }

    return stock;
  }

  static reconcileStock(
    stage: StageData,
    room: Room,
    player: Pick<Player, "buffs" | "weaponSlots" | "shopDiscount">,
  ): ShopItem[] {
    const existing = ShopSystem.normalizeStock(room.shopStock);
    if (!existing) return ShopSystem.generateStock(stage, room, player);

    const replacements = ShopSystem.generateStock(stage, room, player);
    const replacementByKind = new Map(replacements.map(item => [item.kind, item]));
    const reconciled: ShopItem[] = [];
    for (const item of existing) {
      if (item.purchased) {
        reconciled.push(item);
        continue;
      }

      const invalidBuff = item.kind === "buff" && (
        !item.buffId || player.buffs.includes(item.buffId) || player.buffs.length >= BuffSystem.MAX_BUFFS
      );
      const invalidWeapon = item.kind === "weapon" && (
        !item.weaponId || player.weaponSlots.includes(item.weaponId)
      );
      if (!invalidBuff && !invalidWeapon) {
        reconciled.push(item);
        continue;
      }

      const replacement = replacementByKind.get(item.kind);
      if (replacement) reconciled.push(replacement);
    }
    return ShopSystem.normalizeStock(reconciled.slice(0, 4)) ?? [];
  }

  static normalizeStock(value: unknown): ShopItem[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const normalized: ShopItem[] = [];
    for (const raw of value) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as Partial<ShopItem>;
      if (!item.id || !item.kind || !item.name || !Number.isFinite(Number(item.price))) continue;
      if (!["heal", "armor", "weapon", "buff"].includes(item.kind)) continue;
      if (item.kind === "weapon" && (!item.weaponId || !(item.weaponId in WEAPONS))) continue;
      if (item.kind === "buff" && (!item.buffId || !(item.buffId in BUFFS))) continue;
      normalized.push({
        id: String(item.id),
        kind: item.kind,
        name: String(item.name),
        description: String(item.description ?? ""),
        price: Math.max(0, Math.floor(Number(item.price))),
        purchased: item.purchased === true,
        amount: Number.isFinite(Number(item.amount)) ? Math.max(0, Number(item.amount)) : undefined,
        weaponId: item.weaponId,
        buffId: item.buffId,
        rarity: item.rarity,
      });
    }
    return normalized.length > 0 ? normalized.slice(0, 4) : undefined;
  }

  static purchase(player: Player, item: ShopItem, coins: number): ShopPurchaseResult {
    if (item.purchased) return { success: false, coinsAfter: coins, reason: "sold" };
    if (coins < item.price) return { success: false, coinsAfter: coins, reason: "coins" };

    let droppedWeaponId: string | undefined;
    if (item.kind === "heal") {
      if (player.hp >= player.maxHp) return { success: false, coinsAfter: coins, reason: "full_hp" };
      player.hp = Math.min(player.maxHp, player.hp + (item.amount ?? 0));
    } else if (item.kind === "armor") {
      if (player.armor >= player.maxArmor) return { success: false, coinsAfter: coins, reason: "full_armor" };
      player.armor = Math.min(player.maxArmor, player.armor + (item.amount ?? 0));
    } else if (item.kind === "weapon") {
      if (!item.weaponId || !(item.weaponId in WEAPONS)) {
        return { success: false, coinsAfter: coins, reason: "invalid" };
      }
      if (player.weaponSlots.includes(item.weaponId)) {
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
