import type { Camera2D } from "../world/Camera2D";
import { getWorldLayer, type WorldMapDefinition, type WorldObjectDefinition } from "../world/WorldMap";
import { WorldMapRenderer } from "../world/WorldMapRenderer";
import { HubArchitectureRenderer } from "./HubArchitectureRenderer";
import { HubGroundRenderer } from "./HubGroundRenderer";

const COLORS = {
  void: "#09100F",
  grass: "#273A2B",
  grassDark: "#1A2A20",
  grassLight: "#38533A",
  road: "#5A5A52",
  roadDark: "#3D423F",
  roadLight: "#747267",
  plaza: "#777264",
  plazaLight: "#918A76",
  stone: "#4B5260",
  stoneDark: "#252B35",
  stoneLight: "#697482",
  archive: "#433D52",
  archiveLight: "#736783",
  wood: "#68472E",
  woodLight: "#9B6A3E",
  gold: "#D8B45C",
  cyan: "#72E0E8",
  cyanSoft: "#B7FAF5",
  blue: "#4B8FB7",
  purple: "#9B74D5",
  purpleDark: "#49345F",
  red: "#C6554E",
  orange: "#E58945",
  fire: "#FFD36B",
  water: "#4FB8C8",
  waterDark: "#256F83",
  foliage: "#315C36",
  foliageLight: "#4B7B45",
  sand: "#76664A",
} as const;

function kindOf(object: WorldObjectDefinition): string {
  const value = object.properties?.kind;
  return typeof value === "string" ? value : object.id;
}

function layerOf(object: WorldObjectDefinition): string {
  const value = object.properties?.layer;
  return typeof value === "string" ? value : "sorted";
}

function fillPixelLine(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, color: string, gap = 4): void {
  ctx.fillStyle = color;
  for (let offset = 0; offset < width; offset += gap) ctx.fillRect(x + offset, y, Math.min(2, width - offset), 1);
}

function drawStoneFrame(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, accent: string = COLORS.stoneLight): void {
  ctx.fillStyle = COLORS.stoneDark;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = COLORS.stone;
  ctx.fillRect(x + 3, y + 3, width - 6, height - 6);
  ctx.fillStyle = accent;
  ctx.fillRect(x + 4, y + 4, width - 8, 2);
  ctx.fillRect(x + 4, y + 6, 2, height - 12);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(x + 4, y + height - 7, width - 8, 3);
}


function drawGroundShadow(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, depth = 10): void {
  ctx.fillStyle = "rgba(4,7,8,0.34)";
  ctx.fillRect(Math.round(x + 5), Math.round(y), Math.max(0, Math.round(width - 10)), depth);
  ctx.fillStyle = "rgba(4,7,8,0.18)";
  ctx.fillRect(Math.round(x + 12), Math.round(y + depth), Math.max(0, Math.round(width - 24)), 3);
}

function drawStoneCourses(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  light: string,
  dark = "rgba(18,22,29,0.35)",
): void {
  for (let row = 8; row < height - 5; row += 12) {
    ctx.fillStyle = light;
    ctx.fillRect(x + 4, y + row, Math.max(0, width - 8), 1);
    ctx.fillStyle = dark;
    const stagger = Math.floor(row / 12) % 2 === 0 ? 12 : 24;
    for (let joint = stagger; joint < width - 6; joint += 32) ctx.fillRect(x + joint, y + row - 5, 1, 5);
  }
}

function drawCrenellations(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  color: string,
  merlonWidth = 9,
  gap = 6,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y + 7, width, 5);
  for (let offset = 0; offset < width; offset += merlonWidth + gap) {
    ctx.fillRect(x + offset, y, Math.min(merlonWidth, width - offset), 8);
  }
}


function drawSteppedSpire(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  topY: number,
  width: number,
  height: number,
  roof: string,
  trim: string,
): void {
  const steps = Math.max(3, Math.floor(height / 6));
  for (let step = 0; step < steps; step++) {
    const ratio = (step + 1) / steps;
    const rowWidth = Math.max(4, Math.round(width * ratio));
    const rowHeight = Math.ceil(height / steps);
    ctx.fillStyle = roof;
    ctx.fillRect(Math.round(centerX - rowWidth / 2), topY + step * rowHeight, rowWidth, rowHeight + 1);
  }
  ctx.fillStyle = trim;
  ctx.fillRect(Math.round(centerX - width / 2), topY + height - 2, width, 3);
  ctx.fillRect(Math.round(centerX - 1), topY - 7, 2, 8);
  ctx.fillRect(Math.round(centerX - 4), topY - 5, 8, 2);
}

