import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path: string) => fs.readFileSync(path, "utf8");

const canvas = read("src/components/GameCanvas.tsx");
const css = read("src/index.css");
const title = read("src/game/states/TitleState.ts");
const tutorial = read("src/game/TutorialSystem.ts");
const pause = read("src/game/render/PauseOverlayRenderer.ts");
const buff = read("src/game/render/BuffSelectionRenderer.ts");
const shop = read("src/game/render/ShopRenderer.ts");
const shopSystem = read("src/game/shop/ShopSystem.ts");
const hub = read("src/game/states/HubState.ts");
const character = read("src/game/states/CharacterSelectState.ts");
const records = read("src/game/states/RecordsState.ts");
const dungeon = read("src/game/states/DungeonState.ts");
const hud = read("src/game/render/UIRenderer.ts");

assert.doesNotMatch(canvas, /touch-face-caption/);
assert.doesNotMatch(css, /\.touch-face-caption/);
assert.doesNotMatch(canvas, />FIRE<|>USE<|>SKILL<|>SWAP</);

assert.match(title, /opt === "newRun"[\s\S]*switchState\("character_select", \{ backState: "title" \}\)/);
assert.match(title, /opt === "hub"[\s\S]*switchState\("hub"\)/);
assert.doesNotMatch(title, /newRun" \|\| opt === "hub/);
assert.doesNotMatch(title, /BROWSER QA/);
assert.doesNotMatch(title, /player_main_side_idle|enemy_boss_idle|weapon_pistol|shotX|SpriteRenderer/);

assert.match(tutorial, /TutorialStepId\[\] = \["move", "fire", "skill", "interact", "swap"\]/);
assert.match(tutorial, /tutorial\.\$\{step\}/);
assert.doesNotMatch(tutorial, /MOVE TO TEST YOUR CONTROLS|FIRE YOUR CURRENT WEAPON|ACTIVATE YOUR CHARACTER SKILL|USE THE INTERACT CONTROL|SWAP YOUR WEAPON SLOT/);

assert.doesNotMatch(pause, /ACTIVE DEVICE|F6: DEBUG HUD|TO SWAP/);
assert.match(pause, /pause\.footer/);

assert.doesNotMatch(buff, /SELECT A BUFF|1 \/ 2 \/ 3 OR/);
assert.match(buff, /buff\.footer/);
assert.doesNotMatch(shop, /PURCHASES ARE SAVED IMMEDIATELY|1-4 OR/);
assert.match(shop, /shop\.footer/);
assert.doesNotMatch(shop, /shop\.medkit|shop\.armorPatch|shop\.heal|shop\.armor/);
assert.match(shopSystem, /ShopItemKind = "weapon" \| "buff"/);
assert.doesNotMatch(shopSystem, /kind: "heal"|kind: "armor"|full_hp|full_armor/);

assert.doesNotMatch(hub, /RUN BONUS HP\+|ENTER BUY \| SPACE START/);
assert.match(hub, /wasActionPressed\("interact"\)/);
assert.match(hub, /getPrompt\("interact"\)/);
assert.match(hub, /getPrompt\("fire"\)/);
assert.doesNotMatch(character, /ARMORY: SHOTGUN|\[PASSIVE\]/);
assert.match(character, /this\.engine\.switchState\(this\.backState\)/);
assert.match(character, /CMYS_FORM_IDS = \["knight", "mage", "rogue"\]/);
assert.match(character, /SelectionMode = "identity" \| "form"/);
assert.match(character, /selectedIdentity === "cmys"[\s\S]*this\.mode = "form"/);
assert.match(records, /common\.hidden/);
assert.match(dungeon, /dungeon\.retry/);

assert.match(hud, /drawPixelSprite\(ctx, `weapon_\$\{weapon\.id\}`/);
assert.doesNotMatch(hud, /drawPixelSprite\(ctx, `pickup_\$\{weapon\.id\}`/);

console.log(JSON.stringify({
  streamlinedTitleFlow: "ok",
  staticTitleWithoutCombatDemo: "ok",
  symbolOnlyTouchButtons: "ok",
  compactTutorial: "ok",
  pauseAsControlReference: "ok",
  conciseSelectionOverlays: "ok",
  cmysIdentityAndForms: "ok",
  reducedMenuCopy: "ok",
  distinctWeaponHudModels: "ok",
}));
