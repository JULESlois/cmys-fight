import { CHALLENGES, getDailyChallengeId } from "../ChallengeSystem";
import { CHARACTERS } from "../data/characters";
import { WEAPONS } from "../data/weapons";
import { Player } from "../entities/Player";
import { getChallengeText, getMetaUpgradeText, t, uiFont, type Language } from "../i18n";
import { getUpgradeCost, META_UPGRADES, META_UPGRADE_IDS, type MetaUpgradeId } from "../MetaUpgrades";
import { audio } from "../audio/AudioManager";
import { HubInteractionController } from "../hub/HubInteractionController";
import { HUB_MAP } from "../hub/HubMap";
import { HUB_MOVE_SPEED, HubPlayerController } from "../hub/HubPlayerController";
import { HubPlayerRenderer } from "../hub/HubPlayerRenderer";
import { clampHubPromptPosition, isHubPromptAnchorNearViewport } from "../hub/HubPromptLayout";
import { resolveHubSpawn } from "../hub/HubProgress";
import { HubWorldRenderer } from "../hub/HubWorldRenderer";
import { HubDebugOverlay } from "../hub/HubDebugOverlay";
import { drawPixelButton, drawPixelPanel, drawSectionLabel, UI_COLORS } from "../render/PixelUi";
import { PromptRenderer } from "../render/PromptRenderer";
import { Camera2D } from "../world/Camera2D";
import { WorldCollision } from "../world/WorldCollision";
import { getWorldSize, type WorldObjectDefinition } from "../world/WorldMap";
import { OcclusionController } from "../world/OcclusionController";
import { closestPointOnFootprints } from "../world/SpatialSemantics";
import { GameState } from "./GameState";

type HubMode = "world" | "upgrades" | "expedition" | "trial";
type ExpeditionAction = "continue" | "start" | "abandon" | "close";
type TrialAction = "hard" | "challenge" | "close";
const EXPEDITION_ACTIONS: ExpeditionAction[] = ["continue", "start", "abandon", "close"];
const TRIAL_ACTIONS: TrialAction[] = ["hard", "challenge", "close"];
const UPGRADE_ENTRY_COUNT = META_UPGRADE_IDS.length + 1;

interface HubEnterParams {
  spawnAnchor?: string;
  panel?: "upgrades" | "expedition" | "trial";
  focusAction?: ExpeditionAction;
  fromSplash?: boolean;
}

export type HubQaPromptScene =
  | "rebirth_spring_south"
  | "rebirth_spring_north"
  | "rebirth_spring_left"
  | "rebirth_spring_right"
  | "expedition_gate_prompt"
  | "workshop_prompt"
  | "prompt_clamped_top"
  | "prompt_clamped_left"
  | "prompt_clamped_right"
  | "hub_prompt_anchor_debug";

export class HubState extends GameState {
  private readonly map = HUB_MAP;
  private readonly camera = new Camera2D(320, 240, { width: 96, height: 64 }, 7.5);
  private readonly collision = new WorldCollision(this.map);
  private readonly worldRenderer = new HubWorldRenderer();
  private readonly playerController = new HubPlayerController();
  private readonly interactionController = new HubInteractionController(this.collision);
  private readonly occlusionController = new OcclusionController();
  private readonly player = new Player(0, 0);
  private interactionTarget: ReturnType<HubInteractionController["findNearest"]> = null;
  private mode: HubMode = "world";
  private selectedIndex = 0;
  private refundArmed = false;
  private confirmationAction: "start" | "abandon" | null = null;
  private time = 0;
  private qaPresentationTime: number | null = null;
  private currentZoneKey = "hub.zone.sanctuary";
  private debugOverlayVisible = false;

  private introPhase: "none" | "crystal" | "particles" = "none";
  private introTimer = 0;
  private introImpactTriggered = false;
  private introParticles: {
    type: "splash" | "soul" | "shard" | "ripple" | "light";
    x: number; y: number; vx: number; vy: number;
    life: number; maxLife: number; delay: number;
    angle?: number;
    speed?: number;
    radius?: number;
  }[] = [];

  public enter(params?: HubEnterParams): void {
    this.engine.data.loadMeta();
    const daily = getDailyChallengeId();
    if (this.engine.data.meta.preferredChallengeId && this.engine.data.meta.preferredChallengeId !== daily) {
      this.engine.data.setPreferredChallenge(undefined);
    }

    const loadout = this.engine.data.getHubLoadout();
    const character = CHARACTERS[loadout.characterId] ?? CHARACTERS.knight;
    this.player.characterId = character.id;
    this.player.speed = HUB_MOVE_SPEED;
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
      ? Math.max(0, EXPEDITION_ACTIONS.indexOf(params?.focusAction ?? (this.engine.data.hasValidSave() ? "continue" : "start")))
      : 0;
    this.refundArmed = false;
    this.confirmationAction = null;
    this.interactionTarget = null;
    this.time = 0;
    this.qaPresentationTime = null;
    this.currentZoneKey = this.findZoneKey(this.player.x, this.player.y) ?? "hub.zone.sanctuary";
    if (params?.fromSplash) {
      this.introPhase = "crystal";
      this.introTimer = 0;
      this.introImpactTriggered = false;
      this.introParticles = [];
    } else {
      this.introPhase = "none";
      this.engine.worldNotices.showRegion(t(this.language, this.currentZoneKey as Parameters<typeof t>[1]));
    }
    this.occlusionController.reset();
    this.engine.input.suppressUntilReleased();
  }

