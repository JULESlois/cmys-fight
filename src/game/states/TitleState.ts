import { GameState } from "./GameState";
import { Engine } from "../Engine";
import { MenuRenderer } from "../render/MenuRenderer";
import { audio } from "../audio/AudioManager";
import { APP_VERSION } from "../../version";
import { MenuBackdropRenderer } from "../render/MenuBackdropRenderer";
import { t as tr, uiFont } from "../i18n";

export class TitleState extends GameState {
  protected options = ["newRun", "continue", "hub", "records", "settings"] as const;
  protected selectedIndex = 0;
  private introTimer = 999;

  constructor(engine: Engine) {
    super(engine);
  }

  enter(params?: any) {
    if (params?.fromSplash) {
      this.introTimer = 0;
    } else {
      this.introTimer = 999;
    }
  }
  
  exit() {}

  private moveSelection(direction: number): void {
    const hasSave = this.engine.data.hasValidSave();
    do {
      this.selectedIndex = (this.selectedIndex + direction + this.options.length) % this.options.length;
    } while (!hasSave && this.options[this.selectedIndex] === "continue");
  }

  update(dt: number) {
    if (this.introTimer < 2.0) {
      this.introTimer += dt;
      // Skip intro on input
      if (this.engine.input.wasUiPressed("confirm") || this.engine.input.wasUiPressed("cancel") || this.engine.input.wasActionPressed("fire") || this.engine.input.wasActionPressed("pause")) {
        this.introTimer = 999;
      }
    }

    if (this.introTimer >= 0.5) {
      if (this.engine.input.wasUiPressed("up")) {
        this.moveSelection(-1);
        audio.playShoot(); // Reuse some sound for blip
      }
      if (this.engine.input.wasUiPressed("down")) {
        this.moveSelection(1);
        audio.playShoot();
      }
      if (this.engine.input.wasUiPressed("confirm")) {
        this.handleSelect();
      }
    }
  }

  private handleSelect() {
    const opt = this.options[this.selectedIndex];
    if (opt === "newRun") {
      this.engine.switchState("hub", { spawnAnchor: "rebirth_spring" });
    } else if (opt === "hub") {
      this.engine.switchState("hub");
    } else if (opt === "records") {
      this.engine.switchState("records", { backState: "title" });
    } else if (opt === "continue") {
      if (!this.engine.data.hasValidSave()) return;
      this.engine.switchState("dungeon");
    } else if (opt === "settings") {
      this.engine.switchState("settings");
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const t = this.engine.data.settings.dynamicBackground && !this.engine.isPerformanceDegraded() ? Date.now() / 1000 : 0;
    MenuBackdropRenderer.draw(ctx, "title", t, this.engine.isPerformanceDegraded());

    const introProgress = Math.min(1.0, this.introTimer / 1.5);

    // Grid drifting
    ctx.globalAlpha = introProgress;
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

    ctx.globalAlpha = 1.0;

    // Title intro
    const titleProgress = Math.min(1.0, Math.max(0, (this.introTimer - 0.2) / 0.8));
    const titleEase = 1 - Math.pow(1 - titleProgress, 3);
    const titleY = 50 - 20 * (1 - titleEase);

    ctx.save();
    ctx.globalAlpha = titleProgress;

    // Pixel shadow/outline for Title
    ctx.textAlign = "center";
    ctx.font = "bold 24px monospace";
    
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
    
    ctx.restore();
    ctx.textAlign = "left";

    const startY = 94;
    const language = this.engine.data.settings.language;
    const hasSave = this.engine.data.hasValidSave();
    
    for (let i = 0; i < this.options.length; i++) {
      const option = this.options[i];
      const label = tr(language, `title.${option}` as Parameters<typeof tr>[1]);
      
      const btnProgress = Math.min(1.0, Math.max(0, (this.introTimer - 0.4 - i * 0.1) / 0.6));
      const btnEase = 1 - Math.pow(1 - btnProgress, 3);
      const btnX = 120 - 20 * (1 - btnEase);

      ctx.save();
      ctx.globalAlpha = btnProgress * (option === "continue" && !hasSave ? 0.5 : 1.0);
      MenuRenderer.drawButton(ctx, label, btnX, startY + i * 20, i === this.selectedIndex, language);
      ctx.restore();
    }
    
    const versionProgress = Math.min(1.0, Math.max(0, (this.introTimer - 1.0) / 0.5));
    ctx.save();
    ctx.globalAlpha = versionProgress;
    ctx.textAlign = "center";
    ctx.fillStyle = "#34495E";
    ctx.font = uiFont(language, 7);
    ctx.fillText(`v${APP_VERSION}`, 160, 230);
    ctx.restore();
    ctx.textAlign = "left";

    // Fade from black transition overlay
    if (this.introTimer < 0.5) {
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - this.introTimer / 0.5})`;
      ctx.fillRect(0, 0, 320, 240);
    }
  }
}
