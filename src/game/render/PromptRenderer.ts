import { t, uiFont, type Language } from "../i18n";
import { drawPixelPanel, UI_COLORS, toneColor, drawSectionLabel } from "./PixelUi";
import type { ExitDestination } from "../FloorGenerator";

export class PromptRenderer {
  static draw(ctx: CanvasRenderingContext2D, target: any, time: number, interactPrompt = "K", language: Language = "en") {
    if (!target) return;
    let action = "";
    if (target.type === "portal") action = t(language, "prompt.descend");
    else if (target.type === "legacy_rpg") action = t(language, "prompt.memory");
    else if (target.type === "legacy_tactics") action = t(language, "prompt.tactics");
    else if (target.type === "treasure") action = t(language, "prompt.open");
    
    else if (target.type === "broadcast") action = t(language, "prompt.tuneIn");
    else if (target.type === "wish_fountain") action = t(language, "prompt.makeWish");
    else if (target.type === "photo_booth") action = t(language, "prompt.takePhoto");
    if (!action) return;
    this.drawAt(ctx, target.x, target.y - 24, action, interactPrompt, language, time);
  }

  static drawAt(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    action: string,
    interactPrompt = "K",
    language: Language = "en",
    time = 0,
  ): void {
    if (!action) return;
    ctx.save();
    const floatY = Math.round(Math.sin(time * 3));
    const yBase = Math.round(screenY + floatY);
    ctx.font = uiFont(language, 7, true);
    const actionWidth = Math.ceil(ctx.measureText(action).width);
    ctx.font = uiFont(language, 6, true);
    const keyWidth = Math.max(15, Math.ceil(ctx.measureText(interactPrompt).width) + 8);
    const width = Math.min(312, Math.max(58, actionWidth + keyWidth + 15));
    const x = Math.round(Math.max(4, Math.min(316 - width, screenX - width / 2)));
    const pointerX = Math.max(x + 8, Math.min(x + width - 8, screenX));
    drawPixelPanel(ctx, x, yBase - 11, width, 18, "cyan", true);
    ctx.fillStyle = UI_COLORS.cyan;
    ctx.fillRect(x + 4, yBase - 7, keyWidth, 10);
    ctx.fillStyle = "#071018";
    ctx.font = uiFont(language, 6, true);
    ctx.textAlign = "center";
    ctx.fillText(interactPrompt, x + 4 + keyWidth / 2, yBase + 1);
    ctx.fillStyle = UI_COLORS.white;
    ctx.font = uiFont(language, 7, true);
    ctx.textAlign = "left";
    ctx.fillText(action, x + keyWidth + 9, yBase + 1);
    ctx.fillStyle = UI_COLORS.cyan;
    ctx.beginPath();
    ctx.moveTo(pointerX - 3, yBase + 8);
    ctx.lineTo(pointerX + 3, yBase + 8);
    ctx.lineTo(pointerX, yBase + 11);
    ctx.fill();
    ctx.restore();
  }

  static drawRoutePreview(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    destination: ExitDestination,
    language: Language,
    time: number,
  ): void {
    ctx.save();
    const floatY = Math.round(Math.sin(time * 3));
    const yBase = Math.round(screenY + floatY) - 58;
    const width = 110;
    const height = 50;
    const x = Math.round(Math.max(4, Math.min(316 - width, screenX - width / 2)));
    const pointerX = Math.max(x + 12, Math.min(x + width - 12, screenX));
    
    // Choose tone based on destination kind
    let tone: "cyan" | "red" | "purple" | "yellow" = "cyan";
    if (destination.kind === "performance") tone = "red";
    else if (destination.kind === "hidden") tone = "purple";
    else if (destination.kind === "challenge") tone = "yellow";

    drawPixelPanel(ctx, x, yBase, width, height, tone, true);

    const accent = toneColor(tone);
    
    // Node Name
    ctx.fillStyle = UI_COLORS.white;
    ctx.font = uiFont(language, 8, true);
    ctx.textAlign = "left";
    // We assume i18n has `node.${worldNodeId}.name`, fallback to id
    const title = t(language, `node.${destination.worldNodeId}.name` as any) || destination.worldNodeId;
    ctx.fillText(title, x + 6, yBase + 12);
    
    // Threat level (Stars/Skulls)
    ctx.fillStyle = UI_COLORS.red;
    ctx.font = uiFont(language, 6, true);
    let threatStars = "";
    for(let i = 0; i < (destination.preview.threat || 3); i++) threatStars += "★";
    ctx.fillText("Threat: " + threatStars, x + 6, yBase + 24);

    // Tags
    ctx.fillStyle = UI_COLORS.text;
    ctx.font = uiFont(language, 6, true);
    const tags = [...destination.preview.enemyTags, ...destination.preview.hazardTags, ...destination.preview.rewardTags];
    if (tags.length > 0) {
       ctx.fillText("Tags: " + tags.join(", "), x + 6, yBase + 36);
    } else {
       ctx.fillText("Tags: Unknown", x + 6, yBase + 36);
    }

    // Pointer down to portal
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(pointerX - 4, yBase + height - 3);
    ctx.lineTo(pointerX + 4, yBase + height - 3);
    ctx.lineTo(pointerX, yBase + height + 3);
    ctx.fill();

    ctx.restore();
  }
}
