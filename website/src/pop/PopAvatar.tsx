import { useEffect, useRef } from "react";

const INK = "#16161A";
const SKIN = "#FFDCC0";

interface Props {
  sprite: string;
  body: string;
  hair: string;
  accent: string;
  hovered?: boolean;
  size?: number;
}

/** 几何拼贴角色头像:圆头 + 形状身体 + 职业道具,悬停时星芒旋转 */
export default function PopAvatar({ sprite, body, hair, accent, hovered, size = 140 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverRef = useRef(false);
  hoverRef.current = !!hovered;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const S = 150;
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;
    let t = Math.random() * 10;
    let spring = 1;
    let springVel = 0;

    function star(cx: number, cy: number, spikes: number, outer: number, inner: number, rot = 0) {
      if (!ctx) return;
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = (Math.PI * i) / spikes + rot;
        if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      ctx.closePath();
    }

    function frame() {
      if (!running || !ctx) return;
      t += 1 / 60;

      const target = hoverRef.current ? 1.1 : 1;
      const accel = (target - spring) * 180 - springVel * 11;
      springVel += accel / 60;
      spring += springVel / 60;

      ctx.clearRect(0, 0, S, S);
      ctx.lineJoin = "round";

      // 悬停:旋转星芒背景
      if (hoverRef.current || spring > 1.02) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, (spring - 1) * 12);
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        star(S / 2, S / 2, 12, 74, 56, t * 0.9);
        ctx.fill();
        ctx.restore();
      }

      // 背景装饰:角落网点 + 小形状
      ctx.fillStyle = "rgba(22,22,26,0.12)";
      for (let y = 8; y < 52; y += 9) {
        for (let x = 8 + ((y / 9) % 2) * 4.5; x < 52; x += 9) {
          ctx.beginPath();
          ctx.arc(x, y, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.save();
      ctx.translate(S - 20, 22);
      ctx.rotate(Math.sin(t * 1.4) * 0.4);
      ctx.fillStyle = accent;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(8.5, 6.5);
      ctx.lineTo(-8.5, 6.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      const bob = Math.sin(t * 2.4) * 3;
      const rot = Math.sin(t * 1.6) * 0.035;
      const blink = Math.sin(t * 1.8 + 0.7) > 0.965;

      ctx.save();
      ctx.translate(S / 2, S / 2 + 12 + bob);
      ctx.rotate(rot);
      ctx.scale(spring, spring);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4;

      const headR = 26;
      const headY = -26;

      // ---- 身体(按职业换形状) ----
      ctx.fillStyle = body;
      if (sprite === "robe") {
        // 法师:三角长袍
        ctx.beginPath();
        ctx.moveTo(0, headY + headR - 6);
        ctx.lineTo(30, 46);
        ctx.lineTo(-30, 46);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (sprite === "armor") {
        // 骑士:方块重甲
        ctx.fillRect(-24, headY + headR - 4, 48, 46);
        ctx.strokeRect(-24, headY + headR - 4, 48, 46);
        ctx.fillStyle = accent;
        ctx.fillRect(-24, headY + headR + 14, 48, 8);
        ctx.strokeRect(-24, headY + headR + 14, 48, 8);
      } else {
        // 圆润胶囊身体
        ctx.beginPath();
        ctx.roundRect(-22, headY + headR - 4, 44, 48, 14);
        ctx.fill();
        ctx.stroke();
      }

      // ---- 头 ----
      ctx.fillStyle = SKIN;
      ctx.beginPath();
      ctx.arc(0, headY, headR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // ---- 发型 / 头饰 ----
      ctx.fillStyle = hair;
      if (sprite === "armor") {
        ctx.beginPath();
        ctx.arc(0, headY - 4, headR + 3, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = accent;
        ctx.fillRect(-4, headY - headR - 16, 8, 16);
        ctx.strokeRect(-4, headY - headR - 16, 8, 16);
      } else if (sprite === "robe") {
        ctx.beginPath();
        ctx.moveTo(0, headY - headR - 22);
        ctx.lineTo(headR + 8, headY - 4);
        ctx.lineTo(-headR - 8, headY - 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (sprite === "hood") {
        ctx.beginPath();
        ctx.arc(0, headY + 2, headR + 6, Math.PI * 0.95, Math.PI * 2.05);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (sprite === "girl_rifle" || sprite === "girl_mic" || sprite === "girl") {
        ctx.beginPath();
        ctx.arc(0, headY - 6, headR + 2, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // 双马尾
        ctx.beginPath();
        ctx.arc(-headR - 8, headY + 4, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(headR + 8, headY + 4, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (sprite === "star") {
        ctx.beginPath();
        ctx.arc(0, headY - 6, headR + 2, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#FFC800";
        star(0, headY - headR - 12, 5, 10, 4.5, -Math.PI / 2 + Math.sin(t * 2) * 0.15);
        ctx.fill();
        ctx.stroke();
      } else if (sprite === "blade") {
        // 立发三簇
        for (const dx of [-14, 0, 14]) {
          ctx.beginPath();
          ctx.moveTo(dx, headY - headR - 14);
          ctx.lineTo(dx + 9, headY - headR + 8);
          ctx.lineTo(dx - 9, headY - headR + 8);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      } else if (sprite === "fist") {
        ctx.beginPath();
        ctx.arc(0, headY - 5, headR + 2, Math.PI * 0.9, Math.PI * 2.1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // ---- 脸 ----
      ctx.fillStyle = INK;
      if (blink) {
        ctx.fillRect(-13, headY + 2, 8, 3);
        ctx.fillRect(5, headY + 2, 8, 3);
      } else {
        ctx.beginPath();
        ctx.arc(-9, headY + 3, 3.6, 0, Math.PI * 2);
        ctx.arc(9, headY + 3, 3.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, headY + 9, 7, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
      ctx.lineWidth = 4;

      // 腮红
      ctx.fillStyle = "rgba(255,92,168,0.5)";
      ctx.beginPath();
      ctx.arc(-17, headY + 10, 4, 0, Math.PI * 2);
      ctx.arc(17, headY + 10, 4, 0, Math.PI * 2);
      ctx.fill();

      // ---- 职业道具 ----
      ctx.fillStyle = "#DDE5EC";
      if (sprite === "girl_rifle") {
        ctx.save();
        ctx.rotate(-0.2);
        ctx.fillRect(6, 16, 36, 7);
        ctx.strokeRect(6, 16, 36, 7);
        ctx.restore();
      } else if (sprite === "girl_mic") {
        ctx.fillRect(24, 8, 5, 22);
        ctx.strokeRect(24, 8, 5, 22);
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(26.5, 4, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // 音符
        ctx.fillStyle = INK;
        const ny = -46 + Math.sin(t * 3) * 4;
        ctx.beginPath();
        ctx.arc(38, ny, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(41, ny - 16, 3, 16);
      } else if (sprite === "blade") {
        ctx.save();
        ctx.rotate(0.5);
        ctx.fillRect(26, -10, 7, 40);
        ctx.strokeRect(26, -10, 7, 40);
        ctx.fillStyle = accent;
        ctx.fillRect(22, 28, 15, 7);
        ctx.strokeRect(22, 28, 15, 7);
        ctx.restore();
      } else if (sprite === "fist") {
        ctx.fillStyle = accent;
        for (const dx of [-34, 34]) {
          ctx.beginPath();
          ctx.arc(dx, 22, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      } else if (sprite === "armor") {
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(-32, 20, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.arc(-32, 20, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (sprite === "robe") {
        ctx.fillRect(28, -18, 5, 52);
        ctx.strokeRect(28, -18, 5, 52);
        ctx.fillStyle = "#FFC800";
        star(30.5, -26, 5, 9, 4, Math.sin(t * 2.2) * 0.3);
        ctx.fill();
        ctx.stroke();
      } else if (sprite === "hood") {
        ctx.save();
        ctx.rotate(-0.45);
        ctx.fillRect(-40, 20, 22, 6);
        ctx.strokeRect(-40, 20, 22, 6);
        ctx.restore();
      } else if (sprite === "star") {
        ctx.strokeStyle = "#FFC800";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, headY, headR + 14, 0.15 * Math.PI + t * 0.8, 0.85 * Math.PI + t * 0.8);
        ctx.stroke();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 4;
      }

      ctx.restore();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [sprite, body, hair, accent]);

  return <canvas ref={canvasRef} style={{ width: size, height: size }} aria-hidden />;
}
