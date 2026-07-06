cmys-fight 改造计划表：第一轮任务
优先级	任务	涉及文件	具体改动	验收标准
P0	建立新主状态 DungeonState	src/game/states/DungeonState.ts	新建实时地牢状态，负责玩家移动、房间绘制、敌人更新、子弹更新、碰撞检测、HUD 绘制。先不要追求完整美术，使用矩形/圆形占位即可。	启动游戏后直接进入一个可移动、可射击的房间。
P0	修改 Engine 状态入口	src/game/Engine.ts	暂时停用 MapState / CombatState / DialogState，将默认状态改为 dungeon，状态表只保留 dungeon 和 menu。	游戏不再从 map 开始，也不会碰敌人后切到 combat。
P0	改输入系统支持实时动作	src/game/Input.ts	增加 getAxis()，返回 WASD/方向键组成的二维方向；增加 isDown()、wasPressed() 工具方法。顺便修复 removeEventListener(bind) 无法清理的问题。	长按 WASD 可连续移动；切换页面/重新挂载后不会重复触发输入。
P0	实现连续坐标玩家	src/game/entities/Player.ts	新建玩家实体：x/y/vx/vy/radius/hp/armor/mana/speed/currentWeaponId/fireCooldown。移动使用浮点坐标，而不是 tile 坐标。	玩家能在房间内平滑移动，不能穿墙。
P0	实现基础子弹系统	src/game/entities/Projectile.ts	新建子弹实体：位置、速度、半径、伤害、阵营、生命周期。DungeonState 中维护 projectiles[]。	按攻击键会发射子弹，子弹会飞行、超时消失、命中敌人扣血。
P0	实现最小武器系统	src/game/data/weapons.ts	添加 3 种武器：手枪、霰弹枪、激光/能量枪。先用数据驱动：伤害、射速、弹速、耗蓝、散射、弹丸数。	可切换或至少默认使用手枪；武器参数来自配置而不是写死在逻辑里。
P0	实现自动瞄准	src/game/systems/AutoAim.ts 或放在 DungeonState.ts	从当前房间活着的敌人中寻找最近目标；没有敌人时按玩家朝向发射。	玩家不需要鼠标瞄准，也能朝最近敌人自动开火。
P0	实现基础敌人实体	src/game/entities/Enemy.ts	新建敌人实体：x/y/radius/hp/speed/type/shootCooldown。先做 2 种：追踪近战怪、远程发弹怪。	房间内能生成敌人，敌人会靠近或射击玩家。
P0	实现碰撞系统	src/game/systems/CollisionSystem.ts 或先写在 DungeonState.ts	处理玩家-墙、子弹-墙、玩家子弹-敌人、敌人子弹-玩家碰撞。	子弹命中敌人扣血，敌人死亡后消失；玩家被敌弹命中扣血或护盾。
P1	改房间战斗逻辑	DungeonState.ts, FloorGenerator.ts	进入战斗房后锁门，生成敌人；清空敌人后开门。不要再用“踩到敌人格子触发战斗”的逻辑。当前代码里这套逻辑在 MapState 中，应废弃。	房间未清空时不能离开；清空后门打开。
P1	改地牢房间类型	src/game/FloorGenerator.ts	将房间类型扩展为 start / combat / elite / treasure / shop / npc / boss。第一轮只实际实现 start / combat / treasure / boss。	生成的楼层至少包含起点、若干战斗房、1 个宝箱房、1 个 Boss 房。
P1	实现掉落和拾取	src/game/entities/Pickup.ts	添加金币、能量、血瓶、武器掉落。玩家靠近后自动吸附或按键拾取。	清房后能掉落奖励，玩家拾取后数值变化。
P1	实现 HUD	DungeonState.ts 或 src/game/ui/Hud.ts	显示 HP、护盾、蓝量、金币、当前武器、当前房间状态。	玩家能清楚看到生命、能量、武器和房间是否清空。
P1	实现死亡与重开	DungeonState.ts, GameData.ts	玩家 HP 归零后显示失败界面，按 Enter 回到初始房间或重开本轮。	死亡不会报错；能重新开始一局。
P1	保留但边缘化 AI 对话	server.ts, DialogState.ts	第一轮不删除 Gemini 接口，但不要让它参与主循环。AI 对话只保留给后续 NPC/商人/彩蛋房。	主玩法不依赖网络或 Gemini API。
P2	拆分渲染逻辑	src/game/render/*	把玩家、敌人、子弹、房间、HUD 绘制拆成单独函数，避免 DungeonState 过大。	DungeonState 不超过约 400 行，主要保留流程调度。
P2	添加简单音效接口	src/game/audio/AudioManager.ts	先写空实现或用 WebAudio beep，占位开火、命中、拾取、受伤、清房音效。	调用音效不会报错，后续可替换资源。
P2	增加 README 说明	README.md	更新项目说明：这是俯视角 Roguelite 射击原型；列出操作方式、运行方式、核心文件结构。	README 不再像 AI Studio 模板。
P2	增加基础检查脚本	package.json	确保 npm run lint 和 npm run build 能通过；如有 Windows 兼容问题，替换 rm -rf。	agent 修改后能用 npm run lint 和 npm run build 验证。