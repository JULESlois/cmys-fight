import { PauseOverlayRenderer } from "./render/PauseOverlayRenderer";
import { Input } from "./Input";
import { GameData } from "./GameData";
import { GameState } from "./states/GameState";
import { LegacyRpgState } from "./states/LegacyRpgState";
import { LegacyTacticsState } from "./states/LegacyTacticsState";
import { LegacyDialogState } from "./states/LegacyDialogState";
import { MenuState } from "./states/MenuState";
import { DungeonState, type DungeonQaScene } from "./states/DungeonState";
import { TitleState } from "./states/TitleState";
import { SplashState } from "./states/SplashState";
import { RebirthLoadoutState } from "./states/RebirthLoadoutState";
import { SettingsState } from "./states/SettingsState";
import { RunResultState } from "./states/RunResultState";
import { HubState, type HubQaPromptScene } from "./states/HubState";
import { RecordsState } from "./states/RecordsState";
import { events } from "./EventBus";
import { audio } from "./audio/AudioManager";
import type { MusicScene } from "./audio/MusicLibrary";
import { PerformanceMonitor } from "./PerformanceMonitor";
import { grantDebugLoadout, isDebugMode, jumpToStage } from "./DebugTools";
import { FINAL_GLOBAL_STAGE } from "./RunProgress";
import { getEntityPoolStats } from "./EntityPools";
import { WorldNoticeController } from "./notice/WorldNoticeController";
import { WorldNoticeRenderer } from "./notice/WorldNoticeRenderer";

export class Engine {
  public input: Input;
  public data: GameData;
  public states: { [key: string]: GameState } = {};
  public currentState: string = "splash";
  public isPaused: boolean = false;
  public readonly performanceMonitor = new PerformanceMonitor();
  public readonly debugMode = isDebugMode();
  public readonly worldNotices = new WorldNoticeController();
  
  private lastTime = 0;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private reqId: number = 0;
  private eventUnsubscribers: Array<() => void> = [];
  private cleanedUp: boolean = false;
  private overlayState: string | null = null;
  private shakeTimer = 0;
  private shakeIntensity = 0;
  private showDebugOverlay = false;
  private qaCaptureFrozen = false;

  private transitionTimer = 0;
  private readonly TRANSITION_DURATION = 0.75;
  private transitionTarget: { newState: string, params?: any } | null = null;
  private transitionOrder: number[] = [];

  constructor() {
    this.input = new Input();
    this.data = new GameData();
    this.data.load();
    this.input.setBindings(this.data.settings.keyBindings);
    this.input.setTouchPromptMode(this.data.settings.touchLabelMode);
    audio.setMasterVolume(this.data.settings.masterVolume / 100);
    audio.setMusicVolume(this.data.settings.musicVolume / 100);
    audio.setMusicMode(this.data.settings.musicMode);

    for (let i = 0; i < 300; i++) this.transitionOrder.push(i);
    this.states = {
      splash: new SplashState(this),
      title: new TitleState(this),
      rebirth_loadout: new RebirthLoadoutState(this),
      settings: new SettingsState(this),
      run_result: new RunResultState(this),
      hub: new HubState(this),
      records: new RecordsState(this),
      dungeon: new DungeonState(this),
      menu: new MenuState(this),
      legacy_rpg: new LegacyRpgState(this),
      legacy_tactics: new LegacyTacticsState(this),
      legacy_dialog: new LegacyDialogState(this)
    };
    
    // Event Driven System hookup
    this.eventUnsubscribers.push(
      events.on("state:change", (newState: string, params?: any) => {
        this.switchState(newState, params);
      })
    );

    this.eventUnsubscribers.push(
      events.on("dialog:start", (payload: any) => {
        this.switchState("legacy_dialog", payload);
      })
    );
    
  }

  public init(canvas: HTMLCanvasElement) {
    this.cleanedUp = false;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = false;
    }
    
