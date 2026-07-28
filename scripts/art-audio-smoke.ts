import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  AudioManager,
  MUSIC_SCENE_CROSSFADE_SECONDS,
  getMusicStepDuration,
  getMusicSwingOffset,
  recoverMusicClock,
} from "../src/game/audio/AudioManager";
import {
  PROCEDURAL_TRACKS,
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

const migrated = normalizeSettings({ version: 1, masterVolume: 80 });
assert.equal(migrated.version, SETTINGS_VERSION);
assert.equal(migrated.musicVolume, 55);
assert.equal(migrated.musicMode, "adaptive");
const clamped = normalizeSettings({ musicVolume: 999, musicMode: "external" });
assert.equal(clamped.musicVolume, 100);
assert.equal(clamped.musicMode, "adaptive", "legacy external mode migrates to pure Web Audio");
assert.equal(createDefaultSettings().musicMode, "adaptive");

assert.equal(getMusicStepDuration(120), 0.125);
assert.equal(getMusicSwingOffset(1, 0.125, 0.1), 0.0125);
assert.equal(getMusicSwingOffset(2, 0.125, 0.1), 0);
assert.ok(MUSIC_SCENE_CROSSFADE_SECONDS >= 0.15 && MUSIC_SCENE_CROSSFADE_SECONDS <= 0.35);
const currentClock = recoverMusicClock(7, 1, 1.1, 0.125);
assert.equal(currentClock.step, 7);
assert.equal(currentClock.nextStepTime, 1);
assert.equal(currentClock.droppedSteps, 0);
assert.ok(Math.abs(currentClock.lagSeconds - 0.1) < 1e-9);
const recoveredClock = recoverMusicClock(7, 1, 2, 0.125);
assert.equal(recoveredClock.step, 15);
assert.equal(recoveredClock.nextStepTime, 2.04);
assert.equal(recoveredClock.droppedSteps, 8);

const audibilityAudio = new AudioManager() as any;
let musicStarts = 0;
let musicStops = 0;
audibilityAudio.ctx = { state: "running" };
audibilityAudio.unlocked = true;
audibilityAudio.startProceduralMusic = () => {
  musicStarts++;
  audibilityAudio.musicTimer = 1;
};
audibilityAudio.stopMusic = () => {
  musicStops++;
  audibilityAudio.musicTimer = null;
};
audibilityAudio.setMusicVolume(0);
audibilityAudio.setMusicVolume(0.4);
assert.equal(musicStarts, 1, "music restarts when volume rises from zero");
audibilityAudio.setMusicVolume(0);
assert.equal(musicStops, 1, "muting stops the procedural scheduler");
audibilityAudio.setMusicVolume(0.4);
audibilityAudio.setMusicScene("boss");
assert.equal(audibilityAudio.pendingScene, "boss", "running music queues scene changes on a beat");
audibilityAudio.setMusicScene("title");
assert.equal(audibilityAudio.pendingScene, null, "returning to the active scene cancels a queued transition");

const audio = new AudioManager();
audio.setMusicScene("boss");
assert.equal(audio.getMusicScene(), "boss");
audio.setMusicPaused(true);
assert.equal((audio as any).musicPaused, true);
audio.setMusicScene("hub");
assert.equal((audio as any).musicTimer, null, "paused music stays stopped across scene changes");
audio.setMusicPaused(false);
assert.equal((audio as any).musicPaused, false);
audio.setMusicMode("off");
audio.setMusicVolume(0.4);
audio.setMasterVolume(0.75);
audio.cleanup();

const fx = new PixelFxSystem();
const projectile = new Projectile(10, 10, 100, 0, 3, 2, "player", 2, "#FFF");
for (let i = 0; i < 60; i++) fx.emitMuzzle(projectile, false);
assert.ok(fx.getActiveCount() <= 220, "particle cap");
fx.update(5);
assert.equal(fx.getActiveCount(), 0, "particle expiry");

const fullDeathFx = new PixelFxSystem();
fullDeathFx.emitEnemyDeath(20, 30, "#C44CDB", true, false);
const lowDeathFx = new PixelFxSystem();
lowDeathFx.emitEnemyDeath(20, 30, "#C44CDB", true, true);
assert.ok(fullDeathFx.getActiveCount() > lowDeathFx.getActiveCount(), "low effects reduce enemy death particles");
assert.ok(lowDeathFx.getActiveCount() >= 6, "low effects retain a readable enemy death cue");

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
  {
    id: "michele",
    iris: "H",
    nearIrisShadow: "H",
    forbiddenHighlight: "O",
    eyeY: { idle: 7, idle_1: 7, walk_0: 7, walk_1: 8, walk_2: 7, walk_3: 6 },
  },
  {
    id: "kanami",
    iris: "H",
    nearIrisShadow: "M",
    forbiddenHighlight: "T",
    eyeY: { idle: 7, idle_1: 7, walk_0: 7, walk_1: 7, walk_2: 7, walk_3: 6 },
  },
  {
    id: "celestia",
    iris: "L",
    nearIrisShadow: "K",
    forbiddenHighlight: "P",
    eyeY: { idle: 8, idle_1: 8, walk_0: 8, walk_1: 8, walk_2: 8, walk_3: 7 },
  },
] as const;
const animationSuffixes = ["idle", "idle_1", "walk_0", "walk_1", "walk_2", "walk_3"] as const;
const idleFaceSignatures = new Set<string>();
for (const { id, iris, nearIrisShadow, forbiddenHighlight, eyeY } of chibiFaceSpecs) {
  for (const suffix of animationSuffixes) {
    const frameName = `player_${id}_side_${suffix}`;
    const frame = SPRITES[frameName];
    assert.ok(frame, `${frameName} exists`);
    const y = eyeY[suffix];
    assert.equal(frame[y + 1][14], iris, `${frameName} exposes the far iris`);
    assert.equal(frame[y + 1][18], iris, `${frameName} exposes the near iris`);
    if (nearIrisShadow) {
      assert.equal(frame[y + 1][19], nearIrisShadow, `${frameName} keeps its authored near-eye width`);
    }
    for (let y = 3; y <= 12; y++) {
      assert.ok(
        frame[y][21] !== "E" && frame[y][21] !== "F",
        `${frameName} has no profile nose protrusion on row ${y}`,
      );
    }
    assert.notEqual(frame[y + 1][14], forbiddenHighlight, `${frameName} removes far-eye glare`);
    assert.notEqual(frame[y + 1][18], forbiddenHighlight, `${frameName} removes near-eye glare`);
    if (suffix === "idle") {
      idleFaceSignatures.add(frame.slice(5, 12).map(row => row.slice(12, 21)).join("/"));
    }
  }
}
assert.equal(idleFaceSignatures.size, 3, "Michele, Kanami and Celestia use distinct eye and mouth geometry");
assert.ok(
  !Object.keys(SPRITES).some(name => /^player_(michele|kanami|celestia)_(front|back)/.test(name)),
  "special characters use mirrored left/right side sprites only",
);
const entityRenderer = readFileSync("src/game/render/EntityRenderer.ts", "utf8");
assert.match(entityRenderer, /flipX: player\.facing === "left"/);

const sw = readFileSync("public/sw.js", "utf8");
assert.doesNotMatch(sw, /music-tracks\.json/);

console.log(JSON.stringify({
  proceduralThemes: "ok",
  pureWebAudioMusic: "ok",
  schedulerRecovery: "ok",
  quantizedCrossfade: "ok",
  zeroVolumeRecovery: "ok",
  settingsMigration: "ok",
  particleFx: "ok",
  spriteOutlines: "ok",
  twoEyeChibiFaces: "distinct-mirrored-left-right-no-nose-no-glare",
  pwaPureWebAudio: "ok",
}));
