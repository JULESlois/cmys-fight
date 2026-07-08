继续开发 cmys-fight。这一轮只做美术落地，不新增玩法。

当前问题：
虽然已经新增 SpriteRenderer 和 sprites.ts，但 EntityRenderer.drawPlayer() / drawEnemy() 仍然主要使用旧几何图形，所以实际试玩仍显得简陋。必须把主角、敌人、Boss、掉落物、门和 HUD 进一步像素化。

必须完成：

1. 真正接入玩家 sprite。
   - EntityRenderer.drawPlayer() 不要再用 cloak 梯形、圆形头、矩形 visor 作为主体。
   - 根据 player.characterId 选择：
     - knight -> player_knight_idle
     - mage -> player_mage_idle
     - rogue -> player_rogue_idle
   - 使用 SpriteRenderer.drawPixelSprite() 绘制主体。
   - 保留 shadow / facingLeft / hitFlash / muzzleFlash。
   - muzzleFlash 可以继续用 Canvas 图形，但要改为像素爆闪，例如几个小方块，而不是圆形光球。
   - 角色颜色可以通过 paletteOverride 改第 2 色或第 5 色。

2. 真正接入敌人 sprite。
   - EntityRenderer.drawEnemy() 不要再用圆形、方形、菱形作为主体。
   - melee 使用 enemy_melee_idle。
   - ranged 使用 enemy_ranged_idle。
   - boss 使用 enemy_boss_idle，scale 更大。
   - 保留 bobbing 动画、hitFlash、shadow、HP bar。
   - HP bar 可以像素化为黑底红/绿小条。

3. 扩展 sprites.ts。
   - 当前 sprite 太小且辨识度不足。
   - 把 player 和 enemy sprite 从 8x8 扩到 12x12 或 16x16。
   - 三个角色需要明显差异：
     - Knight：盔甲/盾感
     - Mage：法袍/法杖感
     - Rogue：兜帽/轻甲感
   - 敌人也要明显差异：
     - melee：兽角/爪子
     - ranged：炮口/眼睛
     - boss：大型核心/外壳/光环

4. 掉落物继续优化。
   - pickup_hp 改成药瓶或红心。
   - pickup_mana 改成蓝色晶体。
   - pickup_coin 改成更清晰的金币。
   - pickup_weapon 按当前武器类型显示不同图标：
     - pistol
     - shotgun
     - laser
   - 如果暂时不做多武器 sprite，至少 weapon pickup 要比一条斜线更像武器。

5. 改造门的视觉。
   - RoomRenderer 当前门还是半透明红/绿矩形。
   - 改成像素门框：
     - locked：红色能量栅栏
     - cleared：绿色/蓝色开放门框
   - 仍然使用 DOOR_ZONES，不改变碰撞和切房逻辑。
   - 左右上下门都要正确绘制。

6. 改造 RoomRenderer tile。
   - 当前 floor 只是加了固定纹理点，所有 tile 纹理重复明显。
   - 增加 deterministic noise，基于 x/y 生成不同裂纹/点，而不是每格完全一样。
   - wall tile 增加主题化边缘：
     - forest：树干/花冠
     - dungeon：砖块
     - snow：冰棱
     - lava：黑曜石裂缝
   - 不要破坏 isSolid / getMapData / DOOR_ZONES。

7. HUD 进一步像素化。
   - HP 不要只用长条，改成红色心格或红色生命块。
   - Armor 改成盾牌格。
   - Mana 改成蓝色能量格。
   - Weapon card 显示武器 sprite。
   - Room status 做成小徽章，而不是纯文本框。

8. 菜单首页加视觉主体。
   - TitleState 首页加入：
     - 背景星点/扫描线/缓慢漂移网格
     - 中央或侧边显示当前选择角色 sprite
     - 标题做像素描边
   - CharacterSelectState 卡片里显示对应角色 sprite，而不是只显示色块。

9. 修复 treasure 小边角。
   - DungeonState.loadRoom() 中 treasure 判断改为：
     if (!currentRoom.pickups || currentRoom.pickups.length === 0)
   - 避免 pickups: [] 时不生成奖励。

10. 保持机制不回退：
   - Room.pickups 字段保留。
   - loadRoom 必须恢复 currentRoom.pickups。
   - syncRoomState 必须保存 pickups。
   - enemies 只同步 combat/boss。
   - Input normalizeKey / clear 逻辑不回退。
   - roomIntroTimer 保留。
   - MapData.getRoomTemplate 必须优先使用 templateId。
   - DOOR_ZONES 继续统一门洞和切房判定。
   - npm run lint 和 npm run build 必须通过。

完成后输出：
- 哪些旧几何绘制被替换
- 新增/修改 sprite 列表
- 玩家/敌人/掉落物 sprite 接入说明
- 门和 tile 美术改造说明
- HUD/Menu 改造说明
- npm run lint 结果
- npm run build 结果