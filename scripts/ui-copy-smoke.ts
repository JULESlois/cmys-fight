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
const hub = read("src/game/states/HubState.ts");
const character = read("src/game/states/CharacterSelectState.ts");
const records = read("src/game/states/RecordsState.ts");
const dungeon = read("src/game/states/DungeonState.ts");

assert.doesNotMatch(canvas, /touch-face-caption/);
assert.doesNotMatch(css, /\.touch-face-caption/);
assert.doesNotMatch(canvas, />FIRE<|>USE<|>SKILL<|>SWAP</);

assert.match(title, /opt === "NEW RUN"[\s\S]*switchState\("character_select", \{ backState: "title" \}\)/);
assert.match(title, /opt === "HUB"[\s\S]*switchState\("hub"\)/);
assert.doesNotMatch(title, /NEW RUN" \|\| opt === "HUB/);
assert.doesNotMatch(title, /BROWSER QA/);

assert.match(tutorial, /label: "MOVE"/);
assert.match(tutorial, /\[\$\{prompt\}\] \$\{step\.label\}/);
assert.doesNotMatch(tutorial, /MOVE TO TEST YOUR CONTROLS|FIRE YOUR CURRENT WEAPON|ACTIVATE YOUR CHARACTER SKILL|USE THE INTERACT CONTROL|SWAP YOUR WEAPON SLOT/);

assert.doesNotMatch(pause, /ACTIVE DEVICE|F6: DEBUG HUD|TO SWAP/);
assert.match(pause, /MENU[\s\S]*RESUME/);

assert.doesNotMatch(buff, /SELECT A BUFF|1 \/ 2 \/ 3 OR/);
assert.match(buff, /CYCLE[\s\S]*TAKE/);
assert.doesNotMatch(shop, /PURCHASES ARE SAVED IMMEDIATELY|1-4 OR/);
assert.match(shop, /MOVE[\s\S]*BUY[\s\S]*EXIT/);

assert.doesNotMatch(hub, /RUN BONUS HP\+|ENTER BUY \| SPACE START/);
assert.doesNotMatch(character, /ARMORY: SHOTGUN|\[PASSIVE\]/);
assert.match(character, /this\.engine\.switchState\(this\.backState\)/);
assert.match(records, /"HIDDEN"/);
assert.match(dungeon, /getPrompt\("interact"\)[\s\S]*RETRY/);

console.log(JSON.stringify({
  streamlinedTitleFlow: "ok",
  symbolOnlyTouchButtons: "ok",
  compactTutorial: "ok",
  pauseAsControlReference: "ok",
  conciseSelectionOverlays: "ok",
  reducedMenuCopy: "ok",
}));
