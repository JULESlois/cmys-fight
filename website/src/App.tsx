import { useEffect, useRef, useState } from "react";
import HeroCanvas from "./components/HeroCanvas";
import SpriteCanvas from "./components/SpriteCanvas";
import ChapterCanvas from "./components/ChapterCanvas";
import IconCanvas from "./components/IconCanvas";
import CountUp from "./components/CountUp";
import {
  CHARACTERS,
  CHAPTERS,
  COLLECTIONS,
  CONTROLS,
  FEATURES,
  GAME_URL,
  STATS,
  type CharacterInfo,
} from "./content";

/** 滚动进入视口时添加 .revealed 类 */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("revealed");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function CharacterCard({ c }: { c: CharacterInfo }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="char-card reveal"
      style={{ ["--accent" as string]: c.color }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="char-portrait">
        <SpriteCanvas
          sprite={c.sprite}
          body={c.color}
          hair={c.hair}
          accent={c.accent}
          hovered={hovered}
        />
      </div>
      <div className="char-name">{c.name}</div>
      <div className="char-title">{c.title}</div>
      <div className="char-stats">
        <span title="生命">❤ {c.stats.hp}</span>
        <span title="护甲">🛡 {c.stats.armor}</span>
        <span title="能量">✦ {c.stats.mana}</span>
        <span title="速度">➤ {c.stats.speed}</span>
      </div>
      <p className="char-passive">{c.passive}</p>
    </div>
  );
}

