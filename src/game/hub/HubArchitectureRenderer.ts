import type { WorldObjectDefinition } from "../world/WorldMap";
import { HUB_ART_METRICS, HUB_BUILDING_METRICS } from "./HubArtMetrics";

type StructurePart = "back" | "base" | "front";

const C = {
  ink: "#202631",
  stone: "#4B5260",
  stoneLight: "#737F8E",
  archive: "#433D52",
  archiveLight: "#817491",
  cyanStone: "#365866",
  cyanLight: "#72E0E8",
  wood: "#68472E",
  woodLight: "#9B6A3E",
  orange: "#E58945",
  fire: "#FFD36B",
  armory: "#5A514A",
  gold: "#D8B45C",
  purple: "#9B74D5",
  purpleDark: "#49345F",
  water: "#4FB8C8",
  waterDark: "#256F83",
} as const;

function partOf(object: WorldObjectDefinition): StructurePart {
  const part = object.properties?.part;
  return part === "back" || part === "front" ? part : "base";
}

function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, width: number, height: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, width: number): void {
  rect(ctx, "rgba(3,7,9,0.32)", x + 6, y, width - 12, 10);
  rect(ctx, "rgba(3,7,9,0.17)", x + 14, y + 10, width - 28, 3);
}

function foundation(ctx: CanvasRenderingContext2D, x: number, bottom: number, width: number, color: string): void {
  const depth = HUB_ART_METRICS.foundationDepth;
  rect(ctx, C.ink, x, bottom - depth, width, depth);
  rect(ctx, color, x + 4, bottom - depth + 3, width - 8, depth - 6);
  rect(ctx, "rgba(255,255,255,0.14)", x + 6, bottom - depth + 4, width - 12, 2);
}

function wall(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color: string, light: string): void {
  rect(ctx, C.ink, x, y, width, height);
  rect(ctx, color, x + 3, y + 3, width - 6, height - 6);
  for (let row = HUB_ART_METRICS.wallCourseHeight; row < height - 5; row += HUB_ART_METRICS.wallCourseHeight) {
    rect(ctx, "rgba(8,12,18,0.25)", x + 4, y + row, width - 8, 1);
    const offset = (row / HUB_ART_METRICS.wallCourseHeight) % 2 === 0 ? 16 : 30;
    for (let joint = offset; joint < width - 8; joint += 34) rect(ctx, "rgba(8,12,18,0.22)", x + joint, y + row - 6, 1, 6);
  }
  rect(ctx, light, x + 5, y + 5, width - 10, 2);
}

function gable(ctx: CanvasRenderingContext2D, centerX: number, y: number, width: number, height: number, color: string, trim: string): void {
  const rows = Math.max(4, Math.floor(height / 4));
  for (let row = 0; row < rows; row++) {
    const rowWidth = Math.round(width * (row + 1) / rows);
    rect(ctx, color, centerX - rowWidth / 2, y + row * 4, rowWidth, 5);
  }
  rect(ctx, trim, centerX - width / 2 - HUB_ART_METRICS.roofOverhang / 2, y + height - 2, width + HUB_ART_METRICS.roofOverhang, 4);
}

function spire(ctx: CanvasRenderingContext2D, centerX: number, y: number, width: number, height: number, color: string, trim: string): void {
  const rows = Math.max(5, Math.floor(height / 4));
  for (let row = 0; row < rows; row++) {
    const rowWidth = Math.max(4, Math.round(width * (row + 1) / rows));
    rect(ctx, color, centerX - rowWidth / 2, y + row * 4, rowWidth, 5);
  }
  rect(ctx, trim, centerX - width / 2, y + height - 2, width, 3);
}

function door(ctx: CanvasRenderingContext2D, centerX: number, bottom: number, width: number, height: number, glow?: string): void {
  rect(ctx, C.ink, centerX - width / 2 - 4, bottom - height - 4, width + 8, height + 4);
  rect(ctx, "#171B24", centerX - width / 2, bottom - height, width, height);
  if (glow) {
    rect(ctx, glow, centerX - width / 2 + 4, bottom - height + 5, 3, height - 10);
    rect(ctx, "rgba(255,255,255,0.35)", centerX + width / 2 - 7, bottom - height + 6, 2, height - 12);
  }
}

