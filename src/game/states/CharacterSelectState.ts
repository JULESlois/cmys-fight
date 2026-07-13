import { GameState } from "./GameState";
import { Engine } from "../Engine";
import { MenuRenderer } from "../render/MenuRenderer";
import { audio } from "../audio/AudioManager";
import { KANAMI_PLAYER_PALETTE, MICHELE_PLAYER_PALETTE, PLAYER_PALETTE } from "../data/sprites";
import { CHARACTERS, type CharacterConfig } from "../data/characters";
import { SpriteRenderer } from "../render/SpriteRenderer";
import { WEAPONS, isWeaponAvailableForCharacter, type WeaponData } from "../data/weapons";
import { MAX_PLAYER_MANA } from "../entities/Player";
import { getCharacterText, t, uiFont, wrapLocalized } from "../i18n";
import { SkillController } from "../combat/SkillController";

type IdentityId = "cmys" | "michele" | "kanami";
type SelectionMode = "identity" | "form";

const IDENTITY_IDS: IdentityId[] = ["cmys", "michele", "kanami"];
const CMYS_FORM_IDS = ["knight", "mage", "rogue"] as const;

export class CharacterSelectState extends GameState {
  protected selectedIndex = 0;
  protected selectedWeaponIndex = 0;
  private selectedFormIndex = 0;
  private mode: SelectionMode = "identity";
  private backState: "title" | "hub" = "hub";

  constructor(engine: Engine) {
    super(engine);
  }

  enter(params?: { backState?: "title" | "hub" }) {
    this.backState = params?.backState === "title" ? "title" : "hub";
    this.mode = "identity";
    this.selectedIndex = 0;
    this.selectedFormIndex = 0;
    this.syncWeaponSelection("knight");
  }

  exit() {}

  private get selectedIdentity(): IdentityId {
    return IDENTITY_IDS[this.selectedIndex] ?? "cmys";
  }

  private get selectedForm(): CharacterConfig {
    return CHARACTERS[CMYS_FORM_IDS[this.selectedFormIndex]] ?? CHARACTERS.knight;
  }

  private getUnlockedWeapons(characterId: string): WeaponData[] {
    const weapons = Object.values(WEAPONS).filter(weapon =>
      this.engine.data.isStarterWeaponUnlocked(weapon.id) &&
      isWeaponAvailableForCharacter(weapon, characterId)
    );
    const fallback = WEAPONS[CHARACTERS[characterId]?.starterWeapon] ?? WEAPONS.pistol;
    return weapons.length > 0 ? weapons : [fallback];
  }

  private syncWeaponSelection(characterId: string): void {
    const character = CHARACTERS[characterId] ?? CHARACTERS.knight;
    const unlockedWeapons = this.getUnlockedWeapons(character.id);
    const preferred = this.engine.data.getStarterWeaponForCharacter(character.id);
    const preferredIndex = unlockedWeapons.findIndex(weapon => weapon.id === preferred);
    this.selectedWeaponIndex = preferredIndex >= 0 ? preferredIndex : 0;
  }

  private cycleWeapon(characterId: string, direction: number): void {
    const weapons = this.getUnlockedWeapons(characterId);
    this.selectedWeaponIndex = (this.selectedWeaponIndex + direction + weapons.length) % weapons.length;
    audio.playShoot();
  }

  private startCharacter(character: CharacterConfig): void {
    if (!this.engine.data.isCharacterUnlocked(character.id)) {
      audio.playHurt();
      return;
    }
    const weapons = this.getUnlockedWeapons(character.id);
    this.engine.data.startNewRun(character.id, weapons[this.selectedWeaponIndex]?.id);
    this.engine.switchState("dungeon");
  }

