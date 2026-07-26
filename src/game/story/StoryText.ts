/**
 * Narrative text for the story tree.
 *
 * This lives outside i18n.ts on purpose. `i18n.ts` is the UI string table —
 * short chrome labels that many systems read. Story prose is bulk content
 * owned by exactly one consumer, and folding ~120 narrative entries into the
 * UI table would bury the labels it exists to hold.
 *
 * Keys follow the tree's own convention so a node and its text stay in sync:
 *   `${nodeId}.line${i}`   body line i
 *   `${nodeId}.choice${j}` choice with authored index j
 */

import type { Language } from "../i18n";

type StoryStrings = Record<string, string>;

const EN: StoryStrings = {
  // ---- chapter cutscenes ----------------------------------------------
  "ch1_open.line0": "The archive door was never locked.",
  "ch1_open.line1": "That is the part nobody writes down.",
  "ch1_open.line2": "You walk in. The index begins to update.",

  "ch2_open.line0": "Below the reading floor, the shelves stop pretending.",
  "ch2_open.line1": "Bone, chain, and a catalogue that bites.",
  "ch2_open.line2": "Something down here has been filing you.",

  "ch3_open.line0": "The cold section preserves what should have rotted.",
  "ch3_open.line1": "Two voices argue over your record.",
  "ch3_open.line2": "Neither of them asked what you wanted.",

  "ch4_open.line0": "The last room is not a room.",
  "ch4_open.line1": "It is a seal, and the seal has your handwriting on it.",
  "ch4_open.line2": "You have been here before.",
  "ch4_open.line3": "You just did not come back out.",

  // ---- the Archivist ---------------------------------------------------
  "archivist_intro.line0": "You are late. Or early. The catalogue disagrees with itself.",
  "archivist_intro.line1": "Either way, you are shelved under 'unresolved'.",
  "archivist_intro.choice0": "Who are you?",
  "archivist_intro.choice1": "I don't have time for this.",

  "archivist_deflect.line0": "Nobody has time. That is why the archive exists.",
  "archivist_deflect.choice0": "Fine. Talk.",
  "archivist_deflect.choice1": "Walk away.",

  "archivist_relic.line0": "There is a relic in the deep stack. It remembers things you don't.",
  "archivist_relic.line1": "Take it, and you will carry someone else's version of you.",
  "archivist_relic.choice0": "I'll take it.",
  "archivist_relic.choice1": "Leave it where it is.",

  "archivist_took.line0": "Of course you did. They always do.",
  "archivist_took.line1": "It will be heavier on the way down.",
  "archivist_took.choice0": "I'll bring it back.",
  "archivist_took.choice1": "Say nothing.",

  "archivist_refused.line0": "Interesting. The shelf stays closed, then.",
  "archivist_refused.line1": "You may be the first one it does not rewrite.",
  "archivist_refused.choice0": "What's my real name?",
  "archivist_refused.choice1": "Say nothing.",

  "archivist_name.line0": "It is written on the seal at the bottom.",
  "archivist_name.line1": "You signed it. That is why it holds.",
  "archivist_name.choice0": "…",

  // ---- faction split ---------------------------------------------------
  "faction_choice.line0": "Two signals reach you at once, on the same frequency.",
  "faction_choice.line1": "Both of them are certain you belong to them.",
  "faction_choice.choice0": "Answer the Director.",
  "faction_choice.choice1": "Answer the Overseer.",
  "faction_choice.choice2": "Say the name on the seal.",

  "faction_director.line0": "Good. Order is just a well-maintained index.",
  "faction_director.line1": "Keep descending. I will keep the lights on.",
  "faction_director.choice0": "Understood.",

  "faction_overseer.line0": "The Director files things. I remember them.",
  "faction_overseer.line1": "There is a difference, and you are about to need it.",
  "faction_overseer.choice0": "Understood.",

  // ---- optional encounters --------------------------------------------
  "rooster_mercy.line0": "The broadcast rooster is out of signal and out of fight.",
  "rooster_mercy.choice0": "Let it go.",
  "rooster_mercy.choice1": "Finish it.",

  "old_memory.line0": "A recording plays with no machine to play it.",
  "old_memory.line1": "It is your voice, and it is apologising.",
  "old_memory.choice0": "Listen to the end.",

  "vat_horse_cage.line0": "The vat is still sealed. Whatever is inside is still breathing.",
  "vat_horse_cage.choice0": "Open it.",
  "vat_horse_cage.choice1": "Leave it sealed.",

  "final_seal.line0": "The seal is warm. It has been waiting the whole time.",
  "final_seal.line1": "Breaking it ends the archive. Leaving it ends you.",
  "final_seal.choice0": "Break the seal.",
  "final_seal.choice1": "Let it hold.",
};

