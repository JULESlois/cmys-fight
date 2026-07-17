import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { Engine } from "../game/Engine";
import type { UiAction } from "../game/Input";
import { formatBinding, type InputAction, type TouchHandedness, type TouchLabelMode } from "../game/Settings";
import { QaPanel } from "./QaPanel";
import { installQaBridge, isQaMode } from "../game/qa/BrowserQa";
import { calculateTouchViewportOffsets } from "../game/TouchLayout";
import { t } from "../game/i18n";

type TouchActionLabel = "fire" | "interact" | "skillCancel" | "swapWeapon" | "pause";
type TouchLabels = Record<TouchActionLabel, string>;

const GAMEPAD_TOUCH_LABELS: TouchLabels = {
  fire: "X",
  interact: "A",
  skillCancel: "B",
  swapWeapon: "Y",
  pause: "START",
};

function buildTouchLabels(
  mode: TouchLabelMode,
  bindings: Record<InputAction, string>,
): TouchLabels {
  if (mode === "gamepad") return GAMEPAD_TOUCH_LABELS;
  return {
    fire: formatBinding(bindings.fire),
    interact: formatBinding(bindings.interact),
    skillCancel: `${formatBinding(bindings.skill)}/ESC`,
    swapWeapon: formatBinding(bindings.swapWeapon),
    pause: formatBinding(bindings.pause),
  };
}

