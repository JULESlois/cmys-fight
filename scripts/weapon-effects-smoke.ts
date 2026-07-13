import assert from "node:assert/strict";
import fs from "node:fs";
import { Player } from "../src/game/entities/Player";
import { WeaponController } from "../src/game/combat/WeaponController";
import { SkillController } from "../src/game/combat/SkillController";
import {
  calculateChainDamage,
  calculateCloseRangeDamageMultiplier,
  calculateExplosionDamage,
  calculateExplosionFalloff,
  rotateVelocityToward,
} from "../src/game/combat/ProjectileEffects";
import {
  SHOTGUN_CLOSE_RANGE_FALLOFF_DISTANCE,
  SHOTGUN_CLOSE_RANGE_MULTIPLIER,
  WEAPONS,
  getAvailableWeapons,
  getProjectileProfile,
  rollAvailableWeapon,
  type ProjectileStyle,
  type WeaponRollContext,
} from "../src/game/data/weapons";
import { DungeonState } from "../src/game/states/DungeonState";
import { Enemy } from "../src/game/entities/Enemy";
import { acquireProjectile, releaseProjectile } from "../src/game/EntityPools";
import { EnemyFactory } from "../src/game/EnemyFactory";
import { ENEMIES } from "../src/game/data/enemies";

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
assert.equal(calculateCloseRangeDamageMultiplier(0, 3, 96), 3);
assert.equal(calculateCloseRangeDamageMultiplier(48, 3, 96), 2);
assert.equal(calculateCloseRangeDamageMultiplier(96, 3, 96), 1);
assert.equal(calculateCloseRangeDamageMultiplier(140, 3, 96), 1);
for (const weapon of Object.values(WEAPONS).filter(weapon => weapon.category === "shotgun")) {
  const profile = getProjectileProfile(weapon);
  assert.equal(profile.closeRangeDamageMultiplier, SHOTGUN_CLOSE_RANGE_MULTIPLIER, `${weapon.id} close multiplier`);
  assert.equal(profile.closeRangeFalloffDistance, SHOTGUN_CLOSE_RANGE_FALLOFF_DISTANCE, `${weapon.id} falloff distance`);
}
assert.equal(getProjectileProfile(WEAPONS.pistol).closeRangeDamageMultiplier, 1);

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
  const counts = { common: 0, uncommon: 0, rare: 0, legendary: 0, myth: 0 };
  const samples = 12000;
  for (let index = 0; index < samples; index++) {
    // Runtime weapon rolls are always filtered for the active character.
    // Sampling without a character incorrectly mixes every exclusive starter
    // weapon into one synthetic pool and dilutes the intended rarity curve.
    counts[rollAvailableWeapon(1, random, context, [], "knight").rarity]++;
  }
  return {
    highTier: (counts.rare + counts.legendary + counts.myth) / samples,
    legendary: counts.legendary / samples,
    myth: counts.myth / samples,
  };
};
const shopRates = sampleRarityRates("shop");
const treasureRates = sampleRarityRates("treasure");
const bossRates = sampleRarityRates("boss");
assert.ok(treasureRates.highTier > shopRates.highTier);
assert.ok(bossRates.highTier >= 0.88, `Boss chest high-tier rate ${bossRates.highTier}`);
assert.ok(bossRates.legendary >= 0.22, `Boss chest legendary rate ${bossRates.legendary}`);
assert.ok(bossRates.myth >= 0.015, `Boss chest myth rate ${bossRates.myth}`);
assert.ok(bossRates.highTier > treasureRates.highTier);
assert.equal(getAvailableWeapons(1).length, Object.keys(WEAPONS).length);
assert.equal(getAvailableWeapons(1).filter(weapon => weapon.rarity === "legendary").length, 17);
assert.equal(getAvailableWeapons(1).filter(weapon => weapon.rarity === "myth").length, 2);
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
assert.equal(mageYoyo.mageArcaneCharge, 16);
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
const r90VolleyKnockback = r90First.projectiles.reduce((sum, projectile) => sum + projectile.knockback, 0);
assert.ok(
  Math.abs(r90VolleyKnockback - WEAPONS.r9_0.knockback * WeaponController.SHOTGUN_VOLLEY_KNOCKBACK_MULTIPLIER) < 1e-9,
  "shotgun knockback is capped per volley instead of stacking once per pellet",
);
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
assert.equal(mg42Player.weaponHeat, 2.3);
const coolAngle = Math.abs(Math.atan2(coolShot.projectiles[0].vy, coolShot.projectiles[0].vx));
for (const projectile of coolShot.projectiles) releaseProjectile(projectile);
mg42Player.weaponHeat = 90;
mg42Player.fireCooldown = 0;
const hotShot = WeaponController.fire(mg42Player, 0, () => 0.99);
assert.equal(hotShot.fired, true);
const hotAngle = Math.abs(Math.atan2(hotShot.projectiles[0].vy, hotShot.projectiles[0].vx));
assert.ok(hotAngle > coolAngle * 1.7, "MG42 spread must widen as heat rises");
for (const projectile of hotShot.projectiles) releaseProjectile(projectile);
mg42Player.weaponHeat = 99;
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

