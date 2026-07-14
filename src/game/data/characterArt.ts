export type CharacterSpriteData = string[];

type PixelCanvas = string[][];
type Point = readonly [number, number];

// Michele and Kanami use a denser source grid than CMYS, but are rendered at
// the same final 30-32px height. Geometry remains authored in the original
// 48x64 logical coordinate space and is rasterized onto a 32x32 canvas.
const CHARACTER_WIDTH = 32;
const CHARACTER_HEIGHT = 32;
const LOGICAL_X_SCALE = 0.5;
const LOGICAL_Y_SCALE = 30 / 63;
const LOGICAL_X_OFFSET = 4;

function createCanvas(): PixelCanvas {
  return Array.from({ length: CHARACTER_HEIGHT }, () => Array.from({ length: CHARACTER_WIDTH }, () => "."));
}

function pixel(canvas: PixelCanvas, x: number, y: number, color: string): void {
  const px = Math.round(x * LOGICAL_X_SCALE) + LOGICAL_X_OFFSET;
  const py = Math.round(y * LOGICAL_Y_SCALE);
  if (px < 0 || py < 0 || px >= CHARACTER_WIDTH || py >= CHARACTER_HEIGHT) return;
  canvas[py][px] = color;
}

function rect(canvas: PixelCanvas, x: number, y: number, width: number, height: number, color: string): void {
  for (let py = Math.round(y); py < Math.round(y + height); py++) {
    for (let px = Math.round(x); px < Math.round(x + width); px++) pixel(canvas, px, py, color);
  }
}

function ellipse(canvas: PixelCanvas, cx: number, cy: number, rx: number, ry: number, color: string): void {
  const minX = Math.floor(cx - rx);
  const maxX = Math.ceil(cx + rx);
  const minY = Math.floor(cy - ry);
  const maxY = Math.ceil(cy + ry);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const nx = (x - cx) / Math.max(0.001, rx);
      const ny = (y - cy) / Math.max(0.001, ry);
      if (nx * nx + ny * ny <= 1) pixel(canvas, x, y, color);
    }
  }
}

function line(canvas: PixelCanvas, x0: number, y0: number, x1: number, y1: number, color: string, thickness = 1): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    const x = Math.round(x0 + dx * t);
    const y = Math.round(y0 + dy * t);
    const half = Math.floor(thickness / 2);
    rect(canvas, x - half, y - half, thickness, thickness, color);
  }
}

function polygon(canvas: PixelCanvas, points: readonly Point[], color: string): void {
  if (points.length < 3) return;
  const minY = Math.floor(Math.min(...points.map(([, y]) => y)));
  const maxY = Math.ceil(Math.max(...points.map(([, y]) => y)));
  for (let y = minY; y <= maxY; y++) {
    const intersections: number[] = [];
    for (let index = 0; index < points.length; index++) {
      const [x1, y1] = points[index];
      const [x2, y2] = points[(index + 1) % points.length];
      if (y1 === y2) continue;
      const lowY = Math.min(y1, y2);
      const highY = Math.max(y1, y2);
      if (y < lowY || y >= highY) continue;
      const t = (y - y1) / (y2 - y1);
      intersections.push(x1 + (x2 - x1) * t);
    }
    intersections.sort((a, b) => a - b);
    for (let index = 0; index + 1 < intersections.length; index += 2) {
      const start = Math.ceil(intersections[index]);
      const end = Math.floor(intersections[index + 1]);
      for (let x = start; x <= end; x++) pixel(canvas, x, y, color);
    }
  }
}

function finish(canvas: PixelCanvas): CharacterSpriteData {
  return canvas.map(row => row.join(""));
}

function rasterPixel(canvas: PixelCanvas, x: number, y: number, color: string): void {
  if (x < 0 || y < 0 || x >= CHARACTER_WIDTH || y >= CHARACTER_HEIGHT) return;
  canvas[y][x] = color;
}

type RasterXMapper = (x: number, y: number) => number;

/**
 * Pull selected outer columns toward the character centre without resampling
 * the face and torso as a bitmap. Pixels farther from the centre are written
 * first, allowing central facial and costume details to retain priority when
 * two authored columns collapse onto the same destination column.
 */
function remapRasterColumns(canvas: PixelCanvas, mapX: RasterXMapper): PixelCanvas {
  const output = createCanvas();
  const centreX = (CHARACTER_WIDTH - 1) / 2;

  for (let y = 0; y < CHARACTER_HEIGHT; y++) {
    const occupied = canvas[y]
      .map((color, x) => ({ color, x }))
      .filter(pixelData => pixelData.color !== ".")
      .sort((left, right) => Math.abs(right.x - centreX) - Math.abs(left.x - centreX));

    for (const pixelData of occupied) {
      const targetX = Math.max(0, Math.min(CHARACTER_WIDTH - 1, mapX(pixelData.x, y)));
      output[y][targetX] = pixelData.color;
    }
  }

  return output;
}

function compactEsperZeroSilhouette(canvas: PixelCanvas): PixelCanvas {
  return remapRasterColumns(canvas, (x, y) => {
    // Preserve the eye spacing and centre fringe; only the outer bob is drawn in.
    if (y <= 11) {
      if (x <= 10) return x + 1;
      if (x >= 22) return x - 1;
      return x;
    }

    // Sleeves, cuffs and skirt panels supplied most of the unwanted width.
    if (y <= 22) {
      if (x <= 9) return x + 3;
      if (x <= 12) return x + 1;
      if (x >= 24) return x - 3;
      if (x >= 21) return x - 1;
      return x;
    }

    // Keep the authored stride while reducing the static wide-legged stance.
    if (x <= 10) return x + 2;
    if (x <= 12) return x + 1;
    if (x >= 24) return x - 2;
    if (x >= 21) return x - 1;
    return x;
  });
}

function compactNanallySilhouette(canvas: PixelCanvas, phase: number): PixelCanvas {
  return remapRasterColumns(canvas, (x, y) => {
    // Draw the cat ears and side hair inward while leaving both lenses intact.
    if (y <= 11) {
      if (x <= 10) return x + (phase === 2 ? 3 : 1);
      if (x >= 22) return x - (phase === 2 ? 2 : 1);
      return x;
    }

    // The oversized coat should hang vertically rather than spread sideways.
    if (y <= 23) {
      if (x <= 5) return x + 5;
      if (x <= 10) return x + 3;
      if (x <= 12) return x + 1;
      if (x >= 28) return x - 4;
      if (x >= 24) return x - 3;
      if (x >= 21) return x - 1;
      return x;
    }

    // Bring the boots beneath the hips without removing the asymmetric pose.
    if (x <= 7) return x + 3;
    if (x <= 13) return x + 1;
    if (x >= 25) return x - 3;
    if (x >= 21) return x - 1;
    return x;
  });
}

function rasterSpan(canvas: PixelCanvas, x0: number, x1: number, y: number, color: string): void {
  for (let x = x0; x <= x1; x++) rasterPixel(canvas, x, y, color);
}

function rasterRect(canvas: PixelCanvas, x: number, y: number, width: number, height: number, color: string): void {
  for (let row = y; row < y + height; row++) rasterSpan(canvas, x, x + width - 1, row, color);
}

function rasterLine(
  canvas: PixelCanvas,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  thickness = 1,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(1, Math.abs(dx), Math.abs(dy));
  const half = Math.floor(thickness / 2);
  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    const x = Math.round(x0 + dx * t);
    const y = Math.round(y0 + dy * t);
    rasterRect(canvas, x - half, y - half, thickness, thickness, color);
  }
}

function drawChibiHead(
  canvas: PixelCanvas,
  bob: number,
  outlineColor: string,
  skinColor: string,
  variant: "round" | "narrow" | "soft",
): void {
  // The runtime mirrors this right-facing sprite. These are deliberately
  // front-biased three-quarter chibi heads: both eyes remain visible, while
  // the silhouette never grows a profile nose.
  if (variant === "round") {
    ellipse(canvas, 24, 15 + bob, 8.5, 9.5, outlineColor);
    ellipse(canvas, 24, 15 + bob, 7.5, 8.5, skinColor);
    return;
  }
  if (variant === "narrow") {
    ellipse(canvas, 24, 14.5 + bob, 7.5, 10, outlineColor);
    ellipse(canvas, 24, 14.5 + bob, 6.5, 9, skinColor);
    return;
  }
  ellipse(canvas, 24, 15 + bob, 7.5, 10.5, outlineColor);
  ellipse(canvas, 24, 15 + bob, 6.5, 9.5, skinColor);
}

function faceRasterOffset(bob: number): number {
  return Math.round(bob * LOGICAL_Y_SCALE);
}

function drawMicheleFace(canvas: PixelCanvas, bob: number): void {
  const y = 7 + faceRasterOffset(bob);
  // Round, open and energetic. The near eye is wider, but no white highlight
  // is used so the saturated cyan-blue iris remains the dominant signal.
  rasterPixel(canvas, 14, y, "A");
  rasterPixel(canvas, 14, y + 1, "H");
  rasterPixel(canvas, 18, y, "A");
  rasterPixel(canvas, 19, y, "A");
  rasterPixel(canvas, 18, y + 1, "H");
  rasterPixel(canvas, 19, y + 1, "H");
  // Small, slightly open smile.
  rasterPixel(canvas, 17, y + 3, "E");
  rasterPixel(canvas, 18, y + 3, "E");
}

function drawKanamiFace(canvas: PixelCanvas, bob: number): void {
  const y = 7 + faceRasterOffset(bob);
  // Slim upturned eyelids and cool irises create a self-assured idol gaze.
  rasterPixel(canvas, 14, y, "R");
  rasterPixel(canvas, 14, y + 1, "H");
  rasterPixel(canvas, 18, y, "R");
  rasterPixel(canvas, 19, y, "R");
  rasterPixel(canvas, 18, y + 1, "H");
  rasterPixel(canvas, 19, y + 1, "M");
  // Offset single-pixel smile rather than the shared neutral mouth.
  rasterPixel(canvas, 18, y + 3, "E");
}

