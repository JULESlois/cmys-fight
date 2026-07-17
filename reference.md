下面给出两份配套材料：

1. **80×60 Tile 的大型基地地图草案**
2. **`HubState / Camera2D / WorldMap` 代码结构草案**

可以直接附在上一份 agent 指令之后。

---

# 一、基地地图 Tile 分区草案

## 1. 基础规格

```text
地图尺寸：80 × 60 tiles
Tile 尺寸：16 × 16 px
世界尺寸：1280 × 960 px
视口尺寸：320 × 240 px
摄像机模式：follow + dead zone
```

坐标统一采用 Tile 坐标：

```text
左上角：(0, 0)
右下角：(79, 59)
```

建议可行走边界：

```text
x = 2 ~ 77
y = 2 ~ 57
```

最外围两格作为墙体、悬崖、城墙或不可见阻挡。

---

## 2. 总体平面图

```text
                 北侧

┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│       档案高塔              北部回廊                   观星塔                 │
│       6,4~26,17                                       57,4~74,17             │
│                                                                              │
│            ┌──────────────────中央北庭────────────────────┐                  │
│            │                                              │                  │
│ 工匠庭院   │                 重生泉庭                     │   军械回廊       │
│ 4,20~24,40 │                 30,20~50,40                  │   56,20~76,40   │
│            │                                              │                  │
│            └──────────────────────────────────────────────┘                  │
│                                                                              │
│ 静思花园             中央南庭 / 医疗区                 训练庭                │
│ 5,43~24,56           28,42~51,55                       56,42~76,57           │
│                                                                              │
│                          远征之门                                            │
│                          31,51~49,59                                         │
└──────────────────────────────────────────────────────────────────────────────┘

                 南侧
```

这是一张“中央核心 + 四向分区”的大地图。

---

# 二、主要区域坐标

## 1. 重生泉庭

```text
区域范围：
x = 29 ~ 51
y = 19 ~ 41

泉池中心：
tile = (40, 30)
world = (648, 488)
```

建议泉池占地：

```text
宽：9 tiles
高：7 tiles

左上：
(36, 27)

右下：
(44, 33)
```

泉池周围保留两格环形道路。

### 出生 Anchor

```ts
rebirth_spring:
tileX = 40
tileY = 35
worldX = 648
worldY = 568
```

玩家从泉池正下方醒来，避免生成在泉水内部。

### 交互范围

```text
泉池交互中心：
(40, 30)

交互半径：
40 px
```

建议泉池本体为碰撞区域，但泉池南侧设置祭坛边缘交互点。

---

## 2. 远征之门

```text
区域：
x = 31 ~ 49
y = 50 ~ 59

主门中心：
tile = (40, 55)
world = (648, 888)
```

建议：

```text
门体宽度：9 tiles
门体高度：5 tiles
传送平台：11 × 6 tiles
```

入口道路从泉庭向南保持至少 5 Tile 宽。

### Anchor

```ts
expedition_gate:
tileX = 40
tileY = 51
```

### 交互动作

```text
open_expedition
```

---

## 3. 工匠庭院

```text
区域：
x = 4 ~ 25
y = 19 ~ 41
```

内部划分：

```text
铁匠炉：
x = 7 ~ 13
y = 24 ~ 31

附魔台：
x = 16 ~ 22
y = 24 ~ 31

重铸石：
x = 11 ~ 17
y = 34 ~ 38
```

### 交互点

```ts
blacksmith_forge:
tile = (10, 30)
action = "open_meta_upgrades"

enchanting_table:
tile = (19, 30)
action = "open_meta_upgrades"

reforge_stone:
tile = (14, 36)
action = "open_meta_refund"
```

第一版可以三个交互物打开同一界面，但默认定位不同页签。

---

## 4. 档案高塔

```text
区域：
x = 5 ~ 27
y = 3 ~ 18
```

内部设施：

```text
编年碑：
(11, 12)
action = open_records

图鉴书台：
(18, 12)
action = open_codex

荣誉墙：
(23, 8)
action = open_achievements
```

第一版可以全部调用现有 `RecordsState`，通过参数决定默认页签：

```ts
open_records: {
  initialTab: "runs" | "codex" | "achievements"
}
```

---

## 5. 观星塔