  public exit(): void {
    this.saveHubPosition();
  }

  public prepareForSave(): void {
    this.saveHubPosition();
  }

  public update(dt = 1 / 60): void {
    if (this.qaPresentationTime === null) this.time += dt;
    else this.time = this.qaPresentationTime;

    if (this.introPhase !== "none") {
      this.introTimer += dt;
      if (this.introPhase === "crystal") {
        if (this.introTimer >= 2.0 && !this.introImpactTriggered) {
          this.introImpactTriggered = true;
          // Play impact sound if audio system is available (assume audio.play() exists or just skip if none is directly accessible)
          this.spawnIntroSplash();
        }
        if (this.introTimer >= 2.5) {
          this.introPhase = "particles";
          this.introTimer = 0;
          this.initIntroParticles();
        }
      } else if (this.introPhase === "particles") {
        this.updateIntroParticles(dt);
        if (this.introTimer >= 2.0) {
          this.introPhase = "none";
          this.engine.input.suppressUntilReleased();
          this.engine.worldNotices.showRegion(t(this.language, this.currentZoneKey as Parameters<typeof t>[1]));
        }
      }
      
      let targetCamY = this.player.y;
      if (this.introPhase === "crystal") {
        targetCamY = this.player.y - 90;
      } else if (this.introPhase === "particles") {
        const panProgress = Math.min(1, this.introTimer / 1.5);
        const t = panProgress * panProgress * (3 - 2 * panProgress);
        targetCamY = (this.player.y - 90) * (1 - t) + this.player.y * t;
      }
      
      const worldSize = getWorldSize(this.map);
      this.camera.snapTo(this.player.x, targetCamY, worldSize.width, worldSize.height);
      return;
    }

    if (this.engine.input.wasPressed("f7")) {
      this.debugOverlayVisible = !this.debugOverlayVisible;
    }

    if (this.mode === "upgrades") {
      this.updateUpgrades();
      return;
    }
    if (this.mode === "expedition") {
      this.updateExpedition();
      return;
    }
    if (this.mode === "trial") {
      this.updateTrial();
      return;
    }

    if (this.engine.input.wasUiPressed("cancel") || this.engine.input.wasActionPressed("pause")) {
      this.engine.openMenu();
      return;
    }

    this.playerController.update(this.player, this.engine.input, this.collision, dt);
    if (this.qaPresentationTime !== null) {
      this.player.animState = "idle";
      this.player.animFrame = 0;
      this.player.animTimer = 0;
    }
    this.occlusionController.update(
      dt,
      { x: this.player.x - 16, y: this.player.y - 31, width: 32, height: 35 },
      this.player.y,
      this.map.objects,
    );
    this.interactionTarget = this.interactionController.findNearest(
      this.player.x,
      this.player.y,
      this.map.objects,
      40,
      this.player.facing,
    );
    if (this.interactionTarget && this.engine.input.wasActionPressed("interact")) {
      this.activateInteraction(this.interactionTarget.object);
      return;
    }

    const zoneKey = this.findZoneKey(this.player.x, this.player.y) ?? "hub.zone.sanctuary";
    if (zoneKey !== this.currentZoneKey) {
      this.currentZoneKey = zoneKey;
      this.engine.worldNotices.showRegion(t(this.language, zoneKey as Parameters<typeof t>[1]));
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
      } else {
        this.closePanel();
      }
      return;
    }
    if (this.engine.input.wasUiPressed("up")) {
      this.selectedIndex = (this.selectedIndex - 1 + UPGRADE_ENTRY_COUNT) % UPGRADE_ENTRY_COUNT;
      this.refundArmed = false;
      audio.playShoot();
    }
    if (this.engine.input.wasUiPressed("down")) {
      this.selectedIndex = (this.selectedIndex + 1) % UPGRADE_ENTRY_COUNT;
      this.refundArmed = false;
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
    if (action === "start") {
      if (this.engine.data.hasValidSave() && this.confirmationAction !== "start") {
        this.confirmationAction = "start";
        this.showMessage(t(this.language, "hub.expedition.confirmReplace"), true);
        return;
      }
      if (this.engine.data.hasValidSave()) this.engine.data.abandonRun();
      const loadout = this.engine.data.getHubLoadout();
      this.engine.data.startNewRun(loadout.characterId, loadout.starterWeaponId);
      this.engine.switchState("dungeon");
      return;
    }
    if (action === "abandon") {
      if (!this.engine.data.hasValidSave()) {
        this.showMessage(t(this.language, "hub.noActiveRun"), true);
        return;
      }
      if (this.confirmationAction !== "abandon") {
        this.confirmationAction = "abandon";
        this.showMessage(t(this.language, "hub.expedition.confirmAbandon"), true);
        return;
      }
      this.engine.data.abandonRun();
      this.confirmationAction = null;
      audio.playPickup();
      return;
    }
    this.closePanel();
  }

