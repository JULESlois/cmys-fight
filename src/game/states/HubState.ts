import { CHALLENGES, getDailyChallengeId } from "../ChallengeSystem";
import { CHARACTERS } from "../data/characters";
import { Player } from "../entities/Player";
import { getChallengeText, getMetaUpgradeText, t, uiFont, type Language } from "../i18n";
import { getUpgradeCost, META_UPGRADES, META_UPGRADE_IDS, type MetaUpgradeId } from "../MetaUpgrades";
import { audio } from "../audio/AudioManager";
import { HubInteractionController } from "../hub/HubInteractionController";
import { HUB_MAP } from "../hub/HubMap";
import { HubPlayerController } from "../hub/HubPlayerController";
import { HubPlayerRenderer } from "../hub/HubPlayerRenderer";
import { resolveHubSpawn } from "../hub/HubProgress";
import { HubWorldRenderer } from "../hub/HubWorldRenderer";
import { drawBadge, drawPixelButton, drawPixelPanel, drawSectionLabel, UI_COLORS } from "../render/PixelUi";
import { PromptRenderer } from "../render/PromptRenderer";
import { Camera2D } from "../world/Camera2D";
import { WorldCollision } from "../world/WorldCollision";
import { getWorldSize, type WorldObjectDefinition } from "../world/WorldMap";
import { GameState } from "./GameState";

type HubMode = "world" | "upgrades" | "expedition";
type ExpeditionAction = "continue" | "newRun" | "hard" | "challenge" | "close";
const EXPEDITION_ACTIONS: ExpeditionAction[] = ["continue", "newRun", "hard", "challenge", "close"];
const UPGRADE_ENTRY_COUNT = META_UPGRADE_IDS.length + 1;

interface HubEnterParams {
  spawnAnchor?: string;
  panel?: "upgrades" | "expedition";
  focusAction?: ExpeditionAction;
}

export class HubState extends GameState {
  private readonly map = HUB_MAP;
  private readonly camera = new Camera2D(320, 240, { width: 96, height: 64 }, 7.5);
  private readonly collision = new WorldCollision(this.map);
  private readonly worldRenderer = new HubWorldRenderer();
  private readonly playerController = new HubPlayerController();
  private readonly interactionController = new HubInteractionController();
  private readonly player = new Player(0, 0);
  private interactionTarget: ReturnType<HubInteractionController["findNearest"]> = null;
  private mode: HubMode = "world";
  private selectedIndex = 0;
  private message = "";
  private messageTimer = 0;
  private refundArmed = false;
  private time = 0;
  private currentZoneKey = "hub.zone.rebirth";
  private zoneBannerTimer = 2.5;

  public enter(params?: HubEnterParams): void {
    this.engine.data.loadMeta();
    const daily = getDailyChallengeId();
    if (this.engine.data.meta.preferredChallengeId && this.engine.data.meta.preferredChallengeId !== daily) {
      this.engine.data.setPreferredChallenge(undefined);
    }

    const loadout = this.engine.data.getHubLoadout();
    const character = CHARACTERS[loadout.characterId] ?? CHARACTERS.knight;
    this.player.characterId = character.id;
    this.player.speed = character.speed;
    this.player.maxHp = character.maxHp;
    this.player.hp = character.maxHp;
    this.player.maxArmor = character.maxArmor;
    this.player.armor = character.maxArmor;
    this.player.maxMana = character.maxMana;
    this.player.mana = character.maxMana;
    this.player.setWeaponLoadout([loadout.starterWeaponId], 0);
    this.player.statusEffects = [];
    this.player.animState = "idle";
    this.player.animFrame = 0;
    this.player.animTimer = 0;
    this.player.facing = "right";
    this.player.facingLeft = false;
    this.player.aimAngle = 0;

    const spawn = resolveHubSpawn(this.engine.data.meta.hubProgress, this.map, this.collision, params?.spawnAnchor);
    this.player.x = spawn.x;
    this.player.y = spawn.y;
    const worldSize = getWorldSize(this.map);
    this.camera.snapTo(this.player.x, this.player.y, worldSize.width, worldSize.height);

    this.mode = params?.panel ?? "world";
    this.selectedIndex = this.mode === "expedition"
      ? Math.max(0, EXPEDITION_ACTIONS.indexOf(params?.focusAction ?? (this.engine.data.hasValidSave() ? "continue" : "newRun")))
      : 0;
    this.message = "";
    this.messageTimer = 0;
    this.refundArmed = false;
    this.interactionTarget = null;
    this.time = 0;
    this.currentZoneKey = this.findZoneKey(this.player.x, this.player.y) ?? "hub.zone.rebirth";
    this.zoneBannerTimer = 2.5;
    this.engine.input.suppressUntilReleased();
  }

