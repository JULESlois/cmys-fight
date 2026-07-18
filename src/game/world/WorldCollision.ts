import {
  getWorldLayer,
  type WorldColliderDefinition,
  type WorldMapDefinition,
  type WorldPoint,
} from "./WorldMap";
import { moveSweptCircle } from "../physics/SweptCircleMovement";

function circleIntersectsRect(
  circleX: number,
  circleY: number,
  radius: number,
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number,
): boolean {
  const closestX = Math.max(rectX, Math.min(circleX, rectX + rectWidth));
  const closestY = Math.max(rectY, Math.min(circleY, rectY + rectHeight));
  const dx = circleX - closestX;
  const dy = circleY - closestY;
  return dx * dx + dy * dy < radius * radius;
}

function circleIntersectsCircle(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number,
): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  const radius = ar + br;
  return dx * dx + dy * dy < radius * radius;
}

function pointInPolygon(point: WorldPoint, polygon: WorldPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const crosses = (a.y > point.y) !== (b.y > point.y)
      && point.x < ((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || Number.EPSILON) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

export class WorldCollision {
  private readonly collisionTiles: number[];
  private readonly colliders: WorldColliderDefinition[];

  constructor(private readonly map: WorldMapDefinition) {
    this.collisionTiles = getWorldLayer(map, "collision")?.tiles ?? [];
    this.colliders = (map.colliders ?? []).filter(collider => collider.enabled !== false);
  }

  public getMap(): WorldMapDefinition {
    return this.map;
  }

  public getColliders(): readonly WorldColliderDefinition[] {
    return this.colliders;
  }

  public isCircleBlocked(worldX: number, worldY: number, radius: number): boolean {
    const worldWidth = this.map.widthTiles * this.map.tileSize;
    const worldHeight = this.map.heightTiles * this.map.tileSize;
    if (worldX - radius < 0 || worldY - radius < 0 || worldX + radius >= worldWidth || worldY + radius >= worldHeight) {
      return true;
    }

    const tileSize = this.map.tileSize;
    const startX = Math.max(0, Math.floor((worldX - radius) / tileSize));
    const endX = Math.min(this.map.widthTiles - 1, Math.floor((worldX + radius) / tileSize));
    const startY = Math.max(0, Math.floor((worldY - radius) / tileSize));
    const endY = Math.min(this.map.heightTiles - 1, Math.floor((worldY + radius) / tileSize));
    for (let tileY = startY; tileY <= endY; tileY++) {
      for (let tileX = startX; tileX <= endX; tileX++) {
        if (!this.isTileBlocked(tileX, tileY)) continue;
        if (circleIntersectsRect(worldX, worldY, radius, tileX * tileSize, tileY * tileSize, tileSize, tileSize)) {
          return true;
        }
      }
    }

    return this.colliders.some(collider => this.circleIntersectsCollider(worldX, worldY, radius, collider));
  }

  public moveCircle(x: number, y: number, radius: number, moveX: number, moveY: number): { x: number; y: number } {
    return moveSweptCircle({
      x,
      y,
      radius,
      deltaX: moveX,
      deltaY: moveY,
      isBlocked: (candidateX, candidateY, candidateRadius) =>
        this.isCircleBlocked(candidateX, candidateY, candidateRadius),
    });
  }

  public hasLineOfSight(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    ignoredColliderIds: readonly string[] = [],
  ): boolean {
    const distance = Math.hypot(toX - fromX, toY - fromY);
    const stepLength = Math.max(2, this.map.tileSize / 4);
    const steps = Math.max(1, Math.ceil(distance / stepLength));
    for (let step = 1; step < steps; step++) {
      const ratio = step / steps;
      if (this.isPointBlocked(
        fromX + (toX - fromX) * ratio,
        fromY + (toY - fromY) * ratio,
        ignoredColliderIds,
      )) return false;
    }
    return true;
  }

  public isTileBlocked(tileX: number, tileY: number): boolean {
    if (tileX < 0 || tileY < 0 || tileX >= this.map.widthTiles || tileY >= this.map.heightTiles) return true;
    return (this.collisionTiles[tileY * this.map.widthTiles + tileX] ?? 0) !== 0;
  }

  public isPointBlocked(x: number, y: number, ignoredColliderIds: readonly string[] = []): boolean {
    const worldWidth = this.map.widthTiles * this.map.tileSize;
    const worldHeight = this.map.heightTiles * this.map.tileSize;
    if (x < 0 || y < 0 || x >= worldWidth || y >= worldHeight) return true;
    if (this.isTileBlocked(Math.floor(x / this.map.tileSize), Math.floor(y / this.map.tileSize))) return true;
    const ignored = new Set(ignoredColliderIds);
    return this.colliders.some(collider => !ignored.has(collider.id) && this.pointInsideCollider(x, y, collider));
  }

  private circleIntersectsCollider(x: number, y: number, radius: number, collider: WorldColliderDefinition): boolean {
    if (collider.shape === "rect") {
      return circleIntersectsRect(x, y, radius, collider.x, collider.y, collider.width, collider.height);
    }
    if (collider.shape === "circle") {
      return circleIntersectsCircle(x, y, radius, collider.x, collider.y, collider.radius);
    }
    // Polygon collision is part of the public map contract. Hub currently uses
    // rect/circle colliders; a conservative vertex/containment test keeps future
    // polygon data safe until full edge-distance collision is required.
    return pointInPolygon({ x, y }, collider.points)
      || collider.points.some(point => Math.hypot(point.x - x, point.y - y) < radius);
  }

  private pointInsideCollider(x: number, y: number, collider: WorldColliderDefinition): boolean {
    if (collider.shape === "rect") {
      return x >= collider.x && y >= collider.y && x <= collider.x + collider.width && y <= collider.y + collider.height;
    }
    if (collider.shape === "circle") {
      return Math.hypot(x - collider.x, y - collider.y) <= collider.radius;
    }
    return pointInPolygon({ x, y }, collider.points);
  }
}
