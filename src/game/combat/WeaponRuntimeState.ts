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
  if (!state || typeof state !== "object" || typeof state.weaponId !== "string") {
    return createWeaponRuntimeState("pistol");
  }
  
  const def = WEAPONS[state.weaponId];
  if (!def) {
    return createWeaponRuntimeState("pistol");
  }
  
  const defaultState = createWeaponRuntimeState(state.weaponId);
  const resourceType = defaultState.resourceType;
  
  let fireCooldown = Number(state.fireCooldown);
  if (!Number.isFinite(fireCooldown) || fireCooldown < 0) fireCooldown = 0;
  
  let max = Number(state.resourceState?.max);
  if (!Number.isFinite(max) || max <= 0) max = defaultState.resourceState.max;
  
  let value = Number(state.resourceState?.value);
  if (!Number.isFinite(value) || value < 0) value = defaultState.resourceState.value;
  value = Math.min(value, max);
  
  let customState = state.customState;
  if (!customState || typeof customState !== "object" || Array.isArray(customState)) customState = {};
  
  return {
    weaponId: state.weaponId,
    resourceType,
    fireCooldown,
    resourceState: { value, max },
    customState: { ...customState },
  };
}

export function normalizeWeaponLoadoutRuntime(loadout: any): WeaponLoadoutRuntime {
  if (!loadout || typeof loadout !== "object") {
    return { slots: [createWeaponRuntimeState("pistol")], activeSlot: 0, swapTimer: 0 };
  }
  
  let slots = loadout.slots;
  if (!Array.isArray(slots) || slots.length === 0) {
    slots = [createWeaponRuntimeState("pistol")];
  }
  
  const s0 = normalizeWeaponRuntimeState(slots[0]);
  let s1 = slots[1] ? normalizeWeaponRuntimeState(slots[1]) : undefined;
  
  let activeSlot = Number(loadout.activeSlot);
  if (!Number.isFinite(activeSlot) || (activeSlot !== 0 && activeSlot !== 1)) activeSlot = 0;
  if (activeSlot === 1 && !s1) activeSlot = 0;
  
  let swapTimer = Number(loadout.swapTimer);
  if (!Number.isFinite(swapTimer) || swapTimer < 0) swapTimer = 0;
  
  return {
    slots: s1 ? [s0, s1] : [s0],
    activeSlot: activeSlot as 0 | 1,
    swapTimer,
  };
}

export function cloneWeaponLoadoutRuntime(loadout: WeaponLoadoutRuntime): WeaponLoadoutRuntime {
  return normalizeWeaponLoadoutRuntime(JSON.parse(JSON.stringify(loadout)));
}