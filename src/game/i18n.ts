import type { InputAction } from "./Settings";

export type Language = "en" | "zh-CN";

type Params = Record<string, string | number>;

const EN = {
  "language.english": "ENGLISH",
  "language.chinese": "中文",
  "common.on": "ON",
  "common.off": "OFF",
  "common.auto": "AUTO",
  "common.enter": "ENTER",
  "common.toggle": "TOGGLE",
  "common.download": "DOWNLOAD",
  "common.select": "SELECT",
  "common.reset": "RESET",
  "common.ready": "READY",
  "common.max": "MAX",
  "common.locked": "LOCKED",
  "common.found": "FOUND",
  "common.hidden": "HIDDEN",
  "common.sold": "SOLD",
  "common.coins": "COINS",
  "common.shards": "SHARDS",
  "common.normal": "NORMAL",
  "common.hard": "HARD",
  "common.enabled": "ENABLED",
  "common.disabled": "DISABLED",
  "common.move": "MOVE",
  "common.buy": "BUY",
  "common.exit": "EXIT",
  "common.take": "TAKE",
  "common.cycle": "CYCLE",
  "common.page": "PAGE",
  "common.back": "BACK",
  "common.menu": "MENU",
  "common.resume": "RESUME",
  "value.adaptive": "ADAPTIVE",
  "value.external": "EXTERNAL",
  "value.gamepad": "GAMEPAD",
  "value.keyboard": "KEYBOARD",
  "value.right": "RIGHT",
  "value.left": "LEFT",
  "value.deuteranopia": "DEUTERANOPIA",
  "value.tritanopia": "TRITANOPIA",
  "title.newRun": "NEW RUN",
  "title.continue": "CONTINUE",
  "title.hub": "HUB",
  "title.settings": "SETTINGS",
  "title.stats": "SHARDS {shards}  STAGE {stage}  WINS {wins}  BEST {best}",
  "settings.title": "SYSTEM SETTINGS",
  "settings.controlsTitle": "CONTROL BINDINGS",
  "settings.language": "LANGUAGE",
  "settings.masterVolume": "MASTER VOLUME",
  "settings.musicVolume": "MUSIC VOLUME",
  "settings.musicSource": "MUSIC SOURCE",
  "settings.uiScale": "UI SCALE",
  "settings.screenShake": "SCREEN SHAKE",
  "settings.crtFilter": "CRT FILTER",
  "settings.reducedFlash": "REDUCED FLASH",
  "settings.dynamicBg": "DYNAMIC BG",
  "settings.colorMode": "COLOR MODE",
  "settings.touchControls": "TOUCH CONTROLS",
  "settings.touchLayout": "TOUCH LAYOUT",
  "settings.touchSize": "TOUCH SIZE",
  "settings.touchLabels": "TOUCH LABELS",
  "settings.controls": "CONTROLS",
  "settings.fullscreen": "FULLSCREEN",
  "settings.exportData": "EXPORT DATA",
  "settings.importData": "IMPORT DATA",
  "settings.resetTutorial": "RESET TUTORIAL",
  "settings.footer": "↑↓ MOVE   ←→ CHANGE   ENTER   [{cancel}] BACK",
  "settings.controlsFooter": "ENTER BIND   R RESET   [{cancel}] BACK",
  "settings.rebindHelp": "ENTER: REBIND // R: RESET KEYS",
  "settings.fullscreenToggled": "FULLSCREEN TOGGLED",
  "settings.exportRequested": "EXPORT REQUESTED",
  "settings.selectSave": "SELECT A SAVE FILE",
  "settings.tutorialNextRun": "TUTORIAL WILL START ON NEXT RUN",
  "settings.rebindCancelled": "REBIND CANCELLED",
  "settings.keysReset": "KEY BINDINGS RESET",
  "settings.bound": "{action} BOUND TO {key}",
  "settings.pressKey": "PRESS A KEY FOR {action}",
  "settings.updated": "{option} UPDATED",
  "settings.pressKeyShort": "PRESS KEY",
  "status.exported": "SAVE DATA EXPORTED",
  "status.imported": "SAVE DATA IMPORTED",
  "status.importFailed": "SAVE IMPORT FAILED",
  "status.fullscreenEnabled": "FULLSCREEN ENABLED",
  "status.fullscreenDisabled": "FULLSCREEN DISABLED",
  "status.fullscreenUnavailable": "FULLSCREEN UNAVAILABLE",
  "action.moveUp": "MOVE UP",
  "action.moveDown": "MOVE DOWN",
  "action.moveLeft": "MOVE LEFT",
  "action.moveRight": "MOVE RIGHT",
  "action.fire": "FIRE",
  "action.skill": "SKILL",
  "action.interact": "INTERACT",
  "action.swapWeapon": "SWAP WEAPON",
  "action.pause": "PAUSE",
  "tutorial.move": "MOVE",
  "tutorial.fire": "FIRE",
  "tutorial.skill": "SKILL",
  "tutorial.interact": "INTERACT",
  "tutorial.swap": "SWAP",
  "prompt.descend": "DESCEND",
  "prompt.memory": "MEMORY",
  "prompt.tactics": "TACTICS",
  "prompt.open": "OPEN",
  "prompt.shop": "SHOP",
  "prompt.tuneIn": "TUNE IN",
  "dungeon.roomClear": "ROOM CLEAR",
  "dungeon.died": "YOU DIED",
  "dungeon.retry": "[{prompt}] RETRY",
  "pause.title": "PAUSED",
  "pause.useSkill": "SKILL (GAMEPLAY)",
  "pause.swapWeapon": "SWAP WEAPON",
  "pause.skill": "SKILL",
  "pause.loadout": "LOADOUT",
  "pause.active": "ACTIVE {seconds}S",
  "pause.cooldown": "COOLDOWN {remaining} / {total}S",
  "pause.weaponStats": "{style} // DMG {damage} // EN {energy}",
  "pause.footer": "[{cancel}] BACK   [{menu}] MENU   [{pause}] RESUME",
  "buff.title": "TALENT",
  "buff.footer": "[{cycle}] CYCLE   [{confirm}] TAKE{reroll}",
  "buff.reroll": "   R ×{count}",
  "shop.title": "SHOP",
  "shop.coins": "COINS {coins}",
  "shop.talent": "TALENT",
  "shop.weapon": "WEAPON",
  "shop.heal": "HEAL",
  "shop.armor": "ARMOR",
  "shop.price": "{price} COINS",
  "shop.footer": "[{cycle}] MOVE   [{confirm}] BUY   [{close}] EXIT",
  "shop.medkit": "FIELD MEDKIT",
  "shop.medkitDesc": "Restore {amount} HP.",
  "shop.armorPatch": "ARMOR PATCH",
  "shop.armorPatchDesc": "Restore {amount} Armor.",
  "shop.failure.sold": "ITEM ALREADY SOLD",
  "shop.failure.coins": "NOT ENOUGH COINS",
  "shop.failure.full_hp": "HP ALREADY FULL",
  "shop.failure.full_armor": "ARMOR ALREADY FULL",
  "shop.failure.owned_weapon": "WEAPON ALREADY OWNED",
  "shop.failure.owned_buff": "TALENT ALREADY OWNED",
  "shop.failure.buff_limit": "TALENT LIMIT REACHED",
  "shop.failure.invalid": "ITEM UNAVAILABLE",
  "hub.title": "THE DEEP HUB",
  "hub.header": "SHARDS {shards} // ACH {achievements}/6 // TRIALS {trials}",
  "hub.prepare": "SPACE: PREPARE RUN",
  "hub.hardLockedMessage": "HARD MODE: COMPLETE A RUN FIRST",
  "hub.hardState": "HARD MODE {state}",
  "hub.challengeNeedsHard": "ENABLE HARD MODE BEFORE SELECTING A CHALLENGE",
  "hub.challengeSelected": "{name} SELECTED",
  "hub.challengeDisabled": "CHALLENGE DISABLED",
  "hub.refundConfirm": "PRESS Y TO REFUND ALL UPGRADES",
  "hub.refunded": "REFUNDED {amount} SHARDS",
  "hub.noRefund": "NO UPGRADES TO REFUND",
  "hub.upgraded": "{name} UPGRADED",
  "hub.maxed": "UPGRADE ALREADY MAXED",
  "hub.needShards": "NEED {amount} SHARDS",
  "hub.level": "LV {level}/{max}",
  "hub.hardLine": "H HARD {state}  +50% SHARDS",
  "hub.hardLocked": "H HARD LOCKED",
  "hub.challengeLine": "C {name}  {state}  +{reward}",
  "hub.footer": "ENTER BUY   SPACE RUN   A ARCHIVE   H/C MODE",
  "character.title": "SELECT CHARACTER",
  "character.runMode": "RUN MODE: {mode}",
  "character.defaultWeapon": "DEF: {weapon}",
  "character.unlockMage": "UNLOCK: REACH 2-1 OR EARN 50 SHARDS",
  "character.unlockRogue": "UNLOCK: WIN A RUN OR EARN 120 SHARDS",
  "character.footer": "←→ CHARACTER   ENTER START   [{cancel}] BACK",
  "records.title": "ARCHIVE RECORDS",
  "records.achievements": "ACHIEVEMENTS",
  "records.enemies": "ENEMIES",
  "records.bosses": "BOSSES",
  "records.weapons": "WEAPONS",
  "records.talents": "TALENTS",
  "records.footer": "Q/E PAGE   W/S SELECT   [{cancel}] BACK",
  "records.reward": "(+{reward} Shards)",
  "result.complete": "RUN COMPLETE",
  "result.terminated": "RUN TERMINATED",
  "result.victoryLine": "THE CORE HAS FALLEN",
  "result.defeatLine": "THE DELVE CLAIMED YOU",
  "result.hardBonus": "HARD MODE // SOUL SHARDS x1.5",
  "result.time": "TIME",
  "result.stage": "FURTHEST STAGE",
  "result.rooms": "ROOMS CLEARED",
  "result.enemies": "ENEMIES",
  "result.elites": "ELITES",
  "result.bosses": "BOSSES",
  "result.claimed": "REWARD ALREADY CLAIMED",
  "result.reward": "+{amount} SOUL SHARDS",
  "result.total": "TOTAL SHARDS: {amount}",
  "result.breakdown": "RUN {run} | CHALLENGE {challenge} | ACHIEVEMENT {achievement}",
  "result.challenge": "CHALLENGE COMPLETE: {name}",
  "result.unlocked": "UNLOCKED: {items}",
  "result.titleButton": "ENTER TITLE",
  "result.hubButton": "R HUB",
  "rarity.common": "COMMON",
  "rarity.uncommon": "UNCOMMON",
  "rarity.rare": "RARE",
  "rarity.legendary": "LEGENDARY",
  "category.weapon": "WEAPON",
  "category.defense": "DEFENSE",
  "category.skill": "SKILL",
  "category.sidearm": "SIDEARM",
  "category.shotgun": "SHOTGUN",
  "category.energy": "ENERGY",
  "category.rifle": "RIFLE",
  "category.smg": "SMG",
  "category.launcher": "LAUNCHER",
  "category.special": "SPECIAL",
  "series.vanguard": "VANGUARD",
  "series.aether": "AETHER",
  "series.phoenix": "PHOENIX",
  "projectile.bullet": "BULLET",
  "projectile.tracer": "TRACER",
  "projectile.beam": "BEAM",
  "projectile.lightning": "LIGHTNING",
  "projectile.plasma": "PLASMA",
  "projectile.flame": "FLAME",
  "projectile.rocket": "ROCKET",
  "projectile.disc": "DISC",
} as const;

