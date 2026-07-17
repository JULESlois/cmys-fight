import type { Player } from "../entities/Player";
import type { Input } from "../Input";
import type { WorldCollision } from "../world/WorldCollision";

export const HUB_MOVE_SPEED = 100;

export class HubPlayerController {
  public update(player: Player, input: Input, collision: WorldCollision, dt: number): void {
    const axis = input.getAxis();
    const length = Math.hypot(axis.x, axis.y);
    const normalizedX = length > 0 ? axis.x / Math.max(1, length) : 0;
    const normalizedY = length > 0 ? axis.y / Math.max(1, length) : 0;
    const previousX = player.x;
    const previousY = player.y;
    const moved = collision.moveCircle(
      player.x,
      player.y,
      player.radius,
      normalizedX * HUB_MOVE_SPEED * dt,
      normalizedY * HUB_MOVE_SPEED * dt,
    );
    player.x = moved.x;
    player.y = moved.y;

    const actualX = player.x - previousX;
    const actualY = player.y - previousY;
    const isMoving = Math.hypot(actualX, actualY) > 0.01;
    if (Math.abs(actualX) > 0.01) {
      player.facing = actualX < 0 ? "left" : "right";
      player.facingLeft = player.facing === "left";
      player.aimAngle = player.facingLeft ? Math.PI : 0;
    }
    player.animState = isMoving ? "walk" : "idle";
    player.animTimer += dt;
    const frameDuration = isMoving ? 0.12 : 0.5;
    if (player.animTimer >= frameDuration) {
      player.animTimer %= frameDuration;
      player.animFrame = isMoving ? (player.animFrame + 1) % 4 : (player.animFrame + 1) % 2;
    }
    if (!isMoving && player.animFrame > 1) player.animFrame = 0;
  }
}
