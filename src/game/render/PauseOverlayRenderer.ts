import { BuffSystem } from "../combat/BuffSystem";
import { SkillController } from "../combat/SkillController";
import { WeaponController } from "../combat/WeaponController";
import { WEAPONS } from "../data/weapons";
import type { Player } from "../entities/Player";
import type { Input } from "../Input";
import { getWeaponMechanic, projectileLabel, t, uiFont, wrapLocalized, type Language } from "../i18n";
import { drawBadge, drawMeter, drawPixelPanel, drawSectionLabel, UI_COLORS } from "./PixelUi";
import { SpriteRenderer } from "./SpriteRenderer";

export class PauseOverlayRenderer {
  static draw(ctx: CanvasRenderingContext2D, input: Input, player?: Player, language: Language = "en") {
    ctx.fillStyle = "rgba(3, 7, 13, 0.92)";
    ctx.fillRect(0, 0, 320, 240);
    drawPixelPanel(ctx, 12, 16, 296, 207, "cyan", true);

    ctx.fillStyle = UI_COLORS.white;
    ctx.font = uiFont(language, 16, true);
    ctx.textAlign = "left";
    ctx.fillText(t(language, "pause.title"), 25, 39);
    ctx.fillStyle = UI_COLORS.cyan;
    ctx.fillRect(25, 45, 270, 1);

    drawPixelPanel(ctx, 22, 54, 86, 132, "neutral");
    drawSectionLabel(ctx, t(language, "common.move"), 29, 68, 70, language, "yellow");
    const rows = [
      [input.getLastDevice() === "gamepad" ? "L-STICK" : input.getLastDevice() === "touch" ? "JOYSTICK" : "WASD", t(language, "common.move")],
      [input.getPrompt("fire"), t(language, "action.fire")],
      [input.getPrompt("interact"), t(language, "action.interact")],
      [input.getPrompt("skill"), t(language, "action.skill")],
      [input.getPrompt("swapWeapon"), t(language, "pause.swapWeapon")],
    ];
    rows.forEach(([prompt, action], index) => {
      const y = 84 + index * 19;
      ctx.fillStyle = UI_COLORS.dark;
      ctx.fillRect(29, y - 10, 24, 12);
      ctx.strokeStyle = UI_COLORS.yellow;
      ctx.strokeRect(29, y - 10, 24, 12);
      ctx.fillStyle = UI_COLORS.yellow;
      ctx.font = uiFont(language, 5, true);
      ctx.textAlign = "center";
      ctx.fillText(prompt, 41, y - 2);
      ctx.textAlign = "left";
      ctx.fillStyle = UI_COLORS.text;
      ctx.font = uiFont(language, 6, true);
      ctx.fillText(action, 58, y - 2);
    });

    drawPixelPanel(ctx, 114, 54, 90, 132, "purple");
    if (player) {
      const skill = SkillController.getConfig(player.characterId);
      const totalCooldown = Math.max(0.01, skill.cooldown * BuffSystem.getSkillCooldownMultiplier(player));
      const skillRatio = Math.max(0, Math.min(1, 1 - player.skillCooldown / totalCooldown));
      drawSectionLabel(ctx, t(language, "pause.skill"), 121, 68, 76, language, "purple");
      ctx.fillStyle = UI_COLORS.white;
      ctx.font = uiFont(language, 8, true);
      ctx.textAlign = "left";
      wrapLocalized(skill.name, language === "zh-CN" ? 12 : 15).slice(0, 2)
        .forEach((line, index) => ctx.fillText(line, 121, 84 + index * 9));
      drawMeter(ctx, 121, 103, 76, 7, skillRatio, player.skillCooldown <= 0 ? UI_COLORS.green : UI_COLORS.purple, 0);
      ctx.fillStyle = player.skillCooldown <= 0 ? UI_COLORS.green : UI_COLORS.yellow;
      ctx.font = uiFont(language, 6, true);
      ctx.fillText(player.skillCooldown <= 0 ? t(language, "common.ready") : `${player.skillCooldown.toFixed(1)} / ${totalCooldown.toFixed(1)}S`, 121, 120);

      let special = "";
      if (player.characterId === "mage") {
        special = t(language, "pause.mageEcho", {
          charge: Math.min(SkillController.MAGE_ECHO_THRESHOLD, Math.floor(player.mageArcaneCharge * 10) / 10),
          threshold: SkillController.MAGE_ECHO_THRESHOLD,
        });
      } else if (player.characterId === "michele" && player.micheleMarkTimer > 0) {
        special = t(language, "pause.micheleMark", { seconds: player.micheleMarkTimer.toFixed(1) });
      }
      if (special) {
        ctx.fillStyle = UI_COLORS.yellow;
        ctx.font = uiFont(language, 5, true);
        wrapLocalized(special, language === "zh-CN" ? 14 : 18).slice(0, 2)
          .forEach((line, index) => ctx.fillText(line, 121, 136 + index * 8));
      }

      const armorRatio = player.maxArmor > 0 ? player.armor / player.maxArmor : 0;
      ctx.fillStyle = UI_COLORS.muted;
      ctx.font = uiFont(language, 6, true);
      ctx.fillText(`HP ${Math.floor(player.hp)}/${player.maxHp}`, 121, 161);
      drawMeter(ctx, 121, 166, 76, 5, player.hp / player.maxHp, UI_COLORS.red, 0);
      if (player.maxArmor > 0) drawMeter(ctx, 121, 174, 76, 5, armorRatio, UI_COLORS.cyan, 0);
    }

    drawPixelPanel(ctx, 210, 54, 88, 132, "yellow");
    drawSectionLabel(ctx, t(language, "pause.loadout"), 217, 68, 74, language, "yellow");
    if (player) {
      player.weaponSlots.forEach((weaponId, index) => {
        const y = 79 + index * 42;
        const weapon = weaponId ? WEAPONS[weaponId] : undefined;
        const active = player.activeWeaponSlot === index;
        ctx.fillStyle = active ? "rgba(240,196,91,0.12)" : UI_COLORS.dark;
        ctx.fillRect(217, y, 74, 35);
        ctx.strokeStyle = active ? UI_COLORS.yellow : UI_COLORS.edge;
        ctx.strokeRect(217, y, 74, 35);
        ctx.fillStyle = active ? UI_COLORS.yellow : UI_COLORS.muted;
        ctx.font = uiFont(language, 5, true);
        ctx.textAlign = "left";
        ctx.fillText(`${active ? ">" : " "}${index + 1}`, 221, y + 8);
        if (!weapon) {
          ctx.fillText("EMPTY", 237, y + 22);
          return;
        }
        SpriteRenderer.drawPixelSprite(ctx, `weapon_${weapon.id}`, 236, y + 22, 1);
        ctx.fillStyle = active ? UI_COLORS.white : UI_COLORS.text;
        ctx.font = uiFont(language, 5, true);
        wrapLocalized(weapon.name.toUpperCase(), 12).slice(0, 2)
          .forEach((line, lineIndex) => ctx.fillText(line, 249, y + 14 + lineIndex * 8));
      });

      const activeWeapon = WEAPONS[player.currentWeaponId];
      if (activeWeapon) {
        drawBadge(ctx, `${projectileLabel(activeWeapon.projectileStyle, language)} · D${activeWeapon.damage}`, 217, 166, 74, language, "yellow");
        ctx.fillStyle = UI_COLORS.muted;
        ctx.font = uiFont(language, 5);
        const mechanic = getWeaponMechanic(activeWeapon.id, activeWeapon.mechanic, language);
        wrapLocalized(mechanic, language === "zh-CN" ? 13 : 16).slice(0, 2)
          .forEach((line, index) => ctx.fillText(line, 217, 181 + index * 7));
        void WeaponController.getEnergyCost(player, activeWeapon.id);
      }
    }

    ctx.textAlign = "center";
    ctx.fillStyle = UI_COLORS.muted;
    ctx.font = uiFont(language, 6);
    ctx.fillText(t(language, "pause.footer", {
      cancel: input.getCancelPrompt(),
      menu: input.getConfirmPrompt(),
    }), 160, 207);
    ctx.textAlign = "left";
  }
}