function drawGabledRoof(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  roof: string,
  trim: string,
): void {
  const center = x + width / 2;
  const rows = Math.max(4, Math.floor(height / 4));
  for (let row = 0; row < rows; row++) {
    const ratio = (row + 1) / rows;
    const rowWidth = Math.round(width * ratio);
    ctx.fillStyle = roof;
    ctx.fillRect(Math.round(center - rowWidth / 2), y + row * 4, rowWidth, 5);
  }
  ctx.fillStyle = trim;
  ctx.fillRect(x - 2, y + height - 2, width + 4, 4);
  ctx.fillRect(Math.round(center - 2), y + 3, 4, height - 3);
}

function drawArchWindow(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  width: number,
  height: number,
  glow: string,
  frame: string = COLORS.stoneDark,
): void {
  const x = Math.round(centerX - width / 2);
  ctx.fillStyle = frame;
  ctx.fillRect(x, y + 5, width, height - 5);
  ctx.fillRect(x + 2, y + 2, width - 4, 4);
  ctx.fillRect(x + 4, y, width - 8, 3);
  ctx.fillStyle = glow;
  ctx.fillRect(x + 3, y + 6, width - 6, height - 9);
  ctx.fillStyle = "rgba(255,255,255,0.26)";
  ctx.fillRect(x + 4, y + 7, 2, Math.max(2, height - 12));
  ctx.fillStyle = frame;
  ctx.fillRect(Math.round(centerX), y + 5, 1, height - 8);
  ctx.fillRect(x + 3, y + Math.floor(height * 0.58), width - 6, 1);
}


function drawButtress(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  stone: string,
  light: string,
): void {
  ctx.fillStyle = COLORS.stoneDark;
  ctx.fillRect(x - 2, y + 6, 14, height - 6);
  ctx.fillRect(x - 5, y + height - 18, 20, 18);
  ctx.fillStyle = stone;
  ctx.fillRect(x, y + 4, 10, height - 7);
  ctx.fillRect(x - 2, y + height - 15, 14, 12);
  ctx.fillStyle = light;
  ctx.fillRect(x + 2, y + 8, 2, height - 15);
}

function drawStoneSteps(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  width: number,
  steps: number,
  stone: string,
): void {
  for (let step = 0; step < steps; step++) {
    const stepWidth = width + step * 10;
    ctx.fillStyle = step === 0 ? stone : COLORS.stoneDark;
    ctx.fillRect(Math.round(centerX - stepWidth / 2), y + step * 4, stepWidth, 5);
    ctx.fillStyle = stone;
    ctx.fillRect(Math.round(centerX - stepWidth / 2 + 2), y + step * 4, stepWidth - 4, 2);
  }
}

function drawBanner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  cloth: string,
  emblem: string,
  sway = 0,
): void {
  ctx.fillStyle = COLORS.stoneDark;
  ctx.fillRect(x - 2, y - 3, width + 4, 3);
  ctx.fillStyle = cloth;
  ctx.fillRect(x, y, width + sway, height - 6);
  ctx.fillRect(x + 3, y + height - 6, Math.max(2, width - 6 + sway), 4);
  ctx.fillStyle = emblem;
  ctx.fillRect(x + Math.floor(width / 2) - 1, y + 6, 3, Math.max(4, height - 18));
  ctx.fillRect(x + 4, y + Math.floor(height / 2) - 1, Math.max(4, width - 8), 3);
}

function drawRuneLantern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  glow: string,
  time: number,
): void {
  const pulse = Math.floor(time * 5 + x * 0.03) % 2;
  ctx.fillStyle = COLORS.stoneDark;
  ctx.fillRect(x - 4, y, 8, 22);
  ctx.fillRect(x - 8, y + 20, 16, 5);
  ctx.fillStyle = COLORS.stone;
  ctx.fillRect(x - 2, y + 2, 4, 15);
  ctx.fillStyle = glow;
  ctx.fillRect(x - 4 - pulse, y - 7 - pulse, 8 + pulse * 2, 8 + pulse * 2);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillRect(x - 1, y - 5, 2, 4);
}

export class HubWorldRenderer {
  private readonly tileRenderer = new WorldMapRenderer();
  private readonly groundRenderer = new HubGroundRenderer();

