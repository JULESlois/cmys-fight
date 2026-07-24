import type { Enemy, EnemyAnimationState, EnemyFacing } from "../entities/Enemy";
import { getEnemyDefinition, type EnemyBehavior } from "../data/enemies";

interface Palette {
  base: string;
  light: string;
  dark: string;
  ink: string;
  white: string;
  accent: string;
}

type ModelDraw = (
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  limbFrame: number,
  state: EnemyAnimationState,
  stateFrame: number,
  bossPhase?: 1 | 2 | 3,
) => void;

const NATIVE_PIXEL_MODELS = new Set([
  "moss_brute",
  "thorn_archer",
  "boar_charger",
  "dingdong_fowl",
  "spore_mimic",
  "root_lancer",
  "petal_moth",
  "forest_guardian",
  "broadcast_rooster",
  "bone_guard",
  "bolt_cultist",
  "grave_summoner",
  "bark_hound",
  "chain_jailer",
  "coffin_lobber",
  "lantern_wraith",
  "crypt_overseer",
  "kennel_warden",
  "frost_hound",
  "ice_shaman",
  "snow_turret",
  "white_sampler",
  "mirror_wisp",
  "icicle_sniper",
  "lab_servitor",
  "frost_titan",
  "white_director",
  "ember_knight",
  "magma_spitter",
  "cinder_oracle",
  "code_horse",
  "furnace_beetle",
  "magma_mortar",
  "heat_smith_drone",
  "inferno_core",
  "vat_horse_prime",
  // Phase 5
  "cursed_tome",
  "arcane_guard",
  "ink_summoner",
  "glyph_sniper",
  "tome_lord",
  "forge_mech",
  "slag_crawler",
  "anvil_guard",
  "forge_prime",
  "crystal_drifter",
  "canal_warden",
  "cryo_lancer",
  "glacier_director",
  "iron_sentinel",
  "siege_mortar",
  "armory_commander",
  "war_engine",
  "void_moth",
  "star_caster",
  "astral_shade",
  "star_sentinel",
  "ashen_revenant",
  "ash_lobber",
  "bone_sovereign",
  "chain_specter",
  "prison_brute",
  "warden_alpha",
  "archive_construct",
  "void_cultist",
  "echo_mind",
]);

export function usesNativeMonsterArt(enemyId: string): boolean {
  return NATIVE_PIXEL_MODELS.has(enemyId);
}

export const MONSTER_ANIMATION_FRAMES: Readonly<Record<EnemyAnimationState, number>> = Object.freeze({
  idle: 2,
  walk: 4,
  attack: 4,
  hurt: 2,
});

export interface MonsterAnimationPose {
  x: number;
  y: number;
  limbFrame: number;
}

export function getMonsterAnimationPose(state: EnemyAnimationState, frame: number): MonsterAnimationPose {
  const normalized = ((frame % MONSTER_ANIMATION_FRAMES[state]) + MONSTER_ANIMATION_FRAMES[state]) % MONSTER_ANIMATION_FRAMES[state];
  if (state === "walk") {
    const x = [0, 1, 0, -1][normalized];
    const y = [0, -1, 0, 1][normalized];
    return { x, y, limbFrame: normalized === 1 || normalized === 2 ? 1 : 0 };
  }
  if (state === "attack") {
    return { x: [0, 1, 3, 1][normalized], y: [0, -1, -1, 0][normalized], limbFrame: normalized & 1 };
  }
  if (state === "hurt") {
    return { x: normalized === 0 ? -2 : 1, y: normalized, limbFrame: normalized };
  }
  return { x: 0, y: normalized === 1 ? -1 : 0, limbFrame: normalized };
}

function adjustHex(color: string, amount: number): string {
  const value = color.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return color;
  const number = Number.parseInt(value, 16);
  const clamp = (component: number) => Math.max(0, Math.min(255, component + amount));
  const r = clamp((number >> 16) & 255);
  const g = clamp((number >> 8) & 255);
  const b = clamp(number & 255);
  return `#${[r, g, b].map(component => component.toString(16).padStart(2, "0")).join("")}`;
}

function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function outlined(ctx: CanvasRenderingContext2D, p: Palette, x: number, y: number, w: number, h: number, color = p.base): void {
  rect(ctx, p.ink, x - 1, y - 1, w + 2, h + 2);
  rect(ctx, color, x, y, w, h);
}

function eye(ctx: CanvasRenderingContext2D, p: Palette, x: number, y: number): void {
  rect(ctx, p.white, x, y, 2, 2);
  rect(ctx, p.ink, x + 1, y, 1, 1);
}

function legs(ctx: CanvasRenderingContext2D, p: Palette, leftX: number, rightX: number, y: number, frame: number): void {
  rect(ctx, p.ink, leftX - 1, y - 1, 4, 5);
  rect(ctx, p.ink, rightX - 1, y - 1, 4, 5);
  rect(ctx, p.dark, leftX, y + (frame ? 1 : 0), 2, 3);
  rect(ctx, p.dark, rightX, y + (frame ? 0 : 1), 2, 3);
}

function phaseOf(state: EnemyAnimationState, frame: number): number {
  return ((frame % MONSTER_ANIMATION_FRAMES[state]) + MONSTER_ANIMATION_FRAMES[state]) % MONSTER_ANIMATION_FRAMES[state];
}

function drawPixelEye(ctx: CanvasRenderingContext2D, p: Palette, x: number, y: number, color = "#D9FFF2"): void {
  rect(ctx, p.ink, x - 1, y - 1, 3, 3);
  rect(ctx, color, x, y, 1, 1);
}

function drawRootFoot(ctx: CanvasRenderingContext2D, p: Palette, x: number, y: number, forward: boolean): void {
  rect(ctx, p.ink, x - 1, y - 1, 5, 5);
  rect(ctx, "#5A3B25", x, y, 3, 3);
  rect(ctx, "#79543A", x + 1, y, 2, 1);
  rect(ctx, p.ink, x + (forward ? 2 : -1), y + 2, 3, 2);
  rect(ctx, "#5A3B25", x + (forward ? 2 : -1), y + 2, 2, 1);
}

function drawChainLink(ctx: CanvasRenderingContext2D, p: Palette, x: number, y: number, vertical: boolean): void {
  rect(ctx, p.ink, x - 1, y - 1, vertical ? 4 : 6, vertical ? 6 : 4);
  rect(ctx, "#94A3AD", x, y, vertical ? 2 : 4, vertical ? 4 : 2);
  rect(ctx, "#2D3842", x + (vertical ? 1 : 2), y + (vertical ? 1 : 0), 1, vertical ? 2 : 1);
}

function drawDetailPixels(
  ctx: CanvasRenderingContext2D,
  color: string,
  points: ReadonlyArray<readonly [number, number, number?, number?]>,
): void {
  for (const [x, y, width = 1, height = 1] of points) rect(ctx, color, x, y, width, height);
}

const INVERSE_DETAIL_BOB_IDS = new Set(["bark_hound", "kennel_warden", "frost_hound"]);

/**
 * Authored one-pixel material pass. The base models establish silhouette and
 * animation; this pass adds the high-frequency information that survives at
 * native 1x: bark grain, bone fractures, stitching, rivets, frost facets,
 * warning labels, molten seams and phase damage. Nothing here is random, so
 * details remain stable instead of sparkling between animation frames.
 */