```text
区域：
x = 56 ~ 75
y = 3 ~ 18
```

主占星仪：

```text
tile = (66, 11)
world = (1064, 184)
action = open_settings
```

建议中心为圆形星盘，外围放水晶柱和书架。

---

## 6. 军械回廊

```text
区域：
x = 55 ~ 77
y = 19 ~ 41
```

设施：

```text
主武器架：
(64, 27)
action = open_armory

角色装备展示：
(71, 28)
action = open_rebirth_spring

收藏武器墙：
(65, 36)
action = open_weapon_codex
```

角色本体仍然在重生之泉选择。军械回廊只负责武器、装备和展示。

---

## 7. 训练庭

```text
区域：
x = 55 ~ 77
y = 42 ~ 58
```

设施：

```text
训练假人：
(63, 49)

远程靶：
(72, 48)

技能测试法阵：
(65, 55)
```

训练区需要预留宽阔无碰撞区域。

第一阶段只实现：

```text
open_training
```

后续再加入真正的训练敌人和武器测试。

---

## 8. 静思花园

```text
区域：
x = 4 ~ 25
y = 42 ~ 58
```

设施：

```text
愿泉：
(12, 49)
action = open_wish_fountain

休息长椅：
(19, 52)

剧情 NPC：
(16, 46)
```

该区域可以暂时作为纯装饰，先保留交互接口。

---

## 9. 医疗与回归区

```text
区域：
x = 28 ~ 52
y = 42 ~ 52
```

医疗祭坛：

```text
tile = (34, 47)
```

Run 失败后仍建议最终出生在重生之泉，但可以先播放：

```text
医疗祭坛亮起
→ 灵魂光点飞向重生之泉
→ 玩家在泉边苏醒
```

或者失败返回使用：

```ts
medical_return:
tile = (35, 48)
```

胜利返回则使用：

```ts
victory_return:
tile = (40, 35)
```

---

# 三、道路与动线

## 主十字道路

```text
南北主路：
x = 37 ~ 43
y = 3 ~ 58

东西主路：
x = 3 ~ 77
y = 27 ~ 33
```

道路宽度建议：

```text
主路：5~7 tiles
支路：3~5 tiles
门口：至少4 tiles
```

不要设置单 Tile 狭窄通道，否则玩家和 NPC 容易堵塞。

---

# 四、摄像机参数

推荐：

```ts
viewportWidth = 320
viewportHeight = 240

deadZoneWidth = 96
deadZoneHeight = 64

followSpeed = 7.5
```

对应屏幕中心死区：

```text
left = 112
right = 208
top = 88
bottom = 152
```

玩家在死区内部移动时摄像机保持不动。

---

# 五、WorldMap 数据结构

建议新增：

```ts
// src/game/world/WorldMap.ts

export type WorldTileLayerId =
  | "ground"
  | "groundDetail"
  | "collision"
  | "backObjects"
  | "upperObjects"
  | "roof";

export interface WorldPoint {
  x: number;
  y: number;
}

export interface WorldRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WorldMapLayer {
  id: WorldTileLayerId;
  tiles: number[];
  visible?: boolean;
}

export interface WorldObjectDefinition {
  id: string;

  type:
    | "interactable"
    | "npc"
    | "decoration"
    | "spawn"
    | "portal"
    | "collider"
    | "region";

  x: number;
  y: number;

  width?: number;
  height?: number;

  sortY?: number;
  action?: string;
  promptKey?: string;

  properties?: Record<string, unknown>;
}

export interface WorldMapDefinition {
  id: string;

  widthTiles: number;
  heightTiles: number;
  tileSize: number;

  layers: WorldMapLayer[];
  objects: WorldObjectDefinition[];

  spawnPoints: Record<string, WorldPoint>;
}
```

---

# 六、Camera2D 结构草案

