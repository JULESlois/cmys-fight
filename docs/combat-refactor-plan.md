# CMYS Fight 战斗系统重构方案

> 维护说明：本文档是战斗重构的主计划。每完成一个可测试的切片，更新文末的「实施状态」表。
> 参考垂直切片定义见 `task.md`。本文件聚焦战斗底层架构。

## 一、核心结论

建议取消"所有武器共享同一个自动恢复能量池"的通用规则，改为：

> **武器拥有独立资源模型，角色技能使用独立冷却，通用闪避承担基础防御，少数角色再拥有自己的专属资源。**

新的战斗操作由五部分组成：

1. 移动与瞄准。
2. 武器攻击。
3. 战术闪避。
4. 角色技能。
5. 双武器切换。

其中：

* 武器资源决定攻击节奏。
* 闪避决定弹幕应对。
* 技能决定角色身份。
* 换枪决定战斗循环。
* Buff 改变这些动作之间的关系。

不再让一个"能量恢复速度"同时决定步枪、火箭筒、狙击枪、近战武器、召唤物和激光束的全部表现。

---

# 二、为什么共享能量池不适合继续扩展

当前系统的优点是简单，但会产生几个长期问题。

## 1. 所有武器被迫使用同一种节奏

目前多数武器都是：

```text
射击
→ 消耗能量
→ 停火
→ 等待恢复延迟
→ 自动恢复
```

即使武器视觉和弹道不同，底层节奏仍然相似。

## 2. 高速武器与低速武器很难共用一套数值

低射速武器在两次攻击间已经开始恢复，往往几乎不受能量限制。

高速武器则会快速耗尽能量，之后受到恢复延迟限制。

因此，同一个"恢复速度提高25%"可能：

* 对高速步枪偏弱。
* 对慢速狙击枪无效。
* 对持续激光需要特殊处理。
* 对悠悠球逻辑不成立。

## 3. 武器身份被能耗数字替代

玩家判断武器时容易变成：

* 每秒消耗多少能量。
* 能持续攻击多久。
* 是否有零能耗副武器。

而不是：

* 什么时候换弹。
* 是否冒险过热。
* 是否保留最后一发。
* 是否等待充能。
* 是否利用武器切换完成循环。

## 4. Buff 很容易退化为资源数值

一旦所有武器共享能量，能量类 Buff 最终只剩：

* 最大能量。
* 恢复速度。
* 恢复延迟。
* 击杀回能。
* 技能回能。
* 能耗降低。

可设计空间非常有限。

---

# 三、推荐的武器资源架构

每把武器定义一个 `resourceModel`。

建议首批支持六种模型。

---

## 1. 弹匣型 Magazine

适用于：

* 手枪。
* 普通步枪。
* 霰弹枪。
* 冲锋枪。
* 部分狙击枪。

基本规则：

* 武器拥有独立弹匣。
* 不设置传统备用弹药。
* 弹匣耗尽后自动换弹。
* 玩家可以主动换弹，也可以通过换枪让换弹在后台继续。
* 换弹期间不能使用该武器。

示例：

```text
M4A4
弹匣：18
换弹：1.25秒

Rusty Shotgun
弹匣：5
换弹：1.05秒

AWP
弹匣：3
换弹：1.65秒
```

这种系统保留节奏控制，但不会产生《挺进地牢》式的长期弹药焦虑。

### 可产生的决策

* 打空弹匣获得特殊效果，还是提前换弹。
* 换枪等待后台换弹，还是坚持使用当前武器。
* 为了最后一发强化，是否保留一枚弹药。
* 在安全窗口主动换弹，还是战斗中被迫换弹。

---

## 2. 电池型 Battery

适用于：

* 激光。
* 等离子武器。
* 电弧武器。
* 星能武器。
* 魔法枪械。

基本规则：

* 每把武器拥有自己的电池。
* 射击消耗电量。
* 停止攻击后短暂延迟，电池自动恢复。
* 武器被收起时恢复速度提高。
* 电池耗尽不会触发长时间换弹，但会暂时无法攻击。

