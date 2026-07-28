import assert from "node:assert/strict";
import fs from "node:fs";
import { WEAPON_ART_ANCHORS, WEAPON_PALETTES, WEAPON_SPRITES } from "../src/game/data/weaponArt";
import { WEAPONS } from "../src/game/data/weapons";
import { Projectile } from "../src/game/entities/Projectile";

const weapon = WEAPONS.vat_horse_cannon;
const sprite = WEAPON_SPRITES.vat_horse_cannon;
const palette = WEAPON_PALETTES.vat_horse_cannon;
const anchor = WEAPON_ART_ANCHORS.vat_horse_cannon;

assert.equal(sprite.length, 18, "Vat-Horse Cannon keeps an 18px held height");
assert.ok(sprite.every(row => row.length === 31), "Vat-Horse Cannon uses the proposed 31px width");
assert.deepEqual(anchor, { grip: [10, 14], muzzle: [30, 8] }, "muzzle remains aligned to the narrow rail");
for (const color of ["#0A0D12", "#2B3542", "#667484", "#8A6B4E", "#FF8A65", "#FFE0C1", "#8FE3FF"]) {
  assert.ok(Object.values(palette).includes(color), `palette includes ${color}`);
}

assert.equal(weapon.damage, 5);
assert.equal(weapon.fireRate, 1.2);
assert.equal(weapon.bulletSpeed, 145);
assert.equal(weapon.pelletCount, 3);
assert.equal(weapon.magazineSize, 3);
assert.equal(weapon.reloadTime, 2.2);
assert.equal(weapon.wallBounces, 1);
assert.equal(weapon.statusEffect, "burn");
assert.equal(weapon.statusDuration, 2.1);
assert.equal(weapon.recoil, 1.4);

const rendererSource = fs.readFileSync("src/game/render/EntityRenderer.ts", "utf8");
const projectileRendererSource = fs.readFileSync("src/game/render/ProjectileArtRenderer.ts", "utf8");
const dungeonSource = fs.readFileSync("src/game/states/DungeonState.ts", "utf8");
assert.match(rendererSource, /vat_horse_cannon[\s\S]*reloadProgress \* 3/, "reload maps to three visible chambers");
assert.match(rendererSource, /vat_horse_cannon[\s\S]*#FFE0C1[\s\S]*#FFB07D[\s\S]*#FF8A65/, "weapon authors a short layered muzzle wedge");
assert.match(dungeonSource, /vat_horse_cannon[\s\S]*bounceFlashTimer = 0\.1/, "bounce stores a 0.1 second direction cue");
assert.match(projectileRendererSource, /bounceNormalX[\s\S]*fillRect\(-1, -7, 2, 15\)/, "bounce ring follows the impact plane");
assert.match(projectileRendererSource, /step <= 3[\s\S]*ux \* step \* 3/, "reflected projectiles receive a short direction trail");

const projectile = new Projectile(0, 0, 10, 0, 4, 5, "player", 2.6, "#FF8A65", 10, false, 0, 1);
projectile.weaponId = "vat_horse_cannon";
projectile.bounceFlashTimer = 0.1;
projectile.update(0.04);
assert.ok(projectile.bounceFlashTimer > 0 && projectile.bounceFlashTimer < 0.1, "bounce cue decays with projectile time");

const concept = fs.readFileSync("docs/art-proposals/2026-07-27-vat-horse-cannon-redesign.svg", "utf8");
assert.match(concept, /<svg[^>]+width="1200"[^>]+height="800"[^>]+viewBox="0 0 1200 800"/);
assert.match(concept, /#8A6B4E/i);
assert.match(concept, /#FF8A65/i);
assert.match(concept, /#8FE3FF/i);

console.log(JSON.stringify({
  weapon: weapon.id,
  sprite: "31x18",
  chambers: 3,
  reloadStages: 3,
  bounceCueSeconds: 0.1,
  gameplayParameters: "preserved",
}));
