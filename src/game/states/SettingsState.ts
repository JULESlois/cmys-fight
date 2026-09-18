import { GameState } from "./GameState";
import { Engine } from "../Engine";
import { MenuRenderer } from "../render/MenuRenderer";
import { audio } from "../audio/AudioManager";
import { drawMeter, drawPixelButton, UI_COLORS } from "../render/PixelUi";
import { cursorPulse } from "../ui/UiMotion";
import {
  DEFAULT_KEY_BINDINGS,
  INPUT_ACTIONS,
  formatBinding,
  type ColorblindMode,
  type InputAction,
  type Language,
  type MusicMode,
  type TouchHandedness,
  type TouchLabelMode,
} from "../Settings";
import { actionLabel, t, uiFont } from "../i18n";

const SETTING_OPTIONS = [
  "language",
  "masterVolume",
  "musicVolume",
  "musicSource",
  "uiScale",
  "screenShake",
  "reducedFlash",
  "dynamicBg",
  "colorMode",
  "touchControls",
  "touchLayout",
  "touchSize",
  "touchLabels",
  "controls",
  "fullscreen",
  "exportData",
  "importData",
  "resetTutorial",
  "resetGame",
] as const;

type SettingOption = typeof SETTING_OPTIONS[number];
type SettingsCategory = "audioVisual" | "operation" | "accountData";
type SettingsView = "root" | SettingsCategory | "keyBindings";
type SettingsMenuOption = SettingOption | SettingsCategory | "categoryBack" | "back";

const ROOT_OPTIONS: readonly SettingsMenuOption[] = ["audioVisual", "operation", "accountData", "back"];
const AUDIO_VISUAL_OPTIONS: readonly SettingsMenuOption[] = [
  "language",
  "masterVolume",
  "musicVolume",
  "musicSource",
  "uiScale",
  "fullscreen",
  "screenShake",
  "reducedFlash",
  "dynamicBg",
  "colorMode",
  "categoryBack",
];
const OPERATION_OPTIONS: readonly SettingsMenuOption[] = [
  "touchControls",
  "touchLayout",
  "touchSize",
  "controls",
  "categoryBack",
];
const ACCOUNT_DATA_OPTIONS: readonly SettingsMenuOption[] = [
  "exportData",
  "importData",
  "resetGame",
  "categoryBack",
];

const OPTION_KEYS: Record<SettingOption, Parameters<typeof t>[1]> = {
  language: "settings.language",
  masterVolume: "settings.masterVolume",
  musicVolume: "settings.musicVolume",
  musicSource: "settings.musicSource",
  uiScale: "settings.uiScale",
  screenShake: "settings.screenShake",
  reducedFlash: "settings.reducedFlash",
  dynamicBg: "settings.dynamicBg",
  colorMode: "settings.colorMode",
  touchControls: "settings.touchControls",
  touchLayout: "settings.touchLayout",
  touchSize: "settings.touchSize",
  touchLabels: "settings.touchLabels",
  controls: "settings.controls",
  fullscreen: "settings.fullscreen",
  exportData: "settings.exportData",
  importData: "settings.importData",
  resetTutorial: "settings.resetTutorial",
  resetGame: "settings.resetGame",
};

const CATEGORY_KEYS: Record<SettingsCategory, Parameters<typeof t>[1]> = {
  audioVisual: "settings.audioVisual",
  operation: "settings.operation",
  accountData: "settings.accountData",
};

const SETTING_OPTION_SET = new Set<string>(SETTING_OPTIONS);

export class SettingsState extends GameState {
  private selectedIndex = 0;
  private controlIndex = 0;
  private view: SettingsView = "root";
  private captureAction: InputAction | null = null;
  private message = "";
  private overlayMode = false;
  private backState: "title" | "hub" = "hub";
  private resetConfirmation = false;

  constructor(engine: Engine) {
    super(engine);
  }