  public exit(): void {
    this.saveHubPosition();
  }

  public prepareForSave(): void {
    this.saveHubPosition();
  }

  public update(dt = 1 / 60): void {
    this.time += dt;
    this.messageTimer = Math.max(0, this.messageTimer - dt);
    if (this.messageTimer <= 0 && this.mode === "world") this.message = "";
    this.zoneBannerTimer = Math.max(0, this.zoneBannerTimer - dt);

    if (this.mode === "upgrades") {
      this.updateUpgrades();
      return;
    }
    if (this.mode === "expedition") {
      this.updateExpedition();
      return;
    }

    if (this.engine.input.wasUiPressed("cancel") || this.engine.input.wasActionPressed("pause")) {
      this.engine.openMenu();
      return;
    }

    this.playerController.update(this.player, this.engine.input, this.collision, dt);
    this.interactionTarget = this.interactionController.findNearest(this.player.x, this.player.y, this.map.objects);
    if (this.interactionTarget && this.engine.input.wasActionPressed("interact")) {
      this.activateInteraction(this.interactionTarget.object);
      return;
    }

    const zoneKey = this.findZoneKey(this.player.x, this.player.y);
    if (zoneKey && zoneKey !== this.currentZoneKey) {
      this.currentZoneKey = zoneKey;
      this.zoneBannerTimer = 2.2;
      const zoneId = this.map.objects.find(object => object.type === "region" && object.properties?.labelKey === zoneKey)?.id;
      if (zoneId && !this.engine.data.meta.hubProgress.visitedZones.includes(zoneId)) {
        this.engine.data.meta.hubProgress.visitedZones.push(zoneId);
      }
    }

    const worldSize = getWorldSize(this.map);
    this.camera.follow(this.player.x, this.player.y, worldSize.width, worldSize.height, dt);
  }

  private updateUpgrades(): void {
    if (this.engine.input.wasUiPressed("cancel")) {
      if (this.refundArmed) {
        this.refundArmed = false;
        this.message = "";
      } else {
        this.closePanel();
      }
      return;
    }
    if (this.engine.input.wasUiPressed("up")) {
      this.selectedIndex = (this.selectedIndex - 1 + UPGRADE_ENTRY_COUNT) % UPGRADE_ENTRY_COUNT;
      this.refundArmed = false;
      this.message = "";
      audio.playShoot();
    }
    if (this.engine.input.wasUiPressed("down")) {
      this.selectedIndex = (this.selectedIndex + 1) % UPGRADE_ENTRY_COUNT;
      this.refundArmed = false;
      this.message = "";
      audio.playShoot();
    }
    if (!this.engine.input.wasUiPressed("confirm")) return;
    if (this.selectedIndex < META_UPGRADE_IDS.length) this.purchaseSelectedUpgrade();
    else this.refundUpgrades();
  }