示例：

```text
Energy Blaster
电池：24
每发消耗：2
恢复延迟：0.45秒
恢复速度：12/秒
收起恢复：150%

Void Rail
电池：21
每发消耗：7
恢复延迟：0.7秒
恢复速度：7/秒
```

这保留现有自动恢复系统的优点，但资源属于武器，而不是整个角色。

### 可产生的决策

* 一把电池武器耗尽后切到另一把武器。
* 等待电池完全恢复以触发满载效果。
* 深度放电换取更高威力。
* 在电池耗尽前主动停火。

---

## 3. 热量型 Heat

适用于：

* MG42。
* Ultimate。
* 火焰喷射器。
* 高速转管武器。
* 熔炉类武器。

基本规则：

* 射击产生热量。
* 停止射击或收起武器时冷却。
* 高热量可能提高威力，也可能降低精度。
* 完全过热后进入短暂锁定。

示例：

```text
MG42
最大热量：100
每发热量：2.3
冷却速度：24/秒
过热锁定：1.1秒
```

### 可产生的决策

* 保持在高热区获得增益。
* 提前停火避免过热。
* 故意过热触发排热攻击。
* 切换武器，将热量转化为另一种收益。

---

## 4. 充能槽型 Charges

适用于：

* 火箭筒。
* 高威力狙击枪。
* 召唤法杖。
* 大范围特殊武器。
* 房间控制武器。

基本规则：

* 武器拥有二至四个充能槽。
* 每次攻击消耗一个槽。
* 充能槽逐个恢复。
* 武器收起后仍然恢复。

示例：

```text
Siege Breaker
充能：3
单槽恢复：2.4秒

Stardust Dragon Staff
充能：2
单槽恢复：4秒
```

### 可产生的决策

* 一次性打出全部充能。
* 保留一发应对精英。
* 通过完美闪避、环境击杀或房间表现加速一个充能槽。
* 使用 Buff 改变最后一发或满充能状态。

---

## 5. 持续型 Channel

适用于：

* Last Prism。
* 光束。
* 喷火。
* 持续电弧。
* 悠悠球维持。

持续型武器可以拥有：

* 独立电池。
* 热量。
* 蓄力阶段。
* 维持成本。

Last Prism 可以设计为：

```text
阶段一：低消耗，光束分散
阶段二：中消耗，光束收束
阶段三：高消耗，伤害与穿透提高
```

玩家主动选择在何时停止，而不是单纯按住直到全局能量耗尽。

---

## 6. 动作型 Action

适用于：

* 剑。
* 拳套。
* 悠悠球。
* 投掷武器。
* 连段武器。

这些武器可以不使用弹药或能量。

它们的限制来自：

* 攻击后摇。
* 连段顺序。
* 距离风险。
* 收回时间。
* 精准输入窗口。
* 动量或架势。

例如：

```text
第一击：快速横扫
第二击：向前突进
第三击：重击或回旋
停顿过久：连段重置
```

近战武器不应只是"消耗一点能量的短射程枪"。

---

# 四、现有武器的初步迁移方向

| 武器组                                | 推荐资源模型     |
| ---------------------------------- | ---------- |
| Pistol、Inspector、Polaris、M4、BP50   | 弹匣         |
| Laser、Code Scanner、Tesla、Void Rail | 电池         |
| MG42、Ultimate、火焰武器                 | 热量         |
| Siege Breaker、AWP、Scavenger、召唤法杖   | 充能槽        |
| Last Prism                         | 电池＋蓄力      |
| Terrarian                          | 动作型＋维持     |
| NA-45                              | 弹匣＋底火/引爆状态 |
| 剑、拳套、匕首                            | 连段动作       |
| Stardust Dragon                    | 召唤充能槽      |
| Rusty Shotgun、AA-12、Olympia        | 弹匣         |