```ts
// src/game/world/Camera2D.ts

export interface CameraDeadZone {
  width: number;
  height: number;
}

export class Camera2D {
  public x = 0;
  public y = 0;

  private targetX = 0;
  private targetY = 0;

  constructor(
    public readonly viewportWidth = 320,
    public readonly viewportHeight = 240,
    public readonly deadZone: CameraDeadZone = {
      width: 96,
      height: 64,
    },
    private readonly followSpeed = 7.5,
  ) {}

  public snapTo(
    targetX: number,
    targetY: number,
    worldWidth: number,
    worldHeight: number,
  ): void {
    this.x = this.clampX(
      targetX - this.viewportWidth / 2,
      worldWidth,
    );

    this.y = this.clampY(
      targetY - this.viewportHeight / 2,
      worldHeight,
    );

    this.targetX = this.x;
    this.targetY = this.y;
  }

  public follow(
    actorX: number,
    actorY: number,
    worldWidth: number,
    worldHeight: number,
    dt: number,
  ): void {
    const actorScreenX = actorX - this.x;
    const actorScreenY = actorY - this.y;

    const deadLeft =
      (this.viewportWidth - this.deadZone.width) / 2;

    const deadRight =
      deadLeft + this.deadZone.width;

    const deadTop =
      (this.viewportHeight - this.deadZone.height) / 2;

    const deadBottom =
      deadTop + this.deadZone.height;

    if (actorScreenX < deadLeft) {
      this.targetX = actorX - deadLeft;
    } else if (actorScreenX > deadRight) {
      this.targetX = actorX - deadRight;
    }

    if (actorScreenY < deadTop) {
      this.targetY = actorY - deadTop;
    } else if (actorScreenY > deadBottom) {
      this.targetY = actorY - deadBottom;
    }

    this.targetX = this.clampX(
      this.targetX,
      worldWidth,
    );

    this.targetY = this.clampY(
      this.targetY,
      worldHeight,
    );

    const response =
      1 - Math.exp(-this.followSpeed * dt);

    this.x += (this.targetX - this.x) * response;
    this.y += (this.targetY - this.y) * response;

    this.x = this.clampX(this.x, worldWidth);
    this.y = this.clampY(this.y, worldHeight);
  }

  public begin(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(
      -Math.round(this.x),
      -Math.round(this.y),
    );
  }

  public end(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }

  public screenToWorld(
    screenX: number,
    screenY: number,
  ): { x: number; y: number } {
    return {
      x: screenX + this.x,
      y: screenY + this.y,
    };
  }

  public isVisible(
    x: number,
    y: number,
    width: number,
    height: number,
    margin = 16,
  ): boolean {
    return (
      x + width >= this.x - margin &&
      x <= this.x + this.viewportWidth + margin &&
      y + height >= this.y - margin &&
      y <= this.y + this.viewportHeight + margin
    );
  }

  private clampX(x: number, worldWidth: number): number {
    return Math.max(
      0,
      Math.min(
        Math.max(0, worldWidth - this.viewportWidth),
        x,
      ),
    );
  }

  private clampY(y: number, worldHeight: number): number {
    return Math.max(
      0,
      Math.min(
        Math.max(0, worldHeight - this.viewportHeight),
        y,
      ),
    );
  }
}
```

---

# 七、WorldMapRenderer 草案

```ts
// src/game/world/WorldMapRenderer.ts

import type {
  WorldMapDefinition,
  WorldMapLayer,
} from "./WorldMap";
import type { Camera2D } from "./Camera2D";

export class WorldMapRenderer {
  public drawLayer(
    ctx: CanvasRenderingContext2D,
    map: WorldMapDefinition,
    layer: WorldMapLayer,
    camera: Camera2D,
    drawTile: (
      ctx: CanvasRenderingContext2D,
      tileId: number,
      x: number,
      y: number,
    ) => void,
  ): void {
    if (layer.visible === false) return;

    const tileSize = map.tileSize;

    const startX = Math.max(
      0,
      Math.floor(camera.x / tileSize) - 1,
    );

    const endX = Math.min(
      map.widthTiles - 1,
      Math.ceil(
        (camera.x + camera.viewportWidth) / tileSize,
      ) + 1,
    );

    const startY = Math.max(
      0,
      Math.floor(camera.y / tileSize) - 1,
    );

    const endY = Math.min(
      map.heightTiles - 1,
      Math.ceil(
        (camera.y + camera.viewportHeight) / tileSize,
      ) + 1,
    );

    for (let tileY = startY; tileY <= endY; tileY++) {
      for (let tileX = startX; tileX <= endX; tileX++) {
        const index =
          tileY * map.widthTiles + tileX;

        const tileId = layer.tiles[index] ?? 0;

        if (tileId === 0) continue;

        drawTile(
          ctx,
          tileId,
          tileX * tileSize,
          tileY * tileSize,
        );
      }
    }
  }
}
```

