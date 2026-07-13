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
const input = read("src/game/Input.ts");
const menu = read("src/game/states/MenuState.ts");
const engine = read("src/game/Engine.ts");

assert.doesNotMatch(canvas, /touch-face-caption/);
assert.doesNotMatch(css, /\.touch-face-caption/);
assert.doesNotMatch(canvas, />FIRE<|>USE<|>SKILL<|>SWAP</);
assert.doesNotMatch(canvas, /data-gamepad-button="lb"|touch-shoulder-button/);
assert.match(canvas, /contextualActionHandlers\("skill", "cancel"\)/);
assert.match(input, /skill: \[1\]/);
assert.match(input, /skill: "B"/);
assert.doesNotMatch(input, /setVirtualKey\("escape"|setVirtualKey\("enter"|setVirtualKey\("q"|setVirtualKey\("e"/);
assert.match(input, /action === "confirm"\) return this\.wasActionPressed\("interact"\)/);
assert.match(input, /action === "secondary"\) return this\.wasActionPressed\("fire"\)/);
assert.doesNotMatch(input, /wasPressed\("enter"\)|wasPressed\(" "\)|wasPressed\("r"\)/);
assert.match(input, /action === "confirm"\) return formatBinding\(this\.bindings\.interact\)/);
assert.match(input, /action === "secondary"\) return formatBinding\(this\.bindings\.fire\)/);
assert.match(input, /nextRepeatAt = now \+ 420/);
assert.match(input, /state\.blockedUntilNeutral = true/);
assert.doesNotMatch(input, /virtualKeyJustPressed|setVirtualKey\("arrow/);

assert.match(title, /opt === "newRun"[\s\S]*switchState\("character_select", \{ backState: "title" \}\)/);
assert.match(title, /opt === "hub"[\s\S]*switchState\("hub"\)/);
assert.match(title, /moveSelection[\s\S]*!hasSave && this\.options\[this\.selectedIndex\] === "continue"/);
assert.doesNotMatch(title, /opt === "continue"[\s\S]*switchState\("hub"\)/);
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
assert.match(hub, /HUB_ACTIONS: HubAction\[\] = \["start", "records", "hard", "challenge", "refund"\]/);
assert.match(hub, /wasUiPressed\("confirm"\)/);
assert.match(hub, /getConfirmPrompt\(\)/);
assert.match(hub, /getCancelPrompt\(\)/);
assert.doesNotMatch(hub, /wasPressed\("h"\)|wasPressed\("c"\)|wasPressed\("y"\)/);
assert.doesNotMatch(character, /ARMORY: SHOTGUN|\[PASSIVE\]/);
assert.match(character, /this\.engine\.switchState\(this\.backState\)/);
assert.match(character, /CMYS_FORM_IDS = \["knight", "mage", "rogue"\]/);
assert.match(character, /IDENTITY_IDS: IdentityId\[\] = \["cmys", "michele", "kanami", "celestia"\]/);
assert.match(character, /player_kanami_side_idle/);
assert.match(character, /player_celestia_side_idle/);
assert.match(character, /SelectionMode = "identity" \| "form"/);
assert.match(character, /selectedIdentity === "cmys"[\s\S]*this\.mode = "form"/);
assert.match(records, /common\.hidden/);
assert.doesNotMatch(records, /wasPressed\("a"\)|wasPressed\("q"\)|wasPressed\("e"\)/);
assert.doesNotMatch(dungeon, /dungeon\.retry/);
assert.match(menu, /menu\.confirmRestore/);
assert.match(menu, /"resume" \| "save" \| "restore" \| "settings"/);
assert.doesNotMatch(menu, /"reset"|menu\.confirmReset|resetGameFromMenu/);
assert.match(menu, /openSettingsFromMenu\(\)/);
assert.match(engine, /openSettingsFromMenu\(\)[\s\S]*overlayState = "settings"/);
assert.match(engine, /closeSettingsToMenu\(\)[\s\S]*overlayState = "menu"/);
assert.match(engine, /resetGameFromMenu\(\)[\s\S]*rebuildStateAfterDataChange\("title"/);
assert.match(engine, /stateCapturesPause[\s\S]*capturesPauseInput\(\)[\s\S]*wasUiPressed\("cancel"\)/);
assert.match(dungeon, /capturesPauseInput\(\): boolean[\s\S]*return this\.shopOpen/);
assert.doesNotMatch(menu, /System Menu Loaded|TACTICAL JOURNEY ARCHIVE|Archive save completed/);

assert.match(hud, /drawPixelSprite\(ctx, `weapon_\$\{weapon\.id\}`/);
assert.doesNotMatch(hud, /drawPixelSprite\(ctx, `pickup_\$\{weapon\.id\}`/);
assert.match(hud, /splitWeaponName\(weapon\.name\)/);
assert.doesNotMatch(hud, /weapon\.name\.toUpperCase\(\)\.slice/);
assert.match(hud, /skillReady[\s\S]*SKILL READY/);
assert.match(hud, /index < BuffSystem\.MAX_BUFFS/);
assert.match(dungeon, /ACTIVE_REWARD_BUFF_LIMIT/);
assert.match(canvas, /window\.visualViewport/);
assert.match(canvas, /--visual-viewport-height/);
assert.match(css, /height: var\(--visual-viewport-height, 100dvh\)/);
assert.match(css, /position: fixed/);

console.log(JSON.stringify({
  streamlinedTitleFlow: "ok",
  staticTitleWithoutCombatDemo: "ok",
  symbolOnlyTouchButtons: "ok",
  compactTutorial: "ok",
  pauseAsControlReference: "ok",
  conciseSelectionOverlays: "ok",
  cmysIdentityAndForms: "ok",
  reducedMenuCopy: "ok",
  semanticInputPrompts: "ok",
  compactKeyboardContract: "ESC-WASD-JKLI",
  shopEscapeCapture: "ok",
  safeSystemMenu: "ok",
  distinctWeaponHudModels: "ok",
  adaptiveWeaponNames: "ok",
  visibleSkillRecovery: "ok",
  twelveTalentSlots: "ok",
}));
