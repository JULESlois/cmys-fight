import { GameState } from "./GameState";
import { Engine } from "../Engine";
import { MenuRenderer } from "../render/MenuRenderer";
import { audio } from "../audio/AudioManager";
import {
  ACTION_LABELS,
  DEFAULT_KEY_BINDINGS,
  INPUT_ACTIONS,
  formatBinding,
  type ColorblindMode,
  type InputAction,
} from "../Settings";

const OPTIONS = [
  "MASTER VOLUME",
  "UI SCALE",
  "SCREEN SHAKE",
  "CRT FILTER",
  "REDUCED FLASH",
  "DYNAMIC BG",
  "COLOR MODE",
  "TOUCH CONTROLS",
  "CONTROLS",
  "FULLSCREEN",
  "EXPORT DATA",
  "IMPORT DATA",
  "RESET TUTORIAL",
  "BACK",
] as const;

type SettingOption = typeof OPTIONS[number];

export class SettingsState extends GameState {
  private selectedIndex = 0;
  private controlIndex = 0;
  private controlsOpen = false;
  private captureAction: InputAction | null = null;
  private message = "";

  constructor(engine: Engine) {
    super(engine);
  }

  enter() {
    this.engine.data.loadSettings();
    this.engine.applySettings();
    this.message = "";
    this.captureAction = null;
  }

  exit() {
    this.engine.data.saveSettings();
    this.engine.applySettings();
  }

  update() {
    if (this.controlsOpen) {
      this.updateControls();
      return;
    }

    if (this.engine.input.wasPressed("escape")) {
      this.engine.switchState("title");
      return;
    }
    if (this.engine.input.wasPressed("arrowup") || this.engine.input.wasPressed("w")) {
      this.selectedIndex = (this.selectedIndex - 1 + OPTIONS.length) % OPTIONS.length;
      audio.playShoot();
    }
    if (this.engine.input.wasPressed("arrowdown") || this.engine.input.wasPressed("s")) {
      this.selectedIndex = (this.selectedIndex + 1) % OPTIONS.length;
      audio.playShoot();
    }

    const option = OPTIONS[this.selectedIndex];
    if (this.engine.input.wasPressed("arrowleft") || this.engine.input.wasPressed("a")) {
      this.adjustSetting(option, -1);
    }
    if (this.engine.input.wasPressed("arrowright") || this.engine.input.wasPressed("d")) {
      this.adjustSetting(option, 1);
    }
    if (this.engine.input.wasPressed("enter") || this.engine.input.wasPressed(" ")) {
      if (option === "BACK") {
        this.engine.switchState("title");
      } else if (option === "CONTROLS") {
        this.controlsOpen = true;
        this.message = "ENTER: REBIND // R: RESET KEYS";
        this.engine.input.clearJustPressed();
      } else if (option === "FULLSCREEN") {
        document.dispatchEvent(new CustomEvent("game:fullscreen"));
        this.message = "FULLSCREEN TOGGLED";
      } else if (option === "EXPORT DATA") {
        document.dispatchEvent(new CustomEvent("game:export-data"));
        this.message = "EXPORT REQUESTED";
      } else if (option === "IMPORT DATA") {
        document.dispatchEvent(new CustomEvent("game:import-data"));
        this.message = "SELECT A SAVE FILE";
      } else if (option === "RESET TUTORIAL") {
        this.engine.data.settings.tutorialCompleted = false;
        this.saveSettings("TUTORIAL WILL START ON NEXT RUN");
      } else {
        this.adjustSetting(option, 1);
      }
    }
  }

  private updateControls() {
    if (this.captureAction) {
      if (this.engine.input.wasPressed("escape")) {
        this.captureAction = null;
        this.message = "REBIND CANCELLED";
        this.engine.input.clearJustPressed();
        return;
      }
      const key = this.engine.input.consumePhysicalKey();
      if (!key || key === "enter") return;
      const settings = this.engine.data.settings;
      const oldKey = settings.keyBindings[this.captureAction];
      const conflictingAction = INPUT_ACTIONS.find(
        action => action !== this.captureAction && settings.keyBindings[action] === key,
      );
      if (conflictingAction) settings.keyBindings[conflictingAction] = oldKey;
      settings.keyBindings[this.captureAction] = key;
      this.captureAction = null;
      this.saveSettings(`${ACTION_LABELS[this.currentAction()]} BOUND TO ${formatBinding(key)}`);
      this.engine.input.clearJustPressed();
      return;
    }

    if (this.engine.input.wasPressed("escape")) {
      this.controlsOpen = false;
      this.message = "";
      return;
    }
    if (this.engine.input.wasPressed("arrowup") || this.engine.input.wasPressed("w")) {
      this.controlIndex = (this.controlIndex - 1 + INPUT_ACTIONS.length) % INPUT_ACTIONS.length;
      audio.playShoot();
    }
    if (this.engine.input.wasPressed("arrowdown") || this.engine.input.wasPressed("s")) {
      this.controlIndex = (this.controlIndex + 1) % INPUT_ACTIONS.length;
      audio.playShoot();
    }
    if (this.engine.input.wasPressed("r")) {
      this.engine.data.settings.keyBindings = { ...DEFAULT_KEY_BINDINGS };
      this.saveSettings("KEY BINDINGS RESET");
    }
    if (this.engine.input.wasPressed("enter") || this.engine.input.wasPressed(" ")) {
      this.captureAction = this.currentAction();
      this.message = `PRESS A KEY FOR ${ACTION_LABELS[this.captureAction]}`;
      this.engine.input.clearJustPressed();
    }
  }

