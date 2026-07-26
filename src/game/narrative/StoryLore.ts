import type { Language } from "../i18n";

/**
 * StoryLore — 深层档案叙事文案的唯一数据源。
 * 设计文档见 docs/story-bible.md。
 * 所有文本双语;中文为主创语言,英文为等效翻译。
 * 约束:底部通知/图鉴单行 中文 ≤ 26 字,英文 ≤ 46 字符。
 */

export interface LoreLine {
  en: string;
  zh: string;
}

export function loreText(line: LoreLine, language: Language): string {
  return language === "zh-CN" ? line.zh : line.en;
}

/** 标题画面副标题 */
export const TITLE_TAGLINE: LoreLine = {
  en: "The Archive remembers what you forget.",
  zh: "档案记得你忘掉的一切。",
};

/** 章节引言 — 章节切换时随 region 通知显示在底部 */
export const CHAPTER_FLAVOR: Record<number, LoreLine> = {
  1: {
    en: "Welcome back to the Deep Archive. Visitors today: 0. Day 11424 in a row.",
    zh: "欢迎回到深层档案。本日入馆人数:0。已连续 11424 天。",
  },
  2: {
    en: "Restricted stacks. Last lawful reading: before the end.",
    zh: "禁书区。最后一次合法借阅:终末之前。",
  },
  3: {
    en: "Cold keeps memory in shape. It keeps other things, too.",
    zh: "低温维持记忆的形状。也维持别的东西。",
  },
  4: {
    en: "The Curator would rather you never saw this floor.",
    zh: "馆长不希望你看到这一层。",
  },
};

/** 区域低语 — 进入对应世界节点时显示 */
export const ZONE_LORE: Record<string, LoreLine> = {
  overgrown_archive: {
    en: "The welcome hall still greets no one.",
    zh: "欢迎大厅还在迎接,虽然再没有人来。",
  },
  sealed_library: {
    en: "Every lock here was installed from the inside.",
    zh: "这里每一把锁,都是从里面装上的。",
  },
  cooling_canal: {
    en: "The canal cools the Archive. And its dreams.",
    zh: "运河冷却着档案,也冷却着它的梦。",
  },
  sealed_armory: {
    en: "Sealed not to keep thieves out, but weapons in.",
    zh: "封印不是防贼,是防里面的东西出去。",
  },
  observatory: {
    en: "Log entry, repeated: NO SIGNAL. The last one differs.",
    zh: "观测日志千篇一律:无信号。只有最后一条不同。",
  },
  forge_core: {
    en: "The furnace never sleeps. The Archive needs its heart.",
    zh: "炉火从不熄灭。档案需要这颗心脏。",
  },
  ash_catacombs: {
    en: "Failed archives are not deleted. They are burned.",
    zh: "归档失败品不会被删除。会被焚化。",
  },
  deep_prison: {
    en: "Some backups refused the format. They are kept here.",
    zh: "有些备份拒绝了格式化。它们被关在这里。",
  },
  deep_archive: {
    en: "The master index. The Curator is expecting you.",
    zh: "主索引室。馆长正在等你。",
  },
};

/** Boss 开场白 — Boss 房 intro 阶段显示 */
export const BOSS_INTRO: Record<string, LoreLine> = {
  forest_guardian: {
    en: "\"Weeds detected. Commencing pruning.\"",
    zh: "「检测到杂草。开始修剪。」",
  },
  broadcast_rooster: {
    en: "\"And now, good news. All. Is. Still. Well.\"",
    zh: "「下面播报一条好消息。一切、依旧、安好。」",
  },
  crypt_overseer: {
    en: "\"Archive quality inspection. Please hold still.\"",
    zh: "「归档质量抽检。请保持不动。」",
  },
  kennel_warden: {
    en: "\"Another backup off its leash. Back to the pen.\"",
    zh: "「又一份逃跑的备份。回笼。」",
  },
  frost_titan: {
    en: "\"Your body heat exceeds the permitted range.\"",
    zh: "「你的体温超标了。」",
  },
  white_director: {
    en: "\"Sample 4, 7, 1, 3... good. Still alive.\"",
    zh: "「样本 4,7,1,3……很好,还是活的。」",
  },
  inferno_core: {
    en: "\"Incinerator preheated. Insert rejected archives.\"",
    zh: "「焚化炉预热完毕。请投入失败品。」",
  },
  vat_horse_prime: {
    en: "(No words. Only an old jingle, hummed off-key.)",
    zh: "(没有话语。只有走调的旧宣传曲哼鸣。)",
  },
};

