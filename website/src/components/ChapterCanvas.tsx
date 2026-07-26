import { useEffect, useRef } from "react";
import type { ChapterInfo } from "../content";
import { SLIME_GRID, drawGrid, makeColors } from "../pixel/sprites";

/** 章节卡片:用章节调色板绘制一个会动的小房间(含主题装饰与天气) */
export default function ChapterCanvas({ chapter }: { chapter: ChapterInfo }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = 200;
    const H = 112;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const p = chapter.palette;
    const id = chapter.id;
    let raf = 0;
    let running = true;
    let t = Math.random() * 5;

    // 天气粒子
    const flakes = Array.from({ length: 14 }, (_, i) => ({
      x: (i * 47 + 13) % W,
      y: (i * 31 + 7) % H,
      seed: i * 0.77,
    }));

    function drawTorch(x: number, y: number, tt: number) {
      if (!ctx) return;
      ctx.fillStyle = "#59452E";
      ctx.fillRect(x - 1, y, 3, 9);
      const f = Math.floor(tt * 9) % 2;
      ctx.fillStyle = f ? "#FFB12B" : "#FF7A2B";
      ctx.fillRect(x - 2, y - 6, 5, 6);
      ctx.fillStyle = "#FFE9A8";
      ctx.fillRect(x - 1, y - 4 + f, 3, 3);
      const glow = 0.14 + Math.sin(tt * 7 + x) * 0.05;
      ctx.globalAlpha = glow;
      ctx.fillStyle = "#FFB12B";
      ctx.beginPath();
      ctx.ellipse(x + 0.5, y - 3, 16, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    function drawChest(x: number, y: number, tt: number) {
      if (!ctx) return;
      ctx.fillStyle = "#5C3A1E";
      ctx.fillRect(x, y, 14, 9);
      ctx.fillStyle = "#7A4E28";
      ctx.fillRect(x, y, 14, 4);
      ctx.fillStyle = "#FFD166";
      ctx.fillRect(x + 6, y + 3, 2, 3);
      ctx.fillRect(x, y + 4, 14, 1);
      // 闪光
      const sp = (tt * 0.8) % 2;
      if (sp < 0.35) {
        ctx.globalAlpha = Math.sin((sp / 0.35) * Math.PI);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(x + 11, y - 2, 2, 2);
        ctx.globalAlpha = 1;
      }
    }

    function drawPine(x: number, s: number, gy: number) {
      if (!ctx) return;
      ctx.fillStyle = "#4A2F1B";
      ctx.fillRect(x - 2, gy - 6 * s, 4, 6 * s);
      ctx.fillStyle = "#1E4A2E";
      ctx.fillRect(x - 9 * s, gy - 12 * s, 18 * s, 6 * s);
      ctx.fillStyle = "#2C6B40";
      ctx.fillRect(x - 6 * s, gy - 17 * s, 12 * s, 5 * s);
      ctx.fillStyle = "#3B8A52";
      ctx.fillRect(x - 3 * s, gy - 21 * s, 6 * s, 4 * s);
    }

    function frame() {
      if (!running || !ctx) return;
      t += 1 / 60;

      // 背景与墙
      ctx.fillStyle = p.bg;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = p.wall;
      ctx.fillRect(0, 0, W, 34);
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      for (let x = 0; x < W; x += 20) ctx.fillRect(x + ((x / 20) % 2 ? 10 : 0), 12, 10, 2);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(0, 0, W, 2);
      // 地板
      ctx.fillStyle = p.floor;
      ctx.fillRect(0, 34, W, H - 34);
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      for (let y = 40; y < H; y += 16)
        for (let x = 0; x < W; x += 32) ctx.fillRect(x + ((y / 16) % 2 ? 16 : 0), y, 14, 2);

      // 危险地块闪烁
      const hz = Math.sin(t * 3) * 0.5 + 0.5;
      ctx.fillStyle = p.hazard1;
      ctx.fillRect(24, 74, 20, 20);
      ctx.fillRect(150, 56, 20, 20);
      ctx.globalAlpha = 0.35 + hz * 0.5;
      ctx.fillStyle = p.hazard2;
      ctx.fillRect(28, 78, 12, 12);
      ctx.fillRect(154, 60, 12, 12);
      ctx.globalAlpha = 1;

      // 中央传送门:呼吸脉冲
      const pulse = 1 + Math.sin(t * 4) * 0.15;
      ctx.save();
      ctx.translate(W / 2, 52);
      ctx.scale(pulse, 1);
      ctx.fillStyle = p.portal;
      ctx.fillRect(-11, -20, 22, 40);
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillRect(-5, -13, 10, 26);
      ctx.restore();
      for (let i = 0; i < 5; i++) {
        const pt = (t * 0.7 + i / 5) % 1;
        ctx.globalAlpha = 1 - pt;
        ctx.fillStyle = p.portal;
        ctx.fillRect(W / 2 - 14 + ((i * 29) % 28), 52 - 24 - pt * 16, 2, 2);
        ctx.globalAlpha = 1;
      }

      // ---- 章节主题装饰 ----
      if (id === "forest") {
        drawPine(16, 1.1, 34);
        drawPine(184, 0.9, 36);
        // 萤火虫
        for (const f of flakes.slice(0, 7)) {
          const a = 0.35 + Math.sin(t * 3 + f.seed * 10) * 0.35 + 0.3;
          ctx.globalAlpha = a;
          ctx.fillStyle = "#C8F27E";
          ctx.fillRect(
            Math.round(f.x + Math.sin(t * 0.9 + f.seed * 7) * 8),
            Math.round(40 + ((f.y + Math.cos(t * 0.7 + f.seed * 5) * 6) % 60)),
            2,
            2
          );
          ctx.globalAlpha = 1;
        }
      } else if (id === "dungeon") {
        drawTorch(30, 16, t);
        drawTorch(170, 16, t + 0.4);
      } else if (id === "snow") {
        for (const f of flakes) {
          f.y += 0.35;
          f.x += Math.sin(t * 1.3 + f.seed * 6) * 0.3;
          if (f.y > H) {
            f.y = -3;
            f.x = Math.random() * W;
          }
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.fillRect(Math.round(f.x), Math.round(f.y), 2, 2);
        }
        // 雪堆
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillRect(0, 32, 26, 3);
        ctx.fillRect(160, 32, 40, 3);
      } else {
        // 余烬上升
        for (const f of flakes.slice(0, 10)) {
          f.y -= 0.5;
          f.x += Math.sin(t * 2 + f.seed * 8) * 0.25;
          if (f.y < 0) {
            f.y = H + 2;
            f.x = Math.random() * W;
          }
          const a = 0.4 + Math.sin(t * 5 + f.seed * 12) * 0.3 + 0.3;
          ctx.globalAlpha = a;
          ctx.fillStyle = Math.sin(f.seed * 9) > 0 ? "#FFB12B" : "#FF6B35";
          ctx.fillRect(Math.round(f.x), Math.round(f.y), 2, 3);
          ctx.globalAlpha = 1;
        }
        // 熔岩裂缝
        const glow = 0.5 + Math.sin(t * 4) * 0.4;
        ctx.fillStyle = `rgba(255,120,30,${glow})`;
        ctx.fillRect(60, 96, 16, 2);
        ctx.fillRect(70, 98, 8, 1);
        ctx.fillRect(120, 88, 12, 2);
      }

      // 宝箱
      drawChest(62, 40, t);

      // 一只巡逻史莱姆
      const sx = W / 2 + Math.sin(t * 0.9) * 52;
      const hop = Math.abs(Math.sin(t * 4.5));
      const squash = 1 + Math.sin(t * 9) * 0.15;
      const colors = makeColors(p.hazard2, "#333", "#FFF");
      colors.body = p.hazard2;
      ctx.save();
      ctx.translate(sx, 92 - hop * 8);
      ctx.scale(squash * 0.8, (2 - squash) * 0.8);
      drawGrid(ctx, SLIME_GRID, colors, -12, -16, 2);
      ctx.restore();

      // 底部暗角
      const vg = ctx.createLinearGradient(0, H - 26, 0, H);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.35)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, H - 26, W, 26);

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [chapter]);

  return <canvas ref={canvasRef} className="chapter-canvas" aria-hidden />;
}
