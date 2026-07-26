// ============================================================
// 素材槽位约定
// ------------------------------------------------------------
// 把图片按下面的文件名放进 website/public/assets/ 对应目录即可自动生效,
// 不需要改任何代码。缺图时组件会自动回退到程序化生成的「全息档案卡」占位图。
//
//   public/assets/characters/<id>.png        角色立绘   建议 900×1350 透明 PNG
//   public/assets/characters/<id>-face.png   角色头像   建议 480×480  方图
//   public/assets/chapters/<id>.jpg          章节主视觉 建议 1600×900
//   public/assets/hero/string.jpg            首屏·弦界侧背景 建议 1920×1080
//   public/assets/hero/nte.jpg               首屏·异环侧背景 建议 1920×1080
//   public/assets/logo.png                   站点 LOGO  建议 高度 ≥ 120px 透明 PNG
//
// <id> 取自 src/content.ts 里的角色 / 章节 id:
//   角色 knight mage rogue michele kanami celestia esper_zero nanally
//   章节 forest dungeon snow lava
//
// 注意:请使用你拥有使用权的素材(自绘、委托、授权或开放许可)。
// ============================================================

/** Vite 的 base 前缀,保证部署到子路径时依然能取到 public/ 下的文件 */
const BASE: string =
  (import.meta as unknown as { env?: { BASE_URL?: string } })?.env?.BASE_URL ?? "./";

export function assetUrl(path: string): string {
  return `${BASE}assets/${path}`.replace(/([^:]\/)\/+/g, "$1");
}

export const SLOTS = {
  character: (id: string) => assetUrl(`characters/${id}.png`),
  characterFace: (id: string) => assetUrl(`characters/${id}-face.png`),
  chapter: (id: string) => assetUrl(`chapters/${id}.jpg`),
  heroString: () => assetUrl("hero/string.jpg"),
  heroNte: () => assetUrl("hero/nte.jpg"),
  logo: () => assetUrl("logo.png"),
};

/** 占位图上展示的槽位提示文本 */
export const SLOT_HINT = {
  character: (id: string) => `assets/characters/${id}.png`,
  chapter: (id: string) => `assets/chapters/${id}.jpg`,
  hero: (side: "string" | "nte") => `assets/hero/${side}.jpg`,
};

// ---------------- 双世界设定 ----------------

export type WorldId = "fusion" | "string" | "nte";

export interface WorldMeta {
  id: WorldId;
  name: string;
  en: string;
  tag: string;
  blurb: string;
  accent: string;
}

export const WORLDS: Record<WorldId, WorldMeta> = {
  fusion: {
    id: "fusion",
    name: "融合",
    en: "FUSION",
    tag: "DUAL LAYER",
    blurb: "两个世界在档案深处重叠,边界正在坍缩。",
    accent: "#8B7BFF",
  },
  string: {
    id: "string",
    name: "弦界",
    en: "STRING",
    tag: "STRINGIFY",
    blurb: "高维弦体的国度。此处的一切都能被压平成二维,贴上墙面、滑过缝隙。",
    accent: "#00D8FF",
  },
  nte: {
    id: "nte",
    name: "异环",
    en: "ANOMALY",
    tag: "ANOMALY FIELD",
    blurb: "霓虹之下的都市异象。异能者在雨夜里追捕那些不该存在的东西。",
    accent: "#FF2E7E",
  },
};

/** 角色阵营 → 所属世界 */
export function worldOfCollection(collection: string): WorldId {
  if (collection === "strinova") return "string";
  if (collection === "nte") return "nte";
  return "fusion";
}

/** 章节 → 视觉倾向的世界 */
export const CHAPTER_WORLD: Record<string, WorldId> = {
  forest: "string",
  snow: "string",
  dungeon: "nte",
  lava: "nte",
};