/** 图鉴条目 — Codex 敌人/Boss 页描述 */
export const ENEMY_LORE: Record<string, LoreLine> = {
  // 第一章 · 翠绿边境
  moss_brute: {
    en: "A groundskeeper drone. The moss is what it failed to prune.",
    zh: "园丁机体。身上的苔藓,是它没修剪完的部分。",
  },
  thorn_archer: {
    en: "Security staff, archived mid-patrol. Still on patrol.",
    zh: "巡逻中被归档的警卫。至今仍在巡逻。",
  },
  boar_charger: {
    en: "Ecology backup, feral. The Archive calls this thriving.",
    zh: "失控的生态备份。档案称之为「长势良好」。",
  },
  dingdong_fowl: {
    en: "A promo mascot. It still performs its cheerful duty.",
    zh: "宣传吉祥物。仍在认真履行欢乐职责。",
  },
  spore_mimic: {
    en: "Exhibit A-113 grew tired of being looked at.",
    zh: "A-113 号展品,厌倦了被参观。",
  },
  root_lancer: {
    en: "The garden's stakes learned to aim back.",
    zh: "花园的支架学会了瞄准。",
  },
  petal_moth: {
    en: "It circles the last light it remembers.",
    zh: "它绕着记忆里最后一盏灯打转。",
  },
  forest_guardian: {
    en: "Head gardener. Intruders are classified as weeds.",
    zh: "首席园丁。闯入者一律归类为杂草。",
  },
  broadcast_rooster: {
    en: "Chief mascot. Its broadcast has no listeners left.",
    zh: "首席吉祥物。它的广播早已没有听众。",
  },
  // 第二章 · 遗忘地牢
  bone_guard: {
    en: "A librarian, formatted. The post remains staffed.",
    zh: "被格式化的馆员。岗位从未空缺。",
  },
  bolt_cultist: {
    en: "They worship the Curator. It never asked them to.",
    zh: "他们崇拜馆长。馆长从未要求过。",
  },
  grave_summoner: {
    en: "It restores colleagues from backup. Endlessly.",
    zh: "它从备份里恢复同事。一遍又一遍。",
  },
  bark_hound: {
    en: "The kennel was archived whole. Loyalty survived it.",
    zh: "整座犬舍被一并归档。忠诚活了下来。",
  },
  chain_jailer: {
    en: "Its chains once held the format's first refusers.",
    zh: "它的锁链,拴过第一批拒绝格式化的人。",
  },
  coffin_lobber: {
    en: "It files the fallen. Filing means throwing, now.",
    zh: "它负责归档逝者。如今归档的意思是投掷。",
  },
  lantern_wraith: {
    en: "It lights the stacks for readers who never come.",
    zh: "它为再不会来的读者照亮书架。",
  },
  crypt_overseer: {
    en: "Former head archivist. Still inspecting format quality.",
    zh: "前档案主管。仍在验收归档质量。",
  },
  kennel_warden: {
    en: "Warden of the refused. Archived with its kennel.",
    zh: "叛乱备份的狱卒,与犬舍一同被归档。",
  },
  // 第三章 · 冰封研究区
  frost_hound: {
    en: "Bred to fetch samples. It still fetches.",
    zh: "为取样而培育。它仍在取样。",
  },
  ice_shaman: {
    en: "A climate engineer. It prays to the thermostat now.",
    zh: "气候工程师。如今向恒温器祷告。",
  },
  snow_turret: {
    en: "Perimeter defense. The perimeter no longer exists.",
    zh: "边界防御炮塔。边界早已不存在。",
  },
  white_sampler: {
    en: "\"Assess outside recovery.\" Its last order stands.",
    zh: "「评估外部恢复情况」——最后的指令仍在执行。",
  },
  mirror_wisp: {
    en: "A reflection that outlived what it reflected.",
    zh: "一面倒影,比它映照的东西活得更久。",
  },
  icicle_sniper: {
    en: "It watches the door where help was supposed to come.",
    zh: "它盯着那扇本该有救援进来的门。",
  },
  lab_servitor: {
    en: "It assists the staff. Assisting is all that is left.",
    zh: "科研侍从。除了辅助,它什么都不剩了。",
  },
  frost_titan: {
    en: "The cooling system itself. Its thaw is the Archive's fever.",
    zh: "冷却系统的化身。它融化一寸,档案发烧一分。",
  },
  white_director: {
    en: "First volunteer for the format. Led by example.",
    zh: "第一位自愿归档者。她说要以身作则。",
  },
  // 第四章 · 炼狱铸造厂
  ember_knight: {
    en: "Honor guard of the furnace. Its oath outburned it.",
    zh: "熔炉仪仗兵。誓言烧得比它本人更久。",
  },
  magma_spitter: {
    en: "A maintenance unit. It seals leaks with itself.",
    zh: "维修机体。它用自己填补泄漏。",
  },
  cinder_oracle: {
    en: "It reads futures in the ash. All of them are this one.",
    zh: "它在灰烬里占卜未来。每一次都是同一个。",
  },
  code_horse: {
    en: "The mascot was real. This is what it was drawn from.",
    zh: "吉祥物是照着它画的。这才是原型。",
  },
  furnace_beetle: {
    en: "It carries fuel to a fire that no longer warms anyone.",
    zh: "它为炉火运送燃料。炉火已不再温暖任何人。",
  },
  magma_mortar: {
    en: "Demolition unit. The renovation was never finished.",
    zh: "拆除单元。那场翻修从未完工。",
  },
  heat_smith_drone: {
    en: "It repairs its kin mid-battle. No one repairs it.",
    zh: "它在战斗中修理同伴。没有谁修理它。",
  },
  inferno_core: {
    en: "The furnace heart. Destroy it, and the Archive starts dying.",
    zh: "动力炉心脏。摧毁它,档案就开始死亡。",
  },
  vat_horse_prime: {
    en: "Prototype 01 of the bioweapon program. The last madness.",
    zh: "生体武器计划一号原型。旧文明最后的疯狂。",
  },
};

