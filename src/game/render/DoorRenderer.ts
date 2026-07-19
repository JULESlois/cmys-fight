import type { DoorGeometry, DoorRect } from "../dungeon/DoorGeometry";

export type DoorTheme = "forest" | "dungeon" | "snow" | "lava" | string;

interface DoorPalette {
  void: string;
  voidDeep: string;
  frameDark: string;
  frame: string;
  frameLight: string;
  accent: string;
  accentLight: string;
  lock: string;
  lockLight: string;
}

export interface DoorRenderLayout {
  aperture: DoorRect;
  jambA: DoorRect;
  jambB: DoorRect;
  outerLintel: DoorRect;
  innerLip: DoorRect;
  groundShadow: DoorRect;
  lockBounds: DoorRect;
}

const PALETTES: Record<string, DoorPalette> = {
  forest: {
    void: "rgba(18,38,27,0.62)", voidDeep: "#142219", frameDark: "#2A1C14", frame: "#65482F",
    frameLight: "#A0764A", accent: "#557B45", accentLight: "#91C96E", lock: "#20382A", lockLight: "#86E49D",
  },
  dungeon: {
    void: "rgba(7,11,18,0.72)", voidDeep: "#080D15", frameDark: "#111925", frame: "#3D4858",
    frameLight: "#7A8798", accent: "#69517A", accentLight: "#B57CE0", lock: "#171C27", lockLight: "#B16BE1",
  },
  snow: {
    void: "rgba(19,52,66,0.64)", voidDeep: "#173440", frameDark: "#294A5B", frame: "#6F929E",
    frameLight: "#D9E8EB", accent: "#5CB7C8", accentLight: "#BDF7FF", lock: "#244956", lockLight: "#70E5F2",
  },
  lava: {
    void: "rgba(30,18,21,0.72)", voidDeep: "#150F13", frameDark: "#171219", frame: "#493943",
    frameLight: "#8B8583", accent: "#9C3D24", accentLight: "#FF9A43", lock: "#481A17", lockLight: "#FF6A2B",
  },
};

function fill(ctx: CanvasRenderingContext2D, color: string, rect: DoorRect): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height));
}

function inset(rect: DoorRect, amount: number): DoorRect {
  return {
    x: rect.x + amount,
    y: rect.y + amount,
    width: Math.max(1, rect.width - amount * 2),
    height: Math.max(1, rect.height - amount * 2),
  };
}

export function getDoorRenderLayout(geometry: DoorGeometry): DoorRenderLayout {
  const { aperture, frameBounds, direction } = geometry;
  const horizontal = direction === "up" || direction === "down";
  if (horizontal) {
    const leftWidth = aperture.x - frameBounds.x;
    const rightX = aperture.x + aperture.width;
    const rightWidth = frameBounds.x + frameBounds.width - rightX;
    const outerY = direction === "up" ? frameBounds.y : frameBounds.y + frameBounds.height - 6;
    const innerY = direction === "up" ? aperture.y + aperture.height - 4 : aperture.y;
    const shadowY = direction === "up" ? innerY - 4 : innerY + 4;
    return {
      aperture: { ...aperture },
      jambA: { x: frameBounds.x, y: frameBounds.y, width: leftWidth, height: frameBounds.height },
      jambB: { x: rightX, y: frameBounds.y, width: rightWidth, height: frameBounds.height },
      outerLintel: { x: frameBounds.x, y: outerY, width: frameBounds.width, height: 6 },
      innerLip: { x: aperture.x, y: innerY, width: aperture.width, height: 4 },
      groundShadow: { x: aperture.x + 4, y: shadowY, width: aperture.width - 8, height: 4 },
      lockBounds: inset(aperture, 3),
    };
  }

  const topHeight = aperture.y - frameBounds.y;
  const bottomY = aperture.y + aperture.height;
  const bottomHeight = frameBounds.y + frameBounds.height - bottomY;
  const outerX = direction === "left" ? frameBounds.x : frameBounds.x + frameBounds.width - 6;
  const innerX = direction === "left" ? aperture.x + aperture.width - 4 : aperture.x;
  const shadowX = direction === "left" ? innerX - 4 : innerX + 4;
  return {
    aperture: { ...aperture },
    jambA: { x: frameBounds.x, y: frameBounds.y, width: frameBounds.width, height: topHeight },
    jambB: { x: frameBounds.x, y: bottomY, width: frameBounds.width, height: bottomHeight },
    outerLintel: { x: outerX, y: frameBounds.y, width: 6, height: frameBounds.height },
    innerLip: { x: innerX, y: aperture.y, width: 4, height: aperture.height },
    groundShadow: { x: shadowX, y: aperture.y + 4, width: 4, height: aperture.height - 8 },
    lockBounds: inset(aperture, 3),
  };
}

