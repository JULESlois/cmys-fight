import type { Room } from "../FloorGenerator";

const THEME_TINTS: Record<string, { light: string; dark: string; accent: string }> = {
  forest: { light: "rgba(135, 255, 190, 0.07)", dark: "rgba(18, 38, 26, 0.52)", accent: "#7DFFB2" },
  dungeon: { light: "rgba(164, 105, 255, 0.055)", dark: "rgba(10, 8, 24, 0.6)", accent: "#B388FF" },
  snow: { light: "rgba(184, 236, 255, 0.11)", dark: "rgba(24, 49, 72, 0.42)", accent: "#B8ECFF" },
  lava: { light: "rgba(255, 106, 46, 0.085)", dark: "rgba(38, 7, 8, 0.6)", accent: "#FF7B45" },
};

export class ArtDirectionRenderer {
  static drawWorldGrade(
    ctx: CanvasRenderingContext2D,
    theme: string,
    room: Room | undefined,
    time: number,
    combat: boolean,
    lowFx: boolean,
    reducedFlashing: boolean,
  ) {
    const palette = THEME_TINTS[theme] ?? THEME_TINTS.forest;
    ctx.save();

    if (!lowFx) {
      const ambient = ctx.createLinearGradient(0, 0, 320, 240);
      ambient.addColorStop(0, palette.light);
      ambient.addColorStop(0.52, "rgba(255,255,255,0)");
      ambient.addColorStop(1, palette.dark);
      ctx.fillStyle = ambient;
      ctx.fillRect(0, 0, 320, 240);

      ctx.globalAlpha = 0.11;
      ctx.fillStyle = palette.accent;
      const drift = Math.floor(time * 8) % 16;
      for (let y = 8; y < 232; y += 16) {
        for (let x = ((y / 16) % 2) * 8 - drift; x < 320; x += 32) {
          ctx.fillRect(x, y, 1, 1);
        }
      }
      ctx.globalAlpha = 1;
    }

    const vignette = ctx.createRadialGradient(160, 118, 78, 160, 118, 212);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(0.68, combat ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.03)");
    vignette.addColorStop(1, combat ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.38)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, 320, 240);

    if (room?.type === "boss") {
      const pulse = reducedFlashing ? 0.14 : 0.13 + Math.sin(time * 2.8) * 0.07;
      ctx.strokeStyle = `rgba(255, 74, 74, ${Math.max(0.08, pulse)})`;
      ctx.lineWidth = 4;
      ctx.strokeRect(3, 3, 314, 234);
      ctx.strokeStyle = `rgba(255, 181, 71, ${Math.max(0.05, pulse * 0.55)})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(8, 8, 304, 224);
    }


    ctx.restore();
  }
}