function drawCelestiaFace(canvas: PixelCanvas, bob: number): void {
  const y = 8 + faceRasterOffset(bob);
  // Lower, softer half-lidded violet eyes. Both eyes remain visible, while the
  // near eye carries the larger iris area and the far eye stays understated.
  rasterPixel(canvas, 14, y, "A");
  rasterPixel(canvas, 14, y + 1, "L");
  rasterPixel(canvas, 18, y, "A");
  rasterPixel(canvas, 19, y, "A");
  rasterPixel(canvas, 18, y + 1, "L");
  rasterPixel(canvas, 19, y + 1, "K");
  rasterPixel(canvas, 17, y + 3, "E");
}

function drawMicheleLeg(
  canvas: PixelCanvas,
  hipX: number,
  kneeX: number,
  ankleX: number,
  footX: number,
  skinColor: string,
  soleColor: string,
  foreground: boolean,
): void {
  const outerThickness = foreground ? 7 : 6;
  const innerThickness = foreground ? 5 : 4;
  line(canvas, hipX, 44, kneeX, 51, "A", outerThickness);
  line(canvas, kneeX, 51, ankleX, 57, "A", outerThickness);
  line(canvas, hipX, 44, kneeX, 51, skinColor, innerThickness);
  line(canvas, kneeX, 51, ankleX, 56, skinColor, innerThickness);
  line(canvas, ankleX, 55, footX, 59, "K", foreground ? 5 : 4);
  line(canvas, footX - 2, 61, footX + 4, 61, soleColor, 2);
}

function drawMicheleLegs(canvas: PixelCanvas, phase: number, idle: boolean): void {
  if (idle) {
    drawMicheleLeg(canvas, 20, 20, 19, 17, "E", "L", false);
    drawMicheleLeg(canvas, 29, 29, 30, 31, "F", "M", true);
    return;
  }

  const poses = [
    { rear: [20, 17, 13, 11], front: [29, 33, 37, 38] },
    { rear: [20, 18, 21, 19], front: [29, 31, 33, 34] },
    { rear: [20, 24, 28, 30], front: [29, 25, 20, 17] },
    { rear: [20, 22, 24, 25], front: [29, 27, 25, 27] },
  ] as const;
  const pose = poses[phase] ?? poses[0];
  drawMicheleLeg(canvas, pose.rear[0], pose.rear[1], pose.rear[2], pose.rear[3], "E", "L", false);
  drawMicheleLeg(canvas, pose.front[0], pose.front[1], pose.front[2], pose.front[3], "F", "M", true);
}

function drawMichele(frame: number, idle: boolean): CharacterSpriteData {
  const canvas = createCanvas();
  const phase = idle ? 1 : frame % 4;
  const bob = idle ? 0 : [0, 2, 0, -2][phase];
  const hairSwing = idle ? (frame % 2 === 1 ? 2 : 0) : [4, 1, -4, -1][phase];
  const tailSwing = idle ? (frame % 2 === 1 ? -1 : 0) : [-4, -1, 4, 1][phase];

  // Black mechanical cat tail. It is separated from the coat so its hooked
  // silhouette survives at native 1x rendering.
  line(canvas, 18, 41, 11 + tailSwing, 44, "K", 3);
  line(canvas, 11 + tailSwing, 44, 7 + tailSwing, 38, "K", 3);
  pixel(canvas, 7 + tailSwing, 36, "M");

  // Distinct twin tails. The far tail is narrow; the near tail is wider and
  // receives a brighter highlight, which prevents them merging into one mass.
  polygon(canvas, [[14, 14], [10 + hairSwing, 18], [8 + hairSwing, 31], [11 + hairSwing, 43], [16 + hairSwing, 39], [17, 23]], "A");
  polygon(canvas, [[14, 16], [12 + hairSwing, 20], [11 + hairSwing, 31], [13 + hairSwing, 39], [15 + hairSwing, 37], [16, 23]], "C");
  line(canvas, 13 + hairSwing, 20, 13 + hairSwing, 34, "D", 2);
  polygon(canvas, [[28, 14], [34 - hairSwing, 19], [35 - hairSwing, 31], [31 - hairSwing, 42], [27 - hairSwing, 37], [27, 22]], "A");
  polygon(canvas, [[29, 16], [32 - hairSwing, 20], [32 - hairSwing, 31], [30 - hairSwing, 38], [28 - hairSwing, 35], [28, 22]], "B");

  // Rear hair mass and side locks.
  polygon(canvas, [[10, 13 + bob], [13, 7 + bob], [20, 4 + bob], [28, 5 + bob], [34, 10 + bob], [35, 22 + bob], [32, 32 + bob], [29, 42 + bob], [22, 47 + bob], [14 + hairSwing, 42 + bob], [10 + hairSwing, 31 + bob], [8 + hairSwing, 20 + bob]], "A");
  polygon(canvas, [[11, 14 + bob], [14, 8 + bob], [20, 6 + bob], [28, 7 + bob], [33, 11 + bob], [33, 22 + bob], [30, 31 + bob], [27, 40 + bob], [22, 44 + bob], [15 + hairSwing, 40 + bob], [12 + hairSwing, 30 + bob], [10 + hairSwing, 20 + bob]], "B");
  polygon(canvas, [[12, 13 + bob], [16, 8 + bob], [23, 6 + bob], [29, 8 + bob], [31, 13 + bob], [29, 24 + bob], [25, 37 + bob], [21, 41 + bob], [17 + hairSwing, 37 + bob], [14 + hairSwing, 25 + bob]], "C");
  polygon(canvas, [[14, 11 + bob], [18, 8 + bob], [24, 7 + bob], [27, 9 + bob], [24, 13 + bob], [18, 17 + bob], [14, 20 + bob]], "D");
  line(canvas, 13 + hairSwing, 25 + bob, 16 + hairSwing, 39 + bob, "D", 2);
  line(canvas, 28, 17 + bob, 28, 36 + bob, "B", 2);

  // Cat-ear headset, colored rather than black-bordered.
  polygon(canvas, [[13, 9 + bob], [15, 2 + bob], [20, 8 + bob]], "K");
  polygon(canvas, [[14, 8 + bob], [16, 4 + bob], [18, 8 + bob]], "M");
  polygon(canvas, [[27, 7 + bob], [32, 2 + bob], [33, 11 + bob]], "K");
  polygon(canvas, [[29, 7 + bob], [31, 4 + bob], [32, 9 + bob]], "M");
  rect(canvas, 31, 10 + bob, 3, 9, "K");
  rect(canvas, 32, 13 + bob, 2, 4, "N");

  // Back coat tails and rear arm.
  polygon(canvas, [[13, 30 + bob], [22, 28 + bob], [25, 42 + bob], [20, 50 + bob], [14 + hairSwing, 47 + bob], [16, 39 + bob]], "A");
  polygon(canvas, [[15, 31 + bob], [21, 30 + bob], [22, 41 + bob], [19, 47 + bob], [16 + hairSwing, 45 + bob]], "L");
  polygon(canvas, [[13, 29 + bob], [17, 28 + bob], [18, 39 + bob], [15, 44 + bob], [11, 41 + bob]], "A");
  polygon(canvas, [[14, 30 + bob], [17, 30 + bob], [16, 39 + bob], [14, 41 + bob], [12, 40 + bob]], "I");
  rect(canvas, 11, 39 + bob, 5, 4, "K");
  rect(canvas, 12, 40 + bob, 3, 2, "M");

  drawMicheleLegs(canvas, phase, idle);

  // Torso, layered white-blue investigator uniform.
  polygon(canvas, [[17, 25 + bob], [23, 23 + bob], [30, 25 + bob], [34, 32 + bob], [32, 44 + bob], [18, 44 + bob], [15, 34 + bob]], "A");
  polygon(canvas, [[18, 26 + bob], [23, 24 + bob], [29, 26 + bob], [32, 32 + bob], [30, 42 + bob], [19, 42 + bob], [17, 34 + bob]], "J");
  polygon(canvas, [[18, 29 + bob], [23, 25 + bob], [24, 42 + bob], [19, 42 + bob], [17, 34 + bob]], "I");
  polygon(canvas, [[24, 25 + bob], [29, 27 + bob], [31, 34 + bob], [29, 42 + bob], [25, 42 + bob]], "L");
  rect(canvas, 23, 27 + bob, 3, 14, "K");
  rect(canvas, 24, 29 + bob, 1, 10, "M");
  rect(canvas, 18, 34 + bob, 13, 3, "K");
  rect(canvas, 23, 35 + bob, 4, 1, "N");
  rect(canvas, 27, 28 + bob, 3, 3, "M");
  pixel(canvas, 28, 29 + bob, "O");

  // White short uniform and exposed legs are a primary part of Michele's
  // silhouette; keep the jacket ending above the hip instead of reading as
  // blue trousers.
  polygon(canvas, [[19, 38 + bob], [31, 38 + bob], [31, 45 + bob], [26, 45 + bob], [25, 41 + bob], [24, 45 + bob], [19, 45 + bob]], "J");
  line(canvas, 19, 39 + bob, 31, 39 + bob, "L", 2);
  line(canvas, 25, 40 + bob, 25, 45 + bob, "K", 1);

  // Neck and chibi head.
  rect(canvas, 22, 22 + bob, 6, 6, "E");
  rect(canvas, 23, 22 + bob, 5, 5, "F");
  drawChibiHead(canvas, bob, "A", "F", "round");

  // Layered fringe and hair highlights.
  polygon(canvas, [[15, 8 + bob], [22, 5 + bob], [29, 8 + bob], [26, 13 + bob], [22, 16 + bob], [18, 14 + bob], [14, 18 + bob]], "B");
  polygon(canvas, [[17, 8 + bob], [22, 6 + bob], [27, 8 + bob], [24, 11 + bob], [21, 13 + bob], [18, 12 + bob]], "C");
  line(canvas, 17, 9 + bob, 23, 7 + bob, "D", 2);
  line(canvas, 13 + hairSwing, 18 + bob, 15 + hairSwing, 29 + bob, "C", 2);
  drawMicheleFace(canvas, bob);
  const bodyOffset = faceRasterOffset(bob);
  // Small red collar tabs frame the dark tie without recreating the former
  // oversized yellow waist stripe.
  rasterPixel(canvas, 15, 13 + bodyOffset, "P");
  rasterPixel(canvas, 17, 13 + bodyOffset, "P");

  // Front arm and hand placed at the new weapon height.
  polygon(canvas, [[29, 28 + bob], [34, 29 + bob], [37, 37 + bob], [34, 41 + bob], [30, 38 + bob]], "A");
  polygon(canvas, [[30, 29 + bob], [33, 30 + bob], [35, 36 + bob], [33, 39 + bob], [31, 37 + bob]], "L");
  rect(canvas, 33, 37 + bob, 5, 4, "E");
  rect(canvas, 34, 37 + bob, 4, 3, "F");
  rect(canvas, 36, 38 + bob, 3, 2, "K");
  pixel(canvas, 37, 38 + bob, "M");

  return finish(canvas);
}