  private updateExpedition(): void {
    if (this.engine.input.wasUiPressed("cancel")) {
      this.closePanel();
      return;
    }
    if (this.engine.input.wasUiPressed("up")) {
      this.moveExpeditionSelection(-1);
      return;
    }
    if (this.engine.input.wasUiPressed("down")) {
      this.moveExpeditionSelection(1);
      return;
    }
    if (!this.engine.input.wasUiPressed("confirm")) return;

    const action = EXPEDITION_ACTIONS[this.selectedIndex];
    if (action === "continue") {
      if (!this.engine.data.hasValidSave()) {
        this.showMessage(t(this.language, "hub.noActiveRun"), true);
        return;
      }
      this.engine.switchState("dungeon");
      return;
    }
    if (action === "newRun") {
      this.engine.switchState("character_select", { backState: "hub", hubMode: false });
      return;
    }
    if (action === "hard") {
      this.toggleHardMode();
      return;
    }
    if (action === "challenge") {
      this.toggleChallenge();
      return;
    }
    this.closePanel();
  }

  private moveExpeditionSelection(direction: number): void {
    this.selectedIndex = (this.selectedIndex + direction + EXPEDITION_ACTIONS.length) % EXPEDITION_ACTIONS.length;
    this.message = "";
    audio.playShoot();
  }

  private activateInteraction(object: WorldObjectDefinition): void {
    switch (object.action) {
      case "open_rebirth_spring":
        this.engine.switchState("character_select", { backState: "hub", hubMode: true });
        break;
      case "open_expedition":
        this.openPanel("expedition", this.engine.data.hasValidSave() ? 0 : 1);
        break;
      case "open_meta_upgrades":
        this.openPanel("upgrades", 0);
        break;
      case "open_meta_refund":
        this.openPanel("upgrades", META_UPGRADE_IDS.length);
        break;
      case "open_records":
        this.engine.switchState("records", { backState: "hub", initialPage: object.properties?.tab });
        break;
      case "open_settings":
        this.engine.switchState("settings", { backState: "hub" });
        break;
      case "open_armory":
        this.engine.switchState("records", { backState: "hub", initialPage: "weapons" });
        break;
      case "open_challenge":
        this.openPanel("expedition", EXPEDITION_ACTIONS.indexOf("challenge"));
        break;
      case "open_training":
        this.showMessage(t(this.language, "hub.trainingReserved"));
        break;
      case "open_wish_fountain":
        this.showMessage(t(this.language, "hub.wishReserved"));
        break;
      default:
        console.warn("[HubState] Unknown interaction action:", object.action, object.id);
    }
  }

  private openPanel(mode: Exclude<HubMode, "world">, selectedIndex: number): void {
    this.mode = mode;
    this.selectedIndex = Math.max(0, selectedIndex);
    this.message = "";
    this.refundArmed = false;
    this.engine.input.clearJustPressed();
    audio.playPickup();
  }

  private closePanel(): void {
    this.mode = "world";
    this.message = "";
    this.refundArmed = false;
    this.engine.input.clearJustPressed();
    audio.playShoot();
  }

  private purchaseSelectedUpgrade(): void {
    const id = META_UPGRADE_IDS[this.selectedIndex] as MetaUpgradeId;
    const result = this.engine.data.purchaseMetaUpgrade(id);
    if (result.success) {
      const localized = getMetaUpgradeText(id, META_UPGRADES[id], this.language);
      this.message = t(this.language, "hub.upgraded", { name: localized.name });
      audio.playPickup();
    } else if (result.reason === "max") {
      this.message = t(this.language, "hub.maxed");
      audio.playHurt();
    } else {
      this.message = t(this.language, "hub.needShards", { amount: result.cost });
      audio.playHurt();
    }
  }

  private refundUpgrades(): void {
    if (!this.refundArmed) {
      this.refundArmed = true;
      this.message = t(this.language, "hub.refundConfirm", { confirm: this.engine.input.getConfirmPrompt() });
      audio.playHurt();
      return;
    }
    const refunded = this.engine.data.refundMetaUpgrades();
    this.message = refunded > 0
      ? t(this.language, "hub.refunded", { amount: refunded })
      : t(this.language, "hub.noRefund");
    this.refundArmed = false;
    refunded > 0 ? audio.playPickup() : audio.playHurt();
  }

