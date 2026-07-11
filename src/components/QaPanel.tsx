import { useEffect, useMemo, useState } from "react";
import type { Engine } from "../game/Engine";
import { audio } from "../game/audio/AudioManager";
import type { MusicMode, MusicScene } from "../game/audio/MusicLibrary";
import {
  QA_MUSIC_SCENES,
  QA_STAGE_PRESETS,
  createQaSnapshot,
  runBrowserQaChecks,
  type QaCheck,
  type QaSnapshot,
} from "../game/qa/BrowserQa";

interface QaPanelProps {
  engine: Engine;
  canvas: HTMLCanvasElement;
}

const buttonClass = "rounded border border-cyan-300/40 bg-slate-900/90 px-2 py-1 text-[10px] text-cyan-100 active:bg-cyan-900/70 disabled:opacity-40";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function QaPanel({ engine, canvas }: QaPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [snapshot, setSnapshot] = useState<QaSnapshot>(() => createQaSnapshot(engine, canvas));
  const [checks, setChecks] = useState<QaCheck[]>([]);
  const [runningChecks, setRunningChecks] = useState(false);
  const [probeStatus, setProbeStatus] = useState("NOT RUN");
  const [selectedScene, setSelectedScene] = useState<MusicScene>(snapshot.audio.scene);

  useEffect(() => {
    const timer = window.setInterval(() => setSnapshot(createQaSnapshot(engine, canvas)), 300);
    return () => window.clearInterval(timer);
  }, [engine, canvas]);

  useEffect(() => setSelectedScene(snapshot.audio.scene), [snapshot.audio.scene]);

  const totals = useMemo(() => ({
    pass: checks.filter(check => check.status === "pass").length,
    warn: checks.filter(check => check.status === "warn").length,
    fail: checks.filter(check => check.status === "fail").length,
  }), [checks]);

  const runChecks = async () => {
    setRunningChecks(true);
    try {
      setChecks(await runBrowserQaChecks(engine, canvas));
    } finally {
      setRunningChecks(false);
    }
  };

  const setMusicMode = (mode: MusicMode) => {
    engine.data.settings.musicMode = mode;
    engine.data.saveSettings();
    engine.applySettings();
  };

  const playSfxDemo = () => {
    const sounds = [
      () => audio.playShoot(),
      () => audio.playHit(),
      () => audio.playPickup(),
      () => audio.playSkill(),
      () => audio.playPortal(),
      () => audio.playClearRoom(),
    ];
    sounds.forEach((sound, index) => window.setTimeout(sound, index * 280));
  };

  const captureScreenshot = () => {
    canvas.toBlob(blob => {
      if (!blob) return;
      const name = `cmys-${snapshot.state}-${snapshot.stage}-${Date.now()}.png`;
      downloadBlob(blob, name);
    }, "image/png");
  };

  const copyReport = async () => {
    const report = JSON.stringify({ snapshot: createQaSnapshot(engine, canvas), checks }, null, 2);
    try {
      await navigator.clipboard.writeText(report);
      setProbeStatus("REPORT COPIED");
    } catch {
      downloadBlob(new Blob([report], { type: "application/json" }), `cmys-qa-${Date.now()}.json`);
      setProbeStatus("REPORT DOWNLOADED");
    }
  };

  if (collapsed) {
    return (
      <button
        data-testid="qa-open"
        className="pointer-events-auto absolute right-2 top-2 z-50 rounded border border-fuchsia-300/70 bg-slate-950/95 px-3 py-2 font-mono text-xs text-fuchsia-100"
        onClick={() => setCollapsed(false)}
      >
        QA
      </button>
    );
  }

  return (
    <aside
      data-testid="qa-panel"
      className="pointer-events-auto absolute right-2 top-2 z-50 max-h-[calc(100%-1rem)] w-[min(92vw,360px)] overflow-y-auto rounded border border-fuchsia-300/60 bg-slate-950/95 p-3 font-mono text-[10px] text-slate-100 shadow-2xl backdrop-blur"
      onKeyDown={event => event.stopPropagation()}
      onPointerDown={event => event.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between">
        <strong className="text-xs text-fuchsia-200">BROWSER QA · v{snapshot.version}</strong>
        <button className={buttonClass} onClick={() => setCollapsed(true)}>HIDE</button>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 rounded border border-slate-700 bg-black/30 p-2">
        <span className="text-slate-400">STATE</span><span>{snapshot.state}{snapshot.overlay ? ` + ${snapshot.overlay}` : ""}</span>
        <span className="text-slate-400">STAGE</span><span>{snapshot.stage} · {snapshot.theme}</span>
        <span className="text-slate-400">ROOM</span><span>{snapshot.roomType}</span>
        <span className="text-slate-400">PERF</span><span>{snapshot.fps} FPS · {snapshot.frameTimeMs} ms</span>
        <span className="text-slate-400">AUDIO</span><span>{snapshot.audio.source} · {snapshot.audio.contextState}</span>
      </div>

      <section className="mt-3">
        <div className="mb-1 text-fuchsia-200">STATE / STAGE</div>
        <div className="flex flex-wrap gap-1">
          {["title", "hub", "settings", "character_select", "dungeon"].map(state => (
            <button key={state} className={buttonClass} onClick={() => engine.switchState(state)}>{state.toUpperCase()}</button>
          ))}
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {QA_STAGE_PRESETS.map(preset => (
            <button key={preset.stage} className={buttonClass} onClick={() => engine.qaJumpToStage(preset.stage)}>{preset.label}</button>
          ))}
          <button className={buttonClass} onClick={() => engine.qaGrantDebugLoadout()}>LOADOUT</button>
        </div>
      </section>

      <section className="mt-3">
        <div className="mb-1 text-fuchsia-200">AUDIO</div>
        <div className="flex gap-1">
          {(["adaptive", "external", "off"] as MusicMode[]).map(mode => (
            <button
              key={mode}
              className={`${buttonClass} ${engine.data.settings.musicMode === mode ? "border-fuchsia-300 text-fuchsia-100" : ""}`}
              onClick={() => setMusicMode(mode)}
            >
              {mode.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="mt-1 flex gap-1">
          <select
            data-testid="qa-music-scene"
            className="min-w-0 flex-1 rounded border border-cyan-300/40 bg-slate-900 px-2 py-1 text-[10px]"
            value={selectedScene}
            onChange={event => {
              const scene = event.target.value as MusicScene;
              setSelectedScene(scene);
              audio.setMusicScene(scene);
            }}
          >
            {QA_MUSIC_SCENES.map(scene => <option key={scene} value={scene}>{scene}</option>)}
          </select>
          <button className={buttonClass} onClick={playSfxDemo}>SFX DEMO</button>
        </div>
        <div className="mt-1 flex gap-1">
          <button
            data-testid="qa-audio-fallback"
            className={buttonClass}
            onClick={async () => {
              setProbeStatus("RUNNING");
              const probe = await audio.probeExternalFallback();
              setProbeStatus(probe.passed ? `PASS · ${probe.source}` : `FAIL · ${probe.source}`);
            }}
          >
            EXTERNAL FALLBACK
          </button>
          <span className={probeStatus.startsWith("FAIL") ? "self-center text-red-300" : "self-center text-slate-400"}>{probeStatus}</span>
        </div>
      </section>

      <section className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-fuchsia-200">AUTOMATED CHECKS</span>
          <span className={totals.fail ? "text-red-300" : "text-slate-400"}>P{totals.pass} W{totals.warn} F{totals.fail}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          <button data-testid="qa-run-checks" className={buttonClass} disabled={runningChecks} onClick={runChecks}>
            {runningChecks ? "RUNNING…" : "RUN CHECKS"}
          </button>
          <button className={buttonClass} onClick={captureScreenshot}>SCREENSHOT</button>
          <button className={buttonClass} onClick={copyReport}>COPY REPORT</button>
        </div>
        {checks.length > 0 && (
          <div className="mt-2 space-y-1 rounded border border-slate-700 bg-black/30 p-2">
            {checks.map(check => (
              <div key={check.id} className="grid grid-cols-[36px_1fr] gap-1">
                <span className={check.status === "pass" ? "text-emerald-300" : check.status === "warn" ? "text-amber-300" : "text-red-300"}>
                  {check.status.toUpperCase()}
                </span>
                <span><b>{check.label}</b> · {check.detail}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-3 text-[9px] leading-relaxed text-slate-500">
        DevTools API: <code>window.__CMYS_QA__</code>. Reload once after first visit to verify active Service Worker.
      </div>
    </aside>
  );
}
