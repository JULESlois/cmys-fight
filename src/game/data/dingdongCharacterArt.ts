import type { CharacterSpriteData } from "./characterArt";

/** Native 32px art. The video supplies poses, never resampled or keyed pixels.
 * The hood and continuous egg-shaped torso deliberately have no arms, sleeves,
 * gloves or crest. Weapons and pulse FX belong to separate render layers.
 */
export const DINGDONG_CHARACTER_PALETTE: Record<string, string> = {
  W: "#F4FAFA", // suit highlight
  S: "#D8E4EA", // suit midtone / face
  D: "#A4B5C4", // far leg / suit shade
  H: "#5C7483", // visor rim / soles
  B: "#529CC3", // blue seam tape
  C: "#8BCFE0", // mask highlight
  M: "#3E86AD", // mask shade
  E: "#172A38", // eyes
};

type Canvas = string[][];
type Pose = { bob: number; lean?: number; crouch?: number; stride?: number; breath?: boolean; squeeze?: boolean };

function span(canvas: Canvas, y: number, left: number, right: number, color: string): void {
  if (y < 0 || y >= 32) return;
  for (let x = Math.max(0, left); x <= Math.min(31, right); x++) canvas[y][x] = color;
}

function rect(canvas: Canvas, x: number, y: number, w: number, h: number, color: string): void {
  for (let row = y; row < y + h; row++) span(canvas, row, x, x + w - 1, color);
}

function boot(canvas: Canvas, x: number, y: number, near: boolean, tilt = 0): void {
  rect(canvas, x, y, 4, 3, near ? "S" : "D");
  span(canvas, y, x, x + 3, "B");
  span(canvas, y + 2, x + tilt, x + 4 + tilt, near ? "W" : "S");
  span(canvas, y + 3, x + tilt, x + 4 + tilt, "H");
}

function draw(pose: Pose): CharacterSpriteData {
  const canvas: Canvas = Array.from({ length: 32 }, () => Array<string>(32).fill("."));
  const lean = pose.lean ?? 0;
  const crouch = pose.crouch ?? 0;
  // Ground contacts stay on row 29. Passing feet lift independently of the body.
  switch (pose.stride) {
    case 0: boot(canvas, 8, 26, false, -1); boot(canvas, 20, 24, true, 1); break;
    case 1: boot(canvas, 11, 23, false, 1); boot(canvas, 17, 26, true, 1); break;
    case 2: boot(canvas, 21, 26, false, 1); boot(canvas, 8, 24, true, -1); break;
    case 3: boot(canvas, 20, 23, false, -1); boot(canvas, 12, 26, true, 1); break;
    case 4: boot(canvas, 8, 25, false, -1); boot(canvas, 22, 25, true, 1); break;
    default: boot(canvas, 10, 26, false); boot(canvas, 19, 26, true); break;
  }

  // A single uninterrupted torso silhouette, authored as horizontal pixel runs.
  const top = 14 + pose.bob + crouch;
  const bottom = 26 + Math.min(0, pose.bob);
  for (let y = top; y <= bottom; y++) {
    const row = y - top;
    const inset = row < 2 ? 3 - row : y >= bottom - 1 ? y - (bottom - 2) : 0;
    const belly = pose.breath && row > 3 && y < bottom - 1 ? 1 : 0;
    const left = 7 + inset - belly + lean;
    const right = 25 - inset + lean;
    span(canvas, y, left, right, "W");
    span(canvas, y, left, left + 1, "S");
    if (y > bottom - 3) span(canvas, y, left, right - 1, "S");
    if (y === bottom) span(canvas, y, left + 1, right - 1, "D");
    span(canvas, y, 20 + lean, 20 + lean, "B");
  }
  const beltY = Math.min(bottom - 2, top + 7);
  span(canvas, beltY, 8 + lean, 24 + lean, "B");
  span(canvas, beltY - 1, 8 + lean, 10 + lean, "B");
  span(canvas, beltY + 1, 19 + lean, 20 + lean, "B");

  const hx = 8 + lean;
  const hy = 1 + pose.bob + crouch;
  const hood = [[6, 11], [4, 13], [2, 14], [1, 15], [0, 16], [0, 16], [0, 16], [0, 16],
    [0, 16], [0, 16], [0, 16], [0, 16], [1, 16], [2, 15], [3, 14], [5, 13]];
  hood.forEach(([left, right], row) => {
    span(canvas, hy + row, hx + left, hx + right, "W");
    if (row >= 3) span(canvas, hy + row, hx + left, hx + left, "S");
    if (row >= 7 && row <= 12) span(canvas, hy + row, hx + left, hx + left + 1, "S");
  });
  // Tape follows the hood surface; no pixels protrude above it like a crest.
  [[8, 0], [9, 1], [10, 2], [10, 3]].forEach(([x, y]) => span(canvas, hy + y, hx + x, hx + x, "B"));
  rect(canvas, hx + 6, hy + 4, 10, 10, "H");
  rect(canvas, hx + 7, hy + 5, 9, 8, "S");
  rect(canvas, hx + 7, hy + 5, 1, 6, "D");
  for (const eye of [8, 13]) {
    if (pose.squeeze) span(canvas, hy + 7, hx + eye, hx + eye + 2, "E");
    else {
      span(canvas, hy + 6, hx + eye + 1, hx + eye + 1, "E");
      span(canvas, hy + 7, hx + eye, hx + eye, "E");
      span(canvas, hy + 7, hx + eye + 2, hx + eye + 2, "E");
    }
  }
  span(canvas, hy + 9, hx + 7, hx + 15, "C");
  rect(canvas, hx + 7, hy + 10, 9, 2, "B");
  span(canvas, hy + 12, hx + 8, hx + 14, "M");
  span(canvas, hy + 13, hx + 9, hx + 13, "M");
  span(canvas, hy + 14, hx + 3, hx + 5, "B");
  span(canvas, hy + 15, hx + 6, hx + 13, "B");
  return canvas.map(row => row.join(""));
}

export const DINGDONG_CHARACTER_SPRITES: Record<string, CharacterSpriteData> = {
  player_dingdong_side_idle: draw({ bob: 0 }),
  player_dingdong_side_idle_1: draw({ bob: 1, breath: true }),
  player_dingdong_side_walk_0: draw({ bob: 0, stride: 0 }),
  player_dingdong_side_walk_1: draw({ bob: -1, stride: 1 }),
  player_dingdong_side_walk_2: draw({ bob: 0, stride: 2 }),
  player_dingdong_side_walk_3: draw({ bob: -1, stride: 3 }),
  player_dingdong_side_skill_0: draw({ bob: 0, crouch: 1, squeeze: true }),
  player_dingdong_side_skill_1: draw({ bob: 0, crouch: 3, breath: true, squeeze: true }),
  player_dingdong_side_skill_2: draw({ bob: -1, lean: 1, stride: 4 }),
  player_dingdong_side_skill_3: draw({ bob: 0, lean: 1, stride: 4, breath: true }),
  player_dingdong_side_skill_4: draw({ bob: 0, crouch: 2, breath: true }),
  player_dingdong_side_skill_5: draw({ bob: 0, crouch: 1 }),
};
