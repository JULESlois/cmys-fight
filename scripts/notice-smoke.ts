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

notices.clear();
assert.equal(notices.showBottom({
  id: "combat-start:room-1",
  text: "COMBAT START",
  tone: "yellow",
  dedupe: true,
  dedupeWindow: 30,
}), true);
assert.equal(notices.showBottom({
  id: "combat-start:room-1",
  text: "COMBAT START",
  tone: "yellow",
  dedupe: true,
  dedupeWindow: 30,
}), false, "duplicate room lifecycle notice is rejected");
assert.equal(notices.getBottom()?.id, "combat-start:room-1");

const data = new GameData();
data.startNewRun("knight", "pistol", false);
jumpToStage(data, 4);
const chapterTransition = data.advanceStage();
assert.equal(chapterTransition.previous.routeDepth, 1);
assert.equal(chapterTransition.current.routeDepth, 2);
assert.equal(chapterTransition.chapterChanged, true);

jumpToStage(data, 5);
const stageTransition = data.advanceStage();
assert.equal(stageTransition.previous.routeDepth, 2);
assert.equal(stageTransition.current.routeDepth, 2);
assert.equal(stageTransition.chapterChanged, false);

const read = (path: string) => fs.readFileSync(path, "utf8");
const engine = read("src/game/Engine.ts");
const hub = read("src/game/states/HubState.ts");
const dungeon = read("src/game/states/DungeonState.ts");
const gameData = read("src/game/GameData.ts");
const controller = read("src/game/notice/WorldNoticeController.ts");
const renderer = read("src/game/notice/WorldNoticeRenderer.ts");
const i18n = read("src/game/i18n.ts");

const lifecycleEvents: Array<{ id?: string; text: string; tone: string }> = [];
const dungeonHarness = new DungeonState({
  data: { settings: { language: "en" } },
  worldNotices: {
    showBottom(request: any, tone?: string) {
      if (typeof request === "string") lifecycleEvents.push({ text: request, tone: tone ?? "yellow" });
      else lifecycleEvents.push({ id: request.id, text: request.text, tone: request.tone });
      return true;
    },
  },
} as any) as any;
const normalRoom = {
  id: "normal-room",
  type: "combat",
  combatStartNotified: false,
  combatClearNotified: false,
};
dungeonHarness.emitCombatLifecycleNotice("combat_started", normalRoom);
dungeonHarness.emitCombatLifecycleNotice("combat_started", normalRoom);
dungeonHarness.emitCombatLifecycleNotice("combat_cleared", normalRoom);
dungeonHarness.emitCombatLifecycleNotice("combat_cleared", normalRoom);
assert.deepEqual(lifecycleEvents, [
  { id: "combat-start:normal-room", text: "COMBAT START", tone: "yellow" },
  { id: "combat-clear:normal-room", text: "ROOM CLEAR", tone: "yellow" },
]);
assert.equal(normalRoom.combatStartNotified, true);
assert.equal(normalRoom.combatClearNotified, true);
lifecycleEvents.length = 0;
const bossRoom = {
  id: "boss-room",
  type: "boss",
  combatStartNotified: false,
  combatClearNotified: false,
};
dungeonHarness.emitCombatLifecycleNotice("combat_started", bossRoom);
dungeonHarness.emitCombatLifecycleNotice("combat_cleared", bossRoom);
assert.deepEqual(lifecycleEvents, [
  { id: "combat-start:boss-room", text: "BOSS ENGAGED", tone: "red" },
  { id: "combat-clear:boss-room", text: "ROOM CLEAR", tone: "yellow" },
]);

assert.match(engine, /readonly worldNotices = new WorldNoticeController/);
assert.match(engine, /WorldNoticeRenderer\.draw/);
assert.match(controller, /showBottom/);
assert.match(controller, /dedupeWindow/);
assert.match(controller, /recentBottomIds/);
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
assert.match(gameData, /chapterChanged: previous\.routeDepth !== current\.routeDepth/);
assert.match(i18n, /"notice\.combatStarted"/);
assert.match(i18n, /"notice\.bossCombatStarted"/);
assert.match(i18n, /"notice\.combatCleared"/);
assert.doesNotMatch(i18n, /"notice\.rewardGenerated"/);
assert.doesNotMatch(i18n, /"notice\.interactionComplete"/);
assert.doesNotMatch(dungeon, /notice\.rewardGenerated/);
assert.doesNotMatch(dungeon, /notice\.interactionComplete/);
assert.doesNotMatch(dungeon, /notifyInteractionComplete/);
assert.match(dungeon, /emitCombatLifecycleNotice\("combat_started"/);
assert.match(dungeon, /emitCombatLifecycleNotice\("combat_cleared"/);
assert.match(dungeon, /id: `combat-start:\$\{room\.id\}`/);
assert.match(dungeon, /id: `combat-clear:\$\{room\.id\}`/);
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
  specialRoomSuccessNotice: "none",
  lifecycleDedupe: "room-id-and-persisted-flags",
  normalEntry: "fade-to-0.25s-locking-at-full-speed",
  bossEntry: "0.8s-intro-0.5s-locking-at-20-percent-speed",
  doorLockAndSpeed: "separate-controls",
  chapterChange: chapterTransition,
  sameChapterChange: stageTransition.chapterChanged,
  legacyBanner: "removed",
  hardcodedEnglish: "migrated-to-i18n",
}));