不需要强行保证所有稀有度使用同一种资源模型。

---

# 五、双武器系统应成为核心，而不是备用功能

当前已经存在双武器槽，但资源系统没有充分利用它。

重构后，理想循环应是：

```text
主武器爆发
→ 主武器换弹、冷却或充能
→ 切换副武器继续作战
→ 副武器进入停顿
→ 切回已经恢复的主武器
```

不同组合会产生不同节奏。

## 双弹匣组合

* 依靠后台换弹维持连续输出。
* 容易操作。
* 适合新手。

## 弹匣＋重武器

* 普通枪清理敌人。
* 重武器处理精英和危险波次。

## 电池＋零资源近战

* 电池耗尽后近战维持压力。
* 电池在收起时快速恢复。

## 热量＋电池

* 一把武器升温时，另一把武器恢复电池。
* 强调精确切换。

## 双充能武器

* 爆发极强。
* 长时间持续输出较弱。
* 适合技能与环境伤害构筑。

---

# 六、换枪机制

建议加入基础换枪准备时间：

* 普通武器：0.22秒。
* 重型武器：0.35秒。
* 轻型武器：0.15秒。

这个时间不是为了拖慢节奏，而是让换枪 Buff 和武器重量具有意义。

可增加：

* 快速切换取消部分攻击后摇。
* 完美闪避后立即完成换枪。
* 打空弹匣后自动快速切枪。
* 重武器切出时产生短暂瞄准稳定过程。

---

# 七、技能系统重构

当前技能有两个主要问题：

1. 技能持续时间从0.22秒到12秒，差异极大。
2. 所有技能都使用相同的"激活时开始冷却"逻辑。

这会造成长持续技能在冷却缩减后永久覆盖。

建议每个技能定义自己的生命周期。

```ts
interface SkillDefinition {
  cooldown: number;
  duration: number;
  maxCharges: number;
  cooldownStart:
    | "on_activate"
    | "on_effect_end";
  refreshPolicy:
    | "disabled_while_active"
    | "refresh_duration"
    | "replace_instance";
}
```

## 瞬发技能

例如：

* Rogue冲刺。
* Celestia护盾。
* 短暂清弹。

冷却可以在激活时开始。

## 持续技能

例如：

* Michele炮塔。
* Nanally强化。
* Kanami诱饵。

冷却建议在效果结束后开始，或者至少禁止在效果持续期间重新激活。

## 召唤技能

再次按技能可以：

* 移动炮塔。
* 召回炮塔。
* 改变目标。
* 提前结束并返还部分冷却。

不应只是不断刷新持续时间。

---

# 八、技能冷却规则

建议：

* 普通通用减冷却上限为15%。
* 全部来源叠加上限为25%。
* 长持续技能的冷却从效果结束后计算。
* 击杀和闪避可以推进固定秒数，但每次技能周期有上限。
* 不再存在多个可乘算的通用减冷却 Buff。

例如：

```text
技能加速器
基础冷却降低10%

战术回路
完美闪避推进技能冷却0.4秒
每次技能周期最多推进1.2秒
```

这比叠加 `0.8 × 0.75` 更容易控制。

---

# 九、通用战术闪避

建议所有角色拥有基础闪避动作。

基础参数可以从以下范围起步：

* 冷却：0.8秒。
* 无敌时间：0.16～0.20秒。
* 位移距离：32～42像素。
* 闪避期间不能攻击。
* 结束后存在很短的恢复时间。

不同角色在此基础上进行变体。

## Knight

* 距离较短。
* 闪避结束后获得短暂减伤或护甲恢复推进。

## Mage

* 位移较短，但可以穿过敌方投射物和薄型敌人。
* 完美闪避积累奥术回响。

## Rogue

* 距离最长。
* 可以取消部分攻击后摇。
* 完美闪避或穿弹后获得暴击窗口。

Rogue仍然保留最快的闪避身份，但不再垄断基础弹幕回避能力。

---

# 十、角色专属资源

