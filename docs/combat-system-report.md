# 动作系统调研报告(2026-07-26)

> 由子 agent 对全仓做的 very-thorough 扫描。规模:combat/ 15 文件约 2600 行;DungeonState.ts 3861 行;武器 60、敌人 36、角色 8。

## 1. 战斗主循环与状态机

```
Engine.loop(rAF) → update(dt≤0.1) → input.beginFrame → states[current].update → input.update → draw(320×240)
```

- Engine 状态机 11 个状态;`menu/settings` 走 overlay,激活时主状态停更。
- 房间八阶段:`entering → intro(boss, 0.8s) → locking → combat → cleared(1s) → reward → exiting / exploration`。
- `DungeonState.update` 是约 270 行的顺序敏感流水线;玩家移动在 `updateRoomPhase` 内(需要 boss 演出减速/传送门锁定的 speedMult);死亡检查重复插入 6 次;有 `if (false)` 死代码(:828)。
- 整个 update+draw 包在 try/catch 里,单帧异常被吞——掩盖了下述 mage 崩帧 bug(现已修复)。

## 2. 输入 → 动作管线

- 10 个语义动作(Settings.ts),三设备(键盘/手柄/触屏)在 Input.ts 归一化;另有 UI 动作层带轴导航去抖(0.68/0.35 阈值、420ms 首延迟、方向直切需回中)。
- `suppressUntilReleased()` 防止确认键穿透状态切换。
- 瞄准全自动:锁最近敌人 → 移动方向 → 保持上一角度;michele 的标记目标会覆盖瞄准优先级。
- 加新动作要改 6 处:Settings → Input(手柄映射/提示)→ TouchLayout → DungeonState 分派 → HudLayout。

## 3. 武器系统

- 运行态:`WeaponLoadoutRuntime { slots:[2], activeSlot, swapTimer(未接线) }`,每槽 `resourceType/fireCooldown/resourceState/customState`。
- 5 种资源策略(magazine/battery/heat/charge/action)同接口注册;**双槽后台恢复**是核心卖点:收起武器换弹 ×1.5、冷却 ×1.5、充能 ×1.25。
- 60 把武器仅 13 把显式标 resourceType,其余走 fallback 推断链(maxHeat→heat,manaCost→battery,否则 magazine)。**加新武器务必显式写 resourceType**。
- `WeaponData` 约 90 个可选字段:burst 五 pattern 数组(每发独立伤害/穿透/暴击/颜色/后坐)、linkedShot(primer/catalyst)、条件伤害族(高血加伤/暴击爆炸/贴脸衰减)、attackMode(projectile/melee/channel/yoyo/summon)。
- `fire()` 单函数 235 行,伤害链:`base × channel × burst × appraisal(1.35) × empower(1.5) → crit → volley ×0.5 精度取整`。

## 4. 技能与闪避

- `SKILLS` 按 characterId 索引;长持续技能一律 `cooldownStart:"on_effect_end"` + `disabled_while_active`;减 CD 硬上限 25%。
- 通用闪避硬编码在 DungeonState:位移 0.22s/速度 320、CD 1s、完美窗 0.12s、无敌 0.27s。
- **完美闪避是"反向判定"**:在 DamageSystem.damagePlayer 入口检测"完美窗内本该被击中"才触发,每帧限一次。
- 擦弹只在闪避中判定,半径 +16px,魔法值 hitEnemyIds.add(-2) 标记。

## 5. 伤害结算与 Buff 管线

- `CombatSource.canTriggerBuffs` 授权位杜绝"爆炸→击杀→回能→再爆炸"循环;chain/explosion/environment 全为 false。
- 减伤顺序:完美闪避判定 → 无敌帧 → knight 守卫层 → celestia 临时甲 → 护甲 → HP → phoenix/emergency 保底。
- 状态系统:DoT(poison/burn,叠 3 层,while 补跳)与控制(slow 1.5s / root 0.65s 硬顶,续期递增制)分开;玩家侧受 buff 打折,敌人侧不打折。
- BuffSystem 双模:被动 stat 拉取式聚合 + 触发型事件驱动(buffState 弱类型 bag);41 buff,6 系列,抽卡 6/3/1 权重,同系列 1.8×。

## 6. 已确认的问题清单(按修复价值排序)

