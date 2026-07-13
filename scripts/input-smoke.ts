import assert from "node:assert/strict";
import { GameData } from "../src/game/GameData";
import { FINAL_GLOBAL_STAGE } from "../src/game/RunProgress";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}

class MockTarget {
  private handlers = new Map<string, Set<(event: any) => void>>();
  hidden = false;
  addEventListener(type: string, handler: (event: any) => void) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
  }
  removeEventListener(type: string, handler: (event: any) => void) {
    this.handlers.get(type)?.delete(handler);
  }
  dispatch(type: string, event: any) {
    for (const handler of this.handlers.get(type) ?? []) handler(event);
  }
}

const windowTarget = new MockTarget();
const documentTarget = new MockTarget();
const storage = new MemoryStorage();
let gamepads: any[] = [];
Object.defineProperty(globalThis, "window", { value: windowTarget, configurable: true });
Object.defineProperty(globalThis, "document", { value: documentTarget, configurable: true });
Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
Object.defineProperty(globalThis, "navigator", {
  value: { getGamepads: () => gamepads },
  configurable: true,
});

const { Input } = await import("../src/game/Input");
const { CharacterSelectState } = await import("../src/game/states/CharacterSelectState");
const { DungeonState } = await import("../src/game/states/DungeonState");
const { MenuState } = await import("../src/game/states/MenuState");
const { HubState } = await import("../src/game/states/HubState");
const fs = await import("node:fs");

function keyboardPulse(input: InstanceType<typeof Input>, key: string) {
  windowTarget.dispatch("keydown", { key, preventDefault() {} });
  assert.equal(input.wasActionPressed("interact"), true);
  input.update();
  windowTarget.dispatch("keyup", { key, preventDefault() {} });
}

function touchPulse(input: InstanceType<typeof Input>) {
  input.setTouchAction("interact", true);
  assert.equal(input.wasActionPressed("interact"), true);
  input.update();
  input.setTouchAction("interact", false);
}

function createPad(
  aPressed: boolean,
  bPressed = false,
  xPressed = false,
  yPressed = false,
  lbPressed = false,
  startPressed = false,
) {
  return {
    connected: true,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 16 }, (_, index) => {
      const active =
        (index === 0 && aPressed) ||
        (index === 1 && bPressed) ||
        (index === 2 && xPressed) ||
        (index === 3 && yPressed) ||
        (index === 4 && lbPressed) ||
        (index === 9 && startPressed);
      return { pressed: active, value: active ? 1 : 0 };
    }),
  };
}

function gamepadPulse(input: InstanceType<typeof Input>) {
  gamepads = [createPad(true)];
  input.beginFrame();
  assert.equal(input.wasActionPressed("interact"), true);
  input.update();
  gamepads = [createPad(false)];
  input.beginFrame();
  input.update();
}

function runContract(label: string, pulse: (input: InstanceType<typeof Input>) => void) {
  storage.clear();
  const input = new Input();
  const data = new GameData();
  data.startNewRun("knight", "pistol", false);
  for (let stage = 1; stage < FINAL_GLOBAL_STAGE; stage++) {
    pulse(input);
    data.advanceStage();
  }
  assert.equal(data.data.run.globalStageIndex, FINAL_GLOBAL_STAGE, `${label} reached final stage`);
  pulse(input);
  data.data.runStats.stagesCleared = FINAL_GLOBAL_STAGE;
  const result = data.finalizeRun("victory");
  assert.equal(result.outcome, "victory", `${label} victory`);
  input.cleanup();
}


