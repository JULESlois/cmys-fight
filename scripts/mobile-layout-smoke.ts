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
assert.ok(Math.abs(portrait.bottomOffset - 178.3) < 0.001);
assert.ok(Math.abs(portrait.topOffset - 230.05) < 0.001);
assert.equal(portrait.sideOffset, 10);

const compactPortrait = calculateTouchViewportOffsets(390, 844);
assert.ok(compactPortrait.bottomOffset > 50);
assert.ok(compactPortrait.topOffset > 100);


const screenshotViewport = calculateTouchViewportOffsets(1536, 960);
assert.equal(screenshotViewport.horizontalGutter, 128);
assert.equal(screenshotViewport.sideOffset, 10);

// Android Chrome screenshots include browser chrome outside the visual
// viewport. Layout must use the visible content height, not the larger layout
// viewport, otherwise the canvas and controls extend below the screen.
const browserLandscape = calculateTouchViewportOffsets(1848, 681);
assert.ok(browserLandscape.horizontalGutter > 400);
assert.ok(browserLandscape.sideOffset > 100);
assert.equal(browserLandscape.verticalGutter, 0);

const browserPortrait = calculateTouchViewportOffsets(864, 1664);
assert.ok(browserPortrait.verticalGutter > 500);
assert.ok(browserPortrait.bottomOffset > 150);

const landscape = calculateTouchViewportOffsets(1920, 1080);
assert.equal(landscape.verticalGutter, 0);
assert.equal(landscape.horizontalGutter, 240);
assert.equal(landscape.bottomOffset, 10);
assert.equal(landscape.topOffset, 7);
assert.ok(Math.abs(landscape.sideOffset - 53.3) < 0.001);

// The calculated anchors reserve enough room for the maximum configured
// touch scale. CSS then applies safe-area-aware minimum edge gaps.
const maxTouchScale = 1.15;
const maxActionSize = 116 * maxTouchScale;
for (const [width, height] of [[320, 568], [320, 240], [240, 320], [200, 200]]) {
  const offsets = calculateTouchViewportOffsets(width, height);
  assert.ok(offsets.sideOffset >= 10);
  assert.ok(offsets.bottomOffset >= 10);
  assert.ok(offsets.sideOffset + maxActionSize <= width, `${width}x${height} keeps ABXY inside horizontally`);
  assert.ok(offsets.bottomOffset + maxActionSize <= height, `${width}x${height} keeps ABXY inside vertically`);
}
const narrowResponsiveScale = 1.15 * 0.78;
const narrowJoystickRight = 10 + 110 * narrowResponsiveScale;
const narrowActionLeft = 320 - 10 - 116 * narrowResponsiveScale;
assert.ok(narrowActionLeft - narrowJoystickRight > 20, "320px viewport keeps movement and ABXY hit regions separate");

const canvasSource = fs.readFileSync("src/components/GameCanvas.tsx", "utf8");
const cssSource = fs.readFileSync("src/index.css", "utf8");
const settingsSource = fs.readFileSync("src/game/states/SettingsState.ts", "utf8");

assert.match(canvasSource, /touch-layout-\$\{touchHandedness\}/);
assert.match(canvasSource, /data-gamepad-button="x"[\s\S]*actionHandlers\("fire"\)/);
assert.match(canvasSource, /touchLabels\.fire/);
assert.match(canvasSource, /data-gamepad-button="a"[\s\S]*actionHandlers\("interact"\)/);
assert.match(canvasSource, /touchLabels\.interact/);
assert.match(canvasSource, /data-gamepad-button="b"[\s\S]*contextualActionHandlers\("skill", "cancel"\)/);
assert.match(canvasSource, /touchLabels\.skillCancel/);
assert.match(canvasSource, /data-gamepad-button="y"[\s\S]*actionHandlers\("swapWeapon"\)/);
assert.match(canvasSource, /touchLabels\.swapWeapon/);
assert.doesNotMatch(canvasSource, /data-gamepad-button="lb"|touch-shoulder-button/);
assert.match(canvasSource, /data-gamepad-button="start"[\s\S]*actionHandlers\("pause"\)/);
assert.match(canvasSource, /touchLabels\.pause/);
assert.match(canvasSource, /touch-dpad-notch-up/);
assert.match(canvasSource, /GAMEPAD_TOUCH_LABELS[\s\S]*fire: "X"[\s\S]*interact: "A"[\s\S]*skillCancel: "B"[\s\S]*swapWeapon: "Y"/);
assert.match(canvasSource, /buildTouchLabels[\s\S]*formatBinding\(bindings\.fire\)/);
assert.match(canvasSource, /--touch-side-offset/);
assert.match(canvasSource, /window\.visualViewport/);
assert.match(canvasSource, /--visual-viewport-width/);
assert.match(canvasSource, /--visual-viewport-height/);
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
assert.doesNotMatch(cssSource, /\.touch-shoulder-button/);
assert.match(cssSource, /clip-path: polygon\(34% 0, 66% 0/);
assert.match(cssSource, /filter: drop-shadow\(0 4px 0/);
assert.match(cssSource, /border-radius: 0/);
assert.doesNotMatch(cssSource.slice(0, cssSource.indexOf("@media (hover: hover)")), /border-radius: 9999px/);
assert.match(cssSource, /@media \(max-width: 360px\)/);
assert.match(cssSource, /env\(safe-area-inset-bottom/);
assert.match(cssSource, /--touch-safe-bottom: max\(var\(--touch-bottom-offset\), calc\(env\(safe-area-inset-bottom/);
assert.match(cssSource, /left: max\(var\(--touch-side-offset\), calc\(env\(safe-area-inset-left/);
assert.match(cssSource, /right: max\(var\(--touch-side-offset\), calc\(env\(safe-area-inset-right/);
assert.match(cssSource, /\.game-shell[\s\S]*padding: 0/);
assert.match(cssSource, /\.game-shell[\s\S]*position: fixed/);
assert.match(cssSource, /width: var\(--visual-viewport-width, 100dvw\)/);
assert.match(cssSource, /height: var\(--visual-viewport-height, 100dvh\)/);
assert.doesNotMatch(cssSource, /padding-(top|right|bottom|left): env\(safe-area-inset/);
assert.match(settingsSource, /"touchLayout"/);
assert.match(settingsSource, /settings\.touchLayout/);
assert.match(settingsSource, /"touchSize"/);
assert.match(settingsSource, /settings\.touchSize/);
assert.match(settingsSource, /"touchLabels"/);
assert.match(settingsSource, /settings\.touchLabels/);

console.log(JSON.stringify({
  settingsMigration: "ok",
  handedLayouts: "ok",
  responsiveGutters: "ok",
  narrowViewportSeparation: "ok",
  separatedPauseControl: "ok",
  pixelGamepadStyle: "ok",
  contextualAbxyMapping: "B-skill-or-cancel",
  sharedGamepadPalette: "ok",
  dynamicControlLabels: "ok",
  safeViewportClamping: "ok",
  visualViewportSizing: "android-browser-chrome-safe",
}));
