import type { Engine } from "../Engine";
import { audio, type AudioDiagnostics } from "../audio/AudioManager";
import type { MusicMode, MusicScene } from "../audio/MusicLibrary";
import { APP_VERSION } from "../../version";

export type QaCheckStatus = "pass" | "warn" | "fail";

export interface QaCheck {
  id: string;
  label: string;
  status: QaCheckStatus;
  detail: string;
}

export interface QaSnapshot {
  version: string;
  timestamp: string;
  state: string;
  overlay: string | null;
  paused: boolean;
  stage: string;
  globalStageIndex: number;
  theme: string;
  roomType: string;
  roomId: string;
  fps: number;
  frameTimeMs: number;
  degraded: boolean;
  debugOverlay: boolean;
  canvas: { width: number; height: number };
  audio: AudioDiagnostics;
}

export const QA_STAGE_PRESETS = [
  { label: "1-1", stage: 1 },
  { label: "2-1", stage: 5 },
  { label: "3-1", stage: 9 },
  { label: "4-1", stage: 13 },
  { label: "FINAL", stage: 16 },
] as const;

export const QA_MUSIC_SCENES: MusicScene[] = [
  "title",
  "hub",
  "settings",
  "forest",
  "dungeon",
  "snow",
  "lava",
  "combat_forest",
  "combat_dungeon",
  "combat_snow",
  "combat_lava",
  "boss",
  "shop",
  "victory",
  "defeat",
  "legacy",
];

export function isQaMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("qa") === "1";
}

export function createQaSnapshot(engine: Engine, canvas: HTMLCanvasElement): QaSnapshot {
  const floor = engine.data.data.floor;
  const room = floor?.rooms?.find(candidate =>
    candidate.x === floor.currentRoomX && candidate.y === floor.currentRoomY
  );
  const perf = engine.performanceMonitor.getSnapshot();
  return {
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    state: engine.currentState,
    overlay: engine.getOverlayState(),
    paused: engine.isPaused,
    stage: `${engine.data.data.run.chapterIndex}-${engine.data.data.run.stageIndex}`,
    globalStageIndex: engine.data.data.run.globalStageIndex,
    theme: floor?.theme ?? "none",
    roomType: room?.type ?? "none",
    roomId: room?.id ?? "none",
    fps: perf.fps,
    frameTimeMs: perf.frameTimeMs,
    degraded: perf.degraded,
    debugOverlay: engine.isDebugOverlayVisible(),
    canvas: { width: canvas.width, height: canvas.height },
    audio: audio.getDiagnostics(),
  };
}

function result(id: string, label: string, status: QaCheckStatus, detail: string): QaCheck {
  return { id, label, status, detail };
}