  public drawGround(ctx: CanvasRenderingContext2D, map: WorldMapDefinition, camera: Camera2D): void {
    this.groundRenderer.draw(ctx, map, camera);
    const detail = getWorldLayer(map, "groundDetail");
    if (detail) this.tileRenderer.drawLayer(ctx, map, detail, camera, this.drawDetailTile);
  }

  public drawBackTiles(ctx: CanvasRenderingContext2D, map: WorldMapDefinition, camera: Camera2D): void {
    const layer = getWorldLayer(map, "backObjects");
    if (layer) this.tileRenderer.drawLayer(ctx, map, layer, camera, this.drawBackTile);
  }

  public drawUpperTiles(ctx: CanvasRenderingContext2D, map: WorldMapDefinition, camera: Camera2D): void {
    const layer = getWorldLayer(map, "upperObjects");
    if (layer) this.tileRenderer.drawLayer(ctx, map, layer, camera, this.drawUpperTile);
  }

  public drawRoofTiles(ctx: CanvasRenderingContext2D, map: WorldMapDefinition, camera: Camera2D): void {
    const layer = getWorldLayer(map, "roof");
    if (layer) this.tileRenderer.drawLayer(ctx, map, layer, camera, this.drawRoofTile);
  }

  public drawObjects(ctx: CanvasRenderingContext2D, map: WorldMapDefinition, camera: Camera2D, layer: "back" | "front" | "upper", time: number): void {
    for (const object of map.objects) {
      if (object.type !== "decoration" || layerOf(object) !== layer || object.properties?.visible === false) continue;
      if (!camera.isVisible(object.x, object.y, object.width ?? 0, object.height ?? 0, 48)) continue;
      this.drawObject(ctx, object, time);
    }
  }

  public drawSortedObject(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
    this.drawObject(ctx, object, time);
  }

  public getVisibleSortedObjects(map: WorldMapDefinition, camera: Camera2D): WorldObjectDefinition[] {
    return map.objects.filter(object =>
      object.type !== "region"
      && object.properties?.visible !== false
      && layerOf(object) === "sorted"
      && camera.isVisible(object.x, object.y, object.width ?? 0, object.height ?? 0, 48)
    );
  }

  private readonly drawDetailTile = (
    ctx: CanvasRenderingContext2D,
    tileId: number,
    x: number,
    y: number,
  ): void => {
    if (tileId === 1) {
      ctx.fillStyle = COLORS.grassLight;
      ctx.fillRect(x + 4, y + 9, 1, 4); ctx.fillRect(x + 5, y + 7, 1, 6); ctx.fillRect(x + 7, y + 10, 1, 3);
    } else if (tileId === 2) {
      ctx.fillStyle = "rgba(28,31,31,0.52)";
      ctx.fillRect(x + 3, y + 5, 5, 1); ctx.fillRect(x + 7, y + 6, 1, 4); ctx.fillRect(x + 8, y + 9, 4, 1);
    } else if (tileId === 3) {
      ctx.fillStyle = "rgba(177,140,226,0.42)";
      ctx.fillRect(x + 7, y + 4, 2, 8); ctx.fillRect(x + 4, y + 7, 8, 2); ctx.fillRect(x + 5, y + 5, 2, 2);
    } else if (tileId === 4) {
      ctx.fillStyle = "#D9B1C9";
      ctx.fillRect(x + 5, y + 5, 2, 2); ctx.fillRect(x + 8, y + 4, 2, 2); ctx.fillRect(x + 7, y + 7, 2, 2);
      ctx.fillStyle = "#688D51"; ctx.fillRect(x + 7, y + 9, 1, 4);
    } else if (tileId === 5) {
      ctx.fillStyle = "rgba(232,137,69,0.5)";
      ctx.fillRect(x + 4, y + 10, 2, 2); ctx.fillRect(x + 10, y + 6, 1, 2);
    } else if (tileId === 6) {
      ctx.fillStyle = "rgba(114,224,232,0.46)";
      ctx.fillRect(x + 7, y + 4, 2, 8); ctx.fillRect(x + 4, y + 7, 8, 2);
    }
  };

