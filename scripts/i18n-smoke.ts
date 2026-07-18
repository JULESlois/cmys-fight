import assert from "node:assert/strict";
import fs from "node:fs";
import { ACHIEVEMENTS } from "../src/game/AchievementSystem";
import { CHALLENGES } from "../src/game/ChallengeSystem";
import { BUFFS } from "../src/game/combat/BuffSystem";
import { CHARACTERS } from "../src/game/data/characters";
import { WEAPONS } from "../src/game/data/weapons";
import {
  actionLabel,
  getAchievementText,
  getBuffText,
  getChallengeText,
  getCharacterText,
  getMetaUpgradeText,
  getWeaponMechanic,
  normalizeLanguage,
  rarityLabel,
  t,
  wrapLocalized,
} from "../src/game/i18n";
import { META_UPGRADES } from "../src/game/MetaUpgrades";
import { createDefaultSettings, normalizeSettings, SETTINGS_VERSION } from "../src/game/Settings";

assert.equal(SETTINGS_VERSION, 8);
assert.equal(createDefaultSettings().language, "en");
assert.equal(normalizeSettings({ version: 5 }).language, "en");
assert.equal(normalizeSettings({ version: 7, language: "zh-CN" }).language, "zh-CN");
assert.equal(normalizeSettings({ version: 7, language: "invalid" }).language, "en");
assert.equal(normalizeLanguage("zh-CN"), "zh-CN");
assert.equal(normalizeLanguage("zh"), "en");

assert.equal(t("zh-CN", "title.newRun"), "新游戏");
assert.equal(t("zh-CN", "settings.audioVisual"), "音画设置");
assert.equal(t("zh-CN", "settings.operation"), "操作设置");
assert.equal(t("zh-CN", "settings.accountData"), "账号与数据");
assert.equal(t("zh-CN", "result.footer", { confirm: "K" }), "[K] 返回基地");
assert.equal(t("zh-CN", "title.records"), "图鉴");
assert.equal(t("zh-CN", "title.stats", { shards: 3, stage: "1-2", wins: 1, best: "9:00" }), "碎片 3  关卡 1-2  胜场 1  最佳 9:00");
assert.equal(actionLabel("fire", "zh-CN"), "射击");
assert.equal(t("en", "title.newRun"), "NEW RUN");
assert.equal(rarityLabel("myth", "en"), "MYTH");
assert.equal(rarityLabel("myth", "zh-CN"), "神话");
assert.equal(getCharacterText("kanami", CHARACTERS.kanami, "zh-CN").title, "灵魂歌姬");
assert.match(getWeaponMechanic("finale", WEAPONS.finale.mechanic, "zh-CN"), /音波爆破/);

for (const buff of Object.values(BUFFS)) {
  const localized = getBuffText(buff.id, buff, "zh-CN");
  assert.notEqual(localized.name, buff.name, `missing Chinese buff name: ${buff.id}`);
  assert.notEqual(localized.description, buff.description, `missing Chinese buff description: ${buff.id}`);
  assert.equal(getBuffText(buff.id, buff, "en").name, buff.name);
}

for (const weapon of Object.values(WEAPONS)) {
  const localized = getWeaponMechanic(weapon.id, weapon.mechanic, "zh-CN");
  assert.notEqual(localized, weapon.mechanic, `missing Chinese weapon mechanic: ${weapon.id}`);
  assert.equal(getWeaponMechanic(weapon.id, weapon.mechanic, "en"), weapon.mechanic);
}

for (const achievement of Object.values(ACHIEVEMENTS)) {
  const localized = getAchievementText(achievement.id, achievement, "zh-CN");
  assert.notEqual(localized.description, achievement.description, `missing achievement: ${achievement.id}`);
}
for (const challenge of Object.values(CHALLENGES)) {
  const localized = getChallengeText(challenge.id, challenge, "zh-CN");
  assert.notEqual(localized.description, challenge.description, `missing challenge: ${challenge.id}`);
}
for (const upgrade of Object.values(META_UPGRADES)) {
  const localized = getMetaUpgradeText(upgrade.id, upgrade, "zh-CN");
  assert.notEqual(localized.description, upgrade.description, `missing meta upgrade: ${upgrade.id}`);
}
for (const character of Object.values(CHARACTERS)) {
  const localized = getCharacterText(character.id, character, "zh-CN");
  assert.notEqual(localized.passive, character.passive, `missing character passive: ${character.id}`);
}

const chineseLines = wrapLocalized("这是一个需要自动换行的中文说明文本。", 12);
assert.ok(chineseLines.length >= 2);
assert.equal(chineseLines.join(""), "这是一个需要自动换行的中文说明文本。");
assert.deepEqual(wrapLocalized("A short English description", 12), ["A short", "English", "description"]);

const settingsSource = fs.readFileSync("src/game/states/SettingsState.ts", "utf8");
const titleSource = fs.readFileSync("src/game/states/TitleState.ts", "utf8");
const buffSource = fs.readFileSync("src/game/render/BuffSelectionRenderer.ts", "utf8");
const shopSource = fs.readFileSync("src/game/render/ShopRenderer.ts", "utf8");
const pixelUiSource = fs.readFileSync("src/game/render/PixelUi.ts", "utf8");
const recordsSource = fs.readFileSync("src/game/states/RecordsState.ts", "utf8");
const pauseSource = fs.readFileSync("src/game/render/PauseOverlayRenderer.ts", "utf8");
const hudSource = fs.readFileSync("src/game/render/UIRenderer.ts", "utf8");
assert.match(settingsSource, /"language"/);
assert.match(settingsSource, /settings\.language/);
assert.match(titleSource, /title\.newRun|title\.\$\{option\}/);
assert.match(buffSource, /getBuffText/);
assert.match(shopSource, /getWeaponMechanic/);
assert.match(shopSource, /myth: UI_COLORS\.purple/);
assert.match(pixelUiSource, /purple: "#[0-9A-Fa-f]{6}"/);
assert.match(hudSource, /rarity === "myth"[\s\S]*#D66BFF/);
assert.match(recordsSource, /getAchievementText/);
assert.match(pauseSource, /projectileLabel/);

console.log(JSON.stringify({
  settingsMigration: "v6-v8",
  languages: ["en", "zh-CN"],
  talents: Object.keys(BUFFS).length,
  weaponMechanics: Object.keys(WEAPONS).length,
  achievements: Object.keys(ACHIEVEMENTS).length,
  challenges: Object.keys(CHALLENGES).length,
  metaUpgrades: Object.keys(META_UPGRADES).length,
  characterPassives: Object.keys(CHARACTERS).length,
  cjkWrapping: "ok",
  englishFallback: "ok",
}));
