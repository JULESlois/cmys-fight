import assert from "node:assert/strict";
import fs from "node:fs";
import { PROJECTILE_ART, PROJECTILE_WEAPON_PALETTES, resolveProjectilePalette } from "../src/game/data/projectileArt";
import { WEAPONS, getProjectileProfile, type ImpactEffect, type ProjectileStyle } from "../src/game/data/weapons";
import { Projectile } from "../src/game/entities/Projectile";
import { ProjectileArtRenderer } from "../src/game/render/ProjectileArtRenderer";
import { PixelFxSystem } from "../src/game/render/PixelFxSystem";

const styles: ProjectileStyle[] = [
  "bullet", "tracer", "beam", "lightning", "plasma", "flame", "rocket",
  "disc", "water", "sword", "yoyo", "prism", "dragon",
];
assert.deepEqual(Object.keys(PROJECTILE_ART).sort(), [...styles].sort());
assert.equal(new Set(Object.values(PROJECTILE_ART).map(profile => profile.shape)).size, styles.length, "every projectile style needs a distinct silhouette family");
for (const [style, profile] of Object.entries(PROJECTILE_ART)) {
  assert.ok(profile.bodyWidth >= 2, `${style} body width`);
  assert.ok(profile.glowScale >= 0, `${style} glow scale`);
  assert.ok(profile.trailSteps >= 0, `${style} trail steps`);
}

for (const id of [
  "ray_gun", "venom_x", "wunderwaffe", "water_bolt", "terrarian", "last_prism", "zenith",
  "r9_0", "mx_guardian", "cx_9", "mg42", "bp50", "na_45",
  "so_14", "aa_12", "awp_dragon_lore", "ak47_wild_lotus", "inspector", "finale",
  "zeroth_sense", "colucci_claws",
]) {
  assert.ok(PROJECTILE_WEAPON_PALETTES[id], `${id} keeps its signature projectile palette`);
}
assert.equal(resolveProjectilePalette("plasma", "ray_gun", "#000000").base, "#D7E53C");
assert.equal(resolveProjectilePalette("plasma", "venom_x", "#000000").base, "#75DB49");
assert.equal(resolveProjectilePalette("lightning", "wunderwaffe", "#000000").base, "#5DE7F2");

interface DrawOp {
  color: string;
  alpha: number;
  width: number;
  height: number;
}

function createRecordingContext(): { ctx: CanvasRenderingContext2D; ops: DrawOp[] } {
  const ops: DrawOp[] = [];
  let fillStyle = "";
  let globalAlpha = 1;
  let shadowColor = "";
  let shadowBlur = 0;
  const stack: Array<[string, number, string, number]> = [];
  const ctx = {
    save() { stack.push([fillStyle, globalAlpha, shadowColor, shadowBlur]); },
    restore() {
      const state = stack.pop();
      if (!state) return;
      [fillStyle, globalAlpha, shadowColor, shadowBlur] = state;
    },
    translate() {}, rotate() {}, scale() {},
    fillRect(_x: number, _y: number, width: number, height: number) {
      ops.push({ color: fillStyle, alpha: Number(globalAlpha.toFixed(3)), width: Math.round(width), height: Math.round(height) });
    },
    fillText() {},
    set fillStyle(value: string | CanvasGradient | CanvasPattern) { fillStyle = String(value); },
    get fillStyle() { return fillStyle; },
    set globalAlpha(value: number) { globalAlpha = value; },
    get globalAlpha() { return globalAlpha; },
    set shadowColor(value: string) { shadowColor = value; },
    get shadowColor() { return shadowColor; },
    set shadowBlur(value: number) { shadowBlur = value; },
    get shadowBlur() { return shadowBlur; },
    font: "",
  } as unknown as CanvasRenderingContext2D;
  return { ctx, ops };
}

const styleWeapons: Record<ProjectileStyle, string> = {
  bullet: "pistol",
  tracer: "vector_9",
  beam: "laser",
  lightning: "wunderwaffe",
  plasma: "ray_gun",
  flame: "dragon_breath",
  rocket: "micro_rocket",
  disc: "ripper_disc",
  water: "water_bolt",
  sword: "zenith",
  yoyo: "terrarian",
  prism: "last_prism",
  dragon: "stardust_dragon_staff",
};

function makeProjectile(style: ProjectileStyle): Projectile {
  const weapon = WEAPONS[styleWeapons[style]];
  const projectile = new Projectile(
    100, 100, 140, 22,
    weapon.projectileRadius ?? 3,
    weapon.damage,
    "player",
    weapon.projectileLife ?? 2,
    weapon.color,
    weapon.knockback,
    false,
    weapon.pierce ?? 0,
    weapon.wallBounces ?? 0,
    weapon.statusEffect,
    weapon.statusDuration ?? 0,
    false,
    getProjectileProfile(weapon),
  );
  projectile.style = style;
  projectile.age = 0.42;
  projectile.spinAngle = 0.73;
  projectile.anchorX = 48;
  projectile.anchorY = 68;
  projectile.summonLevel = 3;
  return projectile;
}

