import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CHARACTER_COLLECTIONS,
  CHARACTERS,
  usesDetailedCharacterArt,
} from "../src/game/data/characters";
import {
  WEAPONS,
  createStarterWeaponSlots,
  getAvailableWeapons,
  isWeaponAvailableForCharacter,
} from "../src/game/data/weapons";
import {
  ESPER_ZERO_PLAYER_PALETTE,
  NANALLY_PLAYER_PALETTE,
  SPRITES,
} from "../src/game/data/sprites";
import {
  WEAPON_ART_ANCHORS,
  WEAPON_PALETTES,
  WEAPON_SPRITES,
} from "../src/game/data/weaponArt";
import { Player } from "../src/game/entities/Player";
import { SkillController } from "../src/game/combat/SkillController";
import { WeaponController } from "../src/game/combat/WeaponController";
import { releaseProjectile } from "../src/game/EntityPools";
import {
  META_SAVE_VERSION,
  createDefaultMetaProgress,
  normalizeMetaProgress,
} from "../src/game/MetaProgress";
import { getCharacterText, getWeaponMechanic } from "../src/game/i18n";

assert.deepEqual(CHARACTER_COLLECTIONS.strinova.characterIds, ["michele", "kanami", "celestia"]);
assert.deepEqual(CHARACTER_COLLECTIONS.nte.characterIds, ["esper_zero", "nanally"]);
assert.equal(CHARACTERS.michele.collectionId, "strinova");
assert.equal(CHARACTERS.kanami.collectionId, "strinova");
assert.equal(CHARACTERS.celestia.collectionId, "strinova");
assert.equal(CHARACTERS.esper_zero.collectionId, "nte");
assert.equal(CHARACTERS.nanally.collectionId, "nte");
assert.equal(CHARACTERS.esper_zero.starterWeapon, "zeroth_sense");
assert.equal(CHARACTERS.nanally.starterWeapon, "colucci_claws");
assert.equal(usesDetailedCharacterArt("esper_zero"), true);
assert.equal(usesDetailedCharacterArt("nanally"), true);

assert.equal(SkillController.getConfig("esper_zero").id, "appraise_engrave");
assert.equal(SkillController.getConfig("esper_zero").duration, 5);
assert.equal(SkillController.getConfig("nanally").id, "colucci_authority");
assert.equal(SkillController.getConfig("nanally").duration, 12);

assert.equal(WEAPONS.zeroth_sense.exclusiveCharacterId, "esper_zero");
assert.equal(WEAPONS.colucci_claws.exclusiveCharacterId, "nanally");
assert.equal(WEAPONS.zeroth_sense.attackMode, "melee");
assert.equal(WEAPONS.colucci_claws.attackMode, "melee");
assert.equal(isWeaponAvailableForCharacter(WEAPONS.zeroth_sense, "esper_zero"), true);
assert.equal(isWeaponAvailableForCharacter(WEAPONS.zeroth_sense, "nanally"), false);
assert.equal(isWeaponAvailableForCharacter(WEAPONS.colucci_claws, "nanally"), true);
assert.equal(isWeaponAvailableForCharacter(WEAPONS.colucci_claws, "michele"), false);
assert.deepEqual(createStarterWeaponSlots("zeroth_sense", "esper_zero"), ["zeroth_sense"]);
assert.deepEqual(createStarterWeaponSlots("colucci_claws", "nanally"), ["colucci_claws"]);
assert.equal(getAvailableWeapons(1, "esper_zero").some(weapon => weapon.id === "colucci_claws"), false);
assert.equal(getAvailableWeapons(1, "nanally").some(weapon => weapon.id === "zeroth_sense"), false);

const zero = new Player(100, 100);
zero.characterId = "esper_zero";
zero.maxMana = 50;
zero.mana = 50;
zero.setWeaponLoadout(["zeroth_sense"], 0);
const baseZero = WeaponController.fire(zero, 0, () => 0.99);
assert.equal(baseZero.projectiles.length, 2);
assert.ok(baseZero.projectiles.every(projectile => projectile.damage === 5));
assert.ok(baseZero.projectiles.every(projectile => projectile.pierceRemaining === 1));
for (const projectile of baseZero.projectiles) releaseProjectile(projectile);
zero.fireCooldown = 0;
const zeroSkill = SkillController.activate(zero, [], { x: 0, y: 0 }, 0);
assert.equal(zeroSkill.activated, true);
assert.equal(zero.skillActiveTimer, 5);
const engravedZero = WeaponController.fire(zero, 0, () => 0.99);
assert.ok(engravedZero.projectiles.every(projectile => projectile.damage === 7));
assert.ok(engravedZero.projectiles.every(projectile => projectile.pierceRemaining === 2));
for (const projectile of engravedZero.projectiles) releaseProjectile(projectile);

const nanally = new Player(100, 100);
nanally.characterId = "nanally";
nanally.maxMana = 44;
nanally.mana = 44;
nanally.setWeaponLoadout(["colucci_claws"], 0);
const baseClaws = WeaponController.fire(nanally, 0, () => 0.99);
assert.equal(baseClaws.projectiles.length, 3);
for (const projectile of baseClaws.projectiles) releaseProjectile(projectile);
nanally.fireCooldown = 0;
const authority = SkillController.activate(nanally, [], { x: 0, y: 0 }, 0);
assert.equal(authority.activated, true);
assert.equal(nanally.skillActiveTimer, 12);
const authorityClaws = WeaponController.fire(nanally, 0, () => 0.99);
assert.equal(authorityClaws.projectiles.length, 6, "Authority adds one full Underboss follow-up volley");
assert.deepEqual(authorityClaws.projectiles.map(projectile => projectile.damage), [2, 2, 2, 1, 1, 1]);
assert.ok(authorityClaws.projectiles.slice(3).every(projectile => projectile.color === "#FF8FAE"));
for (const projectile of authorityClaws.projectiles) releaseProjectile(projectile);

