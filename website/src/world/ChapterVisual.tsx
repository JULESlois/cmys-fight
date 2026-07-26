import { useEffect, useRef, useState } from "react";
import type { ChapterInfo } from "../content";
import { CHAPTER_WORLD, SLOTS, SLOT_HINT, WORLDS } from "./assets";

type LoadState = "loading" | "ok" | "missing";

/**
 * 章节主视觉。
 * 优先加载 public/assets/chapters/<id>.jpg,缺图时回退到程序化生成的抽象场景图。
 */
export default function ChapterVisual({ chapter }: { chapter: ChapterInfo }) {
  const src = SLOTS.chapter(chapter.id);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => setState("loading"), [src]);

  return (
    <div className="asset-slot asset-slot--wide">
      {state !== "ok" && <ChapterPlaceholder chapter={chapter} />}
      <img
        className="asset-slot__img"
        style={{ opacity: state === "ok" ? 1 : 0 }}
        src={src}
        alt={chapter.name}
        loading="lazy"
        decoding="async"
        onLoad={() => setState("ok")}
        onError={() => setState("missing")}
      />
    </div>
  );
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function ChapterPlaceholder({ chapter }: { chapter: ChapterInfo }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const world = CHAPTER_WORLD[chapter.id] ?? "fusion";
  const meta = WORLDS[world];

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 720;
    const H = 405;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const p = chapter.palette;

    // 天空渐变
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, p.bg);
    sky.addColorStop(0.62, p.wall);
    sky.addColorStop(1, p.floor);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // 光晕
    const glow = ctx.createRadialGradient(W * 0.72, H * 0.3, 8, W * 0.72, H * 0.3, W * 0.6);
    glow.addColorStop(0, rgba(p.hazard2, 0.75));
    glow.addColorStop(0.4, rgba(p.hazard2, 0.16));
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // 远山剪影(三层视差)
    const layers = [
      { y: H * 0.58, amp: 34, color: rgba(p.wall, 0.95), step: 96 },
      { y: H * 0.70, amp: 26, color: rgba(p.bg, 0.9), step: 74 },
      { y: H * 0.82, amp: 18, color: "rgba(0,0,0,0.62)", step: 58 },
    ];
    layers.forEach((L, li) => {
      ctx.fillStyle = L.color;
      ctx.beginPath();
      ctx.moveTo(0, H);
      ctx.lineTo(0, L.y);
      for (let x = 0; x <= W + L.step; x += L.step) {
        const peak = L.y - L.amp * (0.55 + ((x * (li + 3)) % 100) / 130);
        ctx.lineTo(x + L.step / 2, peak);
        ctx.lineTo(x + L.step, L.y - L.amp * 0.18);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
    });

    // 传送门光柱
    ctx.save();
    const beam = ctx.createLinearGradient(0, H * 0.2, 0, H * 0.9);
    beam.addColorStop(0, rgba(p.portal, 0));
    beam.addColorStop(0.45, rgba(p.portal, 0.85));
    beam.addColorStop(1, rgba(p.portal, 0));
    ctx.fillStyle = beam;
    ctx.fillRect(W * 0.715, H * 0.2, 10, H * 0.7);
    ctx.filter = "blur(14px)";
    ctx.fillRect(W * 0.70, H * 0.2, 20, H * 0.7);
    ctx.filter = "none";
    ctx.restore();

    // 悬浮粒子
    for (let i = 0; i < 46; i++) {
      const x = (i * 137.5) % W;
      const y = ((i * 89.3) % (H * 0.8)) + H * 0.1;
      const r = 0.8 + ((i * 31) % 22) / 12;
      ctx.fillStyle = rgba(p.hazard2, 0.18 + ((i * 17) % 60) / 140);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 底部渐隐
    const fade = ctx.createLinearGradient(0, H * 0.55, 0, H);
    fade.addColorStop(0, "rgba(0,0,0,0)");
    fade.addColorStop(1, "rgba(0,0,0,0.82)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);

    // 扫描线
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1.2);

    // 角标
    ctx.strokeStyle = rgba(meta.accent, 0.8);
    ctx.lineWidth = 2;
    const m = 14;
    const c = 22;
    ctx.beginPath();
    ctx.moveTo(m, m + c);
    ctx.lineTo(m, m);
    ctx.lineTo(m + c, m);
    ctx.moveTo(W - m - c, H - m);
    ctx.lineTo(W - m, H - m);
    ctx.lineTo(W - m, H - m - c);
    ctx.stroke();

    // 槽位提示
    ctx.font = "400 11px 'Chakra Petch',monospace";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.textAlign = "right";
    ctx.fillText(`◈ ${SLOT_HINT.chapter(chapter.id)}`, W - m - 30, H - m - 8);
  }, [chapter, meta]);

  return <canvas ref={ref} className="asset-slot__canvas" aria-hidden />;
}