function drawKanamiLeg(
  canvas: PixelCanvas,
  hipX: number,
  kneeX: number,
  ankleX: number,
  footX: number,
  highlight: string,
  foreground: boolean,
): void {
  const outerThickness = foreground ? 6 : 5;
  line(canvas, hipX, 44, kneeX, 50, "A", outerThickness);
  line(canvas, kneeX, 50, ankleX, 57, "A", outerThickness);
  line(canvas, hipX, 44, kneeX, 49, "F", foreground ? 4 : 3);
  line(canvas, kneeX, 49, ankleX, 57, "J", foreground ? 5 : 4);
  line(canvas, ankleX, 56, footX, 59, "R", foreground ? 5 : 4);
  line(canvas, footX - 2, 61, footX + 4, 61, highlight, 2);
}

function drawKanamiLegs(canvas: PixelCanvas, phase: number, idle: boolean): void {
  if (idle) {
    drawKanamiLeg(canvas, 20, 20, 19, 17, "P", false);
    drawKanamiLeg(canvas, 29, 29, 30, 31, "Q", true);
    return;
  }

  const poses = [
    { rear: [20, 16, 12, 10], front: [29, 34, 38, 39] },
    { rear: [20, 18, 21, 19], front: [29, 31, 34, 35] },
    { rear: [20, 25, 29, 31], front: [29, 24, 19, 16] },
    { rear: [20, 23, 25, 26], front: [29, 27, 24, 26] },
  ] as const;
  const pose = poses[phase] ?? poses[0];
  drawKanamiLeg(canvas, pose.rear[0], pose.rear[1], pose.rear[2], pose.rear[3], "P", false);
  drawKanamiLeg(canvas, pose.front[0], pose.front[1], pose.front[2], pose.front[3], "Q", true);
}

function drawKanami(frame: number, idle: boolean): CharacterSpriteData {
  const canvas = createCanvas();
  const phase = idle ? 1 : frame % 4;
  const bob = idle ? 0 : [0, 2, 0, -2][phase];
  const hairSwing = idle ? (frame % 2 === 1 ? 2 : 0) : [4, 1, -4, -1][phase];
  const ribbonSwing = idle ? (frame % 2 === 1 ? -2 : 0) : [-5, -2, 5, 2][phase];

  // Two long waist ribbons are a defining part of Kanami's silhouette. Keep
  // them narrow and bright so they read as ribbons rather than a cape.
  polygon(canvas, [[16, 31 + bob], [12, 35 + bob], [7 + ribbonSwing, 45 + bob], [4 + ribbonSwing, 57 + bob], [8 + ribbonSwing, 54 + bob], [14 + ribbonSwing, 42 + bob], [19, 34 + bob]], "O");
  polygon(canvas, [[16, 33 + bob], [13, 36 + bob], [9 + ribbonSwing, 45 + bob], [6 + ribbonSwing, 53 + bob], [9 + ribbonSwing, 51 + bob], [15 + ribbonSwing, 40 + bob], [19, 34 + bob]], "Q");
  polygon(canvas, [[21, 32 + bob], [17, 38 + bob], [15 + ribbonSwing, 58 + bob], [20 + ribbonSwing, 54 + bob], [23 + ribbonSwing, 40 + bob], [24, 34 + bob]], "O");
  polygon(canvas, [[21, 34 + bob], [19, 39 + bob], [18 + ribbonSwing, 53 + bob], [20 + ribbonSwing, 51 + bob], [22 + ribbonSwing, 39 + bob], [23, 35 + bob]], "P");

  // Rear hair mass and trailing strands.
  polygon(canvas, [[10, 13 + bob], [14, 6 + bob], [21, 3 + bob], [29, 5 + bob], [34, 11 + bob], [35, 23 + bob], [31, 37 + bob], [27, 48 + bob], [18 + hairSwing, 50 + bob], [12 + hairSwing, 41 + bob], [9 + hairSwing, 27 + bob]], "A");
  polygon(canvas, [[11, 14 + bob], [15, 7 + bob], [21, 5 + bob], [28, 7 + bob], [33, 12 + bob], [33, 23 + bob], [29, 36 + bob], [25, 45 + bob], [19 + hairSwing, 47 + bob], [14 + hairSwing, 39 + bob], [11 + hairSwing, 26 + bob]], "B");
  polygon(canvas, [[13, 12 + bob], [17, 7 + bob], [23, 5 + bob], [28, 8 + bob], [30, 14 + bob], [27, 27 + bob], [24, 40 + bob], [20 + hairSwing, 44 + bob], [16 + hairSwing, 36 + bob], [14 + hairSwing, 22 + bob]], "C");
  polygon(canvas, [[14, 10 + bob], [19, 6 + bob], [24, 5 + bob], [27, 8 + bob], [23, 12 + bob], [17, 16 + bob]], "D");
  line(canvas, 13 + hairSwing, 22 + bob, 16 + hairSwing, 41 + bob, "D", 2);
  line(canvas, 27, 18 + bob, 25, 41 + bob, "S", 2);

  // Ahoge and black-pink idol hair ornament.
  line(canvas, 23, 5 + bob, 25, 0 + bob, "A", 2);
  line(canvas, 25, 0 + bob, 29, 2 + bob, "C", 2);
  polygon(canvas, [[11, 10 + bob], [15, 6 + bob], [18, 10 + bob], [15, 14 + bob]], "R");
  polygon(canvas, [[12, 10 + bob], [15, 8 + bob], [17, 10 + bob], [15, 12 + bob]], "P");
  rect(canvas, 10, 11 + bob, 3, 4, "Q");

  // Back arm, glove and layered skirt tails.
  polygon(canvas, [[14, 28 + bob], [18, 27 + bob], [18, 39 + bob], [15, 44 + bob], [11, 40 + bob]], "A");
  polygon(canvas, [[15, 29 + bob], [17, 29 + bob], [16, 38 + bob], [14, 41 + bob], [12, 39 + bob]], "R");
  rect(canvas, 11, 38 + bob, 5, 5, "R");
  rect(canvas, 12, 39 + bob, 3, 2, "P");

  drawKanamiLegs(canvas, phase, idle);

  polygon(canvas, [[16, 38 + bob], [31, 38 + bob], [35, 45 + bob], [30, 49 + bob], [23, 47 + bob], [16, 49 + bob], [12, 44 + bob]], "A");
  polygon(canvas, [[17, 39 + bob], [30, 39 + bob], [33, 44 + bob], [29, 47 + bob], [23, 45 + bob], [17, 47 + bob], [14, 44 + bob]], "J");
  polygon(canvas, [[15, 42 + bob], [19, 42 + bob], [19, 47 + bob], [16, 46 + bob]], "P");
  polygon(canvas, [[29, 42 + bob], [32, 44 + bob], [29, 47 + bob], [27, 45 + bob]], "P");
  line(canvas, 17, 41 + bob, 31, 41 + bob, "Q", 1);

  // Torso: black off-shoulder top, white center and pink stage details.
  polygon(canvas, [[17, 24 + bob], [23, 22 + bob], [30, 25 + bob], [34, 33 + bob], [31, 41 + bob], [17, 41 + bob], [14, 32 + bob]], "A");
  polygon(canvas, [[18, 25 + bob], [23, 23 + bob], [29, 26 + bob], [32, 32 + bob], [30, 39 + bob], [18, 39 + bob], [16, 32 + bob]], "R");
  polygon(canvas, [[21, 24 + bob], [25, 24 + bob], [27, 39 + bob], [21, 39 + bob]], "R");
  polygon(canvas, [[23, 25 + bob], [26, 27 + bob], [25, 37 + bob], [22, 37 + bob]], "R");
  line(canvas, 18, 28 + bob, 30, 28 + bob, "R", 1);
  rect(canvas, 18, 37 + bob, 13, 2, "P");
  rect(canvas, 22, 30 + bob, 5, 4, "R");

  // Cropped stage top and exposed waist. This separation is essential to
  // distinguish Kanami from a generic black-and-pink dress silhouette.
  polygon(canvas, [[19, 33 + bob], [30, 33 + bob], [30, 38 + bob], [18, 38 + bob]], "E");
  polygon(canvas, [[20, 34 + bob], [29, 34 + bob], [29, 37 + bob], [19, 37 + bob]], "F");
  line(canvas, 18, 38 + bob, 31, 38 + bob, "P", 1);

  // Exact 32px shorts treatment: a single pink belt row, broad white shorts,
  // a dark center seam and only small pink side panels. This prevents the
  // lower body reading as a solid pink idol skirt.
  const bodyOffset = faceRasterOffset(bob);
  rasterSpan(canvas, 13, 19, 18 + bodyOffset, "P");
  rasterSpan(canvas, 13, 19, 19 + bodyOffset, "J");
  rasterSpan(canvas, 12, 20, 20 + bodyOffset, "J");
  rasterSpan(canvas, 13, 19, 21 + bodyOffset, "J");
  rasterSpan(canvas, 13, 15, 22 + bodyOffset, "J");
  rasterSpan(canvas, 17, 19, 22 + bodyOffset, "J");
  rasterPixel(canvas, 12, 20 + bodyOffset, "P");
  rasterPixel(canvas, 20, 20 + bodyOffset, "P");
  rasterPixel(canvas, 13, 21 + bodyOffset, "P");
  rasterPixel(canvas, 19, 21 + bodyOffset, "P");
  rasterPixel(canvas, 16, 20 + bodyOffset, "I");
  rasterPixel(canvas, 16, 21 + bodyOffset, "A");
  rasterPixel(canvas, 16, 22 + bodyOffset, "A");

  // Neck and chibi head.
  rect(canvas, 22, 21 + bob, 6, 6, "E");
  rect(canvas, 23, 21 + bob, 5, 5, "F");
  drawChibiHead(canvas, bob - 1, "A", "F", "narrow");

  // Fringe with lavender and pink streaks.
  polygon(canvas, [[14, 8 + bob], [21, 4 + bob], [29, 7 + bob], [27, 12 + bob], [23, 15 + bob], [18, 13 + bob], [14, 18 + bob]], "B");
  polygon(canvas, [[16, 8 + bob], [21, 6 + bob], [27, 7 + bob], [24, 11 + bob], [21, 13 + bob], [17, 11 + bob]], "C");
  line(canvas, 17, 8 + bob, 23, 6 + bob, "D", 2);
  line(canvas, 18, 10 + bob, 17, 17 + bob, "S", 1);
  pixel(canvas, 24, 10 + bob, "Q");
  pixel(canvas, 23, 13 + bob, "S");
  drawKanamiFace(canvas, bob - 1);
  // White bow/collar with a restrained pink center, matching the official
  // black crop top rather than adding another broad pink stripe.
  rasterPixel(canvas, 15, 12 + bodyOffset, "J");
  rasterPixel(canvas, 17, 12 + bodyOffset, "J");
  rasterPixel(canvas, 16, 13 + bodyOffset, "P");

  // Front arm, asymmetrical sleeve and hand at weapon grip height.
  polygon(canvas, [[29, 27 + bob], [34, 29 + bob], [37, 36 + bob], [34, 41 + bob], [30, 38 + bob]], "A");
  polygon(canvas, [[30, 28 + bob], [33, 30 + bob], [35, 36 + bob], [33, 39 + bob], [31, 37 + bob]], "R");
  rect(canvas, 33, 37 + bob, 5, 4, "E");
  rect(canvas, 34, 37 + bob, 4, 3, "F");
  rect(canvas, 36, 38 + bob, 3, 2, "R");
  pixel(canvas, 37, 38 + bob, "P");

  return finish(canvas);
}