type TranslationKey = keyof typeof EN;

const ZH: Partial<Record<TranslationKey, string>> = {
  "language.english": "英文",
  "language.chinese": "中文",
  "common.on": "开启",
  "common.off": "关闭",
  "common.auto": "自动",
  "common.enter": "确认",
  "common.toggle": "切换",
  "common.download": "下载",
  "common.select": "选择",
  "common.reset": "重置",
  "common.ready": "就绪",
  "common.max": "满级",
  "common.locked": "未解锁",
  "common.found": "已发现",
  "common.hidden": "未发现",
  "common.sold": "已售出",
  "common.coins": "金币",
  "common.shards": "碎片",
  "common.normal": "普通",
  "common.hard": "困难",
  "common.enabled": "已开启",
  "common.disabled": "已关闭",
  "common.move": "移动",
  "common.buy": "购买",
  "common.exit": "退出",
  "common.take": "获取",
  "common.cycle": "切换",
  "common.page": "翻页",
  "common.back": "返回",
  "common.menu": "菜单",
  "common.resume": "继续",
  "value.adaptive": "自适应",
  "value.external": "外部音乐",
  "value.gamepad": "手柄",
  "value.keyboard": "键盘",
  "value.right": "右手",
  "value.left": "左手",
  "value.deuteranopia": "红绿色觉",
  "value.tritanopia": "蓝黄色觉",
  "title.newRun": "新游戏",
  "title.continue": "继续游戏",
  "title.hub": "深潜基地",
  "title.settings": "设置",
  "title.stats": "碎片 {shards}  关卡 {stage}  胜场 {wins}  最佳 {best}",
  "settings.title": "系统设置",
  "settings.controlsTitle": "按键绑定",
  "settings.language": "语言",
  "settings.masterVolume": "主音量",
  "settings.musicVolume": "音乐音量",
  "settings.musicSource": "音乐来源",
  "settings.uiScale": "界面缩放",
  "settings.screenShake": "屏幕震动",
  "settings.crtFilter": "CRT 滤镜",
  "settings.reducedFlash": "降低闪光",
  "settings.dynamicBg": "动态背景",
  "settings.colorMode": "色觉模式",
  "settings.touchControls": "触屏控制",
  "settings.touchLayout": "触屏布局",
  "settings.touchSize": "按键尺寸",
  "settings.touchLabels": "按键文案",
  "settings.controls": "按键设置",
  "settings.fullscreen": "全屏",
  "settings.exportData": "导出存档",
  "settings.importData": "导入存档",
  "settings.resetTutorial": "重置教程",
  "settings.footer": "↑↓ 移动   ←→ 修改   确认   [{cancel}] 返回",
  "settings.controlsFooter": "确认绑定   R 重置   [{cancel}] 返回",
  "settings.rebindHelp": "确认：重新绑定 // R：重置按键",
  "settings.fullscreenToggled": "已切换全屏",
  "settings.exportRequested": "正在导出存档",
  "settings.selectSave": "请选择存档文件",
  "settings.tutorialNextRun": "教程将在下次游戏开始",
  "settings.rebindCancelled": "已取消绑定",
  "settings.keysReset": "按键已重置",
  "settings.bound": "{action} 已绑定至 {key}",
  "settings.pressKey": "请为 {action} 按下按键",
  "settings.updated": "{option} 已更新",
  "settings.pressKeyShort": "请按键",
  "status.exported": "存档已导出",
  "status.imported": "存档已导入",
  "status.importFailed": "存档导入失败",
  "status.fullscreenEnabled": "已进入全屏",
  "status.fullscreenDisabled": "已退出全屏",
  "status.fullscreenUnavailable": "当前环境不支持全屏",
  "action.moveUp": "向上移动",
  "action.moveDown": "向下移动",
  "action.moveLeft": "向左移动",
  "action.moveRight": "向右移动",
  "action.fire": "射击",
  "action.skill": "技能",
  "action.interact": "交互",
  "action.swapWeapon": "切换武器",
  "action.pause": "暂停",
  "tutorial.move": "移动",
  "tutorial.fire": "射击",
  "tutorial.skill": "技能",
  "tutorial.interact": "交互",
  "tutorial.swap": "换枪",
  "prompt.descend": "下潜",
  "prompt.memory": "进入记忆",
  "prompt.tactics": "战术演练",
  "prompt.open": "打开",
  "prompt.shop": "交易",
  "prompt.tuneIn": "收听广播",
  "dungeon.roomClear": "房间已清理",
  "dungeon.died": "你已死亡",
  "dungeon.retry": "[{prompt}] 重试",
  "pause.title": "已暂停",
  "pause.useSkill": "技能（战斗中）",
  "pause.swapWeapon": "切换武器",
  "pause.skill": "技能",
  "pause.loadout": "装备",
  "pause.active": "生效中 {seconds}秒",
  "pause.cooldown": "冷却 {remaining} / {total}秒",
  "pause.weaponStats": "{style} // 伤害 {damage} // 能量 {energy}",
  "pause.footer": "[{cancel}] 返回   [{menu}] 菜单   [{pause}] 继续",
  "buff.title": "天赋",
  "buff.footer": "[{cycle}] 切换   [{confirm}] 获取{reroll}",
  "buff.reroll": "   R ×{count}",
  "shop.title": "商店",
  "shop.coins": "金币 {coins}",
  "shop.talent": "天赋",
  "shop.weapon": "武器",
  "shop.heal": "治疗",
  "shop.armor": "护甲",
  "shop.price": "{price} 金币",
  "shop.footer": "[{cycle}] 移动   [{confirm}] 购买   [{close}] 退出",
  "shop.medkit": "战地医疗包",
  "shop.medkitDesc": "恢复 {amount} 点生命。",
  "shop.armorPatch": "护甲补片",
  "shop.armorPatchDesc": "恢复 {amount} 点护甲。",
  "shop.failure.sold": "该商品已售出",
  "shop.failure.coins": "金币不足",
  "shop.failure.full_hp": "生命值已满",
  "shop.failure.full_armor": "护甲已满",
  "shop.failure.owned_weapon": "已拥有该武器",
  "shop.failure.owned_buff": "已拥有该天赋",
  "shop.failure.buff_limit": "天赋栏已满",
  "shop.failure.invalid": "商品不可用",
  "hub.title": "深潜基地",
  "hub.header": "碎片 {shards} // 成就 {achievements}/6 // 挑战 {trials}",
  "hub.prepare": "SPACE：准备出发",
  "hub.hardLockedMessage": "请先完成一次游戏以解锁困难模式",
  "hub.hardState": "困难模式{state}",
  "hub.challengeNeedsHard": "请先开启困难模式再选择挑战",
  "hub.challengeSelected": "已选择 {name}",
  "hub.challengeDisabled": "已关闭挑战",
  "hub.refundConfirm": "按 Y 返还全部升级",
  "hub.refunded": "已返还 {amount} 碎片",
  "hub.noRefund": "没有可返还的升级",
  "hub.upgraded": "{name} 已升级",
  "hub.maxed": "该升级已满级",
  "hub.needShards": "还需要 {amount} 碎片",
  "hub.level": "等级 {level}/{max}",
  "hub.hardLine": "H 困难 {state}  +50% 碎片",
  "hub.hardLocked": "H 困难模式未解锁",
  "hub.challengeLine": "C {name}  {state}  +{reward}",
  "hub.footer": "确认购买   SPACE 出发   A 档案   H/C 模式",
  "character.title": "选择角色",
  "character.runMode": "游戏模式：{mode}",
  "character.defaultWeapon": "默认：{weapon}",
  "character.unlockMage": "解锁：到达 2-1 或获得 50 碎片",
  "character.unlockRogue": "解锁：完成一次游戏或获得 120 碎片",
  "character.footer": "←→ 角色   确认开始   [{cancel}] 返回",
  "records.title": "档案记录",
  "records.achievements": "成就",
  "records.enemies": "敌人",
  "records.bosses": "首领",
  "records.weapons": "武器",
  "records.talents": "天赋",
  "records.footer": "Q/E 翻页   W/S 选择   [{cancel}] 返回",
  "records.reward": "（+{reward} 碎片）",
  "result.complete": "游戏完成",
  "result.terminated": "游戏终止",
  "result.victoryLine": "深层核心已被摧毁",
  "result.defeatLine": "你被深渊吞没",
  "result.hardBonus": "困难模式 // 灵魂碎片 ×1.5",
  "result.time": "用时",
  "result.stage": "最深关卡",
  "result.rooms": "清理房间",
  "result.enemies": "敌人",
  "result.elites": "精英",
  "result.bosses": "首领",
  "result.claimed": "奖励已领取",
  "result.reward": "+{amount} 灵魂碎片",
  "result.total": "碎片总数：{amount}",
  "result.breakdown": "游戏 {run} | 挑战 {challenge} | 成就 {achievement}",
  "result.challenge": "挑战完成：{name}",
  "result.unlocked": "已解锁：{items}",
  "result.titleButton": "确认返回标题",
  "result.hubButton": "R 返回基地",
  "rarity.common": "普通",
  "rarity.uncommon": "优秀",
  "rarity.rare": "稀有",
  "rarity.legendary": "传奇",
  "category.weapon": "武器",
  "category.defense": "防御",
  "category.skill": "技能",
  "category.sidearm": "手枪",
  "category.shotgun": "霰弹枪",
  "category.energy": "能量武器",
  "category.rifle": "步枪",
  "category.smg": "冲锋枪",
  "category.launcher": "发射器",
  "category.special": "特殊武器",
  "series.vanguard": "先锋",
  "series.aether": "以太",
  "series.phoenix": "凤凰",
  "projectile.bullet": "子弹",
  "projectile.tracer": "曳光弹",
  "projectile.beam": "射线",
  "projectile.lightning": "闪电",
  "projectile.plasma": "等离子",
  "projectile.flame": "火焰",
  "projectile.rocket": "火箭",
  "projectile.disc": "圆盘",
};