  enter(params?: { overlay?: boolean; backState?: "title" | "hub" }) {
    this.engine.data.loadSettings();
    this.engine.applySettings();
    this.overlayMode = params?.overlay === true;
    this.backState = params?.backState === "title" ? "title" : "hub";
    this.view = "root";
    this.selectedIndex = 0;
    this.controlIndex = 0;
    this.message = "";
    this.captureAction = null;
    this.resetConfirmation = false;
  }

  exit() {
    this.engine.data.saveSettings();
    this.engine.applySettings();
  }

  update() {
    if (this.view === "keyBindings") {
      this.updateControls();
      return;
    }

    if (this.engine.input.wasUiPressed("cancel")) {
      if (this.resetConfirmation) {
        this.resetConfirmation = false;
        this.message = "";
      } else if (this.view !== "root") {
        audio.playUiCancel();
        this.openView("root");
      } else {
        this.leaveSettings();
      }
      return;
    }

    const options = this.getCurrentOptions();
    if (this.engine.input.wasUiPressed("up")) {
      this.selectedIndex = (this.selectedIndex - 1 + options.length) % options.length;
      this.clearConfirmationAndMessage();
      audio.playUiMove();
    }
    if (this.engine.input.wasUiPressed("down")) {
      this.selectedIndex = (this.selectedIndex + 1) % options.length;
      this.clearConfirmationAndMessage();
      audio.playUiMove();
    }

    const option = options[this.selectedIndex];
    if (this.engine.input.wasUiPressed("left")) {
      if (this.resetConfirmation) this.clearConfirmationAndMessage();
      else if (this.isSettingOption(option)) this.adjustSetting(option, -1);
    }
    if (this.engine.input.wasUiPressed("right")) {
      if (this.resetConfirmation) this.clearConfirmationAndMessage();
      else if (this.isSettingOption(option)) this.adjustSetting(option, 1);
    }
    if (this.engine.input.wasUiPressed("confirm")) this.activateOption(option);
  }

  private getCurrentOptions(): readonly SettingsMenuOption[] {
    if (this.view === "audioVisual") return AUDIO_VISUAL_OPTIONS;
    if (this.view === "operation") return OPERATION_OPTIONS;
    if (this.view === "accountData") return ACCOUNT_DATA_OPTIONS;
    return ROOT_OPTIONS;
  }

  private isSettingOption(option: SettingsMenuOption): option is SettingOption {
    return SETTING_OPTION_SET.has(option);
  }

  private activateOption(option: SettingsMenuOption): void {
    const language = this.engine.data.settings.language;
    if (option === "back") {
      this.leaveSettings();
      return;
    }
    if (option === "categoryBack") {
      audio.playUiCancel();
      this.openView("root");
      return;
    }
    if (option === "audioVisual" || option === "operation" || option === "accountData") {
      audio.playUiConfirm();
      this.openView(option);
      return;
    }
    if (option === "controls") {
      audio.playUiConfirm();
      this.view = "keyBindings";
      this.controlIndex = 0;
      this.message = "";
      this.captureAction = null;
      this.engine.input.clearJustPressed();
      return;
    }
    if (option === "fullscreen") {
      audio.playUiConfirm();
      document.dispatchEvent(new CustomEvent("game:fullscreen"));
      this.message = t(language, "settings.fullscreenToggled");
      return;
    }
    if (option === "exportData") {
      audio.playUiConfirm();
      document.dispatchEvent(new CustomEvent("game:export-data"));
      this.message = t(language, "settings.exportRequested");
      return;
    }
    if (option === "importData") {
      audio.playUiConfirm();
      document.dispatchEvent(new CustomEvent("game:import-data"));
      this.message = t(language, "settings.selectSave");
      return;
    }
    if (option === "resetTutorial") {
      this.engine.data.settings.tutorialCompleted = false;
      this.saveSettings(t(language, "settings.tutorialNextRun"), "confirm");
      return;
    }
    if (option === "resetGame") {
      audio.playUiConfirm();
      if (!this.resetConfirmation) {
        this.resetConfirmation = true;
        this.message = t(language, "settings.confirmResetGame", {
          confirm: this.engine.input.getConfirmPrompt(),
        });
      } else {
        this.engine.resetGameFromMenu();
      }
      return;
    }
    this.adjustSetting(option, 1);
  }