function drawCelestiaLeg(
  canvas: PixelCanvas,
  hipX: number,
  kneeX: number,
  ankleX: number,
  footX: number,
  foreground: boolean,
): void {
  const outerThickness = foreground ? 6 : 5;
  const innerThickness = foreground ? 4 : 3;
  line(canvas, hipX, 43, kneeX, 50, "A", outerThickness);
  line(canvas, kneeX, 50, ankleX, 56, "A", outerThickness);
  line(canvas, hipX, 43, kneeX, 50, foreground ? "O" : "J", innerThickness);
  line(canvas, kneeX, 50, ankleX, 55, "O", innerThickness);
  line(canvas, ankleX, 55, footX, 59, "A", foreground ? 6 : 5);
  line(canvas, ankleX, 55, footX, 58, "N", foreground ? 4 : 3);
  line(canvas, footX - 2, 61, footX + 4, 61, foreground ? "L" : "K", 2);
  pixel(canvas, footX + 2, 58, "I");
}

function drawCelestiaLegs(canvas: PixelCanvas, phase: number, idle: boolean): void {
  if (idle) {
    drawCelestiaLeg(canvas, 20, 20, 19, 17, false);
    drawCelestiaLeg(canvas, 28, 29, 30, 32, true);
    return;
  }

  const poses = [
    { rear: [20, 16, 12, 10], front: [28, 33, 37, 39] },
    { rear: [20, 18, 20, 18], front: [28, 31, 34, 35] },
    { rear: [20, 24, 29, 32], front: [28, 24, 19, 16] },
    { rear: [20, 22, 25, 27], front: [28, 27, 24, 26] },
  ] as const;
  const pose = poses[phase] ?? poses[0];
  drawCelestiaLeg(canvas, pose.rear[0], pose.rear[1], pose.rear[2], pose.rear[3], false);
  drawCelestiaLeg(canvas, pose.front[0], pose.front[1], pose.front[2], pose.front[3], true);
}