const BUFF_ZH: Record<string, { name: string; description: string }> = {
  scattershot: { name: "弹道校准器", description: "散布 -30%，暴击率 +5%。" },
  rapid_fire: { name: "扳机纪律", description: "散布 -20%，弹速 +12%。" },
  heavy_rounds: { name: "空尖弹套件", description: "暴击伤害 +35%，击退 +3。" },
  critical_focus: { name: "暴击专注", description: "暴击率 +15%。" },
  piercing_shots: { name: "相位弹药", description: "弹丸可额外穿透一个敌人。" },
  rebound_rounds: { name: "反弹弹药", description: "弹丸可从墙壁反弹一次。" },
  reinforced_heart: { name: "强化心核", description: "最大生命 +2，并恢复 2 点生命。" },
  armor_capacitor: { name: "护甲电容", description: "最大护甲 +2，并恢复 2 点护甲。" },
  fast_recharge: { name: "快速充能", description: "护甲回复等待时间减少 35%。" },
  emergency_barrier: { name: "紧急屏障", description: "可抵挡一次致命伤害，并保留 1 点生命。" },
  skill_accelerator: { name: "技能加速器", description: "技能冷却时间减少 20%。" },
  energy_feedback: { name: "能量反馈", description: "使用技能时恢复 5 点能量。" },
  status_resistance: { name: "净化核心", description: "负面状态持续时间减少 40%。" },
  capacitor_cell: { name: "能量电容", description: "最大能量 +8，并恢复 8 点能量。" },
  flux_regulator: { name: "通量调节器", description: "能量回复速度 +25%。" },
  elemental_rounds: { name: "余烬载荷", description: "玩家弹丸会附加燃烧。" },
  overclock_core: { name: "超频核心", description: "暴击率 +12%，散布 -30%，弹速 +15%。" },
  execution_matrix: { name: "处决矩阵", description: "暴击率 +20%，暴击伤害 +50%。" },
  phase_storm: { name: "相位风暴", description: "弹丸获得穿透、墙壁反弹与 +15% 弹速。" },
  mana_well: { name: "能量之井", description: "最大能量 +12，回复等待时间 -25%。" },
  skill_loop: { name: "技能循环", description: "技能冷却 -25%；使用技能恢复 7 点能量。" },
  entropy_engine: { name: "熵能引擎", description: "击杀恢复 2 点能量，回复等待时间 -20%。" },
  aegis_foundry: { name: "神盾铸炉", description: "最大护甲 +4，护甲回复速度 +75%。" },
  reactive_plating: { name: "反应装甲", description: "护甲等待时间降至 1 秒；负面状态时间 -50%。" },
  phoenix_protocol: { name: "凤凰协议", description: "可抵挡一次致命伤害，保留 2 点生命并恢复 3 点护甲。" },
};

