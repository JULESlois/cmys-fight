import { useEffect, useState } from "react";
import PopHeroCanvas from "./PopHeroCanvas";
import PopAvatar from "./PopAvatar";
import PopChapterCanvas from "./PopChapterCanvas";
import PopIcon from "./PopIcon";
import CountUp from "../components/CountUp";
import {
  CHARACTERS,
  CHAPTERS,
  COLLECTIONS,
  CONTROLS,
  FEATURES,
  GAME_URL,
  STATS,
  type CharacterInfo,
} from "../content";

const POP_ACCENTS = ["#FFC800", "#FF5CA8", "#17B8A6", "#FF8A2B", "#7B4DFF", "#2764FF"];

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".pop-reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
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

const TICKER_TEXT =
  "CMYS FIGHT ★ DEEP ARCHIVE ★ RETRO ROGUELITE ★ 8 CHARACTERS ★ 57 WEAPONS ★ 36 ENEMIES ★ 4 CHAPTERS ★ PLAY IN BROWSER ★ ";

function Ticker() {
  return (
    <div className="pticker" aria-hidden>
      <div className="pticker-inner">
        <span>{TICKER_TEXT}</span>
        <span>{TICKER_TEXT}</span>
      </div>
    </div>
  );
}

function PopCharCard({ c, accent }: { c: CharacterInfo; accent: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="pchar pop-reveal"
      style={{ ["--accent" as string]: accent }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="pchar-portrait">
        <PopAvatar sprite={c.sprite} body={c.color} hair={c.hair} accent={accent} hovered={hovered} />
      </div>
      <div className="pchar-name">{c.name}</div>
      <div>
        <span className="pchar-title">{c.title}</span>
      </div>
      <div className="pchar-stats">
        <span title="生命">❤ {c.stats.hp}</span>
        <span title="护甲">🛡 {c.stats.armor}</span>
        <span title="能量">✦ {c.stats.mana}</span>
        <span title="速度">➤ {c.stats.speed}</span>
      </div>
      <p className="pchar-passive">{c.passive}</p>
    </div>
  );
}

export default function PopApp() {
  useReveal();
  const [collection, setCollection] = useState<string>("all");

  const shown =
    collection === "all" ? CHARACTERS : CHARACTERS.filter((c) => c.collection === collection);

  return (
    <div className="pop-site">
      {/* ======== 导航 ======== */}
      <nav className="pnav">
        <a className="pnav-logo" href="#top">
          <span className="pnav-shapes">
            <span className="shape-dot" />
            <span className="shape-tri" />
            <span className="shape-sq" />
          </span>
          <span className="pnav-title">CMYS FIGHT</span>
        </a>
        <div className="pnav-links">
          <a href="#pfeatures">特色</a>
          <a href="#pcharacters">角色</a>
          <a href="#pchapters">章节</a>
          <a href="#pcontrols">操作</a>
          <a className="pnav-pixel" href="./index.html" title="切换到复古像素版">
            ▦ 像素版
          </a>
          <a className="pnav-play" href={GAME_URL}>
            ▶ PLAY
          </a>
        </div>
      </nav>

      {/* ======== Hero ======== */}
      <header className="phero" id="top">
        <PopHeroCanvas className="phero-canvas" />
        <div className="phero-inner">
          <span className="phero-sticker">RETRO × ROGUELITE!</span>
          <h1 className="phero-title">
            CMYS
            <br />
            FIGHT
          </h1>
          <div className="phero-sub">深层档案 · DEEP ARCHIVE</div>
          <div>
            <div className="bubble">
              四大章节、八名角色、57 件武器——
              <br />
              每一次深潜,都是一张全新的地图!
            </div>
          </div>
          <div className="phero-cta">
            <a className="pbtn red wiggle" href={GAME_URL}>
              ▶ PLAY NOW!
            </a>
            <a className="pbtn secondary" href="#pfeatures">
              了解更多 →
            </a>
          </div>
          <p className="phero-hint">键盘 / 手柄 / 触屏 · PWA 可离线 · 浏览器即点即玩</p>
        </div>
      </header>

      <Ticker />

      {/* ======== 统计星芒 ======== */}
      <section className="pstats">
        {STATS.map((s) => (
          <div className="pstat pop-reveal" key={s.label}>
            <span className="pstat-burst" aria-hidden />
            <div className="pstat-core">
              <div className="pstat-value">
                <CountUp value={s.value} />
              </div>
              <div className="pstat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </section>

      <div className="stripe-band" aria-hidden />

      {/* ======== 特色 ======== */}
      <section className="psection" id="pfeatures">
        <div className="ptitle pop-reveal">
          <span className="deco-dot" />
          <h2>游戏特色</h2>
          <span className="deco-dot b" />
        </div>
        <div className="pfeatures">
          {FEATURES.map((f, i) => (
            <div
              className="pfeature pop-reveal"
              key={f.title}
              style={{ ["--accent" as string]: POP_ACCENTS[i % POP_ACCENTS.length] }}
            >
              <PopIcon icon={f.icon} color={POP_ACCENTS[i % POP_ACCENTS.length]} />
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="stripe-band pink" aria-hidden />

      {/* ======== 角色 ======== */}
      <section className="psection wide pchars-section" id="pcharacters">
        <div>
          <div className="ptitle pop-reveal" style={{ paddingTop: 88 }}>
            <span className="deco-dot" />
            <h2>集结你的角色</h2>
            <span className="deco-dot b" />
          </div>
          <div className="ptabs pop-reveal">
            <button
              className={`ptab ${collection === "all" ? "active" : ""}`}
              onClick={() => setCollection("all")}
            >
              全部
            </button>
            {Object.entries(COLLECTIONS).map(([id, col], i) => (
              <button
                key={id}
                className={`ptab ${collection === id ? "active" : ""}`}
                style={{ ["--accent" as string]: POP_ACCENTS[i % POP_ACCENTS.length] }}
                onClick={() => setCollection(id)}
              >
                {col.name} · {col.label}
              </button>
            ))}
          </div>
          {collection !== "all" && (
            <p className="pcollection-desc">{COLLECTIONS[collection].description}</p>
          )}
          <div className="pchar-grid" key={collection} style={{ paddingBottom: 88 }}>
            {shown.map((c, i) => (
              <PopCharCard key={c.id} c={c} accent={POP_ACCENTS[i % POP_ACCENTS.length]} />
            ))}
          </div>
        </div>
      </section>

      <div className="stripe-band blue" aria-hidden />

      {/* ======== 章节 ======== */}
      <section className="psection" id="pchapters">
        <div className="ptitle pop-reveal">
          <span className="deco-dot" />
          <h2>深入四大章节</h2>
          <span className="deco-dot b" />
        </div>
        <p className="psub pop-reveal">每章四关,终点是把守档案的 Boss。</p>
        <div className="pchapter-grid">
          {CHAPTERS.map((ch, i) => (
            <div className="pchapter pop-reveal" key={ch.id} style={{ transitionDelay: `${i * 80}ms` }}>
              <PopChapterCanvas chapter={ch} />
              <span className="pchapter-num">{i + 1}</span>
              <div className="pchapter-info">
                <div className="pchapter-name">{ch.name}</div>
                <div className="pchapter-en">{ch.en}</div>
                <p className="pchapter-blurb">{ch.blurb}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="stripe-band" aria-hidden />

      {/* ======== 操作 ======== */}
      <section className="psection wide pcontrols-section" id="pcontrols">
        <div style={{ paddingTop: 88, paddingBottom: 88 }}>
          <div className="ptitle pop-reveal">
            <span className="deco-dot" />
            <h2>上手即玩</h2>
            <span className="deco-dot b" />
          </div>
          <div className="ptable-wrap pop-reveal">
            <table className="ptable">
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
            <p className="pcontrols-note">按键可在游戏内「设置」中自由重绑,触屏布局支持左右手切换。</p>
          </div>
        </div>
      </section>

      {/* ======== 底部 CTA ======== */}
      <section className="pcta">
        <div className="pcta-shapes" aria-hidden>
          <span className="s1" />
          <span className="s2" />
          <span className="s3" />
          <span className="s4" />
        </div>
        <h2 className="pop-reveal">
          READY TO DIVE INTO <span className="hl">DEEP ARCHIVE</span>?
        </h2>
        <p className="pop-reveal">无需下载客户端,浏览器即点即玩,还能安装为离线 PWA。</p>
        <a className="pbtn big wiggle" href={GAME_URL}>
          ▶ PRESS START
        </a>
      </section>

      <Ticker />

      {/* ======== 页脚 ======== */}
      <footer className="pfooter">
        <div className="pfooter-shapes" aria-hidden>
          <span className="shape-dot" />
          <span className="shape-tri" />
          <span className="shape-sq" />
        </div>
        <p>
          CMYS FIGHT: DEEP ARCHIVE · TypeScript + React + 自研 Canvas 引擎 ·{" "}
          <a href={GAME_URL}>开始游戏</a> · <a href="./index.html">复古像素版</a>
        </p>
        <p className="pfooter-tiny">© 2026 CMYS FIGHT PROJECT · 本页面所有几何图形与动效均由 Canvas 与 CSS 实时绘制</p>
      </footer>
    </div>
  );
}