function drawCelestia(frame: number, idle: boolean): CharacterSpriteData {
  const canvas = createCanvas();
  const phase = idle ? 1 : frame % 4;
  const bob = idle ? 0 : [0, 2, 0, -2][phase];
  const hairSwing = idle ? (frame % 2 === 1 ? 2 : 0) : [4, 1, -4, -1][phase];
  const coatSwing = idle ? (frame % 2 === 1 ? -1 : 0) : [-4, -1, 4, 1][phase];
  const bowSwing = idle ? (frame % 2 === 1 ? 1 : 0) : [3, 1, -3, -1][phase];

  // Four-point navy back bow visible in the official front/side/back sheet.
  polygon(canvas, [[16, 29 + bob], [9 + bowSwing, 26 + bob], [6 + bowSwing, 33 + bob], [13 + bowSwing, 38 + bob], [18, 34 + bob]], "A");
  polygon(canvas, [[15, 30 + bob], [10 + bowSwing, 28 + bob], [8 + bowSwing, 33 + bob], [13 + bowSwing, 36 + bob], [18, 33 + bob]], "J");
  polygon(canvas, [[18, 33 + bob], [11 + bowSwing, 39 + bob], [13 + bowSwing, 47 + bob], [20, 39 + bob]], "A");
  polygon(canvas, [[19, 33 + bob], [14 + bowSwing, 39 + bob], [15 + bowSwing, 44 + bob], [20, 38 + bob]], "K");

  // Long silver-white hair, with cool blue-lavender shadow locks.
  polygon(canvas, [[10, 13 + bob], [14, 6 + bob], [21, 2 + bob], [29, 4 + bob], [35, 10 + bob], [36, 22 + bob], [33, 34 + bob], [29, 46 + bob], [23 + hairSwing, 52 + bob], [16 + hairSwing, 48 + bob], [11 + hairSwing, 38 + bob], [8 + hairSwing, 24 + bob]], "A");
  polygon(canvas, [[11, 14 + bob], [15, 7 + bob], [21, 4 + bob], [28, 6 + bob], [34, 11 + bob], [34, 22 + bob], [31, 34 + bob], [27, 44 + bob], [22 + hairSwing, 49 + bob], [17 + hairSwing, 45 + bob], [13 + hairSwing, 36 + bob], [10 + hairSwing, 24 + bob]], "B");
  polygon(canvas, [[13, 12 + bob], [17, 7 + bob], [23, 4 + bob], [29, 7 + bob], [32, 13 + bob], [31, 25 + bob], [28, 36 + bob], [25, 43 + bob], [21 + hairSwing, 46 + bob], [17 + hairSwing, 39 + bob], [14 + hairSwing, 26 + bob]], "C");
  polygon(canvas, [[15, 10 + bob], [20, 5 + bob], [25, 5 + bob], [29, 8 + bob], [25, 12 + bob], [20, 15 + bob], [15, 18 + bob]], "D");
  line(canvas, 13 + hairSwing, 22 + bob, 17 + hairSwing, 43 + bob, "D", 2);
  line(canvas, 29, 18 + bob, 27, 41 + bob, "B", 2);

  // High-low pale-blue coat, exposing the navy star-field lining when moving.
  polygon(canvas, [[15, 28 + bob], [22, 25 + bob], [31, 28 + bob], [35, 38 + bob], [32 + coatSwing, 50 + bob], [26 + coatSwing, 47 + bob], [21, 41 + bob], [17 + coatSwing, 51 + bob], [11 + coatSwing, 47 + bob], [14, 37 + bob]], "A");
  polygon(canvas, [[16, 29 + bob], [22, 27 + bob], [30, 29 + bob], [33, 37 + bob], [30 + coatSwing, 47 + bob], [26 + coatSwing, 44 + bob], [21, 39 + bob], [18 + coatSwing, 48 + bob], [13 + coatSwing, 45 + bob], [16, 36 + bob]], "G");
  polygon(canvas, [[17, 31 + bob], [22, 29 + bob], [29, 31 + bob], [31, 38 + bob], [28 + coatSwing, 45 + bob], [24 + coatSwing, 42 + bob], [20, 38 + bob], [18 + coatSwing, 45 + bob], [15 + coatSwing, 43 + bob]], "H");
  polygon(canvas, [[16, 38 + bob], [22, 36 + bob], [30, 39 + bob], [28 + coatSwing, 47 + bob], [24 + coatSwing, 43 + bob], [20, 40 + bob], [17 + coatSwing, 48 + bob], [13 + coatSwing, 45 + bob]], "J");
  line(canvas, 17, 40 + bob, 28 + coatSwing, 45 + bob, "K", 2);
  polygon(canvas, [[14, 38 + bob], [19, 37 + bob], [20, 41 + bob], [17 + coatSwing, 48 + bob], [13 + coatSwing, 45 + bob]], "H");
  polygon(canvas, [[26, 38 + bob], [31, 40 + bob], [28 + coatSwing, 47 + bob], [25 + coatSwing, 44 + bob]], "H");
  line(canvas, 15, 39 + bob, 17 + coatSwing, 45 + bob, "I", 2);
  line(canvas, 27, 39 + bob, 28 + coatSwing, 44 + bob, "I", 2);
  pixel(canvas, 20 + coatSwing, 42 + bob, "M");
  pixel(canvas, 24 + coatSwing, 44 + bob, "P");
  pixel(canvas, 27 + coatSwing, 42 + bob, "M");

  // Rear dark sleeve and glove.
  polygon(canvas, [[15, 27 + bob], [19, 27 + bob], [18, 39 + bob], [14, 44 + bob], [10, 40 + bob]], "A");
  polygon(canvas, [[16, 28 + bob], [18, 29 + bob], [16, 38 + bob], [14, 41 + bob], [12, 39 + bob]], "J");
  rect(canvas, 10, 39 + bob, 5, 4, "O");
  rect(canvas, 11, 40 + bob, 3, 2, "L");

  drawCelestiaLegs(canvas, phase, idle);

  // Dark bustier, purple corset and pale-blue off-shoulder mantle.
  polygon(canvas, [[17, 24 + bob], [23, 22 + bob], [30, 25 + bob], [34, 33 + bob], [31, 42 + bob], [18, 42 + bob], [14, 32 + bob]], "A");
  polygon(canvas, [[18, 25 + bob], [23, 23 + bob], [29, 26 + bob], [32, 32 + bob], [30, 40 + bob], [18, 40 + bob], [16, 32 + bob]], "H");
  polygon(canvas, [[15, 25 + bob], [22, 22 + bob], [30, 25 + bob], [33, 30 + bob], [28, 31 + bob], [23, 27 + bob], [18, 32 + bob], [13, 29 + bob]], "G");
  polygon(canvas, [[16, 25 + bob], [22, 24 + bob], [29, 26 + bob], [31, 29 + bob], [27, 29 + bob], [23, 26 + bob], [18, 30 + bob], [15, 28 + bob]], "I");
  polygon(canvas, [[20, 28 + bob], [25, 27 + bob], [29, 30 + bob], [28, 37 + bob], [20, 37 + bob], [18, 31 + bob]], "O");
  polygon(canvas, [[21, 29 + bob], [25, 29 + bob], [27, 31 + bob], [26, 35 + bob], [21, 35 + bob], [20, 31 + bob]], "J");
  rect(canvas, 18, 35 + bob, 13, 4, "A");
  rect(canvas, 19, 36 + bob, 11, 2, "K");
  rect(canvas, 23, 35 + bob, 3, 4, "K");
  const starY = 16 + faceRasterOffset(bob);
  rasterPixel(canvas, 16, starY - 1, "M");
  rasterPixel(canvas, 15, starY, "P");
  rasterPixel(canvas, 16, starY, "M");
  rasterPixel(canvas, 17, starY, "P");
  rasterPixel(canvas, 16, starY + 1, "M");

  // Pale front skirt panel from the full-body illustration. The navy lining
  // remains exposed at the rear, while this broad value block makes the outfit
  // read as Celestia's blue dress rather than a generic dark bodysuit.
  polygon(canvas, [[18, 38 + bob], [31, 38 + bob], [32, 43 + bob], [28, 48 + bob], [24, 45 + bob], [20, 49 + bob], [17, 45 + bob]], "A");
  polygon(canvas, [[19, 39 + bob], [30, 39 + bob], [30, 43 + bob], [27, 46 + bob], [24, 43 + bob], [20, 47 + bob], [18, 44 + bob]], "H");
  polygon(canvas, [[20, 39 + bob], [28, 39 + bob], [28, 42 + bob], [25, 43 + bob], [21, 45 + bob], [19, 43 + bob]], "I");
  line(canvas, 19, 39 + bob, 29, 39 + bob, "L", 1);

  // Reinforce the official high-low pale-blue dress at the final raster
  // scale. The light outer panels widen toward the hips, while the navy
  // star-field lining remains visible in the split center and long side tails.
  const skirtOffset = faceRasterOffset(bob);
  rasterSpan(canvas, 12, 19, 19 + skirtOffset, "H");
  rasterSpan(canvas, 11, 20, 20 + skirtOffset, "G");
  rasterSpan(canvas, 13, 18, 20 + skirtOffset, "I");
  rasterSpan(canvas, 10, 21, 21 + skirtOffset, "H");
  rasterSpan(canvas, 13, 18, 21 + skirtOffset, "I");
  rasterSpan(canvas, 10, 14, 22 + skirtOffset, "G");
  rasterSpan(canvas, 18, 22, 22 + skirtOffset, "G");
  rasterSpan(canvas, 14, 17, 22 + skirtOffset, "J");
  rasterSpan(canvas, 9, 12, 23 + skirtOffset, "H");
  rasterSpan(canvas, 20, 23, 23 + skirtOffset, "H");
  rasterPixel(canvas, 11, 24 + skirtOffset, "G");
  rasterPixel(canvas, 21, 24 + skirtOffset, "G");

  // Neck, gold star choker and chibi head.
  rect(canvas, 22, 21 + bob, 6, 6, "E");
  rect(canvas, 23, 21 + bob, 5, 5, "F");
  rect(canvas, 22, 24 + bob, 6, 2, "J");
  pixel(canvas, 25, 25 + bob, "M");
  drawChibiHead(canvas, bob - 1, "A", "F", "soft");

  // Swept fringe and the small gold/cyan constellation hair ornaments.
  polygon(canvas, [[14, 8 + bob], [21, 3 + bob], [29, 6 + bob], [28, 11 + bob], [24, 15 + bob], [19, 13 + bob], [14, 18 + bob]], "B");
  polygon(canvas, [[16, 8 + bob], [21, 5 + bob], [27, 6 + bob], [25, 10 + bob], [22, 13 + bob], [18, 11 + bob]], "C");
  line(canvas, 17, 8 + bob, 23, 5 + bob, "D", 2);
  pixel(canvas, 15, 12 + bob, "M");
  pixel(canvas, 13, 15 + bob, "P");
  line(canvas, 14, 13 + bob, 12, 16 + bob, "L", 1);
  drawCelestiaFace(canvas, bob - 1);

  // Bare front arm, violet band, fingerless glove and weapon hand.
  polygon(canvas, [[29, 27 + bob], [34, 29 + bob], [37, 36 + bob], [34, 41 + bob], [30, 38 + bob]], "A");
  polygon(canvas, [[30, 28 + bob], [33, 30 + bob], [35, 36 + bob], [33, 39 + bob], [31, 37 + bob]], "F");
  rect(canvas, 32, 31 + bob, 3, 4, "K");
  rect(canvas, 33, 37 + bob, 5, 4, "E");
  rect(canvas, 34, 37 + bob, 4, 3, "F");
  rect(canvas, 36, 38 + bob, 3, 2, "J");
  pixel(canvas, 37, 38 + bob, "P");

  return finish(canvas);
}


