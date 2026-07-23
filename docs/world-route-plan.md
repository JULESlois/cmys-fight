# CMYS Fight 世界路线与多出口系统设计案

## 核心原则

章节决定内容，深度决定强度。分支改变经历，而不是增加长度。

## 一、总体结构

一次远征保持固定推进深度（4 层），每层有不同章节可选。

```text
深度 1: 腐木庭院 → 封印书库 / 冷却运河
深度 2: 封印书库 → 军械禁库 / 星象研究站(隐藏)
        冷却运河 → 星象研究站 / 锻造核心(高风险)
深度 3: 军械禁库/星象研究站/锻造核心 → 灰烬墓窟 / 深层监牢(条件)
深度 4: 灰烬墓窟/深层监牢 → 深层档案(最终)
```

## 二、RunProgress（已完成）

```ts
interface RunProgress {
  worldNodeId: string;      // 当前章节
  routeDepth: number;       // 推进深度（控制难度）
  stageWithinNode: number;  // 章节内进度
  routeHistory: string[];   // 本局路径
  hardMode: boolean;
  challengeId?: string;
}
```

## 三、出口规则

- 普通关卡：一个出口，继续当前章节
- 章节末关（boss stage）：两个普通出口，通往不同下一章节
- 特殊关卡：可能有第三个隐藏/条件出口
- 每局约 3 次重大路线选择
- 进入出口后不能反悔

## 四、出口房数据

```ts
interface ExitDestination {
  worldNodeId: string;
  kind: "normal" | "hidden" | "challenge" | "performance";
  state: "hidden" | "locked" | "available" | "chosen";
  preview: {
    threat: number;
    enemyTags: string[];
    hazardTags: string[];
    rewardTags: string[];
  };
}
```

## 五、出口生成规则

两个出口应该：
- 都是死胡同
- 距离起点较远且距离差不能太大
- 最好在后半段共享一个分叉点
- 路程成本应接近

理想结构：
```
                     ┌─ 战斗 ─ 出口 A
起点 ─ 战斗 ─ 战斗 ┤
                     └─ 战斗 ─ 出口 B
```

## 六、路线信息展示

出口显示四项：敌人类型、环境危险、奖励倾向、威胁等级。
不显示：具体房间布局、具体 Boss、具体武器、精确奖励品质。

## 七、隐藏出口

- 档案暗门：找到两份档案碎片或持有相位透镜 → 星象研究站
- 污染裂隙：污染值达到 50 或支付最大生命 → 灰烬墓窟
- 无伤升降台：本关完成无伤战斗房 → 军械禁库深层

## 八、最小实现（第一版）

利用现有四个主题验证系统：
- 深度 1 森林末尾：地牢入口 / 雪地入口
- 深度 2 地牢出口：熔岩 / 隐藏雪地研究站
- 深度 2 雪地出口：熔岩 / 隐藏地牢禁库
- 深度 3 统一进入最终章节

需要：
- 多出口生成（boss stage 两个 exit room）
- 出口目的地数据（ExitDestination on Room）
- 路线选择与保存（advanceToNode）
- 不同主题的出口视觉
- 小地图出口标识
- 一个隐藏出口条件

## 九、菱形汇合结构

```
          ┌─ B ─ E ─┐
起始章节 ┤           ├─ 最终章节
          └─ C ─ F ─┘
```

每个路线深度提供 2-3 个章节，最终汇合。

---

# 实施状态

## 已完成

| 子系统 | 文件 | 状态 |
|---|---|---|
| RunProgress 重构 | `RunProgress.ts` | ✓ worldNodeId/routeDepth/stageWithinNode/routeHistory |
| WorldNodes 定义 | `world/WorldNodes.ts` | ✓ 3 节点 + exits 定义 |
| 双出口 boss stage 生成 | `FloorGenerator.ts` | ✓ boss stage 生成 2 个 exit room |
| Room.exitDestinations 字段 | `FloorGenerator.ts` Room interface | ✓ 已添加 |
| advanceToNode 路线推进 | `GameData.ts` | ✓ 已实现 |
| DungeonState exit choice UI | `DungeonState.ts` | ✓ up/down/confirm/cancel 导航 |
| 隐藏房生成 | `FloorGenerator.ts` | ✓ ~20% 生成率 |

## 待后续迭代

| 内容 | 说明 |
|---|---|
| 扩展 WorldNodes 到 8 个章节 | 孢子温室/蔓生档案馆/封印书库/军械禁库/冷却运河/星象研究站/锻造核心/灰烬墓窟 |
| 出口房视觉表现 | 不同目的地不同建筑外观 |
| 出口预览信息 UI | 敌人/环境/奖励/威胁四项展示 |
| 隐藏出口条件系统 | 档案暗门/污染裂隙/无伤升降台 |
| 小地图出口标识 | 不同符号表示不同出口类型 |
| 路线承诺机制 | 进入后标记 skipped，不能反悔 |
| 观星台世界路线图 | 显示已发现章节和连接 |
| 章节路线 Buff 倾向 | routeBias 接线到出口生成 |
