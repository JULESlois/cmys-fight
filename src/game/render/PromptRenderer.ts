import { Player } from "../entities/Player";

export class PromptRenderer {
  static draw(ctx: CanvasRenderingContext2D, target: any, time: number) {
    if (!target) return;
    
    ctx.save();
    const floatY = Math.sin(time * 3) * 2;
    ctx.fillStyle = "#FFF";
    ctx.font = "8px monospace";
    ctx.textAlign = "center";
    
    let msg = "";
    if (target.type === "portal") {
       msg = "Press SPACE to descend";
    } else if (target.type === "legacy_rpg") {
       msg = "Press SPACE to enter old memory";
    } else if (target.type === "legacy_tactics") {
       msg = "Press SPACE to boot tactical simulation";
    }
    
    if (msg) {
        ctx.fillText(msg, target.x, target.y - 25 + floatY);
    }
    
    ctx.restore();
  }
}
