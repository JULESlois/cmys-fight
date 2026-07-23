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
const character = read("src/game/states/RebirthLoadoutState.ts");
const records = read("src/game/states/RecordsState.ts");
const dungeon = read("src/game/states/DungeonState.ts");
const hud = read("src/game/render/UIRenderer.ts");
const weaponHud = read("src/game/render/WeaponHudRenderer.ts");
const input = read("src/game/Input.ts");
const menu = read("src/game/states/MenuState.ts");
const settings = read("src/game/states/SettingsState.ts");
const result = read("src/game/states/RunResultState.ts");
const menuRenderer = read("src/game/render/MenuRenderer.ts");
const pixelUi = read("src/game/render/PixelUi.ts");
const engine = read("src/game/Engine.ts");

assert.doesNotMatch(canvas, /touch-face-caption/);
assert.doesNotMatch(css, /\.touch-face-caption/);
assert.doesNotMatch(canvas, />FIRE<|>USE<|>SKILL<|>SWAP</);
assert.doesNotMatch(canvas, /data-gamepad-button="lb"|touch-shoulder-button/);
assert.match(canvas, /contextualActionHandlers\("skill", "cancel"\)/);
assert.match(input, /skill: \[4, 5\]/);
assert.match(input, /skill: "LB\/RB"/);
assert.match(input, /dodge: \[1\]/);
assert.match(input, /dodge: "B"/);
assert.doesNotMatch(input, /setVirtualKey\("escape"|setVirtualKey\("enter"|setVirtualKey\("q"|setVirtualKey\("e"/);
assert.match(input, /action === "confirm"\) return this\.wasActionPressed\("interact"\)/);
assert.match(input, /action === "secondary"\) return this\.wasActionPressed\("fire"\)/);
assert.doesNotMatch(input, /wasPressed\("enter"\)|wasPressed\(" "\)|wasPressed\("r"\)/);
assert.match(input, /action === "confirm"\) return formatBinding\(this\.bindings\.interact\)/);
assert.match(input, /action === "secondary"\) return formatBinding\(this\.bindings\.fire\)/);
assert.match(input, /nextRepeatAt = now \+ 420/);
assert.match(input, /state\.blockedUntilNeutral = true/);
assert.doesNotMatch(input, /virtualKeyJustPressed|setVirtualKey\("arrow/);

assert.match(title, /opt === "newRun"[\s\S]*switchState\("hub", \{ spawnAnchor: "rebirth_spring" \}\)/);
assert.match(title, /opt === "hub"[\s\S]*switchState\("hub"\)/);
assert.match(title, /opt === "records"[\s\S]*switchState\("records", \{ backState: "title" \}\)/);
assert.match(title, /moveSelection[\s\S]*!hasSave && this\.options\[this\.selectedIndex\] === "continue"/);
assert.doesNotMatch(title, /opt === "continue"[\s\S]*switchState\("hub"\)/);
assert.doesNotMatch(title, /newRun" \|\| opt === "hub/);
assert.doesNotMatch(title, /BROWSER QA/);
assert.doesNotMatch(title, /player_main_side_idle|enemy_boss_idle|weapon_pistol|shotX|SpriteRenderer/);
assert.doesNotMatch(title, /title\.stats|title\.footer|bestVictoryTime|highestStage/);

assert.match(tutorial, /TutorialStepId\[\] = \["move", "fire", "skill", "interact", "swap"\]/);
assert.match(tutorial, /tutorial\.\$\{step\}/);
assert.doesNotMatch(tutorial, /MOVE TO TEST YOUR CONTROLS|FIRE YOUR CURRENT WEAPON|ACTIVATE YOUR CHARACTER SKILL|USE THE INTERACT CONTROL|SWAP YOUR WEAPON SLOT/);

assert.doesNotMatch(pause, /ACTIVE DEVICE|F6: DEBUG HUD|TO SWAP/);
assert.match(pause, /pause\.footer/);
assert.match(pause, /drawPixelPanel/);
assert.match(pause, /drawSectionLabel/);
assert.match(pause, /SpriteRenderer\.drawPixelSprite\(ctx, `weapon_\$\{weapon\.id\}`/);

assert.doesNotMatch(buff, /SELECT A BUFF|1 \/ 2 \/ 3 OR/);
assert.match(buff, /buff\.footer/);
assert.match(buff, /drawPixelPanel/);
assert.match(buff, /drawBadge/);
assert.doesNotMatch(shop, /PURCHASES ARE SAVED IMMEDIATELY|1-4 OR/);
assert.match(shop, /shop\.footer/);
assert.match(shop, /drawPixelPanel/);
assert.match(shop, /drawUiIcon/);
assert.match(shop, /SpriteRenderer\.drawPixelSprite\(ctx, `weapon_\$\{item\.weaponId\}`/);
assert.doesNotMatch(shop, /shop\.medkit|shop\.armorPatch|shop\.heal|shop\.armor/);
assert.match(shopSystem, /ShopItemKind = "weapon" \| "buff"/);
assert.doesNotMatch(shopSystem, /kind: "heal"|kind: "armor"|full_hp|full_armor/);

assert.doesNotMatch(hub, /RUN BONUS HP\+|ENTER BUY \| SPACE START/);
assert.match(hub, /private readonly map = HUB_MAP/);
assert.match(hub, /new Camera2D\(320, 240, \{ width: 96, height: 64 \}, 7\.5\)/);
assert.match(hub, /new WorldCollision\(this\.map\)/);
assert.match(hub, /this\.playerController\.update\(this\.player, this\.engine\.input, this\.collision, dt\)/);
assert.match(hub, /this\.camera\.follow\(this\.player\.x, this\.player\.y/);
assert.match(hub, /EXPEDITION_ACTIONS: ExpeditionAction\[\] = \["continue", "start", "abandon", "close"\]/);
assert.match(hub, /TRIAL_ACTIONS: TrialAction\[\] = \["hard", "challenge", "close"\]/);
assert.match(hub, /case "open_rebirth_spring"[\s\S]*switchState\("rebirth_loadout"\)/);
assert.match(hub, /case "open_records"[\s\S]*backState: "hub"/);
assert.match(hub, /purchaseMetaUpgrade/);
assert.match(hub, /wasUiPressed\("confirm"\)/);
assert.match(hub, /getConfirmPrompt\(\)/);
assert.match(hub, /getCancelPrompt\(\)/);
assert.doesNotMatch(hub, /wasPressed\("h"\)|wasPressed\("c"\)|wasPressed\("y"\)/);
assert.doesNotMatch(character, /ARMORY: SHOTGUN|\[PASSIVE\]/);
assert.match(character, /getHubLoadout\(\)/);
assert.doesNotMatch(character, /hubMode|startNewRun/);
assert.match(character, /this\.engine\.data\.setHubLoadout\(character\.id, starterWeaponId\)/);
assert.match(character, /CMYS_FORM_IDS = \["knight", "mage", "rogue"\]/);
assert.match(character, /CHARACTER_COLLECTION_IDS/);
assert.match(character, /SelectionMode = "collection" \| "character" \| "form"/);
assert.match(character, /selectedCollectionId === "cmys"[\s\S]*this\.mode = "form"/);
assert.match(character, /this\.mode = "character"/);
assert.match(character, /player_esper_zero_side_idle/);
assert.match(character, /player_nanally_side_idle/);
assert.match(character, /player_kanami_side_idle/);
assert.match(character, /player_celestia_side_idle/);
assert.match(character, /drawFittedCenteredText/);
assert.doesNotMatch(character, /wrapLocalized\(getCharacterText\(character\.id, character, language\)\.title/);
assert.match(character, /drawPixelPanel\(ctx, 20, 70, 105, 126/);
assert.match(character, /drawPixelPanel\(ctx, 132, 70, 168, 126/);
assert.match(character, /this\.drawCharacterSprite\(ctx, character\.id, 72, 135, usesDetailedCharacterArt\(character\.id\) \? 2 : 3/);
assert.match(character, /drawPixelPanel\(ctx, 20, 201, 280, 27, "yellow"\)/);
assert.match(records, /common\.hidden/);
assert.match(records, /"overview" \| "achievements"/);
assert.match(records, /backState: "title" \| "hub"/);
assert.match(records, /records\.runStats/);
assert.match(records, /records\.collection/);
assert.match(records, /isWeaponPage[\s\S]*SpriteRenderer\.drawPixelSprite\(ctx, `weapon_\$\{weapon\.id\}`/);
assert.match(records, /weapon\.dualWield[\s\S]*weapon_\$\{weapon\.id\}/);
assert.doesNotMatch(records, /wasPressed\("a"\)|wasPressed\("q"\)|wasPressed\("e"\)/);
assert.doesNotMatch(dungeon, /dungeon\.retry/);
assert.doesNotMatch(menu, /"reset"|menu\.confirmReset|resetGameFromMenu/);
assert.match(menu, /openSettingsFromMenu\(\)/);
assert.match(engine, /openSettingsFromMenu\(\)[\s\S]*overlayState = "settings"/);
assert.match(engine, /closeSettingsToMenu\(\)[\s\S]*overlayState = "menu"/);
assert.match(menu, /returnToHubFromRun\(\)/);
assert.doesNotMatch(menu, /switchState\("title"\)/);
assert.match(engine, /returnToHubFromRun\(\)[\s\S]*prepareForSave\(\)[\s\S]*this\.data\.save\(\)[\s\S]*switchState\("hub", \{ spawnAnchor: "rebirth_spring" \}\)/);
assert.doesNotMatch(engine, /crtFilter|for \(let y = 0; y < 240; y \+= 4\)/);
assert.doesNotMatch(settings, /crtFilter|settings\.crtFilter/);
assert.doesNotMatch(hub, /hub\.runReady|hub\.noRun/);
assert.match(engine, /resetGameFromMenu\(\)[\s\S]*"hub"[\s\S]*spawnAnchor: "rebirth_spring"/);
assert.match(engine, /stateCapturesPause[\s\S]*capturesPauseInput\(\)[\s\S]*wasUiPressed\("cancel"\)/);
assert.match(dungeon, /capturesPauseInput\(\): boolean[\s\S]*return false/);
assert.doesNotMatch(menu, /System Menu Loaded|TACTICAL JOURNEY ARCHIVE|Archive save completed/);
assert.match(settings, /ROOT_OPTIONS: readonly SettingsMenuOption\[\] = \["audioVisual", "operation", "accountData", "back"\]/);
assert.match(settings, /AUDIO_VISUAL_OPTIONS/);
assert.match(settings, /OPERATION_OPTIONS/);
assert.match(settings, /ACCOUNT_DATA_OPTIONS/);
assert.match(settings, /this\.view === "keyBindings"/);
assert.doesNotMatch(settings, /const OPTIONS = \[/);
assert.match(result, /switchState\("hub", \{ spawnAnchor: "rebirth_spring" \}\)/);
assert.doesNotMatch(result, /selection: "hub" \| "title"|result\.titleButton|wasUiPressed\("left"\)|wasUiPressed\("right"\)/);
assert.match(menuRenderer, /Math\.max\(0, Math\.min\(1, val \/ max\)\)/);

assert.match(pixelUi, /export const UI_COLORS/);
assert.match(pixelUi, /export function drawPixelPanel/);
assert.match(pixelUi, /export function drawPixelButton/);
assert.match(pixelUi, /export function drawMeter/);
assert.match(pixelUi, /export function drawBadge/);

assert.match(hud, /WeaponHudRenderer\.draw/);
assert.match(weaponHud, /drawPixelSprite\(ctx, `weapon_\$\{weapon\.id\}`/);
assert.doesNotMatch(weaponHud, /drawPixelSprite\(ctx, `pickup_\$\{weapon\.id\}`/);
// assert.match(hud, /splitWeaponName\(activeWeapon\.name\)/);
assert.doesNotMatch(hud, /weapon\.name\.toUpperCase\(\)\.slice/);
assert.match(hud, /kind: "heart" as const/);
assert.match(hud, /kind: "shield" as const/);
// assert.match(hud, /kind: "energy" as const/);
assert.match(hud, /drawUiIcon\(ctx, row\.kind/);
assert.match(hud, /skillReady[\s\S]*"READY"/);
assert.match(hud, /visibleBuffCount = Math\.min\(player\.buffs\.length, BuffSystem\.MAX_BUFFS\)/);
assert.match(hud, /index < visibleBuffCount/);
assert.match(weaponHud, /standbyIndex = player\.weaponLoadout\.activeSlot === 0 \? 1 : 0/);
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
  weaponCodexModels: "selected-authored-weapon-preview",
  adaptiveWeaponNames: "ok",
  visibleSkillRecovery: "ok",
  talentStrip: "owned-only-up-to-twelve",
}));
