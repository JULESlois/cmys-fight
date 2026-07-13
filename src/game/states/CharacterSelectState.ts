import { GameState } from "./GameState";
import { Engine } from "../Engine";
import { MenuRenderer } from "../render/MenuRenderer";
import { audio } from "../audio/AudioManager";
import {
  CELESTIA_PLAYER_PALETTE,
  ESPER_ZERO_PLAYER_PALETTE,
  KANAMI_PLAYER_PALETTE,
  MICHELE_PLAYER_PALETTE,
  NANALLY_PLAYER_PALETTE,
  PLAYER_PALETTE,
} from "../data/sprites";
import {
  CHARACTER_COLLECTION_IDS,
  CHARACTER_COLLECTIONS,
  CHARACTERS,
  usesDetailedCharacterArt,
  type CharacterCollectionId,
  type CharacterConfig,
} from "../data/characters";
import { SpriteRenderer } from "../render/SpriteRenderer";
import { WEAPONS, isWeaponAvailableForCharacter, type WeaponData } from "../data/weapons";
import { MAX_PLAYER_MANA } from "../entities/Player";
import { getCharacterText, t, uiFont, wrapLocalized } from "../i18n";
import { SkillController } from "../combat/SkillController";

type SelectionMode = "collection" | "character" | "form";
const CMYS_FORM_IDS = ["knight", "mage", "rogue"] as const;

export class CharacterSelectState extends GameState {
  protected selectedIndex = 0;
  protected selectedWeaponIndex = 0;
  private selectedCharacterIndex = 0;
  private selectedFormIndex = 0;
  private mode: SelectionMode = "collection";
  private backState: "title" | "hub" = "hub";

  constructor(engine: Engine) {
    super(engine);
  }

  enter(params?: { backState?: "title" | "hub" }) {
    this.backState = params?.backState === "title" ? "title" : "hub";
    this.mode = "collection";
    this.selectedIndex = 0;
    this.selectedCharacterIndex = 0;
    this.selectedFormIndex = 0;
    this.syncWeaponSelection("knight");
  }

  exit() {}

  private get selectedCollectionId(): CharacterCollectionId {
    return CHARACTER_COLLECTION_IDS[this.selectedIndex] ?? "cmys";
  }

  private get selectedCollectionCharacters(): CharacterConfig[] {
    return CHARACTER_COLLECTIONS[this.selectedCollectionId].characterIds
      .map(id => CHARACTERS[id])
      .filter((character): character is CharacterConfig => Boolean(character));
  }

  private get selectedCharacter(): CharacterConfig {
    return this.selectedCollectionCharacters[this.selectedCharacterIndex] ?? CHARACTERS.michele;
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
      if (this.mode === "collection") this.engine.switchState(this.backState);
      else {
        this.mode = "collection";
        audio.playShoot();
      }
      return;
    }

    const left = this.engine.input.wasUiPressed("left");
    const right = this.engine.input.wasUiPressed("right");
    const up = this.engine.input.wasUiPressed("up");
    const down = this.engine.input.wasUiPressed("down");
    const confirm = this.engine.input.wasUiPressed("confirm");

    if (this.mode === "collection") {
      if (left || right) {
        const direction = left ? -1 : 1;
        this.selectedIndex = (this.selectedIndex + direction + CHARACTER_COLLECTION_IDS.length) % CHARACTER_COLLECTION_IDS.length;
        audio.playShoot();
      }
      if (confirm) {
        if (this.selectedCollectionId === "cmys") {
          this.mode = "form";
          this.selectedFormIndex = 0;
          this.syncWeaponSelection(this.selectedForm.id);
        } else {
          this.mode = "character";
          this.selectedCharacterIndex = 0;
          this.syncWeaponSelection(this.selectedCharacter.id);
        }
        audio.playPickup();
      }
      return;
    }

