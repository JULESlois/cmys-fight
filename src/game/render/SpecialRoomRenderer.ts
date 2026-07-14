import type { RoomType } from "../data/roomTemplates";
import type { EnemyTheme } from "../data/enemies";

interface SpecialPalette {
  floor: string;
  floorLight: string;
  floorDark: string;
  frame: string;
  frameLight: string;
  frameDark: string;
  energy: string;
  energyLight: string;
  warning: string;
}

const SPECIAL_PALETTES: Record<EnemyTheme, SpecialPalette> = {
  forest: {
    floor: "#314735", floorLight: "#607A55", floorDark: "#1D2A21",
    frame: "#69482F", frameLight: "#A77A4C", frameDark: "#2F2119",
    energy: "#65D99B", energyLight: "#D7FFD8", warning: "#F0C75E",
  },
  dungeon: {
    floor: "#252B39", floorLight: "#596273", floorDark: "#111722",
    frame: "#4C5260", frameLight: "#929CA8", frameDark: "#181E29",
    energy: "#B76DE2", energyLight: "#F2D8FF", warning: "#D3B54A",
  },
  snow: {
    floor: "#315466", floorLight: "#9FC1C8", floorDark: "#172F3B",
    frame: "#5D7B86", frameLight: "#D7ECEF", frameDark: "#1B3947",
    energy: "#55D7E8", energyLight: "#E8FFFF", warning: "#D75A62",
  },
  lava: {
    floor: "#3C2527", floorLight: "#7D4A42", floorDark: "#171116",
    frame: "#5B5557", frameLight: "#A5AAA7", frameDark: "#211A20",
    energy: "#F06A27", energyLight: "#FFE47A", warning: "#D64D2A",
  },
};

function palette(theme: string): SpecialPalette {
  return SPECIAL_PALETTES[theme as EnemyTheme] ?? SPECIAL_PALETTES.forest;
}

function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function plate(ctx: CanvasRenderingContext2D, p: SpecialPalette, x: number, y: number, w: number, h: number): void {
  rect(ctx, p.floorDark, x - 2, y - 2, w + 4, h + 4);
  rect(ctx, p.floor, x, y, w, h);
  rect(ctx, p.floorLight, x + 2, y + 2, w - 4, 3);
  rect(ctx, p.floorDark, x + 3, y + h - 5, w - 6, 3);
}

function drawForestStage(ctx: CanvasRenderingContext2D, p: SpecialPalette, cx: number, cy: number): void {
  for (const [x, y, w, h] of [
    [cx - 54, cy + 25, 24, 4], [cx - 38, cy + 19, 6, 12], [cx + 31, cy + 23, 26, 4],
    [cx + 34, cy + 16, 6, 12], [cx - 30, cy - 32, 5, 18], [cx + 25, cy - 31, 5, 17],
  ] as const) rect(ctx, p.frameDark, x, y, w, h);
  for (const [x, y, w, h] of [
    [cx - 52, cy + 24, 22, 2], [cx + 31, cy + 22, 24, 2], [cx - 35, cy + 17, 3, 12],
    [cx + 35, cy + 15, 3, 11], [cx - 28, cy - 30, 3, 16], [cx + 27, cy - 29, 3, 15],
  ] as const) rect(ctx, p.frameLight, x, y, w, h);
  rect(ctx, "#78A45A", cx - 48, cy + 20, 10, 4);
  rect(ctx, "#8FB866", cx + 39, cy + 18, 9, 4);
  rect(ctx, "#E88AA7", cx - 31, cy - 34, 3, 3);
  rect(ctx, "#F5D46A", cx + 29, cy - 33, 3, 3);
}

