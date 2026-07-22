import type { Player } from "../entities/Player";
import type { WeaponRuntimeState } from "./WeaponRuntimeState";
import { CombatEventDispatcher } from "./CombatEvents";
import { WEAPONS } from "../data/weapons";

export type WeaponModuleId =
  | "magazine_tactical_reload"
  | "battery_overcharge"
  | "heat_vent_burst"
  | "charge_elite_restore";

export type ModuleResourceFilter = "magazine" | "battery" | "heat" | "charge" | "any";

export interface WeaponModuleDefinition {
  id: WeaponModuleId;
  name: string;
  description: string;
  shortCode: string;
  resourceFilter: ModuleResourceFilter;
  rarity: "common" | "uncommon" | "rare";
}

export const WEAPON_MODULES: Record<WeaponModuleId, WeaponModuleDefinition> = {
  magazine_tactical_reload: {
    id: "magazine_tactical_reload",
    name: "TACTICAL RELOAD",
    description: "Reload completes 25% faster.",
    shortCode: "RLD",
    resourceFilter: "magazine",
    rarity: "common",
  },
  battery_overcharge: {
    id: "battery_overcharge",
    name: "OVERCHARGE CELL",
    description: "First shot after full recharge deals +50% damage.",
    shortCode: "OVC",
    resourceFilter: "battery",
    rarity: "uncommon",
  },
  heat_vent_burst: {
    id: "heat_vent_burst",
    name: "VENT BURST",
    description: "Overheat releases a small damage burst around you.",
    shortCode: "VNT",
    resourceFilter: "heat",
    rarity: "rare",
  },
  charge_elite_restore: {
    id: "charge_elite_restore",
    name: "ELITE SIPHON",
    description: "Killing an elite enemy restores 1 charge slot.",
    shortCode: "ELT",
    resourceFilter: "charge",
    rarity: "rare",
  },
};

export const ALL_MODULE_IDS = Object.keys(WEAPON_MODULES) as WeaponModuleId[];

export const MAX_MODULES_PER_WEAPON = 2;

export function canEquipModule(moduleId: WeaponModuleId, weaponId: string): boolean {
  const mod = WEAPON_MODULES[moduleId];
  const weapon = WEAPONS[weaponId];
  if (!mod || !weapon) return false;
  if (mod.resourceFilter === "any") return true;
  const runtime = weapon.resourceType
    ?? (weapon.maxHeat ? "heat" : weapon.manaCost > 0 ? "battery" : "magazine");
  return runtime === mod.resourceFilter;
}

export function getModulesForWeapon(slot: WeaponRuntimeState): WeaponModuleId[] {
  return (slot.customState.modules as WeaponModuleId[] | undefined) ?? [];
}

export function equipModule(slot: WeaponRuntimeState, moduleId: WeaponModuleId): boolean {
  if (!canEquipModule(moduleId, slot.weaponId)) return false;
  const modules = getModulesForWeapon(slot);
  if (modules.includes(moduleId) || modules.length >= MAX_MODULES_PER_WEAPON) return false;
  modules.push(moduleId);
  slot.customState.modules = modules;
  return true;
}

export function hasModule(slot: WeaponRuntimeState, moduleId: WeaponModuleId): boolean {
  return getModulesForWeapon(slot).includes(moduleId);
}

// ============================================================
// Event-driven module effects
// ============================================================

function findSlotForWeapon(player: Player, weaponId: string): WeaponRuntimeState | undefined {
  return player.weaponLoadout.slots.find(s => s?.weaponId === weaponId);
}

function findActiveSlot(player: Player): WeaponRuntimeState | undefined {
  return player.weaponLoadout.slots[player.weaponLoadout.activeSlot];
}

export function initWeaponModuleHandlers(): void {
  // battery_overcharge: mark empowered on battery_full
  CombatEventDispatcher.on("battery_full", (payload) => {
    const slot = findSlotForWeapon(payload.player, payload.weaponId);
    if (slot && hasModule(slot, "battery_overcharge")) {
      slot.customState.isEmpowered = true;
    }
  });

  // heat_vent_burst: on overheat, deal AoE damage (handled by DungeonState via flag)
  CombatEventDispatcher.on("weapon_overheated", (payload) => {
    const slot = findSlotForWeapon(payload.player, payload.weaponId);
    if (slot && hasModule(slot, "heat_vent_burst")) {
      slot.customState.ventBurstPending = true;
    }
  });

  // charge_elite_restore: on elite kill, restore 1 charge
  CombatEventDispatcher.on("player_kill_enemy", (payload) => {
    if (!payload.enemy.isElite) return;
    const slot = findActiveSlot(payload.player);
    if (slot && slot.resourceType === "charge" && hasModule(slot, "charge_elite_restore")) {
      slot.resourceState.value = Math.min(slot.resourceState.max, slot.resourceState.value + 1);
    }
  });

  // magazine_tactical_reload: handled in MagazineStrategy.update via customState flag
  // We set a flag on the slot so the strategy can check it
  CombatEventDispatcher.on("reload_started", (payload) => {
    const slot = findSlotForWeapon(payload.player, payload.weaponId);
    if (slot && hasModule(slot, "magazine_tactical_reload")) {
      slot.customState.tacticalReloadActive = true;
    }
  });
  CombatEventDispatcher.on("reload_completed", (payload) => {
    const slot = findSlotForWeapon(payload.player, payload.weaponId);
    if (slot) {
      slot.customState.tacticalReloadActive = false;
    }
  });
}
