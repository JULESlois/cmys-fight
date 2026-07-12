import assert from "node:assert/strict";
import fs from "node:fs";
import { ENEMIES, getBossPool, getEnemyPool, type EnemyTheme } from "../src/game/data/enemies";
import { WEAPONS, getAvailableWeapons } from "../src/game/data/weapons";
import { SPRITES } from "../src/game/data/sprites";
import { Player } from "../src/game/entities/Player";
import { WeaponController } from "../src/game/combat/WeaponController";
import { EnvironmentSystem } from "../src/game/environment/EnvironmentSystem";
import { generateStage } from "../src/game/FloorGenerator";
import { createRunProgressFromGlobalStage } from "../src/game/RunProgress";
import { getMapData, getRoomTemplate, isSolid, MAP_HEIGHT, MAP_WIDTH } from "../src/game/MapData";
import { EncounterFactory } from "../src/game/EncounterFactory";

const themes: EnemyTheme[] = ["forest", "dungeon", "snow", "lava"];
assert.equal(Object.keys(ENEMIES).length, 28);
for (const theme of themes) {
  assert.equal(getEnemyPool(theme, undefined, 1).length, 3, `${theme} stage 1 pool`);
  assert.equal(getEnemyPool(theme, undefined, 2).length, 4, `${theme} stage 2 pool`);
  assert.equal(getEnemyPool(theme, undefined, 3).length, 5, `${theme} stage 3 pool`);
  assert.ok(getEnemyPool(theme, "melee", 3).length >= 1);
  assert.ok(getEnemyPool(theme, "ranged", 3).length >= 2);
  assert.equal(getBossPool(theme).length, 2, `${theme} boss pool`);
}
assert.equal(new Set(themes.flatMap(theme => getBossPool(theme).map(boss => boss.bossPattern))).size, 8);
for (const id of ["dingdong_fowl", "bark_hound", "white_sampler", "code_horse"]) assert.ok(ENEMIES[id]);

assert.equal(Object.keys(WEAPONS).length, 47);
assert.equal(WEAPONS.code_scanner.pierce, 2);
assert.equal(WEAPONS.vat_horse_cannon.wallBounces, 1);
assert.equal(WEAPONS.vat_horse_cannon.statusEffect, "burn");
assert.equal(WEAPONS.mask_sprayer.statusEffect, "slow");
assert.equal(WEAPONS.swab_lance.projectileRadius, 4);
assert.ok(WEAPONS.bell_repeater.fireRate >= 6);
assert.equal(WEAPONS.vector_9.manaCost, 0);
assert.ok(WEAPONS.vector_9.fireRate >= 10);
assert.equal(WEAPONS.vector_9.damage, 1);
assert.equal(WEAPONS.vector_9.projectileStyle, "tracer");
assert.equal(WEAPONS.liberator.manaCost, 0);
assert.ok(WEAPONS.liberator.damage >= 13);
assert.ok(WEAPONS.liberator.fireRate < 1);
assert.equal(WEAPONS.tesla_carbine.projectileStyle, "lightning");
assert.equal(WEAPONS.tesla_carbine.chainCount, 2);
assert.equal(WEAPONS.micro_rocket.projectileStyle, "rocket");
assert.equal(WEAPONS.micro_rocket.explosionRadius, 30);
assert.ok((WEAPONS.plasma_caster.homingStrength ?? 0) > 0);
assert.equal(WEAPONS.ripper_disc.wallBounces, 3);
assert.equal(getAvailableWeapons(1).length, Object.keys(WEAPONS).length);
assert.equal(getAvailableWeapons(1).some(weapon => weapon.id === "vector_9"), true);
assert.equal(getAvailableWeapons(1).some(weapon => weapon.id === "micro_rocket"), true);
assert.equal(getAvailableWeapons(1).filter(weapon => weapon.rarity === "legendary").length, 13);
assert.equal(getAvailableWeapons(1).filter(weapon => weapon.rarity === "myth").length, 2);
assert.deepEqual(
  getAvailableWeapons(1).map(weapon => weapon.id),
  getAvailableWeapons(20).map(weapon => weapon.id),
  "weapon availability must not depend on chapter or stage",
);
for (const weapon of Object.values(WEAPONS)) {
  assert.ok(weapon.mechanic.length >= 12, `${weapon.id} mechanic copy`);
  assert.ok(SPRITES[`weapon_${weapon.id}`], `${weapon.id} dedicated sprite`);
}

