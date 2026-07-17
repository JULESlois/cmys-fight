import type { Camera2D } from "../world/Camera2D";
import { getWorldLayer, type WorldMapDefinition } from "../world/WorldMap";
import { WorldMapRenderer } from "../world/WorldMapRenderer";
import { HubGroundTile } from "./HubMap";

type MaterialPalette = {
  center: string;
  dark: string;
  light: string;
  wear: readonly [string, string, string];
};

const PALETTES: Record<number, MaterialPalette> = {
  [HubGroundTile.sanctuary]: { center: "#273A2B", dark: "#1A2A20", light: "#38533A", wear: ["#304831", "#213326", "#405C40"] },
  [HubGroundTile.road]: { center: "#595A52", dark: "#3D423F", light: "#747267", wear: ["#4C504B", "#66665E", "#444945"] },
  [HubGroundTile.plaza]: { center: "#777264", dark: "#514F48", light: "#918A76", wear: ["#6B675C", "#847E6C", "#5E5B53"] },
  [HubGroundTile.workshop]: { center: "#584335", dark: "#382A24", light: "#80604A", wear: ["#674B39", "#49362D", "#74543F"] },
  [HubGroundTile.archive]: { center: "#433D52", dark: "#292433", light: "#736783", wear: ["#50475E", "#393344", "#655A72"] },
  [HubGroundTile.observatory]: { center: "#334A57", dark: "#1D3039", light: "#52778A", wear: ["#3C5663", "#29404B", "#466778"] },
  [HubGroundTile.armory]: { center: "#554A41", dark: "#332D2A", light: "#79685B", wear: ["#63564B", "#484039", "#6D5D51"] },
  [HubGroundTile.garden]: { center: "#2E4830", dark: "#1D3021", light: "#466A43", wear: ["#385438", "#263C29", "#416141"] },
  [HubGroundTile.training]: { center: "#746449", dark: "#4E422F", light: "#95805A", wear: ["#806E50", "#66573F", "#887556"] },
  [HubGroundTile.expedition]: { center: "#34303B", dark: "#1E1A25", light: "#5D526C", wear: ["#40394A", "#2B2732", "#50465C"] },
};

const renderer = new WorldMapRenderer();

function tileAt(map: WorldMapDefinition, tiles: number[], x: number, y: number): number {
  if (x < 0 || y < 0 || x >= map.widthTiles || y >= map.heightTiles) return HubGroundTile.sanctuary;
  return tiles[y * map.widthTiles + x] ?? HubGroundTile.sanctuary;
}

function hash(x: number, y: number, salt = 0): number {
  return Math.abs((x * 73856093) ^ (y * 19349663) ^ (salt * 83492791));
}

function blendStrip(
  ctx: CanvasRenderingContext2D,
  direction: "n" | "e" | "s" | "w",
  x: number,
  y: number,
  width: number,
  color: string,
  tileX: number,
  tileY: number,
): void {
  ctx.fillStyle = color;
  if (direction === "n") ctx.fillRect(x, y, 16, width);
  else if (direction === "s") ctx.fillRect(x, y + 16 - width, 16, width);
  else if (direction === "w") ctx.fillRect(x, y, width, 16);
  else ctx.fillRect(x + 16 - width, y, width, 16);

  // A sparse, deterministic second color breaks the fillRect boundary without
  // introducing particles or a repeated checkerboard.
  ctx.fillStyle = "rgba(255,255,255,0.055)";
  for (let i = 0; i < 4; i++) {
    const n = hash(tileX, tileY, i);
    if (direction === "n" || direction === "s") {
      const px = x + 2 + n % 12;
      const py = direction === "n" ? y + (n % Math.max(1, width)) : y + 15 - (n % Math.max(1, width));
      ctx.fillRect(px, py, 2, 1);
    } else {
      const py = y + 2 + n % 12;
      const px = direction === "w" ? x + (n % Math.max(1, width)) : x + 15 - (n % Math.max(1, width));
      ctx.fillRect(px, py, 1, 2);
    }
  }
}

export class HubGroundRenderer {
  public draw(ctx: CanvasRenderingContext2D, map: WorldMapDefinition, camera: Camera2D): void {
    const ground = getWorldLayer(map, "ground");
    if (!ground) return;
    const bounds = renderer.getVisibleTileBounds(map, camera, 2);
    for (let tileY = bounds.startY; tileY <= bounds.endY; tileY++) {
      for (let tileX = bounds.startX; tileX <= bounds.endX; tileX++) {
        this.drawCenter(ctx, map, ground.tiles, tileX, tileY);
      }
    }
    for (let tileY = bounds.startY; tileY <= bounds.endY; tileY++) {
      for (let tileX = bounds.startX; tileX <= bounds.endX; tileX++) {
        this.drawEdgesAndCorners(ctx, map, ground.tiles, tileX, tileY);
      }
    }
  }

