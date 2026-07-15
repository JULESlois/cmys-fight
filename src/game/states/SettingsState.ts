import { GameState } from "./GameState";
import { Engine } from "../Engine";
import { MenuRenderer } from "../render/MenuRenderer";
import { audio } from "../audio/AudioManager";
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
import { drawBadge, drawMeter, drawPixelButton, drawPixelPanel, drawSectionLabel, UI_COLORS } from "../render/PixelUi";

const SETTING_OPTIONS = [
  "language",
  "masterVolume",
  "musicVolume",
  "musicSource",
  "uiScale",
  "screenShake",
  "crtFilter",
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
  "crtFilter",
  "reducedFlash",
  "dynamicBg",
  "colorMode",
  "categoryBack",
];
const OPERATION_OPTIONS: readonly SettingsMenuOption[] = [
  "touchControls",
  "touchLayout",
  "touchSize",
  "touchLabels",
  "controls",
  "resetTutorial",
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
  crtFilter: "settings.crtFilter",
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
  private resetConfirmation = false;

  constructor(engine: Engine) {
    super(engine);
  }

  enter(params?: { overlay?: boolean }) {
    this.engine.data.loadSettings();
    this.engine.applySettings();
    this.overlayMode = params?.overlay === true;
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
      audio.playShoot();
    }
    if (this.engine.input.wasUiPressed("down")) {
      this.selectedIndex = (this.selectedIndex + 1) % options.length;
      this.clearConfirmationAndMessage();
      audio.playShoot();
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
      this.openView("root");
      return;
    }
    if (option === "audioVisual" || option === "operation" || option === "accountData") {
      this.openView(option);
      return;
    }
    if (option === "controls") {
      this.view = "keyBindings";
      this.controlIndex = 0;
      this.message = "";
      this.captureAction = null;
      this.engine.input.clearJustPressed();
      return;
    }
    if (option === "fullscreen") {
      document.dispatchEvent(new CustomEvent("game:fullscreen"));
      this.message = t(language, "settings.fullscreenToggled");
      return;
    }
    if (option === "exportData") {
      document.dispatchEvent(new CustomEvent("game:export-data"));
      this.message = t(language, "settings.exportRequested");
      return;
    }
    if (option === "importData") {
      document.dispatchEvent(new CustomEvent("game:import-data"));
      this.message = t(language, "settings.selectSave");
      return;
    }
    if (option === "resetTutorial") {
      this.engine.data.settings.tutorialCompleted = false;
      this.saveSettings(t(language, "settings.tutorialNextRun"));
      return;
    }
    if (option === "resetGame") {
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
    if (this.overlayMode) this.engine.closeSettingsToMenu();
    else this.engine.switchState("title");
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
      }));
      this.engine.input.clearJustPressed();
      return;
    }

    if (this.engine.input.wasUiPressed("cancel")) {
      this.view = "operation";
      this.selectedIndex = OPERATION_OPTIONS.indexOf("controls");
      this.message = "";
      this.engine.input.clearJustPressed();
      return;
    }
    if (this.engine.input.wasUiPressed("up")) {
      this.controlIndex = (this.controlIndex - 1 + INPUT_ACTIONS.length) % INPUT_ACTIONS.length;
      audio.playShoot();
    }
    if (this.engine.input.wasUiPressed("down")) {
      this.controlIndex = (this.controlIndex + 1) % INPUT_ACTIONS.length;
      audio.playShoot();
    }
    if (this.engine.input.wasUiPressed("secondary")) {
      this.engine.data.settings.keyBindings = { ...DEFAULT_KEY_BINDINGS };
      this.saveSettings(t(language, "settings.keysReset"));
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
      const modes: MusicMode[] = ["adaptive", "external", "off"];
      const index = modes.indexOf(settings.musicMode);
      settings.musicMode = modes[(index + direction + modes.length) % modes.length];
    } else if (option === "uiScale") {
      settings.uiScale = Math.max(0.85, Math.min(1.25, Math.round((settings.uiScale + direction * 0.1) * 20) / 20));
    } else if (option === "screenShake") {
      settings.screenShake = !settings.screenShake;
    } else if (option === "crtFilter") {
      settings.crtFilter = !settings.crtFilter;
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

  private saveSettings(message: string) {
    this.engine.data.saveSettings();
    this.engine.applySettings();
    this.message = message;
    audio.playPickup();
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
    if (option === "musicSource") return t(language, settings.musicMode === "adaptive" ? "value.adaptive" : settings.musicMode === "external" ? "value.external" : "common.off");
    if (option === "uiScale") return `${Math.round(settings.uiScale * 100)}%`;
    if (option === "screenShake") return bool(settings.screenShake);
    if (option === "crtFilter") return bool(settings.crtFilter);
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
    MenuRenderer.drawTitle(ctx, t(language, this.getTitleKey()), 160, 22, language, 20);
    drawPixelPanel(ctx, 20, 28, 280, 197, "cyan", true);

    if (this.view === "keyBindings") {
      this.drawControls(ctx);
      return;
    }
    if (this.view === "root") this.drawRoot(ctx);
    else this.drawSubmenu(ctx);
  }

  private drawRoot(ctx: CanvasRenderingContext2D): void {
    const language = this.engine.data.settings.language;
    ROOT_OPTIONS.forEach((option, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = 34 + column * 130;
      const y = 54 + row * 69;
      const selected = index === this.selectedIndex;
      drawPixelButton(ctx, x, y, 122, 54, selected, option === "back" ? "neutral" : "cyan");
      ctx.textAlign = "left";
      ctx.fillStyle = selected ? UI_COLORS.white : UI_COLORS.text;
      ctx.font = uiFont(language, 8, true);
      ctx.fillText(`${selected ? ">" : " "} ${this.getLabel(option)}`, x + 10, y + 20);
      ctx.fillStyle = selected ? UI_COLORS.cyan : UI_COLORS.muted;
      ctx.font = uiFont(language, 6, true);
      ctx.fillText(this.getValue(option), x + 10, y + 39);
      ctx.fillStyle = UI_COLORS.edge;
      ctx.fillRect(x + 10, y + 45, 102, 1);
    });
    this.drawFooter(ctx, false);
  }

  private drawSubmenu(ctx: CanvasRenderingContext2D): void {
    const language = this.engine.data.settings.language;
    const options = this.getCurrentOptions();
    const visibleRows = 8;
    const start = Math.max(0, Math.min(options.length - visibleRows, this.selectedIndex - 3));
    const visible = options.slice(start, start + visibleRows);
    drawSectionLabel(ctx, `${start + 1}-${Math.min(options.length, start + visibleRows)} / ${options.length}`, 35, 47, 250, language, "cyan");
    visible.forEach((option, localIndex) => {
      const index = start + localIndex;
      const y = 57 + localIndex * 18;
      const selected = index === this.selectedIndex;
      drawPixelButton(ctx, 32, y - 10, 256, 15, selected, option === "resetGame" ? "red" : "cyan");
      ctx.textAlign = "left";
      ctx.fillStyle = selected ? UI_COLORS.white : UI_COLORS.text;
      ctx.font = uiFont(language, 6, true);
      ctx.fillText(`${selected ? ">" : " "} ${this.getLabel(option)}`, 36, y);
      const value = this.getValue(option);
      ctx.textAlign = "right";
      ctx.fillStyle = option === "resetGame" ? UI_COLORS.red : UI_COLORS.cyan;
      ctx.fillText(value, 282, y);
      const percent = /^\d+%$/.test(value) ? Number.parseInt(value, 10) : Number.NaN;
      if (Number.isFinite(percent)) drawMeter(ctx, 210, y + 3, 71, 3, percent / 100, UI_COLORS.cyan, 0);
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
    const visibleRows = 8;
    const start = Math.max(0, Math.min(INPUT_ACTIONS.length - visibleRows, this.controlIndex - 3));
    drawSectionLabel(ctx, `${start + 1}-${Math.min(INPUT_ACTIONS.length, start + visibleRows)} / ${INPUT_ACTIONS.length}`, 35, 47, 250, language, "cyan");
    INPUT_ACTIONS.slice(start, start + visibleRows).forEach((action, localIndex) => {
      const index = start + localIndex;
      const y = 58 + localIndex * 18;
      const selected = index === this.controlIndex;
      drawPixelButton(ctx, 32, y - 11, 256, 16, selected, this.captureAction === action ? "yellow" : "cyan");
      ctx.textAlign = "left";
      ctx.fillStyle = selected ? UI_COLORS.white : UI_COLORS.text;
      ctx.font = uiFont(language, 7, true);
      ctx.fillText(`${selected ? ">" : " "} ${actionLabel(action, language)}`, 40, y);
      ctx.textAlign = "right";
      drawBadge(
        ctx,
        this.captureAction === action ? t(language, "settings.pressKeyShort") : formatBinding(settings.keyBindings[action]),
        226,
        y - 8,
        55,
        language,
        this.captureAction === action ? "yellow" : "cyan",
      );
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
