import type { Player } from "../entities/Player";
import type { Camera2D } from "../world/Camera2D";
import type { WorldCollision } from "../world/WorldCollision";
import { getWorldLayer, type WorldInteractionZone, type WorldMapDefinition, type WorldRect } from "../world/WorldMap";

function strokeRect(ctx: CanvasRenderingContext2D, rect: WorldRect, color: string, lineWidth = 1): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(Math.round(rect.x) + 0.5, Math.round(rect.y) + 0.5, Math.round(rect.width), Math.round(rect.height));
}

function drawZone(ctx: CanvasRenderingContext2D, zone: WorldInteractionZone): void {
  ctx.strokeStyle = "#30F2F2";
  ctx.fillStyle = "rgba(48,242,242,0.10)";
  ctx.lineWidth = 1;
  if (zone.shape === "rect") {
    ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
    ctx.strokeRect(Math.round(zone.x) + 0.5, Math.round(zone.y) + 0.5, Math.round(zone.width), Math.round(zone.height));
  } else {
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

export class HubDebugOverlay {
  public static draw(
    ctx: CanvasRenderingContext2D,
    map: WorldMapDefinition,
    collision: WorldCollision,
    camera: Camera2D,
    player: Player,
  ): void {
    ctx.save();
    ctx.globalAlpha = 0.95;

    const collisionLayer = getWorldLayer(map, "collision");
    if (collisionLayer) {
      ctx.fillStyle = "rgba(255,45,45,0.22)";
      ctx.strokeStyle = "#FF3B3B";
      ctx.lineWidth = 1;
      for (let tileY = 0; tileY < map.heightTiles; tileY++) {
        for (let tileX = 0; tileX < map.widthTiles; tileX++) {
          if ((collisionLayer.tiles[tileY * map.widthTiles + tileX] ?? 0) === 0) continue;
          const x = tileX * map.tileSize;
          const y = tileY * map.tileSize;
          ctx.fillRect(x, y, map.tileSize, map.tileSize);
          ctx.strokeRect(x + 0.5, y + 0.5, map.tileSize - 1, map.tileSize - 1);
        }
      }
    }

    for (const collider of collision.getColliders()) {
      ctx.fillStyle = "rgba(255,45,45,0.18)";
      ctx.strokeStyle = "#FF3B3B";
      ctx.lineWidth = 1;
      if (collider.shape === "rect") {
        ctx.fillRect(collider.x, collider.y, collider.width, collider.height);
        ctx.strokeRect(collider.x + 0.5, collider.y + 0.5, collider.width, collider.height);
      } else if (collider.shape === "circle") {
        ctx.beginPath();
        ctx.arc(collider.x, collider.y, collider.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (collider.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(collider.points[0].x, collider.points[0].y);
        for (const point of collider.points.slice(1)) ctx.lineTo(point.x, point.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    for (const object of map.objects) {
      if (object.interaction) drawZone(ctx, object.interaction.zone);

      if (object.visualBounds && object.properties?.visible !== false) {
        strokeRect(ctx, object.visualBounds, "#FFE45E");
      }

      if (typeof object.sortY === "number" && object.type !== "region" && object.properties?.visible !== false) {
        const bounds = object.visualBounds ?? {
          x: object.x,
          y: object.y,
          width: object.width ?? 16,
          height: object.height ?? 16,
        };
        ctx.strokeStyle = "#D65CFF";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bounds.x, Math.round(object.sortY) + 0.5);
        ctx.lineTo(bounds.x + Math.max(12, bounds.width), Math.round(object.sortY) + 0.5);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = "#FFFFFF";
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#46F27A";
    for (const point of Object.values(map.spawnPoints)) {
      ctx.fillRect(Math.round(point.x) - 2, Math.round(point.y) - 2, 5, 5);
      ctx.strokeStyle = "#143D21";
      ctx.strokeRect(Math.round(point.x) - 2.5, Math.round(point.y) - 2.5, 5, 5);
    }

    const view = camera.getViewRect();
    strokeRect(ctx, view, "#FFFFFF", 1);
    const deadZone = camera.getDeadZoneWorldRect();
    strokeRect(ctx, deadZone, "#63A7FF", 1);
    ctx.restore();
  }
}
