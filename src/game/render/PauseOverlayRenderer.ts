export class PauseOverlayRenderer {
  static draw(ctx: CanvasRenderingContext2D) {
    // Dim background
    ctx.fillStyle = "rgba(10, 15, 25, 0.85)";
    ctx.fillRect(0, 0, 320, 240);
    
    // Title
    ctx.fillStyle = "#FFF";
    ctx.font = "bold 20px monospace";
    ctx.textAlign = "center";
    ctx.fillText("PAUSE", 160, 80);
    
    // Controls Box
    ctx.strokeStyle = "rgba(0, 242, 254, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(60, 100, 200, 100);
    ctx.fillStyle = "rgba(0, 242, 254, 0.05)";
    ctx.fillRect(60, 100, 200, 100);
    
    // Control lines
    ctx.font = "8px monospace";
    ctx.fillStyle = "#00F2FE";
    ctx.fillText("SYSTEM CONTROLS", 160, 115);
    
    ctx.fillStyle = "#BDC3C7";
    ctx.textAlign = "left";
    ctx.fillText("WASD / ARROW KEYS : Move", 75, 135);
    ctx.fillText("SPACE             : Shoot / Interact", 75, 150);
    ctx.fillText("ENTER             : System Menu", 75, 165);
    ctx.fillText("P                 : Resume", 75, 180);
    
    ctx.textAlign = "left";
  }
}
