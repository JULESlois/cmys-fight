import assert from "node:assert/strict";
import { Engine } from "../src/game/Engine";
import { GameData } from "../src/game/GameData";
import { generateStage } from "../src/game/FloorGenerator";
import { MAP_HEIGHT, MAP_WIDTH } from "../src/game/MapData";
import { HitStop } from "../src/game/combat/HitStop";
import { StatusEffectSystem } from "../src/game/combat/StatusEffectSystem";
import { Enemy } from "../src/game/entities/Enemy";
import { Projectile } from "../src/game/entities/Projectile";
import { DungeonState } from "../src/game/states/DungeonState";
import { StoryOverlay } from "../src/game/story/StoryOverlay";

const floorTemplate = generateStage(new GameData().data.run);

// Real Engine routing, Dungeon updates and RunStats; only browser input and
// host services are stubbed. An open room keeps collision out of the fixture.
function fixture() {
  HitStop.reset();
  StoryOverlay.reset();
  const data = new GameData();
  data.data.floor = structuredClone(floorTemplate);
  const engine: any = {
    data,
    input: {
      beginFrame() {}, update() {}, clearJustPressed() {},
      wasPressed: () => false,
      wasActionPressed: () => false,
      wasUiPressed: () => false,
      isActionDown: () => false,
      getAxis: () => ({ x: 1, y: 0 }),
      getPrompt: () => "K",
    },
    performanceMonitor: { update() {} },
    worldNotices: { update() {} },
    isPerformanceDegraded: () => false,
    currentState: "dungeon",
    isPaused: false,
    overlayState: null,
    transitionTimer: 0,
    shakeTimer: 0,
  };
  const dungeon = new DungeonState(engine) as any;
  engine.states = { dungeon, menu: { update() {} } };
  dungeon.transitionState = "none";
  dungeon.roomPhase = "combat";
  dungeon.currentMapData = new Array(MAP_WIDTH * MAP_HEIGHT).fill(0);
  dungeon.tutorial.reset(true);
  dungeon.player.skillCooldown = 1;
  StatusEffectSystem.applyPlayer(dungeon.player, "poison", 2);
  const enemy = new Enemy(260, 160, "melee");
  enemy.attackCooldown = 1;
  dungeon.enemies.push(enemy);
  const projectile = new Projectile(40, 40, 30, 0, 1, 1, "player");
  dungeon.projectiles.push(projectile);
  dungeon.floatingText.spawn(160, 100, "2", "damage");
  dungeon.fx.emitDoorUnlock(160, 20, "#39D9E8", false);

  const presentation = { roomRenderer: 0, fx: 0, floatingText: 0, occlusionController: 0 };
  for (const key of Object.keys(presentation) as Array<keyof typeof presentation>) {
    const originalUpdate = dungeon[key].update.bind(dungeon[key]);
    dungeon[key].update = (dt: number, ...args: unknown[]) => {
      presentation[key] += dt;
      originalUpdate(dt, ...args);
    };
  }
  const combatSnapshot = () => [
    dungeon.player.x, dungeon.player.y, dungeon.player.skillCooldown,
    dungeon.player.statusEffects[0].duration,
    enemy.x, enemy.y, enemy.attackCooldown, projectile.x, projectile.y, projectile.life,
  ];
  return {
    data, engine, dungeon, presentation, combatSnapshot,
    tick: (dt: number) => (Engine.prototype as any).update.call(engine, dt),
  };
}

for (const hz of [30, 60, 120]) {
  for (const frames of [0, 2, 3, 4]) {
    for (const reduced of [false, true]) {
      const f = fixture();
      f.data.settings.reducedFlashing = reduced;
      HitStop.request(frames, reduced);
      let frozenUpdates = 0;
      let resumedUpdates = 0;
      for (let step = 0; step < hz / 10; step++) {
        const frozen = HitStop.isActive();
        const before = f.combatSnapshot();
        f.tick(1 / hz);
        if (frozen) {
          frozenUpdates++;
          assert.deepEqual(f.combatSnapshot(), before, "movement, cooldowns, statuses and projectiles freeze together");
        } else {
          resumedUpdates++;
          assert.ok(f.dungeon.player.x > before[0], "player movement resumes");
          assert.ok(f.combatSnapshot()[4] < before[4], "enemy movement resumes");
          assert.ok(f.combatSnapshot()[7] > before[7], "projectile movement resumes");
        }
      }
      const label = `${hz}Hz, frames=${frames}, reduced=${reduced}`;
      assert.equal(HitStop.isActive(), false, `${label}: lifecycle completes`);
      assert.ok(resumedUpdates > 0, `${label}: includes gameplay after the stop`);
      assert.equal(frozenUpdates > 0, frames > 0, `${label}: requested stops actually freeze`);
      assert.ok(Math.abs(f.data.data.runStats.elapsedSeconds - 0.1) < 1e-9, `${label}: all active time counts`);
      for (const [name, elapsed] of Object.entries(f.presentation)) {
        assert.ok(Math.abs(elapsed - 0.1) < 1e-9, `${label}: ${name} keeps updating`);
      }
    }
  }
}

// Explicit pauses must still own their time even when a stop is pending.
for (const mode of ["story", "buff", "pause", "menu", "fade_out", "qa"] as const) {
  const f = fixture();
  if (mode === "story") {
    assert.equal(StoryOverlay.maybeTrigger({ kind: "chapter_start", routeDepth: 1 }, f.data.meta), true);
  } else if (mode === "buff") f.dungeon.buffSelection = ["vitality"];
  else if (mode === "pause") f.engine.isPaused = true;
  else if (mode === "menu") f.engine.overlayState = "menu";
  else if (mode === "fade_out") {
    f.dungeon.transitionState = "fade_out";
    f.dungeon.transitionAlpha = 0;
  } else f.dungeon.qaFrozen = true;
  HitStop.request(2);
  const before = f.combatSnapshot();
  for (let step = 0; step < 6; step++) f.tick(1 / 60);
  assert.equal(f.data.data.runStats.elapsedSeconds, 0, `${mode}: does not count toward Run time`);
  assert.deepEqual(f.combatSnapshot(), before, `${mode}: combat remains paused`);
}

HitStop.reset();
StoryOverlay.reset();
console.log("[hit-stop-timing-smoke] ok: Run time, combat freeze/resume, presentation and pause boundaries");
