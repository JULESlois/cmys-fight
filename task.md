基于当前 main 进行稳定化修复。

本轮目标是修复已确认的运行时错误，并审查后续系统是否真正接入。不要新增大规模内容，不修改门、宝箱、Hub 建筑和美术。

第一步修复武器运行时持久化。

当前保存了完整 weaponLoadout，但 DungeonState 创建玩家时只读取 weaponId 并重新初始化运行时，导致弹匣、电池、热量、充能、fireCooldown、reloadTimer 和 customState 丢失。

新增统一的：

- normalizeWeaponRuntimeState
- normalizeWeaponLoadoutRuntime
- cloneWeaponLoadoutRuntime

GameData 与 DungeonState 必须共用这些函数。

加载 Dungeon 时直接恢复已保存的完整运行时。只有单个槽位数据非法时才重建该槽，不能因为进入房间或读档而重置全部资源。

增加真实往返测试：

创建运行时
→ 修改弹药、电池、热量、充能、冷却和 customState
→ 序列化
→ 加载
→ 所有状态保持一致

修复 WeaponController.equipWeapon 双槽已满时的替换逻辑。禁止继续修改：

player.weaponLoadout.slots.map(...)

产生的临时数组。必须实际替换：

player.weaponLoadout.slots[player.weaponLoadout.activeSlot] =
  createWeaponRuntimeState(weaponId)

并正确返回被替换武器 ID。

第二步检查换枪系统。

如果 swapTimer 已经进入正式设计，则让它真正控制换枪准备时间；如果当前 UI 和操作尚未准备好，则保留字段但不要做半完成的延迟换枪。

无论采用立即换枪还是延迟换枪，都必须保证：

- 两个槽位资源状态独立；
- 收起武器能够继续换弹、冷却或恢复充能；
- 换枪不会重置另一把武器；
- 换枪不会错误清除当前武器全部 customState；
- player_weapon_swapped 只在实际切换成功时发送一次。

不要仅因为 task.md 曾要求准备时间，就强制增加新的操作延迟。以当前游戏手感和已有设计为准。

第三步修复技能和事件重复结算。

检查 SkillController.activate 和 skill_activated 事件监听器。任何技能回能、Buff 触发和协同触发只能结算一次。

选择一个唯一入口：

- 推荐由事件处理器负责 Buff 和协同效果；
- SkillController 只处理技能基础行为。

删除重复的直接 Buff 回能调用。

技能冷却缩减上限不要机械恢复成 task.md 的旧数值。先确认当前设计文档、Buff 描述和测试采用的是 15% 还是 25%，统一为一个常量，并确保所有技能都使用同一计算入口。

增加测试：

- 单次技能只恢复一次资源；
- on_activate 技能立即开始冷却；
- on_effect_end 技能效果结束后才开始冷却；
- 持续技能不能通过冷却缩减永久覆盖；
- 激活失败时不发送 skill_activated。

第四步修复事件来源信息。

player_hit_enemy 和 player_kill_enemy 必须携带实际造成伤害的 sourceWeaponId 或 sourceId。不能在投射物命中时读取 player.currentWeaponId，因为玩家可能已经换枪。

投射物创建时保存：

- sourceWeaponId
- sourceSlot
- sourceAttackId
- 是否允许再次触发协同

命中事件使用投射物携带的来源数据。

检查交替武器、换枪、连锁、反弹、穿透和击杀类 Buff，避免：

- 同一攻击重复触发；
- 反弹后被当作另一把武器；
- 连锁伤害再次生成连锁；
- 换枪后旧投射物使用新武器结算。

第五步审查 Buff、协同、记忆天赋和协议进化。

不要按照 task.md 的数量删减系统。逐个分类：

A. 已完整实现并接入正式流程：
保留并增加运行时测试。

B. 数据存在、效果只实现了一部分：
保留定义，但从正式随机池、商店、Hub 选择或进化入口暂时隔离。

C. 只有描述、注释或设置 flag，没有消费方：
标记 experimental，不得在正常游戏中获得。

重点检查：

- execution_window 是否真的判断处决阈值；
- alternating_current 是否真的使用两秒窗口和 sourceWeaponId；
- graze_relay 是否来自真实擦弹，而不是完美闪避替代；
- battlefield_salvage 是否监听真实场景物破坏；
- entropy 限制是否使用真实时间；
- 六个协同是否都有实际效果和防递归；
- 记忆天赋是否能够选择、保存、加载和重置；
- 协议进化设置的 flag 是否有运行时代码读取。

不要删除尚未完成的定义，但未闭环内容不能继续出现在正常奖励池。

第六步修复路线系统的一致性。

worldNodeId 应决定节点身份，包括：

- 地图视觉主题；
- 敌人池；
- 危险类型；
- 奖励倾向；
- 出口预览。

routeDepth 只负责难度和流程深度。

生成 Stage 时优先读取：

WORLD_NODES[progress.worldNodeId]

不要继续只根据 routeDepth 循环 forest、dungeon、snow、lava，除非节点没有合法定义时才使用兼容 fallback。

advanceToNode 必须验证目标属于当前节点出口，并且出口状态为 available。

修复 routeHistory 浅复制：

const next = {
  ...progress,
  routeHistory: [...progress.routeHistory],
}

然后再 push，不能修改旧对象中的数组。

StageData、存档兼容检查和生成种子必须包含 worldNodeId，避免选择路线后继续加载旧节点地图。

不要因为 task.md 只描述少量节点就禁用现有路线图。现有节点可以保留，但每个可到达节点必须至少具备合法主题、敌人池、Boss 和出口。未完成节点应从可达出口中移除，而不是删除节点定义。

第七步检查隐藏房和双出口闭环。

隐藏房必须验证：

- 未发现时小地图不显示正式房间；
- 未发现时普通门逻辑不能直接进入；
- 有可感知但不直白的入口提示；
- 至少一种通用攻击方式能够发现入口；
- hiddenDiscovered 能保存和恢复；
- 发现后门连接和小地图同步更新；
- 奖励可以正常取得且不会重复生成。

双出口必须验证：

- 只在正确的章节节点出现；
- 两个出口目标不同；
- 预览读取真实节点数据；
- 选择一个后另一个变为 skipped；
- 不能重复选择；
- 进入下一节点后主题、敌人和危险确实变化；
- 保存和重新进入后选择结果不丢失。

第八步清理仓库。

删除不应进入正式源码的：

- WeaponController.ts.orig
- 临时 test-lastprism 脚本
- 临时 test-na45 脚本
- 正式运行路径中的 console.log 调试输出
- 无效的 if (false) 迁移残留
- 明显重复或永远不可达的条件分支

不要删除仍被 package.json 正式引用的测试。

将本轮修改拆成独立提交：

1. weapon runtime persistence
2. weapon replacement and swap correctness
3. skill and combat event deduplication
4. route identity consistency
5. feature gating and cleanup
6. regression tests

每个提交只修改相关文件，并运行对应测试。

最终必须实际执行：

npm run lint
相关 smoke tests
npm run verify
npm run build

报告中区分：

- 已修复的确定错误；
- 已完整接入的系统；
- 保留但暂时隔离的实验系统；
- 仍需设计决策的内容；
- 每个提交 hash；
- 实际测试结果。

不得用“未完全遵循 task.md”作为问题，也不得为了满足旧任务数量而回滚已经稳定工作的后续功能。