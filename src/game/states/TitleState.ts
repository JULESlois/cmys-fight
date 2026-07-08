import { GameState } from "./GameState";
import { Engine } from "../Engine";
import { MenuRenderer } from "../render/MenuRenderer";
import { audio } from "../audio/AudioManager";
import { SpriteRenderer } from "../render/SpriteRenderer";
import { CHARACTERS } from "../data/characters";

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
      if (!this.engine.data.hasValidSave()) {
        this.engine.data.startNewRun("knight");
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

    // Draw random or selected character on the side
    const charIds = Object.keys(CHARACTERS);
    const displayChar = CHARACTERS[charIds[Math.floor(t) % charIds.length]];
    
    // shadow for sprite
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(240, 160, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    SpriteRenderer.drawPixelSprite(ctx, `player_${displayChar.id}_idle`, 240, 160 - 16, 4, {
      paletteOverride: { "2": displayChar.color }
    });

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
    ctx.fillText("v0.2.0 - Retro Framework", 160, 230);
    ctx.textAlign = "left";
  }
}