function drawDungeonStage(ctx: CanvasRenderingContext2D, p: SpecialPalette, cx: number, cy: number): void {
  for (const side of [-1, 1] as const) {
    const x = cx + side * 47;
    rect(ctx, p.frameDark, x - 8, cy - 31, 16, 58);
    rect(ctx, p.frame, x - 6, cy - 29, 12, 54);
    rect(ctx, p.frameLight, x - 4, cy - 27, 8, 4);
    rect(ctx, p.frameDark, x - 4, cy - 17, 8, 18);
    rect(ctx, p.energy, x - 2, cy - 14, 4, 12);
    rect(ctx, p.energyLight, x - 1, cy - 12, 2, 5);
    rect(ctx, p.floorDark, x - 9, cy + 22, 18, 8);
  }
  rect(ctx, p.frameDark, cx - 31, cy + 27, 62, 5);
  for (let x = cx - 27; x <= cx + 27; x += 9) rect(ctx, p.frameLight, x, cy + 28, 5, 1);
}

function drawSnowStage(ctx: CanvasRenderingContext2D, p: SpecialPalette, cx: number, cy: number): void {
  for (const side of [-1, 1] as const) {
    const x = cx + side * 51;
    rect(ctx, p.frameDark, x - 9, cy - 28, 18, 54);
    rect(ctx, p.frame, x - 7, cy - 26, 14, 50);
    rect(ctx, p.frameLight, x - 5, cy - 24, 10, 3);
    rect(ctx, "#203F4D", x - 5, cy - 14, 10, 14);
    rect(ctx, p.energy, x - 3, cy - 12, 6, 7);
    rect(ctx, p.energyLight, x - 2, cy - 11, 2, 2);
    rect(ctx, p.warning, x - 4, cy + 7, 3, 3);
    rect(ctx, "#E8B64E", x + 1, cy + 7, 3, 3);
    rect(ctx, p.frameDark, x - 10, cy + 22, 20, 7);
  }
  rect(ctx, p.frameDark, cx - 34, cy + 27, 68, 6);
  rect(ctx, p.frameLight, cx - 31, cy + 28, 62, 2);
}

function drawLavaStage(ctx: CanvasRenderingContext2D, p: SpecialPalette, cx: number, cy: number): void {
  for (const side of [-1, 1] as const) {
    const x = cx + side * 51;
    rect(ctx, p.frameDark, x - 10, cy - 26, 20, 54);
    rect(ctx, p.frame, x - 8, cy - 24, 16, 50);
    rect(ctx, p.frameLight, x - 6, cy - 22, 12, 3);
    rect(ctx, "#2C2025", x - 6, cy - 12, 12, 17);
    rect(ctx, p.energy, x - 4, cy - 10, 8, 12);
    rect(ctx, p.energyLight, x - 2, cy - 8, 4, 5);
    rect(ctx, p.frameDark, x - 13, cy + 2, 6, 17);
    rect(ctx, p.frameLight, x - 11, cy + 4, 2, 12);
    rect(ctx, p.frameDark, x + 7, cy - 16, 7, 24);
    rect(ctx, p.frameLight, x + 9, cy - 14, 2, 18);
  }
  rect(ctx, p.frameDark, cx - 36, cy + 27, 72, 6);
  for (let x = cx - 31; x <= cx + 28; x += 12) rect(ctx, p.frameLight, x, cy + 28, 7, 2);
}

function drawChapterStage(ctx: CanvasRenderingContext2D, theme: string, cx: number, cy: number): void {
  const p = palette(theme);
  if (theme === "dungeon") drawDungeonStage(ctx, p, cx, cy);
  else if (theme === "snow") drawSnowStage(ctx, p, cx, cy);
  else if (theme === "lava") drawLavaStage(ctx, p, cx, cy);
  else drawForestStage(ctx, p, cx, cy);
}

