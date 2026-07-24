import type { Player } from "../entities/Player";
import { CombatEventDispatcher } from "./CombatEvents";
import { BUFFS, BuffSystem, type BuffId, type BuffFamily } from "./BuffSystem";

// ============================================================
// Protocol Evolutions (§11) — triggered by 3 buffs of same family
// ============================================================

export type EvolutionId =
  | "overclock_core_evo"
  | "ghost_loop_evo"
  | "aegis_foundry_evo"
  | "skill_loop_evo"
  | "living_dungeon_evo"
  | "astral_atlas_evo";

export interface EvolutionDefinition {
  id: EvolutionId;
  name: string;
  description: string;
  shortCode: string;
  requiredFamily: BuffFamily;
  requiredCount: number;
  experimental?: boolean;
}

export const EVOLUTIONS: Record<EvolutionId, EvolutionDefinition> = {
  overclock_core_evo: {
    id: "overclock_core_evo",
    name: "OVERCLOCK CORE",
    description: "6 consecutive hits or 3 rapid kills: +15% crit, -30% spread, +20% speed for 3s. First trigger restores energy.",
    shortCode: "OVR",
    requiredFamily: "vanguard",
    requiredCount: 3,
    experimental: true,


  },
  ghost_loop_evo: {
    id: "ghost_loop_evo",
    name: "GHOST LOOP",
    description: "Perfect dodge afterimage copies next 2 attacks at 35%. Swap refunds 30% dodge cooldown (3s CD).",
    shortCode: "GHL",
    requiredFamily: "echo",
    requiredCount: 3,
    experimental: true,


  },
  aegis_foundry_evo: {
    id: "aegis_foundry_evo",
    name: "AEGIS FOUNDRY",
    description: "+4 max armor. Armor regen produces repulsion. Full armor grants 1s projectile barrier (8s CD).",
    shortCode: "AEG",
    requiredFamily: "phoenix",
    requiredCount: 3,
    experimental: true,


  },
  skill_loop_evo: {
    id: "skill_loop_evo",
    name: "SKILL LOOP",
    description: "Every 3rd skill use repeats a weakened version (40% effect) after 0.6s. No re-trigger.",
    shortCode: "SKL",
    requiredFamily: "aether",
    requiredCount: 3,
    experimental: true,


  },
  living_dungeon_evo: {
    id: "living_dungeon_evo",
    name: "LIVING DUNGEON",
    description: "First active prop per room can be overloaded (bigger explosion, longer freeze, more damage, arc).",
    shortCode: "LVD",
    requiredFamily: "salvage",
    requiredCount: 3,
    experimental: true,


  },
  astral_atlas_evo: {
    id: "astral_atlas_evo",
    name: "ASTRAL ATLAS",
    description: "All adjacent rooms show reward type. Exit shows full threat. First hidden exit per chapter shows as rumor.",
    shortCode: "AST",
    requiredFamily: "survey",
    requiredCount: 3,
    experimental: true,


  },
};

export const ALL_EVOLUTION_IDS = Object.keys(EVOLUTIONS) as EvolutionId[];

// ============================================================
// Evolution detection
// ============================================================

function countFamilyBuffs(player: Player, family: BuffFamily): number {
  return player.buffs.filter(id => {
    const def = BUFFS[id];
    return def && def.family === family;
  }).length;
}

export function getAvailableEvolutions(player: Player): EvolutionId[] {
  const available: EvolutionId[] = [];
  for (const id of ALL_EVOLUTION_IDS) {
    const def = EVOLUTIONS[id];
    if (countFamilyBuffs(player, def.requiredFamily) >= def.requiredCount) {
      available.push(id);
    }
  }
  return available;
}

export function getActiveEvolution(player: Player): EvolutionId | null {
  return (player.buffState["activeEvolution"] as EvolutionId) ?? null;
}

export function activateEvolution(player: Player, id: EvolutionId): boolean {
  if (player.buffState["activeEvolution"]) return false;
  const def = EVOLUTIONS[id];
  if (countFamilyBuffs(player, def.requiredFamily) < def.requiredCount) return false;
  player.buffState["activeEvolution"] = id;
  if (id === "aegis_foundry_evo") {
    player.maxArmor += 4;
    player.armor = Math.min(player.maxArmor, player.armor + 4);
  }
  return true;
}

// ============================================================
// Evolution event handlers
// ============================================================

let evolutionHandlersInitialized = false;

export function initEvolutionHandlers(): void {
  if (evolutionHandlersInitialized) return;
  evolutionHandlersInitialized = true;

  // overclock_core_evo: track consecutive hits
  CombatEventDispatcher.on("player_hit_enemy", (payload) => {
    if (getActiveEvolution(payload.player) !== "overclock_core_evo") return;
    const hits = (payload.player.buffState["overclockHits"] ?? 0) + 1;
    payload.player.buffState["overclockHits"] = hits;
    if (hits >= 6) {
      payload.player.buffState["overclockActive"] = 3.0;
      payload.player.buffState["overclockHits"] = 0;
      if (payload.player.buffState["overclockFirstTrigger"] !== true) {
        payload.player.buffState["overclockFirstTrigger"] = true;
        payload.player.mana = Math.min(payload.player.maxMana, payload.player.mana + 5);
      }
    }
  });

  // overclock_core_evo: 3 rapid kills also triggers
  CombatEventDispatcher.on("player_kill_enemy", (payload) => {
    if (getActiveEvolution(payload.player) !== "overclock_core_evo") return;
    const kills = (payload.player.buffState["overclockRapidKills"] ?? 0) + 1;
    payload.player.buffState["overclockRapidKills"] = kills;
    payload.player.buffState["overclockKillTimer"] = 2.0;
    if (kills >= 3) {
      payload.player.buffState["overclockActive"] = 3.0;
      payload.player.buffState["overclockRapidKills"] = 0;
    }
  });

  // skill_loop_evo: track skill use count
  CombatEventDispatcher.on("skill_activated", (payload) => {
    if (getActiveEvolution(payload.player) !== "skill_loop_evo") return;
    const count = (payload.player.buffState["skillLoopCount"] ?? 0) + 1;
    payload.player.buffState["skillLoopCount"] = count;
    if (count >= 3) {
      payload.player.buffState["skillLoopCount"] = 0;
      payload.player.buffState["skillLoopRepeatReady"] = true;
    }
  });

  // ghost_loop_evo: perfect dodge triggers afterimage copy
  CombatEventDispatcher.on("player_perfect_dodge", (payload) => {
    if (getActiveEvolution(payload.player) !== "ghost_loop_evo") return;
    payload.player.buffState["ghostLoopCopies"] = 2;
  });

  // ghost_loop_evo: weapon swap refunds dodge cooldown
  CombatEventDispatcher.on("player_weapon_swapped", (payload) => {
    if (getActiveEvolution(payload.player) !== "ghost_loop_evo") return;
    const lastRefund = payload.player.buffState["ghostLoopLastRefund"] ?? 0;
    const now = payload.player.buffState["ghostLoopTimer"] ?? 0;
    if (now - lastRefund >= 3.0) {
      payload.player.dodgeCooldown = Math.max(0, payload.player.dodgeCooldown * 0.7);
      payload.player.buffState["ghostLoopLastRefund"] = now;
    }
  });
}
