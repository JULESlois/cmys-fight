import type { Player } from "../entities/Player";
import { CombatEventDispatcher } from "./CombatEvents";
import { BuffSystem, type BuffId } from "./BuffSystem";

export type SynergyId =
  | "scorching_refraction"
  | "mirror_pierce"
  | "afterimage_volley"
  | "cross_current"
  | "bulwark_loop"
  | "phoenix_ember";

export interface SynergyDefinition {
  id: SynergyId;
  name: string;
  description: string;
  shortCode: string;
  requiredBuffs: [BuffId, BuffId];
  experimental?: boolean;
}

export const SYNERGIES: Record<SynergyId, SynergyDefinition> = {
  scorching_refraction: {
    id: "scorching_refraction",
    name: "SCORCHING REFRACTION",
    description: "[EXPERIMENTAL] Bounced projectiles leave a brief burn trail.",
    shortCode: "SCR",
    requiredBuffs: ["rebound_rounds", "elemental_rounds"],
    experimental: true,
  },
  mirror_pierce: {
    id: "mirror_pierce",
    name: "MIRROR PIERCE",
    description: "[EXPERIMENTAL] Pierce-then-bounce deals +25% damage.",
    shortCode: "MRP",
    requiredBuffs: ["piercing_shots", "rebound_rounds"],
    experimental: true,
  },
  afterimage_volley: {
    id: "afterimage_volley",
    name: "AFTERIMAGE VOLLEY",
    description: "[EXPERIMENTAL] Perfect dodge afterimage copies counter attack.",
    shortCode: "AFV",
    requiredBuffs: ["afterimage_capture", "counter_strike"],
    experimental: true,
  },
  cross_current: {
    id: "cross_current",
    name: "CROSS CURRENT",
    description: "Weapon swap grants 2 sync stacks.",
    shortCode: "XCR",
    requiredBuffs: ["cross_swap", "alternating_current"],
  },
  bulwark_loop: {
    id: "bulwark_loop",
    name: "BULWARK LOOP",
    description: "[EXPERIMENTAL] Completing armor recharge clears nearby projectiles.",
    shortCode: "BWL",
    requiredBuffs: ["bulwark_memory", "fast_recharge"],
    experimental: true,
  },
  phoenix_ember: {
    id: "phoenix_ember",
    name: "PHOENIX EMBER",
    description: "[EXPERIMENTAL] Emergency barrier ignition restores 2 armor.",
    shortCode: "PHE",
    requiredBuffs: ["emergency_barrier", "elemental_rounds"],
    experimental: true,
  },
};

export const ALL_SYNERGY_IDS = Object.keys(SYNERGIES) as SynergyId[];

export function detectActiveSynergies(player: Player): SynergyId[] {
  const active: SynergyId[] = [];
  for (const id of ALL_SYNERGY_IDS) {
    const def = SYNERGIES[id];
    const [a, b] = def.requiredBuffs;
    if (BuffSystem.has(player, a) && BuffSystem.has(player, b)) {
      active.push(id);
    }
  }
  return active;
}

export function isSynergyActive(player: Player, id: SynergyId): boolean {
  const def = SYNERGIES[id];
  const [a, b] = def.requiredBuffs;
  return BuffSystem.has(player, a) && BuffSystem.has(player, b);
}

// ============================================================
// Synergy event handlers
// ============================================================

export function initSynergyHandlers(): void {
  // cross_current: weapon swap grants 2 sync stacks
  CombatEventDispatcher.on("player_weapon_swapped", (payload) => {
    if (!isSynergyActive(payload.player, "cross_current")) return;
    const stacks = (payload.player.buffState["altCurrentStacks"] ?? 0) + 2;
    payload.player.buffState["altCurrentStacks"] = Math.min(4, stacks);
  });

  // bulwark_loop: armor recharge completion near structure clears projectiles
  // (handled in DungeonState update loop via buffState flag)

  // phoenix_ember: emergency barrier triggers burn + armor restore
  CombatEventDispatcher.on("player_damaged", (payload) => {
    if (!isSynergyActive(payload.player, "phoenix_ember")) return;
    if (payload.player.hp <= 1 && payload.player.buffState["phoenixEmberUsed"] !== true) {
      payload.player.buffState["phoenixEmberUsed"] = true;
      payload.player.armor = Math.min(payload.player.maxArmor, payload.player.armor + 2);
      payload.player.buffState["phoenixEmberZone"] = { x: payload.player.x, y: payload.player.y, timer: 2.0 };
    }
  });

  // scorching_refraction: bounced projectiles apply burn (handled in projectile system via flag)
  // mirror_pierce: pierce+bounce combo damage bonus (handled in DamageSystem via flag)
  // afterimage_volley: afterimage copies counter attack (handled in DungeonState via flag)
}