const WEAPON_MECHANIC_ZH: Record<string, string> = {
  pistol: "可靠的零能耗常规手枪。",
  shotgun: "近距离发射五枚大范围散弹。",
  laser: "高速射线，拥有较长的发光轨迹。",
  bell_repeater: "快速发射带铃声感的曳光弹。",
  mask_sprayer: "喷射短寿命减速粒子。",
  code_scanner: "扫描射线可连续穿透多个目标。",
  swab_lance: "重型长弹离膛后会继续加速。",
  vat_horse_cannon: "发射三枚可反弹的燃烧等离子弹。",
  service_revolver: "零能耗重弹，拥有较高暴击率。",
  nail_driver: "免费高速钉弹，可穿透一个目标。",
  liberator: "粗糙的单发手枪：缓慢、不准，但威力极高。",
  vector_9: "零能耗超高射速冲锋枪，单发伤害很低。",
  plasma_caster: "缓慢的等离子球会向附近敌人转向。",
  tesla_carbine: "闪电命中后可继续连锁两个目标。",
  ripper_disc: "旋转圆盘可穿透敌人并反弹三次。",
  micro_rocket: "追踪火箭命中后造成范围爆炸。",
  kingmaker: "高口径曳光弹可穿透一个目标。",
  storm_repeater: "双发闪电弹可从墙壁反弹。",
  starfall_array: "五枚轻度追踪的星形等离子弹。",
  void_rail: "贯穿房间的轨道射线，可连续穿透六个目标。",
  dragon_breath: "喷射十二枚附带燃烧的火焰粒子。",
  siege_breaker: "大型攻城火箭反弹后会产生范围爆炸。",
  ballistic_knife: "投掷刀刃可穿透多个敌人。",
  olympia: "经典双管散弹枪，近距离爆发极高。",
  ksg_12: "精确独头弹霰弹枪，拥有强大穿透力。",
  akimbo_scorpion: "双持冲锋枪释放高速弹幕。",
  scavenger: "爆炸狙击弹命中后产生巨大范围伤害。",
  venom_x: "毒性追踪弹会留下腐蚀效果。",
  ray_gun: "经典奇迹武器，发射爆炸等离子弹。",
  wunderwaffe: "闪电会在敌人之间连续跳跃。",
};