  private readonly drawBackTile = (
    ctx: CanvasRenderingContext2D,
    tileId: number,
    x: number,
    y: number,
    tileX: number,
    tileY: number,
  ): void => {
    if (tileId === 1) {
      ctx.fillStyle = COLORS.stoneDark;
      ctx.fillRect(x, y, 16, 16);
      ctx.fillStyle = "#3B4546";
      ctx.fillRect(x + 1, y + 2, 14, 12);
      ctx.fillStyle = "#65706C";
      ctx.fillRect(x + 2, y + 3, 6, 2);
      if ((tileX + tileY) % 3 === 0) ctx.fillRect(x + 10, y + 9, 4, 1);
    } else {
      const colors: Record<number, [string, string]> = {
        2: [COLORS.archive, COLORS.archiveLight],
        3: ["#5A4030", COLORS.woodLight],
        4: ["#304A59", "#5F8798"],
        5: ["#4A413B", "#76675A"],
      };
      const [base, light] = colors[tileId] ?? [COLORS.stone, COLORS.stoneLight];
      ctx.fillStyle = COLORS.stoneDark;
      ctx.fillRect(x, y, 16, 16);
      ctx.fillStyle = base;
      ctx.fillRect(x + 1, y + 1, 14, 14);
      ctx.fillStyle = light;
      ctx.fillRect(x + 2, y + 2, 5, 1);
    }
  };

  private readonly drawUpperTile = (
    ctx: CanvasRenderingContext2D,
    tileId: number,
    x: number,
    y: number,
  ): void => {
    if (tileId !== 1) return;
    ctx.fillStyle = "rgba(7,12,8,0.42)";
    ctx.fillRect(x + 1, y + 8, 30, 19);
    ctx.fillStyle = "#203E27";
    ctx.fillRect(x, y + 4, 32, 19);
    ctx.fillStyle = COLORS.foliage;
    ctx.fillRect(x + 3, y, 24, 23);
    ctx.fillStyle = COLORS.foliageLight;
    ctx.fillRect(x + 6, y + 3, 8, 5); ctx.fillRect(x + 18, y + 8, 7, 4);
    ctx.fillStyle = "#18311F";
    ctx.fillRect(x + 12, y + 21, 7, 11);
  };

  private readonly drawRoofTile = (
    ctx: CanvasRenderingContext2D,
    tileId: number,
    x: number,
    y: number,
    tileX: number,
    tileY: number,
  ): void => {
    if (tileId !== 1) return;
    // Only the inward lip is foreground. This uses the actual roof layer rather
    // than re-drawing building silhouettes behind the object renderer.
    const edge = tileX === 1 || tileY === 1 || tileX === 78 || tileY === 58;
    if (!edge) return;
    ctx.fillStyle = "rgba(13,18,20,0.72)";
    if (tileY === 1) ctx.fillRect(x, y + 11, 16, 5);
    else if (tileY === 58) ctx.fillRect(x, y, 16, 5);
    else if (tileX === 1) ctx.fillRect(x + 11, y, 5, 16);
    else ctx.fillRect(x, y, 5, 16);
  };

  private drawObject(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
    if (object.properties?.visible === false) return;
    if (HubArchitectureRenderer.draw(ctx, object, time)) return;
    const kind = kindOf(object);
    if (kind === "plaza_banners") this.drawPlazaBanners(ctx, object, time);
    else if (kind === "district_gate") this.drawDistrictGate(ctx, object, time);
    else if (kind === "waystone") this.drawWaystone(ctx, object, time);
    else if (kind === "reforge_stone") this.drawReforgeStone(ctx, object, time);
    else if (kind === "trial_altar") this.drawTrialAltar(ctx, object, time);
    else if (kind === "training_marker") this.drawTrainingMarker(ctx, object);
    else if (kind === "garden_wish") this.drawGardenWish(ctx, object, time);
  }