function window(ctx: CanvasRenderingContext2D, centerX: number, y: number, glow: string): void {
  rect(ctx, C.ink, centerX - 7, y + 4, 14, 24);
  rect(ctx, C.ink, centerX - 5, y, 10, 5);
  rect(ctx, glow, centerX - 4, y + 6, 8, 18);
  rect(ctx, "rgba(255,255,255,0.3)", centerX - 3, y + 7, 2, 14);
}

function steps(ctx: CanvasRenderingContext2D, centerX: number, y: number, width: number, color: string): void {
  for (let step = 0; step < 3; step++) {
    const stepWidth = width + step * 10;
    rect(ctx, C.ink, centerX - stepWidth / 2, y + step * 4, stepWidth, 5);
    rect(ctx, color, centerX - stepWidth / 2 + 2, y + step * 4, stepWidth - 4, 2);
  }
}

export class HubArchitectureRenderer {
  public static draw(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): boolean {
    const kind = typeof object.properties?.kind === "string" ? object.properties.kind : "";
    if (kind === "archive_keep") this.drawArchive(ctx, object);
    else if (kind === "observatory_keep") this.drawObservatory(ctx, object, time);
    else if (kind === "workshop_keep") this.drawWorkshop(ctx, object, time);
    else if (kind === "armory_keep") this.drawArmory(ctx, object);
    else if (kind === "rebirth_spring") this.drawSpring(ctx, object, time);
    else if (kind === "expedition_structure") this.drawExpedition(ctx, object, time);
    else return false;
    return true;
  }

  private static drawArchive(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition): void {
    const part = partOf(object);
    const metrics = HUB_BUILDING_METRICS.archive_keep;
    const x = object.x;
    const y = object.y;
    const w = metrics.width;
    const bottom = y + metrics.height;
    const center = x + w / 2;
    if (part === "back") {
      spire(ctx, center, y - 4, 72, 36, "#2D273A", C.gold);
      spire(ctx, x + 34, y + 15, 44, 28, "#30293E", C.archiveLight);
      spire(ctx, x + w - 34, y + 15, 44, 28, "#30293E", C.archiveLight);
      wall(ctx, center - 42, y + 28, 84, 72, C.archive, C.archiveLight);
      return;
    }
    if (part === "base") {
      shadow(ctx, x + 6, bottom - 2, w - 12);
      foundation(ctx, x + 10, bottom, w - 20, C.archiveLight);
      wall(ctx, x + 10, y + 82, 80, 58, C.archive, C.archiveLight);
      wall(ctx, x + w - 90, y + 82, 80, 58, C.archive, C.archiveLight);
      wall(ctx, center - 50, y + 62, 100, 78, C.archive, C.archiveLight);
      window(ctx, x + 48, y + 94, "#8C6FC0");
      window(ctx, x + w - 48, y + 94, "#8C6FC0");
      window(ctx, center, y + 70, "#AE8ADD");
      door(ctx, center, bottom - 4, metrics.doorWidth, metrics.doorHeight, C.purple);
      steps(ctx, center, bottom - 5, metrics.doorWidth + 8, C.archiveLight);
      return;
    }
    rect(ctx, C.ink, center - 32, bottom - metrics.doorHeight - 12, 64, 10);
    rect(ctx, C.archiveLight, center - 27, bottom - metrics.doorHeight - 10, 54, 4);
    for (const side of [-1, 1]) {
      const bx = center + side * 61;
      rect(ctx, C.ink, bx - 7, bottom - 42, 14, 42);
      rect(ctx, C.archive, bx - 4, bottom - 38, 8, 33);
    }
  }

  private static drawObservatory(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
    const part = partOf(object);
    const metrics = HUB_BUILDING_METRICS.observatory_keep;
    const x = object.x;
    const y = object.y;
    const w = metrics.width;
    const bottom = y + metrics.height;
    const center = x + w / 2;
    if (part === "back") {
      const dome = [104, 94, 80, 62, 40, 18];
      dome.forEach((width, row) => rect(ctx, row % 2 ? "#3C6575" : "#335665", center - width / 2, y + 12 + row * 5, width, 6));
      rect(ctx, C.cyanLight, center - 2, y + 4, 4, 16);
      wall(ctx, center - 54, y + 46, 108, 60, C.cyanStone, "#6B96A7");
      return;
    }
    if (part === "base") {
      shadow(ctx, x + 8, bottom - 2, w - 16);
      foundation(ctx, x + 10, bottom, w - 20, "#63899A");
      wall(ctx, x + 10, y + 82, 64, 58, C.cyanStone, "#63899A");
      wall(ctx, x + w - 74, y + 82, 64, 58, C.cyanStone, "#63899A");
      window(ctx, x + 42, y + 94, "#6BE6EE");
      window(ctx, x + w - 42, y + 94, "#6BE6EE");
      door(ctx, center, bottom - 4, metrics.doorWidth, metrics.doorHeight, C.cyanLight);
      steps(ctx, center, bottom - 5, metrics.doorWidth + 8, "#63899A");
      const orbit = Math.floor(time * 8) % 48;
      rect(ctx, C.purple, center - 24 + orbit, y + 42, 4, 4);
      return;
    }
    rect(ctx, C.ink, center - 31, bottom - metrics.doorHeight - 13, 62, 11);
    rect(ctx, "#63899A", center - 27, bottom - metrics.doorHeight - 10, 54, 4);
    rect(ctx, "rgba(114,224,232,0.25)", center - 45, y + 65, 90, 4);
  }