export default function App() {
  useReveal();
  const [collection, setCollection] = useState<string>("all");
  const [chapterName, setChapterName] = useState(CHAPTERS[0].name);
  const heroRef = useRef<HTMLDivElement>(null);

  const shown =
    collection === "all" ? CHARACTERS : CHARACTERS.filter((c) => c.collection === collection);

  return (
    <div className="site">
      {/* ======== 导航 ======== */}
      <nav className="nav">
        <a className="nav-logo" href="#top">
          <span className="logo-block c1">C</span>
          <span className="logo-block c2">M</span>
          <span className="logo-block c3">Y</span>
          <span className="logo-block c4">S</span>
          <span className="nav-logo-text">FIGHT</span>
        </a>
        <div className="nav-links">
          <a href="#features">特色</a>
          <a href="#characters">角色</a>
          <a href="#chapters">章节</a>
          <a href="#controls">操作</a>
          <a className="nav-alt-style" href="./pop.html" title="切换到几何波普风版本">
            ◧ 波普版
          </a>
          <a className="nav-play" href={GAME_URL}>
            ▶ 开始游戏
          </a>
        </div>
      </nav>

      {/* ======== Hero ======== */}
      <header className="hero" id="top" ref={heroRef}>
        <HeroCanvas className="hero-canvas" onChapterChange={setChapterName} />
        <div className="hero-scanlines" aria-hidden />
        <div className="hero-chapter-pill" key={chapterName}>
          NOW ▶ {chapterName}
        </div>
        <div className="hero-inner">
          <p className="hero-kicker blink-slow">— INSERT COIN —</p>
          <h1 className="hero-title">
            <span className="hero-title-en">CMYS FIGHT</span>
            <span className="hero-title-zh">深层档案 · Deep Archive</span>
          </h1>
          <p className="hero-tagline">
            复古像素动作 Roguelite —— 四大章节、八名角色、57 件武器,
            <br />
            每一次深潜,都是一张全新的地图。
          </p>
          <div className="hero-cta">
            <a className="px-btn primary" href={GAME_URL}>
              ▶ 立即开玩
            </a>
            <a className="px-btn ghost" href="#features">
              了解更多
            </a>
          </div>
          <p className="hero-hint">支持 键盘 / 手柄 / 触屏 · PWA 可离线</p>
        </div>
        <div className="hero-bottom-fade" aria-hidden />
      </header>

      {/* ======== 数据统计 ======== */}
      <section className="stats-bar">
        {STATS.map((s) => (
          <div className="stat reveal" key={s.label}>
            <div className="stat-value">
              <CountUp value={s.value} />
            </div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ======== 特色 ======== */}
      <section className="section" id="features">
        <h2 className="section-title reveal">
          <span className="title-deco" /> 游戏特色 <span className="title-deco flip" />
        </h2>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div className="feature-card reveal" key={f.title} style={{ ["--accent" as string]: f.color }}>
              <div className="feature-icon">
                <IconCanvas icon={f.icon} color={f.color} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="px-divider base-to-alt" aria-hidden />

      {/* ======== 角色 ======== */}
      <section className="section alt" id="characters">
        <h2 className="section-title reveal">
          <span className="title-deco" /> 集结你的角色 <span className="title-deco flip" />
        </h2>
        <div className="collection-tabs reveal">
          <button
            className={`tab ${collection === "all" ? "active" : ""}`}
            onClick={() => setCollection("all")}
          >
            全部
          </button>
          {Object.entries(COLLECTIONS).map(([id, col]) => (
            <button
              key={id}
              className={`tab ${collection === id ? "active" : ""}`}
              style={{ ["--accent" as string]: col.color }}
              onClick={() => setCollection(id)}
            >
              {col.name} · {col.label}
            </button>
          ))}
        </div>
        {collection !== "all" && (
          <p className="collection-desc reveal revealed">{COLLECTIONS[collection].description}</p>
        )}
        <div className="char-grid" key={collection}>
          {shown.map((c) => (
            <CharacterCard key={c.id} c={c} />
          ))}
        </div>
      </section>

      <div className="px-divider alt-to-base" aria-hidden />

      {/* ======== 章节 ======== */}
      <section className="section" id="chapters">
        <h2 className="section-title reveal">
          <span className="title-deco" /> 深入四大章节 <span className="title-deco flip" />
        </h2>
        <p className="section-sub reveal">每章四关,终点是把守档案的 Boss。</p>
        <div className="chapter-grid">
          {CHAPTERS.map((ch, i) => (
            <div className="chapter-card reveal" key={ch.id} style={{ transitionDelay: `${i * 90}ms` }}>
              <ChapterCanvas chapter={ch} />
              <div className="chapter-info">
                <div className="chapter-index">{ch.index}</div>
                <div className="chapter-name">{ch.name}</div>
                <div className="chapter-en">{ch.en}</div>
                <p className="chapter-blurb">{ch.blurb}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="px-divider base-to-alt" aria-hidden />

      {/* ======== 操作 ======== */}
      <section className="section alt" id="controls">
        <h2 className="section-title reveal">
          <span className="title-deco" /> 上手即玩 <span className="title-deco flip" />
        </h2>
        <div className="controls-wrap reveal">
          <table className="controls-table">
            <thead>
              <tr>
                <th>动作</th>
                <th>⌨ 键盘</th>
                <th>🎮 手柄</th>
                <th>👆 触屏</th>
              </tr>
            </thead>
            <tbody>
              {CONTROLS.map((row) => (
                <tr key={row.action}>
                  <td>{row.action}</td>
                  <td>
                    <kbd>{row.key}</kbd>
                  </td>
                  <td>{row.pad}</td>
                  <td>{row.touch}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="controls-note">按键可在游戏内「设置」中自由重绑,触屏布局支持左右手切换。</p>
        </div>
      </section>

      <div className="px-divider alt-to-base" aria-hidden />

      {/* ======== 底部 CTA ======== */}
      <section className="final-cta">
        <div className="final-inner reveal">
          <h2>
            准备好潜入<span className="hl">深层档案</span>了吗?
          </h2>
          <p>无需下载客户端,浏览器即点即玩,还能安装为离线 PWA。</p>
          <a className="px-btn primary big bounce" href={GAME_URL}>
            ▶ PRESS START
          </a>
        </div>
      </section>

      {/* ======== 页脚 ======== */}
      <footer className="footer">
        <div className="footer-logo">
          <span className="logo-block c1">C</span>
          <span className="logo-block c2">M</span>
          <span className="logo-block c3">Y</span>
          <span className="logo-block c4">S</span>
          <span className="nav-logo-text">FIGHT: DEEP ARCHIVE</span>
        </div>
        <p>
          TypeScript + React + 自研 Canvas 引擎 · 320×240 原生像素分辨率 ·{" "}
          <a href={GAME_URL}>开始游戏</a>
        </p>
        <p className="footer-tiny">© 2026 CMYS FIGHT PROJECT · 本页面所有像素画与动效均由 Canvas 实时绘制</p>
      </footer>
    </div>
  );
}
