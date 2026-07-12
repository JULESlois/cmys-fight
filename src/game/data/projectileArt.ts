import type { ProjectileStyle } from "./weapons";

export type ProjectileShape =
  | "slug"
  | "needle"
  | "beam"
  | "arc"
  | "orb"
  | "flame"
  | "rocket"
  | "disc"
  | "water"
  | "sword"
  | "yoyo"
  | "prism"
  | "dragon";

export type ProjectileTrail = "none" | "short" | "long" | "ribbon" | "segmented" | "tether";

export interface ProjectileArtDefinition {
  shape: ProjectileShape;
  trail: ProjectileTrail;
  bodyLength: number;
  bodyWidth: number;
  trailSteps: number;
  glowScale: number;
  pulseRate: number;
}

export interface ProjectilePalette {
  shadow: string;
  base: string;
  highlight: string;
  accent: string;
  glow: string;
}

export const PROJECTILE_ART: Record<ProjectileStyle, ProjectileArtDefinition> = {
  bullet: { shape: "slug", trail: "short", bodyLength: 7, bodyWidth: 3, trailSteps: 2, glowScale: 0.45, pulseRate: 0 },
  tracer: { shape: "needle", trail: "long", bodyLength: 10, bodyWidth: 2, trailSteps: 6, glowScale: 0.7, pulseRate: 0 },
  beam: { shape: "beam", trail: "ribbon", bodyLength: 0, bodyWidth: 2, trailSteps: 0, glowScale: 1.1, pulseRate: 0 },
  lightning: { shape: "arc", trail: "segmented", bodyLength: 0, bodyWidth: 2, trailSteps: 7, glowScale: 1.2, pulseRate: 20 },
  plasma: { shape: "orb", trail: "segmented", bodyLength: 7, bodyWidth: 7, trailSteps: 4, glowScale: 1.35, pulseRate: 15 },
  flame: { shape: "flame", trail: "segmented", bodyLength: 10, bodyWidth: 6, trailSteps: 4, glowScale: 0.8, pulseRate: 18 },
  rocket: { shape: "rocket", trail: "long", bodyLength: 13, bodyWidth: 6, trailSteps: 5, glowScale: 0.75, pulseRate: 0 },
  disc: { shape: "disc", trail: "short", bodyLength: 9, bodyWidth: 9, trailSteps: 3, glowScale: 0.55, pulseRate: 0 },
  water: { shape: "water", trail: "segmented", bodyLength: 8, bodyWidth: 8, trailSteps: 4, glowScale: 1.15, pulseRate: 12 },
  sword: { shape: "sword", trail: "ribbon", bodyLength: 24, bodyWidth: 8, trailSteps: 3, glowScale: 0.8, pulseRate: 0 },
  yoyo: { shape: "yoyo", trail: "tether", bodyLength: 14, bodyWidth: 14, trailSteps: 0, glowScale: 0.8, pulseRate: 10 },
  prism: { shape: "prism", trail: "ribbon", bodyLength: 0, bodyWidth: 3, trailSteps: 0, glowScale: 1.3, pulseRate: 18 },
  dragon: { shape: "dragon", trail: "segmented", bodyLength: 28, bodyWidth: 8, trailSteps: 6, glowScale: 0.9, pulseRate: 9 },
};