    this.lastTime = performance.now();
    this.states[this.currentState].enter();
    this.syncStateMusic();
    this.loop(this.lastTime);
  }

  public cleanup() {
    if (this.cleanedUp) return;
    this.cleanedUp = true;

    this.input.cleanup();
    cancelAnimationFrame(this.reqId);
    for (const unsubscribe of this.eventUnsubscribers) {
      unsubscribe();
    }
    this.eventUnsubscribers = [];
    this.canvas = null;
    this.ctx = null;
  }

  public switchState(newState: string, params?: any) {
    if (newState === "menu") {
      this.openMenu();
      return;
    }
    if (this.currentState === "splash" && (newState === "title" || newState === "hub")) {
      this.doSwitchState(newState, params);
      return;
    }
    if (this.transitionTimer > 0) return;
    
    // Shuffle transition order
    for (let i = 299; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.transitionOrder[i], this.transitionOrder[j]] = [this.transitionOrder[j], this.transitionOrder[i]];
    }

    this.transitionTarget = { newState, params };
    this.transitionTimer = this.TRANSITION_DURATION;
  }

  public doSwitchState(newState: string, params?: any) {
    if (newState === "menu") {
      this.openMenu();
      return;
    }

    this.closeOverlayInternal();
    this.states[this.currentState].exit();
    this.input.suppressUntilReleased();
    this.currentState = newState;
    if (["splash", "title", "rebirth_loadout", "settings", "run_result", "hub", "records"].includes(newState)) {
       this.isPaused = false;
    }
    this.states[this.currentState].enter(params);
    this.syncStateMusic(params);
  }

  public openMenu() {
    if (this.overlayState) return;

    this.states[this.currentState].prepareForSave();
    this.isPaused = false;
    this.input.suppressUntilReleased();
    this.overlayState = "menu";
    this.states.menu.enter();
  }

  public closeMenu() {
    if (this.overlayState !== "menu") return;
    this.closeOverlayInternal();
    this.input.suppressUntilReleased();
  }

  public openSettingsFromMenu() {
    if (this.overlayState !== "menu") return;
    this.states.menu.exit();
    this.input.suppressUntilReleased();
    this.overlayState = "settings";
    this.states.settings.enter({ overlay: true });
  }

  public closeSettingsToMenu() {
    if (this.overlayState !== "settings") return;
    this.states.settings.exit();
    this.input.suppressUntilReleased();
    this.overlayState = "menu";
    this.states.menu.enter({ fromSettings: true });
  }

  public applySettings() {
    this.input.setBindings(this.data.settings.keyBindings);
    this.input.setTouchPromptMode(this.data.settings.touchLabelMode);
    audio.setMasterVolume(this.data.settings.masterVolume / 100);
    audio.setMusicVolume(this.data.settings.musicVolume / 100);
    audio.setMusicMode(this.data.settings.musicMode);
  }

  public getOverlayState(): string | null {
    return this.overlayState;
  }

  public isDebugOverlayVisible(): boolean {
    return this.debugMode && this.showDebugOverlay;
  }

  public toggleDebugOverlay(): boolean {
    if (!this.debugMode) return false;
    this.showDebugOverlay = !this.showDebugOverlay;
    return this.showDebugOverlay;
  }

  public qaJumpToStage(globalStageIndex: number): boolean {
    if (!this.debugMode) return false;
    this.rebuildStateAfterDataChange("dungeon", () => jumpToStage(this.data, globalStageIndex));
    return true;
  }

  public qaGrantDebugLoadout(): boolean {
    if (!this.debugMode) return false;
    this.rebuildStateAfterDataChange("dungeon", () => grantDebugLoadout(this.data));
    return true;
  }

  public qaFocusHubAnchor(anchorId: string): boolean {
    if (!this.debugMode) return false;
    if (this.currentState !== "hub") this.doSwitchState("hub", { spawnAnchor: anchorId });
    return (this.states.hub as HubState).qaFocusAnchor(anchorId);
  }

  public qaFocusHubLandmark(landmarkId: string): boolean {
    if (!this.debugMode) return false;
    if (this.currentState !== "hub") this.doSwitchState("hub", { spawnAnchor: "central_plaza" });
    return (this.states.hub as HubState).qaFocusLandmark(landmarkId);
  }

  public qaSetHubDebug(enabled: boolean): boolean {
    if (!this.debugMode) return false;
    if (this.currentState !== "hub") this.doSwitchState("hub", { spawnAnchor: "central_plaza" });
    return (this.states.hub as HubState).qaSetDebugOverlay(enabled);
  }

  public qaSetHubPresentation(time: number, characterId: string): boolean {
    if (!this.debugMode) return false;
    if (this.currentState !== "hub") this.doSwitchState("hub", { spawnAnchor: "central_plaza" });
    return (this.states.hub as HubState).qaSetPresentation(time, characterId);
  }

  public qaFocusHubPoint(cameraX: number, cameraY: number, playerX?: number, playerY?: number): boolean {
    if (!this.debugMode) return false;
    if (this.currentState !== "hub") this.doSwitchState("hub", { spawnAnchor: "central_plaza" });
    return (this.states.hub as HubState).qaFocusPoint(cameraX, cameraY, playerX, playerY);
  }

  public qaSetHubPromptScene(scene: HubQaPromptScene, time = 12.5): boolean {
    if (!this.debugMode) return false;
    if (this.currentState !== "hub") this.doSwitchState("hub", { spawnAnchor: "central_plaza" });
    return (this.states.hub as HubState).qaSetPromptScene(scene, time);
  }

  public qaSetDungeonScene(
    scene: DungeonQaScene,
    theme: "forest" | "dungeon" | "snow" | "lava",
    time: number,
  ): boolean {
    if (!this.debugMode) return false;
    if (this.currentState !== "dungeon") this.doSwitchState("dungeon");
    return (this.states.dungeon as DungeonState).qaSetScene(scene, theme, time);
  }

  public qaSetDungeonCollisionDebug(enabled: boolean): boolean {
    if (!this.debugMode) return false;
    if (this.currentState !== "dungeon") this.doSwitchState("dungeon");
    return (this.states.dungeon as DungeonState).qaSetCollisionDebug(enabled);
  }

  public qaSetCaptureFrozen(enabled: boolean): boolean {
    if (!this.debugMode) return false;
    this.qaCaptureFrozen = enabled;
    return this.qaCaptureFrozen;
  }

  private syncStateMusic(params?: any) {
    if (this.currentState === "dungeon") return;
    const stateScenes: Record<string, MusicScene> = {
      splash: "title",
      title: "title",
      rebirth_loadout: "hub",
      hub: "hub",
      records: "hub",
      settings: "settings",
      legacy_rpg: "legacy",
      legacy_tactics: "legacy",
      legacy_dialog: "legacy",
      menu: "settings",
    };
    if (this.currentState === "run_result") {
      const outcome = params?.summary?.outcome ?? this.data.data.runStats.outcome;
      audio.setMusicScene(outcome === "victory" ? "victory" : "defeat");
      return;
    }
    audio.setMusicScene(stateScenes[this.currentState] ?? "title");
  }

  public triggerScreenShake(intensity = 2, duration = 0.12) {
    if (!this.data.settings.screenShake) return;
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  public saveFromMenu() {
    this.states[this.currentState].prepareForSave();
    this.data.save();
  }

  public reloadSaveFromMenu() {
    this.rebuildStateAfterDataChange("dungeon", () => this.data.load());
  }

  public returnToHubFromRun() {
    this.states[this.currentState].prepareForSave();
    this.data.save();
    this.closeOverlayInternal();
    this.isPaused = false;
    this.switchState("hub", { spawnAnchor: "rebirth_spring" });
  }

  public resetGameFromMenu() {
    this.rebuildStateAfterDataChange(
      "hub",
      () => this.data.resetAll(),
      { spawnAnchor: "rebirth_spring" },
    );
  }

  private closeOverlayInternal() {
    if (!this.overlayState) return;
    this.states[this.overlayState].exit();
    this.overlayState = null;
  }

  private rebuildStateAfterDataChange(newState: string, mutateData: () => void, params?: any) {
    this.closeOverlayInternal();
    this.states[this.currentState].exit();
    mutateData();
    this.input.suppressUntilReleased();
    this.isPaused = false;
    this.currentState = newState;
    this.states[this.currentState].enter(params);
    this.syncStateMusic(params);
  }

  private loop(time: number) {
    const dt = (time - this.lastTime) / 1000;
    this.lastTime = time;

    try {
      this.update(dt);
      this.draw();
    } catch (e) {
      console.error("[Engine.loop] frame crashed:", e);
    } finally {
      if (!this.cleanedUp) {
        this.reqId = requestAnimationFrame(this.loop.bind(this));
      }
    }
  }

  private update(dt: number) {
    const cappedDt = Math.min(dt, 0.1);
    this.performanceMonitor.update(dt);
    this.input.beginFrame();
    if (this.qaCaptureFrozen) {
      this.input.update();
      return;
    }
    this.shakeTimer = Math.max(0, this.shakeTimer - cappedDt);
    this.worldNotices.update(cappedDt);

    if (this.transitionTimer > 0) {
      this.transitionTimer -= cappedDt;
      if (this.transitionTarget && this.transitionTimer <= this.TRANSITION_DURATION * 0.3) {
        this.doSwitchState(this.transitionTarget.newState, this.transitionTarget.params);
        this.transitionTarget = null;
      }
      this.input.update(); // flush input so it's ignored
      return;
    }

    if (this.overlayState) {
      this.states[this.overlayState].update(cappedDt);
      this.input.update();
      return;
    }

    if (this.debugMode && this.input.wasPressed("f6")) {
      this.toggleDebugOverlay();
    }

    if (this.debugMode && this.currentState === "dungeon") {
      if (this.input.wasPressed("f7")) {
        this.rebuildStateAfterDataChange("dungeon", () => jumpToStage(this.data, this.data.data.run.globalStageIndex - 1));
        return;
      }
      if (this.input.wasPressed("f8")) {
        this.rebuildStateAfterDataChange("dungeon", () => jumpToStage(this.data, this.data.data.run.globalStageIndex + 1));
        return;
      }
      if (this.input.wasPressed("f9")) {
        this.rebuildStateAfterDataChange("dungeon", () => grantDebugLoadout(this.data));
        return;
      }
      if (this.input.wasPressed("f10")) {
        this.rebuildStateAfterDataChange("dungeon", () => jumpToStage(this.data, FINAL_GLOBAL_STAGE));
        return;
      }
    }

    const canPause = ["dungeon", "legacy_rpg", "legacy_tactics"].includes(this.currentState);
    const stateCapturesPause = this.currentState === "dungeon"
      && (this.states.dungeon as DungeonState).capturesPauseInput()
      && this.input.wasUiPressed("cancel");
    if (canPause && !stateCapturesPause && this.input.wasActionPressed("pause")) {
      this.isPaused = !this.isPaused;
      this.input.clearJustPressed();
      return;
    }
    if (!canPause) {
      this.isPaused = false;
    }

    if (canPause && this.isPaused && this.input.wasUiPressed("cancel")) {
      this.isPaused = false;
      this.input.clearJustPressed();
      return;
    }

    if (canPause && this.isPaused && this.input.wasUiPressed("confirm")) {
      this.isPaused = false;
      this.openMenu();
      this.input.update();
      return;
    }
    
    if (!this.isPaused) {
      this.states[this.currentState].update(cappedDt);
    }
    
    this.input.update();
  }

  private draw() {
    if (!this.ctx || !this.canvas) return;
    
    // Clear whole canvas
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const settings = this.data.settings;
    this.canvas.style.filter = settings.colorblindMode === "deuteranopia"
      ? "saturate(0.82) hue-rotate(-18deg)"
      : settings.colorblindMode === "tritanopia"
        ? "saturate(0.82) hue-rotate(34deg)"
        : "none";

    // Save and scale ctx to virtual resolution 320x240. UI scale intentionally zooms the whole pixel surface.
    this.ctx.save();
    const scaleX = this.canvas.width / 320;
    const scaleY = this.canvas.height / 240;
    const scale = Math.min(scaleX, scaleY) * settings.uiScale;
    
    const offsetX = (this.canvas.width - 320 * scale) / 2;
    const offsetY = (this.canvas.height - 240 * scale) / 2;
    
    this.ctx.translate(offsetX, offsetY);
    this.ctx.scale(scale, scale);
    const degraded = this.performanceMonitor.isDegraded();
    if (this.shakeTimer > 0 && settings.screenShake && !degraded) {
      const phase = performance.now() * 0.04;
      this.ctx.translate(Math.sin(phase) * this.shakeIntensity, Math.cos(phase * 1.31) * this.shakeIntensity);
    }

    // Dialog is transparent, so draw the owning Legacy RPG state underneath it.
    if (this.currentState === "legacy_dialog") {
      this.states["legacy_rpg"].draw(this.ctx);
      this.states[this.currentState].draw(this.ctx);
    } else {
      this.states[this.currentState].draw(this.ctx);
    }

    if (this.overlayState) {
      this.states[this.overlayState].draw(this.ctx);
    }

    if (this.isPaused) {
      const dungeonPlayer = this.currentState === "dungeon"
        ? (this.states.dungeon as DungeonState).getPlayer()
        : undefined;
      PauseOverlayRenderer.draw(this.ctx, this.input, dungeonPlayer, settings.language);
    }

    WorldNoticeRenderer.draw(this.ctx, {
      bottom: this.worldNotices.getBottom(),
      region: this.worldNotices.getRegion(),
    }, settings.language, this.currentState === "dungeon" ? "dungeon" : "hub");


    if (this.isDebugOverlayVisible()) this.drawDebugOverlay(this.ctx);
    
    if (this.transitionTimer > 0) {
      this.ctx.fillStyle = "#39D9E8";
      let progress = 1.0 - Math.max(0, this.transitionTimer / this.TRANSITION_DURATION);
      let ratio = 0;
      let isFill = true;
      if (progress < 0.7) {
        let x = progress / 0.7;
        ratio = 1 - Math.pow(1 - x, 3);
        isFill = true;
      } else {
        let x = (progress - 0.7) / 0.3;
        ratio = Math.pow(1 - x, 3);
        isFill = false;
      }
      let count = Math.floor(ratio * 300);
      
      if (isFill) {
        for (let i = 0; i < count; i++) {
          let blockIdx = this.transitionOrder[i];
          let bx = (blockIdx % 20) * 16;
          let by = Math.floor(blockIdx / 20) * 16;
          this.ctx.fillRect(bx, by, 16, 16);
        }
      } else {
        for (let i = 300 - count; i < 300; i++) {
          let blockIdx = this.transitionOrder[i];
          let bx = (blockIdx % 20) * 16;
          let by = Math.floor(blockIdx / 20) * 16;
          this.ctx.fillRect(bx, by, 16, 16);
        }
      }
    }
    
    this.ctx.restore();
    
    // Draw letterbox borders
    if (offsetX > 0) {
      this.ctx.fillStyle = "black";
      this.ctx.fillRect(0, 0, offsetX, this.canvas.height);
      this.ctx.fillRect(this.canvas.width - offsetX, 0, offsetX, this.canvas.height);
    }
    if (offsetY > 0) {
      this.ctx.fillStyle = "black";
      this.ctx.fillRect(0, 0, this.canvas.width, offsetY);
      this.ctx.fillRect(0, this.canvas.height - offsetY, this.canvas.width, offsetY);
    }
  }
  public isPerformanceDegraded(): boolean {
    return this.performanceMonitor.isDegraded();
  }

  private drawDebugOverlay(ctx: CanvasRenderingContext2D): void {
    const perf = this.performanceMonitor.getSnapshot();
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(218, 54, 98, 52);
    ctx.strokeStyle = perf.degraded ? "#E74C3C" : "#2ECC71";
    ctx.strokeRect(218, 54, 98, 52);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "6px monospace";
    ctx.textAlign = "left";
    const pools = getEntityPoolStats();
    ctx.fillText(`FPS ${perf.fps} // ${perf.frameTimeMs}MS`, 222, 65);
    ctx.fillText(`STATE ${this.currentState.toUpperCase()}`, 222, 75);
    ctx.fillText(`STAGE ${this.data.data.run.chapterIndex}-${this.data.data.run.stageIndex}`, 222, 85);
    ctx.fillText(`POOL P${pools.projectiles.available} E${pools.enemies.available} D${pools.pickups.available}`, 222, 95);
    ctx.fillStyle = perf.degraded ? "#E74C3C" : "#7F8C8D";
    ctx.fillText(perf.degraded ? "AUTO LOW-FX" : "F6 HIDE · F7/F8 STAGE", 222, 103);
    ctx.restore();
  }

}
