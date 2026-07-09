import { PALETTES } from "../data/palettes";

export type PortalState = "spawning" | "idle" | "hovered" | "activating";

export class PortalRenderer {
  static drawPortal(ctx: CanvasRenderingContext2D, portal: {x: number, y: number, state: PortalState, timer: number}, time: number, theme: string) {
    const pColor = PALETTES[theme] ? PALETTES[theme].portal : "#00FFFF";
    
    ctx.save();
    ctx.translate(portal.x, portal.y);
    
    let scale = 1.0;
    let alpha = 1.0;
    
    if (portal.state === "spawning") {
       // Spawning animation (0 to 0.6s)
       const progress = Math.min(1.0, (0.6 - portal.timer) / 0.6);
       scale = progress;
       alpha = progress;
    } else if (portal.state === "activating") {
       // Activating animation (0 to 0.4s)
       const progress = Math.min(1.0, (0.4 - portal.timer) / 0.4);
       scale = 1.0 + progress * 2.0; // expand
       alpha = 1.0 - progress; // fade out
    }
    
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;

    // Outer rotating ring
    ctx.rotate(time);
    ctx.strokeStyle = pColor;
    ctx.lineWidth = portal.state === "hovered" ? 3 : 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.rotate(-time);

    // Inner rotating ring (opposite direction)
    ctx.rotate(-time * 1.5);
    ctx.strokeStyle = `rgba(255, 255, 255, ${portal.state === "hovered" ? 0.8 : 0.5})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 10 + Math.sin(time * 5) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.rotate(time * 1.5);

    // Center light
    ctx.fillStyle = "#FFF";
    ctx.globalAlpha = alpha * (0.5 + Math.sin(time * 10) * 0.5 + (portal.state === "hovered" ? 0.5 : 0));
    ctx.beginPath();
    ctx.arc(0, 0, 4 + (portal.state === "hovered" ? 2 : 0), 0, Math.PI * 2);
    ctx.fill();
    
    // Hover particles
    if (portal.state === "hovered" || portal.state === "activating") {
        ctx.fillStyle = "#FFF";
        for (let i = 0; i < 4; i++) {
            const angle = time * 2 + i * Math.PI / 2;
            const dist = 12 - (time * 20 % 12);
            ctx.beginPath();
            ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.restore();
  }
}
