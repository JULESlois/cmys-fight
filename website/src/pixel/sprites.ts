// ============================================================
// 程序化像素精灵 —— 用字符网格描述像素画,Canvas 上逐格绘制
//   O=描边  H=头发/头盔  S=皮肤  B=主体色  A=点缀色  W=武器/道具  E=眼睛
// ============================================================

export interface SpriteColors {
  outline: string;
  hair: string;
  skin: string;
  body: string;
  accent: string;
  weapon: string;
  eye: string;
}

export type Grid = readonly string[];

export const SPRITE_GRIDS: Record<string, Grid> = {
  // 骑士:带羽饰头盔 + 厚重铠甲
  armor: [
    ".....AA.....",
    "....OAAO....",
    "..OHHHHHHO..",
    ".OHHHHHHHHO.",
    ".OHSSSSSSHO.",
    ".OSSESSESSO.",
    "..OSSSSSSO..",
    "..OBBBBBBO..",
    ".OAOBBBBOAO.",
    ".OWOBAABOWO.",
    "..OBBBBBBO..",
    "..OBBOOBBO..",
    "..OBO..OBO..",
    "..OO....OO..",
  ],
  // 法师:尖顶法帽 + 长袍
  robe: [
    ".....HH.....",
    "....OHHO....",
    "...OHHHHO...",
    ".OOHHHHHHOO.",
    "..OSSSSSSO..",
    "..OSESSESO..",
    "..OSSSSSSO..",
    "..OBBBBBBO..",
    ".OWOBBBBOWO.",
    ".OWOBAABOWO.",
    "..OBBBBBBO..",
    "..OBBBBBBO..",
    ".OBBBBBBBBO.",
    ".OOOOOOOOOO.",
  ],
  // 游荡者:兜帽 + 轻甲
  hood: [
    "............",
    "...OOOOOO...",
    "..OHHHHHHO..",
    ".OHHHHHHHHO.",
    ".OHOSSSSOHO.",
    ".OHOSESEOHO.",
    ".OHOSSSSOHO.",
    "..OBBBBBBO..",
    ".OSOBBBBOSO.",
    ".OWOBAABOWO.",
    "..OBBBBBBO..",
    "..OBBOOBBO..",
    "..OBO..OBO..",
    "..OO....OO..",
  ],
  // 双马尾少女(米雪儿 / 香奈美)
  girl: [
    "...OOOOOO...",
    "..OHHHHHHO..",
    ".OHHHHHHHHO.",
    "OHHOSSSSOHHO",
    "OHHOSESEOHHO",
    "OHHOSSSSOHHO",
    ".OHOSSSSOHO.",
    "..OBBBBBBO..",
    ".OSOBBBBOSO.",
    ".OWOBAABOWO.",
    "..OBBBBBBO..",
    "..OABOOBAO..",
    "..OBO..OBO..",
    "..OO....OO..",
  ],
  // 米雪儿:双马尾 + Inspector 步枪
  girl_rifle: [
    "...OOOOOO...",
    "..OHHHHHHO..",
    ".OHHHHHHHHO.",
    "OHHOSSSSOHHO",
    "OHHOSESEOHHO",
    "OHHOSSSSOHHO",
    ".OHOSSSSOHO.",
    "..OBBBBBBO..",
    ".OSOBBBBOWWW",
    ".OWOBAABOWO.",
    "..OBBBBBBO..",
    "..OABOOBAO..",
    "..OBO..OBO..",
    "..OO....OO..",
  ],
  // 香奈美:双马尾 + 手持麦克风,头旁飘音符
  girl_mic: [
    "...OOOOOO.A.",
    "..OHHHHHHOA.",
    ".OHHHHHHHHO.",
    "OHHOSSSSOHHO",
    "OHHOSESEOHHO",
    "OHHOSSSSOHHO",
    ".OHOSSSSOHO.",
    "..OBBBBBBO..",
    ".OSOBBBBOSW.",
    ".OWOBAABOWW.",
    "..OBBBBBBO..",
    "..OABOOBAO..",
    "..OBO..OBO..",
    "..OO....OO..",
  ],
  // 星芒守护(星绘):头顶小星星
  star: [
    ".....A......",
    "....AAA.....",
    "..OHHHHHHO..",
    ".OHHHHHHHHO.",
    "OHHOSSSSOHHO",
    "OHHOSESEOHHO",
    ".OHOSSSSOHO.",
    "..OBBBBBBO..",
    ".OSOBBBBOSO.",
    ".OAOBAABOAO.",
    "..OBBBBBBO..",
    "..OABOOBAO..",
    "..OBO..OBO..",
    "..OO....OO..",
  ],
  // 鉴定师(Esper Zero):立发 + 佩刃
  blade: [
    "..O..OO..O..",
    "..OHHHHHHO..",
    ".OHHHHHHHHO.",
    ".OHSSSSSSHO.",
    ".OSSESSESSO.",
    "..OSSSSSSO..",
    "..OBBBBBBO..",
    ".OSOBBBBOSW.",
    ".OSOBAABOWW.",
    "..OBBBBBBOW.",
    "..OBBBBBBO..",
    "..OBBOOBBO..",
    "..OBO..OBO..",
    "..OO....OO..",
  ],
  // 重拳手(娜娜莉):双侧机械拳套
  fist: [
    "...OOOOOO...",
    "..OHHHHHHO..",
    ".OHHHHHHHHO.",
    ".OHOSSSSOHO.",
    ".OHOSESEOHO.",
    ".OHOSSSSOHO.",
    "..OBBBBBBO..",
    "OWWOBBBBOWWO",
    "OWWOBAABOWWO",
    "OWWOBBBBOWWO",
    "..OBBBBBBO..",
    "..OBBOOBBO..",
    "..OBO..OBO..",
    "..OO....OO..",
  ],
};