/** 广播残片 — 广播终端交互时随机一条 */
export const BROADCAST_LINES: LoreLine[] = [
  {
    en: "Welcome to the Deep Archive. Do not touch the exhibits. Do not become one.",
    zh: "欢迎参观深层档案。请勿触摸展品。请勿成为展品。",
  },
  {
    en: "Missing: the floor 37 custodian. Correction: floor 37.",
    zh: "寻人启事:37 层管理员今日未打卡。更正:37 层今日不存在。",
  },
  {
    en: "Safety notice: during formatting, please smile until you cannot.",
    zh: "安全提示:如遇格式化作业,请保持微笑,直到保持不住为止。",
  },
  {
    en: "Holdings today: everything. Readers today: ...replaying previous item.",
    zh: "今日馆藏总数:一切。今日读者人数:……重播上一条。",
  },
  {
    en: "Ding-dong! The Archive remembers you. Even after you don't.",
    zh: "叮咚——叮咚鸡提醒您:档案永远记得你。哪怕你已经不记得自己。",
  },
  {
    en: "Lost and found: one name, unclaimed for 11424 days.",
    zh: "失物招领:名字一个,已无人认领 11424 天。",
  },
  {
    en: "Today's weather: none. Tomorrow's forecast: none. Enjoy your visit.",
    zh: "今日天气:无。明日预报:无。祝您参观愉快。",
  },
  {
    en: "Reminder: archiving is painless. The pain is filed separately.",
    zh: "温馨提示:归档全程无痛。疼痛将另行归档。",
  },
  {
    en: "The cafeteria on floor 2 is permanently closed. So is floor 2.",
    zh: "二层餐厅永久停业。二层亦然。",
  },
  {
    en: "Curfew begins at sundown. The Archive has not seen a sundown.",
    zh: "宵禁自日落开始。档案馆从未见过日落。",
  },
  {
    en: "To the one still walking: the Curator asks that you stop.",
    zh: "致仍在行走的那位:馆长请求您停下来。",
  },
  {
    en: "Staff notice: if you can hear this, you are still staff.",
    zh: "员工须知:如果您能听到这条广播,您就仍是员工。",
  },
  {
    en: "Please rate your visit. Previous rating: a scream, 4 stars.",
    zh: "请为本次参观评分。上一条评价:一声尖叫,四星。",
  },
  {
    en: "The rebirth spring is not a spring. Please stop wishing on it.",
    zh: "重生之泉并不是泉。请不要再对它许愿。",
  },
  {
    en: "Broadcast 88,412 of 88,412. Restarting from broadcast 1.",
    zh: "第 88412 条广播,共 88412 条。即将从第 1 条重播。",
  },
  {
    en: "This has been a recording. Everything here has been a recording.",
    zh: "以上内容为录音。这里的一切,都是录音。",
  },
];

