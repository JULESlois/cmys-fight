import assert from "node:assert/strict";
import fs from "node:fs";
import { ARCANE_CHARACTER_PALETTE, ARCANE_CHARACTER_SPRITES } from "../src/game/data/arcaneCharacterArt";
import { DETAILED_CHARACTER_IDS, usesDetailedCharacterArt } from "../src/game/data/characters";
import { ARCANE_PLAYER_PALETTE, SPRITE_PALETTES, SPRITES } from "../src/game/data/sprites";
import { Player } from "../src/game/entities/Player";
import { EntityRenderer } from "../src/game/render/EntityRenderer";

const names = [
  "player_arcane_side_idle",
  "player_arcane_side_idle_1",
  "player_arcane_side_walk_0",
  "player_arcane_side_walk_1",
  "player_arcane_side_walk_2",
  "player_arcane_side_walk_3",
] as const;

for (const name of names) {
  const sprite = ARCANE_CHARACTER_SPRITES[name];
  assert.ok(sprite, `${name} should exist`);
  assert.equal(sprite.length, 32, `${name} should be 32px tall`);
  assert.ok(sprite.every(row => row.length === 32), `${name} should be 32px wide`);
  assert.ok(sprite.some(row => row.includes("E")), `${name} should expose controlled energy-cyan pixels`);
  assert.ok(sprite.join("").replaceAll(".", "").length >= 120, `${name} should keep a readable detailed silhouette`);
  assert.equal(SPRITES[name], sprite, `${name} should be registered in the shared sprite table`);
  assert.deepEqual(SPRITE_PALETTES[name], ARCANE_CHARACTER_PALETTE, `${name} should carry its palette without an override`);
}
assert.notDeepEqual(SPRITES.player_arcane_side_idle, SPRITES.player_arcane_side_idle_1, "idle hover needs two poses");
assert.notDeepEqual(SPRITES.player_arcane_side_walk_0, SPRITES.player_arcane_side_walk_2, "walk cycle needs opposing robe lag");
assert.ok(DETAILED_CHARACTER_IDS.includes("mage"));
assert.equal(usesDetailedCharacterArt("mage"), true);
assert.equal(ARCANE_PLAYER_PALETTE, ARCANE_CHARACTER_PALETTE);
assert.equal(ARCANE_CHARACTER_PALETTE.E, "#6FE6FF");
assert.equal(ARCANE_CHARACTER_PALETTE.F, "#DFFCFF");

interface PrismCall { color: string; alpha: number; }
const calls: PrismCall[] = [];
const alphaStack: number[] = [];
const context = {
  fillStyle: "#000000",
  globalAlpha: 1,
  save(): void { alphaStack.push(this.globalAlpha); },
  restore(): void { this.globalAlpha = alphaStack.pop() ?? 1; },
  fillRect(): void { calls.push({ color: String(this.fillStyle), alpha: this.globalAlpha }); },
} as unknown as CanvasRenderingContext2D;
const player = new Player(0, 0);
player.characterId = "mage";
player.animState = "walk";
player.animFrame = 2;
player.mageArcaneCharge = 12;
const prismRenderer = EntityRenderer as unknown as {
  drawArcanePrisms(ctx: CanvasRenderingContext2D, player: Player, foreground: boolean): void;
};
prismRenderer.drawArcanePrisms(context, player, false);
prismRenderer.drawArcanePrisms(context, player, true);
assert.equal(calls.filter(call => call.color === "#07101F").length, 4, "four orbiting prisms retain dark silhouettes");
assert.equal(calls.filter(call => call.color === "#DFFCFF").length, 5, "full charge lights four prism layers and the robe core predictably");
assert.equal(context.globalAlpha, 1, "arcane layers must restore canvas alpha");

const combatRendererSource = fs.readFileSync("src/game/render/EntityRenderer.ts", "utf8");
const hubRendererSource = fs.readFileSync("src/game/hub/HubPlayerRenderer.ts", "utf8");
const loadoutSource = fs.readFileSync("src/game/states/RebirthLoadoutState.ts", "utf8");
for (const [surface, source] of [
  ["combat", combatRendererSource],
  ["Hub", hubRendererSource],
  ["loadout", loadoutSource],
] as const) {
  assert.match(source, /mage:\s*\{[^}]*player_arcane_side/, `${surface} should map mage to Arcane Form art`);
  assert.match(source, /ARCANE_PLAYER_PALETTE/, `${surface} should map the Arcane Form palette`);
}
assert.match(combatRendererSource, /drawArcanePrisms\(ctx, player, false\)[\s\S]*drawPixelSprite[\s\S]*drawArcanePrisms\(ctx, player, true\)/);

console.log(JSON.stringify({
  sprites: names.length,
  surfaces: ["combat", "hub", "loadout"],
  prismDrawCalls: calls.length,
  palette: ARCANE_CHARACTER_PALETTE,
}));
