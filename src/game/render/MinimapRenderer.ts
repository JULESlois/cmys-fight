import { FloorData } from "../FloorGenerator";

export class MinimapRenderer {
  static draw(ctx: CanvasRenderingContext2D, floor: FloorData) {
    if (floor.rooms.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const room of floor.rooms) {
      minX = Math.min(minX, room.x);
      maxX = Math.max(maxX, room.x);
      minY = Math.min(minY, room.y);
      maxY = Math.max(maxY, room.y);
    }

    const columns = maxX - minX + 1;
    const rows = maxY - minY + 1;
    const maxPanelWidth = 112;
    const maxPanelHeight = 78;
    const cellSize = Math.max(6, Math.min(9, Math.floor(Math.min(
      (maxPanelWidth - 8) / columns,
      (maxPanelHeight - 8) / rows,
    ))));
    const mapWidth = columns * cellSize;
    const mapHeight = rows * cellSize;
    const panelX = 316 - mapWidth - 6;
    const panelY = 22;

    ctx.fillStyle = "rgba(5, 9, 17, 0.82)";
    ctx.fillRect(panelX - 4, panelY - 4, mapWidth + 8, mapHeight + 8);
    ctx.strokeStyle = "rgba(0, 242, 254, 0.48)";
    ctx.strokeRect(panelX - 4, panelY - 4, mapWidth + 8, mapHeight + 8);

    const position = (x: number, y: number) => ({
      x: panelX + (x - minX) * cellSize,
      y: panelY + (y - minY) * cellSize,
    });

    // Draw continuous links behind room cells. The old one-pixel edge marks made
    // connected rooms look detached, especially on wider generated layouts.
    ctx.fillStyle = "rgba(189, 195, 199, 0.48)";
    for (const room of floor.rooms) {
      const point = position(room.x, room.y);
      const centerX = point.x + Math.floor((cellSize - 1) / 2);
      const centerY = point.y + Math.floor((cellSize - 1) / 2);
      if (room.doors.right) ctx.fillRect(centerX, centerY, cellSize + 1, 1);
      if (room.doors.down) ctx.fillRect(centerX, centerY, 1, cellSize + 1);
    }

    for (const room of floor.rooms) {
      const point = position(room.x, room.y);
      const isCurrent = room.x === floor.currentRoomX && room.y === floor.currentRoomY;
      if (isCurrent) ctx.fillStyle = "#FFFFFF";
      else if (room.type === "boss") ctx.fillStyle = room.cleared ? "#922B21" : "#E74C3C";
      else if (room.type === "exit") ctx.fillStyle = "#00F2FE";
      else if (room.type === "shop") ctx.fillStyle = "#F1C40F";
      else if (room.type === "treasure") ctx.fillStyle = room.interactionCompleted ? "#7F8C8D" : "#F39C12";
      else if (room.type === "npc") ctx.fillStyle = room.interactionCompleted ? "#566573" : "#D980FA";
      else if (room.type === "wish_fountain" || room.type === "photo_booth") {
        ctx.fillStyle = room.interactionCompleted ? "#5B3A6E" : "#A569BD";
      } else ctx.fillStyle = room.cleared ? "#7F8C8D" : "#34495E";

      const inset = isCurrent ? 0 : 1;
      ctx.fillRect(
        point.x + inset,
        point.y + inset,
        Math.max(2, cellSize - 1 - inset * 2),
        Math.max(2, cellSize - 1 - inset * 2),
      );
      if (isCurrent) {
        ctx.fillStyle = "#00F2FE";
        ctx.fillRect(point.x + 2, point.y + 2, Math.max(2, cellSize - 5), Math.max(2, cellSize - 5));
      }
    }
  }
}