const promptInput = new Input();
promptInput.setBindings({ fire: "j", skill: "l", interact: "k", swapWeapon: "i", pause: "escape" });
promptInput.setTouchAction("fire", true);
promptInput.setTouchPromptMode("gamepad");
assert.equal(promptInput.getPrompt("fire"), "X");
assert.equal(promptInput.getPrompt("skill"), "B");
assert.equal(promptInput.getPrompt("interact"), "A");
assert.equal(promptInput.getPrompt("swapWeapon"), "Y");
assert.equal(promptInput.getPrompt("pause"), "START");
promptInput.setTouchPromptMode("keyboard");
assert.equal(promptInput.getPrompt("fire"), "J");
assert.equal(promptInput.getPrompt("skill"), "L");
assert.equal(promptInput.getPrompt("interact"), "K");
assert.equal(promptInput.getPrompt("swapWeapon"), "I");
assert.equal(promptInput.getPrompt("pause"), "ESC");
assert.equal(promptInput.getConfirmPrompt(), "K");
assert.equal(promptInput.getUiPrompt("secondary"), "J");
promptInput.setTouchAction("fire", false);
gamepads = [createPad(false, true)];
promptInput.beginFrame();
assert.equal(promptInput.wasActionPressed("skill"), true, "gamepad B is the contextual gameplay skill button");
assert.equal(promptInput.wasUiPressed("cancel"), true, "the same B button is cancel in menu contexts");
assert.equal(promptInput.wasPressed("escape"), false, "gamepad buttons must not masquerade as keyboard keys");
assert.equal(promptInput.getPrompt("skill"), "B");
assert.equal(promptInput.getCancelPrompt(), "B");
promptInput.suppressUntilReleased();
promptInput.update();
promptInput.beginFrame();
assert.equal(promptInput.wasActionPressed("skill"), false, "held B is blocked after a context transition");
assert.equal(promptInput.wasUiPressed("cancel"), false);
gamepads = [createPad(false, false)];
promptInput.beginFrame();
promptInput.update();
gamepads = [createPad(false, false, false, false, true)];
promptInput.beginFrame();
assert.equal(promptInput.wasActionPressed("skill"), false, "LB is not part of the compact ABXY touch/gamepad contract");
promptInput.update();
gamepads = [createPad(false)];
promptInput.beginFrame();
promptInput.update();
promptInput.cleanup();

const characterInput = new Input();
let switchedState = "";
const characterEngine = {
  input: characterInput,
  switchState(state: string) { switchedState = state; },
} as any;
gamepads = [createPad(false, true)];
characterInput.beginFrame();
new CharacterSelectState(characterEngine).update(0);
assert.equal(switchedState, "hub", "gamepad B returns from character select");
characterInput.cleanup();

const hierarchyInput = new Input();
let hierarchySwitch = "";
let hierarchyStart: { characterId: string; weaponId?: string } | null = null;
const hierarchyEngine = {
  input: hierarchyInput,
  data: {
    settings: { language: "en" },
    meta: { preferredHardMode: false },
    isStarterWeaponUnlocked: () => true,
    isCharacterUnlocked: () => true,
    getStarterWeaponForCharacter(characterId: string) {
      return characterId === "michele" ? "inspector" : characterId === "kanami" ? "finale" : characterId === "mage" ? "laser" : characterId === "rogue" ? "shotgun" : "pistol";
    },
    startNewRun(characterId: string, weaponId?: string) {
      hierarchyStart = { characterId, weaponId };
    },
  },
  switchState(state: string) { hierarchySwitch = state; },
} as any;
const hierarchyState = new CharacterSelectState(hierarchyEngine) as any;
hierarchyState.enter({ backState: "hub" });
assert.equal(hierarchyState.mode, "identity");
windowTarget.dispatch("keydown", { key: "k", preventDefault() {} });
hierarchyState.update(0);
assert.equal(hierarchyState.mode, "form", "selecting CMYS must open form selection");
assert.equal(hierarchyStart, null, "selecting CMYS must not immediately start a run");
hierarchyInput.update();
windowTarget.dispatch("keyup", { key: "k", preventDefault() {} });
hierarchyInput.update();
windowTarget.dispatch("keydown", { key: "d", preventDefault() {} });
hierarchyState.update(0);
assert.equal(hierarchyState.selectedForm.id, "mage", "CMYS form selection must cycle Guard, Arcane, and Swift forms");
hierarchyInput.update();
windowTarget.dispatch("keyup", { key: "d", preventDefault() {} });
hierarchyInput.update();
windowTarget.dispatch("keydown", { key: "k", preventDefault() {} });
hierarchyState.update(0);
assert.deepEqual(hierarchyStart, { characterId: "mage", weaponId: "laser" });
assert.equal(hierarchySwitch, "dungeon");
hierarchyInput.update();
windowTarget.dispatch("keyup", { key: "k", preventDefault() {} });
hierarchyInput.cleanup();