  private toggleHardMode(): void {
    if (!this.engine.data.meta.hardModeUnlocked) {
      this.showMessage(t(this.language, "hub.hardLockedMessage"), true);
      return;
    }
    const enabled = !this.engine.data.meta.preferredHardMode;
    this.engine.data.setPreferredHardMode(enabled);
    if (!enabled) this.engine.data.setPreferredChallenge(undefined);
    this.message = t(this.language, "hub.hardState", {
      state: t(this.language, enabled ? "common.enabled" : "common.disabled"),
    });
    audio.playPickup();
  }

  private toggleChallenge(): void {
    if (!this.engine.data.meta.hardModeUnlocked || !this.engine.data.meta.preferredHardMode) {
      this.showMessage(t(this.language, "hub.challengeNeedsHard"), true);
      return;
    }
    const daily = getDailyChallengeId();
    const next = this.engine.data.meta.preferredChallengeId === daily ? undefined : daily;
    this.engine.data.setPreferredChallenge(next);
    const challengeName = next ? getChallengeText(next, CHALLENGES[next], this.language).name : "";
    this.message = next
      ? t(this.language, "hub.challengeSelected", { name: challengeName })
      : t(this.language, "hub.challengeDisabled");
    audio.playPickup();
  }

  private showMessage(message: string, error = false): void {
    this.message = message;
    this.messageTimer = 2.8;
    error ? audio.playHurt() : audio.playPickup();
  }

  private findZoneKey(x: number, y: number): string | undefined {
    for (const object of this.map.objects) {
      if (object.type !== "region") continue;
      const width = object.width ?? 0;
      const height = object.height ?? 0;
      if (x < object.x || y < object.y || x > object.x + width || y > object.y + height) continue;
      const key = object.properties?.labelKey;
      if (typeof key === "string") return key;
    }
    return undefined;
  }

  private saveHubPosition(): void {
    const progress = this.engine.data.meta.hubProgress;
    progress.mapVersion = this.map.version;
    progress.x = this.player.x;
    progress.y = this.player.y;
    progress.anchorId = this.currentZoneKey === "hub.zone.expedition" ? "expedition_gate" : "rebirth_spring";
    this.engine.data.saveMeta();
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#101A15";
    ctx.fillRect(0, 0, 320, 240);

    this.camera.begin(ctx);
    this.worldRenderer.drawGround(ctx, this.map, this.camera);
    this.worldRenderer.drawBackTiles(ctx, this.map, this.camera);
    this.worldRenderer.drawObjects(ctx, this.map, this.camera, "back", this.time);

    const renderables = this.worldRenderer.getVisibleSortedObjects(this.map, this.camera).map(object => ({
      sortY: object.sortY ?? object.y + (object.height ?? 0),
      draw: () => this.worldRenderer.drawSortedObject(ctx, object, this.time),
    }));
    renderables.push({
      sortY: this.player.y + 8,
      draw: () => HubPlayerRenderer.draw(ctx, this.player, this.engine.data.settings.reducedFlashing),
    });
    renderables.sort((a, b) => a.sortY - b.sortY);
    for (const renderable of renderables) renderable.draw();

    this.worldRenderer.drawUpperTiles(ctx, this.map, this.camera);
    this.worldRenderer.drawObjects(ctx, this.map, this.camera, "upper", this.time);
    this.camera.end(ctx);

    this.drawHubHud(ctx);
    if (this.mode === "world") this.drawWorldOverlay(ctx);
    else if (this.mode === "upgrades") this.drawUpgradePanel(ctx);
    else this.drawExpeditionPanel(ctx);
  }