const ACHIEVEMENT_ZH: Record<string, { name: string; description: string }> = {
  first_blood: { name: "初次见血", description: "击败第一个敌人。" },
  elite_breaker: { name: "精英粉碎者", description: "在所有游戏中累计击败 10 个精英敌人。" },
  boss_untouched: { name: "毫发无伤", description: "击败首领时不受到该首领造成的伤害。" },
  one_weapon: { name: "一枪到底", description: "只使用一种武器完成一次游戏。" },
  speed_runner: { name: "时间破坏者", description: "在 15 分钟内完成一次游戏。" },
  hard_conqueror: { name: "更深一层", description: "完成一次困难模式游戏。" },
};

const CHALLENGE_ZH: Record<string, { name: string; description: string; shortObjective: string }> = {
  elite_hunt: { name: "精英狩猎", description: "击败至少 5 个精英敌人。", shortObjective: "击败 5 个精英" },
  pistol_oath: { name: "手枪誓约", description: "只使用旧式手枪完成游戏。", shortObjective: "仅用手枪获胜" },
  speed_trial: { name: "极速试炼", description: "在 15 分钟内完成游戏。", shortObjective: "15 分钟内获胜" },
};

const META_ZH: Record<string, { name: string; description: string }> = {
  vitality: { name: "活力核心", description: "每级最大生命 +1。" },
  armor: { name: "装甲框架", description: "每级初始与最大护甲 +1。" },
  starting_coins: { name: "战地津贴", description: "每级初始金币 +10。" },
  buff_reroll: { name: "命运中继器", description: "每级每局可额外重抽一次天赋。" },
  shop_discount: { name: "商人网络", description: "每级商店价格降低 5%。" },
  supply_drop: { name: "回收协议", description: "每级敌人补给掉落概率 +5%。" },
};

