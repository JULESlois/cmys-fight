import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AudioManager } from "../src/game/audio/AudioManager";
import {
  PROCEDURAL_TRACKS,
  resolveExternalMusicUrl,
  type MusicScene,
} from "../src/game/audio/MusicLibrary";
import { createDefaultSettings, normalizeSettings, SETTINGS_VERSION } from "../src/game/Settings";
import { PixelFxSystem } from "../src/game/render/PixelFxSystem";
import { Projectile } from "../src/game/entities/Projectile";
import { SpriteRenderer } from "../src/game/render/SpriteRenderer";
import { SPRITES } from "../src/game/data/sprites";

const expectedScenes: MusicScene[] = [
  "title", "hub", "settings", "forest", "dungeon", "snow", "lava",
  "combat_forest", "combat_dungeon", "combat_snow", "combat_lava",
  "boss", "shop", "victory", "defeat", "legacy",
];
assert.deepEqual(Object.keys(PROCEDURAL_TRACKS).sort(), [...expectedScenes].sort());
for (const scene of expectedScenes) {
  const track = PROCEDURAL_TRACKS[scene];
  assert.ok(track.bpm >= 60 && track.bpm <= 180, `${scene} bpm`);
  assert.ok(track.scale.length >= 5, `${scene} scale`);
  assert.ok(track.melody.length >= 16, `${scene} melody`);
  assert.ok(track.bass.length >= 16, `${scene} bass`);
  assert.ok(track.leadGain > 0 && track.bassGain > 0, `${scene} gains`);
}

assert.equal(
  resolveExternalMusicUrl("netease:123456"),
  "https://music.163.com/song/media/outer/url?id=123456.mp3",
);
assert.equal(resolveExternalMusicUrl("https://example.com/theme.mp3"), "https://example.com/theme.mp3");
assert.equal(resolveExternalMusicUrl("ftp://example.com/theme.mp3"), undefined);
assert.equal(resolveExternalMusicUrl("netease:not-a-number"), undefined);

const migrated = normalizeSettings({ version: 1, masterVolume: 80 });
assert.equal(migrated.version, SETTINGS_VERSION);
assert.equal(migrated.musicVolume, 55);
assert.equal(migrated.musicMode, "adaptive");
const clamped = normalizeSettings({ musicVolume: 999, musicMode: "external" });
assert.equal(clamped.musicVolume, 100);
assert.equal(clamped.musicMode, "external");
assert.equal(createDefaultSettings().musicMode, "adaptive");

const audio = new AudioManager();
audio.setMusicScene("boss");
assert.equal(audio.getMusicScene(), "boss");
audio.setMusicMode("external");
audio.setMusicVolume(0.4);
audio.setMasterVolume(0.75);
audio.cleanup();

const fx = new PixelFxSystem();
const projectile = new Projectile(10, 10, 100, 0, 3, 2, "player", 2, "#FFF");
for (let i = 0; i < 60; i++) fx.emitMuzzle(projectile, false);
assert.ok(fx.getActiveCount() <= 220, "particle cap");
fx.update(5);
assert.equal(fx.getActiveCount(), 0, "particle expiry");

function spriteRectCount(outline: boolean): number {
  let rects = 0;
  const ctx = {
    save() {}, restore() {}, translate() {}, scale() {},
    fillRect() { rects++; },
    set fillStyle(_value: string) {},
    get fillStyle() { return ""; },
  } as unknown as CanvasRenderingContext2D;
  SpriteRenderer.drawPixelSprite(ctx, "player_main_side_idle", 0, 0, 2, {
    outlineColor: outline ? "#000" : undefined,
  });
  return rects;
}
assert.ok(spriteRectCount(true) > spriteRectCount(false), "sprite outline pass");

const chibiFaceSpecs = [
  { id: "michele", eyeHighlight: "O" },
  { id: "kanami", eyeHighlight: "T" },
  { id: "celestia", eyeHighlight: "P" },
] as const;
const animationSuffixes = ["idle", "idle_1", "walk_0", "walk_1", "walk_2", "walk_3"] as const;
for (const { id, eyeHighlight } of chibiFaceSpecs) {
  for (const suffix of animationSuffixes) {
    const frameName = `player_${id}_side_${suffix}`;
    const frame = SPRITES[frameName];
    assert.ok(frame, `${frameName} exists`);
    const eyeHighlights: Array<readonly [number, number]> = [];
    for (let y = 3; y <= 12; y++) {
      for (let x = 10; x <= 22; x++) {
        if (frame[y][x] === eyeHighlight) eyeHighlights.push([x, y]);
      }
      assert.ok(
        frame[y][21] !== "E" && frame[y][21] !== "F",
        `${frameName} has no profile nose protrusion on row ${y}`,
      );
    }
    assert.equal(eyeHighlights.length, 2, `${frameName} exposes two eye highlights`);
    assert.equal(eyeHighlights[0][1], eyeHighlights[1][1], `${frameName} eyes share a baseline`);
    assert.equal(eyeHighlights[1][0] - eyeHighlights[0][0], 4, `${frameName} keeps two distinct eyes`);
  }
}
assert.ok(
  !Object.keys(SPRITES).some(name => /^player_(michele|kanami|celestia)_(front|back)/.test(name)),
  "special characters use mirrored left/right side sprites only",
);
const entityRenderer = readFileSync("src/game/render/EntityRenderer.ts", "utf8");
assert.match(entityRenderer, /flipX: player\.facing === "left"/);

const externalConfig = JSON.parse(readFileSync("public/music-tracks.json", "utf8"));
assert.equal(typeof externalConfig.attribution, "string");
for (const scene of expectedScenes) assert.ok(scene in externalConfig.tracks, `${scene} external slot`);
const sw = readFileSync("public/sw.js", "utf8");
assert.match(sw, /music-tracks\.json/);

console.log(JSON.stringify({
  proceduralThemes: "ok",
  externalMusicResolver: "ok",
  settingsMigration: "ok",
  particleFx: "ok",
  spriteOutlines: "ok",
  twoEyeChibiFaces: "mirrored-left-right-no-nose",
  pwaMusicConfig: "ok",
}));
