继续修复 cmys-fight。本轮不新增玩法，重点修复房间流程重复触发和玩家视觉更新

1. 新增 exploration 房间阶段。

RoomPhase 增加：
"exploration"

流程应为：
新战斗房：
entering -> intro -> locking -> combat -> cleared -> reward -> exploration

已清理房间重新进入：
直接 exploration

start 房：
直接 exploration

不要让已清理房间重新进入 cleared/reward。
不要重复播放 ROOM CLEAR。
不要重复生成奖励。
不要重复播放清房音效。

2. 修复恢复战斗时重复出怪。

当前恢复 currentRoom.enemies 后调用 setPhase("combat")，
但 setPhase("combat") 会重新 encounterCtrl.start()。

修改 setPhase：
setPhase(phase, options?: { startEncounter?: boolean })

新房间进入 combat：
setPhase("combat", { startEncounter: true })

恢复未完成战斗：
setPhase("combat", { startEncounter: false })

startEncounter=false 时：
- 不创建新的 encounterDefinition
- 不重新生成第一波
- encounterCtrl 必须处于 inactive/finished
- 恢复敌人死亡后正常进入 cleared

3. 修复玩家 hitFlash。

每帧增加：

if (this.player.hitFlash > 0) {
  this.player.hitFlash = Math.max(0, this.player.hitFlash - dt);
}

装甲受到攻击时也设置短暂 hitFlash：
player.hitFlash = 0.08

生命值受到攻击时：
player.hitFlash = 0.2

4. 玩家动画使用实际位移判断。

不要只根据 input axis 判断 walk。

在移动前记录：
const previousX = player.x;
const previousY = player.y;

移动和碰撞完成后计算：
const moved = Math.hypot(
  player.x - previousX,
  player.y - previousY
) > 0.01;

改为：
updatePlayerFacingAndAnimation(dt, moved)

moved=false：
animState = "idle"
animFrame = 0

moved=true：
animState = "walk"
更新 animTimer/animFrame

身体方向继续跟随 aimAngle，不能跟随移动方向。

5. 所有像素实体进行渲染坐标取整。

Player：
ctx.translate(Math.round(player.x), Math.round(player.y))

Enemy：
ctx.translate(Math.round(enemy.x), Math.round(enemy.y))

Pickup：
ctx.translate(Math.round(p.x), Math.round(p.y))

Projectile 可以根据表现选择取整，但至少玩家主体和武器必须共用同一个取整后的世界坐标。

只取整渲染坐标，不修改物理 x/y。

6. 保持现有修复不回退：

- Engine.loop try/catch/finally
- fade_out 无 callback 也能恢复
- weaponBehindBody
- weapon 不使用 PLAYER_PALETTE
- cleared 房间清空旧敌人
- currentMapData 一维索引
- aimAngle 每帧更新
- 身体方向跟随 aimAngle
- 左向 flipX
- side idle/walk sprite
- 子弹从 muzzle position 发射
- Room.pickups 持久化
- debug overlay

完成后输出：
- exploration 阶段说明
- 防止重复奖励的说明
- 恢复战斗不重复出怪的说明
- hitFlash 更新说明
- 实际位移动画判断说明
- 像素坐标 snapping 说明
- npm run lint 结果
- npm run build 结果