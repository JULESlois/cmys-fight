export interface WeaponResourceRuntime {
  value: number;
  max: number;
}

export interface WeaponRuntimeState {
  weaponId: string;
  resourceType: "magazine" | "battery" | "heat" | "charge" | "action";
  fireCooldown: number;
  resourceState: WeaponResourceRuntime;
  customState: Record<string, any>;
}

export interface WeaponLoadoutRuntime {
  slots: [WeaponRuntimeState, WeaponRuntimeState?];
  activeSlot: 0 | 1;
  swapTimer: number;
}

import { WEAPONS } from "../data/weapons";

import { ResourceStrategies } from "./WeaponResourceStrategies";

export function createWeaponRuntimeState(weaponId: string): WeaponRuntimeState {
  const def = WEAPONS[weaponId];
  let resourceType: WeaponRuntimeState["resourceType"] = def?.resourceType || "action";
  let max = 0;
  let value = 0;
  
  if (def) {
    if (def.resourceType === "magazine") {
      max = def.magazineSize ?? 6;
      value = max;
    } else if (def.resourceType === "battery") {
      max = def.batteryCapacity ?? 25;
      value = max;
    } else if (def.resourceType === "heat") {
      max = def.maxHeat ?? 100;
      value = 0;
    } else if (def.resourceType === "charge") {
      max = def.chargeSlots ?? 3;
      value = max;
    } else if (!def.resourceType) {
      if (def.maxHeat) {
        resourceType = "heat";
        max = def.maxHeat;
        value = 0;
      } else if (def.manaCost > 0) {
        resourceType = "battery";
        max = def.batteryCapacity ?? 25;
        value = max;
      } else {
        resourceType = "magazine";
        max = def.magazineSize ?? 12;
        value = max;
      }
    }
  }

  const runtime: WeaponRuntimeState = {
    weaponId,
    resourceType,
    fireCooldown: 0,
    resourceState: { value: 0, max: 0 },
    customState: {}
  };
  
  if (def && ResourceStrategies[resourceType]) {
    ResourceStrategies[resourceType].init(runtime, def);
  }
  
  return runtime;
}

export function normalizeWeaponRuntimeState(state: any): WeaponRuntimeState {
  if (!state || typeof state !== "object" || !state.weaponId) {
    return createWeaponRuntimeState("pistol");
  }
  
  const def = WEAPONS[state.weaponId];
  if (!def) {
    return createWeaponRuntimeState("pistol");
  }
  
  const defaultState = createWeaponRuntimeState(state.weaponId);
  return {
    weaponId: state.weaponId,
    resourceType: state.resourceType ?? defaultState.resourceType,
    fireCooldown: typeof state.fireCooldown === "number" ? state.fireCooldown : 0,
    resourceState: {
      value: typeof state.resourceState?.value === "number" ? state.resourceState.value : defaultState.resourceState.value,
      max: typeof state.resourceState?.max === "number" ? state.resourceState.max : defaultState.resourceState.max,
    },
    customState: state.customState && typeof state.customState === "object" ? { ...state.customState } : {},
  };
}

export function normalizeWeaponLoadoutRuntime(loadout: any): WeaponLoadoutRuntime {
  if (!loadout || !Array.isArray(loadout.slots) || loadout.slots.length === 0) {
    return {
      slots: [createWeaponRuntimeState("pistol")],
      activeSlot: 0,
      swapTimer: 0,
    };
  }
  
  const s0 = normalizeWeaponRuntimeState(loadout.slots[0]);
  const s1 = loadout.slots[1] ? normalizeWeaponRuntimeState(loadout.slots[1]) : undefined;
  const activeSlot = (loadout.activeSlot === 1 && s1) ? 1 : 0;
  
  return {
    slots: s1 ? [s0, s1] : [s0],
    activeSlot,
    swapTimer: typeof loadout.swapTimer === "number" ? loadout.swapTimer : 0,
  };
}

export function cloneWeaponLoadoutRuntime(loadout: WeaponLoadoutRuntime): WeaponLoadoutRuntime {
  return normalizeWeaponLoadoutRuntime(JSON.parse(JSON.stringify(loadout)));
}