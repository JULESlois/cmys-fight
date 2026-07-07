import { PALETTES } from "../data/palettes";

export class PortalRenderer {
  static drawPortal(ctx: CanvasRenderingContext2D, portal: {x: number, y: number}, time: number, theme: string) {
    const pColor = PALETTES[theme] ? PALETTES[theme].portal : "#00FFFF";
    
    ctx.save();
    ctx.translate(portal.x, portal.y);

    // Outer rotating ring
    ctx.rotate(time);
    ctx.strokeStyle = pColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.rotate(-time);

    // Inner rotating ring (opposite direction)
    ctx.rotate(-time * 1.5);
    ctx.strokeStyle = `rgba(255, 255, 255, 0.5)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 10 + Math.sin(time * 5) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.rotate(time * 1.5);

    // Center light
    ctx.fillStyle = "#FFF";
    ctx.globalAlpha = 0.5 + Math.sin(time * 10) * 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    ctx.restore();
  }

  static drawInteractText(ctx: CanvasRenderingContext2D, portal: {x: number, y: number}, time: number) {
    ctx.save();
    ctx.translate(portal.x, portal.y);
    const floatY = Math.sin(time * 3) * 2;
    ctx.fillStyle = "#FFF";
    ctx.font = "8px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Press SPACE to descend", 0, -25 + floatY);
    ctx.restore();
  }
}