const player = new Player(160, 120);
player.mana = 100;
player.setWeaponLoadout(["code_scanner"], 0);
let fired = WeaponController.fire(player, 0, () => 0.99);
assert.equal(fired.fired, true);
assert.equal(fired.projectiles[0].pierceRemaining, 2);
player.fireCooldown = 0;
player.setWeaponLoadout(["vat_horse_cannon"], 0);
fired = WeaponController.fire(player, 0, () => 0.99);
assert.equal(fired.projectiles.length, 3);
assert.equal(fired.projectiles[0].wallBouncesRemaining, 1);
assert.equal(fired.projectiles[0].statusEffect, "burn");

player.fireCooldown = 0;
player.mana = 0;
player.setWeaponLoadout(["vector_9"], 0);
fired = WeaponController.fire(player, 0, () => 0.99);
assert.equal(fired.fired, true);
assert.equal(player.mana, 0);
assert.equal(fired.projectiles[0].style, "tracer");
assert.equal(fired.projectiles[0].trailLength, 17);

player.fireCooldown = 0;
player.mana = 100;
player.setWeaponLoadout(["tesla_carbine"], 0);
fired = WeaponController.fire(player, 0, () => 0.99);
assert.equal(fired.projectiles[0].style, "lightning");
assert.equal(fired.projectiles[0].chainCount, 2);
assert.equal(fired.projectiles[0].chainRange, 58);

player.fireCooldown = 0;
player.setWeaponLoadout(["micro_rocket"], 0);
fired = WeaponController.fire(player, 0, () => 0.99);
assert.equal(fired.projectiles[0].style, "rocket");
assert.equal(fired.projectiles[0].explosionRadius, 30);
assert.ok(fired.projectiles[0].acceleration > 0);

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const originalLog = console.log;
console.log = () => {};
let hazardsChecked = 0;
let obstacleVariants = new Set<string>();
const specialRooms = { npc: 0, legacy_rpg: 0, legacy_tactics: 0 };
const encountered = new Map<EnemyTheme, Set<string>>(themes.map(theme => [theme, new Set()]));
const bossesEncountered = new Map<EnemyTheme, Set<string>>(themes.map(theme => [theme, new Set()]));
for (let globalStage = 1; globalStage <= 20; globalStage++) {
  const stage = generateStage(createRunProgressFromGlobalStage(globalStage), seeded(globalStage * 97));
  for (const room of stage.rooms) {
    if (room.type === "npc" || room.type === "legacy_rpg" || room.type === "legacy_tactics") specialRooms[room.type]++;
    const first = getMapData(room, stage.theme);
    const second = getMapData(room, stage.theme);
    assert.deepEqual(first, second, `map determinism ${room.id}`);
    if (room.type === "combat" || room.type === "boss") {
      obstacleVariants.add(`${stage.theme}:${room.templateId}:${first.join("")}`);
      const hazards = EnvironmentSystem.generate(stage, room, first);
      const ids = new Set<string>();
      for (const hazard of hazards) {
        hazardsChecked++;
        assert.equal(hazard.x, hazard.tileX * 16 + 8);
        assert.equal(hazard.y, hazard.tileY * 16 + 8);
        assert.equal(hazard.radius, 7);
        assert.equal(isSolid(first[hazard.tileY * MAP_WIDTH + hazard.tileX]), false);
        assert.equal(ids.has(`${hazard.tileX},${hazard.tileY}`), false);
        ids.add(`${hazard.tileX},${hazard.tileY}`);
      }
    }
  }
}

