import {
  DEFAULT_KEY_BINDINGS,
  formatBinding,
  type InputAction,
  type TouchLabelMode,
} from "./Settings";

export type InputDevice = "keyboard" | "gamepad" | "touch";
export type UiAction = "confirm" | "cancel" | "up" | "down" | "left" | "right" | "secondary";

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
  pause: "START",
  moveUp: "L-STICK",
  moveDown: "L-STICK",
  moveLeft: "L-STICK",
  moveRight: "L-STICK",
};

const TOUCH_GAMEPAD_PROMPTS: Partial<Record<InputAction, string>> = {
  fire: "X",
  skill: "LB",
  interact: "A",
  swapWeapon: "Y",
  pause: "START",
  moveUp: "D-PAD",
  moveDown: "D-PAD",
  moveLeft: "D-PAD",
  moveRight: "D-PAD",
};

export class Input {
  public keys: Record<string, boolean> = {};
  public justPressed: Record<string, boolean> = {};

  private bindings: Record<InputAction, string> = { ...DEFAULT_KEY_BINDINGS };
  private touchActions: Partial<Record<InputAction, boolean>> = {};
  private touchJustPressed: Partial<Record<InputAction, boolean>> = {};
  private gamepadActions: Partial<Record<InputAction, boolean>> = {};
  private gamepadJustPressed: Partial<Record<InputAction, boolean>> = {};
  private touchUiActions: Partial<Record<UiAction, boolean>> = {};
  private touchUiJustPressed: Partial<Record<UiAction, boolean>> = {};
  private gamepadUiActions: Partial<Record<UiAction, boolean>> = {};
  private gamepadUiJustPressed: Partial<Record<UiAction, boolean>> = {};
  private virtualKeys: Record<string, boolean> = {};
  private virtualKeyJustPressed: Record<string, boolean> = {};
  private touchAxis = { x: 0, y: 0 };
  private gamepadAxis = { x: 0, y: 0 };
  private previousGamepadButtons: boolean[] = [];
  private previousGamepadDirections = { up: false, down: false, left: false, right: false };
  private physicalKeysThisFrame: string[] = [];
  private lastDevice: InputDevice = "keyboard";
  private touchPromptMode: TouchLabelMode = "gamepad";
  private suppressedKeys = new Set<string>();
  private suppressedGamepadButtons = new Set<number>();
  private suppressedTouchActions = new Set<InputAction>();
  private suppressedTouchUiActions = new Set<UiAction>();
  private suppressGamepadAxisUntilNeutral = false;
  private suppressTouchAxisUntilNeutral = false;

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
    if (!this.keys[nk] && !this.suppressedKeys.has(nk)) {
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
    this.suppressedKeys.delete(nk);
  }

  public setBindings(bindings: Partial<Record<InputAction, string>>) {
    this.bindings = { ...DEFAULT_KEY_BINDINGS, ...bindings };
  }

  public getBinding(action: InputAction): string {
    return this.bindings[action];
  }

  public getPrompt(action: InputAction): string {
    if (this.lastDevice === "gamepad") return GAMEPAD_PROMPTS[action] ?? action.toUpperCase();
    if (this.lastDevice === "touch") {
      return this.touchPromptMode === "keyboard"
        ? formatBinding(this.bindings[action])
        : TOUCH_GAMEPAD_PROMPTS[action] ?? action.toUpperCase();
    }
    return formatBinding(this.bindings[action]);
  }

  public setTouchPromptMode(mode: TouchLabelMode): void {
    this.touchPromptMode = mode;
  }

  public getCancelPrompt(): string {
    return this.getUiPrompt("cancel");
  }

  public getConfirmPrompt(): string {
    return this.getUiPrompt("confirm");
  }

  public getUiPrompt(action: UiAction): string {
    if (this.lastDevice === "gamepad" || (this.lastDevice === "touch" && this.touchPromptMode === "gamepad")) {
      if (action === "confirm") return "A";
      if (action === "cancel") return "B";
      if (action === "secondary") return "X";
      return "D-PAD";
    }
    if (action === "confirm") return "ENTER";
    if (action === "cancel") return "ESC";
    if (action === "secondary") return "R";
    if (action === "up") return formatBinding(this.bindings.moveUp);
    if (action === "down") return formatBinding(this.bindings.moveDown);
    if (action === "left") return formatBinding(this.bindings.moveLeft);
    return formatBinding(this.bindings.moveRight);
  }

  public getNavigationPrompt(axis: "horizontal" | "vertical"): string {
    if (this.lastDevice === "gamepad" || (this.lastDevice === "touch" && this.touchPromptMode === "gamepad")) {
      return "D-PAD";
    }
    return axis === "horizontal"
      ? `${formatBinding(this.bindings.moveLeft)}/${formatBinding(this.bindings.moveRight)}`
      : `${formatBinding(this.bindings.moveUp)}/${formatBinding(this.bindings.moveDown)}`;
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
    this.touchUiJustPressed = {};
    this.gamepadUiJustPressed = {};
    this.virtualKeyJustPressed = {};
    this.physicalKeysThisFrame = [];
  }

