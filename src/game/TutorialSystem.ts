import type { Input } from "./Input";
import { t, uiFont, type Language } from "./i18n";

export type TutorialStepId = "move" | "fire" | "skill" | "interact" | "swap";
const STEPS: TutorialStepId[] = ["move", "fire", "skill", "interact", "swap"];

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
    if (step === "move") {
      const axis = input.getAxis();
      advanced = Math.hypot(axis.x, axis.y) > 0.3;
    } else if (step === "fire") advanced = input.wasActionPressed("fire");
    else if (step === "skill") advanced = input.wasActionPressed("skill");
    else if (step === "interact") advanced = input.wasActionPressed("interact");
    else advanced = input.wasActionPressed("swapWeapon");
    if (!advanced) return false;
    this.stepIndex++;
    if (this.stepIndex >= STEPS.length) {
      this.complete = true;
      return true;
    }
    return false;
  }

  draw(ctx: CanvasRenderingContext2D, input: Input, language: Language = "en") {
    if (this.complete) return;
    const step = STEPS[this.stepIndex];
    const prompt = step === "move"
      ? input.getLastDevice() === "gamepad" ? "L-STICK" : input.getLastDevice() === "touch" ? "JOYSTICK" : "WASD"
      : input.getPrompt(step === "swap" ? "swapWeapon" : step);
    ctx.save();
    ctx.fillStyle = "rgba(7, 13, 24, 0.92)";
    ctx.strokeStyle = "#00F2FE";
    ctx.fillRect(62, 176, 196, 18);
    ctx.strokeRect(62, 176, 196, 18);
    ctx.textAlign = "center";
    ctx.fillStyle = "#F1C40F";
    ctx.font = uiFont(language, 7, true);
    ctx.fillText(`${this.stepIndex + 1}/${STEPS.length}  [${prompt}] ${t(language, `tutorial.${step}` as Parameters<typeof t>[1])}`, 160, 188);
    ctx.restore();
  }
}
