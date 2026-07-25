# 稳定化修复执行记录

## 提交 1: WeaponRuntimeState 严格验证
- 保留现有 combat-runtime-smoke，但修正了测试语义。
- 增加了 magazine、battery、heat、charge 的正常值序列化往返，保证输入值在合法范围内。
- 单独测试了超出上限时的 clamp。
- 增加了 fireCooldown、reloadTimer、channelTime、linkedShotStep、burstIndex 和 swapTimer 的往返测试。
- 验证了真实调用 WeaponController.equipWeapon：双槽存在、替换当前槽、返回正确的 droppedWeaponId、未激活槽的资源和 customState 正确保留。

## 提交 2: CombatSource 权限控制与反递归
- 所有依赖命中或击杀的事件系统（BuffEventHandlers、MemoryTalents、ProtocolEvolutions、WeaponModules 等）均已增加 `canTriggerBuffs` 的预检。
- 修复了 `DamageSystem.damageEnemy` 缺失 source 时默认使用不可触发的 unknown/environment source，不再默认 true。
- 所有玩家主动攻击调用点（Projectile, DungeonState 爆炸伤害等）都已显式传递 source，不再依赖 DamageSystem fallback。
- 修复了 Alternating Current：统一在 `BuffSystem.update(dt)` 中处理超时清除，同一 attackId 只计一次，同武器连续命中中断，chain/explosion/status 不参与，触发的电弧不累积自身。
- 删除 Projectile 遗留的 sourceWeaponId、sourceSlot、sourceAttackId、canTriggerSynergy 字段，统一使用 source。

## 提交 3: 路线一致性修复 (Route Identity)
- 将 `WORLD_NODES[worldNodeId]` 定义为节点信息唯一真实来源。
- `FloorGenerator` 同步 StageData.worldNodeId，并修正 seed 计算以包含 worldNodeId，主题直接使用 `WORLD_NODES[worldNodeId].theme`。
- `EnvironmentSystem` 读取阶段对应的 hazardType (`WORLD_NODES[stage.worldNodeId].hazardType`)，无定义则 fallback 并警告。
- `DungeonState` 渲染直接依赖 floor.theme 数据。
- `GameData` 移除了无效的 `if (false)` 迁移块；`advanceToNode` 增加严格的目标及状态验证，确保非法目标不改变进度，成功选择时更新出口的 chosen 和 skipped 状态。

## 提交 4: 实验功能隔离和仓库清理 (Experimental Isolation)
- 在接口中定义 `experimental` 字段，并在武器与 Buff 生成池中过滤 experimental 标记的内容，防止意外随机获得（已标记 Last Prism）。
- 删除了临时测试文件（`test-lastprism.ts`, `test-lastprism2.ts`, `test-na45.ts`）。
- 删除了 bun.lock 与 bun.lockb。
- 删除了遗留的 Last Prism 的 `console.log` 测试调试语句和空条件块。
