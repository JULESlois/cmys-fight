/** Shared combat/animation timing: the pulse fires on the first release frame. */
export const DINGDONG_SKILL = {
  cooldown: 8,
  frameDurations: [0.1, 0.1, 0.06, 0.08, 0.1, 0.16] as readonly number[],
  duration: 0.6,
  releaseTime: 0.2,
  radius: 56,
  damage: 4,
  slowDuration: 1.5,
} as const;

export function getDingdongSkillFrame(remaining: number): number {
  const elapsed = Math.max(0, DINGDONG_SKILL.duration - remaining);
  let boundary = 0;
  for (let frame = 0; frame < DINGDONG_SKILL.frameDurations.length; frame++) {
    boundary += DINGDONG_SKILL.frameDurations[frame];
    if (elapsed < boundary - 1e-9) return frame;
  }
  return DINGDONG_SKILL.frameDurations.length - 1;
}
