import type { RoomType } from "../data/roomTemplates";
import type { EnemyTheme } from "../data/enemies";
import { DUNGEON_RITUAL_SPRING_SCALE } from "../dungeon/RoomObjectCollision";
import { drawRitualSpring } from "./RitualSpringRenderer";

export type SpecialFacilityPart = "back" | "body" | "front" | "upper";

interface SpecialPalette { energy: string; energyLight: string; warning: string; }
const SPECIAL_PALETTES: Record<EnemyTheme, SpecialPalette> = {
  forest: { energy: "#65D99B", energyLight: "#D7FFD8", warning: "#F0C75E" },
  dungeon: { energy: "#B76DE2", energyLight: "#F2D8FF", warning: "#D3B54A" },
  snow: { energy: "#55D7E8", energyLight: "#E8FFFF", warning: "#D75A62" },
  lava: { energy: "#F06A27", energyLight: "#FFE47A", warning: "#D64D2A" },
};
const FRAME = { dark: "#171F29", body: "#485563", light: "#A7B4BF", screen: "#111821", gold: "#D8B45C" } as const;

function palette(theme: string): SpecialPalette {
  return SPECIAL_PALETTES[theme as EnemyTheme] ?? SPECIAL_PALETTES.forest;
}
function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, width: number, height: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}
function drawSparseRunes(ctx: CanvasRenderingContext2D, roomType: RoomType, theme: string, time: number, completed: boolean): void {
  const p = palette(theme);
  const color = completed ? "rgba(112,122,126,0.22)" : `${p.energy}66`;
  const phase = Math.floor(time * 4) % 2;
  const radius = roomType === "exit" ? 31 : 40;
  const diagonal = Math.round(radius * 0.7);
  const points = [[0,-radius],[radius,0],[0,radius],[-radius,0],[diagonal,diagonal],[-diagonal,diagonal],[diagonal,-diagonal],[-diagonal,-diagonal]] as const;
  for (let index = 0; index < points.length; index++) {
    if ((index + phase) % 2 !== 0 && roomType !== "exit") continue;
    const [x, y] = points[index];
    rect(ctx, color, 158 + x, 119 + y, 5, 2);
    rect(ctx, color, 160 + x, 117 + y, 1, 6);
  }
}

export class SpecialRoomRenderer {
  static drawRoomStage(ctx: CanvasRenderingContext2D, roomType: RoomType, theme: string, time: number, completed = false): void {
    // Special rooms retain the normal floor and only add sparse central runes.
    // No corner seals, chapter side machinery, or generic stage frame remains.
    drawSparseRunes(ctx, roomType, theme, time, completed);
  }

  static drawWishFountain(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, theme: string, completed: boolean): void {
    if (typeof x !== "number" || typeof y !== "number" || Number.isNaN(x) || Number.isNaN(y)) return;
    drawRitualSpring(ctx, { x, y, scale: DUNGEON_RITUAL_SPRING_SCALE, time, theme: theme as any, completed });
  }

  static drawBroadcastTerminal(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    time: number,
    _theme: string,
    completed: boolean,
    part: SpecialFacilityPart | "all" = "all",
  ): void {
    if (typeof x !== "number" || typeof y !== "number" || Number.isNaN(x) || Number.isNaN(y)) return;
    const signal = Math.floor(time * 7) % 4;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (part === "all" || part === "back") rect(ctx, "rgba(0,0,0,0.35)", -15, 10, 30, 5);
    if (part === "all" || part === "body") {
      rect(ctx, FRAME.dark, -13, -17, 26, 29);
      rect(ctx, FRAME.body, -11, -15, 22, 25);
      rect(ctx, FRAME.light, -9, -13, 18, 3);
      rect(ctx, FRAME.screen, -8, -8, 16, 10);
    }
    if (part === "all" || part === "front") {
      rect(ctx, FRAME.dark, -9, 5, 5, 6);
      rect(ctx, FRAME.dark, 4, 5, 5, 6);
      rect(ctx, FRAME.light, -8, 5, 3, 3);
      rect(ctx, FRAME.light, 5, 5, 3, 3);
    }
    if (part === "all" || part === "upper") {
      const bars = ["#F0B84A", "#E8FFFF", "#62D8E8", "#FF7043"];
      bars.forEach((color, index) => rect(ctx, completed ? "#65717A" : color, -7 + index * 4, -6 + ((index + signal) % 2), 3, 6));
      rect(ctx, FRAME.dark, -9, -24, 3, 8);
      rect(ctx, completed ? "#65717A" : "#62D8E8", -8, -25 - (signal % 2), 2, 3);
    }
    ctx.restore();
  }

