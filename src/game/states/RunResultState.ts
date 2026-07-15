import { Engine } from "../Engine";
import { getStageLabel, createRunProgressFromGlobalStage } from "../RunProgress";
import type { RunSummary } from "../RunStats";
import { MenuRenderer } from "../render/MenuRenderer";
import { GameState } from "./GameState";
import { ACHIEVEMENTS, type AchievementId } from "../AchievementSystem";
import { CHALLENGES } from "../ChallengeSystem";
import { getAchievementText, getChallengeText, t, uiFont } from "../i18n";
import { drawBadge, drawPixelPanel, drawSectionLabel, UI_COLORS } from "../render/PixelUi";
import { SpriteRenderer } from "../render/SpriteRenderer";

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
    if (this.engine.input.wasUiPressed("confirm")) this.engine.switchState("hub");
  }

  draw(ctx: CanvasRenderingContext2D) {
    const summary = this.summary;
    if (!summary) return;

    const victory = summary.outcome === "victory";
    const language = this.engine.data.settings.language;
    ctx.fillStyle = UI_COLORS.backdrop;
    ctx.fillRect(0, 0, 320, 240);

    ctx.strokeStyle = victory ? "rgba(241, 196, 15, 0.12)" : "rgba(231, 76, 60, 0.12)";
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
      ctx.fillStyle = "#E74C3C";
      ctx.font = uiFont(language, 6, true);
      ctx.fillText(t(language, "result.hardBonus"), 160, 59);
    }

    drawPixelPanel(ctx, 22, 61, 132, 121, victory ? "yellow" : "red", true);
    drawSectionLabel(ctx, "RUN SUMMARY", 31, 76, 114, language, victory ? "yellow" : "red");

    const stage = getStageLabel(createRunProgressFromGlobalStage(summary.highestStage));
    const rows: Array<[string, string]> = [
      [t(language, "result.time"), formatTime(summary.elapsedSeconds)],
      [t(language, "result.stage"), stage],
      [t(language, "result.rooms"), String(summary.stagesCleared)],
      [t(language, "result.enemies"), String(summary.kills)],
      [t(language, "result.elites"), String(summary.eliteKills)],
      [t(language, "result.bosses"), String(summary.bossKills)],
    ];

    ctx.font = uiFont(language, 7);
    rows.forEach(([label, value], index) => {
      const y = 91 + index * 14;
      ctx.textAlign = "left";
      ctx.fillStyle = UI_COLORS.muted;
      ctx.fillText(label, 31, y);
      ctx.textAlign = "right";
      ctx.fillStyle = UI_COLORS.white;
      ctx.fillText(value, 145, y);
    });

    drawPixelPanel(ctx, 164, 61, 134, 121, "cyan", true);
    drawSectionLabel(ctx, "FINAL BUILD", 173, 76, 116, language, "cyan");
    const player = this.engine.data.data.player;
    ctx.textAlign = "left";
    ctx.fillStyle = UI_COLORS.white;
    ctx.font = uiFont(language, 8, true);
    ctx.fillText(String(player.characterId ?? "UNKNOWN").toUpperCase(), 173, 92);
    ctx.fillStyle = UI_COLORS.muted;
    ctx.font = uiFont(language, 6, true);
    ctx.fillText(`LV ${player.level ?? 1}`, 173, 104);
    const weaponId = player.currentWeaponId;
    if (weaponId) {
      ctx.fillStyle = UI_COLORS.dark;
      ctx.fillRect(173, 112, 116, 34);
      ctx.strokeStyle = UI_COLORS.cyan;
      ctx.strokeRect(173, 112, 116, 34);
      SpriteRenderer.drawPixelSprite(ctx, `weapon_${weaponId}`, 195, 131, 1);
      ctx.fillStyle = UI_COLORS.white;
      ctx.font = uiFont(language, 6, true);
      ctx.fillText(String(weaponId).replaceAll("_", " ").toUpperCase().slice(0, 16), 214, 132);
    }
    const buildBuffs = (player.buffs ?? []).slice(0, 6);
    buildBuffs.forEach((buffId: string, index: number) => {
      const x = 173 + (index % 3) * 39;
      const y = 153 + Math.floor(index / 3) * 13;
      drawBadge(ctx, String(buffId).slice(0, 5).toUpperCase(), x, y, 35, language, "purple");
    });

    drawPixelPanel(ctx, 22, 186, 276, 43, "green", true);
    ctx.textAlign = "left";
    ctx.fillStyle = UI_COLORS.green;
    ctx.font = uiFont(language, 9, true);
    const rewardLabel = summary.alreadyClaimed
      ? t(language, "result.claimed")
      : t(language, "result.reward", { amount: summary.rewardEarned });
    ctx.fillText(rewardLabel, 34, 199);
    ctx.fillStyle = UI_COLORS.text;
    ctx.font = uiFont(language, 6);
    ctx.fillText(t(language, "result.total", { amount: summary.totalCurrency }), 34, 212);

    if (!summary.alreadyClaimed) {
      ctx.textAlign = "center";
      ctx.fillStyle = UI_COLORS.muted;
      ctx.font = uiFont(language, 6);
      ctx.fillText(t(language, "result.breakdown", {
        run: summary.baseReward,
        challenge: summary.challengeReward,
        achievement: summary.achievementReward,
      }), 160, 223);
    }

    if (summary.challengeCompleted && this.engine.data.data.run.challengeId) {
      const challenge = CHALLENGES[this.engine.data.data.run.challengeId];
      const localized = getChallengeText(challenge.id, challenge, language);
      ctx.fillStyle = UI_COLORS.yellow;
      ctx.font = uiFont(language, 6, true);
      ctx.textAlign = "right";
      ctx.fillText(t(language, "result.challenge", { name: localized.name }), 286, 199);
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
      ctx.font = uiFont(language, 6, true);
      const firstLine = notices.slice(0, 2).join(" / ");
      ctx.textAlign = "right";
      ctx.fillText(t(language, "result.unlocked", { items: firstLine }), 286, 212);
    }

    ctx.textAlign = "center";
    ctx.fillStyle = UI_COLORS.muted;
    ctx.font = uiFont(language, 6);
    ctx.fillText(t(language, "result.footer", {
      confirm: this.engine.input.getConfirmPrompt(),
    }), 160, 236);
    ctx.textAlign = "left";
  }
}