export const PROJECTILE_WEAPON_PALETTES: Record<string, Partial<ProjectilePalette>> = {
  ray_gun: { shadow: "#7A281F", base: "#D7E53C", highlight: "#F7FFD6", accent: "#39A85B", glow: "rgba(215,229,60,0.38)" },
  venom_x: { shadow: "#203626", base: "#75DB49", highlight: "#D9FFB8", accent: "#B0F05D", glow: "rgba(117,219,73,0.34)" },
  wunderwaffe: { shadow: "#24313C", base: "#5DE7F2", highlight: "#F2FEFF", accent: "#D39A3B", glow: "rgba(93,231,242,0.38)" },
  starfall_array: { shadow: "#312159", base: "#A66DE0", highlight: "#F5E9FF", accent: "#55E8F2", glow: "rgba(166,109,224,0.34)" },
  void_rail: { shadow: "#21112D", base: "#B23BC9", highlight: "#F5B6FF", accent: "#6E2C91", glow: "rgba(178,59,201,0.36)" },
  dragon_breath: { shadow: "#6C2118", base: "#FF6E32", highlight: "#FFF1A8", accent: "#FFB32C", glow: "rgba(255,110,50,0.34)" },
  scavenger: { shadow: "#2A3947", base: "#C34737", highlight: "#FFD2A6", accent: "#688BA4", glow: "rgba(195,71,55,0.3)" },
  water_bolt: { shadow: "#174B79", base: "#4EB8F2", highlight: "#E9FAFF", accent: "#8DDBFF", glow: "rgba(78,184,242,0.34)" },
  terrarian: { shadow: "#123E2A", base: "#43B877", highlight: "#D9FFE9", accent: "#8CE8B6", glow: "rgba(67,184,119,0.3)" },
  last_prism: { shadow: "#4F3788", base: "#A46DE0", highlight: "#FFFFFF", accent: "#45D9D0", glow: "rgba(164,109,224,0.36)" },
  zenith: { shadow: "#3E337A", base: "#66D7C0", highlight: "#FFFFFF", accent: "#D85DA5", glow: "rgba(102,215,192,0.3)" },
  stardust_dragon_staff: { shadow: "#1F347E", base: "#57B7E8", highlight: "#E6FBFF", accent: "#7D86F4", glow: "rgba(87,183,232,0.32)" },
  minishark: { shadow: "#77531E", base: "#E0B95D", highlight: "#FFF0AD", accent: "#AAB8C1", glow: "rgba(224,185,93,0.22)" },
  ballistic_knife: { shadow: "#303941", base: "#A9B4BD", highlight: "#F7FBFD", accent: "#69747D", glow: "rgba(169,180,189,0.2)" },
};

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function parseHex(color: string): [number, number, number] | null {
  const value = color.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return null;
  const number = Number.parseInt(value, 16);
  return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
}

function toHex(rgb: [number, number, number]): string {
  return `#${rgb.map(channel => clampChannel(channel).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function mix(color: string, target: string, amount: number): string {
  const from = parseHex(color);
  const to = parseHex(target);
  if (!from || !to) return color;
  const t = Math.max(0, Math.min(1, amount));
  return toHex([
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
    from[2] + (to[2] - from[2]) * t,
  ]);
}

function rgba(color: string, alpha: number): string {
  const rgb = parseHex(color);
  if (!rgb) return `rgba(255,255,255,${alpha})`;
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

export function resolveProjectilePalette(
  style: ProjectileStyle,
  weaponId: string,
  projectileColor: string,
  critical = false,
  faction: "player" | "enemy" = "player",
): ProjectilePalette {
  if (faction === "enemy") {
    const base = projectileColor.startsWith("#") ? projectileColor : "#F05A67";
    return {
      shadow: "#2A0C14",
      base,
      highlight: critical ? "#FFF7C2" : mix(base, "#FFFFFF", 0.62),
      accent: "#FFCB5C",
      glow: rgba(base, 0.28),
    };
  }

  const base = projectileColor.startsWith("#") ? projectileColor : "#F4B942";
  const defaults: ProjectilePalette = {
    shadow: mix(base, "#05070A", style === "water" ? 0.58 : 0.68),
    base,
    highlight: critical ? "#FFF6B8" : mix(base, "#FFFFFF", 0.68),
    accent: mix(base, style === "flame" || style === "rocket" ? "#FFB22E" : "#55E8F2", 0.45),
    glow: rgba(base, critical ? 0.42 : 0.27),
  };
  return { ...defaults, ...(PROJECTILE_WEAPON_PALETTES[weaponId] ?? {}) };
}
