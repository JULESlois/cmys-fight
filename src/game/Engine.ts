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
import { events } from "./EventBus";

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

  constructor() {
    this.input = new Input();
    this.data = new GameData();
    this.data.load();

    this.states = {
      title: new TitleState(this),
      character_select: new CharacterSelectState(this),
      settings: new SettingsState(this),
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
    this.states[this.currentState].exit();
    this.input.clear();
    this.currentState = newState;
    if (["title", "character_select", "settings"].includes(newState)) {
       this.isPaused = false;
    }
    this.states[this.currentState].enter(params);
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
    const canPause = ["dungeon", "legacy_rpg", "legacy_tactics"].includes(this.currentState);
    if (canPause && this.input.wasPressed("p")) {
      this.isPaused = !this.isPaused;
    }
    if (!canPause) {
      this.isPaused = false;
    }

    if (canPause && this.isPaused && this.input.wasPressed("enter")) {
      const returnState = this.currentState;
      this.isPaused = false;
      this.switchState("menu", { returnState });
      this.input.update();
      return;
    }

    // Cap dt to prevent huge jumps
    const cappedDt = Math.min(dt, 0.1);
    
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

    // Save and scale ctx to virtual resolution 320x240
    this.ctx.save();
    const scaleX = this.canvas.width / 320;
    const scaleY = this.canvas.height / 240;
    const scale = Math.min(scaleX, scaleY);
    
    const offsetX = (this.canvas.width - 320 * scale) / 2;
    const offsetY = (this.canvas.height - 240 * scale) / 2;
    
    this.ctx.translate(offsetX, offsetY);
    this.ctx.scale(scale, scale);

    // Some states like dialog might want the map to draw first, but for simplicity let's just let states draw their own bg.
    // Dialog uses transparent bg over whatever was there. To make that work, we'd need to draw Map then Dialog.
    if (this.currentState === "legacy_dialog") {
      this.states["legacy_rpg"].draw(this.ctx);
    } else if (this.currentState === "menu") {
      this.states["dungeon"].draw(this.ctx);
    }
    
    this.states[this.currentState].draw(this.ctx);

    if (this.isPaused) {
      PauseOverlayRenderer.draw(this.ctx);
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
