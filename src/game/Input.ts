import {
  DEFAULT_KEY_BINDINGS,
  formatBinding,
  type InputAction,
} from "./Settings";

export type InputDevice = "keyboard" | "gamepad" | "touch";

const GAMEPAD_BUTTONS: Partial<Record<InputAction, number[]>> = {
  fire: [2, 7],
  skill: [4],
  interact: [0],
  swapWeapon: [3],
  pause: [9],
};

const GAMEPAD_PROMPTS: Partial<Record<InputAction, string>> = {
  fire: "X/RT",
  skill: "LB",
  interact: "A",
  swapWeapon: "Y",
  pause: "MENU",
  moveUp: "L-STICK",
  moveDown: "L-STICK",
  moveLeft: "L-STICK",
  moveRight: "L-STICK",
};

export class Input {
  public keys: Record<string, boolean> = {};
  public justPressed: Record<string, boolean> = {};

  private bindings: Record<InputAction, string> = { ...DEFAULT_KEY_BINDINGS };
  private touchActions: Partial<Record<InputAction, boolean>> = {};
  private touchJustPressed: Partial<Record<InputAction, boolean>> = {};
  private gamepadActions: Partial<Record<InputAction, boolean>> = {};
  private gamepadJustPressed: Partial<Record<InputAction, boolean>> = {};
  private virtualKeys: Record<string, boolean> = {};
  private virtualKeyJustPressed: Record<string, boolean> = {};
  private touchKeys: Record<string, boolean> = {};
  private touchKeyJustPressed: Record<string, boolean> = {};
  private touchAxis = { x: 0, y: 0 };
  private gamepadAxis = { x: 0, y: 0 };
  private previousGamepadButtons: boolean[] = [];
  private previousGamepadDirections = { up: false, down: false, left: false, right: false };
  private physicalKeysThisFrame: string[] = [];
  private lastDevice: InputDevice = "keyboard";

  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleKeyUp: (e: KeyboardEvent) => void;
  private handleBlur: () => void;
  private handleVisibilityChange: () => void;