  private drawPlazaBanners(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
    const y = object.y + 6;
    const width = object.width ?? 400;
    const centerX = object.x + width / 2;

    // Broken ceremonial colonnade marks the north entrance to the rebirth court.
    ctx.fillStyle = "rgba(4,7,8,0.25)";
    ctx.fillRect(object.x + 18, y + 61, width - 36, 7);
    for (const pillarX of [object.x + 28, object.x + 112, object.x + width - 116, object.x + width - 32]) {
      ctx.fillStyle = COLORS.stoneDark;
      ctx.fillRect(pillarX - 6, y + 8, 12, 56);
      ctx.fillRect(pillarX - 11, y + 59, 22, 6);
      ctx.fillStyle = COLORS.stone;
      ctx.fillRect(pillarX - 3, y + 12, 6, 43);
      ctx.fillStyle = COLORS.stoneLight;
      ctx.fillRect(pillarX - 1, y + 14, 2, 37);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(pillarX - 5, y + 2, 10, 9);
      ctx.fillStyle = COLORS.cyanSoft;
      ctx.fillRect(pillarX - 2, y - 2, 4, 8);
    }

    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(centerX - 62, y + 9, 124, 7);
    ctx.fillRect(centerX - 50, y + 3, 100, 7);
    ctx.fillStyle = COLORS.stone;
    ctx.fillRect(centerX - 45, y + 5, 90, 3);
    ctx.fillStyle = COLORS.gold;
    fillPixelLine(ctx, centerX - 39, y + 10, 78, "rgba(216,180,92,0.8)", 9);

    for (let i = 0; i < 4; i++) {
      const bannerX = object.x + 54 + i * 92;
      const sway = Math.round(Math.sin(time * 2 + i) * 2);
      drawBanner(
        ctx,
        bannerX,
        y + 22,
        20,
        36,
        i % 2 === 0 ? COLORS.purpleDark : "#7D302F",
        COLORS.gold,
        sway,
      );
    }
  }

  private drawDistrictGate(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
    const { x, y } = object;
    const width = object.width ?? 80;
    const height = object.height ?? 80;
    const centerX = x + width / 2;
    const bottom = y + height;
    const accent = typeof object.properties?.accent === "string" ? object.properties.accent : COLORS.gold;
    const emblem = typeof object.properties?.emblem === "string" ? object.properties.emblem : "archive";

    drawGroundShadow(ctx, x + 3, bottom - 5, width - 6, 7);
    for (const pillarX of [x + 7, x + width - 19]) {
      ctx.fillStyle = COLORS.stoneDark;
      ctx.fillRect(pillarX - 3, y + 14, 18, height - 17);
      ctx.fillRect(pillarX - 7, bottom - 11, 26, 11);
      ctx.fillStyle = COLORS.stone;
      ctx.fillRect(pillarX, y + 11, 12, height - 17);
      ctx.fillStyle = COLORS.stoneLight;
      ctx.fillRect(pillarX + 2, y + 16, 2, height - 26);
      ctx.fillStyle = accent;
      ctx.fillRect(pillarX + 2, y + 4, 8, 10);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(pillarX + 5, y + 6, 2, 5);
    }

    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(x + 15, y + 14, width - 30, 9);
    ctx.fillRect(x + 22, y + 8, width - 44, 8);
    ctx.fillStyle = COLORS.stone;
    ctx.fillRect(x + 18, y + 16, width - 36, 4);
    ctx.fillStyle = accent;
    ctx.fillRect(centerX - 13, y + 3, 26, 16);
    ctx.fillStyle = COLORS.stoneDark;
    if (emblem === "archive") {
      ctx.fillRect(centerX - 2, y + 6, 4, 10);
      ctx.fillRect(centerX - 8, y + 10, 16, 3);
    } else if (emblem === "observatory") {
      ctx.fillRect(centerX - 1, y + 5, 3, 12);
      ctx.fillRect(centerX - 7, y + 10, 15, 3);
      ctx.fillRect(centerX - 4, y + 7, 9, 8);
    } else if (emblem === "workshop") {
      ctx.fillRect(centerX - 8, y + 7, 16, 4);
      ctx.fillRect(centerX - 3, y + 6, 5, 11);
      ctx.fillRect(centerX + 5, y + 11, 5, 3);
    } else if (emblem === "armory") {
      ctx.fillRect(centerX - 2, y + 5, 4, 12);
      ctx.fillRect(centerX - 7, y + 8, 14, 3);
      ctx.fillRect(centerX - 5, y + 13, 10, 3);
    } else if (emblem === "garden") {
      ctx.fillRect(centerX - 1, y + 8, 3, 9);
      ctx.fillRect(centerX - 7, y + 7, 6, 4);
      ctx.fillRect(centerX + 2, y + 5, 6, 5);
    } else {
      ctx.fillRect(centerX - 7, y + 7, 14, 10);
      ctx.fillStyle = accent;
      ctx.fillRect(centerX - 4, y + 10, 8, 4);
    }

    const sway = Math.round(Math.sin(time * 2.2 + x * 0.01));
    drawBanner(ctx, x + 1, y + 29, 12, 25, accent, COLORS.gold, sway);
    drawBanner(ctx, x + width - 13, y + 29, 12, 25, accent, COLORS.gold, -sway);
  }

