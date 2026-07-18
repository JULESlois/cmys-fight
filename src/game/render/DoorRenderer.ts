import type { DoorGeometry } from "../dungeon/DoorGeometry";

export type DoorTheme = "forest" | "dungeon" | "snow" | "lava" | string;

interface DoorPalette {
  void: string;
  frameDark: string;
  frame: string;
  frameLight: string;
  lock: string;
  lockLight: string;
}

const PALETTES: Record<string, DoorPalette> = {
  forest: {
    void: "rgba(28,55,38,0.34)", frameDark: "#302219", frame: "#65482F", frameLight: "#7FA45A", lock: "#29472F", lockLight: "#E783A5",
  },
  dungeon: {
    void: "rgba(10,15,24,0.58)", frameDark: "#111925", frame: "#3B485C", frameLight: "#718095", lock: "#151C25", lockLight: "#9E59C8",
  },
  snow: {
    void: "rgba(31,73,91,0.45)", frameDark: "#294A5B", frame: "#6F929E", frameLight: "#D9E8EB", lock: "#284E5E", lockLight: "#55BBC9",
  },
  lava: {
    void: "rgba(42,29,35,0.5)", frameDark: "#171219", frame: "#493943", frameLight: "#8B8583", lock: "#5A211C", lockLight: "#E34F1E",
  },
};

function fill(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, width: number, height: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

export class DoorRenderer {
  public static draw(
    ctx: CanvasRenderingContext2D,
    geometry: DoorGeometry,
    theme: DoorTheme,
    locked: boolean,
  ): void {
    const palette = PALETTES[theme] ?? PALETTES.dungeon;
    const { aperture, frameBounds, orientation } = geometry;
    const horizontal = orientation === "up" || orientation === "down";

    ctx.save();
    fill(ctx, palette.void, aperture.x, aperture.y, aperture.width, aperture.height);

    if (horizontal) {
      const leftJamb = Math.max(4, aperture.x - frameBounds.x);
      const rightJamb = Math.max(4, frameBounds.x + frameBounds.width - aperture.x - aperture.width);
      fill(ctx, palette.frameDark, frameBounds.x, frameBounds.y, leftJamb, frameBounds.height);
      fill(ctx, palette.frameDark, aperture.x + aperture.width, frameBounds.y, rightJamb, frameBounds.height);
      fill(ctx, palette.frame, frameBounds.x + 2, frameBounds.y + 2, Math.max(2, leftJamb - 3), frameBounds.height - 4);
      fill(ctx, palette.frame, aperture.x + aperture.width + 1, frameBounds.y + 2, Math.max(2, rightJamb - 3), frameBounds.height - 4);
      fill(ctx, palette.frameLight, aperture.x, orientation === "up" ? aperture.y + aperture.height - 3 : aperture.y, aperture.width, 3);
    } else {
      const topJamb = Math.max(4, aperture.y - frameBounds.y);
      const bottomJamb = Math.max(4, frameBounds.y + frameBounds.height - aperture.y - aperture.height);
      fill(ctx, palette.frameDark, frameBounds.x, frameBounds.y, frameBounds.width, topJamb);
      fill(ctx, palette.frameDark, frameBounds.x, aperture.y + aperture.height, frameBounds.width, bottomJamb);
      fill(ctx, palette.frame, frameBounds.x + 2, frameBounds.y + 2, frameBounds.width - 4, Math.max(2, topJamb - 3));
      fill(ctx, palette.frame, frameBounds.x + 2, aperture.y + aperture.height + 1, frameBounds.width - 4, Math.max(2, bottomJamb - 3));
      fill(ctx, palette.frameLight, orientation === "left" ? aperture.x + aperture.width - 3 : aperture.x, aperture.y, 3, aperture.height);
    }

    if (locked) {
      fill(ctx, palette.lock, aperture.x + 3, aperture.y + 3, aperture.width - 6, aperture.height - 6);
      if (horizontal) {
        for (let x = aperture.x + 7; x < aperture.x + aperture.width - 4; x += 8) {
          fill(ctx, palette.frameLight, x, aperture.y + 4, 2, aperture.height - 8);
        }
      } else {
        for (let y = aperture.y + 7; y < aperture.y + aperture.height - 4; y += 8) {
          fill(ctx, palette.frameLight, aperture.x + 4, y, aperture.width - 8, 2);
        }
      }
      const centerX = aperture.x + aperture.width / 2;
      const centerY = aperture.y + aperture.height / 2;
      fill(ctx, palette.lockLight, centerX - 3, centerY - 3, 7, 7);
      fill(ctx, "#FFFFFF", centerX, centerY - 1, 1, 3);
    }
    ctx.restore();
  }
}