// 史莱姆(首页动画里的小怪)
export const SLIME_GRID: Grid = [
  "....OOOO....",
  "..OOBBBBOO..",
  ".OBBABBABBO.",
  ".OBEBBBBEBO.",
  "OBBBBBBBBBBO",
  "OBABBBBBBABO",
  "OBBBBBBBBBBO",
  ".OOOOOOOOOO.",
];

// 小星星 / 碎片(拾取物与粒子)
export const STAR_GRID: Grid = ["..A..", ".AAA.", "AAAAA", ".AAA.", "..A.."];

export const HEART_GRID: Grid = [
  ".BB.BB.",
  "BBBBBBB",
  "BBBBBBB",
  ".BBBBB.",
  "..BBB..",
  "...B...",
];

// 特色板块的小图标(10×10 左右)
export const ICON_GRIDS: Record<string, Grid> = {
  sword: [
    ".......AA.",
    "......ABB.",
    ".....ABB..",
    "....ABB...",
    "...ABB....",
    "W..BB.....",
    ".WWB......",
    "..WW......",
    ".W..W.....",
    "W....W....",
  ],
  map: [
    "OOOOOOOOOO",
    "OBBAABBBBO",
    "OBBBBAABBO",
    "OABBWBBBAO",
    "OBBWWWBBBO",
    "OBBBWBBBBO",
    "OBABBBBABO",
    "OBBBAABBBO",
    "OOOOOOOOOO",
  ],
  pad: [
    "..OOOOOO..",
    ".OBBBBBBO.",
    "OBWBBBBABO",
    "OWWWBBAOAO",
    "OBWBBBBABO",
    ".OBBBBBBO.",
    ".OBO..OBO.",
    ".OO....OO.",
  ],
  disk: [
    "OOOOOOOOO.",
    "OBBWWWBBO.",
    "OBBWWWBBOO",
    "OBBBBBBBBO",
    "OBBAAAABBO",
    "OBBAWWABBO",
    "OBBAWWABBO",
    "OOOOOOOOOO",
  ],
  hub: [
    "....AA....",
    "...ABBA...",
    "..ABBBBA..",
    ".ABBBBBBA.",
    "OOOOOOOOOO",
    ".OBWBBWBO.",
    ".OBWBBWBO.",
    ".OBBOOBBO.",
    ".OBBOOBBO.",
    ".OOOOOOOO.",
  ],
  music: [
    "....BBBBB.",
    "....B...B.",
    "....B...B.",
    "....B...B.",
    "....B...B.",
    ".AA.B.AA.B",
    "AAABBAAABB",
    "AAAB.AAAB.",
    ".AA...AA..",
  ],
};

/** 把 hex 颜色调暗,生成描边色 */
export function darken(hex: string, amount = 0.55): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.floor(((n >> 16) & 255) * amount);
  const g = Math.floor(((n >> 8) & 255) * amount);
  const b = Math.floor((n & 255) * amount);
  return `rgb(${r},${g},${b})`;
}

export function lighten(hex: string, amount = 0.45): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.floor(((n >> 16) & 255) + 255 * amount));
  const g = Math.min(255, Math.floor(((n >> 8) & 255) + 255 * amount));
  const b = Math.min(255, Math.floor((n & 255) + 255 * amount));
  return `rgb(${r},${g},${b})`;
}

export interface DrawOptions {
  blink?: boolean;
  flipX?: boolean;
  /** 自动明暗:上缘受光、下缘落影,默认开启 */
  shade?: boolean;
}

/**
 * 在 ctx 上以 (x, y) 为左上角绘制字符网格。
 * scale 为单个像素格的边长。
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  grid: Grid,
  colors: SpriteColors,
  x: number,
  y: number,
  scale: number,
  opts: DrawOptions = {}
): void {
  const map: Record<string, string> = {
    O: colors.outline,
    H: colors.hair,
    S: colors.skin,
    B: colors.body,
    A: colors.accent,
    W: colors.weapon,
    E: opts.blink ? colors.skin : colors.eye,
  };
  const w = Math.max(...grid.map((r) => r.length));
  const shade = opts.shade !== false;
  const hi = Math.max(1, Math.round(scale * 0.3));
  for (let row = 0; row < grid.length; row++) {
    const line = grid[row];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      if (ch === ".") continue;
      const color = map[ch];
      if (!color) continue;
      const drawCol = opts.flipX ? w - 1 - col : col;
      const dx = x + drawCol * scale;
      const dy = y + row * scale;
      ctx.fillStyle = color;
      ctx.fillRect(dx, dy, scale, scale);
      // 自动明暗:让像素画自带体积感
      if (shade && ch !== "O" && ch !== "E") {
        const above = grid[row - 1]?.[col];
        const below = grid[row + 1]?.[col];
        if (!above || above === ".") {
          ctx.fillStyle = "rgba(255,255,255,0.28)";
          ctx.fillRect(dx, dy, scale, hi);
        }
        if (!below || below === ".") {
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          ctx.fillRect(dx, dy + scale - hi, scale, hi);
        }
      }
    }
  }
}

export function gridSize(grid: Grid): { w: number; h: number } {
  return { w: Math.max(...grid.map((r) => r.length)), h: grid.length };
}

/** 根据角色主色生成一套精灵配色 */
export function makeColors(body: string, hair: string, accent: string): SpriteColors {
  return {
    outline: "#1B1B2A",
    hair,
    skin: "#FFDCC0",
    body,
    accent,
    weapon: "#B8C2CC",
    eye: "#20223A",
  };
}