  private drawWaystone(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
    const centerX = object.x + (object.width ?? 48) / 2;
    const bottom = object.y + (object.height ?? 64);
    const accent = typeof object.properties?.accent === "string" ? object.properties.accent : COLORS.purple;
    drawGroundShadow(ctx, centerX - 18, bottom - 3, 36, 6);
    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(centerX - 15, bottom - 12, 30, 12);
    ctx.fillRect(centerX - 9, bottom - 48, 18, 37);
    ctx.fillStyle = COLORS.stone;
    ctx.fillRect(centerX - 5, bottom - 44, 10, 30);
    ctx.fillStyle = COLORS.stoneLight;
    ctx.fillRect(centerX - 3, bottom - 40, 2, 22);
    ctx.fillStyle = accent;
    ctx.fillRect(centerX - 10, bottom - 53, 20, 10);
    ctx.fillRect(centerX - 18, bottom - 35, 36, 5);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(centerX - 2, bottom - 50, 4, 26);
    ctx.fillRect(centerX - 8, bottom - 39, 16, 4);
    const glint = Math.floor(time * 4) % 2;
    ctx.fillStyle = glint === 0 ? COLORS.cyanSoft : accent;
    ctx.fillRect(centerX - 2, bottom - 59, 4, 7);
  }

  private drawReforgeStone(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
    const cx = object.x + (object.width ?? 64) / 2;
    const cy = object.y + (object.height ?? 64) / 2;
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(cx - 25, cy + 23, 50, 8);
    ctx.fillStyle = COLORS.stoneDark; ctx.fillRect(cx - 19, cy - 20, 38, 45);
    ctx.fillStyle = COLORS.stone; ctx.fillRect(cx - 14, cy - 16, 28, 36);
    ctx.fillStyle = Math.floor(time * 4) % 2 === 0 ? COLORS.gold : COLORS.orange;
    ctx.fillRect(cx - 2, cy - 12, 4, 24); ctx.fillRect(cx - 10, cy - 2, 20, 4);
  }

  private drawTrialAltar(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
    const cx = object.x + (object.width ?? 96) / 2;
    const bottom = object.y + (object.height ?? 96);
    ctx.fillStyle = COLORS.stoneDark; ctx.fillRect(cx - 44, bottom - 18, 88, 18); ctx.fillRect(cx - 32, bottom - 32, 64, 14); ctx.fillRect(cx - 18, bottom - 62, 36, 30);
    ctx.fillStyle = COLORS.red; ctx.fillRect(cx - 12, bottom - 57, 24, 20);
    ctx.fillStyle = Math.floor(time * 6) % 2 === 0 ? COLORS.fire : COLORS.orange;
    ctx.fillRect(cx - 4, bottom - 72, 8, 18); ctx.fillRect(cx - 9, bottom - 66, 18, 8);
  }

  private drawTrainingMarker(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition): void {
    const cx = object.x + (object.width ?? 80) / 2;
    const bottom = object.y + (object.height ?? 80);
    ctx.fillStyle = COLORS.wood; ctx.fillRect(cx - 4, bottom - 62, 8, 60); ctx.fillRect(cx - 24, bottom - 52, 48, 7);
    ctx.fillStyle = "#82624A"; ctx.fillRect(cx - 15, bottom - 47, 30, 29);
    ctx.fillStyle = COLORS.red; ctx.fillRect(cx - 8, bottom - 42, 16, 16);
    ctx.fillStyle = COLORS.fire; ctx.fillRect(cx - 3, bottom - 37, 6, 6);
  }

  private drawGardenWish(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
    const cx = object.x + (object.width ?? 96) / 2;
    const cy = object.y + (object.height ?? 80) / 2 + 12;
    ctx.fillStyle = COLORS.stoneDark; ctx.fillRect(cx - 44, cy - 15, 88, 33); ctx.fillRect(cx - 36, cy - 25, 72, 52);
    ctx.fillStyle = COLORS.waterDark; ctx.fillRect(cx - 30, cy - 18, 60, 32);
    ctx.fillStyle = COLORS.water; ctx.fillRect(cx - 26, cy - 15, 52, 3);
    ctx.fillStyle = COLORS.stone; ctx.fillRect(cx - 6, cy - 48, 12, 36);
    ctx.fillStyle = Math.floor(time * 5) % 2 === 0 ? COLORS.cyan : COLORS.cyanSoft; ctx.fillRect(cx - 2, cy - 55, 4, 12);
  }
}
