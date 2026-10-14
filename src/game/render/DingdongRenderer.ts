import { DINGDONG_SKILL, getDingdongSkillFrame } from "../data/dingdong";
import type { Player } from "../entities/Player";

/** An active skill overrides locomotion without changing movement/collision. */
export function getDingdongSpriteName(player: Pick<Player, "skillActiveTimer" | "animState" | "animFrame">): string {
  if (player.skillActiveTimer > 0) return `player_dingdong_side_skill_${getDingdongSkillFrame(player.skillActiveTimer)}`;
  if (player.animState === "walk") return `player_dingdong_side_walk_${player.animFrame % 4}`;
  return player.animFrame % 2 === 1 ? "player_dingdong_side_idle_1" : "player_dingdong_side_idle";
}

/** Called in player-local space. The release origin stays in world space even
 * if the player keeps moving during recovery. No flash or random particles.
 */
export function drawDingdongPulse(ctx: CanvasRenderingContext2D, player: Player, reducedFlashing: boolean): void {
  if (player.skillActiveTimer <= 0) return;
  const elapsed = DINGDONG_SKILL.duration - player.skillActiveTimer;
  if (elapsed < DINGDONG_SKILL.releaseTime - 1e-9) return;
  const progress = Math.min(1, (elapsed - DINGDONG_SKILL.releaseTime) / (DINGDONG_SKILL.duration - DINGDONG_SKILL.releaseTime));
  const x = Math.round(player.dingdongPulseX - player.x);
  const y = Math.round(player.dingdongPulseY - player.y);
  ctx.save();
  ctx.globalAlpha *= (reducedFlashing ? 0.4 : 0.7) * (1 - progress);
  for (const radius of [DINGDONG_SKILL.radius, DINGDONG_SKILL.radius * (0.3 + 0.7 * progress)]) {
    ctx.fillStyle = radius === DINGDONG_SKILL.radius ? "#8BCFE0" : "#F5E9A9";
    for (let index = 0; index < 48; index++) {
      const angle = index * Math.PI * 2 / 48;
      ctx.fillRect(x + Math.round(Math.cos(angle) * radius) - 1, y + Math.round(Math.sin(angle) * radius) - 1, 2, 2);
    }
  }
  ctx.restore();
}