  private updateTrial(): void {
    if (this.engine.input.wasUiPressed("cancel")) {
      this.closePanel();
      return;
    }
    if (this.engine.input.wasUiPressed("up")) {
      this.selectedIndex = (this.selectedIndex - 1 + TRIAL_ACTIONS.length) % TRIAL_ACTIONS.length;
      audio.playShoot();
      return;
    }
    if (this.engine.input.wasUiPressed("down")) {
      this.selectedIndex = (this.selectedIndex + 1) % TRIAL_ACTIONS.length;
      audio.playShoot();
      return;
    }
    if (!this.engine.input.wasUiPressed("confirm")) return;
    const action = TRIAL_ACTIONS[this.selectedIndex];
    if (action === "hard") this.toggleHardMode();
    else if (action === "challenge") this.toggleChallenge();
    else this.closePanel();
  }

  private moveExpeditionSelection(direction: number): void {
    this.selectedIndex = (this.selectedIndex + direction + EXPEDITION_ACTIONS.length) % EXPEDITION_ACTIONS.length;
    this.confirmationAction = null;
    audio.playShoot();
  }

  private activateInteraction(object: WorldObjectDefinition): void {
    switch (object.action) {
      case "open_rebirth_spring":
        this.engine.switchState("rebirth_loadout");
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
        this.openPanel("trial", 0);
        break;
      case "open_training":
        this.showMessage(t(this.language, "hub.trainingReserved"), true);
        break;
      case "open_wish_fountain":
        this.showMessage(t(this.language, "hub.wishReserved"), true);
        break;
      case "inspect_waystone":
        audio.playPickup();
        break;
      default:
        console.warn("[HubState] Unknown interaction action:", object.action, object.id);
    }
  }

  private openPanel(mode: Exclude<HubMode, "world">, selectedIndex: number): void {
    this.mode = mode;
    this.selectedIndex = Math.max(0, selectedIndex);
    this.refundArmed = false;
    this.confirmationAction = null;
    this.engine.input.clearJustPressed();
    audio.playPickup();
  }

  private closePanel(): void {
    this.mode = "world";
    this.refundArmed = false;
    this.confirmationAction = null;
    this.engine.input.clearJustPressed();
    audio.playShoot();
  }

  private purchaseSelectedUpgrade(): void {
    const id = META_UPGRADE_IDS[this.selectedIndex] as MetaUpgradeId;
    const result = this.engine.data.purchaseMetaUpgrade(id);
    if (result.success) {
      audio.playPickup();
    } else if (result.reason === "max") {
      this.showMessage(t(this.language, "hub.maxed"), true);
    } else {
      this.showMessage(t(this.language, "hub.needShards", { amount: result.cost }), true);
    }
  }

  private refundUpgrades(): void {
    if (!this.refundArmed) {
      this.refundArmed = true;
      this.showMessage(t(this.language, "hub.refundConfirm", { confirm: this.engine.input.getConfirmPrompt() }), true);
      return;
    }
    const refunded = this.engine.data.refundMetaUpgrades();
    if (refunded > 0) audio.playPickup();
    else this.showMessage(t(this.language, "hub.noRefund"), true);
    this.refundArmed = false;
  }

  private toggleHardMode(): void {
    if (!this.engine.data.meta.hardModeUnlocked) {
      this.showMessage(t(this.language, "hub.hardLockedMessage"), true);
      return;
    }
    const enabled = !this.engine.data.meta.preferredHardMode;
    this.engine.data.setPreferredHardMode(enabled);
    if (!enabled) this.engine.data.setPreferredChallenge(undefined);
    this.showMessage(t(this.language, "hub.hardState", {
      state: t(this.language, enabled ? "common.enabled" : "common.disabled"),
    }));
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
    this.showMessage(next
      ? t(this.language, "hub.challengeSelected", { name: challengeName })
      : t(this.language, "hub.challengeDisabled"));
  }

