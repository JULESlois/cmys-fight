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
  "overgrown_archive": {
    id: "overgrown_archive",
    nameKey: "zone.overgrown_archive",
    theme: "forest",
    hazardType: "spikes",
    enemyTags: [],
    hazardTags: [],
    rewardBiases: [],
    exits: [
      { worldNodeId: "cooling_canal", kind: "normal" },
      { worldNodeId: "sealed_armory", kind: "normal" }
    ]
  },
  "cooling_canal": {
    id: "cooling_canal",
    nameKey: "zone.cooling_canal",
    theme: "snow",
    hazardType: "ice",
    enemyTags: [],
    hazardTags: [],
    rewardBiases: [],
    exits: []
  },
  "sealed_armory": {
    id: "sealed_armory",
    nameKey: "zone.sealed_armory",
    theme: "dungeon",
    hazardType: "lava",
    enemyTags: [],
    hazardTags: [],
    rewardBiases: [],
    exits: []
  }
};
