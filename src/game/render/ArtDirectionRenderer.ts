import type { Room } from "../FloorGenerator";
import { getDitheredRampCanvas, rampAlpha, type DitheredStop } from "./DitherRamp";

const THEME_TINTS: Record<string, { light: string; dark: string; accent: string }> = {
  forest: { light: "rgba(135, 255, 190, 0.07)", dark: "rgba(18, 38, 26, 0.52)", accent: "#7DFFB2" },
  dungeon: { light: "rgba(164, 105, 255, 0.055)", dark: "rgba(10, 8, 24, 0.6)", accent: "#B388FF" },
  snow: { light: "rgba(184, 236, 255, 0.11)", dark: "rgba(24, 49, 72, 0.42)", accent: "#B8ECFF" },
  lava: { light: "rgba(255, 106, 46, 0.085)", dark: "rgba(38, 7, 8, 0.6)", accent: "#FF7B45" },
  // Deep routes reuse their base theme's tile art but get their own grade tint.
  overgrown_archive: { light: "rgba(135, 255, 190, 0.05)", dark: "rgba(12, 30, 22, 0.6)", accent: "#6FE8A8" },
  sealed_library: { light: "rgba(160, 108, 213, 0.06)", dark: "rgba(9, 12, 22, 0.62)", accent: "#B388FF" },
  sealed_armory: { light: "rgba(93, 203, 255, 0.05)", dark: "rgba(8, 11, 18, 0.6)", accent: "#6FA8DC" },
  ash_catacombs: { light: "rgba(201, 184, 217, 0.06)", dark: "rgba(12, 9, 16, 0.62)", accent: "#C9B8D9" },
  deep_prison: { light: "rgba(127, 168, 201, 0.05)", dark: "rgba(8, 12, 20, 0.64)", accent: "#7FA8C9" },
  deep_archive: { light: "rgba(165, 131, 232, 0.07)", dark: "rgba(7, 8, 16, 0.66)", accent: "#A583E8" },
  cooling_canal: { light: "rgba(127, 219, 255, 0.1)", dark: "rgba(18, 38, 54, 0.46)", accent: "#7FDBFF" },
  observatory: { light: "rgba(143, 180, 255, 0.09)", dark: "rgba(12, 16, 32, 0.56)", accent: "#8FB4FF" },
  forge_core: { light: "rgba(255, 194, 71, 0.09)", dark: "rgba(28, 6, 5, 0.64)", accent: "#FFC247" },
};

/** "#rrggbb" from an "rgba(...)" literal; falls back to the given default. */
function rgbOf(rgba: string, fallback: string): string {
  const match = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(rgba);
  if (!match) return fallback;
  const toHex = (value: number) => value.toString(16).padStart(2, "0");
  return `#${toHex(Number(match[1]))}${toHex(Number(match[2]))}${toHex(Number(match[3]))}`;
}

function alphaOf(rgba: string): number {
  const match = /rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/.exec(rgba);
  return match ? Math.max(0, Math.min(1, Number(match[1]))) : 1;
}

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
      // Dithered ambient: a light wash fading in from the top-left, a dark
      // falloff from the bottom-right. Split into two single-color passes so
      // each is a pure density ramp.
      const lightStops: DitheredStop[] = [
        { at: 0, alpha: alphaOf(palette.light) },
        { at: 0.45, alpha: 0 },
      ];
      const darkStops: DitheredStop[] = [
        { at: 0.6, alpha: 0 },
        { at: 1, alpha: alphaOf(palette.dark) },
      ];
      const lightCanvas = getDitheredRampCanvas({
        key: `grade-light:${theme}`,
        color: rgbOf(palette.light, "#7DFFB2"),
        alphaAt: (x, y) => rampAlpha(lightStops, (x + y) / (320 + 240)),
      });
      const darkCanvas = getDitheredRampCanvas({
        key: `grade-dark:${theme}`,
        color: rgbOf(palette.dark, "#10141f"),
        alphaAt: (x, y) => rampAlpha(darkStops, (x + y) / (320 + 240)),
      });
      if (lightCanvas) ctx.drawImage(lightCanvas, 0, 0);
      if (darkCanvas) ctx.drawImage(darkCanvas, 0, 0);

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

    // Dithered vignette: dark edge falloff, stronger in combat.
    const vignetteCanvas = getDitheredRampCanvas({
      key: `grade-vignette:${combat}`,
      color: "#000000",
      alphaAt: (x, y) => {
        const dx = x - 160;
        const dy = y - 118;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const peak = combat ? 0.5 : 0.38;
        const eased = Math.max(0, Math.min(1, (distance - 72) / (212 - 72)));
        return eased * eased * peak;
      },
    });
    if (vignetteCanvas) ctx.drawImage(vignetteCanvas, 0, 0);

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
