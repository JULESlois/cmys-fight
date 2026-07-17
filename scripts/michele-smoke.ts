import assert from "node:assert/strict";
import fs from "node:fs";
import { CHARACTERS } from "../src/game/data/characters";
import {
  WEAPONS,
  createStarterWeaponSlots,
  getAvailableWeapons,
  isWeaponAvailableForCharacter,
  rollAvailableWeapon,
} from "../src/game/data/weapons";
import { Player } from "../src/game/entities/Player";
import { Enemy } from "../src/game/entities/Enemy";
import { WeaponController } from "../src/game/combat/WeaponController";
import { SkillController } from "../src/game/combat/SkillController";
import { DungeonState } from "../src/game/states/DungeonState";
import { META_SAVE_VERSION, createDefaultMetaProgress, normalizeMetaProgress } from "../src/game/MetaProgress";
import { acquireProjectile, releaseProjectile } from "../src/game/EntityPools";
import { GameData } from "../src/game/GameData";
import { MICHELE_PLAYER_PALETTE, SPRITES } from "../src/game/data/sprites";

assert.ok(CHARACTERS.michele);
assert.equal(CHARACTERS.michele.starterWeapon, "inspector");
assert.equal(CHARACTERS.michele.maxHp, 6);
assert.equal(CHARACTERS.michele.maxArmor, 7);
assert.equal(CHARACTERS.michele.maxMana, 42);
assert.equal(SkillController.getConfig("michele").id, "pawtector");
assert.equal(SkillController.getConfig("michele").duration, 8);
assert.equal(SkillController.getConfig("michele").cooldown, 12);

assert.ok(WEAPONS.inspector);
assert.equal(WEAPONS.inspector.exclusiveCharacterId, "michele");
assert.equal(WEAPONS.inspector.markedTargetDamageMultiplier, 1.35);
assert.equal(WEAPONS.inspector.projectileStyle, "tracer");
assert.equal(isWeaponAvailableForCharacter(WEAPONS.inspector, "michele"), true);
assert.equal(isWeaponAvailableForCharacter(WEAPONS.inspector, "knight"), false);
assert.equal(getAvailableWeapons(1, "michele").some(weapon => weapon.id === "inspector"), true);
assert.equal(getAvailableWeapons(1, "knight").some(weapon => weapon.id === "inspector"), false);
const allExceptInspector = Object.keys(WEAPONS).filter(id => id !== "inspector");
assert.equal(rollAvailableWeapon(1, () => 0.5, "shop", allExceptInspector, "michele").id, "inspector");
assert.deepEqual(createStarterWeaponSlots("inspector", "michele"), ["inspector"]);
assert.deepEqual(createStarterWeaponSlots("laser", "michele"), ["laser"]);
assert.deepEqual(createStarterWeaponSlots("laser", "mage"), ["laser", "pistol"]);
const migratedRun = new GameData() as any;
migratedRun.data.player.characterId = "michele";
migratedRun.data.player.weaponSlots = ["inspector", "pistol"];
migratedRun.data.player.activeWeaponSlot = 1;
migratedRun.data.player.currentWeaponId = "pistol";
migratedRun.migrateMicheleStarterLoadout(20);
assert.deepEqual(migratedRun.data.player.weaponSlots, ["inspector"]);
assert.equal(migratedRun.data.player.currentWeaponId, "inspector");
assert.equal(migratedRun.data.player.activeWeaponSlot, 0);

const knight = new Player(0, 0);
knight.characterId = "knight";
assert.equal(WeaponController.equipWeapon(knight, "inspector").consumed, false);
knight.setWeaponLoadout(["inspector"], 0);
assert.equal(WeaponController.fire(knight, 0).reason, "invalid_weapon");

const michele = new Player(160, 120);
michele.characterId = "michele";
michele.maxMana = 42;
michele.mana = 42;
assert.equal(WeaponController.equipWeapon(michele, "inspector").consumed, true);
const inspectorShot = WeaponController.fire(michele, 0, () => 0.99);
assert.equal(inspectorShot.fired, true);
assert.equal(inspectorShot.projectiles[0].weaponId, "inspector");
assert.equal(michele.mana, 41);
for (const projectile of inspectorShot.projectiles) releaseProjectile(projectile);

