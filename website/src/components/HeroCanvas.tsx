import { useEffect, useRef } from "react";
import { CHAPTERS } from "../content";
import { SLIME_GRID, STAR_GRID, drawGrid, makeColors, type Grid } from "../pixel/sprites";

// 低分辨率内部画布,按像素游戏方式放大渲染
const VW = 480;
const VH = 270;
const GROUND_Y = 226;

// 主角跑步两帧(兜帽 + 步枪)
const RUN_A: Grid = [
  "............",
  "...OOOOOO...",
  "..OHHHHHHO..",
  ".OHHHHHHHHO.",
  ".OHOSSSSOHO.",
  ".OHOSESEOHO.",
  ".OHOSSSSOHO.",
  "..OBBBBBBO..",
  ".OSOBBBBOWWW",
  ".OWOBAABOWO.",
  "..OBBBBBBO..",
  "..OBBOOBBO..",
  "..OBO..OBO..",
  "..OO....OO..",
];
const RUN_B: Grid = [
  "............",
  "...OOOOOO...",
  "..OHHHHHHO..",
  ".OHHHHHHHHO.",
  ".OHOSSSSOHO.",
  ".OHOSESEOHO.",
  ".OHOSSSSOHO.",
  "..OBBBBBBO..",
  ".OSOBBBBOWWW",
  ".OWOBAABOWO.",
  "..OBBBBBBO..",
  "..OBBOOBBO..",
  "...OBOOBO...",
  "....OOOO....",
];

interface Slime {
  x: number;
  y: number;
  vx: number;
  hop: number;
  prevSin: number;
  dead: boolean;
}
interface Bullet {
  x: number;
  y: number;
  vx: number;
}
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}
interface Coin {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  spin: number;
}
interface Popup {
  x: number;
  y: number;
  life: number;
  text: string;
}
interface Weather {
  x: number;
  y: number;
  seed: number;
  kind: number; // 出生时的章节主题
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lerpColor(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

/** 像素圆:按 2px 行扫描,保持块状轮廓 */
function pxCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.fillStyle = color;
  for (let dy = -r; dy <= r; dy += 2) {
    const w = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)) / 2) * 2;
    ctx.fillRect(cx - w, cy + dy, w * 2, 2);
  }
}

