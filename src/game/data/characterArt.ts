export type CharacterSpriteData = string[];

type PixelCanvas = string[][];

const CHARACTER_WIDTH = 16;
const CHARACTER_HEIGHT = 16;

function createCanvas(): PixelCanvas {
  return Array.from(
    { length: CHARACTER_HEIGHT },
    () => Array.from({ length: CHARACTER_WIDTH }, () => "."),
  );
}

function pixel(canvas: PixelCanvas, x: number, y: number, color: string): void {
  if (x < 0 || y < 0 || x >= CHARACTER_WIDTH || y >= CHARACTER_HEIGHT) return;
  canvas[y][x] = color;
}

function rect(canvas: PixelCanvas, x: number, y: number, width: number, height: number, color: string): void {
  for (let py = y; py < y + height; py++) {
    for (let px = x; px < x + width; px++) pixel(canvas, px, py, color);
  }
}

function finish(canvas: PixelCanvas): CharacterSpriteData {
  return canvas.map(row => row.join(""));
}

function drawMicheleLegs(canvas: PixelCanvas, phase: number, idle: boolean): void {
  if (idle) {
    rect(canvas, 6, 11, 2, 3, "F");
    pixel(canvas, 6, 12, "G");
    rect(canvas, 5, 13, 3, 2, "A");
    pixel(canvas, 5, 14, "H");

    rect(canvas, 9, 11, 2, 3, "F");
    pixel(canvas, 10, 12, "G");
    rect(canvas, 9, 13, 3, 2, "A");
    pixel(canvas, 11, 14, "H");
    return;
  }

  const leftLegX = [6, 6, 7, 6][phase] ?? 6;
  const rightLegX = [9, 10, 9, 9][phase] ?? 9;
  const leftFootX = [4, 5, 7, 6][phase] ?? 5;
  const rightFootX = [9, 10, 7, 9][phase] ?? 9;

  rect(canvas, leftLegX, 11, 2, 3, "F");
  pixel(canvas, leftLegX, 12, "G");
  rect(canvas, leftFootX, 13, 3, 2, "A");
  pixel(canvas, leftFootX, 14, "H");

  rect(canvas, rightLegX, 11, 2, 3, "F");
  pixel(canvas, rightLegX + 1, 12, "G");
  rect(canvas, rightFootX, 13, 3, 2, "A");
  pixel(canvas, rightFootX + 2, 14, "H");
}

function drawMichele(frame: number, idle: boolean): CharacterSpriteData {
  const canvas = createCanvas();
  const phase = idle ? 0 : frame % 4;
  const ponytailShift = idle ? frame % 2 : [0, 1, 0, -1][phase];

  drawMicheleLegs(canvas, phase, idle);

  // Long blonde twin-tail silhouette behind the body.
  pixel(canvas, 3 + ponytailShift, 3, "A");
  rect(canvas, 2 + ponytailShift, 4, 3, 5, "A");
  rect(canvas, 3 + ponytailShift, 4, 2, 4, "C");
  pixel(canvas, 3 + ponytailShift, 4, "D");
  pixel(canvas, 2 + ponytailShift, 8, "B");
  pixel(canvas, 3 + ponytailShift, 9, "A");
  pixel(canvas, 4 + ponytailShift, 9, "C");

  // Short investigator coat and rear arm.
  rect(canvas, 4, 8, 2, 4, "A");
  rect(canvas, 5, 9, 1, 3, "G");
  pixel(canvas, 4, 11, "G");

  // Compact white-and-blue uniform with dark tie, red collar and utility belt.
  rect(canvas, 5, 7, 6, 5, "A");
  rect(canvas, 6, 8, 4, 3, "F");
  rect(canvas, 5, 8, 1, 3, "G");
  rect(canvas, 10, 8, 1, 3, "G");
  pixel(canvas, 7, 8, "I");
  rect(canvas, 8, 8, 1, 3, "A");
  rect(canvas, 6, 10, 4, 1, "J");
  pixel(canvas, 9, 8, "H");

  // Forward arm and weapon hand remain stable across locomotion frames.
  pixel(canvas, 11, 8, "A");
  rect(canvas, 11, 9, 2, 2, "G");
  pixel(canvas, 12, 9, "E");
  pixel(canvas, 13, 9, "E");
  pixel(canvas, 12, 10, "A");

  // Head and face.
  rect(canvas, 5, 2, 5, 1, "A");
  rect(canvas, 4, 3, 7, 4, "A");
  rect(canvas, 5, 7, 6, 1, "A");
  rect(canvas, 5, 3, 5, 2, "C");
  pixel(canvas, 6, 3, "D");
  pixel(canvas, 7, 3, "D");
  pixel(canvas, 5, 5, "B");
  pixel(canvas, 6, 5, "C");
  rect(canvas, 7, 5, 4, 2, "E");
  pixel(canvas, 9, 5, "H");
  pixel(canvas, 11, 6, "E");

  // Black cat-ear communications rig with cyan status lights.
  pixel(canvas, 5, 0, "A");
  pixel(canvas, 6, 1, idle && frame % 2 === 1 ? "D" : "H");
  pixel(canvas, 9, 0, "A");
  pixel(canvas, 10, 1, "H");
  pixel(canvas, 11, 4, "A");
  pixel(canvas, 11, 5, "H");

  return finish(canvas);
}

