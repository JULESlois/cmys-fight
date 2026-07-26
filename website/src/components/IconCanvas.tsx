import { useEffect, useRef } from "react";
import { ICON_GRIDS, drawGrid, makeColors, darken, lighten } from "../pixel/sprites";

/** 特色板块的像素小图标:轻微摇摆 + 闪光 */
export default function IconCanvas({ icon, color }: { icon: string; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const S = 64;
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const grid = ICON_GRIDS[icon] ?? ICON_GRIDS.sword;
    const colors = makeColors(color, color, lighten(color, 0.35));
    colors.outline = darken(color, 0.35);
    colors.weapon = "#DDE5EC";

    let raf = 0;
    let running = true;
    let t = Math.random() * 6;

    function frame() {
      if (!running || !ctx) return;
      t += 1 / 60;
      ctx.clearRect(0, 0, S, S);

      const wob = Math.sin(t * 2.2) * 0.08;
      ctx.save();
      ctx.translate(S / 2, S / 2);
      ctx.rotate(wob);
      ctx.translate(-S / 2, -S / 2 + Math.sin(t * 3) * 1.5);
      drawGrid(ctx, grid, colors, 7, 8, 5);
      ctx.restore();

      // 划过的闪光点
      const sp = (t * 0.6) % 1.6;
      if (sp < 1) {
        ctx.globalAlpha = Math.sin(sp * Math.PI);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(10 + sp * 40, 10, 3, 3);
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [icon, color]);

  return <canvas ref={canvasRef} style={{ width: 64, height: 64, imageRendering: "pixelated" }} aria-hidden />;
}