const CHARACTER_ZH: Record<string, { title: string; passive: string }> = {
  knight: { title: "坚守者", passive: "护甲充满时获得守卫，使下一次受到的伤害减少 1 点。" },
  mage: { title: "求知者", passive: "清理战斗房间后恢复 8 点能量。" },
  rogue: { title: "迅捷者", passive: "冲刺后 2 秒内暴击率 +25%。" },
};

export function normalizeLanguage(value: unknown): Language {
  return value === "zh-CN" ? "zh-CN" : "en";
}

export function t(language: Language, key: TranslationKey, params: Params = {}): string {
  const template = language === "zh-CN" ? ZH[key] ?? EN[key] : EN[key];
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}

export function actionLabel(action: InputAction, language: Language): string {
  return t(language, `action.${action}` as TranslationKey);
}

export function getBuffText(id: string, fallback: { name: string; description: string }, language: Language) {
  return language === "zh-CN" && BUFF_ZH[id] ? BUFF_ZH[id] : fallback;
}

export function getWeaponMechanic(id: string, fallback: string, language: Language): string {
  return language === "zh-CN" ? WEAPON_MECHANIC_ZH[id] ?? fallback : fallback;
}

export function getAchievementText(id: string, fallback: { name: string; description: string }, language: Language) {
  return language === "zh-CN" && ACHIEVEMENT_ZH[id] ? ACHIEVEMENT_ZH[id] : fallback;
}

