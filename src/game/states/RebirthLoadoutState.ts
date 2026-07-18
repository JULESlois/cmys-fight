import { GameState } from "./GameState";
import { Engine } from "../Engine";
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
import { drawBadge, drawMeter, drawPixelButton, drawPixelPanel, drawSectionLabel, UI_COLORS } from "../render/PixelUi";

type SelectionMode = "collection" | "character" | "form";
const CMYS_FORM_IDS = ["knight", "mage", "rogue"] as const;

export class RebirthLoadoutState extends GameState {
  protected selectedIndex = 0;
  protected selectedWeaponIndex = 0;
  private selectedCharacterIndex = 0;
  private selectedFormIndex = 0;
  private mode: SelectionMode = "collection";

  constructor(engine: Engine) {
    super(engine);
  }

  enter() {
    const loadout = this.engine.data.getHubLoadout();
    const character = CHARACTERS[loadout.characterId] ?? CHARACTERS.knight;
    const formIndex = CMYS_FORM_IDS.findIndex(id => id === character.id);
    if (formIndex >= 0) {
      this.selectedIndex = CHARACTER_COLLECTION_IDS.indexOf("cmys");
      this.selectedFormIndex = formIndex;
      this.mode = "form";
    } else {
      const collectionIndex = CHARACTER_COLLECTION_IDS.findIndex(collectionId =>
        CHARACTER_COLLECTIONS[collectionId].characterIds.includes(character.id)
      );
      this.selectedIndex = Math.max(0, collectionIndex);
      this.selectedCharacterIndex = Math.max(
        0,
        this.selectedCollectionCharacters.findIndex(candidate => candidate.id === character.id),
      );
      this.mode = "character";
    }
    const weapons = this.getUnlockedWeapons(character.id);
    const weaponIndex = weapons.findIndex(weapon => weapon.id === loadout.starterWeaponId);
    this.selectedWeaponIndex = weaponIndex >= 0 ? weaponIndex : 0;
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

  private confirmLoadout(character: CharacterConfig): void {
    if (!this.engine.data.isCharacterUnlocked(character.id)) {
      audio.playHurt();
      return;
    }
    const weapons = this.getUnlockedWeapons(character.id);
    const starterWeaponId = weapons[this.selectedWeaponIndex]?.id;
    this.engine.data.setHubLoadout(character.id, starterWeaponId);
    this.engine.switchState("hub", { spawnAnchor: "rebirth_spring" });
  }

  update(_dt: number) {
    if (this.engine.input.wasUiPressed("cancel")) {
      if (this.mode === "collection") this.engine.switchState("hub", { spawnAnchor: "rebirth_spring" });
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
      if (confirm) this.confirmLoadout(this.selectedCharacter);
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
    if (confirm) this.confirmLoadout(this.selectedForm);
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

  private drawStatBar(
    ctx: CanvasRenderingContext2D,
    label: string,
    value: number,
    max: number,
    x: number,
    y: number,
    color: string,
    width: number,
  ): void {
    ctx.fillStyle = UI_COLORS.white;
    ctx.font = "7px monospace";
    ctx.fillText(label, x, y);
    const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
    drawMeter(ctx, x + 27, y - 7, width, 5, ratio, color, 5);
  }

  private drawStats(ctx: CanvasRenderingContext2D, character: CharacterConfig, x: number, y: number, width: number): void {
    this.drawStatBar(ctx, "HP", character.maxHp, 10, x, y, "#E74C3C", width);
    this.drawStatBar(ctx, "AR", character.maxArmor, 10, x, y + 15, "#BDC3C7", width);
    this.drawStatBar(ctx, "MP", character.maxMana, MAX_PLAYER_MANA, x, y + 30, "#3498DB", width);
    this.drawStatBar(ctx, "SP", character.speed, 150, x, y + 45, "#F1C40F", width);
  }

  private drawScreenTitle(ctx: CanvasRenderingContext2D, text: string, language: "en" | "zh-CN"): void {
    ctx.fillStyle = UI_COLORS.cyan;
    ctx.font = uiFont(language, 24, true);
    ctx.textAlign = "center";
    ctx.fillText(text, 160, 28);
    ctx.fillStyle = "rgba(232, 91, 101, 0.52)";
    ctx.fillText(text, 162, 28);
    ctx.textAlign = "left";
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
    const cardH = 136;
    const gap = 8;
    const startX = 160 - (cardW * CHARACTER_COLLECTION_IDS.length + gap * (CHARACTER_COLLECTION_IDS.length - 1)) / 2;
    const startY = 47;

    CHARACTER_COLLECTION_IDS.forEach((id, index) => {
      const collection = CHARACTER_COLLECTIONS[id];
      const x = startX + index * (cardW + gap);
      const selected = index === this.selectedIndex;
      drawPixelPanel(ctx, x, selected ? startY - 2 : startY, cardW, cardH, selected ? "cyan" : "neutral", selected);
      const cardY = selected ? startY - 2 : startY;
      if (selected) {
        ctx.strokeStyle = UI_COLORS.white;
        ctx.strokeRect(x + 2, cardY + 2, cardW - 4, cardH - 4);
      }
      ctx.fillStyle = UI_COLORS.dark;
      ctx.fillRect(x + 8, cardY + 10, cardW - 16, 54);
      ctx.strokeStyle = collection.color;
      ctx.strokeRect(x + 8, cardY + 10, cardW - 16, 54);
      this.drawCollectionPreview(ctx, id, x + cardW / 2, cardY + 39);
      ctx.textAlign = "center";
      ctx.fillStyle = collection.color;
      ctx.font = uiFont(language, id === "strinova" ? 9 : 11, true);
      ctx.fillText(collection.name, x + cardW / 2, cardY + 79);
      ctx.fillStyle = UI_COLORS.text;
      ctx.font = uiFont(language, 6, true);
      ctx.fillText(t(language, `character.collection.${id}` as Parameters<typeof t>[1]), x + cardW / 2, cardY + 91);
      ctx.fillStyle = UI_COLORS.muted;
      ctx.font = uiFont(language, 6);
      wrapLocalized(t(language, `character.collection.${id}.description` as Parameters<typeof t>[1]), language === "zh-CN" ? 12 : 18)
        .slice(0, 3)
        .forEach((line, lineIndex) => ctx.fillText(line, x + cardW / 2, cardY + 105 + lineIndex * 8));
      drawBadge(ctx, String(collection.characterIds.length), x + 33, cardY + 124, 26, language, selected ? "cyan" : "neutral");
    });

    const selected = CHARACTER_COLLECTIONS[this.selectedCollectionId];
    ctx.textAlign = "center";
    ctx.fillStyle = selected.color;
    ctx.font = uiFont(language, 8, true);
    ctx.fillText(t(language, "character.collectionCount", { count: selected.characterIds.length }), 160, 200);
    ctx.fillStyle = UI_COLORS.text;
    ctx.font = uiFont(language, 7);
    ctx.fillText(t(language, "character.collectionFooter", {
      horizontal: this.engine.input.getNavigationPrompt("horizontal"),
      confirm: this.engine.input.getConfirmPrompt(),
      cancel: this.engine.input.getCancelPrompt(),
    }), 160, 234);
  }

  private drawCharacterDetail(
    ctx: CanvasRenderingContext2D,
    characters: CharacterConfig[],
    selectedIndex: number,
    footerKey: "character.characterFooter" | "character.formFooter",
  ): void {
    const language = this.engine.data.settings.language;
    const tabWidth = Math.min(90, Math.floor(280 / characters.length) - 5);
    const tabGap = 5;
    const tabTotal = tabWidth * characters.length + tabGap * (characters.length - 1);
    const tabStart = Math.round(160 - tabTotal / 2);
    characters.forEach((character, index) => {
      const selected = index === selectedIndex;
      const x = tabStart + index * (tabWidth + tabGap);
      drawPixelButton(ctx, x, 46, tabWidth, 18, selected, selected ? "cyan" : "neutral");
      ctx.fillStyle = selected ? UI_COLORS.white : UI_COLORS.text;
      ctx.font = uiFont(language, 6, selected);
      ctx.textAlign = "center";
      this.drawFittedCenteredText(ctx, character.name.toUpperCase(), x + tabWidth / 2, 58, tabWidth - 10, language, 7, 5);
    });

    const character = characters[selectedIndex] ?? characters[0];
    const unlocked = this.engine.data.isCharacterUnlocked(character.id);
    const localized = getCharacterText(character.id, character, language);
    drawPixelPanel(ctx, 20, 70, 105, 126, unlocked ? "cyan" : "red", true);
    ctx.fillStyle = UI_COLORS.dark;
    ctx.fillRect(29, 80, 87, 78);
    ctx.strokeStyle = character.color;
    ctx.strokeRect(29, 80, 87, 78);
    if (!unlocked) ctx.globalAlpha = 0.35;
    this.drawCharacterSprite(ctx, character.id, 72, 135, usesDetailedCharacterArt(character.id) ? 2 : 3, character.color);
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    ctx.fillStyle = UI_COLORS.white;
    this.drawFittedCenteredText(ctx, character.name.toUpperCase(), 72, 171, 89, language, 10, 6);
    ctx.fillStyle = character.color;
    this.drawFittedCenteredText(ctx, localized.title, 72, 183, 89, language, 6, 5);
    if (!unlocked) drawBadge(ctx, t(language, "common.locked"), 43, 185, 58, language, "red");

    drawPixelPanel(ctx, 132, 70, 168, 126, "neutral", true);
    drawSectionLabel(ctx, "PROFILE", 142, 84, 148, language, "cyan");
    ctx.textAlign = "left";
    this.drawStats(ctx, character, 143, 100, 77);
    drawSectionLabel(ctx, SkillController.getConfig(character.id).name, 142, 160, 148, language, "purple");
    ctx.fillStyle = unlocked ? UI_COLORS.yellow : UI_COLORS.red;
    ctx.font = uiFont(language, 7);
    const detail = unlocked
      ? localized.passive
      : character.id === "mage"
        ? t(language, "character.unlockMage")
        : t(language, "character.unlockRogue");
    wrapLocalized(detail, language === "zh-CN" ? 23 : 34).slice(0, 3)
      .forEach((line, lineIndex) => ctx.fillText(line, 142, 174 + lineIndex * 8));

    const weapon = this.getUnlockedWeapons(character.id)[this.selectedWeaponIndex] ?? WEAPONS[character.starterWeapon];
    drawPixelPanel(ctx, 20, 201, 280, 27, "yellow");
    SpriteRenderer.drawPixelSprite(ctx, `weapon_${weapon.id}`, 47, 216, 1);
    ctx.textAlign = "left";
    ctx.fillStyle = UI_COLORS.yellow;
    ctx.font = uiFont(language, 6, true);
    ctx.fillText("↑↓ LOADOUT", 70, 211);
    ctx.fillStyle = UI_COLORS.white;
    ctx.font = uiFont(language, 8, true);
    ctx.fillText(weapon.name.toUpperCase(), 70, 222);
    drawBadge(ctx, unlocked ? this.engine.input.getConfirmPrompt() : t(language, "common.locked"), 246, 209, 45, language, unlocked ? "green" : "red");

    ctx.textAlign = "center";
    ctx.fillStyle = unlocked ? UI_COLORS.text : UI_COLORS.red;
    ctx.font = uiFont(language, 6);
    ctx.fillText(t(language, footerKey, {
      horizontal: this.engine.input.getNavigationPrompt("horizontal"),
      vertical: this.engine.input.getNavigationPrompt("vertical"),
      confirm: this.engine.input.getConfirmPrompt(),
      cancel: this.engine.input.getCancelPrompt(),
    }), 160, 236);
  }

  private drawCharacterCards(ctx: CanvasRenderingContext2D): void {
    this.drawCharacterDetail(ctx, this.selectedCollectionCharacters, this.selectedCharacterIndex, "character.characterFooter");
  }

  private drawFormScreen(ctx: CanvasRenderingContext2D): void {
    this.drawCharacterDetail(
      ctx,
      CMYS_FORM_IDS.map(id => CHARACTERS[id]),
      this.selectedFormIndex,
      "character.formFooter",
    );
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
    this.drawScreenTitle(ctx, title, language);
    ctx.fillStyle = "#7F8C8D";
    ctx.textAlign = "center";
    ctx.font = uiFont(language, 6, true);
    ctx.fillText(t(language, "rebirth.loadoutOnly"), 160, 39);

    if (this.mode === "collection") this.drawCollectionScreen(ctx);
    else if (this.mode === "form") this.drawFormScreen(ctx);
    else this.drawCharacterCards(ctx);
    ctx.textAlign = "left";
  }
}
