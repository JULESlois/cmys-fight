import { Engine } from "../Engine";

export abstract class GameState {
  constructor(protected engine: Engine) {}
  
  abstract enter(params?: any): void;
  abstract exit(): void;
  abstract update(dt: number): void;
  abstract draw(ctx: CanvasRenderingContext2D): void;
}
