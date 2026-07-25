import type { Player } from "../entities/Player";
import { WEAPONS, type WeaponData } from "../data/weapons";
import type { WeaponRuntimeState } from "./WeaponRuntimeState";

export interface WeaponResourceStrategy {
  type: "magazine" | "battery" | "heat" | "charge" | "action";
  init(runtime: WeaponRuntimeState, weapon: WeaponData): void;
  canFire(runtime: WeaponRuntimeState, weapon: WeaponData, player: Player): boolean;
  getFailReason?(runtime: WeaponRuntimeState, weapon: WeaponData, player: Player): "energy" | "overheated" | "reloading";
  consume(runtime: WeaponRuntimeState, weapon: WeaponData, player: Player): void;
  update(runtime: WeaponRuntimeState, weapon: WeaponData, player: Player, dt: number, isActive: boolean): void;
  getRatio(runtime: WeaponRuntimeState, weapon: WeaponData): number;
}

export const MagazineStrategy: WeaponResourceStrategy = {
  type: "magazine",
  init(runtime, weapon) {
    runtime.resourceState.max = weapon.magazineSize ?? 12;
    runtime.resourceState.value = runtime.resourceState.max;
    runtime.customState.reloadTimer = 0;
  },
  canFire(runtime, weapon, player) {
    return runtime.resourceState.value > 0 && runtime.customState.reloadTimer <= 0;
  },
  getFailReason(runtime, weapon, player) {
    return runtime.customState.reloadTimer > 0 ? "reloading" : "energy";
  },
  consume(runtime, weapon, player) {
    runtime.resourceState.value -= 1;
    if (runtime.resourceState.value <= 0) {
      runtime.customState.reloadTimer = weapon.reloadTime ?? 1.5;
    }
  },
  update(runtime, weapon, player, dt, isActive) {
    if (runtime.resourceState.value <= 0 || runtime.customState.reloadTimer > 0) {
      const reloadSpeed = isActive ? 1.0 : 1.5; // faster reload when stowed!
      if (runtime.customState.reloadTimer === undefined) {
        runtime.customState.reloadTimer = weapon.reloadTime ?? 1.5;
      }
      runtime.customState.reloadTimer -= dt * reloadSpeed;
      if (runtime.customState.reloadTimer <= 0) {
        runtime.resourceState.value = runtime.resourceState.max;
        runtime.customState.reloadTimer = 0;
      }
    }
  },
  getRatio(runtime, weapon) {
    if (runtime.customState.reloadTimer > 0) {
      return 1 - (runtime.customState.reloadTimer / Math.max(0.1, (weapon.reloadTime ?? 1.5)));
    }
    return runtime.resourceState.max > 0 ? runtime.resourceState.value / runtime.resourceState.max : 1;
  }
};

export const BatteryStrategy: WeaponResourceStrategy = {
  type: "battery",
  init(runtime, weapon) {
    runtime.resourceState.max = weapon.batteryCapacity ?? 25;
    runtime.resourceState.value = runtime.resourceState.max;
    runtime.customState.rechargeDelayTimer = 0;
    runtime.customState.isEmpowered = false;
  },
  canFire(runtime, weapon, player) {
    return runtime.resourceState.value >= (weapon.manaCost || 1);
  },
  getFailReason() { return "energy"; },
  consume(runtime, weapon, player) {
    runtime.resourceState.value -= (weapon.manaCost || 1);
    runtime.customState.rechargeDelayTimer = weapon.batteryRechargeDelay ?? 1.0;
    runtime.customState.isEmpowered = false;
  },
  update(runtime, weapon, player, dt, isActive) {
    if (runtime.customState.rechargeDelayTimer > 0) {
      runtime.customState.rechargeDelayTimer -= dt;
    } else if (runtime.resourceState.value < runtime.resourceState.max) {
      const rechargeRate = weapon.batteryRechargeRate ?? 10;
      runtime.resourceState.value = Math.min(runtime.resourceState.max, runtime.resourceState.value + rechargeRate * dt);
      if (runtime.resourceState.value >= runtime.resourceState.max) {
        runtime.customState.isEmpowered = true; // Empowered when naturally recovered to full
      }
    }
  },
  getRatio(runtime, weapon) {
    return runtime.resourceState.max > 0 ? runtime.resourceState.value / runtime.resourceState.max : 1;
  }
};

