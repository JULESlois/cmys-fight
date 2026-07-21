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
