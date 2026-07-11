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

function createPad(aPressed: boolean, bPressed = false) {
  return {
    connected: true,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 16 }, (_, index) => {
      const active = (index === 0 && aPressed) || (index === 1 && bPressed);
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
promptInput.setBindings({ fire: "r", skill: "e", interact: " ", swapWeapon: "q", pause: "p" });
promptInput.setTouchAction("fire", true);
promptInput.setTouchPromptMode("gamepad");
assert.equal(promptInput.getPrompt("fire"), "X");
assert.equal(promptInput.getPrompt("skill"), "B");
assert.equal(promptInput.getPrompt("interact"), "A");
assert.equal(promptInput.getPrompt("swapWeapon"), "Y");
assert.equal(promptInput.getPrompt("pause"), "START");
promptInput.setTouchPromptMode("keyboard");
assert.equal(promptInput.getPrompt("fire"), "R");
assert.equal(promptInput.getPrompt("skill"), "E");
assert.equal(promptInput.getPrompt("interact"), "SPACE");
assert.equal(promptInput.getPrompt("swapWeapon"), "Q");
assert.equal(promptInput.getPrompt("pause"), "P");
promptInput.setTouchAction("fire", false);
gamepads = [createPad(false, true)];
promptInput.beginFrame();
assert.equal(promptInput.wasActionPressed("skill"), true);
assert.equal(promptInput.wasPressed("escape"), true);
assert.equal(promptInput.getPrompt("skill"), "B");
assert.equal(promptInput.getCancelPrompt(), "B");
promptInput.update();
gamepads = [createPad(false, false)];
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

const menuInput = new Input();
let menuClosed = 0;
const menuEngine = {
  input: menuInput,
  closeMenu() { menuClosed++; },
} as any;
gamepads = [createPad(false, true)];
menuInput.beginFrame();
new MenuState(menuEngine).update(0);
assert.equal(menuClosed, 1, "gamepad B closes the system menu");
menuInput.cleanup();

const shopInput = new Input();
const shopEngine = { input: shopInput } as any;
const shopState = new DungeonState(shopEngine) as any;
shopState.shopOpen = true;
gamepads = [createPad(false, true)];
shopInput.beginFrame();
shopState.updateShop(0);
assert.equal(shopState.shopOpen, false, "gamepad B closes the shop before gameplay skill handling");
shopInput.cleanup();

const touchMenuInput = new Input();
touchMenuInput.setTouchPromptMode("gamepad");
let touchMenuClosed = 0;
const touchMenuEngine = {
  input: touchMenuInput,
  closeMenu() { touchMenuClosed++; },
} as any;
touchMenuInput.setTouchAction("skill", true);
new MenuState(touchMenuEngine).update(0);
assert.equal(touchMenuClosed, 1, "touch B closes menus in gamepad label mode");
touchMenuInput.setTouchAction("skill", false);
touchMenuInput.setTouchPromptMode("keyboard");
touchMenuInput.clearJustPressed();
touchMenuInput.setTouchAction("skill", true);
assert.equal(touchMenuInput.wasActionPressed("skill"), true);
assert.equal(touchMenuInput.wasPressed("escape"), false, "keyboard-labelled touch skill remains a gameplay action");
touchMenuInput.cleanup();

runContract("keyboard", input => keyboardPulse(input, "k"));
runContract("touch", touchPulse);
runContract("gamepad", gamepadPulse);

console.log(JSON.stringify({ keyboardRun: "ok", touchRun: "ok", gamepadRun: "ok", touchPromptLabels: "ok", contextualCancel: "ok" }));