const sustainedMg42 = new Player(160, 120);
sustainedMg42.setWeaponLoadout(["mg42"], 0);
const heatStep = 1 / 120;
let sustainedFireTime = 0;
while (sustainedFireTime < 5 && sustainedMg42.weaponOverheatTimer <= 0) {
  sustainedMg42.fireCooldown = Math.max(0, sustainedMg42.fireCooldown - heatStep);
  WeaponController.updateRuntime(sustainedMg42, heatStep, true);
  if (sustainedMg42.fireCooldown <= 0) {
    const shot = WeaponController.fire(sustainedMg42, 0, () => 0.5);
    for (const projectile of shot.projectiles) releaseProjectile(projectile);
  }
  sustainedFireTime += heatStep;
}
assert.ok(
  sustainedFireTime >= 3.8 && sustainedFireTime <= 4.2,
  `MG42 should overheat after about 4 seconds of continuous fire, got ${sustainedFireTime.toFixed(3)}s`,
);

const na45Player = new Player(160, 120);
na45Player.maxMana = 80;
na45Player.mana = 80;
na45Player.setWeaponLoadout(["na_45"], 0);
const primerVolley = WeaponController.fire(na45Player, 0, () => 0.5);
assert.equal(primerVolley.fired, true);
assert.equal(primerVolley.projectiles[0].linkedShotMode, "primer");
assert.equal(primerVolley.projectiles[0].linkedExplosionRadius, 42);
assert.equal(primerVolley.projectiles[0].life, 2, "NA-45 Primer fuse must begin when fired");
assert.equal(na45Player.mana, 76);
na45Player.fireCooldown = 0;
const catalystVolley = WeaponController.fire(na45Player, 0, () => 0.5);
assert.equal(catalystVolley.fired, true);
assert.equal(catalystVolley.projectiles[0].linkedShotMode, "catalyst");
assert.equal(na45Player.mana, 76, "NA-45 Catalyst must not consume energy");

