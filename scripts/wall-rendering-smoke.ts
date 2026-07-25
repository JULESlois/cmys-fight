import assert from "node:assert/strict";
import { getBaseTheme } from "../src/game/render/RoomRenderer";
import { PALETTES } from "../src/game/data/palettes";

const expectedMappings: Record<string, string> = {
  sealed_library: "dungeon",
  cooling_canal: "snow",
  forge_core: "lava",
  overgrown_archive: "forest",
  sealed_armory: "dungeon",
  observatory: "snow",
};

console.log("Checking baseTheme mappings...");
for (const [nodeId, expectedBase] of Object.entries(expectedMappings)) {
  const base = getBaseTheme(nodeId);
  assert.equal(base, expectedBase, `Expected ${nodeId} to map to ${expectedBase}, got ${base}`);
}

console.log("Checking palette fallbacks...");
for (const nodeId of Object.keys(expectedMappings)) {
  const baseTheme = getBaseTheme(nodeId);
  const p = PALETTES[nodeId] ?? PALETTES[baseTheme] ?? PALETTES["forest"];
  assert.ok(p, `Palette should be resolved for ${nodeId}`);
  assert.equal(p.wall, (PALETTES[baseTheme] as any).wall, `Palette wall color for ${nodeId} should match ${baseTheme}`);
}

console.log("Wall rendering and theme fallbacks passed.");
