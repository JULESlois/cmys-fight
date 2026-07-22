import type { Player } from "../entities/Player";
import { CombatEventDispatcher } from "./CombatEvents";
import { BuffSystem } from "./BuffSystem";
import { getModulesForWeapon, hasModule } from "./WeaponModules";
import type { WeaponRuntimeState } from "./WeaponRuntimeState";

export type SynergyId =
  | "cold_hot_exchange"
  | "last_round_protocol"
  | "phase_swap"
  | "bulwark_loop";

export interface SynergyDefinition {
  id: SynergyId;
  name: string;
  description: string;
  shortCode: string;
}

export const SYNERGIES: Record<SynergyId, SynergyDefinition> = {
  cold_hot_exchange: {
    id: "cold_hot_exchange",
    name: "COLD-HOT EXCHANGE",
    description: "Heat weapon cooling boosts battery recharge; full battery vents heat.",
    shortCode: "CHX",
  },
  last_round_protocol: {
    id: "last_round_protocol",
    name: "LAST ROUND PROTOCOL",
    description: "Emptying a magazine empowers your next charge weapon shot.",
    shortCode: "LRP",
  },
  phase_swap: {
    id: "phase_swap",
    name: "PHASE SWAP",
    description: "Perfect dodge instantly swaps weapon; first shot costs no resource.",
    shortCode: "PHS",
  },
  bulwark_loop: {
    id: "bulwark_loop",
    name: "BULWARK LOOP",
    description: "Perfect dodge advances armor recovery; full armor grants guard layer.",
    shortCode: "BWL",
  },
};

export const ALL_SYNERGY_IDS = Object.keys(SYNERGIES) as SynergyId[];

function getSlotResourceTypes(player: Player): [string, string?] {
  const slots = player.weaponLoadout.slots;
  return [
    slots[0]?.resourceType ?? "action",
    slots[1]?.resourceType,
  ];
}

function hasResourceCombo(player: Player, a: string, b: string): boolean {
  const [r0, r1] = getSlotResourceTypes(player);
  return (r0 === a && r1 === b) || (r0 === b && r1 === a);
}

export function detectActiveSynergies(player: Player): SynergyId[] {
  const active: SynergyId[] = [];
  const [r0, r1] = getSlotResourceTypes(player);

  // cold_hot_exchange: heat + battery in loadout
  if (hasResourceCombo(player, "heat", "battery")) {
    active.push("cold_hot_exchange");
  }

  // last_round_protocol: magazine + charge in loadout
  if (hasResourceCombo(player, "magazine", "charge")) {
    active.push("last_round_protocol");
  }

  // phase_swap: counter_strike buff owned (perfect dodge talent)
  if (BuffSystem.has(player, "counter_strike")) {
    active.push("phase_swap");
  }

  // bulwark_loop: knight character + armor-related buff
  if (player.characterId === "knight" && (
    BuffSystem.has(player, "armor_capacitor") ||
    BuffSystem.has(player, "fast_recharge") ||
    BuffSystem.has(player, "aegis_foundry") ||
    BuffSystem.has(player, "reactive_plating")
  )) {
    active.push("bulwark_loop");
  }

  return active;
}

export function isSynergyActive(player: Player, id: SynergyId): boolean {
  return detectActiveSynergies(player).includes(id);
}

// ============================================================
// Synergy runtime state (stored on player.buffState for simplicity)
// ============================================================

interface SynergyRuntimeState {
  lastRoundProtocolReady: boolean;
  phaseSwapFreeShot: boolean;
}

function getSynergyState(player: Player): SynergyRuntimeState {
  if (!(player as any)._synergyState) {
    (player as any)._synergyState = {
      lastRoundProtocolReady: false,
      phaseSwapFreeShot: false,
    };
  }
  return (player as any)._synergyState;
}

// ============================================================
// Event-driven synergy effects
// ============================================================

