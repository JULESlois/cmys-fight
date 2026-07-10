import { GameState } from "./GameState";
import { Engine } from "../Engine";
import { MenuRenderer } from "../render/MenuRenderer";
import { audio } from "../audio/AudioManager";

export class SettingsState extends GameState {
    protected options = ["MASTER VOLUME", "SCREEN SHAKE", "CRT FILTER", "CONTROLS", "BACK"];
  protected selectedIndex = 0;

  constructor(engine: Engine) {
    super(engine);
  }

  enter() {}
  exit() {}

  update(dt: number) {
    if (this.engine.input.wasPressed("escape")) {
       this.engine.switchState("title");
       return;
    }
    
    if (this.engine.input.wasPressed("arrowup") || this.engine.input.wasPressed("w")) {
      this.selectedIndex = (this.selectedIndex - 1 + this.options.length) % this.options.length;
      audio.playShoot();
    }
    if (this.engine.input.wasPressed("arrowdown") || this.engine.input.wasPressed("s")) {
      this.selectedIndex = (this.selectedIndex + 1) % this.options.length;
      audio.playShoot();
    }
    
    // Toggle values for left/right
    const opt = this.options[this.selectedIndex];
    if (this.engine.input.wasPressed("arrowleft") || this.engine.input.wasPressed("a")) {
      this.adjustSetting(opt, -1);
    }
    if (this.engine.input.wasPressed("arrowright") || this.engine.input.wasPressed("d")) {
      this.adjustSetting(opt, 1);
    }

    if (this.engine.input.wasPressed("enter") || this.engine.input.wasPressed(" ")) {
      if (opt === "BACK") {
        this.engine.switchState("title");
      } else {
        this.adjustSetting(opt, 1); // space toggles as well
      }
    }
  }

  private adjustSetting(opt: string, dir: number) {
     const settings = this.engine.data.data.settings;
     if (!settings) return;
     
     if (opt === "MASTER VOLUME") {
        settings.masterVolume = Math.max(0, Math.min(100, settings.masterVolume + dir * 10));
     } else if (opt === "SCREEN SHAKE") {
        settings.screenShake = !settings.screenShake;
     } else if (opt === "CRT FILTER") {
        settings.crtFilter = !settings.crtFilter;
     }
     this.engine.data.save();
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#0A0F19";
    ctx.fillRect(0, 0, 320, 240);

    MenuRenderer.drawTitle(ctx, "SYSTEM SETTINGS", 160, 40);
    MenuRenderer.drawPanel(ctx, 40, 60, 240, 150);

    const startY = 80;
    const settings = this.engine.data.data.settings || { masterVolume: 100, screenShake: true, crtFilter: true };
    
    for (let i = 0; i < this.options.length; i++) {
      const opt = this.options[i];
      MenuRenderer.drawButton(ctx, opt, 60, startY + i * 20, i === this.selectedIndex);
      
      // Draw values
      ctx.fillStyle = "#00F2FE";
      ctx.font = "12px monospace";
      ctx.textAlign = "right";
      if (opt === "MASTER VOLUME") {
         ctx.fillText(`${settings.masterVolume}%`, 260, startY + i * 20);
      } else if (opt === "SCREEN SHAKE") {
         ctx.fillText(settings.screenShake ? "ON" : "OFF", 260, startY + i * 20);
      } else if (opt === "CRT FILTER") {
         ctx.fillText(settings.crtFilter ? "ON" : "OFF", 260, startY + i * 20);
      } else if (opt === "CONTROLS") {
         ctx.fillText("WIP", 260, startY + i * 20);
      }
      ctx.textAlign = "left";
    }
  }
}
