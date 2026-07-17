import { GameState } from "./GameState";
import { uiFont } from "../i18n";

export class SplashState extends GameState {
  private elapsed = 0;
  
  private phases = [
    { topText: "POWERED BY", bottomText: "REACT", duration: 3.5 },
    { topText: "CMYS", bottomText: "PRESENTS", duration: 3.5 }
  ];
  
  private currentPhaseIndex = 0;
  private canSkip = false;

  enter() {
    this.elapsed = 0;
    this.currentPhaseIndex = 0;
    const hasLaunchedBefore = localStorage.getItem("cmys_has_launched");
    this.canSkip = !!hasLaunchedBefore;
    if (!hasLaunchedBefore) {
      localStorage.setItem("cmys_has_launched", "true");
    }
  }

  exit() {}

  update(dt: number = 1/60) {
    this.elapsed += dt;
    
    if (this.canSkip && (Object.keys(this.engine.input['keysJustPressed'] || {}).length > 0 || Object.keys(this.engine.input['touchJustPressed'] || {}).length > 0 || Object.keys(this.engine.input['touchUiJustPressed'] || {}).length > 0 || Object.keys(this.engine.input['gamepadJustPressed'] || {}).length > 0 || Object.keys(this.engine.input['gamepadUiJustPressed'] || {}).length > 0 || this.engine.input.wasUiPressed("confirm"))) {
      this.engine.switchState("hub", { spawnAnchor: "rebirth_spring", fromSplash: true });
      return;
    }
    
    if (this.engine.input.wasUiPressed("confirm") || this.engine.input.wasUiPressed("cancel") || this.engine.input.wasActionPressed("fire") || this.engine.input.wasActionPressed("pause")) {
      this.engine.switchState("hub", { spawnAnchor: "rebirth_spring", fromSplash: true });
      return;
    }

    if (this.currentPhaseIndex < this.phases.length) {
      if (this.elapsed > this.phases[this.currentPhaseIndex].duration) {
        this.elapsed -= this.phases[this.currentPhaseIndex].duration;
        this.currentPhaseIndex++;
      }
    }

    if (this.currentPhaseIndex >= this.phases.length) {
      this.engine.switchState("hub", { spawnAnchor: "rebirth_spring", fromSplash: true });
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, 320, 240);

    if (this.currentPhaseIndex >= this.phases.length) return;

    const phase = this.phases[this.currentPhaseIndex];

    let alpha = 1;
    const fadeTime = 0.8;
    
    if (this.elapsed < fadeTime) {
      alpha = this.elapsed / fadeTime;
    } else if (this.elapsed > phase.duration - fadeTime) {
      alpha = Math.max(0, (phase.duration - this.elapsed) / fadeTime);
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    ctx.font = uiFont("en", 8, false);
    ctx.fillText(phase.topText, 160, 110);
    
    ctx.font = uiFont("en", 16, true);
    ctx.fillText(phase.bottomText, 160, 130);
    
    ctx.restore();
  }
}
