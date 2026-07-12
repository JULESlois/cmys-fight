import { Engine } from "../Engine";
import {
  getUpgradeCost,
  META_UPGRADES,
  META_UPGRADE_IDS,
  type MetaUpgradeId,
} from "../MetaUpgrades";
import { audio } from "../audio/AudioManager";
import { MenuRenderer } from "../render/MenuRenderer";
import { GameState } from "./GameState";
import { MenuBackdropRenderer } from "../render/MenuBackdropRenderer";
import { CHALLENGES, getDailyChallengeId } from "../ChallengeSystem";
import { getChallengeText, getMetaUpgradeText, t, uiFont } from "../i18n";

export class HubState extends GameState {
  private selectedIndex = 0;
  private message = "";
  private refundArmed = false;

  constructor(engine: Engine) {
    super(engine);
  }

  enter() {
    this.engine.data.loadMeta();
    const daily = getDailyChallengeId();
    if (this.engine.data.meta.preferredChallengeId && this.engine.data.meta.preferredChallengeId !== daily) {
      this.engine.data.setPreferredChallenge(undefined);
    }
    this.selectedIndex = Math.min(this.selectedIndex, META_UPGRADE_IDS.length - 1);
    this.message = t(this.engine.data.settings.language, "hub.prepare");
    this.refundArmed = false;
  }

  exit() {}

  update() {
    if (this.engine.input.wasPressed("escape")) {
      this.engine.switchState("title");
      return;
    }
    if (this.engine.input.wasPressed("arrowup") || this.engine.input.wasPressed("w")) {
      this.selectedIndex = (this.selectedIndex - 1 + META_UPGRADE_IDS.length) % META_UPGRADE_IDS.length;
      this.refundArmed = false;
      audio.playShoot();
    }
    if (this.engine.input.wasPressed("arrowdown") || this.engine.input.wasPressed("s")) {
      this.selectedIndex = (this.selectedIndex + 1) % META_UPGRADE_IDS.length;
      this.refundArmed = false;
      audio.playShoot();
    }
    const purchasePressed =
      this.engine.input.wasActionPressed("interact") ||
      this.engine.input.wasPressed("enter");
    if (purchasePressed) {
      this.purchaseSelected();
      return;
    }

    const keyboardRunPressed =
      this.engine.input.getLastDevice() === "keyboard" &&
      this.engine.input.wasPressed(" ");
    const actionRunPressed = this.engine.input.wasActionPressed("fire");
    if (keyboardRunPressed || actionRunPressed) {
      this.engine.switchState("character_select", { backState: "hub" });
      return;
    }
    if (this.engine.input.wasPressed("h")) {
      if (!this.engine.data.meta.hardModeUnlocked) {
        this.message = t(this.engine.data.settings.language, "hub.hardLockedMessage");
        audio.playHurt();
      } else {
        const enabled = !this.engine.data.meta.preferredHardMode;
        this.engine.data.setPreferredHardMode(enabled);
        this.message = t(this.engine.data.settings.language, "hub.hardState", {
          state: t(this.engine.data.settings.language, enabled ? "common.enabled" : "common.disabled"),
        });
        audio.playPickup();
      }
    }
    if (this.engine.input.wasPressed("c")) {
      if (!this.engine.data.meta.hardModeUnlocked || !this.engine.data.meta.preferredHardMode) {
        this.message = t(this.engine.data.settings.language, "hub.challengeNeedsHard");
        audio.playHurt();
      } else {
        const daily = getDailyChallengeId();
        const next = this.engine.data.meta.preferredChallengeId === daily ? undefined : daily;
        this.engine.data.setPreferredChallenge(next);
        const language = this.engine.data.settings.language;
        const challengeName = next ? getChallengeText(next, CHALLENGES[next], language).name : "";
        this.message = next
          ? t(language, "hub.challengeSelected", { name: challengeName })
          : t(language, "hub.challengeDisabled");
        audio.playPickup();
      }
    }
    const archivePressed =
      this.engine.input.wasPressed("a") ||
      (this.engine.input.getLastDevice() !== "keyboard" && this.engine.input.wasActionPressed("swapWeapon"));
    if (archivePressed) {
      this.engine.switchState("records");
      return;
    }
    if (this.engine.input.wasPressed("r")) {
      this.refundArmed = true;
      this.message = t(this.engine.data.settings.language, "hub.refundConfirm");
    } else if (this.refundArmed && this.engine.input.wasPressed("y")) {
      const refunded = this.engine.data.refundMetaUpgrades();
      this.message = refunded > 0
        ? t(this.engine.data.settings.language, "hub.refunded", { amount: refunded })
        : t(this.engine.data.settings.language, "hub.noRefund");
      this.refundArmed = false;
      refunded > 0 ? audio.playPickup() : audio.playHurt();
    }
  }

