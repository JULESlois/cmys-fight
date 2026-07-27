import assert from "node:assert/strict";
import { audio } from "../src/game/audio/AudioManager";
import { CHARACTERS } from "../src/game/data/characters";
import { HUB_MAP } from "../src/game/hub/HubMap";
import { HubState } from "../src/game/states/HubState";
import type { Engine } from "../src/game/Engine";

function createEngine(debugMode = true) {
  const calls = { noticesCleared: 0, inputSuppressed: 0 };
  const engine = {
    debugMode,
    data: {
      getHubLoadout: () => ({ characterId: "knight", starterWeaponId: "pistol" }),
    },
    input: {
      suppressUntilReleased: () => { calls.inputSuppressed++; },
    },
    worldNotices: {
      clear: () => { calls.noticesCleared++; },
    },
    triggerScreenShake: () => assert.fail("QA timeline simulation must not trigger screen shake"),
  } as unknown as Engine;
  return { engine, calls };
}

function dirtyHub(hub: HubState): void {
  const state = hub as any;
  state.player.x = 1000;
  state.player.y = 700;
  state.player.vx = 12;
  state.player.vy = -8;
  state.player.characterId = "celestia";
  state.player.animState = "walk";
  state.player.animFrame = 3;
  state.player.animTimer = 42;
  state.player.facing = "left";
  state.player.facingLeft = true;
  state.player.hitFlash = 1;
  state.mode = "trial";
  state.selectedIndex = 2;
  state.refundArmed = true;
  state.confirmationAction = "abandon";
  state.interactionTarget = { object: { id: "stale" }, distance: 0, x: 1, y: 1 };
  state.qaPresentationTime = 42;
  state.time = 42;
  state.debugOverlayVisible = true;
  state.occlusionController.groups.set("stale", { alpha: 0.4, targetAlpha: 0.4 });
}

function introSignature(hub: HubState) {
  const state = hub as any;
  return {
    phase: state.introPhase,
    timer: state.introTimer,
    time: state.time,
    camera: { x: state.camera.x, y: state.camera.y },
    particles: state.introParticles.map((particle: Record<string, number | string>) => ({ ...particle })),
  };
}

const pauseCalls: boolean[] = [];
const hadOwnPauseMethod = Object.hasOwn(audio, "setMusicPaused");
const ownPauseMethod = Object.getOwnPropertyDescriptor(audio, "setMusicPaused");
Object.defineProperty(audio, "setMusicPaused", {
  configurable: true,
  value: (paused: boolean) => { pauseCalls.push(paused); },
});

try {
  const first = createEngine();
  const firstHub = new HubState(first.engine);
  dirtyHub(firstHub);

  assert.equal(firstHub.qaSetIntro("crystal", 5.55), true);
  const state = firstHub as any;
  const spawn = HUB_MAP.spawnPoints.rebirth_spring;
  assert.deepEqual({ x: state.player.x, y: state.player.y }, spawn, "QA intro resets the player to the spring");
  assert.equal(state.player.characterId, CHARACTERS.knight.id, "QA intro restores the saved Hub character");
  assert.deepEqual(
    {
      vx: state.player.vx,
      vy: state.player.vy,
      animState: state.player.animState,
      animFrame: state.player.animFrame,
      animTimer: state.player.animTimer,
      facing: state.player.facing,
      facingLeft: state.player.facingLeft,
      hitFlash: state.player.hitFlash,
    },
    { vx: 0, vy: 0, animState: "idle", animFrame: 0, animTimer: 0, facing: "right", facingLeft: false, hitFlash: 0 },
  );
  assert.equal(state.mode, "world");
  assert.equal(state.selectedIndex, 0);
  assert.equal(state.refundArmed, false);
  assert.equal(state.confirmationAction, null);
  assert.equal(state.interactionTarget, null);
  assert.equal(state.qaPresentationTime, null);
  assert.equal(state.debugOverlayVisible, false);
  assert.equal(state.occlusionController.groups.size, 0);
  assert.ok(Math.abs(state.time - 5.55) < 1e-9, "QA simulation owns the Hub world clock");
  assert.equal(first.calls.noticesCleared, 1);
  assert.equal(first.calls.inputSuppressed, 1);
  assert.equal(pauseCalls.at(-1), true, "QA intro follows the production music-pause contract");
  assert.ok(state.introParticles.length > 0, "impact timeline produces particles");

  const second = createEngine();
  const secondHub = new HubState(second.engine);
  dirtyHub(secondHub);
  assert.equal(secondHub.qaSetIntro("crystal", 5.55), true);
  assert.deepEqual(introSignature(secondHub), introSignature(firstHub), "fixed QA time is deterministic after dirty state");

  const particleRun = createEngine();
  const particleHub = new HubState(particleRun.engine);
  dirtyHub(particleHub);
  assert.equal(particleHub.qaSetIntro("particles", 1.25), true);
  assert.equal((particleHub as any).introPhase, "particles");
  assert.ok(Math.abs((particleHub as any).introTimer - 1.25) < 1 / 60 + 1e-9);

  const disabled = createEngine(false);
  const disabledHub = new HubState(disabled.engine);
  assert.equal(disabledHub.qaSetIntro("crystal", 1), false, "intro QA remains debug-only");
  assert.equal(disabled.calls.noticesCleared, 0, "rejected QA calls do not mutate state");
  assert.equal(firstHub.qaSetIntro("crystal", Number.NaN), false);
  assert.equal(firstHub.qaSetIntro("particles", -1), false);
} finally {
  if (hadOwnPauseMethod && ownPauseMethod) Object.defineProperty(audio, "setMusicPaused", ownPauseMethod);
  else Reflect.deleteProperty(audio, "setMusicPaused");
}

console.log(JSON.stringify({
  hubIntroStateReset: "ok",
  deterministicTimeline: "ok",
  musicPauseContract: "ok",
}));