/** Old Memory 对话回退台词 — 无 API Key 时按序取三句 */
export const OLD_MEMORY_FALLBACK: LoreLine[][] = [
  [
    { en: "You came back. Or a copy of you did.", zh: "你回来了。或者说,你的某一份副本回来了。" },
    { en: "It makes no difference to me. It should not to you.", zh: "对我而言没有区别。对你而言,最好也没有。" },
    { en: "(The voice degrades into archive static.)", zh: "(声音劣化成档案的白噪。)" },
  ],
  [
    { en: "I remember shelving your name. Third row, facing the light.", zh: "我记得把你的名字上架过。第三排,朝着灯光。" },
    { en: "Someone borrowed it and never brought it back.", zh: "有人把它借走了,再也没有还回来。" },
    { en: "(The rest of the memory is stamped: ARCHIVED.)", zh: "(记忆的剩余部分盖着章:已归档。)" },
  ],
  [
    { en: "The Curator is not cruel. Remember that, down there.", zh: "馆长并不残忍。到了下面,请记住这一点。" },
    { en: "It simply loves the collection more than the collected.", zh: "它只是爱馆藏,胜过爱被收藏的人。" },
    { en: "(Connection stable. Nothing else is.)", zh: "(连接稳定。除此之外没有什么是稳定的。)" },
  ],
];

/** 记忆天赋文案 — 重生泉的"你这次要记起什么"仪式 */
export const MEMORY_TALENT_TEXT: Record<string, { name: LoreLine; desc: LoreLine; ritual: LoreLine }> = {
  ballistic_memory: {
    name: { en: "BALLISTIC MEMORY", zh: "弹道记忆" },
    desc: { en: "Begin the descent carrying one common Vanguard protocol.", zh: "下潜时携带一份普通品质的先锋协议。" },
    ritual: { en: "You remember a soldier's hands. They were steadier than yours.", zh: "你记起一双士兵的手。比你的更稳。" },
  },
  echo_memory: {
    name: { en: "ECHO MEMORY", zh: "回响记忆" },
    desc: { en: "First perfect dodge of the descent refunds 25% dodge cooldown.", zh: "本次下潜首次完美闪避,返还 25% 闪避冷却。" },
    ritual: { en: "You remember a moment that almost happened twice.", zh: "你记起一个几乎发生过两次的瞬间。" },
  },
  phoenix_memory: {
    name: { en: "PHOENIX MEMORY", zh: "凤凰记忆" },
    desc: { en: "First armor break each chapter clears nearby enemy projectiles.", zh: "每章首次护甲破裂,清除周围的敌方弹幕。" },
    ritual: { en: "You remember dying. It was quieter than expected.", zh: "你记起死亡。比想象中安静。" },
  },
  forbidden_memory: {
    name: { en: "FORBIDDEN MEMORY", zh: "禁忌记忆" },
    desc: { en: "+15 corruption. In exchange: two extra talent rerolls.", zh: "蚀痕 +15。作为交换:额外两次天赋重抽。" },
    ritual: { en: "You remember something the Curator deleted. It remembers you back.", zh: "你记起一段馆长删除过的东西。它也记起了你。" },
  },
};

