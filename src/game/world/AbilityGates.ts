/**
 * Metroidvania ability gating, adapted to this game's structure.
 *
 * The existing world is a chapter-ordered set of procedural room graphs, not
 * one contiguous castle, so gating is applied at two granularities:
 *
 *   room gates  — a door or passage inside a floor that stays shut until the
 *                 player owns the matching ability soul
 *   node gates  — a whole world node (side area) hidden from the route map
 *                 until its ability is held
 *
 * Both read from the same ability set, so a single soul pickup opens content
 * at both scales. Exploration percentage is computed over gated + ungated
 * rooms so the number moves when a gate is finally opened.
 */

import type { SoulAbility } from "../data/souls";

/** Terrain a gate is expressed as, purely for renderer and prompt selection. */
export type GateKind =
  /** A chasm the player must cross. Opened by double_jump or grapple. */
  | "chasm"
  /** A low crawlspace. Opened by slide. */
  | "crawlspace"
  /** A barred grate the player passes through as vapour. Opened by mist. */
  | "grate"
  /** A frozen surface that is lethal without footing. Opened by ice_walk. */
  | "ice_field"
  /** A superheated corridor. Opened by heat_ward. */
  | "heat_corridor";

export interface GateDefinition {
  kind: GateKind;
  /** Any one of these abilities opens it. */
  opensWith: SoulAbility[];
  /** i18n key suffix: `gate.${kind}.locked`. */
  lockedHint: string;
}

export const GATES: Record<GateKind, GateDefinition> = {
  chasm: { kind: "chasm", opensWith: ["double_jump", "grapple"], lockedHint: "chasm" },
  crawlspace: { kind: "crawlspace", opensWith: ["slide"], lockedHint: "crawlspace" },
  grate: { kind: "grate", opensWith: ["mist"], lockedHint: "grate" },
  ice_field: { kind: "ice_field", opensWith: ["ice_walk"], lockedHint: "ice_field" },
  heat_corridor: { kind: "heat_corridor", opensWith: ["heat_ward"], lockedHint: "heat_corridor" },
};

export const GATE_KINDS = Object.keys(GATES) as GateKind[];

/**
 * Which gate kinds a theme is allowed to spawn. Keeps a snow floor from
 * generating a heat corridor, so a locked gate always reads as intentional.
 */
export const THEME_GATES: Record<string, GateKind[]> = {
  forest: ["chasm", "crawlspace"],
  dungeon: ["grate", "crawlspace", "chasm"],
  snow: ["ice_field", "chasm"],
  lava: ["heat_corridor", "grate"],
};

export type AbilitySet = ReadonlySet<SoulAbility>;

export function createAbilitySet(abilities: Iterable<SoulAbility> = []): Set<SoulAbility> {
  return new Set(abilities);
}

export function canOpenGate(kind: GateKind, abilities: AbilitySet): boolean {
  return GATES[kind].opensWith.some(ability => abilities.has(ability));
}

/**
 * Picks a gate kind for a theme from a seeded roll, so the same seed always
 * produces the same castle layout.
 */
export function pickGateKind(theme: string, roll: number): GateKind {
  const pool = THEME_GATES[theme] ?? THEME_GATES.dungeon;
  const index = Math.abs(Math.floor(roll * pool.length)) % pool.length;
  return pool[index];
}

export interface GatedRoom {
  x: number;
  y: number;
  /** Undefined means the room was never gated. */
  gate?: GateKind;
  visited: boolean;
}

export interface ExplorationSummary {
  /** Rooms the player has actually stood in. */
  visited: number;
  /** Rooms reachable with the abilities currently held. */
  reachable: number;
  /** Every room on the floor, gated or not. */
  total: number;
  /** visited / total, 0..1. The number shown on the map screen. */
  completion: number;
  /** Gates still shut, grouped by kind, for the "what am I missing" readout. */
  blockedBy: Record<string, number>;
}

/**
 * Exploration is reported against the *whole* floor rather than only the
 * reachable part. Showing 100% while a grate is still shut would defeat the
 * purpose of the mechanic — the missing percentage is the breadcrumb.
 */
export function summariseExploration(rooms: readonly GatedRoom[], abilities: AbilitySet): ExplorationSummary {
  const blockedBy: Record<string, number> = {};
  let reachable = 0;
  let visited = 0;

  for (const room of rooms) {
    if (room.visited) visited++;
    if (!room.gate || canOpenGate(room.gate, abilities)) {
      reachable++;
    } else {
      blockedBy[room.gate] = (blockedBy[room.gate] ?? 0) + 1;
    }
  }

  const total = rooms.length;
  return {
    visited,
    reachable,
    total,
    completion: total > 0 ? visited / total : 0,
    blockedBy,
  };
}

/** Formats the map-screen readout, e.g. `84.2%`. */
export function formatCompletion(completion: number): string {
  return `${(Math.max(0, Math.min(1, completion)) * 100).toFixed(1)}%`;
}