function drawEsperZero(frame: number, idle: boolean): CharacterSpriteData {
  const canvas = createCanvas();
  const phase = idle ? frame % 2 : frame % 4;
  const bob = idle ? 0 : [0, 1, 0, -1][phase];
  const hairSwing = idle ? (phase === 1 ? 1 : 0) : [1, 0, -1, 0][phase];
  const charmSwing = idle ? (phase === 1 ? 1 : 0) : [1, 0, -1, 0][phase];
  const legPoses = idle
    ? { rear: [12, 25, 14, 11], front: [20, 24, 22, 23] }
    : [
        { rear: [13, 25, 10, 9], front: [19, 25, 22, 24] },
        { rear: [14, 25, 13, 12], front: [19, 25, 20, 21] },
        { rear: [14, 25, 20, 22], front: [19, 25, 15, 13] },
        { rear: [14, 25, 16, 15], front: [19, 25, 18, 20] },
      ][phase];

  // Rear leg first. The narrow waist, exposed thighs and short boots preserve
  // the female protagonist silhouette instead of the old square male torso.
  rasterLine(canvas, 14, 22 + bob, legPoses.rear[0], legPoses.rear[1], "A", 4);
  rasterLine(canvas, legPoses.rear[0], legPoses.rear[1], legPoses.rear[2], 29, "A", 4);
  rasterLine(canvas, 14, 22 + bob, legPoses.rear[0], legPoses.rear[1], "E", 2);
  rasterLine(canvas, legPoses.rear[0], legPoses.rear[1], legPoses.rear[2], 28, "F", 2);
  // Rear boot rises above the ankle and stays darker than the foreground boot.
  rasterSpan(canvas, legPoses.rear[2] - 1, legPoses.rear[2] + 1, 27, "N");
  rasterSpan(canvas, legPoses.rear[2] - 1, legPoses.rear[2] + 1, 28, "A");
  rasterSpan(canvas, legPoses.rear[3] - 2, legPoses.rear[3] + 2, 30, "N");

  // Layered silver bob. The crown is deliberately rounded and asymmetric:
  // the far side is a compact lavender shadow while the near side receives a
  // pale highlight and a longer cheek lock. This produces actual head volume
  // instead of the previous flat horizontal cap.
  rasterSpan(canvas, 14, 18, 2 + bob, "D");
  rasterSpan(canvas, 12, 20, 3 + bob, "C");
  rasterSpan(canvas, 10, 21, 4 + bob, "C");
  rasterSpan(canvas, 9, 22, 5 + bob, "L");
  rasterSpan(canvas, 9, 12, 6 + bob, "K");
  rasterSpan(canvas, 20, 23, 6 + bob, "D");
  rasterSpan(canvas, 9 + hairSwing, 12 + hairSwing, 7 + bob, "K");
  rasterSpan(canvas, 20 - hairSwing, 23 - hairSwing, 7 + bob, "C");
  rasterSpan(canvas, 10 + hairSwing, 12 + hairSwing, 8 + bob, "L");
  rasterSpan(canvas, 20 - hairSwing, 22 - hairSwing, 8 + bob, "D");
  rasterSpan(canvas, 10 + hairSwing, 11 + hairSwing, 9 + bob, "K");
  rasterSpan(canvas, 21 - hairSwing, 22 - hairSwing, 9 + bob, "L");
  rasterPixel(canvas, 11 + hairSwing, 10 + bob, "D");
  rasterPixel(canvas, 21 - hairSwing, 10 + bob, "C");
  rasterPixel(canvas, 16, 0 + bob, "Q");
  rasterPixel(canvas, 17, 1 + bob, "Q");
  rasterPixel(canvas, 17, 2 + bob, "D");
  // The headband is broken into two curved side segments; silver fringe cuts
  // through the centre so it cannot read as a flat hat brim.
  for (const [x, y] of [[12, 4], [13, 3], [14, 3], [15, 3], [18, 3], [19, 3], [20, 4]] as const) {
    rasterPixel(canvas, x, y + bob, "P");
  }
  // Broken silver highlights across the crown preserve the curved head shape.
  rasterSpan(canvas, 14, 15, 4 + bob, "Q");
  rasterPixel(canvas, 16, 3 + bob, "D");
  rasterPixel(canvas, 17, 3 + bob, "Q");
  rasterPixel(canvas, 17, 4 + bob, "D");
  rasterSpan(canvas, 19, 20, 5 + bob, "Q");

  // Face with two soft violet eyes and no profile nose.
  rasterSpan(canvas, 13, 19, 6 + bob, "F");
  rasterSpan(canvas, 12, 20, 7 + bob, "F");
  rasterSpan(canvas, 12, 20, 8 + bob, "F");
  rasterSpan(canvas, 13, 19, 9 + bob, "F");
  rasterSpan(canvas, 14, 18, 10 + bob, "E");
  // Cool far-cheek shadow and a pale near-cheek plane give the face a rounded
  // chibi volume while preserving the no-nose rule.
  rasterPixel(canvas, 12, 7 + bob, "E");
  rasterPixel(canvas, 12, 8 + bob, "E");
  rasterPixel(canvas, 13, 9 + bob, "E");
  rasterPixel(canvas, 20, 7 + bob, "S");
  rasterPixel(canvas, 20, 8 + bob, "S");
  rasterPixel(canvas, 14, 7 + bob, "A");
  rasterPixel(canvas, 14, 8 + bob, "J");
  rasterPixel(canvas, 18, 7 + bob, "A");
  rasterPixel(canvas, 19, 7 + bob, "A");
  rasterPixel(canvas, 18, 8 + bob, "J");
  rasterPixel(canvas, 19, 8 + bob, "K");
  rasterPixel(canvas, 17, 10 + bob, "E");
  rasterSpan(canvas, 11, 14, 5 + bob, "Q");
  rasterSpan(canvas, 18, 21, 5 + bob, "D");
  rasterPixel(canvas, 12, 6 + bob, "Q");
  rasterPixel(canvas, 20, 6 + bob, "L");

  // Neck, fitted white blouse and the asymmetric lavender appraisal tie.
  rasterRect(canvas, 15, 11 + bob, 4, 3, "E");
  rasterSpan(canvas, 13, 20, 12 + bob, "I");
  rasterSpan(canvas, 12, 21, 13 + bob, "I");
  rasterSpan(canvas, 13, 20, 14 + bob, "I");
  rasterSpan(canvas, 13, 20, 15 + bob, "I");
  rasterSpan(canvas, 14, 19, 16 + bob, "I");
  rasterSpan(canvas, 14, 19, 17 + bob, "I");
  // White fabric is split into shadow, base and highlight planes rather than a
  // single rectangular value block.
  rasterPixel(canvas, 13, 13 + bob, "R");
  rasterPixel(canvas, 13, 14 + bob, "R");
  rasterPixel(canvas, 14, 15 + bob, "D");
  rasterPixel(canvas, 15, 16 + bob, "D");
  rasterPixel(canvas, 19, 13 + bob, "Q");
  rasterPixel(canvas, 20, 14 + bob, "Q");
  rasterPixel(canvas, 18, 15 + bob, "S");
  rasterPixel(canvas, 18, 16 + bob, "S");
  rasterPixel(canvas, 16, 12 + bob, "J");
  rasterPixel(canvas, 17, 13 + bob, "J");
  rasterPixel(canvas, 17, 14 + bob, "J");
  rasterPixel(canvas, 18, 15 + bob, "J");
  rasterPixel(canvas, 18, 16 + bob, "K");

  // Cropped motorcycle jacket. The rear sleeve is nearly black and sits
  // behind the torso; the near sleeve is wider, lighter and overlaps the chest.
  // Diagonal lapels break up the broad white blouse and make the garment read
  // as something worn around a body rather than painted onto a flat rectangle.
  rasterSpan(canvas, 9, 13, 12 + bob, "A");
  rasterSpan(canvas, 8, 12, 13 + bob, "B");
  rasterSpan(canvas, 7, 11, 14 + bob, "B");
  rasterSpan(canvas, 8, 12, 15 + bob, "C");
  rasterSpan(canvas, 20, 24, 12 + bob, "B");
  rasterSpan(canvas, 21, 25, 13 + bob, "C");
  rasterSpan(canvas, 21, 26, 14 + bob, "C");
  rasterSpan(canvas, 20, 25, 15 + bob, "N");
  rasterLine(canvas, 9, 14 + bob, 7, 20 + bob, "A", 4);
  rasterLine(canvas, 23, 14 + bob, 26, 20 + bob, "A", 5);
  rasterLine(canvas, 9, 15 + bob, 7, 19 + bob, "B", 2);
  rasterLine(canvas, 23, 15 + bob, 26, 19 + bob, "C", 3);
  rasterLine(canvas, 12, 12 + bob, 15, 17 + bob, "C", 1);
  rasterLine(canvas, 21, 12 + bob, 18, 17 + bob, "N", 1);
  rasterPixel(canvas, 13, 14 + bob, "L");
  rasterPixel(canvas, 20, 14 + bob, "D");
  rasterRect(canvas, 5, 19 + bob, 4, 3, "P");
  rasterRect(canvas, 25, 19 + bob, 4, 3, "P");
  rasterPixel(canvas, 8, 20 + bob, "F");
  rasterPixel(canvas, 27, 20 + bob, "F");
  rasterPixel(canvas, 10, 14 + bob, "M");
  rasterPixel(canvas, 23, 14 + bob, "N");
  // Shoulder caps and jacket folds distinguish the nearer arm from the rear.
  rasterSpan(canvas, 8, 10, 13 + bob, "A");
  rasterPixel(canvas, 9, 16 + bob, "K");
  rasterSpan(canvas, 23, 25, 13 + bob, "R");
  rasterPixel(canvas, 25, 16 + bob, "N");
  rasterPixel(canvas, 26, 18 + bob, "R");

  // Utility belt and layered asymmetric skirt. The bright front panel, dark
  // far panel and uneven hem establish three separate depth planes.
  rasterSpan(canvas, 11, 22, 18 + bob, "O");
  rasterSpan(canvas, 10, 22, 19 + bob, "G");
  rasterSpan(canvas, 9, 23, 20 + bob, "G");
  rasterSpan(canvas, 9, 13, 21 + bob, "H");
  rasterSpan(canvas, 14, 19, 21 + bob, "G");
  rasterSpan(canvas, 20, 22, 21 + bob, "C");
  rasterSpan(canvas, 11, 14, 22 + bob, "H");
  rasterSpan(canvas, 15, 19, 22 + bob, "G");
  rasterSpan(canvas, 20, 21, 22 + bob, "C");
  rasterPixel(canvas, 10, 20 + bob, "K");
  rasterPixel(canvas, 13, 20 + bob, "C");
  rasterPixel(canvas, 17, 20 + bob, "H");
  rasterPixel(canvas, 21, 20 + bob, "L");
  rasterPixel(canvas, 12, 18 + bob, "N");
  rasterPixel(canvas, 20, 18 + bob, "M");
  rasterPixel(canvas, 22 + charmSwing, 19 + bob, "M");
  rasterPixel(canvas, 23 + charmSwing, 20 + bob, "J");
  // Front skirt panel catches the light, while the far panel remains muted.
  rasterPixel(canvas, 15, 19 + bob, "L");
  rasterPixel(canvas, 16, 20 + bob, "L");
  rasterPixel(canvas, 18, 21 + bob, "R");
  rasterPixel(canvas, 20, 21 + bob, "K");

  // Foreground leg and boot.
  rasterLine(canvas, 19, 22 + bob, legPoses.front[0], legPoses.front[1], "A", 5);
  rasterLine(canvas, legPoses.front[0], legPoses.front[1], legPoses.front[2], 29, "A", 5);
  rasterLine(canvas, 19, 22 + bob, legPoses.front[0], legPoses.front[1], "F", 3);
  rasterLine(canvas, legPoses.front[0], legPoses.front[1], legPoses.front[2], 28, "F", 3);
  rasterSpan(canvas, legPoses.front[2] - 1, legPoses.front[2] + 1, 27, "R");
  rasterSpan(canvas, legPoses.front[2] - 1, legPoses.front[2] + 1, 28, "N");
  rasterSpan(canvas, legPoses.front[3] - 2, legPoses.front[3] + 2, 30, "N");
  rasterPixel(canvas, legPoses.front[2], 27, "S");
  rasterSpan(canvas, legPoses.front[3], legPoses.front[3] + 2, 30, "R");
  // Asymmetric thigh strap reinforces the appraiser utility outfit.
  rasterSpan(canvas, legPoses.rear[0] - 1, legPoses.rear[0] + 1, 24 + bob, "O");

  return finish(compactEsperZeroSilhouette(canvas));
}

