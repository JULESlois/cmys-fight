// ============================================================
// 官网内容数据 —— 全部取自游戏源码 (src/game/data / i18n.ts)
// ============================================================

/** 「开始游戏」按钮跳转地址,部署时改成游戏实际地址 */
export const GAME_URL = "http://localhost:3000/";

export interface CharacterInfo {
  id: string;
  name: string;
  title: string;
  color: string;
  hair: string;
  accent: string;
  passive: string;
  collection: "cmys" | "strinova" | "nte";
  sprite: "armor" | "robe" | "hood" | "girl" | "girl_rifle" | "girl_mic" | "star" | "blade" | "fist";
  stats: { hp: number; armor: number; mana: number; speed: number };
}

export const COLLECTIONS: Record<
  string,
  { name: string; label: string; color: string; description: string }
> = {
  cmys: {
    name: "CMYS",
    label: "原生形态",
    color: "#F1C40F",
    description: "守御、奥术与疾行三种形态,一体三面的档案守护者。",
  },
  strinova: {
    name: "STRINOVA",
    label: "弦化干员",
    color: "#75D9FF",
    description: "围绕精准、控制与守护构筑的弦化干员小队。",
  },
  nte: {
    name: "NTE",
    label: "异象猎人",
    color: "#C79CFF",
    description: "伊波恩的异象猎人,以鉴定刻印与灵相追击持续施压。",
  },
};

export const CHARACTERS: CharacterInfo[] = [
  {
    id: "knight",
    name: "CMYS",
    title: "守御形态",
    color: "#E74C3C",
    hair: "#8E2F27",
    accent: "#F5B7B1",
    passive: "护甲充满时获得守卫,使下一次受到的伤害减少 1 点。",
    collection: "cmys",
    sprite: "armor",
    stats: { hp: 8, armor: 10, mana: 25, speed: 80 },
  },
  {
    id: "mage",
    name: "CMYS",
    title: "奥术形态",
    color: "#3498DB",
    hair: "#1F618D",
    accent: "#AED6F1",
    passive: "每累计消耗 12 点能量,触发一次 50% 伤害的奥术回响。",
    collection: "cmys",
    sprite: "robe",
    stats: { hp: 4, armor: 2, mana: 60, speed: 90 },
  },
  {
    id: "rogue",
    name: "CMYS",
    title: "疾行形态",
    color: "#2ECC71",
    hair: "#1D8348",
    accent: "#ABEBC6",
    passive: "冲刺后 2 秒内暴击率 +25%。",
    collection: "cmys",
    sprite: "hood",
    stats: { hp: 6, armor: 4, mana: 40, speed: 120 },
  },
  {
    id: "michele",
    name: "米雪儿 Michele",
    title: "萌新搜查官",
    color: "#4FC3F7",
    hair: "#7ED6FF",
    accent: "#FFD9EC",
    passive: "受到伤害后标记攻击者 2 秒;Inspector 对标记目标伤害 +35%。",
    collection: "strinova",
    sprite: "girl_rifle",
    stats: { hp: 6, armor: 7, mana: 42, speed: 96 },
  },
  {
    id: "kanami",
    name: "香奈美 Kanami",
    title: "灵魂歌姬",
    color: "#F06CA8",
    hair: "#FF9AC4",
    accent: "#FDE2F0",
    passive: "Finale 命中时释放共鸣音波,对附近敌人造成范围伤害。",
    collection: "strinova",
    sprite: "girl_mic",
    stats: { hp: 5, armor: 4, mana: 48, speed: 94 },
  },
  {
    id: "celestia",
    name: "星绘 Celestia",
    title: "守护星芒",
    color: "#9CCBFF",
    hair: "#C7E3FF",
    accent: "#FFF3B0",
    passive: "护甲会更早且更快地恢复;守护星芒可提供持续 10 秒的临时护甲。",
    collection: "strinova",
    sprite: "star",
    stats: { hp: 5, armor: 8, mana: 52, speed: 92 },
  },
  {
    id: "esper_zero",
    name: "Esper Zero",
    title: "伊波恩鉴定师",
    color: "#BDA7FF",
    hair: "#8F79D9",
    accent: "#E8DEFF",
    passive: "鉴定标记:发动「刻印鉴定」后,鉴定之刃伤害提高,并额外穿透一个目标。",
    collection: "nte",
    sprite: "blade",
    stats: { hp: 6, armor: 5, mana: 50, speed: 106 },
  },
  {
    id: "nanally",
    name: "娜娜莉 Nanally",
    title: "伊波恩灵相重拳手",
    color: "#FF668F",
    hair: "#FF8FB0",
    accent: "#FFE3EC",
    passive: "科林斯追击:发动「科林斯咆哮术」后,每轮重拳连击都会追加一次灵相追击。",
    collection: "nte",
    sprite: "fist",
    stats: { hp: 7, armor: 5, mana: 44, speed: 102 },
  },
];

