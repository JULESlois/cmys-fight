export type ArcaneSpriteData = string[];

type Canvas = string[][];

const WIDTH = 32;
const HEIGHT = 32;

function canvas(): Canvas {
  return Array.from({ length: HEIGHT }, () => Array.from({ length: WIDTH }, () => "."));
}

function rect(target: Canvas, x: number, y: number, width: number, height: number, color: string): void {
  for (let py = y; py < y + height; py++) {
    for (let px = x; px < x + width; px++) {
      if (px >= 0 && px < WIDTH && py >= 0 && py < HEIGHT) target[py][px] = color;
    }
  }
}

function pixel(target: Canvas, x: number, y: number, color: string): void {
  rect(target, x, y, 1, 1, color);
}

function drawArcaneForm(phase: number, moving: boolean): ArcaneSpriteData {
  const target = canvas();
  const bob = phase % 2;
  const robeLag = moving ? (phase % 4 < 2 ? -1 : 1) : 0;
  const outline = "A";
  const body = "B";
  const structure = "C";
  const cmys = "D";
  const energy = "E";
  const highlight = "F";

  // Tall crown: narrow vertical anchor that remains readable at 320x240.
  rect(target, 14, 1 + bob, 4, 2, outline);
  rect(target, 13, 3 + bob, 6, 2, outline);
  rect(target, 14, 2 + bob, 4, 5, structure);
  rect(target, 15, 2 + bob, 2, 2, cmys);
  pixel(target, 16, 2 + bob, highlight);

  // Hooded head and pointed shoulders.
  rect(target, 12, 7 + bob, 8, 6, outline);
  rect(target, 13, 7 + bob, 6, 5, body);
  rect(target, 14, 9 + bob, 4, 2, structure);
  pixel(target, 18, 9 + bob, energy);
  rect(target, 9, 12 + bob, 4, 3, outline);
  rect(target, 19, 12 + bob, 4, 3, outline);
  pixel(target, 9, 12 + bob, cmys);
  pixel(target, 22, 12 + bob, cmys);

  // Narrow torso and chest core aligned to the weapon axis.
  rect(target, 12, 13 + bob, 8, 9, outline);
  rect(target, 13, 13 + bob, 6, 8, body);
  rect(target, 14, 14 + bob, 4, 6, structure);
  rect(target, 15, 15 + bob, 2, 2, energy);
  pixel(target, 16, 15 + bob, highlight);
  rect(target, 10, 15 + bob, 3, 5, outline);
  rect(target, 19, 15 + bob, 3, 5, outline);
  rect(target, 11, 16 + bob, 2, 3, structure);
  rect(target, 19, 16 + bob, 2, 3, structure);

  // Split floating robe with one-pixel delayed hem motion.
  rect(target, 11, 21, 10, 3, outline);
  rect(target, 12, 21, 8, 2, structure);
  rect(target, 10 + robeLag, 24, 5, 6, outline);
  rect(target, 17 + robeLag, 24, 5, 6, outline);
  rect(target, 11 + robeLag, 24, 3, 5, body);
  rect(target, 18 + robeLag, 24, 3, 5, body);
  pixel(target, 12 + robeLag, 28, cmys);
  pixel(target, 19 + robeLag, 28, cmys);
  rect(target, 11 + robeLag, 30, 4, 1, energy);
  rect(target, 17 + robeLag, 30, 4, 1, energy);

  return target.map(row => row.join(""));
}

export const ARCANE_CHARACTER_SPRITES: Record<string, ArcaneSpriteData> = {
  player_arcane_side_idle: drawArcaneForm(0, false),
  player_arcane_side_idle_1: drawArcaneForm(1, false),
  player_arcane_side_walk_0: drawArcaneForm(0, true),
  player_arcane_side_walk_1: drawArcaneForm(1, true),
  player_arcane_side_walk_2: drawArcaneForm(2, true),
  player_arcane_side_walk_3: drawArcaneForm(3, true),
};

export const ARCANE_CHARACTER_PALETTE: Record<string, string> = {
  ".": "transparent",
  A: "#07101F",
  B: "#0B1429",
  C: "#243B70",
  D: "#3498DB",
  E: "#6FE6FF",
  F: "#DFFCFF",
};
