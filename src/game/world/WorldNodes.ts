import { EnemyTheme } from "../data/enemies";
import { EnvironmentHazardType } from "../environment/EnvironmentSystem";

export interface WorldExitDefinition {
  worldNodeId: string;
  kind: "normal" | "hidden" | "performance";
}

export interface WorldNodeDefinition {
  id: string;
  nameKey: string;
  theme: EnemyTheme;
  hazardType: EnvironmentHazardType;

  enemyTags: string[];
  hazardTags: string[];
  rewardBiases: string[];

  exits: WorldExitDefinition[];
}

export const WORLD_NODES: Record<string, WorldNodeDefinition> = {
  // --- Depth 1 ---
  "overgrown_archive": {
    id: "overgrown_archive",
    nameKey: "zone.overgrown_archive",
    theme: "forest",
    hazardType: "spikes",
    enemyTags: ["swarm", "poison"],
    hazardTags: ["spore", "vine"],
    rewardBiases: ["vanguard", "salvage"],
    exits: [
      { worldNodeId: "sealed_library", kind: "normal" },
      { worldNodeId: "cooling_canal", kind: "normal" },
    ],
  },

  // --- Depth 2 ---
  "sealed_library": {
    id: "sealed_library",
    nameKey: "zone.sealed_library",
    theme: "dungeon",
    hazardType: "lava",
    enemyTags: ["caster", "summoner"],
    hazardTags: ["arcane", "seal"],
    rewardBiases: ["aether", "survey"],
    exits: [
      { worldNodeId: "sealed_armory", kind: "normal" },
      { worldNodeId: "observatory", kind: "hidden" },
    ],
  },
  "cooling_canal": {
    id: "cooling_canal",
    nameKey: "zone.cooling_canal",
    theme: "snow",
    hazardType: "ice",
    enemyTags: ["fast", "ranged"],
    hazardTags: ["ice", "slippery"],
    rewardBiases: ["echo", "aether"],
    exits: [
      { worldNodeId: "observatory", kind: "normal" },
      { worldNodeId: "forge_core", kind: "normal" },
    ],
  },

  // --- Depth 3 ---
  "sealed_armory": {
    id: "sealed_armory",
    nameKey: "zone.sealed_armory",
    theme: "dungeon",
    hazardType: "lava",
    enemyTags: ["armored", "elite"],
    hazardTags: ["trap", "seal"],
    rewardBiases: ["vanguard", "phoenix"],
    exits: [
      { worldNodeId: "ash_catacombs", kind: "normal" },
      { worldNodeId: "deep_prison", kind: "performance" },
    ],
  },
  "observatory": {
    id: "observatory",
    nameKey: "zone.observatory",
    theme: "snow",
    hazardType: "ice",
    enemyTags: ["ranged", "controller"],
    hazardTags: ["arcane", "void"],
    rewardBiases: ["survey", "aether"],
    exits: [
      { worldNodeId: "ash_catacombs", kind: "normal" },
      { worldNodeId: "deep_prison", kind: "performance" },
    ],
  },
  "forge_core": {
    id: "forge_core",
    nameKey: "zone.forge_core",
    theme: "lava",
    hazardType: "lava",
    enemyTags: ["explosive", "armored"],
    hazardTags: ["fire", "furnace"],
    rewardBiases: ["vanguard", "salvage"],
    exits: [
      { worldNodeId: "ash_catacombs", kind: "normal" },
      { worldNodeId: "deep_prison", kind: "performance" },
    ],
  },

  // --- Depth 4 (convergence) ---
  "ash_catacombs": {
    id: "ash_catacombs",
    nameKey: "zone.ash_catacombs",
    theme: "dungeon",
    hazardType: "lava",
    enemyTags: ["undead", "reviver"],
    hazardTags: ["dark", "ash"],
    rewardBiases: ["phoenix", "echo"],
    exits: [
      { worldNodeId: "deep_archive", kind: "normal" },
    ],
  },
  "deep_prison": {
    id: "deep_prison",
    nameKey: "zone.deep_prison",
    theme: "dungeon",
    hazardType: "lava",
    enemyTags: ["elite", "jailer"],
    hazardTags: ["chain", "seal"],
    rewardBiases: ["vanguard", "phoenix"],
    exits: [
      { worldNodeId: "deep_archive", kind: "normal" },
    ],
  },

  // --- Final ---
  "deep_archive": {
    id: "deep_archive",
    nameKey: "zone.deep_archive",
    theme: "dungeon",
    hazardType: "lava",
    enemyTags: ["boss", "arcane"],
    hazardTags: ["void", "seal"],
    rewardBiases: [],
    exits: [],
  },
};