  update(_dt: number) {
    if (this.engine.input.wasUiPressed("cancel")) {
      if (this.mode === "form") {
        this.mode = "identity";
        this.selectedIndex = 0;
        audio.playShoot();
      } else {
        this.engine.switchState(this.backState);
      }
      return;
    }

    const left = this.engine.input.wasUiPressed("left");
    const right = this.engine.input.wasUiPressed("right");
    const up = this.engine.input.wasUiPressed("up");
    const down = this.engine.input.wasUiPressed("down");
    const confirm = this.engine.input.wasUiPressed("confirm");

    if (this.mode === "identity") {
      if (left || right) {
        const direction = left ? -1 : 1;
        this.selectedIndex = (this.selectedIndex + direction + IDENTITY_IDS.length) % IDENTITY_IDS.length;
        if (this.selectedIdentity !== "cmys") this.syncWeaponSelection(this.selectedIdentity);
        audio.playShoot();
      }
      if (this.selectedIdentity !== "cmys") {
        if (up) this.cycleWeapon(this.selectedIdentity, -1);
        if (down) this.cycleWeapon(this.selectedIdentity, 1);
      }
      if (confirm) {
        if (this.selectedIdentity === "cmys") {
          this.mode = "form";
          this.selectedFormIndex = 0;
          this.syncWeaponSelection(this.selectedForm.id);
          audio.playPickup();
        } else {
          this.startCharacter(CHARACTERS[this.selectedIdentity]);
        }
      }
      return;
    }

    if (left || right) {
      const direction = left ? -1 : 1;
      this.selectedFormIndex = (this.selectedFormIndex + direction + CMYS_FORM_IDS.length) % CMYS_FORM_IDS.length;
      this.syncWeaponSelection(this.selectedForm.id);
      audio.playShoot();
    }
    if (up) this.cycleWeapon(this.selectedForm.id, -1);
    if (down) this.cycleWeapon(this.selectedForm.id, 1);
    if (confirm) this.startCharacter(this.selectedForm);
  }

  private drawCharacterSprite(
    ctx: CanvasRenderingContext2D,
    characterId: string,
    x: number,
    y: number,
    scale: number,
    color: string,
  ): void {
    const dedicated = characterId === "michele" || characterId === "kanami";
    const spriteName = characterId === "michele"
      ? "player_michele_side_idle"
      : characterId === "kanami"
        ? "player_kanami_side_idle"
        : "player_main_side_idle";
    const palette = characterId === "michele"
      ? MICHELE_PLAYER_PALETTE
      : characterId === "kanami"
        ? KANAMI_PLAYER_PALETTE
        : { ...PLAYER_PALETTE, "2": color };
    SpriteRenderer.drawPixelSprite(ctx, spriteName, x, y, scale, {
      paletteOverride: dedicated ? palette : { ...palette, "2": color },
      outlineColor: "#09101A",
    });
  }

  private drawStats(ctx: CanvasRenderingContext2D, character: CharacterConfig, x: number, y: number, width: number): void {
    MenuRenderer.drawStatBar(ctx, "HP", character.maxHp, 10, x, y, "#E74C3C", width);
    MenuRenderer.drawStatBar(ctx, "AR", character.maxArmor, 10, x, y + 15, "#BDC3C7", width);
    MenuRenderer.drawStatBar(ctx, "MP", character.maxMana, MAX_PLAYER_MANA, x, y + 30, "#3498DB", width);
    MenuRenderer.drawStatBar(ctx, "SP", character.speed, 150, x, y + 45, "#F1C40F", width);
  }

