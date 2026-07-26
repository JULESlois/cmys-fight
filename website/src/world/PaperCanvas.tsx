import { useEffect, useRef } from "react";

/**
 * 弦界背景:漂浮的纸片(会周期性「弦化」压平成一条线)+ 超弦光丝 + 体积光。
 */
export default function PaperCanvas({ className }: { className?: string }) {
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

    const TINTS = ["#00D8FF", "#7BE8FF", "#FFFFFF", "#B9F3FF", "#5AA8FF"];
    const shards = Array.from({ length: 22 }, (_, i) => ({
      fx: ((i * 47) % 100) / 100,
      fy: ((i * 71) % 100) / 100,
      size: 22 + ((i * 29) % 46),
      spin: ((i * 13) % 100) / 100 - 0.5,
      phase: ((i * 37) % 100) / 16,
      speed: 0.18 + ((i * 23) % 30) / 120,
      tint: TINTS[i % TINTS.length],
      depth: 0.4 + ((i * 19) % 60) / 100,
    }));

    // 超弦光丝控制点
    const strings = Array.from({ length: 5 }, (_, i) => ({
      fy: 0.16 + i * 0.17,
      amp: 26 + ((i * 31) % 40),
      speed: 0.35 + i * 0.12,
      phase: i * 1.7,
      alpha: 0.18 + (i % 3) * 0.1,
    }));

    let raf = 0;
    let running = true;
    let last = performance.now();
    let t = 0;

    function frame(now: number) {
      if (!running || !ctx) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;

      ctx.clearRect(0, 0, W, H);

      // ---- 体积光斜束 ----
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 4; i++) {
        const x = W * (0.1 + i * 0.24) + Math.sin(t * 0.25 + i) * 26;
        const g = ctx.createLinearGradient(x, 0, x + W * 0.18, H);
        g.addColorStop(0, "rgba(0,216,255,0.11)");
        g.addColorStop(0.5, "rgba(120,230,255,0.05)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x, -20);
        ctx.lineTo(x + W * 0.11, -20);
        ctx.lineTo(x + W * 0.3, H + 20);
        ctx.lineTo(x + W * 0.16, H + 20);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // ---- 超弦光丝 ----
      for (const s of strings) {
        ctx.strokeStyle = `rgba(0,190,255,${s.alpha})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 8) {
          const y =
            H * s.fy +
            Math.sin(x / 190 + t * s.speed + s.phase) * s.amp +
            Math.sin(x / 61 - t * s.speed * 1.6) * (s.amp * 0.25);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        // 光丝上的节点
        const nx = ((t * 60 * s.speed) % (W + 120)) - 60;
        const ny =
          H * s.fy +
          Math.sin(nx / 190 + t * s.speed + s.phase) * s.amp +
          Math.sin(nx / 61 - t * s.speed * 1.6) * (s.amp * 0.25);
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath();
        ctx.arc(nx, ny, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(0,216,255,0.35)";
        ctx.beginPath();
        ctx.arc(nx, ny, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      // ---- 漂浮纸片 ----
      for (const s of shards) {
        const drift = (t * s.speed * 26) % (H + 160);
        const x = s.fx * W + Math.sin(t * s.speed + s.phase) * 30;
        const y = ((s.fy * H + drift) % (H + 160)) - 80;
        // 弦化周期:flat 在 0(完全压平)与 1(立体)之间摆动
        const flat = Math.abs(Math.sin(t * 0.55 + s.phase));
        const rot = t * s.spin * 0.5 + s.phase;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.scale(1, Math.max(0.04, flat));
        ctx.globalAlpha = 0.16 + s.depth * 0.5;

        const g = ctx.createLinearGradient(-s.size, -s.size, s.size, s.size);
        g.addColorStop(0, s.tint);
        g.addColorStop(1, "rgba(255,255,255,0.25)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-s.size * 0.5, -s.size * 0.62);
        ctx.lineTo(s.size * 0.62, -s.size * 0.4);
        ctx.lineTo(s.size * 0.44, s.size * 0.6);
        ctx.lineTo(-s.size * 0.6, s.size * 0.34);
        ctx.closePath();
        ctx.fill();

        // 压平瞬间的高光边
        if (flat < 0.2) {
          ctx.globalAlpha = (0.2 - flat) * 4;
          ctx.strokeStyle = "rgba(255,255,255,0.95)";
          ctx.lineWidth = 2 / Math.max(0.04, flat);
          ctx.beginPath();
          ctx.moveTo(-s.size * 0.6, 0);
          ctx.lineTo(s.size * 0.62, 0);
          ctx.stroke();
        }
        ctx.restore();
      }

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