function drawBeveledFrame(ctx: CanvasRenderingContext2D, rect: DoorRect, palette: DoorPalette): void {
  fill(ctx, palette.frameDark, rect);
  const inner = inset(rect, 2);
  fill(ctx, palette.frame, inner);
  if (inner.width >= inner.height) {
    fill(ctx, palette.frameLight, { x: inner.x + 1, y: inner.y + 1, width: inner.width - 2, height: 2 });
    fill(ctx, palette.frameDark, { x: inner.x + 1, y: inner.y + inner.height - 2, width: inner.width - 2, height: 1 });
  } else {
    fill(ctx, palette.frameLight, { x: inner.x + 1, y: inner.y + 1, width: 2, height: inner.height - 2 });
    fill(ctx, palette.frameDark, { x: inner.x + inner.width - 2, y: inner.y + 1, width: 1, height: inner.height - 2 });
  }
}

function drawForestDetails(ctx: CanvasRenderingContext2D, geometry: DoorGeometry, layout: DoorRenderLayout, palette: DoorPalette): void {
  const horizontal = geometry.direction === "up" || geometry.direction === "down";
  if (horizontal) {
    for (const jamb of [layout.jambA, layout.jambB]) {
      fill(ctx, palette.accent, { x: jamb.x + 2, y: jamb.y + 7, width: Math.max(2, jamb.width - 4), height: 3 });
      fill(ctx, palette.accentLight, { x: jamb.x + jamb.width / 2 - 1, y: jamb.y + 10, width: 2, height: 7 });
    }
  } else {
    for (const jamb of [layout.jambA, layout.jambB]) {
      fill(ctx, palette.accent, { x: jamb.x + 7, y: jamb.y + 2, width: 3, height: Math.max(2, jamb.height - 4) });
      fill(ctx, palette.accentLight, { x: jamb.x + 10, y: jamb.y + jamb.height / 2 - 1, width: 7, height: 2 });
    }
  }
}

function drawDungeonDetails(ctx: CanvasRenderingContext2D, geometry: DoorGeometry, layout: DoorRenderLayout, palette: DoorPalette): void {
  const horizontal = geometry.direction === "up" || geometry.direction === "down";
  const boltRects = horizontal
    ? [
        { x: layout.jambA.x + 2, y: layout.jambA.y + 7, width: 2, height: 2 },
        { x: layout.jambB.x + layout.jambB.width - 4, y: layout.jambB.y + 19, width: 2, height: 2 },
      ]
    : [
        { x: layout.jambA.x + 7, y: layout.jambA.y + 2, width: 2, height: 2 },
        { x: layout.jambB.x + 19, y: layout.jambB.y + layout.jambB.height - 4, width: 2, height: 2 },
      ];
  for (const bolt of boltRects) fill(ctx, palette.frameLight, bolt);
  const centerX = layout.innerLip.x + layout.innerLip.width / 2;
  const centerY = layout.innerLip.y + layout.innerLip.height / 2;
  const runeX = Math.max(geometry.frameBounds.x + 3, Math.min(geometry.frameBounds.x + geometry.frameBounds.width - 3, centerX));
  const runeY = Math.max(geometry.frameBounds.y + 3, Math.min(geometry.frameBounds.y + geometry.frameBounds.height - 3, centerY));
  fill(ctx, palette.accent, { x: runeX - 3, y: runeY - 3, width: 6, height: 6 });
  fill(ctx, palette.accentLight, { x: runeX - 1, y: runeY - 1, width: 2, height: 2 });
}