const so14Player = new Player(160, 120);
so14Player.maxMana = 80;
so14Player.mana = 80;
so14Player.setWeaponLoadout(["so_14"], 0);
const so14Lead = WeaponController.fire(so14Player, 0, () => 0.99);
assert.equal(so14Lead.fired, true);
assert.equal(so14Lead.projectiles[0].damage, 14);
assert.equal(so14Lead.projectiles[0].pierceRemaining, 2);
assert.equal(so14Lead.projectiles[0].color, "#F4D35E");
assert.equal(so14Lead.recoil, 1.05);
assert.ok(Math.abs(so14Player.fireCooldown - 0.09) < 1e-9);
for (const projectile of so14Lead.projectiles) releaseProjectile(projectile);
so14Player.fireCooldown = 0;
const so14FollowA = WeaponController.fire(so14Player, 0, () => 0.99);
assert.equal(so14FollowA.projectiles[0].damage, 6);
assert.equal(so14FollowA.projectiles[0].pierceRemaining, 0);
assert.equal(so14FollowA.projectiles[0].color, "#CFA7FF");
assert.equal(so14FollowA.recoil, 0.28);
for (const projectile of so14FollowA.projectiles) releaseProjectile(projectile);
so14Player.fireCooldown = 0;
const so14FollowB = WeaponController.fire(so14Player, 0, () => 0.99);
assert.equal(so14FollowB.projectiles[0].damage, 6);
assert.equal(so14FollowB.projectiles[0].color, "#8FD9FF");
assert.ok(Math.abs(so14Player.fireCooldown - 0.52) < 1e-9);
assert.equal(so14Player.mana, 71);
for (const projectile of so14FollowB.projectiles) releaseProjectile(projectile);

const aa12 = fire("aa_12");
assert.equal(WEAPONS.aa_12.pelletCount, 6);
assert.equal(WEAPONS.aa_12.fireRate, 4.8);
assert.equal(aa12.style, "bullet");
releaseProjectile(aa12);

const bayonetPlayer = new Player(160, 120);
bayonetPlayer.mana = 20;
bayonetPlayer.setWeaponLoadout(["bayonet_ruby"], 0);
const bayonetThrust = WeaponController.fire(bayonetPlayer, 0, () => 0.99);
assert.equal(bayonetThrust.projectiles.length, 1);
assert.equal(bayonetThrust.projectiles[0].style, "sword");
assert.equal(bayonetThrust.projectiles[0].pierceRemaining, 2);
assert.ok(bayonetThrust.projectiles[0].maxLife * Math.hypot(bayonetThrust.projectiles[0].vx, bayonetThrust.projectiles[0].vy) < 50);
for (const projectile of bayonetThrust.projectiles) releaseProjectile(projectile);

const butterflyPlayer = new Player(160, 120);
butterflyPlayer.mana = 20;
butterflyPlayer.setWeaponLoadout(["butterfly_emerald"], 0);
const butterflyFan = WeaponController.fire(butterflyPlayer, 0, () => 0.99);
assert.equal(butterflyFan.projectiles.length, 3);
assert.ok(butterflyFan.projectiles[0].vy < butterflyFan.projectiles[1].vy);
assert.ok(butterflyFan.projectiles[1].vy < butterflyFan.projectiles[2].vy);
assert.ok(butterflyFan.projectiles.every(projectile => projectile.maxLife <= 0.2));
for (const projectile of butterflyFan.projectiles) releaseProjectile(projectile);

const karambitPlayer = new Player(160, 120);
karambitPlayer.mana = 20;
karambitPlayer.setWeaponLoadout(["karambit_emerald"], 0);
const karambitCross = WeaponController.fire(karambitPlayer, 0, () => 0.2);
assert.equal(karambitCross.projectiles.length, 2);
assert.ok(karambitCross.projectiles.every(projectile => projectile.critical));
assert.ok(WEAPONS.karambit_emerald.critChance > WEAPONS.butterfly_emerald.critChance);
for (const projectile of karambitCross.projectiles) releaseProjectile(projectile);

const cyrexPlayer = new Player(160, 120);
cyrexPlayer.mana = 20;
cyrexPlayer.setWeaponLoadout(["m4a1_s_cyrex"], 0);
const cyrexShot = WeaponController.fire(cyrexPlayer, 0, () => 0.99);
assert.equal(cyrexShot.projectiles[0].pierceRemaining, 1);
assert.equal(cyrexShot.projectiles[0].muzzleEffect, "smoke");
for (const projectile of cyrexShot.projectiles) releaseProjectile(projectile);

