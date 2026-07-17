# 历史任务记录（已归档）

> 本文件描述的是 2026-07-10 前后的实现任务，其中 saveVersion = 2 等内容已经过时。当前运行存档版本为 24。请以代码、自动化测试和 README.md 为准，不要将本文件作为当前待办直接执行。

继续修复 cmys-fight。本轮重点处理输入统一、存档迁移、门视觉状态、宝箱持久化和下一层过渡。不要新增敌人或武器。

1. 全仓库统一输入 API。

禁止直接读取：
input.justPressed["..."]
input.keys["..."]

统一使用：
input.wasPressed(key)
input.isDown(key)

重点修复：
- DungeonState 死亡重开 Enter
- MenuState ArrowUp / ArrowDown / Enter / Escape
- 其他状态中的大小写按键访问

Input.normalizeKey 会转小写，因此不能继续使用 "Enter"、"ArrowUp" 直接索引。

2. 重构死亡重开。

新增 GameData.restartCurrentRun()：
- 保留当前 characterId
- 根据 CHARACTERS 恢复角色初始属性
- x = 160
- y = 120
- hp = maxHp
- armor = maxArmor
- mana = maxMana
- speed = character speed
- currentWeaponId = starterWeapon
- coins = 0
- floor = generateFloor(1)
- save()

DungeonState 使用：
if (input.wasPressed("enter") && player.hp <= 0)

然后：
engine.data.restartCurrentRun()
this.player = createPlayerFromSave(...)
transitionState = fade_in
transitionAlpha = 1
loadRoom()
return

删除 DungeonState 内重复的手动 Player 重建字段赋值。

3. 增加存档版本。

GameSave 新增：
saveVersion: number

当前版本设为 2。

删除通过：
!r.enemies
判断旧存档的逻辑。

新增 migrateSave(parsed)：
- 不要直接重新生成 floor
- room.combatCleared ??= room.cleared
- room.rewardGenerated ??= false
- room.interactionCompleted ??= false
- combat/boss 房 room.enemies ??= []
- 保留 templateId、pickups、visited 和当前房间坐标
- 迁移完成后 saveVersion = 2

4. 统一门状态来源。

DungeonState 计算：
const doorLocked = roomPhase !== "exploration"

将 doorLocked 传入 RoomRenderer。
RoomRenderer 不再自行使用 !currentRoom.cleared 判断门状态。

UIRenderer 接收 roomPhase 或 roomStatus：
- combat / locking / intro：LOCKED
- cleared：CLEAR
- reward：REWARD
- exploration：OPEN
- start/npc：SAFE

门的视觉状态必须与实际碰撞状态一致。

5. 修复 treasure 宝箱持久化。

禁止使用 currentRoom.pickups 是否存在判断宝箱状态。

规则：
- treasure 且 interactionCompleted !== true：生成未打开宝箱
- 打开宝箱：
    interactionCompleted = true
    rewardGenerated = true
    生成 weapon pickup
- 离开未打开宝箱后重新进入：宝箱仍存在
- 打开后离开：不再生成宝箱
- 未拾取武器由 Room.pickups 持久化
- 已拾取武器后不再生成宝箱或武器

6. 完成 combatCleared 迁移。

新增：
isCombatCleared(room)
markCombatCleared(room)

新运行时逻辑优先使用 combatCleared。
旧 cleared 只作为兼容字段，在 markCombatCleared 时同步写入。

逐步替换：
- loadRoom
- syncRoomState
- setPhase("cleared")
- UI 状态

门锁仍以 roomPhase 为准，不以 combatCleared 为准。

7. 修复 Legacy 完成后的交互。

一次性方案：
interactionCompleted=true 后，getInteractTarget 不再返回该 Legacy 目标。

若保留重复挑战：
- 文案必须改成 REPLAY
- 不重复生成奖励
- 明确区分首次进入和重复进入

默认采用一次性方案。

8. 重做下一层传送流程。

portal activating 结束后不要直接 generateFloor/loadRoom。

改为：
- 设置 fade_out
- pendingTransition 内：
    syncRoomState()
    generateFloor(depth + 1)
    player.x = 160
    player.y = 120
    input.clear()
    loadRoom()
- fade_out 完成后自动 fade_in

确保下一层从中心出生，不继承旧传送门坐标。

9. 保持不回退：

- exploration 阶段
- rewardGenerated 防重
- interactionCompleted Legacy 防重
- 恢复战斗不重复 Encounter
- 门只在 exploration 可通行
- 下边界 clamp
- hitFlash
- 实际位移动画判断
- weaponBehindBody
- 像素 snapping
- Engine.loop try/catch/finally
- currentMapData 一维索引
- aimAngle 每帧更新
- 左向 flipX
- muzzle projectile
- debug overlay

完成后输出：
- 输入访问替换文件列表
- restartCurrentRun 说明
- saveVersion 和迁移说明
- 门状态单一数据源说明
- treasure 持久化测试说明
- combatCleared 迁移说明
- Legacy 完成后交互说明
- 下一层过渡说明
- npm run lint 结果
- npm run build 结果