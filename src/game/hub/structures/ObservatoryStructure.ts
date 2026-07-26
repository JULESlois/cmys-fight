import type { WorldObjectDefinition } from "../../world/WorldMap";
import type { HubStructureDefinition } from "../HubStructure";
import {
  HUB_ART_COLORS as C,
  archWindow,
  artPartOf,
  banner,
  buttress,
  groundShadow,
  originOf,
  rect,
  stoneCourses,
  stoneFrame,
  stoneSteps,
} from "./HubArtPrimitives";

export const OBSERVATORY_STRUCTURE: HubStructureDefinition = {
  id: "observatory_keep",
  artModule: "observatory",
  origin: { x: 944, y: 64 },
  visualBounds: { x: -8, y: -8, width: 240, height: 196 },
  rearAccessRule: "blocked-footprint",
  visualParts: [
    { id: "shadow", artPart: "shadow", bounds: { x: 4, y: 130, width: 216, height: 18 }, layer: "back" },
    { id: "facade", artPart: "facade", bounds: { x: 4, y: 40, width: 216, height: 108 }, layer: "sorted", sortY: 140 },
    { id: "astral_console_prop", artPart: "astral_console", bounds: { x: 76, y: 126, width: 72, height: 62 }, layer: "sorted", sortY: 188, visiblePropId: "astral_console", collisionPolicy: "custom" },
    { id: "astral_fx", artPart: "astral_fx", bounds: { x: 52, y: -4, width: 122, height: 76 }, layer: "upper", collisionPolicy: "none" },
  ],
  occluders: [
    { id: "dome", artPart: "dome", bounds: { x: 30, y: 0, width: 164, height: 82 }, sortY: 92 },
    { id: "door_pillars", artPart: "door_pillars", bounds: { x: 80, y: 88, width: 64, height: 58 }, sortY: 144 },
  ],
  colliders: [
    { id: "rear_block", shape: "rect", x: 26, y: 68, width: 172, height: 28 },
    { id: "foundation_rear", shape: "rect", x: 14, y: 96, width: 196, height: 18 },
    { id: "foot_west", shape: "rect", x: 10, y: 114, width: 76, height: 30 },
    { id: "foot_east", shape: "rect", x: 138, y: 114, width: 76, height: 30 },
    { id: "pylon_west", shape: "rect", x: 4, y: 92, width: 24, height: 46 },
    { id: "pylon_east", shape: "rect", x: 196, y: 92, width: 24, height: 46 },
    { id: "astral_console_foot", shape: "rect", x: 77, y: 164, width: 70, height: 24, visiblePropId: "astral_console" },
  ],
  interactions: [
    {
      id: "astral_console",
      type: "interactable",
      action: "open_settings",
      promptKey: "hub.settings",
      promptAnchor: { x: 112, y: 136 },
      visiblePropId: "astral_console",
      interaction: {
        zone: { shape: "rect", x: 72, y: 136, width: 80, height: 54 },
        lineOfSightTarget: { x: 112, y: 190 },
        requireLineOfSight: true,
      },
    },
  ],
  anchors: {
    observatory_entry: { x: 112, y: 198 },
    observatory_rear_test: { x: 112, y: 58 },
  },
};

const TAU = Math.PI * 2;

/** Dome courses from crown to base (4px tall, circle-eased widths so the profile reads round). */
const DOME_ROWS: readonly number[] = [18, 44, 62, 78, 96, 110, 122, 132, 140, 146, 150];

/** Constellation charts projected on the facade panels; points live in a 26x22 inset. */
const STAR_CHARTS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [[3, 15], [7, 7], [12, 11], [17, 4], [22, 12], [19, 18]],
  [[3, 5], [8, 13], [13, 6], [17, 16], [23, 9]],
];

const FX_TWINKLES: ReadonlyArray<readonly [number, number]> = [
  [-52, 22], [48, 18], [-38, 64], [42, 60], [6, 4],
];

function chartSegment(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
): void {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  if (steps <= 0) return;
  for (let step = 1; step < steps; step++) {
    rect(ctx, color, x1 + (x2 - x1) * step / steps, y1 + (y2 - y1) * step / steps, 1, 1);
  }
}

