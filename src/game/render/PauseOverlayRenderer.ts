import type { Input } from "../Input";
import type { Player } from "../entities/Player";
import { SkillController } from "../combat/SkillController";
import { BuffSystem } from "../combat/BuffSystem";
import { WeaponController } from "../combat/WeaponController";
import { WEAPONS } from "../data/weapons";
import { getWeaponMechanic, projectileLabel, t, uiFont, wrapLocalized, type Language } from "../i18n";

export class PauseOverlayRenderer {
  static draw(ctx: CanvasRenderingContext2D, input: Input, player?: Player, language: Language = "en") {
    ctx.fillStyle = "rgba(10, 15, 25, 0.92)";
    ctx.fillRect(0, 0, 320, 240);
    ctx.fillStyle = "#FFF";
    ctx.font = uiFont(language, 18, true);
    ctx.textAlign = "center";
    ctx.fillText(t(language, "pause.title"), 160, 35);

    ctx.strokeStyle = "rgba(0, 242, 254, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(18, 48, 284, 157);
    ctx.fillStyle = "rgba(0, 242, 254, 0.04)";
    ctx.fillRect(18, 48, 284, 157);

    const rows = [
      [input.getLastDevice() === "gamepad" ? "L-STICK" : input.getLastDevice() === "touch" ? "JOYSTICK" : "WASD", t(language, "common.move")],
      [input.getPrompt("fire"), t(language, "action.fire")],
      [input.getPrompt("interact"), t(language, "action.interact")],
      [input.getPrompt("skill"), t(language, "pause.useSkill")],
      [input.getPrompt("swapWeapon"), t(language, "pause.swapWeapon")],
      [input.getPrompt("pause"), t(language, "common.resume")],
    ];
    ctx.font = uiFont(language, 7);
    rows.forEach(([prompt, action], index) => {
      const y = 69 + index * 16;
      ctx.textAlign = "right";
      ctx.fillStyle = "#F1C40F";
      ctx.fillText(prompt, 85, y);
      ctx.textAlign = "left";
      ctx.fillStyle = "#BDC3C7";
      ctx.fillText(action, 94, y);
    });

    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.moveTo(150, 68);
    ctx.lineTo(150, 188);
    ctx.stroke();

    if (player) {
      const skill = SkillController.getConfig(player.characterId);
      const totalCooldown = skill.cooldown * BuffSystem.getSkillCooldownMultiplier(player);
      const skillState = player.skillActiveTimer > 0
        ? t(language, "pause.active", { seconds: player.skillActiveTimer.toFixed(1) })
        : player.skillCooldown <= 0
          ? t(language, "common.ready")
          : t(language, "pause.cooldown", { remaining: player.skillCooldown.toFixed(1), total: totalCooldown.toFixed(1) });
      ctx.textAlign = "left";
      ctx.fillStyle = "#00F2FE";
      ctx.font = uiFont(language, 7, true);
      ctx.fillText(t(language, "pause.skill"), 163, 69);
      ctx.fillStyle = "#FFF";
      ctx.fillText(skill.name, 163, 81);
      ctx.fillStyle = player.skillCooldown <= 0 ? "#2ECC71" : "#F1C40F";
      ctx.font = uiFont(language, 6);
      ctx.fillText(skillState, 163, 92);
      if (player.characterId === "mage") {
        ctx.fillStyle = "#C792EA";
        ctx.font = uiFont(language, 5, true);
        ctx.fillText(t(language, "pause.mageEcho", {
          charge: Math.min(SkillController.MAGE_ECHO_THRESHOLD, Math.floor(player.mageArcaneCharge * 10) / 10),
          threshold: SkillController.MAGE_ECHO_THRESHOLD,
        }), 163, 102);
      } else if (player.characterId === "michele" && player.micheleMarkTimer > 0) {
        ctx.fillStyle = "#F4D35E";
        ctx.font = uiFont(language, 5, true);
        ctx.fillText(t(language, "pause.micheleMark", {
          seconds: player.micheleMarkTimer.toFixed(1),
        }), 163, 102);
      }

      ctx.fillStyle = "#00F2FE";
      ctx.font = uiFont(language, 7, true);
      ctx.fillText(t(language, "pause.loadout"), 163, 113);
      player.weaponSlots.forEach((weaponId, index) => {
        if (!weaponId) return;
        const weapon = WEAPONS[weaponId];
        const active = player.activeWeaponSlot === index;
        ctx.fillStyle = active ? "#FFF" : "#7F8C8D";
        ctx.font = uiFont(language, 7, active);
        ctx.fillText(`${active ? ">" : " "}${index + 1} ${weapon?.name?.toUpperCase() ?? weaponId.toUpperCase()}`, 163, 127 + index * 13);
      });

      const activeWeapon = WEAPONS[player.currentWeaponId];
      if (activeWeapon) {
        ctx.fillStyle = "#F1C40F";
        ctx.font = uiFont(language, 6, true);
        ctx.fillText(t(language, "pause.weaponStats", {
          style: projectileLabel(activeWeapon.projectileStyle, language),
          damage: activeWeapon.damage,
          energy: WeaponController.formatEnergyCost(WeaponController.getEnergyCost(player, activeWeapon.id)),
        }), 163, 160);
        ctx.fillStyle = "#9AA7B2";
        ctx.font = uiFont(language, language === "zh-CN" ? 6 : 5);
        const mechanic = getWeaponMechanic(activeWeapon.id, activeWeapon.mechanic, language);
        wrapLocalized(mechanic, language === "zh-CN" ? 26 : 30).slice(0, 2)
          .forEach((text, index) => ctx.fillText(text, 163, 171 + index * 9));
      }
    }

    ctx.textAlign = "center";
    ctx.fillStyle = "#7F8C8D";
    ctx.font = uiFont(language, 6);
    ctx.fillText(t(language, "pause.footer", {
      cancel: input.getCancelPrompt(),
      menu: input.getPrompt("interact"),
      pause: input.getPrompt("pause"),
    }), 160, 197);
    ctx.textAlign = "left";
  }
}
