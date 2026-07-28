import type { Camera2D } from "../world/Camera2D";
import { getWorldLayer, type WorldMapDefinition, type WorldObjectDefinition } from "../world/WorldMap";
import { WorldMapRenderer } from "../world/WorldMapRenderer";
import { drawRitualSpring } from "../render/RitualSpringRenderer";
import { HubArchitectureRenderer } from "./HubArchitectureRenderer";
import { HubGroundRenderer } from "./HubGroundRenderer";
import { HubGroundDetailTile } from "./HubMap";

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

export const TRAINING_MARKER_COLORS = {
  stoneDark: "#252B35",
  stone: "#4B5260",
  woodDark: "#68472E",
  woodWear: "#9B6A3E",
  target: "#8F2F38",
  gold: "#D8B45C",
  proximity: "#72E0E8",
  core: "#FFD36B",
} as const;

export interface TrainingMarkerRenderState {
  proximity?: number;
}

export type ReforgeStonePhase = "idle" | "confirm" | "cooldown";

export interface ReforgeStoneRenderState {
  proximity?: number;
  phase?: ReforgeStonePhase;
  phaseTime?: number;
  reducedMotion?: boolean;
}

export type DistrictGateVisualState = "idle" | "nearby";

export interface DistrictGateRenderState {
  visualState?: DistrictGateVisualState;
}

export interface HubObjectRenderState {
  trainingMarker?: TrainingMarkerRenderState;
  reforgeStone?: ReforgeStoneRenderState;
  districtGate?: DistrictGateRenderState;
}

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

// ---------------------------------------------------------------------------
// Ambient accents. Ramps, shapes, and particle seeds are hoisted to module
// scope so the per-frame passes allocate nothing. All motion is a pure
// function of (seed, time): deterministic, replayable, no per-frame RNG.
// reducedFlashing is not reachable from this renderer's signature, so every
// amplitude stays small and every frequency slow (<= ~2.2Hz sine).
// ---------------------------------------------------------------------------

function alphaRamp(r: number, g: number, b: number, maxAlpha: number, steps = 6): string[] {
  const ramp: string[] = [];
  for (let i = 0; i < steps; i++) ramp.push(`rgba(${r},${g},${b},${((i / (steps - 1)) * maxAlpha).toFixed(3)})`);
  return ramp;
}

function colorRamp(from: [number, number, number], to: [number, number, number], steps = 6): string[] {
  const ramp: string[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
    ramp.push(`rgb(${mix(from[0], to[0])},${mix(from[1], to[1])},${mix(from[2], to[2])})`);
  }
  return ramp;
}

function rampAt(ramp: string[], pulse01: number): string {
  const index = Math.floor(pulse01 * ramp.length);
  return ramp[Math.max(0, Math.min(ramp.length - 1, index))];
}

const RUNE_PULSE_PURPLE = alphaRamp(199, 168, 240, 0.34);
const RUNE_PULSE_SPRING = alphaRamp(183, 250, 245, 0.4);
const RUNE_PULSE_CYAN = alphaRamp(140, 232, 238, 0.32);
const EMBER_RAMP = colorRamp([184, 92, 51], [255, 211, 107]);
const ACCENT_RAMP_CACHE = new Map<string, string[]>();

function accentRamp(hex: string, maxAlpha = 0.4): string[] {
  const key = `${hex}:${maxAlpha}`;
  let ramp = ACCENT_RAMP_CACHE.get(key);
  if (!ramp) {
    const r = parseInt(hex.slice(1, 3), 16) || 216;
    const g = parseInt(hex.slice(3, 5), 16) || 180;
    const b = parseInt(hex.slice(5, 7), 16) || 92;
    ramp = alphaRamp(r, g, b, maxAlpha);
    ACCENT_RAMP_CACHE.set(key, ramp);
  }
  return ramp;
}

function drawSpringRuneShape(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillRect(x + 7, y + 4, 2, 1); ctx.fillRect(x + 5, y + 5, 2, 1); ctx.fillRect(x + 9, y + 5, 2, 1);
  ctx.fillRect(x + 4, y + 6, 1, 4); ctx.fillRect(x + 11, y + 6, 1, 4);
  ctx.fillRect(x + 5, y + 10, 2, 1); ctx.fillRect(x + 9, y + 10, 2, 1); ctx.fillRect(x + 7, y + 11, 2, 1);
  ctx.fillRect(x + 7, y + 7, 2, 2);
}

function starFleckOffsetX(tileX: number, tileY: number): number { return 3 + (tileX * 5 + tileY * 3) % 9; }
function starFleckOffsetY(tileX: number, tileY: number): number { return 3 + (tileX * 3 + tileY * 7) % 9; }

type AmbientParticle = {
  zoneX: number; zoneY: number; zoneW: number; zoneH: number;
  offsetX: number; offsetY: number;
  vx: number; vy: number;
  swayAmp: number; swayFreq: number; phase: number;
  kind: "leaf" | "ember" | "star" | "mote";
  color: string; glint: string;
};

function seed01(index: number, salt: number): number {
  let t = (index * 374761393 + salt * 668265263) >>> 0;
  t = Math.imul(t ^ (t >>> 13), 1274126177) >>> 0;
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
}

