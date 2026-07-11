export const SETTINGS_SAVE_KEY = "retro_rpg_settings";
export const SETTINGS_VERSION = 6;

export type InputAction =
  | "moveUp"
  | "moveDown"
  | "moveLeft"
  | "moveRight"
  | "fire"
  | "skill"
  | "interact"
  | "swapWeapon"
  | "pause";

export const INPUT_ACTIONS: InputAction[] = [
  "moveUp",
  "moveDown",
  "moveLeft",
  "moveRight",
  "fire",
  "skill",
  "interact",
  "swapWeapon",
  "pause",
];

export const ACTION_LABELS: Record<InputAction, string> = {
  moveUp: "MOVE UP",
  moveDown: "MOVE DOWN",
  moveLeft: "MOVE LEFT",
  moveRight: "MOVE RIGHT",
  fire: "FIRE",
  skill: "SKILL",
  interact: "INTERACT",
  swapWeapon: "SWAP WEAPON",
  pause: "PAUSE",
};

const LEGACY_V4_KEY_BINDINGS: Record<InputAction, string> = {
  moveUp: "w",
  moveDown: "s",
  moveLeft: "a",
  moveRight: "d",
  fire: "f",
  skill: "e",
  interact: " ",
  swapWeapon: "q",
  pause: "p",
};

export const DEFAULT_KEY_BINDINGS: Record<InputAction, string> = {
  moveUp: "w",
  moveDown: "s",
  moveLeft: "a",
  moveRight: "d",
  fire: "j",
  skill: "k",
  interact: "l",
  swapWeapon: "i",
  pause: "escape",
};

export type ColorblindMode = "off" | "deuteranopia" | "tritanopia";
export type MusicMode = "adaptive" | "external" | "off";
export type TouchHandedness = "right" | "left";
export type TouchLabelMode = "gamepad" | "keyboard";
export type Language = "en" | "zh-CN";

export interface GameSettings {
  version: number;
  language: Language;
  masterVolume: number;
  musicVolume: number;
  musicMode: MusicMode;
  screenShake: boolean;
  crtFilter: boolean;
  uiScale: number;
  colorblindMode: ColorblindMode;
  reducedFlashing: boolean;
  dynamicBackground: boolean;
  touchControls: boolean;
  touchHandedness: TouchHandedness;
  touchScale: number;
  touchLabelMode: TouchLabelMode;
  tutorialCompleted: boolean;
  keyBindings: Record<InputAction, string>;
}

export function createDefaultSettings(): GameSettings {
  return {
    version: SETTINGS_VERSION,
    language: "en",
    masterVolume: 100,
    musicVolume: 55,
    musicMode: "adaptive",
    screenShake: true,
    crtFilter: true,
    uiScale: 1,
    colorblindMode: "off",
    reducedFlashing: false,
    dynamicBackground: true,
    touchControls: true,
    touchHandedness: "right",
    touchScale: 1,
    touchLabelMode: "gamepad",
    tutorialCompleted: false,
    keyBindings: { ...DEFAULT_KEY_BINDINGS },
  };
}

function normalizeBinding(value: unknown, fallback: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 24) return fallback;
  if (value === "Spacebar") return " ";
  return value === " " ? " " : value.toLowerCase();
}

export function normalizeSettings(value: unknown): GameSettings {
  const fallback = createDefaultSettings();
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Partial<GameSettings>;
  const rawBindings = raw.keyBindings && typeof raw.keyBindings === "object"
    ? raw.keyBindings as Partial<Record<InputAction, string>>
    : {};
  const loadedVersion = Math.max(0, Math.floor(Number(raw.version) || 0));
  const legacyFallback = loadedVersion > 0 && loadedVersion < 5
    ? LEGACY_V4_KEY_BINDINGS
    : DEFAULT_KEY_BINDINGS;
  const usesExactLegacyDefaults = loadedVersion > 0 && loadedVersion < 5 && INPUT_ACTIONS.every(
    action => normalizeBinding(rawBindings[action], LEGACY_V4_KEY_BINDINGS[action]) === LEGACY_V4_KEY_BINDINGS[action],
  );
  const keyBindings = { ...DEFAULT_KEY_BINDINGS };
  for (const action of INPUT_ACTIONS) {
    keyBindings[action] = usesExactLegacyDefaults
      ? DEFAULT_KEY_BINDINGS[action]
      : normalizeBinding(rawBindings[action], legacyFallback[action]);
  }
  const uiScale = Number(raw.uiScale);
  const masterVolume = Number(raw.masterVolume);
  const musicVolume = Number(raw.musicVolume);
  const touchScale = Number(raw.touchScale);
  const musicMode: MusicMode = raw.musicMode === "external" || raw.musicMode === "off" ? raw.musicMode : "adaptive";
  const colorblindMode: ColorblindMode = raw.colorblindMode === "deuteranopia" || raw.colorblindMode === "tritanopia"
    ? raw.colorblindMode
    : "off";
  const touchHandedness: TouchHandedness = raw.touchHandedness === "left" ? "left" : "right";
  const touchLabelMode: TouchLabelMode = raw.touchLabelMode === "keyboard" ? "keyboard" : "gamepad";
  const language: Language = raw.language === "zh-CN" ? "zh-CN" : "en";
  return {
    version: SETTINGS_VERSION,
    language,
    masterVolume: Number.isFinite(masterVolume) ? Math.max(0, Math.min(100, Math.round(masterVolume))) : fallback.masterVolume,
    musicVolume: Number.isFinite(musicVolume) ? Math.max(0, Math.min(100, Math.round(musicVolume))) : fallback.musicVolume,
    musicMode,
    screenShake: raw.screenShake !== false,
    crtFilter: raw.crtFilter !== false,
    uiScale: Number.isFinite(uiScale) ? Math.max(0.85, Math.min(1.25, Math.round(uiScale * 20) / 20)) : 1,
    colorblindMode,
    reducedFlashing: raw.reducedFlashing === true,
    dynamicBackground: raw.dynamicBackground !== false,
    touchControls: raw.touchControls !== false,
    touchHandedness,
    touchScale: Number.isFinite(touchScale) ? Math.max(0.85, Math.min(1.15, Math.round(touchScale * 20) / 20)) : 1,
    touchLabelMode,
    tutorialCompleted: raw.tutorialCompleted === true,
    keyBindings,
  };
}

export function formatBinding(key: string): string {
  if (key === " ") return "SPACE";
  if (key === "arrowup") return "UP";
  if (key === "arrowdown") return "DOWN";
  if (key === "arrowleft") return "LEFT";
  if (key === "arrowright") return "RIGHT";
  if (key === "escape") return "ESC";
  if (key === "tab") return "TAB";
  return key.toUpperCase();
}
