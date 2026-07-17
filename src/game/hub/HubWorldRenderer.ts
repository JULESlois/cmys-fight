import type { Camera2D } from "../world/Camera2D";
import { getWorldLayer, type WorldMapDefinition, type WorldObjectDefinition } from "../world/WorldMap";
import { WorldMapRenderer } from "../world/WorldMapRenderer";
import { HubGroundTile } from "./HubMap";

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

  public drawGround(ctx: CanvasRenderingContext2D, map: WorldMapDefinition, camera: Camera2D): void {
    const ground = getWorldLayer(map, "ground");
    const detail = getWorldLayer(map, "groundDetail");
    if (ground) this.tileRenderer.drawLayer(ctx, map, ground, camera, this.drawGroundTile);
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

  public drawObjects(ctx: CanvasRenderingContext2D, map: WorldMapDefinition, camera: Camera2D, layer: "back" | "upper", time: number): void {
    for (const object of map.objects) {
      if (object.type !== "decoration" || layerOf(object) !== layer) continue;
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
      && layerOf(object) === "sorted"
      && camera.isVisible(object.x, object.y, object.width ?? 0, object.height ?? 0, 48)
    );
  }

  private readonly drawGroundTile = (
    ctx: CanvasRenderingContext2D,
    tileId: number,
    x: number,
    y: number,
    tileX: number,
    tileY: number,
  ): void => {
    const alternate = (tileX + tileY) % 2 === 0;
    let base: string = COLORS.grass;
    let edge: string = COLORS.grassDark;
    let glint: string = COLORS.grassLight;
    if (tileId === HubGroundTile.road) {
      base = alternate ? COLORS.road : "#55574F";
      edge = COLORS.roadDark;
      glint = COLORS.roadLight;
    } else if (tileId === HubGroundTile.plaza) {
      base = alternate ? COLORS.plaza : "#716C60";
      edge = "#514F48";
      glint = COLORS.plazaLight;
    } else if (tileId === HubGroundTile.workshop) {
      base = alternate ? "#5A4637" : "#554032";
      edge = "#382A24";
      glint = "#80604A";
    } else if (tileId === HubGroundTile.archive) {
      base = alternate ? COLORS.archive : "#3D384B";
      edge = "#292433";
      glint = COLORS.archiveLight;
    } else if (tileId === HubGroundTile.observatory) {
      base = alternate ? "#344C5A" : "#304652";
      edge = "#1D3039";
      glint = "#52778A";
    } else if (tileId === HubGroundTile.armory) {
      base = alternate ? "#574B42" : "#50463E";
      edge = "#332D2A";
      glint = "#79685B";
    } else if (tileId === HubGroundTile.garden) {
      base = alternate ? "#2F4A31" : "#2A432D";
      edge = "#1D3021";
      glint = "#466A43";
    } else if (tileId === HubGroundTile.training) {
      base = alternate ? COLORS.sand : "#6F6048";
      edge = "#4E422F";
      glint = "#95805A";
    } else if (tileId === HubGroundTile.expedition) {
      base = alternate ? "#35313D" : "#302D38";
      edge = "#1E1A25";
      glint = "#5D526C";
    }
    ctx.fillStyle = base;
    ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = edge;
    ctx.fillRect(x, y + 15, 16, 1);
    ctx.fillRect(x + 15, y, 1, 16);
    if (tileId !== HubGroundTile.sanctuary) {
      ctx.fillStyle = glint;
      ctx.fillRect(x + 2, y + 2, 5, 1);
    }
  };

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

  private drawObject(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
    const kind = kindOf(object);
    if (kind === "archive_keep") this.drawArchiveKeep(ctx, object);
    else if (kind === "observatory_keep") this.drawObservatoryKeep(ctx, object, time);
    else if (kind === "workshop_keep") this.drawWorkshopKeep(ctx, object, time);
    else if (kind === "armory_keep") this.drawArmoryKeep(ctx, object);
    else if (kind === "expedition_backdrop") this.drawExpeditionBackdrop(ctx, object);
    else if (kind === "plaza_banners") this.drawPlazaBanners(ctx, object, time);
    else if (kind === "district_gate") this.drawDistrictGate(ctx, object, time);
    else if (kind === "waystone") this.drawWaystone(ctx, object, time);
    else if (kind === "rebirth_spring") this.drawRebirthSpring(ctx, object, time);
    else if (kind === "expedition_gate") this.drawExpeditionGate(ctx, object, time);
    else if (kind === "blacksmith_forge") this.drawForge(ctx, object, time);
    else if (kind === "enchanting_table") this.drawEnchantingTable(ctx, object, time);
    else if (kind === "reforge_stone") this.drawReforgeStone(ctx, object, time);
    else if (kind === "archive_monument") this.drawArchiveMonument(ctx, object);
    else if (kind === "codex_lectern") this.drawCodexLectern(ctx, object, time);
    else if (kind === "honor_wall") this.drawHonorWall(ctx, object);
    else if (kind === "astral_console") this.drawAstralConsole(ctx, object, time);
    else if (kind === "armory_rack") this.drawArmoryRack(ctx, object);
    else if (kind === "trial_altar") this.drawTrialAltar(ctx, object, time);
    else if (kind === "training_marker") this.drawTrainingMarker(ctx, object);
    else if (kind === "garden_wish") this.drawGardenWish(ctx, object, time);
  }

  private drawArchiveKeep(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition): void {
    const { x, y } = object;
    const w = object.width ?? 320;
    const baseY = y + 150;
    drawGroundShadow(ctx, x + 4, baseY - 2, w - 8, 12);

    // Recessed side wings create a broad archive courtyard instead of one flat facade.
    for (const wingX of [x + 42, x + w - 124]) {
      drawStoneFrame(ctx, wingX, y + 70, 82, 76, COLORS.archiveLight);
      drawStoneCourses(ctx, wingX + 2, y + 72, 78, 70, "rgba(155,132,177,0.24)");
      drawCrenellations(ctx, wingX + 3, y + 61, 76, COLORS.archive, 9, 6);
      drawArchWindow(ctx, wingX + 22, y + 88, 12, 27, "#785FA2");
      drawArchWindow(ctx, wingX + 60, y + 88, 12, 27, "#785FA2");
      drawBanner(ctx, wingX + 33, y + 112, 16, 30, COLORS.archive, COLORS.gold);
    }

    // Side towers lean outward through their buttresses and pointed roofs.
    const sideTowers = [x + 8, x + w - 58];
    sideTowers.forEach((towerX, index) => {
      drawStoneFrame(ctx, towerX, y + 42, 50, 108, COLORS.archiveLight);
      drawStoneCourses(ctx, towerX + 2, y + 45, 46, 100, "rgba(155,132,177,0.28)");
      drawSteppedSpire(ctx, towerX + 25, y + 5, 56, 39, "#2D273A", COLORS.archiveLight);
      drawButtress(ctx, towerX - 2, y + 68, 82, COLORS.archive, COLORS.archiveLight);
      drawButtress(ctx, towerX + 42, y + 68, 82, COLORS.archive, COLORS.archiveLight);
      drawArchWindow(ctx, towerX + 25, y + 62, 14, 34, index === 0 ? "#705B98" : "#7E67A8");
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(towerX + 22, y + 108, 6, 18);
      ctx.fillRect(towerX + 17, y + 114, 16, 4);
    });

    // The central tower carries the archive symbol and dominates the silhouette.
    const centerX = x + w / 2;
    drawStoneFrame(ctx, centerX - 45, y + 28, 90, 122, COLORS.archiveLight);
    drawStoneCourses(ctx, centerX - 43, y + 31, 86, 114, "rgba(155,132,177,0.3)");
    drawSteppedSpire(ctx, centerX, y - 3, 94, 34, "#312A42", COLORS.gold);
    drawButtress(ctx, centerX - 51, y + 54, 96, COLORS.archive, COLORS.archiveLight);
    drawButtress(ctx, centerX + 41, y + 54, 96, COLORS.archive, COLORS.archiveLight);
    drawArchWindow(ctx, centerX, y + 48, 20, 38, "#9A7BC6", COLORS.archive);

    // Deep arched entrance, lintel, and steps keep the functional doorway readable.
    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(centerX - 25, y + 103, 50, 47);
    ctx.fillRect(centerX - 21, y + 96, 42, 10);
    ctx.fillRect(centerX - 15, y + 91, 30, 7);
    ctx.fillStyle = "#1A1523";
    ctx.fillRect(centerX - 18, y + 108, 36, 42);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(centerX - 2, y + 112, 4, 25);
    ctx.fillRect(centerX - 10, y + 120, 20, 4);
    drawStoneSteps(ctx, centerX, y + 146, 50, 3, COLORS.archiveLight);

    // Inscribed archive band and small reading lamps tie the wings to the entrance.
    ctx.fillStyle = COLORS.gold;
    fillPixelLine(ctx, x + 72, y + 75, w - 144, "rgba(216,180,92,0.72)", 12);
    for (const lampX of [centerX - 61, centerX + 61]) {
      ctx.fillStyle = COLORS.stoneDark;
      ctx.fillRect(lampX - 2, y + 112, 4, 24);
      ctx.fillStyle = "#D9B7FF";
      ctx.fillRect(lampX - 4, y + 105, 8, 9);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(lampX - 1, y + 107, 2, 4);
    }
  }

  private drawObservatoryKeep(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
    const { x, y } = object;
    const w = object.width ?? 256;
    const centerX = x + w / 2;
    const baseY = y + 150;
    drawGroundShadow(ctx, x + 10, baseY - 2, w - 20, 12);

    // Broad stepped plinth separates the observatory from the surrounding road.
    drawStoneSteps(ctx, centerX, y + 138, w - 70, 4, "#5C7F8E");
    drawStoneFrame(ctx, x + 24, y + 72, w - 48, 70, "#658CA0");
    drawStoneCourses(ctx, x + 26, y + 74, w - 52, 64, "rgba(114,224,232,0.16)");

    // Two crystal pylons frame the astronomical axis.
    for (const towerX of [x + 12, x + w - 58]) {
      drawStoneFrame(ctx, towerX, y + 58, 46, 84, "#658CA0");
      drawButtress(ctx, towerX - 4, y + 82, 60, "#365866", "#658CA0");
      drawButtress(ctx, towerX + 38, y + 82, 60, "#365866", "#658CA0");
      ctx.fillStyle = COLORS.stoneDark;
      ctx.fillRect(towerX + 9, y + 46, 28, 17);
      ctx.fillStyle = "#416C7D";
      ctx.fillRect(towerX + 13, y + 41, 20, 19);
      ctx.fillStyle = COLORS.cyanSoft;
      ctx.fillRect(towerX + 21, y + 30, 4, 25);
      ctx.fillRect(towerX + 17, y + 39, 12, 4);
      drawArchWindow(ctx, towerX + 23, y + 80, 14, 28, "#72D7E2", "#263D48");
    }

    // Central drum and stepped copper-blue dome form a unique silhouette.
    drawStoneFrame(ctx, centerX - 58, y + 48, 116, 94, "#6D95A6");
    drawStoneCourses(ctx, centerX - 56, y + 50, 112, 88, "rgba(164,225,232,0.2)");
    const domeRows = [112, 104, 92, 76, 56, 34, 14];
    domeRows.forEach((rowWidth, row) => {
      ctx.fillStyle = row % 2 === 0 ? "#335869" : "#3D6879";
      ctx.fillRect(Math.round(centerX - rowWidth / 2), y + 20 + row * 5, rowWidth, 6);
    });
    ctx.fillStyle = COLORS.cyan;
    ctx.fillRect(centerX - 2, y + 12, 4, 16);
    ctx.fillRect(centerX - 7, y + 15, 14, 3);

    // Mechanical equatorial ring is animated without blurring the pixel surface.
    const orbitStep = Math.floor(time * 6) % 24;
    ctx.strokeStyle = "#7FDCE5";
    ctx.lineWidth = 2;
    ctx.strokeRect(centerX - 38, y + 33, 76, 31);
    ctx.strokeStyle = "rgba(155,116,213,0.82)";
    ctx.strokeRect(centerX - 29, y + 26, 58, 46);
    ctx.fillStyle = COLORS.cyanSoft;
    ctx.fillRect(centerX - 36 + orbitStep * 3, y + 31, 4, 4);
    ctx.fillStyle = COLORS.purple;
    ctx.fillRect(centerX + 26 - orbitStep * 2, y + 65, 4, 4);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(centerX - 3, y + 44, 6, 6);

    // Deep central doorway, paired windows, and zodiac band clarify the facade.
    drawArchWindow(ctx, centerX - 33, y + 82, 14, 29, "#5CCBD7", "#263D48");
    drawArchWindow(ctx, centerX + 33, y + 82, 14, 29, "#5CCBD7", "#263D48");
    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(centerX - 18, y + 105, 36, 37);
    ctx.fillRect(centerX - 13, y + 99, 26, 8);
    ctx.fillStyle = "#18272E";
    ctx.fillRect(centerX - 12, y + 109, 24, 33);
    ctx.fillStyle = COLORS.cyan;
    for (let rune = -42; rune <= 42; rune += 14) {
      ctx.fillRect(centerX + rune - 1, y + 73, 3, 3);
      ctx.fillRect(centerX + rune, y + 69, 1, 11);
    }

    drawBanner(ctx, x + 67, y + 108, 14, 28, "#315E72", COLORS.cyanSoft);
    drawBanner(ctx, x + w - 81, y + 108, 14, 28, "#315E72", COLORS.cyanSoft);
  }

  private drawWorkshopKeep(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
    const { x, y } = object;
    const w = object.width ?? 288;
    const baseY = y + 160;
    drawGroundShadow(ctx, x + 3, baseY - 2, w - 6, 12);

    // Main forge hall: stone lower wall, timber frame, and a high asymmetrical roof.
    drawStoneFrame(ctx, x + 58, y + 56, w - 82, 101, "#8D6747");
    drawStoneCourses(ctx, x + 60, y + 58, w - 86, 94, "rgba(229,137,69,0.16)");
    drawGabledRoof(ctx, x + 44, y + 24, w - 55, 40, "#493225", COLORS.woodLight);
    ctx.fillStyle = COLORS.wood;
    for (let beam = x + 73; beam < x + w - 22; beam += 43) {
      ctx.fillRect(beam, y + 61, 5, 92);
      ctx.fillRect(beam - 8, y + 84, 21, 4);
    }

    // Massive furnace tower establishes the hot-work side of the yard.
    drawStoneFrame(ctx, x + 3, y + 72, 92, 85, COLORS.woodLight);
    drawGabledRoof(ctx, x - 4, y + 45, 106, 33, "#3D2A20", COLORS.orange);
    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(x + 16, y + 17, 26, 61);
    ctx.fillRect(x + 56, y + 29, 18, 46);
    ctx.fillStyle = "#5C4030";
    ctx.fillRect(x + 20, y + 21, 18, 54);
    ctx.fillRect(x + 60, y + 33, 10, 40);
    ctx.fillStyle = "rgba(90,82,73,0.55)";
    const smokeRise = Math.floor(time * 7) % 12;
    ctx.fillRect(x + 15, y + 6 - smokeRise, 18, 8);
    ctx.fillRect(x + 28, y - 5 - smokeRise, 13, 9);
    ctx.fillRect(x + 54, y + 17 - smokeRise / 2, 16, 7);

    // Furnace mouth emits layered light instead of a single flat rectangle.
    ctx.fillStyle = "#211712";
    ctx.fillRect(x + 20, y + 101, 56, 48);
    ctx.fillRect(x + 25, y + 94, 46, 10);
    const firePulse = Math.floor(time * 8) % 3;
    ctx.fillStyle = COLORS.red;
    ctx.fillRect(x + 27, y + 112, 42, 32);
    ctx.fillStyle = COLORS.orange;
    ctx.fillRect(x + 31, y + 107 - firePulse, 34, 35 + firePulse);
    ctx.fillStyle = COLORS.fire;
    ctx.fillRect(x + 38, y + 103 - firePulse * 2, 20, 37 + firePulse);
    ctx.fillStyle = "#FFF2B0";
    ctx.fillRect(x + 45, y + 119, 8, 19);

    // Enchanting annex uses a lighter roof and suspended crystal crane.
    const annexX = x + w - 96;
    drawStoneFrame(ctx, annexX, y + 82, 92, 75, "#8D6747");
    drawGabledRoof(ctx, annexX - 5, y + 58, 102, 30, "#513729", COLORS.purple);
    drawArchWindow(ctx, annexX + 26, y + 104, 14, 27, "#9B74D5", "#2E2238");
    drawArchWindow(ctx, annexX + 66, y + 104, 14, 27, "#72E0E8", "#2E2238");

    // Exterior gantry and hanging ingot make the courtyard read as a working forge.
    ctx.fillStyle = COLORS.wood;
    ctx.fillRect(x + w - 30, y + 36, 7, 116);
    ctx.fillRect(x + w - 78, y + 40, 58, 7);
    ctx.fillRect(x + w - 74, y + 47, 5, 24);
    ctx.fillStyle = COLORS.stoneLight;
    ctx.fillRect(x + w - 76, y + 68, 9, 18);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x + w - 74, y + 72, 5, 10);

    // Front workbench, stacked billets, and braces link the building to its interactables.
    ctx.fillStyle = COLORS.wood;
    ctx.fillRect(x + 103, y + 128, 70, 9);
    ctx.fillRect(x + 110, y + 137, 7, 20);
    ctx.fillRect(x + 160, y + 137, 7, 20);
    ctx.fillStyle = COLORS.stoneLight;
    for (let billet = 0; billet < 4; billet++) ctx.fillRect(x + 114 + billet * 12, y + 120 - billet % 2 * 3, 9, 5);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x + 136, y + 99, 16, 5);
    ctx.fillRect(x + 142, y + 92, 4, 18);

    drawBanner(ctx, x + 102, y + 70, 16, 32, "#7D3E2C", COLORS.fire);
  }

  private drawArmoryKeep(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition): void {
    const { x, y } = object;
    const w = object.width ?? 272;
    const centerX = x + w / 2;
    const baseY = y + 160;
    drawGroundShadow(ctx, x + 2, baseY - 2, w - 4, 12);

    // Long fortified hall and side bastions establish a defensive silhouette.
    drawStoneFrame(ctx, x + 24, y + 68, w - 48, 88, "#8A7565");
    drawStoneCourses(ctx, x + 26, y + 70, w - 52, 82, "rgba(216,180,92,0.15)");
    drawCrenellations(ctx, x + 25, y + 58, w - 50, "#4D4540", 10, 6);

    for (const bastionX of [x + 2, x + w - 58]) {
      drawStoneFrame(ctx, bastionX, y + 54, 56, 102, "#8A7565");
      drawCrenellations(ctx, bastionX + 1, y + 43, 54, "#4A413B", 9, 5);
      drawButtress(ctx, bastionX - 3, y + 82, 74, "#5A514A", "#8A7565");
      drawButtress(ctx, bastionX + 48, y + 82, 74, "#5A514A", "#8A7565");
      ctx.fillStyle = COLORS.stoneDark;
      ctx.fillRect(bastionX + 15, y + 80, 5, 32);
      ctx.fillRect(bastionX + 36, y + 80, 5, 32);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(bastionX + 17, y + 84, 1, 24);
      ctx.fillRect(bastionX + 38, y + 84, 1, 24);
    }

    // Central gatehouse rises above the hall and anchors the armory entrance.
    drawStoneFrame(ctx, centerX - 48, y + 30, 96, 126, "#9B856F");
    drawStoneCourses(ctx, centerX - 46, y + 32, 92, 119, "rgba(234,202,137,0.16)");
    drawCrenellations(ctx, centerX - 49, y + 18, 98, "#4A413B", 11, 5);
    drawButtress(ctx, centerX - 54, y + 61, 95, "#5B5048", "#9B856F");
    drawButtress(ctx, centerX + 44, y + 61, 95, "#5B5048", "#9B856F");

    // Shield-and-spear crest communicates the building purpose before interaction.
    ctx.fillStyle = COLORS.red;
    ctx.fillRect(centerX - 20, y + 46, 40, 38);
    ctx.fillRect(centerX - 15, y + 82, 30, 7);
    ctx.fillStyle = "#8E3434";
    ctx.fillRect(centerX - 14, y + 51, 28, 29);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(centerX - 2, y + 50, 4, 33);
    ctx.fillRect(centerX - 12, y + 62, 24, 4);
    ctx.fillRect(centerX - 18, y + 44, 3, 42);
    ctx.fillRect(centerX + 15, y + 44, 3, 42);

    // Deep portcullis entrance and broad steps create usable architectural depth.
    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(centerX - 26, y + 104, 52, 52);
    ctx.fillRect(centerX - 20, y + 97, 40, 9);
    ctx.fillStyle = "#211D1C";
    ctx.fillRect(centerX - 19, y + 109, 38, 47);
    ctx.fillStyle = "#6D645C";
    for (let bar = -14; bar <= 14; bar += 7) ctx.fillRect(centerX + bar, y + 111, 2, 42);
    for (let rail = 0; rail < 3; rail++) ctx.fillRect(centerX - 18, y + 118 + rail * 13, 36, 2);
    drawStoneSteps(ctx, centerX, y + 152, 58, 3, "#8A7565");

    // Side weapon galleries and banners make the long hall visually active.
    for (let rack = 0; rack < 4; rack++) {
      const rackX = x + 63 + rack * 48;
      ctx.fillStyle = COLORS.wood;
      ctx.fillRect(rackX, y + 101, 32, 5);
      ctx.fillRect(rackX + 3, y + 106, 4, 27);
      ctx.fillRect(rackX + 25, y + 106, 4, 27);
      ctx.fillStyle = rack % 2 === 0 ? COLORS.stoneLight : COLORS.gold;
      ctx.fillRect(rackX + 14, y + 91, 3, 37);
      ctx.fillRect(rackX + 8, y + 98, 15, 3);
    }
    drawBanner(ctx, x + 66, y + 70, 16, 38, "#7D302F", COLORS.gold);
    drawBanner(ctx, x + w - 82, y + 70, 16, 38, "#7D302F", COLORS.gold);
  }

  private drawExpeditionBackdrop(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition): void {
    const { x, y } = object;
    const w = object.width ?? 208;
    const centerX = x + w / 2;
    const bottom = y + (object.height ?? 128);
    drawGroundShadow(ctx, x, bottom - 8, w, 12);

    // Ruined outer wall and elevated threshold make the gate feel embedded in the sanctuary.
    ctx.fillStyle = "rgba(7,5,11,0.48)";
    ctx.fillRect(x + 18, bottom - 50, w - 36, 44);
    drawStoneSteps(ctx, centerX, bottom - 22, w - 64, 4, COLORS.archiveLight);

    for (const side of [-1, 1] as const) {
      const pierX = side < 0 ? x + 2 : x + w - 50;
      drawStoneFrame(ctx, pierX, bottom - 110, 48, 102, COLORS.archiveLight);
      drawCrenellations(ctx, pierX + 1, bottom - 121, 46, COLORS.archive, 8, 5);
      drawButtress(ctx, pierX - 4, bottom - 82, 74, COLORS.archive, COLORS.archiveLight);
      drawButtress(ctx, pierX + 40, bottom - 82, 74, COLORS.archive, COLORS.archiveLight);
      ctx.fillStyle = COLORS.stoneDark;
      ctx.fillRect(pierX + 15, bottom - 88, 18, 45);
      ctx.fillStyle = COLORS.purpleDark;
      ctx.fillRect(pierX + 20, bottom - 83, 8, 34);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(pierX + 22, bottom - 78, 4, 20);
      ctx.fillRect(pierX + 17, bottom - 70, 14, 4);
    }

    // Broken lintel and suspended chains frame the portal without covering it.
    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(centerX - 66, bottom - 127, 132, 15);
    ctx.fillStyle = COLORS.archive;
    ctx.fillRect(centerX - 58, bottom - 123, 116, 8);
    ctx.fillStyle = COLORS.archiveLight;
    ctx.fillRect(centerX - 46, bottom - 120, 32, 3);
    ctx.fillRect(centerX + 15, bottom - 120, 31, 3);
    ctx.fillStyle = "#26202D";
    for (const chainX of [centerX - 57, centerX + 55]) {
      for (let link = 0; link < 6; link++) {
        ctx.fillRect(chainX + (link % 2), bottom - 110 + link * 9, 3, 6);
      }
    }

    // Watch braziers signal that this is the only active route out of the safe hub.
    for (const brazierX of [x + 26, x + w - 26]) {
      ctx.fillStyle = COLORS.stoneDark;
      ctx.fillRect(brazierX - 8, bottom - 26, 16, 10);
      ctx.fillRect(brazierX - 3, bottom - 16, 6, 11);
      ctx.fillStyle = COLORS.purple;
      ctx.fillRect(brazierX - 6, bottom - 36, 12, 12);
      ctx.fillStyle = COLORS.cyanSoft;
      ctx.fillRect(brazierX - 2, bottom - 40, 4, 10);
    }
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

  private drawRebirthSpring(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
    const cx = object.x + (object.width ?? 144) / 2;
    const cy = object.y + (object.height ?? 112) / 2 + 7;
    const pulse = Math.floor(time * 6) % 3;

    // Outer ritual court and south-facing access steps establish the fountain as the Hub core.
    drawGroundShadow(ctx, cx - 84, cy + 39, 168, 11);
    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(cx - 82, cy - 35, 164, 75);
    ctx.fillRect(cx - 90, cy - 21, 180, 46);
    ctx.fillStyle = "#555E67";
    ctx.fillRect(cx - 78, cy - 31, 156, 67);
    ctx.fillRect(cx - 86, cy - 17, 172, 38);
    ctx.fillStyle = COLORS.stoneLight;
    ctx.fillRect(cx - 74, cy - 28, 148, 3);
    ctx.fillRect(cx - 82, cy - 14, 164, 3);
    ctx.fillStyle = "rgba(114,224,232,0.32)";
    for (let rune = -60; rune <= 60; rune += 20) {
      ctx.fillRect(cx + rune - 2, cy + 29, 5, 2);
      ctx.fillRect(cx + rune, cy + 25, 1, 10);
    }
    drawStoneSteps(ctx, cx, cy + 34, 72, 4, COLORS.stoneLight);

    // Octagonal-looking basin built from stepped rectangular bands.
    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(cx - 68, cy - 23, 136, 58);
    ctx.fillRect(cx - 76, cy - 12, 152, 36);
    ctx.fillStyle = "#6B7680";
    ctx.fillRect(cx - 64, cy - 19, 128, 50);
    ctx.fillRect(cx - 71, cy - 8, 142, 28);
    ctx.fillStyle = COLORS.waterDark;
    ctx.fillRect(cx - 58, cy - 13, 116, 38);
    ctx.fillRect(cx - 65, cy - 4, 130, 21);
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(cx - 54, cy - 10, 108, 4);
    ctx.fillRect(cx - 61, cy - 1, 122, 2);

    const shimmer = Math.floor(time * 10) % 24;
    ctx.fillStyle = COLORS.cyanSoft;
    ctx.fillRect(cx - 47 + shimmer, cy + 4, 25, 2);
    ctx.fillRect(cx + 15 - shimmer / 2, cy + 12, 31, 2);
    ctx.fillRect(cx - 8, cy + 20 - pulse, 18, 2);

    // Central rebirth crystal is mounted on a stepped reliquary pedestal.
    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(cx - 25, cy - 7, 50, 14);
    ctx.fillRect(cx - 18, cy - 51, 36, 47);
    ctx.fillStyle = COLORS.stone;
    ctx.fillRect(cx - 20, cy - 4, 40, 8);
    ctx.fillRect(cx - 13, cy - 47, 26, 39);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(cx - 16, cy - 18, 32, 3);
    ctx.fillRect(cx - 2, cy - 31, 4, 20);
    ctx.fillStyle = COLORS.cyan;
    ctx.fillRect(cx - 9, cy - 45, 18, 27);
    ctx.fillRect(cx - 5, cy - 56, 10, 44);
    ctx.fillRect(cx - 13, cy - 35, 26, 8);
    ctx.fillStyle = COLORS.cyanSoft;
    ctx.fillRect(cx - 2, cy - 52, 4, 28);
    ctx.fillRect(cx - 7, cy - 41, 5, 12);

    // Four lantern pylons define the court boundary and reinforce symmetry.
    for (const [px, py] of [
      [cx - 72, cy - 42],
      [cx + 72, cy - 42],
      [cx - 76, cy + 13],
      [cx + 76, cy + 13],
    ] as const) {
      drawRuneLantern(ctx, px, py, COLORS.cyan, time);
    }

    // Soul motes remain compact and orbit the crystal instead of filling the whole room.
    for (let i = 0; i < 8; i++) {
      const radius = 18 + (i % 4) * 7;
      const px = cx + Math.round(Math.sin(time * 1.7 + i * 1.4) * radius);
      const py = cy - 24 - ((Math.floor(time * 17) + i * 9) % 38);
      ctx.fillStyle = i % 3 === 0 ? COLORS.cyanSoft : COLORS.cyan;
      ctx.fillRect(px, py, i % 2 === 0 ? 2 : 3, 2);
    }
  }

  private drawExpeditionGate(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
    const cx = object.x + (object.width ?? 176) / 2;
    const bottom = object.y + (object.height ?? 112);
    const phase = Math.floor(time * 5) % 4;

    // Stable raised threshold; no whole-model scaling or alpha animation.
    drawGroundShadow(ctx, cx - 92, bottom - 6, 184, 10);
    drawStoneSteps(ctx, cx, bottom - 23, 124, 5, COLORS.archiveLight);
    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(cx - 86, bottom - 36, 172, 18);
    ctx.fillStyle = COLORS.archive;
    ctx.fillRect(cx - 78, bottom - 32, 156, 10);
    ctx.fillStyle = COLORS.gold;
    for (let runeX = -62; runeX <= 62; runeX += 20) {
      ctx.fillRect(cx + runeX - 2, bottom - 29, 5, 2);
      ctx.fillRect(cx + runeX, bottom - 32, 1, 8);
    }

    // Deep portal recess is visibly behind the frame.
    ctx.fillStyle = "#17111F";
    ctx.fillRect(cx - 46, bottom - 92, 92, 67);
    ctx.fillRect(cx - 39, bottom - 101, 78, 12);
    ctx.fillStyle = COLORS.purpleDark;
    ctx.fillRect(cx - 39, bottom - 85, 78, 56);
    ctx.fillRect(cx - 33, bottom - 94, 66, 12);
    ctx.fillStyle = phase < 2 ? "#8B63C4" : "#9F73D8";
    ctx.fillRect(cx - 32, bottom - 80, 64, 46);
    ctx.fillStyle = "#5C3F7B";
    for (let band = 0; band < 5; band++) {
      const inset = band * 4;
      ctx.fillRect(cx - 28 + inset, bottom - 75 + band * 8, 56 - inset * 2, 2);
    }
    ctx.fillStyle = COLORS.cyanSoft;
    ctx.fillRect(cx - 3 + phase, bottom - 77, 5, 39);
    ctx.fillRect(cx - 18, bottom - 58 + phase, 36, 2);

    // Heavy piers, buttresses, and stepped arch form a permanent monumental frame.
    for (const pierX of [cx - 60, cx + 42]) {
      drawStoneFrame(ctx, pierX, bottom - 108, 18, 88, COLORS.archiveLight);
      drawButtress(ctx, pierX - 6, bottom - 82, 62, COLORS.archive, COLORS.archiveLight);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(pierX + 5, bottom - 96, 8, 8);
      ctx.fillRect(pierX + 7, bottom - 91, 4, 22);
      ctx.fillRect(pierX + 3, bottom - 82, 12, 4);
    }

    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(cx - 52, bottom - 119, 104, 18);
    ctx.fillRect(cx - 45, bottom - 126, 90, 10);
    ctx.fillRect(cx - 34, bottom - 132, 68, 9);
    ctx.fillStyle = COLORS.stone;
    ctx.fillRect(cx - 47, bottom - 115, 94, 10);
    ctx.fillRect(cx - 40, bottom - 122, 80, 8);
    ctx.fillRect(cx - 29, bottom - 128, 58, 7);
    ctx.fillStyle = COLORS.archiveLight;
    ctx.fillRect(cx - 40, bottom - 118, 80, 2);
    ctx.fillRect(cx - 26, bottom - 125, 52, 2);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(cx - 3, bottom - 132, 6, 14);
    ctx.fillRect(cx - 12, bottom - 126, 24, 4);

    // Side seals and chain anchors make the portal feel restrained and engineered.
    for (const sealX of [cx - 73, cx + 73]) {
      ctx.fillStyle = COLORS.stoneDark;
      ctx.fillRect(sealX - 8, bottom - 64, 16, 20);
      ctx.fillStyle = COLORS.archive;
      ctx.fillRect(sealX - 5, bottom - 60, 10, 12);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(sealX - 1, bottom - 58, 3, 8);
      ctx.fillRect(sealX - 4, bottom - 55, 8, 3);
    }
  }

  private drawForge(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
    const cx = object.x + (object.width ?? 80) / 2;
    const bottom = object.y + (object.height ?? 96);
    const flame = Math.floor(time * 8) % 3;
    drawGroundShadow(ctx, cx - 38, bottom - 7, 76, 8);

    // Stone hearth and timber canopy mirror the larger workshop architecture.
    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(cx - 36, bottom - 55, 72, 48);
    ctx.fillRect(cx - 41, bottom - 15, 82, 10);
    ctx.fillStyle = "#69594C";
    ctx.fillRect(cx - 31, bottom - 50, 62, 37);
    ctx.fillStyle = COLORS.stoneLight;
    ctx.fillRect(cx - 28, bottom - 47, 56, 3);
    ctx.fillStyle = COLORS.wood;
    ctx.fillRect(cx - 39, bottom - 73, 7, 62);
    ctx.fillRect(cx + 32, bottom - 73, 7, 62);
    ctx.fillRect(cx - 43, bottom - 76, 86, 7);
    ctx.fillStyle = COLORS.woodLight;
    ctx.fillRect(cx - 37, bottom - 73, 74, 3);

    // Furnace mouth uses three heat layers and a dark recessed arch.
    ctx.fillStyle = "#211712";
    ctx.fillRect(cx - 21, bottom - 46, 42, 34);
    ctx.fillRect(cx - 16, bottom - 53, 32, 9);
    ctx.fillStyle = COLORS.red;
    ctx.fillRect(cx - 16, bottom - 38, 32, 25);
    ctx.fillStyle = COLORS.orange;
    ctx.fillRect(cx - 11, bottom - 42 - flame, 22, 29 + flame);
    ctx.fillStyle = COLORS.fire;
    ctx.fillRect(cx - 5, bottom - 47 - flame * 2, 10, 32 + flame);
    ctx.fillStyle = "#FFF2B0";
    ctx.fillRect(cx - 2, bottom - 33, 4, 16);

    // Twin flues, hanging tongs, and anvil keep the prop readable as a working forge.
    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(cx - 29, bottom - 91, 14, 19);
    ctx.fillRect(cx + 16, bottom - 86, 11, 14);
    ctx.fillStyle = "#5C4030";
    ctx.fillRect(cx - 26, bottom - 88, 8, 15);
    ctx.fillRect(cx + 19, bottom - 83, 5, 11);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(cx - 30, bottom - 66, 3, 19);
    ctx.fillRect(cx + 27, bottom - 65, 3, 18);
    ctx.fillRect(cx - 34, bottom - 50, 10, 3);
    ctx.fillRect(cx + 24, bottom - 48, 10, 3);
    ctx.fillStyle = "#25282D";
    ctx.fillRect(cx + 19, bottom - 17, 27, 6);
    ctx.fillRect(cx + 25, bottom - 24, 16, 8);
    ctx.fillRect(cx + 29, bottom - 11, 8, 8);
  }

  private drawEnchantingTable(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
    const cx = object.x + (object.width ?? 80) / 2;
    const bottom = object.y + (object.height ?? 80);
    const hover = Math.round(Math.sin(time * 3) * 2);
    drawGroundShadow(ctx, cx - 36, bottom - 8, 72, 8);

    // Carved stone feet and a timber-rimmed rune slab give the table proper weight.
    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(cx - 31, bottom - 31, 62, 20);
    ctx.fillRect(cx - 27, bottom - 12, 12, 12);
    ctx.fillRect(cx + 15, bottom - 12, 12, 12);
    ctx.fillStyle = COLORS.archive;
    ctx.fillRect(cx - 26, bottom - 27, 52, 12);
    ctx.fillStyle = COLORS.wood;
    ctx.fillRect(cx - 36, bottom - 40, 72, 10);
    ctx.fillStyle = COLORS.woodLight;
    ctx.fillRect(cx - 32, bottom - 38, 64, 3);

    // Open grimoire, page seam, clasps, and corner crystals.
    ctx.fillStyle = "#E7D8AD";
    ctx.fillRect(cx - 27, bottom - 51, 25, 13);
    ctx.fillRect(cx + 2, bottom - 51, 25, 13);
    ctx.fillStyle = "#C6AD79";
    ctx.fillRect(cx - 23, bottom - 48, 18, 2);
    ctx.fillRect(cx + 6, bottom - 48, 18, 2);
    ctx.fillRect(cx - 21, bottom - 44, 14, 1);
    ctx.fillRect(cx + 8, bottom - 44, 14, 1);
    ctx.fillStyle = COLORS.purpleDark;
    ctx.fillRect(cx - 2, bottom - 52, 4, 15);
    for (const crystalX of [cx - 31, cx + 27]) {
      ctx.fillStyle = COLORS.cyan;
      ctx.fillRect(crystalX, bottom - 55, 5, 12);
      ctx.fillStyle = COLORS.cyanSoft;
      ctx.fillRect(crystalX + 2, bottom - 60, 2, 8);
    }

    // Compact levitating focus and orbiting runes avoid oversized effects.
    ctx.fillStyle = COLORS.purple;
    ctx.fillRect(cx - 6, bottom - 71 - hover, 12, 12);
    ctx.fillStyle = COLORS.cyanSoft;
    ctx.fillRect(cx - 2, bottom - 77 - hover, 4, 18);
    const orbit = Math.floor(time * 6) % 20;
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(cx - 18 + orbit, bottom - 66, 3, 3);
    ctx.fillRect(cx + 15 - orbit, bottom - 59, 3, 3);
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

  private drawArchiveMonument(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition): void {
    const cx = object.x + (object.width ?? 64) / 2;
    const bottom = object.y + (object.height ?? 64);
    drawGroundShadow(ctx, cx - 30, bottom - 5, 60, 7);

    // Stepped plinth, narrow obelisk, and pediment echo the archive keep towers.
    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(cx - 29, bottom - 13, 58, 13);
    ctx.fillRect(cx - 23, bottom - 20, 46, 8);
    ctx.fillRect(cx - 18, bottom - 57, 36, 39);
    ctx.fillStyle = COLORS.archive;
    ctx.fillRect(cx - 13, bottom - 53, 26, 31);
    ctx.fillStyle = COLORS.archiveLight;
    ctx.fillRect(cx - 10, bottom - 50, 20, 3);
    ctx.fillRect(cx - 10, bottom - 44, 20, 2);
    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(cx - 22, bottom - 63, 44, 8);
    ctx.fillRect(cx - 15, bottom - 69, 30, 7);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(cx - 11, bottom - 39, 22, 3);
    ctx.fillRect(cx - 2, bottom - 48, 4, 22);
    ctx.fillRect(cx - 8, bottom - 32, 16, 3);

    // Side scroll niches prevent the monument from reading as a plain slab.
    ctx.fillStyle = "#241D2D";
    ctx.fillRect(cx - 27, bottom - 46, 8, 23);
    ctx.fillRect(cx + 19, bottom - 46, 8, 23);
    ctx.fillStyle = "#D9C59A";
    ctx.fillRect(cx - 25, bottom - 42, 4, 15);
    ctx.fillRect(cx + 21, bottom - 42, 4, 15);
    ctx.fillStyle = COLORS.purple;
    ctx.fillRect(cx - 25, bottom - 38, 4, 2);
    ctx.fillRect(cx + 21, bottom - 38, 4, 2);
  }

  private drawCodexLectern(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
    const cx = object.x + (object.width ?? 64) / 2;
    const bottom = object.y + (object.height ?? 64);
    ctx.fillStyle = COLORS.wood; ctx.fillRect(cx - 6, bottom - 34, 12, 34); ctx.fillRect(cx - 20, bottom - 37, 40, 8);
    ctx.fillStyle = "#D9C59A"; ctx.fillRect(cx - 19, bottom - 48, 18, 12); ctx.fillRect(cx + 1, bottom - 48, 18, 12);
    ctx.fillStyle = COLORS.purple; ctx.fillRect(cx - 1, bottom - 48, 2, 12);
    ctx.fillStyle = Math.floor(time * 3) % 2 === 0 ? COLORS.cyan : COLORS.cyanSoft; ctx.fillRect(cx - 2, bottom - 57, 4, 5);
  }

  private drawHonorWall(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition): void {
    const x = object.x;
    const y = object.y;
    drawStoneFrame(ctx, x, y + 5, object.width ?? 64, object.height ?? 64, COLORS.gold);
    ctx.fillStyle = COLORS.red; ctx.fillRect(x + 8, y + 13, 14, 32); ctx.fillRect(x + 42, y + 13, 14, 32);
    ctx.fillStyle = COLORS.gold; ctx.fillRect(x + 12, y + 20, 6, 12); ctx.fillRect(x + 46, y + 20, 6, 12);
  }

  private drawAstralConsole(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
    const cx = object.x + (object.width ?? 96) / 2;
    const bottom = object.y + (object.height ?? 80);
    const orbit = Math.floor(time * 7) % 28;
    drawGroundShadow(ctx, cx - 45, bottom - 7, 90, 8);

    // Tiered observatory base and angled control deck.
    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(cx - 43, bottom - 16, 86, 16);
    ctx.fillRect(cx - 36, bottom - 34, 72, 19);
    ctx.fillStyle = "#365D6E";
    ctx.fillRect(cx - 31, bottom - 30, 62, 12);
    ctx.fillStyle = "#527F91";
    ctx.fillRect(cx - 27, bottom - 28, 54, 3);
    ctx.fillStyle = COLORS.cyan;
    for (let key = -22; key <= 22; key += 11) ctx.fillRect(cx + key, bottom - 24, 5, 3);

    // Armillary support and nested pixel rings create a real astronomical instrument.
    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(cx - 6, bottom - 62, 12, 30);
    ctx.fillRect(cx - 19, bottom - 67, 38, 7);
    ctx.strokeStyle = COLORS.cyan;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 24, bottom - 79, 48, 29);
    ctx.strokeStyle = COLORS.purple;
    ctx.strokeRect(cx - 17, bottom - 85, 34, 41);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(cx - 3, bottom - 70, 6, 6);
    ctx.fillRect(cx - 1, bottom - 83, 2, 31);
    ctx.fillStyle = COLORS.cyanSoft;
    ctx.fillRect(cx - 22 + orbit, bottom - 77, 4, 4);
    ctx.fillStyle = COLORS.purple;
    ctx.fillRect(cx + 18 - orbit, bottom - 52, 4, 4);

    // Two crystal batteries flank the controls without increasing the footprint.
    for (const batteryX of [cx - 37, cx + 31]) {
      ctx.fillStyle = COLORS.stoneDark;
      ctx.fillRect(batteryX, bottom - 47, 7, 31);
      ctx.fillStyle = COLORS.cyan;
      ctx.fillRect(batteryX + 1, bottom - 53, 5, 15);
      ctx.fillStyle = COLORS.cyanSoft;
      ctx.fillRect(batteryX + 3, bottom - 57, 2, 12);
    }
  }

  private drawArmoryRack(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition): void {
    const x = object.x + 6;
    const width = (object.width ?? 112) - 12;
    const bottom = object.y + (object.height ?? 80);
    const centerX = x + width / 2;
    drawGroundShadow(ctx, x - 3, bottom - 5, width + 6, 7);

    // Heavy framed display with crenellated cap matches the armory fortress.
    ctx.fillStyle = COLORS.wood;
    ctx.fillRect(x, bottom - 59, width, 8);
    ctx.fillRect(x, bottom - 18, width, 8);
    ctx.fillRect(x + 4, bottom - 62, 7, 57);
    ctx.fillRect(x + width - 11, bottom - 62, 7, 57);
    ctx.fillStyle = COLORS.woodLight;
    ctx.fillRect(x + 5, bottom - 56, width - 10, 3);
    ctx.fillStyle = COLORS.stoneDark;
    for (let merlon = 4; merlon < width - 5; merlon += 15) ctx.fillRect(x + merlon, bottom - 67, 9, 8);

    // Central shield, crossed swords, spear, and axe avoid repeated identical weapons.
    ctx.fillStyle = "#7D302F";
    ctx.fillRect(centerX - 13, bottom - 48, 26, 24);
    ctx.fillRect(centerX - 9, bottom - 24, 18, 5);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(centerX - 2, bottom - 45, 4, 20);
    ctx.fillRect(centerX - 9, bottom - 37, 18, 3);
    ctx.fillStyle = COLORS.stoneLight;
    ctx.fillRect(x + 20, bottom - 54, 3, 35);
    ctx.fillRect(x + 14, bottom - 48, 15, 3);
    ctx.fillRect(x + width - 23, bottom - 54, 3, 35);
    ctx.fillRect(x + width - 29, bottom - 48, 15, 3);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x + 33, bottom - 54, 3, 38);
    ctx.fillRect(x + width - 37, bottom - 52, 3, 35);
    ctx.fillRect(x + width - 42, bottom - 50, 13, 4);
    ctx.fillRect(x + width - 39, bottom - 55, 7, 10);

    // Reinforced storage chest fills the lower shelf and gives the rack a usable base.
    ctx.fillStyle = "#493225";
    ctx.fillRect(centerX - 22, bottom - 17, 44, 12);
    ctx.fillStyle = COLORS.woodLight;
    ctx.fillRect(centerX - 19, bottom - 15, 38, 3);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(centerX - 3, bottom - 14, 6, 7);
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