  private drawIdentityScreen(ctx: CanvasRenderingContext2D): void {
    const language = this.engine.data.settings.language;
    const cardW = 94;
    const cardH = 140;
    const gap = 8;
    const startX = 160 - (cardW * IDENTITY_IDS.length + gap * (IDENTITY_IDS.length - 1)) / 2;
    const startY = 44;

    for (let index = 0; index < IDENTITY_IDS.length; index++) {
      const id = IDENTITY_IDS[index];
      const x = startX + index * (cardW + gap);
      const selected = index === this.selectedIndex;
      ctx.fillStyle = selected ? "rgba(0, 242, 254, 0.18)" : "rgba(10, 15, 25, 0.9)";
      ctx.fillRect(x, startY, cardW, cardH);
      ctx.strokeStyle = selected ? "#00F2FE" : "#34495E";
      ctx.lineWidth = selected ? 2 : 1;
      ctx.strokeRect(x, startY, cardW, cardH);

      if (id === "cmys") {
        this.drawCharacterSprite(ctx, "knight", x + cardW / 2, startY + 31, 4, "#E74C3C");
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.font = uiFont(language, 12, true);
        ctx.fillText("CMYS", x + cardW / 2, startY + 69);
        ctx.fillStyle = "#F1C40F";
        ctx.font = uiFont(language, 6, true);
        ctx.fillText(t(language, "character.cmysFormsShort"), x + cardW / 2, startY + 82);
        const formLabels = language === "zh-CN" ? ["守御", "奥术", "疾行"] : ["GUARD", "ARCANE", "SWIFT"];
        formLabels.forEach((label, formIndex) => {
          const form = CHARACTERS[CMYS_FORM_IDS[formIndex]];
          const unlocked = this.engine.data.isCharacterUnlocked(form.id);
          ctx.fillStyle = unlocked ? form.color : "#4D5656";
          ctx.fillRect(x + 10, startY + 96 + formIndex * 12, 5, 5);
          ctx.fillStyle = unlocked ? "#BDC3C7" : "#616A6B";
          ctx.textAlign = "left";
          ctx.font = uiFont(language, 6, unlocked);
          ctx.fillText(label, x + 21, startY + 101 + formIndex * 12);
        });
      } else {
        const character = CHARACTERS[id];
        this.drawCharacterSprite(ctx, character.id, x + cardW / 2, startY + 31, 2, character.color);
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.font = uiFont(language, 11, true);
        ctx.fillText(character.name.toUpperCase(), x + cardW / 2, startY + 69);
        ctx.fillStyle = character.color;
        ctx.font = uiFont(language, 6, true);
        ctx.fillText(getCharacterText(character.id, character, language).title, x + cardW / 2, startY + 81);
        ctx.textAlign = "left";
        this.drawStats(ctx, character, x + 7, startY + 90, 51);
      }
    }

    ctx.textAlign = "center";
    if (this.selectedIdentity === "cmys") {
      ctx.fillStyle = "#F1C40F";
      ctx.font = uiFont(language, 9, true);
      ctx.fillText(t(language, "character.chooseForm"), 160, 198);
      ctx.fillStyle = "#9AA7B2";
      ctx.font = uiFont(language, 7);
      ctx.fillText(t(language, "character.cmysForms"), 160, 211);
      ctx.fillStyle = "#BDC3C7";
      ctx.fillText(t(language, "character.identityFooter", {
        horizontal: this.engine.input.getNavigationPrompt("horizontal"),
        confirm: this.engine.input.getConfirmPrompt(),
        cancel: this.engine.input.getCancelPrompt(),
      }), 160, 232);
    } else {
      const character = CHARACTERS[this.selectedIdentity];
      const localized = getCharacterText(character.id, character, language);
      ctx.fillStyle = character.color;
      ctx.font = uiFont(language, 9, true);
      ctx.fillText(`${localized.title} // ${SkillController.getConfig(character.id).name}`, 160, 196);
      ctx.fillStyle = "#F1C40F";
      ctx.font = uiFont(language, 7);
      wrapLocalized(localized.passive, language === "zh-CN" ? 36 : 52).slice(0, 2)
        .forEach((line, lineIndex) => ctx.fillText(line, 160, 208 + lineIndex * 8));
      const weapon = this.getUnlockedWeapons(character.id)[this.selectedWeaponIndex] ?? WEAPONS[character.starterWeapon];
      ctx.fillStyle = "#00F2FE";
      ctx.font = uiFont(language, 8, true);
      ctx.fillText(`↑↓  ${weapon.name.toUpperCase()}`, 160, 226);
      ctx.fillStyle = "#BDC3C7";
      ctx.font = uiFont(language, 7);
      ctx.fillText(t(language, "character.identityCharacterFooter", {
        vertical: this.engine.input.getNavigationPrompt("vertical"),
        confirm: this.engine.input.getConfirmPrompt(),
        cancel: this.engine.input.getCancelPrompt(),
      }), 160, 238);
    }
  }

