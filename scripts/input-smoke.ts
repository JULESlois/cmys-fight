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

function createPad(aPressed: boolean) {
  return {
    connected: true,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 16 }, (_, index) => ({ pressed: index === 0 && aPressed, value: index === 0 && aPressed ? 1 : 0 })),
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
promptInput.cleanup();

runContract("keyboard", input => keyboardPulse(input, " "));
runContract("touch", touchPulse);
runContract("gamepad", gamepadPulse);

console.log(JSON.stringify({ keyboardRun: "ok", touchRun: "ok", gamepadRun: "ok", touchPromptLabels: "ok" }));
