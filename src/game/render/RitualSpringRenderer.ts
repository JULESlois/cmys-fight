export type RitualSpringTheme = "forest" | "dungeon" | "snow" | "lava" | "hub";
export type RitualSpringPart = "court" | "basin" | "crystal" | "front_rim" | "lantern_pylons" | "soul_motes";

export interface RitualSpringWaterPalette {
  dark: string;
  body: string;
  light: string;
  glow: string;
}

export interface RitualSpringRenderOptions {
  x: number;
  y: number;
  scale?: number;
  time: number;
  theme?: RitualSpringTheme;
  completed?: boolean;
}

export const RITUAL_SPRING_WATER: Record<RitualSpringTheme, RitualSpringWaterPalette> = {
  hub: { dark: "#246A78", body: "#3FA9B8", light: "#72E0E8", glow: "#B7FAF5" },
  forest: { dark: "#245F55", body: "#3A9C83", light: "#63D5B1", glow: "#C8FFE5" },
  dungeon: { dark: "#4B2B65", body: "#7A48A0", light: "#B76DE2", glow: "#F2D8FF" },
  snow: { dark: "#285D70", body: "#4AA9C0", light: "#72DCEB", glow: "#E8FFFF" },
  lava: { dark: "#6F2A22", body: "#B8492C", light: "#F06A27", glow: "#FFE47A" },
};

// Coordinates are centered on the water/reliquary axis at Hub scale 1.0.
// Collision code consumes the same values, so art and physical footprints
// cannot silently drift apart.
export const RITUAL_SPRING_GEOMETRY = {
  water: { x: -50, y: -14, width: 100, height: 26 },
  rimNorth: { x: -50, y: -22, width: 100, height: 8 },
  rimWest: { x: -60, y: -14, width: 10, height: 36 },
  rimEast: { x: 50, y: -14, width: 10, height: 36 },
  rimSouthLeft: { x: -50, y: 20, width: 42, height: 8 },
  rimSouthRight: { x: 8, y: 20, width: 42, height: 8 },
  corners: [
    { x: -50, y: -14, radius: 8 },
    { x: 50, y: -14, radius: 8 },
    { x: -50, y: 20, radius: 8 },
    { x: 50, y: 20, radius: 8 },
  ],
  lanterns: [
    { x: -72, y: -26, radius: 6 },
    { x: 72, y: -26, radius: 6 },
    { x: -76, y: 24, radius: 6 },
    { x: 76, y: 24, radius: 6 },
  ],
  stairTopY: 30,
  stairBottomY: 42,
} as const;

const MATERIAL = {
  shadow: "rgba(0,0,0,0.34)",
  stoneDark: "#303740",
  stone: "#555E67",
  stoneLight: "#89949C",
  gold: "#D8B45C",
  rune: "rgba(114,224,232,0.42)",
};

function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, width: number, height: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

function drawSteps(ctx: CanvasRenderingContext2D, centerX: number, y: number): void {
  for (let step = 0; step < 3; step++) {
    const width = 40 - step * 8;
    rect(ctx, MATERIAL.stoneDark, centerX - width / 2, y + step * 4, width, 5);
    rect(ctx, MATERIAL.stoneLight, centerX - width / 2 + 2, y + step * 4, width - 4, 2);
  }
}

function drawLantern(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, completed: boolean): void {
  const pulse = completed ? 0 : Math.floor(time * 5 + x) % 2;
  rect(ctx, MATERIAL.shadow, x - 7, y + 17, 14, 4);
  rect(ctx, MATERIAL.stoneDark, x - 5, y - 2, 10, 22);
  rect(ctx, MATERIAL.stone, x - 3, y, 6, 17);
  rect(ctx, MATERIAL.gold, x - 6, y - 8, 12, 7);
  rect(ctx, completed ? "#6C756F" : pulse === 0 ? "#B7FAF5" : "#72E0E8", x - 3, y - 12, 6, 7);
}

