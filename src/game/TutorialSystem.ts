import type { Input } from "./Input";

export type TutorialStepId = "move" | "fire" | "skill" | "interact" | "swap";

const STEPS: Array<{ id: TutorialStepId; label: string }> = [
  { id: "move", label: "MOVE" },
  { id: "fire", label: "FIRE" },
  { id: "skill", label: "SKILL" },
  { id: "interact", label: "INTERACT" },
  { id: "swap", label: "SWAP" },
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
    ctx.fillRect(62, 176, 196, 18);
    ctx.strokeRect(62, 176, 196, 18);
    ctx.textAlign = "center";
    ctx.fillStyle = "#F1C40F";
    ctx.font = "bold 7px monospace";
    ctx.fillText(`${this.stepIndex + 1}/${STEPS.length}  [${prompt}] ${step.label}`, 160, 188);
    ctx.restore();
  }
}