export function initSynergyHandlers(): void {
  // cold_hot_exchange: battery_full → vent heat on the heat weapon slot
  CombatEventDispatcher.on("battery_full", (payload) => {
    if (!isSynergyActive(payload.player, "cold_hot_exchange")) return;
    const heatSlot = payload.player.weaponLoadout.slots.find(
      s => s?.resourceType === "heat"
    );
    if (heatSlot && heatSlot.resourceState.value > 0) {
      heatSlot.resourceState.value = Math.max(0, heatSlot.resourceState.value - 25);
    }
  });

  // cold_hot_exchange: heat weapon stowed cooling boosts battery recharge
  // (handled via update loop flag — battery strategy checks synergy state)

  // last_round_protocol: reload_started (magazine empty) → empower next charge shot
  CombatEventDispatcher.on("reload_started", (payload) => {
    if (!isSynergyActive(payload.player, "last_round_protocol")) return;
    const state = getSynergyState(payload.player);
    state.lastRoundProtocolReady = true;
  });

  // last_round_protocol: consume the empower on weapon_fired if charge weapon
  CombatEventDispatcher.on("weapon_fired", (payload) => {
    if (!isSynergyActive(payload.player, "last_round_protocol")) return;
    const state = getSynergyState(payload.player);
    if (state.lastRoundProtocolReady && payload.resourceType === "charge") {
      state.lastRoundProtocolReady = false;
      // The empower flag is checked by WeaponController via buffState
      payload.player.buffState.counterStrikeReady = true;
    }
  });

  // phase_swap: perfect_dodge → instant swap + free first shot
  CombatEventDispatcher.on("player_perfect_dodge", (payload) => {
    if (!isSynergyActive(payload.player, "phase_swap")) return;
    const state = getSynergyState(payload.player);
    // Instant swap
    const slots = payload.player.weaponLoadout.slots;
    if (slots[1]) {
      const prevId = payload.player.currentWeaponId;
      payload.player.weaponLoadout.activeSlot =
        payload.player.weaponLoadout.activeSlot === 0 ? 1 : 0;
      CombatEventDispatcher.emit("player_weapon_swapped", {
        player: payload.player,
        previousWeaponId: prevId,
        newWeaponId: payload.player.currentWeaponId,
      });
    }
    // Free first shot
    state.phaseSwapFreeShot = true;
  });

  // phase_swap: consume free shot on weapon_fired
  CombatEventDispatcher.on("weapon_fired", (payload) => {
    const state = getSynergyState(payload.player);
    if (state.phaseSwapFreeShot) {
      state.phaseSwapFreeShot = false;
      // Refund the resource consumed by this shot
      const slot = payload.player.weaponLoadout.slots[payload.player.weaponLoadout.activeSlot];
      if (slot) {
        if (slot.resourceType === "magazine") {
          slot.resourceState.value = Math.min(slot.resourceState.max, slot.resourceState.value + 1);
        } else if (slot.resourceType === "battery") {
          const weapon = (require("../data/weapons") as typeof import("../data/weapons")).WEAPONS[slot.weaponId];
          slot.resourceState.value = Math.min(slot.resourceState.max, slot.resourceState.value + (weapon?.manaCost ?? 1));
        } else if (slot.resourceType === "charge") {
          slot.resourceState.value = Math.min(slot.resourceState.max, slot.resourceState.value + 1);
        }
        // heat: no refund needed (heat is additive)
      }
    }
  });

  // bulwark_loop: perfect_dodge → advance armor recovery timer
  CombatEventDispatcher.on("player_perfect_dodge", (payload) => {
    if (!isSynergyActive(payload.player, "bulwark_loop")) return;
    // Reduce armor recharge timer by 1s
    payload.player.armorRechargeTimer = Math.max(0, payload.player.armorRechargeTimer - 1.0);
  });

  // bulwark_loop: armor full → grant guard layer (checked in DamageSystem update)
  // This is handled by the existing knightGuardReady logic in DamageSystem
}
