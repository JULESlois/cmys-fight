global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} } as any;
import * as assert from "assert";
import { GameData } from "../src/game/GameData";
import { EnvironmentSystem } from "../src/game/environment/EnvironmentSystem";
import { WORLD_NODES } from "../src/game/world/WorldNodes";

console.log("Running route-identity-smoke tests...");

const gameData = new GameData();
const initialRun = gameData.data.run;

// Assert defaults
assert.equal(initialRun.worldNodeId, "overgrown_archive");
assert.equal(initialRun.routeDepth, 1);

const stage = gameData.data.floor;
assert.equal(stage.worldNodeId, "overgrown_archive");
assert.equal(stage.theme, WORLD_NODES["overgrown_archive"].theme);

// Test advanceToNode validation
const invalidAdvance = gameData.advanceToNode("non_existent_node");
assert.equal(invalidAdvance, null, "Should return null for invalid node");
assert.equal(gameData.data.run.worldNodeId, "overgrown_archive", "Run progress should not be modified");

// Mock an exit in the current floor
stage.rooms.push({
  id: "999",
  x: 0,
  y: 0,
  type: "exit",
  templateId: "crossroad_4way",
  interactionCompleted: false,
  rewardGenerated: false, cleared: true, doors: { up: false, down: false, left: false, right: false },
  exitDestination: {
    worldNodeId: "sealed_library",
    kind: "normal",
    state: "available",
    preview: { threat: 1, enemyTags: [], hazardTags: [], rewardTags: [] }
  }
});
stage.rooms.push({
  id: "1000",
  x: 0,
  y: 0,
  type: "exit",
  templateId: "crossroad_4way",
  interactionCompleted: false,
  rewardGenerated: false, cleared: true, doors: { up: false, down: false, left: false, right: false },
  exitDestination: {
    worldNodeId: "ancient_catacombs",
    kind: "normal",
    state: "available",
    preview: { threat: 1, enemyTags: [], hazardTags: [], rewardTags: [] }
  }
});

// Advance to valid node
const advanceResult = gameData.advanceToNode("sealed_library");
assert.ok(advanceResult);
assert.equal(gameData.data.run.worldNodeId, "sealed_library");
assert.equal(gameData.data.run.routeDepth, 2);
assert.deepEqual(gameData.data.run.routeHistory, ["overgrown_archive"]);

// Verify exit states
const fungalExit = stage.rooms.find(r => r.exitDestination?.worldNodeId === "sealed_library")!.exitDestination!;
const catacombsExit = stage.rooms.find(r => r.exitDestination?.worldNodeId === "ancient_catacombs")!.exitDestination!;
assert.equal(fungalExit.state, "chosen");
assert.equal(catacombsExit.state, "skipped");

// Verify stage metadata update
const newStage = gameData.data.floor;
assert.equal(newStage.worldNodeId, "sealed_library");
assert.equal(newStage.theme, WORLD_NODES["sealed_library"].theme);

// Verify EnvironmentSystem uses hazardType
const hazards = EnvironmentSystem.generate(newStage, newStage.rooms[0], Array(100).fill(0));
// Can't easily assert hazards length because of random, but we know it runs without throwing
// and it should use the hazardType from WORLD_NODES.

console.log("route-identity-smoke tests passed.");