function drawAuthoredMonsterDetail(
  ctx: CanvasRenderingContext2D,
  enemyId: string,
  state: EnemyAnimationState,
  stateFrame: number,
  bossPhase: 1 | 2 | 3 = 1,
): void {
  const phase = phaseOf(state, stateFrame);
  const bob = state === "idle"
    ? [0, -1][phase]
    : state === "walk"
      ? INVERSE_DETAIL_BOB_IDS.has(enemyId) ? [0, -1, 0, 1][phase] : [0, 1, 0, -1][phase]
      : 0;

  switch (enemyId) {
    case "moss_brute":
      drawDetailPixels(ctx, "#B4895D", [[-5, -13 + bob, 1, 5], [1, -16 + bob, 2, 1], [5, -10 + bob, 1, 4]]);
      drawDetailPixels(ctx, "#2D4928", [[-8, -29 + bob, 2, 1], [4, -30 + bob, 3, 1], [8, -15 + bob, 2, 2]]);
      drawDetailPixels(ctx, "#D7F08A", [[-11, -18 + bob, 2, 1], [8, -31 + bob, 2, 1], [10, -12 + bob]]);
      drawDetailPixels(ctx, "#F0C45C", [[-9, -24 + bob, 2, 2]]);
      break;
    case "thorn_archer":
      drawDetailPixels(ctx, "#9FCB67", [[-9, -14 + bob, 1, 4], [-5, -11 + bob, 3, 1], [2, -8 + bob, 1, 5]]);
      drawDetailPixels(ctx, "#2E4028", [[-3, -16 + bob, 1, 4], [1, -24 + bob, 3, 1]]);
      drawDetailPixels(ctx, "#D7EF9B", [[12, -23 + bob], [12, 0 + bob], [4, -29 + bob]]);
      break;
    case "boar_charger":
      drawDetailPixels(ctx, "#A87956", [[-9, -16 + bob, 5, 1], [-5, -12 + bob, 1, 5], [2, -17 + bob, 4, 1]]);
      drawDetailPixels(ctx, "#3A2825", [[-12, -7 + bob, 2, 1], [6, -10 + bob, 2, 1]]);
      drawDetailPixels(ctx, "#FFF3C5", [[18, -3 + bob, 2, 1], [15, 0 + bob]]);
      break;
    case "dingdong_fowl":
      drawDetailPixels(ctx, "#D7C99F", [[-3, -17 + bob, 1, 4], [2, -15 + bob, 1, 5], [6, -11 + bob, 1, 3]]);
      drawDetailPixels(ctx, "#FFFBEA", [[-2, -28 + bob, 4, 1], [-6, -18 + bob, 2, 1]]);
      drawDetailPixels(ctx, "#8A5A16", [[-2, -9 + bob, 5, 1], [0, -5 + bob]]);
      break;
    case "spore_mimic":
      drawDetailPixels(ctx, "#F6C85A", [[-9, -28 + bob, 2, 2], [-2, -30 + bob], [7, -27 + bob, 2, 1]]);
      drawDetailPixels(ctx, "#8E2833", [[-8, -13 + bob, 3, 1], [-1, -11 + bob, 4, 1], [7, -14 + bob, 2, 1]]);
      drawDetailPixels(ctx, "#FFF7D8", [[-4, -16 + bob], [3, -16 + bob], [9, -15 + bob]]);
      break;
    case "root_lancer":
      drawDetailPixels(ctx, "#B98B5B", [[-5, -18 + bob, 1, 8], [2, -16 + bob, 1, 7], [8, -11 + bob, 1, 5]]);
      drawDetailPixels(ctx, "#D9F2A2", [[-7, -30 + bob, 2, 1], [3, -32 + bob, 2, 1], [19, -18 + bob]]);
      drawDetailPixels(ctx, "#49683A", [[-9, -23 + bob, 3, 2], [5, -25 + bob, 4, 1], [12, -16 + bob, 4, 1]]);
      break;
    case "petal_moth":
      drawDetailPixels(ctx, "#FFD3E2", [[-15, -22 + bob, 4, 1], [12, -21 + bob, 4, 1], [-13, -10 + bob, 3, 1], [11, -9 + bob, 3, 1]]);
      drawDetailPixels(ctx, "#8D5578", [[-9, -17 + bob], [8, -16 + bob], [-2, -27 + bob, 4, 1]]);
      drawDetailPixels(ctx, "#F6D96B", [[-1, -18 + bob, 2, 2], [-18, -15 + bob], [17, -14 + bob]]);
      break;
    case "forest_guardian":
      drawDetailPixels(ctx, "#B88A5E", [[-9, -31 + bob, 1, 8], [-4, -14 + bob, 1, 5], [8, -28 + bob, 2, 1], [11, -18 + bob, 1, 6]]);
      drawDetailPixels(ctx, "#36572B", [[-20, -41 + bob, 3, 1], [-7, -46 + bob, 2, 2], [18, -44 + bob, 2, 1]]);
      drawDetailPixels(ctx, "#F4D67D", [[-17, -39 + bob], [23, -41 + bob], [-1, -16 + bob]]);
      if (bossPhase >= 2) drawDetailPixels(ctx, "#EE8CB3", [[-12, -35 + bob], [13, -33 + bob], [-18, -11 + bob], [18, -13 + bob]]);
      if (bossPhase >= 3) drawDetailPixels(ctx, "#FFF7B2", [[-8, -21 + bob, 3, 1], [5, -20 + bob, 3, 1], [0, -29 + bob, 1, 4]]);
      break;
    case "broadcast_rooster":
      drawDetailPixels(ctx, "#5F7077", [[-22, -23 + bob], [-18, -23 + bob], [-14, -23 + bob], [17, -37 + bob, 1, 8]]);
      drawDetailPixels(ctx, "#FFF1A0", [[-4, -16 + bob, 8, 1], [-2, -8 + bob, 4, 1], [17, -34 + bob, 1, 5]]);
      drawDetailPixels(ctx, "#A76017", [[-14, -12 + bob, 1, 6], [14, -18 + bob, 1, 7]]);
      if (bossPhase >= 2) drawDetailPixels(ctx, "#FFF59D", [[-28, -19 + bob], [21, -15 + bob], [-18, -31 + bob]]);
      if (bossPhase >= 3) drawDetailPixels(ctx, "#FF7043", [[-5, -13 + bob, 11, 1], [-25, -29 + bob], [24, -28 + bob]]);
      break;

    case "bone_guard":
      drawDetailPixels(ctx, "#F5F5EA", [[-5, -26 + bob, 3, 1], [3, -18 + bob, 2, 1], [-5, -12 + bob, 2, 1], [3, -8 + bob, 2, 1]]);
      drawDetailPixels(ctx, "#8B999E", [[-12, -14 + bob], [-11, -7 + bob], [-8, -29 + bob, 4, 1]]);
      drawDetailPixels(ctx, "#57452B", [[-13, -3 + bob], [11, -3 + bob]]);
      drawDetailPixels(ctx, "#DCE4E2", [[-13, -17 + bob, 2, 5], [-4, -15 + bob, 1, 6]]);
      break;
    case "bolt_cultist":
      drawDetailPixels(ctx, "#70418C", [[-6, -8 + bob, 1, 8], [4, -7 + bob, 1, 6], [-6, -25 + bob, 3, 1]]);
      drawDetailPixels(ctx, "#F0D8F7", [[-2, -20 + bob], [3, -20 + bob], [-1, -5 + bob, 2, 1]]);
      drawDetailPixels(ctx, "#C878E3", [[-8, -12 + bob], [6, -10 + bob], [0, 2 + bob]]);
      break;
    case "grave_summoner":
      drawDetailPixels(ctx, "#645078", [[-7, -13 + bob, 1, 12], [5, -10 + bob, 1, 9], [-5, -29 + bob, 4, 1]]);
      drawDetailPixels(ctx, "#9C919F", [[9, -26 + bob, 8, 1], [12, -20 + bob], [13, -8 + bob, 1, 5]]);
      drawDetailPixels(ctx, "#86F2C5", [[-3, -21 + bob], [3, -21 + bob], [13, -24 + bob]]);
      break;
    case "bark_hound":
      drawDetailPixels(ctx, "#A98269", [[-9, -12 + bob, 5, 1], [-1, -10 + bob, 1, 4], [8, -15 + bob, 2, 1]]);
      drawDetailPixels(ctx, "#C2CBCC", [[-7, -16 + bob], [1, -16 + bob], [15, -11 + bob], [19, -11 + bob]]);
      drawDetailPixels(ctx, "#E6BB4B", [[-10, -8 + bob], [5, -8 + bob], [0, -7 + bob]]);
      break;
    case "chain_jailer":
      drawDetailPixels(ctx, "#8798A0", [[-8, -16 + bob, 1, 7], [5, -14 + bob, 1, 6], [-8, -31 + bob, 5, 1]]);
      drawDetailPixels(ctx, "#E1B94E", [[-7, -6 + bob, 4, 1], [4, -6 + bob, 3, 1]]);
      drawDetailPixels(ctx, "#D8E0E1", [[-4, -26 + bob], [4, -26 + bob], [15, -2 + bob]]);
      break;
    case "coffin_lobber":
      drawDetailPixels(ctx, "#81798B", [[-11, -18 + bob, 1, 12], [8, -17 + bob, 1, 10], [-8, -29 + bob, 7, 1]]);
      drawDetailPixels(ctx, "#C9C2D0", [[-6, -25 + bob, 3, 1], [4, -24 + bob, 3, 1], [17, -15 + bob, 2, 1]]);
      drawDetailPixels(ctx, "#B973D6", [[-1, -12 + bob, 3, 3], [21, -9 + bob], [-14, -7 + bob]]);
      break;
    case "lantern_wraith":
      drawDetailPixels(ctx, "#E9D7F1", [[-5, -25 + bob, 3, 1], [4, -24 + bob, 2, 1], [-8, -11 + bob], [8, -10 + bob]]);
      drawDetailPixels(ctx, "#7B4A91", [[-9, -17 + bob, 1, 8], [8, -16 + bob, 1, 7], [-3, -31 + bob, 6, 1]]);
      drawDetailPixels(ctx, "#D9FFBF", [[-1, -18 + bob, 3, 3], [-14, -5 + bob], [13, -4 + bob]]);
      break;
    case "crypt_overseer":
      drawDetailPixels(ctx, "#72508C", [[-11, -18 + bob, 1, 17], [8, -17 + bob, 1, 14], [-10, -42 + bob, 6, 1]]);
      drawDetailPixels(ctx, "#E9E5DA", [[-9, -37 + bob, 3, 1], [5, -37 + bob, 3, 1], [-2, -28 + bob, 5, 1]]);
      drawDetailPixels(ctx, "#E7B8FF", [[-1, -9 + bob, 2, 5], [-7, -32 + bob], [7, -32 + bob]]);
      if (bossPhase >= 2) drawDetailPixels(ctx, "#B66CDE", [[-23, -37 + bob], [19, -34 + bob], [-19, -8 + bob], [21, -5 + bob]]);
      if (bossPhase >= 3) drawDetailPixels(ctx, "#F6D9FF", [[-2, -56 + bob, 5, 1], [-30, -15 + bob], [30, -13 + bob]]);
      break;
    case "kennel_warden":
      drawDetailPixels(ctx, "#9CA8AA", [[-17, -26 + bob], [-10, -26 + bob], [-3, -26 + bob], [4, -26 + bob]]);
      drawDetailPixels(ctx, "#A37A3A", [[-18, -12 + bob, 6, 1], [-5, -12 + bob, 5, 1], [9, -12 + bob, 5, 1]]);
      drawDetailPixels(ctx, "#F1C75A", [[-15, -11 + bob], [-4, -11 + bob], [9, -11 + bob], [34, -22 + bob]]);
      if (bossPhase >= 2) drawDetailPixels(ctx, "#B5C1C3", [[-19, -33 + bob, 3, 1], [-2, -34 + bob, 3, 1]]);
      if (bossPhase >= 3) drawDetailPixels(ctx, "#FF9B65", [[-17, -34 + bob, 2, 1], [1, -35 + bob, 2, 1], [-29, -13 + bob]]);
      break;

    case "frost_hound":
      drawDetailPixels(ctx, "#DDF8FC", [[-10, -17 + bob, 4, 1], [-4, -21 + bob], [2, -18 + bob, 3, 1], [8, -15 + bob, 2, 1]]);
      drawDetailPixels(ctx, "#3E7890", [[-8, -9 + bob, 1, 4], [5, -12 + bob, 1, 5]]);
      drawDetailPixels(ctx, "#F8FFFF", [[14, -17 + bob], [20, -16 + bob], [-21, -21 + bob]]);
      break;
    case "ice_shaman":
      drawDetailPixels(ctx, "#F8FFFF", [[-8, -17 + bob, 4, 1], [4, -15 + bob, 2, 1], [-8, -36 + bob], [-3, -39 + bob], [4, -38 + bob]]);
      drawDetailPixels(ctx, "#68AABC", [[-6, -11 + bob, 1, 8], [4, -10 + bob, 1, 7]]);
      drawDetailPixels(ctx, "#D9FAFF", [[-2, -22 + bob], [3, -22 + bob], [13, -32 + bob]]);
      break;
    case "snow_turret":
      drawDetailPixels(ctx, "#AFCBD2", [[-11, 1, 4, 1], [-3, 1, 4, 1], [5, 1, 4, 1], [13, 1]]);
      drawDetailPixels(ctx, "#1B4051", [[-6, -9, 2, 1], [1, -9], [13, -8, 1, 4]]);
      drawDetailPixels(ctx, "#E7FEFF", [[-4, -13], [4, -13], [23, -10]]);
      break;
    case "white_sampler":
      drawDetailPixels(ctx, "#7FA9B3", [[-13, -13 + bob, 1, 7], [5, -17 + bob, 1, 9], [-6, -31 + bob, 5, 1]]);
      drawDetailPixels(ctx, "#D34C52", [[-7, -12 + bob, 4, 2], [3, -12 + bob, 3, 1]]);
      drawDetailPixels(ctx, "#E9FFFF", [[-5, -28 + bob, 5, 1], [8, -28 + bob], [22, -13 + bob]]);
      drawDetailPixels(ctx, "#64D9E7", [[8, -19 + bob, 2, 3]]);
      break;
    case "mirror_wisp": {
      const hover = state === "walk" ? [0, -2, 0, 2][phase] : state === "idle" ? [0, -1][phase] : 0;
      drawDetailPixels(ctx, "#E7FDFF", [[-5, -22 + hover], [4, -23 + hover], [-2, -29 + hover], [3, -8 + hover]]);
      drawDetailPixels(ctx, "#4C8A9B", [[-7, -18 + hover, 1, 5], [7, -17 + hover, 1, 4]]);
      drawDetailPixels(ctx, "#FFFFFF", [[0, -18 + hover, 2, 1], [-8, -5 + hover], [8, -4 + hover]]);
      break;
    }
    case "icicle_sniper":
      drawDetailPixels(ctx, "#E9FFFF", [[-7, -28 + bob, 5, 1], [5, -26 + bob, 3, 1], [19, -18 + bob, 3, 1]]);
      drawDetailPixels(ctx, "#4F8395", [[-9, -16 + bob, 1, 9], [6, -15 + bob, 1, 8], [12, -17 + bob, 6, 1]]);
      drawDetailPixels(ctx, "#74E5F2", [[-3, -22 + bob], [3, -22 + bob], [24, -17 + bob]]);
      break;
    case "lab_servitor":
      drawDetailPixels(ctx, "#F1FFFF", [[-8, -27 + bob, 5, 1], [4, -26 + bob, 4, 1], [-10, -11 + bob, 3, 1]]);
      drawDetailPixels(ctx, "#7397A1", [[-11, -17 + bob, 1, 8], [8, -16 + bob, 1, 7], [-4, -8 + bob, 9, 1]]);
      drawDetailPixels(ctx, "#D8535D", [[-8, -13 + bob, 4, 2], [6, -12 + bob, 3, 1]]);
      drawDetailPixels(ctx, "#65E0E9", [[-1, -19 + bob, 3, 3], [14, -15 + bob], [-15, -14 + bob]]);
      break;
    case "frost_titan":
      drawDetailPixels(ctx, "#D9F9FC", [[-15, -33 + bob, 2, 12], [-7, -50 + bob, 5, 1], [7, -49 + bob, 4, 1], [11, -30 + bob, 1, 8]]);
      drawDetailPixels(ctx, "#245F7A", [[-19, -22 + bob, 4, 1], [9, -15 + bob, 4, 1], [-11, -4 + bob, 3, 1]]);
      drawDetailPixels(ctx, "#FFFFFF", [[-5, -45 + bob], [5, -45 + bob], [-1, -19 + bob, 3, 1]]);
      if (bossPhase >= 2) drawDetailPixels(ctx, "#E8FDFF", [[-26, -52 + bob], [23, -50 + bob], [-24, -27 + bob], [23, -25 + bob]]);
      if (bossPhase >= 3) drawDetailPixels(ctx, "#FFFFFF", [[-3, -74 + bob, 7, 1], [-41, 7 + bob], [41, 5 + bob]]);
      break;
    case "white_director":
      drawDetailPixels(ctx, "#8FAAB0", [[-27, -26 + bob, 1, 15], [25, -26 + bob, 1, 15], [8, -31 + bob, 1, 15]]);
      drawDetailPixels(ctx, "#D34C52", [[-14, -36 + bob, 7, 1], [7, -36 + bob, 7, 1], [-17, -22 + bob, 4, 1]]);
      drawDetailPixels(ctx, "#E9FFFF", [[-10, -48 + bob, 8, 1], [9, -47 + bob, 3, 1], [29, -27 + bob]]);
      if (bossPhase >= 2) drawDetailPixels(ctx, "#D94F55", [[-27, -47 + bob], [36, -45 + bob], [-24, -38 + bob], [25, -37 + bob]]);
      if (bossPhase >= 3) drawDetailPixels(ctx, "#D9FFFF", [[-34, -11 + bob, 2, 6], [31, -10 + bob, 2, 6], [-2, -65 + bob, 5, 1]]);
      break;

    case "ember_knight":
      drawDetailPixels(ctx, "#A84831", [[-12, -15 + bob, 1, 8], [-5, -17 + bob, 1, 6], [4, -15 + bob, 1, 7]]);
      drawDetailPixels(ctx, "#FFB52E", [[-14, -9 + bob], [-2, -15 + bob, 2, 3], [2, -24 + bob], [14, -18 + bob, 2, 1]]);
      drawDetailPixels(ctx, "#2A1C22", [[-6, -7 + bob, 3, 1], [3, -6 + bob, 2, 1]]);
      break;
    case "magma_spitter":
      drawDetailPixels(ctx, "#FF9A24", [[-8, -11 + bob, 3, 1], [-1, -14 + bob], [5, -9 + bob, 2, 1], [12, -12 + bob]]);
      drawDetailPixels(ctx, "#421B1B", [[-10, -5 + bob, 4, 1], [2, -5 + bob, 3, 1]]);
      drawDetailPixels(ctx, "#FFE36B", [[-2, -6 + bob], [15, -13 + bob], [22, -5 + bob]]);
      break;
    case "cinder_oracle":
      drawDetailPixels(ctx, "#A9412C", [[-8, -17 + bob, 1, 10], [4, -15 + bob, 1, 9], [-5, -29 + bob, 3, 1]]);
      drawDetailPixels(ctx, "#FFB52D", [[-4, -16 + bob], [-1, -36 + bob], [5, -33 + bob], [12, -27 + bob]]);
      drawDetailPixels(ctx, "#2C1B20", [[-7, -10 + bob, 4, 1], [2, -8 + bob, 3, 1]]);
      break;
    case "code_horse":
      drawDetailPixels(ctx, "#8A3A32", [[-14, -18 + bob, 5, 1], [-3, -17 + bob, 1, 6], [5, -15 + bob, 2, 1]]);
      drawDetailPixels(ctx, "#8CFF83", [[-8, -14 + bob], [-5, -12 + bob], [-2, -10 + bob], [11, -29 + bob]]);
      drawDetailPixels(ctx, "#1B3028", [[-9, -12 + bob, 2, 1], [-6, -10 + bob, 2, 1]]);
      break;
    case "furnace_beetle":
      drawDetailPixels(ctx, "#A8402F", [[-12, -15 + bob, 5, 1], [5, -14 + bob, 4, 1], [-13, -5 + bob, 3, 1], [9, -4 + bob, 3, 1]]);
      drawDetailPixels(ctx, "#8E8580", [[-8, -24 + bob, 3, 1], [-7, -20 + bob], [15, -12 + bob]]);
      drawDetailPixels(ctx, "#FFE36B", [[-1, -8 + bob], [17, -10 + bob], [26, -6 + bob]]);
      break;
    case "magma_mortar":
      drawDetailPixels(ctx, "#A34631", [[-12, -14 + bob, 5, 1], [4, -13 + bob, 4, 1], [-8, -25 + bob, 4, 1]]);
      drawDetailPixels(ctx, "#8F8A86", [[-10, -20 + bob, 3, 1], [10, -18 + bob, 3, 1], [18, -24 + bob, 2, 1]]);
      drawDetailPixels(ctx, "#FFE36A", [[-1, -9 + bob], [20, -27 + bob], [25, -22 + bob]]);
      break;
    case "heat_smith_drone":
      drawDetailPixels(ctx, "#A74A32", [[-8, -18 + bob, 4, 1], [4, -17 + bob, 4, 1], [-2, -29 + bob, 5, 1]]);
      drawDetailPixels(ctx, "#A6AAA6", [[-10, -8 + bob, 3, 1], [8, -7 + bob, 3, 1], [-14, -15 + bob], [13, -14 + bob]]);
      drawDetailPixels(ctx, "#FFE572", [[-1, -17 + bob, 3, 3], [-17, -5 + bob], [16, -4 + bob]]);
      break;
    case "inferno_core":
      drawDetailPixels(ctx, "#A9432F", [[-19, -37 + bob, 7, 1], [11, -33 + bob, 6, 1], [-17, -8 + bob, 5, 1], [13, -4 + bob, 4, 1]]);
      drawDetailPixels(ctx, "#7C7776", [[-21, -20 + bob], [20, -16 + bob], [-10, -49 + bob], [10, -47 + bob]]);
      drawDetailPixels(ctx, "#FFE36B", [[-8, -22 + bob], [7, -19 + bob], [-20, -10 + bob], [18, -35 + bob]]);
      if (bossPhase >= 2) drawDetailPixels(ctx, "#D85A32", [[-31, -41 + bob], [30, -40 + bob], [-28, 8 + bob], [27, 7 + bob]]);
      if (bossPhase >= 3) drawDetailPixels(ctx, "#FFF3A2", [[-14, -32 + bob], [12, -9 + bob], [-2, -54 + bob, 5, 1]]);
      break;
    case "vat_horse_prime":
      drawDetailPixels(ctx, "#8A4140", [[-28, -31 + bob, 8, 1], [10, -29 + bob, 7, 1], [-21, -12 + bob, 5, 1]]);
      drawDetailPixels(ctx, "#A7B1AE", [[-25, -7 + bob], [-12, -5 + bob], [11, -6 + bob], [23, -4 + bob], [13, -41 + bob]]);
      drawDetailPixels(ctx, "#9BFF9C", [[-16, -39 + bob], [-11, -38 + bob], [-5, -40 + bob], [35, -35 + bob]]);
      drawDetailPixels(ctx, "#FF9B29", [[-40, -22 + bob], [21, -49 + bob], [28, -47 + bob], [24, -40 + bob]]);
      if (bossPhase >= 2) drawDetailPixels(ctx, "#D35836", [[-34, -38 + bob], [-29, -18 + bob], [17, -18 + bob]]);
      if (bossPhase >= 3) drawDetailPixels(ctx, "#FFF0A0", [[-5, -52 + bob], [-22, -4 + bob], [18, -6 + bob]]);
      break;

    // === PHASE 5 MONSTER DETAILS ===

    case "cursed_tome":
      drawDetailPixels(ctx, "#F0D8FF", [[-5, -18 + bob, 3, 1], [4, -17 + bob, 2, 1], [-7, -9 + bob], [6, -8 + bob]]);
      drawDetailPixels(ctx, "#9B59B6", [[-8, -14 + bob, 1, 7], [7, -13 + bob, 1, 6], [-3, -24 + bob, 6, 1]]);
      drawDetailPixels(ctx, "#D17CFF", [[-1, -16 + bob, 3, 3], [-11, -5 + bob], [10, -4 + bob]]);
      break;
    case "arcane_guard":
      drawDetailPixels(ctx, "#C4A0D8", [[-10, -15 + bob, 4, 1], [3, -16 + bob, 5, 1], [-9, -30 + bob, 6, 1]]);
      drawDetailPixels(ctx, "#782A9C", [[-7, -9 + bob, 1, 7], [5, -8 + bob, 1, 6]]);
      drawDetailPixels(ctx, "#E8D0F5", [[-3, -22 + bob], [3, -21 + bob], [13, -28 + bob]]);
      break;
    case "ink_summoner":
      drawDetailPixels(ctx, "#9B59B6", [[-7, -14 + bob, 1, 9], [5, -12 + bob, 1, 8], [-5, -28 + bob, 4, 1]]);
      drawDetailPixels(ctx, "#E0D0F0", [[9, -24 + bob, 7, 1], [12, -19 + bob], [14, -8 + bob, 1, 5]]);
      drawDetailPixels(ctx, "#C39BD3", [[-2, -20 + bob], [3, -20 + bob], [13, -22 + bob]]);
      break;
    case "glyph_sniper":
      drawDetailPixels(ctx, "#D7BDE2", [[-7, -26 + bob, 5, 1], [5, -24 + bob, 3, 1], [19, -17 + bob, 3, 1]]);
      drawDetailPixels(ctx, "#7D3C98", [[-9, -14 + bob, 1, 9], [6, -13 + bob, 1, 8], [12, -15 + bob, 6, 1]]);
      drawDetailPixels(ctx, "#F0C3F7", [[-3, -20 + bob], [3, -20 + bob], [24, -15 + bob]]);
      break;
    case "tome_lord":
      drawDetailPixels(ctx, "#7D3C98", [[-19, -35 + bob, 2, 16], [16, -34 + bob, 2, 14], [-17, -57 + bob, 8, 1]]);
      drawDetailPixels(ctx, "#F0D0FF", [[-14, -50 + bob, 4, 1], [8, -49 + bob, 4, 1], [-4, -38 + bob, 8, 1]]);
      drawDetailPixels(ctx, "#E8B8FF", [[-2, -15 + bob, 4, 6], [-10, -44 + bob], [11, -44 + bob]]);
      if (bossPhase >= 2) drawDetailPixels(ctx, "#C39BD3", [[-31, -48 + bob], [28, -45 + bob], [-27, -9 + bob], [28, -7 + bob]]);
      if (bossPhase >= 3) drawDetailPixels(ctx, "#FFFFFF", [[-4, -72 + bob, 8, 1], [-44, -16 + bob], [44, -14 + bob]]);
      break;

    case "forge_mech":
      drawDetailPixels(ctx, "#C75A3A", [[-11, -14 + bob, 4, 1], [5, -15 + bob, 4, 1], [-10, -27 + bob, 6, 1]]);
      drawDetailPixels(ctx, "#8E8A85", [[-8, -23 + bob, 3, 1], [8, -20 + bob, 3, 1], [15, -12 + bob]]);
      drawDetailPixels(ctx, "#FFE46B", [[-2, -7 + bob], [15, -10 + bob], [24, -5 + bob]]);
      break;
    case "slag_crawler":
      drawDetailPixels(ctx, "#FF6B20", [[-9, -10 + bob, 3, 1], [-1, -13 + bob], [5, -8 + bob, 2, 1], [11, -11 + bob]]);
      drawDetailPixels(ctx, "#3A1A1A", [[-10, -4 + bob, 4, 1], [2, -4 + bob, 3, 1]]);
      drawDetailPixels(ctx, "#FFE36B", [[-2, -5 + bob], [14, -12 + bob], [21, -5 + bob]]);
      break;
    case "anvil_guard":
      drawDetailPixels(ctx, "#A03028", [[-12, -14 + bob, 5, 1], [4, -15 + bob, 5, 1], [-8, -30 + bob, 4, 1]]);
      drawDetailPixels(ctx, "#7A7575", [[-10, -22 + bob, 3, 1], [9, -20 + bob, 3, 1], [18, -25 + bob, 2, 1]]);
      drawDetailPixels(ctx, "#FFE36A", [[-1, -8 + bob], [20, -26 + bob], [25, -21 + bob]]);
      break;
    case "forge_prime":
      drawDetailPixels(ctx, "#A83428", [[-22, -36 + bob, 8, 1], [13, -32 + bob, 7, 1], [-20, -8 + bob, 6, 1], [16, -4 + bob, 5, 1]]);
      drawDetailPixels(ctx, "#7A7776", [[-24, -19 + bob], [23, -16 + bob], [-12, -50 + bob], [13, -48 + bob]]);
      drawDetailPixels(ctx, "#FFE46C", [[-9, -21 + bob], [8, -18 + bob], [-22, -9 + bob], [20, -34 + bob]]);
      if (bossPhase >= 2) drawDetailPixels(ctx, "#D05A32", [[-34, -40 + bob], [33, -39 + bob], [-30, 9 + bob], [29, 8 + bob]]);
      if (bossPhase >= 3) drawDetailPixels(ctx, "#FFF3A2", [[-16, -31 + bob], [14, -8 + bob], [-3, -55 + bob, 6, 1]]);
      break;

    case "crystal_drifter": {
      const hover = state === "walk" ? [0, -2, 0, 2][phase] : state === "idle" ? [0, -1][phase] : 0;
      drawDetailPixels(ctx, "#D8F4FF", [[-5, -20 + hover], [4, -21 + hover], [-2, -27 + hover], [3, -7 + hover]]);
      drawDetailPixels(ctx, "#5EA8C1", [[-7, -16 + hover, 1, 5], [7, -15 + hover, 1, 4]]);
      drawDetailPixels(ctx, "#AEE6FF", [[0, -16 + hover, 2, 1], [-8, -4 + hover], [8, -3 + hover]]);
      break;
    }
    case "canal_warden":
      drawDetailPixels(ctx, "#A0D4E8", [[-10, -15 + bob, 4, 1], [3, -16 + bob, 5, 1], [-9, -29 + bob, 6, 1]]);
      drawDetailPixels(ctx, "#2B6A82", [[-7, -9 + bob, 1, 7], [5, -8 + bob, 1, 6]]);
      drawDetailPixels(ctx, "#D9F5FF", [[-3, -22 + bob], [3, -21 + bob], [13, -28 + bob]]);
      break;
    case "cryo_lancer":
      drawDetailPixels(ctx, "#C5E8F5", [[-7, -27 + bob, 5, 1], [5, -25 + bob, 3, 1], [19, -17 + bob, 3, 1]]);
      drawDetailPixels(ctx, "#3A7A90", [[-9, -14 + bob, 1, 9], [6, -13 + bob, 1, 8], [12, -16 + bob, 6, 1]]);
      drawDetailPixels(ctx, "#85E5F2", [[-3, -21 + bob], [3, -21 + bob], [24, -16 + bob]]);
      break;
    case "glacier_director":
      drawDetailPixels(ctx, "#C4E8F8", [[-18, -32 + bob, 2, 12], [15, -31 + bob, 2, 11], [-15, -53 + bob, 6, 1], [7, -51 + bob, 5, 1]]);
      drawDetailPixels(ctx, "#1F6E8C", [[-22, -20 + bob, 4, 1], [11, -15 + bob, 4, 1], [-12, -4 + bob, 3, 1]]);
      drawDetailPixels(ctx, "#E9FDFF", [[-6, -45 + bob], [6, -45 + bob], [-2, -18 + bob, 4, 1]]);
      if (bossPhase >= 2) drawDetailPixels(ctx, "#AEE6FF", [[-29, -51 + bob], [25, -49 + bob], [-27, -26 + bob], [25, -24 + bob]]);
      if (bossPhase >= 3) drawDetailPixels(ctx, "#FFFFFF", [[-4, -72 + bob, 7, 1], [-43, 8 + bob], [43, 6 + bob]]);
      break;

    case "iron_sentinel":
      drawDetailPixels(ctx, "#C8D0D2", [[-11, -15 + bob, 5, 1], [4, -16 + bob, 5, 1], [-10, -30 + bob, 6, 1]]);
      drawDetailPixels(ctx, "#5A6770", [[-8, -8 + bob, 1, 7], [6, -7 + bob, 1, 6]]);
      drawDetailPixels(ctx, "#E2EAE9", [[-3, -21 + bob], [4, -22 + bob], [13, -28 + bob]]);
      break;
    case "siege_mortar":
      drawDetailPixels(ctx, "#9DA5A6", [[-12, -14 + bob, 5, 1], [5, -13 + bob, 5, 1], [-10, -25 + bob, 5, 1]]);
      drawDetailPixels(ctx, "#596366", [[-10, -20 + bob, 3, 1], [10, -18 + bob, 3, 1], [18, -24 + bob, 2, 1]]);
      drawDetailPixels(ctx, "#D5D8D8", [[-2, -8 + bob], [20, -27 + bob], [26, -22 + bob]]);
      break;
    case "armory_commander":
      drawDetailPixels(ctx, "#AABFC9", [[-8, -18 + bob, 4, 1], [4, -16 + bob, 4, 1], [-10, -10 + bob, 3, 1]]);
      drawDetailPixels(ctx, "#6F8490", [[-11, -12 + bob, 1, 7], [8, -11 + bob, 1, 6], [-4, -7 + bob, 8, 1]]);
      drawDetailPixels(ctx, "#C8E0E9", [[-6, -13 + bob, 4, 2], [5, -11 + bob, 3, 1], [14, -15 + bob], [-16, -14 + bob]]);
      break;
    case "war_engine":
      drawDetailPixels(ctx, "#A0ADB0", [[-21, -37 + bob, 8, 1], [13, -33 + bob, 7, 1], [-22, -8 + bob, 6, 1], [17, -4 + bob, 5, 1]]);
      drawDetailPixels(ctx, "#6F797A", [[-24, -20 + bob], [22, -16 + bob], [-14, -51 + bob], [15, -49 + bob]]);
      drawDetailPixels(ctx, "#D8E2E2", [[-10, -22 + bob], [9, -18 + bob], [-21, -10 + bob], [20, -36 + bob]]);
      if (bossPhase >= 2) drawDetailPixels(ctx, "#758387", [[-34, -41 + bob], [33, -40 + bob], [-32, 8 + bob], [30, 9 + bob]]);
      if (bossPhase >= 3) drawDetailPixels(ctx, "#EAEEEE", [[-16, -32 + bob], [14, -9 + bob], [-4, -56 + bob, 7, 1]]);
      break;

    case "void_moth": {
      const hover = state === "walk" ? [0, -2, 0, 2][phase] : state === "idle" ? [0, -1][phase] : 0;
      drawDetailPixels(ctx, "#F0DCF8", [[-14, -22 + hover, 4, 1], [12, -21 + hover, 4, 1], [-12, -10 + hover, 3, 1], [11, -9 + hover, 3, 1]]);
      drawDetailPixels(ctx, "#8B6499", [[-9, -17 + hover], [8, -16 + hover], [-2, -27 + hover, 4, 1]]);
      drawDetailPixels(ctx, "#D2B4DE", [[-1, -18 + hover, 2, 2], [-17, -15 + hover], [17, -14 + hover]]);
      break;
    }
    case "star_caster":
      drawDetailPixels(ctx, "#BAD4E8", [[-8, -17 + bob, 4, 1], [4, -15 + bob, 2, 1], [-8, -36 + bob], [-3, -39 + bob], [4, -38 + bob]]);
      drawDetailPixels(ctx, "#5B8FAB", [[-6, -11 + bob, 1, 8], [4, -10 + bob, 1, 7]]);
      drawDetailPixels(ctx, "#E8F4FF", [[-2, -22 + bob], [3, -22 + bob], [13, -32 + bob]]);
      break;
    case "astral_shade": {
      const hover = state === "walk" ? [0, -2, 0, 2][phase] : state === "idle" ? [0, -1][phase] : 0;
      drawDetailPixels(ctx, "#D0E8F5", [[-5, -21 + hover], [4, -22 + hover], [-2, -28 + hover], [3, -8 + hover]]);
      drawDetailPixels(ctx, "#4478A0", [[-7, -17 + hover, 1, 5], [7, -16 + hover, 1, 4]]);
      drawDetailPixels(ctx, "#8AC8E8", [[0, -17 + hover, 2, 1], [-8, -5 + hover], [8, -4 + hover]]);
      break;
    }
    case "star_sentinel":
      drawDetailPixels(ctx, "#7BBAD4", [[-18, -31 + bob, 2, 11], [14, -30 + bob, 2, 10], [-14, -52 + bob, 5, 1], [7, -50 + bob, 4, 1]]);
      drawDetailPixels(ctx, "#1A5E80", [[-21, -19 + bob, 4, 1], [10, -14 + bob, 4, 1], [-11, -3 + bob, 3, 1]]);
      drawDetailPixels(ctx, "#C8E8FF", [[-5, -44 + bob], [5, -44 + bob], [-1, -17 + bob, 3, 1]]);
      if (bossPhase >= 2) drawDetailPixels(ctx, "#5DADE2", [[-28, -50 + bob], [24, -48 + bob], [-26, -25 + bob], [24, -23 + bob]]);
      if (bossPhase >= 3) drawDetailPixels(ctx, "#FFFFFF", [[-3, -71 + bob, 6, 1], [-42, 7 + bob], [42, 5 + bob]]);
      break;

    case "ashen_revenant":
      drawDetailPixels(ctx, "#A0ACAD", [[-9, -12 + bob, 5, 1], [-1, -10 + bob, 1, 4], [8, -15 + bob, 2, 1]]);
      drawDetailPixels(ctx, "#B0BBBB", [[-7, -16 + bob], [1, -16 + bob], [15, -11 + bob], [19, -11 + bob]]);
      drawDetailPixels(ctx, "#D0D8D8", [[-10, -8 + bob], [5, -8 + bob], [0, -7 + bob]]);
      break;
    case "ash_lobber":
      drawDetailPixels(ctx, "#7E8D90", [[-11, -18 + bob, 1, 12], [8, -17 + bob, 1, 10], [-8, -29 + bob, 7, 1]]);
      drawDetailPixels(ctx, "#9EABAC", [[-6, -25 + bob, 3, 1], [4, -24 + bob, 3, 1], [17, -15 + bob, 2, 1]]);
      drawDetailPixels(ctx, "#C0CAC9", [[-1, -12 + bob, 3, 3], [21, -9 + bob], [-14, -7 + bob]]);
      break;
    case "bone_sovereign":
      drawDetailPixels(ctx, "#8A9898", [[-21, -37 + bob, 7, 1], [13, -33 + bob, 6, 1], [-19, -8 + bob, 5, 1], [13, -4 + bob, 4, 1]]);
      drawDetailPixels(ctx, "#C0CECE", [[-24, -20 + bob], [22, -16 + bob], [-13, -50 + bob], [11, -48 + bob]]);
      drawDetailPixels(ctx, "#E2ECEC", [[-10, -23 + bob], [8, -20 + bob], [-22, -11 + bob], [19, -36 + bob]]);
      if (bossPhase >= 2) drawDetailPixels(ctx, "#A8B8B8", [[-34, -41 + bob], [33, -40 + bob], [-30, 8 + bob], [28, 7 + bob]]);
      if (bossPhase >= 3) drawDetailPixels(ctx, "#F4FFFF", [[-15, -33 + bob], [12, -10 + bob], [-2, -55 + bob, 5, 1]]);
      break;

    case "chain_specter":
      drawDetailPixels(ctx, "#CFE8F5", [[-5, -25 + bob, 3, 1], [4, -24 + bob, 2, 1], [-8, -11 + bob], [8, -10 + bob]]);
      drawDetailPixels(ctx, "#4A7A91", [[-9, -17 + bob, 1, 8], [8, -16 + bob, 1, 7], [-3, -31 + bob, 6, 1]]);
      drawDetailPixels(ctx, "#9FD9F5", [[-1, -18 + bob, 3, 3], [-14, -5 + bob], [13, -4 + bob]]);
      break;
    case "prison_brute":
      drawDetailPixels(ctx, "#6E7E85", [[-10, -14 + bob, 5, 1], [3, -15 + bob, 4, 1], [-9, -27 + bob, 5, 1]]);
      drawDetailPixels(ctx, "#3A4C56", [[-8, -8 + bob, 1, 7], [5, -8 + bob, 1, 6]]);
      drawDetailPixels(ctx, "#8D9EA4", [[-3, -20 + bob], [4, -21 + bob], [13, -27 + bob]]);
      break;
    case "warden_alpha":
      drawDetailPixels(ctx, "#2A3C46", [[-22, -36 + bob, 8, 1], [13, -32 + bob, 7, 1], [-20, -9 + bob, 5, 1], [15, -5 + bob, 4, 1]]);
      drawDetailPixels(ctx, "#4F6570", [[-24, -19 + bob], [22, -15 + bob], [-13, -50 + bob], [12, -48 + bob]]);
      drawDetailPixels(ctx, "#8AB0C0", [[-10, -21 + bob], [8, -18 + bob], [-20, -10 + bob], [19, -35 + bob]]);
      if (bossPhase >= 2) drawDetailPixels(ctx, "#3A5566", [[-34, -41 + bob], [33, -40 + bob], [-30, 9 + bob], [29, 8 + bob]]);
      if (bossPhase >= 3) drawDetailPixels(ctx, "#CBDCE5", [[-16, -31 + bob], [13, -9 + bob], [-3, -55 + bob, 6, 1]]);
      break;

    case "archive_construct":
      drawDetailPixels(ctx, "#B09BC5", [[-11, -15 + bob, 5, 1], [4, -16 + bob, 5, 1], [-10, -29 + bob, 6, 1]]);
      drawDetailPixels(ctx, "#7D5E9B", [[-8, -8 + bob, 1, 7], [5, -8 + bob, 1, 6]]);
      drawDetailPixels(ctx, "#D8C8E8", [[-3, -21 + bob], [4, -22 + bob], [13, -28 + bob]]);
      break;
    case "void_cultist":
      drawDetailPixels(ctx, "#9B68B2", [[-6, -8 + bob, 1, 8], [4, -7 + bob, 1, 6], [-6, -25 + bob, 3, 1]]);
      drawDetailPixels(ctx, "#E8C8F8", [[-2, -20 + bob], [3, -20 + bob], [-1, -5 + bob, 2, 1]]);
      drawDetailPixels(ctx, "#C878E3", [[-8, -12 + bob], [6, -10 + bob], [0, 2 + bob]]);
      break;
    case "echo_mind":
      drawDetailPixels(ctx, "#6C3483", [[-22, -37 + bob, 8, 1], [14, -33 + bob, 8, 1], [-20, -9 + bob, 6, 1], [16, -5 + bob, 5, 1]]);
      drawDetailPixels(ctx, "#9B59B6", [[-26, -21 + bob], [24, -17 + bob], [-14, -52 + bob], [14, -50 + bob]]);
      drawDetailPixels(ctx, "#D7BDE2", [[-10, -23 + bob], [9, -19 + bob], [-23, -11 + bob], [21, -37 + bob]]);
      if (bossPhase >= 2) drawDetailPixels(ctx, "#8E44AD", [[-36, -43 + bob], [35, -42 + bob], [-32, 9 + bob], [31, 8 + bob]]);
      if (bossPhase >= 3) drawDetailPixels(ctx, "#F0E0FF", [[-17, -34 + bob], [15, -10 + bob], [-3, -58 + bob, 7, 1]]);
      break;

  }
}