  private drawHubHud(ctx: CanvasRenderingContext2D): void {
    const character = CHARACTERS[this.player.characterId] ?? CHARACTERS.knight;
    drawPixelPanel(ctx, 5, 5, 116, 28, "cyan", true);
    ctx.fillStyle = UI_COLORS.white;
    ctx.font = uiFont(this.language, 7, true);
    ctx.textAlign = "left";
    ctx.fillText(character.name.toUpperCase(), 13, 16);
    ctx.fillStyle = UI_COLORS.yellow;
    ctx.font = uiFont(this.language, 6, true);
    ctx.fillText(`${this.engine.data.meta.currency} ${t(this.language, "common.shards")}`, 13, 27);
    drawBadge(ctx, this.engine.data.hasValidSave() ? t(this.language, "hub.runReady") : t(this.language, "hub.noRun"), 230, 8, 84, this.language, this.engine.data.hasValidSave() ? "green" : "neutral");
  }

  private drawWorldOverlay(ctx: CanvasRenderingContext2D): void {
    if (this.zoneBannerTimer > 0) {
      const alpha = Math.min(1, this.zoneBannerTimer * 2);
      ctx.save();
      ctx.globalAlpha = alpha;
      drawPixelPanel(ctx, 92, 39, 136, 21, "neutral", true);
      ctx.fillStyle = UI_COLORS.white;
      ctx.font = uiFont(this.language, 8, true);
      ctx.textAlign = "center";
      ctx.fillText(t(this.language, this.currentZoneKey as Parameters<typeof t>[1]), 160, 53);
      ctx.restore();
    }

    if (this.interactionTarget) {
      const screen = this.camera.worldToScreen(this.interactionTarget.x, this.interactionTarget.y);
      const promptKey = this.interactionTarget.object.promptKey;
      const label = promptKey ? t(this.language, promptKey as Parameters<typeof t>[1]) : t(this.language, "hub.interact");
      PromptRenderer.drawAt(ctx, screen.x, screen.y - 13, label, this.engine.input.getPrompt("interact"), this.language, this.time);
    }

    if (this.message) {
      drawPixelPanel(ctx, 43, 207, 234, 23, "yellow", true);
      ctx.fillStyle = UI_COLORS.white;
      ctx.font = uiFont(this.language, 7, true);
      ctx.textAlign = "center";
      ctx.fillText(this.message, 160, 222);
    }
  }

  private drawUpgradePanel(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "rgba(3,7,8,0.78)";
    ctx.fillRect(0, 0, 320, 240);
    drawPixelPanel(ctx, 22, 16, 276, 211, "cyan", true);
    drawSectionLabel(ctx, t(this.language, "hub.workshopTitle"), 34, 34, 252, this.language, "cyan");
    ctx.fillStyle = UI_COLORS.yellow;
    ctx.font = uiFont(this.language, 7, true);
    ctx.textAlign = "right";
    ctx.fillText(`${this.engine.data.meta.currency} ${t(this.language, "common.shards")}`, 286, 34);

    META_UPGRADE_IDS.forEach((id, index) => {
      const definition = META_UPGRADES[id];
      const localized = getMetaUpgradeText(id, definition, this.language);
      const level = this.engine.data.meta.upgrades[id];
      const cost = getUpgradeCost(id, level);
      const y = 51 + index * 23;
      const selected = this.selectedIndex === index;
      drawPixelButton(ctx, 34, y - 11, 252, 18, selected, "cyan");
      ctx.textAlign = "left";
      ctx.fillStyle = selected ? UI_COLORS.white : UI_COLORS.text;
      ctx.font = uiFont(this.language, 7, selected);
      ctx.fillText(`${selected ? ">" : " "} ${localized.name}`, 41, y);
      ctx.textAlign = "right";
      ctx.fillStyle = UI_COLORS.green;
      ctx.fillText(t(this.language, "hub.level", { level, max: definition.maxLevel }), 224, y);
      ctx.fillStyle = cost === null ? UI_COLORS.muted : this.engine.data.meta.currency >= cost ? UI_COLORS.yellow : UI_COLORS.red;
      ctx.fillText(cost === null ? t(this.language, "common.max") : `${cost} S`, 279, y);
    });

    const refundY = 51 + META_UPGRADE_IDS.length * 23;
    drawPixelButton(ctx, 34, refundY - 11, 252, 18, this.selectedIndex === META_UPGRADE_IDS.length, "red");
    ctx.textAlign = "left";
    ctx.fillStyle = this.selectedIndex === META_UPGRADE_IDS.length ? UI_COLORS.white : UI_COLORS.text;
    ctx.font = uiFont(this.language, 7, this.selectedIndex === META_UPGRADE_IDS.length);
    ctx.fillText(`${this.selectedIndex === META_UPGRADE_IDS.length ? ">" : " "} ${t(this.language, "hub.action.refund")}`, 41, refundY);

    ctx.textAlign = "center";
    ctx.fillStyle = this.refundArmed ? UI_COLORS.red : UI_COLORS.yellow;
    ctx.font = uiFont(this.language, 6, true);
    if (this.message) ctx.fillText(this.message, 160, 205);
    ctx.fillStyle = UI_COLORS.muted;
    ctx.font = uiFont(this.language, 6);
    ctx.fillText(t(this.language, "hub.panelFooter", {
      vertical: this.engine.input.getNavigationPrompt("vertical"),
      confirm: this.engine.input.getConfirmPrompt(),
      cancel: this.engine.input.getCancelPrompt(),
    }), 160, 218);
  }