function drawNanally(frame: number, idle: boolean): CharacterSpriteData {
  const canvas = createCanvas();
  const phase = idle ? frame % 2 : frame % 4;
  const bob = idle ? 0 : [0, 1, 0, -1][phase];
  const hairSwing = idle ? (phase === 1 ? 1 : 0) : [2, 1, -2, -1][phase];
  const tailSwing = idle ? (phase === 1 ? 1 : 0) : [2, 1, -2, -1][phase];
  const legPoses = idle
    ? { rear: [13, 24, 15, 12], front: [20, 25, 22, 23] }
    : [
        { rear: [13, 25, 10, 9], front: [19, 25, 22, 24] },
        { rear: [14, 25, 13, 12], front: [19, 25, 20, 21] },
        { rear: [14, 25, 20, 22], front: [19, 25, 15, 13] },
        { rear: [14, 25, 16, 15], front: [19, 25, 18, 20] },
      ][phase];

  // Curved cat tail and asymmetrical long hair sit behind the oversized coat.
  rasterLine(canvas, 10, 18 + bob, 6 + tailSwing, 19 + bob, "B", 2);
  rasterLine(canvas, 6 + tailSwing, 19 + bob, 5 + tailSwing, 22 + bob, "C", 2);
  rasterPixel(canvas, 6 + tailSwing, 23 + bob, "D");
  // Rear hair is a dark, rounded mass. Separate illuminated front locks are
  // added later, preventing the hairstyle from reading as two flat side bars.
  rasterSpan(canvas, 11, 20, 3 + bob, "B");
  rasterSpan(canvas, 9, 22, 4 + bob, "B");
  rasterSpan(canvas, 8, 23, 5 + bob, "C");
  rasterSpan(canvas, 8 + hairSwing, 12 + hairSwing, 7 + bob, "B");
  rasterSpan(canvas, 7 + hairSwing, 11 + hairSwing, 8 + bob, "C");
  for (let y = 9; y <= 24; y++) {
    const left = 7 + hairSwing + Math.floor((y - 9) / 8);
    const right = 22 - hairSwing - Math.floor((y - 9) / 10);
    rasterSpan(canvas, left, left + (y < 16 ? 4 : 3), y + bob, y % 4 === 0 ? "D" : "C");
    rasterSpan(canvas, right, right + 3, y + bob, y % 3 === 0 ? "D" : "B");
  }
  rasterLine(canvas, 9 + hairSwing, 10 + bob, 10 + hairSwing, 21 + bob, "D", 1);
  rasterLine(canvas, 23 - hairSwing, 9 + bob, 22 - hairSwing, 20 + bob, "B", 1);
  rasterPixel(canvas, 9 + hairSwing, 22 + bob, "D");
  rasterPixel(canvas, 23 - hairSwing, 23 + bob, "D");

  // Rear leg.
  rasterLine(canvas, 14, 22 + bob, legPoses.rear[0], legPoses.rear[1], "A", 4);
  rasterLine(canvas, legPoses.rear[0], legPoses.rear[1], legPoses.rear[2], 29, "A", 4);
  rasterLine(canvas, 14, 22 + bob, legPoses.rear[0], legPoses.rear[1], "E", 2);
  rasterLine(canvas, legPoses.rear[0], legPoses.rear[1], legPoses.rear[2], 27, "F", 2);
  rasterLine(canvas, legPoses.rear[2], 27, legPoses.rear[2], 29, "N", 3);
  rasterSpan(canvas, legPoses.rear[3] - 2, legPoses.rear[3] + 2, 30, "J");

  // White shirt, long paw tie and bright pleated skirt. The shirt narrows at
  // the waist and the skirt uses stepped, non-horizontal panels to avoid the
  // previous flat pink bar across the entire body.
  rasterSpan(canvas, 13, 20, 12 + bob, "I");
  rasterSpan(canvas, 12, 21, 13 + bob, "I");
  rasterSpan(canvas, 12, 21, 14 + bob, "I");
  rasterSpan(canvas, 13, 20, 15 + bob, "I");
  rasterSpan(canvas, 14, 19, 16 + bob, "I");
  rasterPixel(canvas, 16, 12 + bob, "L");
  rasterPixel(canvas, 16, 13 + bob, "L");
  rasterPixel(canvas, 17, 14 + bob, "L");
  rasterPixel(canvas, 17, 15 + bob, "L");
  rasterPixel(canvas, 17, 16 + bob, "L");
  rasterPixel(canvas, 16, 15 + bob, "M");
  rasterSpan(canvas, 12, 21, 17 + bob, "B");
  rasterSpan(canvas, 10, 23, 18 + bob, "C");
  rasterSpan(canvas, 9, 24, 19 + bob, "D");
  rasterSpan(canvas, 9, 13, 20 + bob, "D");
  rasterSpan(canvas, 14, 18, 20 + bob, "C");
  rasterSpan(canvas, 19, 23, 20 + bob, "D");
  rasterSpan(canvas, 11, 14, 21 + bob, "C");
  rasterSpan(canvas, 15, 18, 21 + bob, "D");
  rasterSpan(canvas, 19, 22, 21 + bob, "C");
  rasterPixel(canvas, 11, 19 + bob, "M");
  rasterPixel(canvas, 14, 20 + bob, "B");
  rasterPixel(canvas, 18, 20 + bob, "M");
  rasterPixel(canvas, 22, 19 + bob, "B");

  // Oversized patched street jacket. The far sleeve is darker and shorter;
  // the near sleeve projects toward the viewer, using a lighter fold and an
  // angled cuff. This creates depth without increasing the overall footprint.
  rasterSpan(canvas, 8, 13, 12 + bob, "A");
  rasterSpan(canvas, 7, 12, 13 + bob, "K");
  rasterSpan(canvas, 6, 11, 14 + bob, "K");
  rasterSpan(canvas, 6, 10, 15 + bob, "A");
  rasterSpan(canvas, 20, 25, 12 + bob, "K");
  rasterSpan(canvas, 21, 26, 13 + bob, "N");
  rasterSpan(canvas, 21, 27, 14 + bob, "N");
  rasterSpan(canvas, 22, 28, 15 + bob, "K");
  rasterRect(canvas, 5, 15 + bob, 6, 6, "K");
  rasterRect(canvas, 23, 15 + bob, 6, 7, "N");
  rasterSpan(canvas, 5, 9, 21 + bob, "A");
  rasterSpan(canvas, 6, 10, 22 + bob, "N");
  rasterSpan(canvas, 24, 29, 21 + bob, "K");
  rasterSpan(canvas, 23, 28, 22 + bob, "A");
  rasterSpan(canvas, 7, 9, 23 + bob, "A");
  rasterSpan(canvas, 24, 27, 23 + bob, "A");
  // Lapels and front seams sit over the white shirt.
  rasterLine(canvas, 12, 12 + bob, 14, 17 + bob, "N", 1);
  rasterLine(canvas, 21, 12 + bob, 19, 17 + bob, "K", 1);
  rasterPixel(canvas, 12, 14 + bob, "D");
  rasterPixel(canvas, 21, 14 + bob, "C");
  rasterPixel(canvas, 10, 20 + bob, "A");
  rasterPixel(canvas, 23, 20 + bob, "A");
  rasterPixel(canvas, 7, 16 + bob, "P");
  rasterPixel(canvas, 8, 16 + bob, "P");
  rasterPixel(canvas, 25, 17 + bob, "D");
  rasterPixel(canvas, 6, 22 + bob, "O");
  rasterPixel(canvas, 9, 22 + bob, "O");
  rasterPixel(canvas, 25, 22 + bob, "O");
  rasterPixel(canvas, 28, 22 + bob, "O");
  // Pink inner lining and a dark waist gap separate the coat from the skirt.
  rasterPixel(canvas, 10, 17 + bob, "B");
  rasterPixel(canvas, 10, 18 + bob, "D");
  rasterPixel(canvas, 23, 17 + bob, "C");
  rasterPixel(canvas, 23, 18 + bob, "D");
  rasterPixel(canvas, 10, 19 + bob, "A");
  rasterPixel(canvas, 23, 19 + bob, "A");
  rasterSpan(canvas, 12, 21, 17 + bob, "A");
  rasterSpan(canvas, 13, 20, 17 + bob, "B");

  // Cat plush hanging from the right pocket: ears, white face, pink body.
  rasterPixel(canvas, 23, 18 + bob, "O");
  rasterPixel(canvas, 26, 18 + bob, "O");
  rasterSpan(canvas, 23, 26, 19 + bob, "O");
  rasterSpan(canvas, 23, 26, 20 + bob, "D");
  rasterSpan(canvas, 24, 25, 21 + bob, "O");
  rasterPixel(canvas, 24, 19 + bob, "A");
  rasterPixel(canvas, 25, 19 + bob, "A");

  // Warm face framed by a rounded crown, vivid magenta bangs and black cat-ear
  // accessories. A brighter near-side lock and dark far-side root add depth.
  rasterSpan(canvas, 13, 19, 3 + bob, "B");
  rasterSpan(canvas, 11, 21, 4 + bob, "B");
  rasterSpan(canvas, 9, 23, 5 + bob, "C");
  rasterSpan(canvas, 10, 22, 6 + bob, "C");
  rasterSpan(canvas, 12, 20, 7 + bob, "F");
  rasterSpan(canvas, 11, 21, 8 + bob, "F");
  rasterSpan(canvas, 11, 21, 9 + bob, "F");
  rasterSpan(canvas, 12, 20, 10 + bob, "F");
  rasterSpan(canvas, 13, 19, 11 + bob, "E");
  // The far cheek is warm and subdued; the near cheek is brighter. This keeps
  // the glasses readable while giving the head a rounded plane change.
  rasterPixel(canvas, 11, 8 + bob, "E");
  rasterPixel(canvas, 11, 9 + bob, "E");
  rasterPixel(canvas, 12, 10 + bob, "E");
  rasterPixel(canvas, 21, 8 + bob, "H");
  rasterPixel(canvas, 21, 9 + bob, "H");
  rasterSpan(canvas, 10, 14, 5 + bob, "D");
  rasterSpan(canvas, 18, 22, 5 + bob, "B");
  rasterSpan(canvas, 10, 12, 6 + bob, "D");
  rasterSpan(canvas, 20, 22, 6 + bob, "B");
  rasterSpan(canvas, 12, 14, 4 + bob, "D");
  rasterSpan(canvas, 18, 20, 4 + bob, "C");
  rasterPixel(canvas, 15, 6 + bob, "D");
  rasterPixel(canvas, 18, 6 + bob, "B");
  // Crown highlight and dark root separate front bangs from rear hair mass.
  rasterSpan(canvas, 13, 15, 4 + bob, "D");
  rasterSpan(canvas, 18, 20, 4 + bob, "C");
  rasterPixel(canvas, 10, 6 + bob, "B");
  rasterPixel(canvas, 22, 6 + bob, "A");

  // Ear clips are compact triangular accents rather than broad horns.
  rasterPixel(canvas, 10 + hairSwing, 2 + bob, "A");
  rasterSpan(canvas, 9 + hairSwing, 11 + hairSwing, 3 + bob, "A");
  rasterSpan(canvas, 9 + hairSwing, 12 + hairSwing, 4 + bob, "A");
  rasterPixel(canvas, 10 + hairSwing, 4 + bob, "D");
  rasterPixel(canvas, 21 - hairSwing, 2 + bob, "A");
  rasterSpan(canvas, 20 - hairSwing, 22 - hairSwing, 3 + bob, "A");
  rasterSpan(canvas, 19 - hairSwing, 22 - hairSwing, 4 + bob, "A");
  rasterPixel(canvas, 21 - hairSwing, 4 + bob, "D");
  rasterPixel(canvas, 16, 2 + bob, "D");
  rasterPixel(canvas, 17, 1 + bob, "D");

  // Rounded glasses use open corners and thin navy frames. Amber eyes remain
  // readable inside the lenses instead of becoming two cyan rectangles.
  for (const [x, y] of [[13, 7], [14, 7], [15, 7], [12, 8], [16, 8], [12, 9], [16, 9], [13, 10], [14, 10], [15, 10]] as const) {
    rasterPixel(canvas, x, y + bob, "A");
  }
  for (const [x, y] of [[19, 7], [20, 7], [21, 7], [18, 8], [22, 8], [18, 9], [22, 9], [19, 10], [20, 10], [21, 10]] as const) {
    rasterPixel(canvas, x, y + bob, "A");
  }
  rasterPixel(canvas, 17, 8 + bob, "A");
  rasterPixel(canvas, 14, 8 + bob, "P");
  rasterPixel(canvas, 14, 9 + bob, "Q");
  rasterPixel(canvas, 20, 8 + bob, "P");
  rasterPixel(canvas, 20, 9 + bob, "Q");
  rasterPixel(canvas, 17, 11 + bob, "E");
  // Shirt highlight and pink reflected shadow make the torso cylindrical.
  rasterPixel(canvas, 14, 13 + bob, "O");
  rasterPixel(canvas, 14, 14 + bob, "O");
  rasterPixel(canvas, 19, 13 + bob, "S");
  rasterPixel(canvas, 19, 14 + bob, "S");
  rasterPixel(canvas, 18, 15 + bob, "S");

  // Foreground leg.
  rasterLine(canvas, 19, 22 + bob, legPoses.front[0], legPoses.front[1], "A", 5);
  rasterLine(canvas, legPoses.front[0], legPoses.front[1], legPoses.front[2], 29, "A", 5);
  rasterLine(canvas, 19, 22 + bob, legPoses.front[0], legPoses.front[1], "F", 3);
  rasterLine(canvas, legPoses.front[0], legPoses.front[1], legPoses.front[2], 27, "F", 3);
  rasterLine(canvas, legPoses.front[2], 27, legPoses.front[2], 29, "N", 3);
  rasterPixel(canvas, legPoses.front[2] - 1, 27, "R");
  rasterPixel(canvas, legPoses.front[2], 28, "J");
  rasterSpan(canvas, legPoses.front[3] - 2, legPoses.front[3] + 2, 30, "J");
  rasterPixel(canvas, legPoses.front[2], 26, "H");
  rasterSpan(canvas, legPoses.front[3], legPoses.front[3] + 2, 30, "R");

  return finish(compactNanallySilhouette(canvas, phase));
}