---

# 八、WorldCollision 草案

```ts
// src/game/world/WorldCollision.ts

import type { WorldMapDefinition } from "./WorldMap";

export class WorldCollision {
  constructor(
    private readonly map: WorldMapDefinition,
  ) {}

  public isCircleBlocked(
    worldX: number,
    worldY: number,
    radius: number,
  ): boolean {
    const tileSize = this.map.tileSize;

    const points = [
      [worldX - radius, worldY],
      [worldX + radius, worldY],
      [worldX, worldY - radius],
      [worldX, worldY + radius],
      [worldX - radius * 0.7, worldY - radius * 0.7],
      [worldX + radius * 0.7, worldY - radius * 0.7],
      [worldX - radius * 0.7, worldY + radius * 0.7],
      [worldX + radius * 0.7, worldY + radius * 0.7],
    ];

    return points.some(([x, y]) => {
      if (
        x < 0 ||
        y < 0 ||
        x >= this.map.widthTiles * tileSize ||
        y >= this.map.heightTiles * tileSize
      ) {
        return true;
      }

      const tileX = Math.floor(x / tileSize);
      const tileY = Math.floor(y / tileSize);

      return this.isBlockedTile(tileX, tileY);
    });
  }

  public moveCircle(
    x: number,
    y: number,
    radius: number,
    moveX: number,
    moveY: number,
  ): { x: number; y: number } {
    let nextX = x;
    let nextY = y;

    if (!this.isCircleBlocked(x + moveX, y, radius)) {
      nextX += moveX;
    }

    if (!this.isCircleBlocked(nextX, y + moveY, radius)) {
      nextY += moveY;
    }

    return {
      x: nextX,
      y: nextY,
    };
  }

  private isBlockedTile(
    tileX: number,
    tileY: number,
  ): boolean {
    const layer = this.map.layers.find(
      entry => entry.id === "collision",
    );

    if (!layer) return false;

    const index =
      tileY * this.map.widthTiles + tileX;

    return (layer.tiles[index] ?? 0) !== 0;
  }
}
```

---

# 九、Hub 交互系统草案

```ts
// src/game/hub/HubInteractionController.ts

import type { WorldObjectDefinition } from "../world/WorldMap";

export interface HubInteractionTarget {
  object: WorldObjectDefinition;
  distance: number;
}

export class HubInteractionController {
  public findNearest(
    playerX: number,
    playerY: number,
    objects: WorldObjectDefinition[],
    maxDistance = 38,
  ): HubInteractionTarget | null {
    let nearest: HubInteractionTarget | null = null;

    for (const object of objects) {
      if (
        object.type !== "interactable" &&
        object.type !== "portal" &&
        object.type !== "npc"
      ) {
        continue;
      }

      const centerX =
        object.x + (object.width ?? 0) / 2;

      const centerY =
        object.y + (object.height ?? 0) / 2;

      const distance = Math.hypot(
        centerX - playerX,
        centerY - playerY,
      );

      if (distance > maxDistance) continue;

      if (!nearest || distance < nearest.distance) {
        nearest = {
          object,
          distance,
        };
      }
    }

    return nearest;
  }
}
```

---

# 十、HubState 代码结构草案