  private showMessage(message: string, error = false): void {
    this.engine.worldNotices.showBottom(message, error ? "red" : "yellow");
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

  public qaFocusAnchor(anchorId: string): boolean {
    const point = this.map.spawnPoints[anchorId];
    if (!point) return false;
    this.player.x = point.x;
    this.player.y = point.y;
    const worldSize = getWorldSize(this.map);
    this.camera.snapTo(point.x, point.y, worldSize.width, worldSize.height);
    this.currentZoneKey = this.findZoneKey(point.x, point.y) ?? "hub.zone.sanctuary";
    this.interactionTarget = null;
    return true;
  }

  public qaFocusPoint(cameraX: number, cameraY: number, playerX = cameraX, playerY = cameraY): boolean {
    if (![cameraX, cameraY, playerX, playerY].every(Number.isFinite)) return false;
    const worldSize = getWorldSize(this.map);
    this.camera.snapTo(cameraX, cameraY, worldSize.width, worldSize.height);
    this.player.x = playerX;
    this.player.y = playerY;
    this.player.animState = "idle";
    this.player.animFrame = 0;
    this.player.animTimer = 0;
    this.interactionTarget = null;
    return true;
  }

  public qaFocusLandmark(landmarkId: string): boolean {
    const object = this.map.objects.find(candidate =>
      candidate.id === landmarkId
      || candidate.properties?.visualGroup === landmarkId
      || candidate.properties?.structureId === landmarkId
      || candidate.properties?.kind === landmarkId
    );
    const structureBounds = object?.properties?.structureBounds;
    const bounds = structureBounds
      && typeof structureBounds === "object"
      && "x" in structureBounds
      && "y" in structureBounds
      && "width" in structureBounds
      && "height" in structureBounds
      ? structureBounds as { x: number; y: number; width: number; height: number }
      : object?.visualBounds;
    if (!bounds) return false;
    const worldSize = getWorldSize(this.map);
    this.camera.snapTo(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
      worldSize.width,
      worldSize.height,
    );
    return true;
  }

  public qaSetPresentation(time: number, characterId: string): boolean {
    if (!Number.isFinite(time) || !CHARACTERS[characterId]) return false;
    this.qaPresentationTime = Math.max(0, time);
    this.time = this.qaPresentationTime;
    this.player.characterId = characterId;
    this.player.animState = "idle";
    this.player.animFrame = 0;
    this.player.animTimer = 0;
    this.player.facing = "right";
    this.player.facingLeft = false;
    return true;
  }

  public qaSetDebugOverlay(enabled: boolean): boolean {
    if (!this.engine.debugMode) return false;
    this.debugOverlayVisible = enabled;
    return true;
  }

  public qaSetPromptScene(scene: HubQaPromptScene, time = 12.5): boolean {
    if (!this.engine.debugMode || !Number.isFinite(time)) return false;
    const configs: Record<HubQaPromptScene, {
      objectId: string;
      direction: { x: number; y: number };
      cameraOffset?: { x: number; y: number };
      debug?: boolean;
    }> = {
      rebirth_spring_south: { objectId: "rebirth_spring", direction: { x: 0, y: 1 } },
      rebirth_spring_north: { objectId: "rebirth_spring", direction: { x: 0, y: -1 } },
      rebirth_spring_left: { objectId: "rebirth_spring", direction: { x: -1, y: 0 } },
      rebirth_spring_right: { objectId: "rebirth_spring", direction: { x: 1, y: 0 } },
      expedition_gate_prompt: { objectId: "expedition_gate", direction: { x: 0, y: -1 } },
      workshop_prompt: { objectId: "blacksmith_forge", direction: { x: 0, y: 1 } },
      prompt_clamped_top: { objectId: "rebirth_spring", direction: { x: 0, y: 1 }, cameraOffset: { x: 0, y: 115 } },
      prompt_clamped_left: { objectId: "blacksmith_forge", direction: { x: 0, y: 1 }, cameraOffset: { x: 155, y: 0 } },
      prompt_clamped_right: { objectId: "astral_console", direction: { x: 0, y: 1 }, cameraOffset: { x: -155, y: 0 } },
      hub_prompt_anchor_debug: { objectId: "trial_altar", direction: { x: 0, y: 1 }, debug: true },
    };
    const config = configs[scene];
    const object = this.map.objects.find(candidate => candidate.id === config.objectId);
    const prompt = object?.interaction?.promptPoint;
    if (!object?.interaction || !prompt) return false;

    let playerPoint = { x: prompt.x, y: prompt.y };
    if (object.interactionShell && object.physicalFootprint?.length) {
      const edge = closestPointOnFootprints(
        object.physicalFootprint,
        prompt.x + config.direction.x * 240,
        prompt.y + config.direction.y * 240,
      );
      if (edge) {
        playerPoint = {
          x: edge.x + config.direction.x * 18,
          y: edge.y + config.direction.y * 18,
        };
      }
    } else {
      const zone = object.interaction.zone;
      const center = zone.shape === "circle"
        ? { x: zone.x, y: zone.y }
        : { x: zone.x + zone.width / 2, y: zone.y + zone.height / 2 };
      const radiusX = zone.shape === "circle" ? zone.radius - 6 : zone.width / 2 - 4;
      const radiusY = zone.shape === "circle" ? zone.radius - 6 : zone.height / 2 - 4;
      playerPoint = {
        x: center.x + config.direction.x * Math.max(4, radiusX),
        y: center.y + config.direction.y * Math.max(4, radiusY),
      };
    }

    const worldSize = getWorldSize(this.map);
    const cameraOffset = config.cameraOffset ?? { x: 0, y: 0 };
    this.camera.snapTo(
      prompt.x + cameraOffset.x,
      prompt.y + cameraOffset.y,
      worldSize.width,
      worldSize.height,
    );
    this.player.x = playerPoint.x;
    this.player.y = playerPoint.y;
    this.player.animState = "idle";
    this.player.animFrame = 0;
    this.player.animTimer = 0;
    this.mode = "world";
    this.qaPresentationTime = Math.max(0, time);
    this.time = this.qaPresentationTime;
    this.debugOverlayVisible = config.debug === true;
    this.interactionTarget = {
      object,
      distance: Math.hypot(playerPoint.x - prompt.x, playerPoint.y - prompt.y),
      x: prompt.x,
      y: prompt.y,
    };
    return true;
  }

  public isHubDebugOverlayVisible(): boolean {
    return this.debugOverlayVisible;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (this.introPhase === "crystal" && this.introTimer < 1.7) {
      ctx.fillStyle = "#000000";
    } else {
      ctx.fillStyle = "#101A15";
    }
    ctx.fillRect(0, 0, 320, 240);

    const prevAlpha = ctx.globalAlpha;
    if (this.introPhase === "crystal") {
      ctx.globalAlpha = Math.max(0, Math.min(1, (this.introTimer - 1.2) / 0.5));
    }

    this.camera.begin(ctx);
    this.worldRenderer.drawGround(ctx, this.map, this.camera);
    this.worldRenderer.drawBackTiles(ctx, this.map, this.camera);
    this.worldRenderer.drawObjects(ctx, this.map, this.camera, "back", this.time);

    const renderables = this.worldRenderer.getVisibleSortedObjects(this.map, this.camera).map(object => ({
      sortY: object.sortY ?? object.y + (object.height ?? 0),
      draw: () => this.worldRenderer.drawSortedObject(
        ctx,
        object,
        this.time,
        this.occlusionController.getAlpha(object.occlusionGroupId),
      ),
    }));
    
    if (this.introPhase === "none") {
      renderables.push({
        sortY: this.player.y + 8,
        draw: () => HubPlayerRenderer.draw(ctx, this.player, this.engine.data.settings.reducedFlashing),
      });
    } else if (this.introPhase === "particles") {
      renderables.push({
        sortY: this.player.y + 8,
        draw: () => {
          ctx.save();
          const progress = Math.min(1, this.introTimer / 1.5);
          
          // Draw shadow
          ctx.fillStyle = `rgba(0,0,0,${0.3 * progress})`;
          ctx.beginPath();
          ctx.ellipse(this.player.x, this.player.y, 8, 4, 0, 0, Math.PI * 2);
          ctx.fill();

          if (progress > 0) {
            ctx.save();
            const height = 40;
            const revealY = this.player.y - (progress * height);
            ctx.beginPath();
            ctx.rect(this.player.x - 30, revealY, 60, height + 10);
            ctx.clip();
            
            HubPlayerRenderer.draw(ctx, this.player, this.engine.data.settings.reducedFlashing);
            
            ctx.restore();
          }
          ctx.restore();
        },
      });
    }
    
    renderables.sort((a, b) => a.sortY - b.sortY);
    for (const renderable of renderables) renderable.draw();

    this.worldRenderer.drawRoofTiles(ctx, this.map, this.camera);
    this.worldRenderer.drawUpperTiles(ctx, this.map, this.camera);
    this.worldRenderer.drawObjects(ctx, this.map, this.camera, "upper", this.time);
    if (this.debugOverlayVisible) {
      HubDebugOverlay.draw(ctx, this.map, this.collision, this.camera, this.player);
    }
    
    ctx.globalAlpha = prevAlpha;
    if (this.introPhase === "crystal") {
      this.drawCrystal(ctx);
      this.drawIntroText(ctx);
    } else if (this.introPhase === "particles") {
      this.drawParticles(ctx);
    }

    this.camera.end(ctx);

    if (this.introPhase === "none") {
      this.drawHubHud(ctx);
      if (this.mode === "world") this.drawWorldOverlay(ctx);
      else if (this.mode === "upgrades") this.drawUpgradePanel(ctx);
      else if (this.mode === "expedition") this.drawExpeditionPanel(ctx);
      else this.drawTrialPanel(ctx);
    }
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
  }

  private spawnIntroSplash() {
    const poolX = this.player.x;
    const poolY = this.player.y - 60; // Center of pool
    
    // Ripples
    for (let i = 0; i < 3; i++) {
      this.introParticles.push({
        type: "ripple",
        x: poolX, y: poolY, vx: 0, vy: 0,
        life: 0, maxLife: 0.8 + i * 0.2, delay: i * 0.1,
        radius: 0
      });
    }

    // Splash drops
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      this.introParticles.push({
        type: "splash",
        x: poolX + Math.cos(angle) * 5,
        y: poolY + Math.sin(angle) * 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.5 - (80 + Math.random() * 60),
        life: 0, maxLife: 1.0 + Math.random() * 0.5, delay: 0
      });
    }
  }

