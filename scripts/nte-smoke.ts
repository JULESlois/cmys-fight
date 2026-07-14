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
assert.equal(SkillController.getConfig("esper_zero").name, "ENGRAVING APPRAISAL");
assert.equal(SkillController.getConfig("esper_zero").duration, 5);
assert.equal(SkillController.getConfig("nanally").id, "colucci_authority");
assert.equal(SkillController.getConfig("nanally").name, "COLLINS HOWL ART");
assert.equal(SkillController.getConfig("nanally").duration, 12);

assert.equal(WEAPONS.zeroth_sense.exclusiveCharacterId, "esper_zero");
assert.equal(WEAPONS.colucci_claws.exclusiveCharacterId, "nanally");
assert.equal(WEAPONS.zeroth_sense.attackMode, "melee");
assert.equal(WEAPONS.colucci_claws.attackMode, "melee");
assert.equal(WEAPONS.zeroth_sense.name, "Appraiser's Edge");
assert.equal(WEAPONS.colucci_claws.name, "Collins Heavy Fists");
assert.equal(WEAPONS.colucci_claws.category, "special");
assert.equal(WEAPONS.colucci_claws.dualWield, true);
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
assert.equal(authorityClaws.projectiles.length, 6, "Collins Howl Art adds one complete Anima follow-up volley");
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

const zeroIdle = SPRITES.player_esper_zero_side_idle;
assert.equal(zeroIdle[0][16], "Q", "female Esper Zero keeps the official silver ahoge");
assert.ok(zeroIdle[3].slice(12, 21).includes("P"), "female Esper Zero keeps the curved black headband");
assert.notEqual(zeroIdle[3][16], "P", "Esper Zero's fringe breaks the headband so it cannot flatten into a hat brim");
assert.equal(zeroIdle[7][20], "S", "Esper Zero keeps a bright near-cheek plane for chibi head volume");
assert.equal(zeroIdle[7][14], "A", "female Esper Zero exposes the far eye");
assert.equal(zeroIdle[8][18], "J", "female Esper Zero exposes the near violet iris");
assert.ok(zeroIdle.slice(13, 17).some(row => row.slice(12, 21).includes("I")), "female Esper Zero keeps the fitted white blouse");
assert.ok(zeroIdle.slice(13, 17).some(row => row.includes("R") && row.includes("Q")), "Esper Zero blouse uses separate shadow and highlight planes");
assert.ok(zeroIdle.slice(12, 17).filter(row => row.includes("J")).length >= 4, "female Esper Zero keeps the asymmetric lavender tie");
assert.ok(zeroIdle.slice(13, 17).some(row => row.includes("B") && row.includes("C")), "female Esper Zero keeps the cropped tactical jacket");
assert.ok(zeroIdle.slice(19, 22).some(row => row.includes("G") || row.includes("H")), "female Esper Zero keeps the dark pleated skirt");
assert.ok(zeroIdle.slice(27, 31).some(row => row.includes("R") && row.includes("N")), "Esper Zero boots retain distinct lit and shadowed planes");
assert.equal(zeroIdle.flatMap(row => [...row.slice(0, 5)]).every(pixel => pixel === "."), true, "Esper Zero sprite does not bake in a duplicate sword");

