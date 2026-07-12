import assert from "node:assert/strict";
import fs from "node:fs";
import { Player } from "../src/game/entities/Player";
import { WeaponController } from "../src/game/combat/WeaponController";
import { SkillController } from "../src/game/combat/SkillController";
import {
  calculateChainDamage,
  calculateExplosionDamage,
  calculateExplosionFalloff,
  rotateVelocityToward,
} from "../src/game/combat/ProjectileEffects";
import { WEAPONS, getAvailableWeapons, rollAvailableWeapon, type ProjectileStyle, type WeaponRollContext } from "../src/game/data/weapons";
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
  "water", "sword", "yoyo", "prism", "dragon",
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
const sampleRarityRates = (context: WeaponRollContext) => {
  const random = createRandom(context === "shop" ? 17 : context === "treasure" ? 31 : 47);
  const counts = { common: 0, uncommon: 0, rare: 0, legendary: 0 };
  const samples = 12000;
  for (let index = 0; index < samples; index++) {
    counts[rollAvailableWeapon(1, random, context).rarity]++;
  }
  return {
    highTier: (counts.rare + counts.legendary) / samples,
    legendary: counts.legendary / samples,
  };
};
const shopRates = sampleRarityRates("shop");
const treasureRates = sampleRarityRates("treasure");
const bossRates = sampleRarityRates("boss");
assert.ok(treasureRates.highTier > shopRates.highTier);
assert.ok(bossRates.highTier >= 0.88, `Boss chest high-tier rate ${bossRates.highTier}`);
assert.ok(bossRates.legendary >= 0.24, `Boss chest legendary rate ${bossRates.legendary}`);
assert.ok(bossRates.highTier > treasureRates.highTier);
assert.equal(getAvailableWeapons(1).length, Object.keys(WEAPONS).length);
assert.equal(getAvailableWeapons(1).filter(weapon => weapon.rarity === "legendary").length, 12);
assert.equal(rollAvailableWeapon(1, () => 0.5, "shop", Object.keys(WEAPONS).filter(id => id !== "vector_9")).id, "vector_9");


const bossRoom = {
  id: "boss-reward-test",
  x: 0,
  y: 0,
  type: "boss",
  templateId: "boss_arena",
  encounterSeed: 0xB055,
  cleared: true,
  combatCleared: true,
  rewardGenerated: true,
  interactionCompleted: false,
  doors: { up: false, down: false, left: true, right: false },
  pickups: [],
  enemies: [],
} as any;
const chestEngine = {
  data: {
    data: {
      floor: { globalStageIndex: 1, seed: 0xCAFE, rooms: [bossRoom], currentRoomX: 0, currentRoomY: 0 },
    },
  },
} as any;
const chestDungeon = new DungeonState(chestEngine) as any;
chestDungeon.currentMapData = Array.from({ length: 20 * 15 }, () => 0);
chestDungeon.player.setWeaponLoadout(["pistol", "laser"], 0);
const bossChest = chestDungeon.createOrRestoreWeaponChest(bossRoom, "boss");
assert.equal(bossChest.kind, "boss");
assert.ok(bossChest.weaponId in WEAPONS);
assert.notEqual(bossChest.weaponId, "pistol");
assert.notEqual(bossChest.weaponId, "laser");
assert.deepEqual(bossRoom.weaponChest, bossChest);
const storedBossWeapon = bossChest.weaponId;
chestDungeon.player.setWeaponLoadout(["void_rail", "siege_breaker"], 0);
assert.equal(
  chestDungeon.createOrRestoreWeaponChest(bossRoom, "boss").weaponId,
  storedBossWeapon,
  "persisted Boss chest content must not reroll after reload or loadout changes",
);

const player = new Player(160, 120);
player.mana = 100;
const fire = (weaponId: string) => {
  player.fireCooldown = 0;
  player.setWeaponLoadout([weaponId], 0);
  const result = WeaponController.fire(player, 0, () => 0.99);
  assert.equal(result.fired, true, weaponId);
  return result.projectiles[0];
};

const mageEcho = new Player(160, 120);
mageEcho.characterId = "mage";
mageEcho.setWeaponLoadout(["laser"], 0);
mageEcho.maxMana = 60;
mageEcho.mana = 60;
mageEcho.mageArcaneCharge = 11;
const echoVolley = WeaponController.fire(mageEcho, 0, () => 0.99);
assert.equal(echoVolley.fired, true);
assert.equal(echoVolley.echoTriggered, true);
assert.equal(echoVolley.projectiles.length, 2);
assert.deepEqual(echoVolley.projectiles.map(projectile => projectile.damage), [5, 2.5]);
assert.equal(mageEcho.mana, 59);
assert.equal(mageEcho.mageArcaneCharge, 0);
for (const projectile of echoVolley.projectiles) releaseProjectile(projectile);

