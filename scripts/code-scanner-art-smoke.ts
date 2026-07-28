import assert from "node:assert/strict";
import fs from "node:fs";
import { WEAPONS, getProjectileProfile } from "../src/game/data/weapons";
import { WEAPON_ART_ANCHORS, WEAPON_PALETTES, WEAPON_SPRITES } from "../src/game/data/weaponArt";
import { Projectile } from "../src/game/entities/Projectile";
import { ProjectileArtRenderer } from "../src/game/render/ProjectileArtRenderer";

const scanner = WEAPON_SPRITES.code_scanner;
const palette = WEAPON_PALETTES.code_scanner;
const anchor = WEAPON_ART_ANCHORS.code_scanner;
const weapon = WEAPONS.code_scanner;

assert.equal(scanner.length, 17, "Code Scanner retains the 17px held-weapon height");
assert.ok(scanner.every(row => row.length === 24), "Code Scanner retains the 24px canvas width");
assert.notDeepEqual(scanner, WEAPON_SPRITES.laser, "Code Scanner silhouette differs from the baseline energy blaster");
assert.deepEqual(anchor, { grip: [11, 13], muzzle: [23, 7] }, "grip and muzzle remain on the authored firing axis");
assert.equal(weapon.trailLength, 28);
assert.equal(weapon.beamWidth, 1);
assert.equal(weapon.pierce, 2);

for (const color of ["#18242C", "#31505B", "#2ECC71", "#CAFFDF", "#F0C96A", "#071016"]) {
  assert.ok(Object.values(palette).includes(color), `Code Scanner palette includes ${color}`);
}

assert.ok(scanner[4][8] !== "." && scanner[6][15] !== ".", "wide scanner chamber remains visible");
assert.equal(scanner[5][21], "4", "upper emitter fork remains visible");
assert.equal(scanner[8][21], "4", "lower emitter fork remains visible");
assert.equal(scanner[7][23], "5", "emitter forks converge on a one-pixel beam channel");

const entitySource = fs.readFileSync("src/game/render/EntityRenderer.ts", "utf8");
const projectileSource = fs.readFileSync("src/game/render/ProjectileArtRenderer.ts", "utf8");
const dungeonSource = fs.readFileSync("src/game/states/DungeonState.ts", "utf8");
assert.match(entitySource, /drawCodeScannerState/);
assert.match(entitySource, /resourceState\.value\s*\/\s*slot\.resourceState\.max/);
assert.match(entitySource, /fullRechargeFlashTimer/);
assert.match(projectileSource, /p\.weaponId === "code_scanner"/);
assert.match(projectileSource, /markLife <= 0\.16/);
assert.match(dungeonSource, /p\.scanMarkAge = p\.age/);

const calls: Array<{ fillStyle: string; x: number; y: number; w: number; h: number; alpha: number }> = [];
const ctx = {
  fillStyle: "",
  globalAlpha: 1,
  save() {},
  restore() {},
  fillRect(x: number, y: number, w: number, h: number) {
    calls.push({ fillStyle: this.fillStyle, x, y, w, h, alpha: this.globalAlpha });
  },
} as unknown as CanvasRenderingContext2D;
const projectile = new Projectile(
  40, 40, 100, 0, 1, 5, "player", 1, "#2ECC71", 0, false, 2, 0,
  undefined, 0, false, getProjectileProfile(weapon),
);
projectile.weaponId = "code_scanner";
projectile.age = 0.2;
projectile.scanMarkX = 36;
projectile.scanMarkY = 40;
projectile.scanMarkAge = 0.1;
projectile.scanMarkIndex = 2;
ProjectileArtRenderer.draw(ctx, projectile, false);
assert.ok(calls.some(call => call.fillStyle === "#CAFFDF" && call.w === 1), "beam keeps a one-pixel white-green core");
assert.ok(calls.some(call => call.fillStyle === "#2ECC71" && call.w === 3), "beam adds a restrained green edge");
assert.ok(calls.filter(call => call.x >= 32 && call.x <= 40).length >= 4, "recent penetration emits a compact scan frame");

console.log("code scanner art smoke passed");
