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

const OPTIONS = [
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
  "back",
] as const;

type SettingOption = typeof OPTIONS[number];

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
  back: "common.back",
};

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
      const language = this.engine.data.settings.language;
      if (option === "back") {
        this.engine.switchState("title");
      } else if (option === "controls") {
        this.controlsOpen = true;
        this.message = t(language, "settings.rebindHelp");
        this.engine.input.clearJustPressed();
      } else if (option === "fullscreen") {
        document.dispatchEvent(new CustomEvent("game:fullscreen"));
        this.message = t(language, "settings.fullscreenToggled");
      } else if (option === "exportData") {
        document.dispatchEvent(new CustomEvent("game:export-data"));
        this.message = t(language, "settings.exportRequested");
      } else if (option === "importData") {
        document.dispatchEvent(new CustomEvent("game:import-data"));
        this.message = t(language, "settings.selectSave");
      } else if (option === "resetTutorial") {
        this.engine.data.settings.tutorialCompleted = false;
        this.saveSettings(t(language, "settings.tutorialNextRun"));
      } else {
        this.adjustSetting(option, 1);
      }
    }
  }

  private updateControls() {
    const language = this.engine.data.settings.language;
    if (this.captureAction) {
      if (this.engine.input.wasPressed("escape")) {
        this.captureAction = null;
        this.message = t(language, "settings.rebindCancelled");
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
      const reboundAction = this.captureAction;
      this.captureAction = null;
      this.saveSettings(t(language, "settings.bound", {
        action: actionLabel(reboundAction, language),
        key: formatBinding(key),
      }));
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
      this.saveSettings(t(language, "settings.keysReset"));
    }
    if (this.engine.input.wasPressed("enter") || this.engine.input.wasPressed(" ")) {
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
    const language = settings.language;
    this.saveSettings(t(language, "settings.updated", { option: t(language, OPTION_KEYS[option]) }));
  }

  private saveSettings(message: string) {
    this.engine.data.saveSettings();
    this.engine.applySettings();
    this.message = message;
    audio.playPickup();
  }

  private getValue(option: SettingOption): string {
    const settings = this.engine.data.settings;
    const language = settings.language;
    const bool = (value: boolean) => t(language, value ? "common.on" : "common.off");
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
    if (option === "controls") return t(language, "common.enter");
    if (option === "fullscreen") return t(language, "common.toggle");
    if (option === "exportData") return t(language, "common.download");
    if (option === "importData") return t(language, "common.select");
    if (option === "resetTutorial") return t(language, settings.tutorialCompleted ? "common.reset" : "common.ready");
    return t(language, "common.enter");
  }

  draw(ctx: CanvasRenderingContext2D) {
    const language = this.engine.data.settings.language;
    ctx.fillStyle = "#0A0F19";
    ctx.fillRect(0, 0, 320, 240);
    MenuRenderer.drawTitle(ctx, t(language, this.controlsOpen ? "settings.controlsTitle" : "settings.title"), 160, 20, language);
    MenuRenderer.drawPanel(ctx, 24, 27, 272, 197);

    if (this.controlsOpen) {
      this.drawControls(ctx);
      return;
    }

    OPTIONS.forEach((option, index) => {
      const y = 34 + index * 8;
      const selected = index === this.selectedIndex;
      ctx.fillStyle = selected ? "rgba(0,242,254,0.16)" : "transparent";
      if (selected) ctx.fillRect(32, y - 6, 256, 8);
      ctx.textAlign = "left";
      ctx.fillStyle = selected ? "#FFFFFF" : "#9AA7B2";
      ctx.font = uiFont(language, 6, true);
      ctx.fillText(`${selected ? ">" : " "} ${t(language, OPTION_KEYS[option])}`, 36, y);
      ctx.textAlign = "right";
      ctx.fillStyle = "#00F2FE";
      ctx.fillText(this.getValue(option), 282, y);
    });

    ctx.textAlign = "center";
    ctx.fillStyle = "#F1C40F";
    ctx.font = uiFont(language, 6);
    ctx.fillText(this.message, 160, 205);
    ctx.fillStyle = "#7F8C8D";
    ctx.fillText(t(language, "settings.footer"), 160, 228);
    ctx.textAlign = "left";
  }

  private drawControls(ctx: CanvasRenderingContext2D) {
    const settings = this.engine.data.settings;
    const language = settings.language;
    INPUT_ACTIONS.forEach((action, index) => {
      const y = 51 + index * 16;
      const selected = index === this.controlIndex;
      ctx.fillStyle = selected ? "rgba(0,242,254,0.16)" : "transparent";
      if (selected) ctx.fillRect(34, y - 10, 252, 14);
      ctx.textAlign = "left";
      ctx.fillStyle = selected ? "#FFFFFF" : "#9AA7B2";
      ctx.font = uiFont(language, 7, true);
      ctx.fillText(`${selected ? ">" : " "} ${actionLabel(action, language)}`, 40, y);
      ctx.textAlign = "right";
      ctx.fillStyle = this.captureAction === action ? "#F1C40F" : "#00F2FE";
      ctx.fillText(this.captureAction === action ? t(language, "settings.pressKeyShort") : formatBinding(settings.keyBindings[action]), 278, y);
    });
    ctx.textAlign = "center";
    ctx.fillStyle = this.captureAction ? "#F1C40F" : "#7F8C8D";
    ctx.font = uiFont(language, 6);
    ctx.fillText(this.message, 160, 204);
    ctx.fillText(t(language, "settings.controlsFooter"), 160, 228);
    ctx.textAlign = "left";
  }
}
