import assert from "node:assert/strict";
import { ARCANE_CHARACTER_PALETTE, ARCANE_CHARACTER_SPRITES } from "../src/game/data/arcaneCharacterArt";
import { DETAILED_CHARACTER_IDS } from "../src/game/data/characters";

const names = [
  "player_arcane_side_idle",
  "player_arcane_side_idle_1",
  "player_arcane_side_walk_0",
  "player_arcane_side_walk_1",
  "player_arcane_side_walk_2",
  "player_arcane_side_walk_3",
];

for (const name of names) {
  const sprite = ARCANE_CHARACTER_SPRITES[name];
  assert.ok(sprite, `${name} should exist`);
  assert.equal(sprite.length, 32, `${name} should be 32px tall`);
  assert.ok(sprite.every(row => row.length === 32), `${name} should be 32px wide`);
  assert.ok(sprite.some(row => row.includes("E")), `${name} should expose controlled energy-cyan pixels`);
}
assert.ok(DETAILED_CHARACTER_IDS.includes("mage"), "Arcane Form should use detailed 32x32 art");
assert.equal(ARCANE_CHARACTER_PALETTE.E, "#6FE6FF");
assert.equal(ARCANE_CHARACTER_PALETTE.F, "#DFFCFF");
console.log("arcane form art smoke passed");
