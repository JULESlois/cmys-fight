const fs = require('fs');

// 1. SettingsState.ts
let settings = fs.readFileSync('src/game/states/SettingsState.ts', 'utf8');
settings = settings.replace(
  /const OPERATION_OPTIONS: readonly SettingsMenuOption\[\] = \[\n  "touchControls",\n  "touchLayout",\n  "touchSize",\n  "touchLabels",\n  "controls",\n  "resetTutorial",\n  "categoryBack",\n\];/,
  `const OPERATION_OPTIONS: readonly SettingsMenuOption[] = [
  "touchControls",
  "touchLayout",
  "touchSize",
  "controls",
  "categoryBack",
];`
);
// Remove left arrow
settings = settings.replace(
  /\`\$\{selected \? ">" : " "\} \$\{this.getLabel\(option\)\}\`/g,
  `this.getLabel(option)`
);
settings = settings.replace(
  /\`\$\{selected \? ">" : " "\} \$\{actionLabel\(action, language\)\}\`/g,
  `actionLabel(action, language)`
);
fs.writeFileSync('src/game/states/SettingsState.ts', settings);

// 2. SplashState.ts
let splash = fs.readFileSync('src/game/states/SplashState.ts', 'utf8');
splash = splash.replace(
  /private currentPhaseIndex = 0;/g,
  `private currentPhaseIndex = 0;
  private canSkip = false;`
);
splash = splash.replace(
  /enter\(\) \{\n    this\.elapsed = 0;\n    this\.currentPhaseIndex = 0;\n  \}/g,
  `enter() {
    this.elapsed = 0;
    this.currentPhaseIndex = 0;
    const hasLaunchedBefore = localStorage.getItem("cmys_has_launched");
    this.canSkip = !!hasLaunchedBefore;
    if (!hasLaunchedBefore) {
      localStorage.setItem("cmys_has_launched", "true");
    }
  }`
);
splash = splash.replace(
  /update\(dt: number = 1\/60\) \{\n    this\.elapsed \+= dt;\n    \n    if \(this\.engine\.input\.wasUiPressed\("confirm"\)/g,
  `update(dt: number = 1/60) {
    this.elapsed += dt;
    
    if (this.canSkip && (Object.keys(this.engine.input['keysJustPressed'] || {}).length > 0 || Object.keys(this.engine.input['touchJustPressed'] || {}).length > 0 || Object.keys(this.engine.input['touchUiJustPressed'] || {}).length > 0 || Object.keys(this.engine.input['gamepadJustPressed'] || {}).length > 0 || Object.keys(this.engine.input['gamepadUiJustPressed'] || {}).length > 0 || this.engine.input.wasUiPressed("confirm"))) {
      this.engine.switchState("title", { fromSplash: true });
      return;
    }
    
    if (this.engine.input.wasUiPressed("confirm")`
);
fs.writeFileSync('src/game/states/SplashState.ts', splash);

// 3. TouchLayout.ts
let touch = fs.readFileSync('src/game/TouchLayout.ts', 'utf8');
touch = touch.replace(
  /const MAX_TOUCH_SCALE = 1\.15;\nconst ACTION_CLUSTER_HEIGHT = 116 \* MAX_TOUCH_SCALE;\nconst ACTION_CLUSTER_WIDTH = 116 \* MAX_TOUCH_SCALE;\nconst MENU_HEIGHT = 26 \* MAX_TOUCH_SCALE;/g,
  `const MAX_TOUCH_SCALE = 1.15;
const BASE_TOUCH_SCALE = 1.3;
const ACTION_CLUSTER_HEIGHT = 116 * MAX_TOUCH_SCALE * BASE_TOUCH_SCALE;
const ACTION_CLUSTER_WIDTH = 116 * MAX_TOUCH_SCALE * BASE_TOUCH_SCALE;
const MENU_HEIGHT = 26 * MAX_TOUCH_SCALE * BASE_TOUCH_SCALE;`
);
fs.writeFileSync('src/game/TouchLayout.ts', touch);

// 4. GameCanvas.tsx
let canvas = fs.readFileSync('src/components/GameCanvas.tsx', 'utf8');
canvas = canvas.replace(
  /style=\{\{ "--touch-scale": touchScale \} as CSSProperties\}/g,
  `style={{ "--touch-scale": touchScale * 1.3 } as CSSProperties}`
);
fs.writeFileSync('src/components/GameCanvas.tsx', canvas);

console.log("Done.");
