import type { Input } from "./Input";

export type TutorialStepId = "move" | "fire" | "skill" | "interact" | "swap";

const STEPS: Array<{ id: TutorialStepId; text: string }> = [
  { id: "move", text: "MOVE TO TEST YOUR CONTROLS" },
  { id: "fire", text: "FIRE YOUR CURRENT WEAPON" },
  { id: "skill", text: "ACTIVATE YOUR CHARACTER SKILL" },
  { id: "interact", text: "USE THE INTERACT CONTROL" },
  { id: "swap", text: "SWAP YOUR WEAPON SLOT" },
];

export class TutorialSystem {
  private stepIndex = 0;
  private complete = false;

  reset(completed: boolean) {
    this.stepIndex = 0;
    this.complete = completed;
  }

  update(input: Input): boolean {
    if (this.complete) return false;
    const step = STEPS[this.stepIndex];
    let advanced = false;
    if (step.id === "move") {
      const axis = input.getAxis();
      advanced = Math.hypot(axis.x, axis.y) > 0.3;
    } else if (step.id === "fire") {
      advanced = input.wasActionPressed("fire");
    } else if (step.id === "skill") {
      advanced = input.wasActionPressed("skill");
    } else if (step.id === "interact") {
      advanced = input.wasActionPressed("interact");
    } else if (step.id === "swap") {
      advanced = input.wasActionPressed("swapWeapon");
    }
    if (!advanced) return false;
    this.stepIndex++;
    if (this.stepIndex >= STEPS.length) {
      this.complete = true;
      return true;
    }
    return false;
  }

  draw(ctx: CanvasRenderingContext2D, input: Input) {
    if (this.complete) return;
    const step = STEPS[this.stepIndex];
    const prompt = step.id === "move"
      ? input.getLastDevice() === "gamepad" ? "L-STICK" : input.getLastDevice() === "touch" ? "JOYSTICK" : "WASD"
      : input.getPrompt(step.id === "swap" ? "swapWeapon" : step.id);
    ctx.save();
    ctx.fillStyle = "rgba(7, 13, 24, 0.92)";
    ctx.strokeStyle = "#00F2FE";
    ctx.fillRect(48, 172, 224, 26);
    ctx.strokeRect(48, 172, 224, 26);
    ctx.textAlign = "center";
    ctx.fillStyle = "#F1C40F";
    ctx.font = "bold 7px monospace";
    ctx.fillText(`TRAINING ${this.stepIndex + 1}/${STEPS.length} // ${prompt}`, 160, 182);
    ctx.fillStyle = "#ECF0F1";
    ctx.font = "6px monospace";
    ctx.fillText(step.text, 160, 192);
    ctx.restore();
  }
}
