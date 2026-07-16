const fs = require('fs');

let input = fs.readFileSync('src/game/Input.ts', 'utf8');

input = input.replace(
  /private lastDevice: InputDevice = "keyboard";/,
  `private lastDevice: InputDevice = "keyboard";
  private lastPhysicalDevice: "keyboard" | "gamepad" = "gamepad";`
);

input = input.replace(
  /this\.lastDevice = "keyboard";/g,
  `this.lastDevice = "keyboard";
    this.lastPhysicalDevice = "keyboard";`
);

input = input.replace(
  /if \(anyDirection \|\| buttons\.some\(Boolean\)\) this\.lastDevice = "gamepad";/,
  `if (anyDirection || buttons.some(Boolean)) {
      this.lastDevice = "gamepad";
      this.lastPhysicalDevice = "gamepad";
    }`
);

input = input.replace(
  /public getLastDevice\(\): InputDevice \{\n    return this\.lastDevice;\n  \}/,
  `public getLastDevice(): InputDevice {
    return this.lastDevice;
  }
  public getLastPhysicalDevice(): "keyboard" | "gamepad" {
    return this.lastPhysicalDevice;
  }`
);

input = input.replace(/this\.touchPromptMode/g, 'this.lastPhysicalDevice');
fs.writeFileSync('src/game/Input.ts', input);

let canvas = fs.readFileSync('src/components/GameCanvas.tsx', 'utf8');
canvas = canvas.replace(
  /const labelMode: TouchLabelMode = settings\?\.touchLabelMode === "keyboard" \? "keyboard" : "gamepad";\n      setTouchLabelMode\(labelMode\);/,
  ``
);

canvas = canvas.replace(
  /engineRef\.current\.update\(dt\);\n        engineRef\.current\.draw\(\);/,
  `engineRef.current.update(dt);
        engineRef.current.draw();
        
        if (engineRef.current) {
          const device = engineRef.current.input.getLastPhysicalDevice();
          setTouchLabelMode(prev => {
            if (prev !== device) return device;
            return prev;
          });
        }`
);
fs.writeFileSync('src/components/GameCanvas.tsx', canvas);

console.log("Done");