  private initIntroParticles() {
    const poolX = this.player.x;
    const poolY = this.player.y - 60; // Center of pool
    
    // Soul motes
    for (let i = 0; i < 45; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 30;
      this.introParticles.push({
        type: "soul",
        x: poolX + Math.cos(angle) * dist,
        y: poolY + Math.sin(angle) * dist * 0.5,
        vx: Math.cos(angle) * (20 + Math.random() * 40),
        vy: Math.sin(angle) * (10 + Math.random() * 20) - 30,
        life: 0, maxLife: 1.5 + Math.random() * 0.5, delay: Math.random() * 0.2,
        angle: angle
      });
    }
  }

  private updateIntroParticles(dt: number) {
    for (const p of this.introParticles) {
      if (p.delay > 0) {
        p.delay -= dt;
        continue;
      }
      p.life += dt;
      
      const lifeRatio = p.life / p.maxLife;
      const friction = Math.pow(0.92, dt * 60);
      
      if (p.type === "splash") {
        p.vy += 450 * dt; // gravity
        p.vx *= friction;
        p.vy *= friction;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y > this.player.y - 60 && p.vy > 0) {
          p.vy *= -0.3; // bounce on water
        }
      } else if (p.type === "ripple") {
        p.radius = (p.radius || 0) + 60 * dt;
      } else if (p.type === "soul") {
        const targetX = this.player.x;
        const targetY = this.player.y - 8;
        const dx = targetX - p.x;
        const dy = targetY - p.y;
        
        if (lifeRatio > 0.3) {
          p.vx += dx * dt * 15.0;
          p.vy += dy * dt * 15.0;
        } else {
          p.vy += 80 * dt; // gravity before homing
        }
        p.vx *= friction;
        p.vy *= friction;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }
  }