  public clear() {
    this.keys = {};
    this.justPressed = {};
    this.touchActions = {};
    this.touchJustPressed = {};
    this.gamepadActions = {};
    this.gamepadJustPressed = {};
    this.touchUiActions = {};
    this.touchUiJustPressed = {};
    this.gamepadUiActions = {};
    this.gamepadUiJustPressed = {};
    this.virtualKeys = {};
    this.virtualKeyJustPressed = {};
    this.touchAxis = { x: 0, y: 0 };
    this.gamepadAxis = { x: 0, y: 0 };
    this.previousGamepadButtons = [];
    this.previousGamepadDirections = { up: false, down: false, left: false, right: false };
    this.physicalKeysThisFrame = [];
    this.suppressedKeys.clear();
    this.suppressedGamepadButtons.clear();
    this.suppressedTouchActions.clear();
    this.suppressedTouchUiActions.clear();
    this.suppressGamepadAxisUntilNeutral = false;
    this.suppressTouchAxisUntilNeutral = false;
  }

  public clearJustPressed() {
    this.justPressed = {};
    this.touchJustPressed = {};
    this.gamepadJustPressed = {};
    this.touchUiJustPressed = {};
    this.gamepadUiJustPressed = {};
    this.virtualKeyJustPressed = {};
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
    if (this.suppressedKeys.has(normalized)) return false;
    return !!this.keys[normalized] || !!this.virtualKeys[normalized];
  }

  public wasPressed(key: string): boolean {
    const normalized = this.normalizeKey(key);
    if (this.suppressedKeys.has(normalized)) return false;
    return !!this.justPressed[normalized] || !!this.virtualKeyJustPressed[normalized];
  }

  public isActionDown(action: InputAction): boolean {
    const touchDown = this.touchActions[action] === true && !this.suppressedTouchActions.has(action);
    return this.isDown(this.bindings[action]) || touchDown || this.gamepadActions[action] === true;
  }

  public wasActionPressed(action: InputAction): boolean {
    const touchPressed = this.touchJustPressed[action] === true && !this.suppressedTouchActions.has(action);
    return this.wasPressed(this.bindings[action]) || touchPressed || this.gamepadJustPressed[action] === true;
  }

  public wasUiPressed(action: UiAction): boolean {
    if (this.gamepadUiJustPressed[action] || this.touchUiJustPressed[action]) return true;
    if (action === "confirm") {
      return this.wasPressed("enter") || this.wasPressed(" ") || this.wasActionPressed("interact");
    }
    if (action === "cancel") return this.wasPressed("escape");
    if (action === "secondary") {
      if (this.lastDevice === "touch") {
        return this.touchJustPressed.fire === true && !this.suppressedTouchActions.has("fire");
      }
      return this.wasPressed("r");
    }
    if (action === "up") return this.wasPressed("arrowup") || this.wasPressed(this.bindings.moveUp);
    if (action === "down") return this.wasPressed("arrowdown") || this.wasPressed(this.bindings.moveDown);
    if (action === "left") return this.wasPressed("arrowleft") || this.wasPressed(this.bindings.moveLeft);
    return this.wasPressed("arrowright") || this.wasPressed(this.bindings.moveRight);
  }

  public setTouchAxis(x: number, y: number) {
    const length = Math.hypot(x, y);
    this.touchAxis = length > 1 ? { x: x / length, y: y / length } : { x, y };
    const active = Math.abs(this.touchAxis.x) > 0.55 || Math.abs(this.touchAxis.y) > 0.55;
    if (this.suppressTouchAxisUntilNeutral) {
      if (!active) this.suppressTouchAxisUntilNeutral = false;
      this.touchAxis = { x: 0, y: 0 };
    }
    this.setVirtualKey("arrowleft", !this.suppressTouchAxisUntilNeutral && this.touchAxis.x < -0.55);
    this.setVirtualKey("arrowright", !this.suppressTouchAxisUntilNeutral && this.touchAxis.x > 0.55);
    this.setVirtualKey("arrowup", !this.suppressTouchAxisUntilNeutral && this.touchAxis.y < -0.55);
    this.setVirtualKey("arrowdown", !this.suppressTouchAxisUntilNeutral && this.touchAxis.y > 0.55);
    if (Math.abs(x) > 0.05 || Math.abs(y) > 0.05) this.lastDevice = "touch";
  }

  public setTouchAction(action: InputAction, down: boolean) {
    const wasDown = this.touchActions[action] === true;
    this.touchActions[action] = down;
    if (down && !wasDown && !this.suppressedTouchActions.has(action)) this.touchJustPressed[action] = true;
    if (!down) this.suppressedTouchActions.delete(action);
    if (down) this.lastDevice = "touch";
  }

