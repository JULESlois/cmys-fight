# 稳定化修复执行记录 (基于 b06bb2488d9fcdfa53ba81a3965922cdfd7e7866)

## 提交 1: 恢复可编译状态和明确难度 API
- 从父提交恢复了历史的 `task.md`。
- 修改了 `getDifficultyStageIndex` 的签名，强制接收包含 `routeDepth` 和 `stageWithinNode` 的对象。
- 增加了 `getDifficultyStageIndexFromGlobalStage` 用来处理跨域和旧 API 的遗留调用。
- 清理了 `BuffSystem`，`EnvironmentSystem` 等模块内部的非法联合类型断言，恢复项目可编译状态。

## 提交 2: 修复 WeaponRuntimeState 的严格验证
- 为 `WeaponRuntimeState.ts` 实现了防御性检查机制。对越界、`NaN`、负数值等数据进行了安全降级。
- 增加了对应的测试脚本 `scripts/combat-runtime-smoke.ts` 验证反序列化和数据清理，并将该脚本加入了 `package.json` 的 `verify` 与 `test:runtime` 命令中。

## 提交 3: 完成 CombatSource 事件来源和防递归
- 重新定义了 `CombatSource`，删去了 `payload.sourceWeaponId` 的旧有格式。
- 对 `damageEnemy` 和事件系统进行了全链路改写，包括 `chain`，`explosion`，和环境等特殊来源，在派生攻击上彻底禁止了 Buff 触发二次递归。
- 重写了 `BuffEventHandlers.ts` 中的 `entropy_engine` 和 `alternating_current`。删除了不稳定的 `performance.now`，改为在 `BuffSystem.update(dt)` 统一维护时间戳和计数逻辑。
- 将 `attackId` 获取逻辑由 `Math.random` 改为了更稳定的单调递增 `nextAttackIdCounter`。

## 提交 4: 路线一致性修复
- (已存在于历史提交或当前环境清理完毕) 所有的环境与房间层级调用均严格依赖 `progress` 内部属性，没有重新引入被废弃的 `currentRouteId`/`nextRouteId`。

## 提交 5: 环境与副作用清理
- 在 `MemoryTalents.ts` 和 `ProtocolEvolutions.ts` 中加入了 `let initialized = false` 控制守卫，保障只初始化注册一次事件，杜绝了重复注册造成的内存泄漏。
- 全程未对 `engine.events` 做出直接覆盖操作，保留了系统内的类型安全。
- 保证了 `package.json` 内的 typescript 依赖版本不变。