function drawSnowDetails(ctx: CanvasRenderingContext2D, geometry: DoorGeometry, layout: DoorRenderLayout, palette: DoorPalette): void {
  const horizontal = geometry.direction === "up" || geometry.direction === "down";
  fill(ctx, palette.accentLight, horizontal
    ? { x: layout.outerLintel.x + 5, y: layout.outerLintel.y, width: layout.outerLintel.width - 10, height: 2 }
    : { x: layout.outerLintel.x, y: layout.outerLintel.y + 5, width: 2, height: layout.outerLintel.height - 10 });
  const shards = horizontal
    ? [
        { x: layout.jambA.x + 2, y: layout.jambA.y + 10, width: 3, height: 7 },
        { x: layout.jambB.x + layout.jambB.width - 5, y: layout.jambB.y + 14, width: 3, height: 9 },
      ]
    : [
        { x: layout.jambA.x + 10, y: layout.jambA.y + 2, width: 7, height: 3 },
        { x: layout.jambB.x + 14, y: layout.jambB.y + layout.jambB.height - 5, width: 9, height: 3 },
      ];
  for (const shard of shards) fill(ctx, palette.accent, shard);
}

function drawLavaDetails(ctx: CanvasRenderingContext2D, geometry: DoorGeometry, layout: DoorRenderLayout, palette: DoorPalette): void {
  const horizontal = geometry.direction === "up" || geometry.direction === "down";
  const cracks = horizontal
    ? [
        { x: layout.jambA.x + 3, y: layout.jambA.y + 8, width: 2, height: 10 },
        { x: layout.jambB.x + layout.jambB.width - 5, y: layout.jambB.y + 13, width: 2, height: 11 },
      ]
    : [
        { x: layout.jambA.x + 8, y: layout.jambA.y + 3, width: 10, height: 2 },
        { x: layout.jambB.x + 13, y: layout.jambB.y + layout.jambB.height - 5, width: 11, height: 2 },
      ];
  for (const crack of cracks) {
    fill(ctx, palette.accent, crack);
    const core = horizontal
      ? { x: crack.x, y: crack.y + 2, width: 1, height: Math.max(2, crack.height - 4) }
      : { x: crack.x + 2, y: crack.y, width: Math.max(2, crack.width - 4), height: 1 };
    fill(ctx, palette.accentLight, core);
  }
}

function localRect(
  geometry: DoorGeometry,
  bounds: DoorRect,
  u: number,
  v: number,
  width: number,
  height: number,
): DoorRect {
  if (geometry.direction === "up") {
    return { x: bounds.x + u, y: bounds.y + v, width, height };
  }
  if (geometry.direction === "down") {
    return {
      x: bounds.x + u,
      y: bounds.y + bounds.height - v - height,
      width,
      height,
    };
  }
  if (geometry.direction === "left") {
    return { x: bounds.x + v, y: bounds.y + u, width: height, height: width };
  }
  return {
    x: bounds.x + bounds.width - v - height,
    y: bounds.y + u,
    width: height,
    height: width,
  };
}

function drawLocal(
  ctx: CanvasRenderingContext2D,
  geometry: DoorGeometry,
  bounds: DoorRect,
  color: string,
  u: number,
  v: number,
  width: number,
  height: number,
): void {
  fill(ctx, color, localRect(geometry, bounds, u, v, width, height));
}

function getLocalSize(geometry: DoorGeometry, bounds: DoorRect): { length: number; depth: number } {
  const horizontal = geometry.direction === "up" || geometry.direction === "down";
  return horizontal
    ? { length: bounds.width, depth: bounds.height }
    : { length: bounds.height, depth: bounds.width };
}

function drawForestLockedCore(
  ctx: CanvasRenderingContext2D,
  geometry: DoorGeometry,
  lock: DoorRect,
  palette: DoorPalette,
): void {
  const { length, depth } = getLocalSize(geometry, lock);
  fill(ctx, palette.lock, lock);
  for (let u = 4; u <= length - 7; u += 8) {
    drawLocal(ctx, geometry, lock, "#352319", u, 2, 4, depth - 4);
    drawLocal(ctx, geometry, lock, palette.accent, u + 1, 4, 2, depth - 8);
  }
  drawLocal(ctx, geometry, lock, "#2A1C14", 2, Math.floor(depth / 2) - 2, length - 4, 5);
  drawLocal(ctx, geometry, lock, palette.accentLight, 5, 3, 3, 3);
  drawLocal(ctx, geometry, lock, palette.accent, length - 9, depth - 7, 4, 4);
  const cx = Math.floor(length / 2);
  const cy = Math.floor(depth / 2);
  drawLocal(ctx, geometry, lock, "#1C2C21", cx - 5, cy - 5, 10, 10);
  drawLocal(ctx, geometry, lock, palette.lockLight, cx - 3, cy - 3, 6, 6);
  drawLocal(ctx, geometry, lock, "#E9FFD8", cx - 1, cy - 2, 2, 4);
}