  private currentAction(): InputAction {
    return INPUT_ACTIONS[this.controlIndex];
  }

  private adjustSetting(option: SettingOption, direction: number) {
    const settings = this.engine.data.settings;
    if (option === "MASTER VOLUME") {
      settings.masterVolume = Math.max(0, Math.min(100, settings.masterVolume + direction * 10));
    } else if (option === "UI SCALE") {
      settings.uiScale = Math.max(0.85, Math.min(1.25, Math.round((settings.uiScale + direction * 0.1) * 20) / 20));
    } else if (option === "SCREEN SHAKE") {
      settings.screenShake = !settings.screenShake;
    } else if (option === "CRT FILTER") {
      settings.crtFilter = !settings.crtFilter;
    } else if (option === "REDUCED FLASH") {
      settings.reducedFlashing = !settings.reducedFlashing;
    } else if (option === "DYNAMIC BG") {
      settings.dynamicBackground = !settings.dynamicBackground;
    } else if (option === "TOUCH CONTROLS") {
      settings.touchControls = !settings.touchControls;
    } else if (option === "COLOR MODE") {
      const modes: ColorblindMode[] = ["off", "deuteranopia", "tritanopia"];
      const index = modes.indexOf(settings.colorblindMode);
      settings.colorblindMode = modes[(index + direction + modes.length) % modes.length];
    } else {
      return;
    }
    this.saveSettings(`${option} UPDATED`);
  }

  private saveSettings(message: string) {
    this.engine.data.saveSettings();
    this.engine.applySettings();
    this.message = message;
    audio.playPickup();
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#0A0F19";
    ctx.fillRect(0, 0, 320, 240);
    MenuRenderer.drawTitle(ctx, this.controlsOpen ? "CONTROL BINDINGS" : "SYSTEM SETTINGS", 160, 20);
    MenuRenderer.drawPanel(ctx, 24, 27, 272, 197);

    if (this.controlsOpen) {
      this.drawControls(ctx);
      return;
    }

    const settings = this.engine.data.settings;
    OPTIONS.forEach((option, index) => {
      const y = 42 + index * 12;
      const selected = index === this.selectedIndex;
      ctx.fillStyle = selected ? "rgba(0,242,254,0.16)" : "transparent";
      if (selected) ctx.fillRect(32, y - 9, 256, 12);
      ctx.textAlign = "left";
      ctx.fillStyle = selected ? "#FFFFFF" : "#9AA7B2";
      ctx.font = "bold 7px monospace";
      ctx.fillText(`${selected ? ">" : " "} ${option}`, 36, y);
      ctx.textAlign = "right";
      ctx.fillStyle = "#00F2FE";
      const value = option === "MASTER VOLUME" ? `${settings.masterVolume}%`
        : option === "UI SCALE" ? `${Math.round(settings.uiScale * 100)}%`
          : option === "SCREEN SHAKE" ? (settings.screenShake ? "ON" : "OFF")
            : option === "CRT FILTER" ? (settings.crtFilter ? "ON" : "OFF")
              : option === "REDUCED FLASH" ? (settings.reducedFlashing ? "ON" : "OFF")
                : option === "DYNAMIC BG" ? (settings.dynamicBackground ? "ON" : "OFF")
                  : option === "COLOR MODE" ? settings.colorblindMode.toUpperCase().slice(0, 8)
                    : option === "TOUCH CONTROLS" ? (settings.touchControls ? "AUTO" : "OFF")
                      : option === "CONTROLS" ? "ENTER"
                        : option === "FULLSCREEN" ? "TOGGLE"
                          : option === "EXPORT DATA" ? "DOWNLOAD"
                            : option === "IMPORT DATA" ? "SELECT"
                              : option === "RESET TUTORIAL" ? (settings.tutorialCompleted ? "RESET" : "READY")
                                : "ENTER";
      ctx.fillText(value, 282, y);
    });

    ctx.textAlign = "center";
    ctx.fillStyle = "#F1C40F";
    ctx.font = "6px monospace";
    ctx.fillText(this.message, 160, 211);
    ctx.fillStyle = "#7F8C8D";
    ctx.fillText("ARROWS ADJUST // ENTER SELECT // ESC BACK", 160, 228);
    ctx.textAlign = "left";
  }

  private drawControls(ctx: CanvasRenderingContext2D) {
    const settings = this.engine.data.settings;
    INPUT_ACTIONS.forEach((action, index) => {
      const y = 51 + index * 16;
      const selected = index === this.controlIndex;
      ctx.fillStyle = selected ? "rgba(0,242,254,0.16)" : "transparent";
      if (selected) ctx.fillRect(34, y - 10, 252, 14);
      ctx.textAlign = "left";
      ctx.fillStyle = selected ? "#FFFFFF" : "#9AA7B2";
      ctx.font = "bold 7px monospace";
      ctx.fillText(`${selected ? ">" : " "} ${ACTION_LABELS[action]}`, 40, y);
      ctx.textAlign = "right";
      ctx.fillStyle = this.captureAction === action ? "#F1C40F" : "#00F2FE";
      ctx.fillText(this.captureAction === action ? "PRESS KEY" : formatBinding(settings.keyBindings[action]), 278, y);
    });
    ctx.textAlign = "center";
    ctx.fillStyle = this.captureAction ? "#F1C40F" : "#7F8C8D";
    ctx.font = "6px monospace";
    ctx.fillText(this.message, 160, 204);
    ctx.fillText("ENTER REBIND // R DEFAULTS // ESC BACK", 160, 228);
    ctx.textAlign = "left";
  }
}