const kanamiInput = new Input();
let kanamiSwitch = "";
let kanamiStart: { characterId: string; weaponId?: string } | null = null;
const kanamiEngine = {
  input: kanamiInput,
  data: {
    settings: { language: "en" },
    meta: { preferredHardMode: false },
    isStarterWeaponUnlocked: () => true,
    isCharacterUnlocked: () => true,
    getStarterWeaponForCharacter: (characterId: string) => characterId === "kanami" ? "finale" : "pistol",
    startNewRun(characterId: string, weaponId?: string) { kanamiStart = { characterId, weaponId }; },
  },
  switchState(state: string) { kanamiSwitch = state; },
} as any;
const kanamiState = new CharacterSelectState(kanamiEngine) as any;
kanamiState.enter({ backState: "hub" });
for (let step = 0; step < 2; step++) {
  windowTarget.dispatch("keydown", { key: "d", preventDefault() {} });
  kanamiState.update(0);
  kanamiInput.update();
  windowTarget.dispatch("keyup", { key: "d", preventDefault() {} });
  kanamiInput.update();
}
assert.equal(kanamiState.selectedIdentity, "kanami");
windowTarget.dispatch("keydown", { key: "k", preventDefault() {} });
kanamiState.update(0);
assert.deepEqual(kanamiStart, { characterId: "kanami", weaponId: "finale" });
assert.equal(kanamiSwitch, "dungeon");
kanamiInput.update();
windowTarget.dispatch("keyup", { key: "k", preventDefault() {} });
kanamiInput.cleanup();

const menuInput = new Input();
let menuClosed = 0;
const menuEngine = {
  input: menuInput,
  data: { settings: { language: "en" }, data: { player: { level: 1, hp: 5, maxHp: 5 } } },
  closeMenu() { menuClosed++; },
} as any;
gamepads = [createPad(false, true)];
menuInput.beginFrame();
new MenuState(menuEngine).update(0);
assert.equal(menuClosed, 1, "gamepad B closes the system menu");
menuInput.cleanup();

const destructiveMenuInput = new Input();
let restoreCount = 0;
let resetCount = 0;
const destructiveMenuEngine = {
  input: destructiveMenuInput,
  data: { settings: { language: "en" }, data: { player: { level: 1, hp: 5, maxHp: 5 } } },
  closeMenu() {},
  saveFromMenu() {},
  reloadSaveFromMenu() { restoreCount++; },
  resetGameFromMenu() { resetCount++; },
} as any;
const destructiveMenu = new MenuState(destructiveMenuEngine) as any;
destructiveMenu.enter();
destructiveMenu.selection = 2;
windowTarget.dispatch("keydown", { key: "k", preventDefault() {} });
destructiveMenu.update(0);
assert.equal(restoreCount, 0, "restore requires a second confirmation");
destructiveMenuInput.update();
windowTarget.dispatch("keyup", { key: "k", preventDefault() {} });
windowTarget.dispatch("keydown", { key: "k", preventDefault() {} });
destructiveMenu.update(0);
assert.equal(restoreCount, 1);
destructiveMenuInput.update();
windowTarget.dispatch("keyup", { key: "k", preventDefault() {} });
destructiveMenu.enter();
destructiveMenu.selection = 3;
windowTarget.dispatch("keydown", { key: "k", preventDefault() {} });
destructiveMenu.update(0);
assert.equal(resetCount, 0, "reset requires a second confirmation");
destructiveMenuInput.update();
windowTarget.dispatch("keyup", { key: "k", preventDefault() {} });
windowTarget.dispatch("keydown", { key: "k", preventDefault() {} });
destructiveMenu.update(0);
assert.equal(resetCount, 1);
destructiveMenuInput.update();
windowTarget.dispatch("keyup", { key: "k", preventDefault() {} });
destructiveMenuInput.cleanup();

