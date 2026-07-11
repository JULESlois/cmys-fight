export type PowerSeries = "vanguard" | "aether" | "phoenix";

export const POWER_SERIES: Record<PowerSeries, { name: string; color: string }> = {
  vanguard: { name: "VANGUARD", color: "#F1C40F" },
  aether: { name: "AETHER", color: "#9B59FF" },
  phoenix: { name: "PHOENIX", color: "#FF6B4A" },
};