```ts
// src/game/states/HubState.ts

import { GameState } from "./GameState";
import { Camera2D } from "../world/Camera2D";
import { WorldCollision } from "../world/WorldCollision";
import { WorldMapRenderer } from "../world/WorldMapRenderer";
import { HubInteractionController } from "../hub/HubInteractionController";
import { HUB_MAP } from "../hub/HubMap";
import { Player } from "../entities/Player";
import { EntityRenderer } from "../render/EntityRenderer";
import { PromptRenderer } from "../render/PromptRenderer";

export class HubState extends GameState {
  private readonly map = HUB_MAP;

  private readonly camera = new Camera2D(
    320,
    240,
    {
      width: 96,
      height: 64,
    },
  );

  private readonly collision =
    new WorldCollision(this.map);

  private readonly mapRenderer =
    new WorldMapRenderer();

  private readonly interactionController =
    new HubInteractionController();

  private player = new Player(0, 0);

  private interactionTarget:
    ReturnType<
      HubInteractionController["findNearest"]
    > = null;

  private time = 0;

  public enter(params?: {
    spawnAnchor?: string;
    showRunResult?: boolean;
  }): void {
    const anchorId =
      params?.spawnAnchor ??
      "rebirth_spring";

    const spawn =
      this.map.spawnPoints[anchorId] ??
      this.map.spawnPoints.rebirth_spring;

    this.player.x = spawn.x;
    this.player.y = spawn.y;

    this.player.characterId =
      this.engine.data.meta.preferredCharacterId ??
      this.engine.data.data.player.characterId ??
      "knight";

    this.player.animState = "idle";
    this.player.animFrame = 0;
    this.player.aimAngle = 0;

    const worldWidth =
      this.map.widthTiles * this.map.tileSize;

    const worldHeight =
      this.map.heightTiles * this.map.tileSize;

    this.camera.snapTo(
      this.player.x,
      this.player.y,
      worldWidth,
      worldHeight,
    );

    this.engine.input.suppressUntilReleased();

    if (params?.showRunResult) {
      this.openRunResultOverlay();
    }
  }

  public exit(): void {
    this.saveHubPosition();
  }

  public prepareForSave(): void {
    this.saveHubPosition();
  }

  public update(dt: number): void {
    this.time += dt;

    this.updatePlayer(dt);

    this.interactionTarget =
      this.interactionController.findNearest(
        this.player.x,
        this.player.y,
        this.map.objects,
      );

    if (
      this.interactionTarget &&
      this.engine.input.wasActionPressed("interact")
    ) {
      this.activateInteraction(
        this.interactionTarget.object.action,
        this.interactionTarget.object,
      );

      return;
    }

    const worldWidth =
      this.map.widthTiles * this.map.tileSize;

    const worldHeight =
      this.map.heightTiles * this.map.tileSize;

    this.camera.follow(
      this.player.x,
      this.player.y,
      worldWidth,
      worldHeight,
      dt,
    );
  }

  private updatePlayer(dt: number): void {
    const axis =
      this.engine.input.getAxis();

    const previousX = this.player.x;
    const previousY = this.player.y;

    const length =
      Math.hypot(axis.x, axis.y);

    const moveX =
      length > 0
        ? axis.x / length * this.player.speed * dt
        : 0;

    const moveY =
      length > 0
        ? axis.y / length * this.player.speed * dt
        : 0;

    const moved =
      this.collision.moveCircle(
        this.player.x,
        this.player.y,
        this.player.radius,
        moveX,
        moveY,
      );

    this.player.x = moved.x;
    this.player.y = moved.y;

    const actualMoveX =
      this.player.x - previousX;

    const actualMoveY =
      this.player.y - previousY;

    const isMoving =
      Math.hypot(actualMoveX, actualMoveY) > 0.01;

    if (Math.abs(actualMoveX) > 0.01) {
      this.player.facing =
        actualMoveX < 0 ? "left" : "right";

      this.player.facingLeft =
        this.player.facing === "left";
    }

    this.player.animState =
      isMoving ? "walk" : "idle";

    if (isMoving) {
      this.player.animTimer += dt;

      if (this.player.animTimer >= 0.12) {
        this.player.animTimer = 0;
        this.player.animFrame =
          (this.player.animFrame + 1) % 4;
      }
    } else {
      this.player.animFrame = 0;
      this.player.animTimer = 0;
    }
  }

  private activateInteraction(
    action: string | undefined,
    object: {
      id: string;
      properties?: Record<string, unknown>;
    },
  ): void {
    switch (action) {
      case "open_rebirth_spring":
        this.engine.switchState(
          "character_select",
          {
            backState: "hub",
            hubMode: true,
          },
        );
        break;

      case "open_expedition":
        this.openExpeditionOverlay();
        break;

      case "open_meta_upgrades":
        this.openMetaUpgradeOverlay(
          object.properties?.tab,
        );
        break;

      case "open_meta_refund":
        this.openMetaUpgradeOverlay("refund");
        break;

      case "open_records":
        this.engine.switchState(
          "records",
          {
            backState: "hub",
            initialTab:
              object.properties?.tab ?? "runs",
          },
        );
        break;

      case "open_settings":
        this.engine.switchState(
          "settings",
          {
            backState: "hub",
          },
        );
        break;

      case "open_armory":
        this.openArmoryOverlay();
        break;

      case "open_training":
        this.openTrainingArea();
        break;

      case "open_challenge":
        this.openChallengeOverlay();
        break;

      default:
        console.warn(
          "[HubState] Unknown interaction action:",
          action,
          object.id,
        );
    }
  }

  public draw(
    ctx: CanvasRenderingContext2D,
  ): void {
    this.camera.begin(ctx);

    this.drawGroundLayers(ctx);
    this.drawBackObjects(ctx);
    this.drawYSortedWorld(ctx);
    this.drawUpperLayers(ctx);

    this.camera.end(ctx);

    this.drawHubHud(ctx);

    if (this.interactionTarget) {
      const object =
        this.interactionTarget.object;

      const screenX =
        object.x - this.camera.x;

      const screenY =
        object.y - this.camera.y;

      PromptRenderer.drawAt(
        ctx,
        screenX,
        screenY,
        object.promptKey ?? "hub.interact",
        this.engine.input.getPrompt("interact"),
        this.engine.data.settings.language,
      );
    }
  }

  private drawGroundLayers(
    ctx: CanvasRenderingContext2D,
  ): void {
    // ground / groundDetail
  }

  private drawBackObjects(
    ctx: CanvasRenderingContext2D,
  ): void {
    // buildings_back / large walls
  }

  private drawYSortedWorld(
    ctx: CanvasRenderingContext2D,
  ): void {
    const renderables = [
      ...this.getVisibleWorldObjects(),
      {
        sortY: this.player.y,
        draw: () =>
          EntityRenderer.drawPlayer(
            ctx,
            this.player,
            this.engine,
            "hub",
          ),
      },
    ];

    renderables.sort(
      (a, b) => a.sortY - b.sortY,
    );

    for (const renderable of renderables) {
      renderable.draw();
    }
  }

  private drawUpperLayers(
    ctx: CanvasRenderingContext2D,
  ): void {
    // upperObjects / roof
  }

  private drawHubHud(
    ctx: CanvasRenderingContext2D,
  ): void {
    // shards、当前角色、当前 Run 状态等
  }

  private saveHubPosition(): void {
    this.engine.data.meta.hubProgress = {
      anchorId: "rebirth_spring",
      x: this.player.x,
      y: this.player.y,
    };

    this.engine.data.saveMeta();
  }

  private openExpeditionOverlay(): void {}
  private openMetaUpgradeOverlay(_tab?: unknown): void {}
  private openArmoryOverlay(): void {}
  private openTrainingArea(): void {}
  private openChallengeOverlay(): void {}
  private openRunResultOverlay(): void {}

  private getVisibleWorldObjects(): Array<{
    sortY: number;
    draw: () => void;
  }> {
    return [];
  }
}
```

