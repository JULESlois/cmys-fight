import assert from "node:assert/strict";
import fs from "node:fs";
import { Player } from "../src/game/entities/Player";
import { WeaponController } from "../src/game/combat/WeaponController";
import {
  calculateChainDamage,
  calculateExplosionDamage,
  calculateExplosionFalloff,
  rotateVelocityToward,
} from "../src/game/combat/ProjectileEffects";
import { WEAPONS, rollAvailableWeapon, type ProjectileStyle, type WeaponRollContext } from "../src/game/data/weapons";
import { DungeonState } from "../src/game/states/DungeonState";
import { Enemy } from "../src/game/entities/Enemy";
import { acquireProjectile, releaseProjectile } from "../src/game/EntityPools";

const turned = rotateVelocityToward(100, 0, Math.PI / 2, 0.2);
assert.ok(Math.abs(Math.hypot(turned.vx, turned.vy) - 100) < 0.0001);
assert.ok(Math.abs(Math.atan2(turned.vy, turned.vx) - 0.2) < 0.0001);
assert.deepEqual(rotateVelocityToward(0, 0, 1, 0.2), { vx: 0, vy: 0 });

assert.equal(calculateChainDamage(10, 0.7, 0), 7);
assert.equal(calculateChainDamage(10, 0.7, 1), 5);
assert.equal(calculateExplosionDamage(10, 1, 0, 30), 10);
assert.equal(calculateExplosionDamage(10, 1, 30, 30), 5);
assert.equal(calculateExplosionDamage(10, 1, 31, 30), 0);
assert.equal(calculateExplosionFalloff(0, 30), 1);
assert.equal(calculateExplosionFalloff(30, 30), 0.45);

const expectedStyles = new Set<ProjectileStyle>([
  "bullet", "tracer", "beam", "lightning", "plasma", "flame", "rocket", "disc",
]);
const actualStyles = new Set(Object.values(WEAPONS).map(weapon => weapon.projectileStyle ?? "bullet"));
assert.deepEqual(actualStyles, expectedStyles);

const createRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};
const sampleHighTierRate = (context: WeaponRollContext) => {
  const random = createRandom(context === "shop" ? 17 : 31);
  let highTier = 0;
  const samples = 4000;
  for (let index = 0; index < samples; index++) {
    const rarity = rollAvailableWeapon(20, random, context).rarity;
    if (rarity === "rare" || rarity === "legendary") highTier++;
  }
  return highTier / samples;
};
assert.ok(sampleHighTierRate("treasure") > sampleHighTierRate("shop"));
assert.equal(rollAvailableWeapon(5, () => 0.5, "shop", Object.keys(WEAPONS).filter(id => id !== "vector_9")).id, "vector_9");

const player = new Player(160, 120);
player.mana = 100;
const fire = (weaponId: string) => {
  player.fireCooldown = 0;
  player.setWeaponLoadout([weaponId], 0);
  const result = WeaponController.fire(player, 0, () => 0.99);
  assert.equal(result.fired, true, weaponId);
  return result.projectiles[0];
};

const rocket = fire("micro_rocket");
const rocketSpeed = Math.hypot(rocket.vx, rocket.vy);
rocket.update(0.25);
assert.ok(Math.hypot(rocket.vx, rocket.vy) > rocketSpeed);
assert.equal(rocket.explosionRadius, 30);
assert.equal(rocket.impactEffect, "explosion");

const flame = fire("dragon_breath");
const flameSpeed = Math.hypot(flame.vx, flame.vy);
flame.update(0.25);
assert.ok(Math.hypot(flame.vx, flame.vy) < flameSpeed);
assert.equal(flame.style, "flame");

const disc = fire("ripper_disc");
disc.update(0.25);
assert.ok(disc.spinAngle > 0);
assert.equal(disc.wallBouncesRemaining, 3);

const tesla = fire("tesla_carbine");
assert.equal(tesla.chainCount, 2);
assert.equal(tesla.chainRange, 58);
assert.equal(tesla.impactEffect, "electric");

const beam = fire("void_rail");
assert.equal(beam.style, "beam");
assert.equal(beam.beamWidth, 3);
assert.equal(beam.trailLength, 54);

