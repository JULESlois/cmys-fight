import { uiFont, type Language } from "../i18n";

export const UI_COLORS = {
  backdrop: "#070B12",
  panel: "rgba(10, 16, 27, 0.75)",
  panelSoft: "rgba(16, 24, 38, 0.65)",
  panelRaised: "rgba(20, 31, 48, 0.85)",
  edge: "#34465A",
  edgeSoft: "#223041",
  cyan: "#39D9E8",
  cyanBright: "#A8F7FF",
  white: "#F4F8FC",
  text: "#C4D0DA",
  muted: "#788896",
  dark: "#111926",
  red: "#E85B65",
  yellow: "#F0C45B",
  green: "#58D68D",
  purple: "#C388F5",
  orange: "#F08A4B",
} as const;

export type UiTone = "cyan" | "yellow" | "red" | "green" | "purple" | "neutral";

export function toneColor(tone: UiTone): string {
  if (tone === "yellow") return UI_COLORS.yellow;
  if (tone === "red") return UI_COLORS.red;
  if (tone === "green") return UI_COLORS.green;
  if (tone === "purple") return UI_COLORS.purple;
  if (tone === "neutral") return UI_COLORS.edge;
  return UI_COLORS.cyan;
}

function pixelPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, cut = 3): void {
  ctx.beginPath();
  ctx.moveTo(x + cut, y);
  ctx.lineTo(x + w - cut, y);
  ctx.lineTo(x + w, y + cut);
  ctx.lineTo(x + w, y + h - cut);
  ctx.lineTo(x + w - cut, y + h);
  ctx.lineTo(x + cut, y + h);
  ctx.lineTo(x, y + h - cut);
  ctx.lineTo(x, y + cut);
  ctx.closePath();
}

export function drawPixelPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  tone: UiTone = "cyan",
  raised = false,
): void {
  const accent = toneColor(tone);
  ctx.save();
  pixelPath(ctx, x, y, w, h);
  ctx.fillStyle = raised ? UI_COLORS.panelRaised : UI_COLORS.panel;
  ctx.fill();
  ctx.strokeStyle = tone === "neutral" ? UI_COLORS.edgeSoft : accent;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = tone === "neutral" ? UI_COLORS.edge : accent;
  ctx.fillRect(x + 3, y + 2, Math.max(8, Math.min(28, w - 12)), 1);
  ctx.fillRect(x + w - 5, y + 3, 2, 2);
  ctx.fillRect(x + 3, y + h - 5, 2, 2);
  ctx.restore();
}

export function drawPixelButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  selected: boolean,
  tone: UiTone = "cyan",
): void {
  const accent = toneColor(tone);
  ctx.save();
  pixelPath(ctx, x, y, w, h, 2);
  ctx.fillStyle = selected ? "rgba(57, 217, 232, 0.16)" : UI_COLORS.panelSoft;
  ctx.fill();
  ctx.strokeStyle = selected ? UI_COLORS.white : tone === "neutral" ? UI_COLORS.edgeSoft : accent;
  ctx.stroke();
  if (selected) {
    // Only keeping the background and border highlight, removing left block and underline
  }
  ctx.restore();
}

export function drawSectionLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  language: Language,
  tone: UiTone = "cyan",
): void {
  const accent = toneColor(tone);
  ctx.save();
  ctx.fillStyle = accent;
  ctx.font = uiFont(language, 7, true);
  ctx.textAlign = "left";
  ctx.fillText(text, x, y);
  const textWidth = Math.ceil(ctx.measureText(text).width);
  ctx.fillStyle = UI_COLORS.edgeSoft;
  ctx.fillRect(x + textWidth + 5, y - 3, Math.max(0, width - textWidth - 5), 1);
  ctx.restore();
}

export function drawMeter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  ratio: number,
  color: string,
  segments = 0,
): void {
  const value = Math.max(0, Math.min(1, ratio));
  ctx.fillStyle = UI_COLORS.dark;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, Math.round((width - 2) * value), Math.max(1, height - 2));
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillRect(x + 1, y + 1, Math.round((width - 2) * value), 1);
  if (segments > 1) {
    ctx.fillStyle = UI_COLORS.dark;
    for (let index = 1; index < segments; index++) {
      const sx = x + Math.round(width * index / segments);
      ctx.fillRect(sx, y, 1, height);
    }
  }
}

export function drawBadge(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  language: Language,
  tone: UiTone = "cyan",
): void {
  const accent = toneColor(tone);
  ctx.save();
  ctx.fillStyle = accent;
  ctx.fillRect(x, y, width, 9);
  ctx.fillStyle = "#071018";
  ctx.font = uiFont(language, 6, true);
  ctx.textAlign = "center";
  ctx.fillText(text, x + width / 2, y + 7);
  ctx.restore();
}

export function drawUiIcon(
  ctx: CanvasRenderingContext2D,
  kind: "heart" | "shield" | "energy" | "skill" | "coin" | "warning" | "archive",
  x: number,
  y: number,
  color: string,
): void {
  ctx.fillStyle = color;
  if (kind === "heart") {
    ctx.fillRect(x + 1, y, 2, 2); ctx.fillRect(x + 5, y, 2, 2);
    ctx.fillRect(x, y + 2, 8, 3); ctx.fillRect(x + 1, y + 5, 6, 2); ctx.fillRect(x + 3, y + 7, 2, 1);
  } else if (kind === "shield") {
    ctx.fillRect(x + 1, y, 6, 2); ctx.fillRect(x, y + 2, 8, 3); ctx.fillRect(x + 1, y + 5, 6, 2); ctx.fillRect(x + 3, y + 7, 2, 1);
  } else if (kind === "energy") {
    ctx.fillRect(x + 3, y, 3, 3); ctx.fillRect(x + 1, y + 3, 5, 3); ctx.fillRect(x, y + 6, 3, 2); ctx.fillRect(x + 4, y + 5, 3, 3);
  } else if (kind === "skill") {
    ctx.fillRect(x + 3, y, 2, 8); ctx.fillRect(x, y + 3, 8, 2); ctx.fillRect(x + 1, y + 1, 2, 2); ctx.fillRect(x + 5, y + 5, 2, 2);
  } else if (kind === "coin") {
    ctx.fillRect(x + 2, y, 4, 1); ctx.fillRect(x, y + 2, 8, 4); ctx.fillRect(x + 2, y + 6, 4, 1); ctx.fillRect(x + 3, y + 2, 2, 4);
  } else if (kind === "warning") {
    ctx.fillRect(x + 3, y, 2, 2); ctx.fillRect(x + 2, y + 2, 4, 3); ctx.fillRect(x + 1, y + 5, 6, 2); ctx.fillRect(x + 3, y + 3, 2, 2);
  } else {
    ctx.fillRect(x, y + 1, 8, 6); ctx.fillRect(x + 2, y, 4, 1); ctx.fillStyle = UI_COLORS.dark; ctx.fillRect(x + 2, y + 3, 4, 1);
  }
}
