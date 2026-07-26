import { useEffect, useRef } from "react";

/**
 * 异环背景:霓虹都市天际线 + 雨夜 + 异象粒子 + 随机故障色带。
 */
export default function AnomalyCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let dpr = 1;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // 建筑(比例坐标,resize 后仍然稳定)
    const buildings = Array.from({ length: 26 }, (_, i) => ({
      fx: (i * 41) % 100,
      fw: 5 + ((i * 17) % 9),
      fh: 16 + ((i * 53) % 40),
      layer: i % 3,
      seed: i * 7,
      neon: ["#FF2E7E", "#00D8FF", "#B14BFF", "#FFB03A"][i % 4],
    }));

    const rain = Array.from({ length: 90 }, (_, i) => ({
      fx: ((i * 79) % 1000) / 1000,
      fy: ((i * 137) % 1000) / 1000,
      len: 12 + ((i * 13) % 26),
      speed: 420 + ((i * 31) % 340),
      alpha: 0.1 + ((i * 19) % 40) / 160,
    }));

    const motes = Array.from({ length: 34 }, (_, i) => ({
      fx: ((i * 53) % 1000) / 1000,
      fy: ((i * 97) % 1000) / 1000,
      r: 1 + ((i * 23) % 26) / 10,
      speed: 8 + ((i * 29) % 26),
      phase: (i * 31) % 100,
      hot: i % 5 === 0,
    }));

    let raf = 0;
    let running = true;
    let last = performance.now();
    let t = 0;
    let glitch = 0;
    let glitchTimer = 2.2;
    let glitchY = 0;

    function frame(now: number) {
      if (!running || !ctx) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;

      ctx.clearRect(0, 0, W, H);

      // ---- 夜空辉光 ----
      const sky = ctx.createRadialGradient(W * 0.62, H * 0.72, 10, W * 0.62, H * 0.72, W * 0.95);
      sky.addColorStop(0, "rgba(255,46,126,0.20)");
      sky.addColorStop(0.42, "rgba(120,40,180,0.12)");
      sky.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      const sky2 = ctx.createRadialGradient(W * 0.18, H * 0.3, 10, W * 0.18, H * 0.3, W * 0.7);
      sky2.addColorStop(0, "rgba(0,216,255,0.14)");
      sky2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = sky2;
      ctx.fillRect(0, 0, W, H);

      // ---- 异象环(缓慢旋转的破碎圆环)----
      ctx.save();
      ctx.translate(W * 0.66, H * 0.34);
      ctx.rotate(t * 0.12);
      for (let i = 0; i < 3; i++) {
        const R = 78 + i * 46;
        ctx.strokeStyle = i === 1 ? "rgba(255,46,126,0.4)" : "rgba(0,216,255,0.28)";
        ctx.lineWidth = 1.6;
        ctx.setLineDash([R * 0.5, R * 0.34, R * 0.16, R * 0.5]);
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();

      // ---- 天际线(三层视差)----
      const groundY = H * 0.92;
      for (let layer = 0; layer < 3; layer++) {
        const depth = 1 - layer * 0.3;
        const shift = (t * (3 + layer * 4)) % 100;
        ctx.fillStyle = `rgba(${8 + layer * 6},${6 + layer * 6},${16 + layer * 10},${0.92 - layer * 0.12})`;
        for (const b of buildings) {
          if (b.layer !== layer) continue;
          let fx = (b.fx - shift + 100) % 100;
          const x = (fx / 100) * (W + 120) - 60;
          const w = (b.fw / 100) * W * 0.9 * depth + 10;
          const h = (b.fh / 100) * H * depth * 1.15;
          ctx.fillRect(x, groundY - h, w, h);
          // 楼顶霓虹条
          ctx.fillStyle = b.neon;
          ctx.globalAlpha = 0.55 + Math.sin(t * 2 + b.seed) * 0.2;
          ctx.fillRect(x + 2, groundY - h - 3, w - 4, 3);
          ctx.globalAlpha = 1;
          // 窗户
          ctx.fillStyle = `rgba(255,235,190,${0.1 + layer * 0.04})`;
          for (let wy = groundY - h + 12; wy < groundY - 8; wy += 13) {
            for (let wx = x + 5; wx < x + w - 6; wx += 10) {
              const lit = Math.sin(wx * 12.9898 + wy * 78.233 + b.seed) * 43758.5453;
              if (lit - Math.floor(lit) > 0.55) {
                ctx.fillRect(wx, wy, 4, 6);
              }
            }
          }
          ctx.fillStyle = `rgba(${8 + layer * 6},${6 + layer * 6},${16 + layer * 10},${0.92 - layer * 0.12})`;
        }
      }

      // 地面反光
      const refl = ctx.createLinearGradient(0, groundY, 0, H);
      refl.addColorStop(0, "rgba(255,46,126,0.22)");
      refl.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = refl;
      ctx.fillRect(0, groundY, W, H - groundY);

      // ---- 雨 ----
      ctx.strokeStyle = "rgba(180,220,255,0.5)";
      ctx.lineWidth = 1;
      for (const r of rain) {
        const y = ((r.fy * H + t * r.speed) % (H + 60)) - 30;
        const x = r.fx * W + y * 0.14;
        ctx.globalAlpha = r.alpha;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 2.4, y + r.len);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // ---- 异象浮尘 ----
      for (const m of motes) {
        const y = ((m.fy * H - t * m.speed) % (H + 40) + (H + 40)) % (H + 40) - 20;
        const x = m.fx * W + Math.sin(t * 0.6 + m.phase) * 16;
        const a = 0.25 + Math.sin(t * 2.2 + m.phase) * 0.25 + 0.25;
        ctx.fillStyle = m.hot ? `rgba(255,46,126,${a})` : `rgba(0,216,255,${a * 0.8})`;
        ctx.beginPath();
        ctx.arc(x, y, m.r, 0, Math.PI * 2);
        ctx.fill();
        if (m.hot) {
          ctx.fillStyle = `rgba(255,46,126,${a * 0.16})`;
          ctx.beginPath();
          ctx.arc(x, y, m.r * 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ---- 随机故障色带 ----
      glitchTimer -= dt;
      if (glitchTimer <= 0) {
        glitchTimer = 2.4 + Math.random() * 3.4;
        glitch = 0.32;
        glitchY = Math.random() * H;
      }
      if (glitch > 0) {
        glitch -= dt;
        const bands = 3;
        for (let i = 0; i < bands; i++) {
          const by = glitchY + i * 26 + Math.sin(t * 40 + i) * 5;
          const bh = 5 + ((i * 13) % 12);
          const off = (Math.random() - 0.5) * 44;
          ctx.globalAlpha = Math.max(0, glitch) * 1.6;
          ctx.fillStyle = i % 2 === 0 ? "rgba(0,216,255,0.5)" : "rgba(255,46,126,0.5)";
          ctx.fillRect(off, by, W, bh);
          ctx.globalAlpha = 1;
        }
      }

      // ---- 顶部/底部压暗 ----
      const vg = ctx.createLinearGradient(0, 0, 0, H);
      vg.addColorStop(0, "rgba(0,0,0,0.45)");
      vg.addColorStop(0.4, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);

      raf = requestAnimationFrame(frame);
    }

    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      } else if (!e.isIntersecting) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    io.observe(canvas);
    raf = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden />;
}