其中 `PromptRenderer.drawAt()` 可能在现有项目中不存在。Agent 可以：

* 扩展 `PromptRenderer`；
* 或在世界空间内绘制提示；
* 但提示位置必须正确减去摄像机坐标。

---

# 十一、HubMap 数据草案

```ts
// src/game/hub/HubMap.ts

import type {
  WorldMapDefinition,
  WorldObjectDefinition,
} from "../world/WorldMap";

const WIDTH = 80;
const HEIGHT = 60;
const TILE_SIZE = 16;

function emptyLayer(): number[] {
  return Array.from(
    { length: WIDTH * HEIGHT },
    () => 0,
  );
}

const ground = emptyLayer();
const groundDetail = emptyLayer();
const collision = emptyLayer();
const backObjects = emptyLayer();
const upperObjects = emptyLayer();

function fillRect(
  layer: number[],
  tileId: number,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  for (
    let tileY = y;
    tileY < y + height;
    tileY++
  ) {
    for (
      let tileX = x;
      tileX < x + width;
      tileX++
    ) {
      if (
        tileX < 0 ||
        tileY < 0 ||
        tileX >= WIDTH ||
        tileY >= HEIGHT
      ) {
        continue;
      }

      layer[
        tileY * WIDTH + tileX
      ] = tileId;
    }
  }
}

// 基础地面
fillRect(
  ground,
  1,
  0,
  0,
  WIDTH,
  HEIGHT,
);

// 外围阻挡
fillRect(collision, 1, 0, 0, WIDTH, 2);
fillRect(collision, 1, 0, HEIGHT - 2, WIDTH, 2);
fillRect(collision, 1, 0, 0, 2, HEIGHT);
fillRect(collision, 1, WIDTH - 2, 0, 2, HEIGHT);

// 重生泉碰撞
fillRect(collision, 1, 36, 27, 9, 7);

// 建筑轮廓第一版可以在这里继续填充

const objects: WorldObjectDefinition[] = [
  {
    id: "rebirth_spring",
    type: "interactable",
    x: 40 * TILE_SIZE - 24,
    y: 33 * TILE_SIZE,
    width: 48,
    height: 24,
    sortY: 33 * TILE_SIZE + 24,
    action: "open_rebirth_spring",
    promptKey: "hub.rebirthSpring",
  },
  {
    id: "expedition_gate",
    type: "portal",
    x: 36 * TILE_SIZE,
    y: 53 * TILE_SIZE,
    width: 8 * TILE_SIZE,
    height: 4 * TILE_SIZE,
    sortY: 57 * TILE_SIZE,
    action: "open_expedition",
    promptKey: "hub.expeditionGate",
  },
  {
    id: "blacksmith_forge",
    type: "interactable",
    x: 8 * TILE_SIZE,
    y: 26 * TILE_SIZE,
    width: 4 * TILE_SIZE,
    height: 4 * TILE_SIZE,
    sortY: 30 * TILE_SIZE,
    action: "open_meta_upgrades",
    promptKey: "hub.blacksmith",
    properties: {
      tab: "body",
    },
  },
  {
    id: "enchanting_table",
    type: "interactable",
    x: 17 * TILE_SIZE,
    y: 26 * TILE_SIZE,
    width: 4 * TILE_SIZE,
    height: 4 * TILE_SIZE,
    sortY: 30 * TILE_SIZE,
    action: "open_meta_upgrades",
    promptKey: "hub.enchanter",
    properties: {
      tab: "arcane",
    },
  },
  {
    id: "archive_monument",
    type: "interactable",
    x: 10 * TILE_SIZE,
    y: 10 * TILE_SIZE,
    width: 3 * TILE_SIZE,
    height: 3 * TILE_SIZE,
    sortY: 13 * TILE_SIZE,
    action: "open_records",
    promptKey: "hub.records",
    properties: {
      tab: "runs",
    },
  },
  {
    id: "codex_lectern",
    type: "interactable",
    x: 17 * TILE_SIZE,
    y: 10 * TILE_SIZE,
    width: 3 * TILE_SIZE,
    height: 3 * TILE_SIZE,
    sortY: 13 * TILE_SIZE,
    action: "open_records",
    promptKey: "hub.codex",
    properties: {
      tab: "codex",
    },
  },
  {
    id: "astral_console",
    type: "interactable",
    x: 64 * TILE_SIZE,
    y: 9 * TILE_SIZE,
    width: 4 * TILE_SIZE,
    height: 4 * TILE_SIZE,
    sortY: 13 * TILE_SIZE,
    action: "open_settings",
    promptKey: "hub.settings",
  },
  {
    id: "armory_rack",
    type: "interactable",
    x: 62 * TILE_SIZE,
    y: 25 * TILE_SIZE,
    width: 5 * TILE_SIZE,
    height: 4 * TILE_SIZE,
    sortY: 29 * TILE_SIZE,
    action: "open_armory",
    promptKey: "hub.armory",
  },
  {
    id: "trial_altar",
    type: "interactable",
    x: 67 * TILE_SIZE,
    y: 46 * TILE_SIZE,
    width: 5 * TILE_SIZE,
    height: 5 * TILE_SIZE,
    sortY: 51 * TILE_SIZE,
    action: "open_challenge",
    promptKey: "hub.trialAltar",
  },
];

export const HUB_MAP: WorldMapDefinition = {
  id: "ashen_sanctuary",

  widthTiles: WIDTH,
  heightTiles: HEIGHT,
  tileSize: TILE_SIZE,

  layers: [
    {
      id: "ground",
      tiles: ground,
    },
    {
      id: "groundDetail",
      tiles: groundDetail,
    },
    {
      id: "collision",
      tiles: collision,
      visible: false,
    },
    {
      id: "backObjects",
      tiles: backObjects,
    },
    {
      id: "upperObjects",
      tiles: upperObjects,
    },
  ],

  objects,

  spawnPoints: {
    rebirth_spring: {
      x: 40 * TILE_SIZE + 8,
      y: 35 * TILE_SIZE + 8,
    },

    expedition_gate: {
      x: 40 * TILE_SIZE + 8,
      y: 50 * TILE_SIZE + 8,
    },

    medical_return: {
      x: 34 * TILE_SIZE + 8,
      y: 47 * TILE_SIZE + 8,
    },

    central_plaza: {
      x: 40 * TILE_SIZE + 8,
      y: 38 * TILE_SIZE + 8,
    },
  },
};
```

