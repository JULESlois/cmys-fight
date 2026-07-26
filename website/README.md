# CMYS Fight 官方网站

CMYS Fight: Deep Archive 的官方宣传网站 —— React + Vite + TypeScript,
全部图形与动效均由 **Canvas 实时绘制**(无任何图片资源)。

**双版本,导航栏一键互切:**

| 入口 | 风格 |
| --- | --- |
| `index.html` | 复古像素卡通(暗色,320×240 游戏同款质感) |
| `pop.html` | 几何波普(奶油纸底、大色块、粗黑描边、半调网点、跑马灯) |

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

## 结构

```
website/
├── index.html              # 字体引入(Press Start 2P + ZCOOL KuaiLe)
├── src/
│   ├── content.ts          # 官网全部文案/角色/章节数据(取自游戏源码)
│   ├── pixel/sprites.ts    # 字符网格像素精灵 + 绘制工具
│   ├── components/
│   │   ├── HeroCanvas.tsx  # 首屏动画大场景
│   │   ├── SpriteCanvas.tsx# 角色立绘(弹簧 Q 弹)
│   │   ├── ChapterCanvas.tsx # 章节迷你房间
│   │   ├── IconCanvas.tsx  # 特色像素图标
│   │   └── CountUp.tsx     # 数字滚动
│   ├── App.tsx             # 页面结构
│   └── styles.css          # 像素卡通样式
```
