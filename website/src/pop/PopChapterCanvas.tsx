import { useEffect, useRef } from "react";
import type { ChapterInfo } from "../content";

const INK = "#16161A";

/** 章节几何海报:扁平色块场景 + 旋转光线 / 落雪 / 余烬 */
export default function PopChapterCanvas({ chapter }: { chapter: ChapterInfo }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = 240;
    const H = 136;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const id = chapter.id;
    let raf = 0;
    let running = true;
    let t = Math.random() * 6;

    const drift = Array.from({ length: 14 }, (_, i) => ({
      x: (i * 53 + 11) % W,
      y: (i * 37 + 5) % H,
      seed: i * 0.71,
    }));

    // 每章配色(扁平波普版)
    const theme =
      id === "forest"
        ? { sky: "#D8F3C8", ground: "#2C6B40", sun: "#FFC800", extra: "#3B8A52" }
        : id === "dungeon"
        ? { sky: "#E4DCFF", ground: "#4B3B7A", sun: "#FFFFFF", extra: "#7B4DFF" }
        : id === "snow"
        ? { sky: "#DFF1FA", ground: "#7FB6D0", sun: "#8FD2FF", extra: "#FFFFFF" }
        : { sky: "#FFE0C2", ground: "#8A2E2E", sun: "#FF4438", extra: "#FF8A2B" };

    function rays(cx: number, cy: number, r0: number, r1: number, n: number, color: string, rot: number) {
      if (!ctx) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n + rot;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.stroke();
      }
    }

    function frame() {
      if (!running || !ctx) return;
      t += 1 / 60;
      ctx.lineJoin = "round";

      // 天空
      ctx.fillStyle = theme.sky;
      ctx.fillRect(0, 0, W, H);

      // 半调网点角
      ctx.fillStyle = "rgba(22,22,26,0.1)";
      for (let y = 6; y < 54; y += 9) {
        for (let x = W - 66 + ((y / 9) % 2) * 4.5; x < W - 6; x += 9) {
          ctx.beginPath();
          ctx.arc(x, y, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 太阳 / 月亮 + 光线
      const sunX = 46;
      const sunY = 38;
      if (id !== "snow") rays(sunX, sunY, 26, 34, 10, theme.sun, t * 0.5);
      ctx.fillStyle = theme.sun;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 19, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (id === "dungeon") {
        // 月牙:叠一个天空色圆
        ctx.fillStyle = theme.sky;
        ctx.beginPath();
        ctx.arc(sunX + 9, sunY - 5, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 19, Math.PI * 0.45, Math.PI * 1.6);
        ctx.stroke();
      }

      // 地面色带
      ctx.fillStyle = theme.ground;
      ctx.fillRect(0, H - 44, W, 44);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, H - 44);
      ctx.lineTo(W, H - 44);
      ctx.stroke();

      // 章节地标
      if (id === "forest") {
        for (const [tx, s] of [
          [150, 1.15],
          [186, 0.85],
          [118, 0.7],
        ] as const) {
          const sway = Math.sin(t * 1.6 + tx) * 0.03;
          ctx.save();
          ctx.translate(tx, H - 44);
          ctx.rotate(sway);
          ctx.fillStyle = theme.extra;
          ctx.beginPath();
          ctx.moveTo(0, -52 * s);
          ctx.lineTo(20 * s, 0);
          ctx.lineTo(-20 * s, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      } else if (id === "dungeon") {
        // 拱门群
        for (const [ax, s] of [
          [128, 1],
          [172, 0.8],
          [208, 0.62],
        ] as const) {
          ctx.fillStyle = theme.extra;
          ctx.beginPath();
          ctx.arc(ax, H - 44, 22 * s, Math.PI, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = theme.sky;
          ctx.beginPath();
          ctx.arc(ax, H - 44, 12 * s, Math.PI, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      } else if (id === "snow") {
        // 锯齿雪山
        ctx.fillStyle = theme.extra;
        ctx.beginPath();
        ctx.moveTo(96, H - 44);
        ctx.lineTo(126, H - 92);
        ctx.lineTo(152, H - 44);
        ctx.lineTo(176, H - 80);
        ctx.lineTo(202, H - 44);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        // 熔炉:黑色厂房 + 烟囱
        ctx.fillStyle = INK;
        ctx.fillRect(130, H - 84, 52, 40);
        ctx.fillRect(146, H - 106, 12, 24);
        const glow = 0.5 + Math.sin(t * 5) * 0.5;
        ctx.fillStyle = `rgba(255,138,43,${0.5 + glow * 0.5})`;
        ctx.beginPath();
        ctx.arc(152, H - 110, 5 + glow * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = theme.extra;
        ctx.fillRect(138, H - 72, 10, 12);
        ctx.fillRect(158, H - 72, 10, 12);
      }

      // 漂浮天气
      for (const d of drift) {
        if (id === "snow") {
          d.y += 0.4;
          d.x += Math.sin(t + d.seed * 8) * 0.3;
          if (d.y > H) {
            d.y = -3;
            d.x = Math.random() * W;
          }
          ctx.fillStyle = "#FFFFFF";
          ctx.strokeStyle = INK;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(d.x, d.y, 2.6, 0, Math.PI * 2);
          ctx.fill();
        } else if (id === "lava") {
          d.y -= 0.55;
          if (d.y < 0) {
            d.y = H + 3;
            d.x = Math.random() * W;
          }
          ctx.globalAlpha = 0.5 + Math.sin(t * 4 + d.seed * 9) * 0.4;
          ctx.fillStyle = Math.sin(d.seed * 7) > 0 ? "#FF8A2B" : "#FF4438";
          ctx.fillRect(d.x, d.y, 4, 4);
          ctx.globalAlpha = 1;
        } else if (id === "forest") {
          const a = 0.4 + Math.sin(t * 2.6 + d.seed * 10) * 0.4;
          ctx.globalAlpha = Math.max(0, a);
          ctx.fillStyle = "#FFC800";
          ctx.beginPath();
          ctx.arc(
            d.x + Math.sin(t * 0.8 + d.seed * 6) * 6,
            20 + ((d.y + Math.cos(t * 0.6 + d.seed * 5) * 5) % (H - 60)),
            2.2,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.globalAlpha = 1;
        } else {
          // 地牢:漂浮菱形
          const a = 0.35 + Math.sin(t * 2 + d.seed * 8) * 0.3;
          ctx.globalAlpha = Math.max(0.08, a);
          ctx.fillStyle = "#7B4DFF";
          ctx.save();
          ctx.translate(d.x, 18 + ((d.y + t * 6 * (0.4 + d.seed / 3)) % (H - 66)));
          ctx.rotate(Math.PI / 4);
          ctx.fillRect(-3, -3, 6, 6);
          ctx.restore();
          ctx.globalAlpha = 1;
        }
      }

      // 前景波浪线
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      const off = (t * 26) % 22;
      for (let x = -22; x < W + 22; x += 3) {
        const y = H - 22 + Math.sin(((x + off) / 22) * Math.PI) * 4;
        if (x <= -19) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [chapter]);

  return <canvas ref={canvasRef} className="pchapter-canvas" aria-hidden />;
}