const skillUser = new Player(80, 90);
skillUser.characterId = "michele";
const activation = SkillController.activate(skillUser, [], { x: 0, y: 0 }, 0);
assert.equal(activation.activated, true);
assert.equal(skillUser.skillActiveTimer, 8);
assert.equal(skillUser.skillCooldown, 12);
assert.equal(skillUser.micheleTurretX, 80);
assert.equal(skillUser.micheleTurretY, 90);
assert.equal(skillUser.micheleTurretHitsRemaining, 6);
SkillController.update(skillUser, 0.5);
assert.equal(skillUser.skillActiveTimer, 7.5);

const roomResetDungeon = new DungeonState({} as any) as any;
roomResetDungeon.player.characterId = "michele";
roomResetDungeon.player.skillActiveTimer = 6;
roomResetDungeon.player.micheleTurretFireCooldown = 0.2;
roomResetDungeon.player.micheleMarkedEnemyId = 42;
roomResetDungeon.player.micheleMarkTimer = 1.4;
roomResetDungeon.player.micheleTurretActive = true;
roomResetDungeon.clearRoomScopedSkillEntities();
assert.equal(roomResetDungeon.player.skillActiveTimer, 0, "Pawtector must despawn on room transition");
assert.equal(roomResetDungeon.player.micheleTurretFireCooldown, 0);
assert.equal(roomResetDungeon.player.micheleTurretActive, false);
assert.equal(roomResetDungeon.player.micheleTurretHitsRemaining, 0);
assert.equal(roomResetDungeon.player.micheleMarkedEnemyId, -1);
assert.equal(roomResetDungeon.player.micheleMarkTimer, 0);

const fakeEngine = {
  data: {
    settings: { reducedFlashing: false },
    data: { player: { coins: 0 } },
    recordEnemyKill() {},
    recordWeaponUsed() {},
    recordPlayerDamage() {},
  },
  isPerformanceDegraded: () => false,
  triggerScreenShake() {},
} as any;

const turretDungeon = new DungeonState(fakeEngine) as any;
turretDungeon.isCollidingWithMap = () => false;
turretDungeon.player.characterId = "michele";
turretDungeon.player.x = 80;
turretDungeon.player.y = 90;
SkillController.activate(turretDungeon.player, [], { x: 0, y: 0 }, 0);
assert.equal(turretDungeon.getEnemyCombatTarget().kind, "michele_turret");
const turretTarget = new Enemy(110, 90, "melee");
turretTarget.hp = turretTarget.maxHp = 20;
turretDungeon.enemies = [turretTarget];
turretDungeon.updateMicheleTurret(0);
assert.equal(turretDungeon.projectiles.length, 1);
assert.equal(turretDungeon.projectiles[0].weaponId, "michele_turret");
assert.equal(turretDungeon.projectiles[0].damage, SkillController.MICHELE_TURRET_DAMAGE);
assert.equal(turretDungeon.projectiles[0].statusEffect, "slow");
assert.equal(turretDungeon.projectiles[0].statusDuration, SkillController.MICHELE_TURRET_SLOW_DURATION);
assert.equal(turretDungeon.player.micheleTurretFireCooldown, SkillController.MICHELE_TURRET_FIRE_INTERVAL);
for (const projectile of turretDungeon.projectiles) releaseProjectile(projectile);
turretDungeon.projectiles = [];
for (let hit = 0; hit < 5; hit++) assert.equal(turretDungeon.damageMicheleTurret(), true);
assert.equal(turretDungeon.player.micheleTurretHitsRemaining, 1);
assert.equal(turretDungeon.player.micheleTurretActive, true);
assert.equal(turretDungeon.damageMicheleTurret(), true);
assert.equal(turretDungeon.player.micheleTurretHitsRemaining, 0);
assert.equal(turretDungeon.player.micheleTurretActive, false);
assert.equal(turretDungeon.getEnemyCombatTarget().kind, "player");

