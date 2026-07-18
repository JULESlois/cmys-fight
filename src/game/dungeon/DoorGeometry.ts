export type DoorOrientation = "up" | "down" | "left" | "right";

export interface DoorPoint {
  x: number;
  y: number;
}

export interface DoorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DoorGeometry {
  orientation: DoorOrientation;
  aperture: DoorRect;
  frameBounds: DoorRect;
  triggerBounds: DoorRect;
  entryPoint: DoorPoint;
  inwardDirection: DoorPoint;
}

export interface DoorTileBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export const DUNGEON_ROOM_WIDTH = 320;
export const DUNGEON_ROOM_HEIGHT = 240;
export const DUNGEON_TILE_SIZE = 16;
export const DOOR_ORIENTATIONS: readonly DoorOrientation[] = ["up", "down", "left", "right"];

const APERTURES: Record<DoorOrientation, DoorRect> = {
  up: { x: 128, y: 0, width: 64, height: 32 },
  down: { x: 128, y: 208, width: 64, height: 32 },
  left: { x: 0, y: 96, width: 32, height: 48 },
  right: { x: 288, y: 96, width: 32, height: 48 },
};

const FRAME_BOUNDS: Record<DoorOrientation, DoorRect> = {
  up: { x: 120, y: 0, width: 80, height: 32 },
  down: { x: 120, y: 208, width: 80, height: 32 },
  left: { x: 0, y: 88, width: 32, height: 64 },
  right: { x: 288, y: 88, width: 32, height: 64 },
};

const ENTRY_POINTS: Record<DoorOrientation, DoorPoint> = {
  up: { x: 160, y: 40 },
  down: { x: 160, y: 200 },
  left: { x: 40, y: 120 },
  right: { x: 280, y: 120 },
};

const INWARD_DIRECTIONS: Record<DoorOrientation, DoorPoint> = {
  up: { x: 0, y: 1 },
  down: { x: 0, y: -1 },
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
};

function insetTrigger(aperture: DoorRect, orientation: DoorOrientation, radius: number): DoorRect {
  const safeRadius = Math.max(0, radius);
  if (orientation === "up" || orientation === "down") {
    const inset = Math.min(safeRadius, aperture.width / 2 - 1);
    return {
      x: aperture.x + inset,
      y: aperture.y,
      width: aperture.width - inset * 2,
      height: aperture.height,
    };
  }
  const inset = Math.min(safeRadius, aperture.height / 2 - 1);
  return {
    x: aperture.x,
    y: aperture.y + inset,
    width: aperture.width,
    height: aperture.height - inset * 2,
  };
}

export function getDoorGeometry(orientation: DoorOrientation, playerRadius = 6): DoorGeometry {
  const aperture = { ...APERTURES[orientation] };
  return {
    orientation,
    aperture,
    frameBounds: { ...FRAME_BOUNDS[orientation] },
    triggerBounds: insetTrigger(aperture, orientation, playerRadius),
    entryPoint: { ...ENTRY_POINTS[orientation] },
    inwardDirection: { ...INWARD_DIRECTIONS[orientation] },
  };
}

export function getOppositeDoor(orientation: DoorOrientation): DoorOrientation {
  if (orientation === "up") return "down";
  if (orientation === "down") return "up";
  if (orientation === "left") return "right";
  return "left";
}

export function rectContainsPoint(rect: DoorRect, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

export function isDoorTransitionTriggered(geometry: DoorGeometry, x: number, y: number): boolean {
  if (!rectContainsPoint(geometry.triggerBounds, x, y)) return false;
  if (geometry.orientation === "up") return y < DUNGEON_TILE_SIZE;
  if (geometry.orientation === "down") return y > DUNGEON_ROOM_HEIGHT - DUNGEON_TILE_SIZE;
  if (geometry.orientation === "left") return x < DUNGEON_TILE_SIZE;
  return x > DUNGEON_ROOM_WIDTH - DUNGEON_TILE_SIZE;
}

export function getDoorBarrierBounds(geometry: DoorGeometry, thickness = 4): DoorRect {
  const safeThickness = Math.max(1, thickness);
  const { aperture, orientation } = geometry;
  if (orientation === "up") {
    return {
      x: aperture.x,
      y: aperture.y + aperture.height - safeThickness,
      width: aperture.width,
      height: safeThickness,
    };
  }
  if (orientation === "down") {
    return { x: aperture.x, y: aperture.y, width: aperture.width, height: safeThickness };
  }
  if (orientation === "left") {
    return {
      x: aperture.x + aperture.width - safeThickness,
      y: aperture.y,
      width: safeThickness,
      height: aperture.height,
    };
  }
  return { x: aperture.x, y: aperture.y, width: safeThickness, height: aperture.height };
}

export function circleIntersectsRect(x: number, y: number, radius: number, rect: DoorRect): boolean {
  const closestX = Math.max(rect.x, Math.min(x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(y, rect.y + rect.height));
  const dx = x - closestX;
  const dy = y - closestY;
  return dx * dx + dy * dy < radius * radius;
}

function pixelRectToTiles(rect: DoorRect): DoorTileBounds {
  return {
    xMin: Math.floor(rect.x / DUNGEON_TILE_SIZE),
    xMax: Math.ceil((rect.x + rect.width) / DUNGEON_TILE_SIZE) - 1,
    yMin: Math.floor(rect.y / DUNGEON_TILE_SIZE),
    yMax: Math.ceil((rect.y + rect.height) / DUNGEON_TILE_SIZE) - 1,
  };
}

export function getDoorApertureTileBounds(orientation: DoorOrientation): DoorTileBounds {
  return pixelRectToTiles(APERTURES[orientation]);
}

export function getDoorCarveTileBounds(orientation: DoorOrientation): DoorTileBounds {
  const aperture = getDoorApertureTileBounds(orientation);
  if (orientation === "up") return { ...aperture, yMax: 7 };
  if (orientation === "down") return { ...aperture, yMin: 7 };
  if (orientation === "left") return { ...aperture, xMax: 10 };
  return { ...aperture, xMin: 9 };
}

