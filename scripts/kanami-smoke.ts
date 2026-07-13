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
import { KANAMI_PLAYER_PALETTE, SPRITES } from "../src/game/data/sprites";
import { Player } from "../src/game/entities/Player";
import { Enemy } from "../src/game/entities/Enemy";
import { WeaponController } from "../src/game/combat/WeaponController";
import { SkillController } from "../src/game/combat/SkillController";
import { DungeonState } from "../src/game/states/DungeonState";
import { GameData } from "../src/game/GameData";
import { META_SAVE_VERSION, createDefaultMetaProgress, normalizeMetaProgress } from "../src/game/MetaProgress";
import { releaseProjectile } from "../src/game/EntityPools";

assert.equal(CHARACTERS.kanami.starterWeapon, "finale");
assert.equal(CHARACTERS.kanami.familyId, "kanami");
assert.equal(CHARACTERS.kanami.maxHp, 5);
assert.equal(CHARACTERS.kanami.maxArmor, 4);
assert.equal(CHARACTERS.kanami.maxMana, 48);
assert.equal(SkillController.getConfig("kanami").id, "beacon_lure");
assert.equal(SkillController.getConfig("kanami").duration, 7);
assert.equal(SkillController.getConfig("kanami").cooldown, 13);

assert.equal(WEAPONS.finale.exclusiveCharacterId, "kanami");
assert.equal(WEAPONS.finale.explosionRadius, 22);
assert.equal(WEAPONS.finale.explosionDamageMultiplier, 0.35);
assert.equal(WEAPONS.finale.pierce ?? 0, 0);
assert.equal(isWeaponAvailableForCharacter(WEAPONS.finale, "kanami"), true);
assert.equal(isWeaponAvailableForCharacter(WEAPONS.finale, "michele"), false);
assert.equal(getAvailableWeapons(1, "kanami").some(weapon => weapon.id === "finale"), true);
assert.equal(getAvailableWeapons(1, "knight").some(weapon => weapon.id === "finale"), false);
const allExceptFinale = Object.keys(WEAPONS).filter(id => id !== "finale");
assert.equal(rollAvailableWeapon(1, () => 0.5, "shop", allExceptFinale, "kanami").id, "finale");
assert.deepEqual(createStarterWeaponSlots("finale", "kanami"), ["finale"]);

const knight = new Player(0, 0);
knight.characterId = "knight";
assert.equal(WeaponController.equipWeapon(knight, "finale").consumed, false);
knight.setWeaponLoadout(["finale"], 0);
assert.equal(WeaponController.fire(knight, 0).reason, "invalid_weapon");

const kanami = new Player(80, 90);
kanami.characterId = "kanami";
kanami.maxMana = 48;
kanami.mana = 48;
kanami.setWeaponLoadout(["finale"], 0);
const finaleVolley = WeaponController.fire(kanami, 0, () => 0.99);
assert.equal(finaleVolley.fired, true);
assert.equal(finaleVolley.projectiles[0].weaponId, "finale");
assert.equal(finaleVolley.projectiles[0].explosionRadius, 22);
assert.equal(finaleVolley.projectiles[0].pierceRemaining, 0);
assert.equal(kanami.mana, 43);

const activation = SkillController.activate(kanami, [], { x: 0, y: 0 }, 0);
assert.equal(activation.activated, true);
assert.equal(kanami.skillActiveTimer, 7);
assert.equal(kanami.skillCooldown, 13);
assert.equal(kanami.kanamiBeaconDeployed, false);
assert.equal(kanami.kanamiBeaconX, 80);
assert.equal(kanami.kanamiBeaconY, 86);
assert.equal(kanami.kanamiBeaconVx, SkillController.KANAMI_BEACON_SPEED);

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

const beaconDungeon = new DungeonState(fakeEngine) as any;
beaconDungeon.isCollidingWithMap = () => false;
beaconDungeon.player = kanami;
beaconDungeon.updateKanamiBeacon(0.2);
assert.equal(kanami.kanamiBeaconDeployed, false);
assert.ok(kanami.kanamiBeaconX > 80);
beaconDungeon.updateKanamiBeacon(0.3);
assert.equal(kanami.kanamiBeaconDeployed, true);
assert.equal(kanami.kanamiBeaconVx, 0);

