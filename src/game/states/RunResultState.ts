import { Engine } from "../Engine";
import { getStageLabel, createRunProgressFromGlobalStage } from "../RunProgress";
import type { RunSummary } from "../RunStats";
import { MenuRenderer } from "../render/MenuRenderer";
import { GameState } from "./GameState";

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export class RunResultState extends GameState {
  private summary: RunSummary | null = null;

  constructor(engine: Engine) {
    super(engine);
  }

  enter(params?: { summary?: RunSummary }) {
    this.summary = params?.summary ?? {
      ...this.engine.data.data.runStats,
      rewardEarned: 0,
      totalCurrency: this.engine.data.meta.currency,
      newUnlocks: [],
      alreadyClaimed: true,
    };
  }

  exit() {
    this.summary = null;
  }

  update() {
    if (this.engine.input.wasPressed("enter") || this.engine.input.wasPressed(" ")) {
      this.engine.switchState("title");
    } else if (this.engine.input.wasPressed("r")) {
      this.engine.switchState("hub");
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const summary = this.summary;
    if (!summary) return;

    const victory = summary.outcome === "victory";
    ctx.fillStyle = "#080D16";
    ctx.fillRect(0, 0, 320, 240);

    ctx.strokeStyle = victory ? "rgba(241, 196, 15, 0.12)" : "rgba(231, 76, 60, 0.12)";
    for (let x = -20; x < 340; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 120, 240);
      ctx.stroke();
    }

    MenuRenderer.drawTitle(ctx, victory ? "RUN COMPLETE" : "RUN TERMINATED", 160, 30);
    ctx.textAlign = "center";
    ctx.fillStyle = victory ? "#F1C40F" : "#E74C3C";
    ctx.font = "bold 12px monospace";
    ctx.fillText(victory ? "THE CORE HAS FALLEN" : "THE DELVE CLAIMED YOU", 160, 50);
    if (this.engine.data.data.run.hardMode) {
      ctx.fillStyle = "#E74C3C";
      ctx.font = "bold 6px monospace";
      ctx.fillText("HARD MODE // SOUL SHARDS x1.5", 160, 59);
    }

    ctx.fillStyle = "rgba(10, 15, 25, 0.92)";
    ctx.strokeStyle = victory ? "#F1C40F" : "#E74C3C";
    ctx.fillRect(48, 64, 224, 112);
    ctx.strokeRect(48, 64, 224, 112);

    const stage = getStageLabel(createRunProgressFromGlobalStage(summary.highestStage));
    const rows: Array<[string, string]> = [
      ["TIME", formatTime(summary.elapsedSeconds)],
      ["FURTHEST STAGE", stage],
      ["ROOMS CLEARED", String(summary.stagesCleared)],
      ["ENEMIES", String(summary.kills)],
      ["ELITES", String(summary.eliteKills)],
      ["BOSSES", String(summary.bossKills)],
    ];

    ctx.font = "8px monospace";
    rows.forEach(([label, value], index) => {
      const y = 79 + index * 13;
      ctx.textAlign = "left";
      ctx.fillStyle = "#7F8C8D";
      ctx.fillText(label, 62, y);
      ctx.textAlign = "right";
      ctx.fillStyle = "#ECF0F1";
      ctx.fillText(value, 258, y);
    });

    ctx.textAlign = "center";
    ctx.fillStyle = "#00F2FE";
    ctx.font = "bold 10px monospace";
    const rewardLabel = summary.alreadyClaimed ? "REWARD ALREADY CLAIMED" : `+${summary.rewardEarned} SOUL SHARDS`;
    ctx.fillText(rewardLabel, 160, 163);
    ctx.fillStyle = "#BDC3C7";
    ctx.font = "7px monospace";
    ctx.fillText(`TOTAL SHARDS: ${summary.totalCurrency}`, 160, 173);

    if (summary.newUnlocks.length > 0) {
      ctx.fillStyle = "#2ECC71";
      ctx.font = "bold 7px monospace";
      const firstLine = summary.newUnlocks.slice(0, 2).join(" / ");
      const secondLine = summary.newUnlocks.slice(2, 4).join(" / ");
      ctx.fillText(`UNLOCKED: ${firstLine}`, 160, 187);
      if (secondLine) ctx.fillText(secondLine, 160, 197);
    }

    ctx.fillStyle = "#00F2FE";
    ctx.font = "bold 8px monospace";
    ctx.fillText("ENTER: TITLE", 160, 214);
    ctx.fillStyle = "#7F8C8D";
    ctx.font = "7px monospace";
    ctx.fillText("R: NEW RUN", 160, 228);
    ctx.textAlign = "left";
  }
}

