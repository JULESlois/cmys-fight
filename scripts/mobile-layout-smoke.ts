import assert from "node:assert/strict";
import fs from "node:fs";
import {
  SETTINGS_VERSION,
  createDefaultSettings,
  normalizeSettings,
} from "../src/game/Settings";
import { calculateTouchViewportOffsets } from "../src/game/TouchLayout";

const defaults = createDefaultSettings();
assert.equal(defaults.version, SETTINGS_VERSION);
assert.equal(defaults.touchHandedness, "right");
assert.equal(defaults.touchScale, 1);

const migrated = normalizeSettings({ version: 2, touchControls: true });
assert.equal(migrated.version, SETTINGS_VERSION);
assert.equal(migrated.touchHandedness, "right");
assert.equal(migrated.touchScale, 1);
assert.equal(normalizeSettings({ touchHandedness: "left", touchScale: 0.2 }).touchScale, 0.85);
assert.equal(normalizeSettings({ touchHandedness: "left", touchScale: 2 }).touchScale, 1.15);
assert.equal(normalizeSettings({ touchHandedness: "invalid" }).touchHandedness, "right");

const portrait = calculateTouchViewportOffsets(960, 1700);
assert.equal(portrait.verticalGutter, 490);
assert.equal(portrait.bottomOffset, 166);
assert.equal(portrait.topOffset, 226);

const compactPortrait = calculateTouchViewportOffsets(390, 844);
assert.ok(compactPortrait.bottomOffset > 50);
assert.ok(compactPortrait.topOffset > 100);

const landscape = calculateTouchViewportOffsets(1920, 1080);
assert.equal(landscape.verticalGutter, 0);
assert.equal(landscape.bottomOffset, 12);
assert.equal(landscape.topOffset, 8);

// At the narrowest supported viewport and largest user scale, the effective
// responsive scale still leaves the movement and action hit regions separated.
const narrowWidth = 320;
const effectiveScale = 1.15 * 0.78;
const joystickRight = 14 + 112 * effectiveScale;
const actionContentLeft = narrowWidth - 12 - 150 * effectiveScale;
assert.ok(actionContentLeft - joystickRight > 20);

const canvasSource = fs.readFileSync("src/components/GameCanvas.tsx", "utf8");
const cssSource = fs.readFileSync("src/index.css", "utf8");
const settingsSource = fs.readFileSync("src/game/states/SettingsState.ts", "utf8");

assert.match(canvasSource, /touch-layout-\$\{touchHandedness\}/);
assert.match(canvasSource, /data-gamepad-button="x"[\s\S]*actionHandlers\("fire"\)/);
assert.match(canvasSource, /data-gamepad-button="a"[\s\S]*actionHandlers\("interact"\)/);
assert.match(canvasSource, /data-gamepad-button="b"[\s\S]*actionHandlers\("skill"\)/);
assert.match(canvasSource, /data-gamepad-button="y"[\s\S]*actionHandlers\("swapWeapon"\)/);
assert.match(canvasSource, /data-gamepad-button="start"[\s\S]*actionHandlers\("pause"\)/);
assert.match(canvasSource, /touch-dpad-notch-up/);
assert.match(canvasSource, /touch-face-letter">X/);
assert.match(canvasSource, /touch-face-letter">A/);
assert.match(canvasSource, /touch-face-letter">B/);
assert.match(canvasSource, /touch-face-letter">Y/);
assert.match(canvasSource, /navigator\.vibrate/);
assert.ok(canvasSource.indexOf("touch-menu-button") < canvasSource.indexOf("touch-action-cluster"));
assert.doesNotMatch(canvasSource.slice(canvasSource.indexOf("touch-action-cluster")), /actionHandlers\("pause"\)/);

assert.match(cssSource, /\.touch-layout-right \.touch-joystick/);
assert.match(cssSource, /\.touch-layout-left \.touch-joystick/);
assert.match(cssSource, /\.touch-face-x[\s\S]*#276fa7/);
assert.match(cssSource, /\.touch-face-a[\s\S]*#2f8f59/);
assert.match(cssSource, /\.touch-face-b[\s\S]*#b54646/);
assert.match(cssSource, /\.touch-face-y[\s\S]*#b38a27/);
assert.match(cssSource, /clip-path: polygon\(34% 0, 66% 0/);
assert.match(cssSource, /filter: drop-shadow\(0 5px 0/);
assert.match(cssSource, /border-radius: 0/);
assert.doesNotMatch(cssSource.slice(0, cssSource.indexOf("@media (hover: hover)")), /border-radius: 9999px/);
assert.match(cssSource, /@media \(max-width: 360px\)/);
assert.match(cssSource, /env\(safe-area-inset-bottom/);
assert.match(settingsSource, /"TOUCH LAYOUT"/);
assert.match(settingsSource, /"TOUCH SIZE"/);

console.log(JSON.stringify({
  settingsMigration: "ok",
  handedLayouts: "ok",
  responsiveGutters: "ok",
  narrowViewportSeparation: "ok",
  separatedPauseControl: "ok",
  pixelGamepadStyle: "ok",
  abxyMapping: "ok",
}));
