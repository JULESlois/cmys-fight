import type { RoomType } from "../data/roomTemplates";
import { DUNGEON_RITUAL_SPRING_SCALE } from "../dungeon/RoomObjectCollision";
import { drawRitualSpring } from "./RitualSpringRenderer";

export type SpecialFacilityPart = "back" | "body" | "front" | "upper";

export interface SpecialPalette { energy: string; energyLight: string; warning: string; }

type NodeMark = "leaf" | "rune" | "snow" | "furnace" | "book" | "canal" | "armory" | "star" | "ash" | "chain" | "archive";

interface SpecialStyle extends SpecialPalette { mark: NodeMark; }

const SPECIAL_STYLES: Record<string, SpecialStyle> = {
  // Base themes remain valid for QA scenes and legacy saves.
  forest: { energy: "#65D99B", energyLight: "#D7FFD8", warning: "#F0C75E", mark: "leaf" },
  dungeon: { energy: "#B76DE2", energyLight: "#F2D8FF", warning: "#D3B54A", mark: "rune" },
  snow: { energy: "#55D7E8", energyLight: "#E8FFFF", warning: "#D75A62", mark: "snow" },
  lava: { energy: "#F06A27", energyLight: "#FFE47A", warning: "#D64D2A", mark: "furnace" },

  // Route nodes use their own accent pair and a compact floor sigil.
  overgrown_archive: { energy: "#71C86B", energyLight: "#E5F7A8", warning: "#E783A5", mark: "leaf" },
  sealed_library: { energy: "#AF46FF", energyLight: "#E0A8FF", warning: "#D7B45B", mark: "book" },
  cooling_canal: { energy: "#39C9D8", energyLight: "#D8FFFF", warning: "#E36A68", mark: "canal" },
  sealed_armory: { energy: "#C58B4B", energyLight: "#FFE1A0", warning: "#D9534F", mark: "armory" },
  observatory: { energy: "#6DB9E8", energyLight: "#ECF8FF", warning: "#A681E8", mark: "star" },
  forge_core: { energy: "#FF5500", energyLight: "#FFE86E", warning: "#D99311", mark: "furnace" },
  ash_catacombs: { energy: "#9C7B78", energyLight: "#E7D7C8", warning: "#D95B36", mark: "ash" },
  deep_prison: { energy: "#8F6E9F", energyLight: "#D9C8E6", warning: "#C44852", mark: "chain" },
  deep_archive: { energy: "#C44CDB", energyLight: "#F5CEFF", warning: "#4ED4C8", mark: "archive" },
};

const FRAME = { dark: "#171F29", body: "#485563", light: "#A7B4BF", screen: "#111821", gold: "#D8B45C" } as const;

function style(theme: string): SpecialStyle {
  return SPECIAL_STYLES[theme] ?? SPECIAL_STYLES.forest;
}

export function getSpecialRoomPalette(theme: string): SpecialPalette {
  const { energy, energyLight, warning } = style(theme);
  return { energy, energyLight, warning };
}

