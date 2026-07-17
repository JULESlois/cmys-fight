import type { WorldPoint, WorldRect } from "./WorldMap";

export interface CameraDeadZone {
  width: number;
  height: number;
}

export class Camera2D {
  public x = 0;
  public y = 0;
  private targetX = 0;
  private targetY = 0;

  constructor(
    public readonly viewportWidth = 320,
    public readonly viewportHeight = 240,
    public readonly deadZone: CameraDeadZone = { width: 96, height: 64 },
    private readonly followSpeed = 7.5,
  ) {}

  public snapTo(targetX: number, targetY: number, worldWidth: number, worldHeight: number): void {
    this.x = this.clampX(targetX - this.viewportWidth / 2, worldWidth);
    this.y = this.clampY(targetY - this.viewportHeight / 2, worldHeight);
    this.targetX = this.x;
    this.targetY = this.y;
  }

  public follow(actorX: number, actorY: number, worldWidth: number, worldHeight: number, dt: number): void {
    const actorScreenX = actorX - this.x;
    const actorScreenY = actorY - this.y;
    const deadLeft = (this.viewportWidth - this.deadZone.width) / 2;
    const deadRight = deadLeft + this.deadZone.width;
    const deadTop = (this.viewportHeight - this.deadZone.height) / 2;
    const deadBottom = deadTop + this.deadZone.height;

    if (actorScreenX < deadLeft) this.targetX = actorX - deadLeft;
    else if (actorScreenX > deadRight) this.targetX = actorX - deadRight;
    if (actorScreenY < deadTop) this.targetY = actorY - deadTop;
    else if (actorScreenY > deadBottom) this.targetY = actorY - deadBottom;

    this.targetX = this.clampX(this.targetX, worldWidth);
    this.targetY = this.clampY(this.targetY, worldHeight);
    const response = 1 - Math.exp(-this.followSpeed * Math.max(0, dt));
    this.x += (this.targetX - this.x) * response;
    this.y += (this.targetY - this.y) * response;
    this.x = this.clampX(this.x, worldWidth);
    this.y = this.clampY(this.y, worldHeight);
  }

  public begin(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(-Math.round(this.x), -Math.round(this.y));
  }

  public end(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }

  public worldToScreen(x: number, y: number): WorldPoint {
    return { x: x - this.x, y: y - this.y };
  }

  public screenToWorld(screenX: number, screenY: number): WorldPoint {
    return { x: screenX + this.x, y: screenY + this.y };
  }

  public isVisible(x: number, y: number, width: number, height: number, margin = 16): boolean {
    return x + width >= this.x - margin
      && x <= this.x + this.viewportWidth + margin
      && y + height >= this.y - margin
      && y <= this.y + this.viewportHeight + margin;
  }

  public getViewRect(margin = 0): WorldRect {
    return {
      x: this.x - margin,
      y: this.y - margin,
      width: this.viewportWidth + margin * 2,
      height: this.viewportHeight + margin * 2,
    };
  }

  private clampX(x: number, worldWidth: number): number {
    return Math.max(0, Math.min(Math.max(0, worldWidth - this.viewportWidth), x));
  }

  private clampY(y: number, worldHeight: number): number {
    return Math.max(0, Math.min(Math.max(0, worldHeight - this.viewportHeight), y));
  }
}