for (const theme of themes) {
  const chapterIndex = themes.indexOf(theme) + 1;
  for (let sample = 1; sample <= 120; sample++) {
    const stage = generateStage(createRunProgressFromGlobalStage((chapterIndex - 1) * 5 + 3), seeded(sample * 37 + chapterIndex));
    const room = stage.rooms.find(candidate => candidate.type === "combat");
    if (!room) continue;
    room.encounterSeed = sample * 7919;
    const encounter = EncounterFactory.create({ stage, room, template: getRoomTemplate(room) });
    for (const wave of encounter.waves) for (const spawn of wave.spawns) if (spawn.enemyId) encountered.get(theme)!.add(spawn.enemyId);
  }
  assert.equal(encountered.get(theme)!.size, 5, `${theme} encounter coverage`);

  const bossStageIndex = chapterIndex * 5;
  for (let sample = 1; sample <= 80; sample++) {
    const stage = generateStage(createRunProgressFromGlobalStage(bossStageIndex), seeded(sample * 101 + chapterIndex));
    const room = stage.rooms.find(candidate => candidate.type === "boss")!;
    room.encounterSeed = sample * 104729 + chapterIndex;
    const first = EncounterFactory.create({ stage, room, template: getRoomTemplate(room) });
    const second = EncounterFactory.create({ stage, room, template: getRoomTemplate(room) });
    const firstBoss = first.waves[0].spawns[0].enemyId!;
    const secondBoss = second.waves[0].spawns[0].enemyId!;
    assert.equal(firstBoss, secondBoss, `${theme} boss selection determinism`);
    bossesEncountered.get(theme)!.add(firstBoss);
  }
  assert.equal(bossesEncountered.get(theme)!.size, 2, `${theme} alternate boss coverage`);
}
assert.ok(hazardsChecked > 100);
assert.ok(obstacleVariants.size > 40);
// The fixed 20-stage sample is small; verify all special room branches over a broader seed set.
for (let sample = 1; sample <= 300; sample++) {
  const stage = generateStage(createRunProgressFromGlobalStage(3), seeded(sample * 13007));
  for (const room of stage.rooms) {
    if (room.type === "npc" || room.type === "legacy_rpg" || room.type === "legacy_tactics") specialRooms[room.type]++;
  }
}
assert.ok(specialRooms.npc > 25);
assert.ok(specialRooms.legacy_rpg > 25);
assert.ok(specialRooms.legacy_tactics > 25);
console.log = originalLog;

for (const file of [
  "src/game/environment/EnvironmentSystem.ts",
  "src/game/render/PortalRenderer.ts",
  "src/game/render/EntityRenderer.ts",
]) {
  const source = fs.readFileSync(file, "utf8");
  assert.doesNotMatch(source, /\.arc\(/, `${file} should use pixel geometry`);
}
const dungeonSource = fs.readFileSync("src/game/states/DungeonState.ts", "utf8");
assert.doesNotMatch(dungeonSource, /ctx\.arc\(t\.x/);
assert.match(dungeonSource, /treasure-weapon/);

console.log(JSON.stringify({
  enemies: Object.keys(ENEMIES).length,
  regularEnemies: themes.reduce((sum, theme) => sum + getEnemyPool(theme, undefined, 5).length, 0),
  bosses: themes.reduce((sum, theme) => sum + getBossPool(theme).length, 0),
  weapons: Object.keys(WEAPONS).length,
  hazardsChecked,
  obstacleVariants: obstacleVariants.size,
  specialRooms,
  encounterCoverage: Object.fromEntries([...encountered].map(([theme, ids]) => [theme, ids.size])),
  bossCoverage: Object.fromEntries([...bossesEncountered].map(([theme, ids]) => [theme, ids.size])),
  pixelTelegraphs: "ok",
}));
