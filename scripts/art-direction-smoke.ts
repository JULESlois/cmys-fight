import assert from "node:assert/strict";
import { ArtDirectionRenderer } from "../src/game/render/ArtDirectionRenderer";

interface GradientRecord {
  kind: "linear" | "radial";
  stops: { offset: number; color: string }[];
}

interface DrawCall {
  op: "fillRect" | "strokeRect";
  x: number;
  y: number;
  width: number;
  height: number;
  style: string;
  gradient?: GradientRecord;
}

function createCanvasRecorder(): { ctx: CanvasRenderingContext2D; calls: DrawCall[]; gradients: GradientRecord[] } {
  const calls: DrawCall[] = [];
  const gradients: GradientRecord[] = [];
  let fillStyle: unknown = "";
  let strokeStyle: unknown = "";

  function makeGradient(kind: GradientRecord["kind"]): GradientRecord & CanvasGradient {
    const record: GradientRecord = { kind, stops: [] };
    const gradient = {
      ...record,
      addColorStop(offset: number, color: string) {
        record.stops.push({ offset, color: String(color) });
      },
    };
    Object.defineProperty(gradient, "stops", { get: () => record.stops });
    gradients.push(record);
    return gradient as GradientRecord & CanvasGradient;
  }

  function styleOf(value: unknown): { style: string; gradient?: GradientRecord } {
    if (value && typeof value === "object" && "stops" in (value as object)) {
      const g = value as unknown as GradientRecord;
      return { style: `gradient(${g.stops.map(s => `${s.offset}:${s.color}`).join(",")})`, gradient: g };
    }
    return { style: String(value) };
  }

  const target: Record<string, unknown> = {
    save() {},
    restore() {},
    createLinearGradient: () => makeGradient("linear"),
    createRadialGradient: () => makeGradient("radial"),
    fillRect(x: number, y: number, width: number, height: number) {
      calls.push({ op: "fillRect", x, y, width, height, ...styleOf(fillStyle) });
    },
    strokeRect(x: number, y: number, width: number, height: number) {
      calls.push({ op: "strokeRect", x, y, width, height, ...styleOf(strokeStyle) });
    },
    globalAlpha: 1,
    lineWidth: 1,
  };
  Object.defineProperty(target, "fillStyle", {
    get: () => fillStyle,
    set: value => { fillStyle = value; },
  });
  Object.defineProperty(target, "strokeStyle", {
    get: () => strokeStyle,
    set: value => { strokeStyle = value; },
  });
  return { ctx: target as unknown as CanvasRenderingContext2D, calls, gradients };
}

const THEMES = [
  "forest", "dungeon", "snow", "lava",
  "overgrown_archive", "sealed_library", "cooling_canal", "sealed_armory",
  "observatory", "forge_core", "ash_catacombs", "deep_prison", "deep_archive",
] as const;

const TIME = 1.25;

function record(theme: string, opts?: { room?: { type: string }; hpRatio?: number; reducedFlashing?: boolean }) {
  const recorder = createCanvasRecorder();
  ArtDirectionRenderer.drawWorldGrade(
    recorder.ctx,
    theme,
    opts?.room as any,
    TIME,
    false,
    false,
    opts?.reducedFlashing ?? false,
    opts?.hpRatio,
  );
  return recorder;
}

// (a) Each defined theme produces a gradient color sequence distinct from every other theme.
const themeSignatures = new Map<string, string>();
for (const theme of THEMES) {
  const { gradients } = record(theme);
  assert.ok(gradients.length >= 2, `${theme} draws ambient + vignette gradients (got ${gradients.length})`);
  const signature = gradients
    .map(g => `${g.kind}[${g.stops.map(s => `${s.offset}:${s.color}`).join("|")}]`)
    .join(";");
  themeSignatures.set(theme, signature);
}
const themeList = [...themeSignatures.keys()];
for (let i = 0; i < themeList.length; i++) {
  for (let j = i + 1; j < themeList.length; j++) {
    assert.notEqual(
      themeSignatures.get(themeList[i]),
      themeSignatures.get(themeList[j]),
      `${themeList[i]} and ${themeList[j]} must have distinct gradient sequences`,
    );
  }
}

// (b) Unknown theme falls back to forest without throwing.
const unknown = record("nonexistent_theme_xyz");
const unknownSignature = unknown.gradients
  .map(g => `${g.kind}[${g.stops.map(s => `${s.offset}:${s.color}`).join("|")}]`)
  .join(";");
assert.equal(unknownSignature, themeSignatures.get("forest"), "unknown theme falls back to forest grade");

// (c) Low health draws more calls than full health (danger edge vignette).
const fullHp = record("forest", { hpRatio: 1 });
const lowHp = record("forest", { hpRatio: 0.2 });
assert.ok(
  lowHp.calls.length > fullHp.calls.length,
  `low hp adds draw calls (low=${lowHp.calls.length}, full=${fullHp.calls.length})`,
);
const dangerCall = lowHp.calls[lowHp.calls.length - 1];
assert.equal(dangerCall.op, "fillRect", "danger vignette is a full-canvas fill");
assert.ok(dangerCall.gradient, "danger vignette uses a gradient");
assert.ok(
  dangerCall.gradient!.stops.some(s => /rgba\(1[24]0, (8|10), (8|10)/.test(s.color)),
  "danger vignette is dark red",
);
// Threshold: 0.34 and above must NOT trigger the danger vignette.
const atThreshold = record("forest", { hpRatio: 0.34 });
assert.equal(atThreshold.calls.length, fullHp.calls.length, "hp ratio 0.34 does not trigger danger vignette");
// reducedFlashing path still renders (constant low alpha, no throw).
const lowHpReduced = record("forest", { hpRatio: 0.1, reducedFlashing: true });
assert.ok(lowHpReduced.calls.length > fullHp.calls.length, "reducedFlashing low hp still shows danger vignette");

// (d) Boss room draws the red pulse frame.
const boss = record("dungeon", { room: { type: "boss" } });
const strokes = boss.calls.filter(c => c.op === "strokeRect");
assert.ok(strokes.length >= 2, `boss room draws frame strokes (got ${strokes.length})`);
assert.ok(
  strokes.some(c => c.style.startsWith("rgba(255, 74, 74")),
  "boss frame uses red stroke",
);
const nonBoss = record("dungeon", { room: { type: "combat" } });
assert.equal(nonBoss.calls.filter(c => c.op === "strokeRect").length, 0, "non-boss room has no frame strokes");

console.log(JSON.stringify({
  themes: THEMES.length,
  distinctGradePairs: (themeList.length * (themeList.length - 1)) / 2,
  fallback: "forest",
  lowHpThreshold: 0.34,
  lowHpExtraCalls: lowHp.calls.length - fullHp.calls.length,
  bossFrameStrokes: strokes.length,
}));
