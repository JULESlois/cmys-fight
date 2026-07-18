import assert from "node:assert/strict";
import fs from "node:fs";
import { GameData } from "../src/game/GameData";
import { jumpToStage } from "../src/game/DebugTools";
import { WorldNoticeController } from "../src/game/notice/WorldNoticeController";
import { DungeonState } from "../src/game/states/DungeonState";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}
Object.defineProperty(globalThis, "localStorage", { value: new MemoryStorage(), configurable: true });

const notices = new WorldNoticeController();
notices.showBottom("COMBAT", "yellow", 2.8);
notices.showRegion("CHAPTER II", "FORGOTTEN DUNGEON", 3.6);
assert.equal(notices.getBottom()?.text, "COMBAT");
assert.equal(notices.getRegion()?.subtitle, "FORGOTTEN DUNGEON");
notices.update(0.75);
assert.ok(notices.getBottom(), "BottomNotice survives room load duration");
assert.ok(notices.getRegion(), "RegionNotice survives room load duration");
notices.update(2.1);
assert.equal(notices.getBottom(), null);
assert.ok(notices.getRegion(), "longer chapter notice remains after bottom notice");
notices.update(1);
assert.equal(notices.getRegion(), null);

const data = new GameData();
data.startNewRun("knight", "pistol", false);
jumpToStage(data, 4);
const chapterTransition = data.advanceStage();
assert.equal(chapterTransition.previous.chapterIndex, 1);
assert.equal(chapterTransition.current.chapterIndex, 2);
assert.equal(chapterTransition.chapterChanged, true);

jumpToStage(data, 5);
const stageTransition = data.advanceStage();
assert.equal(stageTransition.previous.chapterIndex, 2);
assert.equal(stageTransition.current.chapterIndex, 2);
assert.equal(stageTransition.chapterChanged, false);

const read = (path: string) => fs.readFileSync(path, "utf8");
const engine = read("src/game/Engine.ts");
const hub = read("src/game/states/HubState.ts");
const dungeon = read("src/game/states/DungeonState.ts");
const gameData = read("src/game/GameData.ts");
const controller = read("src/game/notice/WorldNoticeController.ts");
const renderer = read("src/game/notice/WorldNoticeRenderer.ts");
const i18n = read("src/game/i18n.ts");

const lifecycleEvents: Array<{ text: string; tone: string }> = [];
const dungeonHarness = new DungeonState({
  data: { settings: { language: "en" } },
  worldNotices: {
    showBottom(text: string, tone: string) { lifecycleEvents.push({ text, tone }); },
  },
} as any) as any;
dungeonHarness.emitCombatLifecycleNotice("combat_started", false);
dungeonHarness.emitCombatLifecycleNotice("combat_cleared");
assert.deepEqual(lifecycleEvents, [
  { text: "COMBAT START", tone: "yellow" },
  { text: "ROOM CLEAR", tone: "yellow" },
]);
lifecycleEvents.length = 0;
dungeonHarness.emitCombatLifecycleNotice("combat_started", true);
dungeonHarness.emitCombatLifecycleNotice("combat_cleared");
assert.deepEqual(lifecycleEvents, [
  { text: "BOSS ENGAGED", tone: "red" },
  { text: "ROOM CLEAR", tone: "yellow" },
]);

assert.match(engine, /readonly worldNotices = new WorldNoticeController/);
assert.match(engine, /WorldNoticeRenderer\.draw/);
assert.match(controller, /showBottom/);
assert.match(controller, /showRegion/);
assert.match(renderer, /getBottomNoticeBounds\(scene\)/);
assert.match(renderer, /drawRegion/);
assert.doesNotMatch(hub, /zoneBannerTimer|private message =|messageTimer/);
assert.match(hub, /worldNotices\.showBottom/);
assert.match(hub, /worldNotices\.showRegion/);
assert.doesNotMatch(dungeon, /drawAlertBanner|THREAT ELIMINATED|ENGAGEMENT PROTOCOL|EXTREME DANGER|SAFE ZONE/);
assert.doesNotMatch(dungeon, /centerY - bgHeight|y \+= 4/);
assert.match(dungeon, /worldNotices\.showBottom/);
assert.match(dungeon, /worldNotices\.showRegion/);
assert.match(gameData, /chapterChanged: previous\.chapterIndex !== current\.chapterIndex/);
assert.match(i18n, /"notice\.combatStarted"/);
assert.match(i18n, /"notice\.bossCombatStarted"/);
assert.match(i18n, /"notice\.combatCleared"/);
assert.doesNotMatch(i18n, /"notice\.rewardGenerated"/);
assert.doesNotMatch(dungeon, /notice\.rewardGenerated/);
assert.match(dungeon, /emitCombatLifecycleNotice\("combat_started"/);
assert.match(dungeon, /emitCombatLifecycleNotice\("combat_cleared"/);
assert.match(dungeon, /this\.phaseTimer = room\?\.type === "boss" \? 0\.5 : 0\.25/);
assert.match(dungeon, /this\.setPhase\(room\?\.type === "boss" \? "intro" : "locking"\)/);
assert.match(dungeon, /const bossSlowPacing = currentRoom\?\.type === "boss"/);
assert.match(dungeon, /if \(bossSlowPacing\) speedMult = 0\.2/);
assert.match(dungeon, /private areRoomDoorsLocked\(\)/);
assert.match(i18n, /"notice\.chapter\.2\.name": "FORGOTTEN DUNGEON"/);
assert.match(i18n, /"notice\.chapter\.2\.name": "遗忘地牢"/);

console.log(JSON.stringify({
  bottomNotice: "engine-owned-cross-room",
  regionNotice: "engine-owned-cross-state",
  normalCombat: ["combat_started", "combat_cleared"],
  bossCombat: ["boss_combat_started", "combat_cleared"],
  rewardNotice: "none",
  normalEntry: "fade-to-0.25s-locking-at-full-speed",
  bossEntry: "0.8s-intro-0.5s-locking-at-20-percent-speed",
  doorLockAndSpeed: "separate-controls",
  chapterChange: chapterTransition,
  sameChapterChange: stageTransition.chapterChanged,
  legacyBanner: "removed",
  hardcodedEnglish: "migrated-to-i18n",
}));
