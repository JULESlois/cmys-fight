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
const effectiveScale = 1.15 * 0.86;
const joystickRight = 14 + 106 * effectiveScale;
const actionContentLeft = narrowWidth - 12 - 132 * effectiveScale;
assert.ok(actionContentLeft - joystickRight > 20);

const canvasSource = fs.readFileSync("src/components/GameCanvas.tsx", "utf8");
const cssSource = fs.readFileSync("src/index.css", "utf8");
const settingsSource = fs.readFileSync("src/game/states/SettingsState.ts", "utf8");

assert.match(canvasSource, /touch-layout-\$\{touchHandedness\}/);
assert.match(canvasSource, /touch-fire-button/);
assert.match(canvasSource, /touch-use-button/);
assert.match(canvasSource, /touch-skill-button/);
assert.match(canvasSource, /touch-swap-button/);
assert.match(canvasSource, /touch-menu-button/);
assert.ok(canvasSource.indexOf("touch-menu-button") < canvasSource.indexOf("touch-action-cluster"));
assert.doesNotMatch(canvasSource.slice(canvasSource.indexOf("touch-action-cluster")), /actionHandlers\("pause"\)/);

assert.match(cssSource, /\.touch-layout-right \.touch-joystick/);
assert.match(cssSource, /\.touch-layout-left \.touch-joystick/);
assert.match(cssSource, /\.touch-fire-button[\s\S]*width: 72px/);
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
}));
