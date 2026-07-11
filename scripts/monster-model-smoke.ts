import assert from "node:assert/strict";
import fs from "node:fs";
import { ENEMIES } from "../src/game/data/enemies";
import { MONSTER_MODEL_IDS, hasMonsterModel } from "../src/game/render/MonsterModelRenderer";

const enemyIds = Object.keys(ENEMIES).sort();
const modelIds = [...MONSTER_MODEL_IDS].sort();
assert.deepEqual(modelIds, enemyIds, "every enemy must have a dedicated model");
assert.equal(new Set(modelIds).size, enemyIds.length);
for (const id of enemyIds) assert.equal(hasMonsterModel(id), true, id);

const source = fs.readFileSync("src/game/render/MonsterModelRenderer.ts", "utf8");
for (const id of enemyIds) {
  assert.match(source, new RegExp(`\\n  ${id.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\(`), `${id} model definition`);
}
assert.doesNotMatch(source, /ctx\.arc\(|ctx\.ellipse\(/, "monster models must use pixel geometry");
assert.match(source, /dingdong_fowl[\s\S]*#E53935[\s\S]*#F9A825/, "ding-dong fowl comb and beak");
assert.match(source, /bark_hound[\s\S]*#E57373/, "bark hound open mouth/tongue");
assert.match(source, /white_sampler[\s\S]*#90CAF9[\s\S]*#1E88E5/, "white sampler face shield and suit stripes");
assert.match(source, /code_horse[\s\S]*#2ECC71/, "code horse code panel");
assert.match(source, /broadcast_rooster[\s\S]*#F1C40F/, "broadcast rooster speaker/bell accents");
assert.match(source, /white_director[\s\S]*#EF5350/, "white director megaphone");
assert.match(source, /vat_horse_prime[\s\S]*#455A64/, "vat-horse mechanical tank");

const renderer = fs.readFileSync("src/game/render/EntityRenderer.ts", "utf8");
assert.match(renderer, /MonsterModelRenderer\.draw/);
assert.doesNotMatch(renderer, /drawEnemyAccent/);
assert.doesNotMatch(renderer, /enemy_\$\{enemy\.type\}_idle/);

const themes = ["forest", "dungeon", "snow", "lava"] as const;
for (const theme of themes) {
  const themed = enemyIds.filter(id => ENEMIES[id].theme === theme);
  assert.equal(themed.length, 7, `${theme} should have five regular models and two bosses`);
}

console.log(JSON.stringify({
  dedicatedModels: modelIds.length,
  forestModels: enemyIds.filter(id => ENEMIES[id].theme === "forest").length,
  dungeonModels: enemyIds.filter(id => ENEMIES[id].theme === "dungeon").length,
  snowModels: enemyIds.filter(id => ENEMIES[id].theme === "snow").length,
  lavaModels: enemyIds.filter(id => ENEMIES[id].theme === "lava").length,
  pixelGeometry: "ok",
  memeSilhouettes: "ok",
}));
