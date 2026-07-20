import type { DoorGeometry, DoorRect } from "../dungeon/DoorGeometry";

export type DoorTheme = "forest" | "dungeon" | "snow" | "lava" | string;

function fill(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function fillRect(ctx: CanvasRenderingContext2D, color: string, rect: DoorRect): void {
  fill(ctx, color, rect.x, rect.y, rect.width, rect.height);
}

// --- Forest Door ---

function drawForestDoor(ctx: CanvasRenderingContext2D, vb: DoorRect, horizontal: boolean, locked: boolean): void {
  const { x, y, width: w, height: h } = vb;

  // Recess
  fill(ctx, locked ? "rgba(51,78,45,0.55)" : "rgba(28,55,38,0.22)", x, y, w, h);

  // Outer frame: thick bark posts
  fill(ctx, "#3E2B20", horizontal ? x : x, horizontal ? y : y, horizontal ? w : 5, horizontal ? 5 : h);
  fill(ctx, "#3E2B20", horizontal ? x : x + w - 5, horizontal ? y + h - 5 : y, horizontal ? w : 5, horizontal ? 5 : h);
  // Heartwood highlight
  fill(ctx, "#6A4B31", horizontal ? x + 1 : x + 1, horizontal ? y + 1 : y + 1, horizontal ? w - 2 : 2, horizontal ? 2 : h - 2);
  fill(ctx, "#6A4B31", horizontal ? x + 1 : x + w - 3, horizontal ? y + h - 3 : y + 1, horizontal ? w - 2 : 2, horizontal ? 2 : h - 2);

  // Inner frame: secondary bark layer
  fill(ctx, "#2A1C14", horizontal ? x + 5 : x + 5, horizontal ? y + 2 : y + 5, horizontal ? w - 10 : 3, horizontal ? 3 : h - 10);
  fill(ctx, "#2A1C14", horizontal ? x + 5 : x + w - 8, horizontal ? y + h - 5 : y + 5, horizontal ? w - 10 : 3, horizontal ? 3 : h - 10);

  // Threshold: root floor strip
  fill(ctx, "#56864B", horizontal ? x + 8 : x + 3, horizontal ? y + h - 4 : y + 8, horizontal ? 10 : 3, horizontal ? 3 : 10);
  fill(ctx, "#56864B", horizontal ? x + w - 18 : x + w - 6, horizontal ? y + 3 : y + h - 18, horizontal ? 10 : 3, horizontal ? 3 : 10);

  if (locked) {
    // Root lattice bars
    fill(ctx, "#29472F", horizontal ? x + 8 : x + 8, horizontal ? y + 5 : y + 8, horizontal ? w - 16 : w - 16, horizontal ? h - 10 : h - 16);
    if (horizontal) {
      for (let i = x + 10; i < x + w - 8; i += 8) {
        fill(ctx, "#29472F", i, y + 5, 3, h - 10);
        fill(ctx, "#81A957", i + 1, y + 7, 1, h - 14);
      }
    } else {
      for (let i = y + 10; i < y + h - 8; i += 8) {
        fill(ctx, "#29472F", x + 5, i, w - 10, 3);
        fill(ctx, "#81A957", x + 7, i + 1, w - 14, 1);
      }
    }
    // Flower lock point
    const cx = x + Math.floor(w / 2);
    const cy = y + Math.floor(h / 2);
    fill(ctx, "#1C2C21", cx - 4, cy - 4, 9, 9);
    fill(ctx, "#E783A5", cx - 2, cy - 2, 5, 5);
    fill(ctx, "#FFE47A", cx, cy, 2, 2);
  } else {
    // Open: root arch with natural light
    if (horizontal) {
      fill(ctx, "#4A3324", x + 8, y + 4, 4, h - 8);
      fill(ctx, "#4A3324", x + w - 12, y + 4, 4, h - 8);
      fill(ctx, "#6F4F32", x + 9, y + 5, 2, h - 10);
      fill(ctx, "#6F4F32", x + w - 11, y + 5, 2, h - 10);
      // Moss on inner posts
      fill(ctx, "#6C9C53", x + 7, y + 6, 3, 4);
      fill(ctx, "#6C9C53", x + w - 10, y + h - 10, 3, 4);
      // Natural light through gaps
      fill(ctx, "#91C96E", x + Math.floor(w / 2) - 3, y + 3, 6, 2);
    } else {
      fill(ctx, "#4A3324", x + 4, y + 8, w - 8, 4);
      fill(ctx, "#4A3324", x + 4, y + h - 12, w - 8, 4);
      fill(ctx, "#6F4F32", x + 5, y + 9, w - 10, 2);
      fill(ctx, "#6F4F32", x + 5, y + h - 11, w - 10, 2);
      fill(ctx, "#6C9C53", x + 6, y + 7, 4, 3);
      fill(ctx, "#6C9C53", x + w - 10, y + h - 10, 4, 3);
      fill(ctx, "#91C96E", x + 3, y + Math.floor(h / 2) - 3, 2, 6);
    }
  }

  // Foreground: vine tendrils overhanging
  fill(ctx, "#56864B", horizontal ? x + 3 : x + 3, horizontal ? y : y + 3, horizontal ? 6 : 3, horizontal ? 3 : 6);
  fill(ctx, "#56864B", horizontal ? x + w - 9 : x + w - 6, horizontal ? y + h - 3 : y + h - 9, horizontal ? 6 : 3, horizontal ? 3 : 6);
  fill(ctx, "#91C96E", horizontal ? x + 4 : x + 3, horizontal ? y : y + 4, horizontal ? 3 : 2, horizontal ? 2 : 3);
}

// --- Dungeon Door ---

function drawDungeonDoor(ctx: CanvasRenderingContext2D, vb: DoorRect, horizontal: boolean, locked: boolean): void {
  const { x, y, width: w, height: h } = vb;

  // Recess
  fill(ctx, locked ? "rgba(22,15,31,0.78)" : "rgba(10,15,24,0.45)", x, y, w, h);

  // Outer frame: layered stone jambs
  fill(ctx, "#111925", horizontal ? x : x, horizontal ? y : y, horizontal ? w : 6, horizontal ? 6 : h);
  fill(ctx, "#111925", horizontal ? x : x + w - 6, horizontal ? y + h - 6 : y, horizontal ? w : 6, horizontal ? 6 : h);
  // Inner stone layer
  fill(ctx, "#3B485C", horizontal ? x + 1 : x + 1, horizontal ? y + 1 : y + 1, horizontal ? w - 2 : 4, horizontal ? 4 : h - 2);
  fill(ctx, "#3B485C", horizontal ? x + 1 : x + w - 5, horizontal ? y + h - 5 : y + 1, horizontal ? w - 2 : 4, horizontal ? 4 : h - 2);

  // Inner frame: iron rivet strips
  if (horizontal) {
    for (let i = x + 5; i < x + w - 7; i += 10) {
      fill(ctx, "#718095", i, y + 1, 5, 2);
      fill(ctx, "#718095", i + 2, y + h - 3, 5, 2);
    }
  } else {
    for (let i = y + 5; i < y + h - 7; i += 10) {
      fill(ctx, "#718095", x + 1, i, 2, 5);
      fill(ctx, "#718095", x + w - 3, i + 2, 2, 5);
    }
  }

  // Threshold
  fill(ctx, "#1A202D", horizontal ? x + 6 : x + 6, horizontal ? y + h - 3 : y + 6, horizontal ? w - 12 : 2, horizontal ? 2 : h - 12);

  if (locked) {
    // Portcullis grid
    const cx = x + Math.floor(w / 2);
    const cy = y + Math.floor(h / 2);
    fill(ctx, "#151C25", horizontal ? x + 6 : x + 6, horizontal ? y + 5 : y + 6, horizontal ? w - 12 : w - 12, horizontal ? h - 10 : h - 12);
    if (horizontal) {
      for (let i = x + 8; i < x + w - 6; i += 7) {
        fill(ctx, "#151C25", i, y + 5, 3, h - 10);
        fill(ctx, "#7B8993", i + 1, y + 6, 1, h - 13);
      }
      fill(ctx, "#151C25", x + 6, cy - 2, w - 12, 4);
      fill(ctx, "#7B8993", x + 7, cy - 1, w - 14, 1);
    } else {
      for (let i = y + 8; i < y + h - 6; i += 7) {
        fill(ctx, "#151C25", x + 5, i, w - 10, 3);
        fill(ctx, "#7B8993", x + 6, i + 1, w - 13, 1);
      }
      fill(ctx, "#151C25", cx - 2, y + 6, 4, h - 12);
      fill(ctx, "#7B8993", cx - 1, y + 7, 1, h - 14);
    }
    // Offset chain links
    fill(ctx, "#111820", horizontal ? cx - 12 : cx - 5, horizontal ? cy - 5 : cy - 12, horizontal ? 7 : 4, horizontal ? 4 : 7);
    fill(ctx, "#111820", horizontal ? cx - 7 : cx - 2, horizontal ? cy - 2 : cy - 7, horizontal ? 4 : 7, horizontal ? 7 : 4);
    fill(ctx, "#111820", horizontal ? cx + 3 : cx - 5, horizontal ? cy - 5 : cy + 3, horizontal ? 7 : 4, horizontal ? 4 : 7);
    fill(ctx, "#111820", horizontal ? cx + 1 : cx - 1, horizontal ? cy - 1 : cy + 1, horizontal ? 4 : 7, horizontal ? 7 : 4);
    fill(ctx, "#89969D", cx - 7, cy - 3, 4, 2);
    fill(ctx, "#89969D", cx + 3, cy + 2, 4, 2);
    // Soul-lock keystone
    fill(ctx, "#241531", cx - 5, cy - 5, 11, 11);
    fill(ctx, "#9E59C8", cx - 3, cy - 3, 7, 7);
    fill(ctx, "#E0B8F2", cx - 1, cy - 2, 3, 4);
  } else {
    // Open: short iron teeth at frame edges
    fill(ctx, "#6D7B85", horizontal ? x + 7 : x + 7, horizontal ? y + 6 : y + 7, horizontal ? 4 : 5, horizontal ? 5 : 4);
    fill(ctx, "#6D7B85", horizontal ? x + w - 11 : x + w - 12, horizontal ? y + h - 11 : y + h - 11, horizontal ? 4 : 5, horizontal ? 5 : 4);
    // Dark passage depth
    fill(ctx, "#080D15", horizontal ? x + 12 : x + 10, horizontal ? y + 8 : y + 12, horizontal ? w - 24 : w - 20, horizontal ? h - 16 : h - 24);
  }

  // Foreground: pointed arch stones
  fill(ctx, "#3B485C", horizontal ? x + 2 : x + 2, horizontal ? y : y + 2, horizontal ? 4 : 3, horizontal ? 3 : 4);
  fill(ctx, "#3B485C", horizontal ? x + w - 6 : x + w - 5, horizontal ? y + h - 3 : y + h - 6, horizontal ? 4 : 3, horizontal ? 3 : 4);
  fill(ctx, "#718095", horizontal ? x + 3 : x + 2, horizontal ? y : y + 3, horizontal ? 2 : 2, horizontal ? 2 : 2);
}

// --- Snow Door ---

function drawSnowDoor(ctx: CanvasRenderingContext2D, vb: DoorRect, horizontal: boolean, locked: boolean): void {
  const { x, y, width: w, height: h } = vb;

  // Recess
  fill(ctx, locked ? "rgba(31,73,91,0.72)" : "rgba(47,92,108,0.28)", x, y, w, h);

  // Outer frame: steel jambs under ice
  fill(ctx, "#294A5B", horizontal ? x : x, horizontal ? y : y, horizontal ? w : 6, horizontal ? 6 : h);
  fill(ctx, "#294A5B", horizontal ? x : x + w - 6, horizontal ? y + h - 6 : y, horizontal ? w : 6, horizontal ? 6 : h);
  // Steel inner
  fill(ctx, "#6F929E", horizontal ? x + 1 : x + 1, horizontal ? y + 1 : y + 1, horizontal ? w - 2 : 4, horizontal ? 4 : h - 2);
  fill(ctx, "#6F929E", horizontal ? x + 1 : x + w - 5, horizontal ? y + h - 5 : y + 1, horizontal ? w - 2 : 4, horizontal ? 4 : h - 2);

  // Snow cap (ice overhang)
  fill(ctx, "#D9E8EB", horizontal ? x + 2 : x, horizontal ? y : y + 2, horizontal ? w - 4 : 2, horizontal ? 2 : h - 4);
  fill(ctx, "#D9E8EB", horizontal ? x + 6 : x + w - 5, horizontal ? y + h - 5 : y + 6, horizontal ? Math.max(2, w - 12) : 1, horizontal ? 1 : Math.max(2, h - 12));

  // Inner frame: frost seam
  fill(ctx, "#173744", horizontal ? x + 6 : x + 6, horizontal ? y + 3 : y + 6, horizontal ? w - 12 : 2, horizontal ? 2 : h - 12);
  fill(ctx, "#173744", horizontal ? x + 6 : x + w - 8, horizontal ? y + h - 5 : y + 6, horizontal ? w - 12 : 2, horizontal ? 2 : h - 12);

  if (locked) {
    // Two-panel airlock
    const cx = x + Math.floor(w / 2);
    const cy = y + Math.floor(h / 2);
    fill(ctx, "#284E5E", horizontal ? x + 7 : x + 7, horizontal ? y + 5 : y + 7, horizontal ? w - 14 : w - 14, horizontal ? h - 10 : h - 14);
    // Left/top panel
    fill(ctx, "#719EAA", horizontal ? x + 9 : x + 9, horizontal ? y + 6 : y + 9, horizontal ? Math.max(3, cx - x - 12) : w - 18, horizontal ? h - 12 : Math.max(3, cy - y - 12));
    // Right/bottom panel
    fill(ctx, "#719EAA", horizontal ? cx + 3 : x + 9, horizontal ? y + 6 : cy + 3, horizontal ? Math.max(3, x + w - cx - 12) : w - 18, horizontal ? h - 12 : Math.max(3, y + h - cy - 12));
    // Pressure seam
    fill(ctx, "#173744", horizontal ? cx - 2 : x + 6, horizontal ? y + 5 : cy - 2, horizontal ? 4 : w - 12, horizontal ? h - 10 : 4);
    fill(ctx, "#55BBC9", horizontal ? cx - 1 : x + 7, horizontal ? y + 6 : cy - 1, horizontal ? 2 : w - 14, horizontal ? h - 12 : 2);
    // Edge highlights
    fill(ctx, "#B7D9DF", horizontal ? x + 10 : x + 9, horizontal ? y + 6 : y + 10, horizontal ? 2 : w - 18, horizontal ? h - 12 : 2);
    fill(ctx, "#B7D9DF", horizontal ? x + w - 12 : x + 9, horizontal ? y + 6 : y + h - 12, horizontal ? 2 : w - 18, horizontal ? h - 12 : 2);
    // Diagonal braces
    fill(ctx, "#365F6F", horizontal ? cx - 8 : cx - 6, horizontal ? cy - 6 : cy - 8, horizontal ? 4 : 3, horizontal ? 3 : 4);
    fill(ctx, "#365F6F", horizontal ? cx + 4 : cx + 3, horizontal ? cy + 3 : cy + 4, horizontal ? 4 : 3, horizontal ? 3 : 4);
    // Status light
    fill(ctx, "#21485A", cx - 5, cy - 5, 11, 11);
    fill(ctx, "#55BBC9", cx - 3, cy - 3, 7, 7);
    fill(ctx, "#E2FFFF", cx - 1, cy - 2, 2, 4);
    // Warning lamps
    fill(ctx, "#C94C55", horizontal ? cx - 10 : cx - 8, horizontal ? cy - 1 : cy - 10, 3, 3);
    fill(ctx, "#C94C55", horizontal ? cx + 8 : cx + 5, horizontal ? cy - 1 : cy + 8, 3, 3);
    fill(ctx, "#FFD16A", horizontal ? cx - 9 : cx - 7, horizontal ? cy : cy - 9, 1, 1);
    fill(ctx, "#FFD16A", horizontal ? cx + 9 : cx + 6, horizontal ? cy : cy + 9, 1, 1);
  } else {
    // Open: retracted insulated pockets
    fill(ctx, "#A9D4DC", horizontal ? x + 8 : x + 7, horizontal ? y + 6 : y + 8, horizontal ? 4 : 6, horizontal ? 6 : 4);
    fill(ctx, "#A9D4DC", horizontal ? x + w - 12 : x + w - 13, horizontal ? y + h - 12 : y + h - 12, horizontal ? 4 : 6, horizontal ? 6 : 4);
    // Frost wedges
    fill(ctx, "#EFFBFC", horizontal ? x + 10 : x + 8, horizontal ? y + 4 : y + 10, horizontal ? 3 : 2, horizontal ? 2 : 3);
    fill(ctx, "#EFFBFC", horizontal ? x + w - 13 : x + w - 10, horizontal ? y + h - 6 : y + h - 13, horizontal ? 3 : 2, horizontal ? 2 : 3);
    // Dark passage
    fill(ctx, "#173440", horizontal ? x + 14 : x + 12, horizontal ? y + 8 : y + 14, horizontal ? w - 28 : w - 24, horizontal ? h - 16 : h - 28);
  }

  // Foreground: ice-cap overhang
  fill(ctx, "#EFFBFC", horizontal ? x + 4 : x, horizontal ? y : y + 4, horizontal ? 8 : 2, horizontal ? 2 : 8);
  fill(ctx, "#EFFBFC", horizontal ? x + w - 12 : x + w - 2, horizontal ? y : y + w - 12, horizontal ? 8 : 2, horizontal ? 2 : 8);
}

// --- Lava Door ---

function drawLavaDoor(ctx: CanvasRenderingContext2D, vb: DoorRect, horizontal: boolean, locked: boolean): void {
  const { x, y, width: w, height: h } = vb;

  // Recess
  fill(ctx, locked ? "rgba(77,29,24,0.76)" : "rgba(42,29,35,0.38)", x, y, w, h);

  // Outer frame: basalt heat-shield
  fill(ctx, "#171219", horizontal ? x : x, horizontal ? y : y, horizontal ? w : 6, horizontal ? 6 : h);
  fill(ctx, "#171219", horizontal ? x : x + w - 6, horizontal ? y + h - 6 : y, horizontal ? w : 6, horizontal ? 6 : h);
  // Inner basalt
  fill(ctx, "#493943", horizontal ? x + 1 : x + 1, horizontal ? y + 1 : y + 1, horizontal ? w - 2 : 4, horizontal ? 4 : h - 2);
  fill(ctx, "#493943", horizontal ? x + 1 : x + w - 5, horizontal ? y + h - 5 : y + 1, horizontal ? w - 2 : 4, horizontal ? 4 : h - 2);

  // Iron rails
  if (horizontal) {
    for (let i = x + 5; i < x + w - 7; i += 10) {
      fill(ctx, "#777E7F", i, y + 1, 5, 2);
      fill(ctx, "#777E7F", i + 2, y + h - 3, 5, 2);
    }
  } else {
    for (let i = y + 5; i < y + h - 7; i += 10) {
      fill(ctx, "#777E7F", x + 1, i, 2, 5);
      fill(ctx, "#777E7F", x + w - 3, i + 2, 2, 5);
    }
  }

  // Threshold
  fill(ctx, "#21181E", horizontal ? x + 6 : x + 6, horizontal ? y + h - 3 : y + 6, horizontal ? w - 12 : 2, horizontal ? 2 : h - 12);

  const cx = x + Math.floor(w / 2);
  const cy = y + Math.floor(h / 2);

  if (locked) {
    // Octagonal furnace ring
    fill(ctx, "#261C22", horizontal ? x + 7 : x + 7, horizontal ? y + 5 : y + 7, horizontal ? w - 14 : w - 14, horizontal ? h - 10 : h - 14);
    fill(ctx, "#5B454C", horizontal ? x + 10 : x + 10, horizontal ? y + 6 : y + 10, horizontal ? w - 20 : w - 20, horizontal ? h - 12 : h - 20);
    // Iris blades
    fill(ctx, "#913B2C", horizontal ? cx - 14 : cx - 12, horizontal ? y + 5 : cy - 14, horizontal ? 9 : 5, horizontal ? 5 : 9);
    fill(ctx, "#913B2C", horizontal ? cx + 5 : cx + 7, horizontal ? y + 5 : cy + 5, horizontal ? 9 : 5, horizontal ? 5 : 9);
    fill(ctx, "#913B2C", horizontal ? cx - 10 : cx + 5, horizontal ? y + h - 10 : cy - 10, horizontal ? 8 : 5, horizontal ? 5 : 8);
    fill(ctx, "#913B2C", horizontal ? cx + 2 : cx - 10, horizontal ? y + h - 10 : cy + 2, horizontal ? 8 : 5, horizontal ? 5 : 8);
    // Blade highlights
    fill(ctx, "#B74A2D", horizontal ? cx - 12 : cx - 10, horizontal ? y + 6 : cy - 12, horizontal ? 5 : 2, horizontal ? 2 : 5);
    fill(ctx, "#B74A2D", horizontal ? cx + 7 : cx + 8, horizontal ? y + 6 : cy + 7, horizontal ? 5 : 2, horizontal ? 2 : 5);
    // Side pistons
    fill(ctx, "#2A2027", horizontal ? x + 5 : cx - 4, horizontal ? cy - 4 : y + 5, horizontal ? 9 : 8, horizontal ? 8 : 9);
    fill(ctx, "#2A2027", horizontal ? x + w - 14 : cx - 4, horizontal ? cy - 4 : y + h - 14, horizontal ? 9 : 8, horizontal ? 8 : 9);
    fill(ctx, "#8B8583", horizontal ? x + 7 : cx - 2, horizontal ? cy - 2 : y + 7, horizontal ? 7 : 3, horizontal ? 3 : 7);
    fill(ctx, "#8B8583", horizontal ? x + w - 12 : cx - 2, horizontal ? cy - 2 : y + h - 12, horizontal ? 7 : 3, horizontal ? 3 : 7);
    fill(ctx, "#D94B1F", horizontal ? x + 11 : cx - 1, horizontal ? cy - 3 : y + 11, horizontal ? 3 : 2, horizontal ? 5 : 3);
    fill(ctx, "#D94B1F", horizontal ? x + w - 10 : cx - 1, horizontal ? cy - 3 : y + h - 10, horizontal ? 3 : 2, horizontal ? 5 : 3);
    // Combustion eye
    fill(ctx, "#5A211C", cx - 6, cy - 6, 12, 12);
    fill(ctx, "#E34F1E", cx - 4, cy - 4, 8, 8);
    fill(ctx, "#FFB52C", cx - 2, cy - 3, 5, 6);
    fill(ctx, "#FFE86E", cx, cy - 1, 2, 3);
    // Rivet dots
    fill(ctx, "#B2A6A1", horizontal ? x + 9 : cx - 1, horizontal ? cy - 1 : y + 9, 2, 2);
    fill(ctx, "#B2A6A1", horizontal ? x + w - 11 : cx - 1, horizontal ? cy - 1 : y + h - 11, 2, 2);
  } else {
    // Open: retracted iris teeth and hydraulic sockets
    fill(ctx, "#8C4A37", horizontal ? x + 8 : x + 7, horizontal ? y + 6 : y + 8, horizontal ? 4 : 6, horizontal ? 6 : 4);
    fill(ctx, "#8C4A37", horizontal ? x + w - 12 : x + w - 13, horizontal ? y + h - 12 : y + h - 12, horizontal ? 4 : 6, horizontal ? 6 : 4);
    // Hydraulic sockets
    fill(ctx, "#2A2027", horizontal ? x + 6 : cx - 3, horizontal ? cy - 3 : y + 6, horizontal ? 6 : 6, horizontal ? 6 : 6);
    fill(ctx, "#2A2027", horizontal ? x + w - 12 : cx - 3, horizontal ? cy - 3 : y + h - 12, horizontal ? 6 : 6, horizontal ? 6 : 6);
    fill(ctx, "#8B8583", horizontal ? x + 7 : cx - 2, horizontal ? cy - 2 : y + 7, horizontal ? 4 : 4, horizontal ? 4 : 4);
    fill(ctx, "#8B8583", horizontal ? x + w - 11 : cx - 2, horizontal ? cy - 2 : y + h - 11, horizontal ? 4 : 4, horizontal ? 4 : 4);
    // Dark passage with furnace glow
    fill(ctx, "#150F13", horizontal ? x + 14 : x + 12, horizontal ? y + 8 : y + 14, horizontal ? w - 28 : w - 24, horizontal ? h - 16 : h - 28);
    fill(ctx, "rgba(227,79,30,0.15)", horizontal ? x + 16 : x + 14, horizontal ? y + 10 : y + 16, horizontal ? w - 32 : w - 28, horizontal ? h - 20 : h - 32);
  }

  // Foreground: piston rods extending beyond frame
  fill(ctx, "#8B8583", horizontal ? x + 2 : x + 2, horizontal ? y + Math.floor(h / 2) - 1 : y + 3, horizontal ? 4 : 2, horizontal ? 2 : 4);
  fill(ctx, "#8B8583", horizontal ? x + w - 6 : x + w - 4, horizontal ? y + Math.floor(h / 2) - 1 : y + h - 7, horizontal ? 4 : 2, horizontal ? 2 : 4);
}

// --- Public API ---

export class DoorRenderer {
  public static draw(
    ctx: CanvasRenderingContext2D,
    geometry: DoorGeometry,
    theme: DoorTheme,
    locked: boolean,
  ): void {
    const vb = geometry.visualBounds;
    const horizontal = geometry.direction === "up" || geometry.direction === "down";

    ctx.save();
    if (theme === "forest") drawForestDoor(ctx, vb, horizontal, locked);
    else if (theme === "snow") drawSnowDoor(ctx, vb, horizontal, locked);
    else if (theme === "lava") drawLavaDoor(ctx, vb, horizontal, locked);
    else drawDungeonDoor(ctx, vb, horizontal, locked);
    ctx.restore();
  }
}
