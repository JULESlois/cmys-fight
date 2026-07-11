import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { Engine } from "../game/Engine";
import type { InputAction, TouchHandedness } from "../game/Settings";
import { QaPanel } from "./QaPanel";
import { installQaBridge, isQaMode } from "../game/qa/BrowserQa";
import { calculateTouchViewportOffsets } from "../game/TouchLayout";

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const joystickRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [touchEnabled, setTouchEnabled] = useState(true);
  const [touchHandedness, setTouchHandedness] = useState<TouchHandedness>("right");
  const [touchScale, setTouchScale] = useState(1);
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
  }, [touchEnabled]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    engineRef.current = new Engine();
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
      setStatus("SAVE DATA EXPORTED");
    };
    const importData = () => importRef.current?.click();
    const toggleFullscreen = async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await containerRef.current?.requestFullscreen();
        setStatus(document.fullscreenElement ? "FULLSCREEN ENABLED" : "FULLSCREEN DISABLED");
      } catch {
        setStatus("FULLSCREEN UNAVAILABLE");
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
      setStatus(result.message);
      if (result.success) {
        engineRef.current.applySettings();
        engineRef.current.switchState("title");
      }
    } catch {
      setStatus("SAVE IMPORT FAILED");
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

  const actionHandlers = (action: InputAction) => ({
    draggable: false,
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
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
          className={`touch-controls touch-layout-${touchHandedness} absolute inset-0 pointer-events-none select-none`}
          style={{ "--touch-scale": touchScale } as CSSProperties}
          onContextMenu={event => event.preventDefault()}
          onDragStart={event => event.preventDefault()}
          onSelect={event => event.preventDefault()}
        >
          <button
            type="button"
            aria-label="Pause menu"
            className="touch-button touch-menu-button"
            {...actionHandlers("pause")}
          >
            MENU
          </button>

          <div
            ref={joystickRef}
            className="touch-joystick"
            style={{ touchAction: "none" }}
            onPointerDown={event => {
              event.preventDefault();
              event.currentTarget.setPointerCapture?.(event.pointerId);
              updateJoystick(event.clientX, event.clientY);
            }}
            onPointerMove={event => {
              if (event.currentTarget.hasPointerCapture?.(event.pointerId)) updateJoystick(event.clientX, event.clientY);
            }}
            onPointerUp={releaseJoystick}
            onPointerCancel={releaseJoystick}
            onLostPointerCapture={releaseJoystick}
          >
            <div
              className="touch-stick-knob"
              style={{
                left: `calc(50% - 24px + ${stick.x * 34}px)`,
                top: `calc(50% - 24px + ${stick.y * 34}px)`,
              }}
            />
          </div>

          <div className="touch-action-cluster">
            <button type="button" aria-label="Fire" className="touch-button touch-fire-button" {...actionHandlers("fire")}>FIRE</button>
            <button type="button" aria-label="Interact" className="touch-button touch-use-button" {...actionHandlers("interact")}>USE</button>
            <button type="button" aria-label="Use skill" className="touch-button touch-skill-button" {...actionHandlers("skill")}>SKILL</button>
            <button type="button" aria-label="Swap weapon" className="touch-button touch-swap-button" {...actionHandlers("swapWeapon")}>SWAP</button>
          </div>
        </div>
      )}
    </div>
  );
}