const coalitionPlayer = new Player(160, 120);
coalitionPlayer.mana = 20;
coalitionPlayer.setWeaponLoadout(["m4a4_coalition"], 0);
const coalitionShot = WeaponController.fire(coalitionPlayer, 0, () => 0.99);
assert.equal(coalitionShot.projectiles[0].pierceRemaining, 1);
assert.equal(WEAPONS.m4a4_coalition.rarity, "legendary");
for (const projectile of coalitionShot.projectiles) releaseProjectile(projectile);

const awpPlayer = new Player(160, 120);
awpPlayer.maxMana = 80;
awpPlayer.mana = 80;
awpPlayer.setWeaponLoadout(["awp_dragon_lore"], 0);
const awpVolley = WeaponController.fire(awpPlayer, 0, () => 0.99);
assert.equal(awpVolley.fired, true);
assert.equal(awpVolley.projectiles[0].highHealthDamageThreshold, 0.75);
assert.equal(awpVolley.projectiles[0].highHealthDamageMultiplier, 1.75);
assert.equal(awpVolley.projectiles[0].pierceRemaining, 3);

const lotusPlayer = new Player(160, 120);
lotusPlayer.maxMana = 80;
lotusPlayer.mana = 80;
lotusPlayer.setWeaponLoadout(["ak47_wild_lotus"], 0);
const lotusVolley = WeaponController.fire(lotusPlayer, 0, () => 0);
assert.equal(lotusVolley.fired, true);
assert.equal(lotusVolley.projectiles[0].critical, true);
assert.equal(lotusVolley.projectiles[0].criticalExplosionRadius, 18);
assert.equal(lotusVolley.projectiles[0].criticalExplosionDamageMultiplier, 0.45);

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

const resolveKsgDamage = (targetX: number) => {
  const target = new Enemy(targetX, 100, "melee");
  target.hp = target.maxHp = 100;
  target.hitboxRadius = 14;
  target.hitboxOffsetY = -10;
  const profile = getProjectileProfile(WEAPONS.ksg_12);
  const shot = acquireProjectile(
    0, target.hitboxY, 100, 0, 2, WEAPONS.ksg_12.damage, "player", 3,
    WEAPONS.ksg_12.color, 0, false, 0, 0, undefined, 0, false, profile,
  );
  dungeon.projectiles = [shot];
  dungeon.enemies = [target];
  dungeon.updateProjectiles(targetX / 100 + 0.1);
  return 100 - target.hp;
};
const closeShotgunDamage = resolveKsgDamage(24);
const distantShotgunDamage = resolveKsgDamage(140);
assert.ok(closeShotgunDamage > distantShotgunDamage * 2.35, `${closeShotgunDamage} vs ${distantShotgunDamage}`);
assert.equal(distantShotgunDamage, WEAPONS.ksg_12.damage, "shotguns must settle at 1x damage beyond falloff distance");

const bodyEnemy = new Enemy(50, 100, "melee");
EnemyFactory.applyDefinition(bodyEnemy, ENEMIES.moss_brute);
assert.ok(bodyEnemy.hitboxRadius > bodyEnemy.radius * 2, "body hurtbox must be substantially larger than foot collision");
assert.ok(bodyEnemy.hitboxOffsetY < 0, "body hurtbox must be shifted above the feet");
const upperBodyY = bodyEnemy.hitboxY - bodyEnemy.hitboxRadius * 0.5;
assert.ok(Math.abs(upperBodyY - bodyEnemy.y) > bodyEnemy.radius + 2, "test ray must miss the old foot hitbox");
const bodyShot = acquireProjectile(0, upperBodyY, 200, 0, 2, 3, "player", 2);
dungeon.projectiles = [bodyShot];
dungeon.enemies = [bodyEnemy];
const bodyHpBefore = bodyEnemy.hp;
dungeon.updateProjectiles(0.35);
assert.ok(bodyEnemy.hp < bodyHpBefore, "projectiles through the rendered upper body must hit");

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