  public setTouchUiAction(action: UiAction, down: boolean) {
    const wasDown = this.touchUiActions[action] === true;
    this.touchUiActions[action] = down;
    if (down && !wasDown && !this.suppressedTouchUiActions.has(action)) this.touchUiJustPressed[action] = true;
    if (!down) this.suppressedTouchUiActions.delete(action);
    if (down) this.lastDevice = "touch";
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
      this.gamepadUiActions = {};
      this.gamepadUiJustPressed = {};
      this.previousGamepadButtons = [];
      this.suppressedGamepadButtons.clear();
      this.suppressGamepadAxisUntilNeutral = false;
      for (const key of ["arrowup", "arrowdown", "arrowleft", "arrowright"]) this.setVirtualKey(key, false);
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
    const anyDirection = directions.up || directions.down || directions.left || directions.right;
    if (this.suppressGamepadAxisUntilNeutral) {
      if (!anyDirection) this.suppressGamepadAxisUntilNeutral = false;
      x = 0;
      y = 0;
    }
    const directionKeys: Array<[keyof typeof directions, string]> = [
      ["up", "arrowup"], ["down", "arrowdown"], ["left", "arrowleft"], ["right", "arrowright"],
    ];
    for (const [direction, key] of directionKeys) {
      this.setVirtualKey(key, !this.suppressGamepadAxisUntilNeutral && directions[direction]);
    }
    if (x === 0) x = directions.left ? -1 : directions.right ? 1 : 0;
    if (y === 0) y = directions.up ? -1 : directions.down ? 1 : 0;
    if (this.suppressGamepadAxisUntilNeutral) {
      x = 0;
      y = 0;
    }
    this.gamepadAxis = { x, y };
    this.previousGamepadDirections = directions;

    const buttons = pad.buttons.map(button => button.pressed || button.value > 0.5);
    for (let index = 0; index < buttons.length; index++) {
      if (!buttons[index]) this.suppressedGamepadButtons.delete(index);
    }
    const pressed = (index: number) => buttons[index] === true && !this.suppressedGamepadButtons.has(index);
    const just = (index: number) => pressed(index) && this.previousGamepadButtons[index] !== true;
    const actionEntries = Object.entries(GAMEPAD_BUTTONS) as Array<[InputAction, number[]]>;
    for (const [action, indices] of actionEntries) {
      const down = indices.some(pressed);
      const newlyPressed = indices.some(just);
      this.gamepadActions[action] = down;
      if (newlyPressed) this.gamepadJustPressed[action] = true;
    }

    const uiButtons: Array<[UiAction, number]> = [
      ["confirm", 0],
      ["cancel", 1],
      ["secondary", 2],
    ];
    for (const [action, index] of uiButtons) {
      this.gamepadUiActions[action] = pressed(index);
      if (just(index)) this.gamepadUiJustPressed[action] = true;
    }

    if (anyDirection || buttons.some(Boolean)) this.lastDevice = "gamepad";
    this.previousGamepadButtons = buttons;
  }

  public getAxis(): { x: number; y: number } {
    let x = 0;
    let y = 0;

    const physicalDown = (key: string) => this.keys[this.normalizeKey(key)] === true && !this.suppressedKeys.has(this.normalizeKey(key));
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

  public suppressUntilReleased(): void {
    this.clearJustPressed();
    for (const [key, down] of Object.entries(this.keys)) {
      if (down) this.suppressedKeys.add(key);
    }
    this.previousGamepadButtons.forEach((down, index) => {
      if (down) this.suppressedGamepadButtons.add(index);
    });
    for (const [action, down] of Object.entries(this.touchActions) as Array<[InputAction, boolean]>) {
      if (down) this.suppressedTouchActions.add(action);
    }
    for (const [action, down] of Object.entries(this.touchUiActions) as Array<[UiAction, boolean]>) {
      if (down) this.suppressedTouchUiActions.add(action);
    }
    const gamepadDirectionHeld = Object.values(this.previousGamepadDirections).some(Boolean) || Math.hypot(this.gamepadAxis.x, this.gamepadAxis.y) > 0.2;
    const touchDirectionHeld = Math.hypot(this.touchAxis.x, this.touchAxis.y) > 0.2;
    this.suppressGamepadAxisUntilNeutral ||= gamepadDirectionHeld;
    this.suppressTouchAxisUntilNeutral ||= touchDirectionHeld;
    if (gamepadDirectionHeld || touchDirectionHeld) {
      this.gamepadAxis = { x: 0, y: 0 };
      this.touchAxis = { x: 0, y: 0 };
      for (const key of ["arrowup", "arrowdown", "arrowleft", "arrowright"]) {
        this.virtualKeys[key] = false;
        this.virtualKeyJustPressed[key] = false;
      }
    }
  }
}