const luredEnemy = new Enemy(kanami.kanamiBeaconX - 60, kanami.kanamiBeaconY, "melee");
luredEnemy.speed = 80;
luredEnemy.attackState = "windup";
luredEnemy.attackTimer = 1;
luredEnemy.attackCooldown = 0;
beaconDungeon.enemies = [luredEnemy];
beaconDungeon.player.x = 20;
beaconDungeon.player.y = 200;
const enemyXBefore = luredEnemy.x;
beaconDungeon.updateEnemies(0.1);
assert.ok(luredEnemy.x > enemyXBefore, "Beacon Lure must pull normal enemies toward the beacon");
assert.equal(luredEnemy.attackState, "idle");
assert.ok(luredEnemy.attackCooldown >= 0.2);

const finaleShot = finaleVolley.projectiles[0];
finaleShot.x = 40;
finaleShot.y = 40;
finaleShot.previousX = 40;
finaleShot.previousY = 40;
finaleShot.vx = 100;
finaleShot.vy = 0;
const directTarget = new Enemy(50, 40, "melee");
const resonantTarget = new Enemy(58, 40, "melee");
directTarget.hp = directTarget.maxHp = 50;
resonantTarget.hp = resonantTarget.maxHp = 50;
beaconDungeon.projectiles = [finaleShot];
beaconDungeon.enemies = [directTarget, resonantTarget];
beaconDungeon.updateProjectiles(0.1);
assert.ok(directTarget.hp < 50);
assert.ok(resonantTarget.hp < 50, "Finale impact must release a resonant area burst");
for (const projectile of beaconDungeon.projectiles) releaseProjectile(projectile);
beaconDungeon.projectiles = [];

kanami.skillActiveTimer = 5;
kanami.kanamiBeaconDeployed = true;
kanami.kanamiBeaconFlightTimer = 0.2;
beaconDungeon.clearRoomScopedSkillEntities();
assert.equal(kanami.skillActiveTimer, 0);
assert.equal(kanami.kanamiBeaconDeployed, false);
assert.equal(kanami.kanamiBeaconFlightTimer, 0);

const persistence = new GameData();
(persistence as any).discoverPlayerBuild = () => {};
persistence.data.player.characterId = "michele";
persistence.data.player.weaponSlots = ["inspector"];
persistence.data.player.currentWeaponId = "inspector";
const persistenceDungeon = new DungeonState({ data: persistence } as any) as any;
const activeMichele = new Player(100, 100);
activeMichele.characterId = "michele";
activeMichele.setWeaponLoadout(["inspector"], 0);
activeMichele.skillActiveTimer = 6;
activeMichele.micheleTurretActive = true;
activeMichele.micheleTurretX = 120;
activeMichele.micheleTurretY = 90;
activeMichele.micheleTurretFireCooldown = 0.2;
persistenceDungeon.player = activeMichele;
persistenceDungeon.syncPlayerState();
assert.equal(persistence.data.player.skillActiveTimer, 0);
assert.equal(persistence.data.player.micheleTurretX, 0);
assert.equal(persistence.data.player.micheleTurretY, 0);
assert.equal(persistence.data.player.micheleTurretFireCooldown, 0);
const restoredMichele = persistenceDungeon.createPlayerFromSave();
assert.equal(restoredMichele.skillActiveTimer, 0);
assert.equal(restoredMichele.micheleTurretActive, false);

assert.equal(META_SAVE_VERSION, 5);
const meta = createDefaultMetaProgress();
assert.ok(meta.unlockedCharacters.includes("kanami"));
assert.ok(meta.unlockedStarterWeapons.includes("finale"));
const migratedMeta = normalizeMetaProgress({ unlockedCharacters: ["knight"], unlockedStarterWeapons: ["pistol"] });
assert.ok(migratedMeta.unlockedCharacters.includes("kanami"));
assert.ok(migratedMeta.unlockedStarterWeapons.includes("finale"));

