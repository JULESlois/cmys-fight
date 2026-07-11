import type { Enemy } from "../entities/Enemy";

interface Palette {
  base: string;
  light: string;
  dark: string;
  ink: string;
  white: string;
  accent: string;
}

type ModelDraw = (ctx: CanvasRenderingContext2D, palette: Palette, frame: number) => void;

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

const models: Record<string, ModelDraw> = {
  moss_brute(ctx, p, frame) {
    outlined(ctx, p, -6, -9, 12, 11);
    outlined(ctx, p, -5, -15, 10, 7, p.light);
    rect(ctx, p.dark, -8, -11, 3, 10); rect(ctx, p.dark, 5, -11, 3, 10);
    rect(ctx, "#5D4037", -6, -18, 3, 5); rect(ctx, "#5D4037", 3, -18, 3, 5);
    rect(ctx, "#8BC34A", -7, -16, 3, 2); rect(ctx, "#8BC34A", 4, -14, 4, 2);
    eye(ctx, p, -3, -13); eye(ctx, p, 1, -13);
    legs(ctx, p, -4, 2, 1, frame);
  },
  thorn_archer(ctx, p, frame) {
    outlined(ctx, p, -4, -10, 8, 11, p.dark);
    outlined(ctx, p, -5, -16, 10, 7);
    rect(ctx, p.ink, -3, -14, 6, 3); eye(ctx, p, -2, -14);
    rect(ctx, "#795548", 6, -12, 2, 14); rect(ctx, p.light, 7, -11, 3, 2); rect(ctx, p.light, 7, 0, 3, 2);
    rect(ctx, "#8BC34A", -7, -8, 3, 6); rect(ctx, "#8BC34A", 4, -7, 3, 5);
    legs(ctx, p, -3, 1, 1, frame);
  },
  boar_charger(ctx, p, frame) {
    outlined(ctx, p, -9, -8, 15, 9);
    outlined(ctx, p, 4, -10, 8, 7, p.light);
    rect(ctx, p.dark, -8, -12, 4, 4); rect(ctx, p.dark, -2, -13, 4, 5);
    rect(ctx, "#F5E6C8", 10, -5, 4, 2); rect(ctx, "#F5E6C8", 9, -2, 3, 2);
    eye(ctx, p, 7, -8);
    legs(ctx, p, -6, 3, 0, frame); rect(ctx, p.ink, -12, -8, 4, 2);
  },
  dingdong_fowl(ctx, p, frame) {
    outlined(ctx, p, -5, -9, 10, 10, "#F4F1DE");
    outlined(ctx, p, -4, -16, 9, 8, "#FFF8E1");
    rect(ctx, "#E53935", -2, -20, 2, 4); rect(ctx, "#E53935", 1, -19, 2, 3); rect(ctx, "#E53935", 4, -18, 2, 2);
    rect(ctx, "#F9A825", 5, -13, 5, 3); eye(ctx, p, 1, -14);
    rect(ctx, "#D98C10", -9, -9, 4, 7); rect(ctx, "#D98C10", 5, -8, 4, 6);
    rect(ctx, "#F1C40F", -2, -7, 4, 4); rect(ctx, p.ink, -1, -6, 2, 2);
    rect(ctx, "#F9A825", -4, 1, 2, 3 + frame); rect(ctx, "#F9A825", 2, 1, 2, 4 - frame);
  },
  spore_mimic(ctx, p, frame) {
    outlined(ctx, p, -5, -8, 10, 9, "#E8E1C5");
    outlined(ctx, p, -10, -17, 20, 8, p.base);
    rect(ctx, p.light, -7, -19, 5, 3); rect(ctx, p.light, 2, -18, 4, 3);
    rect(ctx, p.ink, -6, -7, 12, 5); rect(ctx, "#FFF8E1", -4, -6, 2, 2); rect(ctx, "#FFF8E1", 2, -6, 2, 2);
    rect(ctx, "#C62828", -3, -3, 6, 2); eye(ctx, p, -3, -11); eye(ctx, p, 1, -11);
    rect(ctx, p.dark, -7, 0, 4, 2 + frame); rect(ctx, p.dark, 3, 0, 4, 3 - frame);
  },
  forest_guardian(ctx, p, frame) {
    outlined(ctx, p, -8, -12, 16, 16, "#6D4C41");
    outlined(ctx, p, -7, -20, 14, 9, p.base);
    rect(ctx, "#4E342E", -13, -18, 6, 3); rect(ctx, "#4E342E", 7, -18, 6, 3);
    rect(ctx, "#4E342E", -12, -23, 3, 7); rect(ctx, "#4E342E", 9, -23, 3, 7);
    rect(ctx, "#7CB342", -14, -24, 5, 3); rect(ctx, "#7CB342", 8, -25, 6, 3);
    eye(ctx, p, -4, -17); eye(ctx, p, 2, -17); rect(ctx, "#A5D6A7", -3, -10, 6, 2);
    rect(ctx, "#5D4037", -12, -10, 5, 13); rect(ctx, "#5D4037", 7, -10, 5, 13);
    legs(ctx, p, -6, 4, 4, frame);
  },
  broadcast_rooster(ctx, p, frame) {
    outlined(ctx, p, -8, -11, 16, 14, "#FFF8E1");
    outlined(ctx, p, -7, -21, 15, 11, "#F4F1DE");
    rect(ctx, "#D32F2F", -4, -27, 3, 7); rect(ctx, "#D32F2F", 0, -26, 3, 6); rect(ctx, "#D32F2F", 4, -24, 3, 4);
    rect(ctx, "#F9A825", 8, -17, 9, 5); eye(ctx, p, 2, -18);
    rect(ctx, p.ink, -15, -13, 8, 8); rect(ctx, "#F1C40F", -14, -12, 5, 6); rect(ctx, p.ink, -12, -10, 4, 2);
    rect(ctx, "#D98C10", 8, -10, 6, 10); rect(ctx, "#D98C10", -12, -8, 5, 8);
    rect(ctx, "#F1C40F", -3, -8, 6, 5); rect(ctx, p.ink, -1, -6, 2, 2);
    legs(ctx, p, -5, 3, 3, frame);
  },

  bone_guard(ctx, p, frame) {
    outlined(ctx, p, -5, -16, 10, 8, "#ECEFF1");
    rect(ctx, p.ink, -3, -13, 2, 2); rect(ctx, p.ink, 2, -13, 2, 2); rect(ctx, p.ink, -1, -10, 3, 2);
    rect(ctx, "#ECEFF1", -2, -8, 4, 9); rect(ctx, "#ECEFF1", -6, -6, 12, 2); rect(ctx, "#ECEFF1", -5, -2, 10, 2);
    outlined(ctx, p, -11, -8, 6, 11, "#546E7A"); rect(ctx, p.light, -9, -6, 2, 7);
    rect(ctx, "#CFD8DC", 5, -8, 2, 12); legs(ctx, p, -4, 2, 1, frame);
  },
  bolt_cultist(ctx, p, frame) {
    outlined(ctx, p, -6, -10, 12, 12, p.dark); outlined(ctx, p, -7, -18, 14, 9, p.base);
    rect(ctx, p.ink, -4, -15, 8, 4); eye(ctx, p, -2, -14); eye(ctx, p, 1, -14);
    rect(ctx, p.light, -8, -5, 4, 8); rect(ctx, p.light, 4, -5, 4, 8);
    rect(ctx, "#FFD54F", 8, -12, 2, 14); rect(ctx, "#CE93D8", 6, -14, 6, 3);
    legs(ctx, p, -4, 2, 1, frame);
  },
  grave_summoner(ctx, p, frame) {
    outlined(ctx, p, -7, -12, 14, 15, p.dark); outlined(ctx, p, -6, -21, 12, 10, p.base);
    rect(ctx, p.ink, -3, -17, 6, 4); eye(ctx, p, -2, -17); eye(ctx, p, 1, -17);
    rect(ctx, "#8D6E63", 9, -18, 2, 21); outlined(ctx, p, 6, -22, 8, 7, "#ECEFF1");
    rect(ctx, p.ink, 8, -20, 2, 2); rect(ctx, p.ink, 11, -20, 2, 2);
    rect(ctx, p.light, -10, -7, 4, 7); rect(ctx, p.light, 6, -7, 4, 7);
    legs(ctx, p, -4, 2, 2, frame);
  },
  bark_hound(ctx, p, frame) {
    outlined(ctx, p, -9, -8, 14, 9); outlined(ctx, p, 3, -12, 10, 8, p.light);
    rect(ctx, p.dark, 3, -17, 4, 7); rect(ctx, p.dark, 9, -16, 4, 6); eye(ctx, p, 7, -10);
    rect(ctx, p.ink, 12, -7, 5, 3); rect(ctx, "#E57373", 14, -4, 3, 2);
    rect(ctx, "#FFC107", -1, -5, 7, 2); rect(ctx, p.ink, 1, -4, 2, 2);
    rect(ctx, p.dark, -12, -9, 5, 2); legs(ctx, p, -6, 2, 0, frame);
    rect(ctx, p.light, 18, -10, 3, 2); rect(ctx, p.light, 21, -13, 2, 2);
  },
  chain_jailer(ctx, p, frame) {
    outlined(ctx, p, -7, -11, 14, 14, "#455A64"); outlined(ctx, p, -6, -19, 12, 9, p.base);
    rect(ctx, p.ink, -4, -16, 8, 3); eye(ctx, p, -2, -16); eye(ctx, p, 1, -16);
    rect(ctx, p.light, -10, -8, 4, 11); rect(ctx, p.light, 6, -8, 4, 11);
    for (let i = 0; i < 5; i++) { rect(ctx, p.ink, 9 + i * 3, -8 + i * 2, 3, 3); rect(ctx, "#B0BEC5", 10 + i * 3, -7 + i * 2, 1, 1); }
    legs(ctx, p, -4, 2, 3, frame);
  },
  crypt_overseer(ctx, p, frame) {
    outlined(ctx, p, -9, -13, 18, 17, p.dark); outlined(ctx, p, -8, -23, 16, 11, "#ECEFF1");
    rect(ctx, p.ink, -5, -19, 4, 4); rect(ctx, p.ink, 2, -19, 4, 4); rect(ctx, p.ink, -2, -14, 5, 3);
    rect(ctx, "#7E57C2", -10, -26, 5, 5); rect(ctx, "#AB47BC", -2, -29, 4, 7); rect(ctx, "#7E57C2", 5, -26, 5, 5);
    rect(ctx, "#B39DDB", -13, -10, 5, 13); rect(ctx, "#B39DDB", 8, -10, 5, 13);
    rect(ctx, "#8D6E63", 13, -18, 2, 22); outlined(ctx, p, 10, -23, 8, 7, "#CFD8DC");
    legs(ctx, p, -5, 3, 4, frame);
  },
  kennel_warden(ctx, p, frame) {
    outlined(ctx, p, -12, -10, 18, 12, "#5D4037"); outlined(ctx, p, 4, -16, 13, 11, p.base);
    rect(ctx, p.dark, 4, -23, 5, 9); rect(ctx, p.dark, 12, -22, 5, 8); eye(ctx, p, 9, -13);
    rect(ctx, p.ink, 15, -9, 7, 4); rect(ctx, "#EF5350", 18, -5, 4, 2);
    rect(ctx, "#F1C40F", -2, -7, 10, 3); rect(ctx, p.ink, 1, -6, 3, 3);
    rect(ctx, "#546E7A", -11, -14, 11, 5); rect(ctx, "#78909C", -8, -13, 6, 3);
    rect(ctx, p.dark, -16, -11, 5, 3); legs(ctx, p, -8, 1, 1, frame);
  },

  frost_hound(ctx, p, frame) {
    outlined(ctx, p, -9, -8, 14, 9, "#B3E5FC"); outlined(ctx, p, 3, -13, 10, 9, p.base);
    rect(ctx, p.light, 3, -19, 4, 8); rect(ctx, p.light, 9, -18, 4, 7); eye(ctx, p, 7, -11);
    rect(ctx, "#E1F5FE", 12, -8, 6, 3); rect(ctx, p.dark, -13, -11, 6, 3);
    rect(ctx, "#80DEEA", -7, -12, 3, 4); rect(ctx, "#80DEEA", -2, -13, 3, 4);
    legs(ctx, p, -6, 2, 0, frame);
  },
  ice_shaman(ctx, p, frame) {
    outlined(ctx, p, -6, -10, 12, 13, "#E1F5FE"); outlined(ctx, p, -7, -19, 14, 10, p.base);
    rect(ctx, "#ECEFF1", -8, -20, 16, 4); rect(ctx, p.ink, -4, -16, 8, 4); eye(ctx, p, -2, -15); eye(ctx, p, 1, -15);
    rect(ctx, "#795548", 9, -17, 2, 20); rect(ctx, "#80DEEA", 7, -22, 6, 6); rect(ctx, "#E1F5FE", 9, -24, 2, 3);
    rect(ctx, p.light, -10, -6, 4, 7); legs(ctx, p, -4, 2, 2, frame);
  },
  snow_turret(ctx, p, frame) {
    outlined(ctx, p, -9, -5, 18, 8, "#78909C"); outlined(ctx, p, -7, -13, 14, 9, p.base);
    rect(ctx, "#E1F5FE", -5, -17, 10, 4); rect(ctx, p.dark, -3, -11, 6, 5);
    rect(ctx, "#B3E5FC", 6, -11, 11 + frame, 3); rect(ctx, p.ink, 15 + frame, -12, 3, 5);
    rect(ctx, p.light, -12, 3, 24, 3); rect(ctx, p.ink, -9, 6, 5, 2); rect(ctx, p.ink, 4, 6, 5, 2);
  },
  white_sampler(ctx, p, frame) {
    outlined(ctx, p, -6, -11, 12, 14, "#F5F5F5"); outlined(ctx, p, -7, -20, 14, 10, "#FFFFFF");
    rect(ctx, "#90CAF9", -5, -17, 10, 5); rect(ctx, "#263238", -3, -15, 6, 2);
    rect(ctx, "#1E88E5", -7, -11, 14, 2); rect(ctx, "#1E88E5", -1, -9, 2, 12);
    rect(ctx, "#ECEFF1", -10, -7, 4, 9); rect(ctx, "#ECEFF1", 6, -7, 4, 9);
    rect(ctx, "#CFD8DC", 10, -14, 2, 18); rect(ctx, "#FFFFFF", 9, 3, 6, 2);
    rect(ctx, "#26A69A", -5, 3, 4, 3 + frame); rect(ctx, "#26A69A", 2, 3, 4, 4 - frame);
  },
  mirror_wisp(ctx, p, frame) {
    rect(ctx, p.ink, -1, -20, 3, 3); rect(ctx, p.ink, -5, -16, 11, 11); rect(ctx, p.base, -3, -14, 7, 7);
    rect(ctx, p.light, -1, -12, 3, 3); rect(ctx, "#FFFFFF", 0, -11, 1, 1);
    rect(ctx, p.dark, -7, -8, 4, 5); rect(ctx, p.dark, 4, -8, 4, 5);
    rect(ctx, p.light, -10, -2 - frame, 3, 3); rect(ctx, p.light, 8, 0 + frame, 3, 3); rect(ctx, p.light, -2, 3, 3, 3);
  },
  frost_titan(ctx, p, frame) {
    outlined(ctx, p, -10, -13, 20, 17, "#4FC3F7"); outlined(ctx, p, -8, -23, 16, 11, p.base);
    rect(ctx, "#E1F5FE", -11, -26, 5, 6); rect(ctx, "#E1F5FE", 6, -26, 5, 6);
    eye(ctx, p, -4, -19); eye(ctx, p, 3, -19); rect(ctx, p.dark, -3, -14, 7, 3);
    outlined(ctx, p, -15, -11, 6, 14, "#81D4FA"); outlined(ctx, p, 9, -11, 6, 14, "#81D4FA");
    rect(ctx, "#B3E5FC", -7, -7, 14, 5); legs(ctx, p, -6, 4, 4, frame);
  },
  white_director(ctx, p, frame) {
    outlined(ctx, p, -9, -13, 18, 17, "#FAFAFA"); outlined(ctx, p, -9, -24, 18, 12, "#FFFFFF");
    rect(ctx, "#90CAF9", -7, -21, 14, 6); rect(ctx, "#263238", -5, -18, 10, 2);
    rect(ctx, "#1565C0", -9, -13, 18, 2); rect(ctx, "#1565C0", -1, -11, 2, 15);
    outlined(ctx, p, 10, -17, 10, 8, "#E0E0E0"); rect(ctx, "#EF5350", 13, -14, 5, 2); rect(ctx, p.ink, 12, -10, 2, 8);
    rect(ctx, "#CFD8DC", -14, -8, 5, 11); rect(ctx, "#CFD8DC", 9, -7, 5, 10);
    rect(ctx, "#26A69A", -7, 4, 6, 3 + frame); rect(ctx, "#26A69A", 2, 4, 6, 4 - frame);
  },

  ember_knight(ctx, p, frame) {
    outlined(ctx, p, -6, -11, 12, 14, "#5D4037"); outlined(ctx, p, -6, -20, 12, 10, p.base);
    rect(ctx, p.ink, -4, -16, 8, 3); eye(ctx, p, -2, -16); eye(ctx, p, 1, -16);
    outlined(ctx, p, -11, -9, 5, 11, "#BF360C"); rect(ctx, "#FFB300", -9, -6, 2, 5);
    rect(ctx, "#FFE082", 7, -15, 2, 17); rect(ctx, "#FF6F00", 9, -13, 4, 7); rect(ctx, "#FFCA28", 10, -16, 2, 4);
    legs(ctx, p, -4, 2, 3, frame);
  },
  magma_spitter(ctx, p, frame) {
    outlined(ctx, p, -9, -8, 14, 9, "#BF360C"); outlined(ctx, p, 3, -11, 10, 7, p.base);
    eye(ctx, p, 7, -9); rect(ctx, p.ink, 11, -6, 7, 4); rect(ctx, "#FFEB3B", 15, -5, 4 + frame, 2);
    rect(ctx, "#FF9800", -7, -11, 4, 4); rect(ctx, "#FF9800", -1, -12, 4, 4);
    rect(ctx, p.dark, -13, -9, 5, 3); legs(ctx, p, -6, 2, 0, frame);
  },
  cinder_oracle(ctx, p, frame) {
    outlined(ctx, p, -7, -11, 14, 14, "#4E342E"); outlined(ctx, p, -6, -20, 12, 10, p.base);
    rect(ctx, p.ink, -4, -16, 8, 4); eye(ctx, p, -2, -16); eye(ctx, p, 1, -16);
    rect(ctx, "#FFB300", -8, -24, 4, 7); rect(ctx, "#FF5722", -2, -27, 4, 9); rect(ctx, "#FFB300", 4, -23, 4, 6);
    rect(ctx, "#795548", 9, -17, 2, 20); rect(ctx, "#FF6F00", 7, -22, 6, 6);
    rect(ctx, p.light, -10, -6, 4, 7); legs(ctx, p, -4, 2, 2, frame);
  },
  code_horse(ctx, p, frame) {
    outlined(ctx, p, -11, -8, 17, 10, "#8D6E63"); outlined(ctx, p, 4, -15, 10, 10, p.base);
    rect(ctx, p.dark, 4, -21, 4, 8); rect(ctx, p.dark, 10, -20, 4, 7); eye(ctx, p, 8, -12);
    rect(ctx, p.ink, 12, -8, 8, 4); rect(ctx, "#F5E6C8", 18, -7, 3, 2);
    rect(ctx, "#2ECC71", -5, -7, 8, 7); rect(ctx, p.ink, -4, -6, 2, 2); rect(ctx, p.ink, -1, -3, 2, 2); rect(ctx, p.ink, 1, -6, 1, 1);
    rect(ctx, p.dark, -15, -10, 5, 3); legs(ctx, p, -7, 1, 1, frame);
  },
  furnace_beetle(ctx, p, frame) {
    outlined(ctx, p, -9, -10, 18, 12, "#5D4037"); rect(ctx, p.dark, -1, -9, 2, 11);
    outlined(ctx, p, -6, -15, 12, 6, p.base); rect(ctx, "#FF9800", -3, -13, 6, 3);
    rect(ctx, p.ink, -13, -8, 4, 2); rect(ctx, p.ink, 9, -8, 4, 2); rect(ctx, p.ink, -13, -2, 4, 2); rect(ctx, p.ink, 9, -2, 4, 2);
    rect(ctx, "#FF5722", -5, 2, 3, 2 + frame); rect(ctx, "#FFB300", 2, 2, 3, 3 - frame);
  },
  inferno_core(ctx, p, frame) {
    rect(ctx, p.ink, -4, -25, 8, 6); rect(ctx, p.ink, -11, -19, 22, 22); rect(ctx, "#6D1B0C", -9, -17, 18, 18);
    rect(ctx, p.base, -6, -14, 12, 12); rect(ctx, "#FFCA28", -3, -11, 6, 6); rect(ctx, "#FFF3E0", -1, -9, 2, 2);
    rect(ctx, "#FF5722", -15, -12, 5, 4); rect(ctx, "#FF5722", 10, -12, 5, 4); rect(ctx, "#FF9800", -11, 3, 5, 4); rect(ctx, "#FF9800", 6, 3, 5, 4);
    rect(ctx, p.light, -16, -4 - frame, 3, 3); rect(ctx, p.light, 14, -1 + frame, 3, 3);
  },
  vat_horse_prime(ctx, p, frame) {
    outlined(ctx, p, -14, -11, 22, 13, "#6D4C41"); outlined(ctx, p, 6, -20, 14, 14, p.base);
    rect(ctx, p.dark, 7, -28, 5, 10); rect(ctx, p.dark, 15, -27, 5, 9); eye(ctx, p, 12, -17);
    rect(ctx, p.ink, 18, -12, 9, 5); rect(ctx, "#F5E6C8", 25, -11, 3, 2);
    outlined(ctx, p, -11, -21, 16, 10, "#455A64"); rect(ctx, "#2ECC71", -8, -18, 10, 5); rect(ctx, p.ink, -6, -17, 2, 2); rect(ctx, p.ink, -1, -14, 2, 2);
    rect(ctx, "#90A4AE", -15, -18, 4, 12); rect(ctx, "#FF7043", -18, -16, 4, 5);
    legs(ctx, p, -9, 1, 2, frame); rect(ctx, p.dark, -19, -12, 6, 3);
  },
};

export const MONSTER_MODEL_IDS = Object.freeze(Object.keys(models));

export function hasMonsterModel(enemyId: string): boolean {
  return enemyId in models;
}

export class MonsterModelRenderer {
  static draw(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number, reducedFlashing: boolean, scale: number): void {
    const model = models[enemy.enemyId] ?? models.moss_brute;
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
    const frame = Math.floor(time * 7 + enemy.id * 0.37) & 1;
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(0, -1);
    model(ctx, palette, frame);
    ctx.restore();
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
    const palette: Palette = {
      base: color,
      light: adjustHex(color, 55),
      dark: adjustHex(color, -55),
      ink: role === "boss" ? "#26070D" : "#130B18",
      white: "#FFFFFF",
      accent: adjustHex(color, 90),
    };
    const frame = Math.floor(time * 7) & 1;
    ctx.save();
    ctx.scale(scale, scale);
    model(ctx, palette, frame);
    ctx.restore();
  }
}