function drawKanamiLegs(canvas: PixelCanvas, phase: number, idle: boolean): void {
  if (idle) {
    rect(canvas, 6, 12, 2, 2, "E");
    rect(canvas, 5, 13, 3, 2, "F");
    pixel(canvas, 5, 14, "H");

    rect(canvas, 9, 12, 2, 2, "E");
    rect(canvas, 9, 13, 3, 2, "F");
    pixel(canvas, 11, 14, "I");
    return;
  }

  const leftLegX = [6, 6, 8, 7][phase] ?? 6;
  const rightLegX = [9, 10, 9, 9][phase] ?? 9;
  const leftFootX = [4, 5, 7, 6][phase] ?? 5;
  const rightFootX = [9, 10, 7, 9][phase] ?? 9;

  rect(canvas, leftLegX, 12, 2, 2, "E");
  rect(canvas, leftFootX, 13, 3, 2, "F");
  pixel(canvas, leftFootX, 14, "H");

  rect(canvas, rightLegX, 12, 2, 2, "E");
  rect(canvas, rightFootX, 13, 3, 2, "F");
  pixel(canvas, rightFootX + 2, 14, "I");
}

function drawKanami(frame: number, idle: boolean): CharacterSpriteData {
  const canvas = createCanvas();
  const phase = idle ? 0 : frame % 4;
  const hairShift = idle ? frame % 2 : [0, 1, 0, -1][phase];

  drawKanamiLegs(canvas, phase, idle);

  // Silver-lavender long hair; the small pink tab replaces the old oversized ribbons.
  rect(canvas, 3 + hairShift, 4, 3, 7, "A");
  rect(canvas, 4 + hairShift, 4, 2, 6, "C");
  pixel(canvas, 4 + hairShift, 5, "D");
  pixel(canvas, 3 + hairShift, 10, "B");
  pixel(canvas, 4 + hairShift, 11, "C");
  pixel(canvas, 2 + hairShift, 8, "H");
  pixel(canvas, 2 + hairShift, 9, "I");

  // Narrow black stage top with white center, pink waist and layered skirt.
  rect(canvas, 5, 7, 6, 4, "A");
  rect(canvas, 6, 8, 4, 3, "F");
  rect(canvas, 7, 8, 2, 2, "G");
  pixel(canvas, 8, 8, "I");
  rect(canvas, 5, 10, 6, 1, "H");
  rect(canvas, 4, 11, 8, 2, "A");
  rect(canvas, 5, 11, 6, 1, "G");
  pixel(canvas, 5, 12, "H");
  pixel(canvas, 8, 12, "I");
  pixel(canvas, 11, 12, "H");

  // Asymmetrical sleeve and forward weapon hand.
  pixel(canvas, 11, 8, "A");
  rect(canvas, 11, 9, 2, 2, "F");
  pixel(canvas, 12, 9, "E");
  pixel(canvas, 13, 9, "E");
  pixel(canvas, 12, 10, "H");

  // Head, silver fringe and visible blue eye.
  rect(canvas, 5, 2, 5, 1, "A");
  rect(canvas, 4, 3, 7, 4, "A");
  rect(canvas, 5, 7, 6, 1, "A");
  rect(canvas, 5, 3, 5, 2, "C");
  pixel(canvas, 6, 3, "D");
  pixel(canvas, 7, 3, "D");
  pixel(canvas, 5, 5, "B");
  rect(canvas, 7, 5, 4, 2, "E");
  pixel(canvas, 9, 5, "J");
  pixel(canvas, 11, 6, "E");

  // Pink fringe streak, idol ornament and one-pixel ahoge.
  pixel(canvas, 8, 3, "H");
  pixel(canvas, 8, 4, "I");
  pixel(canvas, 4, 3, "H");
  pixel(canvas, 3, 4, "I");
  pixel(canvas, 8, 0, "C");
  pixel(canvas, idle && frame % 2 === 1 ? 8 : 9, 1, "D");

  // Near-side trailing lock creates a different silhouette from Michele's coat.
  pixel(canvas, 10, 7, "B");
  pixel(canvas, 11, 7, "C");
  pixel(canvas, 11, 8, "C");

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

export const MICHELE_CHARACTER_PALETTE: Record<string, string> = {
  ".": "transparent",
  A: "#1B2A3D",
  B: "#A86F24",
  C: "#E1B94E",
  D: "#FFF0A0",
  E: "#F4C6A4",
  F: "#F7FBFF",
  G: "#4E8FD0",
  H: "#69DFF1",
  I: "#C6534D",
  J: "#6E4935",
};

export const KANAMI_CHARACTER_PALETTE: Record<string, string> = {
  ".": "transparent",
  A: "#292533",
  B: "#756A98",
  C: "#C8C0E3",
  D: "#F1EDFF",
  E: "#F5C9B4",
  F: "#3A3045",
  G: "#FAF8FF",
  H: "#E466A5",
  I: "#FFABD3",
  J: "#538ED8",
};

// Compatibility aliases for callers that imported the former 48×64 names.
export const MICHELE_HIGH_RES_PALETTE = MICHELE_CHARACTER_PALETTE;
export const KANAMI_HIGH_RES_PALETTE = KANAMI_CHARACTER_PALETTE;

export const PLAYER_CHARACTER_WIDTH = CHARACTER_WIDTH;
export const PLAYER_CHARACTER_HEIGHT = CHARACTER_HEIGHT;
export const HIGH_RES_CHARACTER_WIDTH = CHARACTER_WIDTH;
export const HIGH_RES_CHARACTER_HEIGHT = CHARACTER_HEIGHT;