取消通用能量，不代表所有资源条都必须消失。

少数角色可以拥有专属资源。

## Mage：奥术回响

通过以下行为积累：

* 使用电池武器。
* 完美闪避。
* 命中多名敌人。
* 完成蓄力攻击。

满值后触发攻击复制或强化施法。

## Knight：守卫层

通过：

* 护甲恢复至满。
* 完美闪避。
* 使用重型武器命中。

获得下一次减伤、反击或双持强化。

## Rogue：动量

通过：

* 持续移动。
* 闪避。
* 快速换枪。
* 近距离击杀。

积累短期暴击、换枪速度和移动攻击能力。

角色资源应该服务于角色身份，而不是成为所有人的共同弹药。

---

# 十一、Buff 系统需要同步重构

重构后，Buff分为四种。

## 1. 全局天赋

作用于角色动作和整局规则：

* 闪避。
* 技能。
* 护甲。
* 地图。
* 隐藏房。
* 环境建筑。

## 2. 武器模块

附着在具体武器上。

每把武器最多安装两个模块。

例如：

### 弹匣模块

* 最后一发产生冲击波。
* 打空弹匣后换弹速度提高。
* 提前换弹保留剩余弹药并获得稳定性。
* 换弹完成时清除附近小型弹幕。

### 电池模块

* 满电第一发强化。
* 电池降至20%以下时提高穿透。
* 收起时恢复速度提高。
* 过度放电后产生电弧。

### 热量模块

* 高热量提高暴击。
* 主动排热释放范围攻击。
* 过热时生成防护屏障。
* 换枪时将部分热量转移为另一把武器的强化。

### 充能模块

* 最后一枚充能伤害形态改变。
* 完美闪避推进充能。
* 击杀精英立即恢复一个槽。
* 满充能时显示隐藏墙提示。

## 3. 命名协同

跨武器、角色和场景触发。

例如：

### 冷热交换

条件：

* 一把热量武器。
* 一把电池武器。

效果：

* 热量武器收起冷却时，电池武器的恢复速度提高。
* 电池完全恢复时，热量武器立即降低部分热量。

### 最后一发协议

条件：

* 弹匣最后一发模块。
* 重型充能武器。

效果：

* 打空弹匣后，下一次重型武器攻击获得强化。

### 相位换装

条件：

* 完美闪避天赋。
* 快速换枪模块。

效果：

* 完美闪避后立即完成换枪。
* 新武器的第一发不消耗弹匣、电池或充能。

## 4. 异常协议

改变规则并附带代价。

例如：

### 永不冷却

* 热量武器不会进入过热锁定。
* 高热量持续对玩家造成护甲压力。

### 破损弹匣

* 弹匣容量降低30%。
* 每次换弹完成都会产生一次范围攻击。

### 黑色电池

* 电池容量翻倍。
* 电池耗尽后暂时无法进行战术闪避。

---

# 十二、场景建筑与武器系统联动

新的资源模型能够更自然地使用场景。

## 火焰

* 点燃藤蔓。
* 引爆孢子。
* 加速熔炉。
* 打开部分秘密入口。

## 冰冻

* 冷却过热武器。
* 冻结水面。
* 暂停环境机关。
* 固化熔岩。

## 电击

* 激活终端。
* 连接金属设施。
* 加速电池恢复。
* 暂时关闭机械门。

## 爆炸

* 快速摧毁裂纹墙。
* 激活矿渣。
* 推倒部分建筑。
* 提前开启隐藏房。

## 近战

* 切断藤蔓。
* 推动机关。
* 反弹部分特殊投射物。
* 在不引爆的情况下拆除危险物。

这些能力只提供更快或更安全的解法，不能成为唯一进入方式。

---

# 十三、章节路线与武器资源的关系

出口信息可以显示下个章节对武器的适应性。

例如：

## 军械禁库

* 弹匣补给和换弹模块较多。
* 重甲敌人较多。
* 适合穿透和高单发武器。