  private drawCrystal(ctx: CanvasRenderingContext2D): void {
    const spinDuration = 1.5;
    const fallDuration = 0.5;
    const sinkDuration = 0.5;
    
    const fallProgress = Math.max(0, Math.min(1, (this.introTimer - spinDuration) / fallDuration));
    const sinkProgress = Math.max(0, Math.min(1, (this.introTimer - spinDuration - fallDuration) / sinkDuration));
    
    const targetY = this.player.y - 60; // Pool center
    const startY = targetY - 60; // Crystal starts above pool
    
    const currentY = startY + (targetY - startY) * (fallProgress * fallProgress) + (sinkProgress * 12);
    
    ctx.save();
    
    // Mask to water surface (pool center + slight offset) so crystal sinks "into" it
    ctx.beginPath();
    ctx.rect(this.player.x - 50, targetY - 150, 100, 150 + 2);
    ctx.clip();
    
    ctx.translate(this.player.x, currentY);
    
    // Tilt like a top losing energy
    if (fallProgress > 0) {
      const tilt = (fallProgress * fallProgress) * (Math.PI / 2.5);
      const wobble = Math.sin(fallProgress * Math.PI * 8) * (fallProgress * 0.15);
      ctx.rotate(tilt + wobble);
    }
    
    // Continuous rotation that slows down
    let angle = 0;
    const V = (8 * Math.PI) / 1.85;
    const t_sec = this.introTimer;
    if (t_sec <= 0.3) {
      angle = 0.5 * t_sec * (t_sec / 0.3 * V);
    } else if (t_sec <= 1.5) {
      angle = 0.15 * V + (t_sec - 0.3) * V;
    } else {
      const dt_sec = Math.min(1.0, t_sec - 1.5);
      angle = 0.15 * V + 1.2 * V + (V * dt_sec - 0.5 * V * dt_sec * dt_sec / 1.0);
    }
    
    const halfWidths = [1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1];
    const h = halfWidths.length;
    
    const baseAlpha = 1 - sinkProgress * 0.8;

    const angles = [angle, angle + Math.PI/2, angle + Math.PI, angle + Math.PI * 1.5];
    const points = angles.map(a => ({ x: Math.cos(a), z: Math.sin(a) }));
    
    const faceColors = ["#00F2FE", "#00B4DB", "#0083B0", "#005C8A"];
    const visibleFaces: { left: number, right: number, color: string }[] = [];
    
    for (let i = 0; i < 4; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % 4];
      if (p1.z + p2.z > 0) {
        visibleFaces.push({
          left: Math.min(p1.x, p2.x),
          right: Math.max(p1.x, p2.x),
          color: faceColors[i]
        });
      }
    }

    let maxZ = -100;
    let maxZ_X = 0;
    for (const p of points) {
      if (p.z > maxZ) {
        maxZ = p.z;
        maxZ_X = p.x;
      }
    }

    const appearProgress = Math.min(1, this.introTimer / 0.3);