export class SpecialRoomRenderer {
  static drawRoomStage(ctx: CanvasRenderingContext2D, roomType: RoomType, theme: string, time: number, completed = false): void {
    const p = palette(theme);
    const pulse = Math.floor(time * 5) % 3;
    const cx = 160;
    const cy = 120;
    const bounds = roomType === "shop" ? [102, 78, 116, 86] : roomType === "exit" ? [112, 84, 96, 72] : [103, 78, 114, 86];
    plate(ctx, p, bounds[0], bounds[1], bounds[2], bounds[3]);

    if (roomType === "exit") {
      rect(ctx, p.floorDark, 126, 96, 68, 48);
      rect(ctx, p.floorLight, 130, 99, 60, 3);
      for (const [x, y] of [[132, 109], [188, 109], [132, 137], [188, 137]] as const) {
        rect(ctx, p.frameDark, x - 4, y - 4, 8, 8);
        rect(ctx, p.energy, x - 2, y - 2, 4, 4);
        rect(ctx, p.energyLight, x - 1, y - 1, 2, 2);
      }
    } else if (roomType === "shop") {
      rect(ctx, p.floorDark, 112, 91, 96, 52);
      rect(ctx, p.frameDark, 116, 137, 88, 12);
      rect(ctx, p.frame, 119, 139, 82, 8);
      for (let x = 122; x <= 194; x += 12) {
        rect(ctx, p.frameDark, x, 141, 7, 4);
        rect(ctx, p.warning, x + 1, 142, 5, 2);
      }
    } else if (roomType === "npc") {
      rect(ctx, p.floorDark, 122, 95, 76, 51);
      for (let x = 128; x <= 188; x += 12) {
        rect(ctx, p.frameDark, x, 101, 7, 36);
        rect(ctx, p.energy, x + 2, 104 + ((x / 12 + pulse) % 2), 3, 24);
      }
    } else if (roomType === "wish_fountain") {
      rect(ctx, p.floorDark, 116, 91, 88, 60);
      for (const [x, y] of [[120, 95], [196, 95], [120, 143], [196, 143]] as const) {
        rect(ctx, p.frameDark, x - 4, y - 4, 8, 8);
        rect(ctx, completed ? p.floorLight : p.energy, x - 2, y - 2, 4, 4);
      }
    } else if (roomType === "photo_booth") {
      rect(ctx, p.floorDark, 118, 91, 84, 61);
      rect(ctx, p.frameDark, 124, 96, 72, 7);
      for (let x = 127; x <= 190; x += 9) rect(ctx, (x / 9 + pulse) % 2 === 0 ? p.energy : p.warning, x, 98, 5, 3);
    }
    drawChapterStage(ctx, theme, cx, cy);
  }

  static drawWishFountain(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, theme: string, completed: boolean): void {
    const p = palette(theme);
    const pulse = Math.floor(time * 6) % 3;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(1.38, 1.38);
    rect(ctx, "rgba(0,0,0,0.35)", -22, 11, 44, 6);
    rect(ctx, p.frameDark, -20, 2, 40, 12);
    rect(ctx, p.frame, -18, 1, 36, 11);
    rect(ctx, p.frameLight, -15, 2, 30, 3);
    rect(ctx, p.frameDark, -14, -8, 28, 12);
    rect(ctx, p.frame, -12, -9, 24, 11);
    rect(ctx, p.floorDark, -9, -6, 18, 7);
    rect(ctx, completed ? p.floorLight : p.energy, -8, -5, 16, 5);
    rect(ctx, completed ? p.frame : p.energyLight, -5 + pulse, -5, 6, 2);
    rect(ctx, p.frameDark, -3, -17, 6, 10);
    rect(ctx, p.frame, -2, -18, 4, 10);
    if (!completed) {
      rect(ctx, p.energyLight, -1, -24 - pulse, 3, 4);
      rect(ctx, p.energy, -10, -13 + pulse, 3, 3);
      rect(ctx, p.warning, 8, -15 + (2 - pulse), 3, 3);
    }
    ctx.restore();
  }

