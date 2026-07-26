import { useEffect, useRef, useState } from "react";
import type { CharacterInfo } from "../content";
import { SLOTS, SLOT_HINT, WORLDS, worldOfCollection } from "./assets";

type LoadState = "loading" | "ok" | "missing";

/**
 * 角色视觉。
 * 优先加载 public/assets/characters/<id>.png;
 * 缺图时回退到程序化生成的「全息档案卡」占位图。
 */
export default function CharacterVisual({
  char,
  variant = "card",
}: {
  char: CharacterInfo;
  variant?: "card" | "tall";
}) {
  const src = SLOTS.character(char.id);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => setState("loading"), [src]);

  return (
    <div className={`asset-slot asset-slot--${variant}`}>
      {state !== "ok" && <ArchivePlaceholder char={char} />}
      <img
        className="asset-slot__img"
        style={{ opacity: state === "ok" ? 1 : 0 }}
        src={src}
        alt={char.name}
        loading="lazy"
        decoding="async"
        onLoad={() => setState("ok")}
        onError={() => setState("missing")}
      />
    </div>
  );
}

/* ============================================================
   全息档案卡占位图
   ============================================================ */

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** 按角色类型画一个动漫感剪影胸像 */
function drawBust(ctx: CanvasRenderingContext2D, w: number, h: number, sprite: string) {
  const cx = w / 2;
  const headR = w * 0.135;
  const headCy = h * 0.44;
  const shoulderY = h * 0.68;
  const sw = w * 0.27;
  const nw = w * 0.052;

  ctx.beginPath();
  // 肩
  ctx.moveTo(cx - sw, h);
  ctx.quadraticCurveTo(cx - sw * 1.02, shoulderY + h * 0.02, cx - sw * 0.42, shoulderY - h * 0.005);
  ctx.quadraticCurveTo(cx - nw * 1.5, shoulderY - h * 0.02, cx - nw, shoulderY - h * 0.045);
  // 颈
  ctx.lineTo(cx - nw, headCy + headR * 0.52);
  ctx.lineTo(cx + nw, headCy + headR * 0.52);
  ctx.lineTo(cx + nw, shoulderY - h * 0.045);
  ctx.quadraticCurveTo(cx + nw * 1.5, shoulderY - h * 0.02, cx + sw * 0.42, shoulderY - h * 0.005);
  ctx.quadraticCurveTo(cx + sw * 1.02, shoulderY + h * 0.02, cx + sw, h);
  ctx.closePath();
  ctx.fill();

  // 头
  ctx.beginPath();
  ctx.ellipse(cx, headCy, headR * 0.94, headR * 1.12, 0, 0, Math.PI * 2);
  ctx.fill();

  // 发型 / 头饰
  ctx.beginPath();
  if (sprite === "robe") {
    // 尖顶法帽
    ctx.moveTo(cx, headCy - headR * 3.1);
    ctx.quadraticCurveTo(cx + headR * 1.3, headCy - headR * 0.9, cx + headR * 1.9, headCy - headR * 0.35);
    ctx.lineTo(cx - headR * 1.9, headCy - headR * 0.35);
    ctx.quadraticCurveTo(cx - headR * 1.3, headCy - headR * 0.9, cx, headCy - headR * 3.1);
  } else if (sprite === "armor") {
    // 带羽饰头盔
    ctx.ellipse(cx, headCy - headR * 0.36, headR * 1.14, headR * 1.0, 0, Math.PI, 0);
    ctx.rect(cx - headR * 0.16, headCy - headR * 2.5, headR * 0.32, headR * 1.2);
  } else if (sprite === "hood") {
    // 兜帽
    ctx.ellipse(cx, headCy - headR * 0.05, headR * 1.42, headR * 1.42, 0, Math.PI * 0.94, Math.PI * 2.06);
  } else if (sprite === "blade") {
    // 立发三簇
    for (const dx of [-1, 0, 1]) {
      ctx.moveTo(cx + dx * headR * 0.72, headCy - headR * 2.35);
      ctx.lineTo(cx + dx * headR * 0.72 + headR * 0.46, headCy - headR * 0.75);
      ctx.lineTo(cx + dx * headR * 0.72 - headR * 0.46, headCy - headR * 0.75);
    }
  } else if (sprite === "girl_rifle" || sprite === "girl_mic" || sprite === "girl" || sprite === "star") {
    // 双马尾
    ctx.ellipse(cx, headCy - headR * 0.28, headR * 1.16, headR * 1.16, 0, Math.PI, 0);
    ctx.ellipse(cx - headR * 1.42, headCy + headR * 0.5, headR * 0.44, headR * 1.5, 0.18, 0, Math.PI * 2);
    ctx.ellipse(cx + headR * 1.42, headCy + headR * 0.5, headR * 0.44, headR * 1.5, -0.18, 0, Math.PI * 2);
    if (sprite === "star") {
      ctx.moveTo(cx, headCy - headR * 2.5);
      ctx.lineTo(cx + headR * 0.42, headCy - headR * 1.72);
      ctx.lineTo(cx - headR * 0.42, headCy - headR * 1.72);
    }
  } else {
    // 短发
    ctx.ellipse(cx, headCy - headR * 0.2, headR * 1.12, headR * 1.12, 0, Math.PI * 0.98, Math.PI * 2.02);
  }
  ctx.fill();
}

