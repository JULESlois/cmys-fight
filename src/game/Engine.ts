import { PauseOverlayRenderer } from "./render/PauseOverlayRenderer";
import { Input } from "./Input";
import { GameData } from "./GameData";
import { GameState } from "./states/GameState";
import { LegacyRpgState } from "./states/LegacyRpgState";
import { LegacyTacticsState } from "./states/LegacyTacticsState";
import { LegacyDialogState } from "./states/LegacyDialogState";
import { MenuState } from "./states/MenuState";
import { DungeonState } from "./states/DungeonState";
import { TitleState } from "./states/TitleState";
import { CharacterSelectState } from "./states/CharacterSelectState";
import { SettingsState } from "./states/SettingsState";
import { RunResultState } from "./states/RunResultState";
import { HubState } from "./states/HubState";
import { RecordsState } from "./states/RecordsState";
import { events } from "./EventBus";
import { audio } from "./audio/AudioManager";

export class Engine {
  public input: Input;
  public data: GameData;
  public states: { [key: string]: GameState } = {};
  public currentState: string = "title";
  public isPaused: boolean = false;
  
  private lastTime = 0;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private reqId: number = 0;
  private eventUnsubscribers: Array<() => void> = [];
  private cleanedUp: boolean = false;
  private overlayState: string | null = null;
  private shakeTimer = 0;
  private shakeIntensity = 0;

  constructor() {
    this.input = new Input();
    this.data = new GameData();
    this.data.load();
    this.input.setBindings(this.data.settings.keyBindings);
    audio.setMasterVolume(this.data.settings.masterVolume / 100);

    this.states = {
      title: new TitleState(this),
      character_select: new CharacterSelectState(this),
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

    this.closeOverlayInternal();
    this.states[this.currentState].exit();
    this.input.clear();
    this.currentState = newState;
    if (["title", "character_select", "settings", "run_result", "hub", "records"].includes(newState)) {
       this.isPaused = false;
    }
    this.states[this.currentState].enter(params);
  }

  public openMenu() {
    if (this.overlayState) return;

    this.states[this.currentState].prepareForSave();
    this.isPaused = false;
    this.input.clear();
    this.overlayState = "menu";
    this.states.menu.enter();
  }

  public closeMenu() {
    if (this.overlayState !== "menu") return;
    this.closeOverlayInternal();
    this.input.clear();
  }

  public applySettings() {
    this.input.setBindings(this.data.settings.keyBindings);
    audio.setMasterVolume(this.data.settings.masterVolume / 100);
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

  public resetGameFromMenu() {
    this.rebuildStateAfterDataChange("dungeon", () => this.data.resetAll());
  }

  private closeOverlayInternal() {
    if (!this.overlayState) return;
    this.states[this.overlayState].exit();
    this.overlayState = null;
  }

  private rebuildStateAfterDataChange(newState: string, mutateData: () => void) {
    this.closeOverlayInternal();
    this.states[this.currentState].exit();
    mutateData();
    this.input.clear();
    this.isPaused = false;
    this.currentState = newState;
    this.states[this.currentState].enter();
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
    this.input.beginFrame();
    this.shakeTimer = Math.max(0, this.shakeTimer - cappedDt);

    if (this.overlayState) {
      this.states[this.overlayState].update(cappedDt);
      this.input.update();
      return;
    }

    const canPause = ["dungeon", "legacy_rpg", "legacy_tactics"].includes(this.currentState);
    if (canPause && this.input.wasActionPressed("pause")) {
      this.isPaused = !this.isPaused;
    }
    if (!canPause) {
      this.isPaused = false;
    }

    if (canPause && this.isPaused && (this.input.wasPressed("enter") || this.input.wasActionPressed("interact"))) {
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
    if (this.shakeTimer > 0 && settings.screenShake) {
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
      PauseOverlayRenderer.draw(this.ctx, this.input);
    }

    if (settings.crtFilter) {
      this.ctx.fillStyle = settings.reducedFlashing ? "rgba(0,0,0,0.07)" : "rgba(0,0,0,0.13)";
      for (let y = 0; y < 240; y += 4) this.ctx.fillRect(0, y, 320, 1);
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
}