const mageYoyo = new Player(160, 120);
mageYoyo.characterId = "mage";
mageYoyo.setWeaponLoadout(["terrarian"], 0);
mageYoyo.maxMana = 60;
mageYoyo.mana = 60;
mageYoyo.mageArcaneCharge = 11;
const deferredEcho = WeaponController.fire(mageYoyo, 0, () => 0.99);
assert.equal(deferredEcho.echoTriggered, false, "persistent weapon entities must not be duplicated by Arcane Echo");
assert.equal(deferredEcho.projectiles.length, 1);
assert.equal(mageYoyo.mageArcaneCharge, 15);
for (const projectile of deferredEcho.projectiles) releaseProjectile(projectile);

const mageOverdrive = new Player(160, 120);
mageOverdrive.characterId = "mage";
mageOverdrive.setWeaponLoadout(["laser"], 0);
mageOverdrive.maxMana = 60;
mageOverdrive.mana = 1;
const overdriveActivation = SkillController.activate(mageOverdrive, [], { x: 0, y: 0 }, 0);
assert.equal(overdriveActivation.activated, true, "Arcane Overdrive must not require an enemy target");
assert.equal(mageOverdrive.skillActiveTimer, 4);
assert.equal(mageOverdrive.skillCooldown, 12);
assert.ok(mageOverdrive.invulnerabilityTimer >= 0.35);
assert.equal(mageOverdrive.manaRechargeTimer, 4);
assert.equal(WeaponController.getEnergyCost(mageOverdrive, "laser"), 0);
const overdriveShot = WeaponController.fire(mageOverdrive, 0, () => 0.99);
assert.equal(overdriveShot.fired, true);
assert.equal(mageOverdrive.mana, 1, "Arcane Overdrive must make weapon fire free");
assert.equal(mageOverdrive.mageArcaneCharge, 0, "free Overdrive shots must not build Arcane Echo");
assert.equal(overdriveShot.projectiles[0].pierceRemaining, 1);
assert.ok(Math.abs(Math.hypot(overdriveShot.projectiles[0].vx, overdriveShot.projectiles[0].vy) - 360) < 0.001);
for (const projectile of overdriveShot.projectiles) releaseProjectile(projectile);

const r90Player = new Player(160, 120);
r90Player.mana = 25;
r90Player.setWeaponLoadout(["r9_0"], 0);
const r90First = WeaponController.fire(r90Player, 0, () => 0.5);
assert.equal(r90First.fired, true);
assert.equal(r90First.projectiles.length, 6);
assert.ok(Math.abs(r90Player.fireCooldown - 0.12) < 1e-9, "R9-0 first blast must quickly chamber the second barrel");
for (const projectile of r90First.projectiles) releaseProjectile(projectile);
r90Player.fireCooldown = 0;
const r90Second = WeaponController.fire(r90Player, 0, () => 0.5);
assert.equal(r90Second.fired, true);
assert.ok(Math.abs(r90Player.fireCooldown - 0.72) < 1e-9, "R9-0 second blast must enter pump recovery");
for (const projectile of r90Second.projectiles) releaseProjectile(projectile);

const mg42Player = new Player(160, 120);
mg42Player.setWeaponLoadout(["mg42", "pistol"], 0);
mg42Player.mana = 0;
const coolShot = WeaponController.fire(mg42Player, 0, () => 0.99);
assert.equal(coolShot.fired, true);
assert.equal(mg42Player.weaponHeat, 9);
const coolAngle = Math.abs(Math.atan2(coolShot.projectiles[0].vy, coolShot.projectiles[0].vx));
for (const projectile of coolShot.projectiles) releaseProjectile(projectile);
mg42Player.weaponHeat = 90;
mg42Player.fireCooldown = 0;
const hotShot = WeaponController.fire(mg42Player, 0, () => 0.99);
assert.equal(hotShot.fired, true);
const hotAngle = Math.abs(Math.atan2(hotShot.projectiles[0].vy, hotShot.projectiles[0].vx));
assert.ok(hotAngle > coolAngle * 1.7, "MG42 spread must widen as heat rises");
for (const projectile of hotShot.projectiles) releaseProjectile(projectile);
mg42Player.fireCooldown = 0;
const overheatShot = WeaponController.fire(mg42Player, 0, () => 0.5);
assert.equal(overheatShot.fired, true);
assert.ok(mg42Player.weaponOverheatTimer > 0);
for (const projectile of overheatShot.projectiles) releaseProjectile(projectile);
mg42Player.fireCooldown = 0;
assert.equal(WeaponController.fire(mg42Player, 0, () => 0.5).reason, "overheated");
const heatBeforeSwap = mg42Player.weaponHeat;
assert.equal(WeaponController.switchWeapon(mg42Player), true);
WeaponController.updateRuntime(mg42Player, 0.25, false);
assert.ok(mg42Player.weaponHeat < heatBeforeSwap && mg42Player.weaponHeat > 0, "MG42 must cool instead of resetting when holstered");
WeaponController.updateRuntime(mg42Player, 2, false);
assert.equal(mg42Player.weaponOverheatTimer, 0);
assert.ok(mg42Player.weaponHeat <= 35);

