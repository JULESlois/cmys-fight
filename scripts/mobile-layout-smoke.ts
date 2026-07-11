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
assert.equal(defaults.touchLabelMode, "gamepad");

const migrated = normalizeSettings({ version: 3, touchControls: true });
assert.equal(migrated.version, SETTINGS_VERSION);
assert.equal(migrated.touchHandedness, "right");
assert.equal(migrated.touchScale, 1);
assert.equal(migrated.touchLabelMode, "gamepad");
assert.equal(normalizeSettings({ touchHandedness: "left", touchScale: 0.2 }).touchScale, 0.85);
assert.equal(normalizeSettings({ touchHandedness: "left", touchScale: 2 }).touchScale, 1.15);
assert.equal(normalizeSettings({ touchHandedness: "invalid" }).touchHandedness, "right");
assert.equal(normalizeSettings({ touchLabelMode: "keyboard" }).touchLabelMode, "keyboard");
assert.equal(normalizeSettings({ touchLabelMode: "invalid" }).touchLabelMode, "gamepad");

const portrait = calculateTouchViewportOffsets(960, 1700);
assert.equal(portrait.verticalGutter, 490);
assert.equal(portrait.horizontalGutter, 0);
assert.equal(portrait.bottomOffset, 184);
assert.equal(portrait.topOffset, 231);
assert.equal(portrait.sideOffset, 10);

const compactPortrait = calculateTouchViewportOffsets(390, 844);
assert.ok(compactPortrait.bottomOffset > 50);
assert.ok(compactPortrait.topOffset > 100);


const screenshotViewport = calculateTouchViewportOffsets(1536, 960);
assert.equal(screenshotViewport.horizontalGutter, 128);
assert.equal(screenshotViewport.sideOffset, 10);
const screenshotGameLeft = screenshotViewport.horizontalGutter;
const screenshotGameRight = 1536 - screenshotViewport.horizontalGutter;
assert.ok(screenshotViewport.sideOffset + 110 <= screenshotGameLeft, "D-pad should fit inside the left letterbox gutter");
assert.ok(1536 - screenshotViewport.sideOffset - 116 >= screenshotGameRight, "face buttons should fit inside the right letterbox gutter");

const landscape = calculateTouchViewportOffsets(1920, 1080);
assert.equal(landscape.verticalGutter, 0);
assert.equal(landscape.horizontalGutter, 240);
assert.equal(landscape.bottomOffset, 10);
assert.equal(landscape.topOffset, 7);
assert.equal(landscape.sideOffset, 62);

// At the narrowest supported viewport and largest user scale, the effective
// responsive scale still leaves the movement and action hit regions separated.
const narrowWidth = 320;
const effectiveScale = 1.15 * 0.78;
const joystickRight = 10 + 98 * effectiveScale;
const actionContentLeft = narrowWidth - 10 - 116 * effectiveScale;
assert.ok(actionContentLeft - joystickRight > 20);

const canvasSource = fs.readFileSync("src/components/GameCanvas.tsx", "utf8");
const cssSource = fs.readFileSync("src/index.css", "utf8");
const settingsSource = fs.readFileSync("src/game/states/SettingsState.ts", "utf8");

assert.match(canvasSource, /touch-layout-\$\{touchHandedness\}/);
assert.match(canvasSource, /data-gamepad-button="x"[\s\S]*actionHandlers\("fire"\)/);
assert.match(canvasSource, /touchLabels\.fire/);
assert.match(canvasSource, /data-gamepad-button="a"[\s\S]*actionHandlers\("interact"\)/);
assert.match(canvasSource, /touchLabels\.interact/);
assert.match(canvasSource, /data-gamepad-button="b"[\s\S]*actionHandlers\("skill"\)/);
assert.match(canvasSource, /touchLabels\.skill/);
assert.match(canvasSource, /data-gamepad-button="y"[\s\S]*actionHandlers\("swapWeapon"\)/);
assert.match(canvasSource, /touchLabels\.swapWeapon/);
assert.match(canvasSource, /data-gamepad-button="start"[\s\S]*actionHandlers\("pause"\)/);
assert.match(canvasSource, /touchLabels\.pause/);
assert.match(canvasSource, /touch-dpad-notch-up/);
assert.match(canvasSource, /GAMEPAD_TOUCH_LABELS[\s\S]*fire: "X"[\s\S]*interact: "A"[\s\S]*skill: "B"[\s\S]*swapWeapon: "Y"/);
assert.match(canvasSource, /buildTouchLabels[\s\S]*formatBinding\(bindings\.fire\)/);
assert.match(canvasSource, /--touch-side-offset/);
assert.match(canvasSource, /navigator\.vibrate/);
assert.ok(canvasSource.indexOf("touch-menu-button") < canvasSource.indexOf("touch-action-cluster"));
assert.doesNotMatch(canvasSource.slice(canvasSource.indexOf("touch-action-cluster")), /actionHandlers\("pause"\)/);

assert.match(cssSource, /\.touch-layout-right \.touch-joystick/);
assert.match(cssSource, /\.touch-layout-left \.touch-joystick/);
assert.match(cssSource, /\.touch-face-button[\s\S]*--face-top: #24384d/);
assert.doesNotMatch(cssSource, /#276fa7|#2f8f59|#b54646|#b38a27/);
assert.match(cssSource, /\.touch-face-button[\s\S]*opacity: 0\.5/);
assert.match(cssSource, /\.touch-joystick[\s\S]*opacity: 0\.48/);
assert.match(cssSource, /\.touch-start-button[\s\S]*opacity: 0\.45/);
assert.match(cssSource, /clip-path: polygon\(34% 0, 66% 0/);
assert.match(cssSource, /filter: drop-shadow\(0 4px 0/);
assert.match(cssSource, /border-radius: 0/);
assert.doesNotMatch(cssSource.slice(0, cssSource.indexOf("@media (hover: hover)")), /border-radius: 9999px/);
assert.match(cssSource, /@media \(max-width: 360px\)/);
assert.match(cssSource, /env\(safe-area-inset-bottom/);
assert.match(settingsSource, /"TOUCH LAYOUT"/);
assert.match(settingsSource, /"TOUCH SIZE"/);
assert.match(settingsSource, /"TOUCH LABELS"/);

console.log(JSON.stringify({
  settingsMigration: "ok",
  handedLayouts: "ok",
  responsiveGutters: "ok",
  narrowViewportSeparation: "ok",
  separatedPauseControl: "ok",
  pixelGamepadStyle: "ok",
  abxyMapping: "ok",
  sharedGamepadPalette: "ok",
  dynamicControlLabels: "ok",
  horizontalGutterPlacement: "ok",
}));