  private drawCenter(ctx: CanvasRenderingContext2D, map: WorldMapDefinition, tiles: number[], tileX: number, tileY: number): void {
    const tileId = tileAt(map, tiles, tileX, tileY);
    const palette = PALETTES[tileId] ?? PALETTES[HubGroundTile.sanctuary];
    const x = tileX * map.tileSize;
    const y = tileY * map.tileSize;
    ctx.fillStyle = palette.center;
    ctx.fillRect(x, y, map.tileSize, map.tileSize);

    const variation = hash(tileX, tileY) % 3;
    ctx.fillStyle = palette.wear[variation];
    if (tileId === HubGroundTile.sanctuary || tileId === HubGroundTile.garden) {
      // Organic ground: isolated blades and mottling, never a full grid.
      if (hash(tileX, tileY, 1) % 4 === 0) {
        ctx.fillRect(x + 4 + variation * 3, y + 8, 1, 4);
        ctx.fillRect(x + 5 + variation * 3, y + 6, 1, 6);
      }
    } else if (tileId === HubGroundTile.training) {
      // Sand: broken wear scratches rather than continuous tile seams.
      ctx.fillRect(x + 2 + variation * 2, y + 5, 5, 1);
      if (variation !== 1) ctx.fillRect(x + 9, y + 11, 4, 1);
    } else if (tileId === HubGroundTile.road) {
      // Staggered large paving blocks; joints alternate every row.
      const course = tileY % 2 === 0 ? 3 : 9;
      ctx.fillRect(x + course, y + 8, 7, 1);
      if ((tileX + tileY) % 3 === 0) ctx.fillRect(x + (tileY % 2 ? 2 : 12), y + 2, 1, 6);
    } else if (tileId === HubGroundTile.plaza) {
      // 2x2 slab groups, with only group boundaries emphasized.
      if (tileX % 2 === 0) ctx.fillRect(x, y + 1, 1, 14);
      if (tileY % 2 === 0) ctx.fillRect(x + 1, y, 14, 1);
      ctx.fillStyle = palette.light;
      ctx.fillRect(x + 3, y + 3, 5, 1);
    } else {
      // Artificial district stone: partial, staggered courses only.
      if ((tileX + tileY) % 2 === 0) ctx.fillRect(x + 2, y + 9, 9, 1);
      if (variation === 2) ctx.fillRect(x + 11, y + 4, 1, 5);
    }
  }

  private drawEdgesAndCorners(ctx: CanvasRenderingContext2D, map: WorldMapDefinition, tiles: number[], tileX: number, tileY: number): void {
    const tileId = tileAt(map, tiles, tileX, tileY);
    const x = tileX * map.tileSize;
    const y = tileY * map.tileSize;
    const directions = [
      ["n", 0, -1], ["e", 1, 0], ["s", 0, 1], ["w", -1, 0],
    ] as const;

    // Immediate edge and second-ring edge together form a two-tile transition.
    for (const [direction, dx, dy] of directions) {
      const adjacent = tileAt(map, tiles, tileX + dx, tileY + dy);
      const second = tileAt(map, tiles, tileX + dx * 2, tileY + dy * 2);
      if (adjacent !== tileId) {
        const neighborPalette = PALETTES[adjacent] ?? PALETTES[HubGroundTile.sanctuary];
        blendStrip(ctx, direction, x, y, 7, neighborPalette.dark, tileX, tileY);
        blendStrip(ctx, direction, x, y, 3, neighborPalette.center, tileX, tileY);
      } else if (second !== tileId) {
        const secondPalette = PALETTES[second] ?? PALETTES[HubGroundTile.sanctuary];
        blendStrip(ctx, direction, x, y, 3, secondPalette.dark, tileX, tileY);
      }
    }

    const north = tileAt(map, tiles, tileX, tileY - 1);
    const south = tileAt(map, tiles, tileX, tileY + 1);
    const west = tileAt(map, tiles, tileX - 1, tileY);
    const east = tileAt(map, tiles, tileX + 1, tileY);
    const corners = [
      ["nw", north, west, tileAt(map, tiles, tileX - 1, tileY - 1), x, y],
      ["ne", north, east, tileAt(map, tiles, tileX + 1, tileY - 1), x + 12, y],
      ["sw", south, west, tileAt(map, tiles, tileX - 1, tileY + 1), x, y + 12],
      ["se", south, east, tileAt(map, tiles, tileX + 1, tileY + 1), x + 12, y + 12],
    ] as const;
    for (const [, sideA, sideB, diagonal, cornerX, cornerY] of corners) {
      // Outer corner: both cardinal neighbors are the same foreign material.
      if (sideA === sideB && sideA !== tileId) {
        ctx.fillStyle = (PALETTES[sideA] ?? PALETTES[HubGroundTile.sanctuary]).dark;
        ctx.fillRect(cornerX, cornerY, 4, 4);
      // Inner corner: diagonal material cuts into an otherwise continuous center.
      } else if (sideA === tileId && sideB === tileId && diagonal !== tileId) {
        ctx.fillStyle = (PALETTES[diagonal] ?? PALETTES[HubGroundTile.sanctuary]).dark;
        ctx.fillRect(cornerX + 1, cornerY + 1, 3, 3);
      }
    }
  }
}
