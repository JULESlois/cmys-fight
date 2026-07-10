import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Engine } from "../game/Engine";
import type { InputAction } from "../game/Settings";

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const joystickRef = useRef<HTMLDivElement>(null);
  const [touchEnabled, setTouchEnabled] = useState(true);
  const [stick, setStick] = useState({ x: 0, y: 0 });

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
      }
    });

    resizeObserver.observe(containerRef.current);
    canvasRef.current.width = containerRef.current.clientWidth;
    canvasRef.current.height = containerRef.current.clientHeight;
    engineRef.current.init(canvasRef.current);

    const settingsTimer = window.setInterval(() => {
      setTouchEnabled(engineRef.current?.data.settings.touchControls !== false);
    }, 300);

    return () => {
      window.clearInterval(settingsTimer);
      engineRef.current?.cleanup();
      resizeObserver.disconnect();
    };
  }, []);

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
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setStick({ x: 0, y: 0 });
    engineRef.current?.input.setTouchAxis(0, 0);
  };

  const actionHandlers = (action: InputAction) => ({
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
    onPointerLeave: (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.buttons === 0) engineRef.current?.input.setTouchAction(action, false);
    },
  });

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden focus:outline-none" tabIndex={0}>
      <canvas ref={canvasRef} className="block w-full h-full" style={{ imageRendering: "pixelated", touchAction: "none" }} />

      {touchEnabled && (
        <div className="touch-controls absolute inset-0 pointer-events-none select-none">
          <div
            ref={joystickRef}
            className="pointer-events-auto absolute left-4 bottom-4 w-28 h-28 rounded-full border border-cyan-300/40 bg-slate-950/45 backdrop-blur-sm"
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
          >
            <div
              className="absolute w-12 h-12 rounded-full border border-cyan-200/70 bg-cyan-300/20"
              style={{
                left: `calc(50% - 24px + ${stick.x * 34}px)`,
                top: `calc(50% - 24px + ${stick.y * 34}px)`,
              }}
            />
          </div>

          <div className="absolute right-3 bottom-3 w-44 h-40 pointer-events-none">
            <button className="touch-button absolute right-0 bottom-10 w-16 h-16" {...actionHandlers("fire")}>FIRE</button>
            <button className="touch-button absolute right-16 bottom-0 w-14 h-14" {...actionHandlers("interact")}>USE</button>
            <button className="touch-button absolute right-20 bottom-16 w-14 h-14" {...actionHandlers("skill")}>SKILL</button>
            <button className="touch-button absolute right-2 bottom-28 w-12 h-10" {...actionHandlers("swapWeapon")}>SWAP</button>
            <button className="touch-button absolute right-24 bottom-28 w-12 h-10" {...actionHandlers("pause")}>MENU</button>
          </div>
        </div>
      )}
    </div>
  );
}
