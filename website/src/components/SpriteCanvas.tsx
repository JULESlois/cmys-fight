import { useEffect, useRef } from "react";
import { SPRITE_GRIDS, drawGrid, gridSize, makeColors, lighten } from "../pixel/sprites";

interface Props {
  sprite: string;
  body: string;
  hair: string;
  accent: string;
  /** 悬停时卡通挤压弹跳 */
  hovered?: boolean;
  size?: number;
}

/** 角色像素立绘:待机浮动 + 眨眼 + 悬停 Q 弹 */
export default function SpriteCanvas({ sprite, body, hair, accent, hovered, size = 132 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverRef = useRef(false);
  hoverRef.current = !!hovered;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const S = 96; // 内部低分辨率
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const grid = SPRITE_GRIDS[sprite] ?? SPRITE_GRIDS.hood;
    const colors = makeColors(body, hair, accent);
    const { w, h } = gridSize(grid);
    const scale = 5;

    let raf = 0;
    let running = true;
    let t = Math.random() * 10;
    let springScale = 1;
    let springVel = 0;

    function frame(now: number) {
      if (!running || !ctx) return;
      t += 1 / 60;

      // 弹簧模拟:悬停时目标 1.12,松开回到 1 —— Q 弹效果
      const target = hoverRef.current ? 1.12 : 1;
      const springK = 170;
      const damping = 11;
      const accel = (target - springScale) * springK - springVel * damping;
      springVel += accel / 60;
      springScale += springVel / 60;

      ctx.clearRect(0, 0, S, S);

      // 底座光环
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.ellipse(S / 2, S - 8, 26 * springScale, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      const bob = Math.sin(t * 2.6) * 2.5;
      const blink = Math.sin(t * 1.9 + 1) > 0.965;
      const px = (S - w * scale) / 2;
      const py = S - h * scale - 10 + bob;

      ctx.save();
      // 挤压拉伸围绕脚底进行
      ctx.translate(S / 2, S - 10);
      ctx.scale(2 - springScale, springScale);
      ctx.translate(-S / 2, -(S - 10));
      drawGrid(ctx, grid, colors, px, py, scale, { blink });
      ctx.restore();

      // 悬停时头顶冒星星
      if (hoverRef.current) {
        const sparkT = (t * 3) % 1;
        ctx.globalAlpha = 1 - sparkT;
        ctx.fillStyle = lighten(accent, 0.3);
        const sx = S / 2 + Math.sin(t * 7) * 18;
        const sy = 16 - sparkT * 10;
        ctx.fillRect(sx, sy, 3, 3);
        ctx.fillRect(sx - 3, sy + 3, 3, 3);
        ctx.fillRect(sx + 3, sy + 3, 3, 3);
        ctx.globalAlpha = 1;
      }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [sprite, body, hair, accent]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, imageRendering: "pixelated" }}
      aria-hidden
    />
  );
}
