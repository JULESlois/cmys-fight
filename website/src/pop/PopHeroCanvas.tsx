import { useEffect, useRef } from "react";

const INK = "#16161A";
const COLORS = ["#FF4438", "#2764FF", "#FFC800", "#FF5CA8", "#17B8A6", "#7B4DFF", "#FF8A2B"];

interface Burst {
  x: number;
  y: number;
  life: number;
  max: number;
  color: string;
  text: string;
}

/** 波普风 Hero 背景:漂浮几何形 + 旋转星芒 + 弹跳笑脸球 + 漫画爆炸字 */
export default function PopHeroCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0;
    let H = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      W = Math.max(1, Math.round(rect.width));
      H = Math.max(1, Math.round(rect.height));
      canvas.width = W;
      canvas.height = H;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let running = true;
    let last = performance.now();
    let t = 0;

    // 漂浮几何形(位置为画面比例,避开中央文字区)
    const shapes = [
      { kind: "ring", fx: 0.07, fy: 0.22, r: 34, color: COLORS[1], spd: 0.7 },
      { kind: "tri", fx: 0.14, fy: 0.62, r: 30, color: COLORS[4], spd: 1.1 },
      { kind: "cross", fx: 0.08, fy: 0.85, r: 18, color: COLORS[0], spd: 0.9 },
      { kind: "half", fx: 0.22, fy: 0.16, r: 26, color: COLORS[3], spd: 0.8 },
      { kind: "sq", fx: 0.88, fy: 0.2, r: 26, color: COLORS[5], spd: 0.75 },
      { kind: "ring", fx: 0.93, fy: 0.55, r: 22, color: COLORS[0], spd: 1.2 },
      { kind: "tri", fx: 0.85, fy: 0.8, r: 32, color: COLORS[2], spd: 0.65 },
      { kind: "cross", fx: 0.68, fy: 0.12, r: 15, color: COLORS[1], spd: 1.3 },
      { kind: "dot", fx: 0.3, fy: 0.88, r: 12, color: COLORS[2], spd: 1 },
      { kind: "half", fx: 0.72, fy: 0.9, r: 24, color: COLORS[6], spd: 0.85 },
      { kind: "sq", fx: 0.35, fy: 0.1, r: 14, color: COLORS[3], spd: 1.15 },
    ];

    // 弹跳笑脸球
    const ball = { fx: 0.13, y: 0, vy: 0, r: 34 };
    let ballInit = false;

    let bursts: Burst[] = [];
    let burstTimer = 1.4;
    const BURST_WORDS = ["POW!", "BAM!", "ZAP!", "BOOM!"];
    const BURST_SPOTS = [
      { fx: 0.82, fy: 0.32 },
      { fx: 0.18, fy: 0.38 },
      { fx: 0.75, fy: 0.68 },
      { fx: 0.28, fy: 0.74 },
    ];
    let spotIdx = 0;

    function star(
      c: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      spikes: number,
      outer: number,
      inner: number,
      rot = 0
    ) {
      c.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = (Math.PI * i) / spikes + rot;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.closePath();
    }

    function frame(now: number) {
      if (!running || !ctx) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;

      ctx.clearRect(0, 0, W, H);
      ctx.lineJoin = "round";

      // 大星芒:标题正后方,极淡,缓慢旋转
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "#FFE9B0";
      star(ctx, W / 2, H * 0.42, 16, Math.min(W, H) * 0.46, Math.min(W, H) * 0.34, t * 0.08);
      ctx.fill();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = "#FFF7DF";
      star(ctx, W / 2, H * 0.42, 16, Math.min(W, H) * 0.36, Math.min(W, H) * 0.27, -t * 0.06);
      ctx.fill();
      ctx.restore();

      // 半调网点大圆(左上 / 右下)
      const dotPatch = (cx: number, cy: number, R: number) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = "rgba(22,22,26,0.14)";
        for (let y = cy - R; y < cy + R; y += 11) {
          for (let x = cx - R + ((Math.round(y / 11) % 2) * 5.5); x < cx + R; x += 11) {
            ctx.beginPath();
            ctx.arc(x, y, 2.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      };
      dotPatch(W * 0.06, H * 0.06, 130);
      dotPatch(W * 0.96, H * 0.96, 150);

      // 波浪线(两条,横向滚动)
      const squiggle = (yBase: number, color: string, phase: number, amp: number) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.beginPath();
        const seg = 26;
        const off = (t * 40 + phase) % seg;
        for (let x = -seg * 2; x < W + seg; x += 4) {
          const y = yBase + Math.sin(((x + off) / seg) * Math.PI) * amp;
          if (x <= -seg * 2 + 4) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };
      ctx.globalAlpha = 0.5;
      squiggle(H * 0.12, "#FF5CA8", 0, 6);
      squiggle(H * 0.94, "#2764FF", 40, 7);
      ctx.globalAlpha = 1;

      // 漂浮几何形
      for (const s of shapes) {
        const x = s.fx * W + Math.sin(t * s.spd + s.fx * 20) * 8;
        const y = s.fy * H + Math.cos(t * s.spd * 0.8 + s.fy * 16) * 10;
        const rot = Math.sin(t * s.spd * 0.5 + s.fx * 9) * 0.5;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.fillStyle = s.color;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 4;
        if (s.kind === "ring") {
          ctx.beginPath();
          ctx.arc(0, 0, s.r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, s.r - 9, 0, Math.PI * 2);
          ctx.fillStyle = s.color;
          ctx.fill();
          ctx.stroke();
        } else if (s.kind === "dot") {
          ctx.beginPath();
          ctx.arc(0, 0, s.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (s.kind === "sq") {
          ctx.fillRect(-s.r, -s.r, s.r * 2, s.r * 2);
          ctx.strokeRect(-s.r, -s.r, s.r * 2, s.r * 2);
        } else if (s.kind === "tri") {
          ctx.beginPath();
          ctx.moveTo(0, -s.r);
          ctx.lineTo(s.r * 0.95, s.r * 0.7);
          ctx.lineTo(-s.r * 0.95, s.r * 0.7);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (s.kind === "half") {
          ctx.beginPath();
          ctx.arc(0, 0, s.r, Math.PI, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (s.kind === "cross") {
          ctx.lineWidth = 8;
          ctx.strokeStyle = s.color;
          ctx.beginPath();
          ctx.moveTo(-s.r, 0);
          ctx.lineTo(s.r, 0);
          ctx.moveTo(0, -s.r);
          ctx.lineTo(0, s.r);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 弹跳笑脸球
      const groundY = H * 0.9;
      if (!ballInit) {
        ball.y = groundY - 180;
        ball.vy = 0;
        ballInit = true;
      }
      ball.vy += 620 * dt;
      ball.y += ball.vy * dt;
      if (ball.y > groundY - ball.r) {
        ball.y = groundY - ball.r;
        ball.vy = -Math.abs(ball.vy) * 0.92;
        if (Math.abs(ball.vy) < 260) ball.vy = -520;
      }
      const bx = ball.fx * W;
      const squash = Math.min(0.35, Math.max(0, (ball.y - (groundY - ball.r - 6)) / 24) * 0.35);
      // 阴影
      ctx.fillStyle = "rgba(22,22,26,0.18)";
      ctx.beginPath();
      ctx.ellipse(bx, groundY + 6, ball.r * (0.8 + squash), 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(bx, ball.y);
      ctx.scale(1 + squash, 1 - squash);
      ctx.fillStyle = "#FFC800";
      ctx.strokeStyle = INK;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, ball.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // 脸
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(-11, -6, 4, 0, Math.PI * 2);
      ctx.arc(11, -6, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 4, 13, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.restore();

      // 漫画爆炸字
      burstTimer -= dt;
      if (burstTimer <= 0) {
        burstTimer = 2.6;
        const spot = BURST_SPOTS[spotIdx % BURST_SPOTS.length];
        spotIdx++;
        bursts.push({
          x: spot.fx * W,
          y: spot.fy * H,
          life: 0,
          max: 1.3,
          color: COLORS[spotIdx % COLORS.length],
          text: BURST_WORDS[spotIdx % BURST_WORDS.length],
        });
      }
      for (const b of bursts) {
        b.life += dt;
        const p = b.life / b.max;
        const scaleIn = p < 0.18 ? p / 0.18 : 1;
        const fadeOut = p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.globalAlpha = fadeOut;
        ctx.scale(scaleIn, scaleIn);
        ctx.rotate(Math.sin(b.life * 3) * 0.06 - 0.08);
        ctx.fillStyle = b.color;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 4;
        star(ctx, 0, 0, 10, 52, 34, b.life * 0.4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#fff";
        star(ctx, 0, 0, 10, 40, 27, b.life * 0.4 + 0.1);
        ctx.fill();
        ctx.fillStyle = INK;
        ctx.font = "17px 'Bungee', 'ZCOOL KuaiLe', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(b.text, 0, 2);
        ctx.restore();
      }
      bursts = bursts.filter((b) => b.life < b.max);

      raf = requestAnimationFrame(frame);
    }

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      } else if (!entry.isIntersecting) {
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

  return <canvas ref={canvasRef} className={className} aria-label="几何波普动画背景" />;
}