## 星象研究站

* 电池与技能模块较多。
* 远程敌人与视线障碍较多。
* 适合精确武器和蓄力武器。

## 锻造核心

* 热量类模块较多。
* 环境危险密集。
* 热量武器更强，但过热风险也更高。

## 冷却运河

* 热量武器容易冷却。
* 电池恢复受到部分环境影响。
* 移动与闪避构筑更有优势。

这使路线选择与当前两把武器直接相关。

---

# 十四、代码结构建议

目前武器运行状态大量存放在 `Player` 上：

* `weaponHeat`
* `weaponHeatWeaponId`
* `weaponChannelTime`
* `weaponBurstIndex`
* `linkedShotStep`
* `activeYoyoWeaponId`

随着武器机制增加，这种结构会越来越难维护。

建议每个武器槽保存独立运行状态。

```ts
interface WeaponRuntimeState {
  weaponId: string;

  resource:
    | MagazineRuntime
    | BatteryRuntime
    | HeatRuntime
    | ChargeRuntime
    | ActionRuntime;

  fireCooldown: number;
  reloadTimer: number;
  channelTime: number;
  burstIndex: number;
  comboIndex: number;
  linkedShotStep: number;
  customState: Record<string, number | boolean | string>;
}
```

玩家保存：

```ts
interface PlayerWeaponLoadout {
  slots: [
    WeaponRuntimeState,
    WeaponRuntimeState?
  ];
  activeSlot: 0 | 1;
  swapTimer: number;
}
```

武器定义只保存静态数据，运行状态单独保存。

---

# 十五、资源策略接口

```ts
interface WeaponResourceStrategy {
  canAttack(
    weapon: WeaponDefinition,
    runtime: WeaponRuntimeState,
  ): boolean;

  consumeAttack(
    weapon: WeaponDefinition,
    runtime: WeaponRuntimeState,
  ): void;

  update(
    weapon: WeaponDefinition,
    runtime: WeaponRuntimeState,
    dt: number,
    context: WeaponUpdateContext,
  ): void;

  getHudState(
    weapon: WeaponDefinition,
    runtime: WeaponRuntimeState,
  ): WeaponResourceHud;
}
```

具体实现：

* `MagazineResourceStrategy`
* `BatteryResourceStrategy`
* `HeatResourceStrategy`
* `ChargeResourceStrategy`
* `ActionResourceStrategy`

不要继续在 `WeaponController.fire()` 中通过大量 `if` 处理每种特殊武器。

---

# 十六、战斗事件层

Buff、角色被动和武器模块应通过统一事件工作。

```ts
type CombatEvent =
  | WeaponFiredEvent
  | WeaponSwappedEvent
  | ReloadStartedEvent
  | ReloadCompletedEvent
  | BatteryDepletedEvent
  | BatteryFullEvent
  | WeaponOverheatedEvent
  | ChargeRestoredEvent
  | DodgeStartedEvent
  | PerfectDodgeEvent
  | SkillActivatedEvent
  | ArmorBrokenEvent
  | EnemyKilledEvent
  | PropDestroyedEvent
  | RoomPerfectClearEvent;
```

这样可以避免所有新 Buff 都变成：

```ts
if (player.buffs.includes("..."))
```

---

# 十七、不要一次迁移57把武器

重构阶段建议制作一个垂直切片。

## 三名测试角色

* Knight。
* Mage。
* Rogue。

## 八把测试武器

### 弹匣

* Pistol。
* Rusty Shotgun。
* M4A4。

### 电池

* Energy Blaster。
* Void Rail。

### 热量

* MG42。

### 充能

* Siege Breaker。

### 特殊

* Last Prism。

## 首批内容

* 通用闪避。
* 双武器后台恢复。
* 三个技能生命周期。
* 六种武器资源界面。
* 十二个武器模块。
* 十二个全局天赋。
* 四个命名协同。
* 一个环境互动房。
* 一个双出口章节。

