import { Input } from "./Input";
import { GameData } from "./GameData";
import { GameState } from "./states/GameState";
import { LegacyRpgState } from "./states/LegacyRpgState";
import { LegacyTacticsState } from "./states/LegacyTacticsState";
import { LegacyDialogState } from "./states/LegacyDialogState";
import { MenuState } from "./states/MenuState";
import { DungeonState } from "./states/DungeonState";
import { events } from "./EventBus";

export class Engine {
  public input: Input;
  public data: GameData;
  public states: { [key: string]: GameState } = {};
  public currentState: string = "dungeon";
  public isPaused: boolean = false;
  
  private lastTime = 0;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private reqId: number = 0;

  constructor() {
    this.input = new Input();
    this.data = new GameData();
    this.data.load();

    this.states = {
      "legacy_rpg": new LegacyRpgState(this),
      "legacy_tactics": new LegacyTacticsState(this),
      "legacy_dialog": new LegacyDialogState(this),
      "menu": new MenuState(this),
      "dungeon": new DungeonState(this),
    };
    
    // Event Driven System hookup
    events.on("state:change", (newState: string, params?: any) => {
      this.switchState(newState, params);
    });
    
    events.on("dialog:start", (payload: any) => {
      this.switchState("legacy_dialog", payload);
    });
    
  }

  public init(canvas: HTMLCanvasElement) {
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
    this.input.cleanup();
    cancelAnimationFrame(this.reqId);
  }

  public switchState(newState: string, params?: any) {
    this.states[this.currentState].exit();
    this.currentState = newState;
    this.states[this.currentState].enter(params);
  }

  private loop(time: number) {
    const dt = (time - this.lastTime) / 1000;
    this.lastTime = time;

    this.update(dt);
    this.draw();

    this.reqId = requestAnimationFrame(this.loop.bind(this));
  }

  private update(dt: number) {
    if (this.input.justPressed["p"] || this.input.justPressed["P"]) {
      this.isPaused = !this.isPaused;
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
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      this.ctx.fillRect(0, 0, 320, 240);
      
      this.ctx.fillStyle = "#FFF";
      this.ctx.font = "20px monospace";
      this.ctx.textAlign = "center";
      this.ctx.fillText("PAUSE", 160, 100);
      
      this.ctx.font = "10px monospace";
      this.ctx.fillStyle = "#F1C40F";
      this.ctx.fillText("WASD / Arrows: Move/Attack", 160, 140);
      this.ctx.fillText("Space: Interact", 160, 160);
      this.ctx.fillText("Enter: Menu", 160, 180);
      this.ctx.fillText("P: Resume", 160, 200);
      
      this.ctx.textAlign = "left";
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
