import { GameState } from "./GameState";
import { events } from "../EventBus";

export class DialogState extends GameState {
  private npc: any;
  private dialogLines: string[] = [];
  private currentLine: number = 0;
  private loading: boolean = false;
  private displayedText: string = "";
  private typeTimer: number = 0;
  private animTimer: number = 0;

  enter(npc: any) {
    this.npc = npc;
    this.dialogLines = [];
    this.currentLine = 0;
    this.displayedText = "";
    this.loading = true;
    this.animTimer = 0;
    this.fetchDialog();
  }

  async fetchDialog() {
    try {
      const p = this.engine.data.data.player;
      const recent = this.engine.data.data.recentEvents;
      
      const response = await fetch("/api/generate-dialog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          npcName: this.npc.name,
          npcRole: this.npc.role,
          playerLevel: p.level,
          playerHealth: p.hp,
          recentEvents: recent
        })
      });
      
      if (!response.ok) throw new Error("Failed");
      const data = await response.json();
      
      this.dialogLines = this.splitText(data.text, 40);
      this.loading = false;
      this.engine.data.logEvent(`Spoke with ${this.npc.name}`);
    } catch (e) {
      console.error(e);
      this.dialogLines = ["Greetings, traveler.", "May the sacred blossoms guide your path.", "(Connection safe, standard response activated.)"];
      this.loading = false;
    }
  }
  
  private splitText(text: string, maxLen: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";
    
    for (const word of words) {
      if ((currentLine + word).length > maxLen) {
        lines.push(currentLine.trim());
        currentLine = word + " ";
      } else {
        currentLine += word + " ";
      }
    }
    if (currentLine) lines.push(currentLine.trim());
    return lines;
  }

  exit() {}

  update(dt: number) {
    this.animTimer += dt;
    if (this.loading) return;

    if (this.currentLine < this.dialogLines.length) {
      const targetText = this.dialogLines[this.currentLine];
      if (this.displayedText.length < targetText.length) {
        this.typeTimer += dt;
        if (this.typeTimer > 0.02) {
          this.displayedText += targetText[this.displayedText.length];
          this.typeTimer = 0;
        }
      } else if (this.engine.input.justPressed[" "] || this.engine.input.justPressed["Enter"]) {
        this.currentLine++;
        this.displayedText = "";
      }
    } else {
      if (this.engine.input.justPressed[" "] || this.engine.input.justPressed["Enter"]) {
        events.emit("state:change", "map");
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Semi-transparent dark overlay
    ctx.fillStyle = "rgba(10, 15, 25, 0.4)";
    ctx.fillRect(0, 0, 320, 240);

    // Vignette
    const vigGrad = ctx.createRadialGradient(160, 120, 110, 160, 120, 230);
    vigGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
    vigGrad.addColorStop(1, "rgba(0, 0, 0, 0.7)");
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, 320, 240);

    // Gorgeous Anime Dialogue Box
    ctx.fillStyle = "rgba(12, 18, 30, 0.95)";
    ctx.strokeStyle = "rgba(0, 242, 254, 0.5)"; // Cyber teal neon frame
    ctx.lineWidth = 1.5;
    ctx.fillRect(10, 160, 300, 70);
    ctx.strokeRect(10, 160, 300, 70);

    // Inner subtle aesthetic corner decorations
    ctx.fillStyle = "rgba(0, 242, 254, 0.2)";
    ctx.fillRect(12, 162, 4, 4);
    ctx.fillRect(304, 162, 4, 4);
    ctx.fillRect(12, 222, 4, 4);
    ctx.fillRect(304, 222, 4, 4);

    // NPC Name badge
    ctx.fillStyle = "rgba(0, 242, 254, 0.95)";
    ctx.fillRect(15, 146, 110, 15);
    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 8px monospace";
    ctx.fillText(this.npc.name.toUpperCase(), 22, 156);

    // Dialog text
    ctx.fillStyle = "#FFF";
    ctx.font = "8px monospace";
    if (this.loading) {
      // Animated dot loading
      const dotCount = Math.floor(this.animTimer * 4) % 4;
      let dots = "";
      for (let i = 0; i < dotCount; i++) dots += ".";
      ctx.fillText("Synchronizing psychic frequency" + dots, 20, 185);
    } else {
      if (this.currentLine < this.dialogLines.length) {
        ctx.fillText(this.displayedText, 20, 185);
        if (this.displayedText.length === this.dialogLines[this.currentLine].length) {
          // Bouncing prompt indicator
          const bounce = Math.floor(this.animTimer * 6) % 2 === 0 ? 0 : 2;
          ctx.fillStyle = "#00F2FE";
          ctx.fillText("▼", 294, 218 + bounce);
        }
      }
    }

    // Secondary UI prompt instructions
    ctx.fillStyle = "rgba(0, 242, 254, 0.6)";
    ctx.font = "6px monospace";
    ctx.fillText("SPACE / ENTER TO ADVANCE", 220, 224);
  }
}