function sameTouchLabels(a: TouchLabels, b: TouchLabels): boolean {
  return Object.keys(a).every(key => a[key as TouchActionLabel] === b[key as TouchActionLabel]);
}

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const joystickRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [touchEnabled, setTouchEnabled] = useState(true);
  const [touchHandedness, setTouchHandedness] = useState<TouchHandedness>("right");
  const [touchScale, setTouchScale] = useState(1);
  const [touchLabelMode, setTouchLabelMode] = useState<TouchLabelMode>("gamepad");
  const [touchLabels, setTouchLabels] = useState<TouchLabels>(GAMEPAD_TOUCH_LABELS);
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const [status, setStatus] = useState("");
  const [qaReady, setQaReady] = useState(false);
  const qaEnabled = useRef(isQaMode()).current;

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(""), 2600);
    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (touchEnabled) return;
    setStick({ x: 0, y: 0 });
    const input = engineRef.current?.input;
    input?.setTouchAxis(0, 0);
    for (const action of ["fire", "skill", "interact", "swapWeapon", "pause"] as InputAction[]) {
      input?.setTouchAction(action, false);
    }
    input?.setTouchUiAction("cancel", false);
  }, [touchEnabled]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    engineRef.current = new Engine();
    const syncVisualViewport = () => {
      const container = containerRef.current;
      if (!container) return;
      const viewport = window.visualViewport;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      container.style.setProperty("--visual-viewport-width", `${Math.max(1, Math.round(width))}px`);
      container.style.setProperty("--visual-viewport-height", `${Math.max(1, Math.round(height))}px`);
    };
    syncVisualViewport();
    window.visualViewport?.addEventListener("resize", syncVisualViewport);
    window.visualViewport?.addEventListener("scroll", syncVisualViewport);
    window.addEventListener("resize", syncVisualViewport);

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (canvasRef.current) {
          canvasRef.current.width = width;
          canvasRef.current.height = height;
        }
        if (containerRef.current) {
          const offsets = calculateTouchViewportOffsets(width, height);
          containerRef.current.style.setProperty("--touch-vertical-gutter", `${offsets.verticalGutter}px`);
          containerRef.current.style.setProperty("--touch-bottom-offset", `${offsets.bottomOffset}px`);
          containerRef.current.style.setProperty("--touch-top-offset", `${offsets.topOffset}px`);
          containerRef.current.style.setProperty("--touch-side-offset", `${offsets.sideOffset}px`);
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    canvasRef.current.width = containerRef.current.clientWidth;
    canvasRef.current.height = containerRef.current.clientHeight;
    engineRef.current.init(canvasRef.current);
    const removeQaBridge = qaEnabled
      ? installQaBridge(engineRef.current, canvasRef.current)
      : () => {};
    if (qaEnabled) setQaReady(true);

    const settingsTimer = window.setInterval(() => {
      const settings = engineRef.current?.data.settings;
      setTouchEnabled(settings?.touchControls !== false);
      setTouchHandedness(settings?.touchHandedness === "left" ? "left" : "right");
      setTouchScale(settings?.touchScale ?? 1);
      
      if (settings) {
        const nextTouchLabelMode = settings.touchLabelMode;
        setTouchLabelMode(nextTouchLabelMode);
        const nextLabels = buildTouchLabels(nextTouchLabelMode, settings.keyBindings);
        setTouchLabels(previous => sameTouchLabels(previous, nextLabels) ? previous : nextLabels);
      }
    }, 300);

    if (engineRef.current.data.lastRecoveryMessage) {
      setStatus(engineRef.current.data.lastRecoveryMessage);
    }

    const exportData = () => {
      const json = engineRef.current?.data.exportBundle();
      if (!json) return;
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `cmys-fight-save-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      const language = engineRef.current?.data.settings.language ?? "en";
      setStatus(t(language, "status.exported"));
    };
    const importData = () => importRef.current?.click();
    const toggleFullscreen = async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await containerRef.current?.requestFullscreen();
        const language = engineRef.current?.data.settings.language ?? "en";
        setStatus(t(language, document.fullscreenElement ? "status.fullscreenEnabled" : "status.fullscreenDisabled"));
      } catch {
        const language = engineRef.current?.data.settings.language ?? "en";
        setStatus(t(language, "status.fullscreenUnavailable"));
      }
    };
    document.addEventListener("game:export-data", exportData);
    document.addEventListener("game:import-data", importData);
    document.addEventListener("game:fullscreen", toggleFullscreen);

    return () => {
      document.removeEventListener("game:export-data", exportData);
      document.removeEventListener("game:import-data", importData);
      document.removeEventListener("game:fullscreen", toggleFullscreen);
      window.clearInterval(settingsTimer);
      window.visualViewport?.removeEventListener("resize", syncVisualViewport);
      window.visualViewport?.removeEventListener("scroll", syncVisualViewport);
      window.removeEventListener("resize", syncVisualViewport);
      removeQaBridge();
      engineRef.current?.cleanup();
      resizeObserver.disconnect();
    };
  }, [qaEnabled]);


  const importSave = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !engineRef.current) return;
    try {
      const result = engineRef.current.data.importBundle(await file.text());
      const language = engineRef.current.data.settings.language;
      setStatus(result.success ? t(language, "status.imported") : t(language, "status.importFailed"));
      if (result.success) {
        engineRef.current.applySettings();
        engineRef.current.switchState("title");
      }
    } catch {
      const language = engineRef.current?.data.settings.language ?? "en";
      setStatus(t(language, "status.importFailed"));
    }
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    const bounds = joystickRef.current?.getBoundingClientRect();
    if (!bounds) return;
    let x = (clientX - (bounds.left + bounds.width / 2)) / (bounds.width * 0.34);
    let y = (clientY - (bounds.top + bounds.height / 2)) / (bounds.height * 0.34);
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    setStick({ x, y });
    engineRef.current?.input.setTouchAxis(x, y);
  };

  const releaseJoystick = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
    setStick({ x: 0, y: 0 });
    engineRef.current?.input.setTouchAxis(0, 0);
  };

  const pulseHaptics = (duration = 8) => {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(duration);
    }
  };

  const actionHandlers = (action: InputAction) => ({
    draggable: false,
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      pulseHaptics(action === "pause" ? 12 : 7);
      engineRef.current?.input.setTouchAction(action, true);
    },
    onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      engineRef.current?.input.setTouchAction(action, false);
    },
    onPointerCancel: () => engineRef.current?.input.setTouchAction(action, false),
    onLostPointerCapture: () => engineRef.current?.input.setTouchAction(action, false),
    onPointerLeave: (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.buttons === 0) engineRef.current?.input.setTouchAction(action, false);
    },
  });

  const contextualActionHandlers = (gameplayAction: InputAction, uiAction: UiAction) => ({
    draggable: false,
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      pulseHaptics(7);
      engineRef.current?.input.setTouchAction(gameplayAction, true);
      engineRef.current?.input.setTouchUiAction(uiAction, true);
    },
    onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      engineRef.current?.input.setTouchAction(gameplayAction, false);
      engineRef.current?.input.setTouchUiAction(uiAction, false);
    },
    onPointerCancel: () => {
      engineRef.current?.input.setTouchAction(gameplayAction, false);
      engineRef.current?.input.setTouchUiAction(uiAction, false);
    },
    onLostPointerCapture: () => {
      engineRef.current?.input.setTouchAction(gameplayAction, false);
      engineRef.current?.input.setTouchUiAction(uiAction, false);
    },
    onPointerLeave: (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.buttons !== 0) return;
      engineRef.current?.input.setTouchAction(gameplayAction, false);
      engineRef.current?.input.setTouchUiAction(uiAction, false);
    },
  });

  return (
    <div ref={containerRef} className="game-shell relative w-full h-full bg-black flex items-center justify-center overflow-hidden focus:outline-none" tabIndex={0}>
      <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={importSave} />
      <canvas ref={canvasRef} data-testid="game-canvas" className="block w-full h-full" style={{ imageRendering: "pixelated", touchAction: "none" }} />

      {status && (
        <div className="absolute top-[max(0.5rem,env(safe-area-inset-top))] left-1/2 z-30 -translate-x-1/2 rounded border border-cyan-300/50 bg-slate-950/90 px-3 py-1 font-mono text-[10px] text-cyan-100">
          {status}
        </div>
      )}

      {qaEnabled && qaReady && engineRef.current && canvasRef.current && (
        <QaPanel engine={engineRef.current} canvas={canvasRef.current} />
      )}

      {touchEnabled && (
        <div
          className={`touch-controls touch-layout-${touchHandedness} touch-labels-${touchLabelMode} absolute inset-0 pointer-events-none select-none`}
          style={{ "--touch-scale": touchScale * 1.3 } as CSSProperties}
          onContextMenu={event => event.preventDefault()}
          onDragStart={event => event.preventDefault()}
          onSelect={event => event.preventDefault()}
        >
          <button
            type="button"
            aria-label={`${touchLabels.pause} button, pause menu`}
            data-gamepad-button="start"
            className="touch-button touch-start-button touch-menu-button"
            {...actionHandlers("pause")}
          >
            {touchLabelMode === "gamepad" && <span className="touch-start-icon" aria-hidden="true"><i /><i /></span>}
            <span className={`touch-start-label ${touchLabels.pause.length > 3 ? "touch-label-long" : ""}`}>{touchLabels.pause}</span>
          </button>

          <div
            ref={joystickRef}
            className="touch-joystick touch-dpad"
            aria-label="Virtual directional pad"
            style={{ touchAction: "none" }}
            onPointerDown={event => {
              event.preventDefault();
              event.currentTarget.setPointerCapture?.(event.pointerId);
              pulseHaptics(5);
              updateJoystick(event.clientX, event.clientY);
            }}
            onPointerMove={event => {
              if (event.currentTarget.hasPointerCapture?.(event.pointerId)) updateJoystick(event.clientX, event.clientY);
            }}
            onPointerUp={releaseJoystick}
            onPointerCancel={releaseJoystick}
            onLostPointerCapture={releaseJoystick}
          >
            <span className="touch-dpad-notch touch-dpad-notch-up" aria-hidden="true" />
            <span className="touch-dpad-notch touch-dpad-notch-right" aria-hidden="true" />
            <span className="touch-dpad-notch touch-dpad-notch-down" aria-hidden="true" />
            <span className="touch-dpad-notch touch-dpad-notch-left" aria-hidden="true" />
            <div
              className="touch-stick-knob"
              style={{
                left: `calc(50% - 21px + ${stick.x * 26}px)`,
                top: `calc(50% - 21px + ${stick.y * 26}px)`,
              }}
            />
          </div>

          <div className="touch-action-cluster touch-face-cluster" aria-label="Virtual action buttons">
            <button type="button" aria-label={`${touchLabels.fire} button, fire`} data-gamepad-button="x" className="touch-button touch-face-button touch-face-x touch-fire-button" {...actionHandlers("fire")}>
              <span className={`touch-face-letter ${touchLabels.fire.length > 2 ? "touch-label-long" : ""}`}>{touchLabels.fire}</span>
            </button>
            <button type="button" aria-label={`${touchLabels.interact} button, interact`} data-gamepad-button="a" className="touch-button touch-face-button touch-face-a touch-use-button" {...actionHandlers("interact")}>
              <span className={`touch-face-letter ${touchLabels.interact.length > 2 ? "touch-label-long" : ""}`}>{touchLabels.interact}</span>
            </button>
            <button type="button" aria-label={`${touchLabels.skillCancel} button, skill in battle or cancel in menus`} data-gamepad-button="b" className="touch-button touch-face-button touch-face-b touch-skill-button" {...contextualActionHandlers("skill", "cancel")}>
              <span className={`touch-face-letter ${touchLabels.skillCancel.length > 2 ? "touch-label-long" : ""}`}>{touchLabels.skillCancel}</span>
            </button>
            <button type="button" aria-label={`${touchLabels.swapWeapon} button, swap weapon`} data-gamepad-button="y" className="touch-button touch-face-button touch-face-y touch-swap-button" {...actionHandlers("swapWeapon")}>
              <span className={`touch-face-letter ${touchLabels.swapWeapon.length > 2 ? "touch-label-long" : ""}`}>{touchLabels.swapWeapon}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
