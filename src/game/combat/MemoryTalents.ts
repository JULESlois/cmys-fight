import type { Player } from "../entities/Player";
import { CombatEventDispatcher } from "./CombatEvents";
import { BuffSystem } from "./BuffSystem";

// ============================================================
// Memory Talents (§3) — chosen at Rebirth Spring, one per run
// ============================================================

export type MemoryTalentId =
  | "ballistic_memory"
  | "echo_memory"
  | "phoenix_memory"
  | "starmap_memory"
  | "arsenal_memory"
  | "salvage_memory"
  | "secretpath_memory"
  | "forbidden_memory";

export interface MemoryTalentDefinition {
  id: MemoryTalentId;
  name: string;
  description: string;
  shortCode: string;
  experimental?: boolean;
}

export const MEMORY_TALENTS: Record<MemoryTalentId, MemoryTalentDefinition> = {
  ballistic_memory: {
    id: "ballistic_memory",
    name: "BALLISTIC MEMORY",
    description: "First buff choice includes a Vanguard protocol. First non-starter weapon gains +10% speed until chapter end.",
    shortCode: "BAL",
    experimental: true,


  },
  echo_memory: {
    id: "echo_memory",
    name: "ECHO MEMORY",
    description: "Start with one Archive Pulse. First perfect dodge restores 25% dodge cooldown.",
    shortCode: "ECH",
    experimental: true,


  },
  phoenix_memory: {
    id: "phoenix_memory",
    name: "PHOENIX MEMORY",
    description: "First armor break per chapter clears nearby projectiles. If no armor, triggers at half HP.",
    shortCode: "PHX",
    experimental: true,


  },
  starmap_memory: {
    id: "starmap_memory",
    name: "STARMAP MEMORY",
    description: "Route choice fully reveals one exit (enemy/env/reward/threat). Other exit shows partial info.",
    shortCode: "STM",
    experimental: true,


  },
  arsenal_memory: {
    id: "arsenal_memory",
    name: "ARSENAL MEMORY",
    description: "Choose a weapon family at Armory. First weapon reward strongly favors that family.",
    shortCode: "ARS",
    experimental: true,


  },
  salvage_memory: {
    id: "salvage_memory",
    name: "SALVAGE MEMORY",
    description: "First 5 props destroyed per chapter add extra scrap. First scrap completion drops energy + coins.",
    shortCode: "SLV",
    experimental: true,


  },
  secretpath_memory: {
    id: "secretpath_memory",
    name: "SECRETPATH MEMORY",
    description: "First room with hidden connection per chapter plays a faint directional hint.",
    shortCode: "SCP",
    experimental: true,


  },
  forbidden_memory: {
    id: "forbidden_memory",
    name: "FORBIDDEN MEMORY",
    description: "Start with +15 corruption. First hidden room or anomaly altar reward quality +1.",
    shortCode: "FBD",
    experimental: true,


  },
};

export const ALL_MEMORY_TALENT_IDS = Object.keys(MEMORY_TALENTS) as MemoryTalentId[];

// ============================================================
// Memory talent runtime state (stored on player.buffState)
// ============================================================

export function getActiveMemoryTalent(player: Player): MemoryTalentId | null {
  return (player.buffState["memoryTalent"] as MemoryTalentId) ?? null;
}

export function setMemoryTalent(player: Player, id: MemoryTalentId): void {
  player.buffState["memoryTalent"] = id;
  if (id === "echo_memory") {
    player.buffState["archivePulseCharges"] = 1;
  }
  if (id === "forbidden_memory") {
    player.buffState["corruption"] = (player.buffState["corruption"] ?? 0) + 15;
  }
}

// ============================================================
// Memory talent event handlers
// ============================================================

let memoryTalentsInitialized = false;

export function initMemoryTalentHandlers(): void {
  if (memoryTalentsInitialized) return;
  memoryTalentsInitialized = true;

  // echo_memory: first perfect dodge restores 25% dodge cooldown
  CombatEventDispatcher.on("player_perfect_dodge", (payload) => {
    if (getActiveMemoryTalent(payload.player) !== "echo_memory") return;
    if (payload.player.buffState["echoMemoryUsed"] === true) return;
    payload.player.buffState["echoMemoryUsed"] = true;
    payload.player.dodgeCooldown = Math.max(0, payload.player.dodgeCooldown * 0.75);
  });

  // phoenix_memory: first armor break per chapter clears nearby projectiles
  CombatEventDispatcher.on("player_damaged", (payload) => {
    if (getActiveMemoryTalent(payload.player) !== "phoenix_memory") return;
    const chapterUsed = payload.player.buffState["phoenixMemoryChapterUsed"] ?? -1;
    const currentChapter = payload.player.buffState["currentChapter"] ?? 1;
    if (chapterUsed === currentChapter) return;
    if (payload.player.armor <= 0) {
      payload.player.buffState["phoenixMemoryChapterUsed"] = currentChapter;
      payload.player.buffState["phoenixMemoryClearReady"] = true;
    }
  });

  // salvage_memory: first 5 props per chapter add extra scrap
  CombatEventDispatcher.on("player_hit_enemy", (payload) => {
    if (getActiveMemoryTalent(payload.player) !== "salvage_memory") return;
    // Prop tracking handled in DungeonState via buffState
  });
}