  private openView(view: SettingsView): void {
    this.view = view;
    this.selectedIndex = 0;
    this.clearConfirmationAndMessage();
    this.engine.input.clearJustPressed();
  }

  private clearConfirmationAndMessage(): void {
    this.resetConfirmation = false;
    this.message = "";
  }

  private leaveSettings() {
    audio.playUiCancel();
    if (this.overlayMode) this.engine.closeSettingsToMenu();
    else this.engine.switchState(this.backState);
  }

  private updateControls() {
    const language = this.engine.data.settings.language;
    if (this.captureAction) {
      if (this.engine.input.wasUiPressed("cancel")) {
        this.captureAction = null;
        this.message = t(language, "settings.rebindCancelled");
        this.engine.input.clearJustPressed();
        return;
      }
      const key = this.engine.input.consumePhysicalKey();
      if (!key) return;
      const settings = this.engine.data.settings;
      const oldKey = settings.keyBindings[this.captureAction];
      const conflictingAction = INPUT_ACTIONS.find(
        action => action !== this.captureAction && settings.keyBindings[action] === key,
      );
      if (conflictingAction) settings.keyBindings[conflictingAction] = oldKey;
      settings.keyBindings[this.captureAction] = key;
      const reboundAction = this.captureAction;
      this.captureAction = null;
      this.saveSettings(t(language, "settings.bound", {
        action: actionLabel(reboundAction, language),
        key: formatBinding(key),
      }), "confirm");
      this.engine.input.clearJustPressed();
      return;
    }

    if (this.engine.input.wasUiPressed("cancel")) {
      audio.playUiCancel();
      this.view = "operation";
      this.selectedIndex = OPERATION_OPTIONS.indexOf("controls");
      this.message = "";
      this.engine.input.clearJustPressed();
      return;
    }
    if (this.engine.input.wasUiPressed("up")) {
      this.controlIndex = (this.controlIndex - 1 + INPUT_ACTIONS.length) % INPUT_ACTIONS.length;
      audio.playUiMove();
    }
    if (this.engine.input.wasUiPressed("down")) {
      this.controlIndex = (this.controlIndex + 1) % INPUT_ACTIONS.length;
      audio.playUiMove();
    }
    if (this.engine.input.wasUiPressed("secondary")) {
      this.engine.data.settings.keyBindings = { ...DEFAULT_KEY_BINDINGS };
      this.saveSettings(t(language, "settings.keysReset"), "confirm");
    }
    if (this.engine.input.wasUiPressed("confirm")) {
      this.captureAction = this.currentAction();
      this.message = t(language, "settings.pressKey", {
        action: actionLabel(this.captureAction, language),
      });
      this.engine.input.clearJustPressed();
    }
  }

  private currentAction(): InputAction {
    return INPUT_ACTIONS[this.controlIndex];
  }