确认核心循环成立后，再迁移剩余武器。

---

# 十八、测试指标

不能只测试理论DPS。

每把武器至少需要记录：

* 十秒内总伤害。
* 三十秒内总伤害。
* 首次被资源阻塞时间。
* 攻击可用率。
* 换弹、冷却或充能占用时间。
* 收起状态恢复贡献。
* 换枪次数。
* 过热次数。
* 完美闪避带来的收益。
* 对单体、敌群和环境目标的表现。
* 与不同副武器组合后的总循环。

双武器组合必须作为测试单位，而不只是单把武器。

---

# 十九、最终推荐结构

最终战斗系统可以概括为：

```text
通用闪避
＋
独立角色技能
＋
两把拥有不同资源模型的武器
＋
武器模块
＋
全局天赋
＋
命名协同
＋
场景和路线互动
```

而不是：

```text
两把共享同一能量池的武器
＋
技能冷却
＋
若干恢复和暴击百分比
```

新的战斗循环应该让玩家不断判断：

* 当前武器是否应该继续使用。
* 是否应该提前换弹或停火。
* 什么时候切换副武器。
* 是否保留重型武器充能。
* 是否冒险维持高热量。
* 是否通过闪避触发模块。
* 当前构筑适合哪个章节出口。

这会使武器、Buff、角色、建筑和地图路线真正成为同一个系统。

---

# 实施状态

基于当前 `main`（提交 `5f18665` 之后）的代码盘点。最后更新：本轮开发。

## 已完成（已接线）

| 子系统 | 文件 | 状态 |
|---|---|---|
| `WeaponRuntimeState` / `WeaponLoadoutRuntime` | `combat/WeaponRuntimeState.ts` | 完整定义并接入 Player |
| 五种资源策略（magazine/battery/heat/charge/action） | `combat/WeaponResourceStrategies.ts` | init/canFire/consume/update/getRatio 全部实现 |
| `WeaponController.fire` 使用策略判定 + 双槽 | `combat/WeaponController.ts` | 策略为唯一资源来源；heat 双记账已移除 |
| 通用闪避（i-frames + 位移 + 冷却 + 完美闪避窗口） | `states/DungeonState.ts` | 完整实现并接线 |
| Player 旧武器字段移除，`weaponLoadout` 落地 | `entities/Player.ts` | heat/channel/burst/linkedShot 已移入 slot.customState |
| 存档序列化整个 weaponLoadout 运行态 + 迁移 | `GameData.ts` | 已接线 |
| `CombatEventDispatcher` | `combat/CombatEvents.ts` | 15 事件类型；全部 emit 已接线（dmg/room/hit/kill/swap/fire/reload/battery/heat/charge/skill） |
| 8 把切片武器显式 `resourceType` | `data/weapons.ts` | pistol/shotgun/m4a4(magazine) laser/void_rail/last_prism(battery) mg42(heat) siege_breaker(charge) |
| 技能生命周期 `cooldownStart`/`refreshPolicy` | `combat/SkillController.ts` | on_activate vs on_effect_end；disabled_while_active；25% 减冷却上限 |
| 战斗事件层 emit 全接线 | `DamageSystem`/`DungeonState`/`WeaponController`/`WeaponResourceStrategies`/`SkillController` | 15 事件全部 emit（含 skill_activated） |
| 角色专属资源统一结构 | `combat/CharacterResource.ts` | MageArcaneEcho(accumulator) / KnightGuardianLayer(state) / RogueMomentum(timer)；事件驱动累积；接入 DungeonState init+update |
| Buff 事件监听层 | `combat/BuffEventHandlers.ts` | entropy_engine(kill→energy) / energy_feedback+skill_loop(skill→energy) 已接入事件；counter_strike(perfect_dodge) 原有 |
| 武器模块系统 | `combat/WeaponModules.ts` | 4 模块（magazine_tactical_reload / battery_overcharge / heat_vent_burst / charge_elite_restore）；每武器 2 槽；事件驱动生效；接入 DungeonState AoE |
| 命名协同（4 个） | `combat/SynergySystem.ts` | cold_hot_exchange / last_round_protocol / phase_swap / bulwark_loop；基于 loadout resourceType + buff 自动检测；事件驱动生效 |
| 隐藏房 + 双出口章节 | `FloorGenerator.ts` / `DungeonState.ts` / `GameData.ts` | 隐藏房 ~20% 生成率（adjacent to combat）；双出口基于 WORLD_NODES exits 生成；exit choice UI（up/down/confirm/cancel）；advanceToNode 路线推进 |