const na45Player = new Player(160, 120);
na45Player.maxMana = 80;
na45Player.mana = 80;
na45Player.setWeaponLoadout(["na_45"], 0);
const primerVolley = WeaponController.fire(na45Player, 0, () => 0.5);
assert.equal(primerVolley.fired, true);
assert.equal(primerVolley.projectiles[0].linkedShotMode, "primer");
assert.equal(primerVolley.projectiles[0].linkedExplosionRadius, 42);
na45Player.fireCooldown = 0;
const catalystVolley = WeaponController.fire(na45Player, 0, () => 0.5);
assert.equal(catalystVolley.fired, true);
assert.equal(catalystVolley.projectiles[0].linkedShotMode, "catalyst");

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

const minishark = fire("minishark");
assert.equal(minishark.style, "tracer");
assert.equal(WEAPONS.minishark.manaCost, 0);
assert.ok(WEAPONS.minishark.fireRate >= 11);

const waterBolt = fire("water_bolt");
assert.equal(waterBolt.style, "water");
assert.equal(waterBolt.wallBouncesRemaining, 5);
assert.equal(waterBolt.pierceRemaining, 9);
assert.equal(waterBolt.repeatHitDelay, 0.45);
waterBolt.hitEnemyIds.add(77);
waterBolt.update(0.01);
waterBolt.update(0.46);
assert.equal(waterBolt.hitEnemyIds.size, 0, "repeat-hit projectiles must clear their hit lock");

const terrarian = fire("terrarian");
assert.equal(terrarian.style, "yoyo");
assert.equal(terrarian.tetherRange, 108);
assert.equal(terrarian.repeatHitDelay, 0.35);
assert.equal(terrarian.maxLife, 0.35);

player.fireCooldown = 0;
player.weaponChannelTime = 0;
player.setWeaponLoadout(["last_prism"], 0);
player.mana = 80;
const prismOpen = WeaponController.fire(player, 0, () => 0.5);
assert.equal(prismOpen.fired, true);
assert.equal(prismOpen.projectiles.length, 6);
const openAngles = prismOpen.projectiles.map(projectile => Math.atan2(projectile.vy, projectile.vx));
const openSpread = Math.max(...openAngles) - Math.min(...openAngles);
const openDamage = prismOpen.projectiles[0].damage;
const openCost = 80 - player.mana;

player.fireCooldown = 0;
player.weaponChannelTime = WEAPONS.last_prism.channelTime ?? 3.2;
player.mana = 80;
const prismFocused = WeaponController.fire(player, 0, () => 0.5);
assert.equal(prismFocused.fired, true);
const focusedAngles = prismFocused.projectiles.map(projectile => Math.atan2(projectile.vy, projectile.vx));
const focusedSpread = Math.max(...focusedAngles) - Math.min(...focusedAngles);
assert.ok(focusedSpread < openSpread * 0.12, "Last Prism rays must converge while held");
assert.ok(prismFocused.projectiles[0].damage > openDamage);
assert.ok(80 - player.mana > openCost);
assert.equal(prismFocused.projectiles[0].beamWidth, 4);

player.fireCooldown = 0;
player.weaponChannelTime = 0;
player.setWeaponLoadout(["zenith"], 0);
player.mana = 80;
const zenithVolley = WeaponController.fire(player, 0, () => 0.5);
assert.equal(zenithVolley.fired, true);
assert.equal(zenithVolley.projectiles.length, 3);
assert.ok(zenithVolley.projectiles.every(projectile => projectile.style === "sword" && projectile.ignoreWalls));

player.fireCooldown = 0;
player.setWeaponLoadout(["stardust_dragon_staff"], 0);
player.mana = 80;
const dragon = WeaponController.fire(player, 0, () => 0.5);
assert.equal(dragon.fired, true);
assert.equal(dragon.projectiles.length, 1);
assert.equal(dragon.projectiles[0].style, "dragon");
assert.equal(dragon.projectiles[0].ignoreWalls, true);
assert.equal(dragon.projectiles[0].repeatHitDelay, 0.6);

