import type { Input } from "../Input";

export class PauseOverlayRenderer {
  static draw(ctx: CanvasRenderingContext2D, input: Input) {
    ctx.fillStyle = "rgba(10, 15, 25, 0.88)";
    ctx.fillRect(0, 0, 320, 240);
    ctx.fillStyle = "#FFF";
    ctx.font = "bold 20px monospace";
    ctx.textAlign = "center";
    ctx.fillText("PAUSE", 160, 64);

    ctx.strokeStyle = "rgba(0, 242, 254, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(54, 78, 212, 126);
    ctx.fillStyle = "rgba(0, 242, 254, 0.05)";
    ctx.fillRect(54, 78, 212, 126);
    ctx.font = "8px monospace";
    ctx.fillStyle = "#00F2FE";
    ctx.fillText(`ACTIVE DEVICE: ${input.getLastDevice().toUpperCase()}`, 160, 94);

    const rows = [
      [input.getLastDevice() === "gamepad" ? "L-STICK" : input.getLastDevice() === "touch" ? "JOYSTICK" : "WASD", "MOVE"],
      [input.getPrompt("fire"), "FIRE"],
      [input.getPrompt("interact"), "INTERACT"],
      [input.getPrompt("skill"), "SKILL"],
      [input.getPrompt("swapWeapon"), "SWAP WEAPON"],
      [input.getPrompt("pause"), "RESUME"],
    ];
    ctx.font = "8px monospace";
    rows.forEach(([prompt, action], index) => {
      const y = 112 + index * 14;
      ctx.textAlign = "right";
      ctx.fillStyle = "#F1C40F";
      ctx.fillText(prompt, 146, y);
      ctx.textAlign = "left";
      ctx.fillStyle = "#BDC3C7";
      ctx.fillText(action, 158, y);
    });
    ctx.textAlign = "center";
    ctx.fillStyle = "#7F8C8D";
    ctx.font = "6px monospace";
    ctx.fillText(`${input.getPrompt("interact")}: SYSTEM MENU`, 160, 194);
    ctx.textAlign = "left";
  }
}