## 部分完成（定义了但未完全接线）

| 子系统 | 问题 |
|---|---|
| `CombatEvents` 监听者 | 6 条链路被消费（counter_strike / CharacterResource / entropy_engine / skill_energy / weapon_modules / synergies）；其余事件有 emit 但无 listener |
| `weapons.ts` resourceType 采用率 | 57 把中 13 把显式标注（原 8 + 本轮 5），其余 44 把依赖 fallback 推断 |
| `BuffSystem` 被动统计 | 18 个被动 stat buff 仍为 `has()` 拉取式查询（架构上正确：被动修改器在查询时聚合）；3 个触发型 buff 已迁移到事件驱动 |
| `WeaponController.fire` 遗留 mana 语义 | `getEnergyCost`/`player.mana` 仍用于 mage arcane charge 累积（CharacterResource 已并行接入，待完全迁移后移除） |
| 武器模块 UI/获取流程 | 模块定义和事件生效已接线，但无 HUD 显示、无获取/装备 UI、无存档序列化 |
| 协同 UI/提示 | 协同检测和效果已接线，但无 HUD 显示、无激活提示 |
| 隐藏房发现机制 | 隐藏房已生成并连接门，但无视觉裂纹/音效/灰尘粒子提示；无发现流程 |
| 双出口预览信息 | exitDestinations 已存储 worldNodeId/kind，但无威胁/标签/奖励预览 UI |

## 缺失（需新建）

| 子系统 | 说明 |
|---|---|
| 换枪准备时间（轻/普/重） | `swapTimer` 字段存在但未驱动实际准备时间 |
| Channel 资源模型（Last Prism 蓄力阶段） | 不存在独立 channel 策略 |
| 运行时指标采集（§18） | 不存在 |
| `maxCharges` 技能充能次数 | SkillConfig 未含 maxCharges 字段 |

## 下一步（垂直切片优先级）

按 `task.md` §十七 的底层优先顺序：

1. ~~**清理 `WeaponController.fire` 遗留 heat/mana 双记账**~~ ✓ 已完成
2. ~~**补齐 8 把切片武器的显式 `resourceType` 与数值**~~ ✓ 已完成
3. ~~**技能生命周期**~~ ✓ 已完成（cooldownStart/refreshPolicy/25% cap）
4. ~~**战斗事件层补全**~~ ✓ 已完成（15 事件类型全部 emit 接线）
5. ~~**角色专属资源统一结构**~~ ✓ 已完成（Mage/Knight/Rogue 三种资源模型，事件驱动）
6. ~~**Buff/模块接入事件监听**~~ ✓ 已完成（触发型 buff 迁移到事件驱动；被动 stat buff 保持拉取式聚合）
7. ~~**武器模块系统**~~ ✓ 已完成（4 模块定义 + 事件驱动生效 + 每武器 2 槽 + DungeonState AoE 接线）
8. ~~**命名协同（4 个）**~~ ✓ 已完成（冷热交换 / 最后一发协议 / 相位换装 / 壁垒回路；自动检测 + 事件驱动）
9. ~~**隐藏房 + 双出口章节**~~ ✓ 已完成（隐藏房生成 + 双出口生成 + exit choice UI + advanceToNode）
10. **垂直切片平衡与测试** — 运行时模拟、双武器指标、路线选择检查、完整流程测试。