  private drawExpeditionPanel(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "rgba(3,5,9,0.8)";
    ctx.fillRect(0, 0, 320, 240);
    drawPixelPanel(ctx, 48, 35, 224, 170, "purple", true);
    drawSectionLabel(ctx, t(this.language, "hub.expeditionTitle"), 61, 55, 198, this.language, "purple");

    EXPEDITION_ACTIONS.forEach((action, index) => {
      const y = 75 + index * 23;
      const selected = this.selectedIndex === index;
      const disabled = action === "continue" && !this.engine.data.hasValidSave();
      const tone = action === "close" ? "neutral" : action === "newRun" ? "green" : "purple";
      drawPixelButton(ctx, 61, y - 12, 198, 18, selected, tone);
      ctx.textAlign = "left";
      ctx.fillStyle = disabled ? UI_COLORS.edge : selected ? UI_COLORS.white : UI_COLORS.text;
      ctx.font = uiFont(this.language, 7, selected);
      ctx.fillText(`${selected ? ">" : " "} ${t(this.language, `hub.expedition.${action}` as Parameters<typeof t>[1])}`, 69, y);
      const value = this.getExpeditionValue(action);
      if (value) {
        ctx.textAlign = "right";
        ctx.fillStyle = action === "hard" && !this.engine.data.meta.hardModeUnlocked ? UI_COLORS.red : UI_COLORS.yellow;
        ctx.fillText(value, 251, y);
      }
    });

    ctx.textAlign = "center";
    if (this.message) {
      ctx.fillStyle = UI_COLORS.yellow;
      ctx.font = uiFont(this.language, 6, true);
      ctx.fillText(this.message, 160, 194);
    }
    ctx.fillStyle = UI_COLORS.muted;
    ctx.font = uiFont(this.language, 6);
    ctx.fillText(t(this.language, "hub.panelFooter", {
      vertical: this.engine.input.getNavigationPrompt("vertical"),
      confirm: this.engine.input.getConfirmPrompt(),
      cancel: this.engine.input.getCancelPrompt(),
    }), 160, 198);
  }

  private getExpeditionValue(action: ExpeditionAction): string {
    if (action === "continue") return this.engine.data.hasValidSave() ? t(this.language, "common.ready") : t(this.language, "common.disabled");
    if (action === "hard") {
      return this.engine.data.meta.hardModeUnlocked
        ? t(this.language, this.engine.data.meta.preferredHardMode ? "common.on" : "common.off")
        : t(this.language, "common.locked");
    }
    if (action === "challenge") {
      const enabled = this.engine.data.meta.preferredHardMode
        && this.engine.data.meta.preferredChallengeId === getDailyChallengeId();
      return t(this.language, enabled ? "common.on" : "common.off");
    }
    return "";
  }

  private get language(): Language {
    return this.engine.data.settings.language;
  }
}