/** Cool window glass that pulses through three cyan shades (period 2.5s). */
function windowPulse(time: number, seed: number): string {
  const shades = ["#4FB6C3", "#5CCBD7", "#6FDDE6"] as const;
  return shades[Math.floor(time * 1.2 + seed * 0.9) % 3];
}

export function drawObservatoryStructure(ctx: CanvasRenderingContext2D, object: WorldObjectDefinition, time: number): void {
  const { x, y } = originOf(object);
  const part = artPartOf(object);
  const w = 224;
  const center = x + w / 2;
  if (part === "shadow") {
    groundShadow(ctx, x + 8, y + 140, w - 16, 11);
    return;
  }
  if (part === "dome") {
    // Masonry drum peeking above the facade parapet.
    rect(ctx, "#1B2A32", center - 80, y + 55, 160, 14);
    rect(ctx, "#22343D", center - 79, y + 56, 158, 12);
    rect(ctx, "#2E4B58", center - 76, y + 57, 152, 3);
    // Silhouette outline pass so the dome reads against the wall.
    for (let row = 0; row < DOME_ROWS.length; row++) {
      rect(ctx, "#141F26", center - DOME_ROWS[row] / 2 - 1, y + 11 + row * 4, DOME_ROWS[row] + 2, 6);
    }
    // Smooth copper-blue dome shell, shaded darker toward the right edge.
    for (let row = 0; row < DOME_ROWS.length; row++) {
      const rowWidth = DOME_ROWS[row];
      const rowY = y + 12 + row * 4;
      rect(ctx, "#35596A", center - rowWidth / 2, rowY, rowWidth, 4);
      rect(ctx, "#3F6B7C", center - rowWidth / 2 + 1, rowY, Math.round(rowWidth * 0.42), 4);
      rect(ctx, "#2A4551", center + rowWidth / 2 - Math.max(2, Math.round(rowWidth * 0.12)), rowY, Math.max(2, Math.round(rowWidth * 0.12)), 4);
      if (row < 7) {
        rect(ctx, "#4E7E90", center - Math.round(rowWidth * 0.38), rowY, Math.max(3, Math.round(rowWidth * 0.22)), 1);
      }
      // Curved meridian seams.
      const rib = Math.round(rowWidth * 0.36);
      rect(ctx, "rgba(20,31,38,0.4)", center - rib, rowY, 1, 4);
      rect(ctx, "rgba(20,31,38,0.4)", center + rib - 1, rowY, 1, 4);
      if (row % 3 === 1) rect(ctx, "rgba(20,31,38,0.3)", center - rowWidth / 2 + 2, rowY + 3, rowWidth - 4, 1);
    }
    // Observation slit with a cyan-lit aperture.
    rect(ctx, "#0E1A21", center - 6, y + 12, 12, 28);
    rect(ctx, "rgba(114,224,232,0.5)", center - 7, y + 14, 1, 24);
    rect(ctx, "rgba(114,224,232,0.5)", center + 6, y + 14, 1, 24);
    rect(ctx, "rgba(114,224,232,0.24)", center - 5, y + 33, 10, 6);
    // Telescope barrel slowly tracking across the sky (period 9s, +/-0.12 rad).
    const trackAngle = -Math.PI * 0.34 + Math.sin(time * TAU / 9) * 0.12;
    rect(ctx, "#141F26", center - 8, y + 31, 16, 10);
    rect(ctx, "#1C2B33", center - 7, y + 32, 14, 8);
    rect(ctx, "#3A5C6B", center - 5, y + 33, 10, 2);
    for (let segment = 0; segment < 5; segment++) {
      const reach = 5 + segment * 4;
      const size = 8 - segment;
      const segX = center + Math.cos(trackAngle) * reach;
      const segY = y + 34 + Math.sin(trackAngle) * reach;
      rect(ctx, "#101D24", segX - size / 2 - 1, segY - size / 2 - 1, size + 2, size + 2);
    }
    for (let segment = 0; segment < 5; segment++) {
      const reach = 5 + segment * 4;
      const size = 8 - segment;
      const segX = center + Math.cos(trackAngle) * reach;
      const segY = y + 34 + Math.sin(trackAngle) * reach;
      rect(ctx, "#31505E", segX - size / 2, segY - size / 2, size, size);
      rect(ctx, "#5F8B9B", segX - size / 2, segY - size / 2, size, 1);
    }
    const tipX = center + Math.cos(trackAngle) * 29;
    const tipY = y + 34 + Math.sin(trackAngle) * 29;
    rect(ctx, "#141F26", tipX - 3, tipY - 3, 6, 6);
    rect(ctx, "#101D24", tipX - 2, tipY - 2, 4, 4);
    rect(ctx, C.cyanLight, tipX - 1, tipY - 1, 3, 3);
    rect(ctx, C.cyanSoft, tipX, tipY - 1, 1, 1);
    // Crown beacon on a side mast (blinks on a 3.2s cycle).
    rect(ctx, "#141F26", center - 18, y + 7, 4, 12);
    rect(ctx, "#22343D", center - 17, y + 8, 2, 10);
    const beaconOn = Math.floor(time / 1.6) % 2 === 0;
    if (beaconOn) rect(ctx, "rgba(183,250,245,0.25)", center - 19, y + 3, 6, 6);
    rect(ctx, beaconOn ? C.cyanSoft : "#2E4B58", center - 18, y + 4, 4, 4);
    return;
  }
  if (part === "facade") {
    stoneSteps(ctx, center, y + 138, w - 64, 4, "#5C7F8E");
    stoneFrame(ctx, x + 22, y + 70, w - 44, 72, "#658CA0", C.cyanStone);
    stoneCourses(ctx, x + 24, y + 72, w - 48, 66, "rgba(114,224,232,0.16)");
    for (let towerIndex = 0; towerIndex < 2; towerIndex++) {
      const towerX = towerIndex === 0 ? x + 4 : x + w - 50;
      stoneFrame(ctx, towerX, y + 54, 46, 88, "#658CA0", C.cyanStone);
      buttress(ctx, towerX - 4, y + 80, 62, C.cyanStone, "#658CA0");
      buttress(ctx, towerX + 38, y + 80, 62, C.cyanStone, "#658CA0");
      // Mini observation turret capping each pylon.
      rect(ctx, "#141F26", towerX + 8, y + 41, 30, 19);
      rect(ctx, C.stoneDark, towerX + 9, y + 42, 28, 17);
      rect(ctx, "#141F26", towerX + 11, y + 35, 24, 8);
      rect(ctx, "#335869", towerX + 12, y + 36, 22, 7);
      rect(ctx, "#141F26", towerX + 13, y + 30, 20, 6);
      rect(ctx, "#3D6879", towerX + 14, y + 31, 18, 5);
      rect(ctx, "#4E7E90", towerX + 16, y + 32, 8, 1);
      rect(ctx, "#141F26", towerX + 16, y + 26, 14, 5);
      rect(ctx, "#335869", towerX + 17, y + 27, 12, 4);
      rect(ctx, "#0E1A21", towerX + 21, y + 30, 4, 11);
      rect(ctx, "rgba(114,224,232,0.4)", towerX + 22, y + 32, 2, 7);
      const towerBlink = Math.floor(time / 1.6 + towerIndex * 0.5) % 2 === 0;
      rect(ctx, towerBlink ? C.cyanLight : "#3D6879", towerX + 22, y + 24, 2, 3);
      archWindow(ctx, towerX + 23, y + 78, 14, 28, windowPulse(time, towerIndex), "#263D48");
    }
    stoneFrame(ctx, center - 54, y + 46, 108, 96, "#6D95A6", C.cyanStone);
    stoneCourses(ctx, center - 52, y + 48, 104, 90, "rgba(164,225,232,0.2)");
    // Star-chart projection panels break up the flat upper wall.
    for (let panelIndex = 0; panelIndex < STAR_CHARTS.length; panelIndex++) {
      const panelX = panelIndex === 0 ? center - 48 : center + 22;
      rect(ctx, "#141F26", panelX - 1, y + 51, 28, 24);
      rect(ctx, "#152430", panelX, y + 52, 26, 22);
      rect(ctx, "#0E1A21", panelX, y + 52, 26, 1);
      const chart = STAR_CHARTS[panelIndex];
      for (let starIndex = 0; starIndex + 1 < chart.length; starIndex++) {
        chartSegment(
          ctx,
          panelX + chart[starIndex][0],
          y + 52 + chart[starIndex][1],
          panelX + chart[starIndex + 1][0],
          y + 52 + chart[starIndex + 1][1],
          "rgba(114,224,232,0.26)",
        );
      }
      for (let starIndex = 0; starIndex < chart.length; starIndex++) {
        const twinkle = Math.floor(time * 2 + starIndex * 1.3 + panelIndex * 2.1) % 4;
        const starX = panelX + chart[starIndex][0];
        const starY = y + 52 + chart[starIndex][1];
        rect(ctx, twinkle === 0 ? "#EAFBFF" : twinkle === 1 ? "#9FE8EE" : "#5FB9C4", starX, starY, 1, 1);
        if (twinkle === 0) {
          rect(ctx, "rgba(183,250,245,0.5)", starX - 1, starY, 3, 1);
          rect(ctx, "rgba(183,250,245,0.5)", starX, starY - 1, 1, 3);
        }
      }
    }
    // Twin rune rings rotating slowly above the doorway (18s outer, 26s counter inner).
    const ringCX = center;
    const ringCY = y + 74;
    rect(ctx, C.purpleDark, ringCX - 2, ringCY - 2, 5, 5);
    rect(ctx, C.gold, ringCX - 1, ringCY - 1, 3, 3);
    for (let rune = 0; rune < 8; rune++) {
      const angle = rune * TAU / 8 + time * TAU / 18;
      const runeX = ringCX + Math.cos(angle) * 16;
      const runeY = ringCY + Math.sin(angle) * 9;
      rect(ctx, (rune + Math.floor(time)) % 4 === 0 ? C.cyanSoft : "#57BFC9", runeX - 1, runeY - 1, 2, 2);
    }
    for (let rune = 0; rune < 5; rune++) {
      const angle = rune * TAU / 5 - time * TAU / 26;
      const runeX = ringCX + Math.cos(angle) * 9;
      const runeY = ringCY + Math.sin(angle) * 5;
      rect(ctx, (rune + Math.floor(time * 0.5)) % 5 === 0 ? "#C9A6FF" : C.purple, runeX, runeY, 1, 1);
    }
    archWindow(ctx, center - 31, y + 80, 14, 29, windowPulse(time, 2), "#263D48");
    archWindow(ctx, center + 31, y + 80, 14, 29, windowPulse(time, 3), "#263D48");
    rect(ctx, "rgba(114,224,232,0.22)", center - 37, y + 110, 12, 1);
    rect(ctx, "rgba(114,224,232,0.22)", center + 25, y + 110, 12, 1);
    // Doorway with a lit lintel lamp and interior glow.
    rect(ctx, C.stoneDark, center - 18, y + 103, 36, 39);
    rect(ctx, C.stoneDark, center - 13, y + 97, 26, 8);
    rect(ctx, "#18272E", center - 12, y + 107, 24, 35);
    rect(ctx, "rgba(92,203,215,0.30)", center - 12, y + 107, 24, 2);
    rect(ctx, "rgba(92,203,215,0.12)", center - 10, y + 109, 20, 8);
    rect(ctx, "#141F26", center - 5, y + 99, 10, 4);
    rect(ctx, Math.floor(time * 1.2) % 3 === 0 ? C.cyanSoft : C.cyanLight, center - 3, y + 100, 6, 2);
    banner(ctx, x + 58, y + 106, 14, 28, "#2E5468", C.cyanSoft, Math.round(Math.sin(time * 2) * 1));
    banner(ctx, x + w - 72, y + 106, 14, 28, "#2E5468", C.cyanSoft, -Math.round(Math.sin(time * 2) * 1));
    return;
  }
  if (part === "door_pillars") {
    for (let pillarIndex = 0; pillarIndex < 2; pillarIndex++) {
      const pillarX = pillarIndex === 0 ? center - 25 : center + 17;
      rect(ctx, "#141F26", pillarX - 1, y + 91, 10, 54);
      rect(ctx, C.stoneDark, pillarX, y + 92, 8, 52);
      rect(ctx, "#658CA0", pillarX + 2, y + 96, 3, 42);
      const capOn = Math.floor(time / 1.6 + pillarIndex) % 2 === 0;
      rect(ctx, capOn ? C.cyanLight : C.cyanStone, pillarX + 2, y + 93, 4, 2);
    }
    return;
  }
  if (part === "astral_console") {
    const cx = center;
    const bottom = y + 188;
    groundShadow(ctx, cx - 36, bottom - 7, 72, 8);
    rect(ctx, "#141F26", cx - 36, bottom - 17, 72, 17);
    rect(ctx, C.stoneDark, cx - 35, bottom - 16, 70, 16);
    rect(ctx, "#141F26", cx - 31, bottom - 35, 62, 21);
    rect(ctx, C.stoneDark, cx - 30, bottom - 34, 60, 19);
    rect(ctx, "#365D6E", cx - 26, bottom - 30, 52, 12);
    rect(ctx, "#527F91", cx - 22, bottom - 28, 44, 3);
    for (let key = -18; key <= 18; key += 9) {
      const keyOn = Math.floor(time * 2 + (key + 18) * 0.13) % 5 !== 0;
      rect(ctx, keyOn ? C.cyanLight : "#2E4B58", cx + key, bottom - 24, 4, 3);
    }
    rect(ctx, "#141F26", cx - 6, bottom - 63, 12, 32);
    rect(ctx, C.stoneDark, cx - 5, bottom - 62, 10, 30);
    ctx.strokeStyle = C.cyanLight;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 22, bottom - 79, 44, 29);
    ctx.strokeStyle = "rgba(155,116,213,0.85)";
    ctx.strokeRect(cx - 15, bottom - 85, 30, 41);
    // Gold star core pulses; twin motes orbit the holo chart smoothly (6s).
    const corePulse = Math.floor(time * 2) % 2;
    rect(ctx, C.gold, cx - 3 - corePulse, bottom - 70 - corePulse, 6 + corePulse * 2, 6 + corePulse * 2);
    const orbit = time * TAU / 6;
    rect(ctx, C.cyanSoft, cx + Math.cos(orbit) * 19 - 2, bottom - 66 + Math.sin(orbit) * 12 - 2, 4, 4);
    rect(ctx, C.purple, cx + Math.cos(-orbit + 2.1) * 13 - 2, bottom - 66 + Math.sin(-orbit + 2.1) * 16 - 2, 4, 4);
    return;
  }
  if (part === "astral_fx") {
    // Sparse star sparkles over the dome and chart wall.
    for (let sparkIndex = 0; sparkIndex < FX_TWINKLES.length; sparkIndex++) {
      const stage = Math.floor(time * 0.8 + sparkIndex * 1.37) % 5;
      const sparkX = center + FX_TWINKLES[sparkIndex][0];
      const sparkY = y + FX_TWINKLES[sparkIndex][1];
      if (stage === 0) {
        rect(ctx, "rgba(183,250,245,0.85)", sparkX, sparkY, 1, 1);
        rect(ctx, "rgba(183,250,245,0.4)", sparkX - 1, sparkY, 3, 1);
        rect(ctx, "rgba(183,250,245,0.4)", sparkX, sparkY - 1, 1, 3);
      } else if (stage === 1) {
        rect(ctx, "rgba(143,231,238,0.5)", sparkX, sparkY, 1, 1);
      }
    }
    // A tiny satellite mote circles the dome crown (14s) and dips behind it.
    const satAngle = time * TAU / 14;
    if (Math.sin(satAngle) > -0.15) {
      const satX = center + Math.cos(satAngle) * 44;
      const satY = y + 30 + Math.sin(satAngle) * 13;
      rect(ctx, "rgba(114,224,232,0.35)", center + Math.cos(satAngle - 0.22) * 44, y + 30 + Math.sin(satAngle - 0.22) * 13, 1, 1);
      rect(ctx, C.cyanSoft, satX - 1, satY - 1, 2, 2);
    }
  }
}
