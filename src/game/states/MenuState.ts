import { GameState } from "./GameState";
import { events } from "../EventBus";
import { generateFloor } from "../FloorGenerator";

export class MenuState extends GameState {
  private selection = 0;
  private options = ["RESUME JOURNEY", "ARCHIVE SAVE", "RESTORE ARCHIVE", "RESET GAME"];
  private message = "";
  
  enter() {
    this.selection = 0;
    this.message = "System Menu Loaded.";
  }

  exit() {}

  update(dt: number) {
    if (this.engine.input.justPressed["ArrowUp"] || this.engine.input.justPressed["w"]) {
      this.selection = (this.selection - 1 + this.options.length) % this.options.length;
    }
    if (this.engine.input.justPressed["ArrowDown"] || this.engine.input.justPressed["s"]) {
      this.selection = (this.selection + 1) % this.options.length;
    }
    
    if (this.engine.input.justPressed["Enter"] || this.engine.input.justPressed[" "]) {
      this.handleSelect();
    }
    
    if (this.engine.input.justPressed["Escape"]) {
      events.emit("state:change", "dungeon");
    }
  }
  
  private handleSelect() {
    switch (this.selection) {
      case 0:
        events.emit("state:change", "dungeon");
        break;
      case 1:
        this.engine.data.save();
        this.message = "Archive save completed!";
        break;
      case 2:
        this.engine.data.load();
        this.message = "Archive loaded!";
        break;
      case 3:
        localStorage.removeItem("retro_rpg_save");
        this.engine.data.data = {
          player: { x: 160, y: 120, hp: 6, maxHp: 6, armor: 5, maxArmor: 5, mana: 100, maxMana: 100, currentWeaponId: "pistol", level: 1, exp: 0 },
          recentEvents: ["Restarted the universe"],
          floor: generateFloor(1),
        };
        this.message = "Journey reset successfully!";
        break;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Dim background
    ctx.fillStyle = "rgba(10, 15, 25, 0.75)";
    ctx.fillRect(0, 0, 320, 240);
    
    // Vignette
    const vigGrad = ctx.createRadialGradient(160, 120, 110, 160, 120, 230);
    vigGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
    vigGrad.addColorStop(1, "rgba(0, 0, 0, 0.85)");
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, 320, 240);

    // Draw Pause Box
    ctx.fillStyle = "rgba(12, 18, 30, 0.95)";
    ctx.strokeStyle = "rgba(142, 68, 173, 0.6)"; // Deep violet
    ctx.lineWidth = 1.5;
    ctx.fillRect(70, 30, 180, 180);
    ctx.strokeRect(70, 30, 180, 180);
    
    // Decorative border corner lines
    ctx.fillStyle = "rgba(142, 68, 173, 0.3)";
    ctx.fillRect(72, 32, 4, 4);
    ctx.fillRect(244, 32, 4, 4);
    ctx.fillRect(72, 204, 4, 4);
    ctx.fillRect(244, 204, 4, 4);

    // Title
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 9px monospace";
    ctx.fillText("TACTICAL JOURNEY ARCHIVE", 85, 48);
    
    // Divider line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.beginPath();
    ctx.moveTo(85, 55);
    ctx.lineTo(235, 55);
    ctx.stroke();

    // Render Options
    for (let i = 0; i < this.options.length; i++) {
      const yPos = 80 + i * 20;
      if (i === this.selection) {
        ctx.fillStyle = "#00F2FE"; // Neon cyan selection
        ctx.font = "bold 8px monospace";
        ctx.fillText("> " + this.options[i], 90, yPos);
      } else {
        ctx.fillStyle = "#8E9EAB";
        ctx.font = "8px monospace";
        ctx.fillText("  " + this.options[i], 90, yPos);
      }
    }
    
    // Draw Status message
    if (this.message) {
      ctx.fillStyle = "#F1C40F";
      ctx.font = "7px monospace";
      ctx.fillText(this.message, 85, 162);
    }

    // Divider line
    ctx.beginPath();
    ctx.moveTo(85, 170);
    ctx.lineTo(235, 170);
    ctx.stroke();

    // Draw player statistics
    const p = this.engine.data.data.player;
    ctx.fillStyle = "#FFF";
    ctx.font = "8px monospace";
    ctx.fillText(`HERO LEVEL: ${p.level}`, 85, 182);
    ctx.fillText(`HEALTH    : ${p.hp}/${p.maxHp} HP`, 85, 194);
  }
}