const ZH: StoryStrings = {
  // ---- 章节过场 --------------------------------------------------------
  "ch1_open.line0": "档案馆的门从来没锁过。",
  "ch1_open.line1": "只是没人把这件事记下来。",
  "ch1_open.line2": "你走了进去。索引开始更新。",

  "ch2_open.line0": "阅览层之下，书架不再伪装。",
  "ch2_open.line1": "骨、锁链，和一份会咬人的目录。",
  "ch2_open.line2": "下面有什么东西，一直在给你归档。",

  "ch3_open.line0": "冷藏区保存着本该腐烂的东西。",
  "ch3_open.line1": "两个声音在为你的记录争执。",
  "ch3_open.line2": "它们谁都没问过你想要什么。",

  "ch4_open.line0": "最后一间不是房间。",
  "ch4_open.line1": "那是一道封印，而封印上是你的笔迹。",
  "ch4_open.line2": "你来过这里。",
  "ch4_open.line3": "只是没有再走出去。",

  // ---- 档案管理员 ------------------------------------------------------
  "archivist_intro.line0": "你迟到了。或者早到了。目录自己都对不上。",
  "archivist_intro.line1": "无论哪种，你都被归在「未决」那一栏。",
  "archivist_intro.choice0": "你是谁？",
  "archivist_intro.choice1": "我没空听这些。",

  "archivist_deflect.line0": "谁都没空。档案馆就是因此存在的。",
  "archivist_deflect.choice0": "好吧，说。",
  "archivist_deflect.choice1": "转身离开。",

  "archivist_relic.line0": "深层书库里有一件遗物。它记得你不记得的事。",
  "archivist_relic.line1": "拿走它，你就要背着别人版本的自己往下走。",
  "archivist_relic.choice0": "我拿。",
  "archivist_relic.choice1": "留在原处。",

  "archivist_took.line0": "当然了。他们都会拿。",
  "archivist_took.line1": "越往下，它会越沉。",
  "archivist_took.choice0": "我会把它还回来。",
  "archivist_took.choice1": "什么也不说。",

  "archivist_refused.line0": "有意思。那这层书架就不开了。",
  "archivist_refused.line1": "你也许是第一个不被它重写的人。",
  "archivist_refused.choice0": "我真正的名字是什么？",
  "archivist_refused.choice1": "什么也不说。",

  "archivist_name.line0": "写在最底下那道封印上。",
  "archivist_name.line1": "是你自己签的。所以它才封得住。",
  "archivist_name.choice0": "……",

  // ---- 阵营分歧 --------------------------------------------------------
  "faction_choice.line0": "两个信号同时抵达，占着同一个频率。",
  "faction_choice.line1": "它们都确信你属于自己。",
  "faction_choice.choice0": "回应主管。",
  "faction_choice.choice1": "回应监视者。",
  "faction_choice.choice2": "念出封印上的名字。",

  "faction_director.line0": "很好。秩序不过是一份维护良好的索引。",
  "faction_director.line1": "继续往下。灯我替你留着。",
  "faction_director.choice0": "明白。",

  "faction_overseer.line0": "主管负责归档。我负责记得。",
  "faction_overseer.line1": "这是有区别的，而你马上就会需要它。",
  "faction_overseer.choice0": "明白。",

  // ---- 可选遭遇 --------------------------------------------------------
  "rooster_mercy.line0": "广播雄鸡没了信号，也没了斗志。",
  "rooster_mercy.choice0": "放它走。",
  "rooster_mercy.choice1": "了结它。",

  "old_memory.line0": "没有机器，却有一段录音在播放。",
  "old_memory.line1": "那是你的声音，正在道歉。",
  "old_memory.choice0": "听到最后。",

  "vat_horse_cage.line0": "培养槽仍然封着。里面的东西还在呼吸。",
  "vat_horse_cage.choice0": "打开它。",
  "vat_horse_cage.choice1": "让它封着。",

  "final_seal.line0": "封印是温的。它一直在等。",
  "final_seal.line1": "打破它，档案馆终结。不打破，终结的是你。",
  "final_seal.choice0": "打破封印。",
  "final_seal.choice1": "让它继续封着。",
};

/**
 * Looks up narrative text. Falls back to English, then to the key itself, so a
 * missing line degrades to something diagnosable on screen instead of crashing
 * a cutscene mid-run.
 */
export function storyText(language: Language, key: string): string {
  if (language === "zh-CN") return ZH[key] ?? EN[key] ?? key;
  return EN[key] ?? key;
}

export function hasStoryText(language: Language, key: string): boolean {
  return (language === "zh-CN" ? ZH[key] ?? EN[key] : EN[key]) !== undefined;
}

/** Exposed for the smoke test's coverage check. */
export function getStoryTextKeys(language: Language): string[] {
  return Object.keys(language === "zh-CN" ? ZH : EN);
}
