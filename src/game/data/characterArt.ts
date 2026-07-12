export type CharacterSpriteData = string[];

type PixelCanvas = string[][];
type Point = readonly [number, number];

const CHARACTER_WIDTH = 48;
const CHARACTER_HEIGHT = 64;

function createCanvas(): PixelCanvas {
  return Array.from({ length: CHARACTER_HEIGHT }, () => Array.from({ length: CHARACTER_WIDTH }, () => "."));
}

function pixel(canvas: PixelCanvas, x: number, y: number, color: string): void {
  const px = Math.round(x);
  const py = Math.round(y);
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

function drawMicheleLegs(canvas: PixelCanvas, bob: number, phase: number): void {
  const stride = [2, 1, -2, -1][phase] ?? 0;
  const backStride = -stride;

  polygon(canvas, [[17, 43 + bob], [23, 43 + bob], [23 + backStride, 57 + bob], [19 + backStride, 61 + bob], [15 + backStride, 59 + bob], [18, 50 + bob]], "A");
  polygon(canvas, [[18, 44 + bob], [22, 44 + bob], [22 + backStride, 56 + bob], [19 + backStride, 59 + bob], [17 + backStride, 58 + bob], [19, 49 + bob]], "I");
  rect(canvas, 17 + backStride, 55 + bob, 5, 5, "K");
  rect(canvas, 18 + backStride, 55 + bob, 4, 2, "L");

  polygon(canvas, [[26, 43 + bob], [32, 43 + bob], [31 + stride, 58 + bob], [35 + stride, 60 + bob], [34 + stride, 62 + bob], [28 + stride, 61 + bob], [27, 50 + bob]], "A");
  polygon(canvas, [[27, 44 + bob], [31, 44 + bob], [30 + stride, 57 + bob], [33 + stride, 59 + bob], [32 + stride, 60 + bob], [29 + stride, 59 + bob], [28, 49 + bob]], "J");
  rect(canvas, 29 + stride, 56 + bob, 6, 5, "K");
  rect(canvas, 30 + stride, 56 + bob, 4, 2, "M");
}

function drawMichele(frame: number, idle: boolean): CharacterSpriteData {
  const canvas = createCanvas();
  const bob = idle ? (frame % 2 === 1 ? -1 : 0) : [0, -1, 0, -1][frame] ?? 0;
  const phase = idle ? 1 : frame % 4;
  const hairSwing = idle ? (frame % 2 === 1 ? 1 : 0) : [1, 0, -1, 0][phase];

  // Rear hair mass and long side locks.
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

  drawMicheleLegs(canvas, bob, phase);

  // Torso, layered white-blue investigator uniform.
  polygon(canvas, [[17, 25 + bob], [23, 23 + bob], [30, 25 + bob], [34, 32 + bob], [32, 44 + bob], [18, 44 + bob], [15, 34 + bob]], "A");
  polygon(canvas, [[18, 26 + bob], [23, 24 + bob], [29, 26 + bob], [32, 32 + bob], [30, 42 + bob], [19, 42 + bob], [17, 34 + bob]], "J");
  polygon(canvas, [[18, 29 + bob], [23, 25 + bob], [24, 42 + bob], [19, 42 + bob], [17, 34 + bob]], "I");
  polygon(canvas, [[24, 25 + bob], [29, 27 + bob], [31, 34 + bob], [29, 42 + bob], [25, 42 + bob]], "L");
  rect(canvas, 23, 27 + bob, 3, 14, "K");
  rect(canvas, 24, 29 + bob, 1, 10, "M");
  rect(canvas, 18, 34 + bob, 13, 3, "K");
  rect(canvas, 20, 35 + bob, 9, 1, "N");
  rect(canvas, 27, 28 + bob, 3, 3, "M");
  pixel(canvas, 28, 29 + bob, "O");

  // Neck and face.
  rect(canvas, 22, 22 + bob, 6, 6, "E");
  rect(canvas, 23, 22 + bob, 5, 5, "F");
  ellipse(canvas, 24, 15 + bob, 8, 10, "A");
  ellipse(canvas, 25, 15 + bob, 7, 9, "F");
  rect(canvas, 29, 15 + bob, 4, 4, "F");
  pixel(canvas, 33, 17 + bob, "E");
  rect(canvas, 29, 12 + bob, 2, 3, "H");
  pixel(canvas, 30, 12 + bob, "O");
  pixel(canvas, 30, 17 + bob, "E");
  line(canvas, 28, 20 + bob, 31, 20 + bob, "E");

  // Layered fringe and hair highlights.
  polygon(canvas, [[15, 8 + bob], [22, 5 + bob], [29, 8 + bob], [26, 13 + bob], [22, 16 + bob], [18, 14 + bob], [14, 18 + bob]], "B");
  polygon(canvas, [[17, 8 + bob], [22, 6 + bob], [27, 8 + bob], [24, 11 + bob], [21, 13 + bob], [18, 12 + bob]], "C");
  line(canvas, 17, 9 + bob, 23, 7 + bob, "D", 2);
  line(canvas, 13 + hairSwing, 18 + bob, 15 + hairSwing, 29 + bob, "C", 2);

  // Front arm and hand placed at the new weapon height.
  polygon(canvas, [[29, 28 + bob], [34, 29 + bob], [37, 37 + bob], [34, 41 + bob], [30, 38 + bob]], "A");
  polygon(canvas, [[30, 29 + bob], [33, 30 + bob], [35, 36 + bob], [33, 39 + bob], [31, 37 + bob]], "L");
  rect(canvas, 33, 37 + bob, 5, 4, "E");
  rect(canvas, 34, 37 + bob, 4, 3, "F");
  rect(canvas, 36, 38 + bob, 3, 2, "K");
  pixel(canvas, 37, 38 + bob, "M");

  return finish(canvas);
}

function drawKanamiLegs(canvas: PixelCanvas, bob: number, phase: number): void {
  const stride = [2, 1, -2, -1][phase] ?? 0;
  const backStride = -stride;

  polygon(canvas, [[18, 43 + bob], [23, 43 + bob], [22 + backStride, 57 + bob], [18 + backStride, 61 + bob], [14 + backStride, 59 + bob], [18, 50 + bob]], "A");
  polygon(canvas, [[19, 44 + bob], [22, 44 + bob], [21 + backStride, 56 + bob], [18 + backStride, 59 + bob], [16 + backStride, 58 + bob], [19, 49 + bob]], "J");
  rect(canvas, 16 + backStride, 55 + bob, 6, 5, "R");
  rect(canvas, 17 + backStride, 55 + bob, 4, 2, "P");

  polygon(canvas, [[26, 43 + bob], [31, 43 + bob], [31 + stride, 57 + bob], [35 + stride, 60 + bob], [34 + stride, 62 + bob], [28 + stride, 61 + bob], [27, 50 + bob]], "A");
  polygon(canvas, [[27, 44 + bob], [30, 44 + bob], [30 + stride, 56 + bob], [33 + stride, 59 + bob], [32 + stride, 60 + bob], [29 + stride, 59 + bob], [28, 49 + bob]], "J");
  rect(canvas, 29 + stride, 56 + bob, 6, 5, "R");
  rect(canvas, 30 + stride, 56 + bob, 4, 2, "Q");
}

function drawKanami(frame: number, idle: boolean): CharacterSpriteData {
  const canvas = createCanvas();
  const bob = idle ? (frame % 2 === 1 ? -1 : 0) : [0, -1, 0, -1][frame] ?? 0;
  const phase = idle ? 1 : frame % 4;
  const hairSwing = idle ? (frame % 2 === 1 ? 1 : 0) : [2, 0, -2, 0][phase];
  const ribbonSwing = idle ? (frame % 2 === 1 ? -1 : 0) : [-2, 0, 2, 1][phase];

  // Long stage ribbons behind the body.
  polygon(canvas, [[15, 27 + bob], [11, 31 + bob], [6 + ribbonSwing, 43 + bob], [3 + ribbonSwing, 55 + bob], [8 + ribbonSwing, 53 + bob], [14 + ribbonSwing, 40 + bob], [18, 32 + bob]], "A");
  polygon(canvas, [[15, 29 + bob], [12, 32 + bob], [8 + ribbonSwing, 43 + bob], [5 + ribbonSwing, 51 + bob], [8 + ribbonSwing, 50 + bob], [15 + ribbonSwing, 38 + bob], [18, 32 + bob]], "O");
  line(canvas, 11 + ribbonSwing, 36 + bob, 7 + ribbonSwing, 47 + bob, "Q", 2);
  polygon(canvas, [[18, 31 + bob], [12, 39 + bob], [11 + ribbonSwing, 57 + bob], [16 + ribbonSwing, 53 + bob], [20 + ribbonSwing, 39 + bob], [22, 33 + bob]], "A");
  polygon(canvas, [[19, 32 + bob], [14, 40 + bob], [13 + ribbonSwing, 53 + bob], [16 + ribbonSwing, 51 + bob], [19 + ribbonSwing, 38 + bob], [21, 33 + bob]], "P");

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

  drawKanamiLegs(canvas, bob, phase);

  polygon(canvas, [[16, 38 + bob], [31, 38 + bob], [35, 45 + bob], [30, 49 + bob], [23, 47 + bob], [16, 49 + bob], [12, 44 + bob]], "A");
  polygon(canvas, [[17, 39 + bob], [30, 39 + bob], [33, 44 + bob], [29, 47 + bob], [23, 45 + bob], [17, 47 + bob], [14, 44 + bob]], "J");
  polygon(canvas, [[18, 42 + bob], [30, 42 + bob], [31, 45 + bob], [27, 47 + bob], [23, 44 + bob], [18, 47 + bob], [15, 44 + bob]], "P");
  line(canvas, 17, 41 + bob, 31, 41 + bob, "Q", 2);

  // Torso: black off-shoulder top, white center and pink stage details.
  polygon(canvas, [[17, 24 + bob], [23, 22 + bob], [30, 25 + bob], [34, 33 + bob], [31, 41 + bob], [17, 41 + bob], [14, 32 + bob]], "A");
  polygon(canvas, [[18, 25 + bob], [23, 23 + bob], [29, 26 + bob], [32, 32 + bob], [30, 39 + bob], [18, 39 + bob], [16, 32 + bob]], "R");
  polygon(canvas, [[21, 24 + bob], [25, 24 + bob], [27, 39 + bob], [21, 39 + bob]], "J");
  polygon(canvas, [[23, 25 + bob], [26, 27 + bob], [25, 37 + bob], [22, 37 + bob]], "I");
  line(canvas, 18, 28 + bob, 30, 28 + bob, "P", 2);
  rect(canvas, 18, 37 + bob, 13, 3, "P");
  rect(canvas, 22, 30 + bob, 5, 4, "Q");
  pixel(canvas, 24, 31 + bob, "T");

  // Neck and face.
  rect(canvas, 22, 21 + bob, 6, 6, "E");
  rect(canvas, 23, 21 + bob, 5, 5, "F");
  ellipse(canvas, 24, 14 + bob, 8, 10, "A");
  ellipse(canvas, 25, 14 + bob, 7, 9, "F");
  rect(canvas, 29, 14 + bob, 4, 4, "F");
  pixel(canvas, 33, 16 + bob, "E");
  rect(canvas, 29, 11 + bob, 2, 3, "H");
  pixel(canvas, 30, 11 + bob, "T");
  pixel(canvas, 30, 16 + bob, "E");
  line(canvas, 28, 19 + bob, 31, 19 + bob, "E");

  // Fringe with lavender and pink streaks.
  polygon(canvas, [[14, 8 + bob], [21, 4 + bob], [29, 7 + bob], [27, 12 + bob], [23, 15 + bob], [18, 13 + bob], [14, 18 + bob]], "B");
  polygon(canvas, [[16, 8 + bob], [21, 6 + bob], [27, 7 + bob], [24, 11 + bob], [21, 13 + bob], [17, 11 + bob]], "C");
  line(canvas, 17, 8 + bob, 23, 6 + bob, "D", 2);
  line(canvas, 18, 10 + bob, 17, 18 + bob, "S", 2);
  line(canvas, 25, 8 + bob, 23, 16 + bob, "Q", 2);

  // Front arm, asymmetrical sleeve and hand at weapon grip height.
  polygon(canvas, [[29, 27 + bob], [34, 29 + bob], [37, 36 + bob], [34, 41 + bob], [30, 38 + bob]], "A");
  polygon(canvas, [[30, 28 + bob], [33, 30 + bob], [35, 36 + bob], [33, 39 + bob], [31, 37 + bob]], "R");
  rect(canvas, 33, 37 + bob, 5, 4, "E");
  rect(canvas, 34, 37 + bob, 4, 3, "F");
  rect(canvas, 36, 38 + bob, 3, 2, "R");
  pixel(canvas, 37, 38 + bob, "P");

  return finish(canvas);
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

export const MICHELE_HIGH_RES_PALETTE: Record<string, string> = {
  ".": "transparent",
  A: "#26384F",
  B: "#A8742D",
  C: "#E1B94E",
  D: "#FFF0A0",
  E: "#C98F72",
  F: "#F4C6A4",
  G: "#FFE0C6",
  H: "#367FC5",
  I: "#CAD8E8",
  J: "#F7FBFF",
  K: "#233B5A",
  L: "#4E8FD0",
  M: "#69DFF1",
  N: "#E7B93E",
  O: "#FFFFFF",
};

export const KANAMI_HIGH_RES_PALETTE: Record<string, string> = {
  ".": "transparent",
  A: "#352A48",
  B: "#7E70A6",
  C: "#B8ADD7",
  D: "#EEE8FF",
  E: "#C88F7F",
  F: "#F5C9B4",
  G: "#FFE2D2",
  H: "#538ED8",
  I: "#D7D4E5",
  J: "#FAF8FF",
  K: "#51415F",
  L: "#756080",
  M: "#9C87B1",
  N: "#D8B6DE",
  O: "#9E3D6E",
  P: "#E466A5",
  Q: "#FFABD3",
  R: "#292533",
  S: "#D58FC3",
  T: "#FFFFFF",
};

export const HIGH_RES_CHARACTER_WIDTH = CHARACTER_WIDTH;
export const HIGH_RES_CHARACTER_HEIGHT = CHARACTER_HEIGHT;
