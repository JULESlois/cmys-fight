import assert from "node:assert/strict";
import fs from "node:fs";
import { CHARACTERS } from "../src/game/data/characters";
import {
  WEAPONS,
  createStarterWeaponSlots,
  getAvailableWeapons,
  isWeaponAvailableForCharacter,
} from "../src/game/data/weapons";
import { CELESTIA_PLAYER_PALETTE, SPRITES } from "../src/game/data/sprites";
import { WEAPON_ART_ANCHORS, WEAPON_PALETTES, WEAPON_SPRITES } from "../src/game/data/weaponArt";
import { Player } from "../src/game/entities/Player";
import { SkillController } from "../src/game/combat/SkillController";
import { DamageSystem } from "../src/game/combat/DamageSystem";
import { BuffSystem } from "../src/game/combat/BuffSystem";
import { createDefaultMetaProgress, normalizeMetaProgress } from "../src/game/MetaProgress";

const celestia = CHARACTERS.celestia;
assert.ok(celestia);
assert.equal(celestia.name, "Celestia");
assert.equal(celestia.familyId, "celestia");
assert.equal(celestia.starterWeapon, "polaris");
assert.equal(celestia.maxHp, 5);
assert.equal(celestia.maxArmor, 8);
assert.equal(celestia.maxMana, 52);
assert.equal(SkillController.getConfig("celestia").id, "guardian_star");
assert.equal(SkillController.getConfig("celestia").cooldown, 12);

const polaris = WEAPONS.polaris;
assert.ok(polaris);
assert.equal(polaris.name, "Polaris");
assert.equal(polaris.category, "rifle");
assert.equal(polaris.exclusiveCharacterId, "celestia");
assert.equal(polaris.fireRate, 6.4);
assert.equal(polaris.spread, 0.032);
assert.equal(isWeaponAvailableForCharacter(polaris, "celestia"), true);
assert.equal(isWeaponAvailableForCharacter(polaris, "michele"), false);
assert.deepEqual(createStarterWeaponSlots("polaris", "celestia"), ["polaris"]);
assert.ok(getAvailableWeapons(1, "celestia").some(weapon => weapon.id === "polaris"));
assert.ok(!getAvailableWeapons(1, "kanami").some(weapon => weapon.id === "polaris"));

assert.ok(WEAPON_SPRITES.polaris);
assert.equal(WEAPON_SPRITES.polaris.length, 16);
assert.ok(WEAPON_SPRITES.polaris.every(row => row.length === 32));
assert.ok(new Set(WEAPON_SPRITES.polaris.join("").replaceAll(".", "")).size >= 7);
assert.equal(WEAPON_PALETTES.polaris["5"], "#E9F2FA");
assert.deepEqual(WEAPON_ART_ANCHORS.polaris, { grip: [13, 12], muzzle: [31, 7] });

const player = new Player(100, 100);
player.characterId = "celestia";
player.maxArmor = celestia.maxArmor;
player.armor = celestia.maxArmor;
player.maxMana = celestia.maxMana;
player.mana = 0;
player.currentWeaponId = "polaris";
BuffSystem.applyRuntimeStats(player);
assert.equal(player.armorRechargeDelay, 2);
assert.equal(player.armorRechargeRate, 5.5);
assert.equal(player.weaponHandOffsetY, -5);
assert.equal(player.weaponRenderScale, 0.8);
const muzzle = player.getPlayerMuzzlePosition(0);
assert.ok(Math.abs(muzzle.x - 114.4) < 1e-9);
assert.ok(Math.abs(muzzle.y - 91) < 1e-9);

const activation = SkillController.activate(player, [], { x: 0, y: 0 }, 0);
assert.equal(activation.activated, true);
assert.equal(player.celestiaTemporaryArmor, SkillController.CELESTIA_TEMPORARY_ARMOR);
assert.equal(player.celestiaTemporaryArmorTimer, SkillController.CELESTIA_TEMPORARY_ARMOR_DURATION);
assert.equal(player.skillCooldown, 12);
assert.equal(player.skillActiveTimer, 1.2);