  private purchaseSelected() {
    const id = META_UPGRADE_IDS[this.selectedIndex] as MetaUpgradeId;
    const result = this.engine.data.purchaseMetaUpgrade(id);
    if (result.success) {
      const localized = getMetaUpgradeText(id, META_UPGRADES[id], this.engine.data.settings.language);
      this.message = t(this.engine.data.settings.language, "hub.upgraded", { name: localized.name });
      audio.playPickup();
    } else if (result.reason === "max") {
      this.message = t(this.engine.data.settings.language, "hub.maxed");
      audio.playHurt();
    } else {
      this.message = t(this.engine.data.settings.language, "hub.needShards", { amount: result.cost });
      audio.playHurt();
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const meta = this.engine.data.meta;
    const backdropTime = this.engine.data.settings.dynamicBackground && !this.engine.isPerformanceDegraded() ? Date.now() / 1000 : 0;
    MenuBackdropRenderer.draw(ctx, "hub", backdropTime, this.engine.isPerformanceDegraded());

    ctx.strokeStyle = "rgba(0, 242, 254, 0.08)";
    for (let x = 0; x <= 320; x += 16) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 240); ctx.stroke();
    }
    for (let y = 0; y <= 240; y += 16) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(320, y); ctx.stroke();
    }

    const language = this.engine.data.settings.language;
    MenuRenderer.drawTitle(ctx, t(language, "hub.title"), 160, 22, language);
    ctx.textAlign = "center";
    ctx.fillStyle = "#F1C40F";
    ctx.font = uiFont(language, 8, true);
    ctx.fillText(t(language, "hub.header", {
      shards: meta.currency,
      achievements: meta.unlockedAchievements.length,
      trials: meta.completedChallenges,
    }), 160, 39);

    META_UPGRADE_IDS.forEach((id, index) => {
      const definition = META_UPGRADES[id];
      const localized = getMetaUpgradeText(id, definition, language);
      const level = meta.upgrades[id];
      const cost = getUpgradeCost(id, level);
      const y = 56 + index * 22;
      const selected = index === this.selectedIndex;
      ctx.fillStyle = selected ? "rgba(0, 242, 254, 0.18)" : "rgba(10, 15, 25, 0.88)";
      ctx.fillRect(28, y - 11, 264, 18);
      ctx.strokeStyle = selected ? "#00F2FE" : "#34495E";
      ctx.strokeRect(28, y - 11, 264, 18);
      ctx.textAlign = "left";
      ctx.fillStyle = selected ? "#FFFFFF" : "#BDC3C7";
      ctx.font = uiFont(language, 8, true);
      ctx.fillText(`${selected ? ">" : " "} ${localized.name}`, 34, y);
      ctx.textAlign = "center";
      ctx.fillStyle = "#2ECC71";
      ctx.fillText(t(language, "hub.level", { level, max: definition.maxLevel }), 212, y);
      ctx.textAlign = "right";
      ctx.fillStyle = cost === null ? "#7F8C8D" : meta.currency >= cost ? "#F1C40F" : "#E74C3C";
      ctx.fillText(cost === null ? t(language, "common.max") : `${cost} S`, 284, y);
    });

    const selectedId = META_UPGRADE_IDS[this.selectedIndex];
    ctx.textAlign = "center";
    ctx.fillStyle = "#8E9EAB";
    ctx.font = uiFont(language, 7);
    ctx.fillText(getMetaUpgradeText(selectedId, META_UPGRADES[selectedId], language).description, 160, 191);
    ctx.fillStyle = meta.hardModeUnlocked
      ? meta.preferredHardMode ? "#E74C3C" : "#BDC3C7"
      : "#4B5563";
    ctx.font = uiFont(language, 8, true);
    ctx.fillText(
      meta.hardModeUnlocked
        ? t(language, "hub.hardLine", { state: t(language, meta.preferredHardMode ? "common.on" : "common.off") })
        : t(language, "hub.hardLocked"),
      160,
      205,
    );
    const dailyChallenge = getDailyChallengeId();
    const challengeEnabled = meta.preferredChallengeId === dailyChallenge && meta.preferredHardMode;
    ctx.fillStyle = challengeEnabled ? "#F1C40F" : "#5D6D7E";
    ctx.font = uiFont(language, 6, true);
    const dailyText = getChallengeText(dailyChallenge, CHALLENGES[dailyChallenge], language);
    ctx.fillText(t(language, "hub.challengeLine", {
      name: dailyText.name,
      state: t(language, challengeEnabled ? "common.on" : "common.off"),
      reward: CHALLENGES[dailyChallenge].reward,
    }), 160, 213);
    ctx.fillStyle = this.refundArmed ? "#E74C3C" : "#00F2FE";
    ctx.font = uiFont(language, 7, true);
    ctx.fillText(this.message, 160, 226);
    ctx.fillStyle = "#BDC3C7";
    ctx.font = uiFont(language, 6);
    const device = this.engine.input.getLastDevice();
    const interactPrompt = this.engine.input.getPrompt("interact");
    const buyPrompt = device === "keyboard" && interactPrompt !== "ENTER"
      ? `${interactPrompt}/ENTER`
      : interactPrompt;
    const runPrompt = device === "keyboard" ? "SPACE" : this.engine.input.getPrompt("fire");
    const archivePrompt = device === "keyboard" ? "A" : this.engine.input.getPrompt("swapWeapon");
    ctx.fillText(t(language, "hub.footer", {
      buy: buyPrompt,
      run: runPrompt,
      archive: archivePrompt,
    }), 160, 238);
    ctx.textAlign = "left";
  }
}