  constructor() {
    this.handleKeyDown = this.onKeyDown.bind(this);
    this.handleKeyUp = this.onKeyUp.bind(this);
    this.handleBlur = () => this.clear();
    this.handleVisibilityChange = () => {
      if (document.hidden) this.clear();
    };

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  private normalizeKey(key: string): string {
    if (key === " " || key === "Spacebar") return " ";
    return key.toLowerCase();
  }

  private onKeyDown(e: KeyboardEvent) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Tab"].includes(e.key)) {
      e.preventDefault();
    }
    const nk = this.normalizeKey(e.key);
    if (!this.keys[nk]) {
      this.justPressed[nk] = true;
      this.physicalKeysThisFrame.push(nk);
    }
    this.keys[nk] = true;
    this.lastDevice = "keyboard";
  }

  private onKeyUp(e: KeyboardEvent) {
    const nk = this.normalizeKey(e.key);
    this.keys[nk] = false;
    this.justPressed[nk] = false;
  }

  public setBindings(bindings: Partial<Record<InputAction, string>>) {
    this.bindings = { ...DEFAULT_KEY_BINDINGS, ...bindings };
  }

  public getBinding(action: InputAction): string {
    return this.bindings[action];
  }

  public getPrompt(action: InputAction): string {
    if (this.lastDevice === "gamepad") return GAMEPAD_PROMPTS[action] ?? action.toUpperCase();
    if (this.lastDevice === "touch") return action === "interact" ? "USE" : action === "swapWeapon" ? "SWAP" : action.toUpperCase();
    return formatBinding(this.bindings[action]);
  }

  public getLastDevice(): InputDevice {
    return this.lastDevice;
  }

  public consumePhysicalKey(): string | undefined {
    return this.physicalKeysThisFrame.shift();
  }

  public beginFrame() {
    this.pollGamepad();
  }

  public update() {
    for (const key in this.justPressed) this.justPressed[key] = false;
    this.touchJustPressed = {};
    this.gamepadJustPressed = {};
    this.virtualKeyJustPressed = {};
    this.touchKeyJustPressed = {};
    this.physicalKeysThisFrame = [];
  }

  public clear() {
    this.keys = {};
    this.justPressed = {};
    this.touchActions = {};
    this.touchJustPressed = {};
    this.gamepadActions = {};
    this.gamepadJustPressed = {};
    this.virtualKeys = {};
    this.virtualKeyJustPressed = {};
    this.touchKeys = {};
    this.touchKeyJustPressed = {};
    this.touchAxis = { x: 0, y: 0 };
    this.gamepadAxis = { x: 0, y: 0 };
    this.previousGamepadButtons = [];
    this.previousGamepadDirections = { up: false, down: false, left: false, right: false };
    this.physicalKeysThisFrame = [];
  }

  public clearJustPressed() {
    this.justPressed = {};
    this.touchJustPressed = {};
    this.gamepadJustPressed = {};
    this.virtualKeyJustPressed = {};
    this.touchKeyJustPressed = {};
    this.physicalKeysThisFrame = [];
  }

  public cleanup() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleBlur);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.clear();
  }

  public isDown(key: string): boolean {
    const normalized = this.normalizeKey(key);
    return !!this.keys[normalized] || !!this.virtualKeys[normalized] || !!this.touchKeys[normalized];
  }

  public wasPressed(key: string): boolean {
    const normalized = this.normalizeKey(key);
    return !!this.justPressed[normalized] || !!this.virtualKeyJustPressed[normalized] || !!this.touchKeyJustPressed[normalized];
  }

  public isActionDown(action: InputAction): boolean {
    return this.isDown(this.bindings[action]) || this.touchActions[action] === true || this.gamepadActions[action] === true;
  }

  public wasActionPressed(action: InputAction): boolean {
    return this.wasPressed(this.bindings[action]) || this.touchJustPressed[action] === true || this.gamepadJustPressed[action] === true;
  }

  public setTouchAxis(x: number, y: number) {
    const length = Math.hypot(x, y);
    this.touchAxis = length > 1 ? { x: x / length, y: y / length } : { x, y };
    this.setTouchVirtualKey("arrowleft", this.touchAxis.x < -0.55);
    this.setTouchVirtualKey("arrowright", this.touchAxis.x > 0.55);
    this.setTouchVirtualKey("arrowup", this.touchAxis.y < -0.55);
    this.setTouchVirtualKey("arrowdown", this.touchAxis.y > 0.55);
    if (Math.abs(x) > 0.05 || Math.abs(y) > 0.05) this.lastDevice = "touch";
  }

  public setTouchAction(action: InputAction, down: boolean) {
    const wasDown = this.touchActions[action] === true;
    this.touchActions[action] = down;
    if (down && !wasDown) this.touchJustPressed[action] = true;
    if (action === "interact") {
      this.setTouchVirtualKey("enter", down);
      this.setTouchVirtualKey(" ", down);
    } else if (action === "pause") {
      this.setTouchVirtualKey("escape", down);
    }
    if (down) this.lastDevice = "touch";
  }

  private setTouchVirtualKey(key: string, down: boolean) {
    const normalized = this.normalizeKey(key);
    const wasDown = this.touchKeys[normalized] === true;
    this.touchKeys[normalized] = down;
    if (down && !wasDown) this.touchKeyJustPressed[normalized] = true;
  }

  private setVirtualKey(key: string, down: boolean) {
    const normalized = this.normalizeKey(key);
    const wasDown = this.virtualKeys[normalized] === true;
    this.virtualKeys[normalized] = down;
    if (down && !wasDown) this.virtualKeyJustPressed[normalized] = true;
  }

  private pollGamepad() {
    const pads = typeof navigator !== "undefined" && navigator.getGamepads
      ? Array.from(navigator.getGamepads()).filter((pad): pad is Gamepad => Boolean(pad && pad.connected))
      : [];
    const pad = pads[0];
    if (!pad) {
      this.gamepadAxis = { x: 0, y: 0 };
      this.gamepadActions = {};
      this.gamepadJustPressed = {};
      this.previousGamepadButtons = [];
      for (const key of ["arrowup", "arrowdown", "arrowleft", "arrowright", "enter", " ", "escape", "q", "e", "p"]) this.setVirtualKey(key, false);
      return;
    }

    const deadzone = 0.22;
    let x = Math.abs(pad.axes[0] ?? 0) >= deadzone ? pad.axes[0] ?? 0 : 0;
    let y = Math.abs(pad.axes[1] ?? 0) >= deadzone ? pad.axes[1] ?? 0 : 0;
    if (Math.hypot(x, y) > 1) {
      const length = Math.hypot(x, y);
      x /= length;
      y /= length;
    }
    const directions = {
      up: y < -0.55 || pad.buttons[12]?.pressed === true,
      down: y > 0.55 || pad.buttons[13]?.pressed === true,
      left: x < -0.55 || pad.buttons[14]?.pressed === true,
      right: x > 0.55 || pad.buttons[15]?.pressed === true,
    };
    const directionKeys: Array<[keyof typeof directions, string]> = [
      ["up", "arrowup"], ["down", "arrowdown"], ["left", "arrowleft"], ["right", "arrowright"],
    ];
    for (const [direction, key] of directionKeys) {
      this.setVirtualKey(key, directions[direction]);
    }
    if (x === 0) x = directions.left ? -1 : directions.right ? 1 : 0;
    if (y === 0) y = directions.up ? -1 : directions.down ? 1 : 0;
    this.gamepadAxis = { x, y };
    this.previousGamepadDirections = directions;

    const buttons = pad.buttons.map(button => button.pressed || button.value > 0.5);
    const pressed = (index: number) => buttons[index] === true;
    const just = (index: number) => pressed(index) && this.previousGamepadButtons[index] !== true;
    const actionEntries = Object.entries(GAMEPAD_BUTTONS) as Array<[InputAction, number[]]>;
    for (const [action, indices] of actionEntries) {
      const down = indices.some(pressed);
      const newlyPressed = indices.some(just);
      this.gamepadActions[action] = down;
      if (newlyPressed) this.gamepadJustPressed[action] = true;
    }

    this.setVirtualKey("enter", pressed(0));
    this.setVirtualKey(" ", pressed(0));
    this.setVirtualKey("escape", pressed(1));
    this.setVirtualKey("q", pressed(3));
    this.setVirtualKey("e", pressed(4));
    this.setVirtualKey("p", pressed(9));

    if (directions.up || directions.down || directions.left || directions.right || buttons.some(Boolean)) {
      this.lastDevice = "gamepad";
    }
    this.previousGamepadButtons = buttons;
  }

  public getAxis(): { x: number; y: number } {
    let x = 0;
    let y = 0;

    const physicalDown = (key: string) => this.keys[this.normalizeKey(key)] === true;
    if (physicalDown(this.bindings.moveLeft) || physicalDown("arrowleft")) x -= 1;
    if (physicalDown(this.bindings.moveRight) || physicalDown("arrowright")) x += 1;
    if (physicalDown(this.bindings.moveUp) || physicalDown("arrowup")) y -= 1;
    if (physicalDown(this.bindings.moveDown) || physicalDown("arrowdown")) y += 1;

    x += this.gamepadAxis.x + this.touchAxis.x;
    y += this.gamepadAxis.y + this.touchAxis.y;
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    return { x, y };
  }
}
