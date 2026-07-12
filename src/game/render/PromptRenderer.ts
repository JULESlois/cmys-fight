import { t, uiFont, type Language } from "../i18n";

export class PromptRenderer {
  static draw(ctx: CanvasRenderingContext2D, target: any, time: number, interactPrompt = "SPACE", language: Language = "en") {
    if (!target) return;

    ctx.save();
    const floatY = Math.sin(time * 3) * 2;
    const yBase = target.y - 20 + floatY;

    let action = "";
    if (target.type === "portal") action = t(language, "prompt.descend");
    else if (target.type === "legacy_rpg") action = t(language, "prompt.memory");
    else if (target.type === "legacy_tactics") action = t(language, "prompt.tactics");
    else if (target.type === "treasure") action = t(language, "prompt.open");
    else if (target.type === "shop") action = t(language, "prompt.shop");
    else if (target.type === "broadcast") action = t(language, "prompt.tuneIn");
    else if (target.type === "wish_fountain") action = t(language, "prompt.makeWish");
    else if (target.type === "photo_booth") action = t(language, "prompt.takePhoto");
    const msg = action ? `[${interactPrompt}] ${action}` : "";

    if (msg) {
      ctx.font = uiFont(language, 8);
      const textWidth = ctx.measureText(msg).width;
      const padX = 4;
      const padY = 4;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(target.x - textWidth / 2 - padX, yBase - 8 - padY, textWidth + padX * 2, 10 + padY * 2);
      ctx.beginPath();
      ctx.moveTo(target.x - 3, yBase + 2);
      ctx.lineTo(target.x + 3, yBase + 2);
      ctx.lineTo(target.x, yBase + 5);
      ctx.fill();
      ctx.fillStyle = "#FFF";
      ctx.textAlign = "center";
      ctx.fillText(msg, target.x, yBase);
    }
    ctx.restore();
  }
}
