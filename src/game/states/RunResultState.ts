import { Engine } from "../Engine";
import { getStageLabel, createRunProgressFromGlobalStage } from "../RunProgress";
import type { RunSummary } from "../RunStats";
import { MenuRenderer } from "../render/MenuRenderer";
import { drawPixelButton, UI_COLORS } from "../render/PixelUi";
import { cursorPulse } from "../ui/UiMotion";
import { audio } from "../audio/AudioManager";
import { GameState } from "./GameState";
import { ACHIEVEMENTS, type AchievementId } from "../AchievementSystem";
import { CHALLENGES } from "../ChallengeSystem";
import { getAchievementText, getChallengeText, t, uiFont } from "../i18n";

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
      baseReward: 0,
      challengeReward: 0,
      achievementReward: 0,
      newAchievements: [],
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
    if (this.engine.input.wasUiPressed("confirm")) {
      audio.playUiConfirm();
      this.engine.switchState("hub", { spawnAnchor: "rebirth_spring" });
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const summary = this.summary;
    if (!summary) return;

    const victory = summary.outcome === "victory";
    const language = this.engine.data.settings.language;
    const reducedFlashing = this.engine.data.settings.reducedFlashing === true;
    const time = Date.now() / 1000;
    ctx.fillStyle = UI_COLORS.backdrop;
    ctx.fillRect(0, 0, 320, 240);

    ctx.strokeStyle = victory ? "rgba(241, 196, 15, 0.12)" : "rgba(232, 91, 101, 0.12)";
    for (let x = -20; x < 340; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 120, 240);
      ctx.stroke();
    }

    MenuRenderer.drawTitle(ctx, t(language, victory ? "result.complete" : "result.terminated"), 160, 30, language);
    ctx.textAlign = "center";
    ctx.fillStyle = victory ? UI_COLORS.yellow : UI_COLORS.red;
    ctx.font = uiFont(language, 12, true);
    ctx.fillText(t(language, victory ? "result.victoryLine" : "result.defeatLine"), 160, 50);
    if (this.engine.data.data.run.hardMode) {
      ctx.fillStyle = UI_COLORS.red;
      ctx.font = uiFont(language, 6, true);
      ctx.fillText(t(language, "result.hardBonus"), 160, 59);
    }

    ctx.fillStyle = UI_COLORS.panel;
    ctx.strokeStyle = victory ? UI_COLORS.yellow : UI_COLORS.red;
    ctx.fillRect(48, 64, 224, 112);
    ctx.strokeRect(48, 64, 224, 112);

    const stage = getStageLabel(createRunProgressFromGlobalStage(summary.highestStage));
    const rows: Array<[string, string]> = [
      [t(language, "result.time"), formatTime(summary.elapsedSeconds)],
      [t(language, "result.stage"), stage],
      [t(language, "result.rooms"), String(summary.stagesCleared)],
      [t(language, "result.enemies"), String(summary.kills)],
      [t(language, "result.elites"), String(summary.eliteKills)],
      [t(language, "result.bosses"), String(summary.bossKills)],
    ];

    ctx.font = uiFont(language, 8);
    rows.forEach(([label, value], index) => {
      const y = 79 + index * 13;
      ctx.textAlign = "left";
      ctx.fillStyle = UI_COLORS.muted;
      ctx.fillText(label, 62, y);
      ctx.textAlign = "right";
      ctx.fillStyle = UI_COLORS.white;
      ctx.fillText(value, 258, y);
    });

    ctx.textAlign = "center";
    ctx.fillStyle = UI_COLORS.cyan;
    ctx.font = uiFont(language, 10, true);
    const rewardLabel = summary.alreadyClaimed
      ? t(language, "result.claimed")
      : t(language, "result.reward", { amount: summary.rewardEarned });
    ctx.fillText(rewardLabel, 160, 163);
    ctx.fillStyle = UI_COLORS.text;
    ctx.font = uiFont(language, 7);
    ctx.fillText(t(language, "result.total", { amount: summary.totalCurrency }), 160, 173);

    if (!summary.alreadyClaimed) {
      ctx.fillStyle = UI_COLORS.muted;
      ctx.font = uiFont(language, 6);
      ctx.fillText(t(language, "result.breakdown", {
        run: summary.baseReward,
        challenge: summary.challengeReward,
        achievement: summary.achievementReward,
      }), 160, 182);
    }

    if (summary.challengeCompleted && this.engine.data.data.run.challengeId) {
      const challenge = CHALLENGES[this.engine.data.data.run.challengeId];
      const localized = getChallengeText(challenge.id, challenge, language);
      ctx.fillStyle = UI_COLORS.yellow;
      ctx.font = uiFont(language, 7, true);
      ctx.fillText(t(language, "result.challenge", { name: localized.name }), 160, 191);
    }

    const achievementNames = summary.newAchievements
      .map(id => {
        const achievement = ACHIEVEMENTS[id as AchievementId];
        return achievement ? getAchievementText(achievement.id, achievement, language).name : undefined;
      })
      .filter(Boolean);
    const notices = [...achievementNames, ...summary.newUnlocks];
    if (notices.length > 0) {
      ctx.fillStyle = UI_COLORS.green;
      ctx.font = uiFont(language, 7, true);
      const firstLine = notices.slice(0, 2).join(" / ");
      const secondLine = notices.slice(2, 4).join(" / ");
      ctx.fillText(t(language, "result.unlocked", { items: firstLine }), 160, 200);
      if (secondLine) ctx.fillText(secondLine, 160, 209);
    }

    drawPixelButton(ctx, 105, 214, 110, 17, true, victory ? "yellow" : "cyan", cursorPulse(time, reducedFlashing));
    ctx.fillStyle = UI_COLORS.white;
    ctx.font = uiFont(language, 7, true);
    ctx.fillText(t(language, "result.hubButton"), 160, 226);
    ctx.fillStyle = UI_COLORS.muted;
    ctx.font = uiFont(language, 6);
    ctx.fillText(t(language, "result.footer", {
      confirm: this.engine.input.getConfirmPrompt(),
    }), 160, 238);
    ctx.textAlign = "left";
  }
}

