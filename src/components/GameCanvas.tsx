import { useEffect, useRef } from "react";
import { Engine } from "../game/Engine";

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    engineRef.current = new Engine();
    
    // Resize handling
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        if (canvasRef.current) {
          canvasRef.current.width = width;
          canvasRef.current.height = height;
        }
      }
    });
    
    resizeObserver.observe(containerRef.current);
    
    // Initialize initial size
    canvasRef.current.width = containerRef.current.clientWidth;
    canvasRef.current.height = containerRef.current.clientHeight;

    engineRef.current.init(canvasRef.current);

    return () => {
      engineRef.current?.cleanup();
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full bg-black flex items-center justify-center focus:outline-none" tabIndex={0}>
      <canvas ref={canvasRef} className="block" style={{ imageRendering: "pixelated" }} />
    </div>
  );
}
