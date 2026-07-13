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

type HubAction = "start" | "records" | "hard" | "challenge" | "refund";
const HUB_ACTIONS: HubAction[] = ["start", "records", "hard", "challenge", "refund"];
const HUB_ENTRY_COUNT = META_UPGRADE_IDS.length + HUB_ACTIONS.length;

export class HubState extends GameState {
  private selectedIndex = META_UPGRADE_IDS.length;
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
    this.selectedIndex = Math.max(0, Math.min(this.selectedIndex, HUB_ENTRY_COUNT - 1));
    this.message = "";
    this.refundArmed = false;
  }

  exit() {}

  update() {
    if (this.engine.input.wasUiPressed("cancel")) {
      if (this.refundArmed) {
        this.refundArmed = false;
        this.message = "";
        return;
      }
      this.engine.switchState("title");
      return;
    }
    if (this.engine.input.wasUiPressed("up")) {
      this.selectedIndex = (this.selectedIndex - 1 + HUB_ENTRY_COUNT) % HUB_ENTRY_COUNT;
      this.refundArmed = false;
      this.message = "";
      audio.playShoot();
    }
    if (this.engine.input.wasUiPressed("down")) {
      this.selectedIndex = (this.selectedIndex + 1) % HUB_ENTRY_COUNT;
      this.refundArmed = false;
      this.message = "";
      audio.playShoot();
    }
    if (!this.engine.input.wasUiPressed("confirm")) return;

    if (this.selectedIndex < META_UPGRADE_IDS.length) {
      this.purchaseSelected();
      return;
    }
    this.activateAction(HUB_ACTIONS[this.selectedIndex - META_UPGRADE_IDS.length]);
  }

  private activateAction(action: HubAction): void {
    const language = this.engine.data.settings.language;
    if (action === "start") {
      this.engine.switchState("character_select", { backState: "hub" });
      return;
    }
    if (action === "records") {
      this.engine.switchState("records");
      return;
    }
    if (action === "hard") {
      if (!this.engine.data.meta.hardModeUnlocked) {
        this.message = t(language, "hub.hardLockedMessage");
        audio.playHurt();
        return;
      }
      const enabled = !this.engine.data.meta.preferredHardMode;
      this.engine.data.setPreferredHardMode(enabled);
      if (!enabled) this.engine.data.setPreferredChallenge(undefined);
      this.message = t(language, "hub.hardState", {
        state: t(language, enabled ? "common.enabled" : "common.disabled"),
      });
      audio.playPickup();
      return;
    }
    if (action === "challenge") {
      if (!this.engine.data.meta.hardModeUnlocked || !this.engine.data.meta.preferredHardMode) {
        this.message = t(language, "hub.challengeNeedsHard");
        audio.playHurt();
        return;
      }
      const daily = getDailyChallengeId();
      const next = this.engine.data.meta.preferredChallengeId === daily ? undefined : daily;
      this.engine.data.setPreferredChallenge(next);
      const challengeName = next ? getChallengeText(next, CHALLENGES[next], language).name : "";
      this.message = next
        ? t(language, "hub.challengeSelected", { name: challengeName })
        : t(language, "hub.challengeDisabled");
      audio.playPickup();
      return;
    }
    if (!this.refundArmed) {
      this.refundArmed = true;
      this.message = t(language, "hub.refundConfirm", { confirm: this.engine.input.getConfirmPrompt() });
      audio.playHurt();
      return;
    }
    const refunded = this.engine.data.refundMetaUpgrades();
    this.message = refunded > 0
      ? t(language, "hub.refunded", { amount: refunded })
      : t(language, "hub.noRefund");
    this.refundArmed = false;
    refunded > 0 ? audio.playPickup() : audio.playHurt();
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

  private getActionValue(action: HubAction): string {
    const language = this.engine.data.settings.language;
    const meta = this.engine.data.meta;
    if (action === "hard") {
      return meta.hardModeUnlocked
        ? t(language, meta.preferredHardMode ? "common.on" : "common.off")
        : t(language, "common.locked");
    }
    if (action === "challenge") {
      const enabled = meta.preferredHardMode && meta.preferredChallengeId === getDailyChallengeId();
      return t(language, enabled ? "common.on" : "common.off");
    }
    if (action === "refund" && this.refundArmed) return t(language, "common.confirm");
    return "";
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
    MenuRenderer.drawTitle(ctx, t(language, "hub.title"), 160, 20, language);
    ctx.textAlign = "center";
    ctx.fillStyle = "#F1C40F";
    ctx.font = uiFont(language, 7, true);
    ctx.fillText(t(language, "hub.header", {
      shards: meta.currency,
      achievements: meta.unlockedAchievements.length,
      trials: meta.completedChallenges,
    }), 160, 34);

    META_UPGRADE_IDS.forEach((id, index) => {
      const definition = META_UPGRADES[id];
      const localized = getMetaUpgradeText(id, definition, language);
      const level = meta.upgrades[id];
      const cost = getUpgradeCost(id, level);
      const y = 48 + index * 17;
      const selected = index === this.selectedIndex;
      ctx.fillStyle = selected ? "rgba(0, 242, 254, 0.18)" : "rgba(10, 15, 25, 0.88)";
      ctx.fillRect(28, y - 10, 264, 14);
      ctx.strokeStyle = selected ? "#00F2FE" : "#34495E";
      ctx.strokeRect(28, y - 10, 264, 14);
      ctx.textAlign = "left";
      ctx.fillStyle = selected ? "#FFFFFF" : "#BDC3C7";
      ctx.font = uiFont(language, 7, true);
      ctx.fillText(`${selected ? ">" : " "} ${localized.name}`, 34, y);
      ctx.textAlign = "center";
      ctx.fillStyle = "#2ECC71";
      ctx.fillText(t(language, "hub.level", { level, max: definition.maxLevel }), 212, y);
      ctx.textAlign = "right";
      ctx.fillStyle = cost === null ? "#7F8C8D" : meta.currency >= cost ? "#F1C40F" : "#E74C3C";
      ctx.fillText(cost === null ? t(language, "common.max") : `${cost} S`, 284, y);
    });

    HUB_ACTIONS.forEach((action, actionIndex) => {
      const index = META_UPGRADE_IDS.length + actionIndex;
      const y = 151 + actionIndex * 12;
      const selected = index === this.selectedIndex;
      ctx.fillStyle = selected ? "rgba(142, 68, 173, 0.24)" : "rgba(10, 15, 25, 0.82)";
      ctx.fillRect(48, y - 8, 224, 10);
      ctx.strokeStyle = selected ? "#D66BFF" : "#34495E";
      ctx.strokeRect(48, y - 8, 224, 10);
      ctx.textAlign = "left";
      ctx.fillStyle = selected ? "#FFFFFF" : "#9AA7B2";
      ctx.font = uiFont(language, 6, selected);
      ctx.fillText(`${selected ? ">" : " "} ${t(language, `hub.action.${action}` as Parameters<typeof t>[1])}`, 54, y);
      const value = this.getActionValue(action);
      if (value) {
        ctx.textAlign = "right";
        ctx.fillStyle = action === "refund" && this.refundArmed ? "#E74C3C" : "#F1C40F";
        ctx.fillText(value, 266, y);
      }
    });

    ctx.textAlign = "center";
    const selectedUpgrade = this.selectedIndex < META_UPGRADE_IDS.length
      ? META_UPGRADE_IDS[this.selectedIndex]
      : undefined;
    ctx.fillStyle = "#8E9EAB";
    ctx.font = uiFont(language, 6);
    if (selectedUpgrade) {
      ctx.fillText(getMetaUpgradeText(selectedUpgrade, META_UPGRADES[selectedUpgrade], language).description, 160, 213);
    }
    if (this.message) {
      ctx.fillStyle = this.refundArmed ? "#E74C3C" : "#00F2FE";
      ctx.font = uiFont(language, 6, true);
      ctx.fillText(this.message, 160, 224);
    }
    ctx.fillStyle = "#BDC3C7";
    ctx.font = uiFont(language, 6);
    ctx.fillText(t(language, "hub.footer", {
      vertical: this.engine.input.getNavigationPrompt("vertical"),
      confirm: this.engine.input.getConfirmPrompt(),
      cancel: this.engine.input.getCancelPrompt(),
    }), 160, 237);
    ctx.textAlign = "left";
  }
}