  static drawBroadcastTerminal(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, theme: string, completed: boolean): void {
    const p = palette(theme);
    const signal = Math.floor(time * 7) % 4;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(1.28, 1.28);
    rect(ctx, "rgba(0,0,0,0.35)", -15, 10, 30, 5);
    rect(ctx, p.frameDark, -13, -17, 26, 29);
    rect(ctx, p.frame, -11, -15, 22, 25);
    rect(ctx, p.frameLight, -9, -13, 18, 3);
    rect(ctx, p.floorDark, -8, -8, 16, 10);
    const bars = [p.warning, p.energyLight, p.energy, "#FF7043"];
    bars.forEach((color, index) => rect(ctx, completed ? p.floorLight : color, -7 + index * 4, -6 + ((index + signal) % 2), 3, 6));
    rect(ctx, p.frameDark, -9, 5, 5, 6);
    rect(ctx, p.frameDark, 4, 5, 5, 6);
    rect(ctx, p.frameLight, -8, 5, 3, 3);
    rect(ctx, p.frameLight, 5, 5, 3, 3);
    rect(ctx, p.frameDark, -9, -24, 3, 8);
    rect(ctx, p.energy, -8, -25 - (signal % 2), 2, 3);
    rect(ctx, p.frameDark, 6, -22, 3, 6);
    rect(ctx, p.warning, 7, -23 + (signal % 2), 2, 3);
    ctx.restore();
  }

  static drawPhotoBooth(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, theme: string, completed: boolean): void {
    const p = palette(theme);
    const flash = !completed && Math.floor(time * 2.5) % 4 === 0;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(1.28, 1.28);
    rect(ctx, "rgba(0,0,0,0.35)", -18, 13, 36, 5);
    rect(ctx, p.frameDark, -16, -21, 32, 35);
    rect(ctx, p.frame, -14, -19, 28, 31);
    rect(ctx, p.frameLight, -12, -17, 24, 3);
    rect(ctx, p.floorDark, -10, -12, 20, 15);
    rect(ctx, flash ? "#FFFFFF" : completed ? p.floorLight : p.energy, -7, -9, 14, 9);
    rect(ctx, p.energyLight, -4, -7, 5, 3);
    rect(ctx, p.warning, -10, 5, 20, 5);
    rect(ctx, p.frameDark, -12, 13, 6, 5);
    rect(ctx, p.frameDark, 6, 13, 6, 5);
    ctx.restore();
  }

  static drawMerchant(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, theme: string): void {
    const p = palette(theme);
    const bob = Math.round(Math.sin(time * 2.5));
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y + bob));
    ctx.scale(1.24, 1.24);
    rect(ctx, "rgba(0,0,0,0.35)", -26, 10, 52, 6);
    // Chapter-specific stall, displayed goods and tool packs surround the vendor.
    rect(ctx, p.frameDark, -26, 0, 52, 13);
    rect(ctx, p.frame, -24, -1, 48, 12);
    rect(ctx, p.frameLight, -22, 0, 44, 3);
    rect(ctx, p.floorDark, -23, 5, 46, 5);
    for (const [gx, color] of [[-19, p.energy], [-11, p.warning], [12, p.energyLight], [18, p.energy]] as const) {
      rect(ctx, p.frameDark, gx - 1, -4, 7, 8);
      rect(ctx, color, gx, -3, 5, 6);
      rect(ctx, p.energyLight, gx + 1, -2, 2, 2);
    }
    rect(ctx, p.frameDark, -10, -20, 20, 22);
    rect(ctx, "#5B3C69", -8, -18, 16, 19);
    rect(ctx, "#8E55A8", -6, -17, 12, 15);
    rect(ctx, p.frameDark, -8, -32, 16, 14);
    rect(ctx, "#E6B995", -6, -30, 12, 10);
    rect(ctx, p.frameDark, -10, -35, 20, 5);
    rect(ctx, p.warning, -8, -34, 16, 3);
    rect(ctx, p.frameDark, -4, -27, 3, 3);
    rect(ctx, p.frameDark, 2, -27, 3, 3);
    rect(ctx, p.energyLight, -3, -27, 1, 1);
    rect(ctx, p.energyLight, 3, -27, 1, 1);
    rect(ctx, p.frameDark, -14, -16, 6, 15);
    rect(ctx, p.frame, -13, -15, 4, 13);
    rect(ctx, p.energy, -13, -13, 3, 5);
    rect(ctx, p.frameDark, 8, -15, 7, 14);
    rect(ctx, p.frame, 9, -14, 5, 12);
    rect(ctx, p.warning, 10, -12, 3, 5);
    ctx.restore();
  }
}
