import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  GameData,
  META_BACKUP_KEY,
  META_SAVE_KEY,
  RUN_BACKUP_KEY,
  RUN_SAVE_KEY,
  SETTINGS_BACKUP_KEY,
} from "../src/game/GameData";
import { SETTINGS_SAVE_KEY } from "../src/game/Settings";
import { FINAL_GLOBAL_STAGE, isBossStage } from "../src/game/RunProgress";
import { acquireEnemy, acquirePickup, acquireProjectile, releaseEnemy, releasePickup, releaseProjectile } from "../src/game/EntityPools";
import { grantDebugLoadout, jumpToStage } from "../src/game/DebugTools";
import { PerformanceMonitor } from "../src/game/PerformanceMonitor";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });

function validateStage(data: GameData, expected: number) {
  assert.equal(data.data.run.globalStageIndex, expected);
  assert.equal(data.data.floor.globalStageIndex, expected);
  assert.equal(data.data.floor.hardMode, data.data.run.hardMode);
  assert.ok(data.data.floor.rooms.length >= 3);
  const bossRooms = data.data.floor.rooms.filter(room => room.type === "boss");
  const exits = data.data.floor.rooms.filter(room => room.type === "exit");
  if (isBossStage(data.data.run)) {
    assert.equal(bossRooms.length, 1);
    assert.equal(exits.length, 0);
    assert.equal(data.data.floor.rooms.filter(room => room.type === "shop").length, 1);
  } else {
    assert.equal(bossRooms.length, 0);
    assert.equal(exits.length, 1);
  }
}

const game = new GameData();
game.load();
game.startNewRun("knight", "pistol", false);
for (let stage = 1; stage <= FINAL_GLOBAL_STAGE; stage++) {
  validateStage(game, stage);
  game.data.player.hp = Math.max(1, game.data.player.hp);
  game.data.player.coins += stage;
  game.data.runStats.kills += 2;
  if (stage < FINAL_GLOBAL_STAGE) game.advanceStage();
}
assert.equal(game.data.run.chapterIndex, 4);
assert.equal(game.data.run.stageIndex, 5);
game.data.runStats.bossKills = 4;
game.data.runStats.stagesCleared = 20;
const summary = game.finalizeRun("victory");
assert.equal(summary.outcome, "victory");
assert.ok(summary.rewardEarned > 0);

// Run backup recovery.
game.data.player.coins = 111;
game.save();
game.data.player.coins = 222;
game.save();
assert.ok(localStorage.getItem(RUN_BACKUP_KEY));
localStorage.setItem(RUN_SAVE_KEY, "{broken");
const recovered = new GameData();
assert.equal(recovered.load(), true);
assert.equal(recovered.data.player.coins, 111);
assert.match(recovered.lastRecoveryMessage ?? "", /RUN DATA RESTORED/);

// Meta/settings recovery.
recovered.meta.currency = 321;
recovered.saveMeta();
recovered.meta.currency = 654;
recovered.saveMeta();
localStorage.setItem(META_SAVE_KEY, "[]");
assert.equal(recovered.loadMeta(), true);
assert.equal(recovered.meta.currency, 321);
assert.ok(localStorage.getItem(META_BACKUP_KEY));

recovered.settings.masterVolume = 70;
recovered.saveSettings();
recovered.settings.masterVolume = 40;
recovered.saveSettings();
localStorage.setItem(SETTINGS_SAVE_KEY, "null");
assert.equal(recovered.loadSettings(), true);
assert.equal(recovered.settings.masterVolume, 70);
assert.ok(localStorage.getItem(SETTINGS_BACKUP_KEY));

// Export/import and checksum rollback.
const exported = recovered.exportBundle();
const beforeBadImport = localStorage.getItem(RUN_SAVE_KEY);
const tampered = exported.replace('"masterVolume": 70', '"masterVolume": 71');
assert.equal(recovered.importBundle(tampered).success, false);
assert.equal(localStorage.getItem(RUN_SAVE_KEY), beforeBadImport);

storage.clear();
const imported = new GameData();
imported.startNewRun("knight", "pistol", false);
imported.data.player.coins = 7;
imported.save();
const previousRun = localStorage.getItem(RUN_SAVE_KEY);
const importResult = imported.importBundle(exported);
assert.equal(importResult.success, true);
assert.equal(localStorage.getItem(RUN_BACKUP_KEY), previousRun);
assert.equal(imported.data.player.coins, recovered.data.player.coins);
assert.equal(imported.meta.currency, recovered.meta.currency);
assert.equal(imported.settings.masterVolume, recovered.settings.masterVolume);

// Debug stage navigation and loadout.
jumpToStage(imported, 7);
assert.equal(imported.data.run.globalStageIndex, 7);
grantDebugLoadout(imported);
assert.equal(imported.data.player.coins, 999);
assert.deepEqual(imported.data.player.weaponSlots, ["void_rail", "dragon_breath"]);

// Entity pools must reuse released instances and fully reset runtime identity/state.
const projectileA = acquireProjectile(1, 2, 3, 4, 2, 5, "player");
const projectileId = projectileA.id;
releaseProjectile(projectileA);
const projectileB = acquireProjectile(9, 8, 7, 6, 3, 4, "enemy");
assert.equal(projectileA, projectileB);
assert.notEqual(projectileB.id, projectileId);
assert.equal(projectileB.faction, "enemy");
releaseProjectile(projectileB);

const enemyA = acquireEnemy(10, 10, "melee");
enemyA.isElite = true;
releaseEnemy(enemyA);
const enemyB = acquireEnemy(20, 20, "ranged");
assert.equal(enemyA, enemyB);
assert.equal(enemyB.isElite, false);
assert.equal(enemyB.type, "ranged");
releaseEnemy(enemyB);

const pickupA = acquirePickup(1, 1, "weapon", 1, "laser");
pickupA.blockedUntilPlayerLeaves = true;
releasePickup(pickupA);
const pickupB = acquirePickup(2, 2, "coin", 10);
assert.equal(pickupA, pickupB);
assert.equal(pickupB.weaponId, undefined);
assert.equal(pickupB.blockedUntilPlayerLeaves, false);
releasePickup(pickupB);

// Sustained low FPS enables automatic low-FX mode and sustained recovery disables it.
const performanceMonitor = new PerformanceMonitor();
for (let i = 0; i < 70; i++) performanceMonitor.update(0.05);
assert.equal(performanceMonitor.isDegraded(), true);
for (let i = 0; i < 720; i++) performanceMonitor.update(1 / 60);
assert.equal(performanceMonitor.isDegraded(), false);

// Release assets must be present and internally consistent.
for (const asset of ["public/manifest.webmanifest", "public/sw.js", "public/icon-192.png", "public/icon-512.png"]) {
  assert.ok(existsSync(asset), `${asset} missing`);
}
const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
assert.equal(manifest.display, "fullscreen");
assert.equal(manifest.icons.length, 2);

console.log(JSON.stringify({
  fullRun: "ok",
  finalVictory: "ok",
  backupRecovery: "ok",
  importExport: "ok",
  debugTools: "ok",
  entityPools: "ok",
  performanceFallback: "ok",
  pwaAssets: "ok",
}));