export const MICHELE_CHARACTER_SPRITES: Record<string, CharacterSpriteData> = {
  player_michele_side_idle: drawMichele(0, true),
  player_michele_side_idle_1: drawMichele(1, true),
  player_michele_side_walk_0: drawMichele(0, false),
  player_michele_side_walk_1: drawMichele(1, false),
  player_michele_side_walk_2: drawMichele(2, false),
  player_michele_side_walk_3: drawMichele(3, false),
};

export const KANAMI_CHARACTER_SPRITES: Record<string, CharacterSpriteData> = {
  player_kanami_side_idle: drawKanami(0, true),
  player_kanami_side_idle_1: drawKanami(1, true),
  player_kanami_side_walk_0: drawKanami(0, false),
  player_kanami_side_walk_1: drawKanami(1, false),
  player_kanami_side_walk_2: drawKanami(2, false),
  player_kanami_side_walk_3: drawKanami(3, false),
};

export const CELESTIA_CHARACTER_SPRITES: Record<string, CharacterSpriteData> = {
  player_celestia_side_idle: drawCelestia(0, true),
  player_celestia_side_idle_1: drawCelestia(1, true),
  player_celestia_side_walk_0: drawCelestia(0, false),
  player_celestia_side_walk_1: drawCelestia(1, false),
  player_celestia_side_walk_2: drawCelestia(2, false),
  player_celestia_side_walk_3: drawCelestia(3, false),
};
export const ESPER_ZERO_CHARACTER_SPRITES: Record<string, CharacterSpriteData> = {
  player_esper_zero_side_idle: drawEsperZero(0, true),
  player_esper_zero_side_idle_1: drawEsperZero(1, true),
  player_esper_zero_side_walk_0: drawEsperZero(0, false),
  player_esper_zero_side_walk_1: drawEsperZero(1, false),
  player_esper_zero_side_walk_2: drawEsperZero(2, false),
  player_esper_zero_side_walk_3: drawEsperZero(3, false),
};

export const NANALLY_CHARACTER_SPRITES: Record<string, CharacterSpriteData> = {
  player_nanally_side_idle: drawNanally(0, true),
  player_nanally_side_idle_1: drawNanally(1, true),
  player_nanally_side_walk_0: drawNanally(0, false),
  player_nanally_side_walk_1: drawNanally(1, false),
  player_nanally_side_walk_2: drawNanally(2, false),
  player_nanally_side_walk_3: drawNanally(3, false),
};

export const MICHELE_CHARACTER_PALETTE: Record<string, string> = {
  ".": "transparent",
  A: "#26384F",
  B: "#A76F49",
  C: "#E0AE6A",
  D: "#FFE1B0",
  E: "#C98F72",
  F: "#F4C6A4",
  G: "#FFE0C6",
  H: "#367FC5",
  I: "#CAD8E8",
  J: "#F7FBFF",
  K: "#233B5A",
  L: "#4E8FD0",
  M: "#69DFF1",
  N: "#C79B4C",
  O: "#FFFFFF",
  P: "#C94F58",
};

export const KANAMI_CHARACTER_PALETTE: Record<string, string> = {
  ".": "transparent",
  A: "#352A48",
  B: "#A7A0C5",
  C: "#D9D4EB",
  D: "#F4F1FF",
  E: "#C88F7F",
  F: "#F5C9B4",
  G: "#FFE2D2",
  H: "#5E95DD",
  I: "#D7D4E5",
  J: "#FAF8FF",
  K: "#51415F",
  L: "#756080",
  M: "#9C87B1",
  N: "#D8B6DE",
  O: "#9E3D6E",
  P: "#D85E9B",
  Q: "#F2A0C4",
  R: "#292533",
  S: "#B78CAE",
  T: "#FFFFFF",
};

export const CELESTIA_CHARACTER_PALETTE: Record<string, string> = {
  ".": "transparent",
  A: "#171A3D",
  B: "#B9C9E2",
  C: "#E8F0FA",
  D: "#FFFFFF",
  E: "#C9907A",
  F: "#F6CDB8",
  G: "#8EBCE1",
  H: "#C2E2F7",
  I: "#E4F5FF",
  J: "#1E1B48",
  K: "#4F479D",
  L: "#806FD6",
  M: "#F0D36B",
  N: "#F7F4EF",
  O: "#292A48",
  P: "#A5EBFF",
};


export const ESPER_ZERO_CHARACTER_PALETTE: Record<string, string> = {
  ".": "transparent",
  A: "#171923", B: "#292C3A", C: "#4B5065", D: "#C9CEDB",
  E: "#C88E7D", F: "#F4C7B3", G: "#4A405B", H: "#6D5C82",
  I: "#F4F5FA", J: "#A787EE", K: "#332953", L: "#DCCBFF",
  M: "#6DE4F1", N: "#8B90A2", O: "#2C2B38", P: "#0E1018",
  Q: "#F2F0FA", R: "#AAB1C2", S: "#FFFFFF",
};

export const NANALLY_CHARACTER_PALETTE: Record<string, string> = {
  ".": "transparent",
  A: "#211923", B: "#9D2E52", C: "#D3426C", D: "#FF668F",
  E: "#C98B7D", F: "#F6C4B0", G: "#D69A89", H: "#F0B7A1",
  I: "#F4F4F7", J: "#727A8C", K: "#34313B", L: "#8E273F",
  M: "#FF9DB7", N: "#413B49", O: "#FFB5C8", P: "#76C7E8",
  Q: "#9B4C42", R: "#62566B", S: "#FFFFFF",
};

export const MICHELE_HIGH_RES_PALETTE = MICHELE_CHARACTER_PALETTE;
export const KANAMI_HIGH_RES_PALETTE = KANAMI_CHARACTER_PALETTE;
export const CELESTIA_HIGH_RES_PALETTE = CELESTIA_CHARACTER_PALETTE;
export const ESPER_ZERO_HIGH_RES_PALETTE = ESPER_ZERO_CHARACTER_PALETTE;
export const NANALLY_HIGH_RES_PALETTE = NANALLY_CHARACTER_PALETTE;

export const PLAYER_CHARACTER_WIDTH = CHARACTER_WIDTH;
export const PLAYER_CHARACTER_HEIGHT = CHARACTER_HEIGHT;
export const HIGH_RES_CHARACTER_WIDTH = CHARACTER_WIDTH;
export const HIGH_RES_CHARACTER_HEIGHT = CHARACTER_HEIGHT;
