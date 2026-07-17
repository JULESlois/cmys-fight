import { getWorldLayer, type WorldMapDefinition } from "./WorldMap";

export class WorldCollision {
  private readonly collisionTiles: number[];

  constructor(private readonly map: WorldMapDefinition) {
    this.collisionTiles = getWorldLayer(map, "collision")?.tiles ?? [];
  }

  public isCircleBlocked(worldX: number, worldY: number, radius: number): boolean {
    const diagonal = radius * 0.7;
    const points = [
      [worldX - radius, worldY], [worldX + radius, worldY],
      [worldX, worldY - radius], [worldX, worldY + radius],
      [worldX - diagonal, worldY - diagonal], [worldX + diagonal, worldY - diagonal],
      [worldX - diagonal, worldY + diagonal], [worldX + diagonal, worldY + diagonal],
    ];
    return points.some(([x, y]) => this.isPointBlocked(x, y));
  }

  public moveCircle(x: number, y: number, radius: number, moveX: number, moveY: number): { x: number; y: number } {
    let nextX = x;
    let nextY = y;
    if (!this.isCircleBlocked(x + moveX, y, radius)) nextX += moveX;
    if (!this.isCircleBlocked(nextX, y + moveY, radius)) nextY += moveY;
    return { x: nextX, y: nextY };
  }

  public isTileBlocked(tileX: number, tileY: number): boolean {
    if (tileX < 0 || tileY < 0 || tileX >= this.map.widthTiles || tileY >= this.map.heightTiles) return true;
    return (this.collisionTiles[tileY * this.map.widthTiles + tileX] ?? 0) !== 0;
  }

  private isPointBlocked(x: number, y: number): boolean {
    const worldWidth = this.map.widthTiles * this.map.tileSize;
    const worldHeight = this.map.heightTiles * this.map.tileSize;
    if (x < 0 || y < 0 || x >= worldWidth || y >= worldHeight) return true;
    return this.isTileBlocked(Math.floor(x / this.map.tileSize), Math.floor(y / this.map.tileSize));
  }
}