    if (this.mode === "character") {
      const characters = this.selectedCollectionCharacters;
      if (left || right) {
        const direction = left ? -1 : 1;
        this.selectedCharacterIndex = (this.selectedCharacterIndex + direction + characters.length) % characters.length;
        this.syncWeaponSelection(this.selectedCharacter.id);
        audio.playShoot();
      }
      if (up) this.cycleWeapon(this.selectedCharacter.id, -1);
      if (down) this.cycleWeapon(this.selectedCharacter.id, 1);
      if (confirm) this.startCharacter(this.selectedCharacter);
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

  private getArt(characterId: string, color: string): { sprite: string; palette: Record<string, string>; scale: number } {
    const detailed = {
      michele: { sprite: "player_michele_side_idle", palette: MICHELE_PLAYER_PALETTE },
      kanami: { sprite: "player_kanami_side_idle", palette: KANAMI_PLAYER_PALETTE },
      celestia: { sprite: "player_celestia_side_idle", palette: CELESTIA_PLAYER_PALETTE },
      esper_zero: { sprite: "player_esper_zero_side_idle", palette: ESPER_ZERO_PLAYER_PALETTE },
      nanally: { sprite: "player_nanally_side_idle", palette: NANALLY_PLAYER_PALETTE },
    }[characterId];
    if (detailed) return { ...detailed, scale: 1 };
    return { sprite: "player_main_side_idle", palette: { ...PLAYER_PALETTE, "2": color }, scale: 2 };
  }

  private drawCharacterSprite(
    ctx: CanvasRenderingContext2D,
    characterId: string,
    x: number,
    y: number,
    scale: number,
    color: string,
  ): void {
    const art = this.getArt(characterId, color);
    SpriteRenderer.drawPixelSprite(ctx, art.sprite, x, y, scale, {
      paletteOverride: art.palette,
      outlineColor: "#09101A",
    });
  }

  private drawStats(ctx: CanvasRenderingContext2D, character: CharacterConfig, x: number, y: number, width: number): void {
    MenuRenderer.drawStatBar(ctx, "HP", character.maxHp, 10, x, y, "#E74C3C", width);
    MenuRenderer.drawStatBar(ctx, "AR", character.maxArmor, 10, x, y + 15, "#BDC3C7", width);
    MenuRenderer.drawStatBar(ctx, "MP", character.maxMana, MAX_PLAYER_MANA, x, y + 30, "#3498DB", width);
    MenuRenderer.drawStatBar(ctx, "SP", character.speed, 150, x, y + 45, "#F1C40F", width);
  }

  private drawFittedCenteredText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    language: "en" | "zh-CN",
    preferredSize: number,
    minimumSize = 4,
  ): void {
    let size = preferredSize;
    ctx.textAlign = "center";
    ctx.font = uiFont(language, size, true);
    while (size > minimumSize && ctx.measureText(text).width > maxWidth) {
      size--;
      ctx.font = uiFont(language, size, true);
    }
    ctx.fillText(text, x, y);
  }

  private drawCollectionPreview(ctx: CanvasRenderingContext2D, collectionId: CharacterCollectionId, centerX: number, y: number): void {
    const collection = CHARACTER_COLLECTIONS[collectionId];
    const ids = collection.characterIds;
    if (collectionId === "cmys") {
      this.drawCharacterSprite(ctx, "knight", centerX, y, 3, CHARACTERS.knight.color);
      return;
    }
    const spacing = ids.length === 2 ? 27 : 22;
    const startX = centerX - spacing * (ids.length - 1) / 2;
    ids.forEach((id, index) => this.drawCharacterSprite(ctx, id, startX + index * spacing, y, 1, CHARACTERS[id].color));
  }

  private drawCollectionScreen(ctx: CanvasRenderingContext2D): void {
    const language = this.engine.data.settings.language;
    const cardW = 92;
    const cardH = 132;
    const gap = 8;
    const startX = 160 - (cardW * CHARACTER_COLLECTION_IDS.length + gap * (CHARACTER_COLLECTION_IDS.length - 1)) / 2;
    const startY = 48;

    CHARACTER_COLLECTION_IDS.forEach((id, index) => {
      const collection = CHARACTER_COLLECTIONS[id];
      const x = startX + index * (cardW + gap);
      const selected = index === this.selectedIndex;
      ctx.fillStyle = selected ? "rgba(0, 242, 254, 0.18)" : "rgba(10, 15, 25, 0.9)";
      ctx.fillRect(x, startY, cardW, cardH);
      ctx.strokeStyle = selected ? "#00F2FE" : "#34495E";
      ctx.lineWidth = selected ? 2 : 1;
      ctx.strokeRect(x, startY, cardW, cardH);
      this.drawCollectionPreview(ctx, id, x + cardW / 2, startY + 38);
      ctx.textAlign = "center";
      ctx.fillStyle = collection.color;
      ctx.font = uiFont(language, id === "strinova" ? 9 : 11, true);
      ctx.fillText(collection.name, x + cardW / 2, startY + 76);
      ctx.fillStyle = "#BDC3C7";
      ctx.font = uiFont(language, 6, true);
      ctx.fillText(t(language, `character.collection.${id}` as Parameters<typeof t>[1]), x + cardW / 2, startY + 89);
      ctx.fillStyle = "#7F8C8D";
      ctx.font = uiFont(language, 6);
      wrapLocalized(t(language, `character.collection.${id}.description` as Parameters<typeof t>[1]), language === "zh-CN" ? 12 : 18)
        .slice(0, 3)
        .forEach((line, lineIndex) => ctx.fillText(line, x + cardW / 2, startY + 103 + lineIndex * 8));
    });

    const selected = CHARACTER_COLLECTIONS[this.selectedCollectionId];
    ctx.textAlign = "center";
    ctx.fillStyle = selected.color;
    ctx.font = uiFont(language, 8, true);
    ctx.fillText(t(language, "character.collectionCount", { count: selected.characterIds.length }), 160, 197);
    ctx.fillStyle = "#BDC3C7";
    ctx.font = uiFont(language, 7);
    ctx.fillText(t(language, "character.collectionFooter", {
      horizontal: this.engine.input.getNavigationPrompt("horizontal"),
      confirm: this.engine.input.getConfirmPrompt(),
      cancel: this.engine.input.getCancelPrompt(),
    }), 160, 232);
  }