const fakeEngine = {
  data: {
    settings: { reducedFlashing: false },
    recordEnemyKill() {},
    recordWeaponUsed() {},
  },
  isPerformanceDegraded: () => false,
  triggerScreenShake() {},
};
const dungeon = new DungeonState(fakeEngine as any) as any;
dungeon.isCollidingWithMap = () => false;
dungeon.player.mana = 80;
dungeon.player.setWeaponLoadout(["stardust_dragon_staff"], 0);
dungeon.getPlayerAimAngle = () => 0;
dungeon.fireWeapon();
dungeon.player.fireCooldown = 0;
dungeon.fireWeapon();
assert.equal(dungeon.projectiles.length, 1, "recasting the staff must strengthen the existing dragon");
assert.equal(dungeon.projectiles[0].summonLevel, 2);
assert.equal(dungeon.projectiles[0].damage, 7);
for (const projectile of dungeon.projectiles) releaseProjectile(projectile);
dungeon.projectiles = [];

const linkedPrimer = primerVolley.projectiles[0];
const linkedCatalyst = catalystVolley.projectiles[0];
linkedPrimer.x = linkedPrimer.y = 40;
linkedCatalyst.x = 52;
linkedCatalyst.y = 40;
dungeon.projectiles = [linkedPrimer, linkedCatalyst];
dungeon.stickLinkedPrimer(linkedPrimer);
const linkedBlastTarget = new Enemy(48, 40, "melee");
linkedBlastTarget.hp = linkedBlastTarget.maxHp = 30;
dungeon.enemies = [linkedBlastTarget];
dungeon.updateProjectiles(0.016);
assert.equal(linkedPrimer.detonated, true);
assert.equal(dungeon.projectiles.length, 0, "NA-45 linked rounds must be released after detonation");
assert.ok(linkedBlastTarget.hp < 30, "NA-45 Catalyst must detonate the nearby Primer");

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
assert.equal(pooledProjectile.linkedShotMode, "none");
assert.equal(pooledProjectile.stuck, false);
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
const projectileRendererSource = fs.readFileSync("src/game/render/ProjectileArtRenderer.ts", "utf8");
const fxSource = fs.readFileSync("src/game/render/PixelFxSystem.ts", "utf8");
const audioSource = fs.readFileSync("src/game/audio/AudioManager.ts", "utf8");
assert.match(dungeonSource, /heldYoyo[\s\S]*heldYoyo\.life = Math\.max\(heldYoyo\.life, 0\.3\)/);
assert.match(dungeonSource, /updateProjectileHoming[\s\S]*rotateVelocityToward/);
assert.match(dungeonSource, /applyProjectileChain[\s\S]*calculateChainDamage/);
assert.match(dungeonSource, /detonateProjectile[\s\S]*calculateExplosionDamage/);
assert.match(dungeonSource, /stickLinkedPrimer[\s\S]*triggerLinkedPrimer/);
assert.match(dungeonSource, /WeaponController\.updateRuntime\(this\.player, dt, fireHeld\)/);
assert.match(rendererSource, /ProjectileArtRenderer\.draw/);
assert.match(projectileRendererSource, /p\.style === "beam"[\s\S]*p\.style === "prism"/);
assert.match(projectileRendererSource, /p\.style === "yoyo"[\s\S]*p\.style === "sword"[\s\S]*p\.style === "dragon"/);
assert.match(projectileRendererSource, /p\.style === "bullet"[\s\S]*p\.style === "tracer"[\s\S]*p\.style === "plasma"[\s\S]*p\.style === "flame"[\s\S]*p\.style === "rocket"[\s\S]*p\.style === "disc"[\s\S]*p\.style === "water"/);
assert.match(fxSource, /emitProjectileImpact[\s\S]*emitExplosion/);
assert.match(audioSource, /playWeaponShot[\s\S]*style === "beam"[\s\S]*style === "lightning"[\s\S]*style === "rocket"[\s\S]*style === "water"[\s\S]*style === "sword"[\s\S]*style === "prism"[\s\S]*style === "dragon"/);

console.log(JSON.stringify({
  projectileStyles: actualStyles.size,
  zeroEnergyVector: WEAPONS.vector_9.manaCost === 0,
  homing: "ok",
  accelerationAndDrag: "ok",
  chainLightning: "ok",
  radialExplosion: "ok",
  codBurstHeatAndLink: "ok",
  allStageWeaponPool: getAvailableWeapons(1).length,
  bossHighTierRate: Number(bossRates.highTier.toFixed(3)),
  bossLegendaryRate: Number(bossRates.legendary.toFixed(3)),
  bossChestPersistence: "ok",
  weightedDrops: "ok",
  weaponAudio: "ok",
  terrariaArchetypes: ["gun", "spellbook", "yoyo", "channel", "summon", "melee"],
  mageArcaneOverdrive: "ok",
  mageArcaneEcho: "ok",
  dedicatedRendering: "ok",
}));