const passiveDungeon = new DungeonState(fakeEngine) as any;
passiveDungeon.isCollidingWithMap = () => false;
passiveDungeon.player.characterId = "michele";
passiveDungeon.player.x = 50;
passiveDungeon.player.y = 40;
passiveDungeon.player.hp = passiveDungeon.player.maxHp = 6;
passiveDungeon.player.armor = 0;
const attacker = new Enemy(40, 40, "ranged");
attacker.projectileSpeed = 100;
attacker.attackDamage = 1;
passiveDungeon.enemies = [attacker];
passiveDungeon.spawnEnemyProjectile(attacker, 0);
assert.equal(passiveDungeon.projectiles[0].sourceEnemyId, attacker.id);
passiveDungeon.updateProjectiles(0.1);
assert.equal(passiveDungeon.player.micheleMarkedEnemyId, attacker.id);
assert.equal(passiveDungeon.player.micheleMarkTimer, SkillController.MICHELE_MARK_DURATION);
assert.equal(passiveDungeon.getClosestEnemy()?.id, attacker.id);
const sourcedProjectile = acquireProjectile(0, 0, 0, 0, 1, 1, "enemy");
sourcedProjectile.sourceEnemyId = 99;
releaseProjectile(sourcedProjectile);
const resetProjectile = acquireProjectile(0, 0, 0, 0, 1, 1, "enemy");
assert.equal(resetProjectile.sourceEnemyId, -1);
releaseProjectile(resetProjectile);

passiveDungeon.player.invulnerabilityTimer = 0;
passiveDungeon.player.setWeaponLoadout(["inspector"], 0);
passiveDungeon.player.mana = 42;
passiveDungeon.player.fireCooldown = 0;
attacker.x = 60;
attacker.y = 40;
attacker.hp = attacker.maxHp = 20;
const markedShot = WeaponController.fire(passiveDungeon.player, 0, () => 0.99).projectiles[0];
markedShot.x = 50;
markedShot.y = 40;
markedShot.previousX = 50;
markedShot.previousY = 40;
markedShot.vx = 100;
markedShot.vy = 0;
passiveDungeon.projectiles = [markedShot];
passiveDungeon.updateProjectiles(0.1);
assert.ok(Math.abs(attacker.hp - 15.95) < 0.001, `marked Inspector damage ${attacker.hp}`);

assert.equal(META_SAVE_VERSION, 8);
const meta = createDefaultMetaProgress();
assert.ok(meta.unlockedCharacters.includes("michele"));
assert.ok(meta.unlockedStarterWeapons.includes("inspector"));
const migratedMeta = normalizeMetaProgress({ unlockedCharacters: ["knight"], unlockedStarterWeapons: ["pistol"] });
assert.ok(migratedMeta.unlockedCharacters.includes("michele"));
assert.ok(migratedMeta.unlockedStarterWeapons.includes("inspector"));
assert.equal(normalizeMetaProgress({ version: 5, highestStage: 20 }).highestStage, 16);
assert.equal(normalizeMetaProgress({ version: 7, highestStage: 16 }).highestStage, 16);

for (const frameName of [
  "player_michele_side_idle",
  "player_michele_side_idle_1",
  "player_michele_side_walk_0",
  "player_michele_side_walk_1",
  "player_michele_side_walk_2",
  "player_michele_side_walk_3",
]) {
  const frame = SPRITES[frameName];
  assert.equal(frame.length, 32, `${frameName} dense source height`);
  assert.ok(frame.every(row => row.length === 32), `${frameName} dense source width`);
  assert.ok(new Set(frame.join("").replaceAll(".", "")).size >= 12, `${frameName} readable palette detail`);
  const pixelCount = frame.join("").replaceAll(".", "").length;
  assert.ok(pixelCount >= 250 && pixelCount <= 450, `${frameName} detailed silhouette density ${pixelCount}`);
  const baseline = frame.map(row => /[^.]/.test(row)).lastIndexOf(true);
  assert.ok(baseline >= 28 && baseline <= 29, `${frameName} final height stays aligned with CMYS: ${baseline}`);
  assert.equal(frame[30], ".".repeat(32), `${frameName} keeps lower padding row 30`);
  assert.equal(frame[31], ".".repeat(32), `${frameName} keeps lower padding row 31`);
}
assert.notDeepEqual(SPRITES.player_michele_side_idle, SPRITES.player_michele_side_idle_1);
assert.notDeepEqual(SPRITES.player_michele_side_walk_0, SPRITES.player_michele_side_walk_2);
const micheleStrideDifference = SPRITES.player_michele_side_walk_0
  .slice(21, 30)
  .reduce((difference, row, rowIndex) => (
    difference + [...row].filter((pixel, column) => (
      pixel !== SPRITES.player_michele_side_walk_2[rowIndex + 21][column]
    )).length
  ), 0);