  private drawCharacterCards(ctx: CanvasRenderingContext2D): void {
    const language = this.engine.data.settings.language;
    const characters = this.selectedCollectionCharacters;
    const cardW = characters.length === 2 ? 112 : 88;
    const cardH = 132;
    const gap = 9;
    const totalW = cardW * characters.length + gap * (characters.length - 1);
    const startX = 160 - totalW / 2;
    const startY = 48;

    characters.forEach((character, index) => {
      const x = startX + index * (cardW + gap);
      const selected = index === this.selectedCharacterIndex;
      const unlocked = this.engine.data.isCharacterUnlocked(character.id);
      ctx.fillStyle = selected ? "rgba(0, 242, 254, 0.18)" : "rgba(10, 15, 25, 0.9)";
      ctx.fillRect(x, startY, cardW, cardH);
      ctx.strokeStyle = selected ? "#00F2FE" : "#34495E";
      ctx.lineWidth = selected ? 2 : 1;
      ctx.strokeRect(x, startY, cardW, cardH);
      if (!unlocked) ctx.globalAlpha = 0.35;
      this.drawCharacterSprite(ctx, character.id, x + cardW / 2, startY + 30, 1, character.color);
      ctx.fillStyle = "#FFFFFF";
      this.drawFittedCenteredText(ctx, character.name.toUpperCase(), x + cardW / 2, startY + 67, cardW - 8, language, 10, 6);
      ctx.fillStyle = character.color;
      this.drawFittedCenteredText(
        ctx,
        getCharacterText(character.id, character, language).title,
        x + cardW / 2,
        startY + 80,
        cardW - 8,
        language,
        5,
      );
      ctx.textAlign = "left";
      this.drawStats(ctx, character, x + 7, startY + 94, cardW - 48);
      ctx.globalAlpha = 1;
      if (!unlocked) {
        ctx.fillStyle = "#E74C3C";
        ctx.textAlign = "center";
        ctx.font = uiFont(language, 8, true);
        ctx.fillText(t(language, "common.locked"), x + cardW / 2, startY + 91);
      }
    });

    const character = this.selectedCharacter;
    const localized = getCharacterText(character.id, character, language);
    ctx.textAlign = "center";
    ctx.fillStyle = character.color;
    ctx.font = uiFont(language, 8, true);
    ctx.fillText(`${localized.title} // ${SkillController.getConfig(character.id).name}`, 160, 194);
    ctx.fillStyle = "#F1C40F";
    ctx.font = uiFont(language, 7);
    wrapLocalized(localized.passive, language === "zh-CN" ? 36 : 52).slice(0, 2)
      .forEach((line, lineIndex) => ctx.fillText(line, 160, 205 + lineIndex * 8));
    const weapon = this.getUnlockedWeapons(character.id)[this.selectedWeaponIndex] ?? WEAPONS[character.starterWeapon];
    ctx.fillStyle = "#00F2FE";
    ctx.font = uiFont(language, 8, true);
    ctx.fillText(`↑↓  ${weapon.name.toUpperCase()}`, 160, 224);
    ctx.fillStyle = "#BDC3C7";
    ctx.font = uiFont(language, 7);
    ctx.fillText(t(language, "character.characterFooter", {
      horizontal: this.engine.input.getNavigationPrompt("horizontal"),
      vertical: this.engine.input.getNavigationPrompt("vertical"),
      confirm: this.engine.input.getConfirmPrompt(),
      cancel: this.engine.input.getCancelPrompt(),
    }), 160, 238);
  }

  private drawFormScreen(ctx: CanvasRenderingContext2D): void {
    const language = this.engine.data.settings.language;
    const cardW = 88;
    const cardH = 130;
    const gap = 8;
    const totalW = cardW * CMYS_FORM_IDS.length + gap * (CMYS_FORM_IDS.length - 1);
    const startX = 160 - totalW / 2;
    const startY = 52;

    CMYS_FORM_IDS.forEach((id, index) => {
      const character = CHARACTERS[id];
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
    });

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
    const title = this.mode === "collection"
      ? t(language, "character.chooseCollection")
      : this.mode === "form"
        ? t(language, "character.chooseForm")
        : CHARACTER_COLLECTIONS[this.selectedCollectionId].name;
    MenuRenderer.drawTitle(ctx, title, 160, 28, language);
    ctx.fillStyle = this.engine.data.meta.preferredHardMode ? "#E74C3C" : "#7F8C8D";
    ctx.textAlign = "center";
    ctx.font = uiFont(language, 6, true);
    ctx.fillText(t(language, "character.runMode", {
      mode: t(language, this.engine.data.meta.preferredHardMode ? "common.hard" : "common.normal"),
    }), 160, 39);

    if (this.mode === "collection") this.drawCollectionScreen(ctx);
    else if (this.mode === "form") this.drawFormScreen(ctx);
    else this.drawCharacterCards(ctx);
    ctx.textAlign = "left";
  }
}