function drawDungeonLockedCore(
  ctx: CanvasRenderingContext2D,
  geometry: DoorGeometry,
  lock: DoorRect,
  palette: DoorPalette,
): void {
  const { length, depth } = getLocalSize(geometry, lock);
  fill(ctx, palette.lock, lock);
  for (let u = 4; u <= length - 7; u += 7) {
    drawLocal(ctx, geometry, lock, "#111820", u, 1, 3, depth - 2);
    drawLocal(ctx, geometry, lock, "#7B8993", u + 1, 3, 1, depth - 6);
    drawLocal(ctx, geometry, lock, "#111820", u - 1, depth - 5, 5, 3);
  }
  drawLocal(ctx, geometry, lock, "#0C1118", 2, Math.floor(depth / 2) - 2, length - 4, 5);
  drawLocal(ctx, geometry, lock, "#7B8993", 4, Math.floor(depth / 2) - 1, length - 8, 1);
  const cx = Math.floor(length / 2);
  const cy = Math.floor(depth / 2);
  // Offset chain links preserve the reference entrance's mechanical lock language.
  drawLocal(ctx, geometry, lock, "#0B1016", cx - 13, cy - 6, 7, 4);
  drawLocal(ctx, geometry, lock, "#0B1016", cx - 8, cy - 3, 4, 7);
  drawLocal(ctx, geometry, lock, "#0B1016", cx + 4, cy - 6, 7, 4);
  drawLocal(ctx, geometry, lock, "#0B1016", cx + 2, cy, 4, 7);
  drawLocal(ctx, geometry, lock, "#89969D", cx - 8, cy - 4, 4, 2);
  drawLocal(ctx, geometry, lock, "#89969D", cx + 4, cy + 3, 4, 2);
  drawLocal(ctx, geometry, lock, "#241531", cx - 5, cy - 6, 10, 12);
  drawLocal(ctx, geometry, lock, palette.lockLight, cx - 3, cy - 4, 6, 8);
  drawLocal(ctx, geometry, lock, "#F2D8FF", cx - 1, cy - 2, 2, 4);
}

function drawSnowLockedCore(
  ctx: CanvasRenderingContext2D,
  geometry: DoorGeometry,
  lock: DoorRect,
  palette: DoorPalette,
): void {
  const { length, depth } = getLocalSize(geometry, lock);
  const cx = Math.floor(length / 2);
  const cy = Math.floor(depth / 2);
  fill(ctx, palette.lock, lock);
  drawLocal(ctx, geometry, lock, "#284E5E", 2, 2, cx - 4, depth - 4);
  drawLocal(ctx, geometry, lock, "#719EAA", 4, 4, cx - 7, depth - 8);
  drawLocal(ctx, geometry, lock, "#284E5E", cx + 2, 2, length - cx - 4, depth - 4);
  drawLocal(ctx, geometry, lock, "#719EAA", cx + 4, 4, length - cx - 7, depth - 8);
  drawLocal(ctx, geometry, lock, "#173744", cx - 2, 1, 4, depth - 2);
  drawLocal(ctx, geometry, lock, palette.lockLight, cx - 1, 3, 2, depth - 6);
  drawLocal(ctx, geometry, lock, "#B7D9DF", 5, 3, 2, depth - 6);
  drawLocal(ctx, geometry, lock, "#B7D9DF", length - 7, 3, 2, depth - 6);
  drawLocal(ctx, geometry, lock, "#C94C55", cx - 10, cy - 1, 3, 3);
  drawLocal(ctx, geometry, lock, "#FFD16A", cx + 7, cy, 2, 2);
  drawLocal(ctx, geometry, lock, "#21485A", cx - 6, cy - 6, 12, 12);
  drawLocal(ctx, geometry, lock, palette.lockLight, cx - 4, cy - 4, 8, 8);
  drawLocal(ctx, geometry, lock, "#E8FFFF", cx - 1, cy - 2, 2, 4);
}