const models: Record<string, ModelDraw> = {
  moss_brute(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-2, -1, 2, 1][phase] : 0;
    const slam = state === "attack" ? [0, -2, 1, 4][phase] : 0;

    // Rear root arm and moss shoulder establish an asymmetric silhouette.
    rect(ctx, p.ink, -12, -17 + bob, 6, 16);
    rect(ctx, "#4A3322", -11, -16 + bob, 4, 14);
    rect(ctx, "#6D4C32", -10, -15 + bob, 2, 7);
    rect(ctx, p.ink, -13, -4 + bob, 6, 5);
    rect(ctx, "#4A3322", -12, -3 + bob, 4, 3);

    // Trunk torso: broad at the shoulders, tapering at the roots.
    rect(ctx, p.ink, -9, -18 + bob, 19, 19);
    rect(ctx, "#604229", -8, -17 + bob, 17, 17);
    rect(ctx, "#79583A", -6, -16 + bob, 7, 14);
    rect(ctx, "#4D3523", 4, -15 + bob, 4, 13);
    rect(ctx, "#9B754B", -5, -15 + bob, 2, 8);
    rect(ctx, p.ink, -2, -6 + bob, 5, 3);
    rect(ctx, "#39572B", -1, -5 + bob, 3, 1);

    // Embedded stump head and uneven moss crown.
    rect(ctx, p.ink, -8, -27 + bob, 16, 11);
    rect(ctx, "#6B4930", -7, -26 + bob, 14, 9);
    rect(ctx, "#856040", -5, -25 + bob, 7, 7);
    rect(ctx, p.dark, -10, -29 + bob, 8, 5);
    rect(ctx, p.base, -8, -31 + bob, 7, 4);
    rect(ctx, p.light, -6, -32 + bob, 4, 2);
    rect(ctx, p.dark, 1, -29 + bob, 9, 5);
    rect(ctx, p.base, 3, -31 + bob, 6, 4);
    rect(ctx, "#88B84D", 6, -33 + bob, 3, 3);
    rect(ctx, p.light, -10, -15 + bob, 3, 4);
    rect(ctx, "#A6CE63", -9, -16 + bob, 2, 2);
    rect(ctx, p.light, 7, -10 + bob, 3, 3);
    rect(ctx, p.ink, -14, -17 + bob, 5, 5);
    rect(ctx, p.base, -13, -18 + bob, 4, 4);
    rect(ctx, p.light, -12, -19 + bob, 2, 2);
    drawPixelEye(ctx, p, -4, -22 + bob, "#D7FF87");
    drawPixelEye(ctx, p, 3, -22 + bob, "#D7FF87");
    rect(ctx, p.ink, -2, -18 + bob, 5, 2);

    // Foreground arm changes height during the slam.
    rect(ctx, p.ink, 8, -18 + bob + slam, 7, 17 - Math.max(0, slam));
    rect(ctx, "#513723", 9, -17 + bob + slam, 5, 15 - Math.max(0, slam));
    rect(ctx, "#765338", 10, -16 + bob + slam, 2, 8);
    rect(ctx, p.ink, 8, -3 + bob + Math.max(0, slam), 8, 5);
    rect(ctx, "#513723", 9, -2 + bob + Math.max(0, slam), 6, 3);
    rect(ctx, p.base, 11, -11 + bob + slam, 4, 3);

    drawRootFoot(ctx, p, -6 + stride, 0, stride > 0);
    drawRootFoot(ctx, p, 3 - stride, 0, stride <= 0);
  },
  thorn_archer(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-2, -1, 2, 1][phase] : 0;
    const draw = state === "attack" ? [0, 2, 4, 1][phase] : 0;

    // Leaf mantle and rear leg.
    rect(ctx, p.ink, -9, -17 + bob, 8, 17);
    rect(ctx, "#315B35", -8, -16 + bob, 6, 15);
    rect(ctx, p.base, -9, -13 + bob, 3, 6);
    rect(ctx, p.light, -8, -15 + bob, 3, 3);
    rect(ctx, p.ink, -12, -17 + bob, 5, 7);
    rect(ctx, p.base, -11, -16 + bob, 4, 5);
    rect(ctx, p.light, -10, -17 + bob, 2, 3);
    rect(ctx, p.ink, -4 - stride, -1, 4, 7);
    rect(ctx, "#51402B", -3 - stride, 0, 2, 5);

    // Narrow bark torso with vine sash.
    rect(ctx, p.ink, -5, -18 + bob, 11, 19);
    rect(ctx, "#4B3826", -4, -17 + bob, 9, 17);
    rect(ctx, "#6E5435", -3, -16 + bob, 4, 15);
    rect(ctx, p.base, -4, -9 + bob, 9, 3);
    rect(ctx, p.light, -2, -8 + bob, 4, 1);
    rect(ctx, "#8FB85B", -6, -13 + bob, 3, 5);

    // Thorn hood: tall, pointed, and visibly different from other humanoids.
    rect(ctx, p.ink, -7, -28 + bob, 14, 12);
    rect(ctx, p.dark, -6, -27 + bob, 12, 10);
    rect(ctx, p.base, -4, -30 + bob, 7, 4);
    rect(ctx, p.light, -2, -31 + bob, 3, 2);
    rect(ctx, "#B7D96B", -5, -27 + bob, 2, 7);
    rect(ctx, p.ink, -4, -23 + bob, 8, 5);
    drawPixelEye(ctx, p, 1, -21 + bob, "#C6FF5F");
    rect(ctx, "#7A5431", -8, -25 + bob, 3, 4);
    rect(ctx, p.light, -10, -27 + bob, 3, 3);

    // Drawing arm and a tall recurved thorn bow.
    rect(ctx, p.ink, 4, -15 + bob, 8 + draw, 4);
    rect(ctx, "#765238", 5, -14 + bob, 6 + draw, 2);
    const bowX = 12 + draw;
    rect(ctx, p.ink, bowX, -25 + bob, 3, 27);
    rect(ctx, "#68442A", bowX + 1, -24 + bob, 1, 25);
    rect(ctx, p.light, bowX - 2, -25 + bob, 4, 3);
    rect(ctx, p.light, bowX - 2, 0 + bob, 4, 3);
    rect(ctx, "#C6D9A2", bowX - draw - 1, -22 + bob, 1, 21);
    rect(ctx, p.accent, bowX - draw - 3, -13 + bob, 5 + draw, 1);
    rect(ctx, p.light, bowX + 1, -14 + bob, 3, 3);

    rect(ctx, p.ink, 1 + stride, -1, 4, 7);
    rect(ctx, "#5A432C", 2 + stride, 0, 2, 5);
    rect(ctx, p.ink, -5 - stride, 4, 6, 2);
    rect(ctx, p.ink, 1 + stride, 4, 6, 2);
  },
  boar_charger(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const gallop = state === "walk" ? [0, 1, 0, -1][phase] : 0;
    const stride = state === "walk" ? [-2, 0, 2, 0][phase] : 0;
    const charge = state === "attack" ? [0, 1, 3, 5][phase] : 0;
    const headDrop = state === "attack" ? [0, 1, 3, 2][phase] : 0;

    // Tail and rear haunch.
    rect(ctx, p.ink, -17, -14 + gallop, 6, 4);
    rect(ctx, "#5A3A2B", -16, -13 + gallop, 4, 2);
    rect(ctx, p.ink, -14, -20 + gallop, 24, 18);
    rect(ctx, "#6D4934", -13, -19 + gallop, 22, 16);
    rect(ctx, "#8A6042", -10, -18 + gallop, 12, 13);
    rect(ctx, "#4C3228", 4, -17 + gallop, 4, 13);
    rect(ctx, "#3E2A24", -10, -7 + gallop, 18, 4);
    rect(ctx, "#624331", -8, -8 + gallop, 10, 2);

    // Bramble ridge breaks the horizontal body silhouette.
    rect(ctx, p.dark, -11, -24 + gallop, 5, 6);
    rect(ctx, p.base, -10, -26 + gallop, 4, 4);
    rect(ctx, p.dark, -4, -25 + gallop, 6, 6);
    rect(ctx, p.light, -2, -27 + gallop, 4, 4);
    rect(ctx, p.dark, 3, -23 + gallop, 5, 5);

    // Lowered armored head and tusks.
    const headX = 7 + charge;
    const headY = -19 + gallop + headDrop;
    rect(ctx, p.ink, headX, headY, 14, 13);
    rect(ctx, "#79513A", headX + 1, headY + 1, 12, 11);
    rect(ctx, "#9A704F", headX + 3, headY + 2, 8, 6);
    rect(ctx, p.dark, headX + 2, headY - 4, 4, 5);
    rect(ctx, p.dark, headX + 8, headY - 3, 4, 4);
    drawPixelEye(ctx, p, headX + 8, headY + 4, "#FFCF51");
    rect(ctx, "#FFF0A1", headX + 8, headY + 4, 2, 1);
    rect(ctx, p.ink, headX + 11, headY + 7, 6, 4);
    rect(ctx, "#3B2722", headX + 12, headY + 8, 4, 2);
    rect(ctx, p.ink, headX + 13, headY + 10, 6, 4);
    rect(ctx, "#F4E6C5", headX + 14, headY + 10, 5, 2);
    rect(ctx, p.ink, headX + 11, headY + 11, 5, 4);
    rect(ctx, "#F4E6C5", headX + 12, headY + 12, 4, 2);

    // Four legs use crossed phases instead of a two-leg humanoid helper.
    for (const [x, offset, shade] of [
      [-10, stride, "#52382B"], [-4, -stride, "#6B4934"], [3, -stride, "#52382B"], [8, stride, "#76523A"],
    ] as const) {
      rect(ctx, p.ink, x + offset, -3, 5, 9);
      rect(ctx, shade, x + 1 + offset, -2, 3, 7);
      rect(ctx, p.ink, x + offset, 4, 6, 2);
    }
  },
  dingdong_fowl(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const flap = state === "attack" ? [0, -3, -7, -2][phase] : state === "walk" ? [0, -2, 0, 2][phase] : 0;
    const stride = state === "walk" ? [-2, -1, 2, 1][phase] : 0;

    // Tail fan behind the bell-shaped body.
    rect(ctx, p.ink, -15, -15 + bob, 8, 12);
    rect(ctx, "#B76A16", -14, -14 + bob, 6, 10);
    rect(ctx, "#E39A24", -16, -12 + bob, 4, 7);
    rect(ctx, p.ink, -10, -20 + bob, 8, 6);
    rect(ctx, "#D98C10", -9, -19 + bob, 6, 4);

    // Rounded cream body built from stepped pixel tiers.
    rect(ctx, p.ink, -8, -20 + bob, 18, 20);
    rect(ctx, "#F4F1DE", -7, -19 + bob, 16, 18);
    rect(ctx, "#FFF8E1", -5, -18 + bob, 9, 14);
    rect(ctx, "#D8CFAF", 5, -16 + bob, 3, 12);

    // Head, comb and beak.
    rect(ctx, p.ink, -5, -30 + bob, 15, 12);
    rect(ctx, "#FFF8E1", -4, -29 + bob, 13, 10);
    rect(ctx, "#F4F1DE", 3, -27 + bob, 5, 7);
    rect(ctx, "#E53935", -3, -35 + bob, 3, 6);
    rect(ctx, "#E53935", 1, -34 + bob, 3, 5);
    rect(ctx, "#E53935", 5, -32 + bob, 3, 4);
    drawPixelEye(ctx, p, 4, -25 + bob, "#263238");
    rect(ctx, p.ink, 8, -27 + bob, 9, 6);
    rect(ctx, "#F9A825", 9, -26 + bob, 7, 4);
    rect(ctx, "#E53935", 6, -20 + bob, 4, 5);

    // Wings visibly flap during scatter attacks.
    rect(ctx, p.ink, -12, -17 + bob + flap, 7, 12);
    rect(ctx, "#C47A18", -11, -16 + bob + flap, 5, 10);
    rect(ctx, "#F0B63D", -10, -14 + bob + flap, 3, 6);
    rect(ctx, p.ink, 8, -16 + bob - Math.trunc(flap / 2), 7, 11);
    rect(ctx, "#D98C10", 9, -15 + bob - Math.trunc(flap / 2), 5, 9);

    // Bell breast and alternating bird legs.
    rect(ctx, p.ink, -4, -11 + bob, 9, 9);
    rect(ctx, "#F1C40F", -3, -10 + bob, 7, 7);
    rect(ctx, "#7A4D15", -1, -6 + bob, 3, 3);
    rect(ctx, p.ink, -5 + stride, -1, 4, 8);
    rect(ctx, "#F9A825", -4 + stride, 0, 2, 6);
    rect(ctx, p.ink, 2 - stride, -1, 4, 8);
    rect(ctx, "#F9A825", 3 - stride, 0, 2, 6);
    rect(ctx, p.ink, -7 + stride, 5, 7, 2);
    rect(ctx, p.ink, 1 - stride, 5, 7, 2);
  },
  spore_mimic(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const bite = state === "attack" ? [0, 1, 4, 2][phase] : 0;
    const stride = state === "walk" ? [-2, -1, 2, 1][phase] : 0;

    // Root tendrils behind the stalk.
    rect(ctx, p.ink, -9 - stride, -1, 7, 7);
    rect(ctx, p.dark, -8 - stride, 0, 5, 5);
    rect(ctx, p.ink, 3 + stride, -1, 7, 7);
    rect(ctx, p.dark, 4 + stride, 0, 5, 5);
    rect(ctx, p.ink, -2, 2, 5, 5);
    rect(ctx, p.base, -1, 3, 3, 3);

    // Thick pale stalk with shadowed underside.
    rect(ctx, p.ink, -7, -18 + bob, 15, 20);
    rect(ctx, "#D9D1B5", -6, -17 + bob, 13, 18);
    rect(ctx, "#F1EBD2", -4, -16 + bob, 6, 15);
    rect(ctx, "#B9AE91", 3, -15 + bob, 3, 14);

    // Cap separates into upper and lower jaws during the bite.
    rect(ctx, p.ink, -15, -31 + bob - Math.trunc(bite / 2), 31, 13);
    rect(ctx, p.base, -14, -30 + bob - Math.trunc(bite / 2), 29, 11);
    rect(ctx, p.light, -10, -32 + bob - Math.trunc(bite / 2), 8, 5);
    rect(ctx, p.light, 3, -31 + bob - Math.trunc(bite / 2), 7, 4);
    rect(ctx, p.dark, -13, -22 + bob - Math.trunc(bite / 2), 27, 3);
    rect(ctx, p.ink, -12, -18 + bob + bite, 25, 9);
    rect(ctx, "#6C1F28", -11, -17 + bob + bite, 23, 7);
    rect(ctx, "#E9E1C8", -9, -17 + bob + bite, 4, 3);
    rect(ctx, "#E9E1C8", -2, -17 + bob + bite, 4, 3);
    rect(ctx, "#E9E1C8", 5, -17 + bob + bite, 4, 3);
    rect(ctx, "#C93C49", -5, -12 + bob + bite, 11, 2);

    // False friendly eyes above the jaw make the mimic readable.
    drawPixelEye(ctx, p, -5, -24 + bob - Math.trunc(bite / 2), "#FFF4C5");
    drawPixelEye(ctx, p, 5, -24 + bob - Math.trunc(bite / 2), "#FFF4C5");
    rect(ctx, "#F4D35E", -12, -27 + bob, 2, 2);
    rect(ctx, "#F4D35E", 10, -25 + bob, 2, 2);
  },
  forest_guardian(ctx, p, _limbFrame, state, stateFrame, bossPhase = 1) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-2, -1, 2, 1][phase] : 0;
    const slam = state === "attack" ? [0, -6, -10, 5][phase] : 0;

    // Massive rear branches and layered crown.
    rect(ctx, p.ink, -23, -35 + bob, 8, 22);
    rect(ctx, "#3F2B21", -22, -34 + bob, 6, 20);
    rect(ctx, p.ink, 16, -36 + bob, 8, 23);
    rect(ctx, "#493126", 17, -35 + bob, 6, 21);
    rect(ctx, p.ink, -20, -45 + bob, 6, 13);
    rect(ctx, "#4B3224", -19, -44 + bob, 4, 11);
    rect(ctx, p.ink, 15, -47 + bob, 6, 14);
    rect(ctx, "#543627", 16, -46 + bob, 4, 12);
    rect(ctx, p.dark, -26, -43 + bob, 11, 8);
    rect(ctx, p.base, -24, -45 + bob, 9, 7);
    rect(ctx, p.light, -22, -47 + bob, 5, 4);
    rect(ctx, p.dark, 13, -45 + bob, 14, 9);
    rect(ctx, p.base, 15, -48 + bob, 10, 9);
    rect(ctx, p.light, 19, -50 + bob, 5, 4);
    rect(ctx, p.base, -8, -49 + bob, 16, 8);
    rect(ctx, p.light, -4, -51 + bob, 8, 5);

    // Root legs and feet are planted before the trunk, giving depth.
    drawRootFoot(ctx, p, -10 + stride, 1, stride > 0);
    drawRootFoot(ctx, p, 5 - stride, 1, stride <= 0);
    rect(ctx, p.ink, -13 + stride, -13, 10, 17);
    rect(ctx, "#4A3023", -12 + stride, -12, 8, 15);
    rect(ctx, p.ink, 4 - stride, -13, 10, 17);
    rect(ctx, "#563828", 5 - stride, -12, 8, 15);

    // Tapered trunk body with bark planes.
    rect(ctx, p.ink, -15, -34 + bob, 31, 26);
    rect(ctx, "#5B3927", -14, -33 + bob, 29, 24);
    rect(ctx, "#755039", -10, -32 + bob, 11, 22);
    rect(ctx, "#432B22", 7, -31 + bob, 6, 20);
    rect(ctx, "#9A7050", -8, -29 + bob, 3, 14);
    rect(ctx, "#B1835A", -12, -27 + bob, 2, 13);
    rect(ctx, "#765039", 11, -27 + bob, 2, 13);
    rect(ctx, p.dark, -15, -35 + bob, 12, 6);
    rect(ctx, p.base, -13, -37 + bob, 10, 6);
    rect(ctx, p.dark, 4, -36 + bob, 13, 7);
    rect(ctx, p.base, 7, -39 + bob, 9, 8);

    // Carved face and phase-reactive heartwood core.
    rect(ctx, p.ink, -10, -31 + bob, 21, 14);
    rect(ctx, "#6A4632", -9, -30 + bob, 19, 12);
    rect(ctx, "#825A3C", -6, -29 + bob, 9, 10);
    drawPixelEye(ctx, p, -5, -25 + bob, bossPhase >= 3 ? "#FFF29A" : "#B8FF80");
    drawPixelEye(ctx, p, 5, -25 + bob, bossPhase >= 3 ? "#FFF29A" : "#B8FF80");
    rect(ctx, p.ink, -4, -19 + bob, 9, 7);
    rect(ctx, bossPhase >= 3 ? "#FFE066" : "#78A949", -3, -18 + bob, 7, 5);
    rect(ctx, bossPhase >= 2 ? "#D8FF83" : "#A5D66A", -1, -17 + bob, 3, 3);

    // Arms rise and then crash down during the attack.
    rect(ctx, p.ink, -23, -28 + bob + slam, 10, 27 - Math.min(0, slam));
    rect(ctx, "#4B3023", -22, -27 + bob + slam, 8, 25 - Math.min(0, slam));
    rect(ctx, "#70503A", -20, -25 + bob + slam, 3, 15);
    rect(ctx, p.base, -24, -24 + bob + slam, 4, 5);
    rect(ctx, p.light, -23, -25 + bob + slam, 2, 3);
    rect(ctx, p.ink, 14, -29 + bob + slam, 10, 28 - Math.min(0, slam));
    rect(ctx, "#543529", 15, -28 + bob + slam, 8, 26 - Math.min(0, slam));
    rect(ctx, "#795640", 16, -26 + bob + slam, 3, 15);
    rect(ctx, p.base, 20, -22 + bob + slam, 4, 5);
    rect(ctx, p.light, 21, -23 + bob + slam, 2, 3);
    rect(ctx, p.ink, -25, -4 + bob + Math.max(0, slam), 12, 7);
    rect(ctx, "#4A3023", -24, -3 + bob + Math.max(0, slam), 10, 5);
    rect(ctx, p.ink, 13, -4 + bob + Math.max(0, slam), 12, 7);
    rect(ctx, "#523528", 14, -3 + bob + Math.max(0, slam), 10, 5);

    if (bossPhase >= 2) {
      rect(ctx, "#E97AA8", -18, -40 + bob, 3, 3);
      rect(ctx, "#FFD36A", -17, -39 + bob, 1, 1);
      rect(ctx, "#E97AA8", 22, -42 + bob, 3, 3);
      rect(ctx, "#FFD36A", 23, -41 + bob, 1, 1);
      rect(ctx, p.accent, -18, -13 + bob, 3, 3);
      rect(ctx, p.accent, 16, -15 + bob, 3, 3);
    }
    if (bossPhase >= 3) {
      // Irregular heartwood fractures replace the former glowing cross.
      rect(ctx, "#FFF7B2", -2, -21 + bob, 5, 5);
      rect(ctx, "#FFE066", -1, -20 + bob, 3, 3);
      rect(ctx, "#D8FF83", -4, -18 + bob, 3, 2);
      rect(ctx, "#D8FF83", -6, -17 + bob, 3, 1);
      rect(ctx, "#FFF7B2", 2, -17 + bob, 3, 2);
      rect(ctx, "#D8FF83", 4, -16 + bob, 3, 1);
      rect(ctx, "#FFF7B2", -1, -24 + bob, 2, 4);
      rect(ctx, "#D8FF83", 0, -26 + bob, 1, 3);
    }
  },
  broadcast_rooster(ctx, p, _limbFrame, state, stateFrame, bossPhase = 1) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-2, -1, 2, 1][phase] : 0;
    const broadcast = state === "attack" ? [0, 1, 4, 2][phase] : 0;

    // Rear speaker pack, antenna mast and tail feathers.
    rect(ctx, p.ink, -25, -29 + bob, 15, 22);
    rect(ctx, "#27323A", -24, -28 + bob, 13, 20);
    rect(ctx, "#56636A", -22, -26 + bob, 9, 6);
    rect(ctx, "#8B989D", -21, -25 + bob, 7, 2);
    rect(ctx, p.ink, -21, -25 + bob, 7, 4);
    rect(ctx, "#F1C40F", -20, -24 + bob, 5, 2);
    rect(ctx, p.ink, -19, -20 + bob, 8, 9);
    rect(ctx, "#DFAE21", -18, -19 + bob, 6, 7);
    rect(ctx, p.ink, -18, -40 + bob, 3, 13);
    rect(ctx, "#90A4AE", -17, -39 + bob, 1, 11);
    rect(ctx, p.accent, -20, -42 + bob, 7, 3);
    rect(ctx, p.ink, -17, -16 + bob, 9, 17);
    rect(ctx, "#B66B18", -16, -15 + bob, 7, 15);
    rect(ctx, "#E19422", -19, -12 + bob, 4, 9);

    // Bird torso and cream breast.
    rect(ctx, p.ink, -12, -28 + bob, 25, 30);
    rect(ctx, "#F2EBD2", -11, -27 + bob, 23, 28);
    rect(ctx, "#FFF8E1", -7, -26 + bob, 12, 24);
    rect(ctx, "#D4C8A4", 6, -23 + bob, 5, 20);

    // Proud head with comb, wattles and a megaphone beak.
    rect(ctx, p.ink, -8, -42 + bob, 22, 16);
    rect(ctx, "#F8F1D7", -7, -41 + bob, 20, 14);
    rect(ctx, "#FFFFFF", -4, -40 + bob, 10, 11);
    rect(ctx, "#D32F2F", -6, -48 + bob, 4, 7);
    rect(ctx, "#E53935", -1, -47 + bob, 4, 6);
    rect(ctx, "#C62828", 4, -45 + bob, 4, 4);
    drawPixelEye(ctx, p, 6, -35 + bob, "#1D252B");
    rect(ctx, "#D32F2F", 8, -28 + bob, 5, 7);
    const hornX = 12 + broadcast;
    rect(ctx, p.ink, hornX, -38 + bob, 17, 10);
    rect(ctx, "#E2A126", hornX + 1, -37 + bob, 14, 8);
    rect(ctx, "#FFD15A", hornX + 3, -36 + bob, 10, 6);
    rect(ctx, p.ink, hornX + 14, -40 + bob, 5, 14);
    rect(ctx, "#3B454C", hornX + 15, -39 + bob, 3, 12);

    // Asymmetric wings: one speaker-wing, one feathered wing.
    rect(ctx, p.ink, -18, -27 + bob, 9, 22);
    rect(ctx, "#C77717", -17, -26 + bob, 7, 20);
    rect(ctx, "#F0B63D", -16, -23 + bob, 4, 11);
    rect(ctx, p.ink, 10, -25 + bob, 10, 21);
    rect(ctx, "#D8891E", 11, -24 + bob, 8, 19);
    rect(ctx, "#F5BE3E", 13, -21 + bob, 5, 10);

    // Bell chest and long avian legs.
    rect(ctx, p.ink, -6, -18 + bob, 13, 14);
    rect(ctx, "#F1C40F", -5, -17 + bob, 11, 12);
    rect(ctx, "#7A4D15", -2, -11 + bob, 5, 5);
    rect(ctx, "#9A651A", -5, -5 + bob, 11, 2);
    rect(ctx, "#FFE07A", -3, -16 + bob, 7, 2);
    rect(ctx, p.ink, -8 + stride, 0, 5, 11);
    rect(ctx, "#E8A22A", -7 + stride, 1, 3, 9);
    rect(ctx, p.ink, 4 - stride, 0, 5, 11);
    rect(ctx, "#E8A22A", 5 - stride, 1, 3, 9);
    rect(ctx, p.ink, -11 + stride, 9, 9, 3);
    rect(ctx, p.ink, 3 - stride, 9, 9, 3);

    if (bossPhase >= 2) {
      rect(ctx, p.ink, -31, -23 + bob, 7, 12);
      rect(ctx, "#F1C40F", -30, -22 + bob, 5, 10);
      rect(ctx, p.ink, 18, -19 + bob, 7, 12);
      rect(ctx, "#F1C40F", 19, -18 + bob, 5, 10);
    }
    if (bossPhase >= 3) {
      rect(ctx, "#FFFFFF", -17, -47 + bob, 1, 4);
      rect(ctx, "#FFF59D", -19, -45 + bob, 5, 1);
      rect(ctx, p.accent, -27, -31 + bob, 3, 3);
      rect(ctx, p.accent, 23, -30 + bob, 3, 3);
      rect(ctx, "#FF7043", -3, -14 + bob, 7, 3);
    }
  },

  bone_guard(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-2, -1, 2, 1][phase] : 0;
    const reach = state === "attack" ? [0, 2, 6, 3][phase] : 0;
    const lift = state === "attack" ? [0, -3, -7, -2][phase] : 0;

    // Rear shield: chipped iron over a dark coffin-board core.
    rect(ctx, p.ink, -14, -18 + bob, 9, 20);
    rect(ctx, "#354550", -13, -17 + bob, 7, 18);
    rect(ctx, "#607681", -12, -15 + bob, 4, 12);
    rect(ctx, "#93A4AA", -11, -13 + bob, 1, 7);
    rect(ctx, p.ink, -14, -9 + bob, 9, 3);
    rect(ctx, "#71858E", -13, -8 + bob, 7, 1);

    // Shin bones and iron sabatons move independently.
    rect(ctx, p.ink, -7 + stride, -2 + bob, 5, 12);
    rect(ctx, "#D8DDD8", -6 + stride, -1 + bob, 3, 9);
    rect(ctx, p.ink, -9 + stride, 8 + bob, 8, 3);
    rect(ctx, "#596A73", -8 + stride, 8 + bob, 6, 2);
    rect(ctx, p.ink, 2 - stride, -2 + bob, 5, 12);
    rect(ctx, "#C9D0CC", 3 - stride, -1 + bob, 3, 9);
    rect(ctx, p.ink, 1 - stride, 8 + bob, 8, 3);
    rect(ctx, "#596A73", 2 - stride, 8 + bob, 6, 2);

    // Pelvis, spine and readable rib cage.
    rect(ctx, p.ink, -8, -17 + bob, 16, 17);
    rect(ctx, "#E1E4DE", -6, -16 + bob, 12, 14);
    rect(ctx, p.ink, -2, -15 + bob, 4, 15);
    rect(ctx, "#BFC6C2", -1, -14 + bob, 2, 12);
    for (const y of [-13, -9, -5]) {
      rect(ctx, p.ink, -7, y + bob, 6, 3);
      rect(ctx, "#D7DCD6", -6, y + bob, 5, 1);
      rect(ctx, p.ink, 1, y + bob, 6, 3);
      rect(ctx, "#D7DCD6", 2, y + bob, 5, 1);
    }
    rect(ctx, "#798991", -6, -2 + bob, 12, 3);
    rect(ctx, p.ink, -4, -1 + bob, 8, 3);

    // Skull recessed under a battered kettle helmet.
    rect(ctx, p.ink, -8, -28 + bob, 16, 13);
    rect(ctx, "#E9E8DE", -7, -27 + bob, 14, 11);
    rect(ctx, "#C8CEC7", -6, -19 + bob, 12, 3);
    rect(ctx, p.ink, -5, -23 + bob, 4, 4);
    rect(ctx, "#8EE6D6", -4, -22 + bob, 2, 2);
    rect(ctx, p.ink, 2, -23 + bob, 4, 4);
    rect(ctx, "#8EE6D6", 3, -22 + bob, 2, 2);
    rect(ctx, p.ink, -2, -18 + bob, 5, 2);
    rect(ctx, p.ink, -10, -31 + bob, 20, 6);
    rect(ctx, "#394B57", -9, -30 + bob, 18, 4);
    rect(ctx, "#71838C", -7, -29 + bob, 9, 2);
    rect(ctx, p.ink, 5, -34 + bob, 4, 5);
    rect(ctx, "#657985", 6, -33 + bob, 2, 3);

    // Sword arm and stepped blade author the slash instead of using an overlay.
    rect(ctx, p.ink, 7 + Math.floor(reach / 3), -16 + bob + Math.floor(lift / 3), 6, 13);
    rect(ctx, "#CFD5D1", 8 + Math.floor(reach / 3), -15 + bob + Math.floor(lift / 3), 4, 11);
    rect(ctx, "#677983", 9 + Math.floor(reach / 3), -6 + bob + Math.floor(lift / 3), 6, 3);
    const bladeX = 12 + reach;
    const bladeY = -16 + bob + lift;
    rect(ctx, p.ink, bladeX - 1, bladeY - 1, 5, 18);
    rect(ctx, "#D7E0E1", bladeX, bladeY, 3, 16);
    rect(ctx, "#FFFFFF", bladeX + 1, bladeY + 1, 1, 12);
    rect(ctx, p.ink, bladeX - 3, bladeY + 13, 9, 3);
    rect(ctx, "#8E713C", bladeX - 1, bladeY + 16, 4, 6);
  },
  bolt_cultist(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-2, -1, 2, 1][phase] : 0;
    const cast = state === "attack" ? [0, 2, 7, 4][phase] : 0;

    // Split robe hem gives the caster a grounded walking silhouette.
    rect(ctx, p.ink, -9, -12 + bob, 18, 22);
    rect(ctx, "#342044", -8, -11 + bob, 16, 20);
    rect(ctx, p.dark, -7, -9 + bob, 7, 17);
    rect(ctx, p.base, 1, -10 + bob, 6, 17);
    rect(ctx, p.light, 3, -8 + bob, 2, 11);
    rect(ctx, p.ink, -8 + stride, 7 + bob, 7, 4);
    rect(ctx, p.ink, 1 - stride, 7 + bob, 7, 4);
    rect(ctx, "#291837", -7 + stride, 8 + bob, 5, 2);
    rect(ctx, "#291837", 2 - stride, 8 + bob, 5, 2);

    // Deep hood with a porcelain ritual mask.
    rect(ctx, p.ink, -10, -27 + bob, 20, 18);
    rect(ctx, "#3E1F54", -9, -26 + bob, 18, 16);
    rect(ctx, p.base, -7, -27 + bob, 14, 5);
    rect(ctx, p.light, -5, -26 + bob, 7, 2);
    rect(ctx, p.ink, -6, -22 + bob, 12, 10);
    rect(ctx, "#D8D2DE", -5, -21 + bob, 10, 8);
    rect(ctx, "#B8ADC2", -4, -15 + bob, 8, 2);
    rect(ctx, p.ink, -4, -19 + bob, 3, 3);
    rect(ctx, "#CF72FF", -3, -18 + bob, 1, 1);
    rect(ctx, p.ink, 2, -19 + bob, 3, 3);
    rect(ctx, "#CF72FF", 3, -18 + bob, 1, 1);
    rect(ctx, p.ink, -1, -15 + bob, 3, 1);

    // Sleeves open during the scatter cast.
    rect(ctx, p.ink, -14 - Math.floor(cast / 2), -13 + bob - Math.floor(cast / 3), 7, 14);
    rect(ctx, "#5B2873", -13 - Math.floor(cast / 2), -12 + bob - Math.floor(cast / 3), 5, 12);
    rect(ctx, "#A45CC0", -12 - Math.floor(cast / 2), -10 + bob - Math.floor(cast / 3), 2, 7);
    rect(ctx, p.ink, 7 + cast, -13 + bob - Math.floor(cast / 3), 7, 14);
    rect(ctx, "#5B2873", 8 + cast, -12 + bob - Math.floor(cast / 3), 5, 12);
    rect(ctx, "#D1B0DC", 10 + cast, -2 + bob - Math.floor(cast / 3), 3, 3);

    // Three ritual bolts form a fan only while the hand is extended.
    if (state === "attack") {
      const boltX = 16 + cast;
      rect(ctx, p.ink, boltX - 1, -20 + bob, 8, 4);
      rect(ctx, "#D979FF", boltX, -19 + bob, 6, 2);
      rect(ctx, "#F5D6FF", boltX + 4, -19 + bob, 2, 1);
      rect(ctx, p.ink, boltX + 2, -11 + bob, 9, 4);
      rect(ctx, "#A85DE0", boltX + 3, -10 + bob, 7, 2);
      rect(ctx, p.ink, boltX - 1, -2 + bob, 8, 4);
      rect(ctx, "#7C4BD0", boltX, -1 + bob, 6, 2);
    }
    rect(ctx, "#B38BD1", -2, -8 + bob, 4, 5);
    rect(ctx, "#F0D0FF", -1, -7 + bob, 2, 2);
  },
  grave_summoner(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-1, -1, 1, 1][phase] : 0;
    const raise = state === "attack" ? [0, -3, -9, -5][phase] : 0;

    // Heavy grave-cloth robe with a split, dragging hem.
    rect(ctx, p.ink, -11, -17 + bob, 22, 28);
    rect(ctx, "#251B36", -10, -16 + bob, 20, 26);
    rect(ctx, "#493267", -8, -15 + bob, 8, 23);
    rect(ctx, p.base, 2, -14 + bob, 6, 21);
    rect(ctx, p.light, 4, -12 + bob, 2, 12);
    rect(ctx, p.ink, -10 + stride, 7 + bob, 9, 5);
    rect(ctx, p.ink, 1 - stride, 7 + bob, 9, 5);
    rect(ctx, "#1A1425", -9 + stride, 8 + bob, 7, 3);
    rect(ctx, "#1A1425", 2 - stride, 8 + bob, 7, 3);
    rect(ctx, "#80738D", -7, -7 + bob, 14, 2);
    rect(ctx, "#493D55", -2, -7 + bob, 4, 17);

    // Hood and skull-lantern face.
    rect(ctx, p.ink, -10, -31 + bob, 20, 17);
    rect(ctx, "#302044", -9, -30 + bob, 18, 15);
    rect(ctx, p.base, -7, -31 + bob, 14, 5);
    rect(ctx, p.ink, -6, -26 + bob, 12, 10);
    rect(ctx, "#D7D3C8", -5, -25 + bob, 10, 8);
    rect(ctx, p.ink, -4, -23 + bob, 3, 3);
    rect(ctx, "#7DFFCC", -3, -22 + bob, 1, 1);
    rect(ctx, p.ink, 2, -23 + bob, 3, 3);
    rect(ctx, "#7DFFCC", 3, -22 + bob, 1, 1);
    rect(ctx, p.ink, -2, -18 + bob, 5, 2);

    // Coffin-marker staff rises during the summon.
    const staffY = -25 + bob + raise;
    rect(ctx, p.ink, 11, staffY, 5, 37 - raise);
    rect(ctx, "#6C4B39", 12, staffY + 1, 3, 35 - raise);
    rect(ctx, "#9A7658", 13, staffY + 3, 1, 27 - raise);
    rect(ctx, p.ink, 7, staffY - 5, 13, 12);
    rect(ctx, "#70777B", 8, staffY - 4, 11, 10);
    rect(ctx, "#A6AFB1", 10, staffY - 3, 5, 2);
    rect(ctx, p.ink, 12, staffY, 3, 6);
    rect(ctx, "#78F2C0", 13, staffY + 1, 1, 3);

    // A skeletal hand breaches the floor at the peak of the summon.
    if (state === "attack" && phase >= 2) {
      rect(ctx, p.ink, -18, 5, 12, 4);
      rect(ctx, "#C9D0C8", -17, 6, 10, 2);
      rect(ctx, p.ink, -15, 0, 3, 7);
      rect(ctx, "#DDE2DA", -14, 1, 1, 5);
      rect(ctx, p.ink, -10, 2, 3, 5);
      rect(ctx, "#DDE2DA", -9, 3, 1, 3);
      rect(ctx, "#67D8A9", -13, 9, 7, 2);
    }
  },
  bark_hound(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, -1, 0, 1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-3, -1, 3, 1][phase] : 0;
    const lunge = state === "attack" ? [0, 3, 8, 4][phase] : 0;
    const jaw = state === "attack" ? [0, 1, 4, 2][phase] : 0;

    // Rear tail and alternating hind legs.
    rect(ctx, p.ink, -18, -14 + bob, 10, 5);
    rect(ctx, "#4A3028", -17, -13 + bob, 8, 3);
    rect(ctx, p.ink, -21, -18 + bob, 6, 5);
    rect(ctx, "#75503F", -20, -17 + bob, 4, 3);
    for (const [x, shift] of [[-11, stride], [-3, -stride], [7, -stride], [13, stride]] as const) {
      rect(ctx, p.ink, x + shift, -4 + bob, 5, 13);
      rect(ctx, "#634235", x + shift + 1, -3 + bob, 3, 10);
      rect(ctx, p.ink, x + shift - 1, 7 + bob, 7, 3);
      rect(ctx, "#8B6652", x + shift, 7 + bob, 5, 2);
    }

    // Long ribbed body with prison harness and bone plates.
    rect(ctx, p.ink, -14, -15 + bob, 27, 14);
    rect(ctx, "#5A392F", -13, -14 + bob, 25, 12);
    rect(ctx, "#7A5241", -10, -13 + bob, 15, 9);
    rect(ctx, "#3C2928", 6, -13 + bob, 5, 10);
    rect(ctx, "#87949A", -9, -17 + bob, 6, 5);
    rect(ctx, "#AAB4B5", -7, -18 + bob, 3, 3);
    rect(ctx, "#87949A", -1, -17 + bob, 6, 5);
    rect(ctx, "#AAB4B5", 1, -18 + bob, 3, 3);
    rect(ctx, "#B18A35", -12, -9 + bob, 24, 3);
    rect(ctx, p.ink, -2, -9 + bob, 5, 5);
    rect(ctx, "#DFB94C", -1, -8 + bob, 3, 3);

    // Head, torn ears and cage muzzle move forward during the bite.
    const headX = 11 + lunge;
    rect(ctx, p.ink, headX, -19 + bob, 16, 14 + jaw);
    rect(ctx, "#6E483A", headX + 1, -18 + bob, 14, 11 + jaw);
    rect(ctx, "#9A7059", headX + 2, -16 + bob, 8, 7);
    rect(ctx, p.ink, headX + 1, -26 + bob, 6, 9);
    rect(ctx, "#49302D", headX + 2, -25 + bob, 4, 7);
    rect(ctx, p.ink, headX + 10, -25 + bob, 6, 8);
    rect(ctx, "#49302D", headX + 11, -24 + bob, 4, 6);
    drawPixelEye(ctx, p, headX + 9, -15 + bob, "#FFB34F");
    rect(ctx, p.ink, headX + 13, -13 + bob, 10, 7 + jaw);
    rect(ctx, "#3A2929", headX + 14, -12 + bob, 8, 5 + jaw);
    rect(ctx, "#D3D8D4", headX + 15, -12 + bob, 2, 3);
    rect(ctx, "#D3D8D4", headX + 19, -12 + bob, 2, 3);
    if (jaw > 0) rect(ctx, "#E57373", headX + 16, -7 + bob + jaw, 6, 2);
    // Three muzzle bars remain readable over the open mouth.
    rect(ctx, "#7B8990", headX + 14, -14 + bob, 2, 10 + jaw);
    rect(ctx, "#7B8990", headX + 18, -14 + bob, 2, 10 + jaw);
    rect(ctx, "#7B8990", headX + 22, -12 + bob, 2, 8 + jaw);
    rect(ctx, p.ink, headX + 13, -5 + bob + jaw, 12, 3);
  },
  chain_jailer(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-2, -1, 2, 1][phase] : 0;
    const cast = state === "attack" ? [0, 4, 12, 7][phase] : 0;

    // Broad prison boots and striped padded coat.
    rect(ctx, p.ink, -10 + stride, -2 + bob, 8, 13);
    rect(ctx, "#3D4850", -9 + stride, -1 + bob, 6, 10);
    rect(ctx, p.ink, -12 + stride, 8 + bob, 11, 4);
    rect(ctx, "#62717A", -11 + stride, 9 + bob, 9, 2);
    rect(ctx, p.ink, 2 - stride, -2 + bob, 8, 13);
    rect(ctx, "#3D4850", 3 - stride, -1 + bob, 6, 10);
    rect(ctx, p.ink, 1 - stride, 8 + bob, 11, 4);
    rect(ctx, "#62717A", 2 - stride, 9 + bob, 9, 2);
    rect(ctx, p.ink, -12, -20 + bob, 24, 20);
    rect(ctx, "#44525C", -11, -19 + bob, 22, 18);
    rect(ctx, "#61727C", -9, -18 + bob, 9, 15);
    rect(ctx, "#2E3942", 2, -18 + bob, 7, 15);
    rect(ctx, "#B48332", -11, -8 + bob, 22, 4);
    rect(ctx, "#E0B64F", -8, -7 + bob, 5, 2);
    rect(ctx, "#8E9CA2", -2, -19 + bob, 4, 18);
    rect(ctx, p.ink, -3, -13 + bob, 6, 3);

    // Cage helmet, glowing eyes and hanging jaw guard.
    rect(ctx, p.ink, -10, -34 + bob, 20, 16);
    rect(ctx, "#4B5A64", -9, -33 + bob, 18, 14);
    rect(ctx, "#778990", -7, -32 + bob, 9, 4);
    rect(ctx, "#171C22", -7, -28 + bob, 14, 7);
    drawPixelEye(ctx, p, -4, -26 + bob, "#F0C35A");
    drawPixelEye(ctx, p, 4, -26 + bob, "#F0C35A");
    for (const x of [-7, -3, 1, 5]) rect(ctx, "#8D9AA0", x, -29 + bob, 2, 11);
    rect(ctx, p.ink, -10, -22 + bob, 20, 4);
    rect(ctx, "#5F7078", -9, -21 + bob, 18, 2);

    // Braced rear arm and throwing gauntlet.
    rect(ctx, p.ink, -17, -18 + bob, 7, 19);
    rect(ctx, "#51616B", -16, -17 + bob, 5, 17);
    rect(ctx, "#87979D", -15, -15 + bob, 2, 9);
    rect(ctx, p.ink, 10 + Math.floor(cast / 3), -18 + bob, 8, 18);
    rect(ctx, "#596B75", 11 + Math.floor(cast / 3), -17 + bob, 6, 16);
    rect(ctx, "#B2BABC", 13 + Math.floor(cast / 3), -3 + bob, 5, 5);

    // Chain extends link-by-link and ends in a square prison weight.
    const links = state === "attack" ? 4 + Math.floor(cast / 3) : 4;
    for (let i = 0; i < links; i++) {
      drawChainLink(ctx, p, 18 + i * 4, -5 + bob + (i % 2) * 2, i % 2 === 0);
    }
    const weightX = 18 + links * 4;
    rect(ctx, p.ink, weightX - 1, -8 + bob, 10, 10);
    rect(ctx, "#36434B", weightX, -7 + bob, 8, 8);
    rect(ctx, "#75868E", weightX + 2, -6 + bob, 3, 3);
    rect(ctx, "#A8B4B7", weightX + 3, -5 + bob, 1, 1);
  },
  crypt_overseer(ctx, p, _limbFrame, state, stateFrame, bossPhase = 1) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-2, -1, 2, 1][phase] : 0;
    const invoke = state === "attack" ? [0, -3, -10, -5][phase] : 0;

    // Monumental robe and coffin-like shoulder mantle.
    rect(ctx, p.ink, -18, -23 + bob, 36, 35);
    rect(ctx, "#21152E", -17, -22 + bob, 34, 33);
    rect(ctx, "#47265E", -14, -21 + bob, 13, 29);
    rect(ctx, p.dark, 2, -21 + bob, 12, 29);
    rect(ctx, p.base, 5, -19 + bob, 6, 23);
    rect(ctx, p.light, 7, -17 + bob, 2, 14);
    rect(ctx, p.ink, -17 + stride, 8 + bob, 14, 5);
    rect(ctx, p.ink, 3 - stride, 8 + bob, 14, 5);
    rect(ctx, "#171020", -16 + stride, 9 + bob, 12, 3);
    rect(ctx, "#171020", 4 - stride, 9 + bob, 12, 3);
    rect(ctx, "#66727A", -18, -24 + bob, 36, 7);
    rect(ctx, "#97A2A5", -15, -23 + bob, 14, 3);
    rect(ctx, "#3B464D", 3, -23 + bob, 12, 4);
    rect(ctx, "#B48C3D", -16, -18 + bob, 32, 3);

    // Oversized skull mask and fractured crown.
    rect(ctx, p.ink, -13, -40 + bob, 26, 18);
    rect(ctx, "#DDDCD2", -12, -39 + bob, 24, 16);
    rect(ctx, "#BFC5C0", -10, -27 + bob, 20, 4);
    rect(ctx, p.ink, -9, -34 + bob, 7, 6);
    rect(ctx, "#B06CFF", -7, -32 + bob, 3, 2);
    rect(ctx, p.ink, 3, -34 + bob, 7, 6);
    rect(ctx, "#B06CFF", 5, -32 + bob, 3, 2);
    rect(ctx, p.ink, -3, -26 + bob, 7, 3);
    rect(ctx, p.ink, -15, -45 + bob, 30, 7);
    rect(ctx, "#4D2B63", -14, -44 + bob, 28, 5);
    rect(ctx, "#8C4FB1", -11, -47 + bob, 5, 5);
    rect(ctx, "#B76BE1", -2, -51 + bob, 5, 9);
    rect(ctx, "#8C4FB1", 8, -47 + bob, 5, 5);
    rect(ctx, "#E4B85B", -1, -49 + bob, 3, 3);

    // Skeletal arms rise with the invocation.
    rect(ctx, p.ink, -25, -21 + bob + Math.floor(invoke / 2), 9, 25 - Math.min(0, invoke));
    rect(ctx, "#C9CEC8", -24, -20 + bob + Math.floor(invoke / 2), 7, 23 - Math.min(0, invoke));
    rect(ctx, "#858F91", -22, -18 + bob + Math.floor(invoke / 2), 2, 17);
    rect(ctx, p.ink, 16, -21 + bob + Math.floor(invoke / 2), 9, 25 - Math.min(0, invoke));
    rect(ctx, "#C9CEC8", 17, -20 + bob + Math.floor(invoke / 2), 7, 23 - Math.min(0, invoke));
    rect(ctx, "#858F91", 20, -18 + bob + Math.floor(invoke / 2), 2, 17);
    rect(ctx, p.ink, -27, -24 + bob + invoke, 12, 7);
    rect(ctx, "#DFE2D9", -26, -23 + bob + invoke, 10, 5);
    rect(ctx, p.ink, 15, -24 + bob + invoke, 12, 7);
    rect(ctx, "#DFE2D9", 16, -23 + bob + invoke, 10, 5);

    // Soul reliquary replaces the generic boss-phase overlay.
    rect(ctx, p.ink, -7, -14 + bob, 14, 17);
    rect(ctx, "#313842", -6, -13 + bob, 12, 15);
    rect(ctx, "#6A3A86", -4, -11 + bob, 8, 11);
    rect(ctx, bossPhase >= 3 ? "#E9B7FF" : "#B66CDE", -2, -9 + bob, 4, 7);
    rect(ctx, "#FFFFFF", -1, -8 + bob, 2, 3);

    if (bossPhase >= 2) {
      for (const [x, y] of [[-22, -37], [18, -34], [-19, -8], [20, -5]] as const) {
        rect(ctx, p.ink, x - 2, y - 2 + bob, 7, 7);
        rect(ctx, "#BEC6C1", x - 1, y - 1 + bob, 5, 5);
        rect(ctx, p.ink, x, y + bob, 2, 2);
        rect(ctx, p.ink, x + 2, y + bob, 2, 2);
      }
    }
    if (bossPhase >= 3) {
      rect(ctx, "#F2C2FF", -1, -58 + bob, 3, 7);
      rect(ctx, "#B66CDE", -5, -55 + bob, 11, 2);
      drawChainLink(ctx, p, -31, -17 + bob, true);
      drawChainLink(ctx, p, 29, -15 + bob, true);
    }
  },
  kennel_warden(ctx, p, _limbFrame, state, stateFrame, bossPhase = 1) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, -1, 0, 1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-4, -2, 4, 2][phase] : 0;
    const lunge = state === "attack" ? [0, 3, 8, 4][phase] : 0;
    const jaw = state === "attack" ? [0, 2, 5, 3][phase] : 0;

    // Massive alternating legs with iron greaves.
    for (const [x, shift, front] of [[-18, stride, false], [-7, -stride, false], [9, -stride, true], [20, stride, true]] as const) {
      rect(ctx, p.ink, x + shift, -6 + bob, 8, 18);
      rect(ctx, front ? "#5A4036" : "#49322E", x + shift + 1, -5 + bob, 6, 15);
      rect(ctx, "#64737B", x + shift, 3 + bob, 8, 7);
      rect(ctx, "#95A0A4", x + shift + 2, 4 + bob, 3, 4);
      rect(ctx, p.ink, x + shift - 2, 9 + bob, 12, 4);
      rect(ctx, "#56646C", x + shift - 1, 10 + bob, 10, 2);
    }

    // Armoured torso, kennel bars and chained collar.
    rect(ctx, p.ink, -24, -24 + bob, 48, 22);
    rect(ctx, "#4D342E", -23, -23 + bob, 46, 20);
    rect(ctx, "#755245", -19, -21 + bob, 25, 15);
    rect(ctx, "#38282A", 8, -21 + bob, 12, 16);
    rect(ctx, "#52616A", -20, -28 + bob, 30, 9);
    rect(ctx, "#839097", -17, -27 + bob, 12, 4);
    rect(ctx, "#354149", 0, -27 + bob, 8, 6);
    for (const x of [-17, -10, -3, 4]) rect(ctx, "#9AA5A8", x, -28 + bob, 2, 11);
    rect(ctx, "#B78D34", -22, -13 + bob, 45, 4);
    rect(ctx, "#E1B94E", -17, -12 + bob, 10, 2);
    for (const x of [-14, -3, 8]) drawChainLink(ctx, p, x, -8 + bob, false);

    // Head and cage muzzle surge forward during the charge.
    const headX = 19 + lunge;
    rect(ctx, p.ink, headX, -30 + bob, 24, 22 + jaw);
    rect(ctx, "#624238", headX + 1, -29 + bob, 22, 19 + jaw);
    rect(ctx, "#8B6451", headX + 3, -26 + bob, 12, 13);
    rect(ctx, p.ink, headX + 1, -40 + bob, 8, 12);
    rect(ctx, "#3C2B2D", headX + 2, -39 + bob, 6, 10);
    rect(ctx, p.ink, headX + 15, -39 + bob, 8, 11);
    rect(ctx, "#3C2B2D", headX + 16, -38 + bob, 6, 9);
    drawPixelEye(ctx, p, headX + 14, -24 + bob, bossPhase >= 3 ? "#FF6B4D" : "#FFC24F");
    rect(ctx, p.ink, headX + 18, -21 + bob, 18, 12 + jaw);
    rect(ctx, "#302629", headX + 19, -20 + bob, 16, 9 + jaw);
    rect(ctx, "#E0DED4", headX + 21, -20 + bob, 3, 5);
    rect(ctx, "#E0DED4", headX + 29, -20 + bob, 3, 5);
    rect(ctx, "#D65F5A", headX + 23, -11 + bob + jaw, 11, 3);
    // Heavy muzzle bars and locking plate.
    for (const x of [19, 25, 31]) rect(ctx, "#77858C", headX + x, -23 + bob, 3, 16 + jaw);
    rect(ctx, p.ink, headX + 17, -9 + bob + jaw, 21, 4);
    rect(ctx, "#5D6B72", headX + 18, -8 + bob + jaw, 19, 2);
    rect(ctx, "#C29439", headX + 13, -18 + bob, 7, 10);
    rect(ctx, "#F0C755", headX + 15, -16 + bob, 3, 4);

    // Boss phases bolt extra kennel machinery onto the silhouette.
    if (bossPhase >= 2) {
      rect(ctx, p.ink, -22, -36 + bob, 12, 10);
      rect(ctx, "#414E56", -21, -35 + bob, 10, 8);
      rect(ctx, "#A3B0B2", -19, -33 + bob, 4, 3);
      rect(ctx, p.ink, -5, -37 + bob, 12, 11);
      rect(ctx, "#414E56", -4, -36 + bob, 10, 9);
      rect(ctx, "#E1B94E", -1, -34 + bob, 4, 4);
    }
    if (bossPhase >= 3) {
      rect(ctx, "#FF7043", -18, -34 + bob, 4, 3);
      rect(ctx, "#FFD07A", -17, -35 + bob, 2, 2);
      rect(ctx, "#FF7043", 0, -35 + bob, 4, 3);
      rect(ctx, "#FFD07A", 1, -36 + bob, 2, 2);
      drawChainLink(ctx, p, -29, -15 + bob, true);
      drawChainLink(ctx, p, -31, -9 + bob, false);
    }
  },

  frost_hound(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, -1, 0, 1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-3, -1, 3, 1][phase] : 0;
    const lunge = state === "attack" ? [0, 2, 6, 3][phase] : 0;
    const jaw = state === "attack" ? [0, 1, 4, 2][phase] : 0;

    // Four ice-clad legs keep the hound grounded and unmistakably quadrupedal.
    for (const [x, shift, front] of [[-11, stride, false], [-4, -stride, false], [7, -stride, true], [14, stride, true]] as const) {
      rect(ctx, p.ink, x + shift, -5 + bob, 6, 12);
      rect(ctx, front ? "#7FC3D9" : "#5D9CB4", x + shift + 1, -4 + bob, 4, 9);
      rect(ctx, "#CDEFF7", x + shift, 3 + bob, 6, 4);
      rect(ctx, "#F2FDFF", x + shift + 2, 4 + bob, 2, 2);
      rect(ctx, p.ink, x + shift - 1, 6 + bob, 8, 3);
    }

    // Long wolf torso with a jagged crystal mane and frozen tail.
    rect(ctx, p.ink, -15, -19 + bob, 31, 17);
    rect(ctx, "#5895AE", -14, -18 + bob, 29, 15);
    rect(ctx, "#78BDD2", -11, -17 + bob, 17, 11);
    rect(ctx, "#3C768F", 7, -16 + bob, 7, 12);
    rect(ctx, p.ink, -20, -19 + bob, 8, 6);
    rect(ctx, "#6FB5CB", -19, -18 + bob, 6, 4);
    rect(ctx, p.ink, -24, -23 + bob, 7, 5);
    rect(ctx, "#A5DDE9", -23, -22 + bob, 5, 3);
    for (const [x, y, w, h] of [[-12, -24, 5, 8], [-6, -27, 5, 10], [0, -24, 5, 8], [6, -23, 4, 7]] as const) {
      rect(ctx, p.ink, x - 1, y - 1 + bob, w + 2, h + 2);
      rect(ctx, "#BCEBF4", x, y + bob, w, h);
      rect(ctx, "#F1FDFF", x + 1, y + 1 + bob, 1, Math.max(2, h - 3));
    }

    // The muzzle and lower jaw actually surge forward during the charge bite.
    const headX = 12 + lunge;
    rect(ctx, p.ink, headX, -25 + bob, 15, 15);
    rect(ctx, "#6AABC1", headX + 1, -24 + bob, 13, 13);
    rect(ctx, "#9DD8E5", headX + 3, -22 + bob, 7, 9);
    rect(ctx, p.ink, headX + 1, -31 + bob, 6, 8);
    rect(ctx, "#A8DEEA", headX + 2, -30 + bob, 4, 6);
    rect(ctx, p.ink, headX + 9, -31 + bob, 6, 8);
    rect(ctx, "#8FCBDA", headX + 10, -30 + bob, 4, 6);
    drawPixelEye(ctx, p, headX + 10, -20 + bob, "#E9FFFF");
    rect(ctx, p.ink, headX + 11, -18 + bob, 13, 8 + jaw);
    rect(ctx, "#467E96", headX + 12, -17 + bob, 11, 5 + jaw);
    rect(ctx, "#132A38", headX + 15, -12 + bob + jaw, 8, 3);
    rect(ctx, "#F5FEFF", headX + 14, -17 + bob, 2, 4);
    rect(ctx, "#F5FEFF", headX + 20, -17 + bob, 2, 4);
    rect(ctx, "#D5F6FC", headX + 22, -15 + bob, 5, 3);

    if (state === "attack" && phase >= 2) {
      // Frost breath fractures into three short shards instead of a generic melee flash.
      rect(ctx, "#E9FFFF", headX + 28, -17 + bob, 5, 2);
      rect(ctx, "#A9E5F1", headX + 32, -21 + bob, 4, 2);
      rect(ctx, "#73C8DF", headX + 34, -13 + bob, 5, 2);
    }
  },
  ice_shaman(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-2, -1, 2, 1][phase] : 0;
    const cast = state === "attack" ? [0, -4, -10, -6][phase] : 0;

    // Heavy fur cloak forms a triangular silhouette with split walking feet.
    rect(ctx, p.ink, -11, -18 + bob, 22, 25);
    rect(ctx, "#DDEEF1", -10, -17 + bob, 20, 23);
    rect(ctx, "#A7D3DE", -8, -16 + bob, 8, 20);
    rect(ctx, "#79B6C8", 2, -15 + bob, 6, 18);
    rect(ctx, p.ink, -8 + stride, 4 + bob, 7, 5);
    rect(ctx, p.ink, 1 - stride, 4 + bob, 7, 5);
    rect(ctx, "#416E80", -7 + stride, 5 + bob, 5, 3);
    rect(ctx, "#416E80", 2 - stride, 5 + bob, 5, 3);
    rect(ctx, "#F7FFFF", -11, -19 + bob, 22, 5);
    rect(ctx, "#B9E2E9", -9, -18 + bob, 7, 3);

    // Hood, mask and antler-like ice crown establish the ritualist identity.
    rect(ctx, p.ink, -9, -31 + bob, 18, 15);
    rect(ctx, "#4B8298", -8, -30 + bob, 16, 13);
    rect(ctx, "#74B7CB", -6, -29 + bob, 8, 11);
    rect(ctx, p.ink, -5, -25 + bob, 11, 7);
    rect(ctx, "#173240", -4, -24 + bob, 9, 5);
    drawPixelEye(ctx, p, -2, -22 + bob, "#BDF5FF");
    drawPixelEye(ctx, p, 3, -22 + bob, "#BDF5FF");
    for (const [x, y, h] of [[-9, -39, 9], [-4, -42, 12], [3, -41, 11], [8, -37, 8]] as const) {
      rect(ctx, p.ink, x - 1, y - 1 + bob, 4, h + 2);
      rect(ctx, "#A8E2EE", x, y + bob, 2, h);
      rect(ctx, "#F0FDFF", x, y + bob, 1, Math.max(2, h - 3));
    }

    // Staff rises through the cast; its crystal and ground rune belong to the pose.
    const staffY = cast;
    rect(ctx, p.ink, 12, -28 + bob + staffY, 4, 37 - Math.min(0, staffY));
    rect(ctx, "#5C5147", 13, -27 + bob + staffY, 2, 35 - Math.min(0, staffY));
    rect(ctx, p.ink, 8, -37 + bob + staffY, 12, 12);
    rect(ctx, "#61BED6", 9, -36 + bob + staffY, 10, 10);
    rect(ctx, "#CFF8FF", 12, -35 + bob + staffY, 4, 7);
    rect(ctx, "#FFFFFF", 13, -34 + bob + staffY, 2, 3);
    rect(ctx, p.ink, -15, -13 + bob, 6, 12);
    rect(ctx, "#B6DDE4", -14, -12 + bob, 4, 10);

    if (state === "attack" && phase >= 1) {
      // Stepped frost sigil warns the area attack without a circular canvas primitive.
      const spread = phase === 2 ? 18 : 14;
      rect(ctx, "#6FC9DF", -spread, 8, spread * 2, 2);
      rect(ctx, "#BEEFFC", -spread + 4, 5, spread * 2 - 8, 2);
      rect(ctx, "#E9FFFF", -1, 2, 3, 9);
      rect(ctx, "#9EE1F0", -10, 4, 3, 4);
      rect(ctx, "#9EE1F0", 8, 4, 3, 4);
    }
  },
  snow_turret(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const tread = state === "walk" ? [-2, 0, 2, 0][phase] : 0;
    const recoil = state === "attack" ? [0, -2, -5, -2][phase] : 0;
    const lift = state === "idle" ? [0, -1][phase] : 0;

    // Wide crawler chassis replaces the old walking humanoid base.
    rect(ctx, p.ink, -16, -4, 32, 11);
    rect(ctx, "#354E5D", -15, -3, 30, 9);
    rect(ctx, "#688898", -12, -2, 24, 6);
    for (const x of [-12, -5, 2, 9]) {
      rect(ctx, p.ink, x + tread, 3, 6, 5);
      rect(ctx, "#91ADBA", x + 1 + tread, 4, 4, 3);
    }
    rect(ctx, "#B9E1E9", -11, -1, 8, 2);
    rect(ctx, p.ink, -10, -13 + lift, 20, 11);
    rect(ctx, "#79B7C8", -9, -12 + lift, 18, 9);
    rect(ctx, "#C9EFF5", -6, -15 + lift, 12, 5);
    rect(ctx, "#F4FFFF", -4, -14 + lift, 8, 2);
    rect(ctx, p.ink, -4, -10 + lift, 8, 5);
    rect(ctx, "#18313F", -3, -9 + lift, 6, 3);
    rect(ctx, "#7DE3F5", 1, -9 + lift, 1, 1);

    // Twin cryo barrels visibly recoil and vent during the scatter burst.
    const gunX = 7 + recoil;
    rect(ctx, p.ink, gunX, -12 + lift, 23, 9);
    rect(ctx, "#537F91", gunX + 1, -11 + lift, 21, 7);
    rect(ctx, "#B4E5EE", gunX + 3, -10 + lift, 16, 2);
    rect(ctx, p.ink, gunX + 19, -13 + lift, 6, 11);
    rect(ctx, "#D7F6FA", gunX + 20, -12 + lift, 4, 9);
    rect(ctx, "#245269", gunX + 21, -9 + lift, 3, 3);
    rect(ctx, p.ink, gunX + 5, -17 + lift, 7, 6);
    rect(ctx, "#76C5D9", gunX + 6, -16 + lift, 5, 4);
    if (state === "attack" && phase >= 2) {
      rect(ctx, "#F4FFFF", gunX + 27, -12 + lift, 5, 3);
      rect(ctx, "#B8EDF5", gunX + 30, -17 + lift, 3, 3);
      rect(ctx, "#8AD9E8", gunX + 31, -6 + lift, 4, 3);
      rect(ctx, "#DFFFFF", gunX + 35, -11 + lift, 3, 3);
    }
  },
  white_sampler(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-2, -1, 2, 1][phase] : 0;
    const aim = state === "attack" ? [0, 2, 5, 2][phase] : 0;

    // Compact decontamination suit with backpack and independent boots.
    rect(ctx, p.ink, -9, -20 + bob, 18, 24);
    rect(ctx, "#E8ECEC", -8, -19 + bob, 16, 22);
    rect(ctx, "#FFFFFF", -6, -18 + bob, 7, 19);
    rect(ctx, "#B7C9CE", 3, -18 + bob, 4, 18);
    rect(ctx, "#1769A5", -8, -12 + bob, 16, 3);
    rect(ctx, "#2D8BC1", -1, -10 + bob, 3, 12);
    rect(ctx, p.ink, -7 + stride, 2 + bob, 7, 7);
    rect(ctx, p.ink, 1 - stride, 2 + bob, 7, 7);
    rect(ctx, "#2B8A86", -6 + stride, 3 + bob, 5, 5);
    rect(ctx, "#2B8A86", 2 - stride, 3 + bob, 5, 5);
    rect(ctx, p.ink, -15, -17 + bob, 7, 17);
    rect(ctx, "#9BAFB5", -14, -16 + bob, 5, 15);
    rect(ctx, "#4D7D8E", -13, -14 + bob, 3, 8);

    // Oversized face shield preserves the sampler's clinical silhouette.
    rect(ctx, p.ink, -10, -34 + bob, 20, 16);
    rect(ctx, "#F5F7F7", -9, -33 + bob, 18, 14);
    rect(ctx, "#91CEE3", -7, -30 + bob, 14, 8);
    rect(ctx, "#C8F2F8", -5, -29 + bob, 9, 3);
    rect(ctx, "#17313D", -5, -24 + bob, 10, 2);
    rect(ctx, "#1D76B1", -10, -20 + bob, 20, 3);
    rect(ctx, "#D1DCDD", 7, -31 + bob, 3, 7);
    rect(ctx, "#5DA6BD", 8, -29 + bob, 1, 4);

    // Sampling lance extends from the forearm and ejects a sealed vial.
    rect(ctx, p.ink, 7, -16 + bob, 11 + aim, 7);
    rect(ctx, "#D8E2E3", 8, -15 + bob, 9 + aim, 5);
    rect(ctx, "#397C9D", 10, -14 + bob, 7 + aim, 2);
    rect(ctx, p.ink, 16 + aim, -15 + bob, 9, 5);
    rect(ctx, "#6EAFC2", 17 + aim, -14 + bob, 7, 3);
    rect(ctx, "#DFFBFF", 23 + aim, -13 + bob, 5, 2);
    rect(ctx, p.ink, -12, -12 + bob, 5, 12);
    rect(ctx, "#EEF3F3", -11, -11 + bob, 3, 10);
    if (state === "attack" && phase >= 2) {
      rect(ctx, p.ink, 30 + aim, -16 + bob, 7, 7);
      rect(ctx, "#DFF8FA", 31 + aim, -15 + bob, 5, 5);
      rect(ctx, "#4CB6C4", 33 + aim, -14 + bob, 2, 3);
    }
  },
  mirror_wisp(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const hover = state === "walk" ? [0, -2, 0, 2][phase] : state === "idle" ? [0, -1][phase] : 0;
    const split = state === "attack" ? [0, 2, 6, 3][phase] : 0;

    // Broken mirror frame surrounds a reflected eye-like core.
    rect(ctx, p.ink, -8 - split, -26 + hover, 8, 18);
    rect(ctx, "#5895A8", -7 - split, -25 + hover, 6, 16);
    rect(ctx, "#BDEAF1", -5 - split, -23 + hover, 2, 11);
    rect(ctx, p.ink, 1 + split, -26 + hover, 8, 18);
    rect(ctx, "#69AFC0", 2 + split, -25 + hover, 6, 16);
    rect(ctx, "#D9F8FC", 3 + split, -23 + hover, 2, 9);
    rect(ctx, p.ink, -5 - Math.floor(split / 2), -31 + hover, 11 + split, 7);
    rect(ctx, "#78C2D2", -4 - Math.floor(split / 2), -30 + hover, 9 + split, 5);
    rect(ctx, p.ink, -5 - Math.floor(split / 2), -10 + hover, 11 + split, 6);
    rect(ctx, "#4D8B9E", -4 - Math.floor(split / 2), -9 + hover, 9 + split, 4);
    rect(ctx, p.ink, -5, -22 + hover, 11, 11);
    rect(ctx, "#5FC4D6", -4, -21 + hover, 9, 9);
    rect(ctx, "#BDF8FF", -2, -19 + hover, 5, 5);
    rect(ctx, "#FFFFFF", 0, -18 + hover, 2, 2);
    rect(ctx, "#17313F", -1, -15 + hover, 4, 2);

    // Lower shards trail independently and spread into twin projectiles while firing.
    for (const [x, y, shift] of [[-9, -7, -split], [-2, -3, 0], [7, -6, split]] as const) {
      rect(ctx, p.ink, x + shift, y + hover, 5, 7);
      rect(ctx, "#7BCADA", x + 1 + shift, y + 1 + hover, 3, 5);
      rect(ctx, "#D7FAFF", x + 2 + shift, y + 1 + hover, 1, 3);
    }
    if (state === "attack" && phase >= 2) {
      rect(ctx, "#E9FFFF", 13 + split, -24 + hover, 5, 3);
      rect(ctx, "#8BD9E8", 17 + split, -22 + hover, 5, 2);
      rect(ctx, "#E9FFFF", 12 + split, -12 + hover, 5, 3);
      rect(ctx, "#8BD9E8", 16 + split, -11 + hover, 5, 2);
    }
  },
  frost_titan(ctx, p, _limbFrame, state, stateFrame, bossPhase = 1) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-3, -1, 3, 1][phase] : 0;
    const slam = state === "attack" ? [0, -5, 5, 9][phase] : 0;

    // Glacier legs and fractured torso form a broad, top-heavy colossus.
    rect(ctx, p.ink, -18 + stride, -8 + bob, 14, 22);
    rect(ctx, "#397C9B", -17 + stride, -7 + bob, 12, 19);
    rect(ctx, "#77BCD0", -14 + stride, -6 + bob, 6, 16);
    rect(ctx, p.ink, 4 - stride, -8 + bob, 14, 22);
    rect(ctx, "#326F8E", 5 - stride, -7 + bob, 12, 19);
    rect(ctx, "#6DB4CB", 7 - stride, -6 + bob, 6, 16);
    rect(ctx, p.ink, -21 + stride, 10 + bob, 18, 5);
    rect(ctx, p.ink, 3 - stride, 10 + bob, 18, 5);
    rect(ctx, "#A5DDE8", -19 + stride, 11 + bob, 14, 3);
    rect(ctx, "#A5DDE8", 5 - stride, 11 + bob, 14, 3);

    rect(ctx, p.ink, -23, -39 + bob, 46, 34);
    rect(ctx, "#286A8A", -22, -38 + bob, 44, 32);
    rect(ctx, "#4C9FBA", -18, -36 + bob, 21, 28);
    rect(ctx, "#1F5675", 6, -35 + bob, 13, 27);
    rect(ctx, "#87CAD9", -15, -34 + bob, 9, 23);
    rect(ctx, "#B9E8F0", -13, -32 + bob, 3, 15);
    rect(ctx, p.ink, -9, -25 + bob, 18, 17);
    rect(ctx, "#17465F", -8, -24 + bob, 16, 15);
    rect(ctx, bossPhase >= 3 ? "#F4FFFF" : "#8DE1EF", -5, -21 + bob, 10, 9);
    rect(ctx, "#FFFFFF", -2, -20 + bob, 4, 4);

    // Crowned ice head is embedded into the glacier shoulders.
    rect(ctx, p.ink, -14, -54 + bob, 28, 18);
    rect(ctx, "#4A94AF", -13, -53 + bob, 26, 16);
    rect(ctx, "#83C9D9", -10, -51 + bob, 12, 13);
    rect(ctx, p.ink, -8, -47 + bob, 7, 6);
    rect(ctx, "#C8F7FC", -6, -45 + bob, 3, 2);
    rect(ctx, p.ink, 2, -47 + bob, 7, 6);
    rect(ctx, "#C8F7FC", 4, -45 + bob, 3, 2);
    rect(ctx, p.ink, -4, -39 + bob, 9, 3);
    for (const [x, y, w, h] of [[-14, -63, 6, 11], [-7, -68, 6, 16], [1, -66, 6, 14], [8, -61, 6, 9]] as const) {
      rect(ctx, p.ink, x - 1, y - 1 + bob, w + 2, h + 2);
      rect(ctx, "#83D2E2", x, y + bob, w, h);
      rect(ctx, "#E8FDFF", x + 1, y + 1 + bob, 2, Math.max(3, h - 4));
    }

    // Boulder fists lift and crash as part of the attack animation.
    const fistY = Math.max(0, slam);
    rect(ctx, p.ink, -34, -35 + bob + slam, 14, 32 - Math.max(0, slam));
    rect(ctx, "#347A97", -33, -34 + bob + slam, 12, 30 - Math.max(0, slam));
    rect(ctx, "#71BACA", -31, -31 + bob + slam, 5, 23 - Math.max(0, slam));
    rect(ctx, p.ink, -39, -9 + bob + fistY, 20, 14);
    rect(ctx, "#4F98AE", -38, -8 + bob + fistY, 18, 12);
    rect(ctx, "#A9DDE7", -35, -7 + bob + fistY, 6, 7);
    rect(ctx, p.ink, 20, -35 + bob + slam, 14, 32 - Math.max(0, slam));
    rect(ctx, "#2C708E", 21, -34 + bob + slam, 12, 30 - Math.max(0, slam));
    rect(ctx, "#67B0C4", 23, -31 + bob + slam, 5, 23 - Math.max(0, slam));
    rect(ctx, p.ink, 19, -9 + bob + fistY, 20, 14);
    rect(ctx, "#478FA7", 20, -8 + bob + fistY, 18, 12);
    rect(ctx, "#A3D9E5", 29, -7 + bob + fistY, 6, 7);

    // Boss phases grow new glacier spires rather than generic phase markers.
    if (bossPhase >= 2) {
      for (const [x, y, h] of [[-27, -53, 17], [22, -51, 15], [-25, -28, 12], [22, -26, 11]] as const) {
        rect(ctx, p.ink, x - 1, y - 1 + bob, 7, h + 2);
        rect(ctx, "#65B8CD", x, y + bob, 5, h);
        rect(ctx, "#D8FAFF", x + 1, y + 1 + bob, 1, Math.max(3, h - 4));
      }
    }
    if (bossPhase >= 3) {
      rect(ctx, "#E9FFFF", -4, -76 + bob, 9, 5);
      rect(ctx, "#8CE3F0", -10, -73 + bob, 21, 3);
      rect(ctx, "#F7FFFF", -45, 7 + bob, 9, 2);
      rect(ctx, "#B8EDF5", 37, 5 + bob, 10, 2);
      rect(ctx, "#73CFE2", -43, 2 + bob, 5, 2);
      rect(ctx, "#73CFE2", 40, 0 + bob, 5, 2);
    }
  },
  white_director(ctx, p, _limbFrame, state, stateFrame, bossPhase = 1) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-3, -1, 3, 1][phase] : 0;
    const command = state === "attack" ? [0, 2, 6, 3][phase] : 0;

    // Reinforced containment suit and twin tanks create the director's mass.
    rect(ctx, p.ink, -20, -37 + bob, 40, 43);
    rect(ctx, "#DDE4E5", -19, -36 + bob, 38, 41);
    rect(ctx, "#FFFFFF", -16, -34 + bob, 16, 36);
    rect(ctx, "#AFC0C5", 4, -33 + bob, 11, 34);
    rect(ctx, "#125F9C", -19, -23 + bob, 38, 4);
    rect(ctx, "#287EB3", -2, -20 + bob, 5, 24);
    rect(ctx, p.ink, -16 + stride, 3 + bob, 14, 11);
    rect(ctx, p.ink, 2 - stride, 3 + bob, 14, 11);
    rect(ctx, "#277F7B", -14 + stride, 4 + bob, 10, 8);
    rect(ctx, "#277F7B", 4 - stride, 4 + bob, 10, 8);
    rect(ctx, p.ink, -31, -31 + bob, 12, 35);
    rect(ctx, "#7D949B", -30, -30 + bob, 10, 33);
    rect(ctx, "#B8C7CA", -28, -28 + bob, 4, 20);
    rect(ctx, p.ink, 19, -31 + bob, 12, 35);
    rect(ctx, "#718A92", 20, -30 + bob, 10, 33);
    rect(ctx, "#B2C2C5", 22, -28 + bob, 4, 20);
    rect(ctx, "#3BA7B5", -29, -5 + bob, 8, 5);
    rect(ctx, "#3BA7B5", 21, -5 + bob, 8, 5);

    // Wide observation helmet and red command stripe distinguish the boss.
    rect(ctx, p.ink, -18, -55 + bob, 36, 21);
    rect(ctx, "#F1F4F4", -17, -54 + bob, 34, 19);
    rect(ctx, "#88C5DA", -14, -50 + bob, 28, 10);
    rect(ctx, "#C8EFF5", -11, -49 + bob, 18, 4);
    rect(ctx, "#18313D", -10, -42 + bob, 20, 3);
    rect(ctx, "#D34C52", -18, -37 + bob, 36, 4);
    rect(ctx, "#FF7A76", -9, -36 + bob, 18, 2);
    rect(ctx, p.ink, -5, -62 + bob, 11, 8);
    rect(ctx, "#658A96", -4, -61 + bob, 9, 6);
    rect(ctx, "#B7D9DF", -1, -60 + bob, 3, 3);

    // Megaphone arm telescopes during the command burst and emits sample capsules.
    rect(ctx, p.ink, 16, -29 + bob, 15 + command, 9);
    rect(ctx, "#D5DFE0", 17, -28 + bob, 13 + command, 7);
    rect(ctx, "#4C879F", 19, -27 + bob, 10 + command, 3);
    const hornX = 27 + command;
    rect(ctx, p.ink, hornX, -34 + bob, 19, 19);
    rect(ctx, "#C9D7D9", hornX + 1, -33 + bob, 17, 17);
    rect(ctx, "#F4F7F7", hornX + 2, -31 + bob, 11, 13);
    rect(ctx, "#D94F55", hornX + 5, -27 + bob, 9, 5);
    rect(ctx, "#7B202A", hornX + 7, -26 + bob, 6, 3);
    rect(ctx, p.ink, hornX + 15, -36 + bob, 6, 23);
    rect(ctx, "#87999E", hornX + 16, -35 + bob, 4, 21);
    rect(ctx, p.ink, -26, -27 + bob, 8, 25);
    rect(ctx, "#DDE5E5", -25, -26 + bob, 6, 23);

    if (state === "attack" && phase >= 2) {
      for (const [x, y, color] of [[hornX + 24, -31, "#DFFBFF"], [hornX + 28, -23, "#A3E1EA"], [hornX + 23, -15, "#DFFBFF"]] as const) {
        rect(ctx, p.ink, x - 1, y - 1 + bob, 7, 7);
        rect(ctx, color, x, y + bob, 5, 5);
        rect(ctx, "#2BA4B0", x + 2, y + 1 + bob, 2, 3);
      }
    }

    // Boss phases add quarantine drones and ruptured coolant lines to the body.
    if (bossPhase >= 2) {
      for (const [x, y] of [[-34, -50], [28, -48]] as const) {
        rect(ctx, p.ink, x - 1, y - 1 + bob, 12, 9);
        rect(ctx, "#6F8992", x, y + bob, 10, 7);
        rect(ctx, "#C7E8ED", x + 2, y + 1 + bob, 5, 3);
        rect(ctx, "#D94F55", x + 7, y + 2 + bob, 2, 2);
      }
      rect(ctx, "#3A8E9E", -26, -40 + bob, 5, 10);
      rect(ctx, "#3A8E9E", 22, -39 + bob, 5, 9);
    }
    if (bossPhase >= 3) {
      rect(ctx, "#7BE1EC", -35, -14 + bob, 5, 12);
      rect(ctx, "#D9FFFF", -34, -13 + bob, 2, 8);
      rect(ctx, "#7BE1EC", 30, -13 + bob, 5, 11);
      rect(ctx, "#D9FFFF", 31, -12 + bob, 2, 7);
      rect(ctx, "#D94F55", -6, -66 + bob, 13, 3);
      rect(ctx, "#FFFFFF", -1, -67 + bob, 3, 2);
    }
  },

  ember_knight(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-2, -1, 2, 1][phase] : 0;
    const slash = state === "attack" ? [0, 2, 7, 4][phase] : 0;

    // Rear shield and cloak establish a broad, defensive knight silhouette.
    rect(ctx, p.ink, -15, -19 + bob, 9, 22);
    rect(ctx, "#4A2020", -14, -18 + bob, 7, 20);
    rect(ctx, "#7A2D23", -13, -16 + bob, 5, 14);
    rect(ctx, p.ink, -17, -16 + bob, 8, 16);
    rect(ctx, "#8E3424", -16, -15 + bob, 6, 14);
    rect(ctx, "#E85A2A", -15, -13 + bob, 2, 9);
    rect(ctx, "#FFB12B", -14, -10 + bob, 1, 4);

    // Layered plate torso is split by a bright molten seam.
    rect(ctx, p.ink, -8, -20 + bob, 17, 22);
    rect(ctx, "#54252A", -7, -19 + bob, 15, 20);
    rect(ctx, "#7B3230", -5, -18 + bob, 8, 18);
    rect(ctx, "#2B1D25", 3, -17 + bob, 4, 16);
    rect(ctx, "#D94A28", -7, -10 + bob, 15, 3);
    rect(ctx, "#FF9C24", -3, -18 + bob, 2, 11);
    rect(ctx, "#FFE06A", -2, -16 + bob, 1, 5);

    // Horned closed helm with a narrow furnace visor.
    rect(ctx, p.ink, -8, -31 + bob, 16, 13);
    rect(ctx, "#51242A", -7, -30 + bob, 14, 11);
    rect(ctx, "#7C3432", -5, -29 + bob, 9, 8);
    rect(ctx, p.ink, -10, -33 + bob, 5, 7);
    rect(ctx, "#B9472D", -9, -32 + bob, 3, 5);
    rect(ctx, p.ink, 5, -34 + bob, 5, 8);
    rect(ctx, "#B9472D", 6, -33 + bob, 3, 6);
    rect(ctx, p.ink, -6, -25 + bob, 12, 4);
    rect(ctx, "#FF7B22", -5, -24 + bob, 10, 2);
    rect(ctx, "#FFE66D", 1, -24 + bob, 3, 1);

    // Sword arm performs a stepped forward slash rather than receiving an overlay.
    rect(ctx, p.ink, 7, -18 + bob, 7 + Math.min(4, slash), 6);
    rect(ctx, "#6C2E2D", 8, -17 + bob, 5 + Math.min(4, slash), 4);
    const bladeX = 12 + slash;
    rect(ctx, p.ink, bladeX, -24 + bob + Math.floor(slash / 3), 5, 27 - Math.floor(slash / 2));
    rect(ctx, "#D85A30", bladeX + 1, -23 + bob + Math.floor(slash / 3), 3, 24 - Math.floor(slash / 2));
    rect(ctx, "#FF9F25", bladeX + 2, -21 + bob + Math.floor(slash / 3), 2, 20 - Math.floor(slash / 2));
    rect(ctx, "#FFE46B", bladeX + 3, -19 + bob + Math.floor(slash / 3), 1, 13);
    rect(ctx, p.ink, bladeX - 2, -13 + bob, 9, 3);
    rect(ctx, "#A64A2F", bladeX - 1, -12 + bob, 7, 1);

    rect(ctx, p.ink, -6 - stride, 0, 6, 7);
    rect(ctx, "#4A2428", -5 - stride, 1, 4, 5);
    rect(ctx, p.ink, 2 + stride, 0, 6, 7);
    rect(ctx, "#652B2D", 3 + stride, 1, 4, 5);
    rect(ctx, "#D94A28", -5 - stride, 2, 4, 1);
    rect(ctx, "#D94A28", 3 + stride, 2, 4, 1);
  },
  magma_spitter(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-2, -1, 2, 1][phase] : 0;
    const gulp = state === "attack" ? [0, 2, 5, 3][phase] : 0;

    // Heavy tail and low volcanic body make the spitter read as a salamander.
    rect(ctx, p.ink, -21, -10 + bob, 12, 7);
    rect(ctx, "#51211D", -20, -9 + bob, 10, 5);
    rect(ctx, "#8A3020", -18, -8 + bob, 7, 3);
    rect(ctx, p.ink, -12, -16 + bob, 25, 17);
    rect(ctx, "#66251F", -11, -15 + bob, 23, 15);
    rect(ctx, "#A33A22", -8, -14 + bob, 14, 12);
    rect(ctx, "#D94D22", 4, -12 + bob, 7, 10);
    rect(ctx, "#FF8C20", -5, -12 + bob, 5, 3);
    rect(ctx, "#FFB72F", 1, -14 + bob, 4, 3);
    rect(ctx, "#53201E", -5, -7 + bob, 14, 5);
    rect(ctx, "#FF6420", -2, -6 + bob, 8, 3);

    // Raised basalt nodules break the back line into an animal silhouette.
    for (const [x, y, w] of [[-8, -19, 5], [-2, -21, 5], [5, -19, 5]] as const) {
      rect(ctx, p.ink, x, y + bob, w, 6);
      rect(ctx, "#6F2921", x + 1, y + 1 + bob, w - 2, 4);
      rect(ctx, "#D74D22", x + 2, y + 1 + bob, Math.max(1, w - 3), 2);
    }

    // Head and throat visibly inflate before the five-shot magma spit.
    rect(ctx, p.ink, 10, -17 + bob - Math.floor(gulp / 2), 13 + gulp, 14 + gulp);
    rect(ctx, "#7C2B20", 11, -16 + bob - Math.floor(gulp / 2), 11 + gulp, 12 + gulp);
    rect(ctx, "#BD3D20", 13, -14 + bob, 8 + gulp, 8 + gulp);
    drawPixelEye(ctx, p, 15, -13 + bob, "#FFF06A");
    rect(ctx, p.ink, 18, -7 + bob + Math.floor(gulp / 2), 8 + gulp, 5);
    rect(ctx, "#341A1D", 19, -6 + bob + Math.floor(gulp / 2), 6 + gulp, 3);
    rect(ctx, "#FF8A20", 20, -5 + bob + Math.floor(gulp / 2), 5 + gulp, 1);
    if (state === "attack" && phase >= 2) {
      // Five ember droplets fan directly out of the opened jaw.
      for (const [x, y, color] of [[30, -11, "#FFB72E"], [33, -7, "#FFE66A"], [34, -3, "#FF7A1A"], [31, 1, "#FFB72E"], [28, 4, "#E84B20"]] as const) {
        rect(ctx, p.ink, x - 1, y - 1 + bob, 4, 4);
        rect(ctx, color, x, y + bob, 2, 2);
      }
    }

    // Four separately animated feet keep the body grounded.
    for (const [x, shift] of [[-9, -stride], [-2, stride], [7, -stride], [13, stride]] as const) {
      rect(ctx, p.ink, x + shift, -1, 6, 7);
      rect(ctx, "#5B2420", x + 1 + shift, 0, 4, 5);
      rect(ctx, "#A43A21", x + 3 + shift, 3, 4, 2);
    }
  },
  cinder_oracle(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-1, 0, 1, 0][phase] : 0;
    const cast = state === "attack" ? [0, 2, 6, 3][phase] : 0;

    // Long split robe and rear mantle create a tall caster silhouette.
    rect(ctx, p.ink, -12, -21 + bob, 22, 25);
    rect(ctx, "#3A2025", -11, -20 + bob, 20, 23);
    rect(ctx, "#5C2928", -8, -19 + bob, 8, 21);
    rect(ctx, "#782F29", 0, -18 + bob, 8, 20);
    rect(ctx, "#C74428", -10, -11 + bob, 18, 3);
    rect(ctx, "#F37822", -5, -18 + bob, 2, 10);
    rect(ctx, "#FFB52D", -4, -17 + bob, 1, 6);
    rect(ctx, p.ink, -10 - stride, 1, 8, 6);
    rect(ctx, p.ink, 1 + stride, 1, 8, 6);
    rect(ctx, "#4A2225", -9 - stride, 2, 6, 4);
    rect(ctx, "#642729", 2 + stride, 2, 6, 4);

    // Masked head and crown resemble a walking brazier.
    rect(ctx, p.ink, -8, -31 + bob, 16, 13);
    rect(ctx, "#512329", -7, -30 + bob, 14, 11);
    rect(ctx, "#81302C", -5, -29 + bob, 10, 8);
    rect(ctx, p.ink, -5, -25 + bob, 10, 5);
    drawPixelEye(ctx, p, -2, -23 + bob, "#FFD95B");
    drawPixelEye(ctx, p, 3, -23 + bob, "#FFD95B");
    for (const [x, y, w, h, color] of [[-9, -36, 5, 8, "#F05A20"], [-3, -40, 6, 11, "#FF8A1F"], [4, -36, 5, 8, "#F05A20"]] as const) {
      rect(ctx, p.ink, x - 1, y - 1 + bob, w + 2, h + 2);
      rect(ctx, color, x, y + bob, w, h);
      rect(ctx, "#FFE267", x + Math.floor(w / 2), y + 2 + bob, 1, Math.max(2, h - 4));
    }

    // Staff head rises and opens during casting.
    rect(ctx, p.ink, 10, -25 + bob - cast, 5, 31 + cast);
    rect(ctx, "#5A3327", 11, -24 + bob - cast, 3, 29 + cast);
    rect(ctx, "#A3482B", 12, -22 + bob - cast, 1, 24 + cast);
    rect(ctx, p.ink, 7, -31 + bob - cast, 11, 9);
    rect(ctx, "#8E3425", 8, -30 + bob - cast, 9, 7);
    rect(ctx, "#FF7A1F", 10, -29 + bob - cast, 5, 5);
    rect(ctx, "#FFE26B", 12, -28 + bob - cast, 2, 3);
    rect(ctx, p.ink, 7, -15 + bob, 6, 5);
    rect(ctx, "#8A3529", 8, -14 + bob, 4, 3);

    if (state === "attack" && phase >= 2) {
      // Stepped cinder seal previews the area strike without a generic overlay.
      rect(ctx, "rgba(65, 22, 22, 0.88)", -17, 7, 34, 3);
      rect(ctx, "#A83B24", -13, 5, 8, 2);
      rect(ctx, "#A83B24", 5, 5, 8, 2);
      rect(ctx, "#F47721", -4, 4, 8, 2);
      rect(ctx, "#FFD85B", -1, 3, 3, 2);
      rect(ctx, "#D94B22", -15, 2, 3, 3);
      rect(ctx, "#D94B22", 13, 2, 3, 3);
    }
  },
  code_horse(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-3, -1, 3, 1][phase] : 0;
    const charge = state === "attack" ? [0, 2, 7, 4][phase] : 0;

    // Segmented tail and long frame immediately identify a four-legged machine horse.
    rect(ctx, p.ink, -26, -17 + bob, 10, 5);
    rect(ctx, "#40242B", -25, -16 + bob, 8, 3);
    rect(ctx, p.ink, -29, -13 + bob, 7, 4);
    rect(ctx, "#E34D27", -28, -12 + bob, 5, 2);
    rect(ctx, p.ink, -18, -21 + bob, 29, 20);
    rect(ctx, "#4C292D", -17, -20 + bob, 27, 18);
    rect(ctx, "#70302E", -14, -19 + bob, 16, 16);
    rect(ctx, "#2A232A", 2, -18 + bob, 7, 15);
    rect(ctx, "#B73D27", -15, -8 + bob, 24, 3);
    rect(ctx, "#E76026", -10, -19 + bob, 2, 11);

    // Green code panel remains physically inset into the rib cage.
    rect(ctx, p.ink, -11, -16 + bob, 12, 9);
    rect(ctx, "#16382F", -10, -15 + bob, 10, 7);
    rect(ctx, "#2ECC71", -9, -14 + bob, 8, 5);
    rect(ctx, "#0A221D", -8, -13 + bob, 2, 1);
    rect(ctx, "#0A221D", -5, -11 + bob, 3, 1);
    rect(ctx, "#B7FF9E", -2, -14 + bob, 1, 2);

    // Neck and head lower into a ram-like charging pose.
    rect(ctx, p.ink, 7 + charge, -28 + bob + Math.floor(charge / 2), 10, 19);
    rect(ctx, "#5B2A2E", 8 + charge, -27 + bob + Math.floor(charge / 2), 8, 17);
    rect(ctx, "#873330", 10 + charge, -25 + bob + Math.floor(charge / 2), 5, 13);
    rect(ctx, p.ink, 13 + charge, -25 + bob + Math.floor(charge / 2), 14, 13);
    rect(ctx, "#6E2D2F", 14 + charge, -24 + bob + Math.floor(charge / 2), 12, 11);
    rect(ctx, "#A43A2D", 16 + charge, -22 + bob + Math.floor(charge / 2), 8, 8);
    drawPixelEye(ctx, p, 19 + charge, -21 + bob + Math.floor(charge / 2), "#8CFF83");
    rect(ctx, p.ink, 23 + charge, -18 + bob + Math.floor(charge / 2), 8, 6);
    rect(ctx, "#C1B090", 24 + charge, -17 + bob + Math.floor(charge / 2), 6, 4);
    rect(ctx, "#F2E5BD", 28 + charge, -16 + bob + Math.floor(charge / 2), 3, 2);

    // Glowing data mane reads separately from the molten armor.
    for (const [x, y, h] of [[7, -31, 7], [11, -34, 8], [15, -31, 6]] as const) {
      rect(ctx, p.ink, x + charge, y + bob + Math.floor(charge / 2), 4, h);
      rect(ctx, "#1E7C4A", x + 1 + charge, y + 1 + bob + Math.floor(charge / 2), 2, h - 2);
      rect(ctx, "#70F58B", x + 2 + charge, y + 1 + bob + Math.floor(charge / 2), 1, Math.max(2, h - 4));
    }

    const legsData = [[-14, -stride], [-5, stride], [3, -stride], [9, stride]] as const;
    for (const [x, shift] of legsData) {
      rect(ctx, p.ink, x + shift, -3, 6, 12);
      rect(ctx, "#48252B", x + 1 + shift, -2, 4, 10);
      rect(ctx, "#A43A2D", x + 3 + shift, 4, 4, 3);
      rect(ctx, p.ink, x + 2 + shift, 7, 6, 3);
    }
  },
  furnace_beetle(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-2, -1, 2, 1][phase] : 0;
    const vent = state === "attack" ? [0, 2, 6, 3][phase] : 0;

    // Six low legs create a beetle silhouette independent of humanoid enemies.
    for (const [x, y, shift] of [[-17, -5, -stride], [-18, 1, stride], [-12, 5, -stride], [12, -5, stride], [14, 1, -stride], [9, 5, stride]] as const) {
      rect(ctx, p.ink, x + shift, y + bob, 8, 4);
      rect(ctx, "#3D2427", x + 1 + shift, y + 1 + bob, 6, 2);
      rect(ctx, "#8D3427", x + (x < 0 ? 0 : 5) + shift, y + 2 + bob, 4, 3);
    }

    // Boiler shell is broad and divided by a central furnace hinge.
    rect(ctx, p.ink, -17, -18 + bob, 34, 22);
    rect(ctx, "#3D2528", -16, -17 + bob, 32, 20);
    rect(ctx, "#652B2A", -13, -16 + bob, 26, 18);
    rect(ctx, "#923329", -10, -15 + bob, 18, 16);
    rect(ctx, p.ink, -2, -17 + bob, 5, 20);
    rect(ctx, "#472328", -1, -16 + bob, 3, 18);
    rect(ctx, "#C84625", -12, -4 + bob, 24, 3);

    // Furnace window opens vertically during the shot.
    rect(ctx, p.ink, -8, -14 + bob - Math.floor(vent / 2), 16, 12 + vent);
    rect(ctx, "#4C1E1E", -7, -13 + bob - Math.floor(vent / 2), 14, 10 + vent);
    rect(ctx, "#E14A20", -5, -11 + bob - Math.floor(vent / 2), 10, 7 + vent);
    rect(ctx, "#FF8C22", -3, -10 + bob - Math.floor(vent / 2), 6, 5 + vent);
    rect(ctx, "#FFE267", -1, -9 + bob - Math.floor(vent / 2), 2, 3 + vent);

    // Stack, head and barrel give the beetle a mobile-smelter identity.
    rect(ctx, p.ink, -10, -27 + bob, 8, 12);
    rect(ctx, "#4B2C2C", -9, -26 + bob, 6, 10);
    rect(ctx, "#77706A", -8, -25 + bob, 4, 3);
    rect(ctx, p.ink, -11, -29 + bob, 10, 4);
    rect(ctx, "#8A3B2C", -10, -28 + bob, 8, 2);
    rect(ctx, p.ink, 13, -14 + bob, 10, 13);
    rect(ctx, "#55262A", 14, -13 + bob, 8, 11);
    drawPixelEye(ctx, p, 17, -10 + bob, "#FFD65A");
    rect(ctx, p.ink, 20, -8 + bob, 9 + vent, 6);
    rect(ctx, "#7F332B", 21, -7 + bob, 7 + vent, 4);
    rect(ctx, "#FF8A20", 25 + vent, -6 + bob, 4, 2);
    if (state === "attack" && phase >= 2) {
      rect(ctx, p.ink, 31 + vent, -8 + bob, 6, 6);
      rect(ctx, "#FFD95C", 32 + vent, -7 + bob, 4, 4);
      rect(ctx, "#FFF0A2", 34 + vent, -6 + bob, 2, 2);
    }
  },
  root_lancer(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-2, -1, 2, 1][phase] : 0;
    const thrust = state === "attack" ? [0, 3, 10, 5][phase] : 0;

    // Three root feet anchor a thin sniper silhouette.
    for (const [x, shift] of [[-8, -stride], [0, stride], [7, -stride]] as const) {
      rect(ctx, p.ink, x + shift, -3 + bob, 5, 8);
      rect(ctx, "#604229", x + 1 + shift, -2 + bob, 3, 6);
      rect(ctx, p.ink, x - 2 + shift, 3 + bob, 8, 3);
      rect(ctx, "#7A5638", x - 1 + shift, 3 + bob, 6, 1);
    }

    // Bark torso, leaf mantle and seed-mask head.
    rect(ctx, p.ink, -7, -24 + bob, 14, 22);
    rect(ctx, "#5A3B27", -6, -23 + bob, 12, 20);
    rect(ctx, "#805B3A", -4, -22 + bob, 5, 17);
    rect(ctx, p.ink, -11, -25 + bob, 22, 7);
    rect(ctx, "#48653A", -10, -24 + bob, 20, 5);
    rect(ctx, "#7FA85C", -8, -25 + bob, 7, 4);
    rect(ctx, "#91BB67", 3, -24 + bob, 6, 3);
    rect(ctx, p.ink, -6, -34 + bob, 12, 11);
    rect(ctx, "#6B4B31", -5, -33 + bob, 10, 9);
    rect(ctx, "#9C774B", -3, -32 + bob, 5, 7);
    drawPixelEye(ctx, p, -3, -29 + bob, "#D8FF8D");
    drawPixelEye(ctx, p, 2, -29 + bob, "#D8FF8D");
    rect(ctx, p.ink, -2, -25 + bob, 5, 2);

    // The root lance telescopes in four visible segments during the sniper shot.
    rect(ctx, p.ink, 6, -21 + bob, 8 + thrust, 7);
    rect(ctx, "#6D4A30", 7, -20 + bob, 6 + thrust, 5);
    rect(ctx, "#A07A4E", 9, -19 + bob, 4 + thrust, 2);
    rect(ctx, p.ink, 13 + thrust, -20 + bob, 12, 5);
    rect(ctx, "#93B75F", 14 + thrust, -19 + bob, 10, 3);
    rect(ctx, "#D9F2A2", 22 + thrust, -18 + bob, 5, 1);
    rect(ctx, p.ink, 25 + thrust, -20 + bob, 5, 5);
    rect(ctx, "#E8F7B2", 26 + thrust, -19 + bob, 4, 3);
  },
  petal_moth(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const hover = state === "walk" ? [0, -2, 0, 2][phase] : state === "idle" ? [0, -1][phase] : 0;
    const spread = state === "attack" ? [0, 2, 5, 3][phase] : 0;

    // Four independently offset petal wings create a readable flying silhouette.
    for (const [x, y, side, lower] of [[-17, -24, -1, false], [8, -24, 1, false], [-15, -10, -1, true], [7, -10, 1, true]] as const) {
      const wingX = x + side * spread;
      const wingY = y + hover + (lower ? Math.floor(spread / 3) : -Math.floor(spread / 4));
      rect(ctx, p.ink, wingX - 1, wingY - 1, 11, lower ? 10 : 12);
      rect(ctx, lower ? "#B75E88" : "#D978A2", wingX, wingY, 9, lower ? 8 : 10);
      rect(ctx, "#F4A8C4", wingX + 2, wingY + 1, 5, lower ? 5 : 7);
      rect(ctx, "#FFD7E4", wingX + (side < 0 ? 5 : 1), wingY + 2, 2, 3);
      rect(ctx, "#81506E", wingX + 3, wingY + (lower ? 5 : 7), 3, 2);
    }

    // Segmented body and luminous pollen sac.
    rect(ctx, p.ink, -6, -27 + hover, 12, 25);
    rect(ctx, "#5A3855", -5, -26 + hover, 10, 23);
    rect(ctx, "#88506E", -3, -24 + hover, 6, 18);
    rect(ctx, p.ink, -7, -33 + hover, 14, 9);
    rect(ctx, "#71435F", -6, -32 + hover, 12, 7);
    drawPixelEye(ctx, p, -3, -29 + hover, "#FFF1A0");
    drawPixelEye(ctx, p, 2, -29 + hover, "#FFF1A0");
    rect(ctx, p.ink, -7, -39 + hover, 3, 8);
    rect(ctx, p.ink, 4, -39 + hover, 3, 8);
    rect(ctx, "#D98AA9", -6, -40 + hover, 2, 7);
    rect(ctx, "#D98AA9", 5, -40 + hover, 2, 7);
    rect(ctx, "#F0CF5C", -2, -16 + hover, 5, 6);
    rect(ctx, "#FFF0A4", -1, -15 + hover, 3, 3);

    if (state === "attack" && phase >= 2) {
      for (const [x, y, color] of [[-24, -18, "#F5A7C3"], [21, -17, "#FFE071"], [-18, 1, "#D979A2"], [16, 1, "#F5A7C3"]] as const) {
        rect(ctx, p.ink, x - 1, y - 1 + hover, 5, 5);
        rect(ctx, color, x, y + hover, 3, 3);
      }
    }
  },
  coffin_lobber(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-2, -1, 2, 1][phase] : 0;
    const recoil = state === "attack" ? [0, -2, -6, -3][phase] : 0;

    // Short skeletal legs carry a massive coffin chassis.
    for (const [x, shift] of [[-9, -stride], [6, stride]] as const) {
      rect(ctx, p.ink, x + shift, -4 + bob, 6, 10);
      rect(ctx, "#D9D4C8", x + 1 + shift, -3 + bob, 4, 8);
      rect(ctx, p.ink, x - 1 + shift, 4 + bob, 9, 3);
    }
    rect(ctx, p.ink, -16, -28 + bob, 31, 27);
    rect(ctx, "#37303D", -15, -27 + bob, 29, 25);
    rect(ctx, "#62586B", -12, -25 + bob, 23, 21);
    rect(ctx, "#80768B", -9, -23 + bob, 17, 17);
    rect(ctx, p.ink, -3, -25 + bob, 6, 21);
    rect(ctx, "#B1A7BA", -1, -23 + bob, 2, 17);
    rect(ctx, p.ink, -10, -20 + bob, 20, 5);
    rect(ctx, "#4A4051", -8, -19 + bob, 16, 3);

    // Masked operator is inset into the coffin lid.
    rect(ctx, p.ink, -7, -35 + bob, 14, 10);
    rect(ctx, "#D9D4C9", -6, -34 + bob, 12, 8);
    rect(ctx, "#F0ECE0", -4, -33 + bob, 8, 5);
    drawPixelEye(ctx, p, -3, -31 + bob, "#C890E3");
    drawPixelEye(ctx, p, 2, -31 + bob, "#C890E3");

    // Mortar throat tilts backward and ejects a heavy shell.
    rect(ctx, p.ink, 8 + recoil, -31 + bob, 13, 19);
    rect(ctx, "#4D4655", 9 + recoil, -30 + bob, 11, 17);
    rect(ctx, "#81798B", 11 + recoil, -28 + bob, 7, 13);
    rect(ctx, p.ink, 10 + recoil, -35 + bob, 13, 6);
    rect(ctx, "#A39AAA", 11 + recoil, -34 + bob, 11, 4);
    rect(ctx, "#1B1720", 14 + recoil, -33 + bob, 6, 3);
    if (state === "attack" && phase >= 2) {
      rect(ctx, p.ink, 11 + recoil, -44 + bob, 8, 8);
      rect(ctx, "#8D6B9C", 12 + recoil, -43 + bob, 6, 6);
      rect(ctx, "#D6A5E8", 14 + recoil, -42 + bob, 3, 3);
    }
  },
  lantern_wraith(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const hover = state === "walk" ? [0, -2, 0, 2][phase] : state === "idle" ? [0, -1][phase] : 0;
    const open = state === "attack" ? [0, 2, 4, 2][phase] : 0;

    // Ragged robe tails and crescent sleeves establish a hovering spirit.
    rect(ctx, p.ink, -11, -22 + hover, 22, 24);
    rect(ctx, "#44334F", -10, -21 + hover, 20, 22);
    rect(ctx, "#6D4B7E", -7, -20 + hover, 14, 19);
    for (const [x, h] of [[-9, 10], [-4, 14], [2, 12], [7, 9]] as const) {
      rect(ctx, p.ink, x, -2 + hover, 5, h);
      rect(ctx, "#563D65", x + 1, -1 + hover, 3, h - 2);
    }
    for (const side of [-1, 1] as const) {
      const x = side < 0 ? -18 - open : 10 + open;
      rect(ctx, p.ink, x, -22 + hover, 9, 18);
      rect(ctx, "#5A3E69", x + 1, -21 + hover, 7, 16);
      rect(ctx, "#9D6FAD", x + (side < 0 ? 5 : 1), -18 + hover, 2, 9);
    }

    // Hood, face void and caged soul lantern.
    rect(ctx, p.ink, -9, -34 + hover, 18, 14);
    rect(ctx, "#593E67", -8, -33 + hover, 16, 12);
    rect(ctx, "#16141C", -5, -30 + hover, 10, 8);
    drawPixelEye(ctx, p, -3, -27 + hover, "#C8FFB1");
    drawPixelEye(ctx, p, 2, -27 + hover, "#C8FFB1");
    rect(ctx, p.ink, -6, -18 + hover, 12, 14);
    rect(ctx, "#53405B", -5, -17 + hover, 10, 12);
    rect(ctx, "#A66BC2", -3, -15 + hover, 6, 8);
    rect(ctx, "#D8FFB6", -1, -13 + hover, 3, 4);
    rect(ctx, "#F0FFDA", 0, -12 + hover, 1, 2);
    for (const x of [-5, 0, 5]) rect(ctx, "#25202C", x, -17 + hover, 1, 12);

    if (state === "attack" && phase >= 2) {
      for (const [x, y] of [[-22, -20], [19, -18], [-16, 2], [15, 3]] as const) {
        rect(ctx, p.ink, x - 1, y - 1 + hover, 6, 6);
        rect(ctx, "#B879D0", x, y + hover, 4, 4);
        rect(ctx, "#E5FFC9", x + 1, y + 1 + hover, 2, 2);
      }
    }
  },
  icicle_sniper(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-2, -1, 2, 1][phase] : 0;
    const recoil = state === "attack" ? [0, -2, -5, -2][phase] : 0;

    // Narrow insulated legs and a tall hood keep the silhouette distinct from the sampler.
    for (const [x, shift] of [[-6, -stride], [4, stride]] as const) {
      rect(ctx, p.ink, x + shift, -5 + bob, 5, 11);
      rect(ctx, "#527988", x + 1 + shift, -4 + bob, 3, 9);
      rect(ctx, "#D9EFF1", x + shift, 3 + bob, 6, 3);
    }
    rect(ctx, p.ink, -8, -25 + bob, 16, 21);
    rect(ctx, "#5D8794", -7, -24 + bob, 14, 19);
    rect(ctx, "#A6C8CE", -5, -23 + bob, 10, 16);
    rect(ctx, "#D84F59", -5, -14 + bob, 4, 3);
    rect(ctx, p.ink, -9, -36 + bob, 18, 13);
    rect(ctx, "#6E9AA4", -8, -35 + bob, 16, 11);
    rect(ctx, "#D9F1F3", -5, -33 + bob, 10, 7);
    rect(ctx, "#21414F", -4, -31 + bob, 8, 4);
    drawPixelEye(ctx, p, -2, -30 + bob, "#79E7F2");
    drawPixelEye(ctx, p, 2, -30 + bob, "#79E7F2");
    rect(ctx, "#F0FFFF", -7, -39 + bob, 3, 5);
    rect(ctx, "#F0FFFF", 4, -40 + bob, 3, 6);

    // Long cryo rifle recoils as one continuous mechanical silhouette.
    rect(ctx, p.ink, 5 + recoil, -22 + bob, 23, 8);
    rect(ctx, "#355866", 6 + recoil, -21 + bob, 21, 6);
    rect(ctx, "#88B9C1", 9 + recoil, -20 + bob, 14, 3);
    rect(ctx, p.ink, 22 + recoil, -20 + bob, 15, 5);
    rect(ctx, "#BFE6EA", 23 + recoil, -19 + bob, 13, 3);
    rect(ctx, "#E9FFFF", 34 + recoil, -18 + bob, 5, 1);
    rect(ctx, "#65D9E7", 13 + recoil, -25 + bob, 5, 5);
    rect(ctx, "#E9FFFF", 14 + recoil, -24 + bob, 3, 2);
    if (state === "attack" && phase >= 2) {
      rect(ctx, p.ink, 39 + recoil, -21 + bob, 7, 7);
      rect(ctx, "#8AEAF3", 40 + recoil, -20 + bob, 5, 5);
      rect(ctx, "#FFFFFF", 43 + recoil, -19 + bob, 2, 2);
    }
  },
  lab_servitor(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const hover = state === "walk" ? [0, -2, 0, 2][phase] : state === "idle" ? [0, -1][phase] : 0;
    const deploy = state === "attack" ? [0, 2, 7, 4][phase] : 0;

    // Twin stabilisers and medical canisters form a compact support drone.
    for (const side of [-1, 1] as const) {
      const x = side * (12 + deploy);
      rect(ctx, p.ink, x - 5, -23 + hover, 10, 22);
      rect(ctx, "#547681", x - 4, -22 + hover, 8, 20);
      rect(ctx, "#A7C8CE", x - 2, -20 + hover, 4, 15);
      rect(ctx, side < 0 ? "#D9535D" : "#62DDE7", x - 2, -17 + hover, 4, 7);
      rect(ctx, "#E8FFFF", x - 1, -16 + hover, 2, 3);
      rect(ctx, p.ink, x - 6, -3 + hover, 12, 5);
      rect(ctx, "#6B8E97", x - 4, -2 + hover, 8, 3);
    }
    rect(ctx, p.ink, -11, -29 + hover, 22, 27);
    rect(ctx, "#5B7C86", -10, -28 + hover, 20, 25);
    rect(ctx, "#BBD7DB", -7, -25 + hover, 14, 18);
    rect(ctx, "#E8F7F8", -5, -23 + hover, 10, 7);
    rect(ctx, "#21414E", -4, -21 + hover, 8, 4);
    drawPixelEye(ctx, p, -2, -20 + hover, "#68E3EC");
    drawPixelEye(ctx, p, 2, -20 + hover, "#68E3EC");
    rect(ctx, "#D84F59", -6, -12 + hover, 5, 4);
    rect(ctx, "#E7B94F", 2, -12 + hover, 4, 4);
    rect(ctx, p.ink, -3, -36 + hover, 6, 9);
    rect(ctx, "#65DCE7", -2, -37 + hover, 4, 7);
    rect(ctx, "#E9FFFF", -1, -36 + hover, 2, 3);

    // Four repair emitters unfold during the healing pulse.
    for (const [x, y] of [[-18 - deploy, -28], [13 + deploy, -28], [-17 - deploy, 2], [12 + deploy, 2]] as const) {
      rect(ctx, p.ink, x, y + hover, 6, 8);
      rect(ctx, "#7C9DA4", x + 1, y + 1 + hover, 4, 6);
      rect(ctx, "#7EE8E9", x + 2, y + 2 + hover, 2, 3);
    }
  },
  magma_mortar(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-2, -1, 2, 1][phase] : 0;
    const recoil = state === "attack" ? [0, -2, -7, -3][phase] : 0;

    // Six low furnace legs support a squat artillery chassis.
    for (const [x, y, shift] of [[-16, -3, -stride], [-14, 3, stride], [-6, 6, -stride], [10, -3, stride], [9, 3, -stride], [2, 6, stride]] as const) {
      rect(ctx, p.ink, x + shift, y + bob, 8, 4);
      rect(ctx, "#48292A", x + 1 + shift, y + 1 + bob, 6, 2);
      rect(ctx, "#A43E2C", x + (x < 0 ? 0 : 5) + shift, y + 2 + bob, 4, 3);
    }
    rect(ctx, p.ink, -17, -19 + bob, 34, 21);
    rect(ctx, "#3D292D", -16, -18 + bob, 32, 19);
    rect(ctx, "#6A302E", -13, -16 + bob, 26, 15);
    rect(ctx, "#A5412D", -9, -14 + bob, 18, 11);
    rect(ctx, p.ink, -7, -12 + bob, 14, 9);
    rect(ctx, "#D75226", -6, -11 + bob, 12, 7);
    rect(ctx, "#FF8C27", -3, -10 + bob, 6, 5);
    rect(ctx, "#FFE16A", -1, -9 + bob, 2, 3);

    // Elevated mortar tube recoils and exposes a glowing shell throat.
    rect(ctx, p.ink, -5 + recoil, -34 + bob, 16, 20);
    rect(ctx, "#4E3D3D", -4 + recoil, -33 + bob, 14, 18);
    rect(ctx, "#827878", -2 + recoil, -31 + bob, 10, 14);
    rect(ctx, p.ink, -7 + recoil, -38 + bob, 20, 7);
    rect(ctx, "#9A8E89", -6 + recoil, -37 + bob, 18, 5);
    rect(ctx, "#2A1B20", -2 + recoil, -36 + bob, 10, 3);
    if (state === "attack" && phase >= 2) {
      rect(ctx, p.ink, -1 + recoil, -48 + bob, 9, 9);
      rect(ctx, "#D94B25", 0 + recoil, -47 + bob, 7, 7);
      rect(ctx, "#FF9B29", 2 + recoil, -46 + bob, 4, 4);
      rect(ctx, "#FFE36B", 4 + recoil, -45 + bob, 2, 2);
    }
  },
  heat_smith_drone(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const hover = state === "walk" ? [0, -2, 0, 2][phase] : state === "idle" ? [0, -1][phase] : 0;
    const swing = state === "attack" ? [0, 3, 8, 4][phase] : 0;

    // Central forge body with two tool arms and four exhaust fins.
    rect(ctx, p.ink, -12, -27 + hover, 24, 26);
    rect(ctx, "#3B2B30", -11, -26 + hover, 22, 24);
    rect(ctx, "#655053", -8, -23 + hover, 16, 18);
    rect(ctx, "#9A4A35", -5, -20 + hover, 10, 12);
    rect(ctx, p.ink, -4, -18 + hover, 8, 9);
    rect(ctx, "#E35A2A", -3, -17 + hover, 6, 7);
    rect(ctx, "#FF9A28", -1, -16 + hover, 3, 5);
    rect(ctx, "#FFE36A", 0, -15 + hover, 1, 3);
    rect(ctx, p.ink, -7, -34 + hover, 14, 9);
    rect(ctx, "#62595A", -6, -33 + hover, 12, 7);
    drawPixelEye(ctx, p, -3, -30 + hover, "#FFE67B");
    drawPixelEye(ctx, p, 2, -30 + hover, "#FFE67B");

    for (const [x, y, side] of [[-18, -28, -1], [13, -28, 1], [-18, -7, -1], [13, -7, 1]] as const) {
      rect(ctx, p.ink, x, y + hover, 6, 10);
      rect(ctx, "#6C6767", x + 1, y + 1 + hover, 4, 8);
      rect(ctx, "#D54C27", x + (side < 0 ? 1 : 3), y + 3 + hover, 2, 5);
    }

    // Hammer and tong arms visibly spread for the support pulse.
    rect(ctx, p.ink, -22 - swing, -19 + hover, 13 + swing, 7);
    rect(ctx, "#656364", -21 - swing, -18 + hover, 11 + swing, 5);
    rect(ctx, "#A7AAA7", -24 - swing, -21 + hover, 7, 11);
    rect(ctx, p.ink, 9, -18 + hover, 14 + swing, 6);
    rect(ctx, "#6C6767", 10, -17 + hover, 12 + swing, 4);
    rect(ctx, "#D9A33D", 20 + swing, -19 + hover, 6, 8);
    if (state === "attack" && phase >= 2) {
      for (const [x, y, color] of [[-27, -5, "#FF8A26"], [24, -4, "#FFE36A"], [-18, 6, "#E65327"], [16, 7, "#FFB23A"]] as const) {
        rect(ctx, p.ink, x - 1, y - 1 + hover, 6, 6);
        rect(ctx, color, x, y + hover, 4, 4);
      }
    }
  },
  inferno_core(ctx, p, _limbFrame, state, stateFrame, bossPhase = 1) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const open = state === "attack" ? [0, 3, 9, 5][phase] : 0;

    // Four heavy stabilisers support a suspended crucible instead of a generic orb.
    for (const [x, y, side] of [[-31, -25, -1], [23, -25, 1], [-27, -4, -1], [19, -4, 1]] as const) {
      rect(ctx, p.ink, x - open * side, y + bob, 12, 13);
      rect(ctx, "#3A2429", x + 1 - open * side, y + 1 + bob, 10, 11);
      rect(ctx, "#71302D", x + 3 - open * side, y + 2 + bob, 6, 8);
      rect(ctx, "#D64725", x + (side < 0 ? 7 : 2) - open * side, y + 4 + bob, 2, 5);
    }

    // Outer reactor ring and crucible shell.
    rect(ctx, p.ink, -24, -43 + bob, 48, 48);
    rect(ctx, "#312329", -23, -42 + bob, 46, 46);
    rect(ctx, "#5B2A2C", -20, -39 + bob, 40, 40);
    rect(ctx, "#8D332A", -17, -36 + bob, 34, 34);
    rect(ctx, p.ink, -19, -29 + bob, 38, 18);
    rect(ctx, "#3C2024", -18, -28 + bob, 36, 16);
    rect(ctx, "#B43B24", -15, -26 + bob, 30, 12);
    rect(ctx, "#E85320", -11, -24 + bob, 22, 8);
    rect(ctx, "#FF8F21", -7, -23 + bob, 14, 7);
    rect(ctx, "#FFE266", -3, -21 + bob, 6, 4);
    rect(ctx, "#FFF4B0", -1, -20 + bob, 2, 2);

    // Broken ring gaps and vents keep the core mechanical and asymmetrical.
    rect(ctx, "#130D12", -25, -34 + bob, 8, 11);
    rect(ctx, "#130D12", 18, -18 + bob, 8, 10);
    rect(ctx, "#CB4526", -22, -12 + bob, 6, 9);
    rect(ctx, "#F47B21", 16, -37 + bob, 6, 8);
    rect(ctx, p.ink, -15, -52 + bob, 11, 13);
    rect(ctx, "#4D292B", -14, -51 + bob, 9, 11);
    rect(ctx, "#9A3829", -12, -48 + bob, 5, 7);
    rect(ctx, p.ink, 5, -50 + bob, 10, 11);
    rect(ctx, "#4D292B", 6, -49 + bob, 8, 9);
    rect(ctx, "#D04A25", 8, -47 + bob, 4, 6);

    if (state === "attack") {
      // The crucible physically opens and ejects radial slag chunks.
      rect(ctx, "#FFB12B", -14, -29 - open + bob, 28, 3);
      rect(ctx, "#FFE56B", -8, -31 - open + bob, 16, 2);
      if (phase >= 2) {
        for (const [x, y, color] of [[-38, -31, "#FF7A1D"], [31, -28, "#FFB12B"], [-34, 1, "#D94822"], [28, 4, "#FFE061"]] as const) {
          rect(ctx, p.ink, x - 1, y - 1 + bob, 7, 7);
          rect(ctx, color, x, y + bob, 5, 5);
          rect(ctx, "#FFF0A1", x + 2, y + 1 + bob, 2, 2);
        }
      }
    }

    // Boss phases bolt forge vanes and rupture the crucible shell itself.
    if (bossPhase >= 2) {
      for (const [x, y, w, h] of [[-34, -44, 11, 19], [24, -43, 11, 18], [-32, 5, 12, 8], [21, 4, 12, 8]] as const) {
        rect(ctx, p.ink, x - 1, y - 1 + bob, w + 2, h + 2);
        rect(ctx, "#552A2D", x, y + bob, w, h);
        rect(ctx, "#B63D27", x + 2, y + 2 + bob, Math.max(2, w - 4), 3);
      }
    }
    if (bossPhase >= 3) {
      // Irregular molten fractures replace the generic boss-phase cross overlay.
      rect(ctx, "#FF7A1D", -16, -36 + bob, 4, 11);
      rect(ctx, "#FF7A1D", -13, -28 + bob, 7, 4);
      rect(ctx, "#FFD85B", -14, -34 + bob, 2, 6);
      rect(ctx, "#FF7A1D", 10, -13 + bob, 4, 12);
      rect(ctx, "#FF7A1D", 5, -4 + bob, 8, 4);
      rect(ctx, "#FFE36B", 11, -11 + bob, 2, 7);
      rect(ctx, "#FFF3A2", -4, -55 + bob, 8, 3);
    }
  },
  vat_horse_prime(ctx, p, _limbFrame, state, stateFrame, bossPhase = 1) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-4, -1, 4, 1][phase] : 0;
    const charge = state === "attack" ? [0, 3, 10, 6][phase] : 0;

    // Rear exhaust tail and four piston legs establish the huge mechanical horse frame.
    rect(ctx, p.ink, -45, -25 + bob, 15, 7);
    rect(ctx, "#34242B", -44, -24 + bob, 13, 5);
    rect(ctx, "#D94B25", -42, -23 + bob, 8, 3);
    rect(ctx, "#FF9C25", -45, -22 + bob, 6, 2);
    const legData = [[-28, -stride], [-15, stride], [8, -stride], [20, stride]] as const;
    for (const [x, shift] of legData) {
      rect(ctx, p.ink, x + shift, -10 + bob, 10, 22);
      rect(ctx, "#3C292F", x + 1 + shift, -9 + bob, 8, 20);
      rect(ctx, "#70777A", x + 3 + shift, -7 + bob, 4, 14);
      rect(ctx, "#B8C0BC", x + 4 + shift, -5 + bob, 2, 8);
      rect(ctx, "#A73B2C", x + 1 + shift, 5 + bob, 8, 5);
      rect(ctx, p.ink, x - 1 + shift, 9 + bob, 13, 4);
    }

    // Armoured chassis and the glass vat are separate depth layers.
    rect(ctx, p.ink, -33, -36 + bob, 58, 30);
    rect(ctx, "#34252C", -32, -35 + bob, 56, 28);
    rect(ctx, "#5B3031", -28, -32 + bob, 48, 23);
    rect(ctx, "#7C3531", -22, -29 + bob, 34, 18);
    rect(ctx, "#B9442D", -30, -14 + bob, 52, 5);
    rect(ctx, "#E35A2A", -18, -31 + bob, 3, 18);
    rect(ctx, p.ink, -24, -48 + bob, 31, 18);
    rect(ctx, "#405259", -23, -47 + bob, 29, 16);
    rect(ctx, "#62868A", -20, -44 + bob, 23, 11);
    rect(ctx, "#173B32", -18, -42 + bob, 19, 8);
    rect(ctx, "#2ECC71", -17, -41 + bob, 17, 6);
    rect(ctx, "#86F5A0", -15, -40 + bob, 5, 2);
    rect(ctx, "#153329", -8, -38 + bob, 4, 1);
    rect(ctx, "#153329", -2, -40 + bob, 2, 3);
    rect(ctx, "#B9FFC1", -16, -41 + bob, 2, 1);

    // Articulated neck lowers into a destructive charge and carries a furnace mane.
    rect(ctx, p.ink, 17 + charge, -45 + bob + Math.floor(charge / 3), 14, 29);
    rect(ctx, "#4A2B30", 18 + charge, -44 + bob + Math.floor(charge / 3), 12, 27);
    rect(ctx, "#783431", 21 + charge, -41 + bob + Math.floor(charge / 3), 8, 21);
    for (const [x, y, h] of [[18, -51, 11], [23, -55, 13], [28, -51, 10]] as const) {
      rect(ctx, p.ink, x + charge, y + bob + Math.floor(charge / 3), 5, h);
      rect(ctx, "#B53E28", x + 1 + charge, y + 1 + bob + Math.floor(charge / 3), 3, h - 2);
      rect(ctx, "#FF7A20", x + 2 + charge, y + 2 + bob + Math.floor(charge / 3), 2, Math.max(3, h - 5));
    }
    rect(ctx, p.ink, 26 + charge, -42 + bob + Math.floor(charge / 3), 22, 20);
    rect(ctx, "#4C2B30", 27 + charge, -41 + bob + Math.floor(charge / 3), 20, 18);
    rect(ctx, "#7B3430", 30 + charge, -38 + bob + Math.floor(charge / 3), 15, 13);
    drawPixelEye(ctx, p, 36 + charge, -35 + bob + Math.floor(charge / 3), "#8DFF8B");
    rect(ctx, p.ink, 43 + charge, -31 + bob + Math.floor(charge / 3), 11, 8);
    rect(ctx, "#AFA68E", 44 + charge, -30 + bob + Math.floor(charge / 3), 9, 6);
    rect(ctx, "#F2E8C5", 50 + charge, -29 + bob + Math.floor(charge / 3), 4, 3);

    // Shoulder cannon recoils during the boss attack.
    rect(ctx, p.ink, 5, -44 + bob, 20 + Math.floor(charge / 2), 9);
    rect(ctx, "#59666A", 6, -43 + bob, 18 + Math.floor(charge / 2), 7);
    rect(ctx, "#A5B0AC", 9, -42 + bob, 12 + Math.floor(charge / 2), 3);
    rect(ctx, "#E34E26", 21 + Math.floor(charge / 2), -41 + bob, 6, 4);
    if (state === "attack" && phase >= 2) {
      rect(ctx, p.ink, 29 + Math.floor(charge / 2), -44 + bob, 8, 8);
      rect(ctx, "#FFD95F", 30 + Math.floor(charge / 2), -43 + bob, 6, 6);
      rect(ctx, "#FFF3A4", 33 + Math.floor(charge / 2), -42 + bob, 3, 3);
    }

    // Boss phases bolt extra vat armour, code pylons and furnace weaponry to the chassis.
    if (bossPhase >= 2) {
      for (const [x, y] of [[-36, -40], [-31, -20], [15, -20]] as const) {
        rect(ctx, p.ink, x - 1, y - 1 + bob, 12, 12);
        rect(ctx, "#4B3033", x, y + bob, 10, 10);
        rect(ctx, "#B8442D", x + 2, y + 2 + bob, 6, 3);
      }
      rect(ctx, "#2ECC71", -30, -38 + bob, 4, 12);
      rect(ctx, "#A5FF9C", -29, -37 + bob, 1, 7);
    }
    if (bossPhase >= 3) {
      rect(ctx, p.ink, -10, -57 + bob, 12, 12);
      rect(ctx, "#66302E", -9, -56 + bob, 10, 10);
      rect(ctx, "#FF6A20", -7, -54 + bob, 6, 7);
      rect(ctx, "#FFE169", -5, -53 + bob, 2, 4);
      rect(ctx, "#55E47A", -24, -6 + bob, 5, 10);
      rect(ctx, "#B4FFB0", -23, -5 + bob, 2, 6);
      rect(ctx, "#FF7A20", 17, -8 + bob, 5, 10);
      rect(ctx, "#FFE36C", 18, -7 + bob, 2, 6);
    }
  },

  // === PHASE 5 MODELS ===

  cursed_tome(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    rect(ctx, p.ink, -6, -12 + bob, 12, 14);
    rect(ctx, p.dark, -5, -11 + bob, 10, 12);
    rect(ctx, p.base, -4, -10 + bob, 8, 10);
    rect(ctx, p.light, -2, -8 + bob, 4, 6);
    drawAttackFrame(ctx, p, "orbit", stateFrame);
  },
  arcane_guard(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-1, 0, 1, 0][phase] : 0;
    legs(ctx, p, -6, 2, -2, _limbFrame);
    rect(ctx, p.ink, -8, -18 + bob, 16, 16);
    rect(ctx, p.dark, -7, -17 + bob, 14, 14);
    rect(ctx, p.base, -6, -16 + bob, 12, 12);
    eye(ctx, p, -2, -12 + bob);
    drawAttackFrame(ctx, p, "charge", stateFrame);
  },
  ink_summoner(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-1, 0, 1, 0][phase] : 0;
    legs(ctx, p, -5, 1, -2, _limbFrame);
    rect(ctx, p.ink, -7, -20 + bob, 14, 18);
    rect(ctx, p.dark, -6, -19 + bob, 12, 16);
    rect(ctx, p.base, -5, -18 + bob, 10, 14);
    eye(ctx, p, -1, -14 + bob);
    drawAttackFrame(ctx, p, "summon", stateFrame);
  },
  glyph_sniper(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-1, 0, 1, 0][phase] : 0;
    legs(ctx, p, -4, 0, -2, _limbFrame);
    rect(ctx, p.ink, -6, -16 + bob, 12, 14);
    rect(ctx, p.dark, -5, -15 + bob, 10, 12);
    rect(ctx, p.base, -4, -14 + bob, 8, 10);
    eye(ctx, p, 0, -10 + bob);
    drawAttackFrame(ctx, p, "sniper", stateFrame);
  },
  tome_lord(ctx, p, _limbFrame, state, stateFrame, bossPhase = 1) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 2, 0, -2][phase] : state === "idle" ? [0, -2][phase] : 0;
    rect(ctx, p.ink, -18, -32 + bob, 36, 32);
    rect(ctx, p.dark, -16, -30 + bob, 32, 28);
    rect(ctx, p.base, -14, -28 + bob, 28, 24);
    rect(ctx, p.light, -8, -20 + bob, 16, 8);
    eye(ctx, p, -4, -18 + bob);
    eye(ctx, p, 2, -18 + bob);
    drawAttackFrame(ctx, p, "boss", stateFrame);
  },
  forge_mech(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-1, 0, 1, 0][phase] : 0;
    legs(ctx, p, -7, 3, -2, _limbFrame);
    rect(ctx, p.ink, -9, -20 + bob, 18, 18);
    rect(ctx, p.dark, -8, -19 + bob, 16, 16);
    rect(ctx, p.base, -7, -18 + bob, 14, 14);
    eye(ctx, p, -3, -12 + bob);
    drawAttackFrame(ctx, p, "melee", stateFrame);
  },
  slag_crawler(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    rect(ctx, p.ink, -8, -10 + bob, 16, 10);
    rect(ctx, p.dark, -7, -9 + bob, 14, 8);
    rect(ctx, p.base, -6, -8 + bob, 12, 6);
    eye(ctx, p, -2, -6 + bob);
    drawAttackFrame(ctx, p, "area", stateFrame);
  },
  anvil_guard(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-1, 0, 1, 0][phase] : 0;
    legs(ctx, p, -6, 2, -2, _limbFrame);
    rect(ctx, p.ink, -9, -19 + bob, 18, 17);
    rect(ctx, p.dark, -8, -18 + bob, 16, 15);
    rect(ctx, p.base, -7, -17 + bob, 14, 13);
    eye(ctx, p, -2, -12 + bob);
    drawAttackFrame(ctx, p, "charge", stateFrame);
  },
  forge_prime(ctx, p, _limbFrame, state, stateFrame, bossPhase = 1) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 2, 0, -2][phase] : state === "idle" ? [0, -2][phase] : 0;
    rect(ctx, p.ink, -20, -34 + bob, 40, 34);
    rect(ctx, p.dark, -18, -32 + bob, 36, 30);
    rect(ctx, p.base, -16, -30 + bob, 32, 26);
    rect(ctx, p.light, -10, -20 + bob, 20, 10);
    eye(ctx, p, -5, -18 + bob);
    eye(ctx, p, 3, -18 + bob);
    drawAttackFrame(ctx, p, "boss", stateFrame);
  },
  crystal_drifter(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    rect(ctx, p.ink, -5, -12 + bob, 10, 10);
    rect(ctx, p.dark, -4, -11 + bob, 8, 8);
    rect(ctx, p.base, -3, -10 + bob, 6, 6);
    eye(ctx, p, -1, -8 + bob);
    drawAttackFrame(ctx, p, "scatter", stateFrame);
  },
  canal_warden(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-1, 0, 1, 0][phase] : 0;
    legs(ctx, p, -5, 1, -2, _limbFrame);
    rect(ctx, p.ink, -7, -16 + bob, 14, 14);
    rect(ctx, p.dark, -6, -15 + bob, 12, 12);
    rect(ctx, p.base, -5, -14 + bob, 10, 10);
    eye(ctx, p, -1, -10 + bob);
    drawAttackFrame(ctx, p, "melee", stateFrame);
  },
  cryo_lancer(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-1, 0, 1, 0][phase] : 0;
    legs(ctx, p, -4, 0, -2, _limbFrame);
    rect(ctx, p.ink, -6, -18 + bob, 12, 16);
    rect(ctx, p.dark, -5, -17 + bob, 10, 14);
    rect(ctx, p.base, -4, -16 + bob, 8, 12);
    eye(ctx, p, 0, -12 + bob);
    drawAttackFrame(ctx, p, "sniper", stateFrame);
  },
  glacier_director(ctx, p, _limbFrame, state, stateFrame, bossPhase = 1) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 2, 0, -2][phase] : state === "idle" ? [0, -2][phase] : 0;
    rect(ctx, p.ink, -18, -32 + bob, 36, 32);
    rect(ctx, p.dark, -16, -30 + bob, 32, 28);
    rect(ctx, p.base, -14, -28 + bob, 28, 24);
    rect(ctx, p.light, -8, -22 + bob, 16, 12);
    eye(ctx, p, -4, -18 + bob);
    eye(ctx, p, 2, -18 + bob);
    drawAttackFrame(ctx, p, "boss", stateFrame);
  },
  iron_sentinel(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-1, 0, 1, 0][phase] : 0;
    legs(ctx, p, -6, 2, -2, _limbFrame);
    rect(ctx, p.ink, -8, -19 + bob, 16, 17);
    rect(ctx, p.dark, -7, -18 + bob, 14, 15);
    rect(ctx, p.base, -6, -17 + bob, 12, 13);
    eye(ctx, p, -2, -12 + bob);
    drawAttackFrame(ctx, p, "melee", stateFrame);
  },
  siege_mortar(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-1, 0, 1, 0][phase] : 0;
    legs(ctx, p, -5, 1, -2, _limbFrame);
    rect(ctx, p.ink, -7, -16 + bob, 14, 14);
    rect(ctx, p.dark, -6, -15 + bob, 12, 12);
    rect(ctx, p.base, -5, -14 + bob, 10, 10);
    eye(ctx, p, -1, -10 + bob);
    drawAttackFrame(ctx, p, "lob", stateFrame);
  },
  armory_commander(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-1, 0, 1, 0][phase] : 0;
    legs(ctx, p, -5, 1, -2, _limbFrame);
    rect(ctx, p.ink, -7, -18 + bob, 14, 16);
    rect(ctx, p.dark, -6, -17 + bob, 12, 14);
    rect(ctx, p.base, -5, -16 + bob, 10, 12);
    eye(ctx, p, -1, -12 + bob);
    drawAttackFrame(ctx, p, "support", stateFrame);
  },
  war_engine(ctx, p, _limbFrame, state, stateFrame, bossPhase = 1) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 2, 0, -2][phase] : state === "idle" ? [0, -2][phase] : 0;
    rect(ctx, p.ink, -22, -34 + bob, 44, 34);
    rect(ctx, p.dark, -20, -32 + bob, 40, 30);
    rect(ctx, p.base, -18, -30 + bob, 36, 26);
    rect(ctx, p.light, -12, -22 + bob, 24, 12);
    eye(ctx, p, -6, -18 + bob);
    eye(ctx, p, 4, -18 + bob);
    drawAttackFrame(ctx, p, "boss", stateFrame);
  },
  void_moth(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    rect(ctx, p.ink, -5, -10 + bob, 10, 8);
    rect(ctx, p.dark, -4, -9 + bob, 8, 6);
    rect(ctx, p.base, -3, -8 + bob, 6, 4);
    eye(ctx, p, -1, -7 + bob);
    drawAttackFrame(ctx, p, "orbit", stateFrame);
  },
  star_caster(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-1, 0, 1, 0][phase] : 0;
    legs(ctx, p, -5, 1, -2, _limbFrame);
    rect(ctx, p.ink, -7, -20 + bob, 14, 18);
    rect(ctx, p.dark, -6, -19 + bob, 12, 16);
    rect(ctx, p.base, -5, -18 + bob, 10, 14);
    eye(ctx, p, -1, -14 + bob);
    drawAttackFrame(ctx, p, "area", stateFrame);
  },
  astral_shade(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    rect(ctx, p.ink, -6, -14 + bob, 12, 12);
    rect(ctx, p.dark, -5, -13 + bob, 10, 10);
    rect(ctx, p.base, -4, -12 + bob, 8, 8);
    eye(ctx, p, -2, -9 + bob);
    drawAttackFrame(ctx, p, "charge", stateFrame);
  },
  star_sentinel(ctx, p, _limbFrame, state, stateFrame, bossPhase = 1) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 2, 0, -2][phase] : state === "idle" ? [0, -2][phase] : 0;
    rect(ctx, p.ink, -18, -30 + bob, 36, 30);
    rect(ctx, p.dark, -16, -28 + bob, 32, 26);
    rect(ctx, p.base, -14, -26 + bob, 28, 22);
    rect(ctx, p.light, -8, -18 + bob, 16, 8);
    eye(ctx, p, -4, -16 + bob);
    eye(ctx, p, 2, -16 + bob);
    drawAttackFrame(ctx, p, "boss", stateFrame);
  },
  ashen_revenant(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-1, 0, 1, 0][phase] : 0;
    legs(ctx, p, -5, 1, -2, _limbFrame);
    rect(ctx, p.ink, -7, -16 + bob, 14, 14);
    rect(ctx, p.dark, -6, -15 + bob, 12, 12);
    rect(ctx, p.base, -5, -14 + bob, 10, 10);
    eye(ctx, p, -1, -10 + bob);
    drawAttackFrame(ctx, p, "charge", stateFrame);
  },
  ash_lobber(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-1, 0, 1, 0][phase] : 0;
    legs(ctx, p, -5, 1, -2, _limbFrame);
    rect(ctx, p.ink, -7, -16 + bob, 14, 14);
    rect(ctx, p.dark, -6, -15 + bob, 12, 12);
    rect(ctx, p.base, -5, -14 + bob, 10, 10);
    eye(ctx, p, -1, -10 + bob);
    drawAttackFrame(ctx, p, "lob", stateFrame);
  },
  bone_sovereign(ctx, p, _limbFrame, state, stateFrame, bossPhase = 1) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 2, 0, -2][phase] : state === "idle" ? [0, -2][phase] : 0;
    rect(ctx, p.ink, -18, -32 + bob, 36, 32);
    rect(ctx, p.dark, -16, -30 + bob, 32, 28);
    rect(ctx, p.base, -14, -28 + bob, 28, 24);
    rect(ctx, p.light, -8, -20 + bob, 16, 8);
    eye(ctx, p, -4, -18 + bob);
    eye(ctx, p, 2, -18 + bob);
    drawAttackFrame(ctx, p, "boss", stateFrame);
  },
  chain_specter(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    rect(ctx, p.ink, -6, -16 + bob, 12, 14);
    rect(ctx, p.dark, -5, -15 + bob, 10, 12);
    rect(ctx, p.base, -4, -14 + bob, 8, 10);
    eye(ctx, p, -2, -10 + bob);
    drawAttackFrame(ctx, p, "area", stateFrame);
  },
  prison_brute(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-1, 0, 1, 0][phase] : 0;
    legs(ctx, p, -7, 3, -2, _limbFrame);
    rect(ctx, p.ink, -9, -18 + bob, 18, 16);
    rect(ctx, p.dark, -8, -17 + bob, 16, 14);
    rect(ctx, p.base, -7, -16 + bob, 14, 12);
    eye(ctx, p, -3, -12 + bob);
    drawAttackFrame(ctx, p, "melee", stateFrame);
  },
  warden_alpha(ctx, p, _limbFrame, state, stateFrame, bossPhase = 1) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 2, 0, -2][phase] : state === "idle" ? [0, -2][phase] : 0;
    rect(ctx, p.ink, -20, -34 + bob, 40, 34);
    rect(ctx, p.dark, -18, -32 + bob, 36, 30);
    rect(ctx, p.base, -16, -30 + bob, 32, 26);
    rect(ctx, p.light, -10, -20 + bob, 20, 10);
    eye(ctx, p, -5, -18 + bob);
    eye(ctx, p, 3, -18 + bob);
    drawAttackFrame(ctx, p, "boss", stateFrame);
  },
  archive_construct(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-1, 0, 1, 0][phase] : 0;
    legs(ctx, p, -6, 2, -2, _limbFrame);
    rect(ctx, p.ink, -8, -19 + bob, 16, 17);
    rect(ctx, p.dark, -7, -18 + bob, 14, 15);
    rect(ctx, p.base, -6, -17 + bob, 12, 13);
    eye(ctx, p, -2, -12 + bob);
    drawAttackFrame(ctx, p, "melee", stateFrame);
  },
  void_cultist(ctx, p, _limbFrame, state, stateFrame) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 1, 0, -1][phase] : state === "idle" ? [0, -1][phase] : 0;
    const stride = state === "walk" ? [-1, 0, 1, 0][phase] : 0;
    legs(ctx, p, -5, 1, -2, _limbFrame);
    rect(ctx, p.ink, -7, -18 + bob, 14, 16);
    rect(ctx, p.dark, -6, -17 + bob, 12, 14);
    rect(ctx, p.base, -5, -16 + bob, 10, 12);
    eye(ctx, p, -1, -12 + bob);
    drawAttackFrame(ctx, p, "scatter", stateFrame);
  },
  echo_mind(ctx, p, _limbFrame, state, stateFrame, bossPhase = 1) {
    const phase = phaseOf(state, stateFrame);
    const bob = state === "walk" ? [0, 2, 0, -2][phase] : state === "idle" ? [0, -2][phase] : 0;
    rect(ctx, p.ink, -22, -36 + bob, 44, 36);
    rect(ctx, p.dark, -20, -34 + bob, 40, 32);
    rect(ctx, p.base, -18, -32 + bob, 36, 28);
    rect(ctx, p.light, -10, -22 + bob, 20, 12);
    eye(ctx, p, -5, -20 + bob);
    eye(ctx, p, 3, -20 + bob);
    drawAttackFrame(ctx, p, "boss", stateFrame);
  },
};

