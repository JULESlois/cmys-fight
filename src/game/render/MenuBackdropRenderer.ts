export type MenuBackdropVariant = "title" | "hub" | "archive" | "result";

const ACCENTS: Record<MenuBackdropVariant, string> = {
  title: "#00F2FE",
  hub: "#F1C40F",
  archive: "#B388FF",
  result: "#FF6B6B",
};

export class MenuBackdropRenderer {
  static draw(
    ctx: CanvasRenderingContext2D,
    variant: MenuBackdropVariant,
    time: number,
    lowFx = false,
  ) {
    const accent = ACCENTS[variant];
    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, variant === "hub" ? "#111827" : "#070B13");
    gradient.addColorStop(0.58, variant === "archive" ? "#151026" : "#0B1320");
    gradient.addColorStop(1, "#030509");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 320, 240);

    // Distant monolithic ruins.
    ctx.fillStyle = "rgba(18, 28, 43, 0.9)";
    const skyline = [18, 44, 72, 104, 126, 154, 184, 211, 244, 274, 302];
    skyline.forEach((x, index) => {
      const height = 26 + ((index * 17) % 46);
      const width = 12 + ((index * 7) % 15);
      ctx.fillRect(x - width / 2, 184 - height, width, height + 30);
      ctx.fillStyle = "rgba(39, 57, 78, 0.45)";
      ctx.fillRect(Math.floor(x - width / 2) + 2, 187 - height, 2, Math.max(4, height - 7));
      ctx.fillStyle = "rgba(18, 28, 43, 0.9)";
    });

    // Central memory gate.
    const pulse = lowFx ? 1 : 0.88 + Math.sin(time * 1.8) * 0.08;
    ctx.save();
    ctx.translate(160, 118);
    ctx.globalAlpha = 0.24 * pulse;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 0, 42, Math.PI, 0);
    ctx.lineTo(42, 48);
    ctx.lineTo(-42, 48);
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 0.12 * pulse;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 2, 32, Math.PI, 0);
    ctx.lineTo(32, 47);
    ctx.lineTo(-32, 47);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Perspective floor lines.
    ctx.strokeStyle = `rgba(${variant === "hub" ? "241,196,15" : variant === "archive" ? "179,136,255" : "0,242,254"},0.075)`;
    ctx.lineWidth = 1;
    for (let i = -7; i <= 7; i++) {
      ctx.beginPath();
      ctx.moveTo(160 + i * 8, 164);
      ctx.lineTo(160 + i * 34, 240);
      ctx.stroke();
    }
    for (let y = 168; y < 240; y += 12) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(320, y);
      ctx.stroke();
    }

    if (!lowFx) {
      ctx.fillStyle = accent;
      for (let i = 0; i < 24; i++) {
        const seed = (i * 97) % 313;
        const x = (seed + Math.floor(time * (3 + i % 4))) % 320;
        const y = 30 + ((i * 43 + Math.floor(time * 5)) % 145);
        ctx.globalAlpha = 0.08 + (i % 4) * 0.025;
        ctx.fillRect(x, y, i % 5 === 0 ? 2 : 1, 1);
      }
      ctx.globalAlpha = 1;
    }
  }
}