---

# 十二、HubProgress 存档结构

```ts
// src/game/hub/HubProgress.ts

export interface HubProgress {
  anchorId: string;

  x?: number;
  y?: number;

  visitedZones: string[];
  unlockedFacilities: string[];
}

export function createDefaultHubProgress(): HubProgress {
  return {
    anchorId: "rebirth_spring",
    visitedZones: [],
    unlockedFacilities: [
      "rebirth_spring",
      "expedition_gate",
      "workshop",
      "archive",
      "observatory",
    ],
  };
}
```

加载位置时：

```ts
function resolveHubSpawn(
  progress: HubProgress,
  map: WorldMapDefinition,
  collision: WorldCollision,
): WorldPoint {
  if (
    Number.isFinite(progress.x) &&
    Number.isFinite(progress.y) &&
    !collision.isCircleBlocked(
      progress.x!,
      progress.y!,
      6,
    )
  ) {
    return {
      x: progress.x!,
      y: progress.y!,
    };
  }

  return (
    map.spawnPoints[
      progress.anchorId
    ] ??
    map.spawnPoints.rebirth_spring
  );
}
```

但以下情况应强制使用重生泉：

```text
新游戏启动
Run 失败返回
Run 胜利返回
存档迁移
地图版本变化
坐标失效
```

