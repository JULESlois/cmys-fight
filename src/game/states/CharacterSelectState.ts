import { GameState } from "./GameState";
import { Engine } from "../Engine";
import { MenuRenderer } from "../render/MenuRenderer";
import { audio } from "../audio/AudioManager";
import { PLAYER_PALETTE } from "../data/sprites";
import { CHARACTERS } from "../data/characters";
import { SpriteRenderer } from "../render/SpriteRenderer";
import { WEAPONS } from "../data/weapons";
import { MAX_PLAYER_MANA } from "../entities/Player";
import { getCharacterText, t, uiFont } from "../i18n";

export class CharacterSelectState extends GameState {
    protected characters = Object.values(CHARACTERS);
  protected selectedIndex = 0;
  protected selectedWeaponIndex = 0;
  private backState: "title" | "hub" = "hub";

  constructor(engine: Engine) {
    super(engine);
  }

  enter(params?: { backState?: "title" | "hub" }) {
    this.backState = params?.backState === "title" ? "title" : "hub";
    const unlockedWeapons = this.getUnlockedWeapons();
    const character = this.characters[this.selectedIndex];
    const preferred = this.engine.data.getStarterWeaponForCharacter(character.id);
    this.selectedWeaponIndex = Math.max(0, unlockedWeapons.findIndex(weapon => weapon.id === preferred));
  }
  exit() {}

  update(dt: number) {
    if (this.engine.input.wasPressed("escape")) {
       this.engine.switchState(this.backState);
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

    const language = this.engine.data.settings.language;
    MenuRenderer.drawTitle(ctx, t(language, "character.title"), 160, 30, language);
    ctx.fillStyle = this.engine.data.meta.preferredHardMode ? "#E74C3C" : "#7F8C8D";
    ctx.textAlign = "center";
    ctx.font = uiFont(language, 6, true);
    ctx.fillText(t(language, "character.runMode", {
      mode: t(language, this.engine.data.meta.preferredHardMode ? "common.hard" : "common.normal"),
    }), 160, 40);

    const cardW = 85;
    const cardH = 130;
    const spacing = 15;
    const totalW = this.characters.length * cardW + (this.characters.length - 1) * spacing;
    const startX = 160 - totalW / 2;
    const startY = 54;

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
      ctx.font = uiFont(language, 10, true);
      ctx.fillText(char.name, x + cardW/2, startY + 45);
      
      // Stats
      ctx.textAlign = "left";
      MenuRenderer.drawStatBar(ctx, "HP", char.maxHp, 10, x + 5, startY + 65, "#E74C3C");
      MenuRenderer.drawStatBar(ctx, "AR", char.maxArmor, 10, x + 5, startY + 80, "#BDC3C7");
      MenuRenderer.drawStatBar(ctx, "MP", char.maxMana, MAX_PLAYER_MANA, x + 5, startY + 95, "#3498DB");
      MenuRenderer.drawStatBar(ctx, "SP", char.speed, 150, x + 5, startY + 110, "#F1C40F");
      
      // Weapon (small label)
      ctx.fillStyle = "#BDC3C7";
      ctx.font = uiFont(language, 8);
      const defaultUnlocked = this.engine.data.isStarterWeaponUnlocked(char.starterWeapon);
      ctx.fillText(t(language, "character.defaultWeapon", {
        weapon: defaultUnlocked ? char.starterWeapon.toUpperCase() : t(language, "common.locked"),
      }), x + 5, startY + 122);
      ctx.globalAlpha = 1;
      if (!isUnlocked) {
        ctx.fillStyle = "#E74C3C";
        ctx.textAlign = "center";
        ctx.font = uiFont(language, 9, true);
        ctx.fillText(t(language, "common.locked"), x + cardW / 2, startY + 58);
      }
    }
    
    // Passive & Title for selected char
    ctx.textAlign = "center";
    const selectedChar = this.characters[this.selectedIndex];
    const selectedUnlocked = this.engine.data.isCharacterUnlocked(selectedChar.id);
    
    const localizedCharacter = getCharacterText(selectedChar.id, selectedChar, language);
    ctx.fillStyle = selectedChar.color;
    ctx.font = uiFont(language, 10, true);
    ctx.fillText(localizedCharacter.title, 160, 202);
    
    ctx.fillStyle = selectedUnlocked ? "#F1C40F" : "#E74C3C";
    ctx.font = uiFont(language, 9);
    const detail = selectedUnlocked
      ? localizedCharacter.passive
      : selectedChar.id === "mage"
        ? t(language, "character.unlockMage")
        : t(language, "character.unlockRogue");
    ctx.fillText(detail, 160, 214);

    const selectedWeapon = this.getUnlockedWeapons()[this.selectedWeaponIndex] ?? WEAPONS.pistol;
    ctx.fillStyle = "#00F2FE";
    ctx.font = uiFont(language, 8, true);
    ctx.fillText(`↑↓  ${selectedWeapon.name.toUpperCase()}`, 160, 225);
    ctx.fillStyle = selectedUnlocked ? "#BDC3C7" : "#E74C3C";
    ctx.font = uiFont(language, 7);
    ctx.fillText(selectedUnlocked ? t(language, "character.footer", { cancel: this.engine.input.getCancelPrompt() }) : t(language, "common.locked"), 160, 236);
    ctx.textAlign = "left";
  }
}