const fakeEngine = {
  data: {
    settings: { reducedFlashing: false },
    recordEnemyKill() {},
  },
  isPerformanceDegraded: () => false,
  triggerScreenShake() {},
};
const dungeon = new DungeonState(fakeEngine as any) as any;
dungeon.isCollidingWithMap = () => false;

const chainA = new Enemy(20, 20, "melee");
const chainB = new Enemy(50, 20, "melee");
const chainFar = new Enemy(150, 20, "melee");
chainA.hp = chainA.maxHp = 20;
chainB.hp = chainB.maxHp = 20;
chainFar.hp = chainFar.maxHp = 20;
dungeon.enemies = [chainA, chainB, chainFar];
dungeon.lightningArcs = [];
tesla.damage = 10;
dungeon.applyProjectileChain(tesla, 0, 20);
assert.equal(chainA.hp, 13);
assert.equal(chainB.hp, 15);
assert.equal(chainFar.hp, 20);
assert.equal(dungeon.lightningArcs.length, 2);

const blastNear = new Enemy(10, 10, "melee");
const blastFar = new Enemy(80, 80, "melee");
blastNear.hp = blastNear.maxHp = 20;
blastFar.hp = blastFar.maxHp = 20;
dungeon.enemies = [blastNear, blastFar];
rocket.x = 0;
rocket.y = 0;
rocket.damage = 10;
rocket.detonated = false;
dungeon.detonateProjectile(rocket);
assert.ok(blastNear.hp < 20);
assert.equal(blastFar.hp, 20);
assert.equal(rocket.detonated, true);

releaseProjectile(rocket);
const pooledProjectile = acquireProjectile(0, 0, 10, 0, 1, 1, "enemy");
assert.equal(pooledProjectile.style, "bullet");
assert.equal(pooledProjectile.explosionRadius, 0);
assert.equal(pooledProjectile.chainCount, 0);
assert.equal(pooledProjectile.homingStrength, 0);
assert.equal(pooledProjectile.weaponId, "");
releaseProjectile(pooledProjectile);

const homingTarget = new Enemy(0, 90, "melee");
dungeon.enemies = [homingTarget];
const homingShot = fire("plasma_caster");
homingShot.x = 0;
homingShot.y = 0;
homingShot.vx = 100;
homingShot.vy = 0;
dungeon.updateProjectileHoming(homingShot, 0.1);
assert.ok(homingShot.vy > 0);
assert.ok(homingShot.vx > 0);

const dungeonSource = fs.readFileSync("src/game/states/DungeonState.ts", "utf8");
const rendererSource = fs.readFileSync("src/game/render/EntityRenderer.ts", "utf8");
const fxSource = fs.readFileSync("src/game/render/PixelFxSystem.ts", "utf8");
const audioSource = fs.readFileSync("src/game/audio/AudioManager.ts", "utf8");
assert.match(dungeonSource, /updateProjectileHoming[\s\S]*rotateVelocityToward/);
assert.match(dungeonSource, /applyProjectileChain[\s\S]*calculateChainDamage/);
assert.match(dungeonSource, /detonateProjectile[\s\S]*calculateExplosionDamage/);
assert.match(rendererSource, /p\.style === "beam"[\s\S]*p\.style === "lightning"/);
assert.match(rendererSource, /p\.style === "plasma"[\s\S]*p\.style === "flame"[\s\S]*p\.style === "rocket"[\s\S]*p\.style === "disc"/);
assert.match(fxSource, /emitProjectileImpact[\s\S]*emitExplosion/);
assert.match(audioSource, /playWeaponShot[\s\S]*style === "beam"[\s\S]*style === "lightning"[\s\S]*style === "rocket"/);

console.log(JSON.stringify({
  projectileStyles: actualStyles.size,
  zeroEnergyVector: WEAPONS.vector_9.manaCost === 0,
  homing: "ok",
  accelerationAndDrag: "ok",
  chainLightning: "ok",
  radialExplosion: "ok",
  weightedDrops: "ok",
  weaponAudio: "ok",
  dedicatedRendering: "ok",
}));
