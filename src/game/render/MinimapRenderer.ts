import { FloorData, type Room } from "../FloorGenerator";
import { uiFont, type Language } from "../i18n";
import { HUD_LAYOUT } from "./HudLayout";
import { drawPixelPanel, UI_COLORS } from "./PixelUi";

/**
 * Minimap swatches, resolved from the shared UI palette so the map reads as
 * part of the same HUD rather than a separate widget with its own colors.
 */
const MAP_COLORS = {
  link: "rgba(120, 136, 150, 0.55)",
  unknownFill: UI_COLORS.dark,
  unknownGlyph: UI_COLORS.muted,
  current: UI_COLORS.white,
  currentCore: UI_COLORS.cyan,
  bossCleared: "#8A3740",
  boss: UI_COLORS.red,
  exit: UI_COLORS.cyan,
  treasure: UI_COLORS.yellow,
  treasureDone: UI_COLORS.muted,
  npc: UI_COLORS.purple,
  npcDone: UI_COLORS.edge,
  cleared: UI_COLORS.muted,
  unclearedRoom: UI_COLORS.edgeSoft,
} as const;

function roomColor(room: Room, isCurrent: boolean): string {
  if (isCurrent) return MAP_COLORS.current;
  if (room.type === "boss") return room.cleared ? MAP_COLORS.bossCleared : MAP_COLORS.boss;
  if (room.type === "exit") return MAP_COLORS.exit;
  if (room.type === "treasure") return room.interactionCompleted ? MAP_COLORS.treasureDone : MAP_COLORS.treasure;
  if (room.type === "npc") return room.interactionCompleted ? MAP_COLORS.npcDone : MAP_COLORS.npc;
  return room.cleared ? MAP_COLORS.cleared : MAP_COLORS.unclearedRoom;
}

const roomKey = (room: Pick<Room, "x" | "y">) => `${room.x},${room.y}`;

function getVisibleRooms(floor: FloorData): { visible: Room[]; visited: Set<string> } {
  const byPosition = new Map(floor.rooms.map(room => [roomKey(room), room]));
  const visited = new Set<string>();

  for (const room of floor.rooms) {
    const isCurrent = room.x === floor.currentRoomX && room.y === floor.currentRoomY;
    if (room.visited || isCurrent) visited.add(roomKey(room));
  }

  const visible = new Set(visited);
  const reveal = (x: number, y: number) => {
    const neighbor = byPosition.get(`${x},${y}`);
    if (neighbor) visible.add(roomKey(neighbor));
  };

  for (const key of visited) {
    const room = byPosition.get(key);
    if (!room) continue;
    if (room.doors.up) reveal(room.x, room.y - 1);
    if (room.doors.down) reveal(room.x, room.y + 1);
    if (room.doors.left) reveal(room.x - 1, room.y);
    if (room.doors.right) reveal(room.x + 1, room.y);
  }

  return {
    visible: floor.rooms.filter(room => visible.has(roomKey(room))),
    visited,
  };
}

export class MinimapRenderer {
  static draw(ctx: CanvasRenderingContext2D, floor: FloorData, language: Language = "en") {
    if (floor.rooms.length === 0) return;

    const { visible, visited } = getVisibleRooms(floor);
    if (visible.length === 0) return;
    const visibleKeys = new Set(visible.map(roomKey));

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const room of visible) {
      minX = Math.min(minX, room.x);
      maxX = Math.max(maxX, room.x);
      minY = Math.min(minY, room.y);
      maxY = Math.max(maxY, room.y);
    }

    const columns = maxX - minX + 1;
    const rows = maxY - minY + 1;
    // The reserved HUD box drives the cell size, so the panel can never grow
    // past the area the layout has set aside for it.
    const reserved = HUD_LAYOUT.topRightMinimap;
    const frame = 4;
    const cellSize = Math.max(6, Math.min(9, Math.floor(Math.min(
      (reserved.width - frame * 2) / columns,
      (reserved.height - frame * 2) / rows,
    ))));
    const mapWidth = columns * cellSize;
    const mapHeight = rows * cellSize;
    const panelX = reserved.x + reserved.width - mapWidth - frame;
    const panelY = reserved.y + frame;

    drawPixelPanel(ctx, panelX - frame, panelY - frame, mapWidth + frame * 2, mapHeight + frame * 2, "cyan", true);

    const position = (x: number, y: number) => ({
      x: panelX + (x - minX) * cellSize,
      y: panelY + (y - minY) * cellSize,
    });

    // Only discovered links are drawn. A visible unknown room never reveals
    // rooms beyond itself, so the complete floor shape remains concealed.
    ctx.fillStyle = MAP_COLORS.link;
    for (const room of visible) {
      const point = position(room.x, room.y);
      const centerX = point.x + Math.floor((cellSize - 1) / 2);
      const centerY = point.y + Math.floor((cellSize - 1) / 2);
      if (room.doors.right && visibleKeys.has(`${room.x + 1},${room.y}`)) {
        ctx.fillRect(centerX, centerY, cellSize + 1, 1);
      }
      if (room.doors.down && visibleKeys.has(`${room.x},${room.y + 1}`)) {
        ctx.fillRect(centerX, centerY, 1, cellSize + 1);
      }
    }

    for (const room of visible) {
      const point = position(room.x, room.y);
      const key = roomKey(room);
      const isCurrent = room.x === floor.currentRoomX && room.y === floor.currentRoomY;
      const isVisited = visited.has(key);

      if (!isVisited) {
        ctx.fillStyle = MAP_COLORS.unknownFill;
        ctx.fillRect(point.x + 1, point.y + 1, Math.max(2, cellSize - 3), Math.max(2, cellSize - 3));
        ctx.fillStyle = MAP_COLORS.unknownGlyph;
        ctx.font = uiFont(language, Math.max(5, cellSize - 2), true);
        ctx.textAlign = "center";
        ctx.fillText("?", point.x + cellSize / 2, point.y + cellSize - 1);
        ctx.textAlign = "left";
        continue;
      }

      ctx.fillStyle = roomColor(room, isCurrent);

      const inset = isCurrent ? 0 : 1;
      ctx.fillRect(
        point.x + inset,
        point.y + inset,
        Math.max(2, cellSize - 1 - inset * 2),
        Math.max(2, cellSize - 1 - inset * 2),
      );
      if (isCurrent) {
        ctx.fillStyle = MAP_COLORS.currentCore;
        ctx.fillRect(point.x + 2, point.y + 2, Math.max(2, cellSize - 5), Math.max(2, cellSize - 5));
      }
    }
  }
}