  private adjustSetting(option: SettingOption, direction: number) {
    const settings = this.engine.data.settings;
    if (option === "language") {
      const languages: Language[] = ["en", "zh-CN"];
      const index = languages.indexOf(settings.language);
      settings.language = languages[(index + direction + languages.length) % languages.length];
    } else if (option === "masterVolume") {
      settings.masterVolume = Math.max(0, Math.min(100, settings.masterVolume + direction * 10));
    } else if (option === "musicVolume") {
      settings.musicVolume = Math.max(0, Math.min(100, settings.musicVolume + direction * 10));
    } else if (option === "musicSource") {
      const modes: MusicMode[] = ["adaptive", "off"];
      const index = modes.indexOf(settings.musicMode);
      settings.musicMode = modes[(index + direction + modes.length) % modes.length];
    } else if (option === "uiScale") {
      settings.uiScale = Math.max(0.85, Math.min(1.25, Math.round((settings.uiScale + direction * 0.1) * 20) / 20));
    } else if (option === "screenShake") {
      settings.screenShake = !settings.screenShake;
    } else if (option === "reducedFlash") {
      settings.reducedFlashing = !settings.reducedFlashing;
    } else if (option === "dynamicBg") {
      settings.dynamicBackground = !settings.dynamicBackground;
    } else if (option === "touchControls") {
      settings.touchControls = !settings.touchControls;
    } else if (option === "touchLayout") {
      const layouts: TouchHandedness[] = ["right", "left"];
      const index = layouts.indexOf(settings.touchHandedness);
      settings.touchHandedness = layouts[(index + direction + layouts.length) % layouts.length];
    } else if (option === "touchSize") {
      settings.touchScale = Math.max(0.85, Math.min(1.15, Math.round((settings.touchScale + direction * 0.1) * 20) / 20));
    } else if (option === "touchLabels") {
      const modes: TouchLabelMode[] = ["gamepad", "keyboard"];
      const index = modes.indexOf(settings.touchLabelMode);
      settings.touchLabelMode = modes[(index + direction + modes.length) % modes.length];
    } else if (option === "colorMode") {
      const modes: ColorblindMode[] = ["off", "deuteranopia", "tritanopia"];
      const index = modes.indexOf(settings.colorblindMode);
      settings.colorblindMode = modes[(index + direction + modes.length) % modes.length];
    } else {
      return;
    }
    this.saveSettings("");
  }

  private saveSettings(message: string, sound: "move" | "confirm" = "move") {
    this.engine.data.saveSettings();
    this.engine.applySettings();
    this.message = message;
    if (sound === "confirm") audio.playUiConfirm();
    else audio.playUiMove();
  }

  private getValue(option: SettingsMenuOption): string {
    const settings = this.engine.data.settings;
    const language = settings.language;
    const bool = (value: boolean) => t(language, value ? "common.on" : "common.off");
    if (option === "audioVisual" || option === "operation" || option === "accountData") {
      return this.engine.input.getConfirmPrompt();
    }
    if (option === "categoryBack" || option === "back") return this.engine.input.getCancelPrompt();
    if (option === "language") return t(language, language === "zh-CN" ? "language.chinese" : "language.english");
    if (option === "masterVolume") return `${settings.masterVolume}%`;
    if (option === "musicVolume") return `${settings.musicVolume}%`;
    if (option === "musicSource") return t(language, settings.musicMode === "adaptive" ? "value.adaptive" : "common.off");
    if (option === "uiScale") return `${Math.round(settings.uiScale * 100)}%`;
    if (option === "screenShake") return bool(settings.screenShake);
    if (option === "reducedFlash") return bool(settings.reducedFlashing);
    if (option === "dynamicBg") return bool(settings.dynamicBackground);
    if (option === "colorMode") {
      if (settings.colorblindMode === "off") return t(language, "common.off");
      return t(language, settings.colorblindMode === "deuteranopia" ? "value.deuteranopia" : "value.tritanopia");
    }
    if (option === "touchControls") return settings.touchControls ? t(language, "common.auto") : t(language, "common.off");
    if (option === "touchLayout") return t(language, settings.touchHandedness === "right" ? "value.right" : "value.left");
    if (option === "touchSize") return `${Math.round(settings.touchScale * 100)}%`;
    if (option === "touchLabels") return t(language, settings.touchLabelMode === "gamepad" ? "value.gamepad" : "value.keyboard");
    if (option === "controls") return this.engine.input.getConfirmPrompt();
    if (option === "fullscreen") return t(language, "common.toggle");
    if (option === "exportData") return t(language, "common.download");
    if (option === "importData") return t(language, "common.select");
    if (option === "resetTutorial") return t(language, settings.tutorialCompleted ? "common.reset" : "common.ready");
    if (option === "resetGame") return t(language, "common.reset");
    return "";
  }

