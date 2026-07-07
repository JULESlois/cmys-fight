import { GameState } from "./GameState";
import { Engine } from "../Engine";
import { MenuRenderer } from "../render/MenuRenderer";
import { audio } from "../audio/AudioManager";

export class TitleState extends GameState {
    protected options = ["NEW RUN", "CONTINUE", "CHARACTER", "SETTINGS"];
  protected selectedIndex = 0;

  constructor(engine: Engine) {
    super(engine);
  }

  enter() {}
  exit() {}

  update(dt: number) {
    if (this.engine.input.justPressed["arrowup"] || this.engine.input.justPressed["w"]) {
      this.selectedIndex = (this.selectedIndex - 1 + this.options.length) % this.options.length;
      audio.playShoot(); // Reuse some sound for blip
    }
    if (this.engine.input.justPressed["arrowdown"] || this.engine.input.justPressed["s"]) {
      this.selectedIndex = (this.selectedIndex + 1) % this.options.length;
      audio.playShoot();
    }
    if (this.engine.input.justPressed["enter"] || this.engine.input.justPressed[" "]) {
      this.handleSelect();
    }
  }

  private handleSelect() {
    const opt = this.options[this.selectedIndex];
    if (opt === "NEW RUN" || opt === "CHARACTER") {
      this.engine.switchState("character_select");
    } else if (opt === "CONTINUE") {
      // Could check if save exists, for now just enter dungeon
      this.engine.switchState("dungeon");
    } else if (opt === "SETTINGS") {
      this.engine.switchState("settings");
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    // BG
    ctx.fillStyle = "#0A0F19";
    ctx.fillRect(0, 0, 320, 240);

    // Particles or grid (simple grid)
    ctx.strokeStyle = "rgba(0, 242, 254, 0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 320; i += 20) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 240); ctx.stroke();
    }
    for (let i = 0; i < 240; i += 20) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(320, i); ctx.stroke();
    }

    MenuRenderer.drawTitle(ctx, "CMYS FIGHT", 160, 60);

    const startY = 120;
    for (let i = 0; i < this.options.length; i++) {
      MenuRenderer.drawButton(ctx, this.options[i], 120, startY + i * 20, i === this.selectedIndex);
    }
    
    ctx.fillStyle = "#34495E";
    ctx.font = "8px monospace";
    ctx.textAlign = "center";
    ctx.fillText("v0.2.0 - Retro Framework", 160, 230);
    ctx.textAlign = "left";
  }
}