export const HeatStrategy: WeaponResourceStrategy = {
  type: "heat",
  init(runtime, weapon) {
    runtime.resourceState.max = weapon.maxHeat ?? 100;
    runtime.resourceState.value = 0;
    runtime.customState.overheatTimer = 0;
  },
  canFire(runtime, weapon, player) {
    return runtime.customState.overheatTimer <= 0 && runtime.resourceState.value < runtime.resourceState.max;
  },
  getFailReason() { return "overheated"; },
  consume(runtime, weapon, player) {
    runtime.resourceState.value += (weapon.heatPerShot ?? 10);
    if (runtime.resourceState.value >= runtime.resourceState.max) {
      runtime.customState.overheatTimer = weapon.overheatLockout ?? 2.0;
    }
  },
  update(runtime, weapon, player, dt, isActive) {
    if (runtime.customState.overheatTimer > 0) {
      runtime.customState.overheatTimer -= dt;
      if (runtime.customState.overheatTimer <= 0) {
        runtime.resourceState.value = 0; // instantly cool down after lockout
      }
    } else {
      const decay = weapon.heatDecayRate ?? 25;
      const decayMultiplier = isActive ? 1.0 : 1.5; // faster cool down when stowed
      runtime.resourceState.value = Math.max(0, runtime.resourceState.value - decay * decayMultiplier * dt);
    }
  },
  getRatio(runtime, weapon) {
    return runtime.resourceState.max > 0 ? runtime.resourceState.value / runtime.resourceState.max : 0;
  }
};

export const ChargeStrategy: WeaponResourceStrategy = {
  type: "charge",
  init(runtime, weapon) {
    runtime.resourceState.max = weapon.chargeSlots ?? 3;
    runtime.resourceState.value = runtime.resourceState.max;
    runtime.customState.chargeTimer = 0;
  },
  canFire(runtime, weapon, player) {
    return runtime.resourceState.value > 0;
  },
  getFailReason() { return "energy"; },
  consume(runtime, weapon, player) {
    runtime.resourceState.value -= 1;
  },
  update(runtime, weapon, player, dt, isActive) {
    if (runtime.resourceState.value < runtime.resourceState.max) {
      const chargeTime = weapon.chargeTime ?? 2.5;
      const chargeSpeed = isActive ? 1.0 : 1.25; 
      runtime.customState.chargeTimer += dt * chargeSpeed;
      if (runtime.customState.chargeTimer >= chargeTime) {
        runtime.customState.chargeTimer -= chargeTime;
        runtime.resourceState.value += 1;
      }
    } else {
      runtime.customState.chargeTimer = 0;
    }
  },
  getRatio(runtime, weapon) {
    const base = runtime.resourceState.max > 0 ? runtime.resourceState.value / runtime.resourceState.max : 1;
    const partial = (runtime.customState.chargeTimer ?? 0) / (weapon.chargeTime ?? 2.5);
    return Math.min(1, base + (partial / runtime.resourceState.max));
  }
};

export const ActionStrategy: WeaponResourceStrategy = {
  type: "action",
  init(runtime, weapon) {
    runtime.resourceState.max = 1;
    runtime.resourceState.value = 1;
  },
  canFire(runtime, weapon, player) { return true; },
  consume(runtime, weapon, player) { },
  update(runtime, weapon, player, dt, isActive) { },
  getRatio(runtime, weapon) { return 1; }
};

export const ResourceStrategies: Record<string, WeaponResourceStrategy> = {
  magazine: MagazineStrategy,
  battery: BatteryStrategy,
  heat: HeatStrategy,
  charge: ChargeStrategy,
  action: ActionStrategy,
};
