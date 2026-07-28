import assert from "node:assert/strict";
import fs from "node:fs";
import type { Player } from "../src/game/entities/Player";
import { WEAPON_ART_ANCHORS, WEAPON_PALETTES, WEAPON_SPRITES } from "../src/game/data/weaponArt";
import { WEAPONS } from "../src/game/data/weapons";
import { EntityRenderer } from "../src/game/render/EntityRenderer";

const sprite = WEAPON_SPRITES.swab_lance;
assert.equal(sprite.length, 16);
assert.ok(sprite.every(row => row.length === 30));
assert.deepEqual(WEAPON_ART_ANCHORS.swab_lance.muzzle, [29, 8]);
assert.equal(WEAPONS.swab_lance.chargeSlots, 3);
for (const color of ["#0B1017", "#384654", "#C8D5DE", "#E8F5FB", "#63D7FF", "#23303D", "#F0B35A"]) {
  assert.ok(Object.values(WEAPON_PALETTES.swab_lance).includes(color));
}

const calls: Array<{ x: number; y: number; width: number; height: number }> = [];
const ctx = {
  fillStyle: "",
  globalAlpha: 1,
  fillRect(x: number, y: number, width: number, height: number) { calls.push({ x, y, width, height }); },
} as unknown as CanvasRenderingContext2D;
const player = {
  weaponLoadout: {
    activeSlot: 0,
    slots: [{ weaponId: "swab_lance", resourceState: { value: 3, max: 3 }, customState: { chargeTimer: 0 } }],
  },
  muzzleFlash: 0,
} as unknown as Player;
const renderer = EntityRenderer as unknown as {
  drawSwabLanceState(context: CanvasRenderingContext2D, target: Player, renderX: number, renderY: number, time: number): void;
};
renderer.drawSwabLanceState(ctx, player, 5, -3, 1);
assert.ok(calls.some(call => call.x === 1 && call.y === 0 && call.width === 3), "first charge cell aligns to sprite column 11");
assert.ok(calls.some(call => call.x === 9 && call.y === 0 && call.width === 3), "third charge cell aligns to sprite column 19");
assert.ok(calls.every(call => call.x <= 19), "held-state overlays remain within the 30px sprite footprint");

const projectileSource = fs.readFileSync("src/game/render/ProjectileArtRenderer.ts", "utf8");
assert.match(projectileSource, /drawSwabLanceProjectile/);
assert.match(projectileSource, /speed - 128/);
console.log("swab lance art smoke passed");
