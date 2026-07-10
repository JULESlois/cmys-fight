export class PromptRenderer {
  static draw(ctx: CanvasRenderingContext2D, target: any, time: number) {
    if (!target) return;
    
    ctx.save();
    const floatY = Math.sin(time * 3) * 2;
    const yBase = target.y - 20 + floatY;
    
    let msg = "";
    if (target.type === "portal") {
       msg = "[SPACE] DESCEND";
    } else if (target.type === "legacy_rpg") {
       msg = "[SPACE] MEMORY";
    } else if (target.type === "legacy_tactics") {
       msg = "[SPACE] TACTICS";
    } else if (target.type === "treasure") {
       msg = "[SPACE] OPEN";
    } else if (target.type === "shop") {
       msg = "[SPACE] SHOP";
    }
    
    if (msg) {
        ctx.font = "8px monospace";
        const textWidth = ctx.measureText(msg).width;
        const padX = 4;
        const padY = 4;
        
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(target.x - textWidth/2 - padX, yBase - 8 - padY, textWidth + padX*2, 10 + padY*2);
        
        // draw arrow pointing down
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