const nanallyIdle = SPRITES.player_nanally_side_idle;
assert.equal(nanallyIdle[2][10], "A", "Nanally keeps the left black cat-ear accessory");
assert.equal(nanallyIdle[2][21], "A", "Nanally keeps the right black cat-ear accessory");
assert.equal(nanallyIdle[8][14], "P", "Nanally keeps the left blue-tinted round lens");
assert.equal(nanallyIdle[9][20], "Q", "Nanally keeps the right amber iris inside the glasses");
assert.equal(nanallyIdle[8][21], "H", "Nanally keeps a brighter near-cheek plane behind the glasses");
assert.ok(nanallyIdle.slice(13, 17).some(row => row.slice(11, 22).includes("I")), "Nanally keeps the white shirt");
assert.ok(nanallyIdle.slice(13, 16).some(row => row.includes("O") && row.includes("S")), "Nanally shirt uses warm reflected shadow and a white highlight");
assert.ok(nanallyIdle.slice(13, 17).some(row => row.includes("L")), "Nanally keeps the black paw tie");
assert.ok(nanallyIdle[17].slice(12, 22).includes("A") && nanallyIdle[17].slice(12, 22).includes("B"), "Nanally keeps a dark waist break between coat and skirt");
assert.ok(nanallyIdle.slice(17, 22).some(row => row.includes("D")), "Nanally keeps the bright pink skirt panels");
assert.ok(nanallyIdle.slice(17, 22).some(row => row.includes("C")), "Nanally keeps the darker pleated skirt folds");
assert.ok(nanallyIdle.slice(18, 23).some(row => row.slice(4, 8).includes("C") || row.slice(4, 8).includes("D")), "Nanally keeps the cat tail");
assert.ok(nanallyIdle.slice(18, 23).some(row => row.slice(21, 26).includes("O")), "Nanally keeps the dangling cat plush");
assert.ok(nanallyIdle.slice(27, 31).some(row => row.includes("R") && row.includes("J")), "Nanally boots retain foreground highlights and rear-leg shadow");

for (const id of ["zeroth_sense", "colucci_claws"]) {
  assert.ok(WEAPON_SPRITES[id]);
  assert.ok(WEAPON_PALETTES[id]);
  assert.ok(WEAPON_ART_ANCHORS[id]);
}
const zeroBladeMaxThickness = Math.max(
  ...Array.from({ length: 20 }, (_, index) =>
    WEAPON_SPRITES.zeroth_sense.filter(row => row[12 + index] !== ".").length,
  ),
);
assert.ok(zeroBladeMaxThickness <= 8, "Appraiser's Edge remains a slim sword rather than a cleaver");
assert.ok(
  [15, 18, 21, 24].every(x =>
    WEAPON_SPRITES.colucci_claws.slice(3, 8).some(row => row[x] === "5"),
  ),
  "Collins Heavy Fists expose four plated knuckles",
);

assert.equal(META_SAVE_VERSION, 7);
const defaultMeta = createDefaultMetaProgress();
for (const id of ["esper_zero", "nanally"]) assert.ok(defaultMeta.unlockedCharacters.includes(id));
for (const id of ["zeroth_sense", "colucci_claws"]) assert.ok(defaultMeta.unlockedStarterWeapons.includes(id));
const migratedMeta = normalizeMetaProgress({ version: 6, unlockedCharacters: ["knight"], unlockedStarterWeapons: ["pistol"] });
for (const id of ["esper_zero", "nanally"]) assert.ok(migratedMeta.unlockedCharacters.includes(id));
for (const id of ["zeroth_sense", "colucci_claws"]) assert.ok(migratedMeta.unlockedStarterWeapons.includes(id));

assert.equal(getCharacterText("esper_zero", CHARACTERS.esper_zero, "zh-CN").title, "伊波恩鉴定师");
assert.equal(getCharacterText("nanally", CHARACTERS.nanally, "zh-CN").title, "伊波恩灵相重拳手");
assert.match(getWeaponMechanic("zeroth_sense", WEAPONS.zeroth_sense.mechanic, "zh-CN"), /刻印鉴定/);
assert.match(getWeaponMechanic("colucci_claws", WEAPONS.colucci_claws.mechanic, "zh-CN"), /灵相追击/);

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
  esperZero: "female-five-second-engraving-appraisal",
  nanally: "twelve-second-anima-follow-up",
  detailedSprites: "32x32-six-frame-reference-driven-silhouettes",
  officialArtFeatures: "zero-silver-bob-appraiser-nanally-pink-cat-streetwear",
  metaMigration: "v6-v7-auto-unlock",
}));
