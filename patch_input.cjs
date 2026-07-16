const fs = require('fs');

let input = fs.readFileSync('src/game/Input.ts', 'utf8');

input = input.replace(
  /private lastDevice: InputDevice = "keyboard";/,
  \`private lastDevice: InputDevice = "keyboard";
  private lastPhysicalDevice: "keyboard" | "gamepad" = "gamepad";\`
);

input = input.replace(
  /this\.lastDevice = "keyboard";/g,
  \`this.lastDevice = "keyboard";
    this.lastPhysicalDevice = "keyboard";\`
);

input = input.replace(
  /if \(anyDirection \|\| buttons\.some\(Boolean\)\) this\.lastDevice = "gamepad";/,
  \`if (anyDirection || buttons.some(Boolean)) {
      this.lastDevice = "gamepad";
      this.lastPhysicalDevice = "gamepad";
    }\`
);

input = input.replace(
  /public getLastDevice\(\): InputDevice \{\n    return this\.lastDevice;\n  \}/,
  \`public getLastDevice(): InputDevice {
    return this.lastDevice;
  }
  public getLastPhysicalDevice(): "keyboard" | "gamepad" {
    return this.lastPhysicalDevice;
  }\`
);

// We need to modify getPrompt, getUiPrompt, getNavigationPrompt
// Currently they use this.touchPromptMode. We can replace this.touchPromptMode with this.lastPhysicalDevice
input = input.replace(/this\.touchPromptMode/g, 'this.lastPhysicalDevice');

// We can remove setTouchLabelMode / touchPromptMode setter if any
input = input.replace(/public setTouchLabelMode.*\{[\s\S]*?\}/, '');

fs.writeFileSync('src/game/Input.ts', input);
console.log("Done");
