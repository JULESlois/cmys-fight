# CMYS Fight 官方网站

CMYS Fight: Deep Archive 的官方宣传网站 —— React + Vite + TypeScript,
全部图形与动效均由 **Canvas 实时绘制**(无任何图片资源)。

**三版本,导航栏一键互切:**

| 入口 | 风格 |
| --- | --- |
| `index.html` | 复古像素卡通(暗色,320×240 游戏同款质感) |
| `pop.html` | 几何波普(奶油纸底、大色块、粗黑描边、半调网点、跑马灯) |
| `world.html` | 双世界 · 卡拉彼丘 × 异环(分屏对切、弦化纸片、霓虹异象) |

## 双世界版 `world.html`

首屏是**对角分屏**:左侧「弦界」明亮通透(漂浮纸片、超弦光丝、体积光),
右侧「异环」霓虹雨夜(天际线、雨幕、异象环、随机故障色带),
巨大的 `CMYS FIGHT` 标题被接缝斜切成一半深色一半亮色。
移动鼠标可以推动世界边界,顶部切换器能锁定单一世界 —— 锁定后整站换肤
(弦界=亮色主题 / 异环=暗紫霓虹主题),角色名录也只显示该世界的成员。

角色卡悬停触发 **弦化**:立绘沿 Y 轴翻转到边缘消失,同时二维纸片形态横向弹开,
配一道折光。角色阵营直接映射到世界:`strinova → 弦界`、`nte → 异环`、`cmys → 双界通行`。

**素材是可替换槽位** —— 见下节。

波普版亮点:漂浮 Memphis 几何形 + 旋转星芒 + 弹跳笑脸球 + 漫画 POW 爆炸字的
Hero 场景;八名角色的**几何拼贴头像**(圆头 + 职业形状身体 + 专属道具,眨眼、
腮红、悬停星芒);四章节**扁平海报**(旋转光线、落雪、余烬、萤火虫);统计数字
套 12 角星芒徽章,另有跑马灯横幅、斜纹分隔带、贴纸徽章与对话气泡。

## 亮点

- **Hero 动画场景**:480×270 低分辨率 Canvas 放大渲染,四大章节调色板自动轮播,
  主题景物随章节切换(松树 / 符文石柱 / 冰锥 / 熔炉烟囱)+ 像素日月 + 主题天气
  (萤火虫 / 符文微粒 / 落雪 / 余烬);主角两帧跑步 + 枪口火光,史莱姆挤压弹跳
  带落地尘土,击杀掉落旋转金币,粒子爆裂、POW 弹字、CRT 扫描线与暗角。
- **角色像素立绘**:8 名角色的精灵由字符网格程序化生成,绘制时自动加高光/落影
  (自带体积感),待机浮动、眨眼,悬停时弹簧 Q 弹 + 冒星星;米雪儿持 Inspector
  步枪、香奈美持麦克风飘音符。
- **章节小场景**:每章一块会动的迷你房间(传送门脉冲、危险地块闪烁、巡逻史莱姆、
  发光宝箱),并带主题装饰:森林松树萤火虫、地牢火把光晕、落雪雪堆、熔岩余烬裂缝。
  调色板直接取自游戏源码 `palettes.ts`。
- **像素 UI 细节**:全站切角面板(clip-path + 硬阴影)、Section 间锯齿分隔条、
  像素箭头光标、像素滚动条、CRT 立绘扫描纹,以及数字滚动、滚动显现、按钮果冻
  弹跳、LOGO 方块跳跃等卡通动效,支持 `prefers-reduced-motion`。

## 运行

```bash
cd website
npm install
npm run dev        # http://localhost:3100
```

构建:

```bash
npm run build      # 输出到 dist/,base 为 "./",可部署到任意子路径
npm run preview
```

## 配置

「开始游戏」按钮的跳转地址在 `src/content.ts` 顶部:

```ts
export const GAME_URL = "http://localhost:3000/";
```

部署时改成游戏的正式地址即可。

## 素材槽位(双世界版)

双世界版的立绘与主视觉都是**可替换槽位**:把图按约定文件名放进 `public/assets/`,
刷新即生效,不需要改代码;缺图时自动回退到程序化生成的「全息档案卡」占位图,
所以可以一次只补一部分。完整清单见 [`public/assets/README.md`](public/assets/README.md)。

```
public/assets/
├── characters/<id>.png     角色立绘   900×1350 透明 PNG(8 个)
├── chapters/<id>.jpg       章节主视觉 1600×900(4 个)
├── hero/string.jpg         首屏·弦界侧 1920×1080
├── hero/nte.jpg            首屏·异环侧 1920×1080
└── logo.png
```

仓库内不附带任何第三方美术资源,请使用你拥有使用权的素材。

## 结构

三个版本共用同一份内容数据 `src/content.ts`,改文案三版同步生效。

```
website/
├── index.html                    # 入口一 · 像素版
├── pop.html                      # 入口二 · 波普版
├── world.html                    # 入口三 · 双世界版
├── public/assets/                # 素材槽位(见上)
├── src/
│   ├── content.ts                # 三版共用的文案/角色/章节数据(取自游戏源码)
│   ├── components/CountUp.tsx    # 三版共用的数字滚动
│   │
│   ├── pixel/sprites.ts          # ── 像素版 ──
│   ├── components/HeroCanvas.tsx        首屏动画大场景
│   ├── components/SpriteCanvas.tsx      角色像素立绘(弹簧 Q 弹)
│   ├── components/ChapterCanvas.tsx     章节迷你房间
│   ├── components/IconCanvas.tsx        特色像素图标
│   ├── App.tsx / styles.css
│   │
│   ├── pop/PopApp.tsx            # ── 波普版 ──
│   ├── pop/PopHeroCanvas.tsx            几何形 + 笑脸球 + 爆炸字
│   ├── pop/PopAvatar.tsx                几何拼贴头像
│   ├── pop/PopChapterCanvas.tsx         扁平章节海报
│   ├── pop/PopIcon.tsx / pop.css
│   │
│   ├── world/WorldApp.tsx        # ── 双世界版 ──
│   ├── world/assets.ts                  素材槽位约定 + 双世界设定
│   ├── world/PaperCanvas.tsx            弦界背景(纸片 / 超弦光丝)
│   ├── world/AnomalyCanvas.tsx          异环背景(霓虹都市 / 雨 / 故障)
│   ├── world/CharacterVisual.tsx        角色槽位 + 全息档案卡回退
│   ├── world/ChapterVisual.tsx          章节槽位 + 抽象场景回退
│   └── world/world.css
```
