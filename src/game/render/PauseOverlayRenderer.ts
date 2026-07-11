import type { Input } from "../Input";
import type { Player } from "../entities/Player";
import { SkillController } from "../combat/SkillController";
import { BuffSystem } from "../combat/BuffSystem";
import { WEAPONS } from "../data/weapons";

export class PauseOverlayRenderer {
  static draw(ctx: CanvasRenderingContext2D, input: Input, player?: Player) {
    ctx.fillStyle = "rgba(10, 15, 25, 0.92)";
    ctx.fillRect(0, 0, 320, 240);
    ctx.fillStyle = "#FFF";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", 160, 35);

    ctx.strokeStyle = "rgba(0, 242, 254, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(18, 48, 284, 157);
    ctx.fillStyle = "rgba(0, 242, 254, 0.04)";
    ctx.fillRect(18, 48, 284, 157);

    const rows = [
      [input.getLastDevice() === "gamepad" ? "L-STICK" : input.getLastDevice() === "touch" ? "JOYSTICK" : "WASD", "MOVE"],
      [input.getPrompt("fire"), "FIRE"],
      [input.getPrompt("interact"), "INTERACT"],
      [input.getPrompt("skill"), "USE SKILL"],
      [input.getPrompt("swapWeapon"), "SWAP WEAPON"],
      [input.getPrompt("pause"), "RESUME"],
    ];
    ctx.font = "7px monospace";
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
        ? `ACTIVE ${player.skillActiveTimer.toFixed(1)}S`
        : player.skillCooldown <= 0
          ? "READY"
          : `COOLDOWN ${player.skillCooldown.toFixed(1)} / ${totalCooldown.toFixed(1)}S`;
      ctx.textAlign = "left";
      ctx.fillStyle = "#00F2FE";
      ctx.font = "bold 7px monospace";
      ctx.fillText("SKILL", 163, 69);
      ctx.fillStyle = "#FFF";
      ctx.fillText(skill.name, 163, 81);
      ctx.fillStyle = player.skillCooldown <= 0 ? "#2ECC71" : "#F1C40F";
      ctx.font = "6px monospace";
      ctx.fillText(skillState, 163, 92);

      ctx.fillStyle = "#00F2FE";
      ctx.font = "bold 7px monospace";
      ctx.fillText("LOADOUT", 163, 113);
      player.weaponSlots.forEach((weaponId, index) => {
        if (!weaponId) return;
        const weapon = WEAPONS[weaponId];
        const active = player.activeWeaponSlot === index;
        ctx.fillStyle = active ? "#FFF" : "#7F8C8D";
        ctx.font = active ? "bold 7px monospace" : "7px monospace";
        ctx.fillText(`${active ? ">" : " "}${index + 1} ${weapon?.name?.toUpperCase() ?? weaponId.toUpperCase()}`, 163, 127 + index * 13);
      });

      const activeWeapon = WEAPONS[player.currentWeaponId];
      if (activeWeapon) {
        ctx.fillStyle = "#F1C40F";
        ctx.font = "bold 6px monospace";
        ctx.fillText(`${(activeWeapon.projectileStyle ?? "bullet").toUpperCase()} // DMG ${activeWeapon.damage} // EN ${activeWeapon.manaCost}`, 163, 160);
        ctx.fillStyle = "#9AA7B2";
        ctx.font = "5px monospace";
        const words = activeWeapon.mechanic.toUpperCase().split(" ");
        const lines: string[] = [];
        let line = "";
        for (const word of words) {
          const next = line ? `${line} ${word}` : word;
          if (next.length > 30 && line) {
            lines.push(line);
            line = word;
          } else {
            line = next;
          }
        }
        if (line) lines.push(line);
        lines.slice(0, 2).forEach((text, index) => ctx.fillText(text, 163, 171 + index * 9));
      }
    }

    ctx.textAlign = "center";
    ctx.fillStyle = "#7F8C8D";
    ctx.font = "6px monospace";
    ctx.fillText(`[${input.getPrompt("interact")}] MENU    [${input.getPrompt("pause")}] RESUME`, 160, 197);
    ctx.textAlign = "left";
  }
}