// LOW density by design: each zone is at least a screen large and carries a
// single-digit particle count, so a 320x240 view sees only a handful.
const AMBIENT_PARTICLES: readonly AmbientParticle[] = (() => {
  const list: AmbientParticle[] = [];
  const leafColors = ["#9FBF77", "#C2CA8B", "#7EA96B"] as const;
  const addDrifters = (
    count: number, salt: number, kind: AmbientParticle["kind"],
    zoneX: number, zoneY: number, zoneW: number, zoneH: number,
    vxBase: number, vxSpread: number, vyBase: number, vySpread: number,
    color: (index: number) => string, glint: string,
  ): void => {
    for (let i = 0; i < count; i++) {
      list.push({
        zoneX, zoneY, zoneW, zoneH,
        offsetX: seed01(i, salt) * zoneW, offsetY: seed01(i, salt + 1) * zoneH,
        vx: vxBase + seed01(i, salt + 2) * vxSpread,
        vy: vyBase + seed01(i, salt + 3) * vySpread,
        swayAmp: 2 + seed01(i, salt + 4) * 3,
        swayFreq: 0.6 + seed01(i, salt + 5) * 0.7,
        phase: seed01(i, salt + 6) * Math.PI * 2,
        kind,
        color: color(i), glint,
      });
    }
  };
  // Central rebirth court: drifting leaves over the plaza slabs.
  addDrifters(7, 11, "leaf", 464, 304, 368, 368, 4, 5, 7, 6, i => leafColors[i % 3], "#DFE0AC");
  // South court shares a thinner drift so the approach road feels connected.
  addDrifters(4, 31, "leaf", 448, 672, 400, 176, 4, 4, 6, 5, i => leafColors[(i + 1) % 3], "#DFE0AC");
  // Workshop district: tiny embers climbing from the forges.
  addDrifters(5, 51, "ember", 64, 304, 352, 352, 1, 2, -16, -8, i => (i % 2 === 0 ? "#E58945" : "#FFB35C"), "#FFD36B");
  // Observatory district: snow-like star glimmer sifting down.
  addDrifters(6, 71, "star", 896, 48, 320, 256, 1, 2, 4, 4, () => "#9BE8EC", "#E6FDFB");
  // Spring motes: a few cyan sparks rising around the rebirth spring itself.
  addDrifters(3, 91, "mote", 560, 384, 176, 176, 0, 1, -8, -5, () => "#8FE8E0", "#E0FFFB");
  return list;
})();

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

  public drawObjects(ctx: CanvasRenderingContext2D, map: WorldMapDefinition, camera: Camera2D, layer: "back" | "upper", time: number): void {
    if (!map?.objects) return;
    if (layer === "back") this.drawGroundAccents(ctx, map, camera, time);
    for (const object of map.objects) {
      if (!object || object.type !== "decoration" || layerOf(object) !== layer || object.properties?.visible === false) continue;
      if (!camera.isVisible(object.x ?? 0, object.y ?? 0, object.width ?? 0, object.height ?? 0, 48)) continue;
      this.drawObject(ctx, object, time);
    }
    // Ambient particle pass sits above ground decor but below every sorted
    // object, so leaves and embers never cross a building's front layers.
    if (layer === "back") this.drawAmbientParticles(ctx, camera, time);
  }

  // Time-based ground accents: the static detail tiles stay as painted by
  // drawGround; this pass only re-inks the few glyphs that should breathe.
  private accentTime = 0;

  private drawGroundAccents(ctx: CanvasRenderingContext2D, map: WorldMapDefinition, camera: Camera2D, time: number): void {
    const detail = getWorldLayer(map, "groundDetail");
    if (!detail) return;
    this.accentTime = time;
    this.tileRenderer.drawLayer(ctx, map, detail, camera, this.drawDetailAccent);
  }

  private readonly drawDetailAccent = (
    ctx: CanvasRenderingContext2D,
    tileId: number,
    x: number,
    y: number,
    tileX: number,
    tileY: number,
  ): void => {
    const time = this.accentTime;
    if (tileId === HubGroundDetailTile.plazaRune || tileId === HubGroundDetailTile.springRune) {
      // Spring-court runes breathe slowly, phase-shifted per tile so the court
      // shimmers instead of blinking in unison. Workshop soot stays inert.
      const pulse = 0.5 + 0.5 * Math.sin(time * 1.6 + ((tileX * 7 + tileY * 13) % 12) * 0.55);
      if (tileId === HubGroundDetailTile.springRune) {
        ctx.fillStyle = rampAt(RUNE_PULSE_SPRING, pulse);
        drawSpringRuneShape(ctx, x, y);
        if (pulse > 0.82) { ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(x + 7, y + 7, 2, 2); }
      } else {
        ctx.fillStyle = rampAt(RUNE_PULSE_PURPLE, pulse);
        ctx.fillRect(x + 7, y + 4, 2, 8); ctx.fillRect(x + 4, y + 7, 8, 2); ctx.fillRect(x + 5, y + 5, 2, 2);
      }
    } else if (tileId === HubGroundDetailTile.observatoryRune) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 2.0 + ((tileX * 11 + tileY * 5) % 10) * 0.7);
      ctx.fillStyle = rampAt(RUNE_PULSE_CYAN, pulse);
      ctx.fillRect(x + 7, y + 4, 2, 8); ctx.fillRect(x + 4, y + 7, 8, 2);
    } else if (tileId === HubGroundDetailTile.starFleck) {
      // Star-flecks twinkle on independent slow phases; most frames a fleck is
      // just its dim static pixel, so the field never strobes.
      const pulse = 0.5 + 0.5 * Math.sin(time * 1.9 + ((tileX * 13 + tileY * 17) % 16) * 0.42);
      if (pulse > 0.6) {
        const fx = x + starFleckOffsetX(tileX, tileY);
        const fy = y + starFleckOffsetY(tileX, tileY);
        ctx.fillStyle = rampAt(RUNE_PULSE_CYAN, pulse);
        ctx.fillRect(fx - 1, fy, 3, 1); ctx.fillRect(fx, fy - 1, 1, 3);
        if (pulse > 0.9) { ctx.fillStyle = "rgba(240,253,251,0.75)"; ctx.fillRect(fx, fy, 1, 1); }
      }
    }
  };

  private drawAmbientParticles(ctx: CanvasRenderingContext2D, camera: Camera2D, time: number): void {
    const viewLeft = camera.renderX - 6;
    const viewTop = camera.renderY - 6;
    const viewRight = camera.renderX + camera.viewportWidth + 6;
    const viewBottom = camera.renderY + camera.viewportHeight + 6;
    const previousAlpha = ctx.globalAlpha;
    for (const particle of AMBIENT_PARTICLES) {
      const travelY = particle.offsetY + time * particle.vy;
      const wrappedY = ((travelY % particle.zoneH) + particle.zoneH) % particle.zoneH;
      const travelX = particle.offsetX + time * particle.vx + Math.sin(time * particle.swayFreq + particle.phase) * particle.swayAmp;
      const wrappedX = ((travelX % particle.zoneW) + particle.zoneW) % particle.zoneW;
      const x = Math.round(particle.zoneX + wrappedX);
      const y = Math.round(particle.zoneY + wrappedY);
      if (x < viewLeft || x > viewRight || y < viewTop || y > viewBottom) continue;
      // Fade in/out near the wrap seam; quantized so alpha steps read as pixel
      // shimmer rather than smooth video fades.
      const progress = wrappedY / particle.zoneH;
      const fade = Math.min(1, Math.min(progress, 1 - progress) * 6);
      const alpha = Math.round(fade * 3) / 3;
      if (alpha <= 0) continue;
      if (particle.kind === "leaf") {
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = particle.color;
        ctx.fillRect(x, y, 2, 1);
        ctx.fillRect(x + (Math.sin(time * particle.swayFreq + particle.phase) > 0 ? 2 : -1), y + 1, 1, 1);
      } else if (particle.kind === "ember") {
        ctx.globalAlpha = alpha * 0.85;
        ctx.fillStyle = particle.color;
        ctx.fillRect(x, y, 1, 1);
        if (alpha >= 1) { ctx.fillStyle = particle.glint; ctx.fillRect(x, y - 1, 1, 1); }
      } else if (particle.kind === "star") {
        const twinkle = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(time * 1.7 + particle.phase * 3));
        ctx.globalAlpha = alpha * twinkle * 0.9;
        ctx.fillStyle = particle.color;
        ctx.fillRect(x, y, 1, 1);
        if (twinkle > 0.85) {
          ctx.fillStyle = particle.glint;
          ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
        }
      } else {
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillStyle = particle.color;
        ctx.fillRect(x, y, 1, 1);
        if (alpha >= 1) { ctx.fillStyle = particle.glint; ctx.fillRect(x, y, 1, 1); }
      }
    }
    ctx.globalAlpha = previousAlpha;
  }

  public drawSortedObject(
    ctx: CanvasRenderingContext2D,
    object: WorldObjectDefinition,
    time: number,
    alpha = 1,
    state?: HubObjectRenderState,
  ): void {
    if (!object) return;
    ctx.save();
    ctx.globalAlpha *= Math.max(0, Math.min(1, alpha));
    this.drawObject(ctx, object, time, state);
    ctx.restore();
  }

  public getVisibleSortedObjects(map: WorldMapDefinition, camera: Camera2D): WorldObjectDefinition[] {
    if (!map?.objects) return [];
    return map.objects.filter(object =>
      object
      && object.type !== "region"
      && object.properties?.visible !== false
      && layerOf(object) === "sorted"
      && camera.isVisible(object.x ?? 0, object.y ?? 0, object.width ?? 0, object.height ?? 0, 48)
    );
  }

  private readonly drawDetailTile = (
    ctx: CanvasRenderingContext2D,
    tileId: number,
    x: number,
    y: number,
    tileX: number,
    tileY: number,
  ): void => {
    if (tileId === HubGroundDetailTile.grassTuft) {
      ctx.fillStyle = COLORS.grassLight;
      ctx.fillRect(x + 4, y + 9, 1, 4); ctx.fillRect(x + 5, y + 7, 1, 6); ctx.fillRect(x + 7, y + 10, 1, 3);
    } else if (tileId === HubGroundDetailTile.stoneWear) {
      ctx.fillStyle = "rgba(28,31,31,0.52)";
      ctx.fillRect(x + 3, y + 5, 5, 1); ctx.fillRect(x + 7, y + 6, 1, 4); ctx.fillRect(x + 8, y + 9, 4, 1);
    } else if (tileId === HubGroundDetailTile.plazaRune) {
      ctx.fillStyle = "rgba(177,140,226,0.42)";
      ctx.fillRect(x + 7, y + 4, 2, 8); ctx.fillRect(x + 4, y + 7, 8, 2); ctx.fillRect(x + 5, y + 5, 2, 2);
    } else if (tileId === HubGroundDetailTile.flower) {
      ctx.fillStyle = "#D9B1C9";
      ctx.fillRect(x + 5, y + 5, 2, 2); ctx.fillRect(x + 8, y + 4, 2, 2); ctx.fillRect(x + 7, y + 7, 2, 2);
      ctx.fillStyle = "#688D51"; ctx.fillRect(x + 7, y + 9, 1, 4);
    } else if (tileId === HubGroundDetailTile.archiveEmber) {
      ctx.fillStyle = "rgba(232,137,69,0.5)";
      ctx.fillRect(x + 4, y + 10, 2, 2); ctx.fillRect(x + 10, y + 6, 1, 2);
    } else if (tileId === HubGroundDetailTile.observatoryRune) {
      ctx.fillStyle = "rgba(114,224,232,0.46)";
      ctx.fillRect(x + 7, y + 4, 2, 8); ctx.fillRect(x + 4, y + 7, 8, 2);
    } else if (tileId === HubGroundDetailTile.workshopSoot) {
      ctx.fillStyle = "rgba(31,22,18,0.52)";
      ctx.fillRect(x + 3, y + 9, 7, 2); ctx.fillRect(x + 7, y + 6, 5, 1); ctx.fillRect(x + 11, y + 11, 2, 2);
      ctx.fillStyle = "rgba(229,137,69,0.34)"; ctx.fillRect(x + 5, y + 8, 2, 1);
    } else if (tileId === HubGroundDetailTile.trainingScratch) {
      ctx.fillStyle = "rgba(66,52,35,0.5)";
      ctx.fillRect(x + 2, y + 5, 6, 1); ctx.fillRect(x + 5, y + 8, 7, 1); ctx.fillRect(x + 9, y + 11, 4, 1);
    } else if (tileId === HubGroundDetailTile.trainingFootprint) {
      ctx.fillStyle = "rgba(68,52,35,0.46)";
      ctx.fillRect(x + 4, y + 7, 4, 6); ctx.fillRect(x + 9, y + 5, 3, 5);
      ctx.fillRect(x + 3, y + 5, 1, 2); ctx.fillRect(x + 8, y + 3, 1, 2);
    } else if (tileId === HubGroundDetailTile.armoryMetalWear) {
      ctx.fillStyle = "rgba(214,186,128,0.34)";
      ctx.fillRect(x + 3, y + 7, 10, 1); ctx.fillRect(x + 8, y + 5, 1, 5);
      ctx.fillStyle = "rgba(36,33,31,0.46)"; ctx.fillRect(x + 4, y + 10, 5, 1);
    } else if (tileId === HubGroundDetailTile.gardenFlowers) {
      ctx.fillStyle = "#D9B1C9";
      ctx.fillRect(x + 4, y + 5, 2, 2); ctx.fillRect(x + 7, y + 4, 2, 2); ctx.fillRect(x + 10, y + 6, 2, 2);
      ctx.fillStyle = "#7AA260"; ctx.fillRect(x + 7, y + 7, 1, 5);
    } else if (tileId === HubGroundDetailTile.gardenSoil) {
      ctx.fillStyle = "rgba(63,43,31,0.48)";
      ctx.fillRect(x + 3, y + 5, 5, 2); ctx.fillRect(x + 9, y + 9, 4, 2); ctx.fillRect(x + 5, y + 12, 2, 1);
    } else if (tileId === HubGroundDetailTile.expeditionRuneCrack) {
      ctx.fillStyle = "rgba(155,116,213,0.52)";
      ctx.fillRect(x + 7, y + 3, 2, 5); ctx.fillRect(x + 5, y + 7, 4, 2); ctx.fillRect(x + 4, y + 9, 2, 4);
      ctx.fillRect(x + 9, y + 9, 4, 1); ctx.fillRect(x + 12, y + 10, 1, 3);
    } else if (tileId === HubGroundDetailTile.mossPatch) {
      ctx.fillStyle = "rgba(64,96,58,0.55)";
      ctx.fillRect(x + 4, y + 8, 6, 3); ctx.fillRect(x + 6, y + 6, 5, 2); ctx.fillRect(x + 9, y + 11, 3, 2);
      ctx.fillStyle = "rgba(122,162,96,0.5)"; ctx.fillRect(x + 6, y + 8, 2, 1); ctx.fillRect(x + 10, y + 10, 1, 1);
    } else if (tileId === HubGroundDetailTile.pebbleCluster) {
      ctx.fillStyle = "rgba(42,46,44,0.6)";
      ctx.fillRect(x + 5, y + 9, 3, 2); ctx.fillRect(x + 9, y + 7, 2, 2); ctx.fillRect(x + 8, y + 11, 2, 2);
      ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fillRect(x + 5, y + 9, 1, 1); ctx.fillRect(x + 9, y + 7, 1, 1);
    } else if (tileId === HubGroundDetailTile.crackedSlab) {
      ctx.fillStyle = "rgba(26,28,30,0.5)";
      ctx.fillRect(x + 3, y + 4, 1, 3); ctx.fillRect(x + 4, y + 6, 3, 1); ctx.fillRect(x + 6, y + 7, 1, 3);
      ctx.fillRect(x + 7, y + 9, 4, 1); ctx.fillRect(x + 10, y + 10, 1, 3);
      ctx.fillStyle = "rgba(255,255,255,0.1)"; ctx.fillRect(x + 4, y + 7, 3, 1);
    } else if (tileId === HubGroundDetailTile.springRune) {
      ctx.fillStyle = "rgba(140,220,215,0.32)";
      drawSpringRuneShape(ctx, x, y);
    } else if (tileId === HubGroundDetailTile.cinderGravel) {
      ctx.fillStyle = "rgba(24,18,15,0.55)";
      ctx.fillRect(x + 4, y + 7, 2, 2); ctx.fillRect(x + 8, y + 10, 3, 2); ctx.fillRect(x + 11, y + 5, 2, 2);
      ctx.fillStyle = "rgba(229,137,69,0.4)"; ctx.fillRect(x + 9, y + 10, 1, 1);
    } else if (tileId === HubGroundDetailTile.archiveGlyph) {
      ctx.fillStyle = "rgba(155,116,213,0.34)";
      ctx.fillRect(x + 5, y + 5, 6, 1); ctx.fillRect(x + 5, y + 8, 6, 1); ctx.fillRect(x + 5, y + 11, 4, 1);
      ctx.fillRect(x + 4, y + 5, 1, 7);
    } else if (tileId === HubGroundDetailTile.starFleck) {
      ctx.fillStyle = "rgba(155,220,230,0.3)";
      ctx.fillRect(x + starFleckOffsetX(tileX, tileY), y + starFleckOffsetY(tileX, tileY), 1, 1);
    } else if (tileId === HubGroundDetailTile.armoryShard) {
      ctx.fillStyle = "rgba(38,34,31,0.55)";
      ctx.fillRect(x + 5, y + 8, 6, 2); ctx.fillRect(x + 9, y + 6, 2, 2);
      ctx.fillStyle = "rgba(216,180,92,0.42)"; ctx.fillRect(x + 6, y + 8, 3, 1);
    } else if (tileId === HubGroundDetailTile.voidMote) {
      ctx.fillStyle = "rgba(93,82,108,0.55)";
      ctx.fillRect(x + 6, y + 7, 2, 2); ctx.fillRect(x + 10, y + 10, 1, 1);
      ctx.fillStyle = "rgba(155,116,213,0.3)"; ctx.fillRect(x + 7, y + 7, 1, 1);
    } else if (tileId === HubGroundDetailTile.sandRipple) {
      ctx.fillStyle = "rgba(255,244,214,0.14)";
      ctx.fillRect(x + 3, y + 6, 6, 1); ctx.fillRect(x + 6, y + 7, 5, 1);
      ctx.fillStyle = "rgba(66,52,35,0.35)"; ctx.fillRect(x + 4, y + 10, 7, 1);
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

  private drawObject(
    ctx: CanvasRenderingContext2D,
    object: WorldObjectDefinition,
    time: number,
    state?: HubObjectRenderState,
  ): void {
    if (object.properties?.visible === false) return;
    if (HubArchitectureRenderer.draw(ctx, object, time)) return;
    const kind = kindOf(object);
    if (kind === "plaza_banners") this.drawPlazaBanners(ctx, object, time);
    else if (kind === "district_gate") this.drawDistrictGate(ctx, object, time, state?.districtGate);
    else if (kind === "waystone") this.drawWaystone(ctx, object, time);
    else if (kind === "reforge_stone") this.drawReforgeStone(ctx, object, time, state?.reforgeStone);
    else if (kind === "training_marker") this.drawTrainingMarker(ctx, object, time, state?.trainingMarker);
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

  private drawDistrictGate(
    ctx: CanvasRenderingContext2D,
    object: WorldObjectDefinition,
    time: number,
    state?: DistrictGateRenderState,
  ): void {
    const { x, y } = object;
    const width = object.width ?? 80;
    const height = object.height ?? 80;
    const centerX = x + width / 2;
    const bottom = y + height;
    const accent = typeof object.properties?.accent === "string" ? object.properties.accent : COLORS.gold;
    const emblem = typeof object.properties?.emblem === "string" ? object.properties.emblem : "archive";

    if (emblem === "garden") {
      this.drawGardenDistrictGate(ctx, object, time, state);
      return;
    }

    drawGroundShadow(ctx, x + 3, bottom - 5, width - 6, 7);

    // Trodden threshold between the pillars grounds the gate on the road.
    ctx.fillStyle = "rgba(4,7,8,0.16)";
    ctx.fillRect(x + 24, bottom - 8, width - 48, 5);
    ctx.fillRect(x + 28, bottom - 3, width - 56, 2);

    const glowPulse = 0.5 + 0.5 * Math.sin(time * 1.8 + x * 0.021);
    const haloStep = glowPulse > 0.66 ? 1 : 0;
    const halo = accentRamp(accent, 0.3);
    for (const pillarX of [x + 7, x + width - 19]) {
      // Shaft with beveled edges and staggered masonry courses.
      ctx.fillStyle = COLORS.stoneDark;
      ctx.fillRect(pillarX - 3, y + 14, 18, height - 17);
      ctx.fillRect(pillarX - 7, bottom - 11, 26, 11);
      ctx.fillStyle = COLORS.stone;
      ctx.fillRect(pillarX, y + 11, 12, height - 17);
      ctx.fillStyle = COLORS.stoneLight;
      ctx.fillRect(pillarX + 1, y + 16, 2, height - 28);
      ctx.fillStyle = "rgba(18,22,29,0.4)";
      ctx.fillRect(pillarX + 10, y + 15, 2, height - 27);
      for (let course = y + 24; course < bottom - 14; course += 9) {
        ctx.fillRect(pillarX, course, 12, 1);
        ctx.fillRect(pillarX + (Math.floor(course / 9) % 2 === 0 ? 4 : 8), course - 4, 1, 4);
      }
      // Foot plinth chamfer and cap molding.
      ctx.fillStyle = COLORS.stoneLight;
      ctx.fillRect(pillarX - 5, bottom - 11, 22, 2);
      ctx.fillStyle = COLORS.stoneDark;
      ctx.fillRect(pillarX - 2, y + 12, 16, 4);
      ctx.fillStyle = COLORS.stoneLight;
      ctx.fillRect(pillarX - 1, y + 13, 14, 1);
      // Accent lantern with a slow one-pixel halo breath.
      ctx.fillStyle = rampAt(halo, glowPulse);
      ctx.fillRect(pillarX + 1 - haloStep, y + 2 - haloStep, 10 + haloStep * 2, 13 + haloStep * 2);
      ctx.fillStyle = COLORS.stoneDark;
      ctx.fillRect(pillarX + 1, y + 2, 10, 3);
      ctx.fillRect(pillarX + 2, y + 12, 8, 2);
      ctx.fillStyle = accent;
      ctx.fillRect(pillarX + 2, y + 4, 8, 9);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillRect(pillarX + 5, y + 6, 2, 5);
    }

    // Lintel: layered spans, cornice line, and dentil ticks.
    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(x + 15, y + 14, width - 30, 9);
    ctx.fillRect(x + 22, y + 8, width - 44, 8);
    ctx.fillStyle = COLORS.stone;
    ctx.fillRect(x + 18, y + 16, width - 36, 4);
    ctx.fillStyle = COLORS.stoneLight;
    ctx.fillRect(x + 18, y + 15, width - 36, 1);
    ctx.fillStyle = "rgba(18,22,29,0.45)";
    for (let tick = x + 20; tick < x + width - 21; tick += 6) ctx.fillRect(tick, y + 21, 2, 2);

    // Emblem plaque: dark plate, accent frame, accent glyph. The old version
    // cut a dark glyph out of an accent slab and read as a blob at 1x.
    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(centerX - 14, y + 2, 28, 18);
    ctx.fillStyle = rampAt(halo, glowPulse);
    ctx.fillRect(centerX - 14, y + 2, 28, 18);
    ctx.fillStyle = "#20242E";
    ctx.fillRect(centerX - 12, y + 4, 24, 14);
    ctx.fillStyle = accent;
    ctx.fillRect(centerX - 13, y + 3, 26, 1);
    ctx.fillRect(centerX - 13, y + 18, 26, 1);
    if (emblem === "archive") {
      // Column and shelf: the stacked stacks of the athenaeum.
      ctx.fillRect(centerX - 2, y + 6, 4, 10);
      ctx.fillRect(centerX - 8, y + 10, 16, 2);
      ctx.fillRect(centerX - 6, y + 6, 2, 4); ctx.fillRect(centerX + 4, y + 6, 2, 4);
      ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(centerX - 1, y + 7, 1, 3);
    } else if (emblem === "observatory") {
      // Ringed planet with an orbit glint.
      ctx.fillRect(centerX - 4, y + 6, 8, 1); ctx.fillRect(centerX - 4, y + 14, 8, 1);
      ctx.fillRect(centerX - 5, y + 7, 1, 7); ctx.fillRect(centerX + 4, y + 7, 1, 7);
      ctx.fillRect(centerX - 1, y + 9, 2, 3);
      ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.fillRect(centerX + 3, y + 5, 2, 2);
    } else if (emblem === "workshop") {
      // Hammer over anvil block.
      ctx.fillRect(centerX - 7, y + 6, 9, 4);
      ctx.fillRect(centerX - 2, y + 6, 3, 10);
      ctx.fillRect(centerX + 3, y + 13, 5, 3);
      ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(centerX - 6, y + 7, 3, 1);
    } else if (emblem === "armory") {
      // Upright sword: point, blade, guard, pommel.
      ctx.fillRect(centerX - 1, y + 5, 2, 9);
      ctx.fillRect(centerX - 5, y + 10, 10, 2);
      ctx.fillRect(centerX - 2, y + 14, 4, 2);
      ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.fillRect(centerX - 1, y + 6, 1, 4);
    } else if (emblem === "garden") {
      // Sprout with two leaves.
      ctx.fillRect(centerX - 1, y + 9, 2, 7);
      ctx.fillRect(centerX - 6, y + 7, 5, 3); ctx.fillRect(centerX + 2, y + 5, 5, 3);
      ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fillRect(centerX - 5, y + 8, 2, 1);
    } else {
      // Training target: concentric rings.
      ctx.fillRect(centerX - 5, y + 6, 10, 1); ctx.fillRect(centerX - 5, y + 14, 10, 1);
      ctx.fillRect(centerX - 6, y + 7, 1, 7); ctx.fillRect(centerX + 5, y + 7, 1, 7);
      ctx.fillRect(centerX - 2, y + 9, 4, 3);
      ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(centerX - 1, y + 10, 1, 1);
    }

    const sway = Math.round(Math.sin(time * 2.2 + x * 0.01));
    drawBanner(ctx, x + 1, y + 29, 12, 25, accent, COLORS.gold, sway);
    drawBanner(ctx, x + width - 13, y + 29, 12, 25, accent, COLORS.gold, -sway);
  }

  private drawGardenDistrictGate(
    ctx: CanvasRenderingContext2D,
    object: WorldObjectDefinition,
    time: number,
    state: DistrictGateRenderState = {},
  ): void {
    const { x, y } = object;
    const width = object.width ?? 80;
    const height = object.height ?? 64;
    const centerX = x + width / 2;
    const bottom = y + height;
    const nearby = state.visualState === "nearby";
    const seedPulse = 0.5 + 0.5 * Math.sin(time * Math.PI * 2 * 1.2);
    const vineSegments = nearby ? 6 : 2;

    drawGroundShadow(ctx, x + 2, bottom - 5, width - 4, 7);
    ctx.fillStyle = "rgba(4,7,8,0.16)";
    ctx.fillRect(x + 24, bottom - 7, width - 48, 4);

    const drawRootPillar = (left: boolean): void => {
      const outer = left ? x : x + width - 24;
      const inner = left ? outer + 18 : outer + 6;
      ctx.fillStyle = "#28322F";
      ctx.fillRect(outer + 5, y + 20, 14, height - 29);
      ctx.fillRect(outer, bottom - 12, 24, 12);
      ctx.fillRect(left ? outer : outer + 14, bottom - 18, 10, 9);
      ctx.fillStyle = "#60705F";
      ctx.fillRect(left ? outer + 8 : outer + 14, y + 23, 3, height - 36);
      ctx.fillRect(left ? outer + 2 : outer + 16, bottom - 10, 6, 2);
      ctx.fillRect(left ? outer + 15 : outer + 2, bottom - 7, 7, 2);
      ctx.fillStyle = "#456A49";
      ctx.fillRect(left ? inner - 1 : inner - 5, y + 29, 6, 5);
      ctx.fillRect(inner - 3, y + 34, 5, 7);
      ctx.fillStyle = "#7ECF8A";
      ctx.fillRect(left ? inner + 1 : inner - 4, y + 31, 2, 4);
    };
    drawRootPillar(true);
    drawRootPillar(false);

    const archRows = [
      { inset: 18, yy: y + 18, span: width - 36 },
      { inset: 22, yy: y + 14, span: width - 44 },
      { inset: 28, yy: y + 10, span: width - 56 },
    ];
    ctx.fillStyle = "#28322F";
    for (const row of archRows) ctx.fillRect(x + row.inset, row.yy, row.span, 5);
    ctx.fillStyle = "#60705F";
    for (const row of archRows) ctx.fillRect(x + row.inset + 2, row.yy, Math.max(0, row.span - 4), 1);

    const segmentXs = [x + 17, x + 24, x + 31, x + width - 35, x + width - 28, x + width - 21];
    const segmentYs = [y + 19, y + 15, y + 12, y + 12, y + 15, y + 19];
    ctx.fillStyle = "#7ECF8A";
    for (let index = 0; index < vineSegments; index++) {
      const segment = nearby ? (index % 2 === 0 ? Math.floor(index / 2) : 5 - Math.floor(index / 2)) : index * 5;
      ctx.fillRect(segmentXs[segment], segmentYs[segment], 4, 2);
    }

    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x + 12, y + 23, 6, 3);
    ctx.fillRect(x + width - 18, y + 23, 6, 3);
    ctx.fillStyle = nearby ? "#FFE39A" : COLORS.fire;
    ctx.fillRect(x + 13, y + 26, 4, 5);
    ctx.fillRect(x + width - 17, y + 26, 4, 5);

    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(centerX - 8, y + 15, 16, 2);
    ctx.fillRect(centerX - 5, y + 17, 10, 2);
    ctx.fillStyle = nearby ? COLORS.cyan : "#456A49";
    ctx.fillRect(centerX - 11, y + 6, 3, 8);
    ctx.fillRect(centerX + 8, y + 6, 3, 8);
    ctx.fillRect(centerX - 8, y + 3, 16, 2);
    ctx.fillStyle = seedPulse > 0.62 ? COLORS.cyanSoft : COLORS.cyan;
    ctx.fillRect(centerX - 2, y + 3, 4, 12);
    ctx.fillRect(centerX - 4, y + 6, 8, 6);
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.fillRect(centerX - 1, y + 5, 2, 5);

    for (let mote = 0; mote < 2; mote++) {
      const cycle = (time * 0.16 + mote * 0.5) % 1;
      const moteX = Math.round(x + 18 + cycle * (width - 38));
      const moteY = Math.round(y + 12 - Math.sin(cycle * Math.PI) * 5 + mote * 2);
      ctx.fillStyle = mote === 0 ? "#7ECF8A" : "#A8D98D";
      ctx.fillRect(moteX, moteY, 2, 1);
      ctx.fillRect(moteX + (mote === 0 ? 1 : -1), moteY + 1, 1, 1);
    }
  }

  private drawWaystone(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
    const centerX = object.x + (object.width ?? 48) / 2;
    const bottom = object.y + (object.height ?? 64);
    const accent = typeof object.properties?.accent === "string" ? object.properties.accent : COLORS.purple;
    drawGroundShadow(ctx, centerX - 18, bottom - 3, 36, 6);

    // Stepped plinth with a chamfered highlight.
    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(centerX - 15, bottom - 12, 30, 12);
    ctx.fillRect(centerX - 12, bottom - 15, 24, 4);
    ctx.fillStyle = COLORS.stone;
    ctx.fillRect(centerX - 13, bottom - 11, 26, 3);
    ctx.fillStyle = COLORS.stoneLight;
    ctx.fillRect(centerX - 13, bottom - 11, 26, 1);
    ctx.fillStyle = "rgba(64,96,58,0.5)";
    ctx.fillRect(centerX - 14, bottom - 4, 5, 2); ctx.fillRect(centerX + 9, bottom - 6, 4, 2);

    // Obelisk shaft: beveled light edge, shadowed edge, hairline cracks.
    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(centerX - 9, bottom - 48, 18, 37);
    ctx.fillStyle = COLORS.stone;
    ctx.fillRect(centerX - 6, bottom - 45, 12, 32);
    ctx.fillStyle = COLORS.stoneLight;
    ctx.fillRect(centerX - 4, bottom - 42, 2, 26);
    ctx.fillStyle = "rgba(18,22,29,0.5)";
    ctx.fillRect(centerX + 4, bottom - 43, 1, 29);
    ctx.fillRect(centerX + 1, bottom - 26, 1, 4); ctx.fillRect(centerX + 2, bottom - 23, 1, 3);

    // Accent capital and collar ring, edged so they read as fitted stone.
    ctx.fillStyle = accent;
    ctx.fillRect(centerX - 10, bottom - 53, 20, 10);
    ctx.fillRect(centerX - 18, bottom - 35, 36, 5);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(centerX - 10, bottom - 44, 20, 1);
    ctx.fillRect(centerX - 18, bottom - 31, 36, 1);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(centerX - 9, bottom - 52, 18, 1);
    ctx.fillRect(centerX - 17, bottom - 35, 34, 1);

    // Gold sigil channel.
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(centerX - 2, bottom - 50, 4, 26);
    ctx.fillRect(centerX - 8, bottom - 39, 16, 4);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(centerX - 1, bottom - 49, 1, 10);

    // The paired stones share a silhouette, so the plinth carries a stable
    // cardinal cue instead of introducing an interaction state with no owner.
    const direction = object.properties?.direction === "south" ? 1 : -1;
    const arrowY = bottom - 7;
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(centerX - 1, arrowY - 2, 2, 5);
    ctx.fillRect(centerX - 3, arrowY + direction * 2, 6, 2);
    ctx.fillRect(centerX - 2, arrowY + direction * 3, 4, 1);

    // Shaft runes breathe on offset phases (replaces the old 4Hz flicker).
    const runeRamp = accentRamp(accent, 0.8);
    for (let rune = 0; rune < 3; rune++) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 1.5 + rune * 2.1 + object.x * 0.01);
      ctx.fillStyle = rampAt(runeRamp, pulse);
      ctx.fillRect(centerX + 5, bottom - 24 + rune * 4, 2, 2);
    }

    // Floating crystal: slow one-pixel bob, soft halo, twin orbit glints.
    const bob = Math.round(Math.sin(time * 1.3 + object.y * 0.02) * 1.5);
    const crystalY = bottom - 62 + bob;
    const haloPulse = 0.5 + 0.5 * Math.sin(time * 1.7 + object.x * 0.013);
    ctx.fillStyle = rampAt(accentRamp(accent, 0.3), haloPulse);
    ctx.fillRect(centerX - 4, crystalY - 2, 8, 11);
    ctx.fillStyle = accent;
    ctx.fillRect(centerX - 2, crystalY, 4, 7);
    ctx.fillRect(centerX - 3, crystalY + 2, 6, 3);
    ctx.fillStyle = COLORS.cyanSoft;
    ctx.fillRect(centerX - 1, crystalY + 1, 1, 4);
    for (let glintIndex = 0; glintIndex < 2; glintIndex++) {
      const angle = time * 0.9 + glintIndex * Math.PI;
      ctx.fillStyle = glintIndex === 0 ? COLORS.cyanSoft : "rgba(255,255,255,0.6)";
      ctx.fillRect(
        centerX + Math.round(Math.cos(angle) * 7),
        crystalY + 3 + Math.round(Math.sin(angle) * 2),
        1,
        1,
      );
    }
  }

  private drawReforgeStone(
    ctx: CanvasRenderingContext2D,
    object: WorldObjectDefinition,
    time: number,
    state: ReforgeStoneRenderState = {},
  ): void {
    const cx = object.x + (object.width ?? 64) / 2;
    const cy = object.y + (object.height ?? 64) / 2;
    const proximity = Math.max(0, Math.min(1, state.proximity ?? 0));
    const phase = state.phase ?? "idle";
    const phaseTime = Math.max(0, state.phaseTime ?? 0);
    const confirmProgress = phase === "confirm" ? Math.min(1, phaseTime / 0.42) : 0;
    const cooldownGlow = phase === "cooldown" ? Math.max(0, 1 - phaseTime / 0.5) : 0;
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(cx - 25, cy + 23, 50, 8);

    // Layered anvil-slab: plinth, block, beveled top rim, masonry joints.
    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(cx - 23, cy + 17, 46, 9);
    ctx.fillRect(cx - 19, cy - 20, 38, 45);
    ctx.fillStyle = COLORS.stone;
    ctx.fillRect(cx - 15, cy - 17, 30, 38);
    ctx.fillStyle = COLORS.stoneLight;
    ctx.fillRect(cx - 15, cy - 17, 30, 2);
    ctx.fillRect(cx - 15, cy - 15, 2, 32);
    ctx.fillStyle = "rgba(18,22,29,0.45)";
    ctx.fillRect(cx + 13, cy - 16, 2, 35);
    ctx.fillRect(cx - 13, cy - 7, 10, 1); ctx.fillRect(cx + 3, cy + 9, 10, 1);
    ctx.fillRect(cx - 8, cy + 14, 1, 4); ctx.fillRect(cx + 7, cy - 12, 1, 4);

    // Engraved channel first, then the ember glyph seated inside it. The glow
    // is a slow warm color ramp, not the old 4Hz two-color flash.
    ctx.fillStyle = "#1E1713";
    ctx.fillRect(cx - 3, cy - 13, 6, 26); ctx.fillRect(cx - 11, cy - 3, 22, 6);
    const emberPulse = 0.5 + 0.5 * Math.sin(time * 1.2);
    const glyphColor = cooldownGlow > 0.35
      ? COLORS.cyanSoft
      : confirmProgress > 0
        ? COLORS.fire
        : rampAt(EMBER_RAMP, emberPulse);
    const compression = confirmProgress > 0.62 ? 1 : 0;
    ctx.fillStyle = glyphColor;
    ctx.fillRect(cx - 2, cy - 12 + compression, 4, 24 - compression * 2);
    ctx.fillRect(cx - 10 + compression, cy - 2, 20 - compression * 2, 4);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(cx - 1, cy - 1, 2, 2);

    // Proximity lights the inlay studs in sequence; a successful refund lights
    // the whole cross before it cools back to the normal ember ramp.
    const studs = [[cx - 1, cy - 15], [cx + 11, cy - 1], [cx - 1, cy + 13], [cx - 13, cy - 1]];
    for (let index = 0; index < studs.length; index++) {
      const lit = proximity * studs.length > index || phase !== "idle";
      ctx.fillStyle = lit ? COLORS.gold : "#6E5A35";
      ctx.fillRect(studs[index][0], studs[index][1], 2, 2);
    }

    if (proximity > 0) {
      const previousAlpha = ctx.globalAlpha;
      ctx.globalAlpha = previousAlpha * proximity * 0.58;
      ctx.fillStyle = COLORS.cyan;
      ctx.fillRect(cx - 20, cy - 20, 5, 1); ctx.fillRect(cx - 20, cy - 20, 1, 5);
      ctx.fillRect(cx + 15, cy - 20, 5, 1); ctx.fillRect(cx + 19, cy - 20, 1, 5);
      ctx.globalAlpha = previousAlpha;
    }

    if (phase === "confirm" && !state.reducedMotion) {
      const burst = Math.sin(confirmProgress * Math.PI);
      ctx.fillStyle = COLORS.fire;
      for (let index = 0; index < 6; index++) {
        const angle = index * Math.PI / 3;
        const distance = 13 + Math.round(burst * 10);
        ctx.fillRect(
          Math.round(cx + Math.cos(angle) * distance),
          Math.round(cy + Math.sin(angle) * distance),
          index % 2 === 0 ? 2 : 1,
          1,
        );
      }
    }

    // Resting embers at the foot plus two deterministic rising flecks.
    ctx.fillStyle = COLORS.orange;
    ctx.fillRect(cx - 13, cy + 18, 2, 1); ctx.fillRect(cx + 9, cy + 19, 2, 1);
    for (let fleck = 0; fleck < 2; fleck++) {
      const cycle = (time * 0.45 + fleck * 0.5) % 1;
      const fade = Math.round(Math.min(1, Math.min(cycle, 1 - cycle) * 5) * 3) / 3;
      if (fade <= 0) continue;
      const previousAlpha = ctx.globalAlpha;
      ctx.globalAlpha = previousAlpha * fade * 0.8;
      ctx.fillStyle = fleck === 0 ? COLORS.fire : COLORS.orange;
      ctx.fillRect(
        cx - 6 + fleck * 11 + Math.round(Math.sin(time * 1.1 + fleck * 2.4) * 2),
        Math.round(cy - 22 - cycle * 12),
        1,
        1,
      );
      ctx.globalAlpha = previousAlpha;
    }
  }

  private drawTrainingMarker(
    ctx: CanvasRenderingContext2D,
    object: WorldObjectDefinition,
    time: number,
    state: TrainingMarkerRenderState = {},
  ): void {
    const cx = Math.round(object.x + (object.width ?? 80) / 2);
    const bottom = Math.round(object.y + (object.height ?? 80));
    const proximity = Math.max(0, Math.min(1, state.proximity ?? 0));
    const emblemSwing = Math.round(Math.sin(time * Math.PI * 2 / 2.8));
    const idlePulse = 0.5 + 0.5 * Math.sin(time * Math.PI * 2 / 2.6);

    this.drawTrainingMarkerBase(ctx, cx, bottom);
    this.drawTrainingMarkerFrame(ctx, cx, bottom, emblemSwing, idlePulse, proximity);
    this.drawTrainingMarkerTarget(ctx, cx, bottom - 36, idlePulse, proximity);
  }

  private drawTrainingMarkerBase(ctx: CanvasRenderingContext2D, cx: number, bottom: number): void {
    ctx.fillStyle = "rgba(4,7,8,0.38)";
    ctx.fillRect(cx - 31, bottom - 7, 62, 5);
    ctx.fillStyle = TRAINING_MARKER_COLORS.stoneDark;
    ctx.fillRect(cx - 23, bottom - 18, 46, 2);
    ctx.fillRect(cx - 29, bottom - 16, 58, 10);
    ctx.fillRect(cx - 25, bottom - 6, 50, 4);
    ctx.fillStyle = TRAINING_MARKER_COLORS.stone;
    ctx.fillRect(cx - 20, bottom - 15, 40, 2);
    ctx.fillRect(cx - 25, bottom - 13, 50, 6);
    ctx.fillRect(cx - 21, bottom - 7, 42, 2);
    ctx.fillStyle = COLORS.stoneLight;
    ctx.fillRect(cx - 19, bottom - 14, 38, 1);
    ctx.fillRect(cx - 24, bottom - 12, 2, 4);
    ctx.fillStyle = "rgba(18,22,29,0.48)";
    ctx.fillRect(cx - 13, bottom - 9, 11, 1);
    ctx.fillRect(cx + 6, bottom - 12, 13, 1);
  }

  private drawTrainingMarkerFrame(
    ctx: CanvasRenderingContext2D,
    cx: number,
    bottom: number,
    emblemSwing: number,
    idlePulse: number,
    proximity: number,
  ): void {
    ctx.fillStyle = TRAINING_MARKER_COLORS.woodDark;
    ctx.fillRect(cx - 5, bottom - 65, 10, 49);
    ctx.fillRect(cx - 28, bottom - 58, 56, 9);
    ctx.fillStyle = TRAINING_MARKER_COLORS.woodWear;
    ctx.fillRect(cx - 2, bottom - 63, 2, 45);
    ctx.fillRect(cx - 25, bottom - 55, 47, 2);
    ctx.fillRect(cx + 19, bottom - 57, 5, 1);
    ctx.fillStyle = TRAINING_MARKER_COLORS.gold;
    ctx.fillRect(cx - 7, bottom - 52, 3, 5);
    ctx.fillRect(cx + 4, bottom - 52, 3, 5);
    ctx.fillRect(cx - 2, bottom - 20, 4, 3);

    const emblemX = cx + emblemSwing;
    const emblemTop = bottom - 72;
    ctx.fillStyle = TRAINING_MARKER_COLORS.gold;
    ctx.fillRect(emblemX - 2, emblemTop, 4, 2);
    ctx.fillRect(emblemX - 5, emblemTop + 2, 10, 2);
    ctx.fillRect(emblemX - 7, emblemTop + 4, 14, 5);
    ctx.fillRect(emblemX - 5, emblemTop + 9, 10, 2);
    ctx.fillRect(emblemX - 2, emblemTop + 11, 4, 2);
    ctx.fillStyle = "#5B2736";
    ctx.fillRect(emblemX - 4, emblemTop + 3, 8, 7);

    const previousAlpha = ctx.globalAlpha;
    ctx.globalAlpha = previousAlpha * Math.min(1, 0.72 + idlePulse * 0.18 + proximity * 0.1);
    ctx.fillStyle = TRAINING_MARKER_COLORS.proximity;
    ctx.fillRect(emblemX - 1, emblemTop + 3, 2, 7);
    ctx.fillRect(emblemX - 4, emblemTop + 6, 8, 2);
    ctx.fillStyle = COLORS.cyanSoft;
    ctx.fillRect(emblemX, emblemTop + 6, 1, 1);
    ctx.globalAlpha = previousAlpha;
  }

  private drawTrainingMarkerTarget(
    ctx: CanvasRenderingContext2D,
    targetX: number,
    targetY: number,
    idlePulse: number,
    proximity: number,
  ): void {
    if (proximity > 0) {
      const previousAlpha = ctx.globalAlpha;
      ctx.globalAlpha = previousAlpha * proximity * 0.68;
      ctx.fillStyle = TRAINING_MARKER_COLORS.proximity;
      ctx.fillRect(targetX - 16, targetY - 14, 32, 1);
      ctx.fillRect(targetX - 18, targetY - 11, 1, 22);
      ctx.fillRect(targetX + 17, targetY - 11, 1, 22);
      ctx.fillRect(targetX - 13, targetY + 14, 26, 1);
      ctx.globalAlpha = previousAlpha;
    }

    ctx.fillStyle = TRAINING_MARKER_COLORS.stoneDark;
    ctx.fillRect(targetX - 19, targetY - 17, 38, 18);
    ctx.fillRect(targetX - 16, targetY + 1, 32, 5);
    ctx.fillRect(targetX - 12, targetY + 6, 24, 4);
    ctx.fillRect(targetX - 7, targetY + 10, 14, 3);
    ctx.fillStyle = TRAINING_MARKER_COLORS.stone;
    ctx.fillRect(targetX - 16, targetY - 14, 32, 14);
    ctx.fillRect(targetX - 13, targetY, 26, 4);
    ctx.fillRect(targetX - 9, targetY + 4, 18, 3);
    ctx.fillRect(targetX - 5, targetY + 7, 10, 2);
    ctx.fillStyle = TRAINING_MARKER_COLORS.gold;
    ctx.fillRect(targetX - 8, targetY - 12, 16, 2);
    ctx.fillRect(targetX - 11, targetY - 10, 22, 16);
    ctx.fillRect(targetX - 8, targetY + 6, 16, 2);
    ctx.fillStyle = TRAINING_MARKER_COLORS.target;
    ctx.fillRect(targetX - 7, targetY - 9, 14, 14);
    ctx.fillRect(targetX - 9, targetY - 7, 18, 10);

    const previousAlpha = ctx.globalAlpha;
    ctx.globalAlpha = previousAlpha * Math.min(1, 0.82 + idlePulse * 0.18);
    ctx.fillStyle = TRAINING_MARKER_COLORS.core;
    ctx.fillRect(targetX - 4, targetY - 4, 8, 8);
    ctx.fillStyle = "#FFF3B8";
    ctx.fillRect(targetX - 1, targetY - 5, 2, 10);
    ctx.fillRect(targetX - 5, targetY - 1, 10, 2);
    ctx.globalAlpha = previousAlpha;
  }

  private drawGardenWish(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
    drawRitualSpring(ctx, {
      x: object.x + (object.width ?? 96) / 2,
      y: 798,
      scale: 0.7,
      time,
      theme: "hub",
    });
  }
}