export const MONSTER_MODEL_IDS = Object.freeze(Object.keys(models));

export function hasMonsterModel(enemyId: string): boolean {
  return enemyId in models;
}

function drawAttackFrame(
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  behavior: EnemyBehavior,
  frame: number,
): void {
  if (frame === 0) return;
  const pulse = frame === 2 ? 2 : 1;
  if (behavior === "melee" || behavior === "charge") {
    rect(ctx, palette.accent, 10 + pulse * 2, -9, 3, 3);
    rect(ctx, palette.light, 14 + pulse * 2, -7, 3, 2);
  } else if (behavior === "shoot" || behavior === "scatter") {
    rect(ctx, "#FFF3B0", 13 + pulse * 2, -11, 3, 3);
    if (frame >= 2) rect(ctx, palette.accent, 17 + pulse * 2, -10, 3, 2);
  } else if (behavior === "summon" || behavior === "area") {
    rect(ctx, palette.accent, -10, -18 - pulse, 3, 3);
    rect(ctx, palette.light, 8, -20 + pulse, 3, 3);
  } else if (behavior === "boss") {
    rect(ctx, palette.accent, -15 - pulse, -10, 3, 3);
    rect(ctx, palette.accent, 13 + pulse, -10, 3, 3);
  }
}

function drawBossPhaseFrame(ctx: CanvasRenderingContext2D, palette: Palette, phase: 1 | 2 | 3, frame: number): void {
  if (phase >= 2) {
    rect(ctx, palette.accent, -12, -23, 3, 3);
    rect(ctx, palette.accent, 9, -23, 3, 3);
  }
  if (phase >= 3) {
    const offset = frame & 1;
    rect(ctx, "#FFFFFF", -2, -27 - offset, 4, 3);
    rect(ctx, palette.light, -16, -4 + offset, 3, 3);
    rect(ctx, palette.light, 13, -4 - offset, 3, 3);
  }
}