export function getChallengeText(id: string, fallback: { name: string; description: string; shortObjective: string }, language: Language) {
  return language === "zh-CN" && CHALLENGE_ZH[id] ? CHALLENGE_ZH[id] : fallback;
}

export function getMetaUpgradeText(id: string, fallback: { name: string; description: string }, language: Language) {
  return language === "zh-CN" && META_ZH[id] ? META_ZH[id] : fallback;
}

export function getCharacterText(id: string, fallback: { title: string; passive: string }, language: Language) {
  return language === "zh-CN" && CHARACTER_ZH[id] ? CHARACTER_ZH[id] : fallback;
}

export function rarityLabel(rarity: string, language: Language): string {
  const key = `rarity.${rarity}` as TranslationKey;
  return key in EN ? t(language, key) : rarity.toUpperCase();
}

export function categoryLabel(category: string, language: Language): string {
  const key = `category.${category}` as TranslationKey;
  return key in EN ? t(language, key) : category.toUpperCase();
}

export function seriesLabel(series: string, language: Language): string {
  const key = `series.${series}` as TranslationKey;
  return key in EN ? t(language, key) : series.toUpperCase();
}

export function projectileLabel(style: string, language: Language): string {
  const key = `projectile.${style}` as TranslationKey;
  return key in EN ? t(language, key) : style.toUpperCase();
}

export function uiFont(language: Language, size: number, bold = false): string {
  const weight = bold ? "bold " : "";
  return language === "zh-CN"
    ? `${weight}${Math.max(6, size)}px "Noto Sans SC", "Microsoft YaHei", sans-serif`
    : `${weight}${size}px monospace`;
}

export function wrapLocalized(text: string, maxColumns: number): string[] {
  if (!/[\u3400-\u9FFF]/.test(text)) {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxColumns && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  const lines: string[] = [];
  let line = "";
  let width = 0;
  for (const char of Array.from(text)) {
    const charWidth = /[\u3400-\u9FFF]/.test(char) ? 2 : char === " " ? 1 : 1;
    if (width + charWidth > maxColumns && line) {
      lines.push(line.trim());
      line = "";
      width = 0;
    }
    line += char;
    width += charWidth;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}