assert.ok(SPRITES.player_kanami_side_idle);
assert.ok(SPRITES.player_kanami_side_walk_0);
assert.ok(SPRITES.player_kanami_side_walk_1);
assert.ok(SPRITES.player_kanami_side_idle_1);
assert.ok(SPRITES.player_kanami_side_walk_2);
assert.ok(SPRITES.player_kanami_side_walk_3);
for (const frameName of [
  "player_kanami_side_idle",
  "player_kanami_side_idle_1",
  "player_kanami_side_walk_0",
  "player_kanami_side_walk_1",
  "player_kanami_side_walk_2",
  "player_kanami_side_walk_3",
]) {
  const frame = SPRITES[frameName];
  assert.equal(frame.length, 16, `${frameName} CMYS-scale height`);
  assert.ok(frame.every(row => row.length === 16), `${frameName} CMYS-scale width`);
  assert.ok(new Set(frame.join("").replaceAll(".", "")).size >= 9, `${frameName} readable palette detail`);
  const pixelCount = frame.join("").replaceAll(".", "").length;
  assert.ok(pixelCount >= 80 && pixelCount <= 145, `${frameName} compact silhouette density ${pixelCount}`);
  assert.match(frame[14], /[^.]/, `${frameName} uses the shared foot baseline`);
  assert.equal(frame[15], "................", `${frameName} keeps the shared bottom padding`);
}
assert.notDeepEqual(SPRITES.player_kanami_side_idle, SPRITES.player_kanami_side_idle_1);
assert.notDeepEqual(SPRITES.player_kanami_side_walk_0, SPRITES.player_kanami_side_walk_2);
assert.deepEqual(
  SPRITES.player_kanami_side_idle.slice(12),
  SPRITES.player_kanami_side_idle_1.slice(12),
  "Kanami idle animation keeps both feet planted",
);
assert.equal(KANAMI_PLAYER_PALETTE.B, "#756A98");
assert.equal(KANAMI_PLAYER_PALETTE.H, "#E466A5");
assert.notEqual(KANAMI_PLAYER_PALETTE.A, "#000000");
const kanamiArtPlayer = new Player(100, 100);
kanamiArtPlayer.characterId = "kanami";
assert.equal(kanamiArtPlayer.weaponHandOffsetY, -2);

const selectSource = fs.readFileSync("src/game/states/CharacterSelectState.ts", "utf8");
const dungeonSource = fs.readFileSync("src/game/states/DungeonState.ts", "utf8");
const rendererSource = fs.readFileSync("src/game/render/EntityRenderer.ts", "utf8");
const gameDataSource = fs.readFileSync("src/game/GameData.ts", "utf8");
assert.match(selectSource, /IDENTITY_IDS: IdentityId\[\] = \["cmys", "michele", "kanami"\]/);
assert.match(selectSource, /player_kanami_side_idle/);
assert.match(dungeonSource, /updateKanamiBeacon/);
assert.match(dungeonSource, /getKanamiBeaconTarget/);
assert.match(dungeonSource, /clearRoomScopedSkillEntities/);
assert.match(rendererSource, /drawKanamiBeacon/);
assert.match(rendererSource, /drawPixelSprite\(ctx, spriteName, 0, -8, 2/);
assert.match(rendererSource, /outlineColor: "#09101A"/);
assert.match(rendererSource, /player\.animFrame % 4/);
assert.match(gameDataSource, /player\.characterId === "michele" \|\| player\.characterId === "kanami"/);

console.log(JSON.stringify({
  character: "kanami",
  exclusiveWeapon: "finale",
  finaleImpact: "22px-resonant-burst",
  beaconLure: "projectile-to-7s-room-lure",
  normalEnemyAttraction: "ok",
  dedicatedCharacterSprite: "16x16-six-frame-cmys-scale-outline",
  roomScopedSummonsNotSerialized: "ok",
  saveAndMetaMigration: "ok",
}));
