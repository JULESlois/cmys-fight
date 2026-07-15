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
import { drawBadge, drawPixelButton, drawPixelPanel, drawSectionLabel, UI_COLORS } from "../render/PixelUi";

type HubAction = "start" | "hard" | "challenge" | "refund";
const HUB_ACTIONS: HubAction[] = ["start", "hard", "challenge", "refund"];
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

    const language = this.engine.data.settings.language;
    MenuRenderer.drawTitle(ctx, t(language, "hub.title"), 160, 22, language, 20);
    ctx.textAlign = "center";
    ctx.fillStyle = UI_COLORS.yellow;
    ctx.font = uiFont(language, 7, true);
    ctx.fillText(t(language, "hub.header", {
      shards: meta.currency,
      achievements: meta.unlockedAchievements.length,
      trials: meta.completedChallenges,
    }), 160, 34);

    drawPixelPanel(ctx, 16, 42, 190, 157, "cyan", true);
    drawSectionLabel(ctx, "PERMANENT UPGRADES", 25, 57, 172, language, "cyan");

    META_UPGRADE_IDS.forEach((id, index) => {
      const definition = META_UPGRADES[id];
      const localized = getMetaUpgradeText(id, definition, language);
      const level = meta.upgrades[id];
      const cost = getUpgradeCost(id, level);
      const y = 66 + index * 18;
      const selected = index === this.selectedIndex;
      drawPixelButton(ctx, 24, y - 10, 174, 15, selected, "cyan");
      ctx.textAlign = "left";
      ctx.fillStyle = selected ? UI_COLORS.white : UI_COLORS.text;
      ctx.font = uiFont(language, 6, selected);
      ctx.fillText(`${selected ? ">" : " "} ${localized.name}`, 30, y);
      ctx.textAlign = "right";
      ctx.fillStyle = UI_COLORS.green;
      ctx.fillText(`${level}/${definition.maxLevel}`, 164, y);
      ctx.fillStyle = cost === null ? UI_COLORS.muted : meta.currency >= cost ? UI_COLORS.yellow : UI_COLORS.red;
      ctx.fillText(cost === null ? t(language, "common.max") : `${cost} S`, 193, y);
    });

    drawPixelPanel(ctx, 212, 42, 92, 157, "purple", true);
    drawSectionLabel(ctx, "RUN SETUP", 220, 57, 76, language, "purple");
    HUB_ACTIONS.forEach((action, actionIndex) => {
      const index = META_UPGRADE_IDS.length + actionIndex;
      const y = 76 + actionIndex * 29;
      const selected = index === this.selectedIndex;
      drawPixelButton(ctx, 220, y - 12, 76, 22, selected, action === "refund" ? "red" : action === "start" ? "green" : "purple");
      ctx.textAlign = "left";
      ctx.fillStyle = selected ? UI_COLORS.white : UI_COLORS.text;
      ctx.font = uiFont(language, 6, selected);
      ctx.fillText(`${selected ? ">" : " "} ${t(language, `hub.action.${action}` as Parameters<typeof t>[1])}`, 225, y - 1);
      const value = this.getActionValue(action);
      if (value) {
        drawBadge(ctx, value, 249, y + 1, 41, language, action === "refund" && this.refundArmed ? "red" : "yellow");
      }
    });

    ctx.textAlign = "center";
    const selectedUpgrade = this.selectedIndex < META_UPGRADE_IDS.length
      ? META_UPGRADE_IDS[this.selectedIndex]
      : undefined;
    drawPixelPanel(ctx, 16, 203, 288, 24, this.refundArmed ? "red" : "neutral");
    ctx.fillStyle = UI_COLORS.text;
    ctx.font = uiFont(language, 6);
    if (selectedUpgrade) {
      ctx.fillText(getMetaUpgradeText(selectedUpgrade, META_UPGRADES[selectedUpgrade], language).description, 160, 214);
    }
    if (this.message) {
      ctx.fillStyle = this.refundArmed ? UI_COLORS.red : UI_COLORS.cyan;
      ctx.font = uiFont(language, 6, true);
      ctx.fillText(this.message, 160, 222);
    }
    ctx.fillStyle = UI_COLORS.muted;
    ctx.font = uiFont(language, 6);
    ctx.fillText(t(language, "hub.footer", {
      vertical: this.engine.input.getNavigationPrompt("vertical"),
      confirm: this.engine.input.getConfirmPrompt(),
      cancel: this.engine.input.getCancelPrompt(),
    }), 160, 236);
    ctx.textAlign = "left";
  }
}
