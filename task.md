继续修复 cmys-fight。本轮不新增玩法，处理死亡重开、门锁时序、房间状态语义和剩余像素抖动。

1. 修复死亡重开。

当前死亡后按 Enter 只修改 GameData.player.hp/mana，然后 loadRoom，
但当前 this.player 实例仍然死亡。

新增统一函数：
createPlayerFromSave(savedPlayer)
或 resetPlayerFromSave()

死亡重开时必须：
- resetRun 或重新生成 floor
- 重建 this.player
- 恢复 hp/maxHp
- 恢复 armor/maxArmor
- 恢复 mana/maxMana
- 恢复 speed
- 恢复 characterId
- 恢复 currentWeaponId
- 重置 x/y 到 160/120
- fireCooldown = 0
- muzzleFlash = 0
- hitFlash = 0
- animState = idle
- animFrame = 0
- transitionState = fade_in
- transitionAlpha = 1
- loadRoom()

2. 修复清房后提前开门。

不要再只使用：
const isLocked = !currentRoom.cleared

改为根据 roomPhase 判断。

以下阶段门必须锁定：
- entering
- intro
- locking
- combat
- cleared
- reward

只有以下阶段允许切房：
- exploration

流程保持：
combat -> cleared -> reward -> exploration

必须保证奖励生成前玩家无法离开房间。

3. 修复向下边界钳制。

当前错误：
this.player.y = Math.max(maxY, this.player.y)

改为：
this.player.y = maxY

同时检查上下左右四个边界的 clamp 逻辑是否一致。

4. 拆分房间状态语义。

扩展 Room：
- combatCleared?: boolean
- rewardGenerated?: boolean
- interactionCompleted?: boolean

兼容旧 cleared 字段，但明确职责：

combatCleared：
- 战斗是否已经完成

rewardGenerated：
- 清房奖励是否已经生成
- 防止重复生成或因重入丢失

interactionCompleted：
- treasure / legacy / npc 等特殊内容是否完成

不要再用 cleared 同时表示战斗、奖励和 Legacy 完成。

5. 修复 Legacy 奖励条件。

当前 FloorGenerator 会把 legacy 房设置为 cleared=true，
但返回 DungeonState 时又要求 !sourceRoom.cleared 才发奖励。

改为使用：
!sourceRoom.interactionCompleted

Legacy 成功完成后：
- interactionCompleted = true
- 奖励仅生成一次
- legacyRewardsClaimed 继续作为兼容保护
- 房间门是否通行不依赖 interactionCompleted

6. 增加 rewardGenerated 保护。

spawnRoomRewards() 开头：

if (currentRoom.rewardGenerated) return;

生成完成后：
currentRoom.rewardGenerated = true;

注意：
- 普通 combat 奖励只生成一次
- boss 奖励和 portal 只生成一次
- treasure chest 不重复生成
- 重新进入 exploration 房间不重复奖励

7. 完成像素 snapping。

EntityRenderer：
- enemy animOffset 使用 Math.round
- pickup floatOffset 使用 Math.round
- enemy HP bar 使用 renderX/renderY
- player/body/weapon 继续共享同一个已取整坐标
- 只取整渲染，不修改物理坐标

8. 清理恢复战斗分支。

setPhase("combat", { startEncounter: false }) 时，
不要继续构建 encounterDef 或消耗 Math.random。

尽早跳过 encounter 创建，只保留：
roomPhase = combat
phaseTimer = 0
encounterCtrl inactive/finished

9. 保持不回退：

- exploration 阶段
- 恢复战斗不重复出怪
- hitFlash 递减
- 实际位移判断 walk
- weaponBehindBody
- 像素世界坐标取整
- Engine.loop try/catch/finally
- fade_out 边界恢复
- currentMapData 一维索引
- aimAngle 每帧更新
- 左向 flipX
- 子弹从 muzzle position 发射
- Room.pickups 持久化
- debug overlay

完成后输出：
- 死亡重开流程
- 门锁阶段说明
- Room 新状态字段说明
- Legacy 结算修复说明
- rewardGenerated 防重说明
- 下边界修复说明
- 像素 snapping 说明
- npm run lint 结果
- npm run build 结果