const shopInput = new Input();
const shopEngine = { input: shopInput } as any;
const shopState = new DungeonState(shopEngine) as any;
shopState.shopOpen = true;
assert.equal(shopState.capturesPauseInput(), true, "open shop captures the shared Escape pause key");
windowTarget.dispatch("keydown", { key: "Escape", preventDefault() {} });
shopState.updateShop(0);
assert.equal(shopState.shopOpen, false, "Escape closes the shop instead of opening pause");
assert.equal(shopInput.wasActionPressed("pause"), false, "shop close suppresses held Escape before returning to combat");
windowTarget.dispatch("keyup", { key: "Escape", preventDefault() {} });
shopInput.cleanup();
const engineSource = fs.readFileSync("src/game/Engine.ts", "utf8");
assert.match(engineSource, /stateCapturesPause[\s\S]*capturesPauseInput\(\)[\s\S]*wasUiPressed\("cancel"\)[\s\S]*!stateCapturesPause/);

const createHubEngine = (input: InstanceType<typeof Input>) => {
  let purchases = 0;
  let switchedState = "";
  const engine = {
    input,
    data: {
      settings: { language: "en" },
      meta: {
        hardModeUnlocked: false,
        preferredHardMode: false,
        preferredChallengeId: undefined,
      },
      purchaseMetaUpgrade() {
        purchases++;
        return { success: true, cost: 30 };
      },
    },
    switchState(state: string) { switchedState = state; },
  } as any;
  return {
    engine,
    getPurchases: () => purchases,
    getSwitchedState: () => switchedState,
  };
};

const hubKeyboardInput = new Input();
const hubKeyboard = createHubEngine(hubKeyboardInput);
const hubKeyboardState = new HubState(hubKeyboard.engine) as any;
hubKeyboardState.selectedIndex = 0;
windowTarget.dispatch("keydown", { key: "k", preventDefault() {} });
hubKeyboardState.update();
assert.equal(hubKeyboard.getPurchases(), 1, "default K interact binding purchases a meta upgrade");
assert.equal(hubKeyboard.getSwitchedState(), "", "buy input must not start a run");
hubKeyboardInput.update();
windowTarget.dispatch("keyup", { key: "k", preventDefault() {} });
windowTarget.dispatch("keydown", { key: "Enter", preventDefault() {} });
hubKeyboardState.update();
assert.equal(hubKeyboard.getPurchases(), 1, "Enter is not a keyboard confirmation fallback");
hubKeyboardInput.update();
windowTarget.dispatch("keyup", { key: "Enter", preventDefault() {} });
windowTarget.dispatch("keydown", { key: " ", preventDefault() {} });
hubKeyboardState.update();
assert.equal(hubKeyboard.getPurchases(), 1, "Space is not a keyboard confirmation fallback");
hubKeyboardInput.update();
windowTarget.dispatch("keyup", { key: " ", preventDefault() {} });
hubKeyboardInput.cleanup();

const hubGamepadInput = new Input();
const hubGamepad = createHubEngine(hubGamepadInput);
gamepads = [createPad(true)];
hubGamepadInput.beginFrame();
new HubState(hubGamepad.engine).update();
assert.equal(hubGamepad.getPurchases(), 0);
assert.equal(hubGamepad.getSwitchedState(), "character_select", "gamepad A activates the selected Start Run entry");
hubGamepadInput.cleanup();

const hubTouchInput = new Input();
const hubTouch = createHubEngine(hubTouchInput);
hubTouchInput.setTouchAction("interact", true);
new HubState(hubTouch.engine).update();
assert.equal(hubTouch.getPurchases(), 0);
assert.equal(hubTouch.getSwitchedState(), "character_select", "touch A activates the selected Start Run entry");
hubTouchInput.cleanup();

const touchMenuInput = new Input();
touchMenuInput.setTouchPromptMode("gamepad");
let touchMenuClosed = 0;
const touchMenuEngine = {
  input: touchMenuInput,
  closeMenu() {
    touchMenuClosed++;
    touchMenuInput.suppressUntilReleased();
  },
} as any;
touchMenuInput.setTouchAction("skill", true);
touchMenuInput.setTouchUiAction("cancel", true);
assert.equal(touchMenuInput.wasActionPressed("skill"), true, "touch B exposes skill to gameplay contexts");
new MenuState(touchMenuEngine).update(0);
assert.equal(touchMenuClosed, 1, "touch B closes menus in menu contexts");
assert.equal(touchMenuInput.wasActionPressed("skill"), false, "closing the menu suppresses the held contextual B action");
touchMenuInput.setTouchAction("skill", false);
touchMenuInput.setTouchUiAction("cancel", false);
touchMenuInput.setTouchPromptMode("keyboard");
touchMenuInput.clearJustPressed();
touchMenuInput.setTouchAction("skill", true);
assert.equal(touchMenuInput.wasActionPressed("skill"), true);
assert.equal(touchMenuInput.wasPressed("escape"), false, "keyboard-labelled touch skill remains a gameplay action");
touchMenuInput.cleanup();