---

# 十三、Engine 流程调整建议

正式流程：

```ts
splash
→ hub
```

当前 `TitleState` 保留，但不再作为正常首次流程。

建议：

```ts
if (currentState === "splash") {
  switchState("hub", {
    spawnAnchor: "rebirth_spring",
  });
}
```

Run 失败：

```ts
engine.switchState("hub", {
  spawnAnchor: "rebirth_spring",
  showRunResult: true,
  outcome: "defeat",
});
```

Run 胜利：

```ts
engine.switchState("hub", {
  spawnAnchor: "rebirth_spring",
  showRunResult: true,
  outcome: "victory",
});
```

从远征门开始：

```ts
engine.data.startNewRun(
  selectedCharacterId,
  selectedWeaponId,
  hardMode,
);

engine.switchState("dungeon");
```

---

# 十四、Agent 开发边界

交给 agent 时，应额外强调：

```text
1. 不要让 HubState 继承 DungeonState。
2. 不要修改现有 Dungeon 地图尺寸。
3. 不要修改 MAP_WIDTH=20、MAP_HEIGHT=15 的现有含义。
4. 不要把 camera 逻辑直接塞进 EntityRenderer。
5. 不要让 UI 跟随摄像机移动。
6. 不要每帧遍历绘制整个 80×60 地图。
7. 不要将 Hub x/y 保存到 Dungeon player x/y。
8. 不要一次性删除 TitleState、CharacterSelectState、SettingsState。
9. 第一版先允许交互后切换旧 State；Overlay 化可以后续进行。
10. 所有摄像机平移最终必须 Math.round。
```

---

# 十五、第一轮具体交付建议

为了控制工作量，第一轮只要求：

```text
Camera2D
WorldMapDefinition
WorldMapRenderer
WorldCollision
HubMap 80×60
HubState 可移动
摄像机跟随
重生之泉
远征之门
工匠庭院
档案高塔
观星台
Splash → Hub
```

暂不要求：

```text
复杂 NPC AI
真正训练场战斗
建筑升级动画
Tiled 导入
室内外切换
屋顶淡出
天气
昼夜循环
基地剧情
```

完成第一轮并稳定后，再引入 Tiled 和更多场景表现。