function palette(theme: string): SpecialPalette {
  return getSpecialRoomPalette(theme);
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

function drawRoomTypeInlay(ctx: CanvasRenderingContext2D, roomType: RoomType, p: SpecialPalette, time: number, completed: boolean): void {
  const energy = completed ? "rgba(112,122,126,0.28)" : p.energy;
  const light = completed ? "rgba(151,159,163,0.32)" : p.energyLight;
  const warning = completed ? "rgba(112,122,126,0.32)" : p.warning;
  const pulse = 0.5 + 0.5 * Math.sin(time * 2.1);

  if (roomType === "exit") {
    for (const [x, y, w, h] of [[154, 101, 12, 2], [154, 137, 12, 2], [141, 114, 2, 12], [177, 114, 2, 12]] as const) {
      rect(ctx, energy, x, y, w, h);
    }
    rect(ctx, light, 157, 117, 6, 6);
    rect(ctx, energy, 159, 113, 2, 14);
    rect(ctx, energy, 153, 119, 14, 2);
  } else if (roomType === "npc") {
    // Open brackets leave the terminal footprint readable while framing it as a facility.
    rect(ctx, energy, 137, 101, 15, 2);
    rect(ctx, energy, 137, 101, 2, 12);
    rect(ctx, energy, 168, 101, 15, 2);
    rect(ctx, energy, 181, 101, 2, 12);
    rect(ctx, energy, 137, 137, 15, 2);
    rect(ctx, energy, 137, 127, 2, 12);
    rect(ctx, energy, 168, 137, 15, 2);
    rect(ctx, energy, 181, 127, 2, 12);
    rect(ctx, light, 151, 144, 18, 1);
  } else if (roomType === "treasure") {
    const glow = completed ? "rgba(112,122,126,0.05)" : `rgba(241,196,15,${(0.04 + 0.04 * pulse).toFixed(3)})`;
    rect(ctx, glow, 142, 102, 36, 36);
    ctx.strokeStyle = completed ? "rgba(112,122,126,0.24)" : `${p.warning}66`;
    ctx.strokeRect(136, 96, 48, 48);
    ctx.strokeRect(142, 102, 36, 36);
    for (const [x, y] of [[134, 94], [184, 94], [134, 144], [184, 144]] as const) {
      rect(ctx, warning, x - 1, y - 1, 4, 4);
      rect(ctx, light, x, y, 2, 2);
    }
    const glints = [[139, 99], [179, 99], [179, 139], [139, 139]] as const;
    const [gx, gy] = glints[Math.floor(time * 1.4) % glints.length];
    rect(ctx, light, gx, gy, 2, 2);
  } else if (roomType === "hidden") {
    const alpha = completed ? 0.12 : 0.16 + pulse * 0.12;
    ctx.strokeStyle = `rgba(167,106,226,${alpha.toFixed(3)})`;
    ctx.strokeRect(140, 100, 40, 40);
    for (const [x, y] of [[160, 96], [184, 120], [160, 144], [136, 120]] as const) {
      rect(ctx, energy, x - 1, y, 3, 1);
      rect(ctx, light, x, y - 1, 1, 3);
    }
    rect(ctx, energy, 158, 118, 4, 4);
  } else if (roomType === "start") {
    rect(ctx, energy, 158, 105, 4, 30);
    rect(ctx, energy, 145, 118, 30, 4);
    rect(ctx, light, 159, 117, 2, 6);
    rect(ctx, light, 157, 119, 6, 2);
  }
}

function drawNodeMark(ctx: CanvasRenderingContext2D, x: number, y: number, theme: string, completed: boolean): void {
  const node = style(theme);
  const dark = completed ? "rgba(104,112,116,0.24)" : `${node.energy}66`;
  const bright = completed ? "rgba(145,153,157,0.28)" : node.energyLight;
  const warning = completed ? "rgba(128,136,140,0.26)" : node.warning;
  const pixel = (dx: number, dy: number, w = 2, h = 2, color = dark) => rect(ctx, color, x + dx, y + dy, w, h);

  switch (node.mark) {
    case "leaf":
      pixel(3, 0, 3, 3); pixel(1, 2, 3, 3); pixel(4, 3, 1, 5, bright); pixel(5, 1, 2, 1, bright);
      break;
    case "book":
      pixel(0, 1, 4, 6); pixel(5, 1, 4, 6); pixel(4, 2, 1, 6, bright); pixel(1, 2, 2, 1, bright); pixel(6, 2, 2, 1, bright);
      break;
    case "canal":
      pixel(0, 1, 9, 2); pixel(0, 6, 9, 2); pixel(1, 3, 2, 3, bright); pixel(6, 3, 2, 3, bright);
      break;
    case "armory":
      pixel(1, 0, 7, 2); pixel(0, 2, 2, 4); pixel(7, 2, 2, 4); pixel(2, 6, 5, 2); pixel(4, 2, 1, 5, bright);
      break;
    case "star":
      pixel(3, 0, 3, 8); pixel(0, 3, 9, 2); pixel(2, 2, 5, 4, bright); pixel(4, 3, 1, 2, warning);
      break;
    case "furnace":
      pixel(0, 5, 9, 3); pixel(1, 2, 2, 3); pixel(4, 0, 2, 5, bright); pixel(7, 3, 2, 2); pixel(3, 5, 3, 2, warning);
      break;
    case "ash":
      pixel(1, 2, 7, 2); pixel(2, 4, 5, 4); pixel(3, 0, 1, 2, bright); pixel(6, 1, 1, 1, bright);
      break;
    case "chain":
      pixel(0, 0, 5, 3); pixel(2, 2, 5, 3, bright); pixel(4, 4, 5, 3); pixel(1, 1, 2, 1, bright); pixel(6, 5, 2, 1, bright);
      break;
    case "archive":
      pixel(0, 0, 9, 2); pixel(1, 3, 7, 2, bright); pixel(2, 6, 5, 2); pixel(4, 1, 1, 6, warning);
      break;
    case "snow":
      pixel(4, 0, 1, 8); pixel(0, 4, 9, 1); pixel(1, 1, 2, 2, bright); pixel(6, 1, 2, 2, bright); pixel(1, 6, 2, 2, bright); pixel(6, 6, 2, 2, bright);
      break;
    default:
      pixel(0, 0, 9, 2); pixel(0, 6, 9, 2); pixel(3, 2, 3, 4, bright);
      break;
  }
}

export class SpecialRoomRenderer {
  static drawRoomStage(ctx: CanvasRenderingContext2D, roomType: RoomType, theme: string, time: number, completed = false): void {
    // Floor-only markings preserve the normal walkable room while making the
    // interaction type and route node readable without a generic stage plate.
    const p = palette(theme);
    drawSparseRunes(ctx, roomType, theme, time, completed);
    drawRoomTypeInlay(ctx, roomType, p, time, completed);
    drawNodeMark(ctx, 122, 116, theme, completed);
    drawNodeMark(ctx, 189, 116, theme, completed);
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