  /**
   * Numeric settings render as a segmented meter between the label and the
   * value, so the ◀▶ adjustment range reads at a glance instead of forcing the
   * player to decode a bare percentage.
   */
  private getSettingMeter(option: SettingOption): { ratio: number; segments: number } | null {
    const settings = this.engine.data.settings;
    if (option === "masterVolume") return { ratio: settings.masterVolume / 100, segments: 10 };
    if (option === "musicVolume") return { ratio: settings.musicVolume / 100, segments: 10 };
    if (option === "uiScale") return { ratio: (settings.uiScale - 0.85) / 0.4, segments: 4 };
    if (option === "touchSize") return { ratio: (settings.touchScale - 0.85) / 0.3, segments: 3 };
    return null;
  }

  private getLabel(option: SettingsMenuOption): string {
    const language = this.engine.data.settings.language;
    if (option === "audioVisual" || option === "operation" || option === "accountData") {
      return t(language, CATEGORY_KEYS[option]);
    }
    if (option === "categoryBack" || option === "back") return t(language, "common.back");
    return t(language, OPTION_KEYS[option]);
  }

  private getTitleKey(): Parameters<typeof t>[1] {
    if (this.view === "audioVisual" || this.view === "operation" || this.view === "accountData") {
      return CATEGORY_KEYS[this.view];
    }
    if (this.view === "keyBindings") return "settings.controlsTitle";
    return "settings.title";
  }

  draw(ctx: CanvasRenderingContext2D) {
    const language = this.engine.data.settings.language;
    ctx.fillStyle = UI_COLORS.backdrop;
    ctx.fillRect(0, 0, 320, 240);
    MenuRenderer.drawTitle(ctx, t(language, this.getTitleKey()), 160, 20, language);
    MenuRenderer.drawPanel(ctx, 24, 27, 272, 197);

    if (this.view === "keyBindings") {
      this.drawControls(ctx);
      return;
    }
    if (this.view === "root") this.drawRoot(ctx);
    else this.drawSubmenu(ctx);
  }

  private drawRoot(ctx: CanvasRenderingContext2D): void {
    const language = this.engine.data.settings.language;
    const time = Date.now() / 1000;
    const reducedFlashing = this.engine.data.settings.reducedFlashing === true;
    ROOT_OPTIONS.forEach((option, index) => {
      const y = 52 + index * 39;
      const selected = index === this.selectedIndex;
      const pulse = selected ? cursorPulse(time, reducedFlashing) : 0;
      drawPixelButton(ctx, 48, y, 224, 27, selected, "cyan", pulse);
      ctx.textAlign = "left";
      ctx.fillStyle = selected ? UI_COLORS.white : UI_COLORS.text;
      ctx.font = uiFont(language, 8, true);
      ctx.fillText(this.getLabel(option), 60, y + 17);
      ctx.textAlign = "right";
      ctx.fillStyle = selected ? UI_COLORS.cyan : UI_COLORS.muted;
      ctx.fillText(this.getValue(option), 260, y + 17);
    });
    this.drawFooter(ctx, false);
  }

