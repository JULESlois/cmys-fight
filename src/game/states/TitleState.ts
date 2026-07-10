import { GameState } from "./GameState";
import { Engine } from "../Engine";
import { MenuRenderer } from "../render/MenuRenderer";
import { audio } from "../audio/AudioManager";
import { SpriteRenderer } from "../render/SpriteRenderer";
import { createRunProgressFromGlobalStage, getStageLabel } from "../RunProgress";

export class TitleState extends GameState {
    protected options = ["NEW RUN", "CONTINUE", "HUB", "SETTINGS"];
  protected selectedIndex = 0;

  constructor(engine: Engine) {
    super(engine);
  }

  enter() {}
  exit() {}

  update(dt: number) {
    if (this.engine.input.wasPressed("arrowup") || this.engine.input.wasPressed("w")) {
      this.selectedIndex = (this.selectedIndex - 1 + this.options.length) % this.options.length;
      audio.playShoot(); // Reuse some sound for blip
    }
    if (this.engine.input.wasPressed("arrowdown") || this.engine.input.wasPressed("s")) {
      this.selectedIndex = (this.selectedIndex + 1) % this.options.length;
      audio.playShoot();
    }
    if (this.engine.input.wasPressed("enter") || this.engine.input.wasPressed(" ")) {
      this.handleSelect();
    }
  }

  private handleSelect() {
    const opt = this.options[this.selectedIndex];
    if (opt === "NEW RUN" || opt === "HUB") {
      this.engine.switchState("hub");
    } else if (opt === "CONTINUE") {
      if (!this.engine.data.hasValidSave()) {
        this.engine.switchState("hub");
        return;
      }
      this.engine.switchState("dungeon");
    } else if (opt === "SETTINGS") {
      this.engine.switchState("settings");
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    // BG
    ctx.fillStyle = "#0A0F19";
    ctx.fillRect(0, 0, 320, 240);

    // Grid drifting
    const t = Date.now() / 1000;
    const driftX = (t * 10) % 20;
    const driftY = (t * 10) % 20;

    ctx.strokeStyle = "rgba(0, 242, 254, 0.05)";
    ctx.lineWidth = 1;
    for (let i = -20; i < 340; i += 20) {
      ctx.beginPath(); ctx.moveTo(i + driftX, 0); ctx.lineTo(i + driftX, 240); ctx.stroke();
    }
    for (let i = -20; i < 260; i += 20) {
      ctx.beginPath(); ctx.moveTo(0, i + driftY); ctx.lineTo(320, i + driftY); ctx.stroke();
    }

    // Scanlines
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    for(let i=0; i<240; i+=4) {
      ctx.fillRect(0, i, 320, 1);
    }

    // Pixel shadow/outline for Title
    ctx.textAlign = "center";
    ctx.font = "bold 24px monospace";
    const titleY = 50;
    
    // Pixel outline
    ctx.fillStyle = "#1a1c2c";
    ctx.fillText("CMYS FIGHT", 160 - 2, titleY);
    ctx.fillText("CMYS FIGHT", 160 + 2, titleY);
    ctx.fillText("CMYS FIGHT", 160, titleY - 2);
    ctx.fillText("CMYS FIGHT", 160, titleY + 2);
    
    // Inner text
    ctx.fillStyle = "#00F2FE";
    ctx.fillText("CMYS FIGHT", 160, titleY);
    
    // Subtitle
    ctx.font = "bold 10px monospace";
    ctx.fillStyle = "#1a1c2c";
    ctx.fillText("DEEP DELVE", 160, titleY + 16 + 1);
    ctx.fillStyle = "#BDC3C7";
    ctx.fillText("DEEP DELVE", 160, titleY + 16);
    
    ctx.textAlign = "left";

    const startY = 120;
    const hasSave = this.engine.data.hasValidSave();
    for (let i = 0; i < this.options.length; i++) {
      let label = this.options[i];
      if (label === "CONTINUE" && !hasSave) {
        ctx.globalAlpha = 0.5;
      }
      MenuRenderer.drawButton(ctx, label, 120, startY + i * 20, i === this.selectedIndex);
      ctx.globalAlpha = 1.0;
    }
    
    ctx.fillStyle = "#34495E";
    ctx.font = "8px monospace";
    ctx.textAlign = "center";
    const meta = this.engine.data.meta;
    const bestTime = meta.bestVictoryTime === null
      ? "--:--"
      : `${Math.floor(meta.bestVictoryTime / 60)}:${Math.floor(meta.bestVictoryTime % 60).toString().padStart(2, "0")}`;
    const bestStage = getStageLabel(createRunProgressFromGlobalStage(meta.highestStage));
    ctx.fillText(`SHARDS ${meta.currency}  STAGE ${bestStage}  WINS ${meta.victories}  BEST ${bestTime}`, 160, 218);
    ctx.fillText("v0.4.0 - DEEP HUB", 160, 230);
    ctx.textAlign = "left";
  }
}