function drawModelWithPose(
  ctx: CanvasRenderingContext2D,
  enemyId: string,
  model: ModelDraw,
  palette: Palette,
  state: EnemyAnimationState,
  frame: number,
  facing: EnemyFacing,
  scale: number,
  behavior: EnemyBehavior,
  bossPhase?: 1 | 2 | 3,
  nativePixelArt = false,
): void {
  const pose = nativePixelArt && state !== "hurt"
    ? { x: 0, y: 0, limbFrame: frame }
    : getMonsterAnimationPose(state, frame);
  ctx.save();
  ctx.scale(facing === "left" ? -scale : scale, scale);
  ctx.translate(pose.x, nativePixelArt ? pose.y : pose.y - 1);
  model(ctx, palette, pose.limbFrame, state, frame, bossPhase);
  if (nativePixelArt) drawAuthoredMonsterDetail(ctx, enemyId, state, frame, bossPhase);
  if (!nativePixelArt && state === "attack") drawAttackFrame(ctx, palette, behavior, frame);
  if (!nativePixelArt && bossPhase) drawBossPhaseFrame(ctx, palette, bossPhase, frame);
  ctx.restore();
}

export class MonsterModelRenderer {
  static draw(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number, reducedFlashing: boolean, scale: number): void {
    const model = models[enemy.enemyId] ?? models.moss_brute;
    const nativePixelArt = usesNativeMonsterArt(enemy.enemyId);
    const hitFlash = enemy.hitFlash > 0 && !reducedFlashing;
    const base = hitFlash ? "#FFFFFF" : enemy.displayColor;
    const palette: Palette = {
      base,
      light: hitFlash ? "#FFFFFF" : adjustHex(enemy.displayColor, 55),
      dark: hitFlash ? "#FFFFFF" : adjustHex(enemy.displayColor, -55),
      ink: hitFlash ? "#FFFFFF" : enemy.isElite ? "#6B4E00" : enemy.type === "boss" ? "#26070D" : "#130B18",
      white: "#FFFFFF",
      accent: hitFlash ? "#FFFFFF" : adjustHex(enemy.displayColor, 90),
    };
    drawModelWithPose(
      ctx,
      enemy.enemyId,
      model,
      palette,
      enemy.animState,
      enemy.animFrame,
      enemy.facing,
      scale,
      enemy.behavior,
      enemy.type === "boss" ? enemy.bossPhase : undefined,
      nativePixelArt,
    );
  }