dungeon.player.mana = 80;
dungeon.player.setWeaponLoadout(["terrarian"], 0);
dungeon.player.fireCooldown = 0;
dungeon.fireWeapon();
assert.equal(dungeon.player.activeYoyoWeaponId, "terrarian", "deployed yoyo must replace the held weapon model");
const manaAfterYoyoLaunch = dungeon.player.mana;
const terrarianTarget = new Enemy(120, 100, "melee");
terrarianTarget.hp = terrarianTarget.maxHp = 30;
dungeon.enemies = [terrarianTarget];
dungeon.updateTerrarianYoyo(0.4, true);
assert.ok(dungeon.player.mana < manaAfterYoyoLaunch, "sustaining Terrarian must consume additional energy");
assert.equal(
  dungeon.projectiles.some((projectile: any) => projectile.weaponId === "terrarian_orb" && projectile.homingStrength > 0),
  true,
  "spinning Terrarian must emit a green homing orb",
);
for (const projectile of dungeon.projectiles) releaseProjectile(projectile);
dungeon.projectiles = [];

const timedPrimerPlayer = new Player(80, 80);
timedPrimerPlayer.maxMana = 80;
timedPrimerPlayer.mana = 80;
timedPrimerPlayer.setWeaponLoadout(["na_45"], 0);
const timedPrimerVolley = WeaponController.fire(timedPrimerPlayer, 0, () => 0.5);
const timedPrimer = timedPrimerVolley.projectiles[0];
timedPrimer.x = 80;
timedPrimer.y = 80;
timedPrimer.previousX = 80;
timedPrimer.previousY = 80;
timedPrimer.vx = 0;
timedPrimer.vy = 0;
const timedBlastTarget = new Enemy(110, 80, "melee");
timedBlastTarget.hp = timedBlastTarget.maxHp = 30;
dungeon.projectiles = [timedPrimer];
dungeon.enemies = [timedBlastTarget];
dungeon.updateProjectiles(2.01);
assert.equal(timedPrimer.detonated, true, "NA-45 Primer must auto-detonate after two seconds");
assert.ok(timedBlastTarget.hp < 30, "NA-45 timed fuse must deal blast damage");
assert.equal(dungeon.projectiles.length, 0);

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

na45Player.fireCooldown = 0;
const autoPrimer = WeaponController.fire(na45Player, 0, () => 0.5).projectiles[0];
autoPrimer.x = autoPrimer.y = 40;
dungeon.projectiles = [autoPrimer];
dungeon.stickLinkedPrimer(autoPrimer);
const autoBlastTarget = new Enemy(48, 40, "melee");
autoBlastTarget.hp = autoBlastTarget.maxHp = 30;
dungeon.enemies = [autoBlastTarget];
dungeon.updateProjectiles(2.01);
assert.equal(dungeon.projectiles.length, 0, "NA-45 Primer must expire after two seconds");
assert.ok(autoBlastTarget.hp < 30, "expired NA-45 Primer must automatically explode");

const awpShot = awpVolley.projectiles[0];
awpShot.x = 40;
awpShot.y = 40;
awpShot.vx = 100;
awpShot.vy = 0;
const awpTarget = new Enemy(50, 40, "melee");
awpTarget.hp = awpTarget.maxHp = 100;
dungeon.projectiles = [awpShot];
dungeon.enemies = [awpTarget];
dungeon.updateProjectiles(0.1);
assert.equal(awpTarget.hp, 51, "Dragon Lore must apply its 1.75x opening-shot multiplier");
for (const projectile of dungeon.projectiles) releaseProjectile(projectile);
dungeon.projectiles = [];