export function drawRitualSpringPart(
  ctx: CanvasRenderingContext2D,
  part: RitualSpringPart,
  options: RitualSpringRenderOptions,
): void {
  const scale = options.scale ?? 1;
  const completed = options.completed === true;
  const baseWater = RITUAL_SPRING_WATER[options.theme ?? "hub"];
  const water = completed
    ? { dark: "#263D42", body: "#365158", light: "#597078", glow: "#75868A" }
    : baseWater;

  ctx.save();
  ctx.translate(Math.round(options.x), Math.round(options.y));
  ctx.scale(scale, scale);

  if (part === "court") {
    rect(ctx, MATERIAL.shadow, -84, 36, 168, 11);
    rect(ctx, MATERIAL.stoneDark, -82, -36, 164, 76);
    rect(ctx, MATERIAL.stoneDark, -90, -22, 180, 48);
    rect(ctx, MATERIAL.stone, -78, -32, 156, 68);
    rect(ctx, MATERIAL.stone, -86, -18, 172, 40);
    rect(ctx, MATERIAL.stoneLight, -74, -29, 148, 3);
    rect(ctx, MATERIAL.stoneLight, -82, -15, 164, 3);
    for (let rune = -60; rune <= 60; rune += 20) {
      const runeColor = completed ? "rgba(100,110,108,0.25)" : MATERIAL.rune;
      rect(ctx, runeColor, rune - 2, 31, 5, 2);
      rect(ctx, runeColor, rune, 27, 1, 10);
    }
    drawSteps(ctx, 0, 30);
  } else if (part === "basin") {
    rect(ctx, MATERIAL.stoneDark, -60, -22, 120, 50);
    rect(ctx, MATERIAL.stoneDark, -68, -12, 136, 30);
    rect(ctx, "#6B7680", -56, -18, 112, 42);
    rect(ctx, "#6B7680", -63, -9, 126, 24);
    rect(ctx, water.dark, -50, -14, 100, 28);
    rect(ctx, water.dark, -56, -7, 112, 14);
    rect(ctx, water.body, -46, -11, 92, 4);
    rect(ctx, water.light, -52, -4, 104, 2);
    const shimmer = completed ? 0 : Math.floor(options.time * 10) % 24;
    rect(ctx, completed ? water.light : water.glow, -42 + shimmer, 0, 22, 2);
    rect(ctx, completed ? water.body : water.glow, 12 - Math.floor(shimmer / 2), 7, 28, 2);
  } else if (part === "crystal") {
    const pulse = completed ? 0 : Math.floor(options.time * 6) % 3;
    rect(ctx, MATERIAL.stoneDark, -25, -7, 50, 14);
    rect(ctx, MATERIAL.stoneDark, -18, -50, 36, 47);
    rect(ctx, MATERIAL.stone, -20, -4, 40, 8);
    rect(ctx, MATERIAL.stone, -13, -46, 26, 39);
    rect(ctx, MATERIAL.gold, -16, -17, 32, 3);
    rect(ctx, MATERIAL.gold, -2, -30, 4, 20);
    const crystal = completed ? "#58717A" : baseWater.light;
    const crystalLight = completed ? "#71868B" : baseWater.glow;
    rect(ctx, crystal, -9, -44, 18, 27);
    rect(ctx, crystal, -5, -55, 10, 44);
    rect(ctx, crystal, -13, -34, 26, 8);
    rect(ctx, crystalLight, -2, -51 - pulse, 4, 28 + pulse);
    rect(ctx, crystalLight, -7, -40, 5, 12);
  } else if (part === "front_rim") {
    rect(ctx, MATERIAL.stoneDark, -60, 14, 44, 14);
    rect(ctx, MATERIAL.stoneDark, 16, 14, 44, 14);
    rect(ctx, MATERIAL.stone, -56, 16, 40, 9);
    rect(ctx, MATERIAL.stone, 16, 16, 40, 9);
    rect(ctx, MATERIAL.stoneLight, -52, 17, 32, 2);
    rect(ctx, MATERIAL.stoneLight, 20, 17, 32, 2);
  } else if (part === "lantern_pylons") {
    for (const lantern of RITUAL_SPRING_GEOMETRY.lanterns) {
      drawLantern(ctx, lantern.x, lantern.y, options.time, completed);
    }
  } else if (!completed) {
    for (let index = 0; index < 7; index++) {
      const phase = Math.floor(options.time * 5 + index * 7) % 32;
      const moteX = -32 + ((index * 19 + phase * 2) % 64);
      const moteY = 4 - phase - (index % 3) * 5;
      rect(ctx, index % 2 === 0 ? baseWater.glow : baseWater.light, moteX, moteY, 2, 2);
    }
  }

  ctx.restore();
}

export function drawRitualSpring(ctx: CanvasRenderingContext2D, options: RitualSpringRenderOptions): void {
  drawRitualSpringPart(ctx, "court", options);
  drawRitualSpringPart(ctx, "basin", options);
  drawRitualSpringPart(ctx, "crystal", options);
  drawRitualSpringPart(ctx, "front_rim", options);
  drawRitualSpringPart(ctx, "lantern_pylons", options);
  drawRitualSpringPart(ctx, "soul_motes", options);
}