/** 协议进化文案 — 一局一次的觉醒时刻 */
export const EVOLUTION_TEXT: Record<string, { name: LoreLine; line: LoreLine }> = {
  overclock_core_evo: {
    name: { en: "OVERCLOCK CORE", zh: "超频核心" },
    line: { en: "Three Vanguard protocols align. The old army wakes in your trigger finger.", zh: "三份先锋协议对齐。旧军团在你的扳机上醒来。" },
  },
  ghost_loop_evo: {
    name: { en: "GHOST LOOP", zh: "幽灵回路" },
    line: { en: "Three echoes close the loop. Something keeps moving after you stop.", zh: "三道回响闭合成环。你停下之后,有什么还在继续动。" },
  },
  aegis_foundry_evo: {
    name: { en: "AEGIS FOUNDRY", zh: "神盾铸造厂" },
    line: { en: "Three Phoenix protocols fuse. The medical wing never stopped forging.", zh: "三份凤凰协议熔合。医疗部的锻炉从未熄火。" },
  },
  skill_loop_evo: {
    name: { en: "SKILL LOOP", zh: "技能回环" },
    line: { en: "Three Aether protocols resonate. The energy remembers its own path.", zh: "三份以太协议共振。能量记得自己走过的路。" },
  },
  living_dungeon_evo: {
    name: { en: "LIVING DUNGEON", zh: "活体地牢" },
    line: { en: "Three Salvage protocols merge. The Archive notices you noticing it.", zh: "三份拾荒协议并轨。档案注意到了你的注意。" },
  },
  astral_atlas_evo: {
    name: { en: "ASTRAL ATLAS", zh: "星界图册" },
    line: { en: "Three Survey protocols unfold. The map was drawn from inside.", zh: "三份星图协议展开。这张地图,是从里面画出来的。" },
  },
};

export function getMemoryTalentText(id: string, language: Language): { name: string; desc: string; ritual: string } | null {
  const entry = MEMORY_TALENT_TEXT[id];
  if (!entry) return null;
  return {
    name: loreText(entry.name, language),
    desc: loreText(entry.desc, language),
    ritual: loreText(entry.ritual, language),
  };
}

export function getEvolutionText(id: string, language: Language): { name: string; line: string } | null {
  const entry = EVOLUTION_TEXT[id];
  if (!entry) return null;
  return { name: loreText(entry.name, language), line: loreText(entry.line, language) };
}

export function getEnemyLore(id: string, language: Language): string | null {
  const line = ENEMY_LORE[id];
  return line ? loreText(line, language) : null;
}

export function getBossIntro(id: string, language: Language): string | null {
  const line = BOSS_INTRO[id];
  return line ? loreText(line, language) : null;
}

export function getZoneLore(worldNodeId: string, language: Language): string | null {
  const line = ZONE_LORE[worldNodeId];
  return line ? loreText(line, language) : null;
}

export function getChapterFlavor(chapter: number, language: Language): string | null {
  const line = CHAPTER_FLAVOR[chapter];
  return line ? loreText(line, language) : null;
}

/** roll ∈ [0,1) — 用房间种子随机挑一条广播,保证可复现 */
export function pickBroadcastLine(roll: number, language: Language): string {
  const index = Math.min(BROADCAST_LINES.length - 1, Math.max(0, Math.floor(roll * BROADCAST_LINES.length)));
  return loreText(BROADCAST_LINES[index], language);
}

/** roll ∈ [0,1) — 挑一组回退对话 */
export function pickOldMemoryFallback(roll: number, language: Language): string[] {
  const index = Math.min(OLD_MEMORY_FALLBACK.length - 1, Math.max(0, Math.floor(roll * OLD_MEMORY_FALLBACK.length)));
  return OLD_MEMORY_FALLBACK[index].map(line => loreText(line, language));
}
