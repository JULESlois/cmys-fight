import { BUFFS, BuffSystem } from "../combat/BuffSystem";
import { SkillController } from "../combat/SkillController";
import type { Player } from "../entities/Player";
import type { FloorData } from "../FloorGenerator";
import { uiFont } from "../i18n";
import { HUD_LAYOUT, HUD_STATUS_FLOW } from "./HudLayout";
import { WeaponHudRenderer, type WeaponHudDrawOptions } from "./WeaponHudRenderer";
import {
  drawMeter,
  drawPixelPanel,
  drawUiIcon,
  rarityColor,
  UI_COLORS,
} from "./PixelUi";

export class UIRenderer {
  private static lastCoinAmount: number = -1;
  private static coinDisplayUntil: number = 0;
  private static lastHp = -1;
  private static hpPulseStartedAt = 0;
  private static lastArmor = -1;
  private static armorPulseStartedAt = 0;

  /** A 0..1 decay pulse triggered by a value change; 0 when idle. */
  private static valuePulse(now: number, startedAt: number, durationMs: number): number {
    return Math.max(0, 1 - (now - startedAt) / durationMs);
  }

  public static draw(
    ctx: CanvasRenderingContext2D,
    player: Player,
    engine: any,
    floor: FloorData,
    roomPhase = "exploration",
    weaponHudOptions: WeaponHudDrawOptions = {},
  ) {
    const language = engine.data.settings.language;
    const now = Date.now();
    const reducedFlashing = engine.data.settings.reducedFlashing === true;
    if (player.hp !== UIRenderer.lastHp) {
      UIRenderer.lastHp = player.hp;
      UIRenderer.hpPulseStartedAt = now;
    }
    if (player.armor !== UIRenderer.lastArmor) {
      UIRenderer.lastArmor = player.armor;
      UIRenderer.armorPulseStartedAt = now;
    }

    // Compact player status block. Icons carry the meaning so the bars do not
    // rely on color alone.
    const statusPanel = HUD_LAYOUT.topLeftStatus;
    drawPixelPanel(ctx, statusPanel.x, statusPanel.y, statusPanel.width, statusPanel.height, "cyan", true);
    const statRows = [
      {
        kind: "heart" as const, y: 11, value: player.hp, max: player.maxHp, color: UI_COLORS.red,
        pulse: UIRenderer.valuePulse(now, UIRenderer.hpPulseStartedAt, 320),
      },
      {
        kind: "shield" as const, y: 24, value: player.armor, max: Math.max(1, player.maxArmor),
        color: player.armorRechargeTimer <= 0 ? UI_COLORS.cyan : "#A7B2BC",
        pulse: UIRenderer.valuePulse(now, UIRenderer.armorPulseStartedAt, 320),
      },
    ];
    statRows.forEach(row => {
      drawUiIcon(ctx, row.kind, 11, row.y, row.color);
      drawMeter(ctx, 23, row.y + 1, 32, 7, row.max > 0 ? row.value / row.max : 0, row.color, 10);
      // One-shot brightening pulse on value change: a white overlay that
      // decays over ~0.3s. Reduced flashing suppresses the blink, not the state.
      if (row.pulse > 0 && !reducedFlashing) {
        ctx.fillStyle = `rgba(255,255,255,${(row.pulse * 0.55).toFixed(2)})`;
        ctx.fillRect(11, row.y, 9, 8);
      }
      ctx.fillStyle = UI_COLORS.white;
      ctx.font = uiFont(language, 6, true);
      ctx.textAlign = "right";
      ctx.fillText(`${Math.floor(row.value)}/${row.max}`, 80, row.y + 7);
    });

    const skill = SkillController.getConfig(player.characterId);
    const skillCooldownTotal = Math.max(0.01, skill.cooldown * BuffSystem.getSkillCooldownMultiplier(player));
    const skillReady = Math.max(0, Math.min(1, 1 - player.skillCooldown / skillCooldownTotal));
    const skillIsReady = player.skillCooldown <= 0;
    drawUiIcon(ctx, "skill", 11, 37, skillIsReady ? UI_COLORS.green : UI_COLORS.purple);
    // Breathing glow on the skill icon when ready; steady mid-tone under
    // reduced flashing so it never strobes.
    if (skillIsReady) {
      const readyPulse = reducedFlashing ? 0.35 : 0.22 + 0.3 * (0.5 + 0.5 * Math.sin(now / 1000 * 5));
      ctx.fillStyle = `rgba(88,214,141,${readyPulse.toFixed(2)})`;
      ctx.fillRect(9, 35, 12, 12);
      drawUiIcon(ctx, "skill", 11, 37, UI_COLORS.green);
    }
    drawMeter(ctx, 23, 38, 32, 6, skillReady, skillIsReady ? UI_COLORS.green : UI_COLORS.purple, 0);
    ctx.textAlign = "right";
    ctx.fillStyle = skillIsReady ? UI_COLORS.green : UI_COLORS.text;
    ctx.font = uiFont(language, 5, true);
    ctx.fillText(skillIsReady ? "READY" : `${player.skillCooldown.toFixed(1)}S`, 80, 43);

    // Everything under the status block shares one vertical flow. Each element
    // advances `currentY`, so a wrapped buff strip pushes the rows below it down
    // instead of being overdrawn by an absolutely positioned panel.
    const flow = HUD_STATUS_FLOW;
    const cell = flow.buffCell;
    let currentY = flow.startY;
    // Compact buff strip, no pixelui.
    if (player.buffs.length > 0) {
      const visibleBuffCount = Math.min(player.buffs.length, BuffSystem.MAX_BUFFS);
      const columns = Math.min(cell.columns, visibleBuffCount);
      const rows = Math.ceil(visibleBuffCount / columns);
      const stripX = flow.x;
      for (let index = 0; index < visibleBuffCount; index++) {
        const id = player.buffs[index];
        const buff = BUFFS[id];
        const x = stripX + (index % columns) * cell.strideX;
        const y = currentY + Math.floor(index / columns) * cell.strideY;
        ctx.fillStyle = UI_COLORS.dark;
        ctx.fillRect(x, y, cell.width, cell.height);
        ctx.strokeStyle = rarityColor(buff.rarity);
        ctx.strokeRect(x, y, cell.width, cell.height);
        ctx.fillStyle = rarityColor(buff.rarity);
        ctx.font = uiFont(language, 5, true);
        ctx.textAlign = "center";
        ctx.fillText(buff.shortCode, x + cell.width / 2, y + 7);
      }
      currentY += rows * cell.strideY + flow.rowGap;
    }

    if (player.statusEffects.length > 0) {
      const accessible = engine.data.settings.colorblindMode !== "off";
      const statusColors: Record<string, string> = accessible ? {
        poison: UI_COLORS.yellow,
        burn: UI_COLORS.white,
        slow: UI_COLORS.cyan,
        root: UI_COLORS.purple,
      } : {
        poison: "#8BC34A",
        burn: "#FF7043",
        slow: "#81D4FA",
        root: "#A1887F",
      };
      const statusCodes: Record<string, string> = { poison: "PSN", burn: "BRN", slow: "SLW", root: "ROT" };
      const effects = player.statusEffects.slice(0, 4);
      drawPixelPanel(ctx, flow.x, currentY, effects.length * 29 + 8, 15, "red");
      effects.forEach((status, index) => {
        const x = flow.x + 5 + index * 29;
        ctx.fillStyle = statusColors[status.id] ?? UI_COLORS.white;
        ctx.font = uiFont(language, 5, true);
        ctx.textAlign = "left";
        ctx.fillText(`${statusCodes[status.id] ?? status.id.toUpperCase()}${status.stacks > 1 ? status.stacks : ""}`, x, currentY + 10);
      });
      currentY += 15 + flow.rowGap;
    }

    let combatTag = "";
    let combatTagColor: string = UI_COLORS.muted;
    if (player.characterId === "mage") {
      combatTag = `ECHO ${Math.min(SkillController.MAGE_ECHO_THRESHOLD, Math.floor(player.mageArcaneCharge * 10) / 10)}/${SkillController.MAGE_ECHO_THRESHOLD}`;
      combatTagColor = UI_COLORS.purple;
    } else if (player.characterId === "michele" && player.micheleMarkTimer > 0) {
      combatTag = `TRACE ${player.micheleMarkTimer.toFixed(1)}S`;
      combatTagColor = UI_COLORS.yellow;
    } else if (player.characterId === "celestia" && player.celestiaTemporaryArmor > 0) {
      combatTag = `STAR AR +${Math.ceil(player.celestiaTemporaryArmor)}`;
      combatTagColor = UI_COLORS.cyanBright;
    }

    if (combatTag) {
      ctx.textAlign = "left";
      ctx.fillStyle = combatTagColor;
      ctx.font = uiFont(language, 5, true);
      ctx.fillText(combatTag, flow.x, currentY + 6);
      currentY += 12;
    }

    const currentCoins = engine.data.data.player.coins;
    if (UIRenderer.lastCoinAmount === -1) {
      UIRenderer.lastCoinAmount = currentCoins;
      UIRenderer.coinDisplayUntil = 0;
    } else if (currentCoins !== UIRenderer.lastCoinAmount) {
      UIRenderer.lastCoinAmount = currentCoins;
      UIRenderer.coinDisplayUntil = Date.now() + 3000;
    }

    const timeRemaining = UIRenderer.coinDisplayUntil - Date.now();
    if (timeRemaining > 0) {
      let alpha = 1;
      if (timeRemaining > 2500) {
        alpha = (3000 - timeRemaining) / 500;
      } else if (timeRemaining < 500) {
        alpha = timeRemaining / 500;
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      drawUiIcon(ctx, "coin", flow.x, currentY, UI_COLORS.yellow);
      ctx.textAlign = "left";
      ctx.fillStyle = UI_COLORS.white;
      ctx.font = uiFont(language, 7, true);
      ctx.fillText(String(currentCoins), flow.x + 10, currentY + 7);
      ctx.restore();
    }

    WeaponHudRenderer.draw(ctx, player, language, weaponHudOptions);
    // Castlevania hearts / sub-weapon cluster. The renderer gates itself on the
    // player's own state, so runs without the layer draw nothing extra.
    WeaponHudRenderer.drawSubWeaponCluster(ctx, player, language);

    ctx.textAlign = "right";
    ctx.fillStyle = UI_COLORS.white;
    ctx.font = uiFont(language, 7, true);
    ctx.fillText(`${floor.routeDepth}-${floor.stageWithinNode}`, 312, 14);
    ctx.textAlign = "left";
  }
}