  private static drawWorkshop(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
    const part = partOf(object);
    const metrics = HUB_BUILDING_METRICS.workshop_keep;
    const x = object.x;
    const y = object.y;
    const w = metrics.width;
    const bottom = y + metrics.height;
    if (part === "back") {
      gable(ctx, x + 166, y + 18, 170, 42, "#493225", C.woodLight);
      gable(ctx, x + 50, y + 48, 94, 30, "#3D2A20", C.orange);
      rect(ctx, C.ink, x + 24, y + 12, 23, 56);
      rect(ctx, "#5C4030", x + 28, y + 16, 15, 50);
      rect(ctx, "rgba(107,102,95,0.45)", x + 25, y + 3 - Math.floor(time * 4) % 5, 20, 7);
      return;
    }
    if (part === "base") {
      shadow(ctx, x + 4, bottom - 2, w - 8);
      foundation(ctx, x + 8, bottom, w - 16, C.woodLight);
      wall(ctx, x + 8, y + 88, 58, 66, "#5A4030", C.woodLight);
      wall(ctx, x + 78, y + 76, 110, 78, "#704E37", C.woodLight);
      wall(ctx, x + 198, y + 88, 50, 66, "#654432", C.woodLight);
      rect(ctx, "#211712", x + 18, bottom - 58, 40, 48);
      rect(ctx, C.orange, x + 23, bottom - 48, 30, 36);
      rect(ctx, C.fire, x + 30, bottom - 40 - Math.floor(time * 7) % 3, 16, 28);
      door(ctx, x + 89, bottom - 4, metrics.doorWidth, metrics.doorHeight, C.orange);
      door(ctx, x + 191, bottom - 4, metrics.doorWidth, metrics.doorHeight, C.purple);
      steps(ctx, x + 89, bottom - 5, 34, C.woodLight);
      steps(ctx, x + 191, bottom - 5, 34, C.woodLight);
      return;
    }
    rect(ctx, C.wood, x + 72, bottom - metrics.doorHeight - 14, 136, 8);
    rect(ctx, C.woodLight, x + 78, bottom - metrics.doorHeight - 12, 124, 3);
    rect(ctx, C.wood, x + 110, bottom - 30, 42, 7);
    rect(ctx, C.ink, x + 116, bottom - 23, 5, 18);
    rect(ctx, C.ink, x + 141, bottom - 23, 5, 18);
  }

  private static drawArmory(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition): void {
    const part = partOf(object);
    const metrics = HUB_BUILDING_METRICS.armory_keep;
    const x = object.x;
    const y = object.y;
    const w = metrics.width;
    const bottom = y + metrics.height;
    const center = x + w / 2;
    if (part === "back") {
      wall(ctx, center - 44, y + 30, 88, 76, C.armory, "#97816D");
      for (let merlon = -40; merlon <= 32; merlon += 16) rect(ctx, C.armory, center + merlon, y + 20, 10, 13);
      return;
    }
    if (part === "base") {
      shadow(ctx, x + 5, bottom - 2, w - 10);
      foundation(ctx, x + 10, bottom, w - 20, "#8A7565");
      wall(ctx, x + 10, y + 82, 82, 72, C.armory, "#8A7565");
      wall(ctx, x + w - 92, y + 82, 82, 72, C.armory, "#8A7565");
      window(ctx, x + 48, y + 98, "#D2A955");
      window(ctx, x + w - 48, y + 98, "#D2A955");
      door(ctx, center, bottom - 4, metrics.doorWidth, metrics.doorHeight);
      steps(ctx, center, bottom - 5, metrics.doorWidth + 8, "#8A7565");
      rect(ctx, C.gold, center - 2, y + 48, 4, 32);
      rect(ctx, C.gold, center - 15, y + 60, 30, 4);
      return;
    }
    rect(ctx, C.ink, center - 34, bottom - metrics.doorHeight - 14, 68, 12);
    rect(ctx, "#8A7565", center - 29, bottom - metrics.doorHeight - 11, 58, 4);
    for (const rackX of [x + 64, x + w - 80]) {
      rect(ctx, C.wood, rackX, bottom - 44, 16, 36);
      rect(ctx, C.gold, rackX + 7, bottom - 53, 3, 40);
    }
  }