  static drawPreview(
    ctx: CanvasRenderingContext2D,
    enemyId: string,
    color: string,
    role: "melee" | "ranged" | "boss",
    time: number,
    scale = 2,
  ): void {
    const model = models[enemyId] ?? models.moss_brute;
    const definition = getEnemyDefinition(enemyId);
    const nativePixelArt = usesNativeMonsterArt(enemyId);
    const palette: Palette = {
      base: color,
      light: adjustHex(color, 55),
      dark: adjustHex(color, -55),
      ink: role === "boss" ? "#26070D" : "#130B18",
      white: "#FFFFFF",
      accent: adjustHex(color, 90),
    };
    const previewStates: EnemyAnimationState[] = ["idle", "walk", "attack"];
    const state = previewStates[Math.floor(time / 1.6) % previewStates.length];
    const rate = state === "walk" ? 10 : state === "attack" ? 8 : 2.5;
    const frame = Math.floor(time * rate) % MONSTER_ANIMATION_FRAMES[state];
    const facing: EnemyFacing = Math.floor(time / 4.8) % 2 === 0 ? "right" : "left";
    drawModelWithPose(
      ctx,
      enemyId,
      model,
      palette,
      state,
      frame,
      facing,
      nativePixelArt ? (role === "boss" ? 0.78 : 1) : scale,
      definition.behavior,
      role === "boss" ? ((Math.floor(time / 3.2) % 3) + 1) as 1 | 2 | 3 : undefined,
      nativePixelArt,
    );
  }
}