  private drawFormScreen(ctx: CanvasRenderingContext2D): void {
    const language = this.engine.data.settings.language;
    const cardW = 88;
    const cardH = 130;
    const gap = 8;
    const totalW = cardW * CMYS_FORM_IDS.length + gap * (CMYS_FORM_IDS.length - 1);
    const startX = 160 - totalW / 2;
    const startY = 52;

    for (let index = 0; index < CMYS_FORM_IDS.length; index++) {
      const character = CHARACTERS[CMYS_FORM_IDS[index]];
      const x = startX + index * (cardW + gap);
      const selected = index === this.selectedFormIndex;
      const unlocked = this.engine.data.isCharacterUnlocked(character.id);
      ctx.fillStyle = selected ? "rgba(0, 242, 254, 0.18)" : "rgba(10, 15, 25, 0.9)";
      ctx.fillRect(x, startY, cardW, cardH);
      ctx.strokeStyle = selected ? "#00F2FE" : "#34495E";
      ctx.lineWidth = selected ? 2 : 1;
      ctx.strokeRect(x, startY, cardW, cardH);
      if (!unlocked) ctx.globalAlpha = 0.35;

      this.drawCharacterSprite(ctx, character.id, x + cardW / 2, startY + 23, 2, character.color);
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.font = uiFont(language, 10, true);
      ctx.fillText("CMYS", x + cardW / 2, startY + 45);
      const localized = getCharacterText(character.id, character, language);
      ctx.fillStyle = character.color;
      ctx.font = uiFont(language, 7, true);
      ctx.fillText(localized.title, x + cardW / 2, startY + 56);
      ctx.textAlign = "left";
      this.drawStats(ctx, character, x + 5, startY + 72, 43);
      ctx.globalAlpha = 1;
      if (!unlocked) {
        ctx.fillStyle = "#E74C3C";
        ctx.textAlign = "center";
        ctx.font = uiFont(language, 8, true);
        ctx.fillText(t(language, "common.locked"), x + cardW / 2, startY + 66);
      }
    }

    const character = this.selectedForm;
    const unlocked = this.engine.data.isCharacterUnlocked(character.id);
    const localized = getCharacterText(character.id, character, language);
    ctx.textAlign = "center";
    ctx.fillStyle = character.color;
    ctx.font = uiFont(language, 9, true);
    ctx.fillText(`${localized.title} // ${SkillController.getConfig(character.id).name}`, 160, 194);
    ctx.fillStyle = unlocked ? "#F1C40F" : "#E74C3C";
    ctx.font = uiFont(language, 7);
    const detail = unlocked
      ? localized.passive
      : character.id === "mage"
        ? t(language, "character.unlockMage")
        : t(language, "character.unlockRogue");
    wrapLocalized(detail, language === "zh-CN" ? 36 : 52).slice(0, 2)
      .forEach((line, lineIndex) => ctx.fillText(line, 160, 205 + lineIndex * 8));

    const weapon = this.getUnlockedWeapons(character.id)[this.selectedWeaponIndex] ?? WEAPONS.pistol;
    ctx.fillStyle = "#00F2FE";
    ctx.font = uiFont(language, 8, true);
    ctx.fillText(`↑↓  ${weapon.name.toUpperCase()}`, 160, 224);
    ctx.fillStyle = unlocked ? "#BDC3C7" : "#E74C3C";
    ctx.font = uiFont(language, 7);
    ctx.fillText(t(language, "character.formFooter", {
      horizontal: this.engine.input.getNavigationPrompt("horizontal"),
      vertical: this.engine.input.getNavigationPrompt("vertical"),
      confirm: this.engine.input.getConfirmPrompt(),
      cancel: this.engine.input.getCancelPrompt(),
    }), 160, 237);
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#0A0F19";
    ctx.fillRect(0, 0, 320, 240);
    const language = this.engine.data.settings.language;
    MenuRenderer.drawTitle(
      ctx,
      this.mode === "form" ? t(language, "character.chooseForm") : t(language, "character.title"),
      160,
      28,
      language,
    );
    ctx.fillStyle = this.engine.data.meta.preferredHardMode ? "#E74C3C" : "#7F8C8D";
    ctx.textAlign = "center";
    ctx.font = uiFont(language, 6, true);
    ctx.fillText(t(language, "character.runMode", {
      mode: t(language, this.engine.data.meta.preferredHardMode ? "common.hard" : "common.normal"),
    }), 160, 39);

    if (this.mode === "form") this.drawFormScreen(ctx);
    else this.drawIdentityScreen(ctx);
    ctx.textAlign = "left";
  }
}
