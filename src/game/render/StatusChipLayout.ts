import type { ActiveStatusEffect } from "../combat/StatusEffectSystem";

/** Keep application order, reserving a chip for movement-blocking Root. */
export function deriveVisibleStatuses<T extends Pick<ActiveStatusEffect, "id">>(
  statuses: readonly T[],
  limit = 3,
): T[] {
  const count = Math.max(0, Math.floor(limit));
  const visible = statuses.slice(0, count);
  if (visible.length === 0 || visible.some(status => status.id === "root")) return visible;
  const root = statuses.find(status => status.id === "root");
  if (root) visible[visible.length - 1] = root;
  return visible;
}