  private static drawSpring(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
    const part = partOf(object);
    const x = object.x;
    const y = object.y;
    const w = object.width ?? 144;
    const center = x + w / 2;
    if (part === "back") {
      rect(ctx, C.ink, x + 24, y + 20, w - 48, 12);
      rect(ctx, C.stone, x + 30, y + 23, w - 60, 7);
      return;
    }
    if (part === "base") {
      shadow(ctx, x + 10, y + 82, w - 20);
      rect(ctx, C.ink, x + 14, y + 28, w - 28, 58);
      rect(ctx, C.waterDark, x + 22, y + 34, w - 44, 44);
      rect(ctx, C.water, x + 27, y + 38, w - 54, 34);
      const shimmer = Math.floor(time * 5) % 3;
      rect(ctx, "#B7FAF5", center - 22 + shimmer * 5, y + 49, 18, 2);
      rect(ctx, "#72E0E8", center + 8 - shimmer * 3, y + 61, 15, 2);
      rect(ctx, C.stone, x + 12, y + 30, 12, 52);
      rect(ctx, C.stone, x + w - 24, y + 30, 12, 52);
      return;
    }
    rect(ctx, C.ink, x + 24, y + 76, 28, 12);
    rect(ctx, C.stoneLight, x + 28, y + 78, 24, 6);
    rect(ctx, C.ink, x + w - 52, y + 76, 28, 12);
    rect(ctx, C.stoneLight, x + w - 48, y + 78, 24, 6);
    steps(ctx, center, y + 82, 34, C.stoneLight);
    for (const lampX of [x + 4, x + w - 4]) {
      rect(ctx, C.ink, lampX - 3, y + 51, 6, 25);
      rect(ctx, C.cyanLight, lampX - 5, y + 43, 10, 10);
    }
  }

  private static drawExpedition(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
    const part = partOf(object);
    const metrics = HUB_BUILDING_METRICS.expedition_structure;
    const x = object.x;
    const y = object.y;
    const w = metrics.width;
    const bottom = y + metrics.height;
    const center = x + w / 2;
    if (part === "back") {
      rect(ctx, C.purpleDark, center - 38, y + 36, 76, 70);
      const pulse = Math.floor(time * 6) % 4;
      rect(ctx, pulse < 2 ? "#8B63C4" : "#9F73D8", center - 31, y + 42, 62, 58);
      for (let band = 0; band < 5; band++) rect(ctx, "#5C3F7B", center - 27 + band * 4, y + 48 + band * 9, 54 - band * 8, 2);
      rect(ctx, C.ink, center - 66, y + 16, 132, 15);
      rect(ctx, C.archive, center - 58, y + 20, 116, 8);
      return;
    }
    if (part === "base") {
      shadow(ctx, x + 6, bottom - 9, w - 12);
      steps(ctx, center, bottom - 22, w - 82, C.archiveLight);
      for (const pierX of [x + 8, x + w - 50]) {
        wall(ctx, pierX, y + 34, 42, 82, C.archive, C.archiveLight);
        rect(ctx, C.gold, pierX + 19, y + 52, 4, 28);
        rect(ctx, C.gold, pierX + 12, y + 63, 18, 4);
      }
      return;
    }
    rect(ctx, C.ink, center - 72, y + 25, 144, 12);
    rect(ctx, C.archiveLight, center - 64, y + 28, 128, 4);
    for (const side of [-1, 1]) {
      const bx = center + side * 57;
      rect(ctx, C.ink, bx - 9, bottom - 36, 18, 28);
      rect(ctx, C.purple, bx - 6, bottom - 48, 12, 14);
    }
  }
}
