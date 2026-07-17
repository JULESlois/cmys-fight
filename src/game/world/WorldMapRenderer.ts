import type { Camera2D } from "./Camera2D";
import type { WorldMapDefinition, WorldMapLayer } from "./WorldMap";

export interface VisibleTileBounds {
  startX: number;
  endX: number;
  startY: number;
  endY: number;
}

export class WorldMapRenderer {
  public getVisibleTileBounds(map: WorldMapDefinition, camera: Camera2D, marginTiles = 1): VisibleTileBounds {
    const tileSize = map.tileSize;
    return {
      startX: Math.max(0, Math.floor(camera.renderX / tileSize) - marginTiles),
      endX: Math.min(map.widthTiles - 1, Math.ceil((camera.renderX + camera.viewportWidth) / tileSize) + marginTiles),
      startY: Math.max(0, Math.floor(camera.renderY / tileSize) - marginTiles),
      endY: Math.min(map.heightTiles - 1, Math.ceil((camera.renderY + camera.viewportHeight) / tileSize) + marginTiles),
    };
  }

  public drawLayer(
    ctx: CanvasRenderingContext2D,
    map: WorldMapDefinition,
    layer: WorldMapLayer,
    camera: Camera2D,
    drawTile: (ctx: CanvasRenderingContext2D, tileId: number, x: number, y: number, tileX: number, tileY: number) => void,
  ): void {
    if (layer.visible === false) return;
    const bounds = this.getVisibleTileBounds(map, camera);
    const tileSize = map.tileSize;
    for (let tileY = bounds.startY; tileY <= bounds.endY; tileY++) {
      for (let tileX = bounds.startX; tileX <= bounds.endX; tileX++) {
        const tileId = layer.tiles[tileY * map.widthTiles + tileX] ?? 0;
        if (tileId === 0) continue;
        drawTile(ctx, tileId, tileX * tileSize, tileY * tileSize, tileX, tileY);
      }
    }
  }
}