const transitionInput = new Input();
gamepads = [createPad(true)];
transitionInput.beginFrame();
assert.equal(transitionInput.wasUiPressed("confirm"), true);
transitionInput.suppressUntilReleased();
transitionInput.update();
transitionInput.beginFrame();
assert.equal(transitionInput.wasUiPressed("confirm"), false, "held A is suppressed after a state transition");
assert.equal(transitionInput.wasActionPressed("interact"), false);
gamepads = [createPad(false)];
transitionInput.beginFrame();
transitionInput.update();
gamepads = [createPad(true)];
transitionInput.beginFrame();
assert.equal(transitionInput.wasUiPressed("confirm"), true, "A works again after release");
transitionInput.cleanup();

const keyboardTransitionInput = new Input();
windowTarget.dispatch("keydown", { key: "k", preventDefault() {} });
assert.equal(keyboardTransitionInput.wasUiPressed("confirm"), true);
keyboardTransitionInput.suppressUntilReleased();
keyboardTransitionInput.update();
assert.equal(keyboardTransitionInput.wasUiPressed("confirm"), false, "held K is suppressed after a state transition");
windowTarget.dispatch("keyup", { key: "k", preventDefault() {} });
windowTarget.dispatch("keydown", { key: "k", preventDefault() {} });
assert.equal(keyboardTransitionInput.wasUiPressed("confirm"), true, "K works again after release");
windowTarget.dispatch("keyup", { key: "k", preventDefault() {} });
windowTarget.dispatch("keydown", { key: "Enter", preventDefault() {} });
assert.equal(keyboardTransitionInput.wasUiPressed("confirm"), false, "Enter has no implicit UI meaning");
windowTarget.dispatch("keyup", { key: "Enter", preventDefault() {} });
windowTarget.dispatch("keydown", { key: " ", preventDefault() {} });
assert.equal(keyboardTransitionInput.wasUiPressed("confirm"), false, "Space has no implicit UI meaning");
windowTarget.dispatch("keyup", { key: " ", preventDefault() {} });
keyboardTransitionInput.cleanup();

const secondaryInput = new Input();
windowTarget.dispatch("keydown", { key: "j", preventDefault() {} });
assert.equal(secondaryInput.wasUiPressed("secondary"), true, "J is the keyboard secondary UI action");
windowTarget.dispatch("keyup", { key: "j", preventDefault() {} });
secondaryInput.update();
windowTarget.dispatch("keydown", { key: "r", preventDefault() {} });
assert.equal(secondaryInput.wasUiPressed("secondary"), false, "R is not required by the core keyboard layout");
windowTarget.dispatch("keyup", { key: "r", preventDefault() {} });
secondaryInput.update();
secondaryInput.setTouchAction("fire", true);
assert.equal(secondaryInput.wasUiPressed("secondary"), true, "touch X is the touch secondary UI action");
secondaryInput.setTouchAction("fire", false);
secondaryInput.cleanup();

runContract("keyboard", input => keyboardPulse(input, "k"));
runContract("touch", touchPulse);
runContract("gamepad", gamepadPulse);

console.log(JSON.stringify({ keyboardRun: "ok", touchRun: "ok", gamepadRun: "ok", semanticUiActions: "ok", coreKeyboardLayout: "ESC-WASD-JKLI", noEnterOrSpaceFallback: "ok", contextualGamepadSkill: "B-skill-or-cancel", secondaryActionIsolation: "J-X-only", shopEscapeCapture: "ok", transitionReleaseGate: "keyboard-and-gamepad", destructiveMenuConfirmation: "ok", touchPromptLabels: "ok", hubUnifiedMenu: "ok", cmysFormSelection: "identity-to-three-forms", kanamiSelection: "identity-to-finale" }));
