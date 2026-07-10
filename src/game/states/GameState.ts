import { Engine } from "../Engine";

export abstract class GameState {
  constructor(protected engine: Engine) {}

  /** Copy transient runtime state into GameData without leaving the state. */
  prepareForSave(): void {}
  
  abstract enter(params?: any): void;
  abstract exit(): void;
  abstract update(dt: number): void;
  abstract draw(ctx: CanvasRenderingContext2D): void;
}