const armorBefore = player.armor;
const hpBefore = player.hp;
const firstHit = DamageSystem.damagePlayer(player, 3, 0);
assert.equal(firstHit.armorDamage, 3);
assert.equal(firstHit.hpDamage, 0);
assert.equal(player.celestiaTemporaryArmor, 1);
assert.equal(player.armor, armorBefore);
assert.equal(player.hp, hpBefore);
player.invulnerabilityTimer = 0;
const secondHit = DamageSystem.damagePlayer(player, 3, 0);
assert.equal(secondHit.armorDamage, 3);
assert.equal(player.celestiaTemporaryArmor, 0);
assert.equal(player.armor, armorBefore - 2);
SkillController.update(player, 10);
assert.equal(player.celestiaTemporaryArmor, 0);
assert.equal(player.celestiaTemporaryArmorTimer, 0);

const frameNames = [
  "player_celestia_side_idle",
  "player_celestia_side_idle_1",
  "player_celestia_side_walk_0",
  "player_celestia_side_walk_1",
  "player_celestia_side_walk_2",
  "player_celestia_side_walk_3",
];
for (const frameName of frameNames) {
  const frame = SPRITES[frameName];
  assert.ok(frame, `${frameName} exists`);
  assert.equal(frame.length, 32, `${frameName} source height`);
  assert.ok(frame.every(row => row.length === 32), `${frameName} source width`);
  const used = frame.join("").replaceAll(".", "");
  assert.ok(new Set(used).size >= 14, `${frameName} keeps costume color separation`);
  assert.ok(used.length >= 280 && used.length <= 430, `${frameName} silhouette density ${used.length}`);
  const baseline = frame.map(row => /[^.]/.test(row)).lastIndexOf(true);
  assert.ok(baseline >= 28 && baseline <= 29, `${frameName} baseline ${baseline}`);
  assert.equal(frame[30], ".".repeat(32));
  assert.equal(frame[31], ".".repeat(32));
}
assert.notDeepEqual(SPRITES.player_celestia_side_idle, SPRITES.player_celestia_side_idle_1);
assert.notDeepEqual(SPRITES.player_celestia_side_walk_0, SPRITES.player_celestia_side_walk_2);
const strideDifference = SPRITES.player_celestia_side_walk_0
  .slice(21, 30)
  .reduce((difference, row, rowIndex) => (
    difference + [...row].filter((pixel, column) => (
      pixel !== SPRITES.player_celestia_side_walk_2[rowIndex + 21][column]
    )).length
  ), 0);
assert.ok(strideDifference >= 70, `Celestia contact poses show an opposing stride: ${strideDifference}`);
assert.deepEqual(
  SPRITES.player_celestia_side_idle.slice(27),
  SPRITES.player_celestia_side_idle_1.slice(27),
  "Celestia idle keeps the boots planted",
);
assert.equal(CELESTIA_PLAYER_PALETTE.C, "#E8F0FA");
assert.equal(CELESTIA_PLAYER_PALETTE.H, "#B5D9F3");
assert.equal(CELESTIA_PLAYER_PALETTE.J, "#1E1B48");
assert.equal(CELESTIA_PLAYER_PALETTE.M, "#F0D36B");

const meta = createDefaultMetaProgress();
assert.ok(meta.unlockedCharacters.includes("celestia"));
assert.ok(meta.unlockedStarterWeapons.includes("polaris"));
const migrated = normalizeMetaProgress({ unlockedCharacters: ["knight"], unlockedStarterWeapons: ["pistol"] });
assert.ok(migrated.unlockedCharacters.includes("celestia"));
assert.ok(migrated.unlockedStarterWeapons.includes("polaris"));

const selectSource = fs.readFileSync("src/game/states/CharacterSelectState.ts", "utf8");
const rendererSource = fs.readFileSync("src/game/render/EntityRenderer.ts", "utf8");
const dungeonSource = fs.readFileSync("src/game/states/DungeonState.ts", "utf8");
assert.match(selectSource, /"cmys", "michele", "kanami", "celestia"/);
assert.match(selectSource, /player_celestia_side_idle/);
assert.match(rendererSource, /player_celestia_side/);
assert.match(rendererSource, /CELESTIA_PLAYER_PALETTE/);
assert.match(rendererSource, /celestiaTemporaryArmor/);
assert.match(rendererSource, /ctx\.scale\(player\.weaponRenderScale, player\.weaponRenderScale\)/);
assert.match(dungeonSource, /player\.characterId === "celestia"/);

console.log(JSON.stringify({
  character: "celestia",
  role: "support",
  exclusiveWeapon: "polaris",
  guardianStar: "4-temporary-armor-for-10s",
  passive: "accelerated-armor-recovery",
  characterSprite: "32x32-six-frame-native-scale-outline",
  weaponSprite: "32x16-white-navy-cyan-assault-rifle",
  saveAndMetaMigration: "ok",
}));