export default function HeroCanvas({
  className,
  onChapterChange,
}: {
  className?: string;
  onChapterChange?: (name: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chapterCbRef = useRef(onChapterChange);
  chapterCbRef.current = onChapterChange;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = VW;
    canvas.height = VH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const playerColors = makeColors("#2ECC71", "#1D8348", "#ABEBC6");

    let raf = 0;
    let last = performance.now();
    let time = 0;
    let running = true;

    const CHAPTER_SECONDS = 7;
    const FADE = 1.4;

    let slimes: Slime[] = [];
    let bullets: Bullet[] = [];
    let particles: Particle[] = [];
    let coins: Coin[] = [];
    let popups: Popup[] = [];
    let spawnTimer = 1.2;
    let fireTimer = 0.4;
    let muzzle = 0;
    let kills = 0;
    let lastChapterName = "";

    // 天气粒子池
    const weather: Weather[] = Array.from({ length: 36 }, (_, i) => ({
      x: (i * 137 + 23) % VW,
      y: (i * 89 + 11) % VH,
      seed: i * 0.61,
      kind: 0,
    }));

    // 远景山峰(随机但固定)
    const hills = Array.from({ length: 10 }, (_, i) => ({
      x: i * 64 + ((i * 37) % 24),
      w: 46 + ((i * 53) % 40),
      h: 36 + ((i * 29) % 44),
    }));
    const clouds = Array.from({ length: 5 }, (_, i) => ({
      x: i * 110 + ((i * 71) % 50),
      y: 22 + ((i * 41) % 60),
      w: 34 + ((i * 23) % 30),
      speed: 4 + (i % 3) * 2.5,
    }));

    function palAt(t: number) {
      const total = CHAPTERS.length * CHAPTER_SECONDS;
      const cycle = ((t % total) + total) % total;
      const idx = Math.floor(cycle / CHAPTER_SECONDS);
      const next = (idx + 1) % CHAPTERS.length;
      const local = cycle - idx * CHAPTER_SECONDS;
      const mix = local > CHAPTER_SECONDS - FADE ? (local - (CHAPTER_SECONDS - FADE)) / FADE : 0;
      const a = CHAPTERS[idx].palette;
      const b = CHAPTERS[next].palette;
      return {
        idx,
        next,
        mix,
        dominant: mix > 0.5 ? next : idx,
        bg: lerpColor(a.bg, b.bg, mix),
        wall: lerpColor(a.wall, b.wall, mix),
        floor: lerpColor(a.floor, b.floor, mix),
        hazard2: lerpColor(a.hazard2, b.hazard2, mix),
        portal: lerpColor(a.portal, b.portal, mix),
        name: mix > 0.5 ? CHAPTERS[next].name : CHAPTERS[idx].name,
      };
    }

    function burst(x: number, y: number, color: string, extra: string) {
      for (let i = 0; i < 14; i++) {
        const ang = (Math.PI * 2 * i) / 14 + Math.random() * 0.4;
        const speed = 40 + Math.random() * 70;
        particles.push({
          x,
          y,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed - 40,
          life: 0,
          max: 0.55 + Math.random() * 0.4,
          color: Math.random() < 0.5 ? color : extra,
          size: Math.random() < 0.3 ? 3 : 2,
        });
      }
    }

    function dust(x: number, y: number) {
      for (let i = 0; i < 3; i++) {
        particles.push({
          x: x + (Math.random() - 0.5) * 14,
          y,
          vx: (Math.random() - 0.5) * 30,
          vy: -12 - Math.random() * 16,
          life: 0,
          max: 0.35,
          color: "rgba(255,255,255,0.5)",
          size: 2,
        });
      }
    }

    // ---------- 章节主题景物 ----------
    function drawPine(x: number, s: number) {
      if (!ctx) return;
      ctx.fillStyle = "#4A2F1B";
      ctx.fillRect(x - 3, GROUND_Y - 10 * s, 6, 10 * s);
      ctx.fillStyle = "#1E4A2E";
      ctx.fillRect(x - 17 * s, GROUND_Y - 20 * s, 34 * s, 10 * s);
      ctx.fillStyle = "#2C6B40";
      ctx.fillRect(x - 12 * s, GROUND_Y - 30 * s, 24 * s, 10 * s);
      ctx.fillStyle = "#3B8A52";
      ctx.fillRect(x - 7 * s, GROUND_Y - 39 * s, 14 * s, 9 * s);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(x - 7 * s, GROUND_Y - 39 * s, 14 * s, 2);
    }
    function drawPillar(x: number, s: number, t: number) {
      if (!ctx) return;
      ctx.fillStyle = "#33415C";
      ctx.fillRect(x - 10 * s, GROUND_Y - 46 * s, 20 * s, 5 * s);
      ctx.fillRect(x - 10 * s, GROUND_Y - 5 * s, 20 * s, 5 * s);
      ctx.fillStyle = "#3E4E6E";
      ctx.fillRect(x - 6 * s, GROUND_Y - 42 * s, 12 * s, 38 * s);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(x + 2 * s, GROUND_Y - 42 * s, 4 * s, 38 * s);
      const glow = 0.5 + Math.sin(t * 3 + x) * 0.5;
      ctx.globalAlpha *= 0.4 + glow * 0.6;
      ctx.fillStyle = "#C77DFF";
      ctx.fillRect(x - 2, GROUND_Y - 26 * s, 4, 4);
      ctx.globalAlpha /= 0.4 + glow * 0.6;
    }
    function drawIceSpike(x: number, s: number) {
      if (!ctx) return;
      ctx.fillStyle = "#BCDDEA";
      ctx.fillRect(x - 11 * s, GROUND_Y - 10 * s, 22 * s, 10 * s);
      ctx.fillStyle = "#D9EDF5";
      ctx.fillRect(x - 7 * s, GROUND_Y - 22 * s, 14 * s, 12 * s);
      ctx.fillStyle = "#F4FBFF";
      ctx.fillRect(x - 3 * s, GROUND_Y - 34 * s, 6 * s, 12 * s);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(x - 3 * s, GROUND_Y - 34 * s, 2, 12 * s);
    }
    function drawChimney(x: number, s: number, t: number) {
      if (!ctx) return;
      ctx.fillStyle = "#241B2E";
      ctx.fillRect(x - 8 * s, GROUND_Y - 44 * s, 16 * s, 44 * s);
      ctx.fillStyle = "#332641";
      ctx.fillRect(x - 8 * s, GROUND_Y - 44 * s, 5 * s, 44 * s);
      const glow = 0.5 + Math.sin(t * 5 + x * 0.7) * 0.5;
      ctx.fillStyle = `rgba(255,${120 + glow * 80},43,${0.5 + glow * 0.5})`;
      ctx.fillRect(x - 6 * s, GROUND_Y - 47 * s, 12 * s, 4);
      ctx.fillStyle = "#D14C18";
      ctx.fillRect(x - 10 * s, GROUND_Y - 45 * s, 20 * s, 3);
    }

    function drawProps(chapterIdx: number, alpha: number, t: number) {
      if (!ctx || alpha <= 0.02) return;
      ctx.globalAlpha = alpha;
      for (let i = 0; i < 6; i++) {
        const span = VW + 140;
        let x = ((i * 96 + 50 - t * 20) % span) - 70;
        if (x < -70) x += span;
        const s = 0.7 + ((i * 31) % 10) / 18;
        if (chapterIdx === 0) drawPine(x, s);
        else if (chapterIdx === 1) drawPillar(x, s, t);
        else if (chapterIdx === 2) drawIceSpike(x, s);
        else drawChimney(x, s, t);
      }
      ctx.globalAlpha = 1;
    }

    // ---------- 像素日月 ----------
    function drawCelestial(chapterIdx: number, alpha: number, bg: string) {
      if (!ctx || alpha <= 0.02) return;
      ctx.globalAlpha = alpha;
      const cx = 396;
      const cy = 52;
      if (chapterIdx === 0) {
        pxCircle(ctx, cx, cy, 14, "#FFD166");
        pxCircle(ctx, cx - 2, cy - 2, 8, "#FFE9A8");
      } else if (chapterIdx === 1) {
        pxCircle(ctx, cx, cy, 13, "#DFE8FF");
        pxCircle(ctx, cx + 7, cy - 4, 11, bg);
      } else if (chapterIdx === 2) {
        pxCircle(ctx, cx, cy, 11, "#FFFFFF");
        ctx.globalAlpha = alpha * 0.25;
        pxCircle(ctx, cx, cy, 17, "#FFFFFF");
        ctx.globalAlpha = alpha;
      } else {
        pxCircle(ctx, cx, cy, 15, "#8A2E2E");
        pxCircle(ctx, cx - 4, cy + 2, 4, "#6E2424");
        pxCircle(ctx, cx + 6, cy - 5, 3, "#6E2424");
      }
      ctx.globalAlpha = 1;
    }

    // ---------- 天气粒子 ----------
    function stepWeather(dominant: number, dt: number, t: number) {
      if (!ctx) return;
      for (const p of weather) {
        if (p.kind === 0) {
          // 萤火虫:缓慢漂浮
          p.x += Math.sin(t * 0.8 + p.seed * 7) * 8 * dt;
          p.y += Math.cos(t * 0.6 + p.seed * 5) * 6 * dt;
        } else if (p.kind === 1) {
          p.y -= 7 * dt; // 符文微粒上升
          p.x += Math.sin(t + p.seed * 9) * 4 * dt;
        } else if (p.kind === 2) {
          p.y += 18 * dt; // 落雪
          p.x += Math.sin(t * 1.4 + p.seed * 6) * 10 * dt;
        } else {
          p.y -= 26 * dt; // 余烬快速上升
          p.x += Math.sin(t * 2 + p.seed * 8) * 6 * dt;
        }
        // 出界后按当前主题重生
        if (p.y < -6 || p.y > VH + 6 || p.x < -6 || p.x > VW + 6) {
          p.kind = dominant;
          p.x = Math.random() * VW;
          p.y = p.kind === 2 ? -4 : p.kind === 0 ? 40 + Math.random() * 160 : GROUND_Y + 20;
          if (p.kind === 0 || p.kind === 1) p.y = 30 + Math.random() * 170;
        }
        const tw = 0.4 + Math.sin(t * 3 + p.seed * 11) * 0.35 + 0.25;
        if (p.kind === 0) {
          ctx.globalAlpha = tw;
          ctx.fillStyle = "#C8F27E";
          ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
        } else if (p.kind === 1) {
          ctx.globalAlpha = tw * 0.8;
          ctx.fillStyle = "#C77DFF";
          ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
        } else if (p.kind === 2) {
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
        } else {
          ctx.globalAlpha = tw;
          ctx.fillStyle = Math.sin(p.seed * 13) > 0 ? "#FFB12B" : "#FF6B35";
          ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 3);
        }
        ctx.globalAlpha = 1;
      }
    }

    // ---------- 地面主题细节 ----------
    function drawGroundDetail(chapterIdx: number, alpha: number, t: number) {
      if (!ctx || alpha <= 0.02) return;
      ctx.globalAlpha = alpha;
      const span = VW + 40;
      for (let i = 0; i < 14; i++) {
        let x = ((i * 41 + 9 - t * 46) % span) - 20;
        if (x < -20) x += span;
        const y = GROUND_Y + 6 + ((i * 17) % 28);
        if (chapterIdx === 0) {
          ctx.fillStyle = "#7C9468";
          ctx.fillRect(x, y, 2, 4);
          ctx.fillRect(x + 3, y + 1, 2, 3);
        } else if (chapterIdx === 1) {
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.fillRect(x, y, 6, 1);
          ctx.fillRect(x + 5, y + 1, 4, 1);
        } else if (chapterIdx === 2) {
          ctx.fillStyle = "rgba(255,255,255,0.65)";
          ctx.fillRect(x, y, 5, 2);
        } else {
          const glow = 0.4 + Math.sin(t * 4 + i * 2.1) * 0.3 + 0.3;
          ctx.fillStyle = `rgba(255,140,40,${glow * alpha})`;
          ctx.fillRect(x, y, 5, 1);
          ctx.fillRect(x + 2, y + 1, 2, 1);
        }
      }
      ctx.globalAlpha = 1;
    }

    function frame(now: number) {
      if (!running || !ctx) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      const pal = palAt(time);

      // ------- 更新 -------
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnTimer = 1.6 + Math.random() * 1.6;
        slimes.push({
          x: VW + 20,
          y: GROUND_Y,
          vx: -(34 + Math.random() * 26),
          hop: Math.random() * Math.PI,
          prevSin: 0,
          dead: false,
        });
      }
      fireTimer -= dt;
      muzzle = Math.max(0, muzzle - dt);
      const playerX = 84;
      const playerBob = Math.sin(time * 9) * 2;
      const playerY = GROUND_Y - 28 + playerBob;
      if (fireTimer <= 0) {
        fireTimer = 0.85;
        muzzle = 0.09;
        bullets.push({ x: playerX + 26, y: playerY + 17, vx: 190 });
      }
      for (const b of bullets) b.x += b.vx * dt;
      bullets = bullets.filter((b) => b.x < VW + 30);

      for (const s of slimes) {
        s.hop += dt * 5;
        const sin = Math.sin(s.hop);
        if (s.prevSin > 0 && sin <= 0) dust(s.x, GROUND_Y + 2);
        s.prevSin = sin;
        s.x += s.vx * dt;
        if (s.x < -40) s.dead = true;
        for (const b of bullets) {
          if (Math.abs(b.x - s.x) < 12 && Math.abs(b.y - (s.y - 8)) < 16) {
            s.dead = true;
            b.x = VW + 999;
            kills++;
            burst(s.x, s.y - 8, pal.hazard2, "#FFD166");
            popups.push({ x: s.x, y: s.y - 26, life: 0, text: ["POW!", "BAM!", "+1"][kills % 3] });
            coins.push({
              x: s.x,
              y: s.y - 14,
              vx: 20 + Math.random() * 26,
              vy: -85 - Math.random() * 30,
              life: 0,
              spin: Math.random() * 6,
            });
          }
        }
      }
      slimes = slimes.filter((s) => !s.dead);

      for (const p of particles) {
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 150 * dt;
      }
      particles = particles.filter((p) => p.life < p.max);
      for (const c of coins) {
        c.life += dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.vy += 220 * dt;
        c.spin += dt * 10;
        if (c.y > GROUND_Y - 2 && c.vy > 0) {
          c.vy *= -0.45;
          c.y = GROUND_Y - 2;
        }
      }
      coins = coins.filter((c) => c.life < 1.15);
      for (const p of popups) p.life += dt;
      popups = popups.filter((p) => p.life < 0.8);
      for (const c of clouds) {
        c.x -= c.speed * dt;
        if (c.x < -c.w - 10) c.x = VW + 10;
      }

      // ------- 绘制 -------
      const grad = ctx.createLinearGradient(0, 0, 0, VH);
      grad.addColorStop(0, pal.bg);
      grad.addColorStop(1, pal.wall);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, VW, VH);

      // 天空抖动条带(dither)
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = "#FFFFFF";
      for (let y = 8; y < 90; y += 14) {
        for (let x = (y * 7) % 8; x < VW; x += 8) ctx.fillRect(x, y, 2, 2);
      }
      ctx.globalAlpha = 1;

      // 星星
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      for (let i = 0; i < 26; i++) {
        const sx = (i * 97 + 13) % VW;
        const sy = (i * 61 + 7) % 120;
        if (Math.sin(time * 2 + i) > -0.3) ctx.fillRect(sx, sy, 2, 2);
      }

      // 像素日月(随章节淡入淡出)
      drawCelestial(pal.idx, 1 - pal.mix, pal.bg);
      drawCelestial(pal.next, pal.mix, pal.bg);

      // 云
      for (const c of clouds) {
        ctx.fillStyle = "rgba(255,255,255,0.16)";
        ctx.fillRect(Math.round(c.x), c.y, c.w, 8);
        ctx.fillRect(Math.round(c.x) + 6, c.y - 5, c.w - 14, 5);
      }

      // 远山(视差)
      const par1 = (time * 6) % 64;
      ctx.fillStyle = pal.wall;
      for (const h of hills) {
        const hx = Math.round(((h.x - par1) % (VW + 80)) + ((h.x - par1) % (VW + 80) < -80 ? VW + 80 : 0));
        ctx.fillRect(hx, GROUND_Y - h.h, h.w, h.h);
        ctx.fillRect(hx + 8, GROUND_Y - h.h - 8, h.w - 16, 8);
      }

      // 章节主题景物(交叉淡化)
      drawProps(pal.idx, 1 - pal.mix, time);
      drawProps(pal.next, pal.mix, time);

      // 传送门(右侧脉冲)
      const pulse = 1 + Math.sin(time * 4) * 0.12;
      ctx.save();
      ctx.translate(VW - 46, GROUND_Y - 26);
      ctx.scale(pulse, 1);
      ctx.fillStyle = pal.portal;
      ctx.fillRect(-12, -26, 24, 52);
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillRect(-6, -18, 12, 36);
      ctx.restore();

      // 地面
      ctx.fillStyle = pal.floor;
      ctx.fillRect(0, GROUND_Y, VW, VH - GROUND_Y);
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      const scroll = (time * 46) % 24;
      for (let x = -24; x < VW + 24; x += 24) {
        ctx.fillRect(Math.round(x - scroll), GROUND_Y, 12, 3);
        ctx.fillRect(Math.round(x - scroll + 6), GROUND_Y + 10, 12, 2);
      }
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(0, GROUND_Y, VW, 2);
      // 地面主题细节(草丛/裂缝/雪堆/熔岩纹)
      drawGroundDetail(pal.idx, 1 - pal.mix, time);
      drawGroundDetail(pal.next, pal.mix, time);

      // 玩家(两帧跑步 + 眨眼 + 枪口火光)
      const blink = Math.sin(time * 1.7) > 0.96;
      const runGrid = Math.floor(time * 8) % 2 === 0 ? RUN_A : RUN_B;
      drawGrid(ctx, runGrid, playerColors, playerX, playerY, 2, { blink });
      if (muzzle > 0) {
        ctx.fillStyle = "#FFF3B0";
        ctx.fillRect(playerX + 26, playerY + 15, 5, 5);
        ctx.fillRect(playerX + 31, playerY + 17, 3, 2);
        ctx.fillStyle = "#FFD166";
        ctx.fillRect(playerX + 28, playerY + 13, 2, 2);
        ctx.fillRect(playerX + 28, playerY + 20, 2, 2);
      }
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(playerX + 2, GROUND_Y + 1, 22, 3);

      // 子弹
      for (const b of bullets) {
        ctx.fillStyle = "#FFF3B0";
        ctx.fillRect(Math.round(b.x), Math.round(b.y), 6, 3);
        ctx.fillStyle = pal.portal;
        ctx.fillRect(Math.round(b.x) - 4, Math.round(b.y) + 1, 4, 1);
      }

      // 史莱姆(卡通挤压拉伸)
      for (const s of slimes) {
        const squash = 1 + Math.sin(s.hop) * 0.22;
        const jump = Math.max(0, Math.sin(s.hop)) * 10;
        const colors = makeColors(pal.hazard2, "#333", "rgba(255,255,255,0.9)");
        colors.body = pal.hazard2;
        colors.eye = "#1B1B2A";
        ctx.save();
        ctx.translate(Math.round(s.x), Math.round(s.y - jump));
        ctx.scale(squash, 2 - squash);
        drawGrid(ctx, SLIME_GRID, colors, -12, -16, 2);
        ctx.restore();
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        const sw = 20 * (2 - squash);
        ctx.fillRect(Math.round(s.x - sw / 2), GROUND_Y + 1, Math.round(sw), 3);
      }

      // 金币(旋转 + 落地弹跳)
      for (const c of coins) {
        const w = Math.max(1, Math.round(Math.abs(Math.cos(c.spin)) * 5));
        ctx.globalAlpha = c.life > 0.9 ? 1 - (c.life - 0.9) / 0.25 : 1;
        ctx.fillStyle = "#FFD166";
        ctx.fillRect(Math.round(c.x - w / 2), Math.round(c.y - 3), w, 6);
        ctx.fillStyle = "#B8860B";
        ctx.fillRect(Math.round(c.x - w / 2), Math.round(c.y + 1), w, 2);
        ctx.globalAlpha = 1;
      }

      // 粒子
      for (const p of particles) {
        ctx.globalAlpha = 1 - p.life / p.max;
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        ctx.globalAlpha = 1;
      }

      // 天气(萤火虫/符文微粒/落雪/余烬)
      stepWeather(pal.dominant, dt, time);

      // 漂浮的小星星装饰
      const starColors = makeColors("#FFD166", "#FFD166", "#FFD166");
      starColors.accent = "#FFD166";
      const sy2 = 150 + Math.sin(time * 2.4) * 6;
      drawGrid(ctx, STAR_GRID, starColors, 380, sy2, 2, { shade: false });
      drawGrid(ctx, STAR_GRID, starColors, 300, 120 + Math.cos(time * 2) * 5, 1, { shade: false });

      // 击杀弹出文字
      ctx.font = "8px 'Press Start 2P', monospace";
      for (const p of popups) {
        ctx.globalAlpha = 1 - p.life / 0.8;
        ctx.fillStyle = "#FFF";
        ctx.fillText(p.text, p.x - 10, p.y - p.life * 30);
        ctx.globalAlpha = 1;
      }

      // 通知外层当前章节名(HTML 角标显示,避免被 object-fit 裁切)
      if (pal.name !== lastChapterName) {
        lastChapterName = pal.name;
        chapterCbRef.current?.(pal.name);
      }

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
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-label="CMYS Fight 像素动画场景" />;
}