1. ✅(已修)`CharacterResource.ts:44` ESM 里用 CommonJS `require` → mage 每次开枪抛异常被引擎吞掉,子弹打不出 + 对象池泄漏。已改为顶部 import。
2. ✅(已修)`WeaponResourceStrategies.ts` 未 import 事件总线,6 个武器资源事件从未 emit → 已补发 reload_started/completed、battery_depleted/full、weapon_overheated、charge_restored,4 个武器模块全部激活。同时:MagazineStrategy 现在消费 `tacticalReloadActive`(战术换弹 +25% 速度);**电池武器的满电强化(isEmpowered ×1.5)改为仅由 OVERCHARGE CELL 模块授予**——这是一次有意的平衡改动,此前所有电池武器无条件享受满电强化,模块形同虚设。
3. ✅(已修)`player_room_cleared` 的 `noDamageTaken` 硬编码 false → 现在 DungeonState 监听 `player_damaged` 逐房跟踪(locking 阶段重置),blood_pact_engine 无伤回血与 perfect_survey 已可触发。
4. ✅(已修)`getWeaponModifiers().damageMultiplier` 已接入 fire() 的基础伤害乘算链 → blood_pact_engine 的 +20% 伤害生效。energyCostMultiplier 仍恒 1(无 buff 使用,保留)。
5. ✅(已修)`BuildProtection.ts` 已重写并接入 `BuffSystem.rollChoices`:同系列加权(协同数决定收敛)、连续 2 轮无同系列后的保底、每轮至少一个机制型 buff;保底计数持久化在 `StageData.buffNoTagStreak`。
6. ⚙(部分完成)记忆天赋已解锁 4/8(弹道/回响/凤凰/禁忌,效果全部实装,重生泉 UI 用 secondary 键循环选择,含仪式文案);协议进化已解锁 2/6(超频核心/神盾铸造厂,效果实装,集齐 3 个同系列协议自动觉醒并播报剧情通知)。其余仍标 experimental,等待路线预览/隐藏房/残像等底层系统。
7. ✅(已修)协同判定分歧:`isSynergyActive` 现在与 `detectActiveSynergies` 一致地跳过 experimental → phoenix_ember 不再"半激活"。
8. ⚙(部分完成)`swapTimer` 已实装:换入武器按类别有 0.15/0.22/0.32s 准备时间(§6.1 建议值),期间无法开火(fire 返回 reason:"swapping"),闪避取消一半剩余准备,交叉换装协议使准备时间减半。channel 独立资源模型与技能 maxCharges 仍缺失。
9. 后 5 名联动角色的机制散落成 `player.xxx` 具名字段 + `characterId === "..."` 硬编码分支(Player.ts 有 17 个角色专属字段),是 8 角色扩展的最大技术债。

> 修复验证:容器内可运行的 13 个冒烟测试全部通过;strict TS 全量错误数与基线持平(414,无新增)。完整 `npm run verify` 请在本地执行。

## 7. 敌人 AI 速览

- 数据链:enemies.ts → EncounterFactory(种子化波次,8 级候选降级链,威胁预算:一波限 1 area、限 1 控制、狭窄房禁 area)→ EnemyFactory(精英化 HP×1.8)→ DungeonState.updateEnemies。
- 攻击三态机 idle→windup→recover,起手瞬间锁定目标位置(可走位躲);boss 三阶段 66%/33% 分界,8 种弹幕 pattern 按 attackSequence 转轮。
- 全局手感旋钮:`ENEMY_ATTACK_RATE_MULTIPLIER = 0.7`。

## 8. 剧情挂点(本次剧情实装所用)

- 六大协议系列 = 六个部门遗产(见 story-bible.md §1.3)。
- 17 个 CombatEvents 可零成本挂纯剧情监听器(加 `src/game/narrative/` 模块,不碰战斗逻辑)。
- 本次已接入:章节引言/区域低语/Boss 开场白/图鉴 lore/广播残片/Old Memory 回退对话/标题句(映射表见 story-bible.md §九)。
- 后续推荐:MemoryTalents(局前仪式性长文本 + forbidden_memory 污染线)与 ProtocolEvolutions(一局一次的高光独白)——解锁它们与写文案可以是同一个任务。
