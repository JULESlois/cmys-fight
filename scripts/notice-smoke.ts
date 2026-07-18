import assert from "node:assert/strict";
import fs from "node:fs";
import { GameData } from "../src/game/GameData";
import { jumpToStage } from "../src/game/DebugTools";
import { WorldNoticeController } from "../src/game/notice/WorldNoticeController";

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

assert.match(engine, /readonly worldNotices = new WorldNoticeController/);
assert.match(engine, /WorldNoticeRenderer\.draw/);
assert.match(controller, /showBottom/);
assert.match(controller, /showRegion/);
assert.match(renderer, /drawPixelPanel\(ctx, 43, 207, 234, 23/);
assert.match(renderer, /drawRegion/);
assert.doesNotMatch(hub, /zoneBannerTimer|private message =|messageTimer/);
assert.match(hub, /worldNotices\.showBottom/);
assert.match(hub, /worldNotices\.showRegion/);
assert.doesNotMatch(dungeon, /drawAlertBanner|THREAT ELIMINATED|ENGAGEMENT PROTOCOL|EXTREME DANGER|SAFE ZONE/);
assert.doesNotMatch(dungeon, /centerY - bgHeight|y \+= 4/);
assert.match(dungeon, /worldNotices\.showBottom/);
assert.match(dungeon, /worldNotices\.showRegion/);
assert.match(gameData, /chapterChanged: previous\.chapterIndex !== current\.chapterIndex/);
assert.match(i18n, /"notice\.combatStart"/);
assert.match(i18n, /"notice\.chapter\.2\.name": "FORGOTTEN DUNGEON"/);
assert.match(i18n, /"notice\.chapter\.2\.name": "遗忘地牢"/);

console.log(JSON.stringify({
  bottomNotice: "engine-owned-cross-room",
  regionNotice: "engine-owned-cross-state",
  combatStart: "BottomNotice",
  roomClear: "BottomNotice",
  chapterChange: chapterTransition,
  sameChapterChange: stageTransition.chapterChanged,
  legacyBanner: "removed",
  hardcodedEnglish: "migrated-to-i18n",
}));
