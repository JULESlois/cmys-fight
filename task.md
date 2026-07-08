继续修复 cmys-fight。这一轮重点解决两个实际体验问题：
1. 武器射出的子弹和武器/枪口不在一条线上。
2. 角色没有方向动画，只有静态 idle sprite。

不要新增玩法，专注射击视觉对齐和最小角色动画系统。

必须完成：

1. 统一射击角度计算。
   - 在 DungeonState 中新增 getPlayerAimAngle()。
   - 规则：
     - 有最近敌人：朝最近敌人。
     - 无敌人但有移动输入：朝移动方向。
     - 无输入：朝当前 facingLeft / facing 方向。
   - update() 和 fireWeapon() 都使用这个函数。
   - fireWeapon() 计算出 angle 后必须写：
       this.player.aimAngle = angle;
       this.player.facingLeft = Math.cos(angle) < 0;

2. 修复子弹出生点。
   - 当前 Projectile 从 this.player.x / this.player.y 生成，导致子弹从身体中心出现。
   - 新增 getPlayerMuzzlePosition(angle)。
   - 使用和 EntityRenderer 中枪口一致的 forward/side 偏移。
   - projectile 必须从 muzzle.x / muzzle.y 生成，而不是 player.x / player.y。
   - muzzleFlash 的位置也要和 getPlayerMuzzlePosition 使用的偏移一致。
   - 建议常量：
       PLAYER_WEAPON_FORWARD = 18
       PLAYER_WEAPON_SIDE = -2
   - 不要在 EntityRenderer 和 DungeonState 中写两套不一致的 magic number。

3. 把武器绘制常量集中。
   - 新增或导出统一常量：
       PLAYER_WEAPON_OFFSET_X
       PLAYER_WEAPON_OFFSET_Y
       PLAYER_MUZZLE_OFFSET_X
       PLAYER_MUZZLE_OFFSET_Y
   - EntityRenderer.drawPlayer() 和 DungeonState.fireWeapon() 使用同一组常量。
   - 目标：视觉枪口、muzzle flash、projectile 起点完全一致。

4. 增加角色方向与动画字段。
   - Player 增加：
       facing: "right" | "left" | "up" | "down"
       animState: "idle" | "walk" | "shoot"
       animTimer
       animFrame
   - 保留 facingLeft，但可以由 facing 派生或兼容旧逻辑。

5. DungeonState.updatePlayer() 更新动画状态。
   - 有移动输入：
       animState = "walk"
       animTimer += dt
       animFrame = Math.floor(animTimer * 8) % 2
       根据主方向设置 facing。
   - 无移动输入：
       animState = "idle"
       animFrame = 0
   - 射击时可以短暂设置 animState = "shoot"，但第一版不是必须。

6. 扩展 sprites.ts 的玩家 sprite。
   - 至少为每个角色增加：
       idle_down
       walk_down_0
       walk_down_1
       idle_side
       walk_side_0
       walk_side_1
       idle_up
       walk_up_0
       walk_up_1
   - 左方向使用 side sprite + flipX。
   - 如果工作量过大，至少先做 knight 全套，再让 mage/rogue 复用结构并替换颜色；但最终三名角色都要能正常显示。

7. EntityRenderer.drawPlayer() 根据动画选择 sprite。
   - 根据 player.characterId、player.facing、player.animState、player.animFrame 选择 spriteName。
   - 例如：
       player_knight_walk_side_0
       player_mage_idle_down
   - 缺失 sprite 时 fallback 到 player_${id}_idle_down，再 fallback 到 player_knight_idle_down。
   - 不要再只画 player_${id}_idle。

8. 身体方向和武器方向分离。
   - 身体方向主要跟随移动方向。
   - 武器方向跟随 aimAngle。
   - 如果角色静止并自动瞄准敌人，可以让 facingLeft 根据 aimAngle 更新，但不要影响上下方向动画过于频繁抖动。
   - 目标：移动时角色有方向动画，射击时武器正确指向敌人。

9. 保持不回退：
   - 玩家主体继续使用 SpriteRenderer。
   - 敌人主体继续使用 SpriteRenderer。
   - 掉落物继续使用 SpriteRenderer。
   - Room.pickups 持久化不回退。
   - roomIntroTimer 不回退。
   - Input normalizeKey / clear 不回退。
   - DOOR_ZONES 不回退。
   - HUD 固定格数显示，不要重新让 mana 按 maxMana 逐像素溢出。
   - npm run lint 和 npm run build 必须通过。

完成后输出：
- 子弹与枪口对齐说明
- getPlayerAimAngle / getPlayerMuzzlePosition 实现说明
- 新增玩家动画字段
- 新增 sprite 列表
- EntityRenderer 动画选择逻辑
- npm run lint 结果
- npm run build 结果