async function fetchJson(path: string): Promise<{ ok: boolean; status: number; body?: any; error?: string }> {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) return { ok: false, status: response.status, error: `HTTP ${response.status}` };
    return { ok: true, status: response.status, body: await response.json() };
  } catch (error) {
    return { ok: false, status: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function runBrowserQaChecks(engine: Engine, canvas: HTMLCanvasElement): Promise<QaCheck[]> {
  const checks: QaCheck[] = [];
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

  checks.push(canvas.width > 0 && canvas.height > 0
    ? result("canvas-size", "Canvas size", "pass", `${canvas.width}×${canvas.height}`)
    : result("canvas-size", "Canvas size", "fail", "Canvas has zero dimensions"));

  const ctx = canvas.getContext("2d");
  checks.push(ctx
    ? result("canvas-context", "Canvas 2D context", "pass", `smoothing=${ctx.imageSmoothingEnabled}`)
    : result("canvas-context", "Canvas 2D context", "fail", "2D context unavailable"));

  const imageRendering = getComputedStyle(canvas).imageRendering;
  checks.push(imageRendering.includes("pixel") || imageRendering === "crisp-edges"
    ? result("pixel-rendering", "Pixel rendering", "pass", imageRendering)
    : result("pixel-rendering", "Pixel rendering", "warn", imageRendering || "browser default"));

  const requiredStates = ["title", "hub", "settings", "dungeon", "run_result", "menu"];
  const missingStates = requiredStates.filter(state => !engine.states[state]);
  checks.push(missingStates.length === 0
    ? result("states", "State registry", "pass", `${Object.keys(engine.states).length} states`)
    : result("states", "State registry", "fail", `Missing: ${missingStates.join(", ")}`));

  const perf = engine.performanceMonitor.getSnapshot();
  checks.push(perf.sampleCount > 0 && perf.fps > 0
    ? result("render-loop", "Render loop", perf.fps < 30 ? "warn" : "pass", `${perf.fps} FPS / ${perf.frameTimeMs} ms`)
    : result("render-loop", "Render loop", "fail", "No frame samples"));

  const settings = engine.data.settings;
  const settingsValid = settings.version >= 2
    && settings.masterVolume >= 0 && settings.masterVolume <= 100
    && settings.musicVolume >= 0 && settings.musicVolume <= 100
    && ["adaptive", "external", "off"].includes(settings.musicMode);
  checks.push(settingsValid
    ? result("settings", "Settings normalization", "pass", `v${settings.version} / ${settings.musicMode}`)
    : result("settings", "Settings normalization", "fail", "Invalid settings values"));

  try {
    const key = "__cmys_browser_qa__";
    localStorage.setItem(key, APP_VERSION);
    const stored = localStorage.getItem(key);
    localStorage.removeItem(key);
    checks.push(stored === APP_VERSION
      ? result("storage", "Local storage", "pass", "Read/write successful")
      : result("storage", "Local storage", "fail", "Readback mismatch"));
  } catch (error) {
    checks.push(result("storage", "Local storage", "fail", error instanceof Error ? error.message : String(error)));
  }

  const health = await fetchJson("/api/health");
  checks.push(health.ok && health.body?.ok === true && health.body?.version === APP_VERSION
    ? result("health", "Production health", "pass", `v${health.body.version}`)
    : result("health", "Production health", "fail", health.error ?? `Version ${health.body?.version ?? "unknown"}`));

  const manifest = await fetchJson("/manifest.webmanifest");
  checks.push(manifest.ok && manifest.body?.short_name === "CMYS Fight"
    ? result("manifest", "Web manifest", "pass", manifest.body.short_name)
    : result("manifest", "Web manifest", "fail", manifest.error ?? "Unexpected manifest"));

  const musicConfig = await fetchJson("/music-tracks.json");
  checks.push(musicConfig.ok && musicConfig.body?.tracks && typeof musicConfig.body.tracks === "object"
    ? result("music-config", "Music config", "pass", `${Object.keys(musicConfig.body.tracks).length} configured tracks`)
    : result("music-config", "Music config", "fail", musicConfig.error ?? "tracks object missing"));

  if (!("serviceWorker" in navigator)) {
    checks.push(result("service-worker", "Service worker", "warn", "Unsupported by browser"));
  } else {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      checks.push(registration
        ? result("service-worker", "Service worker", "pass", registration.active?.state ?? "registered")
        : result("service-worker", "Service worker", "warn", "Not registered yet; reload once"));
    } catch (error) {
      checks.push(result("service-worker", "Service worker", "warn", error instanceof Error ? error.message : String(error)));
    }
  }

  const audioState = audio.getDiagnostics();
  checks.push(audioState.supported
    ? result("audio-support", "Web Audio", audioState.contextState === "running" ? "pass" : "warn", `${audioState.contextState} / ${audioState.source}`)
    : result("audio-support", "Web Audio", "warn", "Unavailable; game remains playable"));

  const stateSceneMap: Partial<Record<string, MusicScene[]>> = {
    title: ["title"],
    character_select: ["hub"],
    hub: ["hub"],
    records: ["hub"],
    settings: ["settings"],
    legacy_rpg: ["legacy"],
    legacy_tactics: ["legacy"],
    legacy_dialog: ["legacy"],
    run_result: ["victory", "defeat"],
    dungeon: ["forest", "dungeon", "snow", "lava", "combat_forest", "combat_dungeon", "combat_snow", "combat_lava", "boss", "shop"],
  };
  const allowedScenes = stateSceneMap[engine.currentState] ?? [];
  checks.push(allowedScenes.length === 0 || allowedScenes.includes(audioState.scene)
    ? result("music-scene", "Music scene mapping", "pass", `${engine.currentState} → ${audioState.scene}`)
    : result("music-scene", "Music scene mapping", "fail", `${engine.currentState} → ${audioState.scene}`));

  return checks;
}

export interface QaBridge {
  version: string;
  snapshot: () => QaSnapshot;
  runChecks: () => Promise<QaCheck[]>;
  switchState: (state: string) => boolean;
  jumpToStage: (stage: number) => boolean;
  grantLoadout: () => boolean;
  toggleDebugOverlay: () => boolean;
  setMusicScene: (scene: MusicScene) => void;
  setMusicMode: (mode: MusicMode) => void;
  probeExternalFallback: () => Promise<{ passed: boolean; source: string }>;
  capturePng: () => string;
}

export function installQaBridge(engine: Engine, canvas: HTMLCanvasElement): () => void {
  const bridge: QaBridge = {
    version: APP_VERSION,
    snapshot: () => createQaSnapshot(engine, canvas),
    runChecks: () => runBrowserQaChecks(engine, canvas),
    switchState: state => {
      if (!engine.states[state] || state === "menu") return false;
      engine.switchState(state);
      return true;
    },
    jumpToStage: stage => engine.qaJumpToStage(stage),
    grantLoadout: () => engine.qaGrantDebugLoadout(),
    toggleDebugOverlay: () => engine.toggleDebugOverlay(),
    setMusicScene: scene => audio.setMusicScene(scene),
    setMusicMode: mode => {
      engine.data.settings.musicMode = mode;
      engine.data.saveSettings();
      engine.applySettings();
    },
    probeExternalFallback: () => audio.probeExternalFallback(),
    capturePng: () => canvas.toDataURL("image/png"),
  };
  (window as any).__CMYS_QA__ = bridge;
  return () => {
    if ((window as any).__CMYS_QA__ === bridge) delete (window as any).__CMYS_QA__;
  };
}