    for (let py = 0; py < h; py++) {
      const pw = halfWidths[py];
      
      for (const face of visibleFaces) {
        const lx = Math.round(face.left * pw);
        const rx = Math.round(face.right * pw);
        const drawW = rx - lx;
        if (drawW > 0) {
          ctx.fillStyle = face.color;
          if (appearProgress < 1) {
            ctx.globalAlpha = baseAlpha;
            ctx.fillRect(lx, py - h / 2, 1, 1);
            if (drawW > 1) ctx.fillRect(rx - 1, py - h / 2, 1, 1);
            if (appearProgress > 0.1 && drawW > 2) {
              ctx.globalAlpha = baseAlpha * Math.max(0, (appearProgress - 0.1) / 0.9);
              ctx.fillRect(lx + 1, py - h / 2, drawW - 2, 1);
            }
          } else {
            ctx.globalAlpha = baseAlpha;
            ctx.fillRect(lx, py - h / 2, drawW, 1);
          }
        }
      }

      ctx.globalAlpha = baseAlpha;
      if (maxZ > 0.5 && pw > 1) {
        const hx = Math.round(maxZ_X * pw);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(hx, py - h / 2, 1, 1);
      }
    }
    
    ctx.restore();
  }

  private drawIntroText(ctx: CanvasRenderingContext2D): void {
    const t = this.introTimer;
    if (t < 0.3 || t > 1.7) return;

    // Text position relative to screen center
    const textX = this.player.x;
    const textY = this.player.y - 15;

    ctx.save();
    
    let alpha = 1;
    let shrink = 0;
    let showCyan = false;

    if (t < 0.6) {
      alpha = (t - 0.3) / 0.3; // fade in
    } else if (t >= 1.2) {
      const exitProgress = (t - 1.2) / 0.5; // 0 to 1
      alpha = 1 - exitProgress * exitProgress; // nonlinear fade
      shrink = exitProgress * 15; // move up slightly and shrink
      showCyan = true;
    }

    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const drawText = (offsetX: number, offsetY: number, color: string) => {
      ctx.fillStyle = color;
      ctx.font = `bold ${11 - shrink * 0.4}px Arial`;
      ctx.fillText("DRAGON EDUCATION", textX + offsetX, textY - shrink + offsetY);
      ctx.font = `normal ${6 - shrink * 0.2}px Arial`;
      // fake letter spacing by adding spaces
      ctx.fillText("P  R  E  S  E  N  T  S", textX + offsetX, textY + 14 - shrink * 1.5 + offsetY);
    };

    if (showCyan) {
      // cyan trailing shadows
      ctx.globalAlpha = alpha * 0.8;
      drawText(-shrink * 0.5, 0, "#00F2FE");
      drawText(shrink * 0.5, 0, "#00F2FE");
      ctx.globalAlpha = alpha;
    }

    // Main text
    drawText(0, 0, showCyan ? "#E0F7FA" : "#FFFFFF");
    
    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.introParticles) {
      if (p.delay > 0) continue;
      const lifeRatio = p.life / p.maxLife;
      const alpha = Math.max(0, 1 - lifeRatio);
      if (alpha <= 0) continue;
      
      const currentAlpha = Math.min(1, lifeRatio * 5) * alpha;
      ctx.globalAlpha = currentAlpha;
      
      if (p.type === "splash") {
        ctx.fillStyle = "#8DF6FF";
        ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 2, 2);
      } else if (p.type === "ripple") {
        ctx.strokeStyle = `rgba(141, 246, 255, ${currentAlpha * 0.8})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(Math.round(p.x), Math.round(p.y), p.radius || 1, (p.radius || 1) * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === "soul") {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 2, 2);
        
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > 10) {
          const nx = p.vx / speed;
          const ny = p.vy / speed;
          
          ctx.fillStyle = "#00F2FE";
          ctx.fillRect(Math.round(p.x - nx * 3) - 1, Math.round(p.y - ny * 3) - 1, 2, 2);
          
          ctx.fillStyle = "#0083B0";
          ctx.fillRect(Math.round(p.x - nx * 6), Math.round(p.y - ny * 6), 1, 1);
          
          ctx.fillStyle = `rgba(0, 131, 176, ${currentAlpha * 0.5})`;
          ctx.fillRect(Math.round(p.x - nx * 9), Math.round(p.y - ny * 9), 1, 1);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawWorldOverlay(ctx: CanvasRenderingContext2D): void {
    if (this.interactionTarget) {
      const screen = this.camera.worldToScreen(this.interactionTarget.x, this.interactionTarget.y);
      if (!isHubPromptAnchorNearViewport(screen)) return;
      const prompt = clampHubPromptPosition({ x: screen.x, y: screen.y - 13 });
      const promptKey = this.interactionTarget.object.promptKey;
      const label = promptKey ? t(this.language, promptKey as Parameters<typeof t>[1]) : t(this.language, "hub.interact");
      PromptRenderer.drawAt(ctx, prompt.x, prompt.y, label, this.engine.input.getPrompt("interact"), this.language, this.time);
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
      ctx.fillText(localized.name, 41, y);
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
    ctx.fillText(t(this.language, "hub.action.refund"), 41, refundY);

    ctx.textAlign = "center";
    ctx.fillStyle = this.refundArmed ? UI_COLORS.red : UI_COLORS.yellow;
    ctx.font = uiFont(this.language, 6, true);
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
    drawPixelPanel(ctx, 38, 24, 244, 194, "purple", true);
    drawSectionLabel(ctx, t(this.language, "hub.expeditionTitle"), 51, 43, 218, this.language, "purple");

    const loadout = this.engine.data.getHubLoadout();
    const character = CHARACTERS[loadout.characterId] ?? CHARACTERS.knight;
    const weapon = WEAPONS[loadout.starterWeaponId];
    const daily = getDailyChallengeId();
    const challenge = this.engine.data.meta.preferredChallengeId === daily
      ? getChallengeText(daily, CHALLENGES[daily], this.language).name
      : t(this.language, "common.off");
    const difficulty = this.engine.data.meta.preferredHardMode
      ? t(this.language, "common.hard")
      : t(this.language, "common.normal");

    ctx.textAlign = "left";
    ctx.font = uiFont(this.language, 6, true);
    ctx.fillStyle = UI_COLORS.text;
    ctx.fillText(t(this.language, "hub.expedition.loadoutSummary", {
      character: character.name,
      weapon: weapon?.name ?? loadout.starterWeaponId,
    }), 52, 62);
    ctx.fillText(t(this.language, "hub.expedition.rulesSummary", { difficulty, challenge }), 52, 74);

    EXPEDITION_ACTIONS.forEach((action, index) => {
      const y = 99 + index * 25;
      const selected = this.selectedIndex === index;
      const disabled = (action === "continue" || action === "abandon") && !this.engine.data.hasValidSave();
      const tone = action === "close" ? "neutral" : action === "start" ? "green" : action === "abandon" ? "red" : "purple";
      drawPixelButton(ctx, 51, y - 12, 218, 19, selected, tone);
      ctx.textAlign = "left";
      ctx.fillStyle = disabled ? UI_COLORS.edge : selected ? UI_COLORS.white : UI_COLORS.text;
      ctx.font = uiFont(this.language, 7, selected);
      ctx.fillText(t(this.language, `hub.expedition.${action}` as Parameters<typeof t>[1]), 59, y);
      const value = this.getExpeditionValue(action);
      if (value) {
        ctx.textAlign = "right";
        ctx.fillStyle = UI_COLORS.yellow;
        ctx.fillText(value, 261, y);
      }
    });

    ctx.textAlign = "center";
    ctx.fillStyle = UI_COLORS.muted;
    ctx.font = uiFont(this.language, 6);
    ctx.fillText(t(this.language, "hub.panelFooter", {
      vertical: this.engine.input.getNavigationPrompt("vertical"),
      confirm: this.engine.input.getConfirmPrompt(),
      cancel: this.engine.input.getCancelPrompt(),
    }), 160, 210);
  }

  private drawTrialPanel(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "rgba(3,5,9,0.8)";
    ctx.fillRect(0, 0, 320, 240);
    drawPixelPanel(ctx, 34, 27, 252, 188, "yellow", true);
    drawSectionLabel(ctx, t(this.language, "hub.trialTitle"), 47, 47, 226, this.language, "yellow");

    const dailyId = getDailyChallengeId();
    const daily = getChallengeText(dailyId, CHALLENGES[dailyId], this.language);
    ctx.textAlign = "left";
    ctx.fillStyle = UI_COLORS.white;
    ctx.font = uiFont(this.language, 7, true);
    ctx.fillText(daily.name, 49, 65);
    ctx.fillStyle = UI_COLORS.text;
    ctx.font = uiFont(this.language, 6);
    ctx.fillText(daily.description, 49, 77);
    ctx.fillStyle = UI_COLORS.yellow;
    ctx.fillText(t(this.language, "hub.trialReward", { reward: CHALLENGES[dailyId].reward }), 49, 89);

    TRIAL_ACTIONS.forEach((action, index) => {
      const y = 116 + index * 27;
      const selected = this.selectedIndex === index;
      const tone = action === "close" ? "neutral" : action === "hard" ? "red" : "purple";
      drawPixelButton(ctx, 49, y - 12, 222, 20, selected, tone);
      ctx.textAlign = "left";
      ctx.fillStyle = selected ? UI_COLORS.white : UI_COLORS.text;
      ctx.font = uiFont(this.language, 7, selected);
      ctx.fillText(t(this.language, `hub.trial.${action}` as Parameters<typeof t>[1]), 58, y);
      ctx.textAlign = "right";
      ctx.fillStyle = UI_COLORS.yellow;
      ctx.fillText(this.getTrialValue(action), 263, y);
    });
  }

  private getExpeditionValue(action: ExpeditionAction): string {
    if (action === "continue") return this.engine.data.hasValidSave() ? t(this.language, "common.ready") : t(this.language, "common.disabled");
    if (action === "abandon") return this.engine.data.hasValidSave() ? t(this.language, "common.ready") : t(this.language, "common.disabled");
    if (action === "start" && this.confirmationAction === "start") return t(this.language, "common.confirm");
    return "";
  }

  private getTrialValue(action: TrialAction): string {
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
