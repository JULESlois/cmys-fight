/**
 * Pixel-art gradient dithering.
 *
 * Smooth 24-bit `createLinearGradient`/`createRadialGradient` ramps break the
 * pixel discipline at the most visible surface (the full-screen grade and the
 * menu sky). This module pre-renders those ramps into Bayer-dithered offscreen
 * canvases: each pixel either draws the ramp color at a discrete alpha level or
 * is left transparent, so a ramp reads as ordered pixel density instead of a
 * smooth wash.
 *
 * The threshold/quantize math is pure and DOM-free so smoke tests can assert it
 * in Node; the canvas cache degrades to `null` when no document exists.
 */

const BAYER_4: number[] = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
];
const BAYER_MAX = 16;

export interface DitheredStop {
  /** Gradient position along the sampled axis (0..1). */
  at: number;
  /** Continuous alpha (0..1) at that position. */
  alpha: number;
}

/** Linear-interpolated ramp value at position t (0..1), clamped outside stops. */
export function rampAlpha(stops: DitheredStop[], t: number): number {
  if (stops.length === 0) return 0;
  if (stops.length === 1) return stops[0].alpha;
  if (t <= stops[0].at) return stops[0].alpha;
  const last = stops[stops.length - 1];
  if (t >= last.at) return last.alpha;
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i].at) {
      const a = stops[i - 1];
      const b = stops[i];
      const span = Math.max(1e-6, b.at - a.at);
      return a.alpha + (b.alpha - a.alpha) * ((t - a.at) / span);
    }
  }
  return last.alpha;
}

/** Round a continuous alpha onto N discrete levels (1..N). */
export function quantizedAlpha(alpha: number, levels: number): number {
  const clamped = Math.max(0, Math.min(1, alpha));
  return Math.round(clamped * (levels - 1)) / (levels - 1);
}

/**
 * Bayer-thresholded draw decision: the pixel draws when the quantized ramp
 * value exceeds the 4x4 matrix entry, so density approximates the ramp.
 */
export function ditheredAlpha(x: number, y: number, base: number, levels: number): number {
  const value = quantizedAlpha(base, levels);
  const threshold = (BAYER_4[(y & 3) * 4 + (x & 3)] + 0.5) / BAYER_MAX;
  return value > threshold ? value : 0;
}

export interface DitheredRampOptions {
  key: string;
  /** Solid RGB color ("#rrggbb"); only alpha is dithered. */
  color: string;
  /** Continuous alpha 0..1 at a pixel. */
  alphaAt: (x: number, y: number) => number;
  levels?: number;
}

const canvasCache = new Map<string, HTMLCanvasElement>();

/**
 * Cached 320x240 offscreen canvas of a dithered ramp. Returns null in
 * DOM-less environments (smoke tests) — callers skip the layer then.
 */
export function getDitheredRampCanvas(options: DitheredRampOptions): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const cached = canvasCache.get(options.key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 240;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const levels = options.levels ?? 4;
  const red = parseInt(options.color.slice(1, 3), 16);
  const green = parseInt(options.color.slice(3, 5), 16);
  const blue = parseInt(options.color.slice(5, 7), 16);
  const image = ctx.createImageData(320, 240);
  const data = image.data;
  for (let y = 0; y < 240; y++) {
    for (let x = 0; x < 320; x++) {
      const alpha = ditheredAlpha(x, y, options.alphaAt(x, y), levels);
      const offset = (y * 320 + x) * 4;
      data[offset] = red;
      data[offset + 1] = green;
      data[offset + 2] = blue;
      data[offset + 3] = Math.round(alpha * 255);
    }
  }
  ctx.putImageData(image, 0, 0);
  canvasCache.set(options.key, canvas);
  return canvas;
}

/** Test hook: cache size for smoke assertions. */
export function getDitherCacheSize(): number {
  return canvasCache.size;
}

/** Test hook: clear cache. */
export function resetDitherCache(): void {
  canvasCache.clear();
}