export interface ChapterInfo {
  id: string;
  index: string;
  name: string;
  en: string;
  blurb: string;
  palette: {
    bg: string;
    wall: string;
    floor: string;
    hazard1: string;
    hazard2: string;
    portal: string;
  };
}

export const CHAPTERS: ChapterInfo[] = [
  {
    id: "forest",
    index: "第一章",
    name: "翠绿边境",
    en: "VERDANT FRONTIER",
    blurb: "苔藓覆盖的边境营地,深层档案的第一道裂缝在林间张开。",
    palette: {
      bg: "#14231C",
      wall: "#314A37",
      floor: "#66785F",
      hazard1: "#1F607C",
      hazard2: "#79D5DF",
      portal: "#5FFFE6",
    },
  },
  {
    id: "dungeon",
    index: "第二章",
    name: "遗忘地牢",
    en: "FORGOTTEN DUNGEON",
    blurb: "被封存的旧牢狱,紫色符文仍在石壁上低声运转。",
    palette: {
      bg: "#0B101A",
      wall: "#273246",
      floor: "#48556B",
      hazard1: "#4A2864",
      hazard2: "#A06CD5",
      portal: "#C77DFF",
    },
  },
  {
    id: "snow",
    index: "第三章",
    name: "冰封研究区",
    en: "FROZEN RESEARCH ZONE",
    blurb: "极寒实验设施,冻结的走廊里回荡着未完成的实验记录。",
    palette: {
      bg: "#7FA9BE",
      wall: "#79A9C2",
      floor: "#BDD5DF",
      hazard1: "#8CC5DE",
      hazard2: "#F4FBFF",
      portal: "#5DCBFF",
    },
  },
  {
    id: "lava",
    index: "第四章",
    name: "炼狱铸造厂",
    en: "INFERNAL FOUNDRY",
    blurb: "熔岩驱动的终焉工厂,档案深处的 Boss 在炉火中等待。",
    palette: {
      bg: "#16090C",
      wall: "#29202C",
      floor: "#4A3748",
      hazard1: "#D14C18",
      hazard2: "#FFB12B",
      portal: "#FFD166",
    },
  },
];

export interface FeatureInfo {
  icon: "sword" | "map" | "pad" | "disk" | "hub" | "music";
  title: string;
  desc: string;
  color: string;
}

export const FEATURES: FeatureInfo[] = [
  {
    icon: "sword",
    title: "57 件武器 · 构筑流派",
    desc: "手枪、激光、星尘龙杖……武器模组与协同系统组合出千变万化的 Build。",
    color: "#FFD166",
  },
  {
    icon: "map",
    title: "程序生成关卡",
    desc: "确定性的房间图谱:战斗、商店、宝箱、许愿泉与拍照亭,每次深潜都是新地图。",
    color: "#79D5DF",
  },
  {
    icon: "hub",
    title: "可探索的深潜基地",
    desc: "80×60 图块的 Hub 世界:军械库、观星台、重生之泉,升级你的每一次远征。",
    color: "#A06CD5",
  },
  {
    icon: "pad",
    title: "全平台操控",
    desc: "键盘、手柄、触屏三端支持,按键可重绑,提示随设备自动切换。",
    color: "#2ECC71",
  },
  {
    icon: "disk",
    title: "PWA 离线畅玩",
    desc: "可安装的渐进式应用,存档支持导出 / 导入与校验,进度永不丢失。",
    color: "#4FC3F7",
  },
  {
    icon: "music",
    title: "自适应音乐",
    desc: "Web Audio 驱动的动态配乐随战况起伏,也支持挂载你自己的曲库。",
    color: "#F06CA8",
  },
];

export const STATS = [
  { value: 8, label: "可玩角色" },
  { value: 57, label: "武器" },
  { value: 36, label: "敌人" },
  { value: 16, label: "关卡" },
];

export const CONTROLS = [
  { action: "移动", key: "WASD", pad: "左摇杆 / 十字键", touch: "虚拟方向键" },
  { action: "开火", key: "J", pad: "X / RT", touch: "X" },
  { action: "互动 / 确认", key: "K", pad: "A", touch: "A" },
  { action: "技能 / 取消", key: "L / Esc", pad: "B", touch: "B" },
  { action: "切换武器", key: "I", pad: "Y", touch: "Y" },
  { action: "暂停 / 返回", key: "Esc", pad: "Start", touch: "Start" },
];