function drawLavaLockedCore(
  ctx: CanvasRenderingContext2D,
  geometry: DoorGeometry,
  lock: DoorRect,
  palette: DoorPalette,
): void {
  const { length, depth } = getLocalSize(geometry, lock);
  const cx = Math.floor(length / 2);
  const cy = Math.floor(depth / 2);
  fill(ctx, palette.lock, lock);
  drawLocal(ctx, geometry, lock, "#2A2027", 2, cy - 4, 11, 8);
  drawLocal(ctx, geometry, lock, "#8B8583", 4, cy - 2, 10, 3);
  drawLocal(ctx, geometry, lock, "#2A2027", length - 13, cy - 4, 11, 8);
  drawLocal(ctx, geometry, lock, "#8B8583", length - 14, cy - 2, 10, 3);
  drawLocal(ctx, geometry, lock, palette.accent, 10, cy - 3, 3, 6);
  drawLocal(ctx, geometry, lock, palette.accent, length - 13, cy - 3, 3, 6);
  // Six iris plates converge on the furnace eye without covering the frame.
  drawLocal(ctx, geometry, lock, "#913B2C", cx - 15, 2, 10, 5);
  drawLocal(ctx, geometry, lock, "#913B2C", cx + 5, 2, 10, 5);
  drawLocal(ctx, geometry, lock, "#913B2C", cx - 11, depth - 7, 9, 5);
  drawLocal(ctx, geometry, lock, "#913B2C", cx + 2, depth - 7, 9, 5);
  drawLocal(ctx, geometry, lock, "#6D2B24", cx - 8, cy - 3, 6, 6);
  drawLocal(ctx, geometry, lock, "#6D2B24", cx + 2, cy - 3, 6, 6);
  drawLocal(ctx, geometry, lock, "#5A211C", cx - 6, cy - 6, 12, 12);
  drawLocal(ctx, geometry, lock, palette.lockLight, cx - 4, cy - 4, 8, 8);
  drawLocal(ctx, geometry, lock, "#FFB52C", cx - 2, cy - 3, 4, 6);
  drawLocal(ctx, geometry, lock, "#FFE86E", cx, cy - 1, 1, 2);
}

function drawLockedCore(
  ctx: CanvasRenderingContext2D,
  geometry: DoorGeometry,
  layout: DoorRenderLayout,
  palette: DoorPalette,
  theme: DoorTheme,
): void {
  if (theme === "forest") drawForestLockedCore(ctx, geometry, layout.lockBounds, palette);
  else if (theme === "snow") drawSnowLockedCore(ctx, geometry, layout.lockBounds, palette);
  else if (theme === "lava") drawLavaLockedCore(ctx, geometry, layout.lockBounds, palette);
  else drawDungeonLockedCore(ctx, geometry, layout.lockBounds, palette);
}

export class DoorRenderer {
  public static draw(
    ctx: CanvasRenderingContext2D,
    geometry: DoorGeometry,
    theme: DoorTheme,
    locked: boolean,
  ): void {
    const palette = PALETTES[theme] ?? PALETTES.dungeon;
    const layout = getDoorRenderLayout(geometry);

    ctx.save();
    fill(ctx, palette.voidDeep, layout.aperture);
    fill(ctx, palette.void, inset(layout.aperture, 2));
    fill(ctx, "rgba(0,0,0,0.28)", layout.groundShadow);

    drawBeveledFrame(ctx, layout.jambA, palette);
    drawBeveledFrame(ctx, layout.jambB, palette);
    drawBeveledFrame(ctx, layout.outerLintel, palette);
    fill(ctx, palette.frameDark, layout.innerLip);
    fill(ctx, palette.frameLight, inset(layout.innerLip, 1));

    if (theme === "forest") drawForestDetails(ctx, geometry, layout, palette);
    else if (theme === "snow") drawSnowDetails(ctx, geometry, layout, palette);
    else if (theme === "lava") drawLavaDetails(ctx, geometry, layout, palette);
    else drawDungeonDetails(ctx, geometry, layout, palette);

    if (locked) drawLockedCore(ctx, geometry, layout, palette, theme);
    else {
      const edge = geometry.direction === "up" || geometry.direction === "down"
        ? { x: layout.aperture.x + 5, y: layout.innerLip.y + 1, width: layout.aperture.width - 10, height: 1 }
        : { x: layout.innerLip.x + 1, y: layout.aperture.y + 5, width: 1, height: layout.aperture.height - 10 };
      fill(ctx, palette.accent, edge);
    }
    ctx.restore();
  }
}
