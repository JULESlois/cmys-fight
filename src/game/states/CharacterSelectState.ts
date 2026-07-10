import { GameState } from "./GameState";
import { Engine } from "../Engine";
import { MenuRenderer } from "../render/MenuRenderer";
import { audio } from "../audio/AudioManager";
import { PLAYER_PALETTE } from "../data/sprites";
import { CHARACTERS } from "../data/characters";
import { SpriteRenderer } from "../render/SpriteRenderer";
import { WEAPONS } from "../data/weapons";

export class CharacterSelectState extends GameState {
    protected characters = Object.values(CHARACTERS);
  protected selectedIndex = 0;
  protected selectedWeaponIndex = 0;

  constructor(engine: Engine) {
    super(engine);
  }

  enter() {
    const unlockedWeapons = this.getUnlockedWeapons();
    const character = this.characters[this.selectedIndex];
    const preferred = this.engine.data.getStarterWeaponForCharacter(character.id);
    this.selectedWeaponIndex = Math.max(0, unlockedWeapons.findIndex(weapon => weapon.id === preferred));
  }
  exit() {}

  update(dt: number) {
    if (this.engine.input.wasPressed("escape")) {
       this.engine.switchState("title");
       return;
    }
    
    if (this.engine.input.wasPressed("arrowleft") || this.engine.input.wasPressed("a")) {
      this.selectedIndex = (this.selectedIndex - 1 + this.characters.length) % this.characters.length;
      audio.playShoot();
    }
    if (this.engine.input.wasPressed("arrowright") || this.engine.input.wasPressed("d")) {
      this.selectedIndex = (this.selectedIndex + 1) % this.characters.length;
      audio.playShoot();
    }

    const unlockedWeapons = this.getUnlockedWeapons();
    if (this.engine.input.wasPressed("arrowup") || this.engine.input.wasPressed("w")) {
      this.selectedWeaponIndex = (this.selectedWeaponIndex - 1 + unlockedWeapons.length) % unlockedWeapons.length;
      audio.playShoot();
    }
    if (this.engine.input.wasPressed("arrowdown") || this.engine.input.wasPressed("s")) {
      this.selectedWeaponIndex = (this.selectedWeaponIndex + 1) % unlockedWeapons.length;
      audio.playShoot();
    }

    if (this.engine.input.wasPressed("enter") || this.engine.input.wasPressed(" ")) {
      const char = this.characters[this.selectedIndex];
      if (!this.engine.data.isCharacterUnlocked(char.id)) {
        audio.playHurt();
        return;
      }
      this.engine.data.startNewRun(char.id, unlockedWeapons[this.selectedWeaponIndex]?.id);
      this.engine.switchState("dungeon");
    }
  }

  private getUnlockedWeapons() {
    const weapons = Object.values(WEAPONS).filter(weapon =>
      this.engine.data.isStarterWeaponUnlocked(weapon.id)
    );
    return weapons.length > 0 ? weapons : [WEAPONS.pistol];
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#0A0F19";
    ctx.fillRect(0, 0, 320, 240);

    MenuRenderer.drawTitle(ctx, "SELECT CHARACTER", 160, 30);
    ctx.fillStyle = "#7F8C8D";
    ctx.textAlign = "center";
    ctx.font = "6px monospace";
    ctx.fillText("ARMORY: SHOTGUN 1-5/30 SHARDS | LASER WIN RUN", 160, 48);

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
      const isUnlocked = this.engine.data.isCharacterUnlocked(char.id);
      
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
      if (!isUnlocked) ctx.globalAlpha = 0.35;
      
      // Character sprite
      SpriteRenderer.drawPixelSprite(ctx, "player_main_side_idle", x + cardW / 2, startY + 20, 2, {
        paletteOverride: { ...PLAYER_PALETTE, "2": char.color }
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
      const defaultUnlocked = this.engine.data.isStarterWeaponUnlocked(char.starterWeapon);
      ctx.fillText(`DEF: ${defaultUnlocked ? char.starterWeapon.toUpperCase() : "LOCKED"}`, x + 5, startY + 122);
      ctx.globalAlpha = 1;
      if (!isUnlocked) {
        ctx.fillStyle = "#E74C3C";
        ctx.textAlign = "center";
        ctx.font = "bold 9px monospace";
        ctx.fillText("LOCKED", x + cardW / 2, startY + 58);
      }
    }
    
    // Passive & Title for selected char
    ctx.textAlign = "center";
    const selectedChar = this.characters[this.selectedIndex];
    const selectedUnlocked = this.engine.data.isCharacterUnlocked(selectedChar.id);
    
    ctx.fillStyle = selectedChar.color;
    ctx.font = "bold 10px monospace";
    ctx.fillText(selectedChar.title.toUpperCase(), 160, 202);
    
    ctx.fillStyle = selectedUnlocked ? "#F1C40F" : "#E74C3C";
    ctx.font = "9px monospace";
    const detail = selectedUnlocked
      ? `[PASSIVE] ${selectedChar.passive}`
      : selectedChar.id === "mage"
        ? "UNLOCK: REACH 2-1 OR EARN 50 SHARDS"
        : "UNLOCK: WIN A RUN OR EARN 120 SHARDS";
    ctx.fillText(detail, 160, 214);

    const selectedWeapon = this.getUnlockedWeapons()[this.selectedWeaponIndex] ?? WEAPONS.pistol;
    ctx.fillStyle = "#00F2FE";
    ctx.font = "bold 8px monospace";
    ctx.fillText(`STARTER: ${selectedWeapon.name.toUpperCase()}  [UP/DOWN]`, 160, 225);
    ctx.fillStyle = selectedUnlocked ? "#BDC3C7" : "#E74C3C";
    ctx.font = "7px monospace";
    ctx.fillText(selectedUnlocked ? "ENTER START | LEFT/RIGHT CHARACTER | ESC BACK" : "CHARACTER LOCKED", 160, 236);
    ctx.textAlign = "left";
  }
}
