import { GameState } from "./GameState";
import { Engine } from "../Engine";
import { MenuRenderer } from "../render/MenuRenderer";
import { audio } from "../audio/AudioManager";
import { CHARACTERS } from "../data/characters";
import { SpriteRenderer } from "../render/SpriteRenderer";

export class CharacterSelectState extends GameState {
    protected characters = Object.values(CHARACTERS);
  protected selectedIndex = 0;

  constructor(engine: Engine) {
    super(engine);
  }

  enter() {}
  exit() {}

  update(dt: number) {
    if (this.engine.input.justPressed["escape"]) {
       this.engine.switchState("title");
       return;
    }
    
    if (this.engine.input.justPressed["arrowleft"] || this.engine.input.justPressed["a"]) {
      this.selectedIndex = (this.selectedIndex - 1 + this.characters.length) % this.characters.length;
      audio.playShoot();
    }
    if (this.engine.input.justPressed["arrowright"] || this.engine.input.justPressed["d"]) {
      this.selectedIndex = (this.selectedIndex + 1) % this.characters.length;
      audio.playShoot();
    }

    if (this.engine.input.justPressed["enter"] || this.engine.input.justPressed[" "]) {
      const char = this.characters[this.selectedIndex];
      this.engine.data.startNewRun(char.id);
      this.engine.switchState("dungeon");
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#0A0F19";
    ctx.fillRect(0, 0, 320, 240);

    MenuRenderer.drawTitle(ctx, "SELECT CHARACTER", 160, 30);

    const cardW = 85;
    const cardH = 130;
    const spacing = 15;
    const totalW = this.characters.length * cardW + (this.characters.length - 1) * spacing;
    const startX = 160 - totalW / 2;
    const startY = 60;

    for (let i = 0; i < this.characters.length; i++) {
      const char = this.characters[i];
      const x = startX + i * (cardW + spacing);
      const isSelected = (i === this.selectedIndex);
      
      // Card BG
      if (isSelected) {
         ctx.fillStyle = "rgba(0, 242, 254, 0.2)";
         ctx.fillRect(x - 2, startY - 2, cardW + 4, cardH + 4);
         ctx.strokeStyle = "#00F2FE";
      } else {
         ctx.fillStyle = "rgba(10, 15, 25, 0.9)";
         ctx.fillRect(x, startY, cardW, cardH);
         ctx.strokeStyle = "#34495E";
      }
      ctx.lineWidth = 1;
      ctx.strokeRect(x, startY, cardW, cardH);
      
      // Character sprite
      SpriteRenderer.drawPixelSprite(ctx, `player_${char.id}_idle_down`, x + cardW / 2, startY + 20, 2, {
        paletteOverride: { "2": char.color }
      });
      
      // Name
      ctx.fillStyle = "#FFF";
      ctx.textAlign = "center";
      ctx.font = "bold 10px monospace";
      ctx.fillText(char.name, x + cardW/2, startY + 45);
      
      // Stats
      ctx.textAlign = "left";
      MenuRenderer.drawStatBar(ctx, "HP", char.maxHp, 10, x + 5, startY + 65, "#E74C3C");
      MenuRenderer.drawStatBar(ctx, "AR", char.maxArmor, 10, x + 5, startY + 80, "#BDC3C7");
      MenuRenderer.drawStatBar(ctx, "MP", char.maxMana, 150, x + 5, startY + 95, "#3498DB");
      MenuRenderer.drawStatBar(ctx, "SP", char.speed, 150, x + 5, startY + 110, "#F1C40F");
      
      // Weapon (small label)
      ctx.fillStyle = "#BDC3C7";
      ctx.font = "8px monospace";
      ctx.fillText(`WPN: ${char.starterWeapon.toUpperCase()}`, x + 5, startY + 122);
    }
    
    // Passive & Title for selected char
    ctx.textAlign = "center";
    const selectedChar = this.characters[this.selectedIndex];
    
    ctx.fillStyle = selectedChar.color;
    ctx.font = "bold 10px monospace";
    ctx.fillText(selectedChar.title.toUpperCase(), 160, 202);
    
    ctx.fillStyle = "#F1C40F";
    ctx.font = "9px monospace";
    ctx.fillText(`[PASSIVE] ${selectedChar.passive}`, 160, 214);

    // Bottom tips
    ctx.fillStyle = "#00F2FE";
    ctx.fillText("PRESS ENTER TO START", 160, 225);
    ctx.fillStyle = "#BDC3C7";
    ctx.font = "8px monospace";
    ctx.fillText("Arrows to select | ESC to back", 160, 235);
    ctx.textAlign = "left";
  }
}
