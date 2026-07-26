import { useEffect, useRef } from "react";

const INK = "#16161A";

/** 波普风特色图标:粗描边扁平几何 + 轻微摇摆 */
export default function PopIcon({ icon, color }: { icon: string; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const S = 72;
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;
    let t = Math.random() * 6;

    function frame() {
      if (!running || !ctx) return;
      t += 1 / 60;
      ctx.clearRect(0, 0, S, S);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      ctx.save();
      ctx.translate(S / 2, S / 2 + Math.sin(t * 2.6) * 2);
      ctx.rotate(Math.sin(t * 2) * 0.07);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4;
      ctx.fillStyle = color;

      if (icon === "sword") {
        ctx.save();
        ctx.rotate(-Math.PI / 4);
        ctx.fillRect(-4, -30, 8, 40);
        ctx.strokeRect(-4, -30, 8, 40);
        ctx.beginPath();
        ctx.moveTo(-4, -30);
        ctx.lineTo(0, -38);
        ctx.lineTo(4, -30);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#DDE5EC";
        ctx.fillRect(-13, 10, 26, 7);
        ctx.strokeRect(-13, 10, 26, 7);
        ctx.fillRect(-3, 17, 6, 12);
        ctx.strokeRect(-3, 17, 6, 12);
        ctx.restore();
      } else if (icon === "map") {
        ctx.fillRect(-26, -20, 52, 40);
        ctx.strokeRect(-26, -20, 52, 40);
        ctx.strokeStyle = "#fff";
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(-18, 12);
        ctx.quadraticCurveTo(-4, -18, 12, -2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(12, -8);
        ctx.lineTo(20, 0);
        ctx.moveTo(20, -8);
        ctx.lineTo(12, 0);
        ctx.stroke();
        ctx.lineWidth = 4;
      } else if (icon === "hub") {
        ctx.beginPath();
        ctx.moveTo(0, -28);
        ctx.lineTo(26, -6);
        ctx.lineTo(26, 24);
        ctx.lineTo(-26, 24);
        ctx.lineTo(-26, -6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.fillRect(-7, 6, 14, 18);
        ctx.strokeRect(-7, 6, 14, 18);
        ctx.beginPath();
        ctx.arc(0, -8, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (icon === "pad") {
        ctx.beginPath();
        ctx.roundRect(-28, -14, 56, 30, 14);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-16, 1);
        ctx.moveTo(-22, 1);
        ctx.lineTo(-10, 1);
        ctx.moveTo(-16, -5);
        ctx.lineTo(-16, 7);
        ctx.stroke();
        ctx.lineWidth = 4;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(13, -4, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(22, 4, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (icon === "disk") {
        ctx.fillRect(-24, -24, 48, 48);
        ctx.strokeRect(-24, -24, 48, 48);
        ctx.fillStyle = "#fff";
        ctx.fillRect(-14, -24, 28, 16);
        ctx.strokeRect(-14, -24, 28, 16);
        ctx.fillStyle = INK;
        ctx.fillRect(4, -21, 7, 10);
        ctx.fillStyle = "#fff";
        ctx.fillRect(-16, 2, 32, 22);
        ctx.strokeRect(-16, 2, 32, 22);
      } else {
        // music:音符
        ctx.beginPath();
        ctx.ellipse(-10, 16, 10, 8, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(16, 10, 10, 8, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-1, 14);
        ctx.lineTo(-1, -22);
        ctx.lineTo(25, -28);
        ctx.lineTo(25, 8);
        ctx.stroke();
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
  }, [icon, color]);

  return <canvas ref={canvasRef} style={{ width: 72, height: 72 }} aria-hidden />;
}