for (const [id, palette] of [
  ["esper_zero", ESPER_ZERO_PLAYER_PALETTE],
  ["nanally", NANALLY_PLAYER_PALETTE],
] as const) {
  const names = [
    `player_${id}_side_idle`,
    `player_${id}_side_idle_1`,
    `player_${id}_side_walk_0`,
    `player_${id}_side_walk_1`,
    `player_${id}_side_walk_2`,
    `player_${id}_side_walk_3`,
  ];
  const frames = names.map(name => SPRITES[name]);
  assert.ok(frames.every(frame => frame.length === 32 && frame.every(row => row.length === 32)), `${id} 32x32 frames`);
  assert.notDeepEqual(frames[0], frames[1], `${id} idle animation must move`);
  assert.notDeepEqual(frames[2], frames[4], `${id} walk animation must cross-step`);
  const used = new Set(frames.flat().join("").replaceAll(".", ""));
  assert.ok(used.size >= 12, `${id} needs a detailed palette`);
  for (const pixel of used) assert.ok(pixel in palette, `${id} palette pixel ${pixel}`);
}
assert.notDeepEqual(SPRITES.player_esper_zero_side_idle, SPRITES.player_nanally_side_idle);

for (const id of ["zeroth_sense", "colucci_claws"]) {
  assert.ok(WEAPON_SPRITES[id]);
  assert.ok(WEAPON_PALETTES[id]);
  assert.ok(WEAPON_ART_ANCHORS[id]);
}

assert.equal(META_SAVE_VERSION, 7);
const defaultMeta = createDefaultMetaProgress();
for (const id of ["esper_zero", "nanally"]) assert.ok(defaultMeta.unlockedCharacters.includes(id));
for (const id of ["zeroth_sense", "colucci_claws"]) assert.ok(defaultMeta.unlockedStarterWeapons.includes(id));
const migratedMeta = normalizeMetaProgress({ version: 6, unlockedCharacters: ["knight"], unlockedStarterWeapons: ["pistol"] });
for (const id of ["esper_zero", "nanally"]) assert.ok(migratedMeta.unlockedCharacters.includes(id));
for (const id of ["zeroth_sense", "colucci_claws"]) assert.ok(migratedMeta.unlockedStarterWeapons.includes(id));

assert.equal(getCharacterText("esper_zero", CHARACTERS.esper_zero, "zh-CN").title, "第零鉴定师");
assert.equal(getCharacterText("nanally", CHARACTERS.nanally, "zh-CN").title, "科鲁奇初代目");
assert.match(getWeaponMechanic("zeroth_sense", WEAPONS.zeroth_sense.mechanic, "zh-CN"), /鉴定刻印/);
assert.match(getWeaponMechanic("colucci_claws", WEAPONS.colucci_claws.mechanic, "zh-CN"), /协同追击/);

const selectSource = fs.readFileSync("src/game/states/CharacterSelectState.ts", "utf8");
const rendererSource = fs.readFileSync("src/game/render/EntityRenderer.ts", "utf8");
assert.match(selectSource, /SelectionMode = "collection" \| "character" \| "form"/);
assert.match(selectSource, /CHARACTER_COLLECTION_IDS/);
assert.match(selectSource, /selectedCollectionId === "cmys"/);
assert.match(selectSource, /player_esper_zero_side_idle/);
assert.match(selectSource, /player_nanally_side_idle/);
assert.match(rendererSource, /player_esper_zero_side/);
assert.match(rendererSource, /player_nanally_side/);
assert.match(rendererSource, /player\.characterId === "esper_zero"/);
assert.match(rendererSource, /player\.characterId === "nanally"/);

const zeroPlayerArt = new Player(0, 0);
zeroPlayerArt.characterId = "esper_zero";
assert.equal(zeroPlayerArt.weaponHandOffsetY, -5);
assert.equal(zeroPlayerArt.weaponRenderScale, 0.8);
const nanallyPlayerArt = new Player(0, 0);
nanallyPlayerArt.characterId = "nanally";
assert.equal(nanallyPlayerArt.weaponHandOffsetY, -5);
assert.equal(nanallyPlayerArt.weaponRenderScale, 0.8);

console.log(JSON.stringify({
  collections: {
    cmys: CHARACTER_COLLECTIONS.cmys.characterIds.length,
    strinova: CHARACTER_COLLECTIONS.strinova.characterIds.length,
    nte: CHARACTER_COLLECTIONS.nte.characterIds.length,
  },
  characters: ["esper_zero", "nanally"],
  exclusiveWeapons: ["zeroth_sense", "colucci_claws"],
  esperZero: "five-second-appraisal-empower",
  nanally: "twelve-second-underboss-follow-up",
  detailedSprites: "32x32-six-frame",
  metaMigration: "v6-v7-auto-unlock",
}));