const lotusShot = lotusVolley.projectiles[0];
lotusShot.x = 40;
lotusShot.y = 40;
lotusShot.vx = 100;
lotusShot.vy = 0;
const lotusDirect = new Enemy(50, 40, "melee");
const lotusNearby = new Enemy(56, 40, "melee");
lotusDirect.hp = lotusDirect.maxHp = 50;
lotusNearby.hp = lotusNearby.maxHp = 50;
dungeon.projectiles = [lotusShot];
dungeon.enemies = [lotusDirect, lotusNearby];
dungeon.updateProjectiles(0.1);
assert.equal(dungeon.projectiles.length, 0, "Wild Lotus critical shot must detonate");
assert.equal(lotusShot.explosionDamageMultiplier, 0.45, "Wild Lotus must retain its authored critical-bloom multiplier");
assert.ok(lotusNearby.hp < 50, "Wild Lotus critical bloom must damage nearby enemies");

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
assert.equal(pooledProjectile.targetsMicheleTurret, false);
assert.equal(pooledProjectile.stuck, false);
assert.equal(pooledProjectile.highHealthDamageThreshold, 0);
assert.equal(pooledProjectile.highHealthDamageMultiplier, 1);
assert.equal(pooledProjectile.criticalExplosionRadius, 0);
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
assert.match(dungeonSource, /heldYoyo[\s\S]*updateTerrarianYoyo[\s\S]*terrarian_orb/);
assert.match(rendererSource, /dualWield[\s\S]*drawPlayerWeapon\(ctx, player, "back"\)[\s\S]*drawPlayerWeapon\(ctx, player\)/);
assert.match(rendererSource, /activeYoyoWeaponId[\s\S]*!yoyoDeployed/);
assert.match(dungeonSource, /updateProjectileHoming[\s\S]*rotateVelocityToward/);
assert.match(dungeonSource, /projectile\.style === "sword"[\s\S]*projectile\.weaponId === "zenith"/);
assert.match(dungeonSource, /applyProjectileChain[\s\S]*calculateChainDamage/);
assert.match(dungeonSource, /detonateProjectile[\s\S]*calculateExplosionDamage/);
assert.match(dungeonSource, /stickLinkedPrimer[\s\S]*triggerLinkedPrimer/);
assert.match(dungeonSource, /WeaponController\.updateRuntime\(this\.player, dt, fireHeld\)/);
assert.match(dungeonSource, /highHealthDamageThreshold[\s\S]*highHealthDamageMultiplier/);
assert.match(dungeonSource, /criticalExplosionRadius[\s\S]*criticalExplosionDamageMultiplier/);
assert.match(dungeonSource, /weaponRecoilVisual = Math\.min/);
assert.match(rendererSource, /ProjectileArtRenderer\.draw/);
assert.match(rendererSource, /activeWeapon\?\.dualWield[\s\S]*drawPlayerWeapon\(ctx, player, "back"\)/);
assert.match(rendererSource, /weaponRecoilVisual/);
assert.match(projectileRendererSource, /p\.style === "beam"[\s\S]*p\.style === "prism"/);
assert.match(projectileRendererSource, /p\.style === "yoyo"[\s\S]*p\.style === "sword"[\s\S]*p\.style === "dragon"/);
assert.match(projectileRendererSource, /p\.weaponId !== "zenith"[\s\S]*weapon_zenith/);
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
  shotgunDistanceDamage: { close: Number(closeShotgunDamage.toFixed(2)), far: distantShotgunDamage },
  fullBodyEnemyHitboxes: "ok",
  codBurstHeatAndLink: "ok",
  mythAdaptiveAndOpeningShots: "ok",
  wildLotusCriticalBloom: "ok",
  csMeleeAndRifles: "ruby-emerald-cyrex-coalition",
  allStageWeaponPool: getAvailableWeapons(1).length,
  bossHighTierRate: Number(bossRates.highTier.toFixed(3)),
  bossLegendaryRate: Number(bossRates.legendary.toFixed(3)),
  bossMythRate: Number(bossRates.myth.toFixed(3)),
  bossChestPersistence: "ok",
  weightedDrops: "ok",
  weaponAudio: "ok",
  terrariaArchetypes: ["gun", "spellbook", "yoyo", "channel", "summon", "melee"],
  mageArcaneOverdrive: "ok",
  mageArcaneEcho: "ok",
  dedicatedRendering: "ok",
  dualWieldLayering: "front-and-back",
  weaponBodyRecoil: "ok",
}));