assert.ok(
  micheleStrideDifference >= 80,
  `Michele contact poses must show a real opposing stride: ${micheleStrideDifference}`,
);
assert.deepEqual(
  SPRITES.player_michele_side_idle.slice(24),
  SPRITES.player_michele_side_idle_1.slice(24),
  "Michele idle animation keeps both feet planted",
);
assert.equal(MICHELE_PLAYER_PALETTE.C, "#E0AE6A");
assert.equal(MICHELE_PLAYER_PALETTE.M, "#69DFF1");
assert.equal(MICHELE_PLAYER_PALETTE.P, "#C94F58");
assert.notEqual(MICHELE_PLAYER_PALETTE.A, "#000000");
const micheleArtPlayer = new Player(100, 100);
micheleArtPlayer.characterId = "michele";
assert.equal(micheleArtPlayer.weaponHandOffsetY, -5);
assert.equal(micheleArtPlayer.weaponRenderScale, 0.8);
micheleArtPlayer.currentWeaponId = "inspector";
const micheleIdleMuzzle = micheleArtPlayer.getPlayerMuzzlePosition(0);
assert.ok(Math.abs(micheleIdleMuzzle.x - 112.8) < 1e-9);
assert.ok(Math.abs(micheleIdleMuzzle.y - 90.2) < 1e-9);
micheleArtPlayer.animState = "walk";
micheleArtPlayer.animFrame = 1;
assert.equal(micheleArtPlayer.weaponAnimationOffsetY, 1);
assert.equal(micheleArtPlayer.effectiveWeaponHandOffsetY, -4);
micheleArtPlayer.animFrame = 3;
assert.equal(micheleArtPlayer.weaponAnimationOffsetY, -1);
assert.equal(micheleArtPlayer.effectiveWeaponHandOffsetY, -6);

const selectSource = fs.readFileSync("src/game/states/CharacterSelectState.ts", "utf8");
const dungeonSource = fs.readFileSync("src/game/states/DungeonState.ts", "utf8");
const gameDataSource = fs.readFileSync("src/game/GameData.ts", "utf8");
const rendererSource = fs.readFileSync("src/game/render/EntityRenderer.ts", "utf8");
const spriteSource = fs.readFileSync("src/game/data/sprites.ts", "utf8");
const characterArtSource = fs.readFileSync("src/game/data/characterArt.ts", "utf8");
assert.match(selectSource, /isWeaponAvailableForCharacter\(weapon, characterId\)/);
assert.match(selectSource, /player_michele_side_idle/);
assert.match(dungeonSource, /updateMicheleTurret[\s\S]*MICHELE_TURRET_SLOW_DURATION/);
assert.match(dungeonSource, /markMicheleAttacker[\s\S]*MICHELE_MARK_DURATION/);
assert.match(dungeonSource, /markedTargetDamageMultiplier/);
assert.match(dungeonSource, /private loadRoom\(\)[\s\S]*clearRoomScopedSkillEntities\(\)/);
assert.match(dungeonSource, /micheleTurretActive/);
assert.match(gameDataSource, /setStarterWeapons\(starterWeapon, char\.id\)/);
assert.match(rendererSource, /drawMicheleTurret/);
assert.match(rendererSource, /drawMicheleMark/);
assert.match(rendererSource, /hasExtendedPlayerAnimation \? 1 : 2/);
assert.match(rendererSource, /outlineColor: "#09101A"/);
assert.match(rendererSource, /ctx\.scale\(player\.weaponRenderScale, player\.weaponRenderScale\)/);
assert.match(spriteSource, /MICHELE_CHARACTER_SPRITES/);
assert.match(characterArtSource, /player_michele_side_idle/);
assert.match(characterArtSource, /const CHARACTER_WIDTH = 32/);
assert.match(characterArtSource, /const CHARACTER_HEIGHT = 32/);
assert.match(characterArtSource, /mechanical cat tail/);
assert.match(characterArtSource, /Distinct twin tails/);

console.log(JSON.stringify({
  character: "michele",
  exclusiveWeapon: "inspector",
  pawtector: "8s-auto-slow-turret",
  pawtectorDurability: "six-hits-and-priority-taunt",
  catTrace: "2s-attacker-mark",
  markedInspectorMultiplier: 1.35,
  dedicatedCharacterSprite: "32x32-six-frame-native-scale-outline",
  singleWeaponStart: "inspector-only",
  roomScopedPawtector: "ok",
  saveAndMetaMigration: "ok",
}));