function ArchivePlaceholder({ char }: { char: CharacterInfo }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const world = worldOfCollection(char.collection);
  const meta = WORLDS[world];

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 460;
    const H = 620;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const accent = char.color;
    const worldAccent = meta.accent;
    const dark = world === "string" ? "#0A1826" : "#0B0714";

    // ---- 背景:双色网状渐变 ----
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, W, H);

    const g1 = ctx.createRadialGradient(W * 0.28, H * 0.3, 10, W * 0.28, H * 0.3, W * 0.95);
    g1.addColorStop(0, rgba(accent, 0.55));
    g1.addColorStop(0.55, rgba(accent, 0.12));
    g1.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    const g2 = ctx.createRadialGradient(W * 0.82, H * 0.78, 10, W * 0.82, H * 0.78, W * 0.9);
    g2.addColorStop(0, rgba(worldAccent, 0.42));
    g2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);

    // ---- 技术网格 ----
    ctx.strokeStyle = "rgba(255,255,255,0.055)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(W, y + 0.5);
      ctx.stroke();
    }

    // ---- 巨大幽灵首字母 ----
    const initial = (char.name.match(/[A-Za-z]/)?.[0] ?? char.name[0] ?? "?").toUpperCase();
    ctx.save();
    ctx.font = "900 380px 'Orbitron','Chakra Petch',sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fillText(initial, W / 2, H * 0.44);
    ctx.strokeStyle = rgba(worldAccent, 0.18);
    ctx.lineWidth = 2;
    ctx.strokeText(initial, W / 2, H * 0.44);
    ctx.restore();

    // ---- 剪影胸像 ----
    ctx.save();
    ctx.shadowColor = rgba(worldAccent, 0.95);
    ctx.shadowBlur = 42;
    const bustGrad = ctx.createLinearGradient(0, H * 0.24, 0, H);
    bustGrad.addColorStop(0, rgba(accent, 0.98));
    bustGrad.addColorStop(0.5, rgba(accent, 0.55));
    bustGrad.addColorStop(1, rgba(dark, 0.9));
    ctx.fillStyle = bustGrad;
    drawBust(ctx, W, H, char.sprite);
    ctx.restore();

    // 内层压暗,留出发光轮廓
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    const inner = ctx.createLinearGradient(0, H * 0.3, 0, H);
    inner.addColorStop(0, "rgba(0,0,0,0.18)");
    inner.addColorStop(1, "rgba(0,0,0,0.72)");
    ctx.fillStyle = inner;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // 左侧边缘光
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(-3, -2);
    ctx.fillStyle = rgba("#FFFFFF", 0.16);
    drawBust(ctx, W, H, char.sprite);
    ctx.restore();

    // ---- 扫描线 ----
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1.4);

    // ---- 角标 / 技术信息 ----
    ctx.strokeStyle = rgba(worldAccent, 0.85);
    ctx.lineWidth = 2;
    const m = 16;
    const c = 26;
    ctx.beginPath();
    ctx.moveTo(m, m + c);
    ctx.lineTo(m, m);
    ctx.lineTo(m + c, m);
    ctx.moveTo(W - m - c, m);
    ctx.lineTo(W - m, m);
    ctx.lineTo(W - m, m + c);
    ctx.moveTo(W - m, H - m - c);
    ctx.lineTo(W - m, H - m);
    ctx.lineTo(W - m - c, H - m);
    ctx.moveTo(m + c, H - m);
    ctx.lineTo(m, H - m);
    ctx.lineTo(m, H - m - c);
    ctx.stroke();

    // 世界标签由卡片 CSS 徽章负责,画布这里只留档案编号
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "400 11px 'Chakra Petch',monospace";
    ctx.fillText(`NO.${String(char.id).toUpperCase().slice(0, 10)}`, m + 12, m + 27);

    // 底部槽位提示
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(m, H - m - 40, W - m * 2, 26);
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(m + 0.5, H - m - 39.5, W - m * 2 - 1, 25);
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,255,255,0.62)";
    ctx.font = "400 11px 'Chakra Petch',monospace";
    ctx.fillText(`◈ 素材槽位  ${SLOT_HINT.character(char.id)}`, m + 9, H - m - 22);
  }, [char, world, meta]);

  return <canvas ref={ref} className="asset-slot__canvas" aria-hidden />;
}
