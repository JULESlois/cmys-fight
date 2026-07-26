import type { DoorGeometry, DoorRect } from "../dungeon/DoorGeometry";

export type DoorTheme = "forest" | "dungeon" | "snow" | "lava" | string;

function fill(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

// ============================================================
// TOP DOORS — full facade structures extending into the room
// Ported from reference commit b3fb8a4 start-room chapter entrances
// ============================================================

function drawTopForestDoor(ctx: CanvasRenderingContext2D, vb: DoorRect, locked: boolean): void {
  const cx = vb.x + vb.width / 2;
  const baseY = vb.y + 3;

  fill(ctx, locked ? "rgba(51,78,45,0.55)" : "rgba(28,55,38,0.22)", cx - 20, baseY + 4, 40, 34);

  // Outer bark posts
  fill(ctx, "#273B2C", cx - 21, baseY + 2, 8, 38);
  fill(ctx, "#273B2C", cx + 13, baseY + 2, 8, 38);
  fill(ctx, "#273B2C", cx - 23, baseY, 46, 8);

  // Heartwood inner posts
  fill(ctx, "#5E432D", cx - 19, baseY + 3, 5, 36);
  fill(ctx, "#5E432D", cx + 14, baseY + 3, 5, 36);
  fill(ctx, "#5E432D", cx - 21, baseY + 2, 43, 5);

  // Root canopy over lintel
  fill(ctx, "#769653", cx - 25, baseY - 2, 14, 6);
  fill(ctx, "#769653", cx + 11, baseY - 3, 15, 7);
  fill(ctx, "#769653", cx - 10, baseY - 1, 22, 4);

  // Flowers on canopy
  fill(ctx, "#E783A5", cx - 15, baseY, 3, 3);
  fill(ctx, "#E783A5", cx + 18, baseY - 1, 3, 3);

  if (locked) {
    for (let i = cx - 14; i < cx + 12; i += 8) {
      fill(ctx, "#29472F", i, baseY + 6, 3, 30);
      fill(ctx, "#81A957", i + 1, baseY + 8, 1, 26);
    }
    fill(ctx, "#1C2C21", cx - 4, baseY + 16, 9, 9);
    fill(ctx, "#E783A5", cx - 2, baseY + 18, 5, 5);
    fill(ctx, "#FFE47A", cx, baseY + 20, 2, 2);
  } else {
    fill(ctx, "#4A3324", cx - 16, baseY + 6, 4, 30);
    fill(ctx, "#4A3324", cx + 12, baseY + 6, 4, 30);
    fill(ctx, "#6F4F32", cx - 15, baseY + 7, 2, 28);
    fill(ctx, "#6F4F32", cx + 13, baseY + 7, 2, 28);
    fill(ctx, "#6C9C53", cx - 17, baseY + 8, 3, 4);
    fill(ctx, "#6C9C53", cx + 14, baseY + 28, 3, 4);
    fill(ctx, "#91C96E", cx - 4, baseY + 5, 8, 2);
    fill(ctx, "#142219", cx - 12, baseY + 10, 24, 24);
  }

  fill(ctx, "rgba(0,0,0,0.25)", cx - 23, baseY + 38, 46, 3);
}

function drawTopDungeonDoor(ctx: CanvasRenderingContext2D, vb: DoorRect, locked: boolean): void {
  const cx = vb.x + vb.width / 2;
  const baseY = vb.y + 8;

  fill(ctx, locked ? "rgba(22,15,31,0.78)" : "rgba(10,15,24,0.45)", cx - 18, baseY + 5, 36, 36);

  // Pointed ossuary arch
  fill(ctx, "#0D131D", cx - 24, baseY + 3, 10, 40);
  fill(ctx, "#0D131D", cx + 14, baseY + 3, 10, 40);
  fill(ctx, "#0D131D", cx - 20, baseY - 2, 40, 8);
  fill(ctx, "#0D131D", cx - 15, baseY - 5, 30, 5);
  fill(ctx, "#0D131D", cx - 9, baseY - 8, 18, 4);

  // Inner stone layer
  fill(ctx, "#354258", cx - 21, baseY + 4, 6, 38);
  fill(ctx, "#354258", cx + 15, baseY + 4, 6, 38);
  fill(ctx, "#354258", cx - 17, baseY - 1, 34, 5);
  fill(ctx, "#354258", cx - 11, baseY - 4, 22, 4);
  fill(ctx, "#354258", cx - 5, baseY - 7, 10, 3);

  // Iron edge highlights
  fill(ctx, "#718095", cx - 20, baseY + 5, 2, 30);
  fill(ctx, "#718095", cx + 18, baseY + 5, 2, 30);
  fill(ctx, "#718095", cx - 14, baseY, 28, 2);

  if (locked) {
    for (const bx of [cx - 11, cx - 4, cx + 3, cx + 10]) {
      fill(ctx, "#151D28", bx, baseY + 5, 3, 34);
      fill(ctx, "#151D28", bx - 1, baseY + 36, 5, 3);
    }
    fill(ctx, "#151D28", cx - 14, baseY + 19, 28, 3);
    for (const bx of [cx - 10, cx - 3, cx + 4, cx + 11]) {
      fill(ctx, "#75828C", bx, baseY + 6, 1, 28);
    }
    fill(ctx, "#75828C", cx - 12, baseY + 20, 24, 1);
    // Offset chain links
    fill(ctx, "#0E151E", cx - 15, baseY + 8, 7, 4);
    fill(ctx, "#0E151E", cx - 10, baseY + 11, 4, 7);
    fill(ctx, "#0E151E", cx + 8, baseY + 6, 7, 4);
    fill(ctx, "#0E151E", cx + 6, baseY + 9, 4, 7);
    fill(ctx, "#7B8993", cx - 13, baseY + 9, 3, 1);
    fill(ctx, "#7B8993", cx + 9, baseY + 7, 3, 1);
    // Soul-lock keystone
    fill(ctx, "#1B1326", cx - 5, baseY + 12, 11, 11);
    fill(ctx, "#A25DCC", cx - 3, baseY + 14, 7, 7);
    fill(ctx, "#E1B6F4", cx, baseY + 15, 2, 4);
  } else {
    fill(ctx, "#6D7B85", cx - 16, baseY + 6, 3, 5);
    fill(ctx, "#6D7B85", cx + 13, baseY + 30, 3, 5);
    fill(ctx, "#080D15", cx - 12, baseY + 8, 24, 28);
  }

  fill(ctx, "rgba(0,0,0,0.3)", cx - 24, baseY + 41, 48, 3);
}

function drawTopSnowDoor(ctx: CanvasRenderingContext2D, vb: DoorRect, locked: boolean): void {
  const cx = vb.x + vb.width / 2;
  const baseY = vb.y + 7;

  fill(ctx, locked ? "rgba(31,73,91,0.72)" : "rgba(47,92,108,0.28)", cx - 16, baseY + 5, 32, 36);

  // Steel frame posts
  fill(ctx, "#1B394A", cx - 26, baseY + 5, 12, 36);
  fill(ctx, "#1B394A", cx + 14, baseY + 5, 12, 36);
  fill(ctx, "#1B394A", cx - 21, baseY - 2, 42, 10);
  fill(ctx, "#1B394A", cx - 14, baseY - 6, 28, 6);

  // Inner steel
  fill(ctx, "#5D8392", cx - 23, baseY + 6, 8, 34);
  fill(ctx, "#5D8392", cx + 15, baseY + 6, 8, 34);
  fill(ctx, "#5D8392", cx - 19, baseY - 1, 38, 7);
  fill(ctx, "#5D8392", cx - 11, baseY - 5, 22, 5);

  // Snow/ice caps
  fill(ctx, "#D6E8EB", cx - 24, baseY + 4, 10, 5);
  fill(ctx, "#D6E8EB", cx + 14, baseY + 4, 11, 5);
  fill(ctx, "#D6E8EB", cx - 18, baseY - 3, 36, 4);
  fill(ctx, "#D6E8EB", cx - 11, baseY - 7, 22, 3);

  if (locked) {
    // Two-panel airlock slabs
    fill(ctx, "#274B5A", cx - 14, baseY + 5, 13, 35);
    fill(ctx, "#274B5A", cx + 1, baseY + 5, 13, 35);
    fill(ctx, "#274B5A", cx - 17, baseY + 10, 16, 25);
    fill(ctx, "#274B5A", cx + 1, baseY + 10, 16, 25);
    fill(ctx, "#6F9EAA", cx - 13, baseY + 7, 10, 30);
    fill(ctx, "#6F9EAA", cx + 3, baseY + 7, 10, 30);
    fill(ctx, "#A9CED5", cx - 12, baseY + 8, 2, 27);
    fill(ctx, "#A9CED5", cx + 10, baseY + 8, 2, 27);
    // Pressure seam
    fill(ctx, "#173643", cx - 2, baseY + 6, 4, 33);
    fill(ctx, "#54BBC9", cx - 1, baseY + 8, 2, 29);
    // Diagonal braces
    for (let i = 0; i < 4; i++) {
      fill(ctx, "#365F6F", cx - 11 + i * 2, baseY + 12 + i * 4, 4, 3);
      fill(ctx, "#365F6F", cx + 8 - i * 2, baseY + 12 + i * 4, 4, 3);
    }
    fill(ctx, "#EFFBFC", cx - 16, baseY + 2, 8, 2);
    fill(ctx, "#EFFBFC", cx + 9, baseY + 1, 8, 2);
    fill(ctx, "#EFFBFC", cx - 8, baseY - 2, 16, 2);
    // Warning lamps
    fill(ctx, "#C94C55", cx - 20, baseY + 13, 4, 4);
    fill(ctx, "#C94C55", cx + 16, baseY + 13, 4, 4);
    fill(ctx, "#FFD16A", cx - 19, baseY + 14, 2, 2);
    fill(ctx, "#FFD16A", cx + 17, baseY + 14, 2, 2);
    fill(ctx, "#D8FFFF", cx - 1, baseY + 16, 2, 7);
    // Pressure handles
    fill(ctx, "#173643", cx - 7, baseY + 19, 3, 7);
    fill(ctx, "#173643", cx + 5, baseY + 19, 3, 7);
    fill(ctx, "#A9CED5", cx - 6, baseY + 20, 1, 5);
    fill(ctx, "#A9CED5", cx + 6, baseY + 20, 1, 5);
  } else {
    fill(ctx, "#A9D4DC", cx - 14, baseY + 7, 4, 6);
    fill(ctx, "#A9D4DC", cx + 10, baseY + 28, 4, 6);
    fill(ctx, "#EFFBFC", cx - 12, baseY + 5, 3, 2);
    fill(ctx, "#EFFBFC", cx + 9, baseY + 34, 3, 2);
    fill(ctx, "#173440", cx - 10, baseY + 10, 20, 26);
  }

  fill(ctx, "rgba(0,0,0,0.2)", cx - 26, baseY + 39, 52, 3);
}

function drawTopLavaDoor(ctx: CanvasRenderingContext2D, vb: DoorRect, locked: boolean): void {
  const cx = vb.x + vb.width / 2;
  const baseY = vb.y + 6;

  fill(ctx, locked ? "rgba(77,29,24,0.76)" : "rgba(42,29,35,0.38)", cx - 16, baseY + 5, 32, 36);

  // Basalt frame posts
  fill(ctx, "#120E13", cx - 27, baseY + 6, 13, 35);
  fill(ctx, "#120E13", cx + 14, baseY + 6, 13, 35);
  fill(ctx, "#120E13", cx - 21, baseY - 2, 42, 10);
  fill(ctx, "#120E13", cx - 14, baseY - 6, 28, 6);

  // Inner basalt
  fill(ctx, "#493740", cx - 24, baseY + 7, 9, 33);
  fill(ctx, "#493740", cx + 15, baseY + 7, 9, 33);
  fill(ctx, "#493740", cx - 18, baseY - 1, 36, 7);
  fill(ctx, "#493740", cx - 11, baseY - 5, 22, 5);

  // Iron rail highlights
  fill(ctx, "#767D7F", cx - 22, baseY + 9, 3, 27);
  fill(ctx, "#767D7F", cx + 19, baseY + 9, 3, 27);
  fill(ctx, "#767D7F", cx - 15, baseY, 30, 2);

  if (locked) {
    // Octagonal furnace ring
    fill(ctx, "#21181E", cx - 14, baseY + 5, 28, 36);
    fill(ctx, "#21181E", cx - 18, baseY + 10, 36, 26);
    fill(ctx, "#5C454C", cx - 12, baseY + 7, 24, 32);
    fill(ctx, "#5C454C", cx - 16, baseY + 12, 32, 22);
    fill(ctx, "#2B2026", cx - 9, baseY + 9, 18, 28);
    fill(ctx, "#2B2026", cx - 13, baseY + 14, 26, 18);
    // Six iris blades
    fill(ctx, "#8A3B2B", cx - 10, baseY + 11, 9, 7);
    fill(ctx, "#8A3B2B", cx + 1, baseY + 11, 9, 7);
    fill(ctx, "#8A3B2B", cx - 12, baseY + 18, 10, 7);
    fill(ctx, "#8A3B2B", cx + 2, baseY + 18, 10, 7);
    fill(ctx, "#8A3B2B", cx - 9, baseY + 25, 9, 7);
    fill(ctx, "#8A3B2B", cx, baseY + 25, 9, 7);
    fill(ctx, "#B74A2D", cx - 8, baseY + 12, 5, 2);
    fill(ctx, "#B74A2D", cx + 3, baseY + 12, 5, 2);
    fill(ctx, "#B74A2D", cx - 10, baseY + 20, 5, 2);
    fill(ctx, "#B74A2D", cx + 5, baseY + 20, 5, 2);
    fill(ctx, "#B74A2D", cx - 7, baseY + 28, 5, 2);
    fill(ctx, "#B74A2D", cx + 2, baseY + 28, 5, 2);
    // Combustion eye
    fill(ctx, "#5A211C", cx - 5, baseY + 15, 11, 13);
    fill(ctx, "#E34F1E", cx - 3, baseY + 17, 7, 9);
    fill(ctx, "#FFB52C", cx - 1, baseY + 18, 4, 6);
    fill(ctx, "#FFE86E", cx + 1, baseY + 19, 1, 3);
    // Hydraulic rams
    fill(ctx, "#2A2027", cx - 25, baseY + 15, 10, 8);
    fill(ctx, "#2A2027", cx + 15, baseY + 15, 10, 8);
    fill(ctx, "#8B8583", cx - 23, baseY + 17, 8, 3);
    fill(ctx, "#8B8583", cx + 15, baseY + 17, 8, 3);
    fill(ctx, "#D94B1F", cx - 19, baseY + 16, 3, 5);
    fill(ctx, "#D94B1F", cx + 16, baseY + 16, 3, 5);
    // Rivet dots
    fill(ctx, "#B6AAA5", cx - 13, baseY + 8, 2, 2);
    fill(ctx, "#B6AAA5", cx + 11, baseY + 8, 2, 2);
    fill(ctx, "#B6AAA5", cx - 15, baseY + 30, 2, 2);
    fill(ctx, "#B6AAA5", cx + 13, baseY + 30, 2, 2);
  } else {
    fill(ctx, "#8C4A37", cx - 14, baseY + 7, 3, 6);
    fill(ctx, "#8C4A37", cx + 11, baseY + 28, 3, 6);
    fill(ctx, "#2A2027", cx - 22, baseY + 15, 6, 6);
    fill(ctx, "#2A2027", cx + 16, baseY + 15, 6, 6);
    fill(ctx, "#8B8583", cx - 21, baseY + 16, 4, 4);
    fill(ctx, "#8B8583", cx + 17, baseY + 16, 4, 4);
    fill(ctx, "#150F13", cx - 10, baseY + 10, 20, 26);
    fill(ctx, "rgba(227,79,30,0.15)", cx - 8, baseY + 12, 16, 22);
  }

  fill(ctx, "rgba(0,0,0,0.3)", cx - 27, baseY + 39, 54, 3);
}

// ============================================================
// BOTTOM DOORS — low structures embedded in the foreground wall
// All content stays within y=224..240 (16px wall tile)
// visualBounds: { x: 120, y: 224, width: 80, height: 16 }
// ============================================================

function drawBottomForestDoor(ctx: CanvasRenderingContext2D, vb: DoorRect, locked: boolean): void {
  const { x, y, width: w, height: h } = vb;
  const cx = x + w / 2;

  fill(ctx, locked ? "rgba(51,78,45,0.55)" : "rgba(28,55,38,0.3)", x + 4, y + 2, w - 8, h - 4);
  fill(ctx, "#3E2B20", x + 2, y, 4, h);
  fill(ctx, "#3E2B20", x + w - 6, y, 4, h);
  fill(ctx, "#6A4B31", x + 3, y + 1, 2, h - 2);
  fill(ctx, "#6A4B31", x + w - 5, y + 1, 2, h - 2);
  fill(ctx, "#56864B", x + 8, y, 6, 2);
  fill(ctx, "#56864B", x + w - 14, y, 6, 2);

  if (locked) {
    for (let i = x + 10; i < x + w - 10; i += 8) {
      fill(ctx, "#29472F", i, y + 3, 3, h - 6);
      fill(ctx, "#81A957", i + 1, y + 4, 1, h - 8);
    }
    fill(ctx, "#E783A5", cx - 1, y + 6, 3, 3);
    fill(ctx, "#FFE47A", cx, y + 7, 1, 1);
  } else {
    fill(ctx, "#142219", x + 10, y + 3, w - 20, h - 6);
    fill(ctx, "#6C9C53", x + 7, y + 2, 3, 3);
    fill(ctx, "#6C9C53", x + w - 10, y + h - 5, 3, 3);
  }
}

function drawBottomDungeonDoor(ctx: CanvasRenderingContext2D, vb: DoorRect, locked: boolean): void {
  const { x, y, width: w, height: h } = vb;
  const cx = x + w / 2;

  fill(ctx, locked ? "rgba(22,15,31,0.78)" : "rgba(10,15,24,0.45)", x + 4, y + 2, w - 8, h - 4);
  fill(ctx, "#111925", x + 2, y, 5, h);
  fill(ctx, "#111925", x + w - 7, y, 5, h);
  fill(ctx, "#3B485C", x + 3, y + 1, 3, h - 2);
  fill(ctx, "#3B485C", x + w - 6, y + 1, 3, h - 2);
  fill(ctx, "#718095", x + 4, y + 2, 2, 2);
  fill(ctx, "#718095", x + w - 6, y + h - 4, 2, 2);

  if (locked) {
    for (let i = x + 10; i < x + w - 10; i += 7) {
      fill(ctx, "#151C25", i, y + 3, 3, h - 6);
      fill(ctx, "#7B8993", i + 1, y + 4, 1, h - 8);
    }
    fill(ctx, "#151C25", x + 8, y + 7, w - 16, 2);
    fill(ctx, "#241531", cx - 4, y + 4, 8, 8);
    fill(ctx, "#9E59C8", cx - 2, y + 5, 5, 5);
    fill(ctx, "#E0B8F2", cx, y + 6, 2, 3);
  } else {
    fill(ctx, "#080D15", x + 10, y + 3, w - 20, h - 6);
    fill(ctx, "#6D7B85", x + 7, y + 2, 3, 3);
    fill(ctx, "#6D7B85", x + w - 10, y + h - 5, 3, 3);
  }
}

function drawBottomSnowDoor(ctx: CanvasRenderingContext2D, vb: DoorRect, locked: boolean): void {
  const { x, y, width: w, height: h } = vb;
  const cx = x + w / 2;

  fill(ctx, locked ? "rgba(31,73,91,0.72)" : "rgba(47,92,108,0.28)", x + 4, y + 2, w - 8, h - 4);
  fill(ctx, "#294A5B", x + 2, y, 5, h);
  fill(ctx, "#294A5B", x + w - 7, y, 5, h);
  fill(ctx, "#6F929E", x + 3, y + 1, 3, h - 2);
  fill(ctx, "#6F929E", x + w - 6, y + 1, 3, h - 2);
  fill(ctx, "#D9E8EB", x + 8, y, w - 16, 2);

  if (locked) {
    fill(ctx, "#284E5E", x + 9, y + 3, cx - x - 11, h - 6);
    fill(ctx, "#284E5E", cx + 2, y + 3, x + w - 11 - cx, h - 6);
    fill(ctx, "#719EAA", x + 10, y + 4, cx - x - 13, h - 8);
    fill(ctx, "#719EAA", cx + 3, y + 4, x + w - 14 - cx, h - 8);
    fill(ctx, "#173643", cx - 2, y + 3, 4, h - 6);
    fill(ctx, "#55BBC9", cx - 1, y + 4, 2, h - 8);
    fill(ctx, "#C94C55", cx - 8, y + 6, 3, 3);
    fill(ctx, "#C94C55", cx + 5, y + 6, 3, 3);
  } else {
    fill(ctx, "#173440", x + 10, y + 3, w - 20, h - 6);
    fill(ctx, "#A9D4DC", x + 7, y + 2, 3, 4);
    fill(ctx, "#A9D4DC", x + w - 10, y + h - 6, 3, 4);
  }
}

function drawBottomLavaDoor(ctx: CanvasRenderingContext2D, vb: DoorRect, locked: boolean): void {
  const { x, y, width: w, height: h } = vb;
  const cx = x + w / 2;

  fill(ctx, locked ? "rgba(77,29,24,0.76)" : "rgba(42,29,35,0.38)", x + 4, y + 2, w - 8, h - 4);
  fill(ctx, "#171219", x + 2, y, 5, h);
  fill(ctx, "#171219", x + w - 7, y, 5, h);
  fill(ctx, "#493943", x + 3, y + 1, 3, h - 2);
  fill(ctx, "#493943", x + w - 6, y + 1, 3, h - 2);
  fill(ctx, "#777E7F", x + 4, y + 2, 2, 2);
  fill(ctx, "#777E7F", x + w - 6, y + h - 4, 2, 2);

  if (locked) {
    fill(ctx, "#261C22", x + 9, y + 3, w - 18, h - 6);
    fill(ctx, "#5B454C", x + 11, y + 4, w - 22, h - 8);
    fill(ctx, "#913B2C", cx - 8, y + 3, 6, 4);
    fill(ctx, "#913B2C", cx + 2, y + 3, 6, 4);
    fill(ctx, "#913B2C", cx - 6, y + h - 7, 5, 4);
    fill(ctx, "#913B2C", cx + 1, y + h - 7, 5, 4);
    fill(ctx, "#5A211C", cx - 4, y + 4, 8, 8);
    fill(ctx, "#E34F1E", cx - 2, y + 5, 5, 5);
    fill(ctx, "#FFB52C", cx, y + 6, 2, 3);
  } else {
    fill(ctx, "#150F13", x + 10, y + 3, w - 20, h - 6);
    fill(ctx, "rgba(227,79,30,0.15)", x + 12, y + 4, w - 24, h - 8);
    fill(ctx, "#8C4A37", x + 7, y + 2, 3, 4);
    fill(ctx, "#8C4A37", x + w - 10, y + h - 6, 3, 4);
  }
}

// ============================================================
// SIDE DOORS — narrow wall-thickness models, mirrored for L/R
// visualBounds: 16w x 64h (left: x=0..16, right: x=304..320)
// ============================================================

type SideDoorSide = "left" | "right";

// Mirror-aware placement: px(offset, width) returns the draw x for a rect
// whose near (wall-outer) edge sits `offset` px from the door's outer edge.
// Rects always stay inside [vb.x, vb.x + vb.width] as long as offset+width <= vb.width.
function makeSidePx(vb: DoorRect, mirror: boolean): (offset: number, width: number) => number {
  return (offset, width) => mirror ? vb.x + vb.width - offset - width : vb.x + offset;
}

function drawSideJunction(ctx: CanvasRenderingContext2D, vb: DoorRect, mirror: boolean): void {
  const px = makeSidePx(vb, mirror);
  fill(ctx, "rgba(255,255,255,0.08)", px(1, 1), vb.y + 5, 1, vb.height - 10);
  fill(ctx, "rgba(0,0,0,0.2)", px(vb.width - 1, 1), vb.y + 5, 1, vb.height - 10);
}

// Forest side door: living bark jambs, a vine winding down the frame, pink blossoms.
function drawSideForestDoor(ctx: CanvasRenderingContext2D, vb: DoorRect, locked: boolean, side: SideDoorSide): void {
  const { x, y, width: w, height: h } = vb;
  const cy = y + h / 2;
  const mirror = side === "right";
  const px = makeSidePx(vb, mirror);

  fill(ctx, locked ? "rgba(51,78,45,0.5)" : "rgba(28,55,38,0.25)", x + 2, cy - 16, w - 4, 32);

  // Bark frame caps with heartwood core
  fill(ctx, "#3E2B20", x, y, w, 5);
  fill(ctx, "#3E2B20", x, y + h - 5, w, 5);
  fill(ctx, "#6A4B31", x + 1, y + 1, w - 2, 3);
  fill(ctx, "#6A4B31", x + 1, y + h - 4, w - 2, 3);

  // Leaf canopy tufts spilling over the caps
  fill(ctx, "#56864B", px(1, 6), y + 4, 6, 3);
  fill(ctx, "#56864B", px(8, 5), y + h - 8, 5, 3);

  if (locked) {
    // Woven living-vine lattice sealing the passage
    for (let i = cy - 12; i < cy + 10; i += 8) {
      fill(ctx, "#29472F", x + 3, i, w - 6, 3);
      fill(ctx, "#81A957", x + 4, i + 1, w - 8, 1);
    }
    // Blossom seal at the heart of the lattice
    fill(ctx, "#1C2C21", px(4, 8), cy - 4, 8, 8);
    fill(ctx, "#E783A5", px(6, 4), cy - 2, 4, 4);
    fill(ctx, "#FFE47A", px(7, 2), cy - 1, 2, 2);
  } else {
    fill(ctx, "#142219", x + 4, cy - 14, w - 8, 28);
    // Moss tufts on the open jamb
    fill(ctx, "#6C9C53", px(3, 3), cy - 13, 3, 3);
    fill(ctx, "#6C9C53", px(10, 3), cy + 10, 3, 3);
  }

  // Vine snaking down the jamb (drawn over frame and door)
  fill(ctx, "#3E5C34", px(3, 2), y + 6, 2, 9);
  fill(ctx, "#3E5C34", px(6, 2), y + 13, 2, 9);
  fill(ctx, "#3E5C34", px(9, 2), y + h - 22, 2, 9);
  fill(ctx, "#3E5C34", px(5, 2), y + h - 15, 2, 9);
  fill(ctx, "#81A957", px(2, 2), y + 10, 2, 2);
  fill(ctx, "#81A957", px(11, 2), y + h - 18, 2, 2);

  // Pink blossoms dotting the vine
  fill(ctx, "#E783A5", px(6, 3), y + 8, 3, 3);
  fill(ctx, "#E783A5", px(3, 3), y + h - 12, 3, 3);
  fill(ctx, "#FFE47A", px(7, 1), y + 9, 1, 1);
  fill(ctx, "#FFE47A", px(4, 1), y + h - 11, 1, 1);

  drawSideJunction(ctx, vb, mirror);
}

// Dungeon side door: stone jambs, purple soul-fire sconces, iron portcullis bars when locked.
function drawSideDungeonDoor(ctx: CanvasRenderingContext2D, vb: DoorRect, locked: boolean, side: SideDoorSide): void {
  const { x, y, width: w, height: h } = vb;
  const cy = y + h / 2;
  const mirror = side === "right";
  const px = makeSidePx(vb, mirror);

  fill(ctx, locked ? "rgba(22,15,31,0.7)" : "rgba(10,15,24,0.4)", x + 2, cy - 16, w - 4, 32);

  // Stone frame caps with iron edge
  fill(ctx, "#111925", x, y, w, 5);
  fill(ctx, "#111925", x, y + h - 5, w, 5);
  fill(ctx, "#3B485C", x + 1, y + 1, w - 2, 3);
  fill(ctx, "#3B485C", x + 1, y + h - 4, w - 2, 3);
  fill(ctx, "#718095", px(2, 3), y + 2, 3, 1);
  fill(ctx, "#718095", px(2, 3), y + h - 3, 3, 1);

  // Soul-fire sconces above and below the passage
  for (const sy of [y + 8, y + h - 15]) {
    fill(ctx, "#241531", px(5, 5), sy, 5, 6);
    fill(ctx, "#9E59C8", px(6, 3), sy + 1, 3, 4);
    fill(ctx, "#E0B8F2", px(7, 1), sy + 2, 1, 2);
  }

  if (locked) {
    // Portcullis: iron bars across the passage
    for (let i = cy - 12; i < cy + 10; i += 7) {
      fill(ctx, "#151C25", x + 3, i, w - 6, 3);
      fill(ctx, "#7B8993", x + 4, i + 1, w - 9, 1);
    }
    // Vertical spine and chain links
    fill(ctx, "#151C25", px(7, 2), cy - 14, 2, 28);
    fill(ctx, "#0E151E", px(3, 4), cy - 16, 4, 3);
    fill(ctx, "#0E151E", px(9, 4), cy + 13, 4, 3);
    // Soul-lock keystone
    fill(ctx, "#241531", px(5, 6), cy - 3, 6, 6);
    fill(ctx, "#A25DCC", px(6, 4), cy - 2, 4, 4);
    fill(ctx, "#E0B8F2", px(7, 2), cy - 1, 2, 2);
  } else {
    fill(ctx, "#080D15", x + 4, cy - 14, w - 8, 28);
    // Hinge plates
    fill(ctx, "#6D7B85", px(3, 3), cy - 13, 3, 3);
    fill(ctx, "#6D7B85", px(3, 3), cy + 10, 3, 3);
  }

  drawSideJunction(ctx, vb, mirror);
}

// Snow side door: steel jambs under snow, icicles hanging from the lintel, frosted faces.
function drawSideSnowDoor(ctx: CanvasRenderingContext2D, vb: DoorRect, locked: boolean, side: SideDoorSide): void {
  const { x, y, width: w, height: h } = vb;
  const cy = y + h / 2;
  const mirror = side === "right";
  const px = makeSidePx(vb, mirror);

  fill(ctx, locked ? "rgba(31,73,91,0.65)" : "rgba(47,92,108,0.25)", x + 2, cy - 16, w - 4, 32);

  // Steel frame caps
  fill(ctx, "#294A5B", x, y, w, 5);
  fill(ctx, "#294A5B", x, y + h - 5, w, 5);
  fill(ctx, "#6F929E", x + 1, y + 1, w - 2, 3);
  fill(ctx, "#6F929E", x + 1, y + h - 4, w - 2, 3);

  // Snow drift on the top cap, thin drift below
  fill(ctx, "#D9E8EB", x + 1, y, w - 2, 2);
  fill(ctx, "#D9E8EB", px(6, 8), y + h - 5, 8, 2);

  // Icicles hanging from the top cap (varying lengths)
  fill(ctx, "#A9D4DC", px(3, 2), y + 5, 2, 8);
  fill(ctx, "#A9D4DC", px(7, 2), y + 5, 2, 5);
  fill(ctx, "#A9D4DC", px(11, 2), y + 5, 2, 10);
  fill(ctx, "#EFFBFC", px(3, 1), y + 5, 1, 6);
  fill(ctx, "#EFFBFC", px(11, 1), y + 5, 1, 8);

  // Frost patches creeping along the jamb
  fill(ctx, "#EFFBFC", px(2, 3), cy + 14, 3, 2);
  fill(ctx, "#EFFBFC", px(10, 3), y + h - 9, 3, 2);

  if (locked) {
    // Airlock slabs sliding from top and bottom, meeting at a glowing pressure seam
    fill(ctx, "#284E5E", x + 3, cy - 14, w - 6, 13);
    fill(ctx, "#719EAA", x + 4, cy - 13, w - 8, 10);
    fill(ctx, "#284E5E", x + 3, cy + 1, w - 6, 13);
    fill(ctx, "#719EAA", x + 4, cy + 3, w - 8, 10);
    fill(ctx, "#173643", x + 3, cy - 2, w - 6, 4);
    fill(ctx, "#55BBC9", x + 4, cy - 1, w - 8, 2);
    // Warning lamps
    fill(ctx, "#C94C55", px(4, 3), cy - 11, 3, 3);
    fill(ctx, "#C94C55", px(9, 3), cy + 8, 3, 3);
    fill(ctx, "#FFD16A", px(5, 1), cy - 10, 1, 1);
    fill(ctx, "#FFD16A", px(10, 1), cy + 9, 1, 1);
  } else {
    fill(ctx, "#173440", x + 4, cy - 14, w - 8, 28);
    // Frost rim inside the open passage
    fill(ctx, "#A9D4DC", px(4, 2), cy - 14, 2, 4);
    fill(ctx, "#A9D4DC", px(4, 2), cy + 10, 2, 4);
  }

  drawSideJunction(ctx, vb, mirror);
}

// Lava side door: riveted iron plates over basalt, a molten seam glowing down the jamb.
function drawSideLavaDoor(ctx: CanvasRenderingContext2D, vb: DoorRect, locked: boolean, side: SideDoorSide): void {
  const { x, y, width: w, height: h } = vb;
  const cy = y + h / 2;
  const mirror = side === "right";
  const px = makeSidePx(vb, mirror);

  fill(ctx, locked ? "rgba(77,29,24,0.7)" : "rgba(42,29,35,0.35)", x + 2, cy - 16, w - 4, 32);

  // Basalt frame caps with iron banding
  fill(ctx, "#171219", x, y, w, 5);
  fill(ctx, "#171219", x, y + h - 5, w, 5);
  fill(ctx, "#493943", x + 1, y + 1, w - 2, 3);
  fill(ctx, "#493943", x + 1, y + h - 4, w - 2, 3);

  // Rivet dots on the caps
  fill(ctx, "#B6AAA5", px(2, 2), y + 2, 2, 2);
  fill(ctx, "#B6AAA5", px(11, 2), y + 2, 2, 2);
  fill(ctx, "#B6AAA5", px(2, 2), y + h - 4, 2, 2);
  fill(ctx, "#B6AAA5", px(11, 2), y + h - 4, 2, 2);

  // Molten seam running down the jamb
  fill(ctx, "#5A211C", px(3, 2), y + 6, 2, h - 12);
  fill(ctx, "#E34F1E", px(3, 1), y + 9, 1, 8);
  fill(ctx, "#E34F1E", px(4, 1), y + h - 20, 1, 9);
  fill(ctx, "#FFB52C", px(3, 1), y + 12, 1, 3);

  if (locked) {
    // Stacked riveted iron plates
    fill(ctx, "#261C22", x + 3, cy - 14, w - 6, 28);
    fill(ctx, "#5B454C", x + 4, cy - 13, w - 8, 12);
    fill(ctx, "#5B454C", x + 4, cy + 1, w - 8, 12);
    fill(ctx, "#8B8583", px(5, 2), cy - 12, 2, 2);
    fill(ctx, "#8B8583", px(10, 2), cy - 12, 2, 2);
    fill(ctx, "#8B8583", px(5, 2), cy + 10, 2, 2);
    fill(ctx, "#8B8583", px(10, 2), cy + 10, 2, 2);
    // Furnace eye glowing between the plates
    fill(ctx, "#5A211C", px(5, 6), cy - 3, 6, 6);
    fill(ctx, "#E34F1E", px(6, 4), cy - 2, 4, 4);
    fill(ctx, "#FFB52C", px(7, 2), cy - 1, 2, 2);
  } else {
    fill(ctx, "#150F13", x + 4, cy - 14, w - 8, 28);
    fill(ctx, "rgba(227,79,30,0.15)", x + 5, cy - 12, w - 10, 24);
    // Ember-scorched jamb blocks
    fill(ctx, "#8C4A37", px(3, 3), cy - 13, 3, 4);
    fill(ctx, "#8C4A37", px(10, 3), cy + 9, 3, 4);
  }

  drawSideJunction(ctx, vb, mirror);
}

// Sealed-library side door: archive stone with glowing runes, arcane seal when locked.
function drawSideLibraryDoor(ctx: CanvasRenderingContext2D, vb: DoorRect, locked: boolean, side: SideDoorSide): void {
  const { x, y, width: w, height: h } = vb;
  const cy = y + h / 2;
  const mirror = side === "right";
  const px = makeSidePx(vb, mirror);

  fill(ctx, locked ? "rgba(42,30,64,0.7)" : "rgba(30,22,48,0.22)", x + 2, cy - 16, w - 4, 32);

  // Archive stone caps with shelf relief
  fill(ctx, "#181422", x, y, w, 5);
  fill(ctx, "#181422", x, y + h - 5, w, 5);
  fill(ctx, "#2F2540", x + 1, y + 1, w - 2, 3);
  fill(ctx, "#2F2540", x + 1, y + h - 4, w - 2, 3);
  fill(ctx, "#44345E", x + 3, y + 2, w - 6, 1);
  fill(ctx, "#44345E", x + 3, y + h - 3, w - 6, 1);

  // Runes on the jamb
  fill(ctx, "#782A9C", px(3, 4), y + 9, 4, 2);
  fill(ctx, "#9B4EE0", px(4, 2), y + 10, 2, 4);
  fill(ctx, "#782A9C", px(8, 4), y + h - 13, 4, 2);
  fill(ctx, "#9B4EE0", px(9, 2), y + h - 12, 2, 4);

  if (locked) {
    fill(ctx, "#4B326D", x + 3, cy - 14, w - 6, 28);
    fill(ctx, "#291544", x + 4, cy - 12, w - 8, 24);
    // Glowing arcane seal
    fill(ctx, "#AF46FF", px(5, 6), cy - 3, 6, 6);
    fill(ctx, "#E0A8FF", px(7, 2), cy - 1, 2, 2);
  } else {
    fill(ctx, "#0E0A17", x + 4, cy - 14, w - 8, 28);
    fill(ctx, "#362852", px(4, 2), cy - 13, 2, 4);
    fill(ctx, "#362852", px(4, 2), cy + 9, 2, 4);
  }

  drawSideJunction(ctx, vb, mirror);
}

// Forge-core side door: black vault metal, hazard stripes, red heat rails.
function drawSideForgeCoreDoor(ctx: CanvasRenderingContext2D, vb: DoorRect, locked: boolean, side: SideDoorSide): void {
  const { x, y, width: w, height: h } = vb;
  const cy = y + h / 2;
  const mirror = side === "right";
  const px = makeSidePx(vb, mirror);

  fill(ctx, locked ? "rgba(74,20,10,0.6)" : "rgba(35,10,5,0.2)", x + 2, cy - 16, w - 4, 32);

  // Vault metal caps with hazard stripes
  fill(ctx, "#100604", x, y, w, 5);
  fill(ctx, "#100604", x, y + h - 5, w, 5);
  for (let i = 0; i < 2; i++) {
    fill(ctx, "#260D0A", x + 1 + i * 8, y + 1, 4, 3);
    fill(ctx, "#D99311", x + 5 + i * 8, y + 1, 4, 3);
    fill(ctx, "#260D0A", x + 1 + i * 8, y + h - 4, 4, 3);
    fill(ctx, "#D99311", x + 5 + i * 8, y + h - 4, 4, 3);
  }

  // Vent slits on the jamb
  fill(ctx, "#3D130E", px(3, 2), y + 8, 2, 12);
  fill(ctx, "#3D130E", px(11, 2), y + h - 20, 2, 12);

  if (locked) {
    fill(ctx, "#290A06", x + 3, cy - 14, w - 6, 28);
    fill(ctx, "#1A0604", x + 4, cy - 12, w - 8, 24);
    // Valve wheel glowing with core heat
    fill(ctx, "#5E180E", px(4, 8), cy - 4, 8, 8);
    fill(ctx, "#FF4000", px(5, 6), cy - 3, 6, 6);
    fill(ctx, "#942516", px(7, 2), cy - 6, 2, 12);
    fill(ctx, "#942516", px(3, 10), cy - 1, 10, 2);
    fill(ctx, "#FF8800", px(7, 2), cy - 1, 2, 2);
  } else {
    fill(ctx, "#050100", x + 4, cy - 14, w - 8, 28);
    // Red heat rails framing the open passage
    fill(ctx, "#FF2200", px(4, 1), cy - 12, 1, 24);
    fill(ctx, "#FF2200", px(11, 1), cy - 12, 1, 24);
  }

  drawSideJunction(ctx, vb, mirror);
}

// ============================================================
// PUBLIC API
// ============================================================

// ============================================================
// UNIQUE WORLD NODE DOORS
// ============================================================

function drawTopLibraryDoor(ctx: CanvasRenderingContext2D, vb: DoorRect, locked: boolean): void {
  const cx = vb.x + vb.width / 2;
  const baseY = vb.y + 3;

  fill(ctx, locked ? "rgba(42,30,64,0.7)" : "rgba(30,22,48,0.22)", cx - 20, baseY + 4, 40, 34);

  // Outer stone archive pillars
  fill(ctx, "#181422", cx - 21, baseY + 2, 10, 38);
  fill(ctx, "#181422", cx + 11, baseY + 2, 10, 38);
  fill(ctx, "#181422", cx - 23, baseY, 46, 8);

  // Magic purple runes on the pillars
  fill(ctx, "#782A9C", cx - 18, baseY + 10, 4, 2);
  fill(ctx, "#9B4EE0", cx - 17, baseY + 11, 2, 4);
  fill(ctx, "#782A9C", cx + 14, baseY + 24, 4, 2);
  fill(ctx, "#9B4EE0", cx + 15, baseY + 25, 2, 4);

  // Lintel book/scroll reliefs
  fill(ctx, "#2F2540", cx - 12, baseY + 2, 24, 4);
  fill(ctx, "#44345E", cx - 8, baseY + 3, 16, 2);

  if (locked) {
    fill(ctx, "#4B326D", cx - 14, baseY + 8, 28, 28);
    fill(ctx, "#291544", cx - 12, baseY + 10, 24, 24);
    // Glowing seal
    fill(ctx, "#AF46FF", cx - 4, baseY + 18, 8, 8);
    fill(ctx, "#E0A8FF", cx - 2, baseY + 20, 4, 4);
  } else {
    fill(ctx, "#221932", cx - 16, baseY + 6, 6, 30);
    fill(ctx, "#221932", cx + 10, baseY + 6, 6, 30);
    fill(ctx, "#362852", cx - 14, baseY + 7, 2, 28);
    fill(ctx, "#362852", cx + 12, baseY + 7, 2, 28);
    fill(ctx, "#0E0A17", cx - 10, baseY + 10, 20, 24);
  }

  fill(ctx, "rgba(0,0,0,0.4)", cx - 23, baseY + 38, 46, 3);
}

function drawTopForgeCoreDoor(ctx: CanvasRenderingContext2D, vb: DoorRect, locked: boolean): void {
  const cx = vb.x + vb.width / 2;
  const baseY = vb.y + 3;

  fill(ctx, locked ? "rgba(74,20,10,0.6)" : "rgba(35,10,5,0.2)", cx - 20, baseY + 4, 40, 34);

  // Heavy metal vault posts
  fill(ctx, "#100604", cx - 24, baseY + 2, 14, 38);
  fill(ctx, "#100604", cx + 10, baseY + 2, 14, 38);
  fill(ctx, "#180907", cx - 26, baseY, 52, 12);

  // Rivets and orange vents
  fill(ctx, "#3D130E", cx - 18, baseY + 12, 2, 24);
  fill(ctx, "#3D130E", cx + 16, baseY + 12, 2, 24);
  
  if (Math.floor(Date.now() / 200) % 3 === 0) {
    fill(ctx, "#FF5500", cx - 21, baseY + 20, 4, 2);
    fill(ctx, "#FF5500", cx + 17, baseY + 20, 4, 2);
  }

  // Warning stripes on lintel
  for (let i = cx - 20; i < cx + 16; i += 8) {
    fill(ctx, "#260D0A", i, baseY + 2, 4, 8);
    fill(ctx, "#D99311", i + 4, baseY + 2, 4, 8);
  }

  if (locked) {
    fill(ctx, "#290A06", cx - 14, baseY + 12, 28, 28);
    fill(ctx, "#1A0604", cx - 12, baseY + 14, 24, 24);
    // Huge valve wheel
    fill(ctx, "#5E180E", cx - 8, baseY + 18, 16, 16);
    fill(ctx, "#FF4000", cx - 6, baseY + 20, 12, 12);
    fill(ctx, "#942516", cx - 2, baseY + 16, 4, 20);
    fill(ctx, "#942516", cx - 10, baseY + 24, 20, 4);
    fill(ctx, "#FF8800", cx - 2, baseY + 24, 4, 4);
  } else {
    fill(ctx, "#1C0805", cx - 16, baseY + 12, 8, 28);
    fill(ctx, "#1C0805", cx + 8, baseY + 12, 8, 28);
    fill(ctx, "#FF2200", cx - 12, baseY + 14, 2, 24);
    fill(ctx, "#FF2200", cx + 10, baseY + 14, 2, 24);
    fill(ctx, "#050100", cx - 8, baseY + 14, 16, 26);
  }

  fill(ctx, "rgba(0,0,0,0.5)", cx - 26, baseY + 40, 52, 4);
}

function getBaseTheme(theme: string): string {
  if (theme === "overgrown_archive") return "forest";
  if (theme === "sealed_library" || theme === "sealed_armory" || theme === "ash_catacombs" || theme === "deep_prison" || theme === "deep_archive") return "dungeon";
  if (theme === "cooling_canal" || theme === "observatory") return "snow";
  if (theme === "forge_core") return "lava";
  return theme;
}

export class DoorRenderer {
  public static draw(
    ctx: CanvasRenderingContext2D,
    geometry: DoorGeometry,
    theme: DoorTheme,
    locked: boolean,
  ): void {
    const vb = geometry.visualBounds;

    ctx.save();

    // Direction clip guards (safety net, coordinates must be correct independently)
    ctx.beginPath();
    switch (geometry.direction) {
      case "up":
        ctx.rect(vb.x, 0, vb.width, 56);
        break;
      case "down":
        ctx.rect(vb.x, 224, vb.width, 16);
        break;
      case "left":
        ctx.rect(0, vb.y, 16, vb.height);
        break;
      case "right":
        ctx.rect(304, vb.y, 16, vb.height);
        break;
    }
    ctx.clip();

    const baseTheme = getBaseTheme(theme);

    switch (geometry.direction) {
      case "up":
        if (theme === "sealed_library") drawTopLibraryDoor(ctx, vb, locked);
        else if (theme === "forge_core") drawTopForgeCoreDoor(ctx, vb, locked);
        else if (baseTheme === "forest") drawTopForestDoor(ctx, vb, locked);
        else if (baseTheme === "dungeon") drawTopDungeonDoor(ctx, vb, locked);
        else if (baseTheme === "snow") drawTopSnowDoor(ctx, vb, locked);
        else drawTopLavaDoor(ctx, vb, locked);
        break;
      case "down":
        if (baseTheme === "forest") drawBottomForestDoor(ctx, vb, locked);
        else if (baseTheme === "dungeon") drawBottomDungeonDoor(ctx, vb, locked);
        else if (baseTheme === "snow") drawBottomSnowDoor(ctx, vb, locked);
        else drawBottomLavaDoor(ctx, vb, locked);
        break;
      case "left":
      case "right": {
        const side = geometry.direction;
        if (theme === "sealed_library") drawSideLibraryDoor(ctx, vb, locked, side);
        else if (theme === "forge_core") drawSideForgeCoreDoor(ctx, vb, locked, side);
        else if (baseTheme === "forest") drawSideForestDoor(ctx, vb, locked, side);
        else if (baseTheme === "dungeon") drawSideDungeonDoor(ctx, vb, locked, side);
        else if (baseTheme === "snow") drawSideSnowDoor(ctx, vb, locked, side);
        else drawSideLavaDoor(ctx, vb, locked, side);
        break;
      }
    }

    ctx.restore();
  }
}
