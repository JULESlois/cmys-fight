import type { Room } from "../FloorGenerator";

const THEME_TINTS: Record<string, { light: string; dark: string; accent: string }> = {
  forest: { light: "rgba(135, 255, 190, 0.07)", dark: "rgba(18, 38, 26, 0.52)", accent: "#7DFFB2" },
  dungeon: { light: "rgba(164, 105, 255, 0.055)", dark: "rgba(10, 8, 24, 0.6)", accent: "#B388FF" },
  snow: { light: "rgba(184, 236, 255, 0.11)", dark: "rgba(24, 49, 72, 0.42)", accent: "#B8ECFF" },
  lava: { light: "rgba(255, 106, 46, 0.085)", dark: "rgba(38, 7, 8, 0.6)", accent: "#FF7B45" },
  // World-node grades: restrained, dark and austere. Alphas stay in the same
  // band as the four base grades (light ~0.05-0.11, dark ~0.42-0.6).
  overgrown_archive: { light: "rgba(104, 196, 128, 0.065)", dark: "rgba(10, 24, 15, 0.56)", accent: "#6FC98A" },
  sealed_library: { light: "rgba(148, 106, 216, 0.06)", dark: "rgba(15, 9, 27, 0.58)", accent: "#9E7BFF" },
  cooling_canal: { light: "rgba(138, 226, 233, 0.09)", dark: "rgba(9, 30, 38, 0.5)", accent: "#8CE6EB" },
  sealed_armory: { light: "rgba(128, 178, 138, 0.058)", dark: "rgba(13, 21, 15, 0.57)", accent: "#8FB89A" },
  observatory: { light: "rgba(108, 148, 250, 0.07)", dark: "rgba(6, 10, 31, 0.6)", accent: "#7FA6FF" },
  forge_core: { light: "rgba(255, 138, 58, 0.08)", dark: "rgba(33, 10, 6, 0.6)", accent: "#FF9A4D" },
  ash_catacombs: { light: "rgba(198, 192, 180, 0.055)", dark: "rgba(17, 16, 15, 0.6)", accent: "#C9C2B5" },
  deep_prison: { light: "rgba(214, 104, 74, 0.055)", dark: "rgba(23, 10, 8, 0.6)", accent: "#C96A4A" },
  deep_archive: { light: "rgba(186, 148, 255, 0.06)", dark: "rgba(15, 8, 27, 0.6)", accent: "#E5C878" },
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
    playerHpRatio?: number,
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

    if (playerHpRatio !== undefined && playerHpRatio < 0.34) {
      // Low-health warning: dark red edge vignette. Slow pulse only (no
      // high-frequency flashing); constant low alpha when reducedFlashing.
      const strength = reducedFlashing ? 0.16 : 0.13 + (Math.sin(time * 1.4) + 1) * 0.045;
      const danger = ctx.createRadialGradient(160, 118, 96, 160, 118, 208);
      danger.addColorStop(0, "rgba(120, 8, 8, 0)");
      danger.addColorStop(0.72, `rgba(120, 8, 8, ${(strength * 0.35).toFixed(3)})`);
      danger.addColorStop(1, `rgba(140, 10, 10, ${strength.toFixed(3)})`);
      ctx.fillStyle = danger;
      ctx.fillRect(0, 0, 320, 240);
    }

    ctx.restore();
  }
}
