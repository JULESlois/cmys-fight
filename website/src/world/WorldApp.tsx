import { useCallback, useEffect, useRef, useState } from "react";
import PaperCanvas from "./PaperCanvas";
import AnomalyCanvas from "./AnomalyCanvas";
import CharacterVisual from "./CharacterVisual";
import ChapterVisual from "./ChapterVisual";
import CountUp from "../components/CountUp";
import {
  CHAPTER_WORLD,
  SLOTS,
  SLOT_HINT,
  WORLDS,
  worldOfCollection,
  type WorldId,
} from "./assets";
import {
  CHAPTERS,
  CHARACTERS,
  CONTROLS,
  FEATURES,
  GAME_URL,
  STATS,
  type CharacterInfo,
} from "../content";

/* ---------------- 滚动显现 ---------------- */
function useReveal(dep: unknown) {
  useEffect(() => {
    const els = document.querySelectorAll(".w-reveal:not(.in)");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [dep]);
}

/* ---------------- 首屏背景素材槽(带回退) ---------------- */
function HeroBackdrop({ side }: { side: "string" | "nte" }) {
  const [ok, setOk] = useState(false);
  const src = side === "string" ? SLOTS.heroString() : SLOTS.heroNte();
  return (
    <>
      {side === "string" ? (
        <PaperCanvas className="whero__canvas" />
      ) : (
        <AnomalyCanvas className="whero__canvas" />
      )}
      <img
        className="whero__photo"
        style={{ opacity: ok ? 1 : 0 }}
        src={src}
        alt=""
        aria-hidden
        onLoad={() => setOk(true)}
        onError={() => setOk(false)}
      />
    </>
  );
}

/* ---------------- 弦化角色卡 ---------------- */
function StringifyCard({ c }: { c: CharacterInfo }) {
  const world = worldOfCollection(c.collection);
  const meta = WORLDS[world];
  const initial = (c.name.match(/[A-Za-z]/)?.[0] ?? c.name[0] ?? "?").toUpperCase();

  return (
    <article
      className="wchar w-reveal"
      data-cw={world}
      style={{ ["--c" as string]: c.color, ["--wc" as string]: meta.accent }}
    >
      <div className="wchar__stage">
        <div className="wchar__solid">
          <CharacterVisual char={c} />
        </div>

        {/* 弦化后的二维纸片形态 */}
        <div className="wchar__paper" aria-hidden>
          <span className="wchar__paper-glyph">{initial}</span>
          <span className="wchar__paper-label">
            弦化 · STRINGIFIED
            <em>2D FORM — 可贴墙 / 可穿缝</em>
          </span>
        </div>

        <span className="wchar__fold" aria-hidden />
        <span className="wchar__world-tag">{meta.tag}</span>
      </div>

      <div className="wchar__body">
        <h3 className="wchar__name">{c.name}</h3>
        <p className="wchar__title">{c.title}</p>
        <div className="wchar__bars">
          {[
            { k: "HP", v: c.stats.hp, max: 10 },
            { k: "ARM", v: c.stats.armor, max: 10 },
            { k: "EN", v: c.stats.mana, max: 60 },
            { k: "SPD", v: c.stats.speed, max: 120 },
          ].map((s) => (
            <div className="wbar" key={s.k}>
              <span className="wbar__k">{s.k}</span>
              <span className="wbar__track">
                <span className="wbar__fill" style={{ width: `${(s.v / s.max) * 100}%` }} />
              </span>
              <span className="wbar__v">{s.v}</span>
            </div>
          ))}
        </div>
        <p className="wchar__passive">{c.passive}</p>
      </div>
    </article>
  );
}

/* ============================================================ */

export default function WorldApp() {
  const [world, setWorld] = useState<WorldId>("fusion");
  const [seam, setSeam] = useState(50);
  const heroRef = useRef<HTMLElement>(null);
  const pointerRef = useRef(0);

  const visible =
    world === "fusion"
      ? CHARACTERS
      : CHARACTERS.filter(
          (c) => worldOfCollection(c.collection) === world || c.collection === "cmys"
        );

  useReveal(world);

  // 分割线:融合态缓慢呼吸 + 鼠标横向牵引;单世界态推到底
  useEffect(() => {
    let raf = 0;
    let t = 0;
    let running = true;
    const tick = () => {
      if (!running) return;
      t += 1 / 60;
      // 锁定单一世界时推过头一点,免得斜切在角落留下另一世界的三角形残片
      const target =
        world === "string" ? 109 : world === "nte" ? -9 : 50 + Math.sin(t * 0.35) * 4 + pointerRef.current;
      setSeam((s) => s + (target - s) * 0.06);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [world]);

  const onHeroMove = useCallback(
    (e: React.MouseEvent) => {
      if (world !== "fusion") return;
      const el = heroRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      pointerRef.current = ((e.clientX - r.left) / r.width - 0.5) * 26;
    },
    [world]
  );

  const heroSeam = seam;
  const seamPct = Math.round(Math.min(100, Math.max(0, seam)));

  return (
    <div className="wsite" data-world={world}>
      {/* ================= 导航 ================= */}
      <nav className="wnav">
        <a className="wnav__logo" href="#top">
          <span className="wnav__mark" aria-hidden>
            <i />
            <i />
          </span>
          <span className="wnav__wordmark">
            CMYS<b>FIGHT</b>
          </span>
        </a>

        <div className="wnav__switch" role="group" aria-label="世界切换">
          {(["string", "fusion", "nte"] as WorldId[]).map((w) => (
            <button
              key={w}
              className={`wnav__seg ${world === w ? "on" : ""}`}
              data-w={w}
              onClick={() => setWorld(w)}
            >
              <span>{WORLDS[w].name}</span>
              <em>{WORLDS[w].en}</em>
            </button>
          ))}
        </div>

        <div className="wnav__links">
          <a href="#wchars">角色</a>
          <a href="#wchapters">章节</a>
          <a href="#wsystems">系统</a>
          <a className="wnav__alt" href="./index.html">
            ▦ 像素版
          </a>
          <a className="wnav__alt" href="./pop.html">
            ◧ 波普版
          </a>
          <a className="wnav__play" href={GAME_URL}>
            ▶ 开始游戏
          </a>
        </div>
      </nav>

      {/* ================= 分屏 Hero ================= */}
      <header
        className="whero"
        id="top"
        ref={heroRef}
        onMouseMove={onHeroMove}
        style={{ ["--seam" as string]: `${heroSeam}%` }}
      >
        {(["string", "nte"] as const).map((side) => (
          <div className={`whero__side whero__side--${side}`} key={side}>
            <div className="whero__bg">
              <HeroBackdrop side={side} />
            </div>
            {/* 居中区:两侧内容完全一致,由接缝斜切成双色 */}
            <div className="whero__stage">
              <p className="whero__kicker">DEEP ARCHIVE · 双世界重叠</p>
              <h1 className="whero__title glitch" data-text="CMYS FIGHT">
                CMYS FIGHT
              </h1>
              <p className="whero__sub">深层档案 · DEEP ARCHIVE</p>
              <div className="whero__cta">
                <a className="wbtn wbtn--primary" href={GAME_URL}>
                  ▶ 进入档案
                </a>
                <a className="wbtn" href="#wworlds">
                  双世界设定 ↓
                </a>
              </div>
            </div>

            {/* 侧栏:各自世界的专属文案,落在自己的领地里 */}
            <aside className={`whero__aside whero__aside--${side}`}>
              <span className="whero__aside-tag">{WORLDS[side].tag}</span>
              <h2>
                {WORLDS[side].name}
                <em>{WORLDS[side].en}</em>
              </h2>
              <p>
                {side === "string"
                  ? "把自己压平成一张纸,贴上墙面、滑过缝隙——弦界的战斗不在三维里进行。"
                  : "霓虹与雨幕之下,异象正在城市裂缝中苏醒。异能者的猎捕从今夜开始。"}
              </p>
            </aside>
          </div>
        ))}

        <span className="whero__seam" aria-hidden />

        <div className="whero__meter" aria-hidden>
          <span className="whero__meter-l" style={{ opacity: seamPct / 100 }}>
            弦界 {seamPct}%
          </span>
          <span className="whero__meter-r" style={{ opacity: 1 - seamPct / 100 }}>
            {100 - seamPct}% 异环
          </span>
        </div>

        <p className="whero__hint">
          {world === "fusion" ? "移动鼠标推动世界边界 · 或用顶部切换器锁定单一世界" : "点击顶部「融合」回到双世界"}
        </p>
      </header>

      {/* ================= 数据条 ================= */}
      <section className="wstats">
        {STATS.map((s) => (
          <div className="wstat w-reveal" key={s.label}>
            <b>
              <CountUp value={s.value} />
            </b>
            <span>{s.label}</span>
          </div>
        ))}
        <div className="wstat wstat--slot w-reveal">
          <b>2</b>
          <span>重叠世界</span>
        </div>
      </section>

      {/* ================= 双世界设定 ================= */}
      <section className="wsection" id="wworlds">
        <header className="whead w-reveal">
          <span className="whead__rule" />
          <h2>双世界 · DUAL LAYER</h2>
          <p>两套物理法则在同一份档案里重叠。你选择站在哪一层?</p>
        </header>

        <div className="wworld-grid">
          {(["string", "nte"] as WorldId[]).map((w) => {
            const m = WORLDS[w];
            const roster = CHARACTERS.filter((c) => worldOfCollection(c.collection) === w);
            return (
              <button
                key={w}
                className={`wworld w-reveal ${world === w ? "on" : ""}`}
                data-cw={w}
                style={{ ["--wc" as string]: m.accent }}
                onClick={() => setWorld(world === w ? "fusion" : w)}
              >
                <span className="wworld__tag">{m.tag}</span>
                <h3>
                  {m.name}
                  <em>{m.en}</em>
                </h3>
                <p>{m.blurb}</p>
                <ul className="wworld__roster">
                  {roster.map((c) => (
                    <li key={c.id} style={{ ["--c" as string]: c.color }}>
                      {c.name}
                    </li>
                  ))}
                </ul>
                <span className="wworld__cta">
                  {world === w ? "◉ 当前锁定 — 点击返回融合" : "锁定这个世界 →"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ================= 角色 ================= */}
      <section className="wsection wsection--alt" id="wchars">
        <header className="whead w-reveal">
          <span className="whead__rule" />
          <h2 className="glitch" data-text="超弦体名录">
            超弦体名录
          </h2>
          <p>
            当前显示 <b>{visible.length}</b> / {CHARACTERS.length} 名角色
            {world !== "fusion" && ` · 已锁定「${WORLDS[world].name}」`} — 悬停任意卡片触发
            <b> 弦化</b>。
          </p>
        </header>

        <div className="wchar-grid" key={world}>
          {visible.map((c) => (
            <StringifyCard key={c.id} c={c} />
          ))}
        </div>
      </section>

      {/* ================= 章节 ================= */}
      <section className="wsection" id="wchapters">
        <header className="whead w-reveal">
          <span className="whead__rule" />
          <h2>档案层 · CHAPTERS</h2>
          <p>四大章节,每章四关,终点是把守档案的 Boss。</p>
        </header>

        <div className="wchapter-list">
          {CHAPTERS.map((ch, i) => (
            <article
              className="wchapter w-reveal"
              key={ch.id}
              data-cw={CHAPTER_WORLD[ch.id]}
              style={{ ["--wc" as string]: WORLDS[CHAPTER_WORLD[ch.id] ?? "fusion"].accent }}
            >
              <div className="wchapter__media">
                <ChapterVisual chapter={ch} />
              </div>
              <div className="wchapter__body">
                <span className="wchapter__no">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p className="wchapter__idx">
                    {ch.index} · {WORLDS[CHAPTER_WORLD[ch.id] ?? "fusion"].name}
                  </p>
                  <h3>{ch.name}</h3>
                  <p className="wchapter__en">{ch.en}</p>
                  <p className="wchapter__blurb">{ch.blurb}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ================= 系统 ================= */}
      <section className="wsection wsection--alt" id="wsystems">
        <header className="whead w-reveal">
          <span className="whead__rule" />
          <h2>核心系统 · SYSTEMS</h2>
        </header>

        <div className="wsys-grid">
          {FEATURES.map((f, i) => (
            <article className="wsys w-reveal" key={f.title} style={{ ["--c" as string]: f.color }}>
              <span className="wsys__no">{String(i + 1).padStart(2, "0")}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
              <span className="wsys__line" />
            </article>
          ))}
        </div>
      </section>

      {/* ================= 操作 ================= */}
      <section className="wsection" id="wcontrols">
        <header className="whead w-reveal">
          <span className="whead__rule" />
          <h2>操作 · CONTROLS</h2>
        </header>
        <div className="wtable-wrap w-reveal">
          <table className="wtable">
            <thead>
              <tr>
                <th>动作</th>
                <th>键盘</th>
                <th>手柄</th>
                <th>触屏</th>
              </tr>
            </thead>
            <tbody>
              {CONTROLS.map((r) => (
                <tr key={r.action}>
                  <td>{r.action}</td>
                  <td>
                    <kbd>{r.key}</kbd>
                  </td>
                  <td>{r.pad}</td>
                  <td>{r.touch}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="wnote">按键可在游戏内「设置」中自由重绑,触屏布局支持左右手切换。</p>
        </div>
      </section>

      {/* ================= 素材槽位说明 ================= */}
      <section className="wsection wsection--alt" id="wassets">
        <header className="whead w-reveal">
          <span className="whead__rule" />
          <h2>素材槽位 · ASSET SLOTS</h2>
          <p>本页所有立绘与主视觉都是可替换的槽位。把图放进对应路径,刷新即生效,不需要改代码。</p>
        </header>
        <div className="wslot-grid w-reveal">
          {[
            { p: "assets/characters/<id>.png", d: "角色立绘 · 900×1350 透明 PNG", n: "8 个" },
            { p: SLOT_HINT.chapter("<id>"), d: "章节主视觉 · 1600×900", n: "4 个" },
            { p: SLOT_HINT.hero("string"), d: "首屏 · 弦界侧背景 1920×1080", n: "1 个" },
            { p: SLOT_HINT.hero("nte"), d: "首屏 · 异环侧背景 1920×1080", n: "1 个" },
          ].map((s) => (
            <div className="wslot" key={s.p}>
              <code>{s.p}</code>
              <p>{s.d}</p>
              <span>{s.n}</span>
            </div>
          ))}
        </div>
        <p className="wnote w-reveal">
          缺图时自动回退到程序化生成的全息档案卡(现在看到的就是)。详见{" "}
          <code>public/assets/README.md</code>。
        </p>
      </section>

      {/* ================= CTA ================= */}
      <section className="wcta">
        <h2 className="glitch" data-text="ENTER THE DEEP ARCHIVE">
          ENTER THE DEEP ARCHIVE
        </h2>
        <p>无需下载客户端,浏览器即点即玩,可安装为离线 PWA。</p>
        <a className="wbtn wbtn--primary wbtn--big" href={GAME_URL}>
          ▶ 立即进入
        </a>
      </section>

      {/* ================= 页脚 ================= */}
      <footer className="wfooter">
        <div className="wfooter__row">
          <span className="wnav__wordmark">
            CMYS<b>FIGHT</b>
          </span>
          <span>DEEP ARCHIVE · 双世界版</span>
        </div>
        <p>
          TypeScript + React + 自研 Canvas 引擎 · <a href={GAME_URL}>开始游戏</a> ·{" "}
          <a href="./index.html">像素版</a> · <a href="./pop.html">波普版</a>
        </p>
        <p className="wfooter__tiny">
          © 2026 CMYS FIGHT PROJECT · 本页未内置任何第三方美术资源,所有占位视觉均为程序化生成
        </p>
      </footer>
    </div>
  );
}
