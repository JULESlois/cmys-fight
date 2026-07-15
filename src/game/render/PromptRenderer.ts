import { t, uiFont, type Language } from "../i18n";
import { drawPixelPanel, UI_COLORS } from "./PixelUi";

export class PromptRenderer {
  static draw(ctx: CanvasRenderingContext2D, target: any, time: number, interactPrompt = "K", language: Language = "en") {
    if (!target) return;

    let action = "";
    if (target.type === "portal") action = t(language, "prompt.descend");
    else if (target.type === "legacy_rpg") action = t(language, "prompt.memory");
    else if (target.type === "legacy_tactics") action = t(language, "prompt.tactics");
    else if (target.type === "treasure") action = t(language, "prompt.open");
    else if (target.type === "shop") action = t(language, "prompt.shop");
    else if (target.type === "broadcast") action = t(language, "prompt.tuneIn");
    else if (target.type === "wish_fountain") action = t(language, "prompt.makeWish");
    else if (target.type === "photo_booth") action = t(language, "prompt.takePhoto");
    if (!action) return;

    ctx.save();
    const floatY = Math.round(Math.sin(time * 3));
    const yBase = Math.round(target.y - 24 + floatY);
    ctx.font = uiFont(language, 7, true);
    const actionWidth = Math.ceil(ctx.measureText(action).width);
    ctx.font = uiFont(language, 6, true);
    const keyWidth = Math.max(15, Math.ceil(ctx.measureText(interactPrompt).width) + 8);
    const width = Math.max(58, actionWidth + keyWidth + 15);
    const x = Math.round(target.x - width / 2);
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
    ctx.moveTo(target.x - 3, yBase + 8);
    ctx.lineTo(target.x + 3, yBase + 8);
    ctx.lineTo(target.x, yBase + 11);
    ctx.fill();
    ctx.restore();
  }
}