  static drawBroadcastTerminalPart(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    time: number,
    theme: string,
    completed: boolean,
    part: SpecialFacilityPart,
  ): void {
    this.drawBroadcastTerminal(ctx, x, y, time, theme, completed, part);
  }

  static drawPhotoBooth(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, theme: string, completed: boolean, part: SpecialFacilityPart | "all" = "all"): void {
    const p = palette(theme);
    const flash = !completed && Math.floor(time * 2.5) % 4 === 0;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (part === "all" || part === "back") rect(ctx, "rgba(0,0,0,0.35)", -18, 13, 36, 5);
    if (part === "all" || part === "body") {
      rect(ctx, FRAME.dark, -16, -21, 32, 35);
      rect(ctx, FRAME.body, -14, -19, 28, 31);
      rect(ctx, FRAME.light, -12, -17, 24, 3);
      rect(ctx, FRAME.screen, -10, -12, 20, 15);
    }
    if (part === "all" || part === "upper") {
      rect(ctx, flash ? "#FFFFFF" : completed ? "#65717A" : p.energy, -7, -9, 14, 9);
      rect(ctx, completed ? "#65717A" : p.energyLight, -4, -7, 5, 3);
    }
    if (part === "all" || part === "front") {
      rect(ctx, FRAME.gold, -10, 5, 20, 5);
      rect(ctx, FRAME.dark, -12, 13, 6, 5);
      rect(ctx, FRAME.dark, 6, 13, 6, 5);
    }
    ctx.restore();
  }

  static drawPhotoBoothPart(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, theme: string, completed: boolean, part: SpecialFacilityPart): void {
    this.drawPhotoBooth(ctx, x, y, time, theme, completed, part);
  }

  static drawLegacyDevice(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, kind: "legacy_rpg" | "legacy_tactics", completed: boolean, part: SpecialFacilityPart | "all" = "all"): void {
    const pulse = Math.floor(time * 5) % 3;
    const accent = kind === "legacy_rpg" ? "#70D7FF" : "#E6A85A";
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (part === "all" || part === "back") rect(ctx, "rgba(0,0,0,0.35)", -16, 10, 32, 5);
    if (part === "all" || part === "body") {
      rect(ctx, FRAME.dark, -14, -18, 28, 30);
      rect(ctx, FRAME.body, -12, -16, 24, 26);
      rect(ctx, FRAME.light, -10, -14, 20, 3);
      rect(ctx, FRAME.screen, -9, -9, 18, 12);
    }
    if ((part === "all" || part === "upper") && kind === "legacy_rpg") {
      rect(ctx, completed ? "#65717A" : accent, -6, -6, 12, 2);
      rect(ctx, completed ? "#65717A" : accent, -6, -2, 8 + pulse, 2);
      rect(ctx, completed ? "#65717A" : "#D8FFFF", -6, 2, 4, 2);
    } else if (part === "all" || part === "upper") {
      for (let row = 0; row < 3; row++) {
        for (let column = 0; column < 4; column++) {
          if ((row + column + pulse) % 2 === 0) {
            rect(ctx, completed ? "#65717A" : accent, -7 + column * 4, -7 + row * 4, 3, 3);
          }
        }
      }
    }
    if (part === "all" || part === "front") {
      rect(ctx, FRAME.dark, -10, 7, 7, 5);
      rect(ctx, FRAME.dark, 3, 7, 7, 5);
    }
    ctx.restore();
  }

  static drawLegacyDevicePart(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, kind: "legacy_rpg" | "legacy_tactics", completed: boolean, part: SpecialFacilityPart): void {
    this.drawLegacyDevice(ctx, x, y, time, kind, completed, part);
  }
}