const renderSignatures = new Set<string>();
for (const style of styles) {
  const projectile = makeProjectile(style);
  const { ctx, ops } = createRecordingContext();
  ProjectileArtRenderer.draw(ctx, projectile, false);
  assert.ok(ops.length >= 4, `${style} must render a detailed multi-part model`);
  assert.ok(new Set(ops.map(operation => operation.color)).size >= 3, `${style} must use layered colors`);
  const signature = ops.map(operation => `${operation.color}:${operation.alpha}:${operation.width}x${operation.height}`).join("|");
  assert.equal(renderSignatures.has(signature), false, `${style} must not reuse another projectile rendering signature`);
  renderSignatures.add(signature);
}
assert.equal(renderSignatures.size, styles.length);

const enemyProjectile = makeProjectile("bullet");
enemyProjectile.faction = "enemy";
enemyProjectile.sourceBoss = true;
const enemyRecording = createRecordingContext();
ProjectileArtRenderer.draw(enemyRecording.ctx, enemyProjectile, false);
assert.ok(enemyRecording.ops.some(operation => operation.color === "rgba(10,4,8,0.62)"), "enemy bullets need a dark danger outline");
assert.ok(enemyRecording.ops.some(operation => operation.color === "#FFCB5C"), "boss bullets need a warning accent");

const na45Weapon = WEAPONS.na_45;
const linkedPrimer = new Projectile(
  100, 100, 0, 0, 3, na45Weapon.damage, "player", 4.5, "#F2D45C", 0, false, 0, 0,
  undefined, 0, false, getProjectileProfile(na45Weapon),
);
linkedPrimer.linkedShotMode = "primer";
linkedPrimer.stuck = true;
linkedPrimer.age = 0.5;
const primerRecording = createRecordingContext();
ProjectileArtRenderer.draw(primerRecording.ctx, linkedPrimer, false);
assert.ok(primerRecording.ops.some(operation => operation.color === "#E8D34F"), "NA-45 Primer marker needs a yellow armed core");
assert.ok(primerRecording.ops.length >= 12, "NA-45 Primer marker needs a segmented warning frame");
const linkedCatalyst = new Projectile(
  100, 100, 180, 0, 3, na45Weapon.damage, "player", 3, "#FF6B4A", 0, false, 0, 0,
  undefined, 0, false, getProjectileProfile(na45Weapon),
);
linkedCatalyst.linkedShotMode = "catalyst";
const catalystRecording = createRecordingContext();
ProjectileArtRenderer.draw(catalystRecording.ctx, linkedCatalyst, false);
assert.ok(catalystRecording.ops.some(operation => operation.color === "#FF6B43"), "NA-45 Catalyst needs an orange-red core");

const impactEffects: ImpactEffect[] = ["spark", "electric", "plasma", "flame", "explosion", "slash"];
const impactCounts = new Map<ImpactEffect, number>();
for (const impactEffect of impactEffects) {
  const fx = new PixelFxSystem();
  const projectile = makeProjectile(impactEffect === "electric" ? "lightning" : impactEffect === "explosion" ? "rocket" : "bullet");
  projectile.impactEffect = impactEffect;
  projectile.explosionRadius = impactEffect === "explosion" ? 28 : 0;
  fx.emitProjectileImpact(projectile, false, false);
  const count = fx.getActiveCount();
  impactCounts.set(impactEffect, count);
  assert.ok(count >= 8, `${impactEffect} needs a readable impact composition`);
  const recording = createRecordingContext();
  fx.draw(recording.ctx, false);
  assert.ok(recording.ops.length >= count, `${impactEffect} impact must render all active elements`);
  fx.update(2);
  assert.equal(fx.getActiveCount(), 0, `${impactEffect} impact must expire`);
}
assert.ok((impactCounts.get("explosion") ?? 0) > (impactCounts.get("spark") ?? 0), "explosions need more visual weight than bullet sparks");

const entitySource = fs.readFileSync("src/game/render/EntityRenderer.ts", "utf8");
const bodyDrawIndex = entitySource.indexOf("SpriteRenderer.drawPixelSprite(ctx, spriteName");
const weaponDrawIndex = entitySource.indexOf("EntityRenderer.drawPlayerWeapon(ctx, player);", bodyDrawIndex);
assert.ok(bodyDrawIndex >= 0 && weaponDrawIndex > bodyDrawIndex, "player weapon must always render after the player body");
assert.doesNotMatch(entitySource, /weaponBehindBody/);
assert.match(entitySource, /ProjectileArtRenderer\.draw\(ctx, p, reducedFlashing\)/);

const projectileRendererSource = fs.readFileSync("src/game/render/ProjectileArtRenderer.ts", "utf8");
for (const style of styles) assert.match(projectileRendererSource, new RegExp(`p\\.style === "${style}"|style === "${style}"|${style}:`), `${style} renderer contract`);
const fxSource = fs.readFileSync("src/game/render/PixelFxSystem.ts", "utf8");
assert.match(fxSource, /FxParticleShape = "pixel" \| "streak" \| "smoke"/);
assert.match(fxSource, /FxPulseKind = "ring" \| "cross"/);

console.log(JSON.stringify({
  projectileStyles: styles.length,
  uniqueRenderSignatures: renderSignatures.size,
  weaponSpecificPalettes: Object.keys(PROJECTILE_WEAPON_PALETTES).length,
  enemyReadability: "ok",
  weaponAlwaysForeground: "ok",
  impactFamilies: impactEffects.length,
  pixelPulses: "ring-cross",
  linkedAmmoVisuals: "primer-catalyst",
}));