  private drawSubmenu(ctx: CanvasRenderingContext2D): void {
    const language = this.engine.data.settings.language;
    const time = Date.now() / 1000;
    const reducedFlashing = this.engine.data.settings.reducedFlashing === true;
    const options = this.getCurrentOptions();
    const spacing = Math.min(14, Math.floor(154 / Math.max(1, options.length - 1)));
    options.forEach((option, index) => {
      const y = 47 + index * spacing;
      const selected = index === this.selectedIndex;
      if (selected) {
        ctx.fillStyle = "rgba(57, 217, 232, 0.16)";
        ctx.fillRect(32, y - 8, 256, 11);
        // Breathing caret on the focused row, matching MenuState's pause menu.
        const pulse = cursorPulse(time, reducedFlashing);
        ctx.fillStyle = `rgba(255,255,255,${(0.55 + 0.45 * pulse).toFixed(2)})`;
        ctx.fillRect(28, y - 3, 2, 6);
      }
      ctx.textAlign = "left";
      ctx.fillStyle = selected ? UI_COLORS.white : UI_COLORS.text;
      ctx.font = uiFont(language, 6, true);
      ctx.fillText(this.getLabel(option), 36, y);
      ctx.textAlign = "right";
      ctx.fillStyle = selected ? UI_COLORS.cyan : UI_COLORS.text;
      ctx.fillText(this.getValue(option), 282, y);
      if (this.isSettingOption(option)) {
        const meter = this.getSettingMeter(option);
        if (meter) {
          drawMeter(ctx, 196, y - 4, 52, 4, meter.ratio, selected ? UI_COLORS.cyanBright : UI_COLORS.cyan, meter.segments);
        }
      }
    });
    this.drawFooter(ctx, true);
  }

  private drawFooter(ctx: CanvasRenderingContext2D, showMessage: boolean): void {
    const language = this.engine.data.settings.language;
    ctx.textAlign = "center";
    if (showMessage && this.message) {
      ctx.fillStyle = this.resetConfirmation ? UI_COLORS.red : UI_COLORS.yellow;
      ctx.font = uiFont(language, 6);
      ctx.fillText(this.message, 160, 211);
    }
    ctx.fillStyle = UI_COLORS.muted;
    ctx.font = uiFont(language, 6);
    ctx.fillText(t(language, "settings.footer", {
      vertical: this.engine.input.getNavigationPrompt("vertical"),
      horizontal: this.engine.input.getNavigationPrompt("horizontal"),
      confirm: this.engine.input.getConfirmPrompt(),
      cancel: this.engine.input.getCancelPrompt(),
    }), 160, 228);
    ctx.textAlign = "left";
  }

  private drawControls(ctx: CanvasRenderingContext2D) {
    const settings = this.engine.data.settings;
    const language = settings.language;
    const time = Date.now() / 1000;
    const reducedFlashing = settings.reducedFlashing === true;
    INPUT_ACTIONS.forEach((action, index) => {
      // 14px rows from y=45 keep all 12 actions (v10 added subWeapon/crush)
      // above the message line at 204 and the footer at 228.
      const y = 45 + index * 14;
      const selected = index === this.controlIndex;
      if (selected) {
        ctx.fillStyle = "rgba(57, 217, 232, 0.16)";
        ctx.fillRect(34, y - 9, 252, 12);
        const pulse = cursorPulse(time, reducedFlashing);
        ctx.fillStyle = `rgba(255,255,255,${(0.55 + 0.45 * pulse).toFixed(2)})`;
        ctx.fillRect(30, y - 4, 2, 6);
      }
      ctx.textAlign = "left";
      ctx.fillStyle = selected ? UI_COLORS.white : UI_COLORS.text;
      ctx.font = uiFont(language, 7, true);
      ctx.fillText(actionLabel(action, language), 40, y);
      ctx.textAlign = "right";
      ctx.fillStyle = this.captureAction === action ? UI_COLORS.yellow : UI_COLORS.cyan;
      ctx.fillText(this.captureAction === action ? t(language, "settings.pressKeyShort") : formatBinding(settings.keyBindings[action]), 278, y);
    });
    ctx.textAlign = "center";
    ctx.fillStyle = this.captureAction ? UI_COLORS.yellow : UI_COLORS.muted;
    ctx.font = uiFont(language, 6);
    ctx.fillText(this.message, 160, 204);
    ctx.fillText(t(language, "settings.controlsFooter", {
      vertical: this.engine.input.getNavigationPrompt("vertical"),
      confirm: this.engine.input.getConfirmPrompt(),
      reset: this.engine.input.getUiPrompt("secondary"),
      cancel: this.engine.input.getCancelPrompt(),
    }), 160, 228);
    ctx.textAlign = "left";
  }
